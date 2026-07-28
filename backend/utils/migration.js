const fs = require('fs');
const path = require('path');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');

const getClassNameFromGrade = (grade) => {
    if (!grade) return "Grade General";
    const gradeStr = String(grade).trim();
    if (gradeStr.toLowerCase().startsWith('grade')) {
        return gradeStr;
    }
    return `Grade ${gradeStr}`;
};

const migrateData = async () => {
    try {
        const Payment = require('../models/Payment');
        try {
            await Payment.collection.dropIndex('studentId_1_courseId_1_month_1');
            console.log("🧹 Dropped legacy payments index [studentId_1_courseId_1_month_1]");
        } catch (idxErr) {
            // Index didn't exist or already dropped
        }

        const courses = await Course.find({});
        const uploadsDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        // Fetch all students to have quick lookup for grades
        const students = await User.find({ role: 'student' });
        const studentMap = new Map();
        students.forEach(s => {
            studentMap.set(s._id.toString(), s);
        });

        for (let course of courses) {
            let updated = false;

            // --- 1. Image Migration (Base64 -> Disk File) ---
            const processBase64Image = (fieldValue, prefix) => {
                if (fieldValue && fieldValue.startsWith('data:')) {
                    const matches = fieldValue.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const mimeType = matches[1];
                        let ext = mimeType.split('/')[1] || 'jpg';
                        if (ext === 'jpeg') ext = 'jpg';
                        const base64Data = matches[2];
                        const filename = `${prefix}-${course._id}-${Date.now()}.${ext}`;
                        const filepath = path.join(uploadsDir, filename);
                        
                        fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
                        console.log(`📸 Migrated ${prefix} for course [${course.title}] to disk: ${filename}`);
                        return filename;
                    }
                }
                return null;
            };

            const newBanner = processBase64Image(course.banner, 'banner');
            if (newBanner) {
                course.banner = newBanner;
                updated = true;
            }

            const newCardImage = processBase64Image(course.cardImage, 'cardImage');
            if (newCardImage) {
                course.cardImage = newCardImage;
                updated = true;
            }

            // --- 2. Enrollment Migration & Consolidation ---
            console.log(`🔍 Checking enrollments for course: [${course.title}]`);
            
            // Set of student IDs that are enrolled in this course (from any source)
            const allEnrolledStudentIds = new Set();
            // Map student ID -> Set of class names they are in
            const studentClassesMap = new Map();

            // Source A: Add students from course.classes
            if (course.classes && course.classes.length > 0) {
                course.classes.forEach(cls => {
                    if (cls.enrolledStudents && cls.enrolledStudents.length > 0) {
                        cls.enrolledStudents.forEach(studentId => {
                            if (studentId) {
                                const idStr = studentId.toString();
                                allEnrolledStudentIds.add(idStr);
                                if (!studentClassesMap.has(idStr)) {
                                    studentClassesMap.set(idStr, new Set());
                                }
                                studentClassesMap.get(idStr).add(cls.className.trim());
                            }
                        });
                    }
                });
            }

            // Source B: Add students from course.enrolledStudents
            if (course.enrolledStudents && course.enrolledStudents.length > 0) {
                course.enrolledStudents.forEach(studentId => {
                    if (studentId) {
                        const idStr = studentId.toString();
                        allEnrolledStudentIds.add(idStr);
                    }
                });
            }

            // Resolve proper class name for each student and save/upsert Enrollment documents
            for (let studentIdStr of allEnrolledStudentIds) {
                const student = studentMap.get(studentIdStr);
                const defaultClassName = student ? getClassNameFromGrade(student.grade) : "Grade General";

                let classesForStudent = studentClassesMap.get(studentIdStr);
                if (!classesForStudent || classesForStudent.size === 0) {
                    // Student was course-level enrolled but not in any class. Put them in their grade's class.
                    classesForStudent = new Set([defaultClassName]);
                }

                // Write enrollment records to new collection
                for (let className of classesForStudent) {
                    try {
                        await Enrollment.findOneAndUpdate(
                            { student: studentIdStr, course: course._id, className: className },
                            { student: studentIdStr, course: course._id, className: className },
                            { upsert: true, new: true }
                        );
                    } catch (e) {
                        console.error(`Failed to upsert enrollment record:`, e.message);
                    }
                }
            }

            // Re-sync Course embedded arrays from the source of truth (Enrollment collection)
            const activeEnrollments = await Enrollment.find({ course: course._id });
            
            // Build the clean arrays
            const newEnrolledStudents = [...new Set(activeEnrollments.map(e => e.student.toString()))];
            
            // Rebuild class arrays
            const classMap = new Map(); // className -> Set of student IDs
            activeEnrollments.forEach(e => {
                if (!classMap.has(e.className)) {
                    classMap.set(e.className, new Set());
                }
                classMap.get(e.className).add(e.student.toString());
            });

            const newClasses = [];
            classMap.forEach((studentsSet, className) => {
                newClasses.push({
                    className,
                    enrolledStudents: [...studentsSet]
                });
            });

            // Detect if changes were made to enrollment structure
            const currentEnrolledStr = course.enrolledStudents.map(id => id.toString()).sort().join(',');
            const newEnrolledStr = newEnrolledStudents.sort().join(',');
            
            // Basic structural check
            if (currentEnrolledStr !== newEnrolledStr || course.classes.length !== newClasses.length) {
                course.enrolledStudents = newEnrolledStudents;
                course.classes = newClasses;
                updated = true;
                console.log(`✅ Synced embedded arrays for course: [${course.title}]`);
            }

            if (updated) {
                await course.save();
                console.log(`💾 Course [${course.title}] updated and saved.`);
            }
        }

        console.log("--------------------------------------------------");
        console.log("🎉 LuminaLearn Migration completed successfully!");
        console.log("--------------------------------------------------");
    } catch (err) {
        console.error("❌ Migration error occurred:", err);
    }
};

module.exports = { migrateData, getClassNameFromGrade };
