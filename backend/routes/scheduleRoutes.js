/**
 * @file scheduleRoutes.js
 * @description Schedule & Timetable Routes. Manages classroom schedules, weekly recurring timetables, reschedule requests with SMS alerts, and YouTube live streaming metadata.
 */

const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const TeacherAvailability = require('../models/TeacherAvailability');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// ==========================================
//   HELPER FUNCTIONS FOR CONFLICT DETECTION
// ==========================================

// Parse "08:00 AM", "8:00 AM", "14:30", "02:30 PM" to minutes from midnight
function parseTimeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const clean = str.replace(/(am|pm)/i, '').trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10) || 0;
  let m = parseInt(parts[1], 10) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
}

// Check if two time ranges overlap
function timesOverlap(startA, endA, startB, endB) {
  const sA = parseTimeToMinutes(startA);
  const eA = parseTimeToMinutes(endA);
  const sB = parseTimeToMinutes(startB);
  const eB = parseTimeToMinutes(endB);
  return Math.max(sA, sB) < Math.min(eA, eB);
}

// Check if room is a physical venue where multiple classes cannot occur simultaneously
function isPhysicalRoom(room) {
  if (!room) return false;
  const r = String(room).trim().toLowerCase();
  return r !== 'online class' && r !== 'online' && r !== 'virtual' && r !== 'zoom';
}

// Check if two schedule entries occur on the same day
function daysConflict(dayOfWeek1, date1, dayOfWeek2, date2) {
  // If both have specific dates
  if (date1 && date2) {
    return date1 === date2;
  }

  // If one has date and the other has dayOfWeek
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (date1 && dayOfWeek2) {
    const d = new Date(date1);
    const dayName = dayNames[d.getDay()];
    return dayName && dayName.toLowerCase() === String(dayOfWeek2).toLowerCase();
  }
  if (date2 && dayOfWeek1) {
    const d = new Date(date2);
    const dayName = dayNames[d.getDay()];
    return dayName && dayName.toLowerCase() === String(dayOfWeek1).toLowerCase();
  }

  // If both are recurring dayOfWeek
  if (dayOfWeek1 && dayOfWeek2) {
    return String(dayOfWeek1).trim().toLowerCase() === String(dayOfWeek2).trim().toLowerCase();
  }

  return false;
}

// Comprehensive conflict check against database
async function detectScheduleConflicts({
  scheduleId = null,
  teacherId = null,
  room = 'Main Hall',
  className = '',
  dayOfWeek = '',
  date = null,
  startTime = '',
  endTime = ''
}) {
  const conflicts = [];

  // Exclude current schedule being updated
  const scheduleQuery = {
    status: { $ne: 'cancelled' }
  };
  if (scheduleId) {
    scheduleQuery._id = { $ne: scheduleId };
  }

  // Retrieve existing active schedules
  const existingSchedules = await Schedule.find(scheduleQuery)
    .populate('teacherId', 'name email')
    .lean();

  for (const existing of existingSchedules) {
    // If existing schedule is postponed and not yet rescheduled, it doesn't occupy slot
    if (existing.status === 'postponed' && !existing.rescheduledTo?.date && !existing.rescheduledTo?.startTime) {
      continue;
    }

    // Determine actual day & times to compare (handle if existing was rescheduled)
    const exDay = existing.rescheduledTo?.dayOfWeek || existing.dayOfWeek;
    const exDate = existing.rescheduledTo?.date || existing.date;
    const exStart = existing.rescheduledTo?.startTime || existing.startTime;
    const exEnd = existing.rescheduledTo?.endTime || existing.endTime;
    const exRoom = existing.rescheduledTo?.room || existing.room;

    if (!daysConflict(dayOfWeek, date, exDay, exDate)) {
      continue;
    }

    if (!timesOverlap(startTime, endTime, exStart, exEnd)) {
      continue;
    }

    const dayLabel = date ? `${date} (${dayOfWeek || ''})` : dayOfWeek;
    const timeLabel = `${exStart} – ${exEnd}`;

    // 1. Teacher Overlap Conflict
    if (teacherId && existing.teacherId) {
      const existingTeacherId = existing.teacherId._id ? existing.teacherId._id.toString() : existing.teacherId.toString();
      if (existingTeacherId === teacherId.toString()) {
        const teacherName = existing.teacherId.name || 'Assigned Teacher';
        conflicts.push({
          type: 'teacher',
          message: `Teacher Conflict: ${teacherName} is already assigned to '${existing.title}' (${existing.className}) on ${dayLabel} from ${timeLabel} in ${exRoom}.`,
          conflictingSchedule: existing
        });
      }
    }

    // 2. Classroom / Venue Overlap Conflict
    if (isPhysicalRoom(room) && isPhysicalRoom(exRoom)) {
      if (String(room).trim().toLowerCase() === String(exRoom).trim().toLowerCase()) {
        conflicts.push({
          type: 'classroom',
          message: `Classroom Conflict: Venue '${room}' is already allocated to '${existing.title}' (${existing.className}) on ${dayLabel} from ${timeLabel}.`,
          conflictingSchedule: existing
        });
      }
    }

    // 3. Class / Grade Overlap Conflict
    if (className && existing.className) {
      if (String(className).trim().toLowerCase() === String(existing.className).trim().toLowerCase()) {
        conflicts.push({
          type: 'class',
          message: `Class Cohort Conflict: '${className}' already has another class scheduled: '${existing.title}' on ${dayLabel} from ${timeLabel} in ${exRoom}.`,
          conflictingSchedule: existing
        });
      }
    }
  }

  // 4. Teacher Availability / Leave Check
  if (teacherId) {
    const availQuery = {
      teacherId,
      $or: [
        { slotType: 'unavailable' },
        { slotType: 'leave' },
        { isAvailable: false }
      ]
    };

    const unavailabilities = await TeacherAvailability.find(availQuery).lean();
    for (const record of unavailabilities) {
      if (daysConflict(dayOfWeek, date, record.dayOfWeek, record.date)) {
        if (timesOverlap(startTime, endTime, record.startTime, record.endTime)) {
          const reasonNote = record.reason ? ` (Note: ${record.reason})` : '';
          const slotLabel = `${record.startTime} – ${record.endTime}`;
          conflicts.push({
            type: 'availability',
            message: `Teacher Availability Warning: The assigned teacher is marked as unavailable/on leave on ${dayOfWeek || date} during ${slotLabel}${reasonNote}.`,
            availabilityRecord: record
          });
        }
      }
    }
  }

  return conflicts;
}

// ==========================================
//               ROUTES
// ==========================================

// --- GET SCHEDULES (ROLE-BASED FILTERING & CALENDAR VIEW SUPPORT) ---
router.get('/', protect, async (req, res) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;

    let query = {};

    if (userRole === 'student') {
      const Enrollment = require('../models/Enrollment');

      // Find all courses where student is enrolled
      const directCourses = await Course.find({
        $or: [
          { enrolledStudents: userId },
          { "classes.enrolledStudents": userId }
        ]
      }).select('_id');

      const dbEnrollments = await Enrollment.find({ student: userId }).select('course');

      const enrolledCourseIds = Array.from(new Set([
        ...directCourses.map(c => c._id.toString()),
        ...dbEnrollments.map(e => e.course ? e.course.toString() : null).filter(Boolean)
      ]));

      // Show schedules linked to enrolled courses, or schedules matching the student's grade
      if (enrolledCourseIds.length > 0 && req.user.grade) {
        query = {
          $or: [
            { courseId: { $in: enrolledCourseIds } },
            { className: new RegExp(String(req.user.grade).trim(), 'i') }
          ]
        };
      } else if (enrolledCourseIds.length > 0) {
        query = { courseId: { $in: enrolledCourseIds } };
      } else if (req.user.grade) {
        query = { className: new RegExp(String(req.user.grade).trim(), 'i') };
      }
    } else if (userRole === 'teacher') {
      // Teachers see schedule entries where they are assigned, 
      // or schedule entries linked to courses they instruct
      const teacherCourses = await Course.find({ instructor: userId }).select('_id');
      const courseIds = teacherCourses.map(c => c._id);

      query = {
        $or: [
          { teacherId: userId },
          { courseId: { $in: courseIds } }
        ]
      };
    }
    // Admin sees all schedules

    // Optional query filters (support frontend calendar filtering)
    if (req.query.eventType) {
      query.eventType = req.query.eventType;
    }
    if (req.query.teacherId) {
      query.teacherId = req.query.teacherId;
    }
    if (req.query.room) {
      query.room = req.query.room;
    }
    if (req.query.className) {
      query.className = new RegExp(req.query.className, 'i');
    }

    const schedules = await Schedule.find(query)
      .populate({
        path: 'courseId',
        select: 'title instructor grade enrolledGrades',
        populate: {
          path: 'instructor',
          select: 'name email profilePicture'
        }
      })
      .populate('teacherId', 'name email profilePicture')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    res.json(schedules);
  } catch (err) {
    console.error("Fetch Schedule Error:", err);
    res.status(500).json({ message: "Server error fetching schedule" });
  }
});

// --- DRY-RUN CONFLICT CHECK (ADMIN & TEACHER) ---
router.post('/check-conflicts', protect, async (req, res) => {
  try {
    const { scheduleId, teacherId, room, className, dayOfWeek, date, startTime, endTime } = req.body;

    if (!dayOfWeek && !date) {
      return res.json({ hasConflict: false, conflicts: [] });
    }

    const conflicts = await detectScheduleConflicts({
      scheduleId,
      teacherId,
      room: room || 'Main Hall',
      className: className || '',
      dayOfWeek: dayOfWeek || '',
      date: date || null,
      startTime: startTime || '10:00 AM',
      endTime: endTime || '12:00 PM'
    });

    res.json({
      hasConflict: conflicts.length > 0,
      conflicts
    });
  } catch (err) {
    console.error("Check Conflicts Error:", err);
    res.status(500).json({ message: "Server error checking conflicts", error: err.message });
  }
});

// --- CREATE SCHEDULE ENTRY (ADMIN ONLY) WITH CONFLICT DETECTION ---
router.post('/', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  const {
    title,
    courseId,
    className,
    dayOfWeek,
    startTime,
    endTime,
    teacherId,
    room,
    eventType,
    date,
    subject,
    description
  } = req.body;

  if (!title || !className || (!dayOfWeek && !date) || !startTime || !endTime) {
    return res.status(400).json({
      message: "Title, Class Name, Day/Date, Start Time, and End Time are required."
    });
  }

  try {
    let finalTeacherId = teacherId;
    if (!finalTeacherId && courseId) {
      const courseDoc = await Course.findById(courseId);
      if (courseDoc && courseDoc.instructor) {
        finalTeacherId = courseDoc.instructor;
      }
    }

    // --- AUTOMATIC TIMETABLE CONFLICT DETECTION ---
    const conflicts = await detectScheduleConflicts({
      teacherId: finalTeacherId,
      room: room || 'Main Hall',
      className,
      dayOfWeek: dayOfWeek || '',
      date: date || null,
      startTime,
      endTime
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: conflicts[0].message,
        conflictType: conflicts[0].type,
        conflicts
      });
    }

    const schedule = await Schedule.create({
      title,
      courseId: courseId || undefined,
      className,
      dayOfWeek: dayOfWeek || 'Saturday',
      startTime,
      endTime,
      teacherId: finalTeacherId || undefined,
      room: room || 'Main Hall',
      eventType: eventType || 'class',
      date: date || null,
      status: 'scheduled',
      subject: subject || '',
      description: description || ''
    });

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate({
        path: 'courseId',
        select: 'title instructor grade enrolledGrades',
        populate: {
          path: 'instructor',
          select: 'name email profilePicture'
        }
      })
      .populate('teacherId', 'name email profilePicture');

    // --- TRIGGER NOTIFICATIONS ---
    try {
      const eventLabel = (eventType || 'class').toUpperCase();
      const dateLabel = date ? `${date} (${dayOfWeek || ''})` : dayOfWeek;

      // 1. Notify Assigned Teacher
      if (finalTeacherId) {
        await Notification.create({
          recipient: finalTeacherId,
          type: 'GENERAL',
          title: `New ${eventLabel === 'EXAMINATION' ? 'Examination' : 'Class'} Scheduled`,
          message: `You have been scheduled for '${title}' (${className}) on ${dateLabel} from ${startTime} to ${endTime} in ${room || 'Main Hall'}.`,
          link: '/calendar'
        });
      }

      // 2. Notify Targeted Students
      const targetGradeName = String(className).trim();
      let studentFilter = { role: 'student', grade: new RegExp(targetGradeName, 'i') };

      if (courseId) {
        const targetCourse = await Course.findById(courseId);
        const enrolledStudentIds = targetCourse?.enrolledStudents || [];
        studentFilter._id = { $in: enrolledStudentIds };
      }

      const students = await User.find(studentFilter).select('_id');
      const notifDocs = students.map(st => ({
        recipient: st._id,
        type: 'GENERAL',
        title: `New ${eventLabel === 'EXAMINATION' ? 'Examination' : 'Class'} on Timetable`,
        message: `'${title}' (${className}) has been scheduled for ${dateLabel} from ${startTime} to ${endTime} in ${room || 'Main Hall'}.`,
        link: '/calendar'
      }));

      if (notifDocs.length > 0) {
        await Notification.insertMany(notifDocs);
      }
    } catch (notifErr) {
      console.error('Schedule notification error:', notifErr.message);
    }

    res.status(201).json({
      message: "Schedule entry created successfully",
      schedule: populatedSchedule
    });
  } catch (err) {
    console.error("Create Schedule Error:", err);
    res.status(500).json({ message: "Server error creating schedule entry" });
  }
});

// --- UPDATE SCHEDULE ENTRY (ADMIN ONLY) WITH CONFLICT DETECTION ---
router.put('/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  const { id } = req.params;
  const {
    title,
    courseId,
    className,
    dayOfWeek,
    startTime,
    endTime,
    teacherId,
    room,
    eventType,
    date,
    status,
    subject,
    description
  } = req.body;

  try {
    const existing = await Schedule.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }

    let finalTeacherId = teacherId !== undefined ? teacherId : existing.teacherId;
    if (!finalTeacherId && courseId) {
      const courseDoc = await Course.findById(courseId);
      if (courseDoc && courseDoc.instructor) {
        finalTeacherId = courseDoc.instructor;
      }
    }

    const newDay = dayOfWeek || existing.dayOfWeek;
    const newDate = date !== undefined ? date : existing.date;
    const newStart = startTime || existing.startTime;
    const newEnd = endTime || existing.endTime;
    const newRoom = room || existing.room;
    const newClass = className || existing.className;

    // Run conflict detection excluding this schedule
    const conflicts = await detectScheduleConflicts({
      scheduleId: id,
      teacherId: finalTeacherId,
      room: newRoom,
      className: newClass,
      dayOfWeek: newDay,
      date: newDate,
      startTime: newStart,
      endTime: newEnd
    });

    if (conflicts.length > 0) {
      return res.status(409).json({
        message: conflicts[0].message,
        conflictType: conflicts[0].type,
        conflicts
      });
    }

    // Apply updates
    if (title) existing.title = title;
    if (courseId !== undefined) existing.courseId = courseId || undefined;
    if (className) existing.className = className;
    if (dayOfWeek) existing.dayOfWeek = dayOfWeek;
    if (startTime) existing.startTime = startTime;
    if (endTime) existing.endTime = endTime;
    existing.teacherId = finalTeacherId || undefined;
    if (room) existing.room = room;
    if (eventType) existing.eventType = eventType;
    if (date !== undefined) existing.date = date;
    if (status) existing.status = status;
    if (subject !== undefined) existing.subject = subject;
    if (description !== undefined) existing.description = description;

    await existing.save();

    const populated = await Schedule.findById(existing._id)
      .populate({
        path: 'courseId',
        select: 'title instructor grade enrolledGrades',
        populate: {
          path: 'instructor',
          select: 'name email profilePicture'
        }
      })
      .populate('teacherId', 'name email profilePicture');

    // Notify affected teacher and students of schedule change
    try {
      const dateLabel = newDate ? `${newDate} (${newDay})` : newDay;
      const notifMsg = `'${existing.title}' (${existing.className}) schedule updated: ${dateLabel} from ${newStart} to ${newEnd} in ${newRoom}.`;

      if (finalTeacherId) {
        await Notification.create({
          recipient: finalTeacherId,
          type: 'GENERAL',
          title: 'Class Schedule Updated',
          message: notifMsg,
          link: '/calendar'
        });
      }

      const targetGradeName = String(existing.className).trim();
      let studentFilter = { role: 'student', grade: new RegExp(targetGradeName, 'i') };
      if (existing.courseId) {
        const targetCourse = await Course.findById(existing.courseId);
        const enrolledStudentIds = targetCourse?.enrolledStudents || [];
        studentFilter._id = { $in: enrolledStudentIds };
      }

      const students = await User.find(studentFilter).select('_id');
      const notifDocs = students.map(st => ({
        recipient: st._id,
        type: 'GENERAL',
        title: 'Timetable Schedule Updated',
        message: notifMsg,
        link: '/calendar'
      }));

      if (notifDocs.length > 0) {
        await Notification.insertMany(notifDocs);
      }
    } catch (notifErr) {
      console.error('Update schedule notification error:', notifErr.message);
    }

    res.json({
      message: "Schedule entry updated successfully",
      schedule: populated
    });
  } catch (err) {
    console.error("Update Schedule Error:", err);
    res.status(500).json({ message: "Server error updating schedule entry" });
  }
});

// --- POSTPONE OR RESCHEDULE CLASS (ADMIN ONLY) ---
router.patch('/:id/reschedule', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  const { id } = req.params;
  const { status, postponeReason, rescheduledTo } = req.body;

  if (!status || !['postponed', 'rescheduled', 'scheduled'].includes(status)) {
    return res.status(400).json({ message: "Valid status ('postponed', 'rescheduled', 'scheduled') is required." });
  }

  try {
    const schedule = await Schedule.findById(id)
      .populate('courseId')
      .populate('teacherId');

    if (!schedule) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }

    // If rescheduling to a new slot, check conflicts on that new slot!
    if (status === 'rescheduled' && rescheduledTo) {
      const { date, dayOfWeek, startTime, endTime, room } = rescheduledTo;
      if (!startTime || !endTime) {
        return res.status(400).json({ message: "Start time and end time are required for rescheduling." });
      }

      const conflicts = await detectScheduleConflicts({
        scheduleId: id,
        teacherId: schedule.teacherId?._id || schedule.teacherId,
        room: room || schedule.room,
        className: schedule.className,
        dayOfWeek: dayOfWeek || schedule.dayOfWeek,
        date: date || null,
        startTime,
        endTime
      });

      if (conflicts.length > 0) {
        return res.status(409).json({
          message: conflicts[0].message,
          conflictType: conflicts[0].type,
          conflicts
        });
      }

      schedule.rescheduledTo = {
        date: date || '',
        dayOfWeek: dayOfWeek || schedule.dayOfWeek,
        startTime,
        endTime,
        room: room || schedule.room
      };
    }

    schedule.status = status;
    schedule.postponeReason = postponeReason || '';
    if (status === 'scheduled') {
      schedule.rescheduledTo = undefined;
      schedule.postponeReason = '';
    }

    await schedule.save();

    const populated = await Schedule.findById(schedule._id)
      .populate({
        path: 'courseId',
        select: 'title instructor grade enrolledGrades',
        populate: {
          path: 'instructor',
          select: 'name email profilePicture'
        }
      })
      .populate('teacherId', 'name email profilePicture');

    // Send notifications to Teacher and Students
    try {
      let notifTitle = '';
      let notifMessage = '';

      if (status === 'postponed') {
        notifTitle = `Class Postponed: ${schedule.title}`;
        notifMessage = `'${schedule.title}' (${schedule.className}) originally scheduled for ${schedule.dayOfWeek} (${schedule.startTime} – ${schedule.endTime}) has been POSTPONED.${postponeReason ? ` Reason: ${postponeReason}` : ''}`;
      } else if (status === 'rescheduled') {
        const to = schedule.rescheduledTo;
        notifTitle = `Class Rescheduled: ${schedule.title}`;
        notifMessage = `'${schedule.title}' (${schedule.className}) has been RESCHEDULED to ${to.date || to.dayOfWeek} from ${to.startTime} to ${to.endTime} in ${to.room || schedule.room}.${postponeReason ? ` Reason: ${postponeReason}` : ''}`;
      } else {
        notifTitle = `Class Restored to Schedule: ${schedule.title}`;
        notifMessage = `'${schedule.title}' (${schedule.className}) has been restored to its regular schedule (${schedule.dayOfWeek} ${schedule.startTime} – ${schedule.endTime}).`;
      }

      const teacherRecipient = schedule.teacherId?._id || schedule.teacherId;
      if (teacherRecipient) {
        await Notification.create({
          recipient: teacherRecipient,
          type: 'CLASS_POSTPONED',
          title: notifTitle,
          message: notifMessage,
          link: '/calendar'
        });
      }

      const targetGradeName = String(schedule.className).trim();
      let studentFilter = { role: 'student', grade: new RegExp(targetGradeName, 'i') };
      if (schedule.courseId) {
        const enrolledStudentIds = schedule.courseId.enrolledStudents || [];
        studentFilter._id = { $in: enrolledStudentIds };
      }

      const students = await User.find(studentFilter).select('_id');
      const notifDocs = students.map(st => ({
        recipient: st._id,
        type: 'CLASS_POSTPONED',
        title: notifTitle,
        message: notifMessage,
        link: '/calendar'
      }));

      if (notifDocs.length > 0) {
        await Notification.insertMany(notifDocs);
      }
    } catch (notifErr) {
      console.error("Reschedule notification error:", notifErr.message);
    }

    res.json({
      message: `Schedule entry marked as ${status} successfully`,
      schedule: populated
    });
  } catch (err) {
    console.error("Reschedule Schedule Error:", err);
    res.status(500).json({ message: "Server error rescheduling schedule entry" });
  }
});

// --- DELETE SCHEDULE ENTRY (ADMIN ONLY) ---
router.delete('/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('courseId')
      .populate('teacherId');

    if (!schedule) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }

    await Schedule.findByIdAndDelete(req.params.id);

    // Notify affected teacher and students about schedule removal/cancellation
    try {
      if (schedule.teacherId) {
        await Notification.create({
          recipient: schedule.teacherId._id || schedule.teacherId,
          type: 'CLASS_POSTPONED',
          title: 'Class Schedule Cancelled',
          message: `The schedule for '${schedule.title}' (${schedule.className}) on ${schedule.dayOfWeek} (${schedule.startTime} - ${schedule.endTime}) has been removed.`,
          link: '/calendar'
        });
      }

      const targetGradeName = String(schedule.className).trim();
      let studentFilter = { role: 'student', grade: new RegExp(targetGradeName, 'i') };

      if (schedule.courseId) {
        const enrolledStudentIds = schedule.courseId.enrolledStudents || [];
        studentFilter._id = { $in: enrolledStudentIds };
      }

      const students = await User.find(studentFilter).select('_id');
      const notifDocs = students.map(st => ({
        recipient: st._id,
        type: 'CLASS_POSTPONED',
        title: 'Class Schedule Cancelled',
        message: `'${schedule.title}' (${schedule.className}) on ${schedule.dayOfWeek} (${schedule.startTime} - ${schedule.endTime}) has been cancelled/removed from the timetable.`,
        link: '/calendar'
      }));

      if (notifDocs.length > 0) {
        await Notification.insertMany(notifDocs);
      }
    } catch (notifErr) {
      console.error('Schedule deletion notification error:', notifErr.message);
    }

    res.json({ message: "Schedule entry deleted successfully" });
  } catch (err) {
    console.error("Delete Schedule Error:", err);
    res.status(500).json({ message: "Server error deleting schedule entry" });
  }
});

// ==========================================
//     TEACHER AVAILABILITY MANAGEMENT
// ==========================================

// --- GET TEACHER AVAILABILITY SLOTS ---
router.get('/teacher-availability', protect, async (req, res) => {
  try {
    let query = {};
    const userRole = req.user.role;
    const userId = req.user.id || req.user._id;

    if (userRole === 'teacher') {
      query.teacherId = userId;
    } else if (req.query.teacherId) {
      query.teacherId = req.query.teacherId;
    }

    const availabilities = await TeacherAvailability.find(query)
      .populate('teacherId', 'name email profilePicture')
      .sort({ dayOfWeek: 1, startTime: 1 })
      .lean();

    res.json(availabilities);
  } catch (err) {
    console.error("Fetch Teacher Availability Error:", err);
    res.status(500).json({ message: "Server error fetching teacher availability" });
  }
});

// --- CREATE / UPDATE TEACHER AVAILABILITY SLOT ---
router.post('/teacher-availability', protect, async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id || req.user._id;

  if (userRole !== 'admin' && userRole !== 'teacher') {
    return res.status(403).json({ message: "Access Denied: Teachers and Admins only." });
  }

  const {
    teacherId,
    dayOfWeek,
    date,
    startTime,
    endTime,
    isAvailable,
    slotType,
    reason
  } = req.body;

  const targetTeacherId = userRole === 'admin' ? (teacherId || userId) : userId;

  if (!startTime || !endTime || (!dayOfWeek && !date)) {
    return res.status(400).json({ message: "Start time, end time, and day or date are required." });
  }

  try {
    const slot = await TeacherAvailability.create({
      teacherId: targetTeacherId,
      dayOfWeek: dayOfWeek || undefined,
      date: date || null,
      startTime,
      endTime,
      isAvailable: isAvailable !== undefined ? isAvailable : (slotType === 'available' || slotType === 'preferred'),
      slotType: slotType || 'available',
      reason: reason || '',
      createdBy: userId
    });

    const populated = await TeacherAvailability.findById(slot._id)
      .populate('teacherId', 'name email profilePicture');

    res.status(201).json({
      message: "Teacher availability slot saved successfully",
      slot: populated
    });
  } catch (err) {
    console.error("Save Teacher Availability Error:", err);
    res.status(500).json({ message: "Server error saving teacher availability" });
  }
});

// --- DELETE TEACHER AVAILABILITY SLOT ---
router.delete('/teacher-availability/:id', protect, async (req, res) => {
  const userRole = req.user.role;
  const userId = req.user.id || req.user._id;

  try {
    const slot = await TeacherAvailability.findById(req.params.id);
    if (!slot) {
      return res.status(404).json({ message: "Availability slot not found" });
    }

    if (userRole !== 'admin' && slot.teacherId.toString() !== userId.toString()) {
      return res.status(403).json({ message: "Access denied: You can only remove your own availability slots." });
    }

    await TeacherAvailability.findByIdAndDelete(req.params.id);
    res.json({ message: "Availability slot removed successfully" });
  } catch (err) {
    console.error("Delete Teacher Availability Error:", err);
    res.status(500).json({ message: "Server error deleting availability slot" });
  }
});

// ==========================================
//     CLASSROOM / VENUE ALLOCATION
// ==========================================

// --- GET CLASSROOM ALLOCATIONS & OCCUPANCY ---
router.get('/classrooms', protect, async (req, res) => {
  try {
    const STANDARD_ROOMS = [
      'Main Hall',
      'Hall A',
      'Hall B',
      'Science Lab',
      'Computer Lab',
      'Room 101',
      'Room 202',
      'Online Class'
    ];

    // Find any additional custom rooms from existing schedules
    const distinctRooms = await Schedule.distinct('room');
    const allRooms = Array.from(new Set([...STANDARD_ROOMS, ...distinctRooms.filter(Boolean)]));

    // Optional filter by day or date
    const { dayOfWeek, date } = req.query;
    let scheduleQuery = { status: { $ne: 'cancelled' } };

    if (dayOfWeek) {
      scheduleQuery.dayOfWeek = dayOfWeek;
    }
    if (date) {
      scheduleQuery.$or = [
        { date: date },
        { "rescheduledTo.date": date }
      ];
    }

    const schedules = await Schedule.find(scheduleQuery)
      .populate('teacherId', 'name email profilePicture')
      .populate('courseId', 'title grade')
      .lean();

    const roomAllocations = allRooms.map(roomName => {
      const roomSchedules = schedules.filter(s => {
        const activeRoom = s.rescheduledTo?.room || s.room;
        return String(activeRoom).trim().toLowerCase() === roomName.trim().toLowerCase();
      });

      return {
        room: roomName,
        isPhysical: isPhysicalRoom(roomName),
        totalBookings: roomSchedules.length,
        bookings: roomSchedules.map(s => ({
          scheduleId: s._id,
          title: s.title,
          className: s.className,
          dayOfWeek: s.rescheduledTo?.dayOfWeek || s.dayOfWeek,
          date: s.rescheduledTo?.date || s.date,
          startTime: s.rescheduledTo?.startTime || s.startTime,
          endTime: s.rescheduledTo?.endTime || s.endTime,
          teacherName: s.teacherId?.name || 'Assigned Teacher',
          status: s.status
        }))
      };
    });

    res.json({
      totalRooms: allRooms.length,
      rooms: roomAllocations
    });
  } catch (err) {
    console.error("Classroom Allocations Error:", err);
    res.status(500).json({ message: "Server error fetching classroom allocations" });
  }
});

module.exports = router;
