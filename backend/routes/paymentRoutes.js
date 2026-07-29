const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const OTP = require('../models/OTP');
const Notification = require('../models/Notification');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { sendSMS, maskPhoneNumber, sendPaymentSMS } = require('../services/smsService');
const { sendPaymentReceiptEmail } = require('../utils/emailService');

const normalizeGrade = (g) => g ? String(g).toLowerCase().replace(/\s+/g, '').replace('grade', '') : '';

// @route   POST /api/payments/send-otp
// @desc    Generate a real 6-digit random OTP, store in MongoDB (5-min TTL), and dispatch SMS
// @access  Private (Student)
router.post('/send-otp', protect, async (req, res) => {
  try {
    const { courseId } = req.body;
    const studentId = req.user._id;

    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required to send OTP.', message: 'Course ID is required to send OTP.' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student account not found.', message: 'Student account not found.' });
    }

    const studentPhone = student.parentsPhoneNumber || student.phoneNumber;
    if (!studentPhone) {
      return res.status(400).json({ 
        error: 'No registered mobile phone number found for student. Please update your profile.', 
        message: 'No registered mobile phone number found for student. Please update your profile.' 
      });
    }

    // 1. Delete any existing pending OTPs for this student and course
    await OTP.deleteMany({ student: studentId, courseId });

    // 2. Generate a secure 6-digit random OTP code (e.g. 584920)
    const generatedOtp = String(crypto.randomInt(100000, 999999));

    // 3. Save OTP record in MongoDB (Expires automatically in 5 minutes via TTL index)
    await OTP.create({
      student: studentId,
      email: student.email,
      phone: studentPhone,
      courseId,
      otpCode: generatedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000)
    });

    // 4. Dispatch SMS message via Gateway / Console Simulator
    const smsMessage = `Your LuminaLearn verification OTP code is ${generatedOtp}. Valid for 5 minutes. Do not share this code.`;
    await sendSMS({
      phone: studentPhone,
      message: smsMessage,
      otpCode: generatedOtp,
      studentName: student.name
    });

    const maskedPhone = maskPhoneNumber(studentPhone);

    res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${maskedPhone}.`,
      otpCode: generatedOtp, // Included for on-screen demo helper
      phoneMasked: maskedPhone
    });

  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ 
      error: 'Failed to send OTP: ' + err.message, 
      message: 'Failed to send OTP: ' + err.message 
    });
  }
});

// @route   POST /api/payments/process-mock
// @desc    Verify real DB OTP, record payment & enroll student in course
// @access  Private (Student)
router.post('/process-mock', protect, async (req, res) => {
  try {
    const { courseId, enrollmentDate, amount, cardLastFour, otpCode } = req.body;
    const studentId = req.user._id;

    if (!otpCode || !otpCode.trim()) {
      return res.status(400).json({ error: 'OTP code is required.', message: 'OTP code is required.' });
    }

    // 1. Query MongoDB for active OTP document (Not expired, matching student & course)
    const activeOtp = await OTP.findOne({
      student: studentId,
      courseId: courseId,
      otpCode: otpCode.trim(),
      expiresAt: { $gt: new Date() }
    });

    if (!activeOtp) {
      return res.status(400).json({ 
        error: 'Invalid or expired OTP code. Please click "Resend OTP" to get a new code.', 
        message: 'Invalid or expired OTP code. Please click "Resend OTP" to get a new code.' 
      });
    }

    // 2. Fetch Course & Student
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found.', message: 'Course not found.' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.', message: 'Student not found.' });
    }

    const studentGrade = student.grade;
    if (!studentGrade) {
      return res.status(400).json({ error: 'Student grade must be set before enrolling.', message: 'Student grade must be set before enrolling.' });
    }

    // Check grade eligibility using normalized grade matching
    const isAllowed = course.enrolledGrades && course.enrolledGrades.some(
      g => normalizeGrade(g.gradeNumber) === normalizeGrade(studentGrade)
    );
    if (!isAllowed) {
      const errMsg = `Your grade (${studentGrade}) is not eligible for this course.`;
      return res.status(403).json({ error: errMsg, message: errMsg });
    }

    // Format standard class name (e.g. "Grade 6")
    const formattedClassName = studentGrade.toLowerCase().startsWith('grade') ? studentGrade : `Grade ${studentGrade}`;

    // 3. Delete verified OTP record immediately to enforce single-use
    await OTP.deleteOne({ _id: activeOtp._id });

    // 4. Generate unique transaction ID
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const transactionId = `PAY-${Date.now()}-${randomDigits}`;
    const paymentAmount = amount || course.price || 2500;

    // 5. Create Payment Record
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const newPayment = await Payment.create({
      student: studentId,
      studentId: studentId,
      course: courseId,
      courseId: courseId,
      month: currentMonth,
      amount: paymentAmount,
      currency: 'LKR',
      enrollmentDate: enrollmentDate ? new Date(enrollmentDate) : new Date(),
      paymentMethod: 'Card_Mock',
      transactionId,
      status: 'COMPLETED',
      cardLastFour: cardLastFour || '4242',
      paymentDate: new Date()
    });

    // 6. Create or Update Enrollment Record
    await Enrollment.findOneAndUpdate(
      { student: studentId, course: courseId },
      { student: studentId, course: courseId, className: formattedClassName },
      { upsert: true, new: true }
    );

    // 7. Synchronize Course enrolledStudents and classes
    const isAlreadyEnrolled = course.enrolledStudents.some(
      id => id.toString() === studentId.toString()
    );
    if (!isAlreadyEnrolled) {
      course.enrolledStudents.push(studentId);
    }

    let targetClass = course.classes.find(c => normalizeGrade(c.className) === normalizeGrade(studentGrade));
    if (!targetClass) {
      course.classes.push({ className: formattedClassName, enrolledStudents: [studentId] });
    } else {
      const isStudentInClass = targetClass.enrolledStudents.some(
        id => id.toString() === studentId.toString()
      );
      if (!isStudentInClass) {
        targetClass.enrolledStudents.push(studentId);
      }
    }

    await course.save();

    // --- TRIGGER NOTIFICATIONS (In-App, SMS, Email) ---
    try {
      // 1. In-App Notification for Student
      await Notification.create({
        recipient: studentId,
        type: 'PAYMENT',
        title: 'Payment Successful',
        message: `Your payment of LKR ${paymentAmount} for '${course.title}' was received successfully. (Ref: ${transactionId})`,
        link: '/payments',
        metadata: { paymentId: newPayment._id, transactionId, amount: paymentAmount }
      });

      // 2. In-App Notification for Admins
      await Notification.create({
        recipientRole: 'admin',
        type: 'PAYMENT',
        title: 'New Payment Received',
        message: `${student.name} paid LKR ${paymentAmount} for '${course.title}' (Ref: ${transactionId}).`,
        link: '/payments',
        metadata: { studentId, courseId, amount: paymentAmount, transactionId }
      });

      // 3. Parent SMS Alert
      if (student.parentsPhoneNumber) {
        sendPaymentSMS({
          parentPhone: student.parentsPhoneNumber,
          studentName: student.name,
          courseTitle: course.title,
          amount: paymentAmount,
          date: newPayment.paymentDate,
          transactionId
        });
      }

      // 4. Student Receipt Email
      if (student.email) {
        sendPaymentReceiptEmail(student.email, student.name, {
          transactionId,
          courseTitle: course.title,
          amount: paymentAmount,
          date: newPayment.paymentDate,
          paymentMethod: newPayment.paymentMethod
        });
      }
    } catch (notifErr) {
      console.error('Payment notification trigger error:', notifErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Payment verified and enrollment completed successfully!',
      transactionId,
      payment: newPayment
    });

  } catch (err) {
    console.error('Process mock payment error:', err);
    res.status(500).json({ error: 'Payment processing failed: ' + err.message, message: 'Payment processing failed: ' + err.message });
  }
});

// @route   GET /api/payments/my-payments
// @desc    Get payments history for logged-in student
// @access  Private
router.get('/my-payments', protect, async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.user._id })
      .populate('student', 'name email registrationNumber grade')
      .populate('course', 'title description banner price')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch student payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history.', message: 'Failed to fetch payment history.' });
  }
});

// @route   GET /api/payments/all
// @desc    Admin retrieves all payment transactions
// @access  Private (Admin)
router.get('/all', protect, isAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('student', 'name email registrationNumber grade studentType')
      .populate('course', 'title price')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch all payments error:', err);
    res.status(500).json({ error: 'Failed to fetch all payments.', message: 'Failed to fetch all payments.' });
  }
});

// @route   GET /api/payments/student/:studentId
// @desc    Admin retrieves payments history for a specific student
// @access  Private (Admin)
router.get('/student/:studentId', protect, isAdmin, async (req, res) => {
  try {
    const payments = await Payment.find({ student: req.params.studentId })
      .populate('student', 'name email registrationNumber grade studentType')
      .populate('course', 'title price')
      .sort({ createdAt: -1 });
    res.json(payments);
  } catch (err) {
    console.error('Fetch student payments error:', err);
    res.status(500).json({ error: 'Failed to fetch student payments.', message: 'Failed to fetch student payments.' });
  }
});

// @route   POST /api/payments/record-physical-payment
// @desc    Admin records physical counter payment for student & enrolls them in course
// @access  Private (Admin)
router.post('/record-physical-payment', protect, isAdmin, async (req, res) => {
  try {
    const { studentId, courseId, amount, paymentMethod, receiptNumber, remarks, paymentDate } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student and Course selection are required.', message: 'Student and Course selection are required.' });
    }

    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({ error: 'Selected student not found.', message: 'Selected student not found.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Selected course not found.', message: 'Selected course not found.' });
    }

    const studentGrade = student.grade || 'Grade 6';
    const formattedClassName = studentGrade.toLowerCase().startsWith('grade') ? studentGrade : `Grade ${studentGrade}`;
    const finalAmount = Number(amount) || course.price || 2500;
    const finalPaymentMethod = paymentMethod || 'CASH_COUNTER';

    // Generate counter receipt transaction ID
    const transactionId = receiptNumber && receiptNumber.trim() 
      ? receiptNumber.trim() 
      : `REC-PHYS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const currentMonth = new Date().toLocaleString('default', { month: 'long' });

    // 1. Create Payment record
    const payment = await Payment.create({
      student: studentId,
      studentId: studentId,
      course: courseId,
      courseId: courseId,
      month: currentMonth,
      amount: finalAmount,
      currency: 'LKR',
      enrollmentDate: paymentDate ? new Date(paymentDate) : new Date(),
      paymentMethod: finalPaymentMethod,
      transactionId,
      status: 'COMPLETED',
      cardLastFour: 'CASH',
      paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      remarks: remarks || 'In-Person Counter Payment'
    });

    // 2. Create or Update Enrollment Record
    await Enrollment.findOneAndUpdate(
      { student: studentId, course: courseId },
      { student: studentId, course: courseId, className: formattedClassName },
      { upsert: true, new: true }
    );

    // 3. Synchronize Course enrolledStudents and classes
    const isAlreadyEnrolled = course.enrolledStudents.some(
      id => id.toString() === studentId.toString()
    );
    if (!isAlreadyEnrolled) {
      course.enrolledStudents.push(studentId);
    }

    let targetClass = course.classes.find(c => normalizeGrade(c.className) === normalizeGrade(studentGrade));
    if (!targetClass) {
      course.classes.push({ className: formattedClassName, enrolledStudents: [studentId] });
    } else {
      const isStudentInClass = targetClass.enrolledStudents.some(
        id => id.toString() === studentId.toString()
      );
      if (!isStudentInClass) {
        targetClass.enrolledStudents.push(studentId);
      }
    }

    await course.save();

    const populatedPayment = await Payment.findById(payment._id)
      .populate('student', 'name email registrationNumber grade studentType')
      .populate('course', 'title price');

    res.status(201).json({
      success: true,
      message: `Physical payment of LKR ${finalAmount.toLocaleString()} recorded successfully! Student enrolled in ${course.title}.`,
      transactionId,
      payment: populatedPayment
    });

  } catch (err) {
    console.error('Record physical payment error:', err);
    res.status(500).json({ error: 'Failed to record physical payment: ' + err.message, message: 'Failed to record physical payment: ' + err.message });
  }
});

module.exports = router;
