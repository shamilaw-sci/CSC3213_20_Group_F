/**
 * @file feeAccessHelper.js
 * @description Fee Access Helper Utility. Evaluates student tuition fee payment status, monthly billing cycles, cutoff deadlines (Week 3), and determines whether a student has active or restricted course access.
 */

const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');

/**
 * Calculates current month, year, day, week number, and cutoff date
 * @param {Date} [date]
 */
function getBillingCycleDetails(date = new Date()) {
  const d = new Date(date);
  const currentMonth = d.toLocaleString('en-US', { month: 'long' });
  const currentYear = d.getFullYear();
  const dayOfMonth = d.getDate();

  let currentWeek = 1;
  if (dayOfMonth <= 7) currentWeek = 1;
  else if (dayOfMonth <= 14) currentWeek = 2;
  else if (dayOfMonth <= 21) currentWeek = 3;
  else currentWeek = 4;

  const deadlineDay = 21; // Cutoff deadline at end of Week 3
  const daysRemaining = Math.max(0, deadlineDay - dayOfMonth);
  const isPastCutoff = dayOfMonth > deadlineDay;
  const deadlineDateStr = `${currentMonth} ${deadlineDay}, ${currentYear}`;

  return {
    currentMonth,
    currentYear,
    dayOfMonth,
    currentWeek,
    deadlineDay,
    daysRemaining,
    isPastCutoff,
    deadlineDateStr
  };
}

/**
 * Checks a student's monthly fee clearance for a specific course
 * @param {string|ObjectId} studentId 
 * @param {string|ObjectId} courseId 
 * @param {Date} [targetDate]
 * @returns {Promise<Object>}
 */
async function checkStudentFeeStatus(studentId, courseId, targetDate = new Date()) {
  if (!studentId || !courseId) {
    return {
      isAllowed: false,
      isEnrolled: false,
      status: 'INVALID_INPUT',
      message: 'Student ID and Course ID are required.'
    };
  }

  const cycle = getBillingCycleDetails(targetDate);
  const { currentMonth, currentYear, currentWeek, deadlineDay, daysRemaining, isPastCutoff, deadlineDateStr } = cycle;

  // 1. Fetch Course details
  const course = await Course.findById(courseId).select('fee enrolledStudents classes enrolledGrades title');
  if (!course) {
    return {
      isAllowed: false,
      isEnrolled: false,
      status: 'COURSE_NOT_FOUND',
      message: 'Course not found.'
    };
  }

  const feeAmount = course.fee || 0;
  const sIdStr = studentId.toString();

  // 2. Check Enrollment
  const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
  const isListedInCourse = Array.isArray(course.enrolledStudents) && course.enrolledStudents.some(id => id && id.toString() === sIdStr);
  const isListedInClasses = Array.isArray(course.classes) && course.classes.some(cls => Array.isArray(cls.enrolledStudents) && cls.enrolledStudents.some(id => id && id.toString() === sIdStr));

  const isEnrolled = !!(enrollment || isListedInCourse || isListedInClasses);
  if (!isEnrolled) {
    return {
      isAllowed: false,
      isEnrolled: false,
      status: 'NOT_ENROLLED',
      message: 'You are not enrolled in this course.',
      courseTitle: course.title,
      feeAmount,
      ...cycle
    };
  }

  // 3. Check if student enrolled in the CURRENT month/year (Mid-month enrollment exemption)
  let enrolledDate = null;
  if (enrollment && (enrollment.createdAt || enrollment.enrollmentDate)) {
    enrolledDate = new Date(enrollment.enrollmentDate || enrollment.createdAt);
  } else {
    // Check initial payment
    const firstPayment = await Payment.findOne({
      student: studentId,
      course: courseId,
      status: 'COMPLETED'
    }).sort({ createdAt: 1 });
    if (firstPayment) {
      enrolledDate = new Date(firstPayment.paymentDate || firstPayment.createdAt);
    }
  }

  if (enrolledDate) {
    const enrollMonth = enrolledDate.toLocaleString('en-US', { month: 'long' });
    const enrollYear = enrolledDate.getFullYear();
    if (enrollMonth === currentMonth && enrollYear === currentYear) {
      return {
        isAllowed: true,
        isEnrolled: true,
        status: 'PAID',
        subStatus: 'ENROLLED_THIS_MONTH',
        message: `Welcome! Your initial enrollment covers tuition for ${currentMonth} ${currentYear}.`,
        courseTitle: course.title,
        feeAmount,
        ...cycle
      };
    }
  }

  // 4. Query payments for the current month and year
  const payments = await Payment.find({
    student: studentId,
    course: courseId,
    status: { $in: ['COMPLETED', 'PENDING_APPROVAL'] }
  }).sort({ createdAt: -1 });

  // Match completed payment for current month
  const completedPayment = payments.find(p => {
    if (p.status !== 'COMPLETED') return false;
    const pMonth = p.month ? p.month.trim() : '';
    const pYear = p.year || (p.createdAt ? new Date(p.createdAt).getFullYear() : currentYear);
    return (
      (pMonth.toLowerCase() === currentMonth.toLowerCase() && pYear === currentYear) ||
      (pMonth.toLowerCase() === `${currentMonth} ${currentYear}`.toLowerCase())
    );
  });

  if (completedPayment) {
    return {
      isAllowed: true,
      isEnrolled: true,
      status: 'PAID',
      subStatus: 'MONTHLY_PAID',
      message: `Monthly tuition for ${currentMonth} ${currentYear} has been settled.`,
      paymentId: completedPayment._id,
      transactionId: completedPayment.transactionId,
      paymentMethod: completedPayment.paymentMethod,
      courseTitle: course.title,
      feeAmount,
      ...cycle
    };
  }

  // Check pending bank slip for current month
  const pendingSlip = payments.find(p => {
    if (p.status !== 'PENDING_APPROVAL') return false;
    const pMonth = p.month ? p.month.trim() : '';
    const pYear = p.year || (p.createdAt ? new Date(p.createdAt).getFullYear() : currentYear);
    return (
      (pMonth.toLowerCase() === currentMonth.toLowerCase() && pYear === currentYear) ||
      (pMonth.toLowerCase() === `${currentMonth} ${currentYear}`.toLowerCase())
    );
  });

  if (pendingSlip) {
    return {
      isAllowed: true, // Allow access while Admin reviews slip
      isEnrolled: true,
      status: 'PENDING_APPROVAL',
      message: `Your bank deposit slip for ${currentMonth} ${currentYear} is pending Admin verification. Temporary access granted.`,
      paymentId: pendingSlip._id,
      transactionId: pendingSlip.transactionId,
      courseTitle: course.title,
      feeAmount,
      ...cycle
    };
  }

  // 5. Unpaid status - Apply 3rd-week cutoff logic
  if (!isPastCutoff) {
    // Within grace period (Weeks 1 to 3, Day <= 21)
    return {
      isAllowed: true,
      isEnrolled: true,
      status: 'GRACE_PERIOD',
      message: `Tuition for ${currentMonth} ${currentYear} is due by Week 3 (${deadlineDateStr}). You have ${daysRemaining} day(s) remaining.`,
      courseTitle: course.title,
      feeAmount,
      ...cycle
    };
  } else {
    // Past 3rd week (Day 22+) - ACCESS RESTRICTED / LOCKED
    return {
      isAllowed: false,
      isEnrolled: true,
      status: 'OVERDUE',
      code: 'FEE_PAYMENT_REQUIRED',
      message: `Class access is restricted. The tuition fee for ${currentMonth} ${currentYear} is overdue (deadline was ${deadlineDateStr}).`,
      courseTitle: course.title,
      feeAmount,
      ...cycle
    };
  }
}

/**
 * Express middleware to enforce monthly fee clearance for students
 */
async function requireMonthlyFeeClearance(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required." });
    }

    // Admins and teachers have unrestricted access
    const role = req.user.role;
    if (role === 'admin' || role === 'superadmin' || role === 'teacher' || role === 'instructor' || role === 'counter_staff') {
      return next();
    }

    const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
    if (!courseId) {
      return next();
    }

    const feeStatus = await checkStudentFeeStatus(req.user._id, courseId);
    if (!feeStatus.isAllowed) {
      return res.status(403).json({
        error: feeStatus.message,
        code: feeStatus.code || 'FEE_PAYMENT_REQUIRED',
        feeStatus
      });
    }

    req.feeStatus = feeStatus;
    next();
  } catch (err) {
    console.error("requireMonthlyFeeClearance error:", err);
    next(); // Don't block requests if an unexpected error occurs in helper
  }
}

module.exports = {
  getBillingCycleDetails,
  checkStudentFeeStatus,
  requireMonthlyFeeClearance
};
