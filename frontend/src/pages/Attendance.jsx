import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { Html5Qrcode } from 'html5-qrcode';
import {
  FaSearch,
  FaUser,
  FaCalendarDay,
  FaHistory,
  FaCreditCard,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaSpinner,
  FaQrcode,
  FaCamera,
  FaVolumeUp,
  FaCheck,
  FaFilter,
  FaListAlt,
  FaEdit
} from 'react-icons/fa';

const Attendance = () => {
  const storedUser = JSON.parse(localStorage.getItem('user')) || {};
  const isAdminRole = storedUser.role === 'admin';

  // Admin View State
  const [adminMode, setAdminMode] = useState('daily'); // 'daily' | 'history' | 'manual'
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [loadingAdminLogs, setLoadingAdminLogs] = useState(false);
  const [adminGradeFilter, setAdminGradeFilter] = useState('');
  const [adminCourseFilter, setAdminCourseFilter] = useState('');
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [coursesList, setCoursesList] = useState(() => {
    try {
      const cached = sessionStorage.getItem('lumina_cached_courses');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  // Counter Staff / Live QR State
  const [scannerMode, setScannerMode] = useState('qr'); // 'qr' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('mark'); // 'mark', 'history', 'payments'

  // Live QR Scanner State
  const [kioskScheduleId, setKioskScheduleId] = useState('AUTO');
  const kioskScheduleIdRef = React.useRef(kioskScheduleId);
  useEffect(() => { kioskScheduleIdRef.current = kioskScheduleId; }, [kioskScheduleId]);

  const [lastScannedResult, setLastScannedResult] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [manualQrCode, setManualQrCode] = useState('');

  // Forms & Schedules State
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('Present');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // History & Stats State
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Student Payments State
  const [studentPayments, setStudentPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (isAdminRole) {
      fetchAdminLogs();
      fetchCourses();
    } else {
      fetchSchedules();
    }
  }, [selectedDate, adminGradeFilter, adminCourseFilter, adminMode]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCoursesList(res.data.courses || res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchedules = async (studentGrade) => {
    try {
      const res = await api.get('/schedule');
      let sortedSchedules = res.data || [];
      if (studentGrade) {
        sortedSchedules = [...sortedSchedules].sort((a, b) => {
          if (a.className === studentGrade && b.className !== studentGrade) return -1;
          if (a.className !== studentGrade && b.className === studentGrade) return 1;
          return 0;
        });
        const matching = sortedSchedules.find(s => s.className === studentGrade);
        if (matching) {
          setSelectedScheduleId(matching._id);
        } else if (sortedSchedules.length > 0) {
          setSelectedScheduleId(sortedSchedules[0]._id);
        }
      }
      setSchedules(sortedSchedules);
    } catch (e) {
      console.error("Error fetching schedules", e);
    }
  };

  const fetchAdminLogs = async () => {
    setLoadingAdminLogs(true);
    try {
      let url = `/attendance/admin/all-logs?search=${encodeURIComponent(adminSearchQuery)}`;
      if (adminMode === 'daily' && selectedDate) {
        url += `&date=${selectedDate}`;
      }
      if (adminGradeFilter) url += `&grade=${encodeURIComponent(adminGradeFilter)}`;
      if (adminCourseFilter) url += `&courseId=${adminCourseFilter}`;

      const res = await api.get(url);
      setAdminLogs(res.data);
    } catch (err) {
      console.error("Fetch admin logs error:", err);
      toast.error("Failed to load attendance records.");
    } finally {
      setLoadingAdminLogs(false);
    }
  };

  const handleAdminSearchSubmit = (e) => {
    e.preventDefault();
    fetchAdminLogs();
  };

  const playChimeSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (err) {
      console.error("Audio error", err);
    }
  };

  const isProcessingScanRef = React.useRef(false);
  const lastScannedCodeRef = React.useRef({ code: '', time: 0 });

  const processQrCheckIn = async (rawCode) => {
    if (!rawCode || isProcessingScanRef.current) return;

    let regNo = rawCode.trim();
    try {
      const parsed = JSON.parse(rawCode);
      if (parsed.registrationNumber) {
        regNo = parsed.registrationNumber;
      }
    } catch (e) {
      // raw regNo string
    }

    const now = Date.now();
    if (lastScannedCodeRef.current.code === regNo && (now - lastScannedCodeRef.current.time) < 3500) {
      return;
    }

    isProcessingScanRef.current = true;
    lastScannedCodeRef.current = { code: regNo, time: now };
    setScanning(true);

    try {
      const res = await api.post('/attendance/scan-qr', {
        registrationNumber: regNo,
        scheduleId: kioskScheduleIdRef.current
      });

      playChimeSound();
      setLastScannedResult(res.data);
      setRecentScans(prev => {
        const filtered = prev.filter(item => item.student?._id !== res.data.student?._id);
        return [res.data, ...filtered.slice(0, 8)];
      });

      const toastId = `scan-${res.data.student?._id || regNo}`;
      if (res.data.alreadyScannedToday) {
        toast(res.data.message || `Attendance already logged for ${res.data.student?.name} today!`, {
          icon: 'ℹ️',
          id: toastId
        });
      } else {
        toast.success(res.data.message || `Check-in recorded for ${res.data.student?.name}!`, {
          id: toastId
        });
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "QR scan check-in failed.", {
        id: 'scan-error'
      });
    } finally {
      setTimeout(() => {
        isProcessingScanRef.current = false;
        setScanning(false);
      }, 2000);
    }
  };

  useEffect(() => {
    let html5QrCode;
    let isMounted = true;

    if (!isAdminRole && scannerMode === 'qr') {
      const startCamera = async () => {
        try {
          const el = document.getElementById("qr-reader");
          if (!el) return;
          el.innerHTML = '';

          html5QrCode = new Html5Qrcode("qr-reader");
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          try {
            await html5QrCode.start(
              { facingMode: "user" },
              config,
              (decodedText) => processQrCheckIn(decodedText),
              () => {}
            );
          } catch (e1) {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0 && isMounted) {
              await html5QrCode.start(
                cameras[0].id,
                config,
                (decodedText) => processQrCheckIn(decodedText),
                () => {}
              );
            }
          }
        } catch (err) {
          console.error("Camera direct start error:", err);
        }
      };

      const timer = setTimeout(startCamera, 150);
      return () => {
        clearTimeout(timer);
        isMounted = false;
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => html5QrCode.clear()).catch(e => console.error(e));
          } else {
            html5QrCode.clear().catch(e => console.error(e));
          }
        }
      };
    }
  }, [scannerMode, isAdminRole]);

  // Search students when query changes (with min length check)
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await api.get(`/auth/users/search-students?query=${encodeURIComponent(searchQuery)}`);
      setSearchResults(res.data);
      if (res.data.length === 0) {
        toast.error("No students found with that name or registration number.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error searching students.");
    } finally {
      setSearching(false);
    }
  };

  // Fetch student's attendance history, schedules, and real payment records
  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchResults([]); // clear search list
    setSearchQuery('');
    setSelectedScheduleId('');

    // Fetch schedule entries, attendance history, and payments
    fetchSchedules(student.grade);
    fetchHistory(student._id);
    fetchStudentPayments(student._id);
  };

  const fetchStudentPayments = async (studentId) => {
    setLoadingPayments(true);
    try {
      const res = await api.get(`/payments/student/${studentId}`);
      setStudentPayments(res.data || []);
    } catch (err) {
      console.error("Error fetching student payments", err);
      setStudentPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const fetchHistory = async (studentId) => {
    setLoadingHistory(true);
    try {
      const res = await api.get(`/attendance/student/${studentId}`);
      setAttendanceHistory(res.data);
    } catch (err) {
      console.error("Error fetching attendance history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedScheduleId) {
      toast.error("Please select both a student and a class schedule.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId: selectedStudent._id,
        scheduleId: selectedScheduleId,
        status: attendanceStatus,
        date: attendanceDate
      };

      const res = await api.post('/attendance', payload);
      toast.success(res.data.message || "Attendance marked successfully!");

      // Refresh history & clean up
      fetchHistory(selectedStudent._id);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to mark attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  // Find the selected schedule details
  const activeSchedule = schedules.find(s => s._id === selectedScheduleId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl shadow-lg p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {isAdminRole ? 'Attendance Reports & Management Workspace' : 'Counter Attendance Kiosk'}
            </h1>
            <p className="text-purple-200 text-sm mt-1">
              {isAdminRole 
                ? 'Audit daily classroom attendance, query all-time attendance history by date, and mark student weekly attendance.'
                : 'Mark and monitor real-time classroom attendance for arriving students.'}
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-xl flex items-center gap-3 self-start md:self-center">
            <FaCalendarAlt className="text-purple-300" />
            <span className="text-xs font-bold uppercase tracking-wider">{new Date().toDateString()}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/*                       ADMINISTRATOR VIEW MODE                              */}
      {/* ========================================================================= */}
      {isAdminRole ? (
        <div className="space-y-6">
          {/* Admin Navigation Tabs */}
          <div className="flex bg-white p-2 rounded-2xl border border-gray-200 shadow-sm gap-2">
            <button
              type="button"
              onClick={() => setAdminMode('daily')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                adminMode === 'daily'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              <FaCalendarDay className="text-base" /> Daily Attendance Log (By Date)
            </button>

            <button
              type="button"
              onClick={() => setAdminMode('history')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                adminMode === 'history'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              <FaHistory className="text-base" /> All-Time Attendance History
            </button>

            <button
              type="button"
              onClick={() => setAdminMode('manual')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                adminMode === 'manual'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              <FaEdit className="text-base" /> Mark Student Weekly Attendance
            </button>
          </div>

          {/* ADMIN MODE 1 & 2: DAILY ATTENDANCE LOG & ALL-TIME HISTORY */}
          {(adminMode === 'daily' || adminMode === 'history') && (
            <div className="space-y-6">
              
              {/* Filter Control Bar */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    <FaFilter className="text-purple-600" /> 
                    {adminMode === 'daily' ? 'Select Date & Filter Daily Roster' : 'Search & Filter All-Time Master History'}
                  </h3>
                  <span className="text-xs text-purple-700 font-bold bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                    {adminLogs.length} Records Found
                  </span>
                </div>

                <form onSubmit={handleAdminSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {/* Date Selector (Daily Mode) */}
                  {adminMode === 'daily' && (
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 mb-1">
                        Select Target Date
                      </label>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-purple-50/70 border border-purple-300 rounded-xl text-xs font-bold text-purple-950 focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Grade Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                      Filter by Grade
                    </label>
                    <select
                      value={adminGradeFilter}
                      onChange={(e) => setAdminGradeFilter(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
                    >
                      <option value="">All Grades</option>
                      <option value="Grade 6">Grade 6</option>
                      <option value="Grade 7">Grade 7</option>
                      <option value="Grade 8">Grade 8</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                      <option value="Grade 12 (A/L)">Grade 12 (A/L)</option>
                    </select>
                  </div>

                  {/* Course Filter */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                      Filter by Course
                    </label>
                    <select
                      value={adminCourseFilter}
                      onChange={(e) => setAdminCourseFilter(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
                    >
                      <option value="">All Courses</option>
                      {coursesList.map(c => (
                        <option key={c._id} value={c._id}>{c.title} ({c.grade})</option>
                      ))}
                    </select>
                  </div>

                  {/* Search Box */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 mb-1">
                      Student Search
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Search student name / Reg No..."
                        value={adminSearchQuery}
                        onChange={(e) => setAdminSearchQuery(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <button
                        type="submit"
                        className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition cursor-pointer"
                      >
                        <FaSearch />
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Attendance Table */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                  <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 flex items-center gap-2">
                    <FaListAlt className="text-purple-600" />
                    {adminMode === 'daily' ? `Daily Attendance Log for ${selectedDate}` : 'Master All-Time Attendance History'}
                  </h4>
                  <span className="text-xs text-purple-700 font-bold bg-purple-100 px-3 py-1 rounded-full">
                    {adminLogs.length} Checked In
                  </span>
                </div>

                {loadingAdminLogs ? (
                  <div className="p-12 text-center text-purple-600 space-y-2">
                    <FaSpinner className="animate-spin text-3xl mx-auto" />
                    <p className="text-xs font-semibold">Loading attendance records...</p>
                  </div>
                ) : adminLogs.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 space-y-2">
                    <FaCalendarAlt className="text-4xl mx-auto text-gray-300" />
                    <p className="text-sm font-bold text-gray-600">No attendance records found for this query.</p>
                    <p className="text-xs text-gray-400">Select another date or clear your search filters.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-100 text-gray-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200">
                        <tr>
                          <th className="p-3.5">Student Name & Reg No</th>
                          <th className="p-3.5">Grade</th>
                          <th className="p-3.5">Check-in Date & Time</th>
                          <th className="p-3.5">Subject / Course</th>
                          <th className="p-3.5">Weekly Session</th>
                          <th className="p-3.5">Check-in Mode</th>
                          <th className="p-3.5">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                        {adminLogs.map((log) => (
                          <tr key={log._id} className="hover:bg-purple-50/40 transition-colors">
                            <td className="p-3.5 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-800 font-extrabold flex items-center justify-center text-xs border border-purple-200 shrink-0">
                                {log.studentId?.name ? log.studentId.name.charAt(0).toUpperCase() : 'S'}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900">{log.studentId?.name || 'Unknown Student'}</p>
                                <p className="text-[10px] text-purple-700 font-mono font-bold">
                                  {log.studentId?.registrationNumber || log.studentId?.email || 'N/A'}
                                </p>
                              </div>
                            </td>
                            <td className="p-3.5">
                              <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md font-bold text-[10px]">
                                {log.studentId?.grade || 'Grade 7'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <p className="font-bold text-gray-900">{new Date(log.date).toLocaleDateString()}</p>
                              <p className="text-[10px] text-gray-500 font-mono">
                                {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </td>
                            <td className="p-3.5 font-bold text-purple-950">
                              {log.courseId?.title || log.scheduleId?.title || 'Class Session'}
                            </td>
                            <td className="p-3.5">
                              <span className="bg-purple-100 text-purple-900 px-2.5 py-1 rounded-md font-extrabold text-[10px]">
                                {log.remarks || `${log.month || 'August'} - Week ${log.weekNumber || 2}`}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                log.mode === 'PHYSICAL_QR' 
                                  ? 'bg-amber-100 text-amber-900 border border-amber-200' 
                                  : 'bg-blue-100 text-blue-900 border border-blue-200'
                              }`}>
                                {log.mode || 'PHYSICAL_QR'}
                              </span>
                            </td>
                            <td className="p-3.5">
                              <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-extrabold text-[10px] flex items-center gap-1 w-max border border-emerald-200">
                                <FaCheckCircle className="text-emerald-600 text-[10px]" />
                                {log.status || 'Present'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* ADMIN MODE 3: MANUAL ROSTER & WEEKLY ATTENDANCE MARKING */}
          {adminMode === 'manual' && (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
                <h3 className="font-extrabold text-gray-900 text-base">Search Student Roster for Weekly Attendance</h3>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search by student name or registration number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-semibold"
                  />
                  <button
                    type="submit"
                    className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs px-6 py-3 rounded-xl transition cursor-pointer"
                  >
                    Search Student
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden mt-3">
                    {searchResults.map(s => (
                      <div key={s._id} className="p-3.5 flex justify-between items-center hover:bg-purple-50 transition cursor-pointer" onClick={() => handleSelectStudent(s)}>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{s.name}</p>
                          <p className="text-xs text-purple-700 font-mono font-semibold">{s.registrationNumber || s.email} • {s.grade}</p>
                        </div>
                        <button className="bg-purple-100 text-purple-900 hover:bg-purple-200 text-xs font-extrabold px-3 py-1.5 rounded-lg transition">
                          Select Roster ➔
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Student Roster Manual Form */}
              {selectedStudent && (
                <div className="bg-white p-6 rounded-3xl border border-purple-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-extrabold text-gray-900 text-base">Mark Weekly Attendance for {selectedStudent.name}</h4>
                      <p className="text-xs text-purple-700 font-mono font-semibold">{selectedStudent.registrationNumber || selectedStudent.email} • {selectedStudent.grade}</p>
                    </div>
                    <span className="bg-purple-100 text-purple-900 text-xs font-bold px-3 py-1 rounded-full">
                      {selectedStudent.studentType || 'Physical Student'}
                    </span>
                  </div>

                  <form onSubmit={handleMarkAttendance} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Select Class Schedule</label>
                      <select
                        value={selectedScheduleId}
                        onChange={(e) => setSelectedScheduleId(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-600"
                        required
                      >
                        <option value="">-- Choose Class Schedule --</option>
                        {schedules.map(sch => (
                          <option key={sch._id} value={sch._id}>
                            {sch.title} ({sch.className}) — {sch.dayOfWeek} {sch.startTime}-{sch.endTime}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Attendance Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Attendance Status</label>
                      <div className="flex gap-2">
                        <select
                          value={attendanceStatus}
                          onChange={(e) => setAttendanceStatus(e.target.value)}
                          className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-purple-600"
                        >
                          <option value="Present">Present ✓</option>
                          <option value="Absent">Absent ✗</option>
                          <option value="Late">Late ⏳</option>
                        </select>

                        <button
                          type="submit"
                          disabled={submitting}
                          className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs px-5 py-3 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                        >
                          Submit
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Selected Student Attendance History List */}
                  <div className="pt-4 border-t border-gray-100">
                    <h5 className="font-extrabold text-xs text-gray-700 uppercase tracking-wider mb-3">Recorded Attendance Logs for {selectedStudent.name}</h5>
                    {loadingHistory ? (
                      <p className="text-xs text-gray-400">Loading history...</p>
                    ) : attendanceHistory.length === 0 ? (
                      <p className="text-xs text-gray-400">No attendance records found for this student.</p>
                    ) : (
                      <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden text-xs">
                        {attendanceHistory.map(rec => (
                          <div key={rec._id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                            <div>
                              <p className="font-bold text-gray-900">{rec.scheduleId?.title || rec.courseId?.title || 'Class Session'}</p>
                              <p className="text-[10px] text-purple-700 font-mono">{new Date(rec.date).toLocaleDateString()} • {rec.remarks || `${rec.month || 'August'} - Week ${rec.weekNumber || 2}`}</p>
                            </div>
                            <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-extrabold text-[10px]">
                              {rec.status} ✓
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      ) : (

        /* ========================================================================= */
        /*                       COUNTER STAFF SCANNER MODE                           */
        /* ========================================================================= */
        <div className="space-y-6">
          <div className="flex bg-white p-2 rounded-2xl border border-gray-200 shadow-sm gap-2">
            <button
              type="button"
              onClick={() => setScannerMode('qr')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                scannerMode === 'qr'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              <FaCamera className="text-base" /> Live QR Scanner Kiosk
            </button>

            <button
              type="button"
              onClick={() => setScannerMode('search')}
              className={`flex-1 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                scannerMode === 'search'
                  ? 'bg-purple-700 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-purple-50 hover:text-purple-900'
              }`}
            >
              <FaSearch className="text-base" /> Student Search & Manual Roster
            </button>
          </div>

          {scannerMode === 'qr' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-md space-y-4">
                  <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                    <div>
                      <h3 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                        <FaQrcode className="text-purple-600" /> Counter QR Code Scanner
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">Point student digital ID card at the camera for 1-second auto check-in.</p>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Camera Active
                    </span>
                  </div>

                  <div className="bg-purple-50 p-3.5 rounded-2xl border border-purple-200 space-y-1">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900">
                      Target Session / Class Schedule
                    </label>
                    <select
                      value={kioskScheduleId}
                      onChange={(e) => setKioskScheduleId(e.target.value)}
                      className="w-full bg-white p-2.5 rounded-xl border border-purple-300 font-bold text-xs text-purple-950 focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
                    >
                      <option value="AUTO">⚡ Auto-Detect Active Class (By Current Time & Student Grade)</option>
                      {schedules.map(sch => (
                        <option key={sch._id} value={sch._id}>
                          {sch.title} ({sch.className}) — {sch.dayOfWeek} {sch.startTime}-{sch.endTime} (Room {sch.room || '1'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="relative">
                    <div id="qr-reader" className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-inner border border-purple-200"></div>
                  </div>

                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (manualQrCode) processQrCheckIn(manualQrCode);
                    }}
                    className="flex gap-2 pt-2 border-t border-gray-100"
                  >
                    <input
                      type="text"
                      placeholder="Enter Student Reg No manually (e.g. STU-2026-G06-0042)..."
                      value={manualQrCode}
                      onChange={(e) => setManualQrCode(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-mono font-bold"
                    />
                    <button
                      type="submit"
                      disabled={scanning}
                      className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                      Quick Check-in ➔
                    </button>
                  </form>
                </div>

                {lastScannedResult && (
                  <div className="bg-gradient-to-br from-purple-900 via-indigo-950 to-purple-950 p-6 rounded-3xl text-white shadow-xl border border-purple-400/40 animate-fadeIn space-y-4 relative overflow-hidden">
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🔔</span>
                        <div>
                          <h4 className="font-extrabold text-amber-400 text-base">Instant Check-in Result</h4>
                          <p className="text-xs text-purple-200 mt-0.5">Scanned at {new Date(lastScannedResult.scanTime).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-extrabold border ${lastScannedResult.paymentStatus === 'PAID' ? 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40' : 'bg-amber-400/20 text-amber-300 border-amber-400/40'}`}>
                        {lastScannedResult.paymentStatus === 'PAID' ? 'Monthly Fee: Paid ✓' : 'Fee Unsettled ⚠️'}
                      </span>
                    </div>

                    <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-amber-400 text-purple-950 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg shrink-0">
                        {lastScannedResult.student.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-extrabold">{lastScannedResult.student.name}</h3>
                        <p className="font-mono text-xs text-amber-300 font-bold tracking-wider mt-0.5">
                          {lastScannedResult.student.registrationNumber || 'No Reg No'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-md space-y-4">
                <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                  <h3 className="font-extrabold text-gray-900 text-sm flex items-center gap-2">
                    📋 Today's Check-ins Feed
                  </h3>
                  <span className="text-xs bg-purple-100 text-purple-900 font-extrabold px-2.5 py-0.5 rounded-full">
                    {recentScans.length} Students
                  </span>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {recentScans.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-10">No QR check-ins scanned yet today.</p>
                  ) : (
                    recentScans.map((scan, idx) => (
                      <div key={idx} className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 flex items-center justify-between hover:bg-purple-100/50 transition">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-700 text-white font-extrabold flex items-center justify-center text-sm">
                            {scan.student.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-extrabold text-xs text-gray-900">{scan.student.name}</p>
                            <p className="text-[10px] font-mono text-purple-700 font-bold">{scan.student.registrationNumber || scan.student.email}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${scan.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {scan.paymentStatus === 'PAID' ? 'Paid ✓' : 'Unsettled'}
                          </span>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                            {new Date(scan.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Attendance;
