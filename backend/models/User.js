const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    type: String, 
    unique: true, 
    sparse: true, 
    lowercase: true, 
    trim: true,
    default: undefined 
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
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
    default: ''
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
  role: { type: String, enum: ['student', 'teacher', 'admin', 'counter_staff', 'parent'], default: 'student' },
  linkedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
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
  coverPicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  qualifications: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    default: 'Academic Faculty'
  },
  phoneNumber: {
    type: String,
    default: ''
  },
  teacherTags: {
    type: [String],
    default: ['🎓 Instructor', '✔ Verified Educator']
  },
  resetPasswordToken: {
    type: String,
    default: ''
  },
  resetPasswordExpires: {
    type: Date
  },
  activeSessionId: {
    type: String,
    default: null
  }
}, { timestamps: true }); 

module.exports = mongoose.model('User', UserSchema);
