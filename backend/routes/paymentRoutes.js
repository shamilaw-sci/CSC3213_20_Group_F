const express = require('express');
const router = express.Router();
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const { protect, isAdmin } = require('./auth');

// @route   POST /api/payments/process-mock
// @desc    Process mock payment, record payment & enroll student in course
// @access  Private (Student)
router.post('/process-mock', protect, async (req, res) => {
  try {
    const { courseId, enrollmentDate, amount, cardLastFour, otpCode } = req.body;
    const studentId = req.user._id;

    // 1. Verify OTP Code
    if (!otpCode || otpCode.trim() !== '123456') {
      return res.status(400).json({ error: 'Invalid OTP code. For demo, please enter 123456.' });
    }

    // 2. Fetch Course & Student
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const studentGrade = student.grade;
    if (!studentGrade) {
      return res.status(400).json({ error: 'Student grade must be set before enrolling.' });
    }

    // Check grade eligibility
    const isAllowed = course.enrolledGrades && course.enrolledGrades.some(
      g => g.gradeNumber === studentGrade
    );
    if (!isAllowed) {
      return res.status(403).json({ error: `Your grade (${studentGrade}) is not eligible for this course.` });
    }

    // 3. Generate unique transaction ID
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const transactionId = `PAY-${Date.now()}-${randomDigits}`;
    const paymentAmount = amount || course.price || 2500;

    // 4. Create Payment Record
    const newPayment = await Payment.create({
      student: studentId,
      course: courseId,
      amount: paymentAmount,
      currency: 'LKR',
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      paymentMethod: 'Card_Mock',
      transactionId,
      status: 'COMPLETED',
      cardLastFour: cardLastFour || '4242',
      paymentDate: new Date()
    });

    // 5. Create or Update Enrollment Record
    await Enrollment.findOneAndUpdate(
      { student: studentId, course: courseId },
      { student: studentId, course: courseId, className: studentGrade },
      { upsert: true, new: true }
    );

    // 6. Synchronize Course enrolledStudents and classes
    const isAlreadyEnrolled = course.enrolledStudents.some(
      id => id.toString() === studentId.toString()
    );
    if (!isAlreadyEnrolled) {
      course.enrolledStudents.push(studentId);
    }

    // Update specific class in course
    let targetClass = course.classes.find(c => c.className === studentGrade);
    if (!targetClass) {
      course.classes.push({ className: studentGrade, enrolledStudents: [studentId] });
    } else {
      const isStudentInClass = targetClass.enrolledStudents.some(
        id => id.toString() === studentId.toString()
      );
      if (!isStudentInClass) {
        targetClass.enrolledStudents.push(studentId);
      }
    }

    await course.save();

    res.status(201).json({
      success: true,
      message: 'Payment verified and enrollment completed successfully!',
      transactionId,
      payment: newPayment
    });

  } catch (err) {
    console.error('Process mock payment error:', err);
    res.status(500).json({ error: 'Payment processing failed: ' + err.message });
  }
});

// @route   GET /api/payments/my-payments
// @desc    Get payments history for logged-in student
// @access  Private
router.get('/my-payments', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.user._id })
      .populate('course', 'title description banner price')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch student payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history.' });
  }
});

// @route   GET /api/payments/all
// @desc    Admin retrieves all payment transactions
// @access  Private (Admin)
router.get('/all', protect, isAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('student', 'name email registrationNumber grade')
      .populate('course', 'title price')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch all payments error:', err);
    res.status(500).json({ error: 'Failed to fetch all payments.' });
  }
});

module.exports = router;
