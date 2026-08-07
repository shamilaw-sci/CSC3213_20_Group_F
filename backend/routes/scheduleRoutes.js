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
      // Students see schedule entries matching their current grade/class
      if (req.user.grade) {
        query.className = req.user.grade;
      } else {
        // If student has no grade assigned yet, they won't see schedule entries
        return res.json([]);
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
      .populate('courseId', 'title')
      .populate('teacherId', 'name email')
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
    const schedule = await Schedule.create({
      title,
      courseId: courseId || undefined,
      className,
      dayOfWeek,
      startTime,
      endTime,
      teacherId: teacherId || undefined,
      room: room || 'Main Hall'
    });

    const populatedSchedule = await Schedule.findById(schedule._id)
      .populate('courseId', 'title')
      .populate('teacherId', 'name email');

    // --- TRIGGER NOTIFICATIONS ---
    try {
      // 1. Notify Assigned Teacher
      if (teacherId) {
        await Notification.create({
          recipient: teacherId,
          type: 'GENERAL',
          title: 'New Class Schedule Assigned',
          message: `You have been scheduled for '${title}' (${className}) on ${dayOfWeek} from ${startTime} to ${endTime}.`,
          link: '/dashboard'
        });
      }

      // 2. Notify Target Grade Students
      const targetGradeName = String(className).trim();
      const students = await User.find({ role: 'student', grade: new RegExp(targetGradeName, 'i') }).select('_id');
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
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: "Schedule entry not found" });
    }
    res.json({ message: "Schedule entry deleted successfully" });
  } catch (err) {
    console.error("Delete Schedule Error:", err);
    res.status(500).json({ message: "Server error deleting schedule entry" });
  }
});

module.exports = router;
