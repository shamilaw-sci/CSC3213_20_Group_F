const mongoose = require('mongoose');

const assignmentSubmissionSchema = new mongoose.Schema({
  assignment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assignment',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  // Student submitted solution file
  fileUrl: {
    type: String,
    required: [true, 'Submission file is required']
  },
  fileName: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    default: 0
  },
  studentNote: {
    type: String,
    trim: true,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  isLate: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['submitted', 'graded', 'resubmission_requested'],
    default: 'submitted'
  },
  marks: {
    type: Number,
    default: null
  },
  feedback: {
    type: String,
    trim: true,
    default: ''
  },
  gradedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  gradedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Ensure a student has at most one active submission document per assignment
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });
assignmentSubmissionSchema.index({ student: 1, submittedAt: -1 });

module.exports = mongoose.model('AssignmentSubmission', assignmentSubmissionSchema);
