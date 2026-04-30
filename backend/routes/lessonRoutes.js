const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   POST /api/lessons/add-grade
// @desc    Admin විසින් Course එකක් තුළට Grade එකක් ඇතුළත් කිරීම
router.post('/add-grade', protect, isAdmin, async (req, res) => {
    const { grade, courseId } = req.body;

    try {
        // දැනටමත් එම Course එකට එම Grade එක ඇතුළත් කර ඇත්දැයි බැලීම
        const existingGrade = await Lesson.findOne({ grade, course: courseId });
        if (existingGrade) {
            return res.status(400).json({ error: "මෙම ශ්‍රේණිය දැනටමත් මෙම පාඨමාලාවට ඇතුළත් කර ඇත." });
        }

        const newGradeEntry = await Lesson.create({
            grade,
            course: courseId
        });
        res.status(201).json({ message: "ශ්‍රේණිය සාර්ථකව ඇතුළත් කළා!", newGradeEntry });
    } catch (err) {
        res.status(500).json({ error: "Grade එක ඇතුළත් කිරීම අසාර්ථකයි: " + err.message });
    }
});

// @route   PATCH /api/lessons/update-message/:lessonId
// @desc    ගුරුවරයා විසින් ශ්‍රේණිය ඇතුළත පණිවිඩය පළ කිරීම
router.patch('/update-message/:lessonId', protect, async (req, res) => {
    const { teacherMessage } = req.body;

    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        
        if (!lesson) return res.status(404).json({ error: "අදාළ ශ්‍රේණිය සොයාගත නොහැක." });

        // පණිවිඩය පමණක් යාවත්කාලීන කිරීම[cite: 1]
        lesson.teacherMessage = teacherMessage;
        await lesson.save();

        res.json({ message: "පණිවිඩය සාර්ථකව පළ කළා!", lesson });
    } catch (err) {
        res.status(500).json({ error: "පණිවිඩය යාවත්කාලීන කිරීම අසාර්ථකයි." });
    }
});

// @route   GET /api/lessons/course/:courseId
// @desc    Course එක ඇතුළේ තියෙන සියලුම Grades ලබාගැනීම[cite: 1]
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const grades = await Lesson.find({ course: req.params.courseId }).sort('grade');
        res.json(grades);
    } catch (err) {
        res.status(500).json({ error: "දත්ත ලබාගැනීම අසාර්ථකයි." });
    }
});

module.exports = router;