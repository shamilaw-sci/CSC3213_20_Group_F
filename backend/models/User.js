const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    required: function () {
      return this.role === 'student' && this.studentType === 'physical';
    }
  },
  parentsPhoneNumber: {
    type: String,
    trim: true,
    required: function () {
      return this.role === 'student';
    }
  },
  grade: {
    type: String,
    required: function () {
      return this.role === 'student';
    }
  },
  dateOfBirth: {
    type: Date
  },
  nicNumber: {
    type: String,
    trim: true,
    default: ''
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin', 'counter_staff'], default: 'student' },
  studentType: {
    type: String,
    enum: ['physical', 'online'],
    default: 'physical'
  },
  mustChangePassword: { 
    type: Boolean, 
    default: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  resetPasswordToken: {
    type: String,
    default: ''
  },
  resetPasswordExpires: {
    type: Date
  }
}, { timestamps: true }); 

module.exports = mongoose.model('User', UserSchema);
