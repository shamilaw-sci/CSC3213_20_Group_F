/**
 * @file migration.js
 * @description Storage Migration Utility. Scans legacy flat upload files, categorizes them by file prefix and MIME type, moves them to structured storage directories, and updates database references.
 */

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const fileStorage = require('../services/fileStorage');
const Course = require('../models/Course');
const User = require('../models/User');
const Lesson = require('../models/Lesson');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const DirectMessage = require('../models/DirectMessage');
const Quiz = require('../models/Quiz');
const Payment = require('../models/Payment');

/**
 * Categorize a legacy filename from backend/uploads
 */
function detectCategory(filename, parentSubdir = '') {
  if (parentSubdir === 'live_chat' || parentSubdir === 'live-chat') return 'live-chat';
  if (parentSubdir === 'messages') return 'messages';

  const lower = filename.toLowerCase();
  if (lower.startsWith('asgn-')) return 'assignments';
  if (lower.startsWith('sub-')) return 'submissions';
  if (lower.startsWith('quiz-')) return 'quizzes';
  if (lower.startsWith('pdf-') || lower.startsWith('lesson-')) return 'lessons';
  if (lower.startsWith('banner-') || lower.startsWith('cardimage-') || lower.startsWith('course-')) return 'courses';
  if (lower.startsWith('avatar-') || lower.startsWith('profile-') || lower.startsWith('cover-')) return 'profiles';
  if (lower.startsWith('slip-') || lower.startsWith('payment-')) return 'payments';

  // Fallback by extension
  if (lower.endsWith('.pdf')) return 'lessons';
  return 'courses';
}

/**
 * Safely copy or move physical files to new storage structure
 */
async function migratePhysicalFiles() {
  console.log('📦 Starting physical file migration...');
  fileStorage.initStorage();

  const legacyUploadsDir = path.resolve(__dirname, '../uploads');
  if (!fs.existsSync(legacyUploadsDir)) {
    console.log('ℹ️ Legacy uploads directory does not exist. Skipping file copy.');
    return;
  }

  let copiedCount = 0;

  function scanAndMigrateDir(dirPath, relativeParent = '') {
    const items = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);

      if (item.isDirectory()) {
        scanAndMigrateDir(fullPath, item.name);
      } else if (item.isFile()) {
        const category = detectCategory(item.name, relativeParent);
        const targetDir = fileStorage.getCategoryDir(category);
        const targetPath = path.join(targetDir, item.name);

        if (!fs.existsSync(targetPath)) {
          try {
            fs.copyFileSync(fullPath, targetPath);
            copiedCount++;
          } catch (err) {
            console.error(`❌ Failed to copy ${item.name} to ${category}:`, err.message);
          }
        }
      }
    }
  }

  scanAndMigrateDir(legacyUploadsDir);
  console.log(`✅ Physical file migration complete: ${copiedCount} files organized into storage directories.`);
}

/**
 * Normalize database references to protected/public route conventions
 */
async function migrateDatabaseRecords() {
  console.log('🗄️ Starting database metadata migration...');

  // 1. Courses (Banners & Card Images -> /media/courses/...)
  const courses = await Course.find({});
  let courseCount = 0;
  for (const course of courses) {
    let modified = false;
    if (course.banner && course.banner.includes('/uploads/')) {
      const filename = path.basename(course.banner);
      course.banner = `/media/courses/${filename}`;
      modified = true;
    }
    if (course.cardImage && course.cardImage.includes('/uploads/')) {
      const filename = path.basename(course.cardImage);
      course.cardImage = `/media/courses/${filename}`;
      modified = true;
    }
    if (modified) {
      await course.save();
      courseCount++;
    }
  }
  console.log(`  ✓ Updated ${courseCount} Course media records.`);

  // 2. Users (Avatars & Covers -> /media/profiles/...)
  const users = await User.find({});
  let userCount = 0;
  for (const user of users) {
    let modified = false;
    if (user.avatar && user.avatar.includes('/uploads/')) {
      const filename = path.basename(user.avatar);
      user.avatar = `/media/profiles/${filename}`;
      modified = true;
    }
    if (user.coverPhoto && user.coverPhoto.includes('/uploads/')) {
      const filename = path.basename(user.coverPhoto);
      user.coverPhoto = `/media/profiles/${filename}`;
      modified = true;
    }
    if (modified) {
      await user.save();
      userCount++;
    }
  }
  console.log(`  ✓ Updated ${userCount} User avatar/cover records.`);

  // 3. Lessons (PDF Materials -> /api/files/lesson/:lessonId/pdf/:pdfId)
  const lessons = await Lesson.find({});
  let lessonPdfCount = 0;
  for (const lesson of lessons) {
    let modified = false;
    if (Array.isArray(lesson.pdfMaterials)) {
      for (const pdf of lesson.pdfMaterials) {
        if (pdf.fileUrl && !pdf.fileUrl.startsWith('/api/files/')) {
          pdf.fileUrl = `/api/files/lesson/${lesson._id}/pdf/${pdf._id}`;
          modified = true;
          lessonPdfCount++;
        }
      }
    }
    if (modified) {
      await lesson.save();
    }
  }
  console.log(`  ✓ Updated ${lessonPdfCount} Lesson PDF URLs.`);

  // 4. Assignments (Question Sheets -> /api/files/assignment/:assignmentId)
  const assignments = await Assignment.find({});
  let asgnCount = 0;
  for (const asgn of assignments) {
    if (asgn.attachmentUrl && !asgn.attachmentUrl.startsWith('/api/files/')) {
      asgn.attachmentUrl = `/api/files/assignment/${asgn._id}`;
      await asgn.save();
      asgnCount++;
    }
  }
  console.log(`  ✓ Updated ${asgnCount} Assignment question sheet URLs.`);

  // 5. Assignment Submissions (Student work -> /api/files/submission/:submissionId)
  const submissions = await AssignmentSubmission.find({});
  let subCount = 0;
  for (const sub of submissions) {
    if (sub.fileUrl && !sub.fileUrl.startsWith('/api/files/')) {
      sub.fileUrl = `/api/files/submission/${sub._id}`;
      await sub.save();
      subCount++;
    }
  }
  console.log(`  ✓ Updated ${subCount} Assignment Submission URLs.`);

  // 6. Direct Messages (Attachments -> /api/files/message/:messageId/:index)
  const messages = await DirectMessage.find({ 'attachments.0': { $exists: true } });
  let msgCount = 0;
  for (const msg of messages) {
    let modified = false;
    if (Array.isArray(msg.attachments)) {
      msg.attachments.forEach((att, idx) => {
        if (att.url && !att.url.startsWith('/api/files/')) {
          att.url = `/api/files/message/${msg._id}/${idx}`;
          modified = true;
        }
      });
    }
    if (modified) {
      await msg.save();
      msgCount++;
    }
  }
  console.log(`  ✓ Updated ${msgCount} Direct Message attachments.`);

  // 7. Payments (Bank Slips -> /api/files/payment/:paymentId/slip)
  const payments = await Payment.find({ slipImage: { $exists: true, $ne: '' } });
  let paymentCount = 0;
  for (const payment of payments) {
    if (payment.slipImage && !payment.slipImage.startsWith('data:') && !payment.slipImage.startsWith('/api/files/')) {
      payment.slipImage = `/api/files/payment/${payment._id}/slip`;
      await payment.save();
      paymentCount++;
    }
  }
  console.log(`  ✓ Updated ${paymentCount} Payment slip URLs.`);
}

/**
 * Run full idempotent migration
 */
async function runFullMigration() {
  console.log('\n=============================================');
  console.log('🚀 LUMINALEARN STORAGE & DATA MIGRATION');
  console.log('=============================================\n');

  try {
    // 1. Move physical files
    await migratePhysicalFiles();

    // 2. Connect to database if not connected
    const dbURI = process.env.MONGO_URI;

    if (!dbURI) {
      throw new Error("MONGO_URI environment variable is missing.");
    }

    if (mongoose.connection.readyState !== 1) {
      console.log('Connecting to MongoDB...');
      await mongoose.connect(dbURI, {
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
        tls: true,
        retryWrites: true
      });
      console.log('Connected to MongoDB! 🚀');
    }

    // 3. Update database paths
    await migrateDatabaseRecords();

    console.log('\n=============================================');
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY');
    console.log('=============================================\n');
  } catch (err) {
    console.error('❌ Migration Error:', err);
    throw err;
  }
}

/**
 * Startup migration function invoked on server start
 */
async function migrateData() {
  await migratePhysicalFiles();
  if (mongoose.connection.readyState === 1) {
    await migrateDatabaseRecords();
  }
}

// Allow direct CLI execution: node backend/utils/migration.js
if (require.main === module) {
  runFullMigration()
    .then(() => {
      mongoose.disconnect();
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = {
  migrateData,
  migratePhysicalFiles,
  migrateDatabaseRecords,
  runFullMigration
};
