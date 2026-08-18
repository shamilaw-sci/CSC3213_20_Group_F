const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// --- GET SCHEDULES (ROLE-BASED FILTERING) ---
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

      // Only show schedule entries for courses the student is actively enrolled in
      query = {
        courseId: { $in: enrolledCourseIds }
      };

      if (req.user.grade) {
        query.className = req.user.grade;
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
    // Admin sees all schedules (query = {})

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
      .sort({ dayOfWeek: 1, startTime: 1 });

    res.json(schedules);
  } catch (err) {
    console.error("Fetch Schedule Error:", err);
    res.status(500).json({ message: "Server error fetching schedule" });
  }
});

// --- CREATE SCHEDULE ENTRY (ADMIN ONLY) ---
router.post('/', protect, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  const { title, courseId, className, dayOfWeek, startTime, endTime, teacherId, room } = req.body;

  if (!title || !className || !dayOfWeek || !startTime || !endTime) {
    return res.status(400).json({ message: "Title, Class Name, Day of Week, Start Time, and End Time are required." });
  }

  try {
    let finalTeacherId = teacherId;
    if (!finalTeacherId && courseId) {
      const courseDoc = await Course.findById(courseId);
      if (courseDoc && courseDoc.instructor) {
        finalTeacherId = courseDoc.instructor;
      }
    }

    const schedule = await Schedule.create({
      title,
      courseId: courseId || undefined,
      className,
      dayOfWeek,
      startTime,
      endTime,
      teacherId: finalTeacherId || undefined,
      room: room || 'Main Hall'
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
      // 1. Notify Assigned Teacher
      if (finalTeacherId) {
        await Notification.create({
          recipient: finalTeacherId,
          type: 'GENERAL',
          title: 'New Class Schedule Assigned',
          message: `You have been scheduled for '${title}' (${className}) on ${dayOfWeek} from ${startTime} to ${endTime}.`,
          link: '/dashboard'
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
        title: 'New Class Timetable Updated',
        message: `'${title}' (${className}) has been scheduled for ${dayOfWeek} from ${startTime} to ${endTime} in ${room || 'Main Hall'}.`,
        link: '/dashboard'
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
          link: '/dashboard'
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
        link: '/dashboard'
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

module.exports = router;
