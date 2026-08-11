import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { FaUserPlus, FaTrash, FaSearch, FaTimes, FaCheckCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

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

  // Pagination & Search State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const [tableSearch, setTableSearch] = useState('');

  // Popup Modal State
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // Slip Image Modal State
  const [selectedSlipImage, setSelectedSlipImage] = useState(null);

  // Form states
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');

  // Delete modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  // Reset pagination when search or tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [tableSearch, activeTab]);

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
    if (reason === null) return;

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
      setShowEnrollModal(false);

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

  // Pagination calculation (25 per page)
  const totalPages = Math.max(1, Math.ceil(filteredEnrollments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEnrollments = filteredEnrollments.slice(startIndex, startIndex + itemsPerPage);

  const selectedCourse = courses.find(c => c._id === selectedCourseId);
  const assignedGrades = selectedCourse?.enrolledGrades || [];

  if (loading) return <div className="text-center p-10 text-gray-500 font-bold">Loading enrollments data...</div>;

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 animate-fade-in font-sans">
      
      {/* Header & Trigger Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Enrollment & Bank Slip Management</h2>
          <p className="text-gray-500 text-xs mt-1">Manage course enrollments and verify student bank deposit slips.</p>
        </div>

        {/* Action Button to trigger New Enrollment Modal */}
        {activeTab === 'enrollments' && (
          <button
            onClick={() => setShowEnrollModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer border-none shrink-0"
          >
            <FaUserPlus className="text-amber-400 text-sm" />
            <span>+ New Course Enrollment</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 space-x-6">
        <button
          onClick={() => setActiveTab('enrollments')}
          className={`pb-3 font-semibold text-xs sm:text-sm transition-all border-b-2 cursor-pointer ${
            activeTab === 'enrollments'
              ? 'border-purple-700 text-purple-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🎓 Active Course Enrollments ({enrollments.length})
        </button>

        <button
          onClick={() => setActiveTab('pending_slips')}
          className={`pb-3 font-semibold text-xs sm:text-sm transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'pending_slips'
              ? 'border-purple-700 text-purple-900 font-extrabold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <span>🏦 Pending Bank Slips</span>
          {pendingSlips.length > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingSlips.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'enrollments' ? (
        <>
          {/* Search bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search enrollments by student name, email, reg no, or course title..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-purple-500 outline-none"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            <FaSearch className="absolute left-3.5 top-3.5 text-gray-400 text-xs" />
          </div>

          {/* Enrollments Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 uppercase text-[11px] tracking-wider border-b border-gray-200 font-bold">
                  <th className="p-3.5 pl-4">Student Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Reg No.</th>
                  <th className="p-3.5">Course Title</th>
                  <th className="p-3.5">Class (Grade)</th>
                  <th className="p-3.5">Parents Phone</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedEnrollments.length > 0 ? (
                  paginatedEnrollments.map((e) => (
                    <tr key={`${e.studentId}-${e.courseId}-${e.className}`} className="hover:bg-purple-50/30 transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-gray-900">{e.studentName}</td>
                      <td className="p-3.5 text-gray-600 font-medium">{e.studentEmail}</td>
                      <td className="p-3.5 font-mono text-gray-700 font-semibold">{e.studentRegNo || '-'}</td>
                      <td className="p-3.5 font-bold text-purple-950">{e.courseTitle}</td>
                      <td className="p-3.5">
                        <span className="bg-purple-50 text-[#2d1b64] font-bold px-2.5 py-1 rounded-lg text-[11px] border border-purple-100">
                          {e.className}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600 font-medium">{e.studentPhone || '-'}</td>
                      <td className="p-3.5 text-right pr-4">
                        <button
                          onClick={() => handleUnenroll(e.studentId, e.courseId, e.className, e.studentName, e.courseTitle)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors border-none bg-transparent"
                          title="Unenroll student"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="p-10 text-center text-gray-500 font-medium">
                      No enrollments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer (25 records per page) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100">
            <div className="text-xs font-semibold text-gray-500">
              Showing <span className="font-extrabold text-gray-800">{filteredEnrollments.length === 0 ? 0 : startIndex + 1}</span> to{' '}
              <span className="font-extrabold text-gray-800">{Math.min(startIndex + itemsPerPage, filteredEnrollments.length)}</span> of{' '}
              <span className="font-extrabold text-gray-800">{filteredEnrollments.length}</span> enrollments
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
              >
                <FaChevronLeft className="text-[10px]" /> Previous
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                    currentPage === pageNum
                      ? 'bg-[#2d1b64] text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || filteredEnrollments.length === 0}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
              >
                Next <FaChevronRight className="text-[10px]" />
              </button>
            </div>
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


      {/* ========================================================================= */}
      {/* POPUP MODAL: NEW COURSE ENROLLMENT (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 animate-fadeIn my-8">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white relative">
              <button
                onClick={() => setShowEnrollModal(false)}
                className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-3 bg-amber-400 text-purple-950 rounded-2xl text-xl font-black">🎓</span>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">New Course Enrollment</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    Enroll a registered student in a course class.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleEnroll} className="p-6 md:p-8 space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* 1. Select Course */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    1. Select Course <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search Course..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500 mb-2 font-medium"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                  <select
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-bold cursor-pointer"
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

                {/* 2. Select Class (Grade) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    2. Select Class <span className="text-red-500">*</span>
                  </label>
                  {selectedCourseId && assignedGrades.length === 0 ? (
                    <div className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200 mt-8">
                      No grades assigned to this course.
                    </div>
                  ) : (
                    <>
                      <div className="h-[34px] mb-2 hidden md:block"></div>
                      <select
                        value={selectedClass}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-bold cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
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

                {/* 3. Select Student */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    3. Select Student <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search Student..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500 mb-2 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    disabled={!selectedClass}
                  />
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-bold cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed"
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

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedStudentId || !selectedCourseId || !selectedClass}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Enrolling Student...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="text-amber-400" /> Enroll Student
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* Delete Confirmation Custom Modal */}
      {showDeleteModal && enrollmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white p-6 rounded-3xl shadow-2xl border border-red-100 max-w-md w-full mx-4">
            <div className="text-center font-sans">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-200">
                <FaTrash className="text-xl text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">Unenroll Student</h3>
              <p className="text-gray-600 text-xs mb-6 leading-relaxed">
                Are you sure you want to remove <strong className="text-[#2d1b64] font-bold">{enrollmentToDelete.studentName}</strong> from <strong className="text-purple-900 font-bold">{enrollmentToDelete.courseTitle} ({enrollmentToDelete.className})</strong>?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEnrollmentToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer border-none"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeUnenroll}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-2 border-none cursor-pointer"
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
