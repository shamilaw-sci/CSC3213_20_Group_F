/**
 * @file RecordPhysicalPaymentModal.jsx
 * @description Record Physical Payment Modal. Desk counter modal for logging cash tuition payments, custom physical receipt numbers, and parent SMS triggers.
 */

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { FaUserGraduate, FaBookOpen, FaMoneyBillWave, FaReceipt, FaBuilding, FaSearch, FaCheckCircle, FaTimes } from 'react-icons/fa';

const RecordPhysicalPaymentModal = ({ isOpen, onClose, onSuccess, initialStudentId = '' }) => {
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH_COUNTER');
  const [receiptNumber, setReceiptNumber] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [studentSearch, setStudentSearch] = useState('');

  const normalizeGrade = (g) => g ? String(g).toLowerCase().replace(/\s+/g, '').replace('grade', '') : '';

  const findMatchingGradeInCourse = (courseObj, studentGradeVal) => {
    if (!courseObj?.enrolledGrades?.length) return null;
    const norm = normalizeGrade(studentGradeVal);
    if (!norm) return courseObj.enrolledGrades[0] || null;
    return courseObj.enrolledGrades.find(g => {
      const gNorm = normalizeGrade(g.gradeNumber);
      const parts = String(g.gradeNumber).split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade);
      return gNorm === norm || parts.includes(norm);
    }) || courseObj.enrolledGrades[0] || null;
  };

  useEffect(() => {
    if (isOpen) {
      fetchSupportingData();
      if (initialStudentId) {
        setSelectedStudentId(initialStudentId);
      }
      // Generate default counter receipt ID
      const defaultReceipt = `REC-PHYS-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;
      setReceiptNumber(defaultReceipt);
    }
  }, [isOpen, initialStudentId]);

  const fetchSupportingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Students
      const usersRes = await api.get('/auth/users');
      const studentUsers = usersRes.data.filter(u => u.role === 'student');
      setStudents(studentUsers);

      // 2. Fetch Courses
      const coursesRes = await api.get('/courses');
      setCourses(coursesRes.data || []);
    } catch (err) {
      console.error('Error fetching supporting data for payment modal:', err);
      toast.error('Failed to load students or courses list.');
    } finally {
      setLoading(false);
    }
  };

  const handleStudentChange = (e) => {
    const sId = e.target.value;
    setSelectedStudentId(sId);
    const stu = students.find(s => s._id === sId);
    if (stu && selectedCourseId) {
      const crs = courses.find(c => c._id === selectedCourseId);
      if (crs) {
        const matched = findMatchingGradeInCourse(crs, stu.grade);
        if (matched) {
          setSelectedGrade(matched.gradeNumber);
          const gFee = (matched.fee !== undefined && matched.fee !== null && Number(matched.fee) >= 0)
            ? Number(matched.fee)
            : (crs.price || 2500);
          setAmount(gFee);
        }
      }
    }
  };

  // Automatically update grade and amount when course is selected
  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourseId(courseId);
    const selectedCourse = courses.find(c => c._id === courseId);
    const currentStudent = students.find(s => s._id === selectedStudentId);

    if (selectedCourse) {
      if (selectedCourse.enrolledGrades && selectedCourse.enrolledGrades.length > 0) {
        const matched = findMatchingGradeInCourse(selectedCourse, currentStudent?.grade);
        if (matched) {
          setSelectedGrade(matched.gradeNumber);
          const gFee = (matched.fee !== undefined && matched.fee !== null && Number(matched.fee) >= 0)
            ? Number(matched.fee)
            : (selectedCourse.price || 2500);
          setAmount(gFee);
        } else {
          setSelectedGrade(selectedCourse.enrolledGrades[0].gradeNumber);
          const gFee = (selectedCourse.enrolledGrades[0].fee !== undefined && selectedCourse.enrolledGrades[0].fee !== null && Number(selectedCourse.enrolledGrades[0].fee) >= 0)
            ? Number(selectedCourse.enrolledGrades[0].fee)
            : (selectedCourse.price || 2500);
          setAmount(gFee);
        }
      } else {
        setSelectedGrade(currentStudent?.grade || 'Grade 6');
        setAmount(selectedCourse.price || 2500);
      }
    } else {
      setSelectedGrade('');
      setAmount('');
    }
  };

  // When grade is selected manually
  const handleGradeChange = (e) => {
    const gNum = e.target.value;
    setSelectedGrade(gNum);
    const selectedCourse = courses.find(c => c._id === selectedCourseId);
    if (selectedCourse && selectedCourse.enrolledGrades) {
      const gObj = selectedCourse.enrolledGrades.find(g => g.gradeNumber === gNum);
      if (gObj) {
        const gFee = (gObj.fee !== undefined && gObj.fee !== null && Number(gObj.fee) >= 0)
          ? Number(gObj.fee)
          : (selectedCourse.price || 2500);
        setAmount(gFee);
      } else {
        setAmount(selectedCourse.price || 2500);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast.error('Please select a student.');
      return;
    }
    if (!selectedCourseId) {
      toast.error('Please select a course.');
      return;
    }
    if (!selectedGrade) {
      toast.error('Please select a grade / class.');
      return;
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      toast.error('Please enter a valid payment amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/payments/record-physical-payment', {
        studentId: selectedStudentId,
        courseId: selectedCourseId,
        grade: selectedGrade,
        amount: Number(amount),
        paymentMethod,
        receiptNumber: receiptNumber.trim(),
        paymentDate,
        remarks: remarks.trim()
      });

      toast.success(res.data.message || 'Counter payment recorded successfully!');
      if (onSuccess) {
        onSuccess(res.data.payment);
      }
      onClose();
    } catch (err) {
      console.error('Error recording physical payment:', err);
      const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to record payment.';
      toast.error(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Filter students by search term
  const filteredStudents = students.filter(s => {
    const query = studentSearch.toLowerCase();
    const name = s.name?.toLowerCase() || '';
    const email = s.email?.toLowerCase() || '';
    const regNo = s.registrationNumber?.toLowerCase() || '';
    const grade = s.grade?.toLowerCase() || '';
    return name.includes(query) || email.includes(query) || regNo.includes(query) || grade.includes(query);
  });

  const selectedStudent = students.find(s => s._id === selectedStudentId);
  const selectedCourse = courses.find(c => c._id === selectedCourseId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 animate-fadeIn my-8 text-gray-800 dark:text-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
          >
            <FaTimes />
          </button>

          <div className="flex items-center gap-3">
            <span className="p-3 bg-amber-400 text-purple-950 rounded-2xl text-xl font-black">🏫</span>
            <div>
              <h3 className="text-xl font-extrabold tracking-tight">Record Physical Counter Payment</h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                Log cash/bank counter payments for physical students and issue course receipts.
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d1b64] mx-auto"></div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 font-semibold">Loading student and course databases...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
            
            {/* Cashier Badge */}
            <div className="flex justify-between items-center bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/60 p-3.5 rounded-2xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-950 dark:text-amber-300">Institute Cashier Counter</span>
                <span className="text-[10px] bg-amber-200 dark:bg-amber-900/60 text-amber-950 dark:text-amber-200 px-2.5 py-0.5 rounded-full font-bold">
                  Official In-Person Receipt
                </span>
              </div>
              <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                Mode: {paymentMethod.replace('_', ' ')}
              </span>
            </div>

            {/* Field 1: Select Student */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select Student <span className="text-red-500">*</span></span>
                {selectedStudent && (
                  <span className="text-purple-700 dark:text-purple-400 font-extrabold text-[11px] lowercase">
                    {selectedStudent.studentType === 'physical' ? '🏫 Physical Student' : '💻 Online Student'}
                  </span>
                )}
              </label>

              {/* Student Search Input */}
              <div className="relative mb-2">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <input
                  type="text"
                  placeholder="Filter student by name, registration no. or grade..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-medium"
                />
              </div>

              <select
                value={selectedStudentId}
                onChange={handleStudentChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-800 dark:text-white font-semibold cursor-pointer"
                required
              >
                <option value="">-- Choose Student ({filteredStudents.length} Available) --</option>
                {filteredStudents.map(s => {
                  const regTag = s.registrationNumber ? `[${s.registrationNumber}] ` : '';
                  const gradeTag = s.grade ? ` (Grade ${s.grade})` : '';
                  const typeTag = s.studentType === 'physical' ? ' 🏫' : ' 💻';
                  return (
                    <option key={s._id} value={s._id}>
                      {regTag}{s.name}{gradeTag} - {s.email}{typeTag}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Field 2: Select Course */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select Course <span className="text-red-500">*</span></span>
                {selectedCourse && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                    {selectedCourse.enrolledGrades?.length || 0} Grade Class(es) Available
                  </span>
                )}
              </label>
              <select
                value={selectedCourseId}
                onChange={handleCourseChange}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-800 dark:text-white font-semibold cursor-pointer"
                required
              >
                <option value="">-- Choose Course ({courses.length} Active Courses) --</option>
                {courses.map(c => (
                  <option key={c._id} value={c._id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Field 3: Select Grade / Class for this Course */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                <span>Select Grade / Class Tier <span className="text-red-500">*</span></span>
                {selectedGrade && selectedStudent?.grade && normalizeGrade(selectedGrade) === normalizeGrade(selectedStudent.grade) && (
                  <span className="text-purple-700 dark:text-purple-400 font-bold text-[11px]">
                    ✓ Auto-matched with student's grade ({selectedStudent.grade})
                  </span>
                )}
              </label>
              {selectedCourse && selectedCourse.enrolledGrades && selectedCourse.enrolledGrades.length > 0 ? (
                <select
                  value={selectedGrade}
                  onChange={handleGradeChange}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-800 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-purple-950 dark:text-purple-200 font-bold cursor-pointer shadow-xs"
                  required
                >
                  <option value="">-- Choose Grade / Class --</option>
                  {selectedCourse.enrolledGrades.map((g) => {
                    const gFee = (g.fee !== undefined && g.fee !== null && Number(g.fee) >= 0)
                      ? Number(g.fee)
                      : (selectedCourse.price || 2500);
                    return (
                      <option key={g.gradeNumber} value={g.gradeNumber}>
                        {g.title || g.gradeNumber} ({g.gradeNumber}) — Fee: LKR {gFee.toLocaleString()}
                      </option>
                    );
                  })}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="e.g. Grade 10"
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-800 dark:text-white font-semibold"
                  required
                />
              )}
            </div>

            {/* Grid Row: Payment Method, Amount, Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-bold cursor-pointer"
                >
                  <option value="CASH_COUNTER">💵 Cash (Counter)</option>
                  <option value="POS_CARD">💳 POS Card Terminal</option>
                  <option value="BANK_TRANSFER">🏦 Bank Deposit / Transfer</option>
                </select>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Amount Paid (LKR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="2500"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-emerald-800 dark:text-emerald-300 font-extrabold"
                  required
                />
              </div>

              {/* Payment Date */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                  required
                />
              </div>

            </div>

            {/* Grid Row: Receipt Reference & Cashier Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Receipt / Transaction ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. REC-PHYS-00481"
                  value={receiptNumber}
                  onChange={(e) => setReceiptNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-mono font-bold text-purple-900 dark:text-purple-300"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Cashier Remarks (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Counter Cash Receipt #401"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-medium"
                />
              </div>

            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                    Recording Payment...
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="text-amber-400" /> Record & issue Receipt
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};

export default RecordPhysicalPaymentModal;
