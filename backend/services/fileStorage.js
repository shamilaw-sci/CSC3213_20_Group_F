const path = require('path');
const fs = require('fs');

// Root storage directory (defaults to backend/storage or custom path)
const STORAGE_ROOT = process.env.STORAGE_PATH 
  ? path.resolve(process.env.STORAGE_PATH) 
  : path.resolve(__dirname, '../storage');

const PUBLIC_DIR = path.join(STORAGE_ROOT, 'public');
const PRIVATE_DIR = path.join(STORAGE_ROOT, 'private');

const CATEGORIES = {
  // Public categories
  courses: { base: PUBLIC_DIR, sub: 'courses', isPrivate: false },
  profiles: { base: PUBLIC_DIR, sub: 'profiles', isPrivate: false },
  
  // Private categories
  lessons: { base: PRIVATE_DIR, sub: 'lessons', isPrivate: true },
  assignments: { base: PRIVATE_DIR, sub: 'assignments', isPrivate: true },
  submissions: { base: PRIVATE_DIR, sub: 'submissions', isPrivate: true },
  quizzes: { base: PRIVATE_DIR, sub: 'quizzes', isPrivate: true },
  messages: { base: PRIVATE_DIR, sub: 'messages', isPrivate: true },
  'live-chat': { base: PRIVATE_DIR, sub: 'live-chat', isPrivate: true },
  payments: { base: PRIVATE_DIR, sub: 'payments', isPrivate: true }
};

// MIME Types lookup
const MIME_TYPES = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.zip': 'application/zip',
  '.txt': 'text/plain'
};

/**
 * Initialize storage directory structure
 */
function initStorage() {
  if (!fs.existsSync(STORAGE_ROOT)) {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  }
  if (!fs.existsSync(PUBLIC_DIR)) {
    fs.mkdirSync(PUBLIC_DIR, { recursive: true });
  }
  if (!fs.existsSync(PRIVATE_DIR)) {
    fs.mkdirSync(PRIVATE_DIR, { recursive: true });
  }

  for (const cat of Object.values(CATEGORIES)) {
    const dir = path.join(cat.base, cat.sub);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

/**
 * Get category target directory
 * @param {string} category 
 * @returns {string}
 */
function getCategoryDir(category) {
  const cat = CATEGORIES[category];
  if (!cat) {
    throw new Error(`Unknown storage category: ${category}`);
  }
  const dir = path.join(cat.base, cat.sub);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Resolve and validate file path preventing directory traversal
 * @param {string} category 
 * @param {string} rawFilename 
 * @returns {string}
 */
function resolveFilePath(category, rawFilename) {
  if (!rawFilename || typeof rawFilename !== 'string') {
    throw new Error('Filename must be a non-empty string');
  }

  const catDir = getCategoryDir(category);
  const cleanFilename = path.basename(rawFilename.replace(/\\/g, '/'));
  const targetPath = path.resolve(catDir, cleanFilename);

  // Security check: Must reside within category directory
  if (!targetPath.startsWith(catDir)) {
    throw new Error('Directory traversal attempt detected');
  }

  return targetPath;
}

/**
 * Check if file exists
 * @param {string} category 
 * @param {string} rawFilename 
 * @returns {boolean}
 */
function fileExists(category, rawFilename) {
  try {
    const filePath = resolveFilePath(category, rawFilename);
    return fs.existsSync(filePath);
  } catch (err) {
    return false;
  }
}

/**
 * Delete a file safely
 * @param {string} category 
 * @param {string} rawFilename 
 * @returns {boolean}
 */
function deleteFile(category, rawFilename) {
  try {
    const filePath = resolveFilePath(category, rawFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`Error deleting file [${category}/${rawFilename}]:`, err.message);
    return false;
  }
}

/**
 * Get MIME type from filename extension
 * @param {string} filename 
 * @returns {string}
 */
function getMimeType(filename) {
  const ext = path.extname(filename || '').toLowerCase();
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Stream file with HTTP 206 Partial Content (Range) & security headers
 * @param {string} filePath 
 * @param {object} req 
 * @param {object} res 
 * @param {object} options { disposition: 'inline'|'attachment', downloadName: string, contentType: string }
 */
function streamFile(filePath, req, res, options = {}) {
  const setStatus = (code) => {
    if (typeof res.status === 'function') {
      res.status(code);
    } else {
      res.statusCode = code;
    }
  };

  const sendJson = (code, payload) => {
    setStatus(code);
    if (typeof res.json === 'function') {
      res.json(payload);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
    }
  };

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      return sendJson(404, { error: 'Requested file was not found.' });
    }

    const fileSize = stats.size;
    const contentType = options.contentType || getMimeType(filePath);
    const disposition = options.disposition || 'inline';
    const downloadName = options.downloadName || path.basename(filePath);
    const safeDownloadName = encodeURIComponent(downloadName);

    // Common security & caching headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', options.cacheControl || 'private, no-store, max-age=0');
    res.setHeader(
      'Content-Disposition',
      `${disposition}; filename="${downloadName.replace(/"/g, '')}"; filename*=UTF-8''${safeDownloadName}`
    );

    const range = req.headers.range;

    if (range) {
      // Parse Range header (e.g. "bytes=0-1023")
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validate range boundaries
      if (isNaN(start) || start < 0 || isNaN(end) || end >= fileSize || start > end) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return sendJson(416, { error: 'Requested Range Not Satisfiable' });
      }

      const chunkSize = (end - start) + 1;
      setStatus(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.on('error', (streamErr) => {
        console.error('File stream error:', streamErr);
        if (!res.headersSent) {
          sendJson(500, { error: 'Error streaming file segment' });
        }
      });
      fileStream.pipe(res);
    } else {
      // Full file transfer
      setStatus(200);
      res.setHeader('Content-Length', fileSize);

      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (streamErr) => {
        console.error('File stream error:', streamErr);
        if (!res.headersSent) {
          sendJson(500, { error: 'Error streaming file' });
        }
      });
      fileStream.pipe(res);
    }
  });
}

// Auto-initialize directories on module load
initStorage();

module.exports = {
  STORAGE_ROOT,
  PUBLIC_DIR,
  PRIVATE_DIR,
  CATEGORIES,
  initStorage,
  getCategoryDir,
  resolveFilePath,
  fileExists,
  deleteFile,
  getMimeType,
  streamFile
};
