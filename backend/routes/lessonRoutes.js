/**
 * @file lessonRoutes.js
 * @description Lesson Management Routes. Handles creation, ordering, and publishing of weekly modular lessons, video links, PDF lecture notes, and download protection locks.
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const { checkStudentFeeStatus } = require('../utils/feeAccessHelper');
const uploadPdfMiddleware = require('../middleware/pdfUpload');
const { sendCourseUpdateEmail } = require('../utils/emailService');
const { getClassEnrolledStudents } = require('../utils/enrollmentHelper');
const { getCategoryDir } = require('../services/fileStorage');

// --- MULTER STORAGE FOR LIVE CHAT ATTACHMENTS & PHOTOS ---
const liveChatUploadsDir = getCategoryDir('live-chat');

const liveChatStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, liveChatUploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        let ext = path.extname(file.originalname || '');
        if (!ext) {
            if (file.mimetype?.includes('webm')) ext = '.webm';
            else if (file.mimetype?.includes('ogg')) ext = '.ogg';
            else if (file.mimetype?.includes('mp4') || file.mimetype?.includes('m4a')) ext = '.m4a';
            else if (file.mimetype?.includes('wav')) ext = '.wav';
            else if (file.mimetype?.includes('jpeg') || file.mimetype?.includes('jpg')) ext = '.jpg';
            else if (file.mimetype?.includes('png')) ext = '.png';
            else if (file.mimetype?.includes('pdf')) ext = '.pdf';
            else ext = '.webm';
        }
        cb(null, 'live-' + uniqueSuffix + ext);
    }
});

const liveChatUpload = multer({
    storage: liveChatStorage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max file size
});

const optionalLiveChatUpload = (req, res, next) => {
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('multipart/form-data')) {
        liveChatUpload.single('attachment')(req, res, (err) => {
            if (err) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({ error: "File size exceeds 5MB limit. Please upload a file under 5MB." });
                }
                return res.status(400).json({ error: err.message || "File upload error" });
            }
            next();
        });
    } else {
        next();
    }
};

// Middleware to authorize teachers and admins
const isTeacherOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Teachers and Admins only." });
    }
};

// @route   POST /api/lessons/add-grade
// @desc    Admin or Teacher adds a Grade assignment to a Course with custom fee
router.post('/add-grade', protect, isTeacherOrAdmin, async (req, res) => {
    const { grade, title, courseId, fee } = req.body;

    if (!grade || !String(grade).trim()) {
        return res.status(400).json({ error: "Invalid grade selection." });
    }

    const gradeVal = String(grade).trim();
    const gradeTitle = (title && String(title).trim()) ? String(title).trim() : (gradeVal.toLowerCase().startsWith('grade') ? gradeVal : `Grade ${gradeVal}`);

    try {
        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found." });
        }

        const existingCourseGrade = course.enrolledGrades.find(g => g.gradeNumber === gradeVal);
        if (existingCourseGrade) {
            return res.status(400).json({ error: "This class was already added to this course" });
        }

        const existingLesson = await Lesson.findOne({ grade: gradeVal, course: courseId });
        if (existingLesson) {
            return res.status(400).json({ error: "This class was already added to this course" });
        }

        const parsedFee = (fee !== undefined && fee !== null && !isNaN(Number(fee)) && Number(fee) >= 0)
            ? Number(fee)
            : (course.price || 2500);

        const isCourseDeactive = course.status === 'deactive' || course.isActive === false;
        course.enrolledGrades.push({
            gradeNumber: gradeVal,
            title: gradeTitle,
            fee: parsedFee,
            messages: [],
            status: isCourseDeactive ? 'deactive' : 'active',
            isActive: !isCourseDeactive,
            deactivatedBy: isCourseDeactive ? 'admin' : null,
            previousStatus: isCourseDeactive ? 'active' : null
        });
        await course.save();

        const newLesson = await Lesson.create({
            course: course._id,
            grade: gradeVal,
            teacherMessage: "No teacher message for this class yet."
        });

        const newGradeEntry = course.enrolledGrades.find(g => g.gradeNumber === gradeVal);
        res.status(201).json({ message: "Class added successfully!", newGradeEntry, lesson: newLesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to add class: " + err.message });
    }
});

// @route   PATCH /api/lessons/update-message/:lessonId
// @desc    Teacher posting a message to a class
router.patch('/update-message/:lessonId', protect, isTeacherOrAdmin, async (req, res) => {
    const { teacherMessage } = req.body;

    try {
        const lesson = await Lesson.findById(req.params.lessonId);

        if (!lesson) return res.status(404).json({ error: "Class not found." });

        lesson.teacherMessage = teacherMessage;
        await lesson.save();

        // --- TRIGGER NOTIFICATIONS FOR ENROLLED CLASS STUDENTS ---
        try {
            const course = await Course.findById(lesson.course);
            const enrolledStudents = await getClassEnrolledStudents(lesson.course, lesson.grade);

            if (enrolledStudents.length > 0) {
                const notifDocs = enrolledStudents.map(st => ({
                    recipient: st._id,
                    sender: req.user._id,
                    type: 'NEW_CONTENT',
                    title: `Teacher Notice: Grade ${lesson.grade}`,
                    message: teacherMessage,
                    link: '/courses',
                    metadata: { courseId: lesson.course, lessonId: lesson._id }
                }));

                await Notification.insertMany(notifDocs);
            }
        } catch (notifErr) {
            console.error('Lesson message notification error:', notifErr.message);
        }

        res.json({ message: "Message posted successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to post message." });
    }
});

// @route   GET /api/lessons/course/:courseId
// @desc    Get all classes in a course (auto-syncs missing lesson docs for enrolledGrades)
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(req.params.courseId)) {
            return res.status(404).json({ error: "Invalid course ID" });
        }

        // Fast parallel fetch of course enrolledGrades and existing lessons
        const [course, existingLessons] = await Promise.all([
            Course.findById(req.params.courseId).select('enrolledGrades').lean(),
            Lesson.find({ course: req.params.courseId })
                .select('-liveStream.liveMessages -liveStream.viewers -liveStream.feedbacks')
                .sort('grade')
                .lean()
        ]);

        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        // Check if any enrolled grade is missing a Lesson document
        const existingGradeSet = new Set(existingLessons.map(l => String(l.grade).trim()));
        const missingGrades = (course.enrolledGrades || [])
            .filter(eg => eg.gradeNumber && !existingGradeSet.has(String(eg.gradeNumber).trim()))
            .map(eg => ({
                course: course._id,
                grade: eg.gradeNumber,
                teacherMessage: "No teacher message for this class yet."
            }));

        let finalLessons = existingLessons;
        if (missingGrades.length > 0) {
            try {
                const created = await Lesson.insertMany(missingGrades);
                finalLessons = [...existingLessons, ...created].sort((a, b) => String(a.grade).localeCompare(String(b.grade)));
            } catch (createErr) {
                // If duplicate key or parallel creation, return current
            }
        }

        // Student Monthly Fee Clearance Check
        if (req.user && req.user.role === 'student') {
            const feeStatus = await checkStudentFeeStatus(req.user._id, req.params.courseId);
            if (!feeStatus.isAllowed) {
                // Redact live stream URLs, video lessons, and PDF materials from JSON
                finalLessons = finalLessons.map(l => ({
                    ...l,
                    feeLocked: true,
                    feeStatus,
                    videoLessons: [],
                    pdfMaterials: [],
                    liveStream: l.liveStream ? {
                        isLive: l.liveStream.isLive,
                        isScheduled: l.liveStream.isScheduled,
                        scheduledStartTime: l.liveStream.scheduledStartTime,
                        title: l.liveStream.title,
                        thumbnail: l.liveStream.thumbnail,
                        youtubeUrl: '' // Redacted
                    } : null
                }));
            }
        }

        res.json(finalLessons);
    } catch (err) {
        console.error("GET /lessons/course/:courseId error:", err);
        res.status(500).json({ error: "Failed to get lesson data: " + err.message });
    }
});

// @route   PUT /api/lessons/:lessonId
// @desc    Update lesson message and/or video lessons
router.put('/:lessonId', protect, isTeacherOrAdmin, async (req, res) => {
    const { teacherMessage, videoLessons, hideDemoVideo, hideDemoPdf } = req.body;

    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const isNewVideoAdded = videoLessons && Array.isArray(videoLessons) && videoLessons.length > (lesson.videoLessons?.length || 0);

        if (teacherMessage !== undefined) {
            lesson.teacherMessage = teacherMessage;
        }
        if (videoLessons !== undefined) {
            lesson.videoLessons = videoLessons.map(v => {
                const settings = resolveDownloadSettings(v);
                return {
                    title: v.title,
                    url: v.url,
                    weekNumber: v.weekNumber || 1,
                    allowDownload: settings.allowDownload,
                    downloadDelayType: settings.downloadDelayType,
                    downloadUnlockDate: settings.downloadUnlockDate,
                    uploadedAt: v.uploadedAt || new Date()
                };
            });
        }
        if (hideDemoVideo !== undefined) {
            lesson.hideDemoVideo = hideDemoVideo;
        }
        if (hideDemoPdf !== undefined) {
            lesson.hideDemoPdf = hideDemoPdf;
        }

        await lesson.save();

        // Notify enrolled class students if new video lessons were added
        if (isNewVideoAdded) {
            try {
                const course = await Course.findById(lesson.course);
                const enrolledStudents = await getClassEnrolledStudents(lesson.course, lesson.grade);

                if (enrolledStudents.length > 0) {
                    const latestVideo = videoLessons[videoLessons.length - 1];
                    const videoTitle = latestVideo?.title || 'New Video Lesson';

                    const notifDocs = enrolledStudents.map(st => ({
                        recipient: st._id,
                        type: 'NEW_CONTENT',
                        title: `New Video in ${course?.title || 'Course'}`,
                        message: `New video lesson "${videoTitle}" is now available for Grade ${lesson.grade}.`,
                        link: '/courses',
                        metadata: { courseId: lesson.course, lessonId: lesson._id }
                    }));

                    await Notification.insertMany(notifDocs);

                    enrolledStudents.forEach(st => {
                        if (st.email) {
                            sendCourseUpdateEmail(
                                st.email,
                                st.name,
                                course?.title || 'Your Course',
                                `New Video Lesson: ${videoTitle}`,
                                `A new video lesson has been uploaded for Grade ${lesson.grade}.`
                            );
                        }
                    });
                }
            } catch (notifErr) {
                console.error('Video upload notification error:', notifErr.message);
            }
        }

        res.json({ message: "Lesson details updated successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to update lesson details: " + err.message });
    }
});

// Helper to resolve download settings and unlock date
const resolveDownloadSettings = (body = {}) => {
    let allowDownload = true;
    let downloadDelayType = body.downloadDelayType || 'immediate';
    let downloadUnlockDate = null;

    if (body.allowDownload === false || body.allowDownload === 'false' || downloadDelayType === 'disabled') {
        allowDownload = false;
        downloadDelayType = 'disabled';
        downloadUnlockDate = null;
    } else if (downloadDelayType === 'one_month') {
        allowDownload = true;
        downloadUnlockDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    } else if (downloadDelayType === 'custom_date' && body.downloadUnlockDate) {
        allowDownload = true;
        downloadUnlockDate = new Date(body.downloadUnlockDate);
    } else {
        allowDownload = true;
        downloadDelayType = 'immediate';
        downloadUnlockDate = null;
    }

    return { allowDownload, downloadDelayType, downloadUnlockDate };
};

// @route   POST /api/lessons/:lessonId/pdf
// @desc    Upload a PDF material (Admin/Teacher only)
router.post('/:lessonId/pdf', protect, isTeacherOrAdmin, uploadPdfMiddleware, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Please upload a PDF file." });
        }

        const title = req.body.title || req.file.originalname;
        const filename = req.file.filename;
        const newPdfId = new mongoose.Types.ObjectId();
        const fileUrl = `/api/files/lesson/${lesson._id}/pdf/${newPdfId}`;
        const fileSize = req.file.size;
        const { allowDownload, downloadDelayType, downloadUnlockDate } = resolveDownloadSettings(req.body);

        if (!lesson.pdfMaterials) {
            lesson.pdfMaterials = [];
        }

        lesson.pdfMaterials.push({
            _id: newPdfId,
            title,
            filename,
            fileUrl,
            fileSize,
            allowDownload,
            downloadDelayType,
            downloadUnlockDate,
            uploadedAt: new Date()
        });

        await lesson.save();

        // --- TRIGGER NOTIFICATIONS FOR ENROLLED CLASS STUDENTS ---
        try {
            const course = await Course.findById(lesson.course);
            const enrolledUsers = await getClassEnrolledStudents(lesson.course, lesson.grade);

            if (enrolledUsers.length > 0) {
                const notifDocs = enrolledUsers.map(st => ({
                    recipient: st._id,
                    type: 'NEW_CONTENT',
                    title: `New Material in ${course?.title || 'Course'}`,
                    message: `New PDF note "${title}" has been uploaded for Grade ${lesson.grade}.`,
                    link: `/courses`,
                    metadata: { courseId: course?._id || lesson.course, lessonId: lesson._id }
                }));

                await Notification.insertMany(notifDocs);

                // Email notification to enrolled students of this class
                enrolledUsers.forEach(st => {
                    if (st.email) {
                        sendCourseUpdateEmail(st.email, st.name, course?.title || 'Your Course', `New PDF Material: ${title}`, `A new study material "${title}" has been published for Grade ${lesson.grade}.`);
                    }
                });
            }
        } catch (notifErr) {
            console.error('Lesson PDF notification error:', notifErr.message);
        }

        res.status(201).json({ message: "PDF uploaded successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload PDF: " + err.message });
    }
});

// @route   DELETE /api/lessons/:lessonId/pdf/:pdfId
// @desc    Delete a PDF material (Admin/Teacher only)
router.delete('/:lessonId/pdf/:pdfId', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const pdfIndex = lesson.pdfMaterials.findIndex(pdf => pdf._id.toString() === req.params.pdfId);
        if (pdfIndex === -1) {
            return res.status(404).json({ error: "PDF not found." });
        }

        const pdf = lesson.pdfMaterials[pdfIndex];
        
        // Delete from filesystem (checks private storage then legacy uploads)
        const { deleteFile } = require('../services/fileStorage');
        deleteFile('lessons', pdf.filename);
        const legacyPdfPath = path.join(__dirname, '..', 'uploads', pdf.filename);
        if (fs.existsSync(legacyPdfPath)) {
            try { fs.unlinkSync(legacyPdfPath); } catch (e) {}
        }

        // Remove from database array
        lesson.pdfMaterials.splice(pdfIndex, 1);
        await lesson.save();

        res.json({ message: "PDF removed successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete PDF: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/assignment
// @desc    Upload an Assignment PDF (Admin/Teacher only)
router.post('/:lessonId/assignment', protect, isTeacherOrAdmin, uploadPdfMiddleware, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!req.file) {
            return res.status(400).json({ error: "Please upload a PDF file." });
        }

        const title = req.body.title || req.file.originalname;
        const filename = req.file.filename;
        const newAssignId = new mongoose.Types.ObjectId();
        const fileUrl = `/api/files/assignment/${newAssignId}`;
        const fileSize = req.file.size;
        const { allowDownload, downloadDelayType, downloadUnlockDate } = resolveDownloadSettings(req.body);

        if (!lesson.assignments) {
            lesson.assignments = [];
        }

        lesson.assignments.push({
            _id: newAssignId,
            title,
            filename,
            fileUrl,
            fileSize,
            allowDownload,
            downloadDelayType,
            downloadUnlockDate,
            uploadedAt: new Date()
        });

        await lesson.save();

        // --- TRIGGER NOTIFICATIONS FOR ENROLLED CLASS STUDENTS ---
        try {
            const course = await Course.findById(lesson.course);
            const enrolledUsers = await getClassEnrolledStudents(lesson.course, lesson.grade);

            if (enrolledUsers.length > 0) {
                const notifDocs = enrolledUsers.map(st => ({
                    recipient: st._id,
                    type: 'NEW_CONTENT',
                    title: `New Assignment in ${course?.title || 'Course'}`,
                    message: `New Assignment PDF "${title}" has been uploaded for Grade ${lesson.grade}.`,
                    link: `/courses`,
                    metadata: { courseId: course?._id || lesson.course, lessonId: lesson._id }
                }));

                await Notification.insertMany(notifDocs);

                // Email notification to enrolled students of this class
                enrolledUsers.forEach(st => {
                    if (st.email) {
                        sendCourseUpdateEmail(st.email, st.name, course?.title || 'Your Course', `New Assignment: ${title}`, `A new assignment "${title}" has been published for Grade ${lesson.grade}.`);
                    }
                });
            }
        } catch (notifErr) {
            console.error('Lesson Assignment PDF notification error:', notifErr.message);
        }

        res.status(201).json({ message: "Assignment PDF uploaded successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload Assignment PDF: " + err.message });
    }
});

// @route   PATCH /api/lessons/:lessonId/material-download-settings
// @desc    Update download permissions and unlock schedule for a specific material (Admin/Teacher only)
router.patch('/:lessonId/material-download-settings', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const { materialType, materialId, allowDownload, downloadDelayType, downloadUnlockDate } = req.body;
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const settings = resolveDownloadSettings({ allowDownload, downloadDelayType, downloadUnlockDate });

        if (materialType === 'pdf') {
            const item = (lesson.pdfMaterials && lesson.pdfMaterials.id)
                ? (lesson.pdfMaterials.id(materialId) || lesson.pdfMaterials.find(p => p._id && p._id.toString() === materialId))
                : lesson.pdfMaterials.find(p => p._id && p._id.toString() === materialId);
            if (!item) return res.status(404).json({ error: "PDF material not found." });
            item.allowDownload = settings.allowDownload;
            item.downloadDelayType = settings.downloadDelayType;
            item.downloadUnlockDate = settings.downloadUnlockDate;
        } else if (materialType === 'assignment') {
            const item = (lesson.assignments && lesson.assignments.id)
                ? (lesson.assignments.id(materialId) || lesson.assignments.find(a => a._id && a._id.toString() === materialId))
                : lesson.assignments.find(a => a._id && a._id.toString() === materialId);
            if (!item) return res.status(404).json({ error: "Assignment not found." });
            item.allowDownload = settings.allowDownload;
            item.downloadDelayType = settings.downloadDelayType;
            item.downloadUnlockDate = settings.downloadUnlockDate;
        } else if (materialType === 'video') {
            const item = (lesson.videoLessons && lesson.videoLessons.id)
                ? (lesson.videoLessons.id(materialId) || lesson.videoLessons.find(v => v._id && v._id.toString() === materialId))
                : lesson.videoLessons.find(v => v._id && v._id.toString() === materialId);
            if (!item) return res.status(404).json({ error: "Video lesson not found." });
            item.allowDownload = settings.allowDownload;
            item.downloadDelayType = settings.downloadDelayType;
            item.downloadUnlockDate = settings.downloadUnlockDate;
        } else {
            return res.status(400).json({ error: "Invalid material type specified." });
        }

        await lesson.save();
        res.json({ message: "Download settings updated successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to update download settings: " + err.message });
    }
});

// @route   DELETE /api/lessons/:lessonId/assignment/:pdfId
// @desc    Delete an Assignment PDF (Admin/Teacher only)
router.delete('/:lessonId/assignment/:pdfId', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!lesson.assignments) {
            return res.status(404).json({ error: "Assignment not found." });
        }

        const pdfIndex = lesson.assignments.findIndex(pdf => pdf._id.toString() === req.params.pdfId);
        if (pdfIndex === -1) {
            return res.status(404).json({ error: "Assignment not found." });
        }

        const pdf = lesson.assignments[pdfIndex];
        
        // Delete from filesystem
        const { deleteFile } = require('../services/fileStorage');
        deleteFile('assignments', pdf.filename);
        const pdfLegacyPath = path.join(__dirname, '..', 'uploads', pdf.filename);
        if (fs.existsSync(pdfLegacyPath)) {
            try { fs.unlinkSync(pdfLegacyPath); } catch (e) {}
        }

        // Remove from database array
        lesson.assignments.splice(pdfIndex, 1);
        await lesson.save();

        res.json({ message: "Assignment PDF removed successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete Assignment PDF: " + err.message });
    }
});

// Helper function to convert base64 image data to static files on disk
const convertBase64ToStaticFile = (base64OrPath, prefix = 'live-thumb') => {
    if (!base64OrPath) return "";
    if (!base64OrPath.startsWith('data:')) {
        return base64OrPath;
    }
    try {
        const base64Parts = base64OrPath.split(';base64,');
        if (base64Parts.length !== 2) return base64OrPath;

        const mime = base64Parts[0].replace('data:', '');
        const ext = mime.split('/')[1] || 'jpeg';
        const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
        const coursesDir = getCategoryDir('courses');

        const filePath = path.join(coursesDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Parts[1], 'base64'));

        return `/media/courses/${filename}`;
    } catch (err) {
        console.error("Failed to convert Base64 to static file:", err.message);
        return base64OrPath;
    }
};

// @route   POST /api/lessons/:lessonId/live-stream
// @desc    Start, Schedule or Update YouTube Live Stream for a class (Admin / Teacher)
router.post('/:lessonId/live-stream', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const { youtubeUrl, title, isScheduled, scheduledStartTime, thumbnail, goLiveNow } = req.body;
        if (!youtubeUrl || !String(youtubeUrl).trim()) {
            return res.status(400).json({ error: "YouTube Live Link or Video ID is required." });
        }

        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const streamTitle = (title && String(title).trim()) ? String(title).trim() : `Grade ${lesson.grade} Live Class`;
        const thumbnailPath = thumbnail ? convertBase64ToStaticFile(thumbnail, 'live-thumb') : (lesson.liveStream?.thumbnail || '');

        const isScheduledMode = Boolean(isScheduled && scheduledStartTime && !goLiveNow);
        const prevLiveStream = lesson.liveStream || {};

        const parsedScheduledTime = (isScheduledMode && scheduledStartTime) ? new Date(scheduledStartTime) : null;
        const validScheduledTime = (parsedScheduledTime && !isNaN(parsedScheduledTime.getTime())) ? parsedScheduledTime : null;

        const updatePayload = {
            'liveStream.isLive': !isScheduledMode,
            'liveStream.isScheduled': isScheduledMode,
            'liveStream.scheduledStartTime': isScheduledMode ? validScheduledTime : (prevLiveStream.scheduledStartTime || null),
            'liveStream.title': streamTitle,
            'liveStream.youtubeUrl': String(youtubeUrl).trim(),
            'liveStream.thumbnail': thumbnailPath,
            'liveStream.startedAt': isScheduledMode ? null : (prevLiveStream.startedAt || new Date()),
            'liveStream.endedAt': null
        };

        const updatedLesson = await Lesson.findByIdAndUpdate(
            req.params.lessonId,
            { $set: updatePayload },
            { returnDocument: 'after' }
        );

        // Send Notifications to enrolled students asynchronously in background
        (async () => {
            try {
                const course = await Course.findById(lesson.course);
                const enrolledStudents = await getClassEnrolledStudents(lesson.course, lesson.grade);

                if (enrolledStudents && enrolledStudents.length > 0) {
                    const isNowLive = !isScheduledMode;
                    const formattedDate = (isScheduledMode && validScheduledTime) ? validScheduledTime.toLocaleString() : '';

                    const notifDocs = enrolledStudents.map(st => ({
                        recipient: st._id,
                        type: 'LIVE_CLASS',
                        title: isNowLive ? `🔴 LIVE NOW: ${course?.title || 'Course'}` : `📅 LIVE CLASS SCHEDULED: ${course?.title || 'Course'}`,
                        message: isNowLive
                            ? `Live class "${streamTitle}" has started for Grade ${lesson.grade}! Click to join now.`
                            : `Live class "${streamTitle}" is scheduled for ${formattedDate} (Grade ${lesson.grade}).`,
                        link: `/courses`,
                        metadata: { courseId: course?._id || lesson.course, lessonId: lesson._id }
                    }));

                    await Notification.insertMany(notifDocs);

                    enrolledStudents.forEach(st => {
                        if (st.email) {
                            sendCourseUpdateEmail(
                                st.email,
                                st.name,
                                course?.title || 'Course Update',
                                isNowLive ? `🔴 LIVE CLASS: ${streamTitle}` : `📅 SCHEDULED LIVE CLASS: ${streamTitle}`,
                                isNowLive
                                    ? `Grade ${lesson.grade} live streaming session is live now on LuminaLearn!`
                                    : `Grade ${lesson.grade} live class has been scheduled for ${formattedDate} on LuminaLearn!`
                            ).catch(e => console.error("Email send error:", e.message));
                        }
                    });
                }
            } catch (notifErr) {
                console.error('Live stream notification background error:', notifErr.message);
            }
        })();

        res.json({
            message: isScheduledMode ? "Live Class scheduled successfully!" : "Live Class published successfully!",
            lesson: updatedLesson
        });
    } catch (err) {
        console.error("Live stream start error:", err);
        res.status(500).json({ error: "Failed to start live stream: " + err.message });
    }
});

const handleEndLiveStreamHelper = async (req, res) => {
    try {
        const saveAsVideo = req.body?.saveAsVideo === true || req.body?.saveAsVideo === 'true' || req.query?.saveAsVideo === 'true';
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (saveAsVideo && lesson.liveStream?.youtubeUrl) {
            lesson.videoLessons.push({
                title: lesson.liveStream.title || `Recorded Live Session - Grade ${lesson.grade}`,
                url: lesson.liveStream.youtubeUrl,
                weekNumber: 1
            });
        }

        // Clean up: delete all live broadcast messages upon concluding stream, preserving student Q&A threads
        const existingMessages = lesson.liveStream?.liveMessages || [];
        const nonBroadcastMessages = existingMessages.filter(m => !m.isBroadcast);
        const existingFeedbacks = lesson.liveStream?.feedbacks || [];
        const existingViewers = lesson.liveStream?.viewers || [];

        const endedTime = new Date();
        const existingPastStreams = Array.isArray(lesson.liveStream?.pastLiveStreams) 
            ? lesson.liveStream.pastLiveStreams 
            : (Array.isArray(lesson.pastLiveStreams) ? lesson.pastLiveStreams : []);

        const concludedEntry = {
            title: lesson.liveStream?.title || `Live Session - Grade ${lesson.grade}`,
            youtubeUrl: lesson.liveStream?.youtubeUrl || '',
            thumbnail: lesson.liveStream?.thumbnail || '',
            startedAt: lesson.liveStream?.startedAt || lesson.createdAt,
            endedAt: endedTime,
            createdAt: endedTime
        };

        // Prepend to past live streams if not duplicate
        const isDuplicatePast = existingPastStreams.some(s => 
            s.startedAt && lesson.liveStream?.startedAt &&
            new Date(s.startedAt).getTime() === new Date(lesson.liveStream.startedAt).getTime()
        );
        const updatedPastStreams = isDuplicatePast 
            ? existingPastStreams 
            : [concludedEntry, ...existingPastStreams];

        lesson.liveStream = {
            isLive: false,
            isScheduled: false,
            scheduledStartTime: null,
            thumbnail: lesson.liveStream?.thumbnail || '',
            title: lesson.liveStream?.title || '',
            youtubeUrl: lesson.liveStream?.youtubeUrl || '',
            startedAt: lesson.liveStream?.startedAt,
            endedAt: endedTime,
            liveMessages: nonBroadcastMessages,
            feedbacks: existingFeedbacks,
            viewers: existingViewers,
            pastLiveStreams: updatedPastStreams
        };

        await lesson.save();

        res.json({ message: "Live Class ended successfully!", lesson });
    } catch (err) {
        console.error("End live stream error:", err);
        res.status(500).json({ error: "Failed to end live stream: " + err.message });
    }
};

// @route   DELETE /api/lessons/:lessonId/live-stream
// @desc    End YouTube Live Stream for a class (Admin / Teacher)
router.delete('/:lessonId/live-stream', protect, isTeacherOrAdmin, handleEndLiveStreamHelper);

// @route   POST /api/lessons/:lessonId/live-stream/end
// @desc    End YouTube Live Stream POST fallback (Admin / Teacher)
router.post('/:lessonId/live-stream/end', protect, isTeacherOrAdmin, handleEndLiveStreamHelper);

// @route   PATCH /api/lessons/:lessonId/live-stream/status-notice
// @desc    Update Quick Teacher Status Notice for scheduled/starting live stream (Teacher / Admin)
router.patch('/:lessonId/live-stream/status-notice', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const { icon, title, text } = req.body;
        if (!title && !text) {
            return res.status(400).json({ error: "Status notice title or text is required." });
        }

        const noticeObj = {
            icon: icon || '📡',
            title: String(title || 'Instructor Live Notice').trim(),
            text: String(text || '').trim(),
            updatedAt: new Date()
        };

        const lesson = await Lesson.findByIdAndUpdate(
            req.params.lessonId,
            { $set: { 'liveStream.statusNotice': noticeObj } },
            { returnDocument: 'after' }
        );

        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        res.json({
            message: "Status notice updated successfully.",
            statusNotice: lesson.liveStream?.statusNotice || noticeObj
        });
    } catch (err) {
        console.error("Error updating live stream status notice:", err);
        res.status(500).json({ error: "Failed to update status notice." });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/status-notice (fallback)
router.post('/:lessonId/live-stream/status-notice', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const { icon, title, text } = req.body;
        if (!title && !text) {
            return res.status(400).json({ error: "Status notice title or text is required." });
        }

        const noticeObj = {
            icon: icon || '📡',
            title: String(title || 'Instructor Live Notice').trim(),
            text: String(text || '').trim(),
            updatedAt: new Date()
        };

        const lesson = await Lesson.findByIdAndUpdate(
            req.params.lessonId,
            { $set: { 'liveStream.statusNotice': noticeObj } },
            { returnDocument: 'after' }
        );

        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        res.json({
            message: "Status notice updated successfully.",
            statusNotice: lesson.liveStream?.statusNotice || noticeObj
        });
    } catch (err) {
        console.error("Error updating live stream status notice:", err);
        res.status(500).json({ error: "Failed to update status notice." });
    }
});

// @route   GET /api/lessons/:lessonId/live-stream/status
// @desc    Fast real-time live status check for student & teacher UI sync
router.get('/:lessonId/live-stream/status', protect, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId)
            .select('liveStream.isLive liveStream.isScheduled liveStream.endedAt liveStream.title liveStream.statusNotice')
            .lean();
        if (!lesson) {
            return res.json({ isLive: false, isScheduled: false });
        }
        const isEnded = Boolean(lesson.liveStream?.endedAt);
        res.json({
            isLive: Boolean(lesson.liveStream?.isLive) && !isEnded,
            isScheduled: Boolean(lesson.liveStream?.isScheduled) && !isEnded,
            title: lesson.liveStream?.title || '',
            statusNotice: lesson.liveStream?.statusNotice || null
        });
    } catch (err) {
        res.json({ isLive: false, isScheduled: false });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/viewer-ping
// @desc    Heartbeat ping from watching student to verify lively presence
router.post('/:lessonId/live-stream/viewer-ping', protect, async (req, res) => {
    try {
        const { isPlaying } = req.body;
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const isLive = Boolean(lesson.liveStream?.isLive);
        if (!isLive) {
            return res.json({
                isLive: false,
                streamEnded: true,
                activeViewerCount: 0
            });
        }

        if (!lesson.liveStream.viewers) {
            lesson.liveStream.viewers = [];
        }

        // Active cutoff: 25 seconds
        const activeCutoff = new Date(Date.now() - 25 * 1000);

        // Only students should be counted in viewers list
        if (req.user.role !== 'student') {
            const activeViewers = lesson.liveStream.viewers.filter(v => v.lastPing && new Date(v.lastPing) >= activeCutoff);
            return res.json({
                isLive: true,
                streamEnded: false,
                activeViewerCount: activeViewers.length,
                streamTitle: lesson.liveStream?.title
            });
        }

        const now = new Date();
        const userIdStr = req.user._id.toString();
        const existingViewerIndex = lesson.liveStream.viewers.findIndex(
            v => v.student && v.student.toString() === userIdStr
        );

        if (existingViewerIndex >= 0) {
            const viewer = lesson.liveStream.viewers[existingViewerIndex];
            const lastPing = viewer.lastPing ? new Date(viewer.lastPing).getTime() : now.getTime();
            const elapsed = Math.min(Math.max(Math.floor((now.getTime() - lastPing) / 1000), 0), 20);

            if (isPlaying) {
                viewer.watchedSeconds = (viewer.watchedSeconds || 0) + (elapsed > 0 ? elapsed : 5);
            }
            viewer.lastPing = now;
            viewer.isPlaying = Boolean(isPlaying);
            if (!viewer.name) viewer.name = req.user.name;
            if (!viewer.avatar) viewer.avatar = req.user.profilePicture;
            if (!viewer.grade) viewer.grade = req.user.grade || lesson.grade;
            if (!viewer.registrationNumber) viewer.registrationNumber = req.user.registrationNumber;
        } else {
            lesson.liveStream.viewers.push({
                student: req.user._id,
                name: req.user.name,
                email: req.user.email,
                registrationNumber: req.user.registrationNumber,
                avatar: req.user.profilePicture,
                grade: req.user.grade || lesson.grade,
                joinedAt: now,
                lastPing: now,
                isPlaying: Boolean(isPlaying),
                watchedSeconds: 5
            });
        }

        const activeViewers = lesson.liveStream.viewers.filter(v => v.lastPing && new Date(v.lastPing) >= activeCutoff);

        await lesson.save();

        res.json({
            isLive: true,
            streamEnded: false,
            activeViewerCount: activeViewers.length,
            streamTitle: lesson.liveStream?.title
        });
    } catch (err) {
        console.error("Viewer ping error:", err);
        res.status(500).json({ error: "Failed to record live presence: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/viewer-leave
// @desc    Immediately mark student as left to update active viewer count accurately
router.post('/:lessonId/live-stream/viewer-leave', protect, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson || !lesson.liveStream?.viewers) {
            return res.json({ success: true, activeViewerCount: 0 });
        }

        const userIdStr = req.user._id.toString();
        const viewer = lesson.liveStream.viewers.find(
            v => v.student && v.student.toString() === userIdStr
        );

        if (viewer) {
            viewer.lastPing = new Date(0); // Immediately expire lastPing
            viewer.isPlaying = false;
            await lesson.save();
        }

        const activeCutoff = new Date(Date.now() - 25 * 1000);
        const activeViewers = lesson.liveStream.viewers.filter(v => v.lastPing && new Date(v.lastPing) >= activeCutoff);

        res.json({ success: true, activeViewerCount: activeViewers.length });
    } catch (err) {
        res.status(500).json({ error: "Failed to process leave: " + err.message });
    }
});

// @route   GET /api/lessons/:lessonId/live-stream/viewers
// @desc    Get live viewing stats and list of lively watching students
router.get('/:lessonId/live-stream/viewers', protect, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId).populate({
            path: 'liveStream.viewers.student',
            select: 'name email profilePicture avatar grade registrationNumber phoneNumber studentType'
        });
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const isLive = Boolean(lesson.liveStream?.isLive);
        const rawViewers = lesson.liveStream?.viewers || [];
        const feedbacks = lesson.liveStream?.feedbacks || [];

        const activeCutoff = new Date(Date.now() - 25 * 1000);

        // Normalize viewers with populated student fields
        const viewers = rawViewers.map(v => {
            const vObj = v.toObject ? v.toObject() : v;
            const studentObj = (vObj.student && typeof vObj.student === 'object') ? vObj.student : null;
            const resolvedPic = studentObj?.profilePicture || studentObj?.avatar || vObj.avatar || vObj.profilePicture || '';
            return {
                ...vObj,
                studentId: studentObj?._id ? studentObj._id.toString() : (vObj.student ? vObj.student.toString() : ''),
                name: studentObj?.name || vObj.name || 'Student',
                email: studentObj?.email || vObj.email || '',
                profilePicture: resolvedPic,
                avatar: resolvedPic,
                grade: studentObj?.grade || vObj.grade || '',
                registrationNumber: studentObj?.registrationNumber || vObj.registrationNumber || '',
                phoneNumber: studentObj?.phoneNumber || vObj.phoneNumber || '',
                studentType: studentObj?.studentType || vObj.studentType || '',
                watchedSeconds: vObj.watchedSeconds || 0,
                joinedAt: vObj.joinedAt,
                lastPing: vObj.lastPing
            };
        });

        // Fallback: If any viewer has student ID or email but missing name or profile picture, query User model
        const missingUserIds = viewers
            .filter(v => (!v.name || v.name === 'Student' || !v.profilePicture) && v.studentId)
            .map(v => v.studentId);
        
        if (missingUserIds.length > 0) {
            const User = require('../models/User');
            const foundUsers = await User.find({ _id: { $in: missingUserIds } })
                .select('name email profilePicture avatar grade registrationNumber phoneNumber studentType');
            const userMap = new Map(foundUsers.map(u => [u._id.toString(), u]));
            viewers.forEach(v => {
                if (v.studentId && userMap.has(v.studentId)) {
                    const u = userMap.get(v.studentId);
                    if (!v.name || v.name === 'Student') v.name = u.name;
                    if (!v.email) v.email = u.email;
                    const uPic = u.profilePicture || u.avatar || '';
                    if (!v.profilePicture && uPic) {
                        v.profilePicture = uPic;
                        v.avatar = uPic;
                    }
                    if (!v.grade) v.grade = u.grade;
                    if (!v.registrationNumber) v.registrationNumber = u.registrationNumber;
                    if (!v.phoneNumber) v.phoneNumber = u.phoneNumber;
                    if (!v.studentType) v.studentType = u.studentType;
                }
            });
        }

        const activeViewers = viewers
            .filter(v => v.lastPing && new Date(v.lastPing) >= activeCutoff)
            .map(v => ({
                ...v,
                isLivelyWatching: true
            }));

        // Compute total and average watch metrics
        const totalWatchedSeconds = viewers.reduce((acc, v) => acc + (v.watchedSeconds || 0), 0);
        const averageWatchedSeconds = viewers.length > 0 ? Math.round(totalWatchedSeconds / viewers.length) : 0;
        const totalWatchedHours = Number((totalWatchedSeconds / 3600).toFixed(2));

        // Calculate stream session duration if available
        let streamDurationSeconds = 0;
        if (lesson.liveStream?.startedAt) {
            const startMs = new Date(lesson.liveStream.startedAt).getTime();
            const endMs = lesson.liveStream.endedAt ? new Date(lesson.liveStream.endedAt).getTime() : Date.now();
            if (endMs > startMs) {
                streamDurationSeconds = Math.round((endMs - startMs) / 1000);
            }
        }

        // Reactions count summary
        const reactionsSummary = {};
        feedbacks.forEach(f => {
            if (f.reaction) {
                reactionsSummary[f.reaction] = (reactionsSummary[f.reaction] || 0) + 1;
            }
        });

        res.json({
            isLive,
            activeViewerCount: activeViewers.length,
            totalViewersCount: viewers.length,
            totalWatchedSeconds,
            totalWatchedHours,
            averageWatchedSeconds,
            streamDurationSeconds,
            startedAt: lesson.liveStream?.startedAt,
            endedAt: lesson.liveStream?.endedAt,
            activeViewers,
            allViewers: viewers,
            feedbacksCount: feedbacks.length,
            reactionsSummary
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to get live viewers: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/messages
// @route   POST /api/lessons/:lessonId/live-stream/messages
// @desc    Send private or broadcast message / question during live class with attachments / photos
router.post('/:lessonId/live-stream/messages', protect, optionalLiveChatUpload, async (req, res) => {
    try {
        const { text, studentId: rawStudentIdBody, isBroadcast: isBroadcastRaw, photoData, audioData, audioDuration } = req.body;
        const isStudent = req.user.role === 'student';

        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
            return res.status(404).json({ error: "Class not found." });
        }

        // Clean & sanitize target student ID
        let cleanStudentId = rawStudentIdBody;
        if (cleanStudentId && typeof cleanStudentId === 'object') {
            cleanStudentId = cleanStudentId.studentId || cleanStudentId._id || cleanStudentId.id || null;
        }
        if (typeof cleanStudentId === 'string') {
            cleanStudentId = cleanStudentId.trim();
        }
        if (cleanStudentId === 'staff' || cleanStudentId === 'broadcast' || cleanStudentId === 'null' || cleanStudentId === 'undefined' || !cleanStudentId) {
            cleanStudentId = null;
        }

        const isStaffOnly = !isStudent && (
            req.body.isStaffOnly === 'true' ||
            req.body.isStaffOnly === true ||
            req.body.staffOnly === 'true' ||
            rawStudentIdBody === 'staff'
        );

        const isBroadcast = !isStudent && !isStaffOnly && (
            isBroadcastRaw === true ||
            isBroadcastRaw === 'true' ||
            !cleanStudentId
        );

        let studentContext = null;
        let recipient = null;

        if (isStaffOnly) {
            studentContext = null;
            recipient = null;
        } else if (isStudent) {
            studentContext = req.user._id;
            recipient = null;
        } else if (isBroadcast) {
            studentContext = null;
            recipient = null;
        } else if (cleanStudentId && mongoose.Types.ObjectId.isValid(cleanStudentId)) {
            studentContext = new mongoose.Types.ObjectId(cleanStudentId);
            recipient = new mongoose.Types.ObjectId(cleanStudentId);
        }

        let attachments = [];

        // 1. Handle uploaded file (image, audio or document)
        if (req.file) {
            const mime = (req.file.mimetype || '').toLowerCase();
            const orig = (req.file.originalname || '').toLowerCase();
            const fname = (req.file.filename || '').toLowerCase();

            const isImg = mime.startsWith('image/') || fname.endsWith('.jpg') || fname.endsWith('.jpeg') || fname.endsWith('.png') || fname.endsWith('.webp') || fname.endsWith('.gif');
            const isAud = mime.startsWith('audio/') ||
                mime.includes('webm') ||
                mime.includes('ogg') ||
                orig.includes('voice') ||
                orig.endsWith('.webm') ||
                orig.endsWith('.ogg') ||
                orig.endsWith('.m4a') ||
                fname.endsWith('.webm') ||
                fname.endsWith('.ogg') ||
                fname.endsWith('.m4a') ||
                fname.endsWith('.mp3') ||
                fname.endsWith('.wav');

            const cat = isImg ? 'image' : (isAud ? 'audio' : 'document');

            attachments.push({
                url: `/api/files/live/${lesson._id}/file/${req.file.filename}`,
                originalName: req.file.originalname || (isAud ? `voice-${Date.now()}.webm` : 'attachment'),
                fileType: isAud ? (mime.startsWith('audio/') ? mime : 'audio/webm') : (req.file.mimetype || 'application/octet-stream'),
                fileSize: req.file.size || 0,
                duration: Number(audioDuration) || 0,
                category: cat
            });
        }

        // 2. Handle camera photo capture (base64 string)
        if (photoData && typeof photoData === 'string' && photoData.startsWith('data:image/')) {
            try {
                const matches = photoData.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
                if (matches) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const base64Data = matches[2];
                    const filename = `live-cam-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
                    const filePath = path.join(liveChatUploadsDir, filename);
                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                    const stats = fs.statSync(filePath);
                    attachments.push({
                        url: `/api/files/live/${lesson._id}/file/${filename}`,
                        originalName: `camera-photo-${Date.now()}.${ext}`,
                        fileType: `image/${ext}`,
                        fileSize: stats.size,
                        duration: 0,
                        category: 'image'
                    });
                }
            } catch (camErr) {
                console.error("Camera save error:", camErr);
            }
        }

        // 3. Handle recorded voice note (base64 audio string)
        if (audioData && typeof audioData === 'string' && (audioData.startsWith('data:audio/') || audioData.includes('base64,'))) {
            try {
                const commaIdx = audioData.indexOf(',');
                if (commaIdx !== -1) {
                    const meta = audioData.substring(0, commaIdx).toLowerCase();
                    const base64Data = audioData.substring(commaIdx + 1);
                    let ext = 'webm';
                    if (meta.includes('mp4') || meta.includes('m4a') || meta.includes('aac')) ext = 'm4a';
                    else if (meta.includes('ogg')) ext = 'ogg';
                    else if (meta.includes('wav')) ext = 'wav';
                    else if (meta.includes('webm')) ext = 'webm';

                    const filename = `live-voice-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
                    const filePath = path.join(liveChatUploadsDir, filename);
                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
                    const stats = fs.statSync(filePath);
                    attachments.push({
                        url: `/api/files/live/${lesson._id}/file/${filename}`,
                        originalName: `voice-question-${Date.now()}.${ext}`,
                        fileType: `audio/${ext}`,
                        fileSize: stats.size,
                        duration: Number(audioDuration) || 0,
                        category: 'audio'
                    });
                }
            } catch (voiceErr) {
                console.error("Voice save error:", voiceErr);
            }
        }

        const messageText = text ? String(text).trim() : '';

        if (!messageText && attachments.length === 0) {
            return res.status(400).json({ error: "Message text or an attachment/photo is required." });
        }

        let senderAvatar = req.user.profilePicture || req.user.avatar || '';
        if (!senderAvatar) {
            const userNameLower = (req.user.name || '').toLowerCase();
            if (userNameLower.includes('chaminda') || userNameLower.includes('herath') || userNameLower.includes('kumara')) {
                senderAvatar = '/assets/founder_photo.png';
            } else if (userNameLower.includes('pathum')) {
                senderAvatar = '/assets/pathum_gunawardhana.png';
            } else if (userNameLower.includes('sankha')) {
                senderAvatar = '/assets/sankha_dissanayake.png';
            } else if (userNameLower.includes('lasantha')) {
                senderAvatar = '/assets/lasantha_wedagedara.png';
            } else if (userNameLower.includes('kevin')) {
                senderAvatar = '/assets/kevin_deraniyagala.png';
            } else if (userNameLower.includes('rashmi')) {
                senderAvatar = '/assets/rashmi_gunawardhana.png';
            } else if (req.user.role === 'admin' || req.user.role === 'superadmin') {
                senderAvatar = '/assets/LuminaLearn_Logo_icon.png';
            }
        }

        let normalizedSenderRole = req.user.role || 'student';
        if (normalizedSenderRole === 'instructor') normalizedSenderRole = 'teacher';
        if (normalizedSenderRole === 'superadmin') normalizedSenderRole = 'admin';
        if (!['student', 'teacher', 'instructor', 'admin', 'superadmin'].includes(normalizedSenderRole)) {
            normalizedSenderRole = 'student';
        }

        const newMsg = {
            _id: new mongoose.Types.ObjectId(),
            sender: req.user._id,
            senderName: req.user.name || 'User',
            senderRole: normalizedSenderRole,
            senderAvatar: senderAvatar,
            studentContext: isStaffOnly ? null : studentContext,
            recipient: isStaffOnly ? null : recipient,
            isBroadcast: isStaffOnly ? false : Boolean(isBroadcast),
            isStaffOnly: Boolean(isStaffOnly),
            text: messageText,
            attachments: attachments,
            createdAt: new Date()
        };

        // Ultra-fast atomic push update
        await Lesson.findByIdAndUpdate(
            req.params.lessonId,
            { $push: { 'liveStream.liveMessages': newMsg } },
            { returnDocument: 'after', select: '_id' }
        );

        // Non-blocking notification if student asked a question
        if (isStudent) {
            setImmediate(async () => {
                try {
                    const course = await Course.findById(lesson.course).select('instructor').lean();
                    const recipientId = course?.instructor || null;
                    if (recipientId && recipientId.toString() !== req.user._id.toString()) {
                        await Notification.create({
                            recipient: recipientId,
                            sender: req.user._id,
                            type: 'LIVE_CLASS',
                            title: `Live Class Question: ${req.user.name}`,
                            message: messageText || (attachments.length > 0 ? 'Sent an attachment/photo' : 'Live message'),
                            link: `/courses/${lesson.course}?grade=${lesson.grade}`,
                            metadata: { lessonId: lesson._id, courseId: lesson.course, studentId: req.user._id }
                        });
                    }
                } catch (notifErr) {
                    console.error("Live message notification error:", notifErr.message);
                }
            });
        }

        res.status(201).json({ message: "Message sent successfully!", liveMessage: newMsg });
    } catch (err) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error("Failed to send live message:", err);
        res.status(500).json({ error: "Failed to send live message: " + err.message });
    }
});

// @route   GET /api/lessons/:lessonId/live-stream/messages
// @desc    Get real-time private & broadcast messages for the live class
router.get('/:lessonId/live-stream/messages', protect, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId)
            .select('liveStream.liveMessages')
            .populate('liveStream.liveMessages.sender', 'name profilePicture avatar role')
            .lean();

        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const rawMessages = lesson.liveStream?.liveMessages || [];
        const allMessages = rawMessages.map(m => {
            const senderObj = (m.sender && typeof m.sender === 'object') ? m.sender : null;
            let currentAvatar = senderObj?.profilePicture || senderObj?.avatar || m.senderAvatar || '';
            let currentName = senderObj?.name || m.senderName || 'User';
            let currentRole = senderObj?.role || m.senderRole || 'student';

            // Clean up legacy fallback if it was saved as wrong founder_photo for a different instructor
            if (currentAvatar === '/assets/founder_photo.png') {
                const nameLower = currentName.toLowerCase();
                if (!nameLower.includes('chaminda') && !nameLower.includes('herath') && !nameLower.includes('kumara')) {
                    if (senderObj?.profilePicture) {
                        currentAvatar = senderObj.profilePicture;
                    } else if (nameLower.includes('pathum')) {
                        currentAvatar = '/assets/pathum_gunawardhana.png';
                    } else if (nameLower.includes('sankha')) {
                        currentAvatar = '/assets/sankha_dissanayake.png';
                    } else if (nameLower.includes('lasantha')) {
                        currentAvatar = '/assets/lasantha_wedagedara.png';
                    } else if (nameLower.includes('kevin')) {
                        currentAvatar = '/assets/kevin_deraniyagala.png';
                    } else if (nameLower.includes('rashmi')) {
                        currentAvatar = '/assets/rashmi_gunawardhana.png';
                    } else {
                        currentAvatar = '';
                    }
                }
            }

            return {
                ...m,
                sender: senderObj ? senderObj._id : m.sender,
                senderName: currentName,
                senderRole: currentRole,
                senderAvatar: currentAvatar
            };
        });
        const isStudent = req.user.role === 'student';

        if (isStudent) {
            const myUserId = req.user._id.toString();
            const isStreamLive = Boolean(lesson.liveStream?.isLive);
            // Fast filter for student: active broadcasts (during live) + student's own private questions & replies
            const myMessages = allMessages.filter(m => {
                if (m.isStaffOnly) return false;
                if (m.isBroadcast === true) return true;
                const ctxId = m.studentContext ? (typeof m.studentContext === 'object' ? m.studentContext._id?.toString() : m.studentContext.toString()) : null;
                const senderId = m.sender ? (typeof m.sender === 'object' ? m.sender._id?.toString() : m.sender.toString()) : null;
                const recipientId = m.recipient ? (typeof m.recipient === 'object' ? m.recipient._id?.toString() : m.recipient.toString()) : null;
                return ctxId === myUserId || senderId === myUserId || recipientId === myUserId;
            });
            return res.json({ messages: myMessages, totalMessages: myMessages.length });
        }

        // For Teacher & Admin: Return all messages so frontend has full in-memory instant state
        const staffMessages = [];
        const threadMap = new Map();

        // Fast reverse pass for thread aggregation
        for (let i = allMessages.length - 1; i >= 0; i--) {
            const msg = allMessages[i];
            if (msg.isStaffOnly) {
                staffMessages.unshift(msg);
                continue;
            }
            if (msg.isBroadcast) continue;

            const ctxId = msg.studentContext ? (typeof msg.studentContext === 'object' ? msg.studentContext._id?.toString() : msg.studentContext.toString()) : null;
            if (!ctxId) continue;

            if (!threadMap.has(ctxId)) {
                threadMap.set(ctxId, {
                    studentId: ctxId,
                    studentName: msg.senderRole === 'student' ? msg.senderName : 'Student',
                    studentAvatar: msg.senderRole === 'student' ? msg.senderAvatar : '',
                    lastMessage: msg.text || (msg.attachments?.length > 0 ? '📎 Attachment' : ''),
                    lastMessageTime: msg.createdAt,
                    lastSenderRole: msg.senderRole,
                    hasUnread: msg.senderRole === 'student',
                    messageCount: 1
                });
            } else {
                const thread = threadMap.get(ctxId);
                thread.messageCount += 1;
                if (msg.senderRole === 'student' && (!thread.studentName || thread.studentName === 'Student')) {
                    thread.studentName = msg.senderName;
                    if (msg.senderAvatar) thread.studentAvatar = msg.senderAvatar;
                }
            }
        }

        const studentThreads = Array.from(threadMap.values());

        // Fill in missing student names/avatars using database lookup if needed
        const unknownIds = studentThreads.filter(t => !t.studentName || t.studentName === 'Student').map(t => t.studentId);
        if (unknownIds.length > 0) {
            try {
                const foundUsers = await User.find({ _id: { $in: unknownIds } }).select('name profilePicture avatar').lean();
                const uMap = new Map(foundUsers.map(u => [u._id.toString(), u]));
                studentThreads.forEach(t => {
                    const u = uMap.get(t.studentId);
                    if (u) {
                        t.studentName = u.name || t.studentName;
                        t.studentAvatar = u.profilePicture || u.avatar || t.studentAvatar;
                    }
                });
            } catch (uErr) { }
        }

        res.json({
            messages: allMessages,
            studentThreads,
            staffMessages: staffMessages,
            totalMessages: allMessages.length
        });
    } catch (err) {
        console.error("Failed to get live messages:", err);
        res.status(500).json({ error: "Failed to get live messages: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/voice-request
// @desc    Student requests permission to speak live or mutes/cancels
router.post('/:lessonId/live-stream/voice-request', protect, async (req, res) => {
    try {
        const { action } = req.body; // 'request' | 'cancel' | 'mute'
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!lesson.liveStream) lesson.liveStream = {};
        if (!lesson.liveStream.liveSpeaking) {
            lesson.liveStream.liveSpeaking = { requests: [] };
        }
        if (!lesson.liveStream.liveSpeaking.requests) {
            lesson.liveStream.liveSpeaking.requests = [];
        }

        const userIdStr = req.user._id.toString();

        if (action === 'request') {
            // Find existing request or create new
            let existing = lesson.liveStream.liveSpeaking.requests.find(
                r => r.student && r.student.toString() === userIdStr && r.status === 'pending'
            );

            if (!existing) {
                const newReq = {
                    student: req.user._id,
                    name: req.user.name,
                    avatar: req.user.profilePicture || '',
                    grade: req.user.grade || lesson.grade || '',
                    status: 'pending',
                    requestedAt: new Date()
                };
                lesson.liveStream.liveSpeaking.requests.push(newReq);

                // Add notice in live messages for admin/teacher
                if (!lesson.liveStream.liveMessages) lesson.liveStream.liveMessages = [];
                lesson.liveStream.liveMessages.push({
                    sender: req.user._id,
                    senderName: req.user.name,
                    senderRole: req.user.role || 'student',
                    senderAvatar: req.user.profilePicture || req.user.avatar || '',
                    studentContext: req.user._id,
                    isBroadcast: false,
                    text: '🎙️ [Live Mic Request] Asked permission to speak live to ask a question.',
                    createdAt: new Date()
                });
            }

            await lesson.save();
            return res.json({ message: "Live mic speaking permission requested.", status: 'pending' });
        } else if (action === 'cancel' || action === 'mute') {
            // Cancel request / mute
            lesson.liveStream.liveSpeaking.requests.forEach(r => {
                if (r.student && r.student.toString() === userIdStr && (r.status === 'pending' || r.status === 'approved')) {
                    r.status = 'ended';
                }
            });

            if (lesson.liveStream.liveSpeaking.activeSpeaker?.student?.toString() === userIdStr) {
                lesson.liveStream.liveSpeaking.activeSpeaker = null;
            }

            await lesson.save();
            return res.json({ message: "Microphone muted.", status: 'muted' });
        }

        res.status(400).json({ error: "Invalid action." });
    } catch (err) {
        res.status(500).json({ error: "Failed to process voice request: " + err.message });
    }
});

// @route   GET /api/lessons/:lessonId/live-stream/voice-status
// @desc    Poll active live speaker and voice permission requests
router.get('/:lessonId/live-stream/voice-status', protect, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const isTeacherOrAdmin = ['admin', 'teacher', 'superadmin'].includes(req.user.role);
        const liveSpeaking = lesson.liveStream?.liveSpeaking || { requests: [] };
        const activeSpeaker = liveSpeaking.activeSpeaker || null;

        let myRequest = null;
        if (!isTeacherOrAdmin) {
            const myRequests = (liveSpeaking.requests || []).filter(
                r => r.student && r.student.toString() === req.user._id.toString()
            );
            myRequest = myRequests[myRequests.length - 1] || null;
        }

        const pendingRequests = isTeacherOrAdmin
            ? (liveSpeaking.requests || []).filter(r => r.status === 'pending')
            : [];

        res.json({
            activeSpeaker,
            myRequest,
            pendingRequests
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to get voice status: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/voice-respond
// @desc    Teacher/Admin responds to live speaking request (approve, reject, mute)
router.post('/:lessonId/live-stream/voice-respond', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const { requestId, action } = req.body; // action: 'approve' | 'reject' | 'mute'
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!lesson.liveStream) lesson.liveStream = {};
        if (!lesson.liveStream.liveSpeaking) {
            lesson.liveStream.liveSpeaking = { requests: [] };
        }

        if (action === 'mute') {
            lesson.liveStream.liveSpeaking.activeSpeaker = null;
            if (requestId) {
                const reqItem = lesson.liveStream.liveSpeaking.requests.id(requestId);
                if (reqItem) reqItem.status = 'ended';
            }
            await lesson.save();
            return res.json({ message: "Student muted.", activeSpeaker: null });
        }

        const reqItem = lesson.liveStream.liveSpeaking.requests.id(requestId);
        if (!reqItem) {
            return res.status(404).json({ error: "Speaking request not found." });
        }

        reqItem.respondedAt = new Date();

        if (action === 'approve') {
            reqItem.status = 'approved';
            lesson.liveStream.liveSpeaking.activeSpeaker = {
                student: reqItem.student,
                name: reqItem.name,
                avatar: reqItem.avatar || '',
                approvedAt: new Date(),
                isLive: true
            };

            // Notice message
            if (!lesson.liveStream.liveMessages) lesson.liveStream.liveMessages = [];
            lesson.liveStream.liveMessages.push({
                sender: req.user._id,
                senderName: req.user.name,
                senderRole: req.user.role,
                senderAvatar: req.user.profilePicture || req.user.avatar || '',
                studentContext: reqItem.student,
                isBroadcast: false,
                text: `🎙️ Permission granted to ${reqItem.name}. Live microphone is now active.`,
                createdAt: new Date()
            });
        } else if (action === 'reject') {
            reqItem.status = 'rejected';
        }

        await lesson.save();
        res.json({
            message: `Request ${action}d successfully.`,
            status: reqItem.status,
            activeSpeaker: lesson.liveStream.liveSpeaking.activeSpeaker
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to respond to voice request: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/voice-chunk
// @desc    Live speaker streams audio chunk for teacher & admin to listen
router.post('/:lessonId/live-stream/voice-chunk', protect, async (req, res) => {
    try {
        const { audioData, duration } = req.body;
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!audioData || typeof audioData !== 'string' || !audioData.startsWith('data:audio/')) {
            return res.status(400).json({ error: "Valid audio data required." });
        }

        const matches = audioData.match(/^data:audio\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ error: "Invalid audio format." });
        }

        const ext = matches[1] === 'webm' ? 'webm' : matches[1] === 'mp4' ? 'm4a' : 'webm';
        const base64Data = matches[2];
        const filename = `live-chunk-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;
        const filePath = path.join(liveChatUploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        const stats = fs.statSync(filePath);
        const chunkUrl = `/api/files/live/${lesson._id}/file/${filename}`;

        if (!lesson.liveStream.liveSpeaking) {
            lesson.liveStream.liveSpeaking = { requests: [] };
        }

        const newMsg = {
            sender: req.user._id,
            senderName: req.user.name,
            senderRole: req.user.role || 'student',
            senderAvatar: req.user.profilePicture || req.user.avatar || '',
            studentContext: req.user._id,
            isBroadcast: false,
            text: '🎙️ Live Voice Question Stream',
            attachments: [{
                url: chunkUrl,
                originalName: `live-voice-stream-${Date.now()}.${ext}`,
                fileType: `audio/${ext}`,
                fileSize: stats.size,
                duration: Number(duration) || 0,
                category: 'audio'
            }],
            createdAt: new Date()
        };

        if (!lesson.liveStream.liveMessages) lesson.liveStream.liveMessages = [];
        lesson.liveStream.liveMessages.push(newMsg);
        await lesson.save();

        res.json({ success: true, audioUrl: chunkUrl, liveMessage: newMsg });
    } catch (err) {
        res.status(500).json({ error: "Failed to upload voice chunk: " + err.message });
    }
});

// @route   GET /api/lessons/student-profile/:studentId
// @desc    Get detailed student profile and all enrolled/assigned courses for users
router.get('/student-profile/:studentId', protect, async (req, res) => {
    try {
        const student = await User.findById(req.params.studentId).select(
            'name email registrationNumber phoneNumber parentsPhoneNumber profilePicture grade studentType address dateOfBirth createdAt'
        );

        if (!student) {
            return res.status(404).json({ error: "Student not found." });
        }

        // Fetch all enrolled courses
        const enrollments = await Enrollment.find({ student: student._id }).populate({
            path: 'course',
            select: 'title subject grade category cardImage status instructor',
            populate: { path: 'instructor', select: 'name email profilePicture' }
        });

        const directCourses = await Course.find({
            $or: [
                { enrolledStudents: student._id },
                { 'enrolledGrades.gradeNumber': student.grade }
            ]
        }).select('title subject grade category cardImage status instructor').populate('instructor', 'name email');

        // Merge courses uniquely
        const courseMap = new Map();
        for (const e of enrollments) {
            if (e.course) courseMap.set(e.course._id.toString(), e.course);
        }
        for (const c of directCourses) {
            if (c) courseMap.set(c._id.toString(), c);
        }

        const enrolledCourses = Array.from(courseMap.values());

        res.json({
            student,
            enrolledCourses,
            totalCourses: enrolledCourses.length
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to get student profile: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/feedback
// @desc    Submit post-live feedback, lecture question, and curated good reaction
router.post('/:lessonId/live-stream/feedback', protect, async (req, res) => {
    try {
        const { message, question, reaction, reactionLabel, reactionEmoji } = req.body;

        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        if (!lesson.liveStream.feedbacks) {
            lesson.liveStream.feedbacks = [];
        }

        const userIdStr = req.user._id.toString();
        const existingIdx = lesson.liveStream.feedbacks.findIndex(
            f => f.student && f.student.toString() === userIdStr
        );

        const feedbackData = {
            student: req.user._id,
            name: req.user.name,
            email: req.user.email,
            grade: req.user.grade || lesson.grade,
            avatar: req.user.profilePicture,
            message: message ? String(message).trim() : '',
            question: question ? String(question).trim() : '',
            reaction: reaction || 'superb',
            reactionLabel: reactionLabel || 'Superb Class',
            reactionEmoji: reactionEmoji || '⭐',
            submittedAt: new Date()
        };

        if (existingIdx >= 0) {
            lesson.liveStream.feedbacks[existingIdx] = {
                ...lesson.liveStream.feedbacks[existingIdx].toObject?.() || lesson.liveStream.feedbacks[existingIdx],
                ...feedbackData
            };
        } else {
            lesson.liveStream.feedbacks.push(feedbackData);
        }

        await lesson.save();

        // Notify instructor
        try {
            const course = await Course.findById(lesson.course);
            const teacherId = course?.instructor;
            if (teacherId && teacherId.toString() !== req.user._id.toString()) {
                let notifTitle = `Live Class Feedback: ${req.user.name} (${feedbackData.reactionEmoji} ${feedbackData.reactionLabel})`;
                let notifBody = feedbackData.question
                    ? `Question: "${feedbackData.question}"`
                    : feedbackData.message
                        ? `Feedback: "${feedbackData.message}"`
                        : `${req.user.name} reacted with ${feedbackData.reactionEmoji} ${feedbackData.reactionLabel}`;

                await Notification.create({
                    recipient: teacherId,
                    sender: req.user._id,
                    type: 'LIVE_CLASS',
                    title: notifTitle,
                    message: notifBody,
                    link: `/courses/${lesson.course}?grade=${lesson.grade}`,
                    metadata: { lessonId: lesson._id, courseId: lesson.course }
                });
            }
        } catch (notifErr) {
            console.error("Live feedback notification error:", notifErr.message);
        }

        res.status(201).json({
            message: "Thank you! Your feedback and questions have been submitted.",
            feedback: feedbackData
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to submit feedback: " + err.message });
    }
});

// @route   GET /api/lessons/:lessonId/live-stream/feedbacks
// @desc    Get all post-live feedbacks and questions for this class
router.get('/:lessonId/live-stream/feedbacks', protect, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId)
            .populate({
                path: 'liveStream.feedbacks.student',
                select: 'name email profilePicture grade registrationNumber phoneNumber'
            })
            .populate({
                path: 'liveStream.feedbacks.reply.repliedBy',
                select: 'name email role profilePicture avatar'
            });
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const rawFeedbacks = lesson.liveStream?.feedbacks || [];

        // When teacher or admin opens the feedbacks, mark any unseen feedbacks as seen
        if (req.user.role === 'teacher' || req.user.role === 'admin') {
            let hasUnseen = false;
            rawFeedbacks.forEach(f => {
                if (!f.seen) {
                    f.seen = true;
                    f.seenAt = f.seenAt || new Date();
                    f.seenBy = req.user._id;
                    f.seenByName = req.user.name || (req.user.role === 'admin' ? 'Admin' : 'Teacher');
                    hasUnseen = true;
                }
            });
            if (hasUnseen) {
                await lesson.save().catch(e => console.error("Error saving seen feedbacks:", e));
            }
        }

        const liveMessages = lesson.liveStream?.liveMessages || [];
        const teacherRepliedStudentIds = new Set();
        liveMessages.forEach(m => {
            if (m.senderRole !== 'student' && (m.studentContext || m.recipient)) {
                const target = (m.studentContext || m.recipient).toString();
                teacherRepliedStudentIds.add(target);
            }
        });

        const feedbacks = rawFeedbacks.map(f => {
            const fObj = f.toObject ? f.toObject() : { ...f };
            const studentUser = fObj.student && typeof fObj.student === 'object' && fObj.student._id ? fObj.student : null;
            const studentId = studentUser ? studentUser._id.toString() : (fObj.student ? fObj.student.toString() : '');
            const isReplied = Boolean(fObj.reply?.repliedAt || fObj.reply?.text || (studentId && teacherRepliedStudentIds.has(studentId)));
            const resolvedPic = studentUser?.profilePicture || fObj.avatar || fObj.profilePicture || '';

            const replier = fObj.reply?.repliedBy;
            const replierRole = fObj.reply?.role || fObj.reply?.repliedByRole || (typeof replier === 'object' ? replier?.role : null);
            const resolvedReply = fObj.reply ? {
                ...fObj.reply,
                role: replierRole || (fObj.reply.repliedByName?.toLowerCase().includes('admin') ? 'admin' : 'teacher'),
                repliedByRole: replierRole || (fObj.reply.repliedByName?.toLowerCase().includes('admin') ? 'admin' : 'teacher'),
                repliedByName: fObj.reply.repliedByName || (typeof replier === 'object' ? replier?.name : null)
            } : null;

            return {
                ...fObj,
                studentId,
                studentName: studentUser?.name || fObj.name || 'Student',
                studentEmail: studentUser?.email || fObj.email || '',
                studentProfilePicture: resolvedPic,
                avatar: resolvedPic,
                profilePicture: resolvedPic,
                grade: studentUser?.grade || fObj.grade || '',
                isReplied,
                reply: resolvedReply
            };
        });

        // Fallback: If any feedback is missing student details or photo, query User model
        const missingFeedbackStudentIds = feedbacks
            .filter(f => (!f.studentProfilePicture || !f.avatar) && f.studentId)
            .map(f => f.studentId);

        if (missingFeedbackStudentIds.length > 0) {
            const User = require('../models/User');
            const foundUsers = await User.find({ _id: { $in: missingFeedbackStudentIds } })
                .select('name email profilePicture avatar grade registrationNumber phoneNumber studentType');
            const userMap = new Map(foundUsers.map(u => [u._id.toString(), u]));
            feedbacks.forEach(f => {
                if (f.studentId && userMap.has(f.studentId)) {
                    const u = userMap.get(f.studentId);
                    if (!f.studentName || f.studentName === 'Student') f.studentName = u.name;
                    if (!f.studentEmail) f.studentEmail = u.email;
                    const pic = u.profilePicture || u.avatar || '';
                    if (pic) {
                        f.studentProfilePicture = pic;
                        f.avatar = pic;
                        f.profilePicture = pic;
                    }
                }
            });
        }

        // Summary metrics
        const reactionsSummary = {};
        feedbacks.forEach(f => {
            if (f.reaction) {
                reactionsSummary[f.reaction] = (reactionsSummary[f.reaction] || 0) + 1;
            }
        });

        // Sort: 1. Unreplied / Unread first ("unread in up"), 2. Latest timestamp first ("latest in up")
        feedbacks.sort((a, b) => {
            if (!a.isReplied && b.isReplied) return -1;
            if (a.isReplied && !b.isReplied) return 1;
            const aTime = new Date(a.submittedAt || a.createdAt || (a._id ? parseInt(a._id.toString().substring(0, 8), 16) * 1000 : 0)).getTime();
            const bTime = new Date(b.submittedAt || b.createdAt || (b._id ? parseInt(b._id.toString().substring(0, 8), 16) * 1000 : 0)).getTime();
            return bTime - aTime;
        });

        const unrepliedCount = feedbacks.filter(f => !f.isReplied).length;
        const repliedCount = feedbacks.filter(f => f.isReplied).length;

        res.json({
            feedbacks,
            totalFeedbacks: feedbacks.length,
            unrepliedCount,
            repliedCount,
            reactionsSummary
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to get feedbacks: " + err.message });
    }
});

// @route   GET /api/lessons/:lessonId/student-live-status
// @desc    Get student's live stream attendance, reaction, and teacher reply
router.get('/:lessonId/student-live-status', protect, async (req, res) => {
    try {
        const studentId = req.user._id.toString();
        const studentEmail = req.user.email ? req.user.email.toLowerCase() : '';

        const lesson = await Lesson.findById(req.params.lessonId)
            .select('grade course createdAt liveStream.title liveStream.startedAt liveStream.endedAt liveStream.isLive liveStream.isScheduled liveStream.isEnded liveStream.viewers liveStream.feedbacks liveStream.liveMessages')
            .populate({
                path: 'liveStream.feedbacks.reply.repliedBy',
                select: 'name email profilePicture avatar role'
            })
            .populate({
                path: 'liveStream.liveMessages.sender',
                select: 'name email profilePicture avatar role'
            })
            .lean();

        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const liveStream = lesson.liveStream || {};

        // Only concluded/ended live streams can have review and feedback checked
        if (liveStream.isLive || liveStream.isScheduled || (!liveStream.endedAt && !liveStream.isEnded)) {
            return res.status(400).json({
                error: "This live class has not ended yet. Student feedback and attendance review are only available after the live broadcast concludes."
            });
        }

        const sessionInfo = {
            lessonId: lesson._id,
            title: liveStream.title || `Grade ${lesson.grade} Live Class`,
            startedAt: liveStream.startedAt || lesson.createdAt,
            endedAt: liveStream.endedAt || null,
            isLive: liveStream.isLive || false,
            grade: lesson.grade,
            courseId: lesson.course
        };

        // 1. Check viewers array for attendance
        const viewers = liveStream.viewers || [];
        const viewerEntry = viewers.find(v => {
            const vStudent = v.student?.toString();
            const vEmail = v.email ? v.email.toLowerCase() : '';
            return (vStudent && vStudent === studentId) || (vEmail && studentEmail && vEmail === studentEmail);
        });

        // 2. Check feedbacks array for student's submission
        const feedbacks = liveStream.feedbacks || [];
        const feedbackEntry = feedbacks.find(f => {
            const fStudent = f.student?._id ? f.student._id.toString() : (f.student ? f.student.toString() : '');
            const fEmail = f.email ? f.email.toLowerCase() : '';
            return (fStudent && fStudent === studentId) || (fEmail && studentEmail && fEmail === studentEmail);
        });

        // If not in viewers and not in feedbacks, student is absent
        const isAttended = Boolean(viewerEntry || feedbackEntry);

        if (!isAttended) {
            return res.json({
                isAbsent: true,
                attended: false,
                session: sessionInfo,
                message: "You did not attend this live session."
            });
        }

        // Student attended!
        const watchedSeconds = viewerEntry?.watchedSeconds || 0;
        const joinedAt = viewerEntry?.joinedAt || null;

        // Extract student's reaction & feedback
        let studentReaction = null;
        if (feedbackEntry) {
            studentReaction = {
                id: feedbackEntry._id,
                reaction: feedbackEntry.reaction,
                reactionLabel: feedbackEntry.reactionLabel,
                reactionEmoji: feedbackEntry.reactionEmoji,
                message: feedbackEntry.message || '',
                question: feedbackEntry.question || '',
                submittedAt: feedbackEntry.submittedAt || null,
                seen: Boolean(feedbackEntry.seen),
                seenAt: feedbackEntry.seenAt || null,
                seenByName: feedbackEntry.seenByName || null
            };
        }

        // Extract teacher's reply
        let teacherReply = null;
        if (feedbackEntry?.reply && (feedbackEntry.reply.text || feedbackEntry.reply.repliedAt)) {
            const replier = feedbackEntry.reply.repliedBy;
            teacherReply = {
                text: feedbackEntry.reply.text,
                repliedAt: feedbackEntry.reply.repliedAt,
                teacherName: replier?.name || 'Teacher',
                teacherAvatar: replier?.profilePicture || replier?.avatar || '',
                teacherRole: replier?.role || 'teacher'
            };
        }

        // Also check if there are direct live messages from teacher to this student
        const liveMessages = liveStream.liveMessages || [];
        const teacherDirectMessages = liveMessages
            .filter(m => {
                const targetStudent = m.studentContext?.toString() || m.recipient?.toString();
                return targetStudent === studentId && m.senderRole !== 'student' && !m.isBroadcast;
            })
            .map(m => ({
                id: m._id,
                text: m.text,
                senderName: m.senderName || m.sender?.name || 'Teacher',
                senderAvatar: m.senderAvatar || m.sender?.profilePicture || m.sender?.avatar || '',
                senderRole: m.senderRole,
                createdAt: m.createdAt
            }));

        // If no reply on feedbackEntry, but teacher sent direct messages, use the latest teacher message
        if (!teacherReply && teacherDirectMessages.length > 0) {
            const latestMsg = teacherDirectMessages[teacherDirectMessages.length - 1];
            teacherReply = {
                text: latestMsg.text,
                repliedAt: latestMsg.createdAt,
                teacherName: latestMsg.senderName,
                teacherAvatar: latestMsg.senderAvatar,
                teacherRole: latestMsg.senderRole
            };
        }

        const hasTeacherReacted = Boolean(teacherReply?.text);
        const hasTeacherSeen = Boolean(feedbackEntry?.seen || hasTeacherReacted);
        const seenAt = feedbackEntry?.seenAt || null;
        const seenByName = feedbackEntry?.seenByName || null;
        const studentSeenReply = Boolean(feedbackEntry?.reply?.studentSeen);
        const hasUnseenReply = Boolean(hasTeacherReacted && !studentSeenReply);

        return res.json({
            isAbsent: false,
            attended: true,
            watchedSeconds,
            joinedAt,
            session: sessionInfo,
            studentReaction,
            teacherReply,
            teacherDirectMessages,
            hasTeacherSeen,
            hasTeacherReacted,
            seenAt,
            seenByName,
            studentSeenReply,
            hasUnseenReply
        });
    } catch (err) {
        console.error("GET /lessons/:lessonId/student-live-status error:", err);
        res.status(500).json({ error: "Failed to fetch student live status: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/feedbacks/reply/student-seen
// @desc    Mark teacher's reply as seen by the student
router.post('/:lessonId/live-stream/feedbacks/reply/student-seen', protect, async (req, res) => {
    try {
        const studentId = req.user._id ? req.user._id.toString() : '';
        const studentEmail = req.user.email ? req.user.email.toLowerCase() : '';

        // Ultra-fast atomic update
        const result = await Lesson.updateOne(
            {
                _id: req.params.lessonId,
                $or: [
                    { 'liveStream.feedbacks.student': req.user._id },
                    { 'liveStream.feedbacks.email': studentEmail }
                ]
            },
            {
                $set: {
                    'liveStream.feedbacks.$[elem].reply.studentSeen': true,
                    'liveStream.feedbacks.$[elem].reply.studentSeenAt': new Date()
                }
            },
            {
                arrayFilters: [
                    {
                        $and: [
                            {
                                $or: [
                                    { 'elem.student': req.user._id },
                                    { 'elem.email': studentEmail }
                                ]
                            },
                            { 'elem.reply.studentSeen': { $ne: true } }
                        ]
                    }
                ]
            }
        );

        if (result.matchedCount > 0) {
            return res.json({ message: "Reply marked as seen by student.", updated: result.modifiedCount > 0 });
        }

        // Fallback if string ID matching was needed
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson || !lesson.liveStream?.feedbacks) {
            return res.status(404).json({ error: "Class or feedbacks not found." });
        }

        let updated = false;
        lesson.liveStream.feedbacks.forEach(f => {
            const fStudent = (f.student?._id || f.student || '').toString();
            const fEmail = (f.email || '').toLowerCase();
            if ((fStudent && fStudent === studentId) || (fEmail && studentEmail && fEmail === studentEmail)) {
                if (f.reply && !f.reply.studentSeen) {
                    f.reply.studentSeen = true;
                    f.reply.studentSeenAt = new Date();
                    updated = true;
                }
            }
        });

        if (updated) {
            await lesson.save();
        }

        res.json({ message: "Reply marked as seen by student.", updated });
    } catch (err) {
        console.error("Error marking reply as seen by student:", err);
        res.status(500).json({ error: "Failed to mark reply as seen: " + err.message });
    }
});

// @route   GET /api/lessons/course/:courseId/student-unseen-replies
// @desc    Get all lesson IDs that have unseen teacher replies for this student
router.get('/course/:courseId/student-unseen-replies', protect, async (req, res) => {
    try {
        const studentId = req.user._id ? req.user._id.toString() : '';
        const studentEmail = req.user.email ? req.user.email.toLowerCase() : '';

        const lessons = await Lesson.find({ 
            course: req.params.courseId,
            'liveStream.feedbacks': { $exists: true, $not: { $size: 0 } }
        }).select('_id grade liveStream.feedbacks.student liveStream.feedbacks.email liveStream.feedbacks.reply').lean();

        const unseenLessonIds = [];
        lessons.forEach(l => {
            const feedbacks = l.liveStream?.feedbacks || [];
            const hasUnseen = feedbacks.some(f => {
                const fStudent = (f.student?._id || f.student || '').toString();
                const fEmail = (f.email || '').toLowerCase();
                const matches = (fStudent && fStudent === studentId) || (fEmail && studentEmail && fEmail === studentEmail);
                return matches && f.reply && f.reply.text && !f.reply.studentSeen;
            });
            if (hasUnseen) {
                unseenLessonIds.push(l._id.toString());
            }
        });

        res.json({
            hasUnseenReplies: unseenLessonIds.length > 0,
            unseenLessonIds,
            unseenCount: unseenLessonIds.length
        });
    } catch (err) {
        console.error("GET /student-unseen-replies error:", err);
        res.status(500).json({ hasUnseenReplies: false, unseenLessonIds: [] });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/feedbacks/reply
// @desc    Mark a student live stream feedback as replied by teacher/admin
router.post('/:lessonId/live-stream/feedbacks/reply', protect, async (req, res) => {
    try {
        const { feedbackId, studentId, text } = req.body;
        const userRole = (req.user.role === 'admin' || req.user.role === 'superadmin') ? 'admin' : 'teacher';
        const replyObj = {
            text: text ? String(text).trim() : 'Replied',
            repliedBy: req.user._id,
            repliedAt: new Date(),
            role: userRole,
            repliedByRole: userRole,
            repliedByName: req.user.name || (userRole === 'admin' ? 'Admin' : 'Teacher'),
            studentSeen: false,
            studentSeenAt: null
        };

        // Attempt direct fast positional atomic update
        let updated = false;
        if (feedbackId) {
            const upRes = await Lesson.updateOne(
                { _id: req.params.lessonId, 'liveStream.feedbacks._id': feedbackId },
                {
                    $set: {
                        'liveStream.feedbacks.$.reply': replyObj,
                        'liveStream.feedbacks.$.seen': true,
                        'liveStream.feedbacks.$.seenAt': new Date(),
                        'liveStream.feedbacks.$.seenBy': req.user._id,
                        'liveStream.feedbacks.$.seenByName': req.user.name || (userRole === 'admin' ? 'Admin' : 'Teacher')
                    }
                }
            );
            if (upRes.matchedCount > 0) updated = true;
        }

        if (!updated && studentId) {
            const upRes = await Lesson.updateOne(
                { _id: req.params.lessonId, 'liveStream.feedbacks.student': studentId },
                {
                    $set: {
                        'liveStream.feedbacks.$.reply': replyObj,
                        'liveStream.feedbacks.$.seen': true,
                        'liveStream.feedbacks.$.seenAt': new Date(),
                        'liveStream.feedbacks.$.seenBy': req.user._id,
                        'liveStream.feedbacks.$.seenByName': req.user.name || (userRole === 'admin' ? 'Admin' : 'Teacher')
                    }
                }
            );
            if (upRes.matchedCount > 0) updated = true;
        }

        if (!updated) {
            // Document fallback
            const lesson = await Lesson.findById(req.params.lessonId);
            if (!lesson) {
                return res.status(404).json({ error: "Class not found." });
            }
            if (lesson.liveStream?.feedbacks) {
                const fb = lesson.liveStream.feedbacks.find(f => 
                    (feedbackId && f._id && f._id.toString() === feedbackId.toString()) ||
                    (studentId && (f.student?._id || f.student || '').toString() === studentId.toString())
                );
                if (fb) {
                    fb.reply = replyObj;
                    fb.seen = true;
                    fb.seenAt = new Date();
                    fb.seenBy = req.user._id;
                    fb.seenByName = req.user.name || (userRole === 'admin' ? 'Admin' : 'Teacher');
                    await lesson.save();
                    updated = true;
                }
            }
        }

        res.json({ message: "Feedback marked as replied successfully!", reply: replyObj });
    } catch (err) {
        console.error("Failed to mark feedback as replied:", err);
        res.status(500).json({ error: "Failed to mark feedback as replied: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream/record-attendance
// @desc    Record online attendance for all active viewers of this live class session
router.post('/:lessonId/live-stream/record-attendance', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const viewers = lesson.liveStream?.viewers || [];
        if (viewers.length === 0) {
            return res.status(400).json({ message: "No live stream viewers recorded for this class yet." });
        }

        const courseId = lesson.course;
        const now = new Date();
        const currentMonthName = now.toLocaleString('en-US', { month: 'long' });
        const currentYear = now.getFullYear();
        const monthStr = `${currentMonthName} ${currentYear}`;

        const dayOfMonth = now.getDate();
        let weekNumber = 1;
        if (dayOfMonth <= 7) weekNumber = 1;
        else if (dayOfMonth <= 14) weekNumber = 2;
        else if (dayOfMonth <= 21) weekNumber = 3;
        else weekNumber = 4;

        let recordedCount = 0;

        for (const viewer of viewers) {
            if (!viewer.student) continue;

            const existing = await Attendance.findOne({
                studentId: viewer.student,
                courseId: courseId,
                weekNumber: weekNumber,
                month: monthStr
            });

            if (!existing) {
                await Attendance.create({
                    studentId: viewer.student,
                    courseId: courseId,
                    weekNumber: weekNumber,
                    month: monthStr,
                    mode: 'ONLINE_WEEKLY',
                    status: 'Present',
                    date: now,
                    markedBy: req.user._id
                });
                recordedCount++;
            }
        }

        res.json({
            message: `Successfully recorded live attendance for ${recordedCount} student(s)!`,
            recordedCount,
            totalViewers: viewers.length
        });
    } catch (err) {
        console.error("Live attendance recording error:", err);
        res.status(500).json({ error: "Failed to record live attendance: " + err.message });
    }
});

module.exports = router;