/**
 * @file upload.js
 * @description General image upload middleware for public course banners, thumbnails, and media.
 * Stores files in the courses storage directory with allowed image MIME validation and a 5MB size limit.
 */

const multer = require('multer');
const path = require('path');
const { getCategoryDir } = require('../services/fileStorage');

const uploadDir = getCategoryDir('courses');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // e.g. banner-1720340000000.jpg
    const prefix = file.fieldname || 'course';
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif|svg/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF, SVG) are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB per file
});

module.exports = upload;
