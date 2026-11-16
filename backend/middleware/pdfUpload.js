/**
 * @file pdfUpload.js
 * @description Multer upload middleware configured specifically for lesson PDF documents.
 * Handles storage destination in lessons directory, generates unique file names,
 * validates PDF MIME types, and enforces a 15MB file size limit.
 */

const multer = require('multer');
const path = require('path');
const { getCategoryDir } = require('../services/fileStorage');

const uploadDir = getCategoryDir('lessons');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `lesson-pdf-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (file.mimetype === 'application/pdf' || ext === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed.'), false);
  }
};

const pdfMulter = multer({
  storage,
  fileFilter,
  limits: { fileSize: 15 * 1024 * 1024 } // 15 MB per file
});

const uploadPdfMiddleware = (req, res, next) => {
  pdfMulter.single('pdf')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: "Cannot upload file. The maximum allowed size is 15MB." });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

module.exports = uploadPdfMiddleware;
