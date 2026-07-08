const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const gradeSchema = new mongoose.Schema({
  gradeNumber: { type: Number, required: true }, // e.g., 6, 7, 8, 9, 10, 11
  title: { type: String, trim: true, default: '' },
  messages: [messageSchema] // List of messages for this specific grade
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  banner: {
    type: String,
    default: ""
  },
  cardImage: {
    type: String,
    default: ""
  },
  enrolledGrades: [gradeSchema],
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Course', courseSchema);