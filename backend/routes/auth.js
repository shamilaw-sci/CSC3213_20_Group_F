const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const Course = require('../models/Course');
const { OAuth2Client } = require('google-auth-library');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Create Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Return user info and mustChangePassword flag
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
  res.status(410).json({
    message: "Self-registration is disabled. Please contact the institute administration."
  });
});

// --- GOOGLE LOGIN ROUTE ---
router.post('/google', async (req, res) => {
  const { credential } = req.body;

  if (!credential) {
    return res.status(400).json({ message: "Google credential is required" });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Google account email could not be verified" });
    }

    if (payload?.email_verified === false) {
      return res.status(400).json({ message: "Google account email is not verified" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(403).json({
        message: "This Google email is not registered. Please contact the institute administration."
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    });
  } catch (err) {
    console.error("Google Login Error:", err);
    res.status(401).json({ message: err?.message || "Google authentication failed" });
  }
});

// --- CHANGE PASSWORD ROUTE ---
router.post('/change-password', protect, async (req, res) => {
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: "Password is required" });
  }

  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update user password and set mustChangePassword to false
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = hashedPassword;
    user.mustChangePassword = false;
    await user.save();

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- UPDATE PROFILE ROUTE (Name and/or Password) ---
router.put('/update-profile', protect, async (req, res) => {
  const { name, newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id || req.user._id);;
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Update the name if provided
    if (name) user.name = name;

    // 2. Update the password if provided
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    await user.save();

    // 3. Send back the updated user info (excluding password)
    res.json({
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      }
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ==========================================
//          ADMIN ONLY ROUTES
// ==========================================

// 1. GET ALL USERS
router.get('/users', protect, async (req, res) => {
  // Check if the person making the request is actually an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  try {
    // Fetch all users but DO NOT send passwords back to the frontend!
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// 2. CREATE USER
router.post('/users', protect, isAdmin, async (req, res) => {
  const { name, email, registrationNumber, temporaryPassword, role = 'student' } = req.body;
  const normalizedName = name?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedRegistrationNumber = registrationNumber?.trim();
  const allowedRoles = ['student', 'teacher', 'admin'];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid user role." });
  }

  if (!normalizedName || !normalizedEmail || !temporaryPassword) {
    return res.status(400).json({ message: "Name, email, and temporary password are required." });
  }

  if (role === 'student' && !normalizedRegistrationNumber) {
    return res.status(400).json({ message: "Registration number is required for students." });
  }

  try {
    const existingUser = await User.findOne({
      $or: [
        { email: normalizedEmail },
        ...(normalizedRegistrationNumber ? [{ registrationNumber: normalizedRegistrationNumber }] : [])
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === normalizedEmail
          ? "User with this email already exists."
          : "User with this registration number already exists."
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      registrationNumber: normalizedRegistrationNumber || undefined,
      password: hashedPassword,
      role,
      mustChangePassword: true
    });

    const createdUser = await User.findById(user._id).select('-password');
    res.status(201).json({
      message: "User created successfully. Share the temporary password securely.",
      user: createdUser
    });
  } catch (err) {
    console.error("Create User Error:", err);
    res.status(500).json({ message: "Failed to create user" });
  }
});

// 3. UPDATE USER ROLE
router.put('/users/:id/role', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Access Denied" });

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id, 
      { role: req.body.role }, 
      { new: true }
    ).select('-password');
    
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: "Failed to update role" });
  }
});

// 4. DELETE USER
router.delete('/users/:id', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Access Denied" });

  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// --- GET ADMIN DASHBOARD STATS ---
router.get('/admin-stats', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalCourses = await Course.countDocuments();    

    res.json({
      students: totalStudents,
      teachers: totalTeachers,
      courses: totalCourses
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});

module.exports = router;
