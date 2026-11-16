/**
 * @file TeacherAvailability.js
 * @description Teacher Availability Model Schema. Stores weekly recurring office hours, time slots, and meeting availability defined by instructors for student consultation.
 */

const mongoose = require('mongoose');

const TeacherAvailabilitySchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: false
  },
  date: {
    type: String, // format "YYYY-MM-DD" for specific-date leave or special availability
    required: false,
    default: null
  },
  startTime: {
    type: String, // e.g. "08:00 AM" or "08:00"
    required: true
  },
  endTime: {
    type: String, // e.g. "05:00 PM" or "17:00"
    required: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  slotType: {
    type: String,
    enum: ['available', 'unavailable', 'leave', 'preferred'],
    default: 'available'
  },
  reason: {
    type: String,
    trim: true,
    default: ''
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  }
}, { timestamps: true });

TeacherAvailabilitySchema.index({ teacherId: 1, dayOfWeek: 1 });
TeacherAvailabilitySchema.index({ teacherId: 1, date: 1 });

module.exports = mongoose.model('TeacherAvailability', TeacherAvailabilitySchema);
