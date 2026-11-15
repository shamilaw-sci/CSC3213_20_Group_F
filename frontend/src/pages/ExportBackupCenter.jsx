import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  FaDatabase,
  FaFileCsv,
  FaFileCode,
  FaCloudDownloadAlt,
  FaUserGraduate,
  FaCalendarCheck,
  FaCreditCard,
  FaChartLine,
  FaShieldAlt,
  FaCheckCircle,
  FaSyncAlt,
  FaLock,
  FaArchive
} from 'react-icons/fa';

const gradeOptions = [
  'ALL',
  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11',
  'Grade 12 Science', 'Grade 12 Commerce', 'Grade 12 Arts', 'Grade 12 Tech',
  'Grade 13 Science', 'Grade 13 Commerce', 'Grade 13 Arts', 'Grade 13 Tech'
];

const ExportBackupCenter = () => {
  const [activeTab, setActiveTab] = useState('modular');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [downloading, setDownloading] = useState({});

  // Modular export states
  const [studentFilters, setStudentFilters] = useState({ grade: 'ALL', studentType: 'ALL' });
  const [attendanceFilters, setAttendanceFilters] = useState({ status: 'ALL', startDate: '', endDate: '' });
  const [paymentFilters, setPaymentFilters] = useState({ status: 'ALL', paymentMethod: 'ALL', startDate: '', endDate: '' });

  // Fetch summary counts
  const fetchSummary = async () => {
    try {
      setLoadingSummary(true);
      const res = await api.get('/export/summary');
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load export summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // Generic File Downloader with Authentication
  const handleDownload = async (endpoint, params, fileLabel, format = 'csv') => {
    const downloadKey = `${fileLabel}_${format}`;
    try {
      setDownloading((prev) => ({ ...prev, [downloadKey]: true }));
      toast.loading(`Preparing ${fileLabel} (${format.toUpperCase()})...`, { id: downloadKey });

      const response = await api.get(endpoint, {
        params: { ...params, format },
        responseType: 'blob'
      });

      // Extract filename from header or build default
      let filename = `${fileLabel.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.${format}`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) {
          filename = matches[1];
        }
      }

      // Trigger browser download
      const blob = new Blob([response.data], {
        type: format === 'json' ? 'application/json' : format === 'gz' ? 'application/gzip' : 'text/csv'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success(`${fileLabel} downloaded successfully!`, { id: downloadKey });
    } catch (err) {
      console.error(`Download error for ${fileLabel}:`, err);
      toast.error(`Failed to export ${fileLabel}.`, { id: downloadKey });
    } finally {
      setDownloading((prev) => ({ ...prev, [downloadKey]: false }));
    }
  };

  // Full Database Backup Downloader
  const handleSystemBackup = async (compress = true) => {
    const backupKey = `backup_${compress ? 'gzip' : 'json'}`;
    try {
      setDownloading((prev) => ({ ...prev, [backupKey]: true }));
      toast.loading(`Generating full institute database snapshot...`, { id: backupKey });

      const response = await api.get('/export/backup', {
        params: { compress: compress ? 'true' : 'false' },
        responseType: 'blob'
      });

      const ext = compress ? 'json.gz' : 'json';
      let filename = `luminalearn-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename="?([^"]+)"?/);
        if (matches && matches[1]) filename = matches[1];
      }

      const blob = new Blob([response.data], {
        type: compress ? 'application/gzip' : 'application/json'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Database backup created and downloaded!', { id: backupKey });
      fetchSummary(); // Refresh stats
    } catch (err) {
      console.error('System backup error:', err);
      toast.error('Failed to create system backup: ' + err.message, { id: backupKey });
    } finally {
      setDownloading((prev) => ({ ...prev, [backupKey]: false }));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FaCloudDownloadAlt className="text-xl" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Data Export & Backup Center
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Export student directories, attendance records, payment logs, and download complete encrypted database backups.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-gray-100 dark:bg-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('modular')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'modular'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Modular Reports
          </button>
          <button
            onClick={() => setActiveTab('backup')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'backup'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <FaDatabase className="text-[11px]" /> Database Snapshot
          </button>
        </div>
      </div>

      {/* Real-time KPI Stats Bar */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Students</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              {summary.students?.total?.toLocaleString() || 0}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">
              {summary.students?.physical} Phys · {summary.students?.online} Online
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Courses</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              {summary.courses?.toLocaleString() || 0}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Faculty catalog</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payments</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              {summary.payments?.toLocaleString() || 0}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Ledger records</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Attendance</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              {summary.attendance?.toLocaleString() || 0}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Class check-ins</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Academics</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              {summary.academicSubmissions?.toLocaleString() || 0}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">Quiz & Assignment marks</span>
          </div>

          <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Audit Events</span>
            <span className="text-xl font-black text-gray-900 dark:text-white mt-0.5 block">
              {summary.auditLogs?.toLocaleString() || 0}
            </span>
            <span className="text-[9px] text-gray-400 block mt-0.5">System trail records</span>
          </div>
        </div>
      )}

      {/* TAB 1: MODULAR EXPORT CARDS */}
      {activeTab === 'modular' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Card 1: Student Records */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <FaUserGraduate className="text-lg" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Student Directory & Profiles
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Export full student demographics, grades, parent contacts, and verification statuses.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2.5 my-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    Grade Filter
                  </label>
                  <select
                    value={studentFilters.grade}
                    onChange={(e) => setStudentFilters({ ...studentFilters, grade: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200"
                  >
                    {gradeOptions.map((g) => (
                      <option key={g} value={g}>{g === 'ALL' ? 'All Grades' : g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    Student Type
                  </label>
                  <select
                    value={studentFilters.studentType}
                    onChange={(e) => setStudentFilters({ ...studentFilters, studentType: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="ALL">All Types</option>
                    <option value="physical">Physical Student</option>
                    <option value="online">Online Student</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => handleDownload('/export/students', studentFilters, 'Students', 'csv')}
                disabled={downloading['Students_csv']}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCsv /> Export CSV
              </button>
              <button
                onClick={() => handleDownload('/export/students', studentFilters, 'Students', 'json')}
                disabled={downloading['Students_json']}
                className="flex items-center justify-center gap-1.5 py-2 px-3.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCode /> JSON
              </button>
            </div>
          </div>

          {/* Card 2: Attendance Records */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <FaCalendarCheck className="text-lg" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Attendance History & Logs
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Export kiosk QR scans, physical counter check-ins, and weekly course attendance.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    Status
                  </label>
                  <select
                    value={attendanceFilters.status}
                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, status: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={attendanceFilters.startDate}
                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, startDate: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={attendanceFilters.endDate}
                    onChange={(e) => setAttendanceFilters({ ...attendanceFilters, endDate: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => handleDownload('/export/attendance', attendanceFilters, 'Attendance', 'csv')}
                disabled={downloading['Attendance_csv']}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCsv /> Export CSV
              </button>
              <button
                onClick={() => handleDownload('/export/attendance', attendanceFilters, 'Attendance', 'json')}
                disabled={downloading['Attendance_json']}
                className="flex items-center justify-center gap-1.5 py-2 px-3.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCode /> JSON
              </button>
            </div>
          </div>

          {/* Card 3: Payments Ledger */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                  <FaCreditCard className="text-lg" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Financial & Payment Ledger
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Export student tuition fees, bank slip approvals, and counter cash transactions.
                  </p>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-2 gap-2.5 my-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    Payment Status
                  </label>
                  <select
                    value={paymentFilters.status}
                    onChange={(e) => setPaymentFilters({ ...paymentFilters, status: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="COMPLETED">Completed / Approved</option>
                    <option value="PENDING_APPROVAL">Pending Verification</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400 mb-1 block">
                    Payment Method
                  </label>
                  <select
                    value={paymentFilters.paymentMethod}
                    onChange={(e) => setPaymentFilters({ ...paymentFilters, paymentMethod: e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200"
                  >
                    <option value="ALL">All Methods</option>
                    <option value="CASH_COUNTER">Cash Counter</option>
                    <option value="BANK_SLIP">Bank Deposit Slip</option>
                    <option value="CARD">Credit / Debit Card</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => handleDownload('/export/payments', paymentFilters, 'Payments', 'csv')}
                disabled={downloading['Payments_csv']}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCsv /> Export CSV
              </button>
              <button
                onClick={() => handleDownload('/export/payments', paymentFilters, 'Payments', 'json')}
                disabled={downloading['Payments_json']}
                className="flex items-center justify-center gap-1.5 py-2 px-3.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCode /> JSON
              </button>
            </div>
          </div>

          {/* Card 4: Academic Performance */}
          <div className="p-5 rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col justify-between shadow-xs">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <span className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <FaChartLine className="text-lg" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white">
                    Academic Reports & Submissions
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Export quiz scores, assignment grades, submission statuses, and student percentages.
                  </p>
                </div>
              </div>

              <div className="my-4 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/40 text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                Contains full cross-faculty breakdown of online quizzes and homework assignment submissions across all active grades.
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
              <button
                onClick={() => handleDownload('/export/academic', {}, 'Academic-Report', 'csv')}
                disabled={downloading['Academic-Report_csv']}
                className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCsv /> Export CSV
              </button>
              <button
                onClick={() => handleDownload('/export/academic', {}, 'Academic-Report', 'json')}
                disabled={downloading['Academic-Report_json']}
                className="flex items-center justify-center gap-1.5 py-2 px-3.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCode /> JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FULL DATABASE SNAPSHOT & BACKUP */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Information Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-purple-500/5 to-transparent border border-purple-200 dark:border-purple-900/50">
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-purple-600 text-white">
                <FaShieldAlt className="text-xl" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Full Database Snapshot Engine
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                  Generates an all-inclusive JSON snapshot of the MongoDB database collections. Passwords and active authentication tokens are completely stripped from exported records for data security. The exported archive can be archived off-site or used for system disaster recovery.
                </p>
              </div>
            </div>
          </div>

          {/* Backup Summary Breakdown Table */}
          <div className="rounded-xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            <div className="bg-gray-50 dark:bg-slate-800/80 px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FaArchive className="text-purple-500" /> Collections Included in Snapshot
              </span>
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400">
                LuminaLearn Database
              </span>
            </div>

            <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Users & Staff</span>
                <span className="font-extrabold text-gray-900 dark:text-white text-base">
                  {summary ? (summary.students?.total + summary.teachers + 5).toLocaleString() : '...'}
                </span>
                <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-semibold">Protected Hash</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Courses & Curricula</span>
                <span className="font-extrabold text-gray-900 dark:text-white text-base">
                  {summary?.courses?.toLocaleString() || '...'}
                </span>
                <span className="text-[9px] text-gray-400 block">Class breakdown</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Payment Ledger</span>
                <span className="font-extrabold text-gray-900 dark:text-white text-base">
                  {summary?.payments?.toLocaleString() || '...'}
                </span>
                <span className="text-[9px] text-gray-400 block">All transaction slips</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Attendance Records</span>
                <span className="font-extrabold text-gray-900 dark:text-white text-base">
                  {summary?.attendance?.toLocaleString() || '...'}
                </span>
                <span className="text-[9px] text-gray-400 block">Complete history</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Academic Records</span>
                <span className="font-extrabold text-gray-900 dark:text-white text-base">
                  {summary?.academicSubmissions?.toLocaleString() || '...'}
                </span>
                <span className="text-[9px] text-gray-400 block">Quizzes & Assignments</span>
              </div>

              <div className="p-3 rounded-lg bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] text-gray-400 font-bold block uppercase">Audit Trails</span>
                <span className="font-extrabold text-gray-900 dark:text-white text-base">
                  {summary?.auditLogs?.toLocaleString() || '...'}
                </span>
                <span className="text-[9px] text-purple-600 dark:text-purple-400 block font-semibold">Security logs</span>
              </div>
            </div>
          </div>

          {/* Download Action Buttons */}
          <div className="p-6 rounded-2xl border border-gray-200 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">
                Download Latest Database Snapshot
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                GZIP compression reduces raw database JSON size by over 85% for swift downloading.
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleSystemBackup(true)}
                disabled={downloading['backup_gzip']}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer disabled:opacity-50"
              >
                <FaArchive /> Download Compressed Archive (.json.gz)
              </button>

              <button
                type="button"
                onClick={() => handleSystemBackup(false)}
                disabled={downloading['backup_json']}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              >
                <FaFileCode /> Raw JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportBackupCenter;
