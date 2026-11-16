/**
 * @file Schedule.js
 * @description Schedule Model Schema. Represents class timetables and live stream sessions, including course reference, date, start/end times, hall/room allocations, YouTube live stream IDs, and active viewer status.
 */

const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  className: {
    type: String,
    required: true, // e.g. "Grade 10" or "Grade 12 Science"
    trim: true
  },
  dayOfWeek: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    required: true
  },
  startTime: {
    type: String, // format "HH:MM AM/PM" or "HH:MM"
    required: true
  },
  endTime: {
    type: String,
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  room: {
    type: String,
    trim: true,
    default: 'Main Hall'
  },
  eventType: {
    type: String,
    enum: ['class', 'examination', 'event', 'deadline'],
    default: 'class'
  },
  date: {
    type: String, // Optional specific date: "YYYY-MM-DD"
    default: null
  },
  status: {
    type: String,
    enum: ['scheduled', 'postponed', 'rescheduled', 'cancelled'],
    default: 'scheduled'
  },
  postponeReason: {
    type: String,
    trim: true,
    default: ''
  },
  rescheduledTo: {
    date: { type: String, default: '' },
    dayOfWeek: { type: String, default: '' },
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    room: { type: String, default: '' }
  },
  subject: {
    type: String,
    trim: true,
    default: ''
  },
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);
