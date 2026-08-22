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
  liveStream: {
    isLive: { type: Boolean, default: false },
    isScheduled: { type: Boolean, default: false },
    scheduledStartTime: { type: Date },
    title: { type: String, default: '' },
    youtubeUrl: { type: String, default: '' },
    thumbnail: { type: String, default: '' },
    startedAt: { type: Date },
    endedAt: { type: Date },
    viewers: [{
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      email: { type: String },
      registrationNumber: { type: String },
      avatar: { type: String },
      grade: { type: String },
      joinedAt: { type: Date, default: Date.now },
      lastPing: { type: Date, default: Date.now },
      isPlaying: { type: Boolean, default: true },
      watchedSeconds: { type: Number, default: 0 }
    }],
    liveMessages: [{
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      senderName: { type: String, required: true },
      senderRole: { type: String, enum: ['student', 'teacher', 'instructor', 'admin', 'superadmin'], required: true },
      senderAvatar: { type: String, default: '' },
      studentContext: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Student whose private thread this is, or null for broadcast
      recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Target student for teacher replies
      isBroadcast: { type: Boolean, default: false }, // Teacher/Admin broadcast to all students
      isStaffOnly: { type: Boolean, default: false }, // Private Admin <-> Teacher message (hidden from students)
      text: { type: String, default: '', trim: true },
      attachments: [{
        url: { type: String },
        originalName: { type: String },
        fileType: { type: String },
        fileSize: { type: Number },
        duration: { type: Number, default: 0 },
        category: { type: String, enum: ['image', 'document', 'audio'] }
      }],
      createdAt: { type: Date, default: Date.now }
    }],
    liveSpeaking: {
      activeSpeaker: {
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        avatar: { type: String },
        approvedAt: { type: Date },
        isLive: { type: Boolean, default: false }
      },
      requests: [{
        student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        name: { type: String },
        avatar: { type: String },
        grade: { type: String },
        status: { type: String, enum: ['pending', 'approved', 'rejected', 'ended'], default: 'pending' },
        requestedAt: { type: Date, default: Date.now },
        respondedAt: { type: Date },
        latestAudioChunkUrl: { type: String }
      }]
    },
    feedbacks: [{
      student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String },
      email: { type: String },
      grade: { type: String },
      avatar: { type: String },
      message: { type: String, default: '' },
      question: { type: String, default: '' },
      reaction: { type: String, default: 'superb' },
      reactionLabel: { type: String, default: 'Superb Class' },
      reactionEmoji: { type: String, default: '⭐' },
      submittedAt: { type: Date, default: Date.now },
      reply: {
        text: { type: String },
        repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        repliedAt: { type: Date }
      }
    }]
  },
  videoLessons: [{
    title: String,
    url: String,
    weekNumber: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    allowDownload: { type: Boolean, default: true },
    downloadUnlockDate: { type: Date, default: null },
    downloadDelayType: { type: String, enum: ['immediate', 'one_month', 'custom_date', 'disabled'], default: 'immediate' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  pdfMaterials: [{
    title: { type: String, required: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    weekNumber: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    allowDownload: { type: Boolean, default: true },
    downloadUnlockDate: { type: Date, default: null },
    downloadDelayType: { type: String, enum: ['immediate', 'one_month', 'custom_date', 'disabled'], default: 'immediate' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  assignments: [{
    title: { type: String, required: true },
    filename: { type: String, required: true },
    fileUrl: { type: String, required: true },
    fileSize: { type: Number },
    weekNumber: { type: Number, enum: [1, 2, 3, 4], default: 1 },
    allowDownload: { type: Boolean, default: true },
    downloadUnlockDate: { type: Date, default: null },
    downloadDelayType: { type: String, enum: ['immediate', 'one_month', 'custom_date', 'disabled'], default: 'immediate' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  hideDemoVideo: { type: Boolean, default: false },
  hideDemoPdf: { type: Boolean, default: false }
}, { 
  timestamps: true 
});

lessonSchema.index({ course: 1, grade: 1 });
lessonSchema.index({ course: 1 });

module.exports = mongoose.model('Lesson', lessonSchema);