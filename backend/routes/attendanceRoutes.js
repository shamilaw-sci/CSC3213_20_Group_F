const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/authMiddleware');
const { sendAttendanceSMS } = require('../services/smsService');

// --- HELPER: Normalize date to Midnight UTC/Local (YYYY-MM-DD) ---
const normalizeDate = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// ==========================================
//          1. MARK ATTENDANCE (ADMIN ONLY)
// ==========================================
router.post('/', protect, async (req, res) => {
  // Only admin is allowed to mark attendance
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
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
//          2. GET ATTENDANCE HISTORY FOR STUDENT
// ==========================================
router.get('/student/:studentId', protect, async (req, res) => {
  const { studentId } = req.params;
  const userId = req.user.id || req.user._id;

  if (req.user.role === 'student' && userId.toString() !== studentId) {
    return res.status(403).json({ message: "Access Denied: You can only view your own records." });
  }

  try {
    const history = await Attendance.find({ studentId })
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
    return res.status(400).json({ message: "Course ID and Week Number (1-4) are required." });
  }

  if (![1, 2, 3, 4].includes(Number(weekNumber))) {
    return res.status(400).json({ message: "Week Number must be between 1 and 4." });
  }

  const currentMonth = month || new Date().toLocaleString('default', { month: 'long' }) + ' ' + new Date().getFullYear();

  try {
    // Verify enrollment
    const Course = require('../models/Course');
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
  const studentId = req.user.id || req.user._id;

  try {
    const records = await Attendance.find({
      studentId,
      courseId,
      mode: 'ONLINE_WEEKLY'
    }).select('weekNumber month status date');

    const attendedWeeks = records.map(r => r.weekNumber);

    res.json({
      attendedWeeks,
      records
    });
  } catch (err) {
    console.error("Fetch Weekly Status Error:", err);
    res.status(500).json({ message: "Failed to fetch weekly attendance status." });
  }
});

module.exports = router;
