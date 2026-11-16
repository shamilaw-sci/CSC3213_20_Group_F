/**
 * @file progressRoutes.js
 * @description Reading Progress Routes. Tracks student reading activity and page completion metrics on course PDF lecture materials.
 */

const express = require('express');
const router = express.Router();
const ReadingProgress = require('../models/ReadingProgress');
const Course = require('../models/Course');
const { protect } = require('../middleware/authMiddleware');

// @route   POST /api/progress/pdf
// @desc    Update or create student PDF reading progress
// @access  Private (Student)
router.post('/pdf', protect, async (req, res) => {
  const { courseId, lessonId, pdfId, pdfTitle, currentPage = 1, totalPages = 1 } = req.body;

  if (!courseId || !lessonId || !pdfId) {
    return res.status(400).json({ error: "courseId, lessonId, and pdfId are required." });
  }

  const validTotalPages = Math.max(1, parseInt(totalPages, 10) || 1);
  const validCurrentPage = Math.min(validTotalPages, Math.max(1, parseInt(currentPage, 10) || 1));

  try {
    let progress = await ReadingProgress.findOne({
      student: req.user._id,
      pdfId
    });

    if (!progress) {
      const initialMaxPage = validCurrentPage;
      const initialPercentage = Math.min(100, Math.round((initialMaxPage / validTotalPages) * 100));

      progress = new ReadingProgress({
        student: req.user._id,
        course: courseId,
        lesson: lessonId,
        pdfId,
        pdfTitle: pdfTitle || 'Study Pack PDF',
        totalPages: validTotalPages,
        maxPageRead: initialMaxPage,
        progressPercentage: initialPercentage,
        isCompleted: initialPercentage >= 100,
        lastReadAt: new Date()
      });
    } else {
      const newMaxPage = Math.max(progress.maxPageRead || 1, validCurrentPage);
      const newPercentage = Math.min(100, Math.round((newMaxPage / validTotalPages) * 100));

      progress.totalPages = validTotalPages;
      progress.maxPageRead = newMaxPage;
      progress.progressPercentage = newPercentage;
      progress.isCompleted = newPercentage >= 100;
      progress.lastReadAt = new Date();
      if (pdfTitle) progress.pdfTitle = pdfTitle;
    }

    await progress.save();

    res.json({
      success: true,
      message: `Reading progress saved (${progress.progressPercentage}%)`,
      progress
    });

  } catch (err) {
    console.error("Save PDF Reading Progress Error:", err);
    res.status(500).json({ error: "Failed to save reading progress: " + err.message });
  }
});

// @route   GET /api/progress/course/:courseId
// @desc    Get logged-in student's PDF reading progress for a course
// @access  Private
router.get('/course/:courseId', protect, async (req, res) => {
  try {
    const progressList = await ReadingProgress.find({
      student: req.user._id,
      course: req.params.courseId
    });

    const progressMap = {};
    progressList.forEach(p => {
      const nextPage = p.isCompleted ? p.totalPages : Math.min(p.totalPages, (p.maxPageRead || 1) + 1);
      progressMap[p.pdfId] = {
        maxPageRead: p.maxPageRead,
        totalPages: p.totalPages,
        progressPercentage: p.progressPercentage,
        isCompleted: p.isCompleted,
        nextPageToRead: nextPage,
        lastReadAt: p.lastReadAt
      };
    });

    res.json({
      success: true,
      progressMap,
      progressList
    });

  } catch (err) {
    console.error("Fetch Course Progress Error:", err);
    res.status(500).json({ error: "Failed to fetch course reading progress." });
  }
});

// @route   GET /api/progress/student/:studentId
// @desc    Get reading progress for a student (Parent/Admin/Student)
// @access  Private
router.get('/student/:studentId', protect, async (req, res) => {
  try {
    const progressList = await ReadingProgress.find({ student: req.params.studentId })
      .populate('course', 'title price')
      .sort({ lastReadAt: -1 });

    res.json({
      success: true,
      count: progressList.length,
      progressList
    });

  } catch (err) {
    console.error("Fetch Student Reading Progress Error:", err);
    res.status(500).json({ error: "Failed to fetch student reading progress." });
  }
});

module.exports = router;
