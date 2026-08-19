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
const { protect, isAdmin, isTeacherOrAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');
const { getClassNameFromGrade } = require('../utils/migration');

// Extract the raw filename if a full path is stored, and build a dynamic URL based on the request host
// Also verifies the file actually exists on disk so images work across team members' machines
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
    // Check if the file actually exists on this machine's disk
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    if (!fs.existsSync(filePath)) {
        // File doesn't exist locally (e.g. uploaded on another team member's machine)
        return "";
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
// If a Base64 image can't be converted (or file doesn't exist on this machine), serves base64 directly
const processCourseImages = async (req, courseDoc) => {
    if (!courseDoc) return null;
    let updated = false;
    let banner = courseDoc.banner || "";
    let cardImage = courseDoc.cardImage || "";

    if (banner.startsWith('data:')) {
        const converted = convertBase64ToStaticFile(banner, 'banner');
        if (converted !== banner) {
            // Successfully saved to disk, update DB path
            banner = converted;
            courseDoc.banner = banner;
            updated = true;
        }
        // If conversion failed, banner stays as base64 and will be served directly
    }
    if (cardImage.startsWith('data:')) {
        const converted = convertBase64ToStaticFile(cardImage, 'cardImage');
        if (converted !== cardImage) {
            cardImage = converted;
            courseDoc.cardImage = cardImage;
            updated = true;
        }
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
            .populate('instructor', 'name profilePicture');
        
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
        // Auto-sync any students in course.enrolledStudents who are missing from Enrollment collection
        const courses = await Course.find({}).populate('enrolledStudents');
        for (const c of courses) {
            if (Array.isArray(c.enrolledStudents)) {
                for (const stu of c.enrolledStudents) {
                    if (stu && stu._id) {
                        const exists = await Enrollment.findOne({ student: stu._id, course: c._id });
                        if (!exists) {
                            await Enrollment.create({
                                student: stu._id,
                                course: c._id,
                                className: c.grade || stu.grade || 'Grade Active'
                            }).catch(() => {});
                        }
                    }
                }
            }
        }

        const dbEnrollments = await Enrollment.find({})
            .populate('student', 'name email registrationNumber grade parentsPhoneNumber')
            .populate('course', 'title grade')
            .sort({ createdAt: -1, _id: -1 });

        const enrollments = dbEnrollments
            .filter(e => e.student && e.course)
            .map(e => ({
                _id: e._id,
                courseId: e.course._id,
                courseTitle: e.course.title,
                className: e.className || e.course.grade || e.student?.grade || 'Grade Active',
                studentId: e.student._id,
                studentName: e.student.name,
                studentEmail: e.student.email,
                studentRegNo: e.student.registrationNumber || 'N/A',
                studentGrade: e.student.grade || 'Grade Active',
                studentPhone: e.student.parentsPhoneNumber || 'N/A',
                createdAt: e.createdAt || e.enrollmentDate || null
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

        // --- TRIGGER NOTIFICATIONS ---
        try {
            await Notification.create({
                recipient: studentId,
                type: 'COURSE_ADDED',
                title: 'Enrolled in Course',
                message: `You have been enrolled in '${course.title}' (${trimmedClass}) by Administration.`,
                link: '/courses',
                metadata: { courseId: course._id, className: trimmedClass }
            });
        } catch (notifErr) {
            console.error('Enroll notification error:', notifErr.message);
        }

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
        const { title, description, teacherName, teacherEmail, defaultPassword, studentType = 'all' } = req.body;

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

            let parsedBankDetails = {};
            if (req.body.bankDetails) {
                try {
                    parsedBankDetails = typeof req.body.bankDetails === 'string' ? JSON.parse(req.body.bankDetails) : req.body.bankDetails;
                } catch (e) {
                    parsedBankDetails = {};
                }
            }

            const newCourse = await Course.create({
                title,
                description,
                instructor: instructorId,
                banner: bannerPath,
                cardImage: cardImagePath,
                studentType: finalStudentType,
                bankDetails: parsedBankDetails
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
            .populate('instructor', 'name profilePicture')
            .populate('enrolledStudents', 'name grade registrationNumber');
        if (!course) return res.status(404).json({ error: "Course not found" });

        // Enforce student grade restriction: students can only see courses for their grade (unless enrolled)
        if (req.user.role === 'student') {
            const isEnrolled = course.enrolledStudents.some(s => 
                (s._id && s._id.toString() === req.user._id.toString()) || s.toString() === req.user._id.toString()
            );
            if (!isEnrolled) {
                if (!req.user.grade) {
                    return res.status(403).json({ error: "Access denied: Student grade is not set." });
                }
                const gradeRegexes = buildGradeRegexes(req.user.grade.trim());
                const isGradeMatching = course.enrolledGrades.some(g =>
                    gradeRegexes.some(regex => regex.test(g.gradeNumber))
                );
                if (!isGradeMatching) {
                    return res.status(403).json({ error: "Access denied: This course is not offered for your grade." });
                }
            }
        }

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
    
    // Split combination grade by delimiters (&, and, comma, slash, plus, hyphen)
    const parts = trimmed.split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(p => p.trim()).filter(Boolean);
    const terms = new Set([
        trimmed,
        trimmed.toLowerCase(),
        trimmed.replace(/grade/i, '').trim(),
        `Grade ${trimmed.replace(/grade/i, '').trim()}`
    ]);

    parts.forEach(part => {
        const rawNum = part.replace(/\D/g, '');
        terms.add(part);
        terms.add(part.toLowerCase());
        terms.add(part.replace(/grade/i, '').trim());
        terms.add(`Grade ${part.replace(/grade/i, '').trim()}`);
        if (rawNum) {
            terms.add(rawNum);
            terms.add(`Grade ${rawNum}`);
        }
    });

    return Array.from(terms).filter(Boolean).map(t => 
        new RegExp(`^\\s*${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i')
    );
};

// @route   GET /api/courses/:id/students/:gradeNumber
// Admin/Teacher fetches all students belonging to a specific grade with current enrollment status, attendance, and payments
router.get('/:id/students/:gradeNumber', protect, isTeacherOrAdmin, async (req, res) => {
    try {
        const gradeParam = req.params.gradeNumber;
        if (!gradeParam) return res.status(400).json({ error: 'Grade selection is required.' });

        const gradeRegexes = buildGradeRegexes(gradeParam);
        const course = await Course.findById(req.params.id);
        if (!course) return res.status(404).json({ error: 'Course not found' });

        const studentFilter = { 
            role: 'student', 
            grade: { $in: gradeRegexes } 
        };

        if (course.studentType === 'online') {
            studentFilter.studentType = 'online';
        } else if (course.studentType === 'physical') {
            studentFilter.studentType = 'physical';
        }

        const students = await User.find(studentFilter)
        .select('_id name email registrationNumber grade parentsPhoneNumber studentType')
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

        // Fetch real payment records for all students in this grade batch
        const Payment = require('../models/Payment');
        const allPayments = await Payment.find({
            student: { $in: studentIds }
        }).populate('course', 'title price').sort({ createdAt: -1 });

        const paymentsMap = {};
        for (const p of allPayments) {
            const sId = p.student.toString();
            if (!paymentsMap[sId]) {
                paymentsMap[sId] = [];
            }
            paymentsMap[sId].push(p);
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

            // Real payments from database for this student & THIS SPECIFIC COURSE ONLY
            const allStudentPaymentRecords = paymentsMap[student._id.toString()] || [];
            const courseSpecificPayments = allStudentPaymentRecords.filter(p => {
                const cId = p.course?._id?.toString() || p.course?.toString() || p.courseId?.toString();
                return cId === course._id.toString();
            });

            const isPaid = courseSpecificPayments.length > 0;

            studentObj.paymentStatus = isPaid ? 'PAID' : 'DUE';
            studentObj.payment = {
                status: isPaid ? 'Paid' : 'Due',
                amountDue: isPaid ? 0 : (course.price || 2500),
                dueDate: 'End of Month',
                history: courseSpecificPayments.map(p => ({
                    _id: p._id,
                    transactionId: p.transactionId,
                    courseTitle: p.course?.title || course.title || 'Course Fee',
                    amount: p.amount || course.price || 2500,
                    paymentMethod: p.paymentMethod || 'Card',
                    status: p.status || 'COMPLETED',
                    date: p.paymentDate || p.createdAt ? new Date(p.paymentDate || p.createdAt).toLocaleDateString('en-GB') : 'N/A',
                    month: p.month || new Date(p.createdAt).toLocaleString('default', { month: 'long' })
                }))
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
            const isCourseDeactive = course.status === 'deactive' || course.isActive === false;
            const titleVal = req.body.title || (gradeNumber.toLowerCase().startsWith('grade') ? gradeNumber : `Grade ${gradeNumber}`);
            course.enrolledGrades.push({ 
                gradeNumber, 
                title: titleVal,
                messages: [],
                status: isCourseDeactive ? 'deactive' : 'active',
                isActive: !isCourseDeactive,
                deactivatedBy: isCourseDeactive ? 'admin' : null,
                previousStatus: isCourseDeactive ? 'active' : null
            });
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
        const studentFilter = { role: 'student', grade: { $in: gradeRegexes } };
        if (course.studentType === 'online') {
            studentFilter.studentType = 'online';
        } else if (course.studentType === 'physical') {
            studentFilter.studentType = 'physical';
        }

        const students = await User.find(studentFilter);
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

        // --- TRIGGER NOTIFICATIONS FOR GRADE STUDENTS ---
        try {
            const targetGradeName = String(gradeNumber).trim();
            const students = await User.find({ role: 'student', grade: new RegExp(targetGradeName, 'i') }).select('_id');
            const notifDocs = students.map(st => ({
                recipient: st._id,
                sender: req.user._id,
                type: 'GENERAL',
                title: `New Message in ${course.title}`,
                message: text,
                link: '/courses',
                metadata: { courseId: course._id, gradeNumber }
            }));
            if (notifDocs.length > 0) {
                await Notification.insertMany(notifDocs);
            }
        } catch (notifErr) {
            console.error('Course message notification error:', notifErr.message);
        }

        res.status(200).json({ message: "Message sent successfully" });
    } catch (err) {
        res.status(500).json({ error: "Failed to send message" });
    }
});

// @route   PUT /api/courses/:courseId/grades/:gradeId/status
// @desc    Admin / Teacher update grade status (active / deactive)
router.put('/:courseId/grades/:gradeId/status', protect, async (req, res) => {
    try {
        const { courseId, gradeId } = req.params;
        const { status, deactivatedBy } = req.body;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        if (course.status === 'deactive' || course.isActive === false) {
            return res.status(400).json({ error: "Cannot modify grade status while the full course is deactivated." });
        }

        const isDeactive = status === 'deactive';
        const newStatus = isDeactive ? 'deactive' : 'active';
        const updatedByRole = req.user.role === 'admin' ? 'admin' : 'teacher';

        // Locate target grade in course.enrolledGrades
        let gradeItem = course.enrolledGrades.find(g => 
            String(g._id) === String(gradeId) || 
            String(g.id) === String(gradeId) || 
            String(g.gradeNumber).toLowerCase() === String(gradeId).toLowerCase()
        );

        if (!gradeItem) {
            gradeItem = course.enrolledGrades.find(g => 
                String(g.gradeNumber).replace(/\D/g, '') === String(gradeId).replace(/\D/g, '')
            );
        }

        if (gradeItem) {
            gradeItem.status = newStatus;
            gradeItem.isActive = !isDeactive;
            gradeItem.deactivatedBy = isDeactive ? (deactivatedBy || updatedByRole) : null;
        } else {
            course.enrolledGrades.push({
                gradeNumber: gradeId,
                title: `Grade ${gradeId}`,
                status: newStatus,
                isActive: !isDeactive,
                deactivatedBy: isDeactive ? (deactivatedBy || updatedByRole) : null
            });
        }

        course.markModified('enrolledGrades');
        await course.save();

        res.json({ 
            message: `Grade status updated to ${newStatus} successfully`, 
            status: newStatus,
            deactivatedBy: isDeactive ? (deactivatedBy || updatedByRole) : null
        });
    } catch (err) {
        console.error("Failed to update grade status:", err.message);
        res.status(500).json({ error: "Failed to update grade status: " + err.message });
    }
});

// @route   PUT /api/courses/:id/full-status
// @desc    Admin updates whole course active/deactive status (and deactivates all grades inside if deactivating)
router.put('/:id/full-status', protect, isAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const course = await Course.findById(req.params.id);
        if (!course) {
            return res.status(404).json({ error: "Course not found" });
        }

        const isDeactive = status === 'deactive';
        const newStatus = isDeactive ? 'deactive' : 'active';

        course.status = newStatus;
        course.isActive = !isDeactive;
        course.deactivatedBy = isDeactive ? 'admin' : null;

        if (isDeactive) {
            // Deactivating full course: store previous status of each grade before setting to deactive
            if (Array.isArray(course.enrolledGrades)) {
                course.enrolledGrades.forEach(g => {
                    if (!g.previousStatus) {
                        g.previousStatus = g.status || (g.isActive === false ? 'deactive' : 'active');
                    }
                    g.status = 'deactive';
                    g.isActive = false;
                    g.deactivatedBy = 'admin';
                });
                course.markModified('enrolledGrades');
            }
        } else {
            // Reactivating full course: restore each grade back to its previous status as before full course deactivation
            if (Array.isArray(course.enrolledGrades)) {
                course.enrolledGrades.forEach(g => {
                    const restoredStatus = g.previousStatus || 'active';
                    g.status = restoredStatus;
                    g.isActive = restoredStatus === 'active';
                    g.deactivatedBy = restoredStatus === 'deactive' ? (g.deactivatedBy || 'admin') : null;
                    g.previousStatus = null;
                });
                course.markModified('enrolledGrades');
            }
        }

        await course.save();

        res.json({
            message: `Course "${course.title}" status updated to ${newStatus} successfully`,
            course
        });
    } catch (err) {
        console.error("Failed to update full course status:", err.message);
        res.status(500).json({ error: "Failed to update full course status: " + err.message });
    }
});

module.exports = router;