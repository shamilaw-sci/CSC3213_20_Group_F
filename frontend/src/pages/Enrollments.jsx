/**
 * @file Enrollments.jsx
 * @description Enrollments Management Page. Interface for managing student course enrollments, viewing physical/online admission status, and toggling active access.
 */

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FaUserPlus, FaTrash, FaSearch, FaTimes, FaCheckCircle, 
  FaChevronLeft, FaChevronRight, FaChevronDown, FaChevronUp, 
  FaEye, FaDownload, FaFilePdf, FaImage 
} from 'react-icons/fa';
import PdfReaderModal from '../components/PdfReaderModal';
import { fetchBlobUrl, downloadProtectedFile } from '../utils/fileApi';

const isPdfFile = (fileStr) => {
  if (!fileStr) return false;
  const lower = fileStr.toLowerCase();
  return (
    lower.startsWith('data:application/pdf') ||
    lower.endsWith('.pdf') ||
    lower.includes('.pdf?') ||
    lower.includes('application/pdf')
  );
};

const normalizeGradeStr = (g) => {
  if (!g) return '';
  return g.toLowerCase().replace(/\s+/g, '').replace('grade', '');
};

const isMatchingGrade = (studentGrade, classGrade) => {
  return normalizeGradeStr(studentGrade) === normalizeGradeStr(classGrade);
};

const Enrollments = () => {
  const [activeTab, setActiveTab] = useState('enrollments'); // 'enrollments' | 'approve_slips' | 'approved_slips' | 'declined_slips'
  const [enrollments, setEnrollments] = useState([]);
  const [bankSlips, setBankSlips] = useState([]);
  const [bankSlipStatusFilter, setBankSlipStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING_APPROVAL' | 'COMPLETED' | 'REJECTED'
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

  // Slip Image / PDF Modal State
  const [selectedSlipImage, setSelectedSlipImage] = useState(null);
  const [activePdfSlip, setActivePdfSlip] = useState(null);

  // Expandable Bank Slip List Items State
  const [expandedSlipIds, setExpandedSlipIds] = useState({});

  const toggleExpandSlip = (slipId) => {
    setExpandedSlipIds(prev => ({
      ...prev,
      [slipId]: !prev[slipId]
    }));
  };

  const handleViewSlip = async (slip) => {
    if (!slip || !slip.slipImage) {
      toast.error('No bank slip uploaded.');
      return;
    }
    const isPdf = isPdfFile(slip.slipImage);
    const slipEndpoint = `/files/payment/${slip._id}/slip`;

    if (isPdf) {
      setActivePdfSlip({
        fileUrl: slipEndpoint,
        title: `Bank Deposit Slip - ${slip.student?.name || 'Student'} (${slip.course?.title || 'Course'})`
      });
    } else {
      if (slip.slipImage.startsWith('data:')) {
        setSelectedSlipImage(slip.slipImage);
      } else {
        try {
          const { blobUrl } = await fetchBlobUrl(slipEndpoint);
          setSelectedSlipImage(blobUrl);
        } catch (err) {
          toast.error('Failed to load bank slip image.');
        }
      }
    }
  };

  const handleDownloadSlip = async (slip) => {
    if (!slip || !slip.slipImage) {
      toast.error('No bank slip available to download.');
      return;
    }
    const isPdf = isPdfFile(slip.slipImage);
    const ext = isPdf ? 'pdf' : 'jpg';
    const cleanName = (slip.student?.name || 'student').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Bank_Slip_${cleanName}_${slip.transactionId || 'slip'}.${ext}`;

    if (slip.slipImage.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = slip.slipImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Bank slip download started!');
    } else {
      try {
        await downloadProtectedFile(`/files/payment/${slip._id}/slip?download=true`, fileName);
        toast.success('Bank slip download started!');
      } catch (err) {
        toast.error('Failed to download bank slip.');
      }
    }
  };

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
  }, [tableSearch, activeTab, bankSlipStatusFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [enrollmentsRes, bankSlipsRes, usersRes, coursesRes] = await Promise.allSettled([
        api.get('/courses/enrollments/all'),
        api.get('/payments/bank-slips?status=ALL'),
        api.get('/auth/users?role=student'),
        api.get('/courses')
      ]);

      if (enrollmentsRes.status === 'fulfilled') setEnrollments(enrollmentsRes.value.data);
      if (bankSlipsRes.status === 'fulfilled') setBankSlips(bankSlipsRes.value.data);
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

  // Reject Slip Custom Modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [slipToReject, setSlipToReject] = useState(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [rejecting, setRejecting] = useState(false);

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

  const handleOpenRejectModal = (slip) => {
    setSlipToReject(slip);
    setRejectionReasonInput('');
    setShowRejectModal(true);
  };

  const executeRejectSlip = async (e) => {
    if (e) e.preventDefault();
    if (!slipToReject) return;
    if (!rejectionReasonInput.trim()) {
      toast.error('Please enter or select a rejection reason.');
      return;
    }

    setRejecting(true);
    setActionLoadingId(slipToReject._id);
    try {
      const res = await api.put(`/payments/${slipToReject._id}/reject-slip`, {
        rejectionReason: rejectionReasonInput.trim()
      });
      toast.success(res.data.message || 'Bank slip rejected.');
      setShowRejectModal(false);
      setSlipToReject(null);
      setRejectionReasonInput('');
      await fetchData();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject bank slip');
    } finally {
      setRejecting(false);
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

  const pendingSlipsCount = bankSlips.filter(s => s.status === 'PENDING_APPROVAL').length;
  const approvedSlipsCount = bankSlips.filter(s => s.status === 'COMPLETED').length;
  const rejectedSlipsCount = bankSlips.filter(s => s.status === 'REJECTED').length;

  const pendingSlips = bankSlips.filter(s => s.status === 'PENDING_APPROVAL');
  const approvedSlips = bankSlips.filter(s => s.status === 'COMPLETED');
  const declinedSlips = bankSlips.filter(s => s.status === 'REJECTED');

  const filterSlips = (list) => {
    if (!tableSearch) return list;
    const term = tableSearch.toLowerCase();
    return list.filter(s => 
      (s.student?.name && s.student.name.toLowerCase().includes(term)) ||
      (s.student?.email && s.student.email.toLowerCase().includes(term)) ||
      (s.student?.registrationNumber && s.student.registrationNumber.toLowerCase().includes(term)) ||
      (s.course?.title && s.course.title.toLowerCase().includes(term)) ||
      (s.transactionId && s.transactionId.toLowerCase().includes(term)) ||
      (s.depositorName && s.depositorName.toLowerCase().includes(term))
    );
  };

  const selectedCourse = courses.find(c => c._id === selectedCourseId);
  const assignedGrades = selectedCourse?.enrolledGrades || [];

  const renderBankSlipsSection = (type) => {
    let rawList = [];
    let title = '';
    let subtitle = '';
    let emptyMsg = '';
    let emptyIcon = '📋';

    if (type === 'pending') {
      rawList = pendingSlips;
      title = '⏳ Bank Slips Awaiting Approval';
      subtitle = 'Review incoming student deposit slips and grant immediate course access or decline with feedback.';
      emptyMsg = 'All caught up! No bank deposit slips are currently awaiting review.';
      emptyIcon = '🎉';
    } else if (type === 'approved') {
      rawList = approvedSlips;
      title = '✅ Approved Bank Deposit Slips';
      subtitle = 'Permanent audit ledger of all bank slips verified and granted active course enrollments.';
      emptyMsg = 'No approved bank deposit slips found in the archive.';
      emptyIcon = '📜';
    } else {
      rawList = declinedSlips;
      title = '❌ Declined Bank Deposit Slips';
      subtitle = 'Archive of rejected bank deposit submissions along with specified decline reasons.';
      emptyMsg = 'No declined bank deposit slips in this archive.';
      emptyIcon = '🛡️';
    }

    const currentSlips = filterSlips(rawList);

    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Banner & Search */}
        <div className="bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
              {title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>
          </div>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              placeholder="Search by student, reg no, course, or ref ID..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            <FaSearch className="absolute left-3 top-2.5 text-gray-400 text-xs" />
          </div>
        </div>

        {currentSlips.length > 0 ? (
          <div className="space-y-3">
            {currentSlips.map((slip) => {
              const isExpanded = !!expandedSlipIds[slip._id];
              const isPdf = isPdfFile(slip.slipImage);

              return (
                <div 
                  key={slip._id} 
                  className={`bg-white dark:bg-slate-800/90 border rounded-2xl transition shadow-xs overflow-hidden ${
                    isExpanded ? 'border-purple-300 dark:border-purple-500 ring-2 ring-purple-500/10' : 'border-gray-200 dark:border-slate-700 hover:border-purple-200 dark:hover:border-purple-600'
                  }`}
                >
                  {/* Summary Row */}
                  <div 
                    onClick={() => toggleExpandSlip(slip._id)}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none bg-gray-50/50 dark:bg-slate-800/50 hover:bg-purple-50/20 dark:hover:bg-slate-700/50 transition"
                  >
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandSlip(slip._id);
                        }}
                        className="p-2 text-gray-400 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-400 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl transition cursor-pointer text-xs shrink-0"
                        title={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base truncate">
                            {slip.student?.name || 'Unknown Student'}
                          </h4>
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-mono font-bold text-[10px] rounded-md border border-purple-200 dark:border-purple-800">
                            {slip.student?.registrationNumber || 'No Reg No'}
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>{slip.student?.email}</span>
                          <span>•</span>
                          <span>Course: <strong className="text-purple-900 dark:text-purple-300 font-bold">{slip.course?.title || 'N/A'}</strong></span>
                          <span>•</span>
                          <span>Date: {slip.depositDate ? new Date(slip.depositDate).toLocaleDateString() : 'N/A'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-slate-700">
                      <div className="text-right">
                        <span className="text-base sm:text-lg font-extrabold text-purple-950 dark:text-purple-300 block">LKR {slip.amount?.toLocaleString()}</span>
                        {slip.status === 'PENDING_APPROVAL' && (
                          <span className="text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-amber-200 dark:border-amber-800">
                            Pending Approval
                          </span>
                        )}
                        {slip.status === 'COMPLETED' && (
                          <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center justify-end gap-1 border border-emerald-200 dark:border-emerald-800">
                            <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 text-[10px]" /> Approved
                          </span>
                        )}
                        {slip.status === 'REJECTED' && (
                          <span className="text-[10px] font-extrabold bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-red-200 dark:border-red-800">
                            Declined
                          </span>
                        )}
                      </div>

                      {type === 'pending' && (
                        <div className="hidden lg:flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenRejectModal(slip);
                            }}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300 text-xs font-bold rounded-xl transition border border-red-200 dark:border-red-800 cursor-pointer"
                          >
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveSlip(slip._id);
                            }}
                            disabled={actionLoadingId === slip._id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition border-none cursor-pointer"
                          >
                            {actionLoadingId === slip._id ? 'Approving...' : 'Approve & Enroll'}
                          </button>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandSlip(slip._id);
                        }}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition cursor-pointer border-none flex items-center gap-1.5"
                      >
                        <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
                        {isExpanded ? <FaChevronUp className="text-[10px]" /> : <FaChevronDown className="text-[10px]" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detailed Section */}
                  {isExpanded && (
                    <div className="p-5 border-t border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 animate-fadeIn">
                      
                      {/* Meta Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl text-xs text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-slate-700">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-400 block mb-0.5">Depositor Name</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{slip.depositorName || slip.student?.name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-400 block mb-0.5">Deposit Date</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{slip.depositDate ? new Date(slip.depositDate).toLocaleDateString() : '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-400 block mb-0.5">Reference / Tx ID</span>
                          <span className="font-mono font-bold text-purple-950 dark:text-purple-300">{slip.transactionId || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-gray-400 block mb-0.5">Student Contact</span>
                          <span className="font-semibold text-gray-900 dark:text-white">{slip.student?.parentsPhoneNumber || slip.student?.phone || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Bank Slip Attachment & View/Download options */}
                      <div className="bg-purple-50/50 dark:bg-purple-950/40 p-4 rounded-xl border border-purple-100 dark:border-purple-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${isPdf ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-300' : 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'}`}>
                            {isPdf ? <FaFilePdf /> : <FaImage />}
                          </div>
                          <div>
                            <h5 className="font-extrabold text-xs text-gray-900 dark:text-white">
                              Uploaded Bank Slip Attachment ({isPdf ? 'PDF Document' : 'Image File'})
                            </h5>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {slip.slipImage ? (isPdf ? 'PDF document ready to view/download' : 'Image file ready to preview/download') : 'No attachment file uploaded'}
                            </p>
                          </div>
                        </div>

                        {slip.slipImage ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleViewSlip(slip)}
                              className="px-3.5 py-2 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-slate-700 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                            >
                              <FaEye className="text-purple-600 dark:text-purple-400" />
                              <span>View Slip</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadSlip(slip)}
                              className="px-3.5 py-2 bg-[#2d1b64] hover:bg-indigo-950 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs border-none"
                            >
                              <FaDownload className="text-amber-400 text-xs" />
                              <span>Download Slip</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-semibold text-red-500">No slip file available</span>
                        )}
                      </div>

                      {/* Image Preview / Attachment Card inside expanded view if it's an image */}
                      {slip.slipImage && !isPdf && (
                        <div className="mt-2">
                          <span className="text-[10px] font-extrabold uppercase text-gray-400 dark:text-gray-400 block mb-1.5">Slip Image Attachment</span>
                          <div 
                            onClick={() => handleViewSlip(slip)}
                            className="p-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex items-center justify-between cursor-pointer hover:bg-purple-50 dark:hover:bg-slate-700/60 transition group max-w-md"
                          >
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200 truncate pr-2">
                              <FaImage className="text-purple-600 dark:text-purple-400 text-sm shrink-0" />
                              <span className="truncate">{slip.slipImage.startsWith('data:') ? 'Embedded Slip Image' : slip.slipImage}</span>
                            </div>
                            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 shrink-0 flex items-center gap-1 group-hover:underline">
                              <FaEye /> View Slip
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons or Processed Status Footer */}
                      {slip.status === 'PENDING_APPROVAL' ? (
                        <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                          <button
                            onClick={() => handleOpenRejectModal(slip)}
                            disabled={actionLoadingId === slip._id}
                            className="flex-1 py-2.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 font-bold text-xs rounded-xl transition border border-red-200 dark:border-red-800 cursor-pointer"
                          >
                            ✕ Reject / Decline Slip
                          </button>
                          <button
                            onClick={() => handleApproveSlip(slip._id)}
                            disabled={actionLoadingId === slip._id}
                            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition border-none cursor-pointer flex items-center justify-center gap-1.5"
                          >
                            {actionLoadingId === slip._id ? 'Processing...' : '✓ Approve & Enroll'}
                          </button>
                        </div>
                      ) : slip.status === 'COMPLETED' ? (
                        <div className="pt-3 border-t border-gray-100 dark:border-slate-800">
                          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-xl text-center flex items-center justify-center gap-2">
                            <FaCheckCircle className="text-emerald-600 dark:text-emerald-400 text-base" /> 
                            <span>Slip Approved & Student Access Granted {slip.paymentDate ? `on ${new Date(slip.paymentDate).toLocaleString()}` : ''}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="pt-3 border-t border-gray-100 dark:border-slate-800 space-y-3">
                          <div className="p-3.5 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs rounded-xl space-y-1">
                            <p className="font-extrabold text-red-900 dark:text-red-200 flex items-center gap-1.5">
                              <span>✕</span> Bank Slip Declined
                            </p>
                            <p className="text-[11px] text-red-700 dark:text-red-300">
                              <strong>Reason:</strong> {slip.rejectionReason || 'Deposit slip details could not be verified.'}
                            </p>
                          </div>
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleApproveSlip(slip._id)}
                              disabled={actionLoadingId === slip._id}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition border-none cursor-pointer flex items-center gap-1.5"
                            >
                              {actionLoadingId === slip._id ? 'Processing...' : '✓ Re-approve & Grant Access'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-800">
            <span className="text-4xl block mb-2">{emptyIcon}</span>
            <h4 className="font-extrabold text-gray-800 dark:text-white text-base">{emptyMsg}</h4>
            {tableSearch && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                No slips matched search query "{tableSearch}". Clear search to view all.
              </p>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 text-gray-500 dark:text-gray-400 font-bold gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 dark:border-purple-400"></div>
        <span className="text-xs animate-pulse">Loading enrollments data...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 animate-fade-in font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* Hero Banner Header matching Analytics & Payments */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 sm:p-8 rounded-[28px] text-white shadow-xl mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-3xl shrink-0 shadow-inner">
            🎓
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Course Enrollments & Bank Slips
            </h2>
            <p className="text-indigo-200 text-xs sm:text-sm mt-1 max-w-xl">
              Verify student bank deposit slips, grant LMS course access, and manage active student enrollments.
            </p>
          </div>
        </div>

        {/* Action Button to trigger New Enrollment Modal */}
        {activeTab === 'enrollments' && (
          <button
            onClick={() => setShowEnrollModal(true)}
            className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-extrabold text-xs rounded-2xl shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-none shrink-0"
          >
            <FaUserPlus className="text-sm" />
            <span>+ New Course Enrollment</span>
          </button>
        )}
      </div>

      {/* 4 Dedicated Tabs: 2x2 Mobile Grid & Desktop Flex matching Attendance UI */}
      <div className="grid grid-cols-2 lg:flex gap-2.5 sm:gap-3 mb-6">
        <button
          onClick={() => { setActiveTab('enrollments'); setCurrentPage(1); }}
          className={`p-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
            activeTab === 'enrollments'
              ? 'bg-[#2d1b64] dark:bg-purple-700 text-white shadow-md border-transparent'
              : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-purple-50 dark:hover:bg-slate-700'
          }`}
        >
          <span>🎓 Active Enrollments</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'enrollments' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
          }`}>
            {enrollments.length}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('approve_slips'); setCurrentPage(1); }}
          className={`p-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
            activeTab === 'approve_slips'
              ? 'bg-amber-500 text-purple-950 shadow-md border-transparent font-black'
              : 'bg-gray-50 dark:bg-slate-800 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-slate-700'
          }`}
        >
          <span>⏳ Approve Slips</span>
          {pendingSlipsCount > 0 && (
            <span className="bg-amber-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">
              {pendingSlipsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => { setActiveTab('approved_slips'); setCurrentPage(1); }}
          className={`p-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
            activeTab === 'approved_slips'
              ? 'bg-emerald-600 text-white shadow-md border-transparent'
              : 'bg-gray-50 dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-50 dark:hover:bg-slate-700'
          }`}
        >
          <span>✅ Approved Slips</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'approved_slips' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
          }`}>
            {approvedSlipsCount}
          </span>
        </button>

        <button
          onClick={() => { setActiveTab('declined_slips'); setCurrentPage(1); }}
          className={`p-3 rounded-2xl font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer border ${
            activeTab === 'declined_slips'
              ? 'bg-red-600 text-white shadow-md border-transparent'
              : 'bg-gray-50 dark:bg-slate-800 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-slate-700'
          }`}
        >
          <span>❌ Declined Slips</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
            activeTab === 'declined_slips' ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
          }`}>
            {rejectedSlipsCount}
          </span>
        </button>
      </div>

      {activeTab === 'enrollments' && (
        <>
          {/* Search bar */}
          <div className="mb-4 relative">
            <input
              type="text"
              placeholder="Search enrollments by student name, email, reg no, or course title..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
            <FaSearch className="absolute left-3.5 top-3.5 text-gray-400 text-xs" />
          </div>

          {/* Desktop Enrollments Table (hidden on mobile < md) */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300 uppercase text-[11px] tracking-wider border-b border-gray-200 dark:border-slate-700 font-bold">
                  <th className="p-3.5 pl-4">Student Name</th>
                  <th className="p-3.5">Email</th>
                  <th className="p-3.5">Reg No.</th>
                  <th className="p-3.5">Course Title</th>
                  <th className="p-3.5">Class (Grade)</th>
                  <th className="p-3.5">Parents Phone</th>
                  <th className="p-3.5">Enrolled Date</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {paginatedEnrollments.length > 0 ? (
                  paginatedEnrollments.map((e) => (
                    <tr key={`${e.studentId}-${e.courseId}-${e.className}`} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/60 transition-colors">
                      <td className="p-3.5 pl-4 font-bold text-gray-900 dark:text-white">{e.studentName}</td>
                      <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">{e.studentEmail}</td>
                      <td className="p-3.5 font-mono text-gray-700 dark:text-gray-300 font-semibold">{e.studentRegNo || '-'}</td>
                      <td className="p-3.5 font-bold text-purple-950 dark:text-purple-300">{e.courseTitle}</td>
                      <td className="p-3.5">
                        <span className="bg-purple-50 dark:bg-purple-950/60 text-[#2d1b64] dark:text-purple-300 font-bold px-2.5 py-1 rounded-lg text-[11px] border border-purple-100 dark:border-purple-800">
                          {e.className}
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">{e.studentPhone || '-'}</td>
                      <td className="p-3.5 text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                        {e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="p-3.5 text-right pr-4">
                        <button
                          onClick={() => handleUnenroll(e.studentId, e.courseId, e.className, e.studentName, e.courseTitle)}
                          className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors border-none bg-transparent"
                          title="Unenroll student"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="p-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                      No enrollments found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Enrollments Cards View (visible only on mobile < md) */}
          <div className="md:hidden space-y-3">
            {paginatedEnrollments.length > 0 ? (
              paginatedEnrollments.map((e, idx) => (
                <div key={idx} className="bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">{e.studentName}</h4>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{e.studentEmail}</p>
                    </div>
                    <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold border border-purple-200 dark:border-purple-800 shrink-0">
                      {e.studentRegNo || 'N/A'}
                    </span>
                  </div>

                  <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Course</span>
                      <span className="font-extrabold text-purple-950 dark:text-purple-300 text-right">{e.courseTitle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Class / Grade</span>
                      <span className="bg-purple-100 dark:bg-purple-950/60 text-[#2d1b64] dark:text-purple-300 px-2 py-0.5 rounded text-[10px] font-bold border border-purple-200 dark:border-purple-800">
                        {e.className}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Parent Phone</span>
                      <span className="font-mono text-gray-700 dark:text-gray-300 text-[11px]">{e.studentPhone || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Enrolled Date</span>
                      <span className="text-gray-600 dark:text-gray-400 text-[11px]">{e.createdAt ? new Date(e.createdAt).toLocaleDateString() : '-'}</span>
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleUnenroll(e.studentId, e.courseId, e.className, e.studentName, e.courseTitle)}
                      className="w-full py-2 text-red-600 hover:text-red-700 bg-red-50 dark:bg-red-950/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-red-200 dark:border-red-900/40"
                    >
                      <FaTrash className="text-[11px]" />
                      <span>Unenroll Student</span>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-medium text-xs">
                No enrollments found matching search.
              </div>
            )}
          </div>

          {/* Pagination Footer (25 records per page) */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              Showing <span className="font-extrabold text-gray-800 dark:text-white">{filteredEnrollments.length === 0 ? 0 : startIndex + 1}</span> to{' '}
              <span className="font-extrabold text-gray-800 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredEnrollments.length)}</span> of{' '}
              <span className="font-extrabold text-gray-800 dark:text-white">{filteredEnrollments.length}</span> enrollments
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
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
                      : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                  }`}
                >
                  {pageNum}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || filteredEnrollments.length === 0}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
              >
                Next <FaChevronRight className="text-[10px]" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* 2. APPROVE BANK SLIPS TAB */}
      {activeTab === 'approve_slips' && renderBankSlipsSection('pending')}

      {/* 3. APPROVED BANK SLIPS TAB */}
      {activeTab === 'approved_slips' && renderBankSlipsSection('approved')}

      {/* 4. DECLINED SLIPS TAB */}
      {activeTab === 'declined_slips' && renderBankSlipsSection('declined')}



      {/* ========================================================================= */}
      {/* POPUP MODAL: NEW COURSE ENROLLMENT (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* POPUP MODAL: NEW COURSE ENROLLMENT (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 animate-fadeIn my-8 text-gray-800 dark:text-gray-100">
            
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    1. Select Course <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search Course..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 mb-2 font-medium"
                    value={courseSearch}
                    onChange={(e) => setCourseSearch(e.target.value)}
                  />
                  <select
                    value={selectedCourseId}
                    onChange={(e) => handleCourseChange(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-bold cursor-pointer"
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    2. Select Class <span className="text-red-500">*</span>
                  </label>
                  {selectedCourseId && assignedGrades.length === 0 ? (
                    <div className="text-xs font-bold text-red-600 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-800 mt-8">
                      No grades assigned to this course.
                    </div>
                  ) : (
                    <>
                      <div className="h-[34px] mb-2 hidden md:block"></div>
                      <select
                        value={selectedClass}
                        onChange={(e) => handleGradeChange(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-bold cursor-pointer disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    3. Select Student <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Search Student..."
                    className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs bg-gray-50 dark:bg-slate-800 text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 mb-2 disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed font-medium"
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    disabled={!selectedClass}
                  />
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-bold cursor-pointer disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:cursor-not-allowed"
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
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-red-100 dark:border-red-900/60 max-w-md w-full mx-4 text-gray-800 dark:text-gray-100">
            <div className="text-center font-sans">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/60 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-200 dark:border-red-800">
                <FaTrash className="text-xl text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Unenroll Student</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs mb-6 leading-relaxed">
                Are you sure you want to remove <strong className="text-[#2d1b64] dark:text-purple-400 font-bold">{enrollmentToDelete.studentName}</strong> from <strong className="text-purple-900 dark:text-purple-300 font-bold">{enrollmentToDelete.courseTitle} ({enrollmentToDelete.className})</strong>?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setEnrollmentToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition cursor-pointer border-none"
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

      {/* Custom Rejection Reason Popup Modal */}
      {showRejectModal && slipToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl shadow-2xl overflow-hidden border border-red-100 dark:border-red-900/60 font-sans my-8 text-gray-800 dark:text-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-5 text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white font-bold text-lg">
                  ✕
                </div>
                <div>
                  <h3 className="text-lg font-extrabold tracking-tight">Reject Bank Deposit Slip</h3>
                  <p className="text-red-100 text-xs mt-0.5">Specify reason for rejecting student's payment slip.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRejectModal(false);
                  setSlipToReject(null);
                }}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition border-none cursor-pointer text-sm"
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={executeRejectSlip} className="p-6 space-y-5">
              <div className="bg-red-50/70 dark:bg-red-950/40 p-3.5 rounded-2xl border border-red-100 dark:border-red-900/60 text-xs text-red-900 dark:text-red-300 space-y-1">
                <p><strong>Student Name:</strong> {slipToReject.student?.name || 'Student'}</p>
                <p><strong>Course:</strong> {slipToReject.course?.title || 'Course'}</p>
                <p><strong>Amount / Tx ID:</strong> LKR {slipToReject.amount?.toLocaleString()} ({slipToReject.transactionId})</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                  Quick Rejection Reasons (Click to select)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {[
                    "Unclear or blurry slip photo",
                    "Incorrect deposit amount",
                    "Duplicate transaction reference",
                    "Depositor name mismatch",
                    "Invalid bank transfer receipt"
                  ].map((presetReason) => (
                    <button
                      key={presetReason}
                      type="button"
                      onClick={() => setRejectionReasonInput(presetReason)}
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition cursor-pointer ${
                        rejectionReasonInput === presetReason
                          ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                          : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/60 hover:text-red-700'
                      }`}
                    >
                      {presetReason}
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Detailed Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Enter rejection reason to notify student (e.g. Image resolution is too low, amount paid does not match course fee)..."
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500 focus:bg-white dark:focus:bg-slate-800 text-gray-800 dark:text-white font-medium transition"
                ></textarea>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectModal(false);
                    setSlipToReject(null);
                  }}
                  className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={rejecting || !rejectionReasonInput.trim()}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 disabled:opacity-50 border-none"
                >
                  {rejecting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Rejecting Slip...
                    </>
                  ) : (
                    <>
                      <FaTimesCircle className="text-white" /> Reject Bank Slip
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Screen Bank Slip Image Viewer Modal */}
      {selectedSlipImage && (
        <div 
          onClick={() => setSelectedSlipImage(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer animate-fadeIn"
        >
          <div className="relative max-w-4xl w-full bg-white dark:bg-slate-900 p-2 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-3 bg-gray-900 dark:bg-slate-950 text-white rounded-t-xl">
              <span className="font-extrabold text-xs">🏦 Uploaded Bank Deposit Receipt Slip</span>
              <button 
                onClick={() => setSelectedSlipImage(null)}
                className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-7 h-7 flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-y-auto flex items-center justify-center bg-gray-100 dark:bg-slate-950">
              <img src={selectedSlipImage} alt="Full Bank Slip" className="max-h-[70vh] object-contain rounded-lg shadow-lg" />
            </div>
          </div>
        </div>
      )}

      {/* PDF Bank Slip Reader Modal */}
      {activePdfSlip && (
        <PdfReaderModal
          pdf={{ fileUrl: activePdfSlip.fileUrl, title: activePdfSlip.title }}
          onClose={() => setActivePdfSlip(null)}
        />
      )}
    </div>
  );
};

export default Enrollments;
