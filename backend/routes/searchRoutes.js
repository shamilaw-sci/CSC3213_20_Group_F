const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Course = require('../models/Course');
const Lesson = require('../models/Lesson');
const Quiz = require('../models/Quiz');
const Assignment = require('../models/Assignment');
const { protect } = require('../middleware/authMiddleware');

// Helper to resolve full image URLs
const getFullUrl = (req, filenameOrUrl) => {
    if (!filenameOrUrl) return "";
    if (filenameOrUrl.startsWith('data:') || filenameOrUrl.startsWith('http://') || filenameOrUrl.startsWith('https://')) {
        return filenameOrUrl;
    }
    let filename = filenameOrUrl;
    if (filenameOrUrl.includes('/uploads/')) {
        filename = filenameOrUrl.split('/uploads/').pop();
    } else if (filenameOrUrl.startsWith('/')) {
        filename = filenameOrUrl.substring(1);
    }
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    if (!fs.existsSync(filePath)) {
        return filenameOrUrl.startsWith('/') ? filenameOrUrl : "";
    }
    return `${req.protocol}://${req.get('host')}/uploads/${filename}`;
};

// Escape special regex characters safely
const escapeRegex = (str) => {
    return str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
};

// Master list of quick navigation actions
const SYSTEM_ACTIONS = [
    {
        id: 'action-dashboard',
        title: 'Dashboard Overview',
        description: 'View real-time institute stats, schedule & analytics',
        category: 'Quick Action',
        link: '/dashboard',
        icon: 'FaHome',
        roles: ['admin', 'teacher', 'student'],
        keywords: ['home', 'dashboard', 'overview', 'main', 'statistics', 'stats']
    },
    {
        id: 'action-courses',
        title: 'Courses Catalog',
        description: 'Browse all subject streams, lessons and enrolled classes',
        category: 'Quick Action',
        link: '/courses',
        icon: 'FaBook',
        roles: ['admin', 'teacher', 'student', 'parent'],
        keywords: ['courses', 'classes', 'subjects', 'study', 'catalog', 'enrolled']
    },
    {
        id: 'action-attendance',
        title: 'Attendance & Barcode Scanner',
        description: 'QR/Barcode scanner, physical gate passes and daily check-ins',
        category: 'Quick Action',
        link: '/attendance',
        icon: 'FaCalendarCheck',
        roles: ['admin', 'counter_staff', 'teacher'],
        keywords: ['attendance', 'scanner', 'barcode', 'qr', 'checkin', 'arrival', 'present', 'absent', 'gate pass']
    },
    {
        id: 'action-payments',
        title: 'Payments & Fee Invoices',
        description: 'Track bank deposit slips, physical cash records & receipts',
        category: 'Quick Action',
        link: '/payments',
        icon: 'FaCreditCard',
        roles: ['admin', 'counter_staff', 'teacher', 'student'],
        keywords: ['payments', 'fees', 'invoice', 'due', 'bank slip', 'slips', 'receipt', 'money', 'counter', 'pay']
    },
    {
        id: 'action-analytics',
        title: 'Analytics & Performance Reports',
        description: 'View student progress, exam ranks, attendance rates and fees',
        category: 'Quick Action',
        link: '/analytics',
        icon: 'FaChartBar',
        roles: ['admin', 'teacher', 'student', 'parent'],
        keywords: ['analytics', 'reports', 'charts', 'performance', 'rank', 'growth', 'marks']
    },
    {
        id: 'action-manage-users',
        title: 'Manage Users & Admissions',
        description: 'Student registration records, teacher faculty & parent links',
        category: 'Quick Action',
        link: '/manage-users',
        icon: 'FaUsers',
        roles: ['admin'],
        keywords: ['users', 'students', 'teachers', 'admissions', 'manage users', 'accounts', 'edit student']
    },
    {
        id: 'action-enrollments',
        title: 'Batch & Class Enrollments',
        description: 'Assign students to grade batches and individual courses',
        category: 'Quick Action',
        link: '/enrollments',
        icon: 'FaUserPlus',
        roles: ['admin'],
        keywords: ['enrollments', 'enroll', 'batch', 'assign class', 'classes', 'unenroll']
    },
    {
        id: 'action-add-course',
        title: 'Create New Course',
        description: 'Add new academic course with instructor, cover and bank details',
        category: 'Quick Action',
        link: '/add-course',
        icon: 'FaPlusCircle',
        roles: ['admin'],
        keywords: ['create course', 'add course', 'new course', 'new subject', 'create class']
    },
    {
        id: 'action-sms-settings',
        title: 'SMS Settings & Broadcast',
        description: 'Send SMS announcements to parents and verify phone gateway',
        category: 'Quick Action',
        link: '/sms-settings',
        icon: 'FaSms',
        roles: ['admin'],
        keywords: ['sms', 'broadcast', 'messages', 'announcement', 'notify', 'sms gateway', 'gateway']
    },
    {
        id: 'action-settings',
        title: 'Account & Security Settings',
        description: 'Update profile info, change password and manage preferences',
        category: 'Quick Action',
        link: '/settings',
        icon: 'FaCog',
        roles: ['admin', 'teacher', 'student', 'parent', 'counter_staff'],
        keywords: ['settings', 'account', 'password', 'change password', 'profile', 'profile picture']
    },
    {
        id: 'action-instructors-public',
        title: 'Institute Timetable & Instructors',
        description: 'Public timetable schedule and teacher biographies',
        category: 'Quick Action',
        link: '/instructors',
        icon: 'FaChalkboardTeacher',
        roles: ['admin', 'teacher', 'student', 'parent'],
        keywords: ['timetable', 'instructors', 'schedule', 'faculty', 'teachers']
    }
];

// @route   GET /api/search
// @desc    Universal search across courses, teachers, students, lessons, quizzes, assignments & quick actions
// @access  Protected
router.get('/', protect, async (req, res) => {
    try {
        const query = (req.query.q || req.query.query || '').trim();
        const categoryFilter = (req.query.type || 'all').toLowerCase().trim();
        const role = req.user.role;
        const userId = req.user._id;

        if (!query || query.length === 0) {
            return res.json({
                query: '',
                totalResults: 0,
                courses: [],
                teachers: [],
                students: [],
                lessons: [],
                quizzes: [],
                assignments: [],
                quickActions: []
            });
        }

        const safeQuery = escapeRegex(query);
        const searchRegex = new RegExp(safeQuery, 'i');

        // 1. MATCH QUICK ACTIONS
        const quickActions = SYSTEM_ACTIONS
            .filter(act => act.roles.includes(role))
            .filter(act => {
                const titleMatch = searchRegex.test(act.title);
                const descMatch = searchRegex.test(act.description);
                const kwMatch = act.keywords.some(kw => searchRegex.test(kw) || kw.includes(query.toLowerCase()));
                return titleMatch || descMatch || kwMatch;
            })
            .slice(0, 4);

        // Prepare parallel promises
        const searchPromises = [];

        // 2. SEARCH COURSES
        const courseQuery = {
            $or: [
                { title: searchRegex },
                { description: searchRegex },
                { 'enrolledGrades.gradeNumber': searchRegex },
                { 'classes.className': searchRegex }
            ]
        };

        if (role === 'student') {
            // Include active courses matching student's grade / enrollment
            courseQuery.status = { $ne: 'deactive' };
        }

        const coursesPromise = Course.find(courseQuery)
            .populate('instructor', 'name profilePicture email')
            .limit(6)
            .lean()
            .then(courses => {
                return courses.map(c => {
                    const enrolledCount = Array.isArray(c.enrolledStudents) ? c.enrolledStudents.length : 0;
                    let gradesStr = 'All Grades';
                    if (c.enrolledGrades && c.enrolledGrades.length > 0) {
                        gradesStr = c.enrolledGrades.map(g => g.gradeNumber || g.title).filter(Boolean).join(', ');
                    }
                    return {
                        _id: c._id,
                        id: c._id,
                        type: 'course',
                        title: c.title,
                        description: c.description || '',
                        price: c.price || 2500,
                        studentType: c.studentType || 'all',
                        grades: gradesStr,
                        enrolledCount,
                        banner: getFullUrl(req, c.banner),
                        cardImage: getFullUrl(req, c.cardImage || c.banner),
                        instructor: c.instructor ? {
                            _id: c.instructor._id,
                            id: c.instructor._id,
                            name: c.instructor.name,
                            profilePicture: getFullUrl(req, c.instructor.profilePicture)
                        } : null,
                        link: `/course/${c._id}`
                    };
                });
            });
        searchPromises.push(coursesPromise);

        // 3. SEARCH TEACHERS / INSTRUCTORS
        const teacherQuery = {
            role: 'teacher',
            $or: [
                { name: searchRegex },
                { email: searchRegex },
                { phoneNumber: searchRegex },
                { qualifications: searchRegex },
                { department: searchRegex },
                { bio: searchRegex },
                { teacherTags: searchRegex }
            ]
        };

        const teachersPromise = User.find(teacherQuery)
            .select('_id name email profilePicture coverPicture qualifications department phoneNumber bio teacherTags')
            .limit(5)
            .lean()
            .then(teachers => {
                return teachers.map(t => ({
                    _id: t._id,
                    id: t._id,
                    type: 'teacher',
                    name: t.name,
                    email: t.email || '',
                    phoneNumber: t.phoneNumber || '',
                    qualifications: t.qualifications || '',
                    department: t.department || 'Academic Faculty',
                    teacherTags: t.teacherTags || [],
                    profilePicture: getFullUrl(req, t.profilePicture),
                    coverPicture: getFullUrl(req, t.coverPicture),
                    bio: t.bio || ''
                }));
            });
        searchPromises.push(teachersPromise);

        // 4. SEARCH STUDENTS (Admin, Counter Staff, Teacher only)
        let studentsPromise;
        if (role === 'admin' || role === 'counter_staff' || role === 'teacher') {
            const studentQuery = {
                role: 'student',
                $or: [
                    { name: searchRegex },
                    { registrationNumber: searchRegex },
                    { email: searchRegex },
                    { phoneNumber: searchRegex },
                    { parentsPhoneNumber: searchRegex },
                    { grade: searchRegex }
                ]
            };

            studentsPromise = User.find(studentQuery)
                .select('_id name email registrationNumber grade studentType parentsPhoneNumber phoneNumber profilePicture')
                .limit(6)
                .lean()
                .then(students => {
                    return students.map(s => ({
                        _id: s._id,
                        id: s._id,
                        type: 'student',
                        name: s.name,
                        email: s.email || '',
                        registrationNumber: s.registrationNumber || 'N/A',
                        grade: s.grade || '',
                        studentType: s.studentType || 'physical',
                        phoneNumber: s.phoneNumber || s.parentsPhoneNumber || '',
                        profilePicture: getFullUrl(req, s.profilePicture)
                    }));
                });
        } else {
            studentsPromise = Promise.resolve([]);
        }
        searchPromises.push(studentsPromise);

        // 5. SEARCH LESSONS & MATERIALS
        const lessonQuery = {
            $or: [
                { 'videoLessons.title': searchRegex },
                { 'pdfMaterials.title': searchRegex },
                { 'assignments.title': searchRegex },
                { teacherMessage: searchRegex },
                { grade: searchRegex }
            ]
        };

        const lessonsPromise = Lesson.find(lessonQuery)
            .populate('course', 'title banner cardImage')
            .limit(6)
            .lean()
            .then(lessons => {
                const results = [];
                for (const l of lessons) {
                    if (!l.course) continue;
                    
                    // Match specific video lessons
                    (l.videoLessons || []).forEach(v => {
                        if (searchRegex.test(v.title)) {
                            results.push({
                                _id: `${l._id}_video_${v._id || v.title}`,
                                id: `${l._id}_video_${v._id || v.title}`,
                                type: 'lesson_video',
                                title: v.title,
                                subTitle: `Video Lesson • Week ${v.weekNumber || 1} • ${l.grade}`,
                                courseId: l.course._id,
                                courseTitle: l.course.title,
                                grade: l.grade,
                                link: `/course/${l.course._id}?grade=${encodeURIComponent(l.grade)}&tab=lessons`
                            });
                        }
                    });

                    // Match specific PDF study materials
                    (l.pdfMaterials || []).forEach(p => {
                        if (searchRegex.test(p.title)) {
                            results.push({
                                _id: `${l._id}_pdf_${p._id || p.title}`,
                                id: `${l._id}_pdf_${p._id || p.title}`,
                                type: 'lesson_pdf',
                                title: p.title,
                                subTitle: `Study Note PDF • Week ${p.weekNumber || 1} • ${l.grade}`,
                                courseId: l.course._id,
                                courseTitle: l.course.title,
                                grade: l.grade,
                                link: `/course/${l.course._id}?grade=${encodeURIComponent(l.grade)}&tab=materials`
                            });
                        }
                    });
                }
                return results.slice(0, 5);
            });
        searchPromises.push(lessonsPromise);

        // 6. SEARCH QUIZZES
        const quizQuery = {
            isActive: true,
            $or: [
                { title: searchRegex },
                { description: searchRegex },
                { grade: searchRegex },
                { month: searchRegex }
            ]
        };

        const quizzesPromise = Quiz.find(quizQuery)
            .populate('course', 'title')
            .populate('teacher', 'name')
            .limit(4)
            .lean()
            .then(quizzes => {
                return quizzes.map(q => ({
                    _id: q._id,
                    id: q._id,
                    type: 'quiz',
                    title: q.title,
                    description: q.description || '',
                    courseId: q.course?._id,
                    courseTitle: q.course?.title || 'Academic Course',
                    grade: q.grade,
                    teacherName: q.teacher?.name || '',
                    questionCount: (q.questions || []).length,
                    link: role === 'student' ? `/quiz/${q._id}/take` : `/course/${q.course?._id}/quiz/${q._id}/edit`
                }));
            });
        searchPromises.push(quizzesPromise);

        // 7. SEARCH ASSIGNMENTS
        const assignmentQuery = {
            isActive: true,
            $or: [
                { title: searchRegex },
                { description: searchRegex },
                { grade: searchRegex },
                { month: searchRegex }
            ]
        };

        const assignmentsPromise = Assignment.find(assignmentQuery)
            .populate('course', 'title')
            .populate('instructor', 'name')
            .limit(4)
            .lean()
            .then(assignments => {
                return assignments.map(a => ({
                    _id: a._id,
                    id: a._id,
                    type: 'assignment',
                    title: a.title,
                    description: a.description || '',
                    courseId: a.course?._id,
                    courseTitle: a.course?.title || 'Academic Course',
                    grade: a.grade,
                    teacherName: a.instructor?.name || '',
                    dueDate: a.dueDate,
                    link: `/course/${a.course?._id}?grade=${encodeURIComponent(a.grade)}&tab=assignments`
                }));
            });
        searchPromises.push(assignmentsPromise);

        // Execute all in parallel
        const [
            courses,
            teachers,
            students,
            lessons,
            quizzes,
            assignments
        ] = await Promise.all(searchPromises);

        const totalResults = courses.length + teachers.length + students.length +
            lessons.length + quizzes.length + assignments.length + quickActions.length;

        res.json({
            query,
            totalResults,
            quickActions,
            courses: categoryFilter === 'all' || categoryFilter === 'courses' ? courses : [],
            teachers: categoryFilter === 'all' || categoryFilter === 'teachers' ? teachers : [],
            students: categoryFilter === 'all' || categoryFilter === 'students' ? students : [],
            lessons: categoryFilter === 'all' || categoryFilter === 'lessons' ? lessons : [],
            quizzes: categoryFilter === 'all' || categoryFilter === 'quizzes' ? quizzes : [],
            assignments: categoryFilter === 'all' || categoryFilter === 'assignments' ? assignments : []
        });

    } catch (err) {
        console.error("Global search API error:", err);
        res.status(500).json({ error: "Failed to perform search: " + err.message });
    }
});

module.exports = router;
