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
  // පසුව වීඩියෝ පාඩම් එක් කිරීමට ඉඩ තැබීම (දැනට අවශ්‍ය නැත)
  videoLessons: [{
    title: String,
    url: String
  }],
  pdfMaterials: [{
    title: { type: String, required: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Lesson', lessonSchema);