/**
 * @file EarlyWarningSection.jsx
 * @description Early Warning Analytics Section. Dashboard component identifying at-risk students with poor attendance, failing quiz scores, or overdue fees.
 */

import React, { useState, useEffect } from 'react';
import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaSearch,
  FaFilter,
  FaUserGraduate,
  FaCalendarCheck,
  FaChartLine,
  FaClipboardCheck,
  FaClock,
  FaCheckCircle,
  FaEye,
  FaSync
} from 'react-icons/fa';
import api from '../utils/api';
import StudentPerformanceModal from './StudentPerformanceModal';
import { getMediaUrl } from '../utils/mediaUrl';

const EarlyWarningSection = ({ role = 'admin', customTitle = null }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'ATTENDANCE_CONCERN' | 'PERFORMANCE_DECLINE' | 'ASSIGNMENT_CONCERN' | 'INACTIVE_STUDENT' | 'HIGH_RISK'
  const [selectedStudentForModal, setSelectedStudentForModal] = useState(null);

  const fetchSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/early-warning/summary');
      if (res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      console.error("Early Warning Fetch Error:", err);
      setError(err.response?.data?.error || "Failed to load early warning data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const studentsWithWarnings = summary?.studentsWithWarnings || [];
  const breakdown = summary?.breakdown || {
    attendanceConcern: 0,
    performanceDecline: 0,
    assignmentConcern: 0,
    inactiveStudent: 0
  };

  // Filter students
  const filteredStudents = studentsWithWarnings.filter(item => {
    const s = item.student;
    if (!s) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = s.name?.toLowerCase().includes(q);
      const regMatch = s.registrationNumber?.toLowerCase().includes(q);
      const gradeMatch = s.grade?.toLowerCase().includes(q);
      if (!nameMatch && !regMatch && !gradeMatch) return false;
    }

    // Category filter
    if (activeFilter === 'ALL') return true;
    if (activeFilter === 'HIGH_RISK') return item.riskLevel === 'HIGH';
    return item.warnings.some(w => w.type === activeFilter);
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xs space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 mb-2">
            <FaShieldAlt /> Academic Support & Risk Prevention
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            {customTitle || "Student Performance & Early Warning System"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 max-w-2xl">
            Automated multi-factor academic analysis monitoring student attendance, quiz score trends, homework submissions, and learning continuity.
          </p>
        </div>

        <button
          onClick={fetchSummary}
          disabled={loading}
          className="self-start sm:self-center px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          title="Refresh warning analytics"
        >
          <FaSync className={loading ? "animate-spin" : ""} />
          <span>Refresh Analysis</span>
        </button>
      </div>

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Evaluated */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Evaluated</span>
          <span className="text-xl font-black text-slate-800 dark:text-white mt-0.5 block">
            {summary?.totalStudentsEvaluated || 0}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Active Students</span>
        </div>

        {/* Needs Attention */}
        <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
          <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block tracking-wider">Needs Attention</span>
          <span className="text-xl font-black text-amber-800 dark:text-amber-300 mt-0.5 block">
            {summary?.totalWithWarnings || 0}
          </span>
          <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">With Warnings</span>
        </div>

        {/* Attendance Concern (<75%) */}
        <div
          onClick={() => setActiveFilter('ATTENDANCE_CONCERN')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeFilter === 'ATTENDANCE_CONCERN'
              ? 'ring-2 ring-amber-500 bg-amber-100/50 dark:bg-amber-900/30 border-amber-400'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider">Attendance &lt;75%</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 block">
            {breakdown.attendanceConcern}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Session Concerns</span>
        </div>

        {/* Performance Decline */}
        <div
          onClick={() => setActiveFilter('PERFORMANCE_DECLINE')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeFilter === 'PERFORMANCE_DECLINE'
              ? 'ring-2 ring-rose-500 bg-rose-100/50 dark:bg-rose-900/30 border-rose-400'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider">Score Drop</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5 block">
            {breakdown.performanceDecline}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Declining Quizzes</span>
        </div>

        {/* Missing Assignments */}
        <div
          onClick={() => setActiveFilter('ASSIGNMENT_CONCERN')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeFilter === 'ASSIGNMENT_CONCERN'
              ? 'ring-2 ring-orange-500 bg-orange-100/50 dark:bg-orange-900/30 border-orange-400'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider">Missing Tasks</span>
          <span className="text-xl font-black text-orange-600 dark:text-orange-400 mt-0.5 block">
            {breakdown.assignmentConcern}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">Assignment Concerns</span>
        </div>

        {/* Inactive Students */}
        <div
          onClick={() => setActiveFilter('INACTIVE_STUDENT')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
            activeFilter === 'INACTIVE_STUDENT'
              ? 'ring-2 ring-purple-500 bg-purple-100/50 dark:bg-purple-900/30 border-purple-400'
              : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 block tracking-wider">Inactive</span>
          <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5 block">
            {breakdown.inactiveStudent}
          </span>
          <span className="text-[10px] text-slate-500 font-medium">&gt;14d No Activity</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {[
            { id: 'ALL', label: `All Alerts (${studentsWithWarnings.length})` },
            { id: 'HIGH_RISK', label: `🚨 High Attention (${summary?.highRiskCount || 0})` },
            { id: 'ATTENDANCE_CONCERN', label: `📅 Attendance (${breakdown.attendanceConcern})` },
            { id: 'PERFORMANCE_DECLINE', label: `📉 Quiz Drop (${breakdown.performanceDecline})` },
            { id: 'ASSIGNMENT_CONCERN', label: `📝 Overdue Tasks (${breakdown.assignmentConcern})` },
            { id: 'INACTIVE_STUDENT', label: `💤 Inactive (${breakdown.inactiveStudent})` }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                activeFilter === f.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or Reg No..."
            className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          />
        </div>
      </div>

      {/* Warning Student Records Table / Cards */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center space-y-2">
          <div className="animate-spin rounded-full h-9 w-9 border-3 border-purple-600 border-t-transparent"></div>
          <p className="text-xs font-bold text-slate-500 animate-pulse">Analyzing student learning indicators...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs">
          {error}
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="p-8 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl mx-auto shadow-sm">
            <FaCheckCircle />
          </div>
          <h3 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200">
            {studentsWithWarnings.length === 0
              ? "All Students in Good Academic Standing!"
              : "No students match the selected filter criteria."}
          </h3>
          <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-md mx-auto font-medium">
            {studentsWithWarnings.length === 0
              ? "None of the active students currently trigger warning benchmarks (attendance ≥75%, stable quiz marks, no missing assignments, and active learning)."
              : "Try switching filters or clearing your search term to see other academic warning alerts."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((item) => {
            const s = item.student;
            const warnings = item.warnings || [];
            const attRate = item.metrics?.attendance?.rate ?? 0;
            const quizAvg = item.metrics?.quizzes?.averagePercentage ?? 0;
            const missingCount = item.metrics?.assignments?.totalMissing ?? 0;
            const daysInactive = item.metrics?.activity?.daysSinceLastActivity ?? 0;

            return (
              <div
                key={s._id}
                className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-800 transition-all space-y-3 group"
              >
                {/* Top Row: Student Identity + Warning Badges + Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-lg font-black shrink-0 shadow-sm">
                      {s.profilePicture ? (
                        <img
                          src={getMediaUrl(s.profilePicture)}
                          alt={s.name}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        s.name?.charAt(0).toUpperCase() || '🎓'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {s.name}
                        </h4>
                        {item.riskLevel === 'HIGH' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 rounded-md text-[10px] font-black uppercase tracking-wider">
                            High Attention
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span className="font-mono font-bold text-purple-700 dark:text-purple-300">
                          {s.registrationNumber || 'No Reg No'}
                        </span>
                        <span>•</span>
                        <span>🎓 {s.grade}</span>
                        <span>•</span>
                        <span>{s.studentType === 'online' ? '💻 Online' : '🏫 Physical'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => setSelectedStudentForModal(s._id)}
                    className="self-start sm:self-center px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                  >
                    <FaEye /> View Performance Details
                  </button>
                </div>

                {/* Quick Performance Indicators Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Attendance:</span>
                    <strong className={attRate < 75 ? "text-red-600 dark:text-red-400 font-black" : "text-emerald-600 dark:text-emerald-400 font-black"}>
                      {attRate}%
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Quiz Average:</span>
                    <strong className="text-slate-800 dark:text-slate-200 font-black">
                      {quizAvg}%
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Missing Tasks:</span>
                    <strong className={missingCount > 0 ? "text-orange-600 dark:text-orange-400 font-black" : "text-slate-700 dark:text-slate-300"}>
                      {missingCount}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px]">Inactivity:</span>
                    <strong className={daysInactive >= 14 ? "text-purple-600 dark:text-purple-400 font-black" : "text-slate-700 dark:text-slate-300"}>
                      {daysInactive}d
                    </strong>
                  </div>
                </div>

                {/* Warning Badges & Specific Reasons */}
                <div className="space-y-1.5 pt-1">
                  {warnings.map((warn, wIdx) => (
                    <div
                      key={wIdx}
                      className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 ${
                        warn.severity === 'high'
                          ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200/80 dark:border-red-900/40 text-red-900 dark:text-red-200'
                          : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40 text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      <div className="flex items-start sm:items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                          warn.severity === 'high'
                            ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-100'
                            : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100'
                        }`}>
                          {warn.category}
                        </span>
                        <p className="font-medium text-[11.5px] leading-relaxed">
                          {warn.reason}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono font-bold opacity-80 shrink-0">
                        {warn.metric}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* STUDENT PERFORMANCE MODAL */}
      <StudentPerformanceModal
        isOpen={!!selectedStudentForModal}
        onClose={() => setSelectedStudentForModal(null)}
        studentId={selectedStudentForModal}
      />
    </div>
  );
};

export default EarlyWarningSection;
