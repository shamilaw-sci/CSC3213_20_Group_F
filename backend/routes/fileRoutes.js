/**
 * @file fileRoutes.js
 * @description Secure File Access Routes. Serves private PDFs, assignments, submissions, and audio attachments via tokenized, role-authorized, streaming endpoints.
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/authMiddleware');
const fileStorage = require('../services/fileStorage');
const {
  authorizeLessonPdf,
  authorizeAssignment,
  authorizeSubmission,
  authorizeDirectMessage,
  authorizeLiveAttachment,
  authorizeQuizImage,
  authorizePaymentSlip
} = require('../utils/fileAuthorization');

// Helper to locate file in private category with legacy uploads fallback
function findFilePath(category, filename, legacySubdir = '') {
  if (!filename) return null;
  const cleanName = path.basename(filename.replace(/\\/g, '/'));

  // 1. Check new private storage path
  try {
    const primaryPath = fileStorage.resolveFilePath(category, cleanName);
    if (fs.existsSync(primaryPath)) {
      return primaryPath;
    }
  } catch (e) {}

  // 2. Check legacy backend/uploads path for backward compatibility
  const legacyDir = legacySubdir 
    ? path.join(__dirname, '../uploads', legacySubdir) 
    : path.join(__dirname, '../uploads');
  const legacyPath = path.join(legacyDir, cleanName);
  if (fs.existsSync(legacyPath)) {
    return legacyPath;
  }

  // 3. Check direct backend/uploads root as final legacy fallback
  const directLegacyPath = path.join(__dirname, '../uploads', cleanName);
  if (fs.existsSync(directLegacyPath)) {
    return directLegacyPath;
  }

  return null;
}

// ==========================================
// 1. LESSON PDF MATERIALS
// ==========================================
router.get('/lesson/:lessonId/pdf/:pdfId', protect, async (req, res) => {
  try {
    const auth = await authorizeLessonPdf(req.user, req.params.lessonId, req.params.pdfId);
    if (!auth.allowed) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const filename = auth.pdf.filename || path.basename(auth.pdf.fileUrl || '');
    const filePath = findFilePath('lessons', filename);

    if (!filePath) {
      return res.status(404).json({ error: 'Lesson PDF file not found on disk.' });
    }

    const wantDownload = req.query.download === 'true';
    const disposition = (wantDownload && auth.canDownload) ? 'attachment' : 'inline';
    const downloadName = (auth.pdf.title ? `${auth.pdf.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf` : filename);

    fileStorage.streamFile(filePath, req, res, {
      disposition,
      downloadName,
      contentType: 'application/pdf'
    });
  } catch (error) {
    console.error('Error serving lesson PDF:', error);
    res.status(500).json({ error: 'Server error retrieving lesson PDF.' });
  }
});

// ==========================================
// 2. ASSIGNMENT QUESTION SHEETS
// ==========================================
router.get('/assignment/:assignmentId', protect, async (req, res) => {
  try {
    const auth = await authorizeAssignment(req.user, req.params.assignmentId);
    if (!auth.allowed) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const filename = path.basename(auth.assignment.attachmentUrl || '');
    const filePath = findFilePath('assignments', filename);

    if (!filePath) {
      return res.status(404).json({ error: 'Assignment resource file not found on disk.' });
    }

    const wantDownload = req.query.download === 'true';
    const disposition = wantDownload ? 'attachment' : 'inline';
    const downloadName = auth.assignment.attachmentName || filename;

    fileStorage.streamFile(filePath, req, res, {
      disposition,
      downloadName
    });
  } catch (error) {
    console.error('Error serving assignment file:', error);
    res.status(500).json({ error: 'Server error retrieving assignment file.' });
  }
});

// ==========================================
// 3. ASSIGNMENT SUBMISSIONS
// ==========================================
router.get('/submission/:submissionId', protect, async (req, res) => {
  try {
    const auth = await authorizeSubmission(req.user, req.params.submissionId);
    if (!auth.allowed) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const filename = path.basename(auth.submission.fileUrl || '');
    const filePath = findFilePath('submissions', filename);

    if (!filePath) {
      return res.status(404).json({ error: 'Submission file not found on disk.' });
    }

    const wantDownload = req.query.download === 'true';
    const disposition = wantDownload ? 'attachment' : 'inline';
    const downloadName = auth.submission.fileName || filename;

    fileStorage.streamFile(filePath, req, res, {
      disposition,
      downloadName
    });
  } catch (error) {
    console.error('Error serving submission file:', error);
    res.status(500).json({ error: 'Server error retrieving submission file.' });
  }
});

// ==========================================
// 4. DIRECT MESSAGE ATTACHMENTS
// ==========================================
const handleMessageAttachment = async (req, res) => {
  try {
    const index = parseInt(req.params.attachmentIndex || '0', 10);
    const auth = await authorizeDirectMessage(req.user, req.params.messageId, index);
    if (!auth.allowed) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const attachment = auth.attachment;
    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found on this message.' });
    }

    const filename = path.basename(attachment.url || '');
    const filePath = findFilePath('messages', filename, 'messages');

    if (!filePath) {
      return res.status(404).json({ error: 'Message attachment file not found on disk.' });
    }

    const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
    const downloadName = attachment.originalName || filename;

    fileStorage.streamFile(filePath, req, res, {
      disposition,
      downloadName
    });
  } catch (error) {
    console.error('Error serving message attachment:', error);
    res.status(500).json({ error: 'Server error retrieving message attachment.' });
  }
};

router.get('/message/:messageId', protect, handleMessageAttachment);
router.get('/message/:messageId/:attachmentIndex', protect, handleMessageAttachment);

// ==========================================
// 5. LIVE CLASSROOM ATTACHMENTS & AUDIO
// ==========================================
router.get('/live/:lessonId/file/:filename', protect, async (req, res) => {
  try {
    const auth = await authorizeLiveAttachment(req.user, req.params.lessonId);
    if (!auth.allowed) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const rawFilename = req.params.filename;
    const filePath = findFilePath('live-chat', rawFilename, 'live_chat');

    if (!filePath) {
      return res.status(404).json({ error: 'Live class attachment not found on disk.' });
    }

    fileStorage.streamFile(filePath, req, res, {
      disposition: 'inline'
    });
  } catch (error) {
    console.error('Error serving live classroom file:', error);
    res.status(500).json({ error: 'Server error retrieving live class file.' });
  }
});

// ==========================================
// 6. QUIZ QUESTION IMAGES
// ==========================================
router.get('/quiz/:quizId/question/:questionId', protect, async (req, res) => {
  try {
    const auth = await authorizeQuizImage(req.user, req.params.quizId);
    if (!auth.allowed) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const question = auth.quiz.questions.id(req.params.questionId);
    if (!question || !question.questionImage) {
      return res.status(404).json({ error: 'Question image not found.' });
    }

    const filename = path.basename(question.questionImage);
    const filePath = findFilePath('quizzes', filename);

    if (!filePath) {
      return res.status(404).json({ error: 'Quiz diagram file not found on disk.' });
    }

    fileStorage.streamFile(filePath, req, res, {
      disposition: 'inline'
    });
  } catch (error) {
    console.error('Error serving quiz diagram:', error);
    res.status(500).json({ error: 'Server error retrieving quiz diagram.' });
  }
});

// ==========================================
// 7. PAYMENT SLIPS
// ==========================================
router.get('/payment/:paymentId/slip', protect, async (req, res) => {
  try {
    const auth = await authorizePaymentSlip(req.user, req.params.paymentId);
    if (!auth.allowed) {
      return res.status(auth.status || 403).json({ error: auth.error });
    }

    const rawSlip = auth.payment.slipImage || '';
    const filename = path.basename(rawSlip);
    const filePath = findFilePath('payments', filename);

    if (!filePath) {
      // Legacy Base64 backward compatibility fallback
      if (rawSlip.startsWith('data:')) {
        const matches = rawSlip.match(/^data:([A-Za-z0-9\/+-]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          const contentType = matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          res.setHeader('Content-Type', contentType);
          res.setHeader('Cache-Control', 'private, no-store, max-age=0');
          res.setHeader('X-Content-Type-Options', 'nosniff');
          return res.send(buffer);
        }
      }
      return res.status(404).json({ error: 'Payment slip file not found on disk.' });
    }

    const wantDownload = req.query.download === 'true';
    const disposition = wantDownload ? 'attachment' : 'inline';
    const ext = path.extname(filePath) || '.jpg';
    const downloadName = `Bank_Slip_${(auth.payment.transactionId || auth.payment._id).toString().replace(/[^a-zA-Z0-9_-]/g, '_')}${ext}`;

    fileStorage.streamFile(filePath, req, res, {
      disposition,
      downloadName
    });
  } catch (error) {
    console.error('Error serving payment slip:', error);
    res.status(500).json({ error: 'Server error retrieving payment slip.' });
  }
});

module.exports = router;
