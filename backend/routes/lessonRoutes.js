const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Lesson = require('../models/Lesson');
const Course = require('../models/Course');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const uploadPdfMiddleware = require('../middleware/pdfUpload');
const { sendCourseUpdateEmail } = require('../utils/emailService');

// Middleware to authorize teachers and admins
const isTeacherOrAdmin = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'teacher')) {
        next();
    } else {
        return res.status(403).json({ error: "Access denied. Teachers and Admins only." });
    }
};

// @route   POST /api/lessons/add-grade
// @desc    Admin විසින් Course එකක් තුළට Grade එකක් ඇතුළත් කිරීම
router.post('/add-grade', protect, isAdmin, async (req, res) => {
    const { grade, title, courseId } = req.body;

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

        const isCourseDeactive = course.status === 'deactive' || course.isActive === false;
        course.enrolledGrades.push({
            gradeNumber: gradeVal,
            title: gradeTitle,
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
            const classGrade = String(lesson.grade).trim();
            const enrolledStudentIds = course?.enrolledStudents || [];

            if (enrolledStudentIds.length > 0) {
                const students = await User.find({
                    _id: { $in: enrolledStudentIds },
                    role: 'student',
                    grade: new RegExp(classGrade, 'i')
                }).select('_id');

                const notifDocs = students.map(st => ({
                    recipient: st._id,
                    sender: req.user._id,
                    type: 'NEW_CONTENT',
                    title: `Teacher Notice: Grade ${lesson.grade}`,
                    message: teacherMessage,
                    link: '/courses',
                    metadata: { courseId: lesson.course, lessonId: lesson._id }
                }));

                if (notifDocs.length > 0) {
                    await Notification.insertMany(notifDocs);
                }
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
// @desc    Get all classes in a course
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const grades = await Lesson.find({ course: req.params.courseId }).sort('grade');
        res.json(grades);
    } catch (err) {
        res.status(500).json({ error: "Failed to get data." });
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

        if (teacherMessage !== undefined) {
            lesson.teacherMessage = teacherMessage;
        }
        if (videoLessons !== undefined) {
            lesson.videoLessons = videoLessons;
        }
        if (hideDemoVideo !== undefined) {
            lesson.hideDemoVideo = hideDemoVideo;
        }
        if (hideDemoPdf !== undefined) {
            lesson.hideDemoPdf = hideDemoPdf;
        }

        await lesson.save();
        res.json({ message: "Lesson details updated successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to update lesson details: " + err.message });
    }
});

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
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        const fileSize = req.file.size;

        if (!lesson.pdfMaterials) {
            lesson.pdfMaterials = [];
        }

        lesson.pdfMaterials.push({
            title,
            filename,
            fileUrl,
            fileSize
        });

        await lesson.save();

        // --- TRIGGER NOTIFICATIONS FOR ENROLLED STUDENTS ---
        try {
            const course = await Course.findById(lesson.course);
            const classGrade = String(lesson.grade).trim();
            if (course && course.enrolledStudents && course.enrolledStudents.length > 0) {
                const enrolledUsers = await User.find({
                    _id: { $in: course.enrolledStudents },
                    role: 'student',
                    grade: new RegExp(classGrade, 'i')
                });
                
                const notifDocs = enrolledUsers.map(st => ({
                    recipient: st._id,
                    type: 'NEW_CONTENT',
                    title: `New Material in ${course.title}`,
                    message: `New PDF note "${title}" has been uploaded for Grade ${lesson.grade}.`,
                    link: `/courses`,
                    metadata: { courseId: course._id, lessonId: lesson._id }
                }));

                if (notifDocs.length > 0) {
                    await Notification.insertMany(notifDocs);
                }

                // Email notification to enrolled students
                enrolledUsers.forEach(st => {
                    if (st.email) {
                        sendCourseUpdateEmail(st.email, st.name, course.title, `New PDF Material: ${title}`, `A new study material "${title}" has been published for Grade ${lesson.grade}.`);
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
        const pdfFilePath = path.join(__dirname, '..', 'uploads', pdf.filename);

        // Delete from filesystem
        if (fs.existsSync(pdfFilePath)) {
            fs.unlinkSync(pdfFilePath);
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
        const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        const fileSize = req.file.size;

        if (!lesson.assignments) {
            lesson.assignments = [];
        }

        lesson.assignments.push({
            title,
            filename,
            fileUrl,
            fileSize
        });

        await lesson.save();

        // --- TRIGGER NOTIFICATIONS FOR ENROLLED STUDENTS ---
        try {
            const course = await Course.findById(lesson.course);
            const classGrade = String(lesson.grade).trim();
            if (course && course.enrolledStudents && course.enrolledStudents.length > 0) {
                const enrolledUsers = await User.find({
                    _id: { $in: course.enrolledStudents },
                    role: 'student',
                    grade: new RegExp(classGrade, 'i')
                });
                
                const notifDocs = enrolledUsers.map(st => ({
                    recipient: st._id,
                    type: 'NEW_CONTENT',
                    title: `New Assignment in ${course.title}`,
                    message: `New Assignment PDF "${title}" has been uploaded for Grade ${lesson.grade}.`,
                    link: `/courses`,
                    metadata: { courseId: course._id, lessonId: lesson._id }
                }));

                if (notifDocs.length > 0) {
                    await Notification.insertMany(notifDocs);
                }

                // Email notification to enrolled students
                enrolledUsers.forEach(st => {
                    if (st.email) {
                        sendCourseUpdateEmail(st.email, st.name, course.title, `New Assignment: ${title}`, `A new assignment "${title}" has been published for Grade ${lesson.grade}.`);
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
        const pdfFilePath = path.join(__dirname, '..', 'uploads', pdf.filename);

        // Delete from filesystem
        if (fs.existsSync(pdfFilePath)) {
            fs.unlinkSync(pdfFilePath);
        }

        // Remove from database array
        lesson.assignments.splice(pdfIndex, 1);
        await lesson.save();

        res.json({ message: "Assignment PDF removed successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete Assignment PDF: " + err.message });
    }
});

// @route   POST /api/lessons/:lessonId/live-stream
// @desc    Start or Update YouTube Live Stream for a class (Admin / Teacher)
router.post('/:lessonId/live-stream', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const { youtubeUrl, title } = req.body;
        if (!youtubeUrl || !String(youtubeUrl).trim()) {
            return res.status(400).json({ error: "YouTube Live Link or Video ID is required." });
        }

        const lesson = await Lesson.findById(req.params.lessonId);
        if (!lesson) {
            return res.status(404).json({ error: "Class not found." });
        }

        const streamTitle = (title && String(title).trim()) ? String(title).trim() : `Grade ${lesson.grade} Live Class`;

        lesson.liveStream = {
            isLive: true,
            title: streamTitle,
            youtubeUrl: String(youtubeUrl).trim(),
            startedAt: new Date()
        };

        await lesson.save();

        // Send Notification to enrolled students
        try {
            const course = await Course.findById(lesson.course);
            if (course) {
                const enrolledStudents = await User.find({
                    role: 'student',
                    $or: [
                        { _id: { $in: course.enrolledStudents || [] } },
                        { grade: lesson.grade }
                    ]
                }).select('_id email name');

                const notifDocs = enrolledStudents.map(st => ({
                    recipient: st._id,
                    type: 'LIVE_CLASS',
                    title: `🔴 LIVE NOW: ${course.title}`,
                    message: `Live class "${streamTitle}" has started for Grade ${lesson.grade}! Click to join now.`,
                    link: `/courses`,
                    metadata: { courseId: course._id, lessonId: lesson._id }
                }));

                if (notifDocs.length > 0) {
                    await Notification.insertMany(notifDocs);
                }

                enrolledStudents.forEach(st => {
                    if (st.email) {
                        sendCourseUpdateEmail(
                            st.email,
                            st.name,
                            course.title,
                            `🔴 LIVE CLASS: ${streamTitle}`,
                            `Grade ${lesson.grade} live streaming session is live now on LuminaLearn!`
                        );
                    }
                });
            }
        } catch (notifErr) {
            console.error('Live stream notification error:', notifErr.message);
        }

        res.json({ message: "Live Class published successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to start live stream: " + err.message });
    }
});

// @route   DELETE /api/lessons/:lessonId/live-stream
// @desc    End YouTube Live Stream for a class (Admin / Teacher)
router.delete('/:lessonId/live-stream', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const { saveAsVideo } = req.body;
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

        lesson.liveStream = {
            isLive: false,
            title: '',
            youtubeUrl: '',
            endedAt: new Date()
        };

        await lesson.save();

        res.json({ message: "Live Class ended successfully!", lesson });
    } catch (err) {
        res.status(500).json({ error: "Failed to end live stream: " + err.message });
    }
});

module.exports = router;