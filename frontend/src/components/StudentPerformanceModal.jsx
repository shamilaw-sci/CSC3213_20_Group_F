/**
 * @file StudentPerformanceModal.jsx
 * @description Student Performance Drilldown Modal. Detailed analytical popup displaying a student's attendance record, quiz mark trends, and assignment status.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCalendarCheck,
  FaClipboardList,
  FaClipboardCheck,
  FaBookOpen,
  FaClock,
  FaUserGraduate,
  FaInfoCircle,
  FaChartLine,
  FaFileAlt,
  FaSearch,
  FaArrowRight,
  FaPhoneAlt,
  FaCheck,
  FaFilter,
  FaRegCheckCircle,
  FaRegTimesCircle,
  FaLayerGroup,
  FaLaptop,
  FaSchool,
  FaCopy
} from 'react-icons/fa';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { getMediaUrl } from '../utils/mediaUrl';

const StudentPerformanceModal = ({ isOpen, onClose, studentId, initialStudent = null, initialTab = 'overview' }) => {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'overview');
  const [copiedPhone, setCopiedPhone] = useState(false);

  // Filters and search states for sub-tabs
  const [attendanceFilter, setAttendanceFilter] = useState('all');
  const [attendanceSearch, setAttendanceSearch] = useState('');

  const [quizFilter, setQuizFilter] = useState('all');
  const [quizSearch, setQuizSearch] = useState('');

  const [assignmentFilter, setAssignmentFilter] = useState('all');
  const [assignmentSearch, setAssignmentSearch] = useState('');

  const [readingFilter, setReadingFilter] = useState('all');
  const [readingSearch, setReadingSearch] = useState('');

  const contentScrollRef = useRef(null);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      setError(null);
      setActiveTab(initialTab || 'overview');
      api.get(`/early-warning/student/${studentId}`)
        .then(res => {
          if (res.data && res.data.data) {
            setData(res.data.data);
          } else {
            setData(null);
          }
        })
        .catch(err => {
          console.error("Error loading student performance details:", err);
          setError(err.response?.data?.error || "Failed to load student performance details.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setData(null);
    }
  }, [isOpen, studentId, initialTab]);

  const switchTab = (tabId) => {
    setActiveTab(tabId);
    if (contentScrollRef.current) {
      contentScrollRef.current.scrollTo({ top: 0, behavior: 'instant' });
    }
  };

  const handleCopyPhone = (phone) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  if (!isOpen) return null;

  const student = data?.student || initialStudent;
  const warnings = data?.warnings || [];
  const metrics = data?.metrics || {};
  const riskLevel = data?.riskLevel || 'NONE';

  const attendance = metrics.attendance || { total: 0, present: 0, absent: 0, late: 0, rate: 0 };
  const quizzes = metrics.quizzes || { totalAttempted: 0, averagePercentage: 0, history: [] };
  const assignments = metrics.assignments || { totalAssigned: 0, totalSubmitted: 0, totalMissing: 0, averageMarks: 0, submissions: [], missing: [] };
  const reading = metrics.reading || { totalPdfs: 0, completedPdfs: 0, averageProgress: 0, progressList: [] };
  const activity = metrics.activity || { daysSinceLastActivity: 0, lastActiveDate: null };

  // Contextual warning extractors
  const attendanceWarnings = warnings.filter(w => 
    w.category?.toLowerCase().includes('attend') || w.type === 'ATTENDANCE_CONCERN'
  );
  const quizWarnings = warnings.filter(w => 
    w.category?.toLowerCase().includes('quiz') || w.category?.toLowerCase().includes('performance') || w.type === 'PERFORMANCE_DECLINE'
  );
  const assignmentWarnings = warnings.filter(w => 
    w.category?.toLowerCase().includes('assign') || w.type === 'ASSIGNMENT_CONCERN'
  );
  const readingWarnings = warnings.filter(w => 
    w.category?.toLowerCase().includes('read') || w.category?.toLowerCase().includes('activ') || w.type === 'INACTIVE_STUDENT'
  );

  const getRiskBadge = () => {
    if (riskLevel === 'HIGH') {
      return (
        <span className="px-3 py-1 bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
          <FaExclamationTriangle className="text-red-500" /> High Attention Required
        </span>
      );
    }
    if (riskLevel === 'MEDIUM') {
      return (
        <span className="px-3 py-1 bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
          <FaExclamationTriangle className="text-amber-500" /> Needs Academic Support
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
        <FaCheckCircle className="text-emerald-500" /> Good Academic Standing
      </span>
    );
  };

  const getJumpCategoryTab = (category = '') => {
    const c = category.toLowerCase();
    if (c.includes('attend')) return 'attendance';
    if (c.includes('quiz') || c.includes('performance')) return 'quizzes';
    if (c.includes('assign')) return 'assignments';
    if (c.includes('read') || c.includes('activ')) return 'reading';
    return 'overview';
  };

  // Filtered lists
  const filteredAttendanceLogs = (data?.attendanceLogs || []).filter(log => {
    const matchesFilter = attendanceFilter === 'all' || log.status === attendanceFilter;
    const courseTitle = (log.courseId?.title || log.remarks || '').toLowerCase();
    const matchesSearch = !attendanceSearch || courseTitle.includes(attendanceSearch.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredQuizzes = (quizzes.history || []).filter(q => {
    const matchesFilter =
      quizFilter === 'all'
        ? true
        : quizFilter === 'passed'
        ? q.isPassed
        : !q.isPassed;
    const title = (q.quizTitle || '').toLowerCase();
    const course = (q.courseTitle || '').toLowerCase();
    const query = quizSearch.toLowerCase();
    const matchesSearch = !quizSearch || title.includes(query) || course.includes(query);
    return matchesFilter && matchesSearch;
  });

  const filteredAssignments = (assignments.submissions || []).filter(sub => {
    const matchesFilter =
      assignmentFilter === 'all'
        ? true
        : assignmentFilter === 'graded'
        ? sub.status === 'graded'
        : assignmentFilter === 'pending'
        ? sub.status !== 'graded'
        : true;
    const title = (sub.assignmentTitle || '').toLowerCase();
    const course = (sub.courseTitle || '').toLowerCase();
    const query = assignmentSearch.toLowerCase();
    const matchesSearch = !assignmentSearch || title.includes(query) || course.includes(query);
    return matchesFilter && matchesSearch;
  });

  const filteredReading = (reading.progressList || []).filter(rp => {
    const matchesFilter =
      readingFilter === 'all'
        ? true
        : readingFilter === 'completed'
        ? rp.isCompleted
        : !rp.isCompleted;
    const title = (rp.pdfTitle || '').toLowerCase();
    const course = (rp.courseTitle || '').toLowerCase();
    const query = readingSearch.toLowerCase();
    const matchesSearch = !readingSearch || title.includes(query) || course.includes(query);
    return matchesFilter && matchesSearch;
  });

  const tabList = [
    { id: 'overview', label: '📊 Performance Overview', count: warnings.length ? `${warnings.length} flags` : null },
    { id: 'attendance', label: `📅 Attendance (${attendance.rate}%)`, count: attendance.rate < 75 ? '⚠️' : null },
    { id: 'quizzes', label: `🎯 Quizzes (${quizzes.history.length})`, count: quizzes.totalAttempted },
    { id: 'assignments', label: `📝 Assignments (${assignments.submissions.length})`, count: assignments.totalMissing > 0 ? `${assignments.totalMissing} missing` : null },
    { id: 'reading', label: `📖 Reading Progress (${reading.progressList.length})`, count: reading.completedPdfs }
  ];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 sm:p-6 md:p-7 text-slate-800 dark:text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 rounded-t-3xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-20 border border-slate-200/80 dark:border-slate-700 shadow-xs"
          title="Close details"
        >
          <FaTimes className="text-sm" />
        </button>

        {/* Header / Student Identity */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0 pr-8 sm:pr-0">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-700 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-md overflow-hidden">
              {student?.profilePicture ? (
                <img
                  src={getMediaUrl(student.profilePicture)}
                  alt={student.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                student?.name?.charAt(0).toUpperCase() || '🎓'
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                  {student?.name || 'Student Performance'}
                </h3>
                {getRiskBadge()}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <span className="font-mono bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md font-bold">
                  {student?.registrationNumber || 'N/A'}
                </span>
                <span>•</span>
                <span>🎓 {student?.grade || 'Grade 10'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {student?.studentType === 'physical' ? (
                    <>
                      <FaSchool className="text-indigo-500" /> Physical Student
                    </>
                  ) : (
                    <>
                      <FaLaptop className="text-purple-500" /> Online Student
                    </>
                  )}
                </span>
                {activity.daysSinceLastActivity < 999 && (
                  <>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <FaClock className="text-slate-400" />
                      Active {activity.daysSinceLastActivity === 0 ? 'today' : `${activity.daysSinceLastActivity}d ago`}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-2 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
          {tabList.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={`group px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/25 ring-2 ring-purple-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div ref={contentScrollRef} className="flex-1 overflow-y-auto pr-1 py-4 space-y-5">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
              <p className="text-xs font-bold text-slate-500 animate-pulse">Evaluating student performance metrics...</p>
            </div>
          ) : error ? (
            <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
              {error}
            </div>
          ) : (
            <>
              {/* ============================================================== */}
              {/* OVERVIEW TAB */}
              {/* ============================================================== */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Active Early Warning Indicators Section */}
                  {warnings.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FaExclamationTriangle className="text-amber-500" /> Active Early Warning Indicators ({warnings.length})
                        </h4>
                        <span className="text-[11px] font-semibold text-slate-500">
                          Click any indicator to review detailed logs
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {warnings.map((warn, idx) => {
                          const targetTab = getJumpCategoryTab(warn.category);
                          return (
                            <div
                              key={idx}
                              className={`p-4 rounded-2xl border transition-all ${
                                warn.severity === 'high'
                                  ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                                  : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <span className={`text-xs font-black uppercase tracking-wide px-2.5 py-0.5 rounded-lg ${
                                  warn.severity === 'high'
                                    ? 'bg-red-200 dark:bg-red-900 text-red-800 dark:text-red-200'
                                    : 'bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200'
                                }`}>
                                  {warn.category}
                                </span>
                                <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300">
                                  Metric: {warn.metric}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                                {warn.reason}
                              </p>
                              {warn.action && (
                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                                  <FaInfoCircle className="text-purple-500 shrink-0 mt-0.5" />
                                  <span><strong className="text-slate-800 dark:text-slate-200">Recommended Action:</strong> {warn.action}</span>
                                </div>
                              )}
                              <div className="mt-2 pt-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => switchTab(targetTab)}
                                  className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 flex items-center gap-1 cursor-pointer transition hover:underline"
                                >
                                  Open {targetTab.charAt(0).toUpperCase() + targetTab.slice(1)} Tab <FaArrowRight className="text-[9px]" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                        <FaCheckCircle />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                          All Clear — No Early Warning Alerts Detected
                        </h4>
                        <p className="text-xs text-emerald-700/90 dark:text-emerald-400/90">
                          This student is meeting attendance standards, completing coursework on schedule, and actively engaging with materials.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Key Metrics Grid - Interactive Clickable Cards */}
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                      Key Academic Performance Metrics
                    </h4>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {/* Attendance Card */}
                      <div
                        onClick={() => switchTab('attendance')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 space-y-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] group"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>Attendance</span>
                          <FaCalendarCheck className={attendance.rate >= 75 ? "text-emerald-500" : "text-red-500"} />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className={`text-2xl font-black ${attendance.rate >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {attendance.rate}%
                          </span>
                          <span className="text-[11px] text-slate-500">Benchmark: 75%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${attendance.rate >= 75 ? "bg-emerald-500" : "bg-red-500"}`}
                            style={{ width: `${Math.min(100, attendance.rate)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>{attendance.present} / {attendance.total} sessions</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            View <FaArrowRight className="text-[9px]" />
                          </span>
                        </div>
                      </div>

                      {/* Quiz Marks Card */}
                      <div
                        onClick={() => switchTab('quizzes')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 space-y-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] group"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>Quiz Performance</span>
                          <FaClipboardList className="text-amber-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {quizzes.averagePercentage}%
                          </span>
                          <span className="text-[11px] text-slate-500">{quizzes.totalAttempted} Attempted</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, quizzes.averagePercentage)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>{quizzes.history.filter(q => q.isPassed).length} passed</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            View <FaArrowRight className="text-[9px]" />
                          </span>
                        </div>
                      </div>

                      {/* Assignment Card */}
                      <div
                        onClick={() => switchTab('assignments')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 space-y-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] group"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>Assignments</span>
                          <FaClipboardCheck className={assignments.totalMissing > 0 ? "text-orange-500" : "text-indigo-500"} />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {assignments.totalSubmitted}
                          </span>
                          <span className="text-[11px] text-slate-500">of {assignments.totalAssigned} Tasks</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                            style={{ width: `${assignments.totalAssigned > 0 ? Math.round((assignments.totalSubmitted / assignments.totalAssigned) * 100) : 0}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-medium">
                          <span className={assignments.totalMissing > 0 ? "text-orange-600 dark:text-orange-400 font-bold" : "text-slate-500"}>
                            {assignments.totalMissing > 0 ? `⚠️ ${assignments.totalMissing} Missing` : 'All tasks in'}
                          </span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            View <FaArrowRight className="text-[9px]" />
                          </span>
                        </div>
                      </div>

                      {/* Reading Progress Card */}
                      <div
                        onClick={() => switchTab('reading')}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 space-y-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.01] group"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                          <span>Reading Progress</span>
                          <FaBookOpen className="text-purple-500" />
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-black text-slate-900 dark:text-white">
                            {reading.averageProgress}%
                          </span>
                          <span className="text-[11px] text-slate-500">{reading.completedPdfs} Completed</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, reading.averageProgress)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                          <span>{reading.totalPdfs} Study PDFs</span>
                          <span className="text-purple-600 dark:text-purple-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            View <FaArrowRight className="text-[9px]" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quiz Score History & Trend Chart */}
                  {quizzes.history.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <FaChartLine className="text-purple-500" /> Quiz Assessment Trend (Chronological)
                        </h4>
                        <span className="text-[11px] text-slate-500 font-semibold">
                          Recent {quizzes.history.length} assessment attempts
                        </span>
                      </div>

                      <div className="pt-2 pb-1 flex items-end gap-3 h-36 overflow-x-auto no-scrollbar">
                        {quizzes.history.map((q, idx) => (
                          <div key={idx} className="flex-1 min-w-[60px] max-w-[100px] flex flex-col items-center gap-1.5 h-full justify-end group">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform">
                              {q.percentage}%
                            </span>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-lg h-24 flex items-end overflow-hidden">
                              <div
                                className={`w-full rounded-t-lg transition-all duration-500 ${
                                  q.isPassed
                                    ? 'bg-gradient-to-t from-purple-600 to-indigo-500 group-hover:from-purple-500 group-hover:to-indigo-400'
                                    : 'bg-gradient-to-t from-red-600 to-rose-400'
                                }`}
                                style={{ height: `${Math.max(8, q.percentage)}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-500 truncate w-full text-center" title={q.quizTitle}>
                              Q{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quick Action Reminders & Parent Contact */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <h5 className="font-extrabold text-purple-900 dark:text-purple-200">Academic Recommendation</h5>
                      <p className="text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                        {warnings.length > 0
                          ? `Student requires targeted intervention across ${warnings.length} academic area(s). Review specific logs via the buttons above.`
                          : "Student performance is optimal. Encourage continued focus and participation."}
                      </p>
                    </div>
                    {student?.parentsPhoneNumber && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(student.parentsPhoneNumber)}
                          className="px-3 py-1.5 bg-purple-900 hover:bg-purple-800 text-white rounded-xl font-bold font-mono text-[11px] flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                          title="Click to copy phone number"
                        >
                          <FaPhoneAlt className="text-[10px]" /> {student.parentsPhoneNumber}
                          {copiedPhone ? <FaCheck className="text-emerald-400" /> : <FaCopy className="text-purple-300 text-[10px]" />}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* ATTENDANCE TAB */}
              {/* ============================================================== */}
              {activeTab === 'attendance' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Contextual Warning */}
                  {attendanceWarnings.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                      <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5 text-base" />
                      <div className="text-xs space-y-1">
                        <span className="font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide text-[11px]">
                          Attendance Warning Active ({attendanceWarnings.length})
                        </span>
                        {attendanceWarnings.map((w, i) => (
                          <p key={i} className="text-amber-800 dark:text-amber-300 font-medium">
                            {w.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attendance Stats Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Present</span>
                      <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">{attendance.present}</span>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Late</span>
                      <span className="text-xl font-black text-amber-800 dark:text-amber-200">{attendance.late}</span>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-300 block">Absent</span>
                      <span className="text-xl font-black text-red-800 dark:text-red-200">{attendance.absent}</span>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Attendance Rate</span>
                      <span className="text-xl font-black text-purple-800 dark:text-purple-200">{attendance.rate}%</span>
                    </div>
                  </div>

                  {/* Attendance Threshold Progress Bar */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        Attendance Rate Benchmark Comparison
                      </span>
                      <span className="font-mono font-bold text-slate-500">
                        Mandatory Benchmark: 75%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${attendance.rate >= 75 ? "bg-emerald-500" : "bg-red-500"}`}
                        style={{ width: `${Math.min(100, attendance.rate)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {attendance.rate >= 75
                        ? `✓ Student is compliant with the attendance minimum standard (${attendance.present} of ${attendance.total} sessions).`
                        : `⚠️ Student attendance is ${75 - attendance.rate}% below the minimum 75% threshold.`}
                    </p>
                  </div>

                  {/* Controls: Search and Status Filter */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {['all', 'Present', 'Late', 'Absent'].map(status => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setAttendanceFilter(status)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            attendanceFilter === status
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {status === 'all' ? `All (${attendance.total})` : `${status} (${status === 'Present' ? attendance.present : status === 'Late' ? attendance.late : attendance.absent})`}
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-[200px]">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input
                        type="text"
                        placeholder="Search sessions..."
                        value={attendanceSearch}
                        onChange={(e) => setAttendanceSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Log List */}
                  <div className="space-y-2">
                    {filteredAttendanceLogs.length > 0 ? (
                      filteredAttendanceLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs hover:border-purple-300 dark:hover:border-purple-700/60 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${
                              log.status === 'Present' ? 'bg-emerald-500' : log.status === 'Late' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white text-xs">
                                {log.courseId?.title || log.remarks || 'Class Session'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                <span>
                                  {new Date(log.date || log.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                {log.mode && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-[10px] bg-slate-200/70 dark:bg-slate-700/60 px-1.5 py-0.2 rounded text-slate-600 dark:text-slate-300">
                                      {log.mode.replace(/_/g, ' ')}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] shrink-0 ${
                            log.status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : log.status === 'Late'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
                          }`}>
                            {log.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                        {attendanceSearch || attendanceFilter !== 'all'
                          ? "No attendance check-in logs match your filter."
                          : "No attendance check-in logs recorded yet."}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* QUIZZES TAB */}
              {/* ============================================================== */}
              {activeTab === 'quizzes' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Contextual Warning */}
                  {quizWarnings.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                      <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5 text-base" />
                      <div className="text-xs space-y-1">
                        <span className="font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide text-[11px]">
                          Quiz Performance Warning ({quizWarnings.length})
                        </span>
                        {quizWarnings.map((w, i) => (
                          <p key={i} className="text-amber-800 dark:text-amber-300 font-medium">
                            {w.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quizzes Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Total Attempted</span>
                      <span className="text-xl font-black text-purple-800 dark:text-purple-200">{quizzes.totalAttempted}</span>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">Average Score</span>
                      <span className="text-xl font-black text-indigo-800 dark:text-indigo-200">{quizzes.averagePercentage}%</span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Passed</span>
                      <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">
                        {quizzes.history.filter(q => q.isPassed).length}
                      </span>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-red-700 dark:text-red-300 block">Below Benchmark</span>
                      <span className="text-xl font-black text-red-800 dark:text-red-200">
                        {quizzes.history.filter(q => !q.isPassed).length}
                      </span>
                    </div>
                  </div>

                  {/* Quizzes Trend Chart */}
                  {quizzes.history.length > 0 && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <FaChartLine className="text-purple-500" /> Score Progression
                        </span>
                        <span className="text-slate-500 font-medium text-[11px]">Chronological assessment progression</span>
                      </div>
                      <div className="pt-2 pb-1 flex items-end gap-3 h-28 overflow-x-auto no-scrollbar">
                        {quizzes.history.map((q, idx) => (
                          <div key={idx} className="flex-1 min-w-[50px] max-w-[80px] flex flex-col items-center gap-1 h-full justify-end group">
                            <span className="text-[10px] font-black text-slate-700 dark:text-slate-200">
                              {q.percentage}%
                            </span>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-t-md h-18 flex items-end overflow-hidden">
                              <div
                                className={`w-full rounded-t-md transition-all duration-500 ${
                                  q.isPassed ? 'bg-purple-600' : 'bg-red-500'
                                }`}
                                style={{ height: `${Math.max(10, q.percentage)}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 truncate w-full text-center">
                              Q{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: `All (${quizzes.history.length})` },
                        { id: 'passed', label: `Passed (${quizzes.history.filter(q => q.isPassed).length})` },
                        { id: 'failed', label: `Below Benchmark (${quizzes.history.filter(q => !q.isPassed).length})` }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setQuizFilter(f.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            quizFilter === f.id
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-[200px]">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input
                        type="text"
                        placeholder="Search quizzes or courses..."
                        value={quizSearch}
                        onChange={(e) => setQuizSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Quiz Cards */}
                  <div className="space-y-2.5">
                    {filteredQuizzes.length > 0 ? (
                      filteredQuizzes.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2.5 text-xs hover:border-purple-300 dark:hover:border-purple-700/60 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-black text-slate-900 dark:text-white text-sm block">
                                {q.quizTitle}
                              </span>
                              <div className="flex items-center gap-2 text-slate-500 text-[11px] mt-0.5">
                                <span>{q.courseTitle}</span>
                                <span>•</span>
                                <span>{new Date(q.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs shrink-0 ${
                              q.isPassed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            }`}>
                              {q.isPassed ? 'Passed ✓' : 'Below Benchmark'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${q.isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, q.percentage)}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-slate-800 dark:text-white shrink-0 text-xs">
                              {q.score} / {q.totalPoints} ({q.percentage}%)
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                            <span>Passing Standard: {q.passingPercentage}%</span>
                            <span className={q.percentage >= q.passingPercentage ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
                              {q.percentage >= q.passingPercentage ? `+${q.percentage - q.passingPercentage}% over standard` : `${q.percentage - q.passingPercentage}% under standard`}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                        {quizSearch || quizFilter !== 'all'
                          ? "No quiz assessment records match your filter."
                          : "No quiz assessments completed yet."}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* ASSIGNMENTS TAB */}
              {/* ============================================================== */}
              {activeTab === 'assignments' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Contextual Warning */}
                  {assignmentWarnings.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                      <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5 text-base" />
                      <div className="text-xs space-y-1">
                        <span className="font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide text-[11px]">
                          Assignment Warning Active ({assignmentWarnings.length})
                        </span>
                        {assignmentWarnings.map((w, i) => (
                          <p key={i} className="text-amber-800 dark:text-amber-300 font-medium">
                            {w.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Assignments Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">Total Tasks</span>
                      <span className="text-xl font-black text-indigo-800 dark:text-indigo-200">{assignments.totalAssigned}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Submitted</span>
                      <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">{assignments.totalSubmitted}</span>
                    </div>
                    <div className="p-3 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-orange-700 dark:text-orange-300 block">Missing / Overdue</span>
                      <span className="text-xl font-black text-orange-800 dark:text-orange-200">{assignments.totalMissing}</span>
                    </div>
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Graded Average</span>
                      <span className="text-xl font-black text-purple-800 dark:text-purple-200">{assignments.averageMarks}%</span>
                    </div>
                  </div>

                  {/* Overdue / Missing Alert Box */}
                  {assignments.missing && assignments.missing.length > 0 && (
                    <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 space-y-2.5">
                      <h5 className="text-xs font-black uppercase text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                        <FaExclamationTriangle /> Overdue Missing Coursework Tasks ({assignments.missing.length})
                      </h5>
                      <div className="space-y-1.5">
                        {assignments.missing.map((asgn, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-orange-900 dark:text-orange-200 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-orange-200/60 dark:border-orange-800/40">
                            <div>
                              <strong className="block text-slate-900 dark:text-white">{asgn.title}</strong>
                              <span className="text-[11px] opacity-80">{asgn.courseTitle}</span>
                            </div>
                            <span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-900 text-orange-900 dark:text-orange-100 rounded-md font-bold text-[10px]">
                              {asgn.dueDate ? `Due ${new Date(asgn.dueDate).toLocaleDateString()}` : 'Missing Submission'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: `All (${assignments.submissions.length})` },
                        { id: 'graded', label: `Graded (${assignments.submissions.filter(s => s.status === 'graded').length})` },
                        { id: 'pending', label: `Awaiting Grading (${assignments.submissions.filter(s => s.status !== 'graded').length})` }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setAssignmentFilter(f.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            assignmentFilter === f.id
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-[200px]">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input
                        type="text"
                        placeholder="Search assignments..."
                        value={assignmentSearch}
                        onChange={(e) => setAssignmentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Submissions List */}
                  <div className="space-y-2.5">
                    {filteredAssignments.length > 0 ? (
                      filteredAssignments.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2.5 hover:border-purple-300 dark:hover:border-purple-700/60 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-black text-slate-900 dark:text-white text-sm block">
                                {sub.assignmentTitle}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{sub.courseTitle}</span>
                                <span>•</span>
                                <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                                {sub.isLate && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold text-[10px]">
                                    Late
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] shrink-0 ${
                              sub.status === 'graded'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}>
                              {sub.status === 'graded' ? 'Graded ✓' : 'Awaiting Grading'}
                            </span>
                          </div>

                          {sub.status === 'graded' && sub.marks !== null && (
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Score: <strong className="text-slate-900 dark:text-white">{sub.marks} / {sub.maxMarks}</strong> ({sub.percentage}%)
                                </span>
                                <span className={`font-bold ${sub.isPassed ? "text-emerald-600" : "text-red-500"}`}>
                                  {sub.isPassed ? "Passed ✓" : "Needs Retake"}
                                </span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${sub.isPassed ? "bg-emerald-500" : "bg-red-500"}`}
                                  style={{ width: `${Math.min(100, sub.percentage)}%` }}
                                />
                              </div>
                              {sub.feedback && (
                                <p className="text-[11px] text-slate-500 italic bg-white/60 dark:bg-slate-900/40 p-2 rounded-lg border border-slate-200/50 dark:border-slate-800/60">
                                  Feedback: "{sub.feedback}"
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                        {assignmentSearch || assignmentFilter !== 'all'
                          ? "No coursework submissions match your filter."
                          : "No coursework submissions uploaded yet."}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* READING PROGRESS TAB */}
              {/* ============================================================== */}
              {activeTab === 'reading' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  {/* Contextual Warning */}
                  {readingWarnings.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-3">
                      <FaExclamationTriangle className="text-amber-500 shrink-0 mt-0.5 text-base" />
                      <div className="text-xs space-y-1">
                        <span className="font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide text-[11px]">
                          Study Activity Notice ({readingWarnings.length})
                        </span>
                        {readingWarnings.map((w, i) => (
                          <p key={i} className="text-amber-800 dark:text-amber-300 font-medium">
                            {w.reason}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reading Summary Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 block">Total PDFs Tracked</span>
                      <span className="text-xl font-black text-purple-800 dark:text-purple-200">{reading.totalPdfs}</span>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 block">Completed Materials</span>
                      <span className="text-xl font-black text-emerald-800 dark:text-emerald-200">{reading.completedPdfs}</span>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block">In Progress</span>
                      <span className="text-xl font-black text-indigo-800 dark:text-indigo-200">
                        {Math.max(0, reading.totalPdfs - reading.completedPdfs)}
                      </span>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-center">
                      <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block">Average Progress</span>
                      <span className="text-xl font-black text-amber-800 dark:text-amber-200">{reading.averageProgress}%</span>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                      {[
                        { id: 'all', label: `All (${reading.progressList.length})` },
                        { id: 'completed', label: `Completed (${reading.completedPdfs})` },
                        { id: 'inprogress', label: `In Progress (${Math.max(0, reading.progressList.length - reading.completedPdfs)})` }
                      ].map(f => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setReadingFilter(f.id)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                            readingFilter === f.id
                              ? 'bg-purple-600 text-white shadow-xs'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="relative min-w-[200px]">
                      <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
                      <input
                        type="text"
                        placeholder="Search reading materials..."
                        value={readingSearch}
                        onChange={(e) => setReadingSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* Material Cards */}
                  <div className="space-y-2.5">
                    {filteredReading.length > 0 ? (
                      filteredReading.map((rp, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2.5 hover:border-purple-300 dark:hover:border-purple-700/60 transition"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-black text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <FaFileAlt className="text-purple-500 shrink-0" /> {rp.pdfTitle}
                              </span>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                <span>{rp.courseTitle}</span>
                                <span>•</span>
                                <span>Pages read: {rp.maxPageRead} / {rp.totalPages}</span>
                                {rp.lastReadAt && (
                                  <>
                                    <span>•</span>
                                    <span>Last opened {new Date(rp.lastReadAt).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] shrink-0 ${
                              rp.isCompleted
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                            }`}>
                              {rp.isCompleted ? 'Completed ✓' : `${rp.progressPercentage}% Read`}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  rp.isCompleted ? 'bg-emerald-500' : 'bg-purple-600'
                                }`}
                                style={{ width: `${Math.min(100, rp.progressPercentage)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-400 font-medium">
                              <span>0%</span>
                              <span>{rp.progressPercentage}% Completed</span>
                              <span>100%</span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                        {readingSearch || readingFilter !== 'all'
                          ? "No study PDF materials match your filter."
                          : "No study materials or reading logs recorded yet."}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
            Student Analytics & Early Intervention System
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceModal;
