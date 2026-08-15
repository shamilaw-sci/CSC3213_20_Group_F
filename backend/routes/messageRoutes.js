const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const DirectMessage = require('../models/DirectMessage');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const { sendMessageNotificationEmail } = require('../utils/emailService');

// --- MULTER STORAGE SETUP ---
const uploadsDir = path.join(__dirname, '../uploads/messages');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'msg-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Max absolute file size 5MB
});

// --- HELPER: GET ALLOWED RECIPIENT USER IDS BASED ON ROLE & COURSE ENROLLMENT ---
async function getAllowedRecipientIds(user) {
  // Admin can message any user
  if (user.role === 'admin') {
    return null; // null means no ID restriction (all users allowed)
  }

  const admins = await User.find({ role: 'admin' }).select('_id');
  const adminIds = admins.map(a => a._id.toString());

  if (user.role === 'counter_staff' || user.role === 'staff') {
    return adminIds;
  }

  if (user.role === 'student') {
    // Student can message Admins + Teachers of courses they are currently enrolled in
    const enrollments = await Enrollment.find({ student: user._id }).select('course');
    const courseIds = enrollments.map(e => e.course);
    const courses = await Course.find({
      $or: [
        { _id: { $in: courseIds } },
        { enrolledStudents: user._id }
      ]
    }).select('instructor');

    const teacherIds = courses.map(c => c.instructor ? c.instructor.toString() : null).filter(Boolean);
    return [...new Set([...adminIds, ...teacherIds])];
  }

  if (user.role === 'teacher') {
    // Teacher can message Admins + Students enrolled in their assigned courses + Parents of those students
    const teacherCourses = await Course.find({ instructor: user._id }).select('_id enrolledStudents');
    const courseIds = teacherCourses.map(c => c._id);

    const enrollments = await Enrollment.find({ course: { $in: courseIds } }).select('student');
    const enrolledStudentIds = [...new Set([
      ...enrollments.map(e => e.student.toString()),
      ...teacherCourses.flatMap(c => (c.enrolledStudents || []).map(s => s.toString()))
    ])];

    // Find parents linked to these enrolled students
    const parents = await User.find({
      role: 'parent',
      linkedStudents: { $in: enrolledStudentIds }
    }).select('_id');
    const parentIds = parents.map(p => p._id.toString());

    return [...new Set([...adminIds, ...enrolledStudentIds, ...parentIds])];
  }

  if (user.role === 'parent') {
    // Parent can message Admins + Teachers of courses their linked children are enrolled in
    const childrenIds = user.linkedStudents || [];
    if (childrenIds.length === 0) {
      // If no linked children configured yet, allow messaging teachers and admins
      const teachers = await User.find({ role: 'teacher' }).select('_id');
      return [...new Set([...adminIds, ...teachers.map(t => t._id.toString())])];
    }

    const childEnrollments = await Enrollment.find({ student: { $in: childrenIds } }).select('course');
    const childCourseIds = childEnrollments.map(e => e.course);
    const childCourses = await Course.find({
      $or: [
        { _id: { $in: childCourseIds } },
        { enrolledStudents: { $in: childrenIds } }
      ]
    }).select('instructor');

    const teacherIds = childCourses.map(c => c.instructor ? c.instructor.toString() : null).filter(Boolean);
    return [...new Set([...adminIds, ...teacherIds])];
  }

  return adminIds;
}

// --- HELPER: SERVER-SIDE ROLE PERMISSION CHECK ---
async function canUserSendMessage(senderUser, recipientUser) {
  if (!senderUser || !recipientUser) return false;
  if (senderUser._id.toString() === recipientUser._id.toString()) return false;

  const allowedRecipientIds = await getAllowedRecipientIds(senderUser);
  if (allowedRecipientIds === null) return true; // Admin

  return allowedRecipientIds.includes(recipientUser._id.toString());
}

// --- GET /api/messages/contacts ---
// Get list of users the current logged-in user is permitted to contact
router.get('/contacts', protect, async (req, res) => {
  try {
    const currentUser = req.user;
    const { search, role: roleFilter } = req.query;

    const allowedIds = await getAllowedRecipientIds(currentUser);

    let searchFilter = {
      _id: { $ne: currentUser._id }
    };

    if (allowedIds !== null) {
      searchFilter._id = { $in: allowedIds, $ne: currentUser._id };
    }

    if (roleFilter && roleFilter !== 'all') {
      searchFilter.role = roleFilter;
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      searchFilter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { registrationNumber: searchRegex }
      ];
    }

    const contacts = await User.find(searchFilter)
      .select('name email role profilePicture grade department studentType registrationNumber')
      .sort({ name: 1 })
      .limit(100);

    res.json({ contacts });
  } catch (err) {
    console.error('Error fetching messaging contacts:', err);
    res.status(500).json({ message: 'Failed to retrieve messaging contacts.' });
  }
});


// --- GET /api/messages/conversations ---
// Get recent active conversations with latest message & unread badge count
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all messages involving the current user
    const messages = await DirectMessage.find({
      $or: [{ sender: userId }, { recipient: userId }]
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'name email role profilePicture')
      .populate('recipient', 'name email role profilePicture');

    const conversationMap = new Map();

    for (const msg of messages) {
      const isSender = msg.sender._id.toString() === userId.toString();
      const partner = isSender ? msg.recipient : msg.sender;

      if (!partner) continue;

      const partnerId = partner._id.toString();

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          contact: partner,
          lastMessage: {
            _id: msg._id,
            content: msg.content,
            attachmentsCount: msg.attachments ? msg.attachments.length : 0,
            senderId: msg.sender._id,
            createdAt: msg.createdAt,
            isRead: msg.isRead
          },
          unreadCount: 0
        });
      }

      // Count unread messages received from partner
      if (!isSender && !msg.isRead) {
        const conv = conversationMap.get(partnerId);
        conv.unreadCount += 1;
      }
    }

    const conversations = Array.from(conversationMap.values());
    res.json({ conversations });
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: 'Failed to retrieve conversations.' });
  }
});

// --- GET /api/messages/unread-count ---
// Get total unread count for top navbar icon badge
router.get('/unread-count', protect, async (req, res) => {
  try {
    const unreadCount = await DirectMessage.countDocuments({
      recipient: req.user._id,
      isRead: false
    });
    res.json({ unreadCount });
  } catch (err) {
    console.error('Error fetching unread messages count:', err);
    res.status(500).json({ unreadCount: 0 });
  }
});

// --- GET /api/messages/conversation/:userId ---
// Get paginated chat history with a specific contact and mark messages as read
router.get('/conversation/:targetUserId', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.targetUserId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const targetUser = await User.findById(targetUserId).select('name email role profilePicture grade department');
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Retrieve messages between the two users
    const query = {
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId }
      ]
    };

    const totalMessages = await DirectMessage.countDocuments(query);
    const messages = await DirectMessage.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name email role profilePicture')
      .populate('recipient', 'name email role profilePicture');

    // Mark messages sent by targetUser to currentUserId as read
    await DirectMessage.updateMany(
      { sender: targetUserId, recipient: currentUserId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    res.json({
      targetUser,
      messages: messages.reverse(), // Chronological order
      totalMessages,
      page,
      hasMore: totalMessages > skip + messages.length
    });
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ message: 'Failed to load conversation messages.' });
  }
});

// --- POST /api/messages/send ---
// Send message with text & optional attachment file upload
router.post('/send', protect, upload.single('attachment'), async (req, res) => {
  try {
    const { recipientId, content } = req.body;

    if (!recipientId) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: 'Recipient user ID is required.' });
    }

    const recipientUser = await User.findById(recipientId);
    if (!recipientUser) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'Recipient user not found.' });
    }

    // Perform Server-Side Permission Check
    const allowed = await canUserSendMessage(req.user, recipientUser);
    if (!allowed) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(403).json({
        message: `Communication rule restriction: ${req.user.role.toUpperCase()} users are not allowed to send direct messages to ${recipientUser.role.toUpperCase()} users.`
      });
    }

    let attachments = [];

    if (req.file) {
      const file = req.file;
      const isImage = file.mimetype.startsWith('image/');
      const maxImageSize = 2 * 1024 * 1024; // 2MB
      const maxDocSize = 5 * 1024 * 1024; // 5MB

      if (isImage && file.size > maxImageSize) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ message: 'Image attachment size exceeds the maximum limit of 2MB.' });
      }

      if (!isImage && file.size > maxDocSize) {
        fs.unlinkSync(file.path);
        return res.status(400).json({ message: 'Document attachment size exceeds the maximum limit of 5MB.' });
      }

      const fileUrl = `/uploads/messages/${file.filename}`;
      attachments.push({
        url: fileUrl,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        category: isImage ? 'image' : 'document'
      });
    }

    const messageText = content ? content.trim() : '';

    if (!messageText && attachments.length === 0) {
      return res.status(400).json({ message: 'Message must contain text content or an attachment.' });
    }

    const newMsg = await DirectMessage.create({
      sender: req.user._id,
      recipient: recipientUser._id,
      content: messageText,
      attachments: attachments,
      isRead: false
    });

    const populatedMsg = await DirectMessage.findById(newMsg._id)
      .populate('sender', 'name email role profilePicture')
      .populate('recipient', 'name email role profilePicture');

    // Send email notification to recipient (WITHOUT message content!)
    if (recipientUser.email) {
      sendMessageNotificationEmail(
        recipientUser.email,
        recipientUser.name,
        req.user.name
      ).catch(err => console.error('Failed to trigger async email notification:', err));
    }

    res.status(201).json({ message: populatedMsg });
  } catch (err) {
    console.error('Error sending direct message:', err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Failed to send direct message.' });
  }
});

// --- PUT /api/messages/mark-read/:senderId ---
router.put('/mark-read/:senderId', protect, async (req, res) => {
  try {
    const senderId = req.params.senderId;
    await DirectMessage.updateMany(
      { sender: senderId, recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ message: 'Messages marked as read.' });
  } catch (err) {
    console.error('Error marking messages as read:', err);
    res.status(500).json({ message: 'Failed to mark messages as read.' });
  }
});

// --- DELETE /api/messages/:messageId ---
// Delete a specific message (sender or admin only)
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const messageId = req.params.messageId;
    const msg = await DirectMessage.findById(messageId);

    if (!msg) {
      return res.status(404).json({ message: 'Message not found.' });
    }

    // Only sender or Admin can delete a message
    const isSender = msg.sender.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isSender && !isAdmin) {
      return res.status(403).json({ message: 'You are not authorized to delete this message.' });
    }

    // Delete attached files from disk if present
    if (msg.attachments && msg.attachments.length > 0) {
      for (const att of msg.attachments) {
        if (att.url && att.url.startsWith('/uploads/messages/')) {
          const relativePath = att.url.replace(/^\//, '');
          const filePath = path.join(__dirname, '..', relativePath);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (unlinkErr) {
              console.error('Failed to delete message attachment file:', unlinkErr);
            }
          }
        }
      }
    }

    await DirectMessage.findByIdAndDelete(messageId);

    res.json({ message: 'Message deleted successfully.', deletedId: messageId });
  } catch (err) {
    console.error('Error deleting direct message:', err);
    res.status(500).json({ message: 'Failed to delete message.' });
  }
});

// --- DELETE /api/messages/conversation/:targetUserId ---
// Delete an entire conversation thread between current user and target user
router.delete('/conversation/:targetUserId', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.targetUserId;

    // Find all messages in the conversation
    const messages = await DirectMessage.find({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId }
      ]
    });

    // Clean up file attachments from disk
    for (const msg of messages) {
      if (msg.attachments && msg.attachments.length > 0) {
        for (const att of msg.attachments) {
          if (att.url && att.url.startsWith('/uploads/messages/')) {
            const relativePath = att.url.replace(/^\//, '');
            const filePath = path.join(__dirname, '..', relativePath);
            if (fs.existsSync(filePath)) {
              try {
                fs.unlinkSync(filePath);
              } catch (unlinkErr) {
                console.error('Failed to delete attachment file during conversation purge:', unlinkErr);
              }
            }
          }
        }
      }
    }

    // Delete all messages in conversation
    await DirectMessage.deleteMany({
      $or: [
        { sender: currentUserId, recipient: targetUserId },
        { sender: targetUserId, recipient: currentUserId }
      ]
    });

    res.json({ message: 'Conversation deleted successfully.', targetUserId });
  } catch (err) {
    console.error('Error deleting conversation:', err);
    res.status(500).json({ message: 'Failed to delete conversation.' });
  }
});

module.exports = router;


