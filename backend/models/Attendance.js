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
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  date: {
    type: Date,
    required: true
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

// Compound unique index: student can have only one attendance record per schedule on any single day
AttendanceSchema.index({ studentId: 1, scheduleId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
