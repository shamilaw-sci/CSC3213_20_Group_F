const mongoose = require('mongoose');

const quizSubmissionSchema = new mongoose.Schema({
  quiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  answers: [{ type: Number }], // Selected option index for each question
  score: { type: Number, required: true },
  totalPoints: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

module.exports = mongoose.model('QuizSubmission', quizSubmissionSchema);
