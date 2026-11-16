/**
 * @file OTP.js
 * @description One-Time Password (OTP) Model Schema. Stores temporary 6-digit SMS verification codes with automatic TTL expiration for secure registration and card checkout verification.
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  email: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  otpCode: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 Minutes Expiry
  }
});

// MongoDB TTL Index: Document will be automatically removed after expiresAt date
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
