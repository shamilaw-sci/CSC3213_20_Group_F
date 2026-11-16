/**
 * @file DirectMessage.js
 * @description Direct Message Model Schema. Manages 1-on-1 private messaging between students, teachers, and parents, including text content, audio voice notes, file attachments, and read receipts.
 */

const mongoose = require('mongoose');

const DirectMessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    trim: true,
    default: ''
  },
  attachments: [
    {
      url: { type: String, required: true },
      originalName: { type: String, required: true },
      fileType: { type: String, required: true },
      fileSize: { type: Number, required: true },
      category: { type: String, enum: ['image', 'document'], required: true }
    }
  ],
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for high performance conversation loading and unread counters
DirectMessageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
DirectMessageSchema.index({ recipient: 1, isRead: 1 });

module.exports = mongoose.model('DirectMessage', DirectMessageSchema);
