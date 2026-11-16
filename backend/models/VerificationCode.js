/**
 * @file VerificationCode.js
 * @description Verification Code Model Schema. Handles email and phone account verification tokens, password reset tokens, and expiry timeframes.
 */

const mongoose = require('mongoose');

const verificationCodeSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  code: {
    type: String,
    required: true,
    trim: true
  },
  purpose: {
    type: String,
    enum: ['registration', 'forgot_password', 'add_email'],
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'phone'],
    default: 'email'
  },
  payload: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 10 * 60 * 1000) // 10 Minutes TTL
  }
});

// TTL index to automatically remove expired verification records
verificationCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('VerificationCode', verificationCodeSchema);
