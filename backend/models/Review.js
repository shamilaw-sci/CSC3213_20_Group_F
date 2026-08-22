const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    trim: true,
    default: ''
  },
  courseTitle: {
    type: String,
    trim: true,
    default: ''
  },
  studentName: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// Ensure each student can have only one active review per course (they can edit/update it)
reviewSchema.index({ course: 1, student: 1 }, { unique: true });
reviewSchema.index({ teacher: 1, createdAt: -1 });
reviewSchema.index({ course: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
