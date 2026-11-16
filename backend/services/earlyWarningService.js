/**
 * @file earlyWarningService.js
 * @description Early Warning Service. Analyzes individual and cohort student performance metrics (attendance rate, quiz grade progression, missing assignments, learning activity recency) to flag academic and engagement risk levels.
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const ReadingProgress = require('../models/ReadingProgress');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

/**
 * Evaluates and analyzes learning performance and warning indicators for a single student.
 * Uses existing LMS database models without creating duplicate collections or modifying schema.
 * 
 * Warning conditions evaluated:
 * 1. Attendance below 75% -> Attendance Concern
 * 2. Consistently decreasing quiz marks -> Performance Decline
 * 3. Several missing assignments -> Assignment Concern
 * 4. No recent learning activity -> Inactive Student
 */
const analyzeStudentPerformance = async (studentId) => {
  if (!studentId) return null;

  const student = await User.findById(studentId).select('-password').lean();
  if (!student || student.role !== 'student') return null;

  const now = new Date();

  // 1. Resolve student courses
  const enrollments = await Enrollment.find({ student: studentId }).lean();
  const directCourses = await Course.find({ enrolledStudents: studentId }).select('_id title price').lean();
  
  const courseIdSet = new Set([
    ...enrollments.map(e => e.course?.toString()).filter(Boolean),
    ...directCourses.map(c => c._id.toString())
  ]);

  if (student.grade) {
    const gradeCourses = await Course.find({
      $or: [
        { 'enrolledGrades.gradeNumber': student.grade },
        { enrolledStudents: studentId }
      ]
    }).select('_id title price').lean();
    gradeCourses.forEach(c => courseIdSet.add(c._id.toString()));
  }

  const allCourseIds = Array.from(courseIdSet).map(id => new mongoose.Types.ObjectId(id));

  // 2. Attendance Analysis
  const attendanceLogs = await Attendance.find({
    $or: [{ studentId: student._id }, { student: student._id }]
  })
    .populate('courseId', 'title')
    .sort({ date: -1, createdAt: -1 })
    .lean();

  const totalAttendance = attendanceLogs.length;
  const presentCount = attendanceLogs.filter(a => a.status === 'Present').length;
  const absentCount = attendanceLogs.filter(a => a.status === 'Absent').length;
  const lateCount = attendanceLogs.filter(a => a.status === 'Late').length;

  const attendanceRate = totalAttendance > 0
    ? Math.round((presentCount / totalAttendance) * 100)
    : 0;

  // 3. Quiz Performance & Trend Analysis
  const quizSubmissions = await QuizSubmission.find({ student: student._id })
    .populate({
      path: 'quiz',
      select: 'title grade month weekNumber passingPercentage course timeLimit',
      populate: { path: 'course', select: 'title' }
    })
    .sort({ completedAt: 1 }) // chronological order for trend detection
    .lean();

  const totalQuizzes = quizSubmissions.length;
  const quizScoresWithPct = quizSubmissions.map(sub => {
    const maxPts = sub.totalPoints || 1;
    const pct = Math.round((sub.score / maxPts) * 100);
    const passMark = sub.quiz?.passingPercentage || 50;
    return {
      _id: sub._id,
      quizId: sub.quiz?._id,
      quizTitle: sub.quiz?.title || 'Quiz Assessment',
      courseTitle: sub.quiz?.course?.title || 'Institute Course',
      score: sub.score,
      totalPoints: sub.totalPoints,
      percentage: pct,
      passingPercentage: passMark,
      isPassed: pct >= passMark,
      completedAt: sub.completedAt || sub.createdAt
    };
  });

  const avgQuizScore = totalQuizzes > 0
    ? Math.round(quizScoresWithPct.reduce((acc, q) => acc + q.percentage, 0) / totalQuizzes)
    : 0;

  // 4. Assignment Performance & Missing Analysis
  const activeAssignments = await Assignment.find({
    $or: [
      { course: { $in: allCourseIds } },
      { grade: student.grade }
    ],
    isActive: true
  })
    .populate('course', 'title')
    .sort({ createdAt: -1 })
    .lean();

  const assignmentSubmissions = await AssignmentSubmission.find({ student: student._id })
    .populate({
      path: 'assignment',
      select: 'title maxMarks passingMarks dueDate course',
      populate: { path: 'course', select: 'title' }
    })
    .sort({ submittedAt: -1 })
    .lean();

  const submittedAssignmentMap = new Map();
  assignmentSubmissions.forEach(sub => {
    const asgnId = sub.assignment?._id?.toString() || sub.assignment?.toString();
    if (asgnId) submittedAssignmentMap.set(asgnId, sub);
  });

  const formattedSubmissions = assignmentSubmissions.map(sub => {
    const maxMarks = sub.assignment?.maxMarks || 100;
    const marks = sub.marks;
    const pct = marks !== null && marks !== undefined ? Math.round((marks / maxMarks) * 100) : null;
    const passMarks = sub.assignment?.passingMarks || 50;
    return {
      _id: sub._id,
      assignmentId: sub.assignment?._id,
      assignmentTitle: sub.assignment?.title || 'Course Assignment',
      courseTitle: sub.assignment?.course?.title || 'Course',
      dueDate: sub.assignment?.dueDate,
      submittedAt: sub.submittedAt,
      isLate: sub.isLate,
      status: sub.status,
      marks,
      maxMarks,
      percentage: pct,
      passingMarks: passMarks,
      isPassed: marks !== null ? marks >= passMarks : null,
      feedback: sub.feedback
    };
  });

  // Identify missing assignments
  const missingAssignments = [];
  activeAssignments.forEach(asgn => {
    const asgnId = asgn._id.toString();
    if (!submittedAssignmentMap.has(asgnId)) {
      const isPastDue = asgn.dueDate && new Date(asgn.dueDate) < now;
      const daysSinceCreated = (now - new Date(asgn.createdAt)) / (1000 * 60 * 60 * 24);
      
      // An assignment is missing if it is past due or was created > 2 days ago
      if (isPastDue || daysSinceCreated >= 2) {
        missingAssignments.push({
          _id: asgn._id,
          title: asgn.title,
          courseTitle: asgn.course?.title || 'Course',
          dueDate: asgn.dueDate,
          maxMarks: asgn.maxMarks || 100,
          isPastDue: !!isPastDue
        });
      }
    }
  });

  const gradedSubmissions = formattedSubmissions.filter(s => s.status === 'graded' && s.marks !== null);
  const avgAssignmentMarks = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((acc, s) => acc + s.percentage, 0) / gradedSubmissions.length)
    : 0;

  // 5. Reading Progress & Learning Activity
  const readingProgressList = await ReadingProgress.find({ student: student._id })
    .populate('course', 'title')
    .sort({ lastReadAt: -1 })
    .lean();

  const formattedReadingProgress = readingProgressList.map(rp => ({
    _id: rp._id,
    pdfId: rp.pdfId,
    pdfTitle: rp.pdfTitle || 'Study Material PDF',
    courseTitle: rp.course?.title || 'Course',
    totalPages: rp.totalPages || 1,
    maxPageRead: rp.maxPageRead || 1,
    progressPercentage: rp.progressPercentage || 0,
    isCompleted: rp.isCompleted,
    lastReadAt: rp.lastReadAt || rp.updatedAt
  }));

  const totalPdfsRead = formattedReadingProgress.length;
  const completedPdfsCount = formattedReadingProgress.filter(r => r.isCompleted).length;
  const avgReadingProgress = totalPdfsRead > 0
    ? Math.round(formattedReadingProgress.reduce((acc, r) => acc + r.progressPercentage, 0) / totalPdfsRead)
    : 0;

  // Most recent learning activity timestamp
  const activityTimestamps = [];
  if (attendanceLogs.length > 0) {
    const latestAttDate = attendanceLogs[0].date || attendanceLogs[0].createdAt;
    if (latestAttDate) activityTimestamps.push(new Date(latestAttDate).getTime());
  }
  if (quizSubmissions.length > 0) {
    const latestQuizSub = quizSubmissions[quizSubmissions.length - 1];
    const latestQuizDate = latestQuizSub.completedAt || latestQuizSub.createdAt;
    if (latestQuizDate) activityTimestamps.push(new Date(latestQuizDate).getTime());
  }
  if (assignmentSubmissions.length > 0) {
    const latestAsgnDate = assignmentSubmissions[0].submittedAt || assignmentSubmissions[0].createdAt;
    if (latestAsgnDate) activityTimestamps.push(new Date(latestAsgnDate).getTime());
  }
  if (readingProgressList.length > 0) {
    const latestReadDate = readingProgressList[0].lastReadAt || readingProgressList[0].updatedAt;
    if (latestReadDate) activityTimestamps.push(new Date(latestReadDate).getTime());
  }

  const latestActivityTimestamp = activityTimestamps.length > 0
    ? Math.max(...activityTimestamps)
    : (student.createdAt ? new Date(student.createdAt).getTime() : null);

  const daysSinceLastActivity = latestActivityTimestamp
    ? Math.max(0, Math.floor((now.getTime() - latestActivityTimestamp) / (1000 * 60 * 60 * 24)))
    : 999;

  // =========================================================================
  // 6. EARLY WARNING CONDITIONS EVALUATION
  // =========================================================================
  const warnings = [];

  // Condition 1: Attendance below 75% -> Attendance Concern
  if (totalAttendance > 0 && attendanceRate < 75) {
    warnings.push({
      type: 'ATTENDANCE_CONCERN',
      category: 'Attendance Concern',
      severity: attendanceRate < 50 ? 'high' : 'medium',
      metric: `${attendanceRate}%`,
      threshold: '75%',
      badgeColor: 'amber',
      reason: `Attendance is ${attendanceRate}% (${presentCount} present out of ${totalAttendance} total sessions), which is below the mandatory 75% institute threshold.`,
      action: 'Reach out to the student and notify parents regarding regular class attendance.'
    });
  } else if (totalAttendance === 0 && allCourseIds.length > 0) {
    const daysSinceCreated = (now - new Date(student.createdAt || now)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated > 5) {
      warnings.push({
        type: 'ATTENDANCE_CONCERN',
        category: 'Attendance Concern',
        severity: 'high',
        metric: '0%',
        threshold: '75%',
        badgeColor: 'red',
        reason: 'Student is enrolled in courses but has 0 recorded attendance sessions to date.',
        action: 'Check with desk staff or instructor to confirm if the student is attending physical/online classes.'
      });
    }
  }

  // Condition 2: Consistently decreasing quiz marks -> Performance Decline
  if (quizScoresWithPct.length >= 2) {
    // Analyze recent 2 to 4 submissions
    const recentQuizzes = quizScoresWithPct.slice(-3);
    if (recentQuizzes.length >= 2) {
      let isDecreasing = true;
      for (let i = 1; i < recentQuizzes.length; i++) {
        if (recentQuizzes[i].percentage >= recentQuizzes[i - 1].percentage) {
          isDecreasing = false;
          break;
        }
      }

      if (isDecreasing) {
        const scoresChain = recentQuizzes.map(q => `${q.percentage}%`).join(' → ');
        const dropAmount = recentQuizzes[0].percentage - recentQuizzes[recentQuizzes.length - 1].percentage;
        const latestPct = recentQuizzes[recentQuizzes.length - 1].percentage;

        warnings.push({
          type: 'PERFORMANCE_DECLINE',
          category: 'Performance Decline',
          severity: latestPct < 50 || dropAmount >= 25 ? 'high' : 'medium',
          metric: `${latestPct}% (Latest)`,
          scoresChain,
          dropAmount,
          badgeColor: 'rose',
          reason: `Quiz marks have consistently decreased over the last ${recentQuizzes.length} assessments (${scoresChain}), with an overall decline of ${dropAmount}%.`,
          action: 'Provide academic revision sessions, question explanations, or 1-on-1 teacher guidance.'
        });
      }
    }
  }

  // Condition 3: Several missing assignments -> Assignment Concern
  // "Several" missing assignments: 2 or more missing/overdue assignments
  if (missingAssignments.length >= 2) {
    const missingSampleTitles = missingAssignments.slice(0, 3).map(a => `"${a.title}"`).join(', ');
    const moreSuffix = missingAssignments.length > 3 ? ` and ${missingAssignments.length - 3} more` : '';
    
    warnings.push({
      type: 'ASSIGNMENT_CONCERN',
      category: 'Assignment Concern',
      severity: missingAssignments.length >= 3 ? 'high' : 'medium',
      metric: `${missingAssignments.length} Missing`,
      missingCount: missingAssignments.length,
      badgeColor: 'orange',
      reason: `Student has ${missingAssignments.length} overdue assignment(s) with no submitted work (${missingSampleTitles}${moreSuffix}).`,
      action: 'Issue homework submission reminders and check if the student needs assistance with assignment instructions.'
    });
  }

  // Condition 4: No recent learning activity -> Inactive Student
  // Inactive if no activity recorded in >= 14 days
  if (daysSinceLastActivity >= 14) {
    const lastActiveStr = latestActivityTimestamp ? new Date(latestActivityTimestamp).toLocaleDateString() : 'Never';
    warnings.push({
      type: 'INACTIVE_STUDENT',
      category: 'Inactive Student',
      severity: daysSinceLastActivity >= 28 ? 'high' : 'medium',
      metric: `${daysSinceLastActivity} days`,
      daysInactive: daysSinceLastActivity,
      badgeColor: 'slate',
      reason: `No learning activity (class attendance, quiz assessments, assignment submissions, or study reading) recorded in the last ${daysSinceLastActivity} days (last active: ${lastActiveStr}).`,
      action: 'Contact student or parent to confirm enrollment status and resolve any connectivity or personal issues.'
    });
  }

  // Determine overall risk severity
  let riskLevel = 'NONE';
  if (warnings.some(w => w.severity === 'high') || warnings.length >= 2) {
    riskLevel = 'HIGH';
  } else if (warnings.length === 1) {
    riskLevel = 'MEDIUM';
  }

  return {
    student: {
      _id: student._id,
      name: student.name,
      email: student.email,
      registrationNumber: student.registrationNumber || 'N/A',
      grade: student.grade || 'Unassigned',
      studentType: student.studentType || 'physical',
      parentsPhoneNumber: student.parentsPhoneNumber || '',
      profilePicture: student.profilePicture || ''
    },
    riskLevel,
    hasWarnings: warnings.length > 0,
    warnings,
    metrics: {
      attendance: {
        total: totalAttendance,
        present: presentCount,
        absent: absentCount,
        late: lateCount,
        rate: attendanceRate
      },
      quizzes: {
        totalAttempted: totalQuizzes,
        averagePercentage: avgQuizScore,
        history: quizScoresWithPct
      },
      assignments: {
        totalAssigned: activeAssignments.length,
        totalSubmitted: assignmentSubmissions.length,
        totalMissing: missingAssignments.length,
        averageMarks: avgAssignmentMarks,
        submissions: formattedSubmissions,
        missing: missingAssignments
      },
      reading: {
        totalPdfs: totalPdfsRead,
        completedPdfs: completedPdfsCount,
        averageProgress: avgReadingProgress,
        progressList: formattedReadingProgress
      },
      activity: {
        lastActiveDate: latestActivityTimestamp ? new Date(latestActivityTimestamp) : null,
        daysSinceLastActivity
      }
    },
    attendanceLogs: attendanceLogs.slice(0, 20)
  };
};

/**
 * Summarizes warnings across multiple students for Admin or Teacher dashboards.
 */
const getEarlyWarningSummary = async ({ filterRole = 'admin', teacherId = null, parentPhone = null, linkedStudentIds = [] } = {}) => {
  let studentQuery = { role: 'student' };

  if (filterRole === 'parent') {
    const parentPhoneQuery = parentPhone && parentPhone.trim() ? [{ parentsPhoneNumber: parentPhone.trim() }] : [];
    studentQuery = {
      role: 'student',
      $or: [
        { _id: { $in: linkedStudentIds } },
        ...parentPhoneQuery
      ]
    };
  } else if (filterRole === 'teacher' && teacherId) {
    // Find teacher's courses
    const teacherCourses = await Course.find({ instructor: teacherId }).select('_id enrolledStudents').lean();
    const teacherCourseIds = teacherCourses.map(c => c._id);
    const teacherEnrollments = await Enrollment.find({ course: { $in: teacherCourseIds } }).select('student').lean();

    const studentIdSet = new Set();
    teacherCourses.forEach(c => (c.enrolledStudents || []).forEach(s => studentIdSet.add(s.toString())));
    teacherEnrollments.forEach(e => { if (e.student) studentIdSet.add(e.student.toString()); });

    studentQuery._id = { $in: Array.from(studentIdSet).map(id => new mongoose.Types.ObjectId(id)) };
  }

  const students = await User.find(studentQuery).select('_id name email registrationNumber grade studentType parentsPhoneNumber profilePicture createdAt').lean();

  const analyzedStudents = [];
  for (const s of students) {
    const analysis = await analyzeStudentPerformance(s._id);
    if (analysis) {
      analyzedStudents.push(analysis);
    }
  }

  const studentsWithWarnings = analyzedStudents.filter(s => s.hasWarnings);

  const breakdown = {
    attendanceConcern: studentsWithWarnings.filter(s => s.warnings.some(w => w.type === 'ATTENDANCE_CONCERN')).length,
    performanceDecline: studentsWithWarnings.filter(s => s.warnings.some(w => w.type === 'PERFORMANCE_DECLINE')).length,
    assignmentConcern: studentsWithWarnings.filter(s => s.warnings.some(w => w.type === 'ASSIGNMENT_CONCERN')).length,
    inactiveStudent: studentsWithWarnings.filter(s => s.warnings.some(w => w.type === 'INACTIVE_STUDENT')).length
  };

  const highRiskStudents = studentsWithWarnings.filter(s => s.riskLevel === 'HIGH');

  return {
    totalStudentsEvaluated: analyzedStudents.length,
    totalWithWarnings: studentsWithWarnings.length,
    highRiskCount: highRiskStudents.length,
    breakdown,
    studentsWithWarnings,
    allStudents: analyzedStudents
  };
};

module.exports = {
  analyzeStudentPerformance,
  getEarlyWarningSummary
};
