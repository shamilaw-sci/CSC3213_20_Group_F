const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null if broadcast to role/all
  },
  recipientRole: {
    type: String,
    enum: ['all', 'student', 'teacher', 'admin', 'parent'],
    default: null
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    enum: [
      'PAYMENT',
      'REGISTRATION',
      'ATTENDANCE',
      'COURSE_ADDED',
      'NEW_CONTENT',
      'LIVE_CLASS',
      'CLASS_POSTPONED',
      'GENERAL'
    ],
    default: 'GENERAL'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  link: {
    type: String,
    default: ''
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  channels: [{
    type: String,
    enum: ['in_app', 'sms', 'email'],
    default: ['in_app']
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

// Index for efficient querying by recipient and role
NotificationSchema.index({ recipient: 1, recipientRole: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
