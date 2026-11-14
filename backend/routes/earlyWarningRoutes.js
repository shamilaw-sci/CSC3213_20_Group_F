const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { protect } = require('../middleware/authMiddleware');
const { analyzeStudentPerformance, getEarlyWarningSummary } = require('../services/earlyWarningService');

/**
 * @route   GET /api/early-warning/summary
 * @desc    Get Early Warning summary and students needing attention tailored to role
 * @access  Private (Admin, Teacher, Parent, Student)
 */
router.get('/summary', protect, async (req, res) => {
  try {
    const role = req.user.role;

    if (role === 'admin') {
      const summary = await getEarlyWarningSummary({ filterRole: 'admin' });
      return res.json({
        success: true,
        role: 'admin',
        ...summary
      });
    }

    if (role === 'teacher') {
      const summary = await getEarlyWarningSummary({
        filterRole: 'teacher',
        teacherId: req.user._id
      });
      return res.json({
        success: true,
        role: 'teacher',
        ...summary
      });
    }

    if (role === 'parent') {
      const parentUser = await User.findById(req.user._id).select('linkedStudents phoneNumber parentsPhoneNumber');
      const linkedIds = parentUser.linkedStudents || [];
      const parentPhone = parentUser.phoneNumber || parentUser.parentsPhoneNumber || '';

      const summary = await getEarlyWarningSummary({
        filterRole: 'parent',
        parentPhone,
        linkedStudentIds: linkedIds
      });

      return res.json({
        success: true,
        role: 'parent',
        ...summary
      });
    }

    if (role === 'student') {
      const studentAnalysis = await analyzeStudentPerformance(req.user._id);
      return res.json({
        success: true,
        role: 'student',
        studentPerformance: studentAnalysis
      });
    }

    return res.status(403).json({ error: "Access denied for this user role." });
  } catch (err) {
    console.error("Early Warning Summary Error:", err);
    res.status(500).json({ error: "Failed to fetch early warning summary: " + err.message });
  }
});

/**
 * @route   GET /api/early-warning/student/:studentId
 * @desc    Get detailed student performance & warning analysis with strict RBAC
 * @access  Private
 */
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const { studentId } = req.params;
    const role = req.user.role;
    const currentUserId = req.user._id.toString();

    // 1. Student can only access their own performance
    if (role === 'student' && currentUserId !== studentId) {
      return res.status(403).json({ error: "Access denied. Students can only view their own performance records." });
    }

    // 2. Parent can only access their linked children
    if (role === 'parent') {
      const parentUser = await User.findById(req.user._id).select('linkedStudents phoneNumber parentsPhoneNumber');
      const linkedIds = (parentUser.linkedStudents || []).map(id => id.toString());
      const parentPhone = parentUser.phoneNumber || parentUser.parentsPhoneNumber || '';

      const targetStudent = await User.findById(studentId).select('parentsPhoneNumber role');
      if (!targetStudent || targetStudent.role !== 'student') {
        return res.status(404).json({ error: "Student not found." });
      }

      const isLinkedById = linkedIds.includes(studentId);
      const isLinkedByPhone = parentPhone && targetStudent.parentsPhoneNumber && 
        parentPhone.replace(/\D/g, '') === targetStudent.parentsPhoneNumber.replace(/\D/g, '');

      if (!isLinkedById && !isLinkedByPhone) {
        return res.status(403).json({ error: "Access denied. You can only view performance details for your linked children." });
      }
    }

    // 3. Teacher can only view students enrolled in their courses
    if (role === 'teacher') {
      const teacherCourses = await Course.find({ instructor: req.user._id }).select('_id enrolledStudents').lean();
      const teacherCourseIds = teacherCourses.map(c => c._id);
      
      const isDirectlyEnrolled = teacherCourses.some(c => 
        (c.enrolledStudents || []).some(sId => sId.toString() === studentId)
      );

      let isEnrolledViaClass = false;
      if (!isDirectlyEnrolled) {
        const enrollment = await Enrollment.findOne({
          student: studentId,
          course: { $in: teacherCourseIds }
        });
        isEnrolledViaClass = !!enrollment;
      }

      if (!isDirectlyEnrolled && !isEnrolledViaClass) {
        return res.status(403).json({ error: "Access denied. You can only view performance details for students enrolled in your courses." });
      }
    }

    // Admin has full access to any student
    const performanceDetails = await analyzeStudentPerformance(studentId);
    if (!performanceDetails) {
      return res.status(404).json({ error: "Student performance record not found." });
    }

    res.json({
      success: true,
      data: performanceDetails
    });
  } catch (err) {
    console.error("Fetch Student Performance Error:", err);
    res.status(500).json({ error: "Failed to fetch student performance details: " + err.message });
  }
});

module.exports = router;
