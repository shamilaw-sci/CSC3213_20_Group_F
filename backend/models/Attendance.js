const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  scheduleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule',
    required: false
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: false
  },
  remarks: {
    type: String,
    trim: true,
    required: false
  },
  weekNumber: {
    type: Number,
    enum: [1, 2, 3, 4],
    required: false
  },
  month: {
    type: String,
    required: false
  },
  mode: {
    type: String,
    enum: ['ONLINE_WEEKLY', 'PHYSICAL_COUNTER', 'CLASS_SCHEDULE', 'PHYSICAL_QR'],
    default: 'CLASS_SCHEDULE'
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Late'],
    default: 'Present'
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  notificationSentParent: {
    type: Boolean,
    default: false
  },
  notificationSentStudent: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

// Compound unique index for weekly online attendance
AttendanceSchema.index({ studentId: 1, courseId: 1, weekNumber: 1, month: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
