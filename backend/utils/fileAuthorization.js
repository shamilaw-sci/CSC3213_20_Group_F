/**
 * @file fileAuthorization.js
 * @description File Authorization Helper Utility. Enforces fine-grained permission checks for private files (lesson PDFs, assignment briefs, submissions, quizzes, payment slips) based on user roles and enrollment status.
 */

const path = require('path');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const DirectMessage = require('../models/DirectMessage');
const Quiz = require('../models/Quiz');
const Payment = require('../models/Payment');
const Enrollment = require('../models/Enrollment');
const { checkStudentFeeStatus } = require('./feeAccessHelper');

/**
 * Helper to check if a user is enrolled in a specific course and grade/class
 * @param {object} user 
 * @param {string|ObjectId} courseId 
 * @param {string} [gradeVal] 
 * @returns {Promise<boolean>}
 */
async function isStudentEnrolled(user, courseId, gradeVal) {
  if (!user || !courseId) return false;
  const userIdStr = user._id.toString();
  const cIdStr = courseId.toString();

  // 1. Check direct enrollment record
  const query = {
    student: user._id,
    course: courseId,
    status: { $in: ['active', 'APPROVED', 'enrolled', 'completed', undefined] }
  };
  const enrollment = await Enrollment.findOne(query);
  if (enrollment) return true;

  // 2. Check Course document
  const course = await Course.findById(courseId).select('enrolledStudents classes enrolledGrades isPublished');
  if (!course) return false;

  // 2a. Global course enrolledStudents array
  if (Array.isArray(course.enrolledStudents) && course.enrolledStudents.some(id => id && id.toString() === userIdStr)) {
    return true;
  }

  // 2b. Grade/class specific enrolledStudents
  if (Array.isArray(course.classes) && course.classes.length > 0) {
    for (const cls of course.classes) {
      if (Array.isArray(cls.enrolledStudents) && cls.enrolledStudents.some(id => id && id.toString() === userIdStr)) {
        if (!gradeVal) return true;
        const rawGrade = String(gradeVal).replace(/\D/g, '');
        const clsGrade = String(cls.className || '').replace(/\D/g, '');
        if (!rawGrade || rawGrade === clsGrade) return true;
      }
    }
  }

  return false;
}

/**
 * Authorize access to a Lesson PDF material
 */
async function authorizeLessonPdf(user, lessonId, pdfId) {
  if (!user) return { allowed: false, status: 401, error: 'Authentication required' };
  
  const lesson = await Lesson.findById(lessonId).populate('course');
  if (!lesson) return { allowed: false, status: 404, error: 'Lesson not found' };

  // Find PDF material subdocument or filename match
  let pdf = null;
  if (lesson.pdfMaterials && lesson.pdfMaterials.length > 0) {
    pdf = lesson.pdfMaterials.id(pdfId) || 
          lesson.pdfMaterials.find(p => p._id?.toString() === pdfId || p.filename === pdfId);
  }

  if (!pdf) return { allowed: false, status: 404, error: 'PDF material not found in lesson' };

  // Admin has unconditional access
  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, lesson, pdf, canDownload: true };
  }

  // Teacher of the course has access
  const isTeacher = user.role === 'teacher' || user.role === 'instructor';
  const isCourseTeacher = isTeacher && lesson.course && (
    lesson.course.instructor?.toString() === user._id.toString() ||
    (Array.isArray(lesson.course.instructors) && lesson.course.instructors.some(i => i.toString() === user._id.toString()))
  );

  if (isCourseTeacher || (isTeacher && !lesson.course?.instructor)) {
    return { allowed: true, lesson, pdf, canDownload: true };
  }

  // Student authorization
  if (user.role === 'student') {
    const enrolled = await isStudentEnrolled(user, lesson.course?._id || lesson.course, lesson.grade);
    if (!enrolled) {
      return { allowed: false, status: 403, error: 'You are not enrolled in this course class.' };
    }

    // Check monthly fee clearance
    const feeStatus = await checkStudentFeeStatus(user._id, lesson.course?._id || lesson.course);
    if (!feeStatus.isAllowed) {
      return {
        allowed: false,
        status: 403,
        code: 'FEE_PAYMENT_REQUIRED',
        error: feeStatus.message || 'Monthly fee payment required to access study materials.'
      };
    }

    // Check download policy
    let canDownload = pdf.allowDownload !== false;
    if (pdf.downloadDelayType === 'disabled' || pdf.allowDownload === false) {
      canDownload = false;
    } else if (pdf.downloadUnlockDate && new Date() < new Date(pdf.downloadUnlockDate)) {
      canDownload = false;
    }

    return { allowed: true, lesson, pdf, canDownload };
  }

  return { allowed: false, status: 403, error: 'Access denied.' };
}

/**
 * Authorize access to an Assignment question sheet
 */
async function authorizeAssignment(user, assignmentId) {
  if (!user) return { allowed: false, status: 401, error: 'Authentication required' };

  const assignment = await Assignment.findById(assignmentId).populate('course');
  if (!assignment) return { allowed: false, status: 404, error: 'Assignment not found' };

  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, assignment, canDownload: true };
  }

  const isTeacher = user.role === 'teacher' || user.role === 'instructor';
  if (isTeacher && (
    assignment.instructor?.toString() === user._id.toString() ||
    assignment.course?.instructor?.toString() === user._id.toString()
  )) {
    return { allowed: true, assignment, canDownload: true };
  }

  if (user.role === 'student') {
    const enrolled = await isStudentEnrolled(user, assignment.course?._id || assignment.course, assignment.grade);
    if (!enrolled) {
      return { allowed: false, status: 403, error: 'You are not enrolled in this course.' };
    }
    const feeStatus = await checkStudentFeeStatus(user._id, assignment.course?._id || assignment.course);
    if (!feeStatus.isAllowed) {
      return {
        allowed: false,
        status: 403,
        code: 'FEE_PAYMENT_REQUIRED',
        error: feeStatus.message || 'Monthly fee payment required to access assignments.'
      };
    }
    return { allowed: true, assignment, canDownload: true };
  }

  return { allowed: false, status: 403, error: 'Access denied.' };
}

/**
 * Authorize access to an Assignment Submission file
 */
async function authorizeSubmission(user, submissionId) {
  if (!user) return { allowed: false, status: 401, error: 'Authentication required' };

  const submission = await AssignmentSubmission.findById(submissionId).populate('course assignment');
  if (!submission) return { allowed: false, status: 404, error: 'Submission not found' };

  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, submission, canDownload: true };
  }

  // Student who submitted the file
  if (submission.student?.toString() === user._id.toString()) {
    return { allowed: true, submission, canDownload: true };
  }

  // Assigned teacher of the assignment or course
  const isTeacher = user.role === 'teacher' || user.role === 'instructor';
  if (isTeacher && (
    submission.assignment?.instructor?.toString() === user._id.toString() ||
    submission.course?.instructor?.toString() === user._id.toString()
  )) {
    return { allowed: true, submission, canDownload: true };
  }

  return { allowed: false, status: 403, error: 'Access denied to this student submission.' };
}

/**
 * Authorize access to a Direct Message attachment
 */
async function authorizeDirectMessage(user, messageId, attachmentIndex = 0) {
  if (!user) return { allowed: false, status: 401, error: 'Authentication required' };

  const message = await DirectMessage.findById(messageId);
  if (!message) return { allowed: false, status: 404, error: 'Message not found' };

  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, message, attachment: message.attachments[attachmentIndex] };
  }

  const userIdStr = user._id.toString();
  const isSender = message.sender?.toString() === userIdStr;
  const isRecipient = message.recipient?.toString() === userIdStr;

  if (isSender || isRecipient) {
    return { allowed: true, message, attachment: message.attachments[attachmentIndex] };
  }

  return { allowed: false, status: 403, error: 'Access denied to this private message attachment.' };
}

/**
 * Authorize access to Live Chat attachments / voice notes
 */
async function authorizeLiveAttachment(user, lessonId, messageId) {
  if (!user) return { allowed: false, status: 401, error: 'Authentication required' };

  const lesson = await Lesson.findById(lessonId).populate('course');
  if (!lesson) return { allowed: false, status: 404, error: 'Lesson not found' };

  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, lesson };
  }

  const isTeacher = user.role === 'teacher' || user.role === 'instructor';
  if (isTeacher && lesson.course?.instructor?.toString() === user._id.toString()) {
    return { allowed: true, lesson };
  }

  if (user.role === 'student') {
    const enrolled = await isStudentEnrolled(user, lesson.course?._id || lesson.course, lesson.grade);
    if (!enrolled) {
      return { allowed: false, status: 403, error: 'You are not enrolled in this live classroom.' };
    }
    const feeStatus = await checkStudentFeeStatus(user._id, lesson.course?._id || lesson.course);
    if (!feeStatus.isAllowed) {
      return { allowed: false, status: 403, error: feeStatus.message || 'Monthly fee payment required.' };
    }
    return { allowed: true, lesson };
  }

  return { allowed: false, status: 403, error: 'Access denied.' };
}

/**
 * Authorize access to Quiz question images
 */
async function authorizeQuizImage(user, quizId) {
  if (!user) return { allowed: false, status: 401, error: 'Authentication required' };

  const quiz = await Quiz.findById(quizId).populate('course');
  if (!quiz) return { allowed: false, status: 404, error: 'Quiz not found' };

  if (user.role === 'admin' || user.role === 'superadmin') {
    return { allowed: true, quiz };
  }

  const isTeacher = user.role === 'teacher' || user.role === 'instructor';
  if (isTeacher && (
    quiz.instructor?.toString() === user._id.toString() ||
    quiz.course?.instructor?.toString() === user._id.toString()
  )) {
    return { allowed: true, quiz };
  }

  if (user.role === 'student') {
    const enrolled = await isStudentEnrolled(user, quiz.course?._id || quiz.course, quiz.grade);
    if (!enrolled) {
      return { allowed: false, status: 403, error: 'You are not enrolled in this course quiz.' };
    }
    return { allowed: true, quiz };
  }

  return { allowed: false, status: 403, error: 'Access denied.' };
}

/**
 * Authorize access to Bank Payment Slips
 */
async function authorizePaymentSlip(user, paymentId) {
  if (!user) return { allowed: false, status: 401, error: 'Authentication required' };

  const payment = await Payment.findById(paymentId);
  if (!payment) return { allowed: false, status: 404, error: 'Payment record not found' };

  if (user.role === 'admin' || user.role === 'counter_staff' || user.role === 'superadmin') {
    return { allowed: true, payment };
  }

  const userIdStr = user._id.toString();
  if (payment.student?.toString() === userIdStr || payment.studentId?.toString() === userIdStr) {
    return { allowed: true, payment };
  }

  return { allowed: false, status: 403, error: 'Access denied to this payment slip.' };
}

module.exports = {
  isStudentEnrolled,
  authorizeLessonPdf,
  authorizeAssignment,
  authorizeSubmission,
  authorizeDirectMessage,
  authorizeLiveAttachment,
  authorizeQuizImage,
  authorizePaymentSlip
};
