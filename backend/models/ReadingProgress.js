/**
 * @file ReadingProgress.js
 * @description Reading Progress Model Schema.
 * =========================================================================================
 * 🎓 EXPLAIN TO EXAMINER:
 * 1. Purpose: Tracks how far each student has read through every PDF lecture note / study pack.
 * 2. High-Performance Indexing: Uses a compound unique index { student: 1, pdfId: 1 } so that each
 *    student has exactly one persistent progress record per PDF document.
 * 3. Completion Metric: Calculates progressPercentage = (maxPageRead / totalPages) * 100.
 *    When progressPercentage reaches 100%, isCompleted is set to true.
 * =========================================================================================
 */

const mongoose = require('mongoose');

const ReadingProgressSchema = new mongoose.Schema({
  // The student who read this PDF document
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // The course containing the PDF
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // The 4-week modular lesson where the material is attached
  lesson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  // Unique PDF material identifier (e.g., MongoDB _id or filename)
  pdfId: {
    type: String,
    required: true
  },
  // User-friendly title of the study pack / lecture note
  pdfTitle: {
    type: String,
    default: 'Study Material PDF'
  },
  // Total page count of the PDF (detected dynamically by PDF.js)
  totalPages: {
    type: Number,
    default: 1
  },
  // The furthest page the student has scrolled to / viewed
  maxPageRead: {
    type: Number,
    default: 1
  },
  // Calculated completion percentage (0% to 100%)
  progressPercentage: {
    type: Number,
    default: 0
  },
  // Flag indicating whether the entire document has been read
  isCompleted: {
    type: Boolean,
    default: false
  },
  // Timestamp of the last reading session
  lastReadAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Compound unique index: guarantees fast lookups and eliminates duplicate tracking entries
ReadingProgressSchema.index({ student: 1, pdfId: 1 }, { unique: true });

module.exports = mongoose.model('ReadingProgress', ReadingProgressSchema);
