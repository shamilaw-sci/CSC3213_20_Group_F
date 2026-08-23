const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, isTeacherOrAdmin } = require('../middleware/authMiddleware');
const { sendCourseUpdateEmail } = require('../utils/emailService');
const { getClassEnrolledStudents } = require('../utils/enrollmentHelper');
const { notifyParentsOfStudent, notifyParentsInBatch } = require('../utils/notificationHelper');

const { getCategoryDir } = require('../services/fileStorage');

// --- MULTER STORAGE FOR QUIZ QUESTION IMAGES (Max 2MB) ---
const quizUploadDir = getCategoryDir('quizzes');

const quizImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, quizUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `quiz-q-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const quizImageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|svg/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPG, PNG, WebP, GIF, SVG) are allowed.'));
  }
};

const uploadQuizImage = multer({
  storage: quizImageStorage,
  fileFilter: quizImageFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // Strict 2 MB per file limit
});

// Helper to validate questions structure
const validateQuestions = (questions) => {
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    return "A quiz must have at least one question.";
  }

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const hasText = q.questionText && q.questionText.trim().length > 0;
    const hasImage = q.questionImage && q.questionImage.trim().length > 0;

    if (!hasText && !hasImage) {
      return `Question ${i + 1} must have either question text or an uploaded diagram/image (or both).`;
    }

    if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
      return `Question ${i + 1} must have at least two options.`;
    }

    for (let j = 0; j < q.options.length; j++) {
      if (!q.options[j] || !q.options[j].trim()) {
        return `Option ${j + 1} of Question ${i + 1} cannot be empty.`;
      }
    }

    const qType = q.questionType || 'mcq';
    if (qType === 'multiple') {
      if (!q.correctAnswers || !Array.isArray(q.correctAnswers) || q.correctAnswers.length === 0) {
        return `Please select at least one correct answer for Question ${i + 1}.`;
      }
      for (const ansIdx of q.correctAnswers) {
        if (typeof ansIdx !== 'number' || ansIdx < 0 || ansIdx >= q.options.length) {
          return `Invalid correct answer index in Question ${i + 1}.`;
        }
      }
    } else {
      if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        return `Please select a valid correct answer for Question ${i + 1}.`;
      }
    }
  }
  return null;
};

// Helper to sanitize questions for students before submission
const sanitizeQuestionsForStudent = (questions) => {
  if (!questions) return [];
  return questions.map(q => {
    const qObj = typeof q.toObject === 'function' ? q.toObject() : { ...q };
    delete qObj.correctAnswer;
    delete qObj.correctAnswers;
    delete qObj.explanation;
    return qObj;
  });
};

// @route   POST /api/quizzes/upload-image
// @desc    Upload an image for a quiz question (Max 1MB, Teachers & Admins only)
router.post('/upload-image', protect, isTeacherOrAdmin, (req, res) => {
  uploadQuizImage.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Image size exceeds the 1MB limit. Please upload an image smaller than 1MB.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please select an image file to upload.' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
      success: true,
      imageUrl,
      filename: req.file.filename
    });
  });
});

// @route   POST /api/quizzes
// @desc    Create a new quiz (Teachers & Admins only)
router.post('/', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      course, 
      grade, 
      month, 
      weekNumber, 
      timeLimit, 
      passingPercentage, 
      questions 
    } = req.body;

    if (!title || !course || !grade) {
      return res.status(400).json({ message: "Please provide title, course, and target grade." });
    }

    // Verify course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Validate questions
    const questionError = validateQuestions(questions);
    if (questionError) {
      return res.status(400).json({ message: questionError });
    }

    const quiz = new Quiz({
      title,
      description,
      course,
      grade,
      month: month || '',
      weekNumber: weekNumber !== undefined ? parseInt(weekNumber, 10) : 1,
      teacher: req.user._id,
      timeLimit: parseInt(timeLimit, 10) || 0,
      passingPercentage: parseInt(passingPercentage, 10) || 50,
      questions
    });

    await quiz.save();

    // Trigger Notification & Email for students and linked parents
    try {
      const enrolledStudents = await getClassEnrolledStudents(course, grade);
      if (enrolledStudents.length > 0) {
        const notifDocs = enrolledStudents.map(st => ({
          recipient: st._id,
          type: 'QUIZ',
          title: `📝 New Quiz Scheduled: ${title}`,
          message: `A new quiz assessment '${title}' is now active for ${courseExists.title} (${grade}).`,
          link: `/course/${courseExists._id}`,
          metadata: { courseId: courseExists._id, quizId: quiz._id }
        }));

        await Notification.insertMany(notifDocs);

        // Notify linked parents of enrolled students
        await notifyParentsInBatch(enrolledStudents.map(st => ({
          student: st,
          type: 'QUIZ',
          title: `📝 New Quiz Scheduled: ${title}`,
          message: `A new quiz assessment '${title}' has been scheduled for your child ${st.name} (${courseExists.title} - Grade ${grade}).`,
          link: '/parent-dashboard',
          metadata: {
            studentId: st._id,
            quizId: quiz._id,
            courseId: courseExists._id
          }
        })));

        enrolledStudents.forEach(st => {
          if (st.email) {
            sendCourseUpdateEmail(
              st.email,
              st.name,
              courseExists.title,
              `New Quiz: ${title}`,
              `A new quiz "${title}" is available for Grade ${grade}. Log in to test your knowledge!`
            );
          }
        });
      }
    } catch (notifErr) {
      console.error('Quiz creation notification error:', notifErr.message);
    }

    res.status(201).json(quiz);
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ message: "Server error creating quiz." });
  }
});

// @route   PUT /api/quizzes/:quizId
// @desc    Update an existing quiz (Teachers & Admins only)
router.put('/:quizId', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      grade, 
      month, 
      weekNumber, 
      timeLimit, 
      passingPercentage, 
      questions 
    } = req.body;

    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    if (!title || !grade) {
      return res.status(400).json({ message: "Quiz title and grade are required." });
    }

    const questionError = validateQuestions(questions);
    if (questionError) {
      return res.status(400).json({ message: questionError });
    }

    quiz.title = title;
    quiz.description = description !== undefined ? description : quiz.description;
    quiz.grade = grade;
    if (month !== undefined) quiz.month = month;
    if (weekNumber !== undefined) quiz.weekNumber = parseInt(weekNumber, 10);
    if (timeLimit !== undefined) quiz.timeLimit = parseInt(timeLimit, 10);
    if (passingPercentage !== undefined) quiz.passingPercentage = parseInt(passingPercentage, 10);
    quiz.questions = questions;

    await quiz.save();

    res.json({ message: "Quiz updated successfully.", quiz });
  } catch (error) {
    console.error("Error updating quiz:", error);
    res.status(500).json({ message: "Server error updating quiz." });
  }
});

// @route   GET /api/quizzes/course/:courseId
// @desc    Get all quizzes for a course (Students only see active; Teachers/Admins see all)
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const { courseId } = req.params;
    const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';

    const filter = { course: courseId };
    if (!isTeacher) {
      filter.isActive = true;
    }

    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 }).lean();

    // For students, find their attempts/submissions for these quizzes
    const submissions = await QuizSubmission.find({
      student: req.user._id,
      quiz: { $in: quizzes.map(q => q._id) }
    }).lean();

    // Map attempts for frontend ease
    const quizList = quizzes.map(quiz => {
      const submission = submissions.find(sub => sub.quiz.toString() === quiz._id.toString());
      
      // If student, strip correctAnswer details from quiz list questions for security
      const quizObj = { ...quiz };
      if (!isTeacher && quizObj.questions) {
        quizObj.questions = sanitizeQuestionsForStudent(quizObj.questions);
      }

      return {
        ...quizObj,
        hasAttempted: !!submission,
        submissionId: submission ? submission._id : null,
        score: submission ? submission.score : null,
        totalPoints: submission ? submission.totalPoints : null,
        completedAt: submission ? submission.completedAt : null
      };
    });

    res.json(quizList);
  } catch (error) {
    console.error("Error fetching quizzes for course:", error);
    res.status(500).json({ message: "Server error fetching quizzes." });
  }
});

// @route   GET /api/quizzes/:quizId
// @desc    Get details of a specific quiz (Strips correct answers for students before submission)
router.get('/:quizId', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';
    const quizObj = quiz.toObject();

    // Check if student has already submitted. If not, strip correct answers & explanations
    if (!isTeacher) {
      const submission = await QuizSubmission.findOne({ quiz: quiz._id, student: req.user._id });
      
      if (!submission) {
        quizObj.questions = sanitizeQuestionsForStudent(quizObj.questions);
      }
    }

    res.json(quizObj);
  } catch (error) {
    console.error("Error fetching quiz details:", error);
    res.status(500).json({ message: "Server error fetching quiz." });
  }
});

// @route   POST /api/quizzes/:quizId/submit
// @desc    Submit answers for a quiz (Calculates score for MCQ, Checkboxes & True/False)
router.post('/:quizId/submit', protect, async (req, res) => {
  try {
    const { answers } = req.body; // Array of selected option indices (Number or [Number])
    const quiz = await Quiz.findById(req.params.quizId);

    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    if (!quiz.isActive) {
      return res.status(400).json({ message: "This quiz is currently inactive and cannot be submitted." });
    }

    // Check if student already submitted
    const existingSubmission = await QuizSubmission.findOne({ quiz: quiz._id, student: req.user._id });
    if (existingSubmission) {
      return res.status(400).json({ message: "You have already completed this quiz." });
    }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: "Answers must be a valid array." });
    }

    // Calculate score
    let score = 0;
    let totalPoints = 0;

    quiz.questions.forEach((question, index) => {
      const studentAnswer = answers[index];
      const points = question.points || 1;
      totalPoints += points;

      const qType = question.questionType || 'mcq';

      if (qType === 'multiple') {
        // Multi-select checkbox: studentAnswer should be an array of selected indices
        if (Array.isArray(studentAnswer) && Array.isArray(question.correctAnswers)) {
          const correctSet = new Set(question.correctAnswers.map(Number));
          const studentSet = new Set(studentAnswer.map(Number));
          
          const isExactMatch = correctSet.size === studentSet.size && 
            [...correctSet].every(val => studentSet.has(val));

          if (isExactMatch) {
            score += points;
          }
        }
      } else {
        // MCQ or True/False: single answer index
        if (studentAnswer !== undefined && studentAnswer !== null && Number(studentAnswer) === Number(question.correctAnswer)) {
          score += points;
        }
      }
    });

    const submission = new QuizSubmission({
      quiz: quiz._id,
      student: req.user._id,
      answers,
      score,
      totalPoints
    });

    await submission.save();

    // Trigger Notification: Notify Teacher (only if role is 'teacher', never admin) & Notify Linked Parents
    try {
      // 1. Notify Teacher (Skip if teacher is Admin to prevent spam)
      if (quiz.teacher && quiz.teacher.toString() !== req.user._id.toString()) {
        const teacherDoc = await User.findById(quiz.teacher).select('role');
        if (teacherDoc && teacherDoc.role === 'teacher') {
          await Notification.create({
            recipient: quiz.teacher,
            type: 'QUIZ',
            title: `Quiz Submitted: ${quiz.title}`,
            message: `${req.user.name || 'A student'} submitted '${quiz.title}' with score ${score}/${totalPoints}.`,
            link: `/course/${quiz.course}`,
            metadata: { quizId: quiz._id, studentId: req.user._id, score, totalPoints }
          });
        }
      }

      // 2. In-App Notification for Linked Parents
      const pct = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
      const passMark = quiz.passingPercentage || 50;
      const isPassed = pct >= passMark;

      await notifyParentsOfStudent({
        studentIdOrDoc: req.user._id,
        studentName: req.user.name,
        type: 'QUIZ',
        title: `🎯 Quiz Assessment Completed: ${req.user.name}`,
        message: `${req.user.name} completed '${quiz.title}' with a score of ${score}/${totalPoints} (${pct}%). Assessment Result: ${isPassed ? 'Passed ✓' : 'Needs Work'}.`,
        link: '/parent-dashboard',
        metadata: {
          studentId: req.user._id,
          studentName: req.user.name,
          quizId: quiz._id,
          courseId: quiz.course,
          score,
          totalPoints,
          percentage: pct,
          isPassed
        }
      });
    } catch (notifErr) {
      console.error('Quiz submission notification error:', notifErr.message);
    }

    res.status(201).json({
      message: "Quiz submitted successfully.",
      submission: {
        _id: submission._id,
        score,
        totalPoints,
        completedAt: submission.completedAt
      }
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    res.status(500).json({ message: "Server error submitting quiz." });
  }
});

// @route   GET /api/quizzes/:quizId/submissions
// @desc    Get submissions/reports for a quiz (Teachers/Admins only)
router.get('/:quizId/submissions', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const submissions = await QuizSubmission.find({ quiz: req.params.quizId })
      .populate('student', 'name email registrationNumber studentType grade')
      .sort({ score: -1 });

    res.json(submissions);
  } catch (error) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ message: "Server error fetching submissions." });
  }
});

// @route   GET /api/quizzes/:quizId/my-submission
// @desc    Get student's submission for a quiz (includes correct answers & explanations for review)
router.get('/:quizId/my-submission', protect, async (req, res) => {
  try {
    const submission = await QuizSubmission.findOne({ quiz: req.params.quizId, student: req.user._id })
      .populate({
        path: 'quiz',
        select: 'title description questions timeLimit passingPercentage'
      });

    if (!submission) {
      return res.status(404).json({ message: "No submission record found for this quiz." });
    }

    res.json(submission);
  } catch (error) {
    console.error("Error fetching submission details:", error);
    res.status(500).json({ message: "Server error fetching submission details." });
  }
});

// @route   PATCH /api/quizzes/:quizId/toggle
// @desc    Activate/deactivate quiz (Teachers & Admins only)
router.patch('/:quizId/toggle', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    quiz.isActive = !quiz.isActive;
    await quiz.save();

    res.json({ message: `Quiz status updated to ${quiz.isActive ? 'active' : 'inactive'}.`, quiz });
  } catch (error) {
    console.error("Error toggling quiz status:", error);
    res.status(500).json({ message: "Server error toggling status." });
  }
});

// @route   DELETE /api/quizzes/:quizId
// @desc    Delete a quiz and its submissions (Teachers & Admins only)
router.delete('/:quizId', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    await Quiz.findByIdAndDelete(req.params.quizId);
    await QuizSubmission.deleteMany({ quiz: req.params.quizId });

    res.json({ message: "Quiz and all related student submissions deleted successfully." });
  } catch (error) {
    console.error("Error deleting quiz:", error);
    res.status(500).json({ message: "Server error deleting quiz." });
  }
});

module.exports = router;
