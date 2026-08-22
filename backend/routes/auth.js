const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const VerificationCode = require('../models/VerificationCode');
const { protect, isAdmin, isTeacherOrAdmin } = require('../middleware/authMiddleware');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Schedule = require('../models/Schedule');
const Notification = require('../models/Notification');
const ReadingProgress = require('../models/ReadingProgress');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Lesson = require('../models/Lesson');
const Review = require('../models/Review');
const { OAuth2Client } = require('google-auth-library');
const crypto = require('crypto');
const { sendResetPasswordEmail, sendRegistrationWelcomeEmail, sendPasscodeEmail } = require('../utils/emailService');
const {
  sendVerificationOTP,
  formatSriLankaPhone,
  maskPhoneNumber,
  sendCredentialSMS,
  sendParentCredentialSMS
} = require('../services/smsService');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper to parse time strings (24h '14:30' or 12h '02:30 PM') to minutes
const parseTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const clean = str.replace(/[ap]m/i, '').trim();
  const parts = clean.split(':').map(Number);
  let hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

// Helper to calculate total active schedule duration in hours per week
const calculateScheduleHours = (schedules) => {
  let totalMinutes = 0;
  (schedules || []).forEach(s => {
    if (s.startTime && s.endTime) {
      const startMin = parseTimeToMinutes(s.startTime);
      const endMin = parseTimeToMinutes(s.endTime);
      let diff = endMin - startMin;
      if (diff < 0) diff += 24 * 60;
      if (diff > 0 && diff <= 12 * 60) {
        totalMinutes += diff;
      }
    }
  });
  return parseFloat((totalMinutes / 60).toFixed(1));
};

// Helper to generate Online Student Registration Number (e.g. OL-G06-2012-4829)
const generateOnlineRegistrationNumber = async (grade, dateOfBirth) => {
  const digitsMatch = String(grade || '').match(/\d+/);
  const gradeNum = digitsMatch ? digitsMatch[0].padStart(2, '0') : '00';
  const birthYear = dateOfBirth ? new Date(dateOfBirth).getFullYear() : new Date().getFullYear();

  let isUnique = false;
  let regNo = '';
  let attempts = 0;

  while (!isUnique && attempts < 15) {
    attempts++;
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    regNo = `OL-G${gradeNum}-${birthYear}-${randomSeq}`;
    const existing = await User.findOne({ registrationNumber: regNo });
    if (!existing) {
      isUnique = true;
    }
  }
  return regNo;
};

// Helper to generate Physical Student Registration Number (e.g. REG-G06-2012-4829)
const generatePhysicalRegistrationNumber = async (grade, dateOfBirth) => {
  const digitsMatch = String(grade || '').match(/\d+/);
  const gradeNum = digitsMatch ? digitsMatch[0].padStart(2, '0') : '00';
  const birthYear = dateOfBirth ? new Date(dateOfBirth).getFullYear() : new Date().getFullYear();

  let isUnique = false;
  let regNo = '';
  let attempts = 0;

  while (!isUnique && attempts < 15) {
    attempts++;
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    regNo = `REG-G${gradeNum}-${birthYear}-${randomSeq}`;
    const existing = await User.findOne({ registrationNumber: regNo });
    if (!existing) {
      isUnique = true;
    }
  }
  return regNo;
};

// Helper to ensure parent account exists and links student without creating duplicate accounts
const ensureParentAccount = async (parentPhone, studentId, studentName = 'Student') => {
  if (!parentPhone || !parentPhone.trim()) return null;
  const cleanedPhone = parentPhone.trim();
  const digitsOnly = cleanedPhone.replace(/\D/g, '');
  const last9 = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : digitsOnly;

  try {
    // Search for existing parent by exact phone or by last 9 digits
    const searchConditions = [
      { phoneNumber: cleanedPhone },
      { parentsPhoneNumber: cleanedPhone }
    ];
    if (last9) {
      searchConditions.push({ phoneNumber: { $regex: last9 + '$' } });
      searchConditions.push({ parentsPhoneNumber: { $regex: last9 + '$' } });
    }

    let parent = await User.findOne({
      role: 'parent',
      $or: searchConditions
    });

    if (parent) {
      if (!parent.linkedStudents) parent.linkedStudents = [];
      const alreadyLinked = parent.linkedStudents.some(
        id => id && id.toString() === studentId.toString()
      );

      if (!alreadyLinked) {
        parent.linkedStudents.push(studentId);
        await parent.save();
        console.log(`🔗 Linked student ${studentName} (${studentId}) to existing parent ${parent.name} (${cleanedPhone})`);
      } else {
        console.log(`ℹ️ Student ${studentName} already linked to parent ${parent.name} (${cleanedPhone})`);
      }
      return { parent, isNew: false, phone: cleanedPhone };
    } else {
      const defaultPassword = 'Parent@123';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      const parentData = {
        name: `Parent of ${studentName}`,
        phoneNumber: cleanedPhone,
        parentsPhoneNumber: cleanedPhone,
        password: hashedPassword,
        role: 'parent',
        linkedStudents: [studentId],
        mustChangePassword: true,
        isPhoneVerified: true
      };

      parent = await User.create(parentData);
      console.log(`👨‍👩‍👧 Created new parent account for ${cleanedPhone} with default password (${defaultPassword})`);
      return { parent, isNew: true, defaultPassword, phone: cleanedPhone };
    }
  } catch (err) {
    console.error('Error in ensureParentAccount:', err.message);
    return null;
  }
};


// Helper function to convert base64 data URIs to static files in /uploads for super-fast image loading
const convertBase64ToStaticFile = (base64OrPath, prefix = 'img') => {
  if (!base64OrPath) return "";
  if (!base64OrPath.startsWith('data:')) {
    return base64OrPath;
  }
  try {
    const matches = base64OrPath.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return base64OrPath;

    const mimeType = matches[1];
    const base64Data = matches[2];
    let ext = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filename = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    return `/uploads/${filename}`;
  } catch (err) {
    console.error("Error converting base64 to static file:", err);
    return base64OrPath;
  }
};

// --- LOGIN ROUTE (STUDENTS & STAFF) ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const input = (email || req.body.identifier || req.body.registrationNumber || '').trim();

  if (!input || !password) {
    return res.status(400).json({ message: "Email or registration number and password are required" });
  }

  try {
    const safeRegex = new RegExp(`^${input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const user = await User.findOne({
      $or: [
        { email: input.toLowerCase() },
        { registrationNumber: safeRegex }
      ]
    });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials. Please check your email or registration number." });
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
        email: user.email || '',
        role: user.role,
        studentType: user.studentType || 'physical',
        grade: user.grade,
        registrationNumber: user.registrationNumber,
        parentsPhoneNumber: user.parentsPhoneNumber || '',
        phoneNumber: user.phoneNumber || '',
        dateOfBirth: user.dateOfBirth,
        nicNumber: user.nicNumber,
        mustChangePassword: user.mustChangePassword,
        isEmailVerified: !!user.isEmailVerified,
        isPhoneVerified: !!user.isPhoneVerified,
        profilePicture: user.profilePicture || ''
      }
    });

  } catch (err) {
    console.error("Login Error:", err);
    res.status(500).json({ message: "Server error during login." });
  }
});

// --- PARENT PORTAL LOGIN ROUTE ---
router.post('/parent-login', async (req, res) => {
  const { phoneNumber, phone, password } = req.body;
  const rawPhone = (phoneNumber || phone || req.body.identifier || '').trim();

  if (!rawPhone || !password) {
    return res.status(400).json({ message: "Parent mobile phone number and password are required." });
  }

  try {
    const formatted = formatSriLankaPhone(rawPhone);
    const cleanedDigits = rawPhone.replace(/\D/g, '');

    const parent = await User.findOne({
      role: 'parent',
      $or: [
        { phoneNumber: rawPhone },
        { parentsPhoneNumber: rawPhone },
        { phoneNumber: formatted },
        { parentsPhoneNumber: formatted },
        { phoneNumber: new RegExp(cleanedDigits.slice(-9) + '$') },
        { parentsPhoneNumber: new RegExp(cleanedDigits.slice(-9) + '$') }
      ]
    });

    if (!parent) {
      return res.status(400).json({ message: "No Parent Account found with this phone number. Please check the number or contact administration." });
    }

    const isMatch = await bcrypt.compare(password, parent.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect password. If this is your first login, use your default password (e.g. Parent@123)." });
    }

    const token = jwt.sign(
      { id: parent._id, role: parent.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: parent._id,
        name: parent.name,
        email: parent.email || '',
        phoneNumber: parent.phoneNumber || parent.parentsPhoneNumber || rawPhone,
        role: 'parent',
        mustChangePassword: !!parent.mustChangePassword,
        isPhoneVerified: true,
        linkedStudents: parent.linkedStudents || []
      }
    });
  } catch (err) {
    console.error("Parent Login Error:", err);
    res.status(500).json({ message: "Server error during parent login." });
  }
});

// --- STEP 1: INITIATE SELF-REGISTRATION (EMAIL OR PHONE) ---
router.post('/register-initiate', async (req, res) => {
  const {
    registrationType = 'email',
    email,
    phoneNumber,
    phone,
    name,
    password,
    grade,
    dateOfBirth,
    nicNumber,
    parentsPhoneNumber
  } = req.body;

  if (!grade) {
    return res.status(400).json({ message: "Please select your grade." });
  }

  if (!dateOfBirth) {
    return res.status(400).json({ message: "Date of Birth (Birthday) is required for student registration." });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long." });
  }

  const rawPhone = (phoneNumber || phone || '').trim();

  // Generate 6-digit random passcode
  const code = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    if (registrationType === 'email') {
      if (!email || !email.trim()) {
        return res.status(400).json({ message: "Email address is required for email registration." });
      }
      if (!parentsPhoneNumber || !parentsPhoneNumber.trim()) {
        return res.status(400).json({ message: "Parent's phone number is required." });
      }

      const normalizedEmail = email.trim().toLowerCase();
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists." });
      }

      // Remove old codes for this email
      await VerificationCode.deleteMany({ identifier: normalizedEmail, purpose: 'registration' });

      // Save verification code with payload
      await VerificationCode.create({
        identifier: normalizedEmail,
        code,
        purpose: 'registration',
        channel: 'email',
        payload: {
          registrationType: 'email',
          name: name ? name.trim() : '',
          email: normalizedEmail,
          password,
          grade: grade.trim(),
          parentsPhoneNumber: parentsPhoneNumber.trim(),
          dateOfBirth,
          nicNumber: nicNumber ? nicNumber.trim() : ''
        }
      });

      // Dispatch Email Passcode
      await sendPasscodeEmail(normalizedEmail, code, name || 'Student', 'Student Account Registration');

      return res.json({
        success: true,
        channel: 'email',
        identifier: normalizedEmail,
        message: `A 6-digit verification passcode has been sent to ${normalizedEmail}.`
      });

    } else {
      // Phone Number registration workflow
      if (!rawPhone) {
        return res.status(400).json({ message: "Phone number is required for mobile registration." });
      }

      // Remove old codes for this phone
      await VerificationCode.deleteMany({ identifier: rawPhone.toLowerCase(), purpose: 'registration' });

      // Save verification code with payload
      await VerificationCode.create({
        identifier: rawPhone.toLowerCase(),
        code,
        purpose: 'registration',
        channel: 'phone',
        payload: {
          registrationType: 'phone',
          name: name ? name.trim() : `Student ${rawPhone}`,
          phoneNumber: rawPhone,
          parentsPhoneNumber: rawPhone, // student phone is also considered parent's phone
          password,
          grade: grade.trim(),
          dateOfBirth,
          nicNumber: nicNumber ? nicNumber.trim() : ''
        }
      });

      // Dispatch SMS OTP (mocked with clear console logging)
      await sendVerificationOTP({
        phone: rawPhone,
        otpCode: code,
        purpose: 'Student Registration',
        studentName: name || 'Student'
      });

      return res.json({
        success: true,
        channel: 'phone',
        identifier: rawPhone,
        message: `A 6-digit verification OTP has been sent to ${rawPhone}.`
      });
    }

  } catch (err) {
    console.error("Register Initiate Error:", err);
    res.status(500).json({ message: "Failed to initiate registration verification." });
  }
});

// --- STEP 2: VERIFY CODE & COMPLETE SELF-REGISTRATION ---
router.post('/register-verify', async (req, res) => {
  const { identifier, code, createParentAccount = true } = req.body;

  if (!identifier || !code) {
    return res.status(400).json({ message: "Identifier and verification code are required." });
  }

  const cleanedId = identifier.trim().toLowerCase();
  const cleanedCode = code.trim();

  try {
    const record = await VerificationCode.findOne({
      identifier: cleanedId,
      code: cleanedCode,
      purpose: 'registration'
    });

    if (!record) {
      return res.status(400).json({ message: "Invalid or expired verification code. Please check or request a new code." });
    }

    const {
      registrationType,
      name,
      email,
      phoneNumber,
      password,
      grade,
      parentsPhoneNumber,
      dateOfBirth,
      nicNumber
    } = record.payload;

    // Check duplicate
    if (email) {
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists." });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Derive name if empty
    let finalName = name && name.trim() ? name.trim() : '';
    if (!finalName) {
      if (email) {
        const usernamePart = email.split('@')[0];
        finalName = usernamePart
          .split(/[\._\-]/)
          .map(part => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' ');
      } else {
        finalName = `Student ${phoneNumber || parentsPhoneNumber}`;
      }
    }

    // Auto-generate Online Registration Number
    const registrationNumber = await generateOnlineRegistrationNumber(grade, dateOfBirth);

    const studentDoc = {
      name: finalName,
      password: hashedPassword,
      grade: grade.trim(),
      parentsPhoneNumber: parentsPhoneNumber ? parentsPhoneNumber.trim() : (phoneNumber ? phoneNumber.trim() : ''),
      dateOfBirth: new Date(dateOfBirth),
      nicNumber: nicNumber ? nicNumber.trim() : '',
      registrationNumber,
      role: 'student',
      studentType: 'online',
      mustChangePassword: false,
      isEmailVerified: registrationType === 'email',
      isPhoneVerified: registrationType === 'phone'
    };

    if (email && email.trim()) {
      studentDoc.email = email.trim().toLowerCase();
    }
    if (phoneNumber && phoneNumber.trim()) {
      studentDoc.phoneNumber = phoneNumber.trim();
    }

    const newUser = await User.create(studentDoc);

    // Delete used verification code
    await VerificationCode.findByIdAndDelete(record._id);

    // Conditionally Link / Create Parent Account based on user confirmation
    const parentPhone = newUser.parentsPhoneNumber;
    if (createParentAccount && parentPhone) {
      const parentResult = await ensureParentAccount(parentPhone, newUser._id, newUser.name);
      // Scenario 2: Send credentials SMS if a brand-new parent account was created
      if (parentResult && parentResult.isNew) {
        sendParentCredentialSMS({
          parentPhone,
          studentName: newUser.name,
          defaultPassword: parentResult.defaultPassword || 'Parent@123'
        }).catch(smsErr => console.error('Parent Credential SMS error:', smsErr));
      }
    }

    // --- TRIGGER NOTIFICATIONS ---
    try {
      // 1. In-App Notification for Admins
      await Notification.create({
        recipientRole: 'admin',
        type: 'REGISTRATION',
        title: 'New Student Registration',
        message: `${newUser.name} (${newUser.registrationNumber}, ${newUser.grade}) has registered as an online student.`,
        link: '/manage-users',
        metadata: { studentId: newUser._id }
      });

      // 2. Welcome Email to Student if email provided
      if (newUser.email) {
        sendRegistrationWelcomeEmail(newUser.email, newUser.name, newUser.registrationNumber);
      }
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
      message: `Registration successful! Your Online Registration ID is ${newUser.registrationNumber}`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email || '',
        role: newUser.role,
        studentType: newUser.studentType,
        grade: newUser.grade,
        registrationNumber: newUser.registrationNumber,
        parentsPhoneNumber: newUser.parentsPhoneNumber || '',
        phoneNumber: newUser.phoneNumber || '',
        dateOfBirth: newUser.dateOfBirth,
        nicNumber: newUser.nicNumber,
        mustChangePassword: newUser.mustChangePassword,
        isEmailVerified: !!newUser.isEmailVerified,
        isPhoneVerified: !!newUser.isPhoneVerified,
        profilePicture: newUser.profilePicture || ''
      }
    });

  } catch (err) {
    console.error("Register Verify Error:", err);
    res.status(500).json({ message: "Server error completing registration." });
  }
});


// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
  const { email, password, grade, parentsPhoneNumber, dateOfBirth, nicNumber, name, role = 'student', childRegNo } = req.body;

  if (role === 'parent') {
    if (!email || !password || (!parentsPhoneNumber && !req.body.phone)) {
      return res.status(400).json({ message: "Email, password, and mobile phone number are required for parent registration." });
    }
    const parentPhone = (parentsPhoneNumber || req.body.phone || '').trim();
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists." });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const phoneOrReg = [];
      if (parentPhone) phoneOrReg.push({ parentsPhoneNumber: parentPhone });
      if (childRegNo && childRegNo.trim()) phoneOrReg.push({ registrationNumber: new RegExp(`^${childRegNo.trim()}$`, 'i') });

      const matchingStudents = phoneOrReg.length > 0 ? await User.find({ role: 'student', $or: phoneOrReg }) : [];
      const linkedStudentIds = matchingStudents.map(s => s._id);

      const newParent = await User.create({
        name: name && name.trim() ? name.trim() : 'Parent User',
        email: normalizedEmail,
        password: hashedPassword,
        phoneNumber: parentPhone,
        parentsPhoneNumber: parentPhone,
        role: 'parent',
        linkedStudents: linkedStudentIds,
        mustChangePassword: false
      });

      const token = jwt.sign(
        { id: newParent._id, role: newParent.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      return res.status(201).json({
        token,
        message: `Parent account created successfully! ${linkedStudentIds.length} child(ren) linked.`,
        user: {
          id: newParent._id,
          name: newParent.name,
          email: newParent.email,
          role: newParent.role,
          phoneNumber: newParent.phoneNumber,
          linkedStudentsCount: linkedStudentIds.length
        }
      });
    } catch (err) {
      console.error("Parent Register Error:", err);
      return res.status(500).json({ message: "Server error during parent registration." });
    }
  }

  if (!email || !password || !grade || !parentsPhoneNumber) {
    return res.status(400).json({ message: "Email, password, grade, and parent's phone number are required." });
  }

  if (!dateOfBirth) {
    return res.status(400).json({ message: "Date of Birth (Birthday) is required for student registration." });
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

    // Derive name from email if not provided (e.g. format "john.doe" to "John Doe")
    const usernamePart = normalizedEmail.split('@')[0];
    const derivedName = usernamePart
      .split(/[\._\-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    const registrationNumber = await generateOnlineRegistrationNumber(grade, dateOfBirth);

    const newUser = await User.create({
      name: name && name.trim() ? name.trim() : derivedName,
      email: normalizedEmail,
      password: hashedPassword,
      grade: grade.trim(),
      parentsPhoneNumber: parentsPhoneNumber.trim(),
      dateOfBirth: new Date(dateOfBirth),
      nicNumber: nicNumber ? nicNumber.trim() : '',
      registrationNumber,
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
        message: `${newUser.name} (${newUser.registrationNumber}, ${newUser.grade}) has registered as an online student.`,
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
        dateOfBirth: newUser.dateOfBirth,
        nicNumber: newUser.nicNumber,
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
  const { credential, grade, parentsPhoneNumber, dateOfBirth, nicNumber } = req.body;

  if (!credential || !grade || !parentsPhoneNumber) {
    return res.status(400).json({ message: "Google credential, grade, and parent's phone number are required." });
  }

  if (!dateOfBirth) {
    return res.status(400).json({ message: "Date of Birth (Birthday) is required for student registration." });
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

    const registrationNumber = await generateOnlineRegistrationNumber(grade, dateOfBirth);

    const newUser = await User.create({
      name: payload.name || email.split('@')[0],
      email: email,
      password: hashedPassword,
      grade: grade.trim(),
      parentsPhoneNumber: parentsPhoneNumber.trim(),
      dateOfBirth: new Date(dateOfBirth),
      nicNumber: nicNumber ? nicNumber.trim() : '',
      registrationNumber,
      role: 'student',
      studentType: 'online',
      profilePicture: payload.picture || '',
      mustChangePassword: false
    });

    // --- TRIGGER NOTIFICATIONS ---
    try {
      // 1. In-App Notification for Admins
      await Notification.create({
        recipientRole: 'admin',
        type: 'REGISTRATION',
        title: 'New Google Student Registration',
        message: `${newUser.name} (${newUser.email}, ${newUser.grade}) has registered via Google.`,
        link: '/manage-users',
        metadata: { studentId: newUser._id }
      });

      // 2. Welcome Email to Student
      sendRegistrationWelcomeEmail(newUser.email, newUser.name, newUser.registrationNumber);
    } catch (notifErr) {
      console.error('Google Registration notification error:', notifErr.message);
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

// --- FORGOT PASSWORD INITIATE (EMAIL / REG NO / PHONE) ---
router.post('/forgot-password-initiate', async (req, res) => {
  const { identifier } = req.body;
  const input = (identifier || req.body.email || '').trim();

  if (!input) {
    return res.status(400).json({ message: "Email, registration number, or phone number is required." });
  }

  try {
    const safeRegex = new RegExp(`^${input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
    const cleanedDigits = input.replace(/\D/g, '');

    // Search user by email, registrationNumber, or phone
    const user = await User.findOne({
      $or: [
        { email: input.toLowerCase() },
        { registrationNumber: safeRegex },
        { phoneNumber: input },
        { parentsPhoneNumber: input },
        ...(cleanedDigits.length >= 9 ? [
          { phoneNumber: new RegExp(cleanedDigits.slice(-9) + '$') },
          { parentsPhoneNumber: new RegExp(cleanedDigits.slice(-9) + '$') }
        ] : [])
      ]
    });

    if (!user) {
      return res.status(404).json({ message: "No account found matching this identifier. Please verify your details." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Priority: If user has an email, send passcode to email. If only phone number exists, send SMS OTP.
    if (user.email && user.email.trim()) {
      const email = user.email.trim().toLowerCase();
      await VerificationCode.deleteMany({ identifier: email, purpose: 'forgot_password' });

      await VerificationCode.create({
        identifier: email,
        code,
        purpose: 'forgot_password',
        channel: 'email',
        payload: { userId: user._id, email }
      });

      await sendPasscodeEmail(email, code, user.name, 'Password Reset');

      // Mask email for UI display (e.g., k***@gmail.com)
      const [userPart, domainPart] = email.split('@');
      const maskedUser = userPart.length > 2 ? `${userPart[0]}***${userPart.slice(-1)}` : `${userPart[0]}***`;
      const maskedEmail = `${maskedUser}@${domainPart}`;

      return res.json({
        success: true,
        channel: 'email',
        identifier: email,
        maskedDestination: maskedEmail,
        message: `A 6-digit password reset passcode has been sent to ${maskedEmail}.`
      });

    } else {
      const phone = user.phoneNumber || user.parentsPhoneNumber;
      if (!phone) {
        return res.status(400).json({ message: "This account has no contact credentials linked. Please contact administration." });
      }

      await VerificationCode.deleteMany({ identifier: phone.toLowerCase(), purpose: 'forgot_password' });

      await VerificationCode.create({
        identifier: phone.toLowerCase(),
        code,
        purpose: 'forgot_password',
        channel: 'phone',
        payload: { userId: user._id, phone }
      });

      await sendVerificationOTP({
        phone,
        otpCode: code,
        purpose: 'Password Reset',
        studentName: user.name
      });

      const maskedPhone = maskPhoneNumber(phone);

      return res.json({
        success: true,
        channel: 'phone',
        identifier: phone,
        maskedDestination: maskedPhone,
        message: `A 6-digit password reset OTP has been sent to ${maskedPhone}.`
      });
    }

  } catch (err) {
    console.error("Forgot Password Initiate Error:", err);
    res.status(500).json({ message: "Server error initiating password reset." });
  }
});

// --- FORGOT PASSWORD VERIFY & RESET ---
router.post('/forgot-password-verify-reset', async (req, res) => {
  const { identifier, code, newPassword } = req.body;

  if (!identifier || !code || !newPassword) {
    return res.status(400).json({ message: "Identifier, verification code, and new password are required." });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: "New password must be at least 6 characters long." });
  }

  const cleanedId = identifier.trim().toLowerCase();
  const cleanedCode = code.trim();

  try {
    const record = await VerificationCode.findOne({
      identifier: cleanedId,
      code: cleanedCode,
      purpose: 'forgot_password'
    });

    if (!record) {
      return res.status(400).json({ message: "Invalid or expired reset code. Please request a new code." });
    }

    const userId = record.payload?.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.mustChangePassword = false;
    user.resetPasswordToken = '';
    user.resetPasswordExpires = undefined;
    await user.save();

    // Remove verification code
    await VerificationCode.findByIdAndDelete(record._id);

    res.json({
      success: true,
      message: "Password reset successful! You can now log in with your new password."
    });

  } catch (err) {
    console.error("Forgot Password Verify Reset Error:", err);
    res.status(500).json({ message: "Server error resetting password." });
  }
});

// --- LEGACY FORGOT PASSWORD ROUTE (FOR EMAIL LINKS) ---
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

// --- LEGACY RESET PASSWORD ROUTE ---
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

// --- ADD & VERIFY EMAIL: STEP 1 (INITIATE) ---
router.post('/add-email-initiate', protect, async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ message: "Email address is required." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Check if email already belongs to another user
    const existing = await User.findOne({
      email: normalizedEmail,
      _id: { $ne: req.user._id }
    });

    if (existing) {
      return res.status(400).json({ message: "This email address is already linked to another account." });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await VerificationCode.deleteMany({ identifier: normalizedEmail, purpose: 'add_email' });

    await VerificationCode.create({
      identifier: normalizedEmail,
      code,
      purpose: 'add_email',
      channel: 'email',
      payload: { userId: req.user._id, email: normalizedEmail }
    });

    await sendPasscodeEmail(normalizedEmail, code, req.user.name, 'Email Verification');

    res.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${normalizedEmail}.`
    });

  } catch (err) {
    console.error("Add Email Initiate Error:", err);
    res.status(500).json({ message: "Server error sending email verification code." });
  }
});

// --- ADD & VERIFY EMAIL: STEP 2 (VERIFY) ---
router.post('/add-email-verify', protect, async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and verification code are required." });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const cleanedCode = code.trim();

  try {
    const record = await VerificationCode.findOne({
      identifier: normalizedEmail,
      code: cleanedCode,
      purpose: 'add_email'
    });

    if (!record) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    user.email = normalizedEmail;
    user.isEmailVerified = true;
    await user.save();

    await VerificationCode.findByIdAndDelete(record._id);

    res.json({
      success: true,
      message: "Email address added and verified successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentType: user.studentType || 'physical',
        grade: user.grade,
        registrationNumber: user.registrationNumber,
        parentsPhoneNumber: user.parentsPhoneNumber || '',
        phoneNumber: user.phoneNumber || '',
        isEmailVerified: true,
        isPhoneVerified: !!user.isPhoneVerified,
        profilePicture: user.profilePicture || ''
      }
    });

  } catch (err) {
    console.error("Add Email Verify Error:", err);
    res.status(500).json({ message: "Server error verifying email." });
  }
});

// --- UPDATE PROFILE ROUTE (Name and/or Password) ---
router.put('/update-profile', protect, async (req, res) => {
  const { name, newPassword, profilePicture, coverPicture, bio, qualifications, department, phoneNumber } = req.body;

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
      user.profilePicture = profilePicture;
    }

    if (coverPicture !== undefined) user.coverPicture = coverPicture;
    if (bio !== undefined) user.bio = bio;
    if (qualifications !== undefined) user.qualifications = qualifications;
    if (department !== undefined) user.department = department;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    await user.save();

    res.json({
      message: "Profile updated successfully!",
      user: {
        id: user._id,
        name: user.name,
        email: user.email || '',
        role: user.role,
        studentType: user.studentType || 'physical',
        grade: user.grade,
        registrationNumber: user.registrationNumber,
        parentsPhoneNumber: user.parentsPhoneNumber || '',
        phoneNumber: user.phoneNumber || '',
        mustChangePassword: user.mustChangePassword,
        isEmailVerified: !!user.isEmailVerified,
        isPhoneVerified: !!user.isPhoneVerified,
        profilePicture: user.profilePicture || '',
        coverPicture: user.coverPicture || '',
        bio: user.bio || '',
        qualifications: user.qualifications || '',
        department: user.department || 'Academic Faculty'
      }
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- GET CURRENT USER (/me) ---
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email || '',
      role: user.role,
      studentType: user.studentType || 'physical',
      grade: user.grade,
      registrationNumber: user.registrationNumber,
      parentsPhoneNumber: user.parentsPhoneNumber || '',
      phoneNumber: user.phoneNumber || '',
      mustChangePassword: !!user.mustChangePassword,
      isEmailVerified: !!user.isEmailVerified,
      isPhoneVerified: !!user.isPhoneVerified,
      profilePicture: user.profilePicture || '',
      coverPicture: user.coverPicture || '',
      bio: user.bio || '',
      qualifications: user.qualifications || '',
      department: user.department || 'Academic Faculty',
      linkedStudents: user.linkedStudents || []
    });
  } catch (err) {
    console.error("Get Me Error:", err);
    res.status(500).json({ message: "Server error fetching user details" });
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
  if (req.user.role !== 'admin' && req.user.role !== 'counter_staff') {
    return res.status(403).json({ message: "Access Denied: Admins and Staff only." });
  }

  try {
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// 3. CREATE USER (ADMIN MANUAL REGISTRATION)
router.post('/users', protect, isAdmin, async (req, res) => {
  const {
    name,
    email,
    registrationNumber,
    parentsPhoneNumber,
    temporaryPassword,
    role = 'student',
    grade,
    studentType = 'physical',
    dateOfBirth,
    nicNumber,
    createParentAccount = true
  } = req.body;

  const normalizedName = name?.trim();
  const normalizedEmail = email?.trim() ? email.trim().toLowerCase() : undefined;
  let normalizedRegistrationNumber = registrationNumber?.trim() || undefined;
  const allowedRoles = ['student', 'teacher', 'admin', 'counter_staff', 'parent'];
  const normalizedGrade = grade !== undefined ? String(grade).trim() : undefined;

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid user role." });
  }

  if (!normalizedName || !temporaryPassword) {
    return res.status(400).json({ message: "Name and temporary password are required." });
  }

  if (role !== 'student' && !normalizedEmail) {
    return res.status(400).json({ message: "Email is required for staff, teachers, and admins." });
  }

  if (role === 'student') {
    if (!parentsPhoneNumber || !parentsPhoneNumber.trim()) {
      return res.status(400).json({ message: "Parent's phone number is required for students." });
    }
    if (!normalizedGrade) {
      return res.status(400).json({ message: "A valid student grade is required." });
    }

    // Auto-generate Registration Number if not provided by admin
    if (!normalizedRegistrationNumber) {
      if (studentType === 'online') {
        normalizedRegistrationNumber = await generateOnlineRegistrationNumber(normalizedGrade, dateOfBirth);
      } else {
        normalizedRegistrationNumber = await generatePhysicalRegistrationNumber(normalizedGrade, dateOfBirth);
      }
    }
  }

  try {
    const duplicateChecks = [];
    if (normalizedEmail) duplicateChecks.push({ email: normalizedEmail });
    if (normalizedRegistrationNumber) duplicateChecks.push({ registrationNumber: normalizedRegistrationNumber });

    if (duplicateChecks.length > 0) {
      const existingUser = await User.findOne({ $or: duplicateChecks });
      if (existingUser) {
        return res.status(400).json({
          message: existingUser.email === normalizedEmail
            ? "User with this email already exists."
            : "User with this registration number already exists."
        });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(temporaryPassword, salt);

    // Admin created users are automatically verified (no OTP needed)
    const userDoc = {
      name: normalizedName,
      registrationNumber: normalizedRegistrationNumber,
      parentsPhoneNumber: role === 'student' ? parentsPhoneNumber.trim() : undefined,
      grade: role === 'student' ? normalizedGrade : undefined,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      nicNumber: nicNumber ? nicNumber.trim() : '',
      password: hashedPassword,
      role,
      studentType: role === 'student' ? (studentType || 'physical') : undefined,
      mustChangePassword: true,
      isEmailVerified: !!normalizedEmail,
      isPhoneVerified: true
    };

    if (normalizedEmail) {
      userDoc.email = normalizedEmail;
    }

    const user = await User.create(userDoc);

    const createdUser = await User.findById(user._id).select('-password');

    // Conditionally Link or Create Parent Account for student if requested
    let parentResult = null;
    if (role === 'student' && user.parentsPhoneNumber && createParentAccount) {
      parentResult = await ensureParentAccount(user.parentsPhoneNumber, user._id, user.name);
    }

    // --- TRIGGER NOTIFICATIONS & CREDENTIAL SMS ---
    try {
      if (role === 'student') {
        if (user.email) {
          sendRegistrationWelcomeEmail(user.email, user.name, user.registrationNumber);
        }

        await Notification.create({
          recipient: user._id,
          type: 'REGISTRATION',
          title: 'Account Created',
          message: `Welcome to LuminaLearn, ${user.name}! Your student account (${user.registrationNumber}) has been created by Administration.`,
          link: '/settings'
        });

        // Scenario 1: Send Student Credential SMS
        const studentPhone = user.phoneNumber || user.parentsPhoneNumber;
        if (studentPhone) {
          sendCredentialSMS({
            phone: studentPhone,
            name: user.name,
            loginIdentifier: user.registrationNumber || user.email || studentPhone,
            password: temporaryPassword,
            role: 'student'
          }).catch(smsErr => console.error('Student Credential SMS Error:', smsErr));
        }

        // Scenario 1: Send Parent Credential SMS if new parent account was generated
        if (parentResult && parentResult.isNew && user.parentsPhoneNumber) {
          sendParentCredentialSMS({
            parentPhone: user.parentsPhoneNumber,
            studentName: user.name,
            defaultPassword: parentResult.defaultPassword || 'Parent@123'
          }).catch(smsErr => console.error('Parent Credential SMS Error:', smsErr));
        }
      } else if (role === 'parent') {
        // Scenario 1: Parent created directly by admin
        const parentPhone = user.phoneNumber || user.parentsPhoneNumber;
        if (parentPhone) {
          sendCredentialSMS({
            phone: parentPhone,
            name: user.name,
            loginIdentifier: user.email || parentPhone,
            password: temporaryPassword,
            role: 'parent'
          }).catch(smsErr => console.error('Parent Credential SMS Error:', smsErr));
        }
      } else {
        // Staff, Teacher, Admin created by admin
        if (user.phoneNumber) {
          sendCredentialSMS({
            phone: user.phoneNumber,
            name: user.name,
            loginIdentifier: user.email || user.phoneNumber,
            password: temporaryPassword,
            role: user.role
          }).catch(smsErr => console.error('Staff Credential SMS Error:', smsErr));
        }
      }
    } catch (notifErr) {
      console.error('Admin create user notification error:', notifErr.message);
    }

    res.status(201).json({
      message: "User created successfully. Temporary password assigned.",
      user: createdUser
    });
  } catch (err) {
    console.error("Create User Error:", err);
    res.status(500).json({ message: "Failed to create user." });
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

    const recentRegistrations = await User.find({ role: 'student' })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('name email grade studentType createdAt');

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
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

    const [payments, allEnrollments, todayArrivalsCount] = await Promise.all([
      Payment.find({ status: 'COMPLETED' }).select('amount').lean(),
      Enrollment.find().select('course').populate('course', 'price').lean(),
      Attendance.countDocuments({ date: { $gte: startOfToday }, status: 'Present' })
    ]);

    const totalCollected = payments.reduce((acc, p) => acc + (p.amount || 0), 0);
    let totalExpected = 0;
    allEnrollments.forEach(e => {
      totalExpected += (e.course?.price || 2500);
    });

    const pendingDues = Math.max(0, totalExpected - totalCollected);

    res.json({
      students: totalStudents,
      physicalStudents,
      onlineStudents,
      teachers: totalTeachers,
      courses: totalCourses,
      recentRegistrations,
      growthData,
      totalCollected,
      pendingDues,
      todayArrivalsCount
    });
  } catch (err) {
    console.error("Error fetching admin stats:", err);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// --- GET TEACHER PROFILE PUBLIC/AUTH INFO ---
router.get('/teacher-profile/:id', protect, async (req, res) => {
  try {
    const [teacher, courses] = await Promise.all([
      User.findById(req.params.id).select('-password').lean(),
      Course.find({ instructor: req.params.id })
        .populate('instructor', 'name profilePicture')
        .lean()
    ]);

    if (!teacher) {
      return res.status(404).json({ message: 'Teacher profile not found.' });
    }

    let totalStudentsCount = 0;
    const processedCourses = courses.map(c => {
      if (Array.isArray(c.enrolledStudents)) {
        totalStudentsCount += c.enrolledStudents.length;
      }
      let banner = c.banner || '';
      let cardImage = c.cardImage || '';
      if (banner && !banner.startsWith('http') && !banner.startsWith('data:')) {
        const filename = banner.includes('/uploads/') ? banner.split('/uploads/').pop() : banner.replace(/^\//, '');
        banner = `/uploads/${filename}`;
      }
      if (cardImage && !cardImage.startsWith('http') && !cardImage.startsWith('data:')) {
        const filename = cardImage.includes('/uploads/') ? cardImage.split('/uploads/').pop() : cardImage.replace(/^\//, '');
        cardImage = `/uploads/${filename}`;
      }
      return {
        ...c,
        banner,
        cardImage
      };
    });

    let profilePicture = teacher.profilePicture || '';
    if (profilePicture && !profilePicture.startsWith('http') && !profilePicture.startsWith('data:')) {
      const filename = profilePicture.includes('/uploads/') ? profilePicture.split('/uploads/').pop() : profilePicture.replace(/^\//, '');
      profilePicture = `/uploads/${filename}`;
    }

    let coverPicture = teacher.coverPicture || '';
    if (coverPicture && !coverPicture.startsWith('http') && !coverPicture.startsWith('data:')) {
      const filename = coverPicture.includes('/uploads/') ? coverPicture.split('/uploads/').pop() : coverPicture.replace(/^\//, '');
      coverPicture = `/uploads/${filename}`;
    }

    res.json({
      success: true,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        profilePicture,
        coverPicture,
        bio: teacher.bio || '',
        qualifications: teacher.qualifications || '',
        department: teacher.department || 'Academic Faculty',
        phoneNumber: teacher.phoneNumber || '',
        teacherTags: teacher.teacherTags || ['🎓 Instructor', '✔ Verified Educator'],
        role: teacher.role,
        createdAt: teacher.createdAt
      },
      courses: processedCourses,
      totalStudentsCount,
      totalCoursesCount: courses.length
    });
  } catch (err) {
    console.error("Error fetching teacher profile:", err);
    res.status(500).json({ message: "Server error fetching teacher profile." });
  }
});

// --- UPDATE TEACHER TAGS (Teacher or Admin) ---
router.put('/teacher-tags/:id', protect, isTeacherOrAdmin, async (req, res) => {
  try {
    const { tags } = req.body;
    if (!Array.isArray(tags)) {
      return res.status(400).json({ message: "Tags array is required." });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { teacherTags: tags } },
      { new: true, runValidators: false }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "Teacher profile not found." });
    }

    res.json({
      success: true,
      message: "Teacher tags updated successfully!",
      teacherTags: updatedUser.teacherTags
    });
  } catch (err) {
    console.error("Error updating teacher tags:", err);
    res.status(500).json({ message: err.message || "Server error updating teacher tags." });
  }
});

// --- UPDATE TEACHER PROFILE (By Teacher or Admin) ---
router.put('/teacher-profile/:id', protect, async (req, res) => {
  try {
    const currentUserId = (req.user.id || req.user._id).toString();
    const targetId = req.params.id.toString();

    if (currentUserId !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Only the assigned teacher or Admin can edit this profile." });
    }

    const teacher = await User.findById(targetId);
    if (!teacher) {
      return res.status(404).json({ message: "Teacher not found." });
    }

    const { name, profilePicture, coverPicture, bio, qualifications, department, phoneNumber } = req.body;

    if (name) teacher.name = name;
    if (profilePicture !== undefined) {
      teacher.profilePicture = convertBase64ToStaticFile(profilePicture, 'profile');
    }
    if (coverPicture !== undefined) {
      teacher.coverPicture = convertBase64ToStaticFile(coverPicture, 'cover');
    }
    if (bio !== undefined) teacher.bio = bio;
    if (qualifications !== undefined) teacher.qualifications = qualifications;
    if (department !== undefined) teacher.department = department;
    if (phoneNumber !== undefined) teacher.phoneNumber = phoneNumber;

    await teacher.save();

    let formattedProfilePic = teacher.profilePicture || '';
    if (formattedProfilePic && !formattedProfilePic.startsWith('http') && !formattedProfilePic.startsWith('data:')) {
      const filename = formattedProfilePic.includes('/uploads/') ? formattedProfilePic.split('/uploads/').pop() : formattedProfilePic.replace(/^\//, '');
      formattedProfilePic = `/uploads/${filename}`;
    }

    let formattedCoverPic = teacher.coverPicture || '';
    if (formattedCoverPic && !formattedCoverPic.startsWith('http') && !formattedCoverPic.startsWith('data:')) {
      const filename = formattedCoverPic.includes('/uploads/') ? formattedCoverPic.split('/uploads/').pop() : formattedCoverPic.replace(/^\//, '');
      formattedCoverPic = `/uploads/${filename}`;
    }

    res.json({
      success: true,
      message: "Teacher profile updated successfully!",
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email,
        profilePicture: formattedProfilePic,
        coverPicture: formattedCoverPic,
        bio: teacher.bio || '',
        qualifications: teacher.qualifications || '',
        department: teacher.department || 'Academic Faculty',
        phoneNumber: teacher.phoneNumber || '',
        role: teacher.role,
        createdAt: teacher.createdAt
      }
    });
  } catch (err) {
    console.error("Error updating teacher profile:", err);
    res.status(500).json({ message: "Server error updating teacher profile." });
  }
});

// --- GET TEACHER DASHBOARD STATS ---
router.get('/teacher-stats', protect, async (req, res) => {
  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Teacher access required" });
  }

  try {
    const teacherId = req.user.id || req.user._id;

    const teacherCourses = await Course.find({ instructor: teacherId }).lean();
    const courseIds = teacherCourses.map(c => c._id);

    const enrollments = await Enrollment.find({ course: { $in: courseIds } })
      .populate('student', 'name email registrationNumber grade studentType profilePicture')
      .lean();

    const studentMap = {};
    enrollments.forEach(e => {
      if (e.student && e.student._id) {
        studentMap[e.student._id.toString()] = e.student;
      }
    });

    for (const c of teacherCourses) {
      if (Array.isArray(c.enrolledStudents) && c.enrolledStudents.length > 0) {
        const embeddedStudents = await User.find({ _id: { $in: c.enrolledStudents }, role: 'student' })
          .select('name email registrationNumber grade studentType profilePicture')
          .lean();
        embeddedStudents.forEach(s => {
          studentMap[s._id.toString()] = s;
        });
      }
    }

    const uniqueStudents = Object.values(studentMap);

    const enrollmentCountsByCourse = {};
    enrollments.forEach(e => {
      const cId = e.course ? e.course.toString() : null;
      if (cId) {
        enrollmentCountsByCourse[cId] = (enrollmentCountsByCourse[cId] || 0) + 1;
      }
    });

    // Real Teacher Ratings & Reviews from Review model
    const reviews = await Review.find({
      $or: [
        { teacher: teacherId },
        { course: { $in: courseIds } }
      ]
    })
      .populate('student', 'name profilePicture grade')
      .populate('course', 'title cardImage')
      .sort({ createdAt: -1 })
      .lean();

    const totalReviewCount = reviews.length;
    const totalRatingSum = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    const avgRating = totalReviewCount > 0 ? (totalRatingSum / totalReviewCount).toFixed(1) : "0.0";

    const ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
      if (ratingBreakdown[r.rating] !== undefined) {
        ratingBreakdown[r.rating]++;
      }
    });

    // Pending assignment grading queue for this teacher's courses
    const [pendingGradingCount, totalGradedCount, teacherQuizzes, totalAssignments] = await Promise.all([
      AssignmentSubmission.countDocuments({ course: { $in: courseIds }, status: 'submitted' }),
      AssignmentSubmission.countDocuments({ course: { $in: courseIds }, status: 'graded' }),
      Quiz.find({ course: { $in: courseIds } }).select('_id title course').lean(),
      Assignment.countDocuments({ course: { $in: courseIds }, isActive: true })
    ]);

    const teacherQuizIds = teacherQuizzes.map(q => q._id);
    const totalQuizSubmissions = teacherQuizIds.length > 0 
      ? await QuizSubmission.countDocuments({ quiz: { $in: teacherQuizIds } }) 
      : 0;

    const coursesList = teacherCourses.map(c => {
      const cIdStr = c._id.toString();
      const countDoc = enrollmentCountsByCourse[cIdStr] || 0;
      const countEmb = Array.isArray(c.enrolledStudents) ? c.enrolledStudents.length : 0;
      const courseReviews = reviews.filter(r => r.course && (r.course._id?.toString() === cIdStr || r.course.toString() === cIdStr));
      const cRatingSum = courseReviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      const cAvgRating = courseReviews.length > 0 ? (cRatingSum / courseReviews.length).toFixed(1) : "0.0";

      return {
        id: c._id,
        _id: c._id,
        title: c.title,
        description: c.description,
        price: c.price || 2500,
        cardImage: c.cardImage || '',
        enrolledCount: Math.max(countDoc, countEmb),
        rating: cAvgRating,
        reviewsCount: courseReviews.length
      };
    });

    const assignedSchedules = await Schedule.find({
      $or: [
        { teacherId: teacherId },
        { courseId: { $in: courseIds } }
      ]
    }).populate('teacherId', 'name').lean();

    res.json({
      coursesCount: teacherCourses.length,
      studentsCount: uniqueStudents.length,
      rating: avgRating,
      totalReviews: totalReviewCount,
      ratingBreakdown,
      recentReviews: reviews.slice(0, 8),
      coursesList,
      studentsList: uniqueStudents,
      assignedSchedules,
      gradingQueue: {
        pendingCount: pendingGradingCount,
        gradedCount: totalGradedCount
      },
      academicStats: {
        totalAssignments,
        totalQuizzes: teacherQuizzes.length,
        totalQuizSubmissions
      }
    });
  } catch (err) {
    console.error("Error fetching teacher stats:", err);
    res.status(500).json({ message: "Error fetching teacher stats" });
  }
});

// --- GET STUDENT DASHBOARD STATS ---
router.get('/student-stats', protect, async (req, res) => {
  if (req.user.role !== 'student' && req.user.role !== 'admin') {
    return res.status(403).json({ message: "Forbidden: Student access required" });
  }

  try {
    const studentId = req.user.id || req.user._id;

    const enrollments = await Enrollment.find({ student: studentId })
      .populate({
        path: 'course',
        populate: { path: 'instructor', select: 'name email profilePicture' }
      })
      .lean();

    const directCourses = await Course.find({ enrolledStudents: studentId })
      .populate('instructor', 'name email profilePicture')
      .lean();

    const courseMap = {};
    directCourses.forEach(c => {
      courseMap[c._id.toString()] = {
        _id: c._id,
        id: c._id,
        title: c.title,
        description: c.description,
        instructorName: c.instructor?.name || 'Faculty Instructor',
        instructorId: c.instructor?._id || null,
        instructorPhoto: c.instructor?.profilePicture || '',
        price: c.price || 2500,
        cardImage: c.cardImage || '',
        banner: c.banner || '',
        progress: 0
      };
    });

    enrollments.forEach(e => {
      if (e.course) {
        courseMap[e.course._id.toString()] = {
          _id: e.course._id,
          id: e.course._id,
          title: e.course.title,
          description: e.course.description,
          instructorName: e.course.instructor?.name || 'Faculty Instructor',
          instructorId: e.course.instructor?._id || null,
          instructorPhoto: e.course.instructor?.profilePicture || '',
          price: e.course.price || 2500,
          cardImage: e.course.cardImage || '',
          banner: e.course.banner || '',
          progress: 0
        };
      }
    });

    const enrolledCoursesList = Object.values(courseMap);
    const enrolledCourseIds = enrolledCoursesList.map(c => c._id);

    // Dynamic Real Course Progress Calculation
    if (enrolledCourseIds.length > 0) {
      const [
        allLessons,
        allReadProgress,
        allCourseQuizzes,
        allQuizSubmissions,
        allCourseAssignments,
        allAssignmentSubmissions,
        allAttendances,
        allReviews
      ] = await Promise.all([
        Lesson.find({ course: { $in: enrolledCourseIds } }).lean(),
        ReadingProgress.find({ student: studentId, course: { $in: enrolledCourseIds } }).lean(),
        Quiz.find({ course: { $in: enrolledCourseIds }, isActive: true }).lean(),
        QuizSubmission.find({ student: studentId }).lean(),
        Assignment.find({ course: { $in: enrolledCourseIds }, isActive: true }).lean(),
        AssignmentSubmission.find({ student: studentId, course: { $in: enrolledCourseIds } }).lean(),
        Attendance.find({ studentId, courseId: { $in: enrolledCourseIds } }).lean(),
        Review.find({ student: studentId, course: { $in: enrolledCourseIds } }).lean()
      ]);

      // Calculate dynamic progress per course
      enrolledCoursesList.forEach(c => {
        const cIdStr = c._id.toString();
        const courseLessons = allLessons.filter(l => l.course && l.course.toString() === cIdStr);
        let totalPdfs = 0;
        courseLessons.forEach(l => {
          totalPdfs += (l.pdfMaterials?.length || 0);
        });

        const completedPdfs = allReadProgress.filter(p => p.course && p.course.toString() === cIdStr && p.isCompleted).length;
        const courseQuizzes = allCourseQuizzes.filter(q => q.course && q.course.toString() === cIdStr);
        const completedQuizzes = allQuizSubmissions.filter(qs => courseQuizzes.some(cq => cq._id.toString() === qs.quiz?.toString())).length;
        const courseAssignments = allCourseAssignments.filter(a => a.course && a.course.toString() === cIdStr);
        const submittedAssignments = allAssignmentSubmissions.filter(as => as.course && as.course.toString() === cIdStr).length;
        const attendedSessions = allAttendances.filter(at => at.courseId && at.courseId.toString() === cIdStr && at.status === 'Present').length;

        const totalItems = totalPdfs + courseQuizzes.length + courseAssignments.length + 4; // 4 weekly milestones per month
        const finishedItems = completedPdfs + completedQuizzes + submittedAssignments + Math.min(4, attendedSessions);

        const progressPercent = totalItems > 0 
          ? Math.min(100, Math.max(0, Math.round((finishedItems / totalItems) * 100))) 
          : (attendedSessions > 0 ? 35 : 15);

        c.progress = progressPercent;
        c.materialsCount = totalPdfs;
        c.completedMaterialsCount = completedPdfs;
        c.quizzesCount = courseQuizzes.length;
        c.completedQuizzesCount = completedQuizzes;
        c.assignmentsCount = courseAssignments.length;
        c.submittedAssignmentsCount = submittedAssignments;

        const userReview = allReviews.find(r => r.course && r.course.toString() === cIdStr);
        c.myRating = userReview ? userReview.rating : null;
        c.myReviewText = userReview ? userReview.review : '';
      });
    }

    // Student upcoming assignment deadlines
    const upcomingAssignments = await Assignment.find({
      course: { $in: enrolledCourseIds },
      isActive: true
    })
      .populate('course', 'title')
      .sort({ dueDate: 1 })
      .limit(6)
      .lean();

    const studentSubmissions = await AssignmentSubmission.find({
      student: studentId,
      assignment: { $in: upcomingAssignments.map(a => a._id) }
    }).lean();

    const subMap = {};
    studentSubmissions.forEach(s => { subMap[s.assignment.toString()] = s; });

    const upcomingTasks = upcomingAssignments.map(a => {
      const sub = subMap[a._id.toString()];
      return {
        _id: a._id,
        title: a.title,
        courseTitle: a.course?.title || 'Course',
        courseId: a.course?._id || a.course,
        dueDate: a.dueDate,
        maxMarks: a.maxMarks || 100,
        isSubmitted: !!sub,
        submissionStatus: sub?.status || 'pending',
        marks: sub?.marks ?? null,
        feedback: sub?.feedback || ''
      };
    });

    // Active Quizzes for student
    const activeQuizzesList = await Quiz.find({
      course: { $in: enrolledCourseIds },
      isActive: true
    })
      .populate('course', 'title')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const studentQuizSubmissions = await QuizSubmission.find({
      student: studentId,
      quiz: { $in: activeQuizzesList.map(q => q._id) }
    }).lean();

    const quizSubMap = {};
    studentQuizSubmissions.forEach(qs => { quizSubMap[qs.quiz.toString()] = qs; });

    const activeQuizzes = activeQuizzesList.map(q => {
      const qs = quizSubMap[q._id.toString()];
      return {
        _id: q._id,
        title: q.title,
        courseTitle: q.course?.title || 'Course',
        courseId: q.course?._id || q.course,
        grade: q.grade,
        totalQuestions: q.questions?.length || 0,
        isAttempted: !!qs,
        score: qs?.score,
        totalPoints: qs?.totalPoints
      };
    });

    const studentPayments = await Payment.find({ student: studentId })
      .populate('course', 'title price')
      .sort({ createdAt: -1 })
      .lean();

    const latestReceipt = studentPayments.length > 0 ? {
      receiptNo: `LL-${new Date(studentPayments[0].createdAt).getFullYear()}-${String(studentPayments[0]._id).slice(-4).toUpperCase()}`,
      amount: studentPayments[0].amount || 2500,
      date: studentPayments[0].createdAt,
      status: studentPayments[0].status || 'COMPLETED',
      paymentMethod: studentPayments[0].paymentMethod || 'Online Card Payment',
      courseTitle: studentPayments[0].course?.title || (enrolledCoursesList[0]?.title || 'Tuition Fee')
    } : null;

    const totalAttendance = await Attendance.countDocuments({ studentId });
    const presentCount = await Attendance.countDocuments({ studentId, status: 'Present' });
    const absentCount = await Attendance.countDocuments({ studentId, status: 'Absent' });
    const lateCount = await Attendance.countDocuments({ studentId, status: 'Late' });

    const attendanceRate = totalAttendance > 0
      ? Math.round((presentCount / totalAttendance) * 100)
      : 100;

    const announcements = await Notification.find({
      $or: [
        { recipient: studentId },
        { recipientRole: { $in: ['all', 'student'] } }
      ]
    }).sort({ createdAt: -1 }).limit(6).lean();

    res.json({
      coursesCount: enrolledCoursesList.length,
      grade: req.user.grade || 'Grade 10',
      studentType: req.user.studentType || 'physical',
      enrolledCoursesList,
      upcomingTasks,
      activeQuizzes,
      payments: studentPayments,
      latestReceipt,
      attendanceStats: {
        total: totalAttendance,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        percentage: attendanceRate
      },
      announcements
    });
  } catch (err) {
    console.error("Error fetching student stats:", err);
    res.status(500).json({ message: "Error fetching student stats" });
  }
});

// --- HELPER FOR STUDENT ANALYTICS PAYLOAD ---
const getStudentAnalyticsPayload = async (studentUser) => {
  const studentId = studentUser._id || studentUser.id;

  const enrollments = await Enrollment.find({ student: studentId }).populate({
    path: 'course',
    populate: { path: 'instructor', select: 'name email' }
  }).lean();

  const directCourses = await Course.find({ enrolledStudents: studentId })
    .populate('instructor', 'name email profilePicture')
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

  const totalAttendance = await Attendance.countDocuments({
    $or: [{ studentId }, { student: studentId }]
  });
  const presentRecords = await Attendance.countDocuments({
    $or: [{ studentId }, { student: studentId }],
    status: 'Present'
  });
  const absentRecords = await Attendance.countDocuments({
    $or: [{ studentId }, { student: studentId }],
    status: 'Absent'
  });
  const lateRecords = await Attendance.countDocuments({
    $or: [{ studentId }, { student: studentId }],
    status: 'Late'
  });

  const weeklyRecords = await Attendance.find({
    $or: [{ studentId }, { student: studentId }]
  }).lean();
  const weeklyAttendedCount = weeklyRecords.length;

  const activeMonthsList = ["July 2026", "August 2026", "September 2026", "October 2026"];
  const weeksPerCourse = activeMonthsList.length * 4;
  const totalAvailableWeeks = Math.max(16, (enrolledCoursesList.length || 1) * weeksPerCourse);

  let attendanceRate = 0;
  if (totalAvailableWeeks > 0 && weeklyAttendedCount > 0) {
    attendanceRate = Math.min(100, Math.round((weeklyAttendedCount / totalAvailableWeeks) * 100));
  } else if (totalAttendance > 0) {
    attendanceRate = Math.round((presentRecords / totalAttendance) * 100);
  } else {
    attendanceRate = 0;
  }

  const studentPayments = await Payment.find({ student: studentId, status: 'COMPLETED' })
    .populate('course', 'title price')
    .sort({ createdAt: -1 })
    .lean();

  const totalPaidAmount = studentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  // Student Quiz Performance Metrics
  const quizSubmissions = await QuizSubmission.find({ student: studentId })
    .populate({
      path: 'quiz',
      select: 'title grade month weekNumber passingPercentage course',
      populate: { path: 'course', select: 'title' }
    })
    .sort({ completedAt: -1 })
    .lean();

  const totalQuizzesAttempted = quizSubmissions.length;
  const avgQuizScorePercent = totalQuizzesAttempted > 0
    ? Math.round(quizSubmissions.reduce((sum, s) => sum + (s.totalPoints > 0 ? (s.score / s.totalPoints) * 100 : 0), 0) / totalQuizzesAttempted)
    : 0;

  // Student Assignment Performance Metrics
  const assignmentSubmissions = await AssignmentSubmission.find({ student: studentId })
    .populate({
      path: 'assignment',
      select: 'title grade month weekNumber maxMarks passingMarks course dueDate',
      populate: { path: 'course', select: 'title' }
    })
    .sort({ submittedAt: -1 })
    .lean();

  const totalAssignmentsSubmitted = assignmentSubmissions.length;
  const gradedAssignments = assignmentSubmissions.filter(s => s.status === 'graded' && s.marks !== null);
  const avgAssignmentMarksPercent = gradedAssignments.length > 0
    ? Math.round(gradedAssignments.reduce((sum, s) => sum + ((s.marks / (s.assignment?.maxMarks || 100)) * 100), 0) / gradedAssignments.length)
    : 0;

  return {
    studentMetrics: {
      studentName: studentUser.name,
      enrolledCoursesCount: enrolledCoursesList.length,
      attendanceRate,
      weeklyAttendedCount,
      totalAvailableWeeks,
      totalPaymentsCount: studentPayments.length,
      totalPaidAmount,
      totalQuizzesAttempted,
      avgQuizScorePercent,
      totalAssignmentsSubmitted,
      avgAssignmentMarksPercent,
      userGrade: studentUser.grade || 'Unassigned',
      userType: studentUser.studentType || 'online'
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
    studentPayments,
    quizSubmissions,
    quizMetrics: {
      totalQuizzesAttempted,
      avgQuizScorePercent,
      quizSubmissions
    },
    assignmentSubmissions,
    assignmentMetrics: {
      totalAssignmentsSubmitted,
      avgAssignmentMarksPercent,
      gradedCount: gradedAssignments.length,
      assignmentSubmissions
    }
  };
};

// --- GET ADMIN, TEACHER & PARENT/STUDENT ANALYTICS SUMMARY ---
router.get('/analytics-summary', protect, async (req, res) => {
  try {
    // 1. If requester is a PARENT
    if (req.user.role?.toLowerCase() === 'parent') {
      const parent = await User.findById(req.user._id).populate('linkedStudents');
      const parentPhone = parent.phoneNumber || parent.parentsPhoneNumber;

      const phoneQuery = parentPhone && parentPhone.trim() ? [{ parentsPhoneNumber: parentPhone.trim() }] : [];
      const children = await User.find({
        role: 'student',
        $or: [
          { _id: { $in: parent.linkedStudents || [] } },
          ...phoneQuery
        ]
      }).select('-password');

      if (children.length === 0) {
        return res.json({
          success: true,
          isParentView: true,
          isStudentView: true,
          parentChildren: [],
          studentMetrics: null,
          attendanceBreakdown: null,
          enrolledCoursesList: [],
          studentPayments: []
        });
      }

      // Determine target student
      let targetStudent = null;
      if (req.query.studentId) {
        targetStudent = children.find(c => c._id.toString() === req.query.studentId);
      }
      if (!targetStudent) {
        targetStudent = children[0];
      }

      const analyticsPayload = await getStudentAnalyticsPayload(targetStudent);

      return res.json({
        success: true,
        isParentView: true,
        isStudentView: true,
        selectedStudentId: targetStudent._id.toString(),
        parentChildren: children.map(c => ({
          _id: c._id,
          name: c.name,
          grade: c.grade,
          studentType: c.studentType || 'physical',
          registrationNumber: c.registrationNumber,
          profilePicture: c.profilePicture
        })),
        ...analyticsPayload
      });
    }

    // 2. If requester is a STUDENT
    if (req.user.role?.toLowerCase() === 'student') {
      const analyticsPayload = await getStudentAnalyticsPayload(req.user);
      return res.json({
        success: true,
        isStudentView: true,
        isParentView: false,
        ...analyticsPayload
      });
    }

    // 3. If requester is a TEACHER
    if (req.user.role?.toLowerCase() === 'teacher') {
      const teacherId = req.user._id || req.user.id;

      // Find all courses taught by this teacher
      const teacherCourses = await Course.find({ instructor: teacherId }).lean();
      const teacherCourseIds = teacherCourses.map(c => c._id);

      // Selected course filter (if teacher chose a specific class)
      const selectedCourseId = req.query.courseId;
      const filteredCourseIds = (selectedCourseId && selectedCourseId !== 'all')
        ? teacherCourseIds.filter(id => id.toString() === selectedCourseId)
        : teacherCourseIds;

      // Find all enrollments for teacher's courses
      const enrollments = await Enrollment.find({ course: { $in: filteredCourseIds } }).lean();

      // Collect all student IDs associated with teacher's courses
      const enrolledStudentIdSet = new Set();
      teacherCourses
        .filter(c => filteredCourseIds.some(id => id.toString() === c._id.toString()))
        .forEach(c => {
          (c.enrolledStudents || []).forEach(sId => enrolledStudentIdSet.add(sId.toString()));
        });
      enrollments.forEach(e => {
        if (e.student) enrolledStudentIdSet.add(e.student.toString());
      });

      const uniqueStudentIds = Array.from(enrolledStudentIdSet);

      // Fetch student user records
      const studentTypeFilter = (req.query.studentType && req.query.studentType !== 'all')
        ? req.query.studentType.toLowerCase()
        : null;

      const studentQuery = {
        _id: { $in: uniqueStudentIds },
        role: 'student'
      };
      if (studentTypeFilter) {
        studentQuery.studentType = studentTypeFilter;
      }

      const rawTeacherStudents = await User.find(studentQuery).select('-password').lean();

      // IF TEACHER SELECTED A SPECIFIC STUDENT FOR DEEP-DIVE ANALYTICS:
      if (req.query.studentId) {
        const targetStudent = rawTeacherStudents.find(s => s._id.toString() === req.query.studentId);
        if (!targetStudent) {
          return res.status(404).json({ message: "Student not found in your class roster." });
        }

        // Student's specific metrics in this teacher's courses
        const studentEnrollments = await Enrollment.find({
          student: targetStudent._id,
          course: { $in: teacherCourseIds }
        }).populate('course').lean();

        const studentDirectCourses = teacherCourses.filter(c =>
          (c.enrolledStudents || []).some(sId => sId.toString() === targetStudent._id.toString())
        );

        const studentCoursesMap = {};
        studentDirectCourses.forEach(c => {
          studentCoursesMap[c._id.toString()] = {
            _id: c._id,
            title: c.title,
            description: c.description,
            price: c.price || 2500,
            cardImage: c.cardImage || '',
            banner: c.banner || '',
            instructorName: req.user.name
          };
        });
        studentEnrollments.forEach(e => {
          if (e.course) {
            studentCoursesMap[e.course._id.toString()] = {
              _id: e.course._id,
              title: e.course.title,
              description: e.course.description,
              price: e.course.price || 2500,
              cardImage: e.course.cardImage || '',
              banner: e.course.banner || '',
              instructorName: req.user.name
            };
          }
        });
        const enrolledCoursesList = Object.values(studentCoursesMap);

        // Attendance records in teacher's courses
        const studentAttendanceLogs = await Attendance.find({
          $or: [{ studentId: targetStudent._id }, { student: targetStudent._id }],
          courseId: { $in: teacherCourseIds }
        }).populate('courseId', 'title').sort({ createdAt: -1 }).lean();

        const totalAttendance = studentAttendanceLogs.length;
        const presentRecords = studentAttendanceLogs.filter(a => a.status === 'Present').length;
        const absentRecords = studentAttendanceLogs.filter(a => a.status === 'Absent').length;
        const lateRecords = studentAttendanceLogs.filter(a => a.status === 'Late').length;
        const weeklyRecords = studentAttendanceLogs.filter(a => a.mode === 'ONLINE_WEEKLY' || a.weekNumber);

        const totalAvailableWeeks = Math.max(16, (enrolledCoursesList.length || 1) * 16);
        const attendanceRate = totalAttendance > 0 ? Math.round((presentRecords / totalAttendance) * 100) : 0;

        // Payment records in teacher's courses
        const studentPayments = await Payment.find({
          student: targetStudent._id,
          course: { $in: teacherCourseIds },
          status: 'COMPLETED'
        }).populate('course', 'title price').sort({ createdAt: -1 }).lean();

        const totalPaidAmount = studentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

        return res.json({
          success: true,
          isTeacherView: true,
          isStudentDetail: true,
          selectedStudent: {
            _id: targetStudent._id,
            name: targetStudent.name,
            email: targetStudent.email,
            grade: targetStudent.grade,
            studentType: targetStudent.studentType || 'physical',
            registrationNumber: targetStudent.registrationNumber,
            profilePicture: targetStudent.profilePicture
          },
          teacherCourses: teacherCourses.map(c => ({
            _id: c._id,
            title: c.title,
            enrolledCount: (c.enrolledStudents || []).length
          })),
          studentMetrics: {
            studentName: targetStudent.name,
            enrolledCoursesCount: enrolledCoursesList.length,
            attendanceRate,
            weeklyAttendedCount: weeklyRecords.length,
            totalAvailableWeeks,
            totalPaymentsCount: studentPayments.length,
            totalPaidAmount,
            userGrade: targetStudent.grade || 'Unassigned',
            userType: targetStudent.studentType || 'online'
          },
          attendanceBreakdown: {
            total: totalAttendance,
            present: presentRecords,
            absent: absentRecords,
            late: lateRecords,
            weeklyAttendedCount: weeklyRecords.length,
            totalAvailableWeeks
          },
          weeklyRecords,
          enrolledCoursesList,
          studentPayments
        });
      }

      // TEACHER CLASS OVERVIEW (Across all teacher's courses or selected course):
      // Calculate attendance in teacher's courses
      const teacherAttendanceLogs = await Attendance.find({
        courseId: { $in: filteredCourseIds }
      }).lean();

      const totalAttendanceLogged = teacherAttendanceLogs.length;
      const totalPresent = teacherAttendanceLogs.filter(a => a.status === 'Present').length;
      const attendanceCompliance = totalAttendanceLogged > 0
        ? Math.round((totalPresent / totalAttendanceLogged) * 100)
        : 100;

      // Payments for teacher's courses
      const teacherPayments = await Payment.find({
        course: { $in: filteredCourseIds },
        status: 'COMPLETED'
      }).lean();

      const totalRevenue = teacherPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      const onlineStudentsCount = rawTeacherStudents.filter(s => s.studentType === 'online').length;
      const physicalStudentsCount = rawTeacherStudents.filter(s => s.studentType !== 'online').length;
      const totalStudentsCount = rawTeacherStudents.length;

      // Lessons published for teacher's courses
      const teacherLessons = await Lesson.find({
        course: { $in: filteredCourseIds }
      }).lean();

      const totalLessonsPublished = teacherLessons.length;
      let totalVideosCount = 0;
      let totalPdfsCount = 0;
      let totalAssignmentsCount = 0;

      teacherLessons.forEach(l => {
        totalVideosCount += (l.videoLessons || []).length;
        totalPdfsCount += (l.pdfMaterials || []).length;
        totalAssignmentsCount += (l.assignments || []).length;
      });

      // Active weekly timetable hours for teacher's courses/schedules
      const teacherSchedules = await Schedule.find({
        $or: [
          { teacherId: teacherId },
          { courseId: { $in: filteredCourseIds } }
        ]
      }).lean();

      const activeTimetableHours = calculateScheduleHours(teacherSchedules);

      // Build rich student list with per-student stats in teacher's classes
      const studentsList = await Promise.all(
        rawTeacherStudents.map(async (student) => {
          const studentCourseTitles = teacherCourses
            .filter(c => (c.enrolledStudents || []).some(id => id.toString() === student._id.toString()))
            .map(c => c.title);

          const studentAttLogs = teacherAttendanceLogs.filter(a =>
            (a.studentId?.toString() === student._id.toString()) || (a.student?.toString() === student._id.toString())
          );
          const stuPresent = studentAttLogs.filter(a => a.status === 'Present').length;
          const stuTotal = studentAttLogs.length;
          const stuRate = stuTotal > 0 ? Math.round((stuPresent / stuTotal) * 100) : 0;

          const stuPayments = teacherPayments.filter(p => p.student?.toString() === student._id.toString());
          const stuPaid = stuPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

          return {
            _id: student._id,
            name: student.name,
            email: student.email,
            grade: student.grade || 'Unassigned',
            studentType: student.studentType || 'physical',
            registrationNumber: student.registrationNumber || 'N/A',
            profilePicture: student.profilePicture || '',
            enrolledCourses: studentCourseTitles.length > 0 ? studentCourseTitles : ['Enrolled via Portal'],
            attendanceCount: stuTotal,
            attendanceRate: stuRate,
            paymentsCount: stuPayments.length,
            totalPaid: stuPaid
          };
        })
      );

      // Grade breakdown for teacher's students
      const gradeCounts = {};
      const gradeTypeBreakdown = {};
      rawTeacherStudents.forEach(s => {
        let g = s.grade || 'Unassigned';
        if (g.toLowerCase().startsWith('grade')) {
          const match = g.match(/grade\s*\d+/i);
          if (match) g = match[0].replace(/grade\s*/i, 'Grade ');
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

      const gradeDistribution = Object.keys(gradeCounts).map(g => ({
        grade: g,
        count: gradeCounts[g],
        online: gradeTypeBreakdown[g]?.online || 0,
        physical: gradeTypeBreakdown[g]?.physical || 0
      })).sort((a, b) => b.count - a.count);

      // Top courses ranking and operational breakdown for this teacher
      const topCourses = teacherCourses.map(c => {
        const cId = c._id.toString();
        const enrolledCount = (c.enrolledStudents || []).length;
        const coursePayments = teacherPayments.filter(p => p.course?.toString() === cId);
        const courseRevenue = coursePayments.reduce((acc, p) => acc + (p.amount || 0), 0);

        const courseLessons = teacherLessons.filter(l => l.course?.toString() === cId);
        const courseSchedules = teacherSchedules.filter(s => s.courseId?.toString() === cId);
        const courseHours = calculateScheduleHours(courseSchedules);

        const courseAttLogs = teacherAttendanceLogs.filter(a => a.courseId?.toString() === cId);
        const coursePresent = courseAttLogs.filter(a => a.status === 'Present').length;
        const courseAttRate = courseAttLogs.length > 0 ? Math.round((coursePresent / courseAttLogs.length) * 100) : 100;

        let vidCount = 0;
        let pdfCount = 0;
        let assignCount = 0;
        courseLessons.forEach(l => {
          vidCount += (l.videoLessons || []).length;
          pdfCount += (l.pdfMaterials || []).length;
          assignCount += (l.assignments || []).length;
        });

        return {
          _id: c._id,
          title: c.title,
          price: c.price || 2500,
          enrolledCount,
          revenue: courseRevenue,
          lessonsPublished: courseLessons.length,
          videosCount: vidCount,
          pdfsCount: pdfCount,
          assignmentsCount: assignCount,
          activeTimetableHours: courseHours,
          attendanceRate: courseAttRate,
          schedulesCount: courseSchedules.length
        };
      }).sort((a, b) => b.enrolledCount - a.enrolledCount);

      return res.json({
        success: true,
        isTeacherView: true,
        isStudentDetail: false,
        teacherCourses: topCourses,
        selectedCourseId: selectedCourseId || 'all',
        metrics: {
          totalStudents: totalStudentsCount,
          onlineStudents: onlineStudentsCount,
          physicalStudents: physicalStudentsCount,
          totalCourses: teacherCourses.length,
          totalRevenue,
          totalLessonsPublished,
          totalVideosCount,
          totalPdfsCount,
          totalAssignmentsCount,
          activeTimetableHours,
          attendanceRate: attendanceCompliance,
          attendanceBreakdown: {
            total: totalAttendanceLogged,
            present: totalPresent,
            absent: teacherAttendanceLogs.filter(a => a.status === 'Absent').length,
            late: teacherAttendanceLogs.filter(a => a.status === 'Late').length
          }
        },
        studentsList,
        gradeDistribution,
        topCourses
      });
    }

    // 4. ADMIN VIEW (With Institute Overview & Teacher Drill-Down)
    const { studentType, teacherId: adminTeacherFilterId } = req.query;
    const filterType = (studentType && studentType !== 'all') ? studentType.toLowerCase() : null;

    const studentFilter = { role: 'student' };
    if (filterType) {
      studentFilter.studentType = filterType;
    }

    const totalAllStudents = await User.countDocuments({ role: 'student' });
    const onlineStudents = await User.countDocuments({ role: 'student', studentType: 'online' });
    const physicalStudents = Math.max(0, totalAllStudents - onlineStudents);

    const totalStudents = filterType === 'online' ? onlineStudents : filterType === 'physical' ? physicalStudents : totalAllStudents;
    const totalTeachers = await User.countDocuments({ role: 'teacher' });
    const totalAdmins = await User.countDocuments({ role: 'admin' });

    const filteredStudents = await User.find(studentFilter).select('_id grade studentType createdAt');
    const filteredStudentIds = filteredStudents.map(s => s._id);

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

    // Fetch all teachers, courses, lessons, schedules, attendance, and payments
    const allTeachers = await User.find({ role: 'teacher' })
      .select('name email profilePicture phoneNumber department')
      .lean();

    const allCourses = await Course.find({})
      .populate('instructor', 'name email profilePicture')
      .lean();

    const allLessons = await Lesson.find({}).lean();
    const allSchedules = await Schedule.find({}).populate('courseId').populate('teacherId').lean();

    const paymentQuery = { status: 'COMPLETED' };
    if (filterType) {
      paymentQuery.student = { $in: filteredStudentIds };
    }
    const allPayments = await Payment.find(paymentQuery).populate('course', 'title price').lean();

    const attendanceQuery = filterType ? { studentId: { $in: filteredStudentIds } } : {};
    const allAttendanceLogs = await Attendance.find(attendanceQuery).lean();

    const totalAttendanceRecords = allAttendanceLogs.length;
    const presentRecords = allAttendanceLogs.filter(a => a.status === 'Present').length;
    const absentRecords = allAttendanceLogs.filter(a => a.status === 'Absent').length;
    const lateRecords = allAttendanceLogs.filter(a => a.status === 'Late').length;

    const instituteAttendanceRate = totalAttendanceRecords > 0
      ? Math.round((presentRecords / totalAttendanceRecords) * 100)
      : 100;

    const instituteLessonsCount = allLessons.length;
    let instituteVideosCount = 0;
    let institutePdfsCount = 0;
    let instituteAssignmentsCount = 0;
    allLessons.forEach(l => {
      instituteVideosCount += (l.videoLessons || []).length;
      institutePdfsCount += (l.pdfMaterials || []).length;
      instituteAssignmentsCount += (l.assignments || []).length;
    });

    const instituteTimetableHours = calculateScheduleHours(allSchedules);
    const totalRevenue = allPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

    // Build per-teacher operational breakdown list for Admin
    const teacherBreakdownList = allTeachers.map(t => {
      const tId = t._id.toString();
      const tCourses = allCourses.filter(c => {
        const instId = c.instructor?._id?.toString() || c.instructor?.toString();
        return instId === tId;
      });
      const tCourseIds = tCourses.map(c => c._id.toString());

      const tLessons = allLessons.filter(l => tCourseIds.includes(l.course?.toString()));
      const tSchedules = allSchedules.filter(s => {
        const sTeacherId = s.teacherId?._id?.toString() || s.teacherId?.toString();
        const sCourseId = s.courseId?._id?.toString() || s.courseId?.toString();
        return sTeacherId === tId || (sCourseId && tCourseIds.includes(sCourseId));
      });
      const tHours = calculateScheduleHours(tSchedules);

      const tStudentSet = new Set();
      tCourses.forEach(c => (c.enrolledStudents || []).forEach(sId => tStudentSet.add(sId.toString())));

      const tAttLogs = allAttendanceLogs.filter(a => a.courseId && tCourseIds.includes(a.courseId.toString()));
      const tPresent = tAttLogs.filter(a => a.status === 'Present').length;
      const tAttRate = tAttLogs.length > 0 ? Math.round((tPresent / tAttLogs.length) * 100) : 100;

      const tPayments = allPayments.filter(p => {
        const pCourseId = p.course?._id?.toString() || p.course?.toString();
        return pCourseId && tCourseIds.includes(pCourseId);
      });
      const tRevenue = tPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      let tVid = 0;
      let tPdf = 0;
      let tAssign = 0;
      tLessons.forEach(l => {
        tVid += (l.videoLessons || []).length;
        tPdf += (l.pdfMaterials || []).length;
        tAssign += (l.assignments || []).length;
      });

      return {
        _id: t._id,
        name: t.name,
        email: t.email,
        profilePicture: t.profilePicture || '',
        phoneNumber: t.phoneNumber || '',
        coursesCount: tCourses.length,
        coursesList: tCourses.map(c => ({ _id: c._id, title: c.title })),
        totalLessonsPublished: tLessons.length,
        videosCount: tVid,
        pdfsCount: tPdf,
        assignmentsCount: tAssign,
        activeTimetableHours: tHours,
        attendanceRate: tAttRate,
        totalStudents: tStudentSet.size,
        totalRevenue: tRevenue
      };
    });

    // Build comprehensive course list with full operational details
    const coursesDetailedList = allCourses.map(c => {
      const cId = c._id.toString();
      const cLessons = allLessons.filter(l => l.course?.toString() === cId);
      const cSchedules = allSchedules.filter(s => {
        const sCourseId = s.courseId?._id?.toString() || s.courseId?.toString();
        return sCourseId === cId;
      });
      const cHours = calculateScheduleHours(cSchedules);

      const cAttLogs = allAttendanceLogs.filter(a => a.courseId?.toString() === cId);
      const cPresent = cAttLogs.filter(a => a.status === 'Present').length;
      const cAttRate = cAttLogs.length > 0 ? Math.round((cPresent / cAttLogs.length) * 100) : 100;

      const cPayments = allPayments.filter(p => {
        const pCourseId = p.course?._id?.toString() || p.course?.toString();
        return pCourseId === cId;
      });
      const cRevenue = cPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

      let enrolledCount = Array.isArray(c.enrolledStudents) ? c.enrolledStudents.length : 0;
      if (filterType && Array.isArray(c.enrolledStudents)) {
        enrolledCount = c.enrolledStudents.filter(id =>
          filteredStudentIds.some(fid => fid.toString() === id.toString())
        ).length;
      }

      let vidCount = 0;
      let pdfCount = 0;
      let assignCount = 0;
      cLessons.forEach(l => {
        vidCount += (l.videoLessons || []).length;
        pdfCount += (l.pdfMaterials || []).length;
        assignCount += (l.assignments || []).length;
      });

      return {
        _id: c._id,
        title: c.title,
        description: c.description,
        instructorName: c.instructor?.name || 'Unassigned',
        instructorId: c.instructor?._id || c.instructor || null,
        price: c.price || 2500,
        enrolledCount,
        revenue: cRevenue,
        lessonsPublished: cLessons.length,
        videosCount: vidCount,
        pdfsCount: pdfCount,
        assignmentsCount: assignCount,
        activeTimetableHours: cHours,
        attendanceRate: cAttRate,
        schedulesCount: cSchedules.length,
        cardImage: c.cardImage || '',
        banner: c.banner || ''
      };
    });

    coursesDetailedList.sort((a, b) => b.enrolledCount - a.enrolledCount);

    // Course Revenue List
    const courseRevenueMap = {};
    allPayments.forEach(p => {
      const courseTitle = p.course?.title || 'General Course';
      courseRevenueMap[courseTitle] = (courseRevenueMap[courseTitle] || 0) + (p.amount || 0);
    });

    const courseRevenueList = Object.keys(courseRevenueMap).map(title => ({
      title,
      revenue: courseRevenueMap[title]
    })).sort((a, b) => b.revenue - a.revenue);

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

    // Handle Admin Teacher Filter if selected
    let effectiveCourses = coursesDetailedList;
    let selectedTeacherInfo = null;

    if (adminTeacherFilterId && adminTeacherFilterId !== 'all') {
      const matchedTeacher = teacherBreakdownList.find(t => t._id.toString() === adminTeacherFilterId);
      if (matchedTeacher) {
        selectedTeacherInfo = matchedTeacher;
        effectiveCourses = coursesDetailedList.filter(c => c.instructorId?.toString() === adminTeacherFilterId);
      }
    }

    res.json({
      success: true,
      studentTypeFilter: filterType || 'all',
      selectedTeacherId: adminTeacherFilterId || 'all',
      selectedTeacherInfo,
      metrics: {
        totalStudents: selectedTeacherInfo ? selectedTeacherInfo.totalStudents : totalStudents,
        onlineStudents,
        physicalStudents,
        totalTeachers,
        totalAdmins,
        totalCourses: selectedTeacherInfo ? selectedTeacherInfo.coursesCount : allCourses.length,
        totalRevenue: selectedTeacherInfo ? selectedTeacherInfo.totalRevenue : totalRevenue,
        totalPaymentsCount: allPayments.length,
        totalLessonsPublished: selectedTeacherInfo ? selectedTeacherInfo.totalLessonsPublished : instituteLessonsCount,
        totalVideosCount: selectedTeacherInfo ? selectedTeacherInfo.videosCount : instituteVideosCount,
        totalPdfsCount: selectedTeacherInfo ? selectedTeacherInfo.pdfsCount : institutePdfsCount,
        totalAssignmentsCount: selectedTeacherInfo ? selectedTeacherInfo.assignmentsCount : instituteAssignmentsCount,
        activeTimetableHours: selectedTeacherInfo ? selectedTeacherInfo.activeTimetableHours : instituteTimetableHours,
        attendanceRate: selectedTeacherInfo ? selectedTeacherInfo.attendanceRate : instituteAttendanceRate,
        attendanceBreakdown: {
          total: totalAttendanceRecords,
          present: presentRecords,
          absent: absentRecords,
          late: lateRecords
        }
      },
      gradeDistribution,
      topCourses: effectiveCourses,
      coursesDetailedList: effectiveCourses,
      teacherBreakdownList,
      allTeachersList: allTeachers,
      courseRevenueList,
      weeklyStudentTrend
    });

  } catch (err) {
    console.error("Fetch Analytics Error:", err);
    res.status(500).json({ message: "Failed to fetch analytics data: " + err.message });
  }
});

// ==========================================
// PARENT PORTAL ENDPOINTS
// ==========================================

// @route   GET /api/auth/parent-summary
// @desc    Parent retrieves linked children metrics, attendance, payments, and courses
// @access  Private (Parent)
router.get('/parent-summary', protect, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ message: "Access denied. Parent role required." });
  }

  try {
    const parent = await User.findById(req.user._id).populate('linkedStudents');
    const parentPhone = parent.phoneNumber || parent.parentsPhoneNumber;

    // Find all linked students matching linkedStudents array OR parentsPhoneNumber
    const phoneQuery = parentPhone && parentPhone.trim() ? [{ parentsPhoneNumber: parentPhone.trim() }] : [];
    const children = await User.find({
      role: 'student',
      $or: [
        { _id: { $in: parent.linkedStudents || [] } },
        ...phoneQuery
      ]
    }).select('-password');

    // Build comprehensive data for each child
    const childrenData = await Promise.all(
      children.map(async (child) => {
        const childId = child._id;

        // 1. Enrolled Courses
        const courses = await Course.find({ enrolledStudents: childId })
          .populate('instructor', 'name profilePicture')
          .select('title description price banner cardImage status studentType instructor');

        // 2. Attendance History
        const rawAttendance = await Attendance.find({
          $or: [{ studentId: childId }, { student: childId }]
        })
          .populate('courseId', 'title')
          .sort({ createdAt: -1 })
          .limit(50);

        const attendanceLogs = rawAttendance.map(a => {
          const courseTitle = a.courseId?.title || '';
          const weekStr = a.weekNumber ? `Week ${a.weekNumber}` : '';
          const autoRemark = courseTitle ? `${courseTitle} ${weekStr ? `(${weekStr})` : ''}`.trim() : 'Standard Class Attendance Scan';
          return {
            ...a.toObject(),
            remarks: a.remarks || autoRemark
          };
        });

        const totalAtt = attendanceLogs.length;
        const presentCount = attendanceLogs.filter(a => a.status === 'Present').length;
        const absentCount = attendanceLogs.filter(a => a.status === 'Absent').length;
        const lateCount = attendanceLogs.filter(a => a.status === 'Late').length;

        const attendanceRate = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 100;

        // 3. Payments & Receipts
        const payments = await Payment.find({ student: childId })
          .populate('course', 'title price')
          .sort({ createdAt: -1 });

        const totalPaidAmount = payments
          .filter(p => p.status === 'COMPLETED')
          .reduce((sum, p) => sum + (p.amount || 0), 0);

        // 4. PDF Reading & Study Progress Metrics
        const readingProgress = await ReadingProgress.find({ student: childId })
          .populate('course', 'title')
          .sort({ lastReadAt: -1 });

        // 5. Quiz Assessment Submissions & Performance
        const quizSubmissions = await QuizSubmission.find({ student: childId })
          .populate({
            path: 'quiz',
            select: 'title grade month weekNumber passingPercentage course timeLimit',
            populate: { path: 'course', select: 'title' }
          })
          .sort({ completedAt: -1 })
          .lean();

        const totalQuizzes = quizSubmissions.length;
        const totalQuizScoreSum = quizSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
        const totalQuizPointsSum = quizSubmissions.reduce((sum, s) => sum + (s.totalPoints || 0), 0);
        const averageQuizPercent = totalQuizPointsSum > 0
          ? Math.round((totalQuizScoreSum / totalQuizPointsSum) * 100)
          : (totalQuizzes > 0 ? Math.round(quizSubmissions.reduce((sum, s) => sum + ((s.score / (s.totalPoints || 1)) * 100), 0) / totalQuizzes) : 0);

        const passedQuizzesCount = quizSubmissions.filter(s => {
          const passPct = s.quiz?.passingPercentage || 50;
          const scorePct = s.totalPoints > 0 ? (s.score / s.totalPoints) * 100 : 0;
          return scorePct >= passPct;
        }).length;

        // 6. Homework & Assignment Submissions & Performance
        const assignmentSubmissions = await AssignmentSubmission.find({ student: childId })
          .populate({
            path: 'assignment',
            select: 'title grade month weekNumber maxMarks passingMarks course dueDate',
            populate: { path: 'course', select: 'title' }
          })
          .sort({ submittedAt: -1 })
          .lean();

        const totalAssignments = assignmentSubmissions.length;
        const gradedAssignments = assignmentSubmissions.filter(s => s.status === 'graded' && s.marks !== null);
        const averageAssignmentMarks = gradedAssignments.length > 0
          ? Math.round(gradedAssignments.reduce((sum, s) => sum + ((s.marks / (s.assignment?.maxMarks || 100)) * 100), 0) / gradedAssignments.length)
          : 0;

        const passedAssignmentsCount = gradedAssignments.filter(s => {
          const passMark = s.assignment?.passingMarks || 50;
          return (s.marks || 0) >= passMark;
        }).length;

        return {
          child: {
            _id: child._id,
            name: child.name,
            email: child.email,
            registrationNumber: child.registrationNumber,
            grade: child.grade,
            studentType: child.studentType,
            dateOfBirth: child.dateOfBirth,
            nicNumber: child.nicNumber,
            profilePicture: child.profilePicture
          },
          courses: courses.map(c => ({
            _id: c._id,
            title: c.title,
            description: c.description,
            price: c.price,
            instructorName: c.instructor?.name || 'Faculty Teacher',
            studentType: c.studentType
          })),
          attendanceMetrics: {
            total: totalAtt,
            present: presentCount,
            absent: absentCount,
            late: lateCount,
            attendanceRate
          },
          attendanceLogs,
          payments,
          totalPaidAmount,
          readingProgress,
          quizSubmissions,
          quizMetrics: {
            totalQuizzes,
            averageQuizPercent,
            passedQuizzesCount,
            passRate: totalQuizzes > 0 ? Math.round((passedQuizzesCount / totalQuizzes) * 100) : 0
          },
          assignmentSubmissions,
          assignmentMetrics: {
            totalAssignments,
            gradedCount: gradedAssignments.length,
            averageAssignmentMarks,
            passedAssignmentsCount,
            passRate: gradedAssignments.length > 0 ? Math.round((passedAssignmentsCount / gradedAssignments.length) * 100) : 0
          }
        };
      })
    );

    res.json({
      success: true,
      parentName: parent.name,
      parentEmail: parent.email,
      parentPhone,
      linkedChildrenCount: childrenData.length,
      childrenData
    });

  } catch (err) {
    console.error("Fetch Parent Summary Error:", err);
    res.status(500).json({ message: "Failed to fetch parent summary data: " + err.message });
  }
});

// @route   POST /api/auth/link-child
// @desc    Parent links another child by Registration Number
// @access  Private (Parent)
router.post('/link-child', protect, async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ message: "Access denied. Parent role required." });
  }

  const { childRegNo } = req.body;
  if (!childRegNo || !childRegNo.trim()) {
    return res.status(400).json({ message: "Child Registration Number is required." });
  }

  try {
    const student = await User.findOne({
      role: 'student',
      registrationNumber: new RegExp(`^${childRegNo.trim()}$`, 'i')
    });

    if (!student) {
      return res.status(404).json({ message: "No active student found with registration number: " + childRegNo });
    }

    const parent = await User.findById(req.user._id);
    if (!parent.linkedStudents) parent.linkedStudents = [];

    const isAlreadyLinked = parent.linkedStudents.some(id => id.toString() === student._id.toString());
    if (isAlreadyLinked) {
      return res.status(400).json({ message: `Student ${student.name} is already linked to your parent account.` });
    }

    parent.linkedStudents.push(student._id);
    await parent.save();

    res.json({
      success: true,
      message: `Student ${student.name} (Grade ${student.grade}) successfully linked to your parent account!`,
      student: {
        id: student._id,
        name: student.name,
        registrationNumber: student.registrationNumber,
        grade: student.grade
      }
    });

  } catch (err) {
    console.error("Link Child Error:", err);
    res.status(500).json({ message: "Failed to link child account: " + err.message });
  }
});

module.exports = router;