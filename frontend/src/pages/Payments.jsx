/**
 * @file Payments.jsx
 * @description Payments Management & Checkout Page. Manages student tuition payments, online card checkout with SMS OTP, counter cash transactions, and downloadable PDF receipts.
 */

import React, { useEffect, useState } from 'react';
import API from '../utils/api';
import { toast } from 'react-hot-toast';
import { 
  FaCreditCard, FaSearch, FaCheckCircle, FaBookOpen, FaReceipt, 
  FaGraduationCap, FaPlusCircle, FaBuilding, FaStore, 
  FaChevronLeft, FaChevronRight, FaEye, FaTimes, FaFilePdf, FaDownload
} from 'react-icons/fa';
import RecordPhysicalPaymentModal from '../components/RecordPhysicalPaymentModal';
import { fetchBlobUrl, downloadProtectedFile, protectedUrls } from '../utils/fileApi';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPhysicalPaymentModal, setShowPhysicalPaymentModal] = useState(false);

  // Pagination State (25 per page)
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isAdmin = user?.role === 'admin' || user?.role === 'counter_staff';
  const isTeacher = user?.role === 'teacher';

  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all' | 'COMPLETED' | 'PENDING_APPROVAL' | 'REJECTED'
  const [selectedSlipImage, setSelectedSlipImage] = useState(null);
  const [activeSlipTitle, setActiveSlipTitle] = useState('');
  const [activeSlipIsPdf, setActiveSlipIsPdf] = useState(false);
  const [activeSlipRevoke, setActiveSlipRevoke] = useState(null);
  const [currentSlipItem, setCurrentSlipItem] = useState(null);

  useEffect(() => {
    fetchPayments();
  }, []);

  // Reset page number on search or filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCourseFilter, selectedStatusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const endpoint = (isAdmin || isTeacher)
        ? '/payments/all'
        : '/payments/my-payments';

      const res = await API.get(endpoint);
      setPayments(res.data || []);
    } catch (err) {
      console.error('Error fetching payments:', err);
      toast.error('Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  const handlePhysicalPaymentSuccess = (newPayment) => {
    fetchPayments(); // Refresh list
  };

  const handleCloseSlipModal = () => {
    if (activeSlipRevoke) {
      activeSlipRevoke();
      setActiveSlipRevoke(null);
    }
    setSelectedSlipImage(null);
    setCurrentSlipItem(null);
  };

  const handleViewSlip = async (item) => {
    if (!item || !item.slipImage) {
      toast.error('No bank slip available.');
      return;
    }

    if (activeSlipRevoke) {
      activeSlipRevoke();
      setActiveSlipRevoke(null);
    }

    const raw = item.slipImage;
    const isPdf = raw.toLowerCase().endsWith('.pdf') || raw.startsWith('data:application/pdf');
    setActiveSlipIsPdf(isPdf);
    setActiveSlipTitle(`Bank Deposit Slip - ${item.student?.name || item.depositorName || 'Student'} (${item.course?.title || 'Course'})`);
    setCurrentSlipItem(item);

    if (raw.startsWith('data:')) {
      setSelectedSlipImage(raw);
    } else {
      try {
        const { blobUrl, revoke } = await fetchBlobUrl(protectedUrls.paymentSlip(item._id));
        setActiveSlipRevoke(() => revoke);
        setSelectedSlipImage(blobUrl);
      } catch (err) {
        console.error('Error viewing slip:', err);
        toast.error('Failed to load bank slip.');
      }
    }
  };

  const handleDownloadSlip = async (item) => {
    if (!item || !item.slipImage) {
      toast.error('No bank slip available to download.');
      return;
    }
    const isPdf = item.slipImage.toLowerCase().endsWith('.pdf') || item.slipImage.startsWith('data:application/pdf');
    const ext = isPdf ? 'pdf' : 'jpg';
    const cleanName = (item.student?.name || item.depositorName || 'student').replace(/[^a-zA-Z0-9]/g, '_');
    const fileName = `Bank_Slip_${cleanName}_${item.transactionId || item._id}.${ext}`;

    if (item.slipImage.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = item.slipImage;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Bank slip download started!');
    } else {
      try {
        await downloadProtectedFile(protectedUrls.paymentSlip(item._id, true), fileName);
        toast.success('Bank slip download started!');
      } catch (err) {
        console.error('Download failed:', err);
        toast.error('Failed to download bank slip.');
      }
    }
  };

  // Extract unique courses for filtering dropdown
  const uniqueCourses = Array.from(
    new Map(
      payments
        .filter(p => p.course && p.course._id)
        .map(p => [p.course._id, p.course.title])
    ).entries()
  );

  // Filter payments by course title, transaction ID, student name, method, grade, status and course dropdown
  const filteredPayments = payments.filter((item) => {
    const query = searchQuery.toLowerCase();
    const courseTitle = item.course?.title?.toLowerCase() || '';
    const courseId = item.course?._id || item.course;
    const txId = item.transactionId?.toLowerCase() || '';
    const studentName = item.student?.name?.toLowerCase() || '';
    const regNo = item.student?.registrationNumber?.toLowerCase() || '';
    const grade = item.student?.grade?.toLowerCase() || '';
    const method = item.paymentMethod?.toLowerCase() || '';

    const matchesSearch = courseTitle.includes(query) || txId.includes(query) || studentName.includes(query) || regNo.includes(query) || grade.includes(query) || method.includes(query);
    const matchesCourse = selectedCourseFilter === 'all' || (courseId && courseId.toString() === selectedCourseFilter);
    const matchesStatus = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;

    return matchesSearch && matchesCourse && matchesStatus;
  });

  // Only count COMPLETED or PAID transactions towards Total Paid
  const totalSpent = filteredPayments
    .filter(p => p.status === 'COMPLETED' || p.status === 'PAID')
    .reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const pendingPayments = filteredPayments.filter(p => p.status === 'PENDING_APPROVAL');
  const pendingTotal = pendingPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const pendingCount = pendingPayments.length;
  const completedCount = filteredPayments.filter(p => p.status === 'COMPLETED' || p.status === 'PAID').length;

  // Pagination calculation (25 per page)
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedPayments = filteredPayments.slice(startIndex, startIndex + itemsPerPage);

  if (loading) {
    return (
      <div className="min-h-[65vh] flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 dark:border-purple-400"></div>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 animate-pulse">Loading Payments Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 p-4 md:p-10 font-sans text-gray-800 dark:text-gray-100 space-y-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-8 rounded-[30px] text-white shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-white/10 rounded-2xl text-amber-400 text-2xl">💳</span>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">
                  {isTeacher ? 'Module Fee Settlement History' : 'Course Payment History'}
                </h2>
                <p className="text-indigo-200 text-sm mt-1">
                  {isTeacher
                    ? 'Audit student fee payments and transactions settled for your assigned courses.'
                    : isAdmin 
                    ? 'Administrative audit view of all student course fee transactions (Online, Bank Slips & Counter Payments)' 
                    : 'Track and manage your enrolled course fee payment receipts'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Total Settled Badge */}
            <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/20 text-right">
              <span className="text-xs text-indigo-200 uppercase tracking-wider block font-semibold">
                {isTeacher ? 'Module Revenue Settled' : 'Total Settled'}
              </span>
              <span className="text-2xl font-extrabold text-amber-400">LKR {totalSpent.toLocaleString()}</span>
              {pendingCount > 0 && (
                <span className="text-[11px] text-amber-300 font-bold block mt-0.5">
                  ⏳ LKR {pendingTotal.toLocaleString()} ({pendingCount} pending verification)
                </span>
              )}
            </div>

            {/* Admin Action Button: Record Counter Payment */}
            {/*
              🎨 HOW TO CHANGE BUTTON COLOR: "Record Counter Payment (Physical)" Button
              - Current Color (Amber Gold):   'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950'
              - To change to Emerald Green:   'bg-emerald-600 hover:bg-emerald-700 text-white'
              - To change to Royal Blue:      'bg-blue-600 hover:bg-blue-700 text-white'
              - To change to Deep Purple:     'bg-purple-600 hover:bg-purple-700 text-white'
            */}
            {isAdmin && (
              <button
                onClick={() => setShowPhysicalPaymentModal(true)}
                className="px-5 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-extrabold text-xs rounded-2xl shadow-lg transition transform active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <FaPlusCircle className="text-base" /> Record Counter Payment (Physical)
              </button>
            )}
          </div>
        </div>

        {/* Stats Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/60 text-[#2d1b64] dark:text-purple-300 rounded-2xl flex items-center justify-center text-xl font-bold">
              <FaReceipt />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-400 font-bold uppercase tracking-wider">Total Transactions</p>
              <p className="text-2xl font-extrabold text-gray-800 dark:text-white">{filteredPayments.length}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold ${
              pendingCount > 0
                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
            }`}>
              {pendingCount > 0 ? <FaReceipt /> : <FaCheckCircle />}
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-400 font-bold uppercase tracking-wider">Settlement Status</p>
              <p className="text-xl font-extrabold text-gray-800 dark:text-white">
                {pendingCount > 0 ? `${pendingCount} Pending Verification` : 'All Settled ✓'}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center text-xl font-bold">
              <FaGraduationCap />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-400 font-bold uppercase tracking-wider">
                {isTeacher ? 'Assigned Modules' : isAdmin ? 'Verification' : 'Enrolled Grade'}
              </p>
              <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-300">
                {isTeacher
                  ? `${uniqueCourses.length} Active Courses`
                  : isAdmin
                  ? 'Audited ✓'
                  : user?.grade ? (user.grade.toLowerCase().startsWith('grade') ? user.grade : `Grade ${user.grade}`) : 'Grade Active'}
              </p>
            </div>
          </div>
        </div>

        {/* Search & Course Filter Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-1">
            <div className="relative w-full sm:w-80">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by course title, receipt ID, student name, or grade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-medium text-gray-900 dark:text-white transition"
              />
            </div>

            {/* Course Filter for Teachers / Admin */}
            {(isTeacher || isAdmin) && uniqueCourses.length > 0 && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">Module:</span>
                <select
                  value={selectedCourseFilter}
                  onChange={(e) => setSelectedCourseFilter(e.target.value)}
                  className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
                >
                  <option value="all">All Modules ({uniqueCourses.length})</option>
                  {uniqueCourses.map(([cId, cTitle]) => (
                    <option key={cId} value={cId}>{cTitle}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Status Filter */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="COMPLETED">Settled / Completed</option>
                <option value="PENDING_APPROVAL">Pending Verification</option>
                <option value="REJECTED">Declined / Rejected</option>
              </select>
            </div>
          </div>

          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">
            Showing <span className="text-gray-800 dark:text-white font-bold">{filteredPayments.length === 0 ? 0 : startIndex + 1}</span> to{' '}
            <span className="text-gray-800 dark:text-white font-bold">{Math.min(startIndex + itemsPerPage, filteredPayments.length)}</span> of{' '}
            <span className="text-gray-800 dark:text-white font-bold">{filteredPayments.length}</span> payment records
          </span>
        </div>

        {/* Payments Table */}
        {filteredPayments.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-[30px] p-16 text-center border border-gray-200/80 dark:border-slate-800 shadow-sm">
            <div className="w-20 h-20 bg-purple-50 dark:bg-purple-950/60 text-[#2d1b64] dark:text-purple-300 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">
              💳
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">No Payment Records Found</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-md mx-auto">
              {searchQuery ? 'No payment transactions matched your search criteria.' : 'No course fee payments found for this filter.'}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-[30px] shadow-sm border border-gray-200/80 dark:border-slate-800 overflow-hidden p-2 sm:p-4">
            {/* Desktop Table View (hidden on mobile < md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200/80 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <th className="py-4 px-6">Course & Grade</th>
                    <th className="py-4 px-6">Payment Mode & Method</th>
                    {(isAdmin || isTeacher) && <th className="py-4 px-6">Student Info</th>}
                    <th className="py-4 px-6">Transaction / Ref ID</th>
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 text-sm">
                  {paginatedPayments.map((item) => {
                    const isCounterPayment = item.paymentMethod === 'CASH' || item.paymentMethod === 'CARD' || item.paymentMethod === 'CHEQUE' || item.paymentMethod === 'OTHER' || item.isPhysicalPayment;
                    const isBankSlip = item.paymentMethod === 'BANK_SLIP' || !!item.slipImage;
                    const formattedDate = item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    }) : 'N/A';

                    const rawGrade = item.remarks?.includes('Grade') 
                      ? item.remarks.split('for ')[1] 
                      : (item.student?.grade || item.course?.grade || 'General');
                    const formattedGrade = rawGrade && rawGrade.toLowerCase().startsWith('grade') ? rawGrade : `Grade ${rawGrade}`;

                    return (
                      <tr key={item._id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/40 transition">
                        {/* Course & Grade */}
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#2d1b64] dark:text-purple-300 flex items-center justify-center text-lg font-bold shrink-0">
                              <FaBookOpen />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 dark:text-white">{item.course?.title || 'Course Fee'}</p>
                              <span className="text-[11px] text-purple-700 dark:text-purple-400 font-bold block">
                                {formattedGrade} {item.month ? `• ${item.month} ${item.year || ''}` : ''}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Payment Mode & Method Badge */}
                        <td className="py-4 px-6">
                          {isBankSlip ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-bold rounded-lg text-xs border border-purple-200 dark:border-purple-800">
                                🏦 Bank Deposit Slip
                              </span>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">
                                  Ref: {item.transactionId || 'Slip'}
                                </span>
                                {item.slipImage && (
                                  <button
                                    type="button"
                                    onClick={() => handleViewSlip(item)}
                                    className="text-[10px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-0.5"
                                  >
                                    <FaEye className="text-[9px]" /> View Slip
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : isCounterPayment ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 font-bold rounded-lg text-xs border border-amber-200 dark:border-amber-800">
                                🏫 Counter Payment (Physical)
                              </span>
                              <span className="text-[10px] text-amber-800 dark:text-amber-400 font-semibold block mt-1">
                                Method: {item.paymentMethod || 'CASH'}
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 font-bold rounded-lg text-xs border border-blue-200 dark:border-blue-800">
                                💳 Online Gateway Payment
                              </span>
                              <span className="text-[10px] text-blue-700 dark:text-blue-400 font-semibold block mt-1">
                                Card ending in {item.cardLastFour || '4242'}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Student Name (Admin and Teacher) */}
                        {(isAdmin || isTeacher) && (
                          <td className="py-4 px-6">
                            <div>
                              <p className="font-bold text-gray-800 dark:text-white flex items-center gap-1">
                                {item.student?.name || 'Student'}
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700">
                                  {item.student?.studentType === 'physical' ? '🏫 Physical' : '💻 Online'}
                                </span>
                              </p>
                              <p className="text-xs text-gray-400 dark:text-gray-400">{item.student?.registrationNumber || item.student?.email}</p>
                            </div>
                          </td>
                        )}

                        {/* Transaction ID */}
                        <td className="py-4 px-6 font-mono text-xs font-bold text-indigo-700 dark:text-indigo-400">
                          {item.transactionId || 'N/A'}
                        </td>

                        {/* Date */}
                        <td className="py-4 px-6 text-gray-600 dark:text-gray-300 font-medium text-xs">
                          {formattedDate}
                        </td>

                        {/* Amount */}
                        <td className="py-4 px-6">
                          <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                            LKR {(item.amount || 2500).toLocaleString()}.00
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-6">
                          {item.status === 'PENDING_APPROVAL' ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-xs font-extrabold rounded-full border border-amber-200 dark:border-amber-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                PENDING APPROVAL
                              </span>
                              <span className="text-[10px] text-amber-600 dark:text-amber-400 block mt-0.5 font-semibold">
                                Under Admin Verification
                              </span>
                            </div>
                          ) : item.status === 'REJECTED' ? (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-xs font-extrabold rounded-full border border-red-200 dark:border-red-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                DECLINED
                              </span>
                              {item.rejectionReason && (
                                <span className="text-[10px] text-red-600 dark:text-red-400 block mt-0.5 font-medium max-w-[150px] truncate" title={item.rejectionReason}>
                                  {item.rejectionReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                                COMPLETED
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
                                Verified & Settled ✓
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Payments Cards View (visible only on mobile < md) */}
            <div className="md:hidden space-y-3 p-3">
              {paginatedPayments.map((item) => {
                const isCounterPayment = item.paymentMethod === 'CASH' || item.paymentMethod === 'CARD' || item.paymentMethod === 'CHEQUE' || item.paymentMethod === 'OTHER' || item.isPhysicalPayment;
                const isBankSlip = item.paymentMethod === 'BANK_SLIP' || !!item.slipImage;
                const formattedDate = item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                }) : 'N/A';

                const rawGrade = item.remarks?.includes('Grade') 
                  ? item.remarks.split('for ')[1] 
                  : (item.student?.grade || item.course?.grade || 'General');
                const formattedGrade = rawGrade && rawGrade.toLowerCase().startsWith('grade') ? rawGrade : `Grade ${rawGrade}`;

                return (
                  <div key={item._id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-[#2d1b64] dark:text-purple-300 flex items-center justify-center text-sm font-bold shrink-0">
                          <FaBookOpen />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-gray-900 dark:text-white leading-tight">{item.course?.title || 'Course Fee'}</h4>
                          <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold block">
                            {formattedGrade} {item.month ? `• ${item.month} ${item.year || ''}` : ''}
                          </span>
                        </div>
                      </div>
                      <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                        LKR {(item.amount || 2500).toLocaleString()}
                      </span>
                    </div>

                    <div className="bg-gray-50 dark:bg-slate-800/60 p-3 rounded-xl border border-gray-100 dark:border-slate-700 space-y-1.5 text-xs">
                      {(isAdmin || isTeacher) && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 text-[10px] font-bold uppercase">Student</span>
                          <span className="font-bold text-gray-800 dark:text-white">{item.student?.name || 'Student'} ({item.student?.registrationNumber || item.student?.grade})</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-[10px] font-bold uppercase">Method</span>
                        {isBankSlip ? (
                          <span className="text-purple-700 dark:text-purple-300 font-bold text-[11px]">🏦 Bank Deposit Slip</span>
                        ) : isCounterPayment ? (
                          <span className="text-amber-800 dark:text-amber-400 font-bold text-[11px]">🏫 Counter Payment</span>
                        ) : (
                          <span className="text-blue-700 dark:text-blue-400 font-bold text-[11px]">💳 Online Gateway</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400 text-[10px] font-bold uppercase">Ref / Date</span>
                        <span className="font-mono text-gray-600 dark:text-gray-400 text-[10px]">{item.transactionId || 'N/A'} • {formattedDate}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {item.status === 'PENDING_APPROVAL' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold rounded-full border border-amber-200 dark:border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                          PENDING APPROVAL
                        </span>
                      ) : item.status === 'REJECTED' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[10px] font-extrabold rounded-full border border-red-200 dark:border-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          DECLINED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-200 dark:border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 dark:bg-emerald-400"></span>
                          COMPLETED
                        </span>
                      )}

                      {item.slipImage && (
                        <button
                          type="button"
                          onClick={() => handleViewSlip(item)}
                          className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <FaEye className="text-[10px]" /> View Slip
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Footer (25 per page) */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/50">
              <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                Showing <span className="font-extrabold text-gray-800 dark:text-white">{filteredPayments.length === 0 ? 0 : startIndex + 1}</span> to{' '}
                <span className="font-extrabold text-gray-800 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredPayments.length)}</span> of{' '}
                <span className="font-extrabold text-gray-800 dark:text-white">{filteredPayments.length}</span> payment records
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800"
                >
                  <FaChevronLeft className="text-[10px]" /> Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                      currentPage === pageNum
                        ? 'bg-[#2d1b64] dark:bg-purple-700 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || filteredPayments.length === 0}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800"
                >
                  Next <FaChevronRight className="text-[10px]" />
                </button>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* Record Physical Payment Modal for Admin */}
      <RecordPhysicalPaymentModal
        isOpen={showPhysicalPaymentModal}
        onClose={() => setShowPhysicalPaymentModal(false)}
        onSuccess={handlePhysicalPaymentSuccess}
      />

      {/* Bank Slip Attachment Preview Modal */}
      {selectedSlipImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={handleCloseSlipModal}
        >
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-slate-800 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2 truncate pr-2">
                <span>🏦</span> <span className="truncate">{activeSlipTitle || 'Bank Deposit Slip Preview'}</span>
              </h3>
              <div className="flex items-center gap-2 shrink-0">
                {currentSlipItem && (
                  <button
                    type="button"
                    onClick={() => handleDownloadSlip(currentSlipItem)}
                    className="px-3 py-1.5 bg-[#2d1b64] hover:bg-indigo-950 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    <FaDownload className="text-amber-400 text-xs" />
                    <span>Download</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCloseSlipModal}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 dark:bg-slate-950 rounded-2xl p-2 border border-gray-100 dark:border-slate-800">
              {activeSlipIsPdf ? (
                <iframe src={selectedSlipImage} title="Bank Slip PDF" className="w-full h-[60vh] rounded-xl" />
              ) : (
                <img src={selectedSlipImage} alt="Bank Deposit Slip" className="max-h-[65vh] object-contain rounded-xl shadow-xs" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
