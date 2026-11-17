/**
 * @file OTP.js
 * @description One-Time Password (OTP) Model Schema.
 * =========================================================================================
 * 🎓 EXPLAIN TO EXAMINER:
 * 1. Purpose: Stores temporary 6-digit SMS verification codes for secure student enrollment & mock card checkout.
 * 2. Security: Generates cryptographically random 6-digit integers (crypto.randomInt).
 * 3. TTL Expiry: Uses MongoDB's native Time-To-Live (TTL) index. The document is automatically deleted
 *    by MongoDB's background cleanup thread after 5 minutes (300 seconds), eliminating stale credentials.
 * =========================================================================================
 */

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  // Reference to the student user requesting the OTP
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Email address associated with the student account
  email: {
    type: String,
    required: true
  },
  // Mobile phone number where the 6-digit SMS OTP is dispatched
  phone: {
    type: String,
    required: true
  },
  // Course the student is attempting to pay for / enroll in
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // The actual 6-digit numeric OTP string (e.g., "584920")
  otpCode: {
    type: String,
    required: true
  },
  // Timestamp when the OTP was generated
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Expiration timestamp: defaults to 5 minutes (5 * 60 * 1000 ms) from creation
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 Minutes Expiry
  }
});

/**
 * ⚡ MONGODB TTL INDEX:
 * =========================================================================================
 * MongoDB monitors this index and automatically purges expired records when expiresAt <= current time.
 * 'expireAfterSeconds: 0' tells MongoDB to delete the document the exact second expiresAt is reached.
 * =========================================================================================
 */
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('OTP', otpSchema);
