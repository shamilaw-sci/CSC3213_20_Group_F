import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FaUserPlus, FaTrash, FaSearch } from 'react-icons/fa';

const normalizeGradeStr = (g) => {
  if (!g) return '';
  return g.toLowerCase().replace(/\s+/g, '').replace('grade', '');
};

const isMatchingGrade = (studentGrade, classGrade) => {
  return normalizeGradeStr(studentGrade) === normalizeGradeStr(classGrade);
};

const Enrollments = () => {
  const [activeTab, setActiveTab] = useState('enrollments'); // 'enrollments' | 'pending_slips'
  const [enrollments, setEnrollments] = useState([]);
  const [pendingSlips, setPendingSlips] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Slip Image Modal State
  const [selectedSlipImage, setSelectedSlipImage] = useState(null);

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
      const [enrollmentsRes, pendingSlipsRes, usersRes, coursesRes] = await Promise.allSettled([
        api.get('/courses/enrollments/all'),
        api.get('/payments/pending-slips'),
        api.get('/auth/users?role=student'),
        api.get('/courses')
      ]);

      if (enrollmentsRes.status === 'fulfilled') setEnrollments(enrollmentsRes.value.data);
      if (pendingSlipsRes.status === 'fulfilled') setPendingSlips(pendingSlipsRes.value.data);
      if (usersRes.status === 'fulfilled') setStudents(usersRes.value.data);
      if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data);

      if (enrollmentsRes.status === 'rejected' && usersRes.status === 'rejected' && coursesRes.status === 'rejected') {
        toast.error('Failed to load required data');
      }
    } catch (err) {
      toast.error('Failed to load required data');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveSlip = async (slipId) => {
    setActionLoadingId(slipId);
    try {
      const res = await api.put(`/payments/${slipId}/approve-slip`);
      toast.success(res.data.message || 'Bank slip approved and student enrolled!');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve bank slip');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRejectSlip = async (slipId) => {
    const reason = window.prompt('Enter rejection reason for student (e.g. Unclear slip photo, incorrect amount):');
    if (reason === null) return; // User cancelled

    setActionLoadingId(slipId);
    try {
      const res = await api.put(`/payments/${slipId}/reject-slip`, { rejectionReason: reason });
      toast.success(res.data.message || 'Bank slip rejected.');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject bank slip');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCourseChange = (courseId) => {
    setSelectedCourseId(courseId);
    setSelectedClass('');
    setSelectedStudentId('');
    setStudentSearch('');
  };

  const handleGradeChange = (className) => {
    setSelectedClass(className);
    setSelectedStudentId('');
    setStudentSearch('');
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedCourseId || !selectedClass) {
      toast.error('Please fill in all enrollment fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(
        '/courses/enroll',
        {
          studentId: selectedStudentId,
          courseId: selectedCourseId,
          className: selectedClass
        }
      );

      toast.success(res.data.message || 'Student enrolled successfully.');
      setSelectedStudentId('');
      setSelectedCourseId('');
      setSelectedClass('');
      setStudentSearch('');
      setCourseSearch('');

      // Reload all data
      await fetchData();
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
      await api.post(
        '/courses/unenroll',
        { studentId, courseId, className }
      );

      toast.success('Student unenrolled successfully.');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to unenroll student');
    } finally {
      setShowDeleteModal(false);
      setEnrollmentToDelete(null);
    }
  };

  // Get students who:
  // 1. Are in the selected grade/class
  // 2. Are not already enrolled in the selected course
  // 3. Match the search query
  const filteredStudentsForSelect = students.filter(s => {
    if (!selectedClass) return false;
    if (!isMatchingGrade(s.grade, selectedClass)) return false;

    const isAlreadyEnrolled = enrollments.some(e => e.studentId === s._id && e.courseId === selectedCourseId);
    if (isAlreadyEnrolled) return false;

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

  const selectedCourse = courses.find(c => c._id === selectedCourseId);
  const assignedGrades = selectedCourse?.enrolledGrades || [];

  if (loading) return <div className="text-center p-10 text-gray-500 font-bold">Loading enrollments data...</div>;

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 animate-fade-in font-sans">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Enrollment & Bank Slip Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage course enrollments and verify student bank deposit slips.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-6">
        <button
          onClick={() => setActiveTab('enrollments')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'enrollments'
              ? 'border-purple-700 text-purple-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🎓 Active Course Enrollments ({enrollments.length})
        </button>

        <button
          onClick={() => setActiveTab('pending_slips')}
          className={`pb-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'pending_slips'
              ? 'border-purple-700 text-purple-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>🏦 Pending Bank Slips</span>
          {pendingSlips.length > 0 && (
            <span className="bg-amber-500 text-white text-xs font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingSlips.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'enrollments' ? (
        <>
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
              {/* 1. Course Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">1. Select Course</label>
                <input
                  type="text"
                  placeholder="Search Course..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 mb-2"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                />
                <select
                  value={selectedCourseId}
                  onChange={(e) => handleCourseChange(e.target.value)}
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

              {/* 2. Class Selector */}
              <div className="flex flex-col justify-between">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">2. Select Class (Grade)</label>
                  {selectedCourseId && assignedGrades.length === 0 ? (
                    <div className="text-sm font-semibold text-red-500 mt-2 bg-red-50 p-3 rounded-lg border border-red-200">
                      No grades assigned to this course.
                    </div>
                  ) : (
                    <>
                      <div className="h-[38px] mb-2 hidden md:block"></div>
                      <select
                        value={selectedClass}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                        disabled={!selectedCourseId}
                        required
                      >
                        {!selectedCourseId ? (
                          <option value="">-- Choose Course First --</option>
                        ) : (
                          <>
                            <option value="">-- Choose Class --</option>
                            {assignedGrades.map(g => (
                              <option key={g.gradeNumber} value={g.gradeNumber}>
                                {g.title || g.gradeNumber}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                    </>
                  )}
                </div>
              </div>

              {/* 3. Student Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">3. Select Student</label>
                <input
                  type="text"
                  placeholder="Search Name, Email or Reg No..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-purple-500 mb-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  disabled={!selectedClass}
                />
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
                  disabled={!selectedClass}
                  required
                >
                  {!selectedClass ? (
                    <option value="">-- Choose Class First --</option>
                  ) : filteredStudentsForSelect.length === 0 ? (
                    <option value="">-- No matching students in Grade {selectedClass} --</option>
                  ) : (
                    <>
                      <option value="">-- Choose Student ({filteredStudentsForSelect.length} available) --</option>
                      {filteredStudentsForSelect.map(s => (
                        <option key={s._id} value={s._id}>
                          {s.name} ({s.registrationNumber || s.email})
                        </option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={submitting || !selectedStudentId || !selectedCourseId || !selectedClass}
                className="bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-bold px-6 py-3 rounded-lg transition cursor-pointer flex items-center gap-2 border-none text-sm"
              >
                <FaUserPlus />
                {submitting ? 'Enrolling...' : 'Enroll Student'}
              </button>
            </div>
          </form>

          {/* Search bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search enrollments by student name, email, reg no, or course title..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            <FaSearch className="absolute left-3.5 top-3.5 text-gray-400 text-sm" />
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
                  <th className="p-4 font-semibold">Student Name</th>
                  <th className="p-4 font-semibold">Email</th>
                  <th className="p-4 font-semibold">Reg No.</th>
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
        </>
      ) : (
        /* PENDING BANK SLIPS VIEW */
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between text-amber-900">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <span>🏦</span> Pending Bank Deposit Slips Verification
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">Review uploaded payment receipt slips and approve to unlock course access for students.</p>
            </div>
            <span className="bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs">
              {pendingSlips.length} Pending
            </span>
          </div>

          {pendingSlips.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {pendingSlips.map((slip) => (
                <div key={slip._id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4 hover:border-purple-300 transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-base">{slip.student?.name || 'Unknown Student'}</h4>
                      <p className="text-xs text-gray-500">{slip.student?.email} • Grade {slip.student?.grade || 'N/A'}</p>
                      <span className="inline-block mt-1 px-2.5 py-0.5 bg-purple-100 text-purple-900 font-mono font-bold text-[11px] rounded-md">
                        {slip.student?.registrationNumber || 'No Reg No'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-extrabold text-purple-950 block">LKR {slip.amount?.toLocaleString()}</span>
                      <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Pending Approval
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-xl text-xs space-y-1 text-gray-700">
                    <p><strong>Course Requested:</strong> <span className="text-purple-900 font-bold">{slip.course?.title}</span></p>
                    <p><strong>Depositor Name:</strong> {slip.depositorName || slip.student?.name}</p>
                    <p><strong>Deposit Date:</strong> {slip.depositDate ? new Date(slip.depositDate).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Reference / Tx ID:</strong> <span className="font-mono text-gray-900 font-bold">{slip.transactionId}</span></p>
                  </div>

                  {/* Bank Slip Image Preview Thumbnail */}
                  {slip.slipImage ? (
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-gray-500 block mb-1">Uploaded Bank Slip Image</span>
                      <div 
                        onClick={() => setSelectedSlipImage(slip.slipImage)}
                        className="relative rounded-xl border border-gray-200 overflow-hidden cursor-pointer group max-h-48 bg-gray-100 flex items-center justify-center"
                      >
                        <img src={slip.slipImage} alt="Bank Slip" className="object-contain max-h-48 w-full group-hover:scale-105 transition duration-300" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold text-xs">
                          🔍 Click to View Full Image
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl text-center">
                      No slip image attached
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => handleRejectSlip(slip._id)}
                      disabled={actionLoadingId === slip._id}
                      className="flex-1 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition border-none cursor-pointer"
                    >
                      ✕ Reject Slip
                    </button>
                    <button
                      onClick={() => handleApproveSlip(slip._id)}
                      disabled={actionLoadingId === slip._id}
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition border-none cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      {actionLoadingId === slip._id ? 'Processing...' : '✓ Approve & Enroll'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-gray-50 rounded-2xl border border-gray-200">
              <span className="text-4xl block mb-2">🎉</span>
              <h4 className="font-extrabold text-gray-800 text-base">No Pending Bank Slips</h4>
              <p className="text-xs text-gray-500 mt-1">All student bank transfer deposit slips have been verified and processed.</p>
            </div>
          )}
        </div>
      )}

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

      {/* Full Screen Bank Slip Image Viewer Modal */}
      {selectedSlipImage && (
        <div 
          onClick={() => setSelectedSlipImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl w-full bg-white p-2 rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 bg-gray-900 text-white rounded-t-xl">
              <span className="font-extrabold text-xs">🏦 Uploaded Bank Deposit Receipt Slip</span>
              <button 
                onClick={() => setSelectedSlipImage(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto flex items-center justify-center bg-gray-100">
              <img src={selectedSlipImage} alt="Full Bank Slip" className="max-h-[70vh] object-contain rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Enrollments;
