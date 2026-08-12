const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  // Admin විසින් තෝරන ශ්‍රේණිය (Grade 6-11)
  grade: {
    type: String,
    required: true
  },
  // මෙම ශ්‍රේණිය අයිති වන පාඨමාලාව (Course)
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  // ගුරුවරයා විසින් දමන පණිවිඩය (Teacher's Message)
  teacherMessage: {
    type: String,
    trim: true,
    default: "මෙම ශ්‍රේණිය සඳහා ගුරුවරයාගෙන් පණිවිඩයක් නැත."
  },
  videoLessons: [{
    title: String,
    url: String,
    weekNumber: { type: Number, enum: [1, 2, 3, 4], default: 1 }
  }],
  pdfMaterials: [{
    title: { type: String, required: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    weekNumber: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    uploadedAt: { type: Date, default: Date.now }
  }],
  assignments: [{
    title: { type: String, required: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    weekNumber: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    uploadedAt: { type: Date, default: Date.now }
  }],
  hideDemoVideo: { type: Boolean, default: false },
  hideDemoPdf: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Lesson', lessonSchema);