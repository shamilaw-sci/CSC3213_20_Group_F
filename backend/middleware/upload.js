const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // e.g. banner-1720340000000.jpg
    const prefix = file.fieldname; // 'banner' or 'cardImage'
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${prefix}-${Date.now()}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|webp|gif/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (jpeg, png, webp, gif) are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB per file
});

module.exports = upload;
