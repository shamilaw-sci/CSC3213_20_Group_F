import React, { useState, useEffect } from 'react';
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
  FaArrowDown,
  FaArrowUp,
  FaInfoCircle,
  FaExternalLinkAlt,
  FaChartLine,
  FaShieldAlt,
  FaFileAlt
} from 'react-icons/fa';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { getMediaUrl } from '../utils/mediaUrl';

const StudentPerformanceModal = ({ isOpen, onClose, studentId, initialStudent = null }) => {
  const { isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'attendance' | 'quizzes' | 'assignments' | 'reading'

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      setError(null);
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
  }, [isOpen, studentId]);

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

  const getRiskBadge = () => {
    if (riskLevel === 'HIGH') {
      return (
        <span className="px-3 py-1 bg-red-500/20 text-red-700 dark:text-red-400 border border-red-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
          <FaExclamationTriangle className="text-red-600 dark:text-red-400" /> High Academic Attention
        </span>
      );
    }
    if (riskLevel === 'MEDIUM') {
      return (
        <span className="px-3 py-1 bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
          <FaExclamationTriangle className="text-amber-600 dark:text-amber-400" /> Needs Academic Support
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
        <FaCheckCircle className="text-emerald-600 dark:text-emerald-400" /> Good Academic Standing
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-7 text-slate-800 dark:text-white animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden"
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-700 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-md">
              {student?.profilePicture ? (
                <img
                  src={getMediaUrl(student.profilePicture)}
                  alt={student.name}
                  className="w-full h-full object-cover rounded-2xl"
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
                  {student?.registrationNumber || 'No Reg No'}
                </span>
                <span>•</span>
                <span>🎓 {student?.grade || 'Grade'}</span>
                <span>•</span>
                <span>{student?.studentType === 'online' ? '💻 Online Student' : '🏫 Physical Student'}</span>
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
        <div className="flex items-center gap-2 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: '📊 Performance Overview' },
            { id: 'attendance', label: `📅 Attendance (${attendance.rate}%)` },
            { id: 'quizzes', label: `🎯 Quizzes (${quizzes.history.length})` },
            { id: 'assignments', label: `📝 Assignments (${assignments.submissions.length})` },
            { id: 'reading', label: `📖 Reading Progress (${reading.progressList.length})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 py-4 space-y-5">
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
              {/* Active Warning Alerts Banner */}
              {warnings.length > 0 ? (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <FaExclamationTriangle className="text-amber-500" /> Active Early Warning Indicators ({warnings.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {warnings.map((warn, idx) => (
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
                          <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-1.5">
                            <FaInfoCircle className="text-purple-500 shrink-0 mt-0.5" />
                            <span><strong className="text-slate-800 dark:text-slate-200">Recommended Action:</strong> {warn.action}</span>
                          </div>
                        )}
                      </div>
                    ))}
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
                      This student is consistently meeting attendance standards, completing homework on schedule, and actively participating in coursework.
                    </p>
                  </div>
                </div>
              )}

              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && (
                <div className="space-y-5 animate-fadeIn">
                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Attendance Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
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
                      <p className="text-[11px] text-slate-500 font-medium">
                        {attendance.present} present / {attendance.total} sessions
                      </p>
                    </div>

                    {/* Quiz Marks Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
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
                      <p className="text-[11px] text-slate-500 font-medium">
                        {quizzes.history.filter(q => q.isPassed).length} passed benchmark
                      </p>
                    </div>

                    {/* Assignment Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
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
                      <p className={`text-[11px] font-medium ${assignments.totalMissing > 0 ? "text-orange-600 dark:text-orange-400 font-bold" : "text-slate-500"}`}>
                        {assignments.totalMissing > 0 ? `⚠️ ${assignments.totalMissing} Missing` : 'All tasks submitted'}
                      </p>
                    </div>

                    {/* Reading Progress Card */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
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
                      <p className="text-[11px] text-slate-500 font-medium">
                        {reading.totalPdfs} Study PDFs tracked
                      </p>
                    </div>
                  </div>

                  {/* Simple Visual Score History & Trend Chart */}
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

                      {/* Bar Visualization of Quiz Scores */}
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

                  {/* Quick Action Reminders */}
                  <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <h5 className="font-extrabold text-purple-900 dark:text-purple-200">Academic Recommendation</h5>
                      <p className="text-purple-800/80 dark:text-purple-300/80 mt-0.5">
                        {warnings.length > 0
                          ? `Student requires targeted intervention across ${warnings.length} academic area(s). Review specific logs in the tabs above.`
                          : "Student performance is optimal. Encourage continued focus and participation."}
                      </p>
                    </div>
                    {student?.parentsPhoneNumber && (
                      <span className="px-3 py-1.5 bg-purple-900 text-white rounded-xl font-bold shrink-0 font-mono text-[11px]">
                        📞 Parent: {student.parentsPhoneNumber}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* ATTENDANCE TAB */}
              {activeTab === 'attendance' && (
                <div className="space-y-4 animate-fadeIn">
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

                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 pt-2">
                    Recent Attendance Check-in Logs ({data?.attendanceLogs?.length || 0})
                  </h5>

                  <div className="space-y-2">
                    {data?.attendanceLogs && data.attendanceLogs.length > 0 ? (
                      data.attendanceLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${
                              log.status === 'Present' ? 'bg-emerald-500' : log.status === 'Late' ? 'bg-amber-500' : 'bg-red-500'
                            }`} />
                            <div>
                              <p className="font-bold text-slate-800 dark:text-white">
                                {log.courseId?.title || log.remarks || 'Class Session'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {new Date(log.date || log.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
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
                      <p className="text-xs text-slate-400 italic py-4 text-center">No attendance sessions recorded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* QUIZZES TAB */}
              {activeTab === 'quizzes' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Quiz Performance History</h4>
                      <p className="text-xs text-slate-500">Attempted assessments, scores, and pass benchmarks</p>
                    </div>
                    <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-xl">
                      Average: {quizzes.averagePercentage}%
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {quizzes.history.length > 0 ? (
                      quizzes.history.map((q, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                              {q.quizTitle}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${
                              q.isPassed
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                            }`}>
                              {q.isPassed ? 'Passed ✓' : 'Below Benchmark'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-slate-500 text-[11px]">
                            <span>{q.courseTitle}</span>
                            <span>{new Date(q.completedAt).toLocaleDateString()}</span>
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${q.isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}
                                style={{ width: `${Math.min(100, q.percentage)}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-800 dark:text-white shrink-0">
                              {q.score} / {q.totalPoints} ({q.percentage}%)
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-6 text-center">No quiz assessments completed yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* ASSIGNMENTS TAB */}
              {activeTab === 'assignments' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Missing Assignments Warning Highlight */}
                  {assignments.missing && assignments.missing.length > 0 && (
                    <div className="p-4 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 space-y-2">
                      <h5 className="text-xs font-black uppercase text-orange-800 dark:text-orange-300 flex items-center gap-1.5">
                        <FaExclamationTriangle /> Overdue Missing Assignments ({assignments.missing.length})
                      </h5>
                      <div className="space-y-1.5">
                        {assignments.missing.map((asgn, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs text-orange-900 dark:text-orange-200 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-orange-200/60 dark:border-orange-800/40">
                            <div>
                              <strong className="block">{asgn.title}</strong>
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

                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Submitted Coursework Solutions ({assignments.submissions.length})
                  </h5>

                  <div className="space-y-2.5">
                    {assignments.submissions.length > 0 ? (
                      assignments.submissions.map((sub, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 dark:text-white">
                              {sub.assignmentTitle}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              sub.status === 'graded'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                            }`}>
                              {sub.status === 'graded' ? 'Graded ✓' : 'Awaiting Grading'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{sub.courseTitle}</span>
                            <span>Submitted: {new Date(sub.submittedAt).toLocaleDateString()}</span>
                          </div>

                          {sub.status === 'graded' && sub.marks !== null && (
                            <div className="pt-1 flex items-center justify-between border-t border-slate-200/60 dark:border-slate-700/60">
                              <span className="text-slate-600 dark:text-slate-400">
                                Score: <strong className="text-slate-900 dark:text-white">{sub.marks} / {sub.maxMarks}</strong> ({sub.percentage}%)
                              </span>
                              {sub.feedback && (
                                <span className="text-slate-500 italic truncate max-w-xs">"{sub.feedback}"</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-4 text-center">No assignments submitted yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* READING PROGRESS TAB */}
              {activeTab === 'reading' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">In-App Study Material Progress</h4>
                      <p className="text-xs text-slate-500">Lecture notes and reading material completion rates</p>
                    </div>
                    <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-3 py-1 rounded-xl">
                      {reading.completedPdfs} / {reading.totalPdfs} Completed
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {reading.progressList.length > 0 ? (
                      reading.progressList.map((rp, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                              <FaFileAlt className="text-purple-500" /> {rp.pdfTitle}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-md font-bold text-[11px] ${
                              rp.isCompleted
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                                : 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300'
                            }`}>
                              {rp.isCompleted ? 'Completed ✓' : `${rp.progressPercentage}% Read`}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500">
                            <span>{rp.courseTitle}</span>
                            <span>Pages: {rp.maxPageRead} / {rp.totalPages}</span>
                          </div>

                          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, rp.progressPercentage)}%` }}
                            />
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400 italic py-6 text-center">No PDF reading activity recorded yet.</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
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
