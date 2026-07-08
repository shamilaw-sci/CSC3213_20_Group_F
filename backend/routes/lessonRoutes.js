const express = require('express');
const router = express.Router();
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   POST /api/lessons/add-grade
// @desc    Admin විසින් Course එකක් තුළට Grade එකක් ඇතුළත් කිරීම
router.post('/add-grade', protect, isAdmin, async (req, res) => {
    const { grade, courseId } = req.body;
    const gradeNumber = Number(grade);

    if (!gradeNumber || gradeNumber < 6 || gradeNumber > 11) {
        return res.status(400).json({ error: "Invalid grade selection. Grades must be between 6 and 11." });
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        const existingCourseGrade = course.enrolledGrades.find(g => g.gradeNumber === gradeNumber);
        if (existingCourseGrade) {
            return res.status(400).json({ error: "මෙම ශ්‍රේණිය දැනටමත් මෙම පාඨමාලාවට ඇතුළත් කර ඇත." });
        }

        const existingLesson = await Lesson.findOne({ grade: gradeNumber, course: courseId });
        if (existingLesson) {
            return res.status(400).json({ error: "මෙම ශ්‍රේණිය දැනටමත් මෙම පාඨමාලාවට ඇතුළත් කර ඇත." });
        }

        const gradeTitle = String(req.body.title || `Grade ${gradeNumber}`).trim();
        course.enrolledGrades.push({ gradeNumber, title: gradeTitle, messages: [] });
        await course.save();

        const newLesson = await Lesson.create({
            course: course._id,
            grade: gradeNumber,
            teacherMessage: "මෙම ශ්‍රේණිය සඳහා ගුරුවරයාගෙන් පණිවිඩයක් නැත."
        });

        const newGradeEntry = course.enrolledGrades.find(g => g.gradeNumber === gradeNumber);
        res.status(201).json({ message: "ශ්‍රේණිය සාර්ථකව ඇතුළත් කළා!", newGradeEntry, lesson: newLesson });
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

// @route   PUT /api/lessons/:lessonId
// @desc    Update lesson message and/or video lessons
router.put('/:lessonId', protect, async (req, res) => {
    const { teacherMessage, videoLessons } = req.body;

    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "අදාළ ශ්‍රේණිය සොයාගත නොහැක." });
        }

        if (teacherMessage !== undefined) {
            lesson.teacherMessage = teacherMessage;
        }
        if (videoLessons !== undefined) {
            lesson.videoLessons = videoLessons;
        }

        await lesson.save();
        res.json({ message: "පාඩම් විස්තර සාර්ථකව යාවත්කාලීන කළා!", lesson });
    } catch (err) {
        res.status(500).json({ error: "යාවත්කාලීන කිරීම අසාර්ථකයි: " + err.message });
    }
});

module.exports = router;