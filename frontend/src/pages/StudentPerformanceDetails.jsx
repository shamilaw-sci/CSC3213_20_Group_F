import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaCheckCircle,
  FaCalendarCheck,
  FaClipboardList,
  FaClipboardCheck,
  FaBookOpen,
  FaClock,
  FaUserGraduate,
  FaChartLine,
  FaFileAlt,
  FaInfoCircle
} from 'react-icons/fa';
import api from '../utils/api';
import { getMediaUrl } from '../utils/mediaUrl';

const StudentPerformanceDetails = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (studentId) {
      setLoading(true);
      setError(null);
      api.get(`/early-warning/student/${studentId}`)
        .then(res => {
          if (res.data && res.data.data) {
            setData(res.data.data);
          }
        })
        .catch(err => {
          console.error("Error fetching performance details:", err);
          setError(err.response?.data?.error || "Failed to load student performance details.");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [studentId]);

  const student = data?.student;
  const warnings = data?.warnings || [];
  const metrics = data?.metrics || {};
  const riskLevel = data?.riskLevel || 'NONE';

  const attendance = metrics.attendance || { total: 0, present: 0, absent: 0, late: 0, rate: 0 };
  const quizzes = metrics.quizzes || { totalAttempted: 0, averagePercentage: 0, history: [] };
  const assignments = metrics.assignments || { totalAssigned: 0, totalSubmitted: 0, totalMissing: 0, averageMarks: 0, submissions: [], missing: [] };
  const reading = metrics.reading || { totalPdfs: 0, completedPdfs: 0, averageProgress: 0, progressList: [] };

  return (
    <div className="min-h-screen p-4 sm:p-8 space-y-6 max-w-6xl mx-auto animate-fadeIn">
      {/* Top Header with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition cursor-pointer"
        >
          <FaArrowLeft /> Back to Dashboard
        </button>
        <div className="text-xs font-mono font-bold text-slate-500">
          ID: {studentId}
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
          <p className="text-sm font-bold text-slate-500 animate-pulse">Evaluating learning analytics & warning flags...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      ) : (
        <>
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-purple-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 rounded-3xl border border-purple-900/40 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-black shrink-0 shadow-lg">
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
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{student?.name}</h1>
                  {riskLevel === 'HIGH' ? (
                    <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/40 rounded-full text-xs font-black uppercase">
                      ⚠️ High Attention Needed
                    </span>
                  ) : riskLevel === 'MEDIUM' ? (
                    <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full text-xs font-black uppercase">
                      ⚠️ Needs Support
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-black uppercase">
                      ✓ Good Standing
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-purple-200 font-medium">
                  <span className="font-mono bg-white/10 px-2 py-0.5 rounded font-bold">
                    {student?.registrationNumber || 'No Reg No'}
                  </span>
                  <span>•</span>
                  <span>🎓 {student?.grade}</span>
                  <span>•</span>
                  <span>{student?.studentType === 'online' ? '💻 Online Student' : '🏫 Physical Student'}</span>
                  {student?.parentsPhoneNumber && (
                    <>
                      <span>•</span>
                      <span>📞 Parent: {student.parentsPhoneNumber}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Active Warnings Cards */}
          {warnings.length > 0 ? (
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <FaExclamationTriangle className="text-amber-500" /> Active Warning Indicators ({warnings.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warnings.map((w, idx) => (
                  <div
                    key={idx}
                    className={`p-5 rounded-2xl border ${
                      w.severity === 'high'
                        ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                        : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-black uppercase px-2.5 py-0.5 rounded-lg ${
                        w.severity === 'high'
                          ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
                          : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
                      }`}>
                        {w.category}
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                        Trigger: {w.metric}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {w.reason}
                    </p>
                    {w.action && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                        <FaInfoCircle className="text-purple-500 shrink-0 mt-0.5" />
                        <span><strong>Recommended Action:</strong> {w.action}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-2xl shrink-0 shadow-xs">
                <FaCheckCircle />
              </div>
              <div>
                <h4 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                  Optimal Academic Health — No Warnings Active
                </h4>
                <p className="text-xs sm:text-sm text-emerald-800/80 dark:text-emerald-300/80">
                  Student is actively engaged, maintaining acceptable attendance rate, and successfully completing assessment benchmarks.
                </p>
              </div>
            </div>
          )}

          {/* 4 Performance Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase text-slate-500">Attendance Rate</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{attendance.rate}%</div>
              <p className="text-xs text-slate-500">{attendance.present} present / {attendance.total} sessions</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase text-slate-500">Quiz Assessment Avg</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{quizzes.averagePercentage}%</div>
              <p className="text-xs text-slate-500">{quizzes.totalAttempted} assessments completed</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase text-slate-500">Homework Submissions</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{assignments.totalSubmitted}</div>
              <p className="text-xs text-slate-500">{assignments.totalMissing} missing or overdue</p>
            </div>
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
              <span className="text-xs font-bold uppercase text-slate-500">Reading Progress</span>
              <div className="text-3xl font-black text-slate-900 dark:text-white">{reading.averageProgress}%</div>
              <p className="text-xs text-slate-500">{reading.completedPdfs} of {reading.totalPdfs} PDFs finished</p>
            </div>
          </div>

          {/* Detailed Section Tabs */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 overflow-x-auto no-scrollbar">
              {[
                { id: 'overview', label: '📊 Quiz Score History & Trend' },
                { id: 'attendance', label: `📅 Attendance Logs (${attendance.total})` },
                { id: 'quizzes', label: `🎯 Quiz Records (${quizzes.history.length})` },
                { id: 'assignments', label: `📝 Assignments (${assignments.submissions.length})` },
                { id: 'reading', label: `📖 Study Materials (${reading.progressList.length})` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeTab === t.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: QUIZ TREND OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaChartLine className="text-purple-500" /> Chronological Quiz Score Progression
                </h4>
                {quizzes.history.length > 0 ? (
                  <div className="pt-2 pb-1 flex items-end gap-4 h-44 overflow-x-auto no-scrollbar border-b border-slate-100 dark:border-slate-800">
                    {quizzes.history.map((q, idx) => (
                      <div key={idx} className="flex-1 min-w-[70px] max-w-[120px] flex flex-col items-center gap-1.5 h-full justify-end group">
                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                          {q.percentage}%
                        </span>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-t-xl h-28 flex items-end overflow-hidden">
                          <div
                            className={`w-full rounded-t-xl transition-all duration-500 ${
                              q.isPassed
                                ? 'bg-gradient-to-t from-purple-600 to-indigo-500'
                                : 'bg-gradient-to-t from-red-600 to-rose-400'
                            }`}
                            style={{ height: `${Math.max(10, q.percentage)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 truncate w-full text-center" title={q.quizTitle}>
                          {q.quizTitle}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-6 text-center">No quiz assessments completed yet.</p>
                )}
              </div>
            )}

            {/* TAB CONTENT: ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Recent Attendance Logs</h4>
                <div className="space-y-2">
                  {data?.attendanceLogs && data.attendanceLogs.length > 0 ? (
                    data.attendanceLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="block text-slate-900 dark:text-white">{log.courseId?.title || log.remarks || 'Class Check-in'}</strong>
                          <span className="text-[11px] text-slate-400">{new Date(log.date || log.createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-3 py-1 rounded-full font-bold text-xs ${
                          log.status === 'Present'
                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                            : log.status === 'Late'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                            : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No attendance logs found.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: QUIZZES */}
            {activeTab === 'quizzes' && (
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Completed Quiz Assessments</h4>
                <div className="space-y-2.5">
                  {quizzes.history.length > 0 ? (
                    quizzes.history.map((q, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-sm text-slate-900 dark:text-white block">{q.quizTitle}</strong>
                          <span className="text-[11px] text-slate-500">{q.courseTitle} • {new Date(q.completedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${q.isPassed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'}`}>
                            {q.score} / {q.totalPoints} ({q.percentage}%)
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No quiz submissions recorded.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ASSIGNMENTS */}
            {activeTab === 'assignments' && (
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Coursework & Homework Submissions</h4>
                <div className="space-y-2.5">
                  {assignments.submissions.length > 0 ? (
                    assignments.submissions.map((sub, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-sm text-slate-900 dark:text-white block">{sub.assignmentTitle}</strong>
                          <span className="text-[11px] text-slate-500">{sub.courseTitle} • Submitted {new Date(sub.submittedAt).toLocaleDateString()}</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${sub.status === 'graded' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'}`}>
                          {sub.status === 'graded' ? `${sub.marks}/${sub.maxMarks} (${sub.percentage}%)` : 'Awaiting Grading'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No assignments submitted yet.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: READING */}
            {activeTab === 'reading' && (
              <div className="space-y-3">
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">Study Materials & Notes Reading</h4>
                <div className="space-y-2.5">
                  {reading.progressList.length > 0 ? (
                    reading.progressList.map((rp, idx) => (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-sm text-slate-900 dark:text-white block">{rp.pdfTitle}</strong>
                          <span className="text-[11px] text-slate-500">{rp.courseTitle} • {rp.maxPageRead} of {rp.totalPages} pages</span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-md font-bold text-xs ${rp.isCompleted ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'}`}>
                          {rp.isCompleted ? 'Completed ✓' : `${rp.progressPercentage}% Read`}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic py-4 text-center">No study materials read yet.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default StudentPerformanceDetails;
