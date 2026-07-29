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
const Notification = require('../models/Notification');
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

// Helper function to convert base64 data URIs to static files in /uploads to prevent database bloating and ensure super-fast image loading
const convertBase64ToStaticFile = (base64OrPath, prefix = 'img') => {
    if (!base64OrPath) return "";
    if (!base64OrPath.startsWith('data:')) {
        return base64OrPath;
    }
    try {
        const matches = base64OrPath.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64OrPath;

        const mimeType = matches[1];
        const base64Data = matches[2];
        const ext = mimeType.split('/')[1] || 'jpeg';
        const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        const filePath = path.join(uploadsDir, filename);
        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

        return `/uploads/${filename}`;
    } catch (err) {
        console.error("Failed to convert Base64 to static file:", err.message);
        return base64OrPath;
    }
};

// Helper function to process course object, auto-migrating any Base64 strings to disk files
const processCourseImages = async (req, courseDoc) => {
    if (!courseDoc) return null;
    let updated = false;
    let banner = courseDoc.banner || "";
    let cardImage = courseDoc.cardImage || "";

    if (banner.startsWith('data:')) {
        banner = convertBase64ToStaticFile(banner, 'banner');
        courseDoc.banner = banner;
        updated = true;
    }
    if (cardImage.startsWith('data:')) {
        cardImage = convertBase64ToStaticFile(cardImage, 'cardImage');
        courseDoc.cardImage = cardImage;
        updated = true;
    }

    if (updated && courseDoc._id) {
        try {
            await Course.updateOne(
                { _id: courseDoc._id },
                { $set: { banner: courseDoc.banner, cardImage: courseDoc.cardImage } }
            );
        } catch (e) {
            console.error("Failed to update course image paths in DB:", e.message);
        }
    }

    const courseObj = typeof courseDoc.toObject === 'function' ? courseDoc.toObject() : { ...courseDoc };
    courseObj.banner = getFullUrl(req, banner);
    courseObj.cardImage = getFullUrl(req, cardImage);
    return courseObj;
};

// @route   GET /api/courses
router.get('/', protect, async (req, res) => {
    try {
        const courses = await Course.find({})
            .populate('instructor', 'name');
        
        const coursesWithUrls = await Promise.all(
            courses.map(course => processCourseImages(req, course))
        );

        res.json(coursesWithUrls);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch courses" });
    }
});

// @route   GET /api/courses/enrollments/all
// @desc    Admin retrieves all active class enrollments
router.get('/enrollments/all', protect, isAdmin, async (req, res) => {
    try {
        // 1. Backfill legacy course enrollments into Enrollment collection
        const courses = await Course.find({})
            .populate('classes.enrolledStudents', 'name email registrationNumber grade parentsPhoneNumber')
            .populate('enrolledStudents', 'name email registrationNumber grade parentsPhoneNumber');

        for (const course of courses) {
            if (course.classes && course.classes.length > 0) {
                for (const cls of course.classes) {
                    if (cls.enrolledStudents && cls.enrolledStudents.length > 0) {
                        for (const student of cls.enrolledStudents) {
                            if (student && student._id) {
                                const className = cls.className || (student.grade ? (student.grade.startsWith('Grade') ? student.grade : `Grade ${student.grade}`) : 'General');
                                try {
                                    await Enrollment.findOneAndUpdate(
                                        { student: student._id, course: course._id },
                                        { student: student._id, course: course._id, className },
                                        { upsert: true, new: true, setDefaultsOnInsert: true }
                                    );
                                } catch (e) {
                                    console.warn("Backfill enrollment skip:", e.message);
                                }
                            }
                        }
                    }
                }
            }

            if (course.enrolledStudents && course.enrolledStudents.length > 0) {
                for (const student of course.enrolledStudents) {
                    if (student && student._id) {
                        const className = student.grade ? (student.grade.startsWith('Grade') ? student.grade : `Grade ${student.grade}`) : 'General';
                        try {
                            await Enrollment.findOneAndUpdate(
                                { student: student._id, course: course._id },
                                { student: student._id, course: course._id, className },
                                { upsert: true, new: true, setDefaultsOnInsert: true }
                            );
                        } catch (e) {
                            console.warn("Backfill enrollment skip:", e.message);
                        }
                    }
                }
            }
        }

        // 2. Retrieve all active enrollments from Enrollment table
        const dbEnrollments = await Enrollment.find({})
            .populate('student', 'name email registrationNumber grade parentsPhoneNumber')
            .populate('course', 'title');

        const enrollments = dbEnrollments
            .filter(e => e.student && e.course)
            .map(e => ({
                _id: e._id,
                courseId: e.course._id,
                courseTitle: e.course.title,
                className: e.className,
                studentId: e.student._id,
                studentName: e.student.name,
                studentEmail: e.student.email,
                studentRegNo: e.student.registrationNumber,
                studentGrade: e.student.grade,
                studentPhone: e.student.parentsPhoneNumber
            }));

        res.json(enrollments);
    } catch (err) {
        console.error("Fetch all enrollments error:", err);
        res.status(500).json({ error: "Failed to fetch enrollments: " + err.message });
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

        const trimmedClass = className.trim();

        // 1. Always Upsert to Enrollment MongoDB table matching { student, course }
        const enrollmentDoc = await Enrollment.findOneAndUpdate(
            { student: studentId, course: courseId },
            { student: studentId, course: courseId, className: trimmedClass },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 2. Synchronize with course.classes
        let cls = course.classes.find(c => c.className === trimmedClass);
        if (!cls) {
            course.classes.push({
                className: trimmedClass,
                enrolledStudents: [studentId]
            });
        } else {
            if (!cls.enrolledStudents.map(id => id.toString()).includes(studentId.toString())) {
                cls.enrolledStudents.push(studentId);
            }
        }

        // 3. Synchronize with course.enrolledStudents
        if (!course.enrolledStudents.map(id => id.toString()).includes(studentId.toString())) {
            course.enrolledStudents.push(studentId);
        }

        await course.save();

        res.status(200).json({ message: "Student enrolled in class successfully.", enrollment: enrollmentDoc });
    } catch (err) {
        console.error("Enroll student error:", err);
        res.status(500).json({ error: "Failed to enroll student: " + err.message });
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
        if (cls) {
            const index = cls.enrolledStudents.findIndex(id => id.toString() === studentId.toString());
            if (index !== -1) {
                cls.enrolledStudents.splice(index, 1);
            }
        }

        // Check if student is in any class for this course
        const isStillInAnyClass = course.classes.some(c => 
            c.enrolledStudents.some(id => id.toString() === studentId.toString())
        );

        if (!isStillInAnyClass) {
            course.enrolledStudents = course.enrolledStudents.filter(id => id.toString() !== studentId.toString());
        }

        await course.save();

        // Delete from Enrollment model table
        await Enrollment.deleteMany({
            student: studentId,
            course: courseId
        });

        res.status(200).json({ message: "Student removed from class successfully." });
    } catch (err) {
        console.error("Unenroll student error:", err);
        res.status(500).json({ error: "Failed to unenroll student." });
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

            let bannerPath = "";
            if (req.files?.banner?.[0]) {
                bannerPath = `/uploads/${req.files.banner[0].filename}`;
            } else if (req.body.banner) {
                bannerPath = convertBase64ToStaticFile(req.body.banner, 'banner');
            }

            let cardImagePath = "";
            if (req.files?.cardImage?.[0]) {
                cardImagePath = `/uploads/${req.files.cardImage[0].filename}`;
            } else if (req.body.cardImage) {
                cardImagePath = convertBase64ToStaticFile(req.body.cardImage, 'cardImage');
            }

            const newCourse = await Course.create({
                title,
                description,
                instructor: instructorId,
                banner: bannerPath,
                cardImage: cardImagePath
            });

            // Trigger In-App Notification for all students
            try {
                await Notification.create({
                    recipientRole: 'student',
                    type: 'COURSE_ADDED',
                    title: 'New Course Available',
                    message: `A new course '${newCourse.title}' is now available for enrollment! Check it out.`,
                    link: '/courses',
                    metadata: { courseId: newCourse._id }
                });
            } catch (notifErr) {
                console.error('Course notification trigger error:', notifErr.message);
            }

            res.status(201).json({ message: "Course created successfully!", courseId: newCourse._id });
        } catch (err) {
            if (err.code === 11000) return res.status(400).json({ error: "Email exists." });
            res.status(500).json({ error: "Server error: " + err.message });
        }
    }
);

// @route   GET /api/courses/:id
router.get('/:id', protect, async (req, res) => {
    try {
        const course = await Course.findById(req.params.id)
            .populate('instructor', 'name')
            .populate('enrolledStudents', 'name grade registrationNumber');
        if (!course) return res.status(404).json({ error: "Course not found" });

        const courseObj = await processCourseImages(req, course);
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

        const studentGrade = req.user.grade.trim();
        const className = studentGrade.startsWith('Grade') ? studentGrade : `Grade ${studentGrade}`;
        const gradeRegexes = buildGradeRegexes(studentGrade);

        const isAllowed = course.enrolledGrades.some(g =>
            gradeRegexes.some(regex => regex.test(g.gradeNumber))
        );

        if (!isAllowed) {
            return res.status(403).json({ error: "Your grade is not allowed to enroll in this course." });
        }

        // 1. Always Upsert into Enrollment MongoDB table
        await Enrollment.findOneAndUpdate(
            { student: req.user._id, course: course._id },
            { student: req.user._id, course: course._id, className },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // 2. Synchronize with course.enrolledStudents
        const alreadyEnrolled = course.enrolledStudents.some(studentId => studentId.toString() === req.user._id.toString());
        if (!alreadyEnrolled) {
            course.enrolledStudents.push(req.user._id);
        }

        // 3. Synchronize with course.classes
        let cls = course.classes.find(c => c.className === className || c.className === studentGrade);
        if (!cls) {
            course.classes.push({ className, enrolledStudents: [req.user._id] });
        } else {
            if (!cls.enrolledStudents.map(id => id.toString()).includes(req.user._id.toString())) {
                cls.enrolledStudents.push(req.user._id);
            }
        }

        await course.save();

        res.json({ message: "Enrollment successful." });
    } catch (err) {
        console.error("Student self-enroll error:", err);
        res.status(500).json({ error: "Failed to enroll in course: " + err.message });
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
        await Enrollment.deleteMany({ course: course._id });
        const courseTitle = course.title;
        await course.deleteOne();

        res.json({ message: `Course "${courseTitle}" Successfully Deleted!` });
    } catch (err) {
        res.status(500).json({ error: "Failed to delete course" });
    }
});

// Helper function to build flexible regexes for matching grade strings (e.g. "Grade 11", "grade 11", "11")
const buildGradeRegexes = (gradeParam) => {
    if (!gradeParam) return [];
    const trimmed = String(gradeParam).trim();
    const rawNum = trimmed.replace(/\D/g, ''); // extract numbers if any
    
    const terms = new Set([
        trimmed,
        trimmed.toLowerCase(),
        trimmed.replace(/grade/i, '').trim(),
        `Grade ${trimmed.replace(/grade/i, '').trim()}`
    ]);
    if (rawNum) {
        terms.add(rawNum);
        terms.add(`Grade ${rawNum}`);
    }

    return Array.from(terms).filter(Boolean).map(t => 
        new RegExp(`^\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
    );
};

// @route   GET /api/courses/:id/students/:gradeNumber
// Admin fetches all students belonging to a specific grade with current enrollment status, attendance, and payments
router.get('/:id/students/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const gradeParam = req.params.gradeNumber;
        if (!gradeParam) return res.status(400).json({ error: 'Grade selection is required.' });

        const gradeRegexes = buildGradeRegexes(gradeParam);
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const students = await User.find({ 
            role: 'student', 
            grade: { $in: gradeRegexes } 
        })
        .select('_id name email registrationNumber grade parentsPhoneNumber')
        .sort({ name: 1 });

        const enrolledIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        
        // Fetch all attendance records for these students and this course in a single query (solves N+1 problem)
        const studentIds = students.map(s => s._id);
        const allAttendance = await Attendance.find({
            studentId: { $in: studentIds },
            courseId: course._id
        }).sort({ date: -1 });

        // Group attendance records by studentId (keep top 10 recent records per student)
        const attendanceMap = {};
        for (const record of allAttendance) {
            const sId = record.studentId.toString();
            if (!attendanceMap[sId]) {
                attendanceMap[sId] = [];
            }
            if (attendanceMap[sId].length < 10) {
                attendanceMap[sId].push(record);
            }
        }

        // Fetch detailed attendance and payments for each student
        const studentsWithDetails = students.map((student) => {
            const studentObj = student.toObject();
            studentObj.isEnrolled = enrolledIds.has(student._id.toString());
            
            const attendanceRecords = attendanceMap[student._id.toString()] || [];
            
             // Count consecutive absences
            let consecutiveAbsences = 0;
            for (const r of attendanceRecords) {
                if (r.status === 'Absent') {
                    consecutiveAbsences++;
                } else if (r.status === 'Present') {
                    break;
                }
            }
            
            studentObj.attendance = {
                history: attendanceRecords.map(r => ({
                    date: r.date,
                    status: r.status
                })),
                totalPresent: attendanceRecords.filter(r => r.status === 'Present').length,
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
        });

        res.status(200).json(studentsWithDetails);
    } catch (err) {
        console.error("Fetch Grade Students Error:", err);
        res.status(500).json({ error: 'Failed to load grade students' });
    }
});

// @route   POST /api/courses/:id/enroll-students/:gradeNumber
router.post('/:id/enroll-students/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const gradeParam = req.params.gradeNumber;
        const { studentIds = [] } = req.body;

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: 'Please select at least one student.' });
        }

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const students = await User.find({
            _id: { $in: studentIds },
            role: 'student'
        }).select('_id');

        const validStudentIds = students.map(student => student._id.toString());
        const className = (gradeParam && gradeParam !== 'undefined')
            ? (gradeParam.startsWith('Grade') ? gradeParam : `Grade ${gradeParam}`)
            : 'General';

        // 1. Always Upsert into Enrollment collection matching { student, course }
        for (const studentId of validStudentIds) {
            await Enrollment.findOneAndUpdate(
                { student: studentId, course: course._id },
                { student: studentId, course: course._id, className },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        // 2. Synchronize with course.enrolledStudents
        const existingIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        const newIds = validStudentIds.filter(studentId => !existingIds.has(studentId));
        if (newIds.length > 0) {
            course.enrolledStudents.push(...newIds.map(studentId => studentId));
        }

        // 3. Synchronize with course.classes for this grade
        let cls = course.classes.find(c => c.className === className || c.className === gradeParam);
        if (!cls) {
            course.classes.push({ className, enrolledStudents: validStudentIds });
        } else {
            const existingClsIds = new Set(cls.enrolledStudents.map(id => id.toString()));
            validStudentIds.forEach(id => {
                if (!existingClsIds.has(id)) {
                    cls.enrolledStudents.push(id);
                }
            });
        }

        await course.save();

        res.status(200).json({ message: `Enrolled ${validStudentIds.length} student(s) successfully.` });
    } catch (err) {
        console.error("Batch enroll error:", err);
        res.status(500).json({ error: 'Failed to enroll selected students: ' + err.message });
    }
});

// @route   POST /api/courses/:id/remove-students/:gradeNumber
router.post('/:id/remove-students/:gradeNumber', protect, isAdmin, async (req, res) => {
    try {
        const gradeParam = req.params.gradeNumber;
        const { studentIds = [] } = req.body;

        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ error: 'Please select at least one student.' });
        }

        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const validIds = new Set(studentIds.map(id => id.toString()));
        const beforeCount = course.enrolledStudents.length;

        // Remove from course.enrolledStudents
        course.enrolledStudents = course.enrolledStudents.filter(studentId => !validIds.has(studentId.toString()));

        // Also remove from all classes in course.classes
        if (course.classes && course.classes.length > 0) {
            course.classes.forEach(cls => {
                cls.enrolledStudents = cls.enrolledStudents.filter(studentId => !validIds.has(studentId.toString()));
            });
        }

        await course.save();

        // Delete from Enrollment table
        await Enrollment.deleteMany({
            course: course._id,
            student: { $in: Array.from(validIds) }
        });

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
            course.enrolledGrades.splice(existingIndex, 1);

            const gradeRegexes = buildGradeRegexes(gradeNumber);
            const gradeStudents = await User.find({ role: 'student', grade: { $in: gradeRegexes } }).select('_id');
            const studentIds = gradeStudents.map(s => s._id.toString());
            const className = gradeNumber.startsWith('Grade') ? gradeNumber : `Grade ${gradeNumber}`;

            if (course.classes && course.classes.length > 0) {
                course.classes = course.classes.filter(c => c.className !== className && c.className !== gradeNumber);
            }

            const studentIdsSet = new Set(studentIds);
            if (course.enrolledStudents && course.enrolledStudents.length > 0) {
                course.enrolledStudents = course.enrolledStudents.filter(id => !studentIdsSet.has(id.toString()));
            }

            await course.save();

            await Enrollment.deleteMany({
                course: course._id,
                $or: [
                    { className: className },
                    { className: gradeNumber },
                    { student: { $in: studentIds } }
                ]
            });

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

        const gradeParam = req.params.gradeNumber;
        if (!gradeParam || !String(gradeParam).trim()) {
            return res.status(400).json({ error: 'Invalid grade selection.' });
        }

        const gradeAllowed = course.enrolledGrades.some(g => g.gradeNumber === gradeParam);
        if (!gradeAllowed) {
            return res.status(400).json({ error: 'This grade is not assigned to this course.' });
        }

        const gradeRegexes = buildGradeRegexes(gradeParam);
        const students = await User.find({ role: 'student', grade: { $in: gradeRegexes } });
        if (!students.length) {
            return res.status(404).json({ error: `No students found for ${gradeParam}.` });
        }

        const className = gradeParam.startsWith('Grade') ? gradeParam : `Grade ${gradeParam}`;

        // 1. Always Upsert into Enrollment collection matching { student, course }
        for (const student of students) {
            await Enrollment.findOneAndUpdate(
                { student: student._id, course: course._id },
                { student: student._id, course: course._id, className },
                { upsert: true, new: true, setDefaultsOnInsert: true }
            );
        }

        // 2. Synchronize with course.enrolledStudents
        const existingIds = new Set(course.enrolledStudents.map(studentId => studentId.toString()));
        const newStudents = students.filter(student => !existingIds.has(student._id.toString()));
        if (newStudents.length > 0) {
            course.enrolledStudents.push(...newStudents.map(student => student._id));
        }

        // 3. Synchronize with course.classes for this grade
        let cls = course.classes.find(c => c.className === className || c.className === gradeParam);
        const allStudentIds = students.map(student => student._id);
        if (!cls) {
            course.classes.push({ className, enrolledStudents: allStudentIds });
        } else {
            const existingClsIds = new Set(cls.enrolledStudents.map(id => id.toString()));
            allStudentIds.forEach(id => {
                if (!existingClsIds.has(id.toString())) {
                    cls.enrolledStudents.push(id);
                }
            });
        }

        await course.save();

        res.status(200).json({ message: `Enrolled ${students.length} students from ${className}.` });
    } catch (err) {
        console.error("Enroll grade error:", err);
        res.status(500).json({ error: 'Failed to enroll grade students: ' + err.message });
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