const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const { protect, isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { getClassNameFromGrade } = require('../utils/migration');

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

// Keep the uploaded file on disk and return its filename
const saveUploadedFile = (fileObject) => {
    if (!fileObject) return "";
    return fileObject.filename;
};

// @route   GET /api/courses
router.get('/', protect, async (req, res) => {
    try {
        const courses = await Course.find({})
            .populate('instructor', 'name')
            .populate('enrolledStudents', '_id');
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

        const studentId = req.user._id;
        const className = getClassNameFromGrade(req.user.grade);

        // 1. Create/upsert Enrollment document
        await Enrollment.findOneAndUpdate(
            { studentId, courseId: course._id, className },
            { status: 'Active' },
            { upsert: true, new: true }
        );

        // 2. Keep course embedded arrays in sync
        if (!course.enrolledStudents.includes(studentId)) {
            course.enrolledStudents.push(studentId);
        }

        let cls = course.classes.find(c => c.className === className);
        if (!cls) {
            course.classes.push({
                className,
                enrolledStudents: [studentId]
            });
        } else if (!cls.enrolledStudents.includes(studentId)) {
            cls.enrolledStudents.push(studentId);
        }

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

            const bannerFilename = req.files?.banner?.[0]
                ? saveUploadedFile(req.files.banner[0])
                : "";
            const cardImageFilename = req.files?.cardImage?.[0]
                ? saveUploadedFile(req.files.cardImage[0])
                : "";

            const newCourse = await Course.create({
                title,
                description,
                instructor: instructorId,
                banner: bannerFilename,
                cardImage: cardImageFilename
            });

            res.status(201).json({ message: "Course created successfully!", courseId: newCourse._id });
        } catch (err) {
            if (err.code === 11000) return res.status(400).json({ error: "Email exists." });
            res.status(500).json({ error: "Server error: " + err.message });
        }
    }
);

// @route   GET /api/courses/:id/students/:gradeNumber
// Admin fetches all students belonging to a specific grade with current enrollment status, attendance, and payments
router.get('/:id/students/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const gradeNumber = Number(req.params.gradeNumber);
        const gradeQuery = [String(gradeNumber), `Grade ${gradeNumber}`];

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const students = await User.find({ 
            role: 'student', 
            grade: { $in: gradeQuery } 
        })
        .select('_id name email registrationNumber grade parentsPhoneNumber')
        .sort({ name: 1 });

        const enrolledIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        
        // Fetch detailed attendance and payments for each student
        const studentsWithDetails = await Promise.all(students.map(async (student) => {
            const studentObj = student.toObject();
            studentObj.isEnrolled = enrolledIds.has(student._id.toString());
            
            // 1. Get attendance records for this student and course
            const attendanceRecords = await Attendance.find({
                studentId: student._id,
                courseId: course._id
            }).sort({ date: -1 }).limit(10);
            
            // Count consecutive absences
            let consecutiveAbsences = 0;
            for (const r of attendanceRecords) {
                if (r.status === 'Absent') {
                    consecutiveAbsences++;
                } else if (r.status === 'Present' || r.status === 'Late') {
                    break;
                }
            }
            
            studentObj.attendance = {
                history: attendanceRecords.map(r => ({
                    date: r.date,
                    status: r.status
                })),
                totalPresent: attendanceRecords.filter(r => r.status === 'Present' || r.status === 'Late').length,
                totalAbsent: attendanceRecords.filter(r => r.status === 'Absent').length,
                consecutiveAbsences,
                isChronicallyAbsent: consecutiveAbsences >= 3
            };

            // 2. Deterministic mock payments based on user ID hash
            const hash = student._id.toString().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
            const isDue = hash % 3 === 0;
            studentObj.payment = {
                status: isDue ? 'Due' : 'Paid',
                amountDue: isDue ? 6000 : 0,
                dueDate: '2026-08-05',
                history: [
                    { month: 'July 2026', amount: 6000, status: 'Settled', date: '2026-07-02' },
                    { month: 'June 2026', amount: 6000, status: 'Settled', date: '2026-06-03' }
                ]
            };

            return studentObj;
        }));

        res.status(200).json(studentsWithDetails);
    } catch (err) {
        console.error("Fetch Grade Students Error:", err);
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

        const gradeQuery = [String(gradeNumber), `Grade ${gradeNumber}`];
        const students = await User.find({
            _id: { $in: studentIds },
            role: 'student',
            grade: { $in: gradeQuery }
        }).select('_id');

        const validStudentIds = students.map(student => student._id.toString());
        const existingIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        const newIds = validStudentIds.filter(studentId => !existingIds.has(studentId));

        if (!newIds.length) {
            return res.status(200).json({ message: 'Selected students are already enrolled.' });
        }

        const className = `Grade ${gradeNumber}`;

        // 1. Create/upsert Enrollment documents
        for (const studentId of newIds) {
            await Enrollment.findOneAndUpdate(
                { studentId, courseId: course._id, className },
                { status: 'Active' },
                { upsert: true, new: true }
            );
        }

        // 2. Keep course embedded arrays in sync
        course.enrolledStudents.push(...newIds.map(studentId => studentId));

        let cls = course.classes.find(c => c.className === className);
        if (!cls) {
            course.classes.push({
                className,
                enrolledStudents: [...newIds]
            });
        } else {
            newIds.forEach(id => {
                if (!cls.enrolledStudents.includes(id)) {
                    cls.enrolledStudents.push(id);
                }
            });
        }

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

        // 1. Delete from Enrollment collection
        await Enrollment.deleteMany({
            studentId: { $in: studentIds },
            courseId: course._id
        });

        // 2. Keep course embedded arrays in sync
        course.enrolledStudents = course.enrolledStudents.filter(studentId => !validIds.has(studentId.toString()));

        course.classes.forEach(cls => {
            cls.enrolledStudents = cls.enrolledStudents.filter(id => !validIds.has(id.toString()));
        });

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

        const gradeQuery = [String(gradeNumber), `Grade ${gradeNumber}`];
        const students = await User.find({ role: 'student', grade: { $in: gradeQuery } }).select('_id');
        if (!students.length) {
            return res.status(404).json({ error: `No students found for Grade ${gradeNumber}.` });
        }

        const existingIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        const newStudents = students.filter(student => !existingIds.has(student._id.toString()));

        if (!newStudents.length) {
            return res.status(200).json({ message: `All students in Grade ${gradeNumber} are already enrolled.` });
        }

        const className = `Grade ${gradeNumber}`;
        const newIds = newStudents.map(student => student._id.toString());

        // 1. Create/upsert Enrollment documents
        for (const studentId of newIds) {
            await Enrollment.findOneAndUpdate(
                { studentId, courseId: course._id, className },
                { status: 'Active' },
                { upsert: true, new: true }
            );
        }

        // 2. Keep course embedded arrays in sync
        course.enrolledStudents.push(...newStudents.map(student => student._id));

        let cls = course.classes.find(c => c.className === className);
        if (!cls) {
            course.classes.push({
                className,
                enrolledStudents: [...newIds]
            });
        } else {
            newIds.forEach(id => {
                if (!cls.enrolledStudents.includes(id)) {
                    cls.enrolledStudents.push(id);
                }
            });
        }

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

// @route   GET /api/courses/enrollments/all
// @desc    Admin retrieves all active class enrollments
router.get('/enrollments/all', protect, isAdmin, async (req, res) => {
    try {
        const activeEnrollments = await Enrollment.find({ status: 'Active' })
            .populate('studentId', 'name email registrationNumber grade parentsPhoneNumber')
            .populate('courseId', 'title');
        
        const enrollments = activeEnrollments
            .filter(e => e.studentId && e.courseId) // Filter out orphaned records
            .map(e => ({
                courseId: e.courseId._id,
                courseTitle: e.courseId.title,
                className: e.className,
                studentId: e.studentId._id,
                studentName: e.studentId.name,
                studentEmail: e.studentId.email,
                studentRegNo: e.studentId.registrationNumber,
                studentGrade: e.studentId.grade,
                studentPhone: e.studentId.parentsPhoneNumber
            }));

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
    const trimmedClassName = className ? className.trim() : "";
    if (!studentId || !courseId || !trimmedClassName) {
        return res.status(400).json({ error: "Student ID, Course ID, and Class Name are required." });
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found." });

        const student = await User.findById(studentId);
        if (!student || student.role !== 'student') {
            return res.status(400).json({ error: "Invalid student." });
        }

        // 1. Save to Enrollment collection
        await Enrollment.findOneAndUpdate(
            { studentId, courseId, className: trimmedClassName },
            { status: 'Active' },
            { upsert: true, new: true }
        );

        // 2. Keep course embedded arrays in sync
        let cls = course.classes.find(c => c.className === trimmedClassName);
        if (!cls) {
            course.classes.push({
                className: trimmedClassName,
                enrolledStudents: [studentId]
            });
        } else if (!cls.enrolledStudents.includes(studentId)) {
            cls.enrolledStudents.push(studentId);
        }

        if (!course.enrolledStudents.includes(studentId)) {
            course.enrolledStudents.push(studentId);
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
    const trimmedClassName = className ? className.trim() : "";
    if (!studentId || !courseId || !trimmedClassName) {
        return res.status(400).json({ error: "Student ID, Course ID, and Class Name are required." });
    }

    try {
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).json({ error: "Course not found." });

        // 1. Delete from Enrollment collection
        await Enrollment.deleteOne({ studentId, courseId, className: trimmedClassName });

        // 2. Keep course embedded arrays in sync
        let cls = course.classes.find(c => c.className === trimmedClassName);
        if (cls) {
            cls.enrolledStudents = cls.enrolledStudents.filter(id => id.toString() !== studentId.toString());
        }

        // Check if student exists in any other class of the course
        const existsInOtherClass = course.classes.some(c => c.enrolledStudents.includes(studentId));
        if (!existsInOtherClass) {
            course.enrolledStudents = course.enrolledStudents.filter(id => id.toString() !== studentId.toString());
        }

        await course.save();
        res.status(200).json({ message: "Student removed from class successfully." });
    } catch (err) {
        console.error("Unenroll student error:", err);
        res.status(500).json({ error: "Failed to unenroll student." });
    }
});

module.exports = router;