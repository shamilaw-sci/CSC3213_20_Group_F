const mongoose = require('mongoose');

const lessonSchema = new mongoose.Schema({
  // Admin විසින් තෝරන ශ්‍රේණිය (Grade 6-11)
  grade: {
    type: Number,
    required: true,
    min: 6,
    max: 11
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
  }]
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Lesson', lessonSchema);