const multer = require('multer');
const path = require('path');
const { getCategoryDir } = require('../services/fileStorage');

const ALLOWED_MIMES = {
  lessons: ['application/pdf'],
  assignments: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed'
  ],
  submissions: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'application/x-zip-compressed'
  ],
  quizzes: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/svg+xml'
  ],
  messages: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/zip',
    'audio/mpeg',
    'audio/wav',
    'audio/mp4',
    'audio/ogg'
  ],
  'live-chat': [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/webm',
    'video/webm',
    'audio/ogg',
    'audio/wav',
    'audio/mp4',
    'audio/mpeg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  payments: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
};

const SIZE_LIMITS = {
  lessons: 20 * 1024 * 1024,      // 20MB
  assignments: 15 * 1024 * 1024,  // 15MB
  submissions: 25 * 1024 * 1024,  // 25MB
  quizzes: 2 * 1024 * 1024,       // 2MB
  messages: 10 * 1024 * 1024,     // 10MB
  'live-chat': 10 * 1024 * 1024,  // 10MB
  payments: 5 * 1024 * 1024       // 5MB
};

/**
 * Creates a Multer upload instance for a specific private category
 * @param {string} category 
 * @returns {multer.Multer}
 */
function createPrivateUpload(category) {
  const targetDir = getCategoryDir(category);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, targetDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const safePrefix = category.replace(/[^a-zA-Z0-9]/g, '_');
      cb(null, `${safePrefix}-${uniqueSuffix}${ext}`);
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowed = ALLOWED_MIMES[category] || [];
    // If no specific allowlist exists, allow standard non-executable binaries
    if (allowed.length === 0 || allowed.includes(file.mimetype)) {
      return cb(null, true);
    }
    return cb(new Error(`Invalid file type (${file.mimetype}) for ${category} upload.`));
  };

  const limits = {
    fileSize: SIZE_LIMITS[category] || 10 * 1024 * 1024
  };

  return multer({ storage, fileFilter, limits });
}

// Pre-configured upload middleware instances
const privateUploaders = {
  lessons: createPrivateUpload('lessons'),
  assignments: createPrivateUpload('assignments'),
  submissions: createPrivateUpload('submissions'),
  quizzes: createPrivateUpload('quizzes'),
  messages: createPrivateUpload('messages'),
  liveChat: createPrivateUpload('live-chat'),
  payments: createPrivateUpload('payments')
};

module.exports = {
  createPrivateUpload,
  ...privateUploaders
};
