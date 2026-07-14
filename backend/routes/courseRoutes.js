const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// Extract the raw filename if a full path is stored, and build a dynamic URL based on the request host
const getFullUrl = (req, filenameOrUrl) => {
    if (!filenameOrUrl) return "";
    // If it is a Base64 string, return it directly
    if (filenameOrUrl.startsWith('data:')) {
        return filenameOrUrl;
    }
    let filename = filenameOrUrl;
    if (filenameOrUrl.includes('/uploads/')) {
        filename = filenameOrUrl.split('/uploads/').pop();
    }
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

// Extract filename to locate the file in the filesystem
const getFilename = (filenameOrUrl) => {
    if (!filenameOrUrl) return null;
    // Base64 strings are stored in database, no local file to delete
    if (filenameOrUrl.startsWith('data:')) {
        return null;
    }
    if (filenameOrUrl.includes('/uploads/')) {
        return filenameOrUrl.split('/uploads/').pop();
    }
    return filenameOrUrl;
};

// Helper function to read an uploaded file from disk, convert it to Base64, and delete the file immediately
const fileToBase64 = (fileObject) => {
    if (!fileObject) return "";
    try {
        const buffer = fs.readFileSync(fileObject.path);
        const mimeType = fileObject.mimetype;
        const base64Data = buffer.toString('base64');
        
        // Delete the file from the disk immediately after converting
        fs.unlinkSync(fileObject.path);
        
        return `data:${mimeType};base64,${base64Data}`;
    } catch (err) {
        console.error("Failed to convert file to Base64:", err.message);
        return "";
    }
};

// @route   GET /api/courses
router.get('/', protect, async (req, res) => {
    try {
        const courses = await Course.find({})
            .populate('instructor', 'name')
            .populate('enrolledStudents', '_id');
<<<<<<< Updated upstream
        res.json(courses);
=======
            
        // Map to include full URLs dynamically based on request host
        const coursesWithUrls = courses.map(course => {
            const courseObj = course.toObject();
            if (courseObj.banner) {
                courseObj.banner = getFullUrl(req, courseObj.banner);
            }
            if (courseObj.cardImage) {
                courseObj.cardImage = getFullUrl(req, courseObj.cardImage);
            }
            return courseObj;
        });

        res.json(coursesWithUrls);
>>>>>>> Stashed changes
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

// @route   GET /api/courses/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'name')
            .populate('enrolledStudents', 'name grade registrationNumber');
        if (!course) return res.status(404).json({ error: "Course not found" });

        const courseObj = course.toObject();
        if (courseObj.banner) {
            courseObj.banner = getFullUrl(req, courseObj.banner);
        }
        if (courseObj.cardImage) {
            courseObj.cardImage = getFullUrl(req, courseObj.cardImage);
        }
        res.json(courseObj);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// @route   POST /api/courses/:id/enroll
router.post('/:id/enroll', protect, async (req, res) => {
    try {
        if (req.user.role !== 'student') {
            return res.status(403).json({ error: "Only students can enroll in courses." });
        }

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: "Course not found" });

        if (!req.user.grade) {
            return res.status(400).json({ error: "Student grade must be set before enrolling." });
        }

        const isAllowed = course.enrolledGrades.some(g => g.gradeNumber === req.user.grade);
        if (!isAllowed) {
            return res.status(403).json({ error: "Your grade is not allowed to enroll in this course." });
        }

        const alreadyEnrolled = course.enrolledStudents.some(studentId => studentId.toString() === req.user._id.toString());
        if (alreadyEnrolled) {
            return res.status(400).json({ error: "Student already enrolled in this course." });
        }

        course.enrolledStudents.push(req.user._id);
        await course.save();

        res.json({ message: "Enrollment successful." });
    } catch (err) {
        res.status(500).json({ error: "Failed to enroll in course" });
    }
});

// @route   DELETE /api/courses/:id
router.delete('/:id', protect, isAdmin, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: "Course not found" });

        // Delete physical files from filesystem
        const bannerFile = getFilename(course.banner);
        const cardImageFile = getFilename(course.cardImage);

        if (bannerFile) {
            const bannerFilePath = path.join(__dirname, '..', 'uploads', bannerFile);
            if (fs.existsSync(bannerFilePath)) {
                fs.unlinkSync(bannerFilePath);
            }
        }
        if (cardImageFile) {
            const cardImageFilePath = path.join(__dirname, '..', 'uploads', cardImageFile);
            if (fs.existsSync(cardImageFilePath)) {
                fs.unlinkSync(cardImageFilePath);
            }
        }

        await Lesson.deleteMany({ course: course._id });
        const courseTitle = course.title;
        await course.deleteOne();

        res.json({ message: `Course "${courseTitle}" Successfully Deleted!` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete course" });
    }
});

// @route   POST /api/courses/add-with-teacher
router.post(
    '/add-with-teacher',
    protect,
    isAdmin,
    upload.fields([
        { name: 'banner', maxCount: 1 },
        { name: 'cardImage', maxCount: 1 }
    ]),
    async (req, res) => {
        const { title, description, teacherName, teacherEmail, defaultPassword } = req.body;

        if (!title || !teacherEmail || !teacherName) {
            return res.status(400).json({ error: "Please fill in all required fields." });
        }

        try {
            let instructorId = null;
            const existingTeacher = await User.findOne({ email: teacherEmail });

            if (existingTeacher) {
                if (existingTeacher.role !== 'teacher') {
                    return res.status(400).json({ error: "User exists, but is not a teacher." });
                }
                instructorId = existingTeacher._id;
            } else {
                if (!defaultPassword) {
                    return res.status(400).json({ error: "Password is required for new accounts." });
                }
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(defaultPassword, salt);
                const newTeacher = await User.create({
                    name: teacherName,
                    email: teacherEmail,
                    password: hashedPassword,
                    role: 'teacher',
                    mustChangePassword: true
                });
                instructorId = newTeacher._id;
            }

            const bannerDataUri = req.files?.banner?.[0]
                ? fileToBase64(req.files.banner[0])
                : "";
            const cardImageDataUri = req.files?.cardImage?.[0]
                ? fileToBase64(req.files.cardImage[0])
                : "";

            const newCourse = await Course.create({
                title,
                description,
                instructor: instructorId,
                banner: bannerDataUri,
                cardImage: cardImageDataUri
            });

            res.status(201).json({ message: "Course created successfully!", courseId: newCourse._id });
        } catch (err) {
            if (err.code === 11000) return res.status(400).json({ error: "Email exists." });
            res.status(500).json({ error: "Server error: " + err.message });
        }
    }
);

// @route   GET /api/courses/:id/students/:gradeNumber
// Admin fetches all students belonging to a specific grade with current enrollment status
router.get('/:id/students/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const gradeNumber = Number(req.params.gradeNumber);
        if (!gradeNumber || gradeNumber < 6 || gradeNumber > 11) {
            return res.status(400).json({ error: 'Invalid grade selection.' });
        }

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const students = await User.find({ role: 'student', grade: gradeNumber })
            .select('_id name email registrationNumber grade')
            .sort({ name: 1 });

        const enrolledIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        const studentsWithStatus = students.map(student => ({
            ...student.toObject(),
            isEnrolled: enrolledIds.has(student._id.toString())
        }));

        res.status(200).json(studentsWithStatus);
    } catch (err) {
        res.status(500).json({ error: 'Failed to load grade students' });
    }
});

// @route   POST /api/courses/:id/enroll-students/:gradeNumber
router.post('/:id/enroll-students/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const gradeNumber = Number(req.params.gradeNumber);
        const { studentIds = [] } = req.body;

        if (!gradeNumber || gradeNumber < 6 || gradeNumber > 11) {
            return res.status(400).json({ error: 'Invalid grade selection.' });
        }

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: 'Please select at least one student.' });
        }

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const students = await User.find({
            _id: { $in: studentIds },
            role: 'student',
            grade: gradeNumber
        }).select('_id');

        const validStudentIds = students.map(student => student._id.toString());
        const existingIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        const newIds = validStudentIds.filter(studentId => !existingIds.has(studentId));

        if (!newIds.length) {
            return res.status(200).json({ message: 'Selected students are already enrolled.' });
        }

        course.enrolledStudents.push(...newIds.map(studentId => studentId));
        await course.save();

        res.status(200).json({ message: `Enrolled ${newIds.length} student(s).` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to enroll selected students' });
    }
});

// @route   POST /api/courses/:id/remove-students/:gradeNumber
router.post('/:id/remove-students/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const gradeNumber = Number(req.params.gradeNumber);
        const { studentIds = [] } = req.body;

        if (!gradeNumber || gradeNumber < 6 || gradeNumber > 11) {
            return res.status(400).json({ error: 'Invalid grade selection.' });
        }

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: 'Please select at least one student.' });
        }

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const validIds = new Set(studentIds.map(id => id.toString()));
        const beforeCount = course.enrolledStudents.length;
        course.enrolledStudents = course.enrolledStudents.filter(studentId => !validIds.has(studentId.toString()));
        await course.save();

        res.status(200).json({ message: `Removed ${beforeCount - course.enrolledStudents.length} student(s).` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to remove selected students' });
    }
});

// @route   POST /api/courses/:id/toggle-grade
// Admin toggles (adds/removes) a grade to the course
router.post('/:id/toggle-grade', protect, isAdmin, async (req, res) => {
    try {
        const { gradeNumber } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ error: "Course not found" });

        const existingIndex = course.enrolledGrades.findIndex(g => g.gradeNumber === gradeNumber);

        if (existingIndex !== -1) {
            const gradeTitle = course.enrolledGrades[existingIndex].title || `Grade ${gradeNumber}`;
            // තිබේ නම් අයින් කරන්න
            course.enrolledGrades.splice(existingIndex, 1);
            await course.save();
            // Sync with Lesson model
            await Lesson.findOneAndDelete({ course: course._id, grade: gradeNumber });
            return res.status(200).json({ message: `"${gradeTitle}" Successfully Removed!` });
        } else {
            // නැත්නම් ඇඩ් කරන්න
            course.enrolledGrades.push({ gradeNumber, messages: [] });
            await course.save();
            // Sync with Lesson model
            await Lesson.create({
                course: course._id,
                grade: gradeNumber,
                teacherMessage: "මෙම ශ්‍රේණිය සඳහා ගුරුවරයාගෙන් පණිවිඩයක් නැත."
            });
            return res.status(200).json({ message: `Grade ${gradeNumber} added` });
        }
    } catch (err) {
        res.status(500).json({ error: "Failed to toggle grade" });
    }
});

// @route   POST /api/courses/:id/enroll-grade/:gradeNumber
// Admin enrolls all students from a specific grade into this course
router.post('/:id/enroll-grade/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const gradeNumber = Number(req.params.gradeNumber);
        if (!gradeNumber || gradeNumber < 6 || gradeNumber > 11) {
            return res.status(400).json({ error: 'Invalid grade selection.' });
        }

        const gradeAllowed = course.enrolledGrades.some(g => g.gradeNumber === gradeNumber);
        if (!gradeAllowed) {
            return res.status(400).json({ error: 'This grade is not assigned to this course.' });
        }

        const students = await User.find({ role: 'student', grade: gradeNumber });
        if (!students.length) {
            return res.status(404).json({ error: `No students found for Grade ${gradeNumber}.` });
        }

        const existingIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        const newStudents = students.filter(student => !existingIds.has(student._id.toString()));

        if (!newStudents.length) {
            return res.status(200).json({ message: `All students in Grade ${gradeNumber} are already enrolled.` });
        }

        course.enrolledStudents.push(...newStudents.map(student => student._id));
        await course.save();

        res.status(200).json({ message: `Enrolled ${newStudents.length} students from Grade ${gradeNumber}.` });
    } catch (err) {
        res.status(500).json({ error: 'Failed to enroll grade students' });
    }
});

// @route   POST /api/courses/:id/send-message
router.post('/:id/send-message', protect, async (req, res) => {
    try {
        const { gradeNumber, text } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ error: "Course not found" });

        const grade = course.enrolledGrades.find(g => g.gradeNumber === gradeNumber);
        if (!grade) return res.status(400).json({ error: "Grade not enrolled in this course" });

        grade.messages.push({ text, sender: req.user._id });
        await course.save();

        res.status(200).json({ message: "Message sent successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send message" });
    }
});

module.exports = router;