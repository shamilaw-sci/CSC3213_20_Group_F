const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const { protect, isAdmin } = require('../middleware/authMiddleware');

// Route: POST /api/courses/add-with-teacher
router.post('/add-with-teacher', protect, isAdmin, async (req, res) => {
  console.log("--- [DEBUG] Request hit /add-with-teacher ---");
  console.log("User performing action:", req.user); // Check if this is truly an 'admin'
  console.log("Request Body:", req.body);

  const { title, description, teacherName, teacherEmail, defaultPassword } = req.body;

  // 1. Validation Check
  if (!title || !teacherEmail || !defaultPassword || !teacherName) {
    console.warn("Validation failed: Missing fields");
    return res.status(400).json({ error: "Please fill in all required fields." });
  }

  try {
    // 2. Check duplicate teacher
    const existingTeacher = await User.findOne({ email: teacherEmail });
    if (existingTeacher) {
      console.warn("Conflict: Teacher already exists");
      return res.status(400).json({ error: "Teacher with this email already exists." });
    }

    // 3. Hash Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);
    console.log("Password hashed successfully");

    // 4. Create Teacher
    const newTeacher = await User.create({
      name: teacherName,
      email: teacherEmail,
      password: hashedPassword,
      role: 'teacher',
      mustChangePassword: true
    });
    console.log("New teacher created with ID:", newTeacher._id);

    // 5. Create Course
    const newCourse = await Course.create({
      title,
      description,
      instructor: newTeacher._id 
    });
    console.log("New course created with ID:", newCourse._id);

    res.status(201).json({ 
      message: "Teacher registered and course created successfully!",
      courseId: newCourse._id 
    });

  } catch (err) {
    console.error("CRITICAL ERROR during creation:", err);
    res.status(500).json({ error: "Server error: " + err.message });
  }
});

module.exports = router;