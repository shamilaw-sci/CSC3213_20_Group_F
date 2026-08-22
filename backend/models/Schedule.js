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
  }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', ScheduleSchema);
