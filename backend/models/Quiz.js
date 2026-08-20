const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: { type: String, default: '' },
  questionImage: { type: String, default: '' }, // URL or path to uploaded diagram/image (<1MB)
  questionType: { 
    type: String, 
    enum: ['mcq', 'multiple', 'true_false'], 
    default: 'mcq' 
  },
  options: [{ type: String, required: true }],
  correctAnswer: { type: Number, default: 0 }, // 0-based index for mcq & true_false
  correctAnswers: [{ type: Number }], // Array of 0-based indices for multiple-select
  points: { type: Number, default: 1 },
  explanation: { type: String, default: '' } // Post-submission explanation/rationale
});

const quizSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  grade: { type: String, required: true },
  month: { type: String, default: '' }, // e.g. 'January', 'February'
  weekNumber: { type: Number, enum: [0, 1, 2, 3, 4], default: 1 }, // 0 = All Weeks / General Assessment
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timeLimit: { type: Number, default: 0 }, // in minutes, 0 means no time limit
  passingPercentage: { type: Number, default: 50 },
  questions: [questionSchema],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

module.exports = mongoose.model('Quiz', quizSchema);
