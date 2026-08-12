const express = require('express');
const router = express.Router();
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Course = require('../models/Course');
const { protect, isTeacherOrAdmin } = require('../middleware/authMiddleware');

// @route   POST /api/quizzes
// @desc    Create a new quiz (Teachers & Admins only)
router.post('/', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description, course, grade, timeLimit, questions } = req.body;

    if (!title || !course || !grade || !questions || questions.length === 0) {
      return res.status(400).json({ message: "Please provide all required fields." });
    }

    // Verify course exists
    const courseExists = await Course.findById(course);
    if (!courseExists) {
      return res.status(404).json({ message: "Course not found." });
    }

    // Validate questions
    for (const q of questions) {
      if (!q.questionText || !q.options || q.options.length < 2 || q.correctAnswer === undefined) {
        return res.status(400).json({ message: "Each question must have text, at least two options, and a correct answer index." });
      }
      if (q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        return res.status(400).json({ message: "correctAnswer index must be valid for the options array." });
      }
    }

    const quiz = new Quiz({
      title,
      description,
      course,
      grade,
      teacher: req.user._id,
      timeLimit: timeLimit || 0,
      questions
    });

    await quiz.save();
    res.status(201).json(quiz);
  } catch (error) {
    console.error("Error creating quiz:", error);
    res.status(500).json({ message: "Server error creating quiz." });
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

    const quizzes = await Quiz.find(filter).sort({ createdAt: -1 });

    // For students, find their attempts/submissions for these quizzes
    const submissions = await QuizSubmission.find({
      student: req.user._id,
      quiz: { $in: quizzes.map(q => q._id) }
    });

    // Map attempts for frontend ease
    const quizList = quizzes.map(quiz => {
      const submission = submissions.find(sub => sub.quiz.toString() === quiz._id.toString());
      
      // If student, strip correctAnswer details from quiz list questions for security
      const quizObj = quiz.toObject();
      if (!isTeacher && quizObj.questions) {
        quizObj.questions = quizObj.questions.map(q => {
          const { correctAnswer, ...qWithoutAnswer } = q;
          return qWithoutAnswer;
        });
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
// @desc    Get details of a specific quiz (Strips correct answer for students)
router.get('/:quizId', protect, async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.quizId);
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    const isTeacher = req.user.role === 'teacher' || req.user.role === 'admin';
    const quizObj = quiz.toObject();

    // Check if student has already submitted. If so, they can view their results separately.
    if (!isTeacher) {
      const submission = await QuizSubmission.findOne({ quiz: quiz._id, student: req.user._id });
      
      // If student hasn't submitted, strip correct answers to prevent devTools inspection
      if (!submission) {
        quizObj.questions = quizObj.questions.map(q => {
          const { correctAnswer, ...qWithoutAnswer } = q;
          return qWithoutAnswer;
        });
      }
    }

    res.json(quizObj);
  } catch (error) {
    console.error("Error fetching quiz details:", error);
    res.status(500).json({ message: "Server error fetching quiz." });
  }
});

// @route   POST /api/quizzes/:quizId/submit
// @desc    Submit answers for a quiz (Calculates score & records attempt)
router.post('/:quizId/submit', protect, async (req, res) => {
  try {
    const { answers } = req.body; // Array of selected option indices (0-based)
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

      if (studentAnswer !== undefined && studentAnswer === question.correctAnswer) {
        score += points;
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
// @desc    Get student's submission for a quiz (includes correct answers for review)
router.get('/:quizId/my-submission', protect, async (req, res) => {
  try {
    const submission = await QuizSubmission.findOne({ quiz: req.params.quizId, student: req.user._id })
      .populate({
        path: 'quiz',
        select: 'title description questions timeLimit'
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
