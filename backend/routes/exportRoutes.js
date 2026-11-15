const express = require('express');
const router = express.Router();
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { logAudit } = require('../services/auditLogger');
const {
  convertToCSV,
  formatDate,
  studentColumns,
  attendanceColumns,
  paymentColumns,
  academicColumns,
  compressGzip
} = require('../services/exportService');

const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Lesson = require('../models/Lesson');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');

/**
 * @route   GET /api/export/summary
 * @desc    Get real-time collection metrics and counts for Export Center dashboard
 * @access  Private (Admin only)
 */
router.get('/summary', protect, isAdmin, async (req, res) => {
  try {
    const [
      totalStudents,
      onlineStudents,
      physicalStudents,
      totalTeachers,
      totalCourses,
      totalPayments,
      totalAttendance,
      totalQuizSubmissions,
      totalAssignmentSubmissions,
      totalAuditLogs
    ] = await Promise.all([
      User.countDocuments({ role: 'student' }),
      User.countDocuments({ role: 'student', studentType: 'online' }),
      User.countDocuments({ role: 'student', studentType: 'physical' }),
      User.countDocuments({ role: 'teacher' }),
      Course.countDocuments(),
      Payment.countDocuments(),
      Attendance.countDocuments(),
      QuizSubmission.countDocuments(),
      AssignmentSubmission.countDocuments(),
      AuditLog.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          online: onlineStudents,
          physical: physicalStudents
        },
        teachers: totalTeachers,
        courses: totalCourses,
        payments: totalPayments,
        attendance: totalAttendance,
        academicSubmissions: totalQuizSubmissions + totalAssignmentSubmissions,
        auditLogs: totalAuditLogs
      }
    });
  } catch (error) {
    console.error('Error fetching export summary counts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary metrics.' });
  }
});

/**
 * @route   GET /api/export/students
 * @desc    Export student directory (CSV or JSON)
 * @access  Private (Admin only)
 */
router.get('/students', protect, isAdmin, async (req, res) => {
  try {
    const { grade, studentType, format = 'csv' } = req.query;

    const query = { role: 'student' };
    if (grade && grade !== 'ALL') {
      query.grade = grade.trim();
    }
    if (studentType && studentType !== 'ALL') {
      query.studentType = studentType.trim();
    }

    const students = await User.find(query)
      .select('-password -activeSessionId -__v')
      .sort({ registrationNumber: 1, name: 1 })
      .lean();

    // Audit log this export action
    logAudit({
      req,
      action: 'DATA_EXPORT',
      entity: 'User',
      summary: `Admin exported ${students.length} student records (${format.toUpperCase()}) with filters: Grade=${grade || 'ALL'}, Type=${studentType || 'ALL'}`
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="students-export-${timestamp}.json"`);
      return res.json(students);
    }

    const csvData = convertToCSV(students, studentColumns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="students-export-${timestamp}.csv"`);
    return res.send(csvData);
  } catch (error) {
    console.error('Export students error:', error);
    res.status(500).json({ success: false, message: 'Failed to export student records.' });
  }
});

/**
 * @route   GET /api/export/attendance
 * @desc    Export attendance records (CSV or JSON)
 * @access  Private (Admin only)
 */
router.get('/attendance', protect, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, courseId, status, format = 'csv' } = req.query;

    const query = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (courseId && courseId !== 'ALL') {
      query.courseId = courseId;
    }
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (!endDate.includes('T')) end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    const records = await Attendance.find(query)
      .populate('studentId', 'name registrationNumber grade')
      .populate('courseId', 'title')
      .populate('scheduleId', 'title className')
      .populate('markedBy', 'name role')
      .sort({ date: -1 })
      .lean();

    logAudit({
      req,
      action: 'DATA_EXPORT',
      entity: 'Attendance',
      summary: `Admin exported ${records.length} attendance records (${format.toUpperCase()})`
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${timestamp}.json"`);
      return res.json(records);
    }

    const csvData = convertToCSV(records, attendanceColumns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-export-${timestamp}.csv"`);
    return res.send(csvData);
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({ success: false, message: 'Failed to export attendance records.' });
  }
});

/**
 * @route   GET /api/export/payments
 * @desc    Export financial payments ledger (CSV or JSON)
 * @access  Private (Admin only)
 */
router.get('/payments', protect, isAdmin, async (req, res) => {
  try {
    const { startDate, endDate, status, paymentMethod, format = 'csv' } = req.query;

    const query = {};
    if (status && status !== 'ALL') {
      query.status = status;
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      query.paymentMethod = paymentMethod;
    }
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        if (!endDate.includes('T')) end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const payments = await Payment.find(query)
      .populate('student', 'name registrationNumber grade email')
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .lean();

    logAudit({
      req,
      action: 'DATA_EXPORT',
      entity: 'Payment',
      summary: `Admin exported ${payments.length} payment records (${format.toUpperCase()})`
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="payments-export-${timestamp}.json"`);
      return res.json(payments);
    }

    const csvData = convertToCSV(payments, paymentColumns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="payments-export-${timestamp}.csv"`);
    return res.send(csvData);
  } catch (error) {
    console.error('Export payments error:', error);
    res.status(500).json({ success: false, message: 'Failed to export payment records.' });
  }
});

/**
 * @route   GET /api/export/academic
 * @desc    Export academic grading and submission reports (CSV or JSON)
 * @access  Private (Admin only)
 */
router.get('/academic', protect, isAdmin, async (req, res) => {
  try {
    const { courseId, format = 'csv' } = req.query;

    const quizFilter = {};
    const assignFilter = {};

    // 1. Fetch Quiz Submissions
    const quizSubs = await QuizSubmission.find(quizFilter)
      .populate('quiz', 'title course')
      .populate('student', 'name registrationNumber grade')
      .lean();

    // 2. Fetch Assignment Submissions
    const assignSubs = await AssignmentSubmission.find(assignFilter)
      .populate('assignment', 'title')
      .populate('student', 'name registrationNumber grade')
      .populate('course', 'title')
      .lean();

    // Populate course titles for quizzes
    const courseIds = quizSubs.map(q => q.quiz?.course).filter(Boolean);
    const courses = await Course.find({ _id: { $in: courseIds } }).select('title').lean();
    const courseMap = {};
    courses.forEach(c => { courseMap[c._id.toString()] = c.title; });

    const rows = [];

    // Transform Quiz Submissions
    for (const q of quizSubs) {
      if (!q.student) continue;
      const cTitle = q.quiz?.course ? (courseMap[q.quiz.course.toString()] || 'Course') : 'General';
      const percentage = q.totalPoints > 0 ? Math.round((q.score / q.totalPoints) * 100) : 100;
      rows.push({
        studentName: q.student.name,
        registrationNumber: q.student.registrationNumber || 'N/A',
        grade: q.student.grade || 'N/A',
        courseTitle: cTitle,
        assessmentType: 'Quiz',
        assessmentTitle: q.quiz?.title || 'Quiz',
        score: q.score,
        totalPoints: q.totalPoints,
        percentage: `${percentage}%`,
        submissionDate: q.completedAt || q.createdAt,
        status: 'Completed'
      });
    }

    // Transform Assignment Submissions
    for (const a of assignSubs) {
      if (!a.student) continue;
      const cTitle = a.course?.title || 'Course';
      rows.push({
        studentName: a.student.name,
        registrationNumber: a.student.registrationNumber || 'N/A',
        grade: a.student.grade || 'N/A',
        courseTitle: cTitle,
        assessmentType: 'Assignment',
        assessmentTitle: a.assignment?.title || 'Assignment',
        score: a.grade || 'Submitted',
        totalPoints: '100',
        percentage: a.grade ? `${a.grade}%` : 'Pending Grade',
        submissionDate: a.submittedAt || a.createdAt,
        status: a.status || (a.isLate ? 'Late Submission' : 'Submitted')
      });
    }

    logAudit({
      req,
      action: 'DATA_EXPORT',
      entity: 'System',
      summary: `Admin exported ${rows.length} academic performance records (${format.toUpperCase()})`
    });

    const timestamp = new Date().toISOString().split('T')[0];

    if (format.toLowerCase() === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="academic-report-${timestamp}.json"`);
      return res.json(rows);
    }

    const csvData = convertToCSV(rows, academicColumns);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="academic-report-${timestamp}.csv"`);
    return res.send(csvData);
  } catch (error) {
    console.error('Export academic report error:', error);
    res.status(500).json({ success: false, message: 'Failed to export academic reports.' });
  }
});

/**
 * @route   GET /api/export/backup
 * @desc    Generate full database snapshot backup (.json or .json.gz)
 * @access  Private (Admin only)
 */
router.get('/backup', protect, isAdmin, async (req, res) => {
  try {
    const { compress = 'true' } = req.query;
    const shouldCompress = compress !== 'false';

    console.log(`[BACKUP] Starting system snapshot export by admin ${req.user.name}...`);

    // Fetch collections concurrently with lean queries and sensitive field sanitization
    const [
      users,
      courses,
      lessons,
      enrollments,
      payments,
      attendances,
      quizzes,
      quizSubmissions,
      assignments,
      assignmentSubmissions,
      systemSettings,
      auditLogs
    ] = await Promise.all([
      User.find().select('-password -activeSessionId').lean(),
      Course.find().lean(),
      Lesson.find().lean(),
      Enrollment.find().lean(),
      Payment.find().lean(),
      Attendance.find().lean(),
      Quiz.find().lean(),
      QuizSubmission.find().lean(),
      Assignment.find().lean(),
      AssignmentSubmission.find().lean(),
      SystemSetting.find().lean(),
      AuditLog.find().limit(5000).sort({ createdAt: -1 }).lean()
    ]);

    const backupPayload = {
      meta: {
        system: 'LuminaLearn LMS',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        exportedBy: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email
        },
        counts: {
          users: users.length,
          courses: courses.length,
          lessons: lessons.length,
          enrollments: enrollments.length,
          payments: payments.length,
          attendance: attendances.length,
          quizzes: quizzes.length,
          quizSubmissions: quizSubmissions.length,
          assignments: assignments.length,
          assignmentSubmissions: assignmentSubmissions.length,
          systemSettings: systemSettings.length,
          auditLogs: auditLogs.length
        }
      },
      data: {
        users,
        courses,
        lessons,
        enrollments,
        payments,
        attendances,
        quizzes,
        quizSubmissions,
        assignments,
        assignmentSubmissions,
        systemSettings,
        auditLogs
      }
    };

    const jsonString = JSON.stringify(backupPayload, null, 2);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    logAudit({
      req,
      action: 'SYSTEM_BACKUP',
      entity: 'System',
      summary: `Admin created full database backup snapshot containing ${users.length} users, ${payments.length} payments, ${attendances.length} attendance records`
    });

    if (shouldCompress) {
      const gzippedBuffer = await compressGzip(Buffer.from(jsonString, 'utf-8'));
      res.setHeader('Content-Type', 'application/gzip');
      res.setHeader('Content-Disposition', `attachment; filename="luminalearn-backup-${timestamp}.json.gz"`);
      return res.send(gzippedBuffer);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="luminalearn-backup-${timestamp}.json"`);
      return res.send(jsonString);
    }
  } catch (error) {
    console.error('System backup error:', error);
    res.status(500).json({ success: false, message: 'Failed to create system backup: ' + error.message });
  }
});

module.exports = router;
