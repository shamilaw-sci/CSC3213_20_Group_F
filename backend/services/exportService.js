const zlib = require('zlib');
const User = require('../models/User');
const Course = require('../models/Course');
const Payment = require('../models/Payment');
const Attendance = require('../models/Attendance');
const Enrollment = require('../models/Enrollment');
const Quiz = require('../models/Quiz');
const QuizSubmission = require('../models/QuizSubmission');
const Assignment = require('../models/Assignment');
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Lesson = require('../models/Lesson');
const SystemSetting = require('../models/SystemSetting');
const AuditLog = require('../models/AuditLog');

/**
 * RFC-4180 compliant CSV generator.
 * @param {Array<Object>} rows - Data rows
 * @param {Array<{ key: string, label: string, getValue?: Function }>} columns - Column definitions
 * @returns {string} CSV formatted string
 */
function convertToCSV(rows, columns) {
  const header = columns.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
  if (!rows || rows.length === 0) {
    return header + '\r\n';
  }

  const lines = rows.map(row => {
    return columns.map(col => {
      let val = col.getValue ? col.getValue(row) : row[col.key];
      if (val === undefined || val === null) val = '';
      if (val instanceof Date) {
        val = val.toISOString().split('T')[0];
      }
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(',');
  });

  return [header, ...lines].join('\r\n');
}

/**
 * Formats ISO date safely to YYYY-MM-DD.
 */
function formatDate(date) {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

/**
 * Column definitions for Student Records export
 */
const studentColumns = [
  { key: 'registrationNumber', label: 'Registration Number' },
  { key: 'name', label: 'Full Name' },
  { key: 'role', label: 'Role' },
  { key: 'studentType', label: 'Student Type' },
  { key: 'grade', label: 'Grade' },
  { key: 'email', label: 'Email Address' },
  { key: 'dateOfBirth', label: 'Date of Birth', getValue: (u) => formatDate(u.dateOfBirth) },
  { key: 'nicNumber', label: 'NIC Number' },
  { key: 'parentsPhoneNumber', label: 'Parents Phone' },
  { key: 'phoneNumber', label: 'Student Phone' },
  { key: 'createdAt', label: 'Registration Date', getValue: (u) => formatDate(u.createdAt) },
  { key: 'isEmailVerified', label: 'Email Verified', getValue: (u) => u.isEmailVerified ? 'Yes' : 'No' },
  { key: 'isPhoneVerified', label: 'Phone Verified', getValue: (u) => u.isPhoneVerified ? 'Yes' : 'No' }
];

/**
 * Column definitions for Attendance Records export
 */
const attendanceColumns = [
  { key: 'date', label: 'Date', getValue: (a) => formatDate(a.date) },
  { key: 'studentName', label: 'Student Name', getValue: (a) => a.studentId?.name || 'N/A' },
  { key: 'registrationNumber', label: 'Registration No', getValue: (a) => a.studentId?.registrationNumber || 'N/A' },
  { key: 'grade', label: 'Grade', getValue: (a) => a.studentId?.grade || 'N/A' },
  { key: 'status', label: 'Status' },
  { key: 'courseTitle', label: 'Course', getValue: (a) => a.courseId?.title || 'General / Physical' },
  { key: 'scheduleTitle', label: 'Schedule / Class', getValue: (a) => a.scheduleId?.title || a.scheduleId?.className || 'N/A' },
  { key: 'mode', label: 'Mode' },
  { key: 'markedBy', label: 'Marked By', getValue: (a) => a.markedBy?.name || 'System / Staff' },
  { key: 'remarks', label: 'Remarks', getValue: (a) => a.remarks || '' }
];

/**
 * Column definitions for Payment Records export
 */
const paymentColumns = [
  { key: 'transactionId', label: 'Transaction ID' },
  { key: 'paymentDate', label: 'Payment Date', getValue: (p) => formatDate(p.paymentDate || p.createdAt || p.enrollmentDate) },
  { key: 'studentName', label: 'Student Name', getValue: (p) => p.student?.name || 'N/A' },
  { key: 'registrationNumber', label: 'Registration No', getValue: (p) => p.student?.registrationNumber || 'N/A' },
  { key: 'studentGrade', label: 'Student Grade', getValue: (p) => p.student?.grade || 'N/A' },
  { key: 'courseTitle', label: 'Course', getValue: (p) => p.course?.title || 'N/A' },
  { key: 'amount', label: 'Amount (LKR)' },
  { key: 'currency', label: 'Currency' },
  { key: 'paymentMethod', label: 'Payment Method' },
  { key: 'status', label: 'Status' },
  { key: 'month', label: 'Month Paid For', getValue: (p) => p.month || '' },
  { key: 'remarks', label: 'Remarks / Notes', getValue: (p) => p.remarks || p.rejectionReason || '' }
];

/**
 * Column definitions for Academic Reports export
 */
const academicColumns = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'registrationNumber', label: 'Registration No' },
  { key: 'grade', label: 'Grade' },
  { key: 'courseTitle', label: 'Course' },
  { key: 'assessmentType', label: 'Assessment Type' },
  { key: 'assessmentTitle', label: 'Assessment Title' },
  { key: 'score', label: 'Score Obtained' },
  { key: 'totalPoints', label: 'Total Points' },
  { key: 'percentage', label: 'Percentage (%)' },
  { key: 'submissionDate', label: 'Submission Date', getValue: (r) => formatDate(r.submissionDate) },
  { key: 'status', label: 'Status' }
];

/**
 * Gzips buffer or string.
 */
function compressGzip(input) {
  return new Promise((resolve, reject) => {
    zlib.gzip(input, (err, buffer) => {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
}

module.exports = {
  convertToCSV,
  formatDate,
  studentColumns,
  attendanceColumns,
  paymentColumns,
  academicColumns,
  compressGzip
};
