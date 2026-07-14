import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaUserPlus, FaTrash, FaSearch } from 'react-icons/fa';

const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

const Enrollments = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  // Table filters
  const [tableSearch, setTableSearch] = useState('');

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active enrollments
      const enrollmentsRes = await axios.get('http://localhost:5000/api/courses/enrollments/all', {
        headers: getAuthHeaders()
      });
      setEnrollments(enrollmentsRes.data);

      // 2. Fetch all students
      const usersRes = await axios.get('http://localhost:5000/api/auth/users', {
        headers: getAuthHeaders()
      });
      setStudents(usersRes.data.filter(u => u.role === 'student'));

      // 3. Fetch all courses
      const coursesRes = await axios.get('http://localhost:5000/api/courses', {
        headers: getAuthHeaders()
      });
      setCourses(coursesRes.data);
    } catch (err) {
      toast.error('Failed to load required data');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId || !selectedClass) {
      toast.error('Please fill in all enrollment fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/courses/enroll',
        {
          studentId: selectedStudentId,
          courseId: selectedCourseId,
          className: selectedClass
        },
        { headers: getAuthHeaders() }
      );

      toast.success(res.data.message || 'Student enrolled successfully.');
      setSelectedStudentId('');
      setSelectedCourseId('');
      setSelectedClass('');
      setStudentSearch('');
      setCourseSearch('');

      // Reload enrollments
      const enrollmentsRes = await axios.get('http://localhost:5000/api/courses/enrollments/all', {
        headers: getAuthHeaders()
      });
      setEnrollments(enrollmentsRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enroll student');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnenroll = (studentId, courseId, className, studentName, courseTitle) => {
    setEnrollmentToDelete({ studentId, courseId, className, studentName, courseTitle });
    setShowDeleteModal(true);
  };

  const executeUnenroll = async () => {
    if (!enrollmentToDelete) return;
    const { studentId, courseId, className } = enrollmentToDelete;

    try {
      await axios.post(
        'http://localhost:5000/api/courses/unenroll',
        { studentId, courseId, className },
        { headers: getAuthHeaders() }
      );

      toast.success('Student unenrolled successfully.');
      setEnrollments(enrollments.filter(e => !(e.studentId === studentId && e.courseId === courseId && e.className === className)));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unenroll student');
    } finally {
      setShowDeleteModal(false);
      setEnrollmentToDelete(null);
    }
  };

  // Filter student and course select dropdowns on the fly
  const filteredStudentsForSelect = students.filter(s => {
    if (!studentSearch) return true;
    const term = studentSearch.toLowerCase();
    return (
      s.name.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term) ||
      (s.registrationNumber && s.registrationNumber.toLowerCase().includes(term))
    );
  });

  const filteredCoursesForSelect = courses.filter(c => {
    if (!courseSearch) return true;
    const term = courseSearch.toLowerCase();
    return (
      c.title.toLowerCase().includes(term) ||
      (c.instructor && c.instructor.name.toLowerCase().includes(term))
    );
  });

  // Filter active enrollments table
  const filteredEnrollments = enrollments.filter(e => {
    if (!tableSearch) return true;
    const term = tableSearch.toLowerCase();
    return (
      e.studentName.toLowerCase().includes(term) ||
      e.courseTitle.toLowerCase().includes(term) ||
      e.className.toLowerCase().includes(term) ||
      (e.studentRegNo && e.studentRegNo.toLowerCase().includes(term)) ||
      (e.studentEmail && e.studentEmail.toLowerCase().includes(term))
    );
  });

  if (loading) return <div className="text-center p-10 text-gray-500 font-bold">Loading enrollments data...</div>;

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Enrollment Management</h2>
          <p className="text-gray-500 text-sm mt-1">Total Enrollments: {enrollments.length}</p>
        </div>
      </div>

      {/* Enrollment Creation Form */}
      <form onSubmit={handleEnroll} className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-100 text-[#2d1b64] flex items-center justify-center">
            <FaUserPlus />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">New Course Enrollment</h3>
            <p className="text-sm text-gray-500">Enroll a registered student in a course class.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Student Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">1. Select Student</label>
            <input
              type="text"
              placeholder="Search Student (name, email)..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 mb-2"
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm cursor-pointer"
              required
            >
              <option value="">-- Choose Student --</option>
              {filteredStudentsForSelect.map(s => (
                <option key={s._id} value={s._id}>
                  {s.name} ({s.registrationNumber || 'No Reg No'}) - {s.grade || 'No Grade'}
                </option>
              ))}
            </select>
          </div>

          {/* Course Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">2. Select Course</label>
            <input
              type="text"
              placeholder="Search Course..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 mb-2"
              value={courseSearch}
              onChange={(e) => setCourseSearch(e.target.value)}
            />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm cursor-pointer"
              required
            >
              <option value="">-- Choose Course --</option>
              {filteredCoursesForSelect.map(c => (
                <option key={c._id} value={c._id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* Class Selector */}
          <div className="flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">3. Select Class (Grade)</label>
              <div className="h-[38px] mb-2 hidden md:block"></div> {/* Spacer to align dropdowns */}
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm cursor-pointer"
                required
              >
                <option value="">-- Choose Class --</option>
                {gradeOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 bg-[#2d1b64] hover:bg-purple-900 cursor-pointer disabled:bg-purple-300 text-white font-bold px-6 py-3 rounded-lg transition"
          >
            <FaUserPlus />
            {submitting ? 'Enrolling...' : 'Enroll Student'}
          </button>
        </div>
      </form>

      {/* Search Input for Enrollments Table */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <h3 className="font-bold text-gray-800">Active Course Enrollments</h3>
        <div className="relative w-full md:w-80">
          <input
            type="text"
            placeholder="Search enrollments..."
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
          <FaSearch className="absolute left-3.5 top-3.5 text-gray-400 text-sm" />
        </div>
      </div>

      {/* Enrollments Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
              <th className="p-4 font-semibold">Student Name</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Registration No.</th>
              <th className="p-4 font-semibold">Course Title</th>
              <th className="p-4 font-semibold">Class (Grade)</th>
              <th className="p-4 font-semibold">Parents Phone</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {filteredEnrollments.length > 0 ? (
              filteredEnrollments.map((e) => (
                <tr key={`${e.studentId}-${e.courseId}-${e.className}`} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-800">{e.studentName}</td>
                  <td className="p-4 text-gray-600">{e.studentEmail}</td>
                  <td className="p-4 text-gray-600">{e.studentRegNo || '-'}</td>
                  <td className="p-4 font-medium text-purple-950">{e.courseTitle}</td>
                  <td className="p-4">
                    <span className="bg-purple-50 text-[#2d1b64] font-semibold px-3 py-1 rounded-full text-xs">
                      {e.className}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600">{e.studentPhone || '-'}</td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleUnenroll(e.studentId, e.courseId, e.className, e.studentName, e.courseTitle)}
                      className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 cursor-pointer transition-colors border-none bg-transparent"
                      title="Unenroll student"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="p-8 text-center text-gray-500">
                  No enrollments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Custom Modal */}
      {showDeleteModal && enrollmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-150 max-w-md w-full mx-4 transform transition-all scale-100 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-red-200">
                <FaTrash className="text-xl text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Unenroll Student</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to remove <strong className="text-[#2d1b64] font-semibold">{enrollmentToDelete.studentName}</strong> from <strong className="text-purple-800 font-semibold">{enrollmentToDelete.courseTitle} ({enrollmentToDelete.className})</strong>?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEnrollmentToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeUnenroll}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 cursor-pointer text-white font-semibold rounded-lg text-sm transition flex items-center gap-2 border-none"
                >
                  Yes, Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enrollments;
