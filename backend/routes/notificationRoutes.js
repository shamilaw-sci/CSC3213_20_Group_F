const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { getClassEnrolledStudents } = require('../utils/enrollmentHelper');
const { protect } = require('../middleware/authMiddleware');
const { sendBulkSMS } = require('../services/smsService');
const { sendClassAnnouncementEmail } = require('../utils/emailService');

// Helper to format time ago
const formatTimeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

// ==========================================
// 1. GET CURRENT USER NOTIFICATIONS
// ==========================================
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // If parent, fetch all linked students (via direct link or phone match) to verify child-specific alerts
    let linkedStudentIds = [];
    let linkedStudentNames = [];
    if (userRole === 'parent') {
      const parentUser = await User.findById(userId).populate('linkedStudents', 'name');
      if (parentUser) {
        const directStudents = Array.isArray(parentUser.linkedStudents) ? parentUser.linkedStudents : [];
        const phoneStudents = parentUser.phoneNumber
          ? await User.find({ role: 'student', parentsPhoneNumber: parentUser.phoneNumber }).select('name')
          : [];
        const combined = [...directStudents, ...phoneStudents];
        linkedStudentIds = combined.map(s => (s._id ? s._id.toString() : s.toString()));
        linkedStudentNames = combined.map(s => (s.name ? s.name.toLowerCase().trim() : '')).filter(Boolean);
      }
    }

    // Find notifications sent directly to user OR targeting their role or 'all'
    const notifications = await Notification.find({
      $or: [
        { recipient: userId },
        { recipientRole: { $in: ['all', userRole] } }
      ]
    })
      .populate('sender', 'name role')
      .sort({ createdAt: -1 })
      .limit(60);

    // Filter notifications for parents: direct messages are always kept; broadcasts must belong to linked children
    const filteredNotifications = notifications.filter(notif => {
      if (userRole === 'parent') {
        // Direct recipient notifications for this parent are always preserved
        if (notif.recipient && notif.recipient.toString() === userId.toString()) {
          return true;
        }

        // If metadata has studentId, it must belong to parent's linked students
        if (notif.metadata && notif.metadata.studentId) {
          return linkedStudentIds.includes(notif.metadata.studentId.toString());
        }

        // If it's an ATTENDANCE notification without metadata
        if (notif.type === 'ATTENDANCE') {
          if (linkedStudentNames.length === 0) return false;
          const text = `${notif.title || ''} ${notif.message || ''}`.toLowerCase();
          // Keep only if it mentions any linked child's name
          return linkedStudentNames.some(childName => text.includes(childName));
        }
      }
      return true;
    });

    // Format output & determine read status for each notification
    const formatted = filteredNotifications.map(notif => {
      let isReadForUser = false;

      if (notif.recipient && notif.recipient.toString() === userId.toString()) {
        isReadForUser = notif.isRead;
      } else {
        isReadForUser = notif.readBy.some(id => id.toString() === userId.toString());
      }

      return {
        id: notif._id,
        _id: notif._id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        link: notif.link,
        createdAt: notif.createdAt,
        time: formatTimeAgo(notif.createdAt),
        isRead: isReadForUser,
        channels: notif.channels
      };
    });

    const unreadCount = formatted.filter(n => !n.isRead).length;

    res.json({
      notifications: formatted,
      unreadCount
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// ==========================================
// 2. MARK SINGLE NOTIFICATION AS READ
// ==========================================
router.put('/:id/read', protect, async (req, res) => {
  try {
    const notifId = req.params.id;
    const userId = req.user._id;

    const notif = await Notification.findById(notifId);
    if (!notif) {
      return res.status(404).json({ error: 'Notification not found.' });
    }

    if (notif.recipient && notif.recipient.toString() === userId.toString()) {
      notif.isRead = true;
    } else {
      const alreadyRead = notif.readBy && notif.readBy.some(id => id.toString() === userId.toString());
      if (!alreadyRead) {
        notif.readBy.push(userId);
      }
    }

    await notif.save();
    res.json({ success: true, message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Failed to mark notification as read.' });
  }
});

// ==========================================
// 3. MARK ALL NOTIFICATIONS AS READ
// ==========================================
router.put('/read-all', protect, async (req, res) => {
  try {
    const userId = req.user._id;
    const userRole = req.user.role;

    // 1. Mark direct user notifications
    await Notification.updateMany(
      { recipient: userId, isRead: false },
      { $set: { isRead: true } }
    );

    // 2. Mark role/all notifications by adding user to readBy
    await Notification.updateMany(
      {
        recipientRole: { $in: ['all', userRole] },
        readBy: { $ne: userId }
      },
      { $addToSet: { readBy: userId } }
    );

    res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    res.status(500).json({ error: 'Failed to mark all notifications as read.' });
  }
});

// ==========================================
// 4. BROADCAST ANNOUNCEMENT (TEACHERS / ADMINS)
// ==========================================
router.post('/broadcast', protect, async (req, res) => {
  const { role, _id: senderId } = req.user;
  if (role !== 'admin' && role !== 'teacher') {
    return res.status(403).json({ error: 'Access denied. Teachers and Admins only.' });
  }

  const {
    title,
    message,
    courseId,
    targetGrade,
    type = 'CLASS_POSTPONED',
    channels = ['in_app', 'sms', 'email']
  } = req.body;

  if (!title || !message) {
    return res.status(400).json({ error: 'Title and message are required.' });
  }

  try {
    // Teacher Permission & Scope Check
    if (role === 'teacher') {
      if (courseId) {
        const teacherCourse = await Course.findById(courseId);
        if (!teacherCourse) {
          return res.status(404).json({ error: 'Course not found.' });
        }
        if (!teacherCourse.instructor || teacherCourse.instructor.toString() !== senderId.toString()) {
          return res.status(403).json({ error: 'You are only authorized to broadcast to courses you instruct.' });
        }
      } else if (!targetGrade) {
        // Teacher must specify a course or target grade
        return res.status(403).json({ error: 'Teachers must specify a targeted course or grade for announcements.' });
      }
    }

    // Comprehensive resolution of target students across Enrollment collection, Course.classes, Course.enrolledStudents, and Grade
    const targetStudentIdSet = new Set();

    if (courseId && targetGrade) {
      const classStudents = await getClassEnrolledStudents(courseId, targetGrade);
      classStudents.forEach(s => s._id && targetStudentIdSet.add(s._id.toString()));
    } else if (courseId) {
      const course = await Course.findById(courseId).lean();
      if (!course) {
        return res.status(404).json({ error: 'Course not found.' });
      }
      // 1. Direct course.enrolledStudents
      if (Array.isArray(course.enrolledStudents)) {
        course.enrolledStudents.forEach(id => id && targetStudentIdSet.add(id.toString()));
      }
      // 2. Embedded course.classes enrolledStudents
      if (Array.isArray(course.classes)) {
        course.classes.forEach(cls => {
          if (Array.isArray(cls.enrolledStudents)) {
            cls.enrolledStudents.forEach(id => id && targetStudentIdSet.add(id.toString()));
          }
        });
      }
      // 3. Enrollment collection for this course
      const enrollments = await Enrollment.find({ course: courseId }).select('student').lean();
      enrollments.forEach(e => e.student && targetStudentIdSet.add(e.student.toString()));
    } else if (targetGrade) {
      const rawGrade = String(targetGrade).trim();
      const gradeNumberOnly = rawGrade.replace(/\D/g, '');
      const gradePattern = gradeNumberOnly ? `(^|\\b|Grade\\s*)${gradeNumberOnly}(\\b|$)` : `^${rawGrade}$`;
      const gradeRegex = new RegExp(gradePattern, 'i');

      const gradeStudents = await User.find({ role: 'student', grade: { $regex: gradeRegex } }).select('_id').lean();
      gradeStudents.forEach(s => s._id && targetStudentIdSet.add(s._id.toString()));
    } else {
      // Global broadcast (all active students)
      const allStudents = await User.find({ role: 'student' }).select('_id').lean();
      allStudents.forEach(s => s._id && targetStudentIdSet.add(s._id.toString()));
    }

    const uniqueTargetIds = Array.from(targetStudentIdSet);
    const targetStudents = await User.find({ _id: { $in: uniqueTargetIds }, role: 'student' })
      .select('name email parentsPhoneNumber grade')
      .lean();

    // 1. In-App Notification Creation
    if (channels.includes('in_app')) {
      if (targetStudents.length > 0) {
        const notifDocs = targetStudents.map(student => ({
          recipient: student._id,
          sender: req.user._id,
          type,
          title,
          message,
          channels,
          link: courseId ? `/courses` : '/dashboard'
        }));
        await Notification.insertMany(notifDocs);
      }
      
      // If global broadcast or role-wide notification requested (or no specific target matched), create role broadcast
      if (!courseId && !targetGrade) {
        await Notification.create({
          recipientRole: 'student',
          sender: req.user._id,
          type,
          title,
          message,
          channels,
          link: '/dashboard'
        });
      }
    }

    // 2. SMS Dispatch to Parents (Async Background)
    if (channels.includes('sms')) {
      const parentPhones = targetStudents
        .map(s => s.parentsPhoneNumber)
        .filter(p => p && p.trim() !== '');

      if (parentPhones.length > 0) {
        sendBulkSMS({
          phoneNumbers: parentPhones,
          message: `${title}: ${message}`,
          classTitle: targetGrade ? `Grade ${targetGrade}` : (courseId ? 'Course Alert' : 'Class Alert')
        }).catch(smsErr => console.error('Background Broadcast SMS Error:', smsErr));
      }
    }

    // 3. Email Dispatch to Students (Async Background)
    if (channels.includes('email')) {
      const studentEmails = targetStudents
        .map(s => s.email)
        .filter(e => e && e.trim() !== '');

      if (studentEmails.length > 0) {
        sendClassAnnouncementEmail(
          studentEmails,
          `LuminaLearn Notice: ${title}`,
          message,
          targetGrade ? `Grade ${targetGrade}` : (courseId ? 'Course Notice' : 'General Notice')
        ).catch(emailErr => console.error('Background Broadcast Email Error:', emailErr));
      }
    }

    res.status(201).json({
      success: true,
      message: `Announcement broadcast successfully to ${targetStudents.length} students/parents.`,
      recipientCount: targetStudents.length
    });
  } catch (err) {
    console.error('Broadcast notification error:', err);
    res.status(500).json({ error: 'Failed to broadcast announcement: ' + err.message });
  }
});

module.exports = router;
