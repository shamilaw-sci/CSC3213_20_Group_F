/**
 * @file Assignment.js
 * @description Assignment Model Schema. Defines homework/course assignments with title, description, attachments, maximum marks, deadline dates, grade, month/week modular blocks, and late submission settings.
 */

const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Assignment title is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
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
  month: {
    type: String,
    default: '' // e.g. 'August', 'September', or empty for all months
  },
  weekNumber: {
    type: Number,
    default: 0 // 0 = general / all weeks, 1 = Week 1, 2 = Week 2, 3 = Week 3, 4 = Week 4
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Teacher's attached question sheet / resource file
  attachmentUrl: {
    type: String,
    default: ''
  },
  attachmentName: {
    type: String,
    default: ''
  },
  attachmentSize: {
    type: Number,
    default: 0
  },
  maxMarks: {
    type: Number,
    default: 100
  },
  passingMarks: {
    type: Number,
    default: 50
  },
  dueDate: {
    type: Date,
    default: null
  },
  allowLateSubmissions: {
    type: Boolean,
    default: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

assignmentSchema.index({ course: 1, grade: 1, month: 1, weekNumber: 1 });

module.exports = mongoose.model('Assignment', assignmentSchema);
