const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    required: function () {
      return this.role === 'student';
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
    type: Number,
    min: 6,
    max: 11,
    required: function () {
      return this.role === 'student';
    }
  },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher', 'admin'], default: 'student' },
  mustChangePassword: { 
    type: Boolean, 
    default: false 
  }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);