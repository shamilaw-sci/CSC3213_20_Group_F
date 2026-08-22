const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Notification = require('../models/Notification');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const { protect, isAdmin, isCounterStaffOrAdmin } = require('../middleware/authMiddleware');
const { sendAttendanceSMS } = require('../services/smsService');
const { notifyParentsOfStudent } = require('../utils/notificationHelper');

const isStaffTeacherOrAdmin = (req, res, next) => {
  if (
    req.user &&
    (req.user.role === 'admin' ||
     req.user.role === 'counter_staff' ||
     req.user.role === 'teacher')
  ) {
    return next();
  }
  return res.status(403).json({ message: "Access denied. Admin, Staff, or Teacher role required." });
};

// --- HELPER: Normalize date to Midnight UTC/Local (YYYY-MM-DD) ---
const normalizeDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// --- HELPER: Robust Time String to Minutes Converter (handles 24h and 12h AM/PM) ---
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const clean = str.replace(/(am|pm)/i, '').trim();
  const [hStr, mStr] = clean.split(':');
  let hours = parseInt(hStr, 10) || 0;
  const minutes = parseInt(mStr, 10) || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// ==========================================
//          1. MARK ATTENDANCE (ADMIN & TEACHER)
// ==========================================
router.post('/', protect, async (req, res) => {
  // Allow admin, counter_staff, and teacher
  if (req.user.role !== 'admin' && req.user.role !== 'counter_staff' && req.user.role !== 'teacher') {
    return res.status(403).json({ message: "Access Denied: Authorized personnel only." });
  }

  const { studentId, scheduleId, status = 'Present', date } = req.body;

  if (!studentId || !scheduleId) {
    return res.status(400).json({ message: "Student ID and Schedule ID are required." });
  }

  try {
    // 1. Verify Student Exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: "Student not found." });
    }

    // 2. Verify Schedule Exists and extract courseId
    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule/Class entry not found." });
    }

    if (!schedule.courseId) {
      return res.status(400).json({ message: "Selected schedule is not linked to a course." });
    }

    // 3. Normalize Date to prevent multiple markings on the same calendar day
    const normalizedDate = normalizeDate(date);

    // 4. Create Attendance Record
    const newAttendance = new Attendance({
      studentId,
      scheduleId,
      courseId: schedule.courseId,
      date: normalizedDate,
      status,
      markedBy: req.user.id || req.user._id,
      notificationSentParent: false,
      notificationSentStudent: false
    });

    await newAttendance.save();

    // 5. Populate and Return
    const populatedAttendance = await Attendance.findById(newAttendance._id)
      .populate('studentId', 'name email registrationNumber parentsPhoneNumber')
      .populate('scheduleId', 'title startTime endTime room className')
      .populate('courseId', 'title')
      .populate('markedBy', 'name');

    // --- 6. TRIGGER NOTIFICATIONS (In-App & Parent SMS) ---
    try {
      const classTitle = populatedAttendance.scheduleId?.title || populatedAttendance.scheduleId?.className || populatedAttendance.courseId?.title || 'Class';
      const formattedDate = new Date(populatedAttendance.date).toLocaleDateString('en-GB');

      // 6a. In-App Notification for Student
      await Notification.create({
        recipient: student._id,
        type: 'ATTENDANCE',
        title: `Attendance Marked: ${status}`,
        message: `You were marked '${status}' for ${classTitle} on ${formattedDate}.`,
        link: '/attendance',
        metadata: { attendanceId: newAttendance._id, status, date: populatedAttendance.date }
      });
      newAttendance.notificationSentStudent = true;

      // 6b. SMS to Parent
      if (student.parentsPhoneNumber) {
        sendAttendanceSMS({
          parentPhone: student.parentsPhoneNumber,
          studentName: student.name,
          className: classTitle,
          date: populatedAttendance.date,
          time: populatedAttendance.scheduleId?.startTime || '',
          status
        });
        newAttendance.notificationSentParent = true;
      }

      // 6c. In-App Notification for Linked Parents
      await notifyParentsOfStudent({
        studentIdOrDoc: student._id,
        studentName: student.name,
        type: 'ATTENDANCE',
        title: `Attendance Marked: ${student.name}`,
        message: `${student.name} was marked '${status}' for ${classTitle} on ${formattedDate}.`,
        link: '/parent-dashboard',
        metadata: {
          studentId: student._id,
          studentName: student.name,
          attendanceId: newAttendance._id,
          status,
          date: populatedAttendance.date
        }
      });

      await newAttendance.save();
    } catch (notifErr) {
      console.error('Attendance notification error:', notifErr.message);
    }

    res.status(201).json({
      message: "Attendance marked successfully!",
      attendance: populatedAttendance
    });

  } catch (err) {
    console.error("Mark Attendance Error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ 
        message: "Attendance has already been marked for this student for this class on this date." 
      });
    }
    res.status(500).json({ message: "Server error marking attendance." });
  }
});

// ==========================================
//          1B. BATCH MARK ATTENDANCE (TEACHER & ADMIN)
// ==========================================
router.post('/mark-batch', protect, async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Teachers and Admins only." });
  }

  const { courseId, scheduleId, records, date } = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ message: "Student records list is required." });
  }

  try {
    const normalizedDate = normalizeDate(date);
    const markedBy = req.user.id || req.user._id;

    const savedRecords = [];
    for (const item of records) {
      if (!item.studentId) continue;
      
      const filter = {
        studentId: item.studentId,
        date: normalizedDate
      };
      if (courseId) filter.courseId = courseId;
      if (scheduleId) filter.scheduleId = scheduleId;

      const updateData = {
        studentId: item.studentId,
        courseId: courseId || undefined,
        scheduleId: scheduleId || undefined,
        status: item.status || 'Present',
        date: normalizedDate,
        markedBy
      };

      const recordDoc = await Attendance.findOneAndUpdate(
        filter,
        updateData,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      savedRecords.push(recordDoc);

      // In-App Notification trigger for student & parents
      try {
        await Notification.create({
          recipient: item.studentId,
          type: 'ATTENDANCE',
          title: `Attendance Recorded: ${item.status || 'Present'}`,
          message: `Your attendance status for today was recorded as '${item.status || 'Present'}'.`,
          link: '/dashboard'
        });

        await notifyParentsOfStudent({
          studentIdOrDoc: item.studentId,
          type: 'ATTENDANCE',
          title: `Attendance Status: ${item.status || 'Present'}`,
          message: `Your child's attendance status for today was recorded as '${item.status || 'Present'}'.`,
          link: '/parent-dashboard',
          metadata: { studentId: item.studentId, status: item.status }
        });
      } catch (notifErr) {
        // Silent catch for notification error
      }
    }

    res.json({
      message: `Successfully recorded attendance for ${savedRecords.length} student(s)!`,
      count: savedRecords.length
    });
  } catch (err) {
    console.error("Mark Batch Attendance Error:", err);
    res.status(500).json({ message: "Server error marking batch attendance." });
  }
});

// ==========================================
//          2. GET ATTENDANCE HISTORY FOR STUDENT
// ==========================================
router.get('/student/:studentId', protect, async (req, res) => {
  const { studentId } = req.params;
  const userId = req.user.id || req.user._id;

  if (req.user.role === 'student' && userId.toString() !== studentId) {
    return res.status(403).json({ message: "Access Denied: You can only view your own records." });
  }

  try {
    let filter = { studentId };

    // If requester is a teacher, only show records for that teacher's courses/schedules
    if (req.user.role === 'teacher') {
      const teacherCourses = await Course.find({ instructor: userId }).select('_id');
      const teacherCourseIds = teacherCourses.map(c => c._id);
      const teacherSchedules = await Schedule.find({
        $or: [{ teacherId: userId }, { courseId: { $in: teacherCourseIds } }]
      }).select('_id');
      const teacherScheduleIds = teacherSchedules.map(s => s._id);

      filter.$or = [
        { courseId: { $in: teacherCourseIds } },
        { scheduleId: { $in: teacherScheduleIds } }
      ];
    }

    const history = await Attendance.find(filter)
      .populate('scheduleId', 'title startTime endTime room className')
      .populate('courseId', 'title')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.json(history);
  } catch (err) {
    console.error("Fetch Student Attendance History Error:", err);
    res.status(500).json({ message: "Server error fetching attendance history." });
  }
});

// ==========================================
//          3. GET MY ATTENDANCE (STUDENT DASHBOARD)
// ==========================================
router.get('/my', protect, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: "Access Denied: Students only." });
  }

  const userId = req.user.id || req.user._id;

  try {
    const history = await Attendance.find({ studentId: userId })
      .populate('scheduleId', 'title startTime endTime room className')
      .populate('courseId', 'title')
      .populate('markedBy', 'name')
      .sort({ date: -1 });

    res.json(history);
  } catch (err) {
    console.error("Fetch My Attendance Error:", err);
    res.status(500).json({ message: "Server error fetching attendance." });
  }
});

// ==========================================
//          4. GET TEACHER ATTENDANCE LOGS
// ==========================================
router.get('/teacher', protect, async (req, res) => {
  if (req.user.role !== 'teacher') {
    return res.status(403).json({ message: "Access Denied: Teachers only." });
  }

  const userId = req.user.id || req.user._id;

  try {
    const teacherCourses = await Course.find({ instructor: userId }).select('_id');
    const courseIds = teacherCourses.map(c => c._id);

    const teacherSchedules = await Schedule.find({
      $or: [
        { teacherId: userId },
        { courseId: { $in: courseIds } }
      ]
    }).select('_id');

    const scheduleIds = teacherSchedules.map(s => s._id);

    const logs = await Attendance.find({
      $or: [
        { scheduleId: { $in: scheduleIds } },
        { courseId: { $in: courseIds } }
      ]
    })
      .populate('studentId', 'name registrationNumber email grade')
      .populate('scheduleId', 'title startTime endTime className room')
      .populate('courseId', 'title')
      .sort({ date: -1 });

    res.json(logs);
  } catch (err) {
    console.error("Fetch Teacher Attendance Logs Error:", err);
    res.status(500).json({ message: "Server error fetching teacher attendance logs." });
  }
});

// ==========================================
//          5. GET GENERAL STATS (ADMIN DASHBOARD)
// ==========================================
router.get('/stats/summary', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  try {
    const today = normalizeDate(new Date());

    const todayRecords = await Attendance.find({ date: today });
    const totalToday = todayRecords.length;
    const presentToday = todayRecords.filter(r => r.status === 'Present').length;
    const absentToday = todayRecords.filter(r => r.status === 'Absent').length;

    const totalRecordsCount = await Attendance.countDocuments();
    
    res.json({
      today: {
        total: totalToday,
        present: presentToday,
        absent: absentToday
      },
      overall: {
        totalCount: totalRecordsCount
      }
    });
  } catch (err) {
    console.error("Fetch Attendance Stats Error:", err);
    res.status(500).json({ message: "Server error fetching stats." });
  }
});

// ==========================================
//          6. SUBMIT WEEKLY ONLINE ATTENDANCE (STUDENT ONLY)
// ==========================================
router.post('/submit-weekly', protect, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: "Access Denied: Students only." });
  }

  const { courseId, weekNumber, month } = req.body;
  const studentId = req.user.id || req.user._id;

  if (!courseId || !weekNumber) {
    return res.status(400).json({ message: "Course ID and Week Number (1-5) are required." });
  }

  if (![1, 2, 3, 4, 5].includes(Number(weekNumber))) {
    return res.status(400).json({ message: "Week Number must be between 1 and 5." });
  }

  const currentMonth = month || new Date().toLocaleString('default', { month: 'long' }) + ' ' + new Date().getFullYear();

  try {
    // Verify enrollment
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: "Course not found." });
    }

    const isEnrolled = course.enrolledStudents?.some(id => id.toString() === studentId.toString());
    if (!isEnrolled) {
      return res.status(403).json({ message: "You must be enrolled in this course to submit attendance." });
    }

    // Check existing weekly attendance
    const existing = await Attendance.findOne({
      studentId,
      courseId,
      weekNumber: Number(weekNumber),
      month: currentMonth
    });

    if (existing) {
      return res.status(200).json({
        message: `Attendance for Week ${weekNumber} has already been submitted!`,
        alreadySubmitted: true,
        attendance: existing
      });
    }

    // Create new weekly attendance entry
    const newAttendance = new Attendance({
      studentId,
      courseId,
      weekNumber: Number(weekNumber),
      month: currentMonth,
      mode: 'ONLINE_WEEKLY',
      status: 'Present',
      date: new Date(),
      markedBy: studentId
    });

    await newAttendance.save();

    res.status(201).json({
      message: `Successfully submitted attendance for Week ${weekNumber}!`,
      attendance: newAttendance
    });
  } catch (err) {
    console.error("Submit Weekly Attendance Error:", err);
    if (err.code === 11000) {
      return res.status(200).json({ 
        message: `Attendance for Week ${weekNumber} has already been submitted!`,
        alreadySubmitted: true
      });
    }
    res.status(500).json({ message: "Failed to submit weekly attendance." });
  }
});

// ==========================================
//          7. GET WEEKLY ATTENDANCE STATUS (STUDENT)
// ==========================================
router.get('/weekly-status/:courseId', protect, async (req, res) => {
  const { courseId } = req.params;
  const { month } = req.query;
  const studentId = req.user.id || req.user._id;

  try {
    const records = await Attendance.find({ studentId, courseId });
    const cleanQueryMonth = month ? month.split(' ')[0].toLowerCase() : null;

    const attendedWeeks = [];
    records.forEach(r => {
      const recordDate = new Date(r.date);
      const recordMonthName = recordDate.toLocaleString('en-US', { month: 'long' }).toLowerCase();

      if (!cleanQueryMonth || recordMonthName === cleanQueryMonth || (r.month && r.month.toLowerCase().includes(cleanQueryMonth))) {
        let w = r.weekNumber;
        if (!w) {
          const d = recordDate.getDate();
          if (d <= 7) w = 1;
          else if (d <= 14) w = 2;
          else if (d <= 21) w = 3;
          else if (d <= 28) w = 4;
          else w = 5;
        }
        if (w && !attendedWeeks.includes(w)) {
          attendedWeeks.push(w);
        }
      }
    });

    res.json({
      attendedWeeks,
      records
    });
  } catch (err) {
    console.error("Fetch Weekly Status Error:", err);
    res.status(500).json({ message: "Failed to fetch weekly attendance status." });
  }
});

// ==========================================
//   ADMIN & TEACHER DAILY & ALL-TIME ATTENDANCE LOGS
// ==========================================
router.get('/admin/all-logs', protect, isStaffTeacherOrAdmin, async (req, res) => {
  try {
    const { date, courseId, grade, search } = req.query;
    let filter = {};

    // IF REQUESTER IS A TEACHER: STRICTLY SCOPE TO TEACHER'S CLASSES
    if (req.user.role === 'teacher') {
      const teacherCourses = await Course.find({ instructor: req.user._id }).select('_id');
      const teacherCourseIds = teacherCourses.map(c => c._id);
      const teacherSchedules = await Schedule.find({
        $or: [{ teacherId: req.user._id }, { courseId: { $in: teacherCourseIds } }]
      }).select('_id');
      const teacherScheduleIds = teacherSchedules.map(s => s._id);

      if (courseId) {
        if (teacherCourseIds.some(id => id.toString() === courseId)) {
          filter.courseId = courseId;
        } else {
          return res.json([]);
        }
      } else {
        filter.$or = [
          { courseId: { $in: teacherCourseIds } },
          { scheduleId: { $in: teacherScheduleIds } }
        ];
      }
    } else if (courseId) {
      filter.courseId = courseId;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      filter.date = { $gte: startOfDay, $lte: endOfDay };
    }

    let studentMatch = {};
    if (grade) studentMatch.grade = grade;
    if (search) {
      studentMatch.$or = [
        { name: new RegExp(search, 'i') },
        { registrationNumber: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') }
      ];
    }

    const logs = await Attendance.find(filter)
      .populate({
        path: 'studentId',
        select: 'name email registrationNumber grade profilePicture studentType',
        match: Object.keys(studentMatch).length > 0 ? studentMatch : undefined
      })
      .populate('courseId', 'title grade category')
      .populate('scheduleId', 'title startTime endTime room className')
      .populate('markedBy', 'name role')
      .sort({ date: -1 });

    const filteredLogs = logs.filter(item => item.studentId !== null);
    res.json(filteredLogs);
  } catch (err) {
    console.error("Fetch attendance logs error:", err);
    res.status(500).json({ message: "Server error fetching attendance logs" });
  }
});

// ==========================================
//   7. GET TODAY'S REAL-TIME CHECK-INS FEED
// ==========================================
router.get('/today-scans', protect, isStaffTeacherOrAdmin, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let filter = {
      date: { $gte: todayStart, $lte: todayEnd }
    };

    // IF TEACHER: Strictly scope to teacher's courses & schedules
    if (req.user.role === 'teacher') {
      const teacherCourses = await Course.find({ instructor: req.user._id }).select('_id');
      const teacherCourseIds = teacherCourses.map(c => c._id);
      const teacherSchedules = await Schedule.find({
        $or: [{ teacherId: req.user._id }, { courseId: { $in: teacherCourseIds } }]
      }).select('_id');
      const teacherScheduleIds = teacherSchedules.map(s => s._id);

      filter.$or = [
        { courseId: { $in: teacherCourseIds } },
        { scheduleId: { $in: teacherScheduleIds } }
      ];
    }

    const logs = await Attendance.find(filter)
      .populate('studentId', 'name email registrationNumber grade profilePicture studentType')
      .populate('courseId', 'title grade category')
      .populate('scheduleId', 'title startTime endTime room className')
      .sort({ date: -1, createdAt: -1 });

    const validLogs = logs.filter(l => l.studentId);

    // Fetch payments/enrollments to resolve paymentStatus
    const studentIds = validLogs.map(l => l.studentId._id);
    const Payment = require('../models/Payment');
    const Enrollment = require('../models/Enrollment');

    const payments = await Payment.find({
      student: { $in: studentIds },
      status: 'COMPLETED'
    });
    const enrollments = await Enrollment.find({
      student: { $in: studentIds },
      paymentStatus: { $in: ['PAID', 'COMPLETED', 'APPROVED'] }
    });

    const paymentMap = new Map();
    payments.forEach(p => {
      paymentMap.set(`${p.student.toString()}_${p.course ? p.course.toString() : 'ALL'}`, true);
      paymentMap.set(`${p.student.toString()}_ALL`, true);
    });
    enrollments.forEach(e => {
      paymentMap.set(`${e.student.toString()}_${e.course ? e.course.toString() : 'ALL'}`, true);
    });

    const formattedFeed = validLogs.map(log => {
      const sId = log.studentId._id.toString();
      const cId = log.courseId ? log.courseId._id.toString() : '';
      const isPaid = paymentMap.get(`${sId}_${cId}`) || paymentMap.get(`${sId}_ALL`) || false;

      return {
        _id: log._id,
        attendance: log,
        student: {
          id: log.studentId._id,
          _id: log.studentId._id,
          name: log.studentId.name,
          email: log.studentId.email,
          registrationNumber: log.studentId.registrationNumber,
          grade: log.studentId.grade,
          studentType: log.studentId.studentType,
          profilePicture: log.studentId.profilePicture
        },
        targetCourseTitle: log.scheduleId?.title || log.courseId?.title || log.remarks || 'Class Check-in',
        scheduleTitle: log.scheduleId?.title || log.courseId?.title || log.remarks,
        timeRange: log.scheduleId ? `${log.scheduleId.startTime} - ${log.scheduleId.endTime}` : '',
        room: log.scheduleId?.room || '',
        paymentStatus: isPaid ? 'PAID' : 'UNSETTLED',
        scanTime: log.date || log.createdAt
      };
    });

    res.json(formattedFeed);
  } catch (err) {
    console.error("Fetch today scans error:", err);
    res.status(500).json({ message: "Server error fetching today's scans" });
  }
});

// ==========================================
//     8. LIVE QR CODE ATTENDANCE SCANNER (ADMIN & TEACHER)
// ==========================================
router.post('/scan-qr', protect, isStaffTeacherOrAdmin, async (req, res) => {
  try {
    const { registrationNumber, studentId, courseId: reqCourseId, scheduleId: reqScheduleId } = req.body;
    const adminId = req.user._id || req.user.id;

    if (!registrationNumber && !studentId) {
      return res.status(400).json({ error: "Registration Number or Student ID is required for QR scan." });
    }

    const filter = registrationNumber 
      ? { registrationNumber: registrationNumber.trim() } 
      : { _id: studentId };

    const student = await User.findOne(filter);
    if (!student) {
      return res.status(404).json({ error: `Student with Reg No '${registrationNumber}' not found in database.` });
    }

    let resolvedCourseId = reqCourseId || null;
    let resolvedScheduleId = reqScheduleId && reqScheduleId !== 'AUTO' ? reqScheduleId : null;
    let targetCourseTitle = 'General Institute Session';
    let targetScheduleDetails = null;

    const Payment = require('../models/Payment');
    const Course = require('../models/Course');
    const Schedule = require('../models/Schedule');

    // If explicit scheduleId was provided (e.g. manual selection in kiosk), resolve course and title
    if (resolvedScheduleId) {
      const explicitSchedule = await Schedule.findById(resolvedScheduleId).populate('courseId');
      if (explicitSchedule) {
        if (!resolvedCourseId && explicitSchedule.courseId) {
          resolvedCourseId = explicitSchedule.courseId._id || explicitSchedule.courseId;
        }
        targetCourseTitle = explicitSchedule.title || (explicitSchedule.courseId && explicitSchedule.courseId.title) || targetCourseTitle;
        targetScheduleDetails = {
          title: explicitSchedule.title,
          room: explicitSchedule.room,
          startTime: explicitSchedule.startTime,
          endTime: explicitSchedule.endTime,
          dayOfWeek: explicitSchedule.dayOfWeek
        };
      }
    }

    // AUTO-DETECT SCHEDULE BY TIME & GRADE IF NOT EXPLICITLY PROVIDED
    let foundScheduleMatch = false;
    if (!resolvedScheduleId) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const currentDay = days[new Date().getDay()];
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      // Find all courses where student is actively enrolled
      const Enrollment = require('../models/Enrollment');
      const enrolledCoursesDirect = await Course.find({
        $or: [
          { enrolledStudents: student._id },
          { "classes.enrolledStudents": student._id }
        ]
      }).select('_id');
      const enrolledDocs = await Enrollment.find({ student: student._id }).select('course');
      const enrolledCourseIdsSet = new Set([
        ...enrolledCoursesDirect.map(c => c._id.toString()),
        ...enrolledDocs.map(e => e.course ? e.course.toString() : null).filter(Boolean)
      ]);

      // Find schedules matching today and student's grade
      const candidateSchedules = await Schedule.find({
        dayOfWeek: currentDay,
        className: student.grade
      }).populate('courseId');

      // Sort candidate schedules by start time (earliest first), then enrolled-courses first
      candidateSchedules.sort((a, b) => {
        const aCourseId = a.courseId ? (a.courseId._id ? a.courseId._id.toString() : a.courseId.toString()) : '';
        const bCourseId = b.courseId ? (b.courseId._id ? b.courseId._id.toString() : b.courseId.toString()) : '';
        const aEnrolled = enrolledCourseIdsSet.has(aCourseId);
        const bEnrolled = enrolledCourseIdsSet.has(bCourseId);
        if (aEnrolled && !bEnrolled) return -1;
        if (!aEnrolled && bEnrolled) return 1;
        // Secondary sort by start time (earlier class first)
        const aStartMin = parseTimeToMinutes(a.startTime);
        const bStartMin = parseTimeToMinutes(b.startTime);
        return aStartMin - bStartMin;
      });

      // Get all schedules already attended by this student today — skip them so
      // a second QR scan correctly picks up the NEXT class, not the already-logged one
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const attendedToday = await Attendance.find({
        studentId: student._id,
        date: { $gte: todayStart, $lte: todayEnd },
        scheduleId: { $exists: true, $ne: null }
      }).select('scheduleId');
      const attendedScheduleIds = new Set(attendedToday.map(a => a.scheduleId.toString()));

      for (const sch of candidateSchedules) {
        if (sch.startTime) {
          const startMin = parseTimeToMinutes(sch.startTime);
          let endMin = sch.endTime ? parseTimeToMinutes(sch.endTime) : (startMin + 120);
          // Handle overnight classes (e.g. 22:30 to 00:30)
          if (endMin < startMin) endMin += 24 * 60;

          // Match if current time is within schedule window (30 min before class START through class duration + 15 min buffer)
          // e.g. a 1:30 PM to 3:30 PM class accepts scans from 1:00 PM (13:00) to 3:45 PM (15:45)
          if (currentMinutes >= (startMin - 30) && currentMinutes <= (endMin + 15)) {
            // Skip this schedule if student already attended it today — move on to next class
            if (attendedScheduleIds.has(sch._id.toString())) {
              continue;
            }
            resolvedScheduleId = sch._id;
            resolvedCourseId = sch.courseId ? (sch.courseId._id || sch.courseId) : resolvedCourseId;
            targetCourseTitle = sch.title || (sch.courseId && sch.courseId.title) || targetCourseTitle;
            targetScheduleDetails = {
              title: sch.title,
              room: sch.room,
              startTime: sch.startTime,
              endTime: sch.endTime,
              dayOfWeek: sch.dayOfWeek
            };
            foundScheduleMatch = true;
            break;
          }
        }
      }
    }

    // Fetch course title if courseId was explicitly passed or resolved
    if (resolvedCourseId && (!targetCourseTitle || targetCourseTitle === 'General Institute Session')) {
      const foundCourse = await Course.findById(resolvedCourseId);
      if (foundCourse) {
        targetCourseTitle = foundCourse.title;
      }
    }

    // CHECK PAYMENT STATUS (Checks Payment collection and Enrollment collection)
    let paymentStatus = 'UNSETTLED';
    if (resolvedCourseId) {
      const existingPayment = await Payment.findOne({
        student: student._id,
        course: resolvedCourseId,
        status: 'COMPLETED'
      });

      const existingEnrollment = await Enrollment.findOne({
        student: student._id,
        course: resolvedCourseId,
        paymentStatus: { $in: ['PAID', 'COMPLETED', 'APPROVED'] }
      });

      if (existingPayment || existingEnrollment) {
        paymentStatus = 'PAID';
      } else {
        // Fallback: check if student has any completed payment for the current month
        const anyPayment = await Payment.findOne({ student: student._id, status: 'COMPLETED' });
        if (anyPayment) {
          paymentStatus = 'PAID';
        }
      }
    } else {
      const anyPayment = await Payment.findOne({ student: student._id, status: 'COMPLETED' });
      if (anyPayment) {
        paymentStatus = 'PAID';
      }
    }

    // Create Physical QR Attendance Record
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Prevent duplicate scans within the same day for the SAME class schedule/course
    let scanFilter = {
      studentId: student._id,
      date: { $gte: todayStart, $lte: todayEnd }
    };
    if (resolvedScheduleId) {
      scanFilter.scheduleId = resolvedScheduleId;
    } else if (resolvedCourseId) {
      scanFilter.courseId = resolvedCourseId;
    }

    const existingScan = await Attendance.findOne(scanFilter);

    let newScanRecord;
    if (!existingScan) {
      const scanDate = new Date();
      const dayOfMonth = scanDate.getDate();
      let calculatedWeek = 1;
      if (dayOfMonth <= 7) calculatedWeek = 1;
      else if (dayOfMonth <= 14) calculatedWeek = 2;
      else if (dayOfMonth <= 21) calculatedWeek = 3;
      else calculatedWeek = 4;

      const currentMonthStr = scanDate.toLocaleString('en-US', { month: 'long' });
      const remarksFormatted = targetCourseTitle 
        ? `${targetCourseTitle} (${currentMonthStr} - Week ${calculatedWeek})`
        : `${currentMonthStr} - Week ${calculatedWeek}`;

      const attendanceData = {
        studentId: student._id,
        mode: 'PHYSICAL_QR',
        status: 'Present',
        weekNumber: calculatedWeek,
        month: currentMonthStr,
        remarks: remarksFormatted,
        date: scanDate,
        markedBy: adminId
      };
      if (resolvedCourseId) attendanceData.courseId = resolvedCourseId;
      if (resolvedScheduleId) attendanceData.scheduleId = resolvedScheduleId;

      newScanRecord = await Attendance.create(attendanceData);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const sessionInfoStr = targetScheduleDetails 
        ? `${targetScheduleDetails.title} (Room ${targetScheduleDetails.room || '1'}, ${targetScheduleDetails.startTime}-${targetScheduleDetails.endTime})` 
        : targetCourseTitle;

      // 1. Dispatch automated SMS to parent if parentsPhoneNumber exists
      if (student.parentsPhoneNumber) {
        try {
          const { sendSMS } = require('../services/smsService');
          sendSMS({
            phone: student.parentsPhoneNumber,
            message: `Dear Parent, ${student.name} has safely arrived and checked in for ${sessionInfoStr} at ${timeStr}.`,
            studentName: student.name
          });
        } catch (smsErr) {
          console.error("QR Scan SMS Error:", smsErr);
        }
      }

      // 2. Dispatch In-App Notification Alerts to parent(s) and student
      try {
        await notifyParentsOfStudent({
          studentIdOrDoc: student._id,
          studentName: student.name,
          type: 'ATTENDANCE',
          title: `🔔 Student Arrival: ${student.name}`,
          message: `${student.name} has safely arrived and checked in for ${sessionInfoStr} at ${timeStr}.`,
          link: '/parent-dashboard',
          metadata: {
            studentId: student._id,
            studentName: student.name,
            session: sessionInfoStr,
            time: timeStr
          }
        });

        await Notification.create({
          recipient: student._id,
          type: 'ATTENDANCE',
          title: `✅ Class Check-in Recorded`,
          message: `Your attendance for ${sessionInfoStr} at ${timeStr} has been successfully recorded.`,
          link: '/dashboard'
        });
      } catch (notifErr) {
        console.error("In-App Attendance Notification Error:", notifErr);
      }
    } else {
      newScanRecord = existingScan;
    }

    // Build appropriate message
    let responseMessage;
    let isAlreadyScanned = false;
    if (!existingScan) {
      responseMessage = `Check-in successful for ${student.name}!`;
    } else {
      responseMessage = `Attendance already logged for ${student.name} today!`;
      isAlreadyScanned = true;
    }

    res.status(200).json({
      success: true,
      alreadyScannedToday: isAlreadyScanned,
      message: responseMessage,
      student: {
        id: student._id,
        _id: student._id,
        name: student.name,
        email: student.email,
        registrationNumber: student.registrationNumber,
        grade: student.grade,
        parentsPhoneNumber: student.parentsPhoneNumber,
        studentType: student.studentType,
        profilePicture: student.profilePicture
      },
      targetCourseTitle: targetScheduleDetails?.title || targetCourseTitle || 'Class Check-in',
      scheduleTitle: targetScheduleDetails?.title || targetCourseTitle,
      timeRange: targetScheduleDetails ? `${targetScheduleDetails.startTime} - ${targetScheduleDetails.endTime}` : '',
      room: targetScheduleDetails?.room || '',
      paymentStatus,
      scanTime: newScanRecord?.date || new Date(),
      attendance: newScanRecord
    });

  } catch (err) {
    console.error("QR Scan Error:", err);
    res.status(500).json({ error: "Failed to process QR scan: " + err.message });
  }
});

module.exports = router;
