const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  month: {
    type: String
  },
  year: {
    type: Number,
    default: () => new Date().getFullYear()
  },
  paymentType: {
    type: String,
    enum: ['ENROLLMENT', 'MONTHLY_FEE'],
    default: 'MONTHLY_FEE'
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'LKR'
  },
  enrollmentDate: {
    type: Date,
    default: Date.now
  },
  paymentMethod: {
    type: String,
    enum: ['CARD', 'Card_Mock', 'CASH_COUNTER', 'BANK_SLIP', 'POS_CARD', 'BANK_TRANSFER'],
    default: 'CARD'
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'PENDING_APPROVAL', 'COMPLETED', 'FAILED', 'REJECTED'],
    default: 'COMPLETED'
  },
  cardLastFour: {
    type: String,
    default: '0000'
  },
  slipImage: {
    type: String,
    default: ''
  },
  depositorName: {
    type: String,
    default: ''
  },
  depositDate: {
    type: Date
  },
  rejectionReason: {
    type: String,
    default: ''
  },
  paymentDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

paymentSchema.index({ student: 1, course: 1, month: 1, year: 1, status: 1 });

const Payment = mongoose.model('Payment', paymentSchema);

// Drop legacy MongoDB index if it exists to prevent E11000 duplicate key errors
Payment.collection.dropIndex('studentId_1_courseId_1_month_1').catch(() => {
  // Ignore error if index doesn't exist
});

module.exports = Payment;
