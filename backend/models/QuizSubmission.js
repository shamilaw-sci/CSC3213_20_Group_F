/**
 * @file QuizSubmission.js
 * @description Quiz Submission Model Schema. Records student quiz attempts, submitted answers, automatic scoring results, percentage achieved, pass/fail status, and attempt duration.
 */

const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: mongoose.Schema.Types.Mixed }], // Selected option index (Number) or array of indices ([Number]) for multi-select
  score: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);
