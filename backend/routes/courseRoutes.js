const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// @route   GET /api/courses
router.get('/', protect, async (req, res) => {
    try {
        let query = {};
        
        // Use the security/filtering logic from devBranch
        if (req.user.role === 'teacher') {
            query = { instructor: req.user._id };
        } else if (req.user.role === 'student') {
            // Note: We use 'enrolledStudents' because that is the field 
            // we kept in our Course.js model resolution earlier.
            query = { enrolledStudents: req.user._id };
        }

        // Apply the filtering query, and add the population from temp_featureCheck
        const courses = await Course.find(query)
            .populate('instructor', 'name')
            .populate('enrolledStudents', '_id');
            
        res.json(courses);
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
        res.json(course);
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

        await Lesson.deleteMany({ course: course._id });
        await course.deleteOne();

        res.json({ message: "Course deleted successfully" });
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

            // Build image URL paths from uploaded files
            const bannerPath = req.files?.banner?.[0]
                ? `http://localhost:5000/uploads/${req.files.banner[0].filename}`
                : "";
            const cardImagePath = req.files?.cardImage?.[0]
                ? `http://localhost:5000/uploads/${req.files.cardImage[0].filename}`
                : "";

            const newCourse = await Course.create({
                title,
                description,
                instructor: instructorId,
                banner: bannerPath,
                cardImage: cardImagePath
            });

            res.status(201).json({ message: "Course created successfully!", courseId: newCourse._id });
        } catch (err) {
            if (err.code === 11000) return res.status(400).json({ error: "Email exists." });
            res.status(500).json({ error: "Server error: " + err.message });
        }
    }
);

// @route   POST /api/courses/:id/toggle-grade
// Admin toggles (adds/removes) a grade to the course
router.post('/:id/toggle-grade', protect, isAdmin, async (req, res) => {
    try {
        const { gradeNumber } = req.body;
        const course = await Course.findById(req.params.id);

        if (!course) return res.status(404).json({ error: "Course not found" });

        const existingIndex = course.enrolledGrades.findIndex(g => g.gradeNumber === gradeNumber);

        if (existingIndex !== -1) {
            // තිබේ නම් අයින් කරන්න
            course.enrolledGrades.splice(existingIndex, 1);
            await course.save();
            // Sync with Lesson model
            await Lesson.findOneAndDelete({ course: course._id, grade: gradeNumber });
            return res.status(200).json({ message: `Grade ${gradeNumber} removed` });
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

        const gradeNumber = req.params.gradeNumber;
        if (!gradeNumber || !gradeNumber.trim()) {
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

// @route   POST /api/courses/:id/enroll
// @desc    Admin enrolls a student in the course
router.post('/:id/enroll', protect, isAdmin, async (req, res) => {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: "Student ID is required." });

    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: "Course not found" });

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(400).json({ error: "Invalid student." });
        }

        if (course.enrolledStudents.includes(studentId)) {
            return res.status(400).json({ error: "Student is already enrolled in this course." });
        }

        course.enrolledStudents.push(studentId);
        await course.save();

        res.status(200).json({ message: "Student enrolled successfully." });
    } catch (err) {
        console.error("Enroll Student Error:", err);
        res.status(500).json({ error: "Failed to enroll student" });
    }
});

// @route   POST /api/courses/:id/unenroll
// @desc    Admin removes a student from the course (legacy flat enrollment, unused but kept for compatibility or reference)
router.post('/:id/unenroll', protect, isAdmin, async (req, res) => {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ error: "Student ID is required." });

    try {
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: "Course not found" });

        // Left unimplemented for flat schema since we migrated to classes
        res.status(200).json({ message: "Legacy endpoint called. Please use class-based enrollment." });
    } catch (err) {
        res.status(500).json({ error: "Failed to remove student from course" });
    }
});

// @route   GET /api/courses/enrollments/all
// @desc    Admin retrieves all active class enrollments
router.get('/enrollments/all', protect, isAdmin, async (req, res) => {
    try {
        const courses = await Course.find({})
            .populate('classes.enrolledStudents', 'name email registrationNumber grade parentsPhoneNumber');
        
        let enrollments = [];
        courses.forEach(course => {
            if (course.classes && course.classes.length > 0) {
                course.classes.forEach(cls => {
                    if (cls.enrolledStudents && cls.enrolledStudents.length > 0) {
                        cls.enrolledStudents.forEach(student => {
                            if (student) {
                                enrollments.push({
                                    courseId: course._id,
                                    courseTitle: course.title,
                                    className: cls.className,
                                    studentId: student._id,
                                    studentName: student.name,
                                    studentEmail: student.email,
                                    studentRegNo: student.registrationNumber,
                                    studentGrade: student.grade,
                                    studentPhone: student.parentsPhoneNumber
                                });
                            }
                        });
                    }
                });
            }
        });
        res.json(enrollments);
    } catch (err) {
        console.error("Fetch all enrollments error:", err);
        res.status(500).json({ error: "Failed to fetch enrollments" });
    }
});

// @route   POST /api/courses/enroll
// @desc    Admin enrolls a student in a specific course and class
router.post('/enroll', protect, isAdmin, async (req, res) => {
    const { studentId, courseId, className } = req.body;
    if (!studentId || !courseId || !className) {
        return res.status(400).json({ error: "Student ID, Course ID, and Class Name are required." });
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found." });

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(400).json({ error: "Invalid student." });
        }

        let cls = course.classes.find(c => c.className === className.trim());
        if (!cls) {
            course.classes.push({
                className: className.trim(),
                enrolledStudents: [studentId]
            });
        } else {
            if (cls.enrolledStudents.includes(studentId)) {
                return res.status(400).json({ error: "Student is already enrolled in this class for this course." });
            }
            cls.enrolledStudents.push(studentId);
        }

        await course.save();
        res.status(200).json({ message: "Student enrolled in class successfully." });
    } catch (err) {
        console.error("Enroll student error:", err);
        res.status(500).json({ error: "Failed to enroll student." });
    }
});

// @route   POST /api/courses/unenroll
// @desc    Admin removes a student from a specific course and class
router.post('/unenroll', protect, isAdmin, async (req, res) => {
    const { studentId, courseId, className } = req.body;
    if (!studentId || !courseId || !className) {
        return res.status(400).json({ error: "Student ID, Course ID, and Class Name are required." });
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found." });

        let cls = course.classes.find(c => c.className === className.trim());
        if (!cls) {
            return res.status(400).json({ error: "Class not found in this course." });
        }

        const index = cls.enrolledStudents.indexOf(studentId);
        if (index === -1) {
            return res.status(400).json({ error: "Student is not enrolled in this class." });
        }

        cls.enrolledStudents.splice(index, 1);
        await course.save();
        res.status(200).json({ message: "Student removed from class successfully." });
    } catch (err) {
        console.error("Unenroll student error:", err);
        res.status(500).json({ error: "Failed to unenroll student." });
    }
});

module.exports = router;