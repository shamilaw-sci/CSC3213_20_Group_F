const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  mustChangePassword: { 
    type: Boolean, 
    default: false // Existing users don't need this
  }
}, { timestamps: true }); 

module.exports = mongoose.model('User', UserSchema);