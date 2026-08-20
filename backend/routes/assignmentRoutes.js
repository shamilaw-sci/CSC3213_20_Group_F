const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { sendCourseUpdateEmail } = require('../utils/emailService');
const { getClassEnrolledStudents } = require('../utils/enrollmentHelper');
const { notifyParentsOfStudent, notifyParentsInBatch } = require('../utils/notificationHelper');

// Middleware for Teacher or Admin
const isTeacherOrAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Teachers and Admins only." });
};

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    cb(null, `asgn-${Date.now()}-${safeName}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.webp', '.zip'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Allowed file types: PDF, Word (DOC/DOCX), Images (JPG/PNG/WEBP), or ZIP.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// Helper for multer errors
const handleUpload = (fieldName) => (req, res, next) => {
  upload.single(fieldName)(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: "File exceeds the 10MB maximum limit." });
      }
      return res.status(400).json({ error: err.message || "File upload failed." });
    }
    next();
  });
};

// =========================================================================
// 1. CREATE ASSIGNMENT (Teacher/Admin)
// =========================================================================
router.post('/', protect, isTeacherOrAdmin, handleUpload('attachment'), async (req, res) => {
  try {
    const {
      title,
      description,
      courseId,
      grade,
      month,
      weekNumber,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmissions,
      isActive
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: "Assignment title is required." });
    }
    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required." });
    }
    if (!grade) {
      return res.status(400).json({ error: "Grade is required." });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: "Course not found." });
    }

    let attachmentUrl = '';
    let attachmentName = '';
    let attachmentSize = 0;

    if (req.file) {
      attachmentUrl = `/uploads/${req.file.filename}`;
      attachmentName = req.file.originalname;
      attachmentSize = req.file.size;
    }

    const assignment = await Assignment.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      course: courseId,
      grade: String(grade).trim(),
      month: month ? String(month).trim() : '',
      weekNumber: weekNumber !== undefined ? Number(weekNumber) : 0,
      instructor: req.user._id,
      attachmentUrl,
      attachmentName,
      attachmentSize,
      maxMarks: maxMarks ? Number(maxMarks) : 100,
      passingMarks: passingMarks ? Number(passingMarks) : 50,
      dueDate: dueDate ? new Date(dueDate) : null,
      allowLateSubmissions: allowLateSubmissions === 'false' || allowLateSubmissions === false ? false : true,
      isActive: isActive === 'false' || isActive === false ? false : true
    });

    // Notify enrolled students & linked parents
    try {
       const enrolledStudents = await getClassEnrolledStudents(courseId, grade);
       if (enrolledStudents.length > 0) {
        const notifDocs = enrolledStudents.map(st => ({
          recipient: st._id,
          sender: req.user._id,
          type: 'ASSIGNMENT',
          title: `📝 New Assignment: ${assignment.title}`,
          message: `A new assignment "${assignment.title}" has been published for ${course.title} (Grade ${grade}).`,
          link: `/courses`,
          metadata: { courseId, assignmentId: assignment._id }
        }));
        await Notification.insertMany(notifDocs);

        // In-App Notification for Linked Parents
        await notifyParentsInBatch(enrolledStudents.map(st => ({
          student: st,
          sender: req.user._id,
          type: 'ASSIGNMENT',
          title: `📑 New Homework Assigned: ${assignment.title}`,
          message: `A new homework assignment "${assignment.title}" has been assigned to your child ${st.name} in ${course.title} (Grade ${grade}).`,
          link: '/parent-dashboard',
          metadata: {
            studentId: st._id,
            courseId,
            assignmentId: assignment._id
          }
        })));

        enrolledStudents.forEach(st => {
          if (st.email) {
            sendCourseUpdateEmail(
              st.email,
              st.name,
              course.title,
              `New Homework Assignment: ${assignment.title}`,
              `A new assignment "${assignment.title}" has been published for Grade ${grade}. Check Course Details to view guidelines and submit your solution.`
            );
          }
        });
      }
    } catch (notifErr) {
      console.error("Assignment notification error:", notifErr.message);
    }

    res.status(201).json({ message: "Assignment created successfully!", assignment });
  } catch (err) {
    console.error("Error creating assignment:", err);
    res.status(500).json({ error: "Failed to create assignment: " + err.message });
  }
});

// =========================================================================
// 2. GET ASSIGNMENTS FOR A COURSE (with student submission status or teacher counts)
// =========================================================================
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { grade, month } = req.query;

    const query = { course: courseId };
    if (grade) {
      query.grade = String(grade).trim();
    }
    if (month && month.toLowerCase() !== 'all') {
      query.$or = [{ month: month }, { month: '' }, { month: { $exists: false } }];
    }

    const assignments = await Assignment.find(query)
      .populate('instructor', 'name profilePicture')
      .sort({ createdAt: -1 })
      .lean();

    const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';

    if (isTeacher) {
      // Attach submissions counts for teachers
      const assignmentIds = assignments.map(a => a._id);
      const submissions = await AssignmentSubmission.find({ assignment: { $in: assignmentIds } })
        .select('assignment status marks')
        .lean();

      const enriched = assignments.map(asgn => {
        const asgnSubs = submissions.filter(s => s.assignment.toString() === asgn._id.toString());
        return {
          ...asgn,
          submissionsCount: asgnSubs.length,
          gradedCount: asgnSubs.filter(s => s.status === 'graded').length
        };
      });

      return res.json(enriched);
    } else {
      // Student view: Attach student's own submission
      const assignmentIds = assignments.map(a => a._id);
      const mySubmissions = await AssignmentSubmission.find({
        assignment: { $in: assignmentIds },
        student: req.user._id
      }).lean();

      const mySubMap = new Map();
      mySubmissions.forEach(sub => {
        mySubMap.set(sub.assignment.toString(), sub);
      });

      const enriched = assignments.map(asgn => {
        const mySub = mySubMap.get(asgn._id.toString()) || null;
        return {
          ...asgn,
          mySubmission: mySub,
          hasSubmitted: !!mySub
        };
      });

      return res.json(enriched);
    }
  } catch (err) {
    console.error("Error fetching assignments:", err);
    res.status(500).json({ error: "Failed to fetch assignments: " + err.message });
  }
});

// =========================================================================
// 3. GET SINGLE ASSIGNMENT DETAILS
// =========================================================================
router.get('/:assignmentId', protect, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId)
      .populate('course', 'title banner enrolledGrades')
      .populate('instructor', 'name profilePicture');

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    let mySubmission = null;
    if (req.user.role === 'student') {
      mySubmission = await AssignmentSubmission.findOne({
        assignment: assignment._id,
        student: req.user._id
      });
    }

    res.json({ assignment, mySubmission });
  } catch (err) {
    console.error("Error fetching assignment details:", err);
    res.status(500).json({ error: "Failed to fetch assignment details: " + err.message });
  }
});

// =========================================================================
// 4. UPDATE ASSIGNMENT (Teacher/Admin)
// =========================================================================
router.put('/:assignmentId', protect, isTeacherOrAdmin, handleUpload('attachment'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    const {
      title,
      description,
      grade,
      month,
      weekNumber,
      maxMarks,
      passingMarks,
      dueDate,
      allowLateSubmissions,
      isActive,
      removeAttachment
    } = req.body;

    if (title) assignment.title = title.trim();
    if (description !== undefined) assignment.description = description.trim();
    if (grade) assignment.grade = String(grade).trim();
    if (month !== undefined) assignment.month = String(month).trim();
    if (weekNumber !== undefined) assignment.weekNumber = Number(weekNumber);
    if (maxMarks !== undefined) assignment.maxMarks = Number(maxMarks);
    if (passingMarks !== undefined) assignment.passingMarks = Number(passingMarks);
    if (dueDate !== undefined) assignment.dueDate = dueDate ? new Date(dueDate) : null;
    if (allowLateSubmissions !== undefined) assignment.allowLateSubmissions = allowLateSubmissions === 'true' || allowLateSubmissions === true;
    if (isActive !== undefined) assignment.isActive = isActive === 'true' || isActive === true;

    // Handle attachment update or removal
    if (req.file) {
      // Remove old file if exists
      if (assignment.attachmentUrl && assignment.attachmentUrl.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, '..', assignment.attachmentUrl);
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch (e) {}
        }
      }
      assignment.attachmentUrl = `/uploads/${req.file.filename}`;
      assignment.attachmentName = req.file.originalname;
      assignment.attachmentSize = req.file.size;
    } else if (removeAttachment === 'true' || removeAttachment === true) {
      if (assignment.attachmentUrl && assignment.attachmentUrl.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, '..', assignment.attachmentUrl);
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch (e) {}
        }
      }
      assignment.attachmentUrl = '';
      assignment.attachmentName = '';
      assignment.attachmentSize = 0;
    }

    await assignment.save();
    res.json({ message: "Assignment updated successfully!", assignment });
  } catch (err) {
    console.error("Error updating assignment:", err);
    res.status(500).json({ error: "Failed to update assignment: " + err.message });
  }
});

// =========================================================================
// 5. DELETE ASSIGNMENT (Teacher/Admin)
// =========================================================================
router.delete('/:assignmentId', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    // Delete question attachment file
    if (assignment.attachmentUrl && assignment.attachmentUrl.startsWith('/uploads/')) {
      const filePath = path.join(__dirname, '..', assignment.attachmentUrl);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) {}
      }
    }

    // Delete all student submission files
    const submissions = await AssignmentSubmission.find({ assignment: assignment._id });
    submissions.forEach(sub => {
      if (sub.fileUrl && sub.fileUrl.startsWith('/uploads/')) {
        const subFilePath = path.join(__dirname, '..', sub.fileUrl);
        if (fs.existsSync(subFilePath)) {
          try { fs.unlinkSync(subFilePath); } catch (e) {}
        }
      }
    });

    // Delete all submission records
    await AssignmentSubmission.deleteMany({ assignment: assignment._id });
    await Assignment.findByIdAndDelete(assignment._id);

    res.json({ message: "Assignment and all student submissions deleted successfully!" });
  } catch (err) {
    console.error("Error deleting assignment:", err);
    res.status(500).json({ error: "Failed to delete assignment: " + err.message });
  }
});

// =========================================================================
// 6. SUBMIT ASSIGNMENT SOLUTION (Student)
// =========================================================================
router.post('/:assignmentId/submit', protect, handleUpload('solution'), async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    if (!assignment.isActive) {
      return res.status(400).json({ error: "This assignment is currently inactive and not accepting submissions." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Please upload your solution file (PDF, Word, or Image)." });
    }

    const { studentNote } = req.body;
    const now = new Date();
    const isLate = assignment.dueDate ? now > new Date(assignment.dueDate) : false;

    if (isLate && !assignment.allowLateSubmissions) {
      // Remove uploaded file
      const uploadedFilePath = path.join(uploadDir, req.file.filename);
      if (fs.existsSync(uploadedFilePath)) {
        try { fs.unlinkSync(uploadedFilePath); } catch (e) {}
      }
      return res.status(400).json({ error: "Submission deadline has passed and late submissions are not allowed." });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const fileName = req.file.originalname;
    const fileSize = req.file.size;

    // Check if submission already exists (resubmission)
    let submission = await AssignmentSubmission.findOne({
      assignment: assignment._id,
      student: req.user._id
    });

    if (submission) {
      // Remove old solution file from disk
      if (submission.fileUrl && submission.fileUrl.startsWith('/uploads/')) {
        const oldFile = path.join(__dirname, '..', submission.fileUrl);
        if (fs.existsSync(oldFile)) {
          try { fs.unlinkSync(oldFile); } catch (e) {}
        }
      }

      submission.fileUrl = fileUrl;
      submission.fileName = fileName;
      submission.fileSize = fileSize;
      submission.studentNote = studentNote ? studentNote.trim() : submission.studentNote;
      submission.submittedAt = now;
      submission.isLate = isLate;
      submission.status = 'submitted';
      submission.marks = null;
      submission.feedback = '';
      submission.gradedBy = null;
      submission.gradedAt = null;

      await submission.save();
    } else {
      submission = await AssignmentSubmission.create({
        assignment: assignment._id,
        student: req.user._id,
        course: assignment.course,
        grade: assignment.grade,
        fileUrl,
        fileName,
        fileSize,
        studentNote: studentNote ? studentNote.trim() : '',
        submittedAt: now,
        isLate,
        status: 'submitted'
      });
    }

    // Trigger Notifications: Teacher (if teacher role) & Linked Parents
    try {
      if (assignment.instructor && assignment.instructor.toString() !== req.user._id.toString()) {
        const instructorDoc = await User.findById(assignment.instructor).select('role');
        if (instructorDoc && instructorDoc.role === 'teacher') {
          await Notification.create({
            recipient: assignment.instructor,
            sender: req.user._id,
            type: 'ASSIGNMENT',
            title: `Homework Submitted: ${assignment.title}`,
            message: `${req.user.name || 'A student'} submitted solution for "${assignment.title}".`,
            link: `/courses`,
            metadata: { assignmentId: assignment._id, studentId: req.user._id, submissionId: submission._id }
          });
        }
      }

      // In-App Notification for Linked Parents
      await notifyParentsOfStudent({
        studentIdOrDoc: req.user._id,
        studentName: req.user.name,
        type: 'ASSIGNMENT',
        title: `📤 Homework Solution Submitted: ${req.user.name}`,
        message: `${req.user.name} submitted their solution for "${assignment.title}". Status: ${isLate ? 'Late Submission' : 'On Time'}. Awaiting teacher evaluation.`,
        link: '/parent-dashboard',
        metadata: {
          studentId: req.user._id,
          studentName: req.user.name,
          assignmentId: assignment._id,
          submissionId: submission._id,
          isLate
        }
      });
    } catch (notifErr) {
      console.error("Assignment submit notification error:", notifErr.message);
    }

    res.status(201).json({
      message: isLate ? "Assignment submitted (Marked as Late Submission)." : "Assignment submitted successfully!",
      submission
    });
  } catch (err) {
    console.error("Error submitting assignment:", err);
    res.status(500).json({ error: "Failed to submit assignment: " + err.message });
  }
});

// =========================================================================
// 7. GET MY SUBMISSION (Student)
// =========================================================================
router.get('/:assignmentId/my-submission', protect, async (req, res) => {
  try {
    const submission = await AssignmentSubmission.findOne({
      assignment: req.params.assignmentId,
      student: req.user._id
    })
      .populate('assignment')
      .populate('gradedBy', 'name profilePicture');

    if (!submission) {
      return res.status(404).json({ error: "No submission found for this assignment." });
    }

    res.json(submission);
  } catch (err) {
    console.error("Error fetching my submission:", err);
    res.status(500).json({ error: "Failed to fetch submission: " + err.message });
  }
});

// =========================================================================
// 8. GET ALL SUBMISSIONS FOR AN ASSIGNMENT (Teacher/Admin)
// =========================================================================
router.get('/:assignmentId/submissions', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const assignment = await Assignment.findById(req.params.assignmentId)
      .populate('course', 'title');

    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found." });
    }

    const { status, search } = req.query;
    const query = { assignment: assignment._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    const submissions = await AssignmentSubmission.find(query)
      .populate('student', 'name email registrationNumber physicalCardNumber profilePicture phoneNumber')
      .populate('gradedBy', 'name')
      .sort({ submittedAt: -1 })
      .lean();

    let filteredSubmissions = submissions;
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      filteredSubmissions = submissions.filter(sub => {
        const student = sub.student;
        if (!student) return false;
        const nameMatch = student.name && student.name.toLowerCase().includes(q);
        const emailMatch = student.email && student.email.toLowerCase().includes(q);
        const regMatch = (student.registrationNumber && student.registrationNumber.toLowerCase().includes(q)) ||
                         (student.physicalCardNumber && student.physicalCardNumber.toLowerCase().includes(q));
        return nameMatch || emailMatch || regMatch;
      });
    }

    res.json({
      assignment,
      totalSubmissions: submissions.length,
      gradedCount: submissions.filter(s => s.status === 'graded').length,
      submissions: filteredSubmissions
    });
  } catch (err) {
    console.error("Error fetching assignment submissions:", err);
    res.status(500).json({ error: "Failed to fetch submissions: " + err.message });
  }
});

// =========================================================================
// 9. GRADE A STUDENT SUBMISSION (Teacher/Admin)
// =========================================================================
router.patch('/submissions/:submissionId/grade', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const { marks, feedback, status } = req.body;

    if (marks === undefined || marks === null || isNaN(Number(marks))) {
      return res.status(400).json({ error: "Valid marks are required." });
    }

    const submission = await AssignmentSubmission.findById(req.params.submissionId)
      .populate('assignment')
      .populate('student', 'name email');

    if (!submission) {
      return res.status(404).json({ error: "Submission not found." });
    }

    const numericMarks = Number(marks);
    const maxMarks = submission.assignment?.maxMarks || 100;
    if (numericMarks < 0 || numericMarks > maxMarks) {
      return res.status(400).json({ error: `Marks must be between 0 and ${maxMarks}.` });
    }

    submission.marks = numericMarks;
    submission.feedback = feedback !== undefined ? feedback.trim() : submission.feedback;
    submission.status = status || 'graded';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();

    await submission.save();

    // Send in-app notification & email to student
    try {
      const student = submission.student;
      if (student) {
        const asgnTitle = submission.assignment?.title || 'Assignment';
        const notifDoc = {
          recipient: student._id,
          sender: req.user._id,
          type: 'ASSIGNMENT',
          title: `🎯 Assignment Graded: ${asgnTitle}`,
          message: `Your assignment "${asgnTitle}" has been graded: ${numericMarks}/${maxMarks} marks.${feedback ? ` Feedback: "${feedback.slice(0, 60)}..."` : ''}`,
          link: `/courses`,
          metadata: { assignmentId: submission.assignment._id, submissionId: submission._id }
        };
        await Notification.create(notifDoc);

        if (student.email) {
          sendCourseUpdateEmail(
            student.email,
            student.name,
            'LuminaLearn Homework Evaluation',
            `Assignment Result: ${asgnTitle}`,
            `Your submission for "${asgnTitle}" has been reviewed by your instructor.\n\nScore: ${numericMarks} / ${maxMarks} marks\nFeedback: ${feedback || 'Good effort!'}`
          );
        }

        // In-App Notification for Linked Parents
        await notifyParentsOfStudent({
          studentIdOrDoc: student._id,
          studentName: student.name,
          type: 'ASSIGNMENT',
          title: `🏆 Homework Graded: ${student.name}`,
          message: `${student.name}'s assignment "${asgnTitle}" has been evaluated: ${numericMarks}/${maxMarks} marks.${feedback ? ` Feedback: "${feedback.slice(0, 70)}..."` : ''}`,
          link: '/parent-dashboard',
          metadata: {
            studentId: student._id,
            studentName: student.name,
            assignmentId: submission.assignment._id,
            submissionId: submission._id,
            marks: numericMarks,
            maxMarks
          }
        });
      }
    } catch (notifErr) {
      console.error("Grading notification error:", notifErr.message);
    }

    res.json({
      message: "Submission graded successfully!",
      submission
    });
  } catch (err) {
    console.error("Error grading submission:", err);
    res.status(500).json({ error: "Failed to grade submission: " + err.message });
  }
});

// =========================================================================
// 10. GET STUDENT'S OWN ASSIGNMENTS ACROSS ALL COURSES
// =========================================================================
router.get('/student/my-assignments', protect, async (req, res) => {
  try {
    const submissions = await AssignmentSubmission.find({ student: req.user._id })
      .populate({
        path: 'assignment',
        populate: { path: 'course', select: 'title' }
      })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(submissions);
  } catch (err) {
    console.error("Error fetching student assignments:", err);
    res.status(500).json({ error: "Failed to fetch assignments: " + err.message });
  }
});

module.exports = router;
