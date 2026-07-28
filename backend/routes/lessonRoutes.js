const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const uploadPdfMiddleware = require('../middleware/pdfUpload');

// Middleware to authorize teachers and admins
const isTeacherOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Teachers and Admins only." });
    }
};

// @route   POST /api/lessons/add-grade
// @desc    Admin විසින් Course එකක් තුළට Grade එකක් ඇතුළත් කිරීම
router.post('/add-grade', protect, isAdmin, async (req, res) => {
    const { grade, courseId } = req.body;

    if (!grade || !String(grade).trim()) {
        return res.status(400).json({ error: "Invalid grade selection." });
    }

    const gradeVal = String(grade).trim();

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        const existingCourseGrade = course.enrolledGrades.find(g => g.gradeNumber === gradeVal);
        if (existingCourseGrade) {
            return res.status(400).json({ error: "This class was already added to this course" });
        }

        const existingLesson = await Lesson.findOne({ grade: gradeVal, course: courseId });
        if (existingLesson) {
            return res.status(400).json({ error: "This class was already added to this course" });
        }

        const gradeTitle = String(req.body.title || gradeVal).trim();
        course.enrolledGrades.push({ gradeNumber: gradeVal, title: gradeTitle, messages: [] });
        await course.save();

        const newLesson = await Lesson.create({
            course: course._id,
            grade: gradeVal,
            teacherMessage: "No teacher message for this class yet."
        });

        const newGradeEntry = course.enrolledGrades.find(g => g.gradeNumber === gradeVal);
        res.status(201).json({ message: "Class added successfully!", newGradeEntry, lesson: newLesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to add class: " + err.message });
    }
});

// @route   PATCH /api/lessons/update-message/:lessonId
// @desc    Teacher posting a message to a class
router.patch('/update-message/:lessonId', protect, isTeacherOrAdmin, async (req, res) => {
    const { teacherMessage } = req.body;

    try {
        const lesson = await Lesson.findById(req.params.lessonId);

        if (!lesson) return res.status(404).json({ error: "Class not found." });

        // පණිවිඩය පමණක් යාවත්කාලීන කිරීම[cite: 1]
        lesson.teacherMessage = teacherMessage;
        await lesson.save();

        res.json({ message: "Message posted successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to post message." });
    }
});

// @route   GET /api/lessons/course/:courseId
// @desc    Get all classes in a course
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const grades = await Lesson.find({ course: req.params.courseId }).sort('grade');
        res.json(grades);
    } catch (err) {
        res.status(500).json({ error: "Failed to get data." });
    }
});

// @route   PUT /api/lessons/:lessonId
// @desc    Update lesson message and/or video lessons
router.put('/:lessonId', protect, isTeacherOrAdmin, async (req, res) => {
    const { teacherMessage, videoLessons } = req.body;

    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (teacherMessage !== undefined) {
            lesson.teacherMessage = teacherMessage;
        }
        if (videoLessons !== undefined) {
            lesson.videoLessons = videoLessons;
        }

        await lesson.save();
        res.json({ message: "Lesson details updated successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to update lesson details: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/pdf
// @desc    Upload a PDF material (Admin/Teacher only)
router.post('/:lessonId/pdf', protect, isTeacherOrAdmin, uploadPdfMiddleware, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Please upload a PDF file." });
        }

        const title = req.body.title || req.file.originalname;
        const filename = req.file.filename;
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        const fileSize = req.file.size;

        if (!lesson.pdfMaterials) {
            lesson.pdfMaterials = [];
        }

        lesson.pdfMaterials.push({
            title,
            filename,
            fileUrl,
            fileSize
        });

        await lesson.save();
        res.status(201).json({ message: "PDF uploaded successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload PDF: " + err.message });
    }
});

// @route   DELETE /api/lessons/:lessonId/pdf/:pdfId
// @desc    Delete a PDF material (Admin/Teacher only)
router.delete('/:lessonId/pdf/:pdfId', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const pdfIndex = lesson.pdfMaterials.findIndex(pdf => pdf._id.toString() === req.params.pdfId);
        if (pdfIndex === -1) {
            return res.status(404).json({ error: "PDF not found." });
        }

        const pdf = lesson.pdfMaterials[pdfIndex];
        const pdfFilePath = path.join(__dirname, '..', 'uploads', pdf.filename);

        // Delete from filesystem
        if (fs.existsSync(pdfFilePath)) {
            fs.unlinkSync(pdfFilePath);
        }

        // Remove from database array
        lesson.pdfMaterials.splice(pdfIndex, 1);
        await lesson.save();

        res.json({ message: "PDF removed successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete PDF: " + err.message });
    }
});

module.exports = router;