const mongoose = require('mongoose');

const enrollmentSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  className: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Suspended', 'Completed'],
    default: 'Active'
  }
}, {
  timestamps: true
});

// Compound unique index to prevent duplicate enrollments in the same class
enrollmentSchema.index({ studentId: 1, courseId: 1, className: 1 }, { unique: true });

module.exports = mongoose.model('Enrollment', enrollmentSchema);
