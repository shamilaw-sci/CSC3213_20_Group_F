const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const Notification = require('../models/Notification');
const { sendResetPasswordEmail, sendRegistrationWelcomeEmail } = require('../utils/emailService');

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
        email: user.email,
        role: user.role,
        studentType: user.studentType || 'physical',
        grade: user.grade,
        registrationNumber: user.registrationNumber,
        mustChangePassword: user.mustChangePassword,
        profilePicture: user.profilePicture || ''
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
  const { email, password, grade, parentsPhoneNumber } = req.body;

  if (!email || !password || !grade || !parentsPhoneNumber) {
    return res.status(400).json({ message: "Email, password, grade, and parent's phone number are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: "An account with this email already exists." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Derive name from email (e.g. format "john.doe" to "John Doe")
    const usernamePart = normalizedEmail.split('@')[0];
    const derivedName = usernamePart
      .split(/[\._\-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const newUser = await User.create({
      name: derivedName,
      email: normalizedEmail,
      password: hashedPassword,
      grade: grade.trim(),
      parentsPhoneNumber: parentsPhoneNumber.trim(),
      role: 'student',
      studentType: 'online',
      mustChangePassword: false
    });

    // --- TRIGGER NOTIFICATIONS ---
    try {
      // 1. In-App Notification for Admins
      await Notification.create({
        recipientRole: 'admin',
        type: 'REGISTRATION',
        title: 'New Student Registration',
        message: `${newUser.name} (${newUser.email}, ${newUser.grade}) has registered as a new student.`,
        link: '/manage-users',
        metadata: { studentId: newUser._id }
      });

      // 2. Welcome Email to Student
      sendRegistrationWelcomeEmail(newUser.email, newUser.name, newUser.registrationNumber);
    } catch (notifErr) {
      console.error('Registration notification trigger error:', notifErr.message);
    }

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        studentType: newUser.studentType,
        grade: newUser.grade,
        registrationNumber: newUser.registrationNumber,
        mustChangePassword: newUser.mustChangePassword,
        profilePicture: newUser.profilePicture || ''
      }
    });

  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error during registration." });
  }
});

// --- GOOGLE REGISTER ROUTE ---
router.post('/google-register', async (req, res) => {
  const { credential, grade, parentsPhoneNumber } = req.body;

  if (!credential || !grade || !parentsPhoneNumber) {
    return res.status(400).json({ message: "Google credential, grade, and parent's phone number are required." });
  }

  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const email = payload?.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Google account email could not be verified." });
    }

    if (payload?.email_verified === false) {
      return res.status(400).json({ message: "Google account email is not verified." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "This email is already registered. Please log in instead." });
    }

    // Google registration needs a placeholder password
    const salt = await bcrypt.genSalt(10);
    const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const hashedPassword = await bcrypt.hash(randomPassword, salt);

    const newUser = await User.create({
      name: payload.name || email.split('@')[0],
      email: email,
      password: hashedPassword,
      grade: grade.trim(),
      parentsPhoneNumber: parentsPhoneNumber.trim(),
      role: 'student',
      studentType: 'online',
      profilePicture: payload.picture || '',
      mustChangePassword: false
    });

    const token = jwt.sign(
      { id: newUser._id, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        studentType: newUser.studentType,
        grade: newUser.grade,
        registrationNumber: newUser.registrationNumber,
        mustChangePassword: newUser.mustChangePassword,
        profilePicture: newUser.profilePicture || ''
      }
    });

  } catch (err) {
    console.error("Google Register Error:", err);
    res.status(401).json({ message: err?.message || "Google registration failed." });
  }
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

    // Sync Google picture to database if no profile picture is set or if it is currently a Google picture
    const isGooglePic = user.profilePicture && user.profilePicture.includes('googleusercontent.com');
    if ((!user.profilePicture || isGooglePic) && payload.picture && user.profilePicture !== payload.picture) {
      user.profilePicture = payload.picture;
      await user.save();
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
        email: user.email,
        role: user.role,
        studentType: user.studentType || 'physical',
        grade: user.grade,
        registrationNumber: user.registrationNumber,
        mustChangePassword: user.mustChangePassword,
        profilePicture: user.profilePicture || ''
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

// --- FORGOT PASSWORD ROUTE ---
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User with this email does not exist." });
    }

    // Generate token
    const token = crypto.randomBytes(20).toString('hex');

    // Save token & expiration to user document
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour from now
    await user.save();

    // Send email
    await sendResetPasswordEmail(user.email, token, user.name);

    res.json({ message: "Password reset link has been sent to your email." });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error occurred while sending reset link." });
  }
});

// --- RESET PASSWORD ROUTE ---
router.post('/reset-password/:token', async (req, res) => {
  const { newPassword } = req.body;
  const { token } = req.params;

  if (!newPassword) {
    return res.status(400).json({ message: "New password is required" });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Password reset token is invalid or has expired." });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    // Clear reset token and expiration fields
    user.resetPasswordToken = '';
    user.resetPasswordExpires = undefined;
    
    // Clear mustChangePassword if set
    user.mustChangePassword = false;

    await user.save();

    res.json({ message: "Password has been reset successfully. You can now log in." });
  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error occurred while resetting password." });
  }
});

// --- UPDATE PROFILE ROUTE (Name and/or Password) ---
router.put('/update-profile', protect, async (req, res) => {
  const { name, newPassword, profilePicture } = req.body;

  try {
    const user = await User.findById(req.user.id || req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Update the name if provided
    if (name) user.name = name;

    // 2. Update the password if provided
    if (newPassword) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
    }

    // 3. Update profile picture if provided
    if (profilePicture !== undefined) {
      if (profilePicture && profilePicture.startsWith('data:image/')) {
        // Validate size of base64
        const base64Length = profilePicture.length - (profilePicture.indexOf(',') + 1);
        const padding = (profilePicture.charAt(profilePicture.length - 2) === '=') ? 2 : ((profilePicture.charAt(profilePicture.length - 1) === '=') ? 1 : 0);
        const sizeInBytes = (base64Length * 3 / 4) - padding;
        if (sizeInBytes > 1024 * 1024) {
          return res.status(400).json({ message: "Profile photo exceeds 1MB size limit" });
        }
      }
      user.profilePicture = profilePicture;
    }

    await user.save();

    // 4. Send back the updated user info (excluding password)
    res.json({
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentType: user.studentType || 'physical',
        grade: user.grade,
        registrationNumber: user.registrationNumber,
        mustChangePassword: user.mustChangePassword,
        profilePicture: user.profilePicture || ''
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

// 1. SEARCH STUDENTS
router.get('/users/search-students', protect, async (req, res) => {
  try {
    const { query, studentType } = req.query;
    if (!query || !query.trim()) return res.json([]);

    const trimmedQuery = query.trim();
    const safeRegex = new RegExp(trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const searchConditions = [
      { name: safeRegex },
      { registrationNumber: safeRegex },
      { email: safeRegex },
      { parentsPhoneNumber: safeRegex }
    ];

    if (mongoose.Types.ObjectId.isValid(trimmedQuery)) {
      searchConditions.push({ _id: trimmedQuery });
    }

    const filter = {
      role: 'student',
      $or: searchConditions
    };

    if (studentType && studentType !== 'all') {
      filter.studentType = studentType;
    }

    const students = await User.find(filter)
      .select('-password')
      .sort({ name: 1 })
      .limit(20);

    res.json(students);
  } catch (err) {
    console.error("Search Students Error:", err);
    res.status(500).json({ message: "Server error searching students." });
  }
});

// 2. GET ALL USERS
router.get('/users', protect, async (req, res) => {
  // Check if the person making the request is actually an admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Access Denied: Admins only." });
  }

  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    // Fetch users but DO NOT send passwords back to the frontend!
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// 3. CREATE USER
router.post('/users', protect, isAdmin, async (req, res) => {
  const { name, email, registrationNumber, parentsPhoneNumber, temporaryPassword, role = 'student', grade } = req.body;
  const normalizedName = name?.trim();
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedRegistrationNumber = registrationNumber?.trim();
  const allowedRoles = ['student', 'teacher', 'admin'];
  const normalizedGrade = grade !== undefined ? String(grade).trim() : undefined;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid user role." });
  }

  if (!normalizedName || !normalizedEmail || !temporaryPassword) {
    return res.status(400).json({ message: "Name, email, and temporary password are required." });
  }

  if (role === 'student') {
    if (!normalizedRegistrationNumber) {
      return res.status(400).json({ message: "Registration number is required for students." });
    }
    if (!parentsPhoneNumber || !parentsPhoneNumber.trim()) {
      return res.status(400).json({ message: "Parents phone number is required for students." });
    }
    if (!normalizedGrade) {
      return res.status(400).json({ message: "A valid student grade is required." });
    }
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
      parentsPhoneNumber: role === 'student' ? parentsPhoneNumber.trim() : undefined,
      grade: role === 'student' ? normalizedGrade : undefined,
      password: hashedPassword,
      role,
      studentType: role === 'student' ? 'physical' : undefined,
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
    const userId = req.params.id;
    await Enrollment.deleteMany({ student: userId });
    await Course.updateMany(
      {},
      { 
        $pull: { 
          enrolledStudents: userId,
          "classes.$[].enrolledStudents": userId
        } 
      }
    );
    await User.findByIdAndDelete(userId);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete user" });
  }
});

// 5. UPDATE STUDENT GRADE MANUALLY (Individual)
router.put('/users/:id/grade', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Access Denied: Admins only." });

  const { grade } = req.body;
  if (!grade) {
    return res.status(400).json({ message: "Grade is required." });
  }

  try {
    const updatedUser = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'student' },
      { grade: grade.trim() },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: "Student not found." });
    }
    
    res.json(updatedUser);
  } catch (err) {
    console.error("Update Grade Error:", err);
    res.status(500).json({ message: "Failed to update student grade" });
  }
});

// 6. BATCH UPDATE STUDENT GRADES
router.post('/users/batch-update-grade', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Access Denied: Admins only." });

  const { sourceGrade, targetGrade } = req.body;
  if (!sourceGrade || !targetGrade) {
    return res.status(400).json({ message: "Both source grade and target grade are required." });
  }

  try {
    const result = await User.updateMany(
      { role: 'student', grade: sourceGrade.trim() },
      { grade: targetGrade.trim() }
    );

    const modifiedCount = result.modifiedCount ?? result.nModified ?? 0;

    res.json({
      message: `Successfully updated ${modifiedCount} students from ${sourceGrade} to ${targetGrade}.`,
      modifiedCount
    });
  } catch (err) {
    console.error("Batch Update Grade Error:", err);
    res.status(500).json({ message: "Failed to update grades in batch" });
  }
});

// --- GET ADMIN DASHBOARD STATS ---
router.get('/admin-stats', protect, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: "Forbidden" });

  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const onlineStudents = await User.countDocuments({ role: 'student', studentType: 'online' });
    const physicalStudents = Math.max(0, totalStudents - onlineStudents);
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalCourses = await Course.countDocuments();    

    // Recent Registrations (last 5 students)
    const recentRegistrations = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email grade studentType createdAt');

    // Monthly Growth Data for Intake Line Chart
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const monthsList = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      monthsList.push(monthNames[d.getMonth()]);
    }

    const growthMap = {};
    monthsList.forEach(m => { growthMap[m] = 0; });

    const allStudents = await User.find({ role: 'student' }).select('createdAt');
    allStudents.forEach(s => {
      const d = new Date(s.createdAt);
      const mName = monthNames[d.getMonth()];
      if (growthMap[mName] !== undefined) {
        growthMap[mName] += 1;
      }
    });

    const growthData = monthsList.map(m => ({ month: m, count: growthMap[m] }));

    // Fee Collection Metrics
    const payments = await Payment.find({ status: 'COMPLETED' });
    const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    res.json({
      students: totalStudents,
      physicalStudents,
      onlineStudents,
      teachers: totalTeachers,
      courses: totalCourses,
      recentRegistrations,
      growthData,
      totalCollected
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// --- GET ADMIN & TEACHER ANALYTICS SUMMARY ---
router.get('/analytics-summary', protect, async (req, res) => {
  try {
    // 0. Student Role Handling (Personal Learning Analytics)
    if (req.user.role?.toLowerCase() === 'student') {
      const studentId = req.user.id || req.user._id;

      const enrollments = await Enrollment.find({ student: studentId }).populate({
        path: 'course',
        populate: { path: 'instructor', select: 'name email' }
      }).lean();

      const directCourses = await Course.find({ enrolledStudents: studentId })
        .populate('instructor', 'name email')
        .lean();

      const allCoursesMap = {};

      directCourses.forEach(c => {
        allCoursesMap[c._id.toString()] = {
          _id: c._id,
          title: c.title,
          description: c.description,
          instructorName: c.instructor?.name || 'TBA',
          price: c.price || 2500,
          cardImage: c.cardImage || '',
          banner: c.banner || ''
        };
      });

      enrollments.forEach(e => {
        if (e.course) {
          allCoursesMap[e.course._id.toString()] = {
            _id: e.course._id,
            title: e.course.title,
            description: e.course.description,
            instructorName: e.course.instructor?.name || 'TBA',
            price: e.course.price || 2500,
            cardImage: e.course.cardImage || '',
            banner: e.course.banner || ''
          };
        }
      });

      const enrolledCoursesList = Object.values(allCoursesMap);

      // Student Personal Attendance & Weekly Attendance Tracking
      const totalAttendance = await Attendance.countDocuments({ studentId });
      const presentRecords = await Attendance.countDocuments({ studentId, status: 'Present' });
      const absentRecords = await Attendance.countDocuments({ studentId, status: 'Absent' });
      const lateRecords = await Attendance.countDocuments({ studentId, status: 'Late' });

      // Weekly Online Attendance Submissions
      const weeklyRecords = await Attendance.find({ studentId, mode: 'ONLINE_WEEKLY' }).lean();
      const weeklyAttendedCount = weeklyRecords.length;

      // Dynamic Active Months Count (e.g. July 2026, August 2026, September 2026, October 2026 = 4 months)
      // 4 weeks per month = 16 weeks per course. Adding a new month automatically increases the dividing factor by +4 weeks.
      const activeMonthsList = ["July 2026", "August 2026", "September 2026", "October 2026"];
      const weeksPerCourse = activeMonthsList.length * 4; // 16 weeks per course
      const totalAvailableWeeks = Math.max(16, (enrolledCoursesList.length || 1) * weeksPerCourse);

      let attendanceRate = 0;
      if (totalAvailableWeeks > 0) {
        attendanceRate = Math.min(100, Math.round((weeklyAttendedCount / totalAvailableWeeks) * 100));
      } else if (totalAttendance > 0) {
        attendanceRate = Math.round((presentRecords / totalAttendance) * 100);
      } else {
        attendanceRate = 0;
      }

      // Student Personal Payments
      const studentPayments = await Payment.find({ student: studentId, status: 'COMPLETED' })
        .populate('course', 'title price')
        .lean();

      const totalPaidAmount = studentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      return res.json({
        success: true,
        isStudentView: true,
        studentMetrics: {
          enrolledCoursesCount: enrolledCoursesList.length,
          attendanceRate,
          weeklyAttendedCount,
          totalAvailableWeeks,
          totalPaymentsCount: studentPayments.length,
          totalPaidAmount,
          userGrade: req.user.grade || 'Unassigned',
          userType: req.user.studentType || 'online'
        },
        attendanceBreakdown: {
          total: totalAttendance,
          present: presentRecords,
          absent: absentRecords,
          late: lateRecords,
          weeklyAttendedCount,
          totalAvailableWeeks
        },
        weeklyRecords,
        enrolledCoursesList,
        studentPayments
      });
    }

    const { studentType } = req.query; // 'all', 'online', 'physical'
    const filterType = (studentType && studentType !== 'all') ? studentType.toLowerCase() : null;

    // Build user filter query
    const studentFilter = { role: 'student' };
    if (filterType) {
      studentFilter.studentType = filterType;
    }

    // 1. User Demographic Stats
    const totalAllStudents = await User.countDocuments({ role: 'student' });
    const onlineStudents = await User.countDocuments({ role: 'student', studentType: 'online' });
    const physicalStudents = Math.max(0, totalAllStudents - onlineStudents);
    
    const totalStudents = filterType === 'online' ? onlineStudents : filterType === 'physical' ? physicalStudents : totalAllStudents;
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    // Fetch filtered student IDs for course & payment scoping
    const filteredStudents = await User.find(studentFilter).select('_id grade studentType createdAt');
    const filteredStudentIds = filteredStudents.map(s => s._id);

    // 2. Grade Distribution (scoped to filterType)
    const gradeCounts = {};
    const gradeTypeBreakdown = {};

    filteredStudents.forEach(s => {
      let g = s.grade || 'Unassigned';
      if (g.toLowerCase().startsWith('grade')) {
        g = g.trim();
      } else if (!isNaN(g)) {
        g = `Grade ${g.trim()}`;
      }
      
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;
      
      if (!gradeTypeBreakdown[g]) {
        gradeTypeBreakdown[g] = { online: 0, physical: 0 };
      }
      if (s.studentType === 'online') {
        gradeTypeBreakdown[g].online += 1;
      } else {
        gradeTypeBreakdown[g].physical += 1;
      }
    });

    const gradeDistribution = Object.keys(gradeCounts).map(gradeName => ({
      grade: gradeName,
      count: gradeCounts[gradeName],
      online: gradeTypeBreakdown[gradeName]?.online || 0,
      physical: gradeTypeBreakdown[gradeName]?.physical || 0
    })).sort((a, b) => b.count - a.count);

    // 3. Course Popularity Analytics (Most Taken Courses - scoped to filterType)
    const courses = await Course.find({})
      .populate('instructor', 'name email')
      .lean();

    const topCourses = await Promise.all(courses.map(async (c) => {
      const enrollmentQuery = filterType 
        ? { course: c._id, student: { $in: filteredStudentIds } }
        : { course: c._id };

      const enrollmentDocsCount = await Enrollment.countDocuments(enrollmentQuery);
      
      let embeddedArrayCount = 0;
      if (Array.isArray(c.enrolledStudents)) {
        if (filterType) {
          embeddedArrayCount = c.enrolledStudents.filter(id => 
            filteredStudentIds.some(fid => fid.toString() === id.toString())
          ).length;
        } else {
          embeddedArrayCount = c.enrolledStudents.length;
        }
      }
      
      const enrolledCount = Math.max(enrollmentDocsCount, embeddedArrayCount);

      return {
        _id: c._id,
        title: c.title,
        description: c.description,
        instructorName: c.instructor?.name || 'Unassigned',
        price: c.price || 2500,
        enrolledCount,
        cardImage: c.cardImage || '',
        banner: c.banner || ''
      };
    }));

    topCourses.sort((a, b) => b.enrolledCount - a.enrolledCount);

    // 4. Financial & Payment Analytics (scoped to filterType)
    const paymentQuery = { status: 'COMPLETED' };
    if (filterType) {
      paymentQuery.student = { $in: filteredStudentIds };
    }

    const payments = await Payment.find(paymentQuery)
      .populate('course', 'title price')
      .lean();

    const totalRevenue = payments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Revenue per course
    const courseRevenueMap = {};
    payments.forEach(p => {
      const courseTitle = p.course?.title || 'General Course';
      courseRevenueMap[courseTitle] = (courseRevenueMap[courseTitle] || 0) + (p.amount || 0);
    });

    const courseRevenueList = Object.keys(courseRevenueMap).map(title => ({
      title,
      revenue: courseRevenueMap[title]
    })).sort((a, b) => b.revenue - a.revenue);

    // 5. Weekly Student Registration Trend Data (Grouping by Weeks instead of Months)
    const allStudentsList = await User.find({ role: 'student' }).select('studentType createdAt').lean();
    
    const getWeekLabel = (d) => {
      const date = new Date(d);
      const day = date.getDate();
      const month = date.toLocaleString('en-US', { month: 'short' });
      const weekNum = Math.ceil(day / 7);
      return `Wk ${weekNum} (${month})`;
    };

    const weeklyStudentMap = {};
    allStudentsList.forEach(s => {
      const weekLabel = getWeekLabel(s.createdAt);
      if (!weeklyStudentMap[weekLabel]) {
        weeklyStudentMap[weekLabel] = { week: weekLabel, online: 0, physical: 0, total: 0 };
      }
      if (s.studentType === 'online') {
        weeklyStudentMap[weekLabel].online += 1;
      } else {
        weeklyStudentMap[weekLabel].physical += 1;
      }
      weeklyStudentMap[weekLabel].total += 1;
    });

    const weeklyStudentTrend = Object.values(weeklyStudentMap);

    // 6. Platform Attendance Analytics (scoped to filterType)
    const attendanceQuery = filterType ? { studentId: { $in: filteredStudentIds } } : {};
    const totalAttendanceRecords = await Attendance.countDocuments(attendanceQuery);
    const presentRecords = await Attendance.countDocuments({ ...attendanceQuery, status: 'Present' });
    const absentRecords = await Attendance.countDocuments({ ...attendanceQuery, status: 'Absent' });
    const lateRecords = await Attendance.countDocuments({ ...attendanceQuery, status: 'Late' });

    const attendanceRate = totalAttendanceRecords > 0 
      ? Math.round((presentRecords / totalAttendanceRecords) * 100) 
      : 100;

    res.json({
      success: true,
      studentTypeFilter: filterType || 'all',
      metrics: {
        totalStudents,
        onlineStudents,
        physicalStudents,
        totalTeachers,
        totalAdmins,
        totalCourses: courses.length,
        totalRevenue,
        totalPaymentsCount: payments.length,
        attendanceRate,
        attendanceBreakdown: {
          total: totalAttendanceRecords,
          present: presentRecords,
          absent: absentRecords,
          late: lateRecords
        }
      },
      gradeDistribution,
      topCourses,
      courseRevenueList,
      weeklyStudentTrend
    });

  } catch (err) {
    console.error("Fetch Analytics Error:", err);
    res.status(500).json({ message: "Failed to fetch analytics data: " + err.message });
  }
});

module.exports = router;
