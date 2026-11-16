/**
 * @file ReadingProgress.js
 * @description Reading Progress Model Schema. Tracks student reading engagement with course PDF documents, storing last read page number, maximum page reached, total pages, and completion percentage.
 */

const mongoose = require('mongoose');

const ReadingProgressSchema = new mongoose.Schema({
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
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  pdfId: {
    type: String,
    required: true
  },
  pdfTitle: {
    type: String,
    default: 'Study Material PDF'
  },
  totalPages: {
    type: Number,
    default: 1
  },
  maxPageRead: {
    type: Number,
    default: 1
  },
  progressPercentage: {
    type: Number,
    default: 0
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Ensure unique progress record per student per PDF document
ReadingProgressSchema.index({ student: 1, pdfId: 1 }, { unique: true });

module.exports = mongoose.model('ReadingProgress', ReadingProgressSchema);
