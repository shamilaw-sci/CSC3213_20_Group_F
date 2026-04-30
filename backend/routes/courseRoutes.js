const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   GET /api/courses
router.get('/', protect, async (req, res) => {
    try {
        const courses = await Course.find({}).populate('instructor', 'name');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

// @route   GET /api/courses/:id
// Fetch single course details
router.get('/:id', protect, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id).populate('instructor', 'name');
        if (!course) return res.status(404).json({ error: "Course not found" });
        res.json(course);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// @route   POST /api/courses/add-with-teacher
router.post('/add-with-teacher', protect, isAdmin, async (req, res) => {
    const { title, description, teacherName, teacherEmail, defaultPassword } = req.body;

    if (!title || !teacherEmail || !teacherName) {
        return res.status(400).json({ error: "Please fill in all required fields." });
    }

    try {
        let instructorId = null;
        const existingTeacher = await User.findOne({ email: teacherEmail });

        if (existingTeacher) {
            if (existingTeacher.role !== 'teacher') {
                return res.status(400).json({ error: "User exists, but is not a teacher." });
            }
            instructorId = existingTeacher._id;
        } else {
            if (!defaultPassword) {
                return res.status(400).json({ error: "Password is required for new accounts." });
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(defaultPassword, salt);
            const newTeacher = await User.create({
                name: teacherName,
                email: teacherEmail,
                password: hashedPassword,
                role: 'teacher',
                mustChangePassword: true
            });
            instructorId = newTeacher._id;
        }

        const newCourse = await Course.create({
            title,
            description,
            instructor: instructorId
        });

        res.status(201).json({ message: "Course created successfully!", courseId: newCourse._id });
    } catch (err) {
        if (err.code === 11000) return res.status(400).json({ error: "Email exists." });
        res.status(500).json({ error: "Server error: " + err.message });
    }
});

// --- NEW ROUTES FOR GRADES AND MESSAGES ---

// @route   POST /api/courses/:id/add-grade
// Admin adds a grade to the course
router.post('/:id/add-grade', protect, isAdmin, async (req, res) => {
    try {
        const { gradeNumber } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ error: "Course not found" });

        // Check if grade already exists
        const exists = course.enrolledGrades.find(g => g.gradeNumber === gradeNumber);
        if (exists) return res.status(400).json({ error: "Grade already added to this course" });

        course.enrolledGrades.push({ gradeNumber, messages: [] });
        await course.save();

        res.status(200).json({ message: `Grade ${gradeNumber} added successfully` });
    } catch (err) {
        res.status(500).json({ error: "Failed to add grade" });
    }
});

// @route   POST /api/courses/:id/send-message
// Teacher sends a message to a specific grade
router.post('/:id/send-message', protect, async (req, res) => {
    try {
        const { gradeNumber, text } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ error: "Course not found" });

        const grade = course.enrolledGrades.find(g => g.gradeNumber === gradeNumber);
        if (!grade) return res.status(400).json({ error: "Grade not enrolled in this course" });

        grade.messages.push({ text, sender: req.user._id });
        await course.save();

        res.status(200).json({ message: "Message sent successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send message" });
    }
});

module.exports = router;