const User = require('../models/User');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');

/**
 * Returns all active student users enrolled in a specific class (grade) of a specific course.
 * Matches across Enrollment collection, Course.classes, and Course.enrolledStudents.
 *
 * @param {string|ObjectId} courseId - The Course ID
 * @param {string} gradeVal - The Class / Grade name (e.g. "Grade 10", "10", "Grade 10 - Sinhala")
 * @returns {Promise<Array>} List of User documents for enrolled students
 */
async function getClassEnrolledStudents(courseId, gradeVal) {
  try {
    if (!courseId || !gradeVal) return [];

    const course = await Course.findById(courseId);
    if (!course) return [];

    const rawGrade = String(gradeVal).trim();
    const gradeNumberOnly = rawGrade.replace(/\D/g, ''); // Extract e.g. "10" from "Grade 10"

    // Construct regex matching e.g. "10", "Grade 10", "grade 10"
    const gradePattern = gradeNumberOnly 
      ? `(^|\\b|Grade\\s*)${gradeNumberOnly}(\\b|$)`
      : `^${rawGrade}$`;
    const gradeRegex = new RegExp(gradePattern, 'i');

    const enrolledStudentIdSet = new Set();

    // 1. Check dedicated Enrollment collection matching course and className
    const enrollments = await Enrollment.find({
      course: courseId,
      className: { $regex: gradeRegex }
    }).select('student');

    for (const e of enrollments) {
      if (e.student) enrolledStudentIdSet.add(e.student.toString());
    }

    // 2. Check course.classes array matching className
    if (Array.isArray(course.classes)) {
      for (const cls of course.classes) {
        if (cls.className && (gradeRegex.test(cls.className) || cls.className.trim() === rawGrade)) {
          if (Array.isArray(cls.enrolledStudents)) {
            for (const stId of cls.enrolledStudents) {
              if (stId) enrolledStudentIdSet.add(stId.toString());
            }
          }
        }
      }
    }

    // 3. Check course.enrolledStudents where User's grade matches the target class grade
    if (Array.isArray(course.enrolledStudents) && course.enrolledStudents.length > 0) {
      const matchingStudents = await User.find({
        _id: { $in: course.enrolledStudents },
        role: 'student',
        grade: { $regex: gradeRegex }
      }).select('_id');

      for (const st of matchingStudents) {
        if (st._id) enrolledStudentIdSet.add(st._id.toString());
      }
    }

    const uniqueStudentIds = Array.from(enrolledStudentIdSet);
    if (uniqueStudentIds.length === 0) return [];

    // Fetch and return clean student documents
    return await User.find({
      _id: { $in: uniqueStudentIds },
      role: 'student'
    }).select('_id name email parentsPhoneNumber grade');

  } catch (err) {
    console.error('Error in getClassEnrolledStudents helper:', err);
    return [];
  }
}

module.exports = {
  getClassEnrolledStudents
};