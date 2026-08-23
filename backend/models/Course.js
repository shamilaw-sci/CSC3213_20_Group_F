const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  text: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const gradeSchema = new mongoose.Schema({
  gradeNumber: { type: String, required: true },
  title: { type: String, trim: true, default: '' },
  fee: { type: Number, default: 2500 },
  status: { type: String, enum: ['active', 'deactive'], default: 'active' },
  isActive: { type: Boolean, default: true },
  deactivatedBy: { type: String, default: null },
  previousStatus: { type: String, default: null },
  messages: [messageSchema]
});

const classSchema = new mongoose.Schema({
  className: { type: String, required: true },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
});

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  banner: {
    type: String,
    default: ""
  },
  cardImage: {
    type: String,
    default: ""
  },
  price: {
    type: Number,
    default: 2500
  },
  studentType: {
    type: String,
    enum: ['all', 'online', 'physical'],
    default: 'all'
  },
  status: { type: String, enum: ['active', 'deactive'], default: 'active' },
  isActive: { type: Boolean, default: true },
  deactivatedBy: { type: String, default: null },
  enrolledGrades: [gradeSchema],
  classes: [classSchema],
  bankDetails: {
    bankName: { type: String, trim: true, default: '' },
    accountName: { type: String, trim: true, default: '' },
    accountNumber: { type: String, trim: true, default: '' },
    branchName: { type: String, trim: true, default: '' },
    paymentInstructions: { type: String, trim: true, default: '' }
  },
  enrolledStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, {
  timestamps: true
});

courseSchema.index({ instructor: 1 });
courseSchema.index({ enrolledStudents: 1 });
courseSchema.index({ status: 1 });

module.exports = mongoose.model('Course', courseSchema);