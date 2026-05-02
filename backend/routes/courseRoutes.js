const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// @route   GET /api/courses
// Fetch all courses with instructor details
router.get('/', protect, async (req, res) => {
    try {
        const courses = await Course.find({}).populate('instructor', 'name');
        res.json(courses);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch courses" });
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

module.exports = router;