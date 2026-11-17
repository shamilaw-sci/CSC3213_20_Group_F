/**
 * @file Attendance.jsx
 * @description Attendance Management & QR Scanner Page. Counter desk interface featuring high-speed webcam QR code scanning, manual student lookup, and daily attendance logs.
 */

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
  FaEdit,
  FaChevronLeft,
  FaChevronRight,
  FaPlusCircle,
  FaSyncAlt
} from 'react-icons/fa';
import RecordPhysicalPaymentModal from '../components/RecordPhysicalPaymentModal';

const Attendance = () => {
  const storedUser = JSON.parse(localStorage.getItem('user')) || {};
  const isStaffOrAdmin = storedUser.role === 'admin' || storedUser.role === 'counter_staff';
  const isTeacher = storedUser.role === 'teacher';

  // Admin / Staff / Teacher View State
  const [adminMode, setAdminMode] = useState(isTeacher ? 'daily' : 'manual'); // 'manual' | 'qr' | 'daily' | 'history'
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
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Search & Student Selection State
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
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' (backcam) by default
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [isCameraStarting, setIsCameraStarting] = useState(false);

  // Form State for Manual Marking
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('Present');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // Selected Student Attendance History
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Student Payments State
  const [studentPayments, setStudentPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // History Date Range State
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [activeHistoryPreset, setActiveHistoryPreset] = useState('ALL');

  useEffect(() => {
    setCurrentPage(1);
    fetchAdminLogs();
    fetchCourses();
    fetchSchedules();
    fetchTodayScans();
  }, [selectedDate, historyStartDate, historyEndDate, adminGradeFilter, adminCourseFilter, adminMode]);

  const applyHistoryPreset = (preset) => {
    setActiveHistoryPreset(preset);
    const today = new Date();
    const endStr = today.toISOString().split('T')[0];
    if (preset === 'ALL') {
      setHistoryStartDate('');
      setHistoryEndDate('');
    } else if (preset === '7DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setHistoryStartDate(d.toISOString().split('T')[0]);
      setHistoryEndDate(endStr);
    } else if (preset === '30DAYS') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setHistoryStartDate(d.toISOString().split('T')[0]);
      setHistoryEndDate(endStr);
    } else if (preset === 'MONTH') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setHistoryStartDate(d.toISOString().split('T')[0]);
      setHistoryEndDate(endStr);
    }
  };

  const fetchTodayScans = async () => {
    try {
      const res = await api.get('/attendance/today-scans');
      setRecentScans(res.data || []);
    } catch (e) {
      console.error("Error fetching today scans:", e);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      let courses = res.data.courses || res.data || [];
      if (isTeacher) {
        const teacherId = (storedUser._id || storedUser.id)?.toString();
        courses = courses.filter(c => {
          const instId = (c.instructor?._id || c.instructor)?.toString();
          return instId === teacherId;
        });
      }
      setCoursesList(courses);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSchedules = async (studentGrade) => {
    try {
      const res = await api.get('/schedule');
      let sortedSchedules = res.data || [];
      if (isTeacher) {
        const teacherId = (storedUser._id || storedUser.id)?.toString();
        sortedSchedules = sortedSchedules.filter(s => {
          const tId = (s.teacherId?._id || s.teacherId)?.toString();
          const isMyTeacher = tId === teacherId;
          const isMyCourse = s.courseId && coursesList.some(c => c._id?.toString() === s.courseId?.toString());
          return isMyTeacher || isMyCourse;
        });
      }
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
      if (adminMode === 'daily') {
        if (selectedDate) url += `&date=${selectedDate}`;
      } else if (adminMode === 'history') {
        if (historyStartDate) url += `&startDate=${historyStartDate}`;
        if (historyEndDate) url += `&endDate=${historyEndDate}`;
      }
      if (adminGradeFilter) url += `&grade=${encodeURIComponent(adminGradeFilter)}`;
      if (adminCourseFilter) url += `&courseId=${adminCourseFilter}`;

      const res = await api.get(url);
      setAdminLogs(res.data || []);
    } catch (err) {
      console.error("Fetch admin logs error:", err);
      toast.error("Failed to load attendance records.");
    } finally {
      setLoadingAdminLogs(false);
    }
  };

  const handleAdminSearchSubmit = (e) => {
    e.preventDefault();
    setCurrentPage(1);
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
      fetchTodayScans();

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

  const handleToggleCamera = () => {
    if (isCameraStarting) return;
    setSelectedCameraId('');
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  useEffect(() => {
    let html5QrCode;
    let isMounted = true;
    const isQrActive = adminMode === 'qr';

    if (isQrActive) {
      setIsCameraStarting(true);
      const startCamera = async () => {
        try {
          const el = document.getElementById("qr-reader");
          if (!el || !isMounted) return;
          el.innerHTML = '';

          try {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0 && isMounted) {
              setAvailableCameras(cameras);
            }
          } catch (camErr) {
            console.warn("Could not enumerate cameras:", camErr);
          }

          html5QrCode = new Html5Qrcode("qr-reader");
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          const cameraSource = selectedCameraId
            ? selectedCameraId
            : { facingMode: facingMode };

          try {
            await html5QrCode.start(
              cameraSource,
              config,
              (decodedText) => processQrCheckIn(decodedText),
              () => { }
            );
          } catch (e1) {
            console.warn("Direct camera start failed, falling back to camera enumeration:", e1);
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length > 0 && isMounted) {
              await html5QrCode.start(
                cameras[0].id,
                config,
                (decodedText) => processQrCheckIn(decodedText),
                () => { }
              );
            }
          }
        } catch (err) {
          console.error("Camera direct start error:", err);
        } finally {
          if (isMounted) {
            setIsCameraStarting(false);
          }
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
  }, [adminMode, facingMode, selectedCameraId]);

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

  const renderQrScannerKiosk = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                <FaQrcode className="text-purple-600 dark:text-purple-400" /> Counter QR Code Scanner
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Point student digital ID card at the camera for 1-second auto check-in.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleToggleCamera}
                disabled={isCameraStarting}
                title="Switch camera (Front / Back)"
                className="bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/80 text-purple-800 dark:text-purple-300 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-purple-300 dark:border-purple-800 transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                <FaSyncAlt className={`text-xs ${isCameraStarting ? 'animate-spin' : ''}`} />
                <span>{facingMode === 'environment' ? 'Back Cam' : 'Front Cam'}</span>
              </button>
              <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 border border-emerald-200 dark:border-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Camera Active
              </span>
            </div>
          </div>

          {availableCameras.length > 1 && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs">
              <span className="text-[11px] font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                <FaCamera className="text-purple-600 dark:text-purple-400 text-xs" /> Select Camera Device:
              </span>
              <select
                value={selectedCameraId}
                onChange={(e) => setSelectedCameraId(e.target.value)}
                className="bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 text-gray-800 dark:text-gray-200 text-xs rounded-lg px-2 py-1 outline-none font-medium max-w-[220px] truncate"
              >
                <option value="">Default ({facingMode === 'environment' ? 'Rear' : 'Front'})</option>
                {availableCameras.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="bg-purple-50 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-purple-200 dark:border-slate-700 space-y-1">
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300">
              Target Session / Class Schedule
            </label>
            <select
              value={kioskScheduleId}
              onChange={(e) => setKioskScheduleId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-purple-300 dark:border-slate-700 font-bold text-xs text-purple-950 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
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
            <div id="qr-reader" className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-inner border border-purple-200 dark:border-slate-700"></div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualQrCode) processQrCheckIn(manualQrCode);
            }}
            className="flex gap-2 pt-2 border-t border-gray-100 dark:border-slate-800"
          >
            <input
              type="text"
              placeholder="Enter Student Reg No..."
              value={manualQrCode}
              onChange={(e) => setManualQrCode(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-mono font-bold text-gray-900 dark:text-white"
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

      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-md space-y-4">
        <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
            📋 Today's Check-ins Feed
          </h3>
          <span className="text-xs bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-extrabold px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
            {recentScans.length} Check-ins
          </span>
        </div>

        <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
          {recentScans.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-10">No QR check-ins scanned yet today.</p>
          ) : (
            recentScans.map((scan, idx) => {
              const studentName = scan.student?.name || 'Student';
              const regNumber = scan.student?.registrationNumber || scan.student?.email || '';
              const grade = scan.student?.grade || '';
              const courseTitle = scan.targetCourseTitle || scan.scheduleTitle || scan.attendance?.remarks || 'Class Session';
              const timeStr = scan.scanTime ? new Date(scan.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
              const scheduleTime = scan.timeRange ? `Session: ${scan.timeRange}` : '';

              return (
                <div key={scan._id || idx} className="p-3.5 bg-purple-50/60 dark:bg-slate-800/80 rounded-2xl border border-purple-100 dark:border-slate-700/80 flex flex-col gap-2 hover:bg-purple-100/50 dark:hover:bg-slate-700/50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-700 text-white font-extrabold flex items-center justify-center text-sm shrink-0">
                        {studentName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-extrabold text-xs text-gray-900 dark:text-white">{studentName}</p>
                          {grade && (
                            <span className="text-[9px] font-bold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 rounded-md">
                              {grade}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-mono text-purple-700 dark:text-purple-400 font-bold">{regNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${scan.paymentStatus === 'PAID' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'}`}>
                        {scan.paymentStatus === 'PAID' ? 'Paid ✓' : 'Unsettled'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-purple-100/70 dark:border-slate-700/70 flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    <span className="truncate max-w-[210px] text-purple-900 dark:text-purple-300 font-bold" title={courseTitle}>
                      📚 {courseTitle}
                    </span>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono shrink-0 ml-2">
                      🕒 {timeStr} {scheduleTime ? `• ${scheduleTime}` : ''}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  const renderManualRosterWorkspace = () => (
    <div className="space-y-6">
      {/* Student Search Box */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
          <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
            <FaSearch className="text-purple-600 dark:text-purple-400" /> Search Student Roster for Attendance & Records
          </h3>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold">Search by Name, Registration Number, or Email</span>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by student name or registration number (e.g. Sakindu or IT22047724)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-purple-600 outline-none text-xs font-semibold text-gray-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs px-6 py-3 rounded-2xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {searching ? <FaSpinner className="animate-spin" /> : <FaSearch />} Search
          </button>
        </form>

        {searchResults.length > 0 && (
          <div className="divide-y divide-gray-100 dark:divide-slate-800 border border-purple-100 dark:border-slate-800 rounded-2xl overflow-hidden mt-3 bg-purple-50/20 dark:bg-slate-800/50">
            {searchResults.map(s => (
              <div
                key={s._id}
                className="p-3.5 flex justify-between items-center hover:bg-purple-100/50 dark:hover:bg-slate-700/50 transition cursor-pointer"
                onClick={() => handleSelectStudent(s)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-700 text-white font-black flex items-center justify-center text-sm shadow-sm overflow-hidden shrink-0">
                    {s.profilePicture ? (
                      <img src={s.profilePicture} alt={s.name} className="w-full h-full object-cover" />
                    ) : (
                      s.name ? s.name.charAt(0).toUpperCase() : 'S'
                    )}
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 dark:text-white text-sm">{s.name}</p>
                    <p className="text-xs text-purple-700 dark:text-purple-400 font-mono font-bold">
                      {s.registrationNumber || s.email} • {s.grade} {s.studentType ? `(${s.studentType})` : ''}
                    </p>
                  </div>
                </div>
                <button className="bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer">
                  Select Student ➔
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Student Complete Profile & Attendance Workspace */}
      {selectedStudent && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-purple-200 dark:border-slate-800 shadow-md overflow-hidden space-y-6">
          {/* 1. Rich Student Profile Header & Contact Details Card */}
          <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 p-6 text-white relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>

            <div className="relative z-10 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-purple-950 font-black flex items-center justify-center text-2xl shadow-xl overflow-hidden border-2 border-amber-300/40 shrink-0">
                    {selectedStudent.profilePicture ? (
                      <img src={selectedStudent.profilePicture} alt={selectedStudent.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedStudent.name ? selectedStudent.name.charAt(0).toUpperCase() : 'S'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl font-extrabold text-white">{selectedStudent.name}</h3>
                      <span className="bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                        {selectedStudent.studentType || 'Physical Student'}
                      </span>
                    </div>
                    <p className="font-mono text-xs text-amber-300 font-bold tracking-wider mt-0.5">
                      Reg No: {selectedStudent.registrationNumber || 'N/A'} • {selectedStudent.grade || 'No Grade'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border ${studentPayments.some(p => p.status === 'COMPLETED' || p.status === 'PAID')
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                    }`}>
                    {studentPayments.some(p => p.status === 'COMPLETED' || p.status === 'PAID') ? 'Monthly Fees: Paid ✓' : 'Fee Unsettled ⚠️'}
                  </span>
                </div>
              </div>

              {/* Personal & Contact Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-white/10 text-xs">
                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                    <FaEnvelope />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-purple-300 uppercase tracking-wider block font-bold">Email Address</span>
                    <span className="font-semibold text-white truncate block">{selectedStudent.email || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                    <FaPhone />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-purple-300 uppercase tracking-wider block font-bold">Student Mobile</span>
                    <span className="font-semibold text-white font-mono block">{selectedStudent.phoneNumber || selectedStudent.phone || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                    <FaUser />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-purple-300 uppercase tracking-wider block font-bold">Parent Mobile</span>
                    <span className="font-semibold text-amber-300 font-mono block">{selectedStudent.parentsPhoneNumber || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
                    <FaGraduationCap />
                  </div>
                  <div className="truncate">
                    <span className="text-[10px] text-purple-300 uppercase tracking-wider block font-bold">Grade & Stream</span>
                    <span className="font-semibold text-white block">{selectedStudent.grade || 'General'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* 2. Mark Attendance Form */}
            <div className="bg-purple-50/50 dark:bg-slate-800/60 p-5 rounded-2xl border border-purple-200 dark:border-slate-700 space-y-4">
              <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                <FaEdit className="text-purple-600 dark:text-purple-400" /> Record Attendance Entry for {selectedStudent.name}
              </h4>

              <form onSubmit={handleMarkAttendance} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                {/* Select Class Schedule */}
                <div className="md:col-span-4">
                  <label className="block text-[10px] font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1">
                    Select Class Schedule
                  </label>
                  <select
                    value={selectedScheduleId}
                    onChange={(e) => setSelectedScheduleId(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-slate-600 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer shadow-sm"
                    required
                  >
                    <option value="" className="dark:bg-slate-800">-- Choose Class Schedule --</option>
                    {schedules.map(sch => (
                      <option key={sch._id} value={sch._id} className="dark:bg-slate-800">
                        {sch.title} ({sch.className}) — {sch.dayOfWeek} {sch.startTime}-{sch.endTime}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Attendance Date */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1">
                    Attendance Date
                  </label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-slate-800 border border-purple-300 dark:border-slate-600 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer shadow-sm"
                  />
                </div>

                {/* Status Toggle Buttons: PRESENT & ABSENT (NO LATE) */}
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-extrabold text-purple-900 dark:text-purple-300 uppercase tracking-wider mb-1">
                    Attendance Status
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAttendanceStatus('Present')}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        attendanceStatus === 'Present'
                          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400'
                          : 'bg-white dark:bg-slate-800 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-slate-700 hover:bg-emerald-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <FaCheckCircle className="text-xs" /> Present ✓
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttendanceStatus('Absent')}
                      className={`flex-1 py-2.5 px-3 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                        attendanceStatus === 'Absent'
                          ? 'bg-red-600 text-white shadow-md ring-2 ring-red-400'
                          : 'bg-white dark:bg-slate-800 text-red-800 dark:text-red-300 border border-red-300 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      <FaTimesCircle className="text-xs" /> Absent ✗
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? <FaSpinner className="animate-spin" /> : <FaCheck />} Submit
                  </button>
                </div>
              </form>
            </div>

            {/* 3. Sub-Tabs: Attendance Logs & Payment Records */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between border-b border-gray-200 dark:border-slate-800 pb-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('attendance')}
                    className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'attendance' || activeTab === 'mark'
                        ? 'bg-purple-700 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-900 dark:hover:text-white'
                    }`}
                  >
                    <FaCalendarAlt /> Attendance History ({attendanceHistory.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('payments')}
                    className={`py-2 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                      activeTab === 'payments'
                        ? 'bg-purple-700 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-900 dark:hover:text-white'
                    }`}
                  >
                    <FaCreditCard /> Payment Records ({studentPayments.length})
                  </button>
                </div>

                {activeTab === 'payments' && (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="bg-amber-400 hover:bg-amber-500 text-purple-950 font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    <FaPlusCircle className="text-xs" /> Record Counter Payment
                  </button>
                )}
              </div>

              {/* TAB CONTENT 1: ATTENDANCE LOGS */}
              {(activeTab === 'attendance' || activeTab === 'mark') && (
                <div className="space-y-2">
                  {loadingHistory ? (
                    <div className="p-8 text-center text-purple-600 dark:text-purple-400 space-y-2">
                      <FaSpinner className="animate-spin text-2xl mx-auto" />
                      <p className="text-xs font-semibold">Loading attendance records...</p>
                    </div>
                  ) : attendanceHistory.length === 0 ? (
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-8">No attendance records found for this student.</p>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-700/80 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs bg-white dark:bg-slate-800">
                      {attendanceHistory.map(rec => (
                        <div key={rec._id} className="p-3.5 flex justify-between items-center hover:bg-purple-50/40 dark:hover:bg-slate-700/50 transition">
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white text-xs">
                              {rec.scheduleId?.title || rec.courseId?.title || 'Class Session'}
                            </p>
                            <p className="text-[10px] text-purple-700 dark:text-purple-300 font-mono font-semibold mt-0.5">
                              📅 {new Date(rec.date).toLocaleDateString()} • {rec.remarks || `${rec.month || 'August'} - Week ${rec.weekNumber || 1}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-gray-500 dark:text-gray-300 uppercase bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-md">
                              {rec.mode || 'PHYSICAL_QR'}
                            </span>
                            <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] flex items-center gap-1 ${
                              rec.status === 'Present'
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
                            }`}>
                              {rec.status === 'Present' ? <FaCheckCircle className="text-[10px]" /> : <FaTimesCircle className="text-[10px]" />}
                              {rec.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB CONTENT 2: PAYMENT RECORDS */}
              {activeTab === 'payments' && (
                <div className="space-y-2">
                  {loadingPayments ? (
                    <div className="p-8 text-center text-purple-600 dark:text-purple-400 space-y-2">
                      <FaSpinner className="animate-spin text-2xl mx-auto" />
                      <p className="text-xs font-semibold">Loading payment records...</p>
                    </div>
                  ) : studentPayments.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 dark:text-gray-500 space-y-1 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700">
                      <FaCreditCard className="text-2xl mx-auto text-gray-300 dark:text-gray-600" />
                      <p className="text-xs font-bold text-gray-600 dark:text-gray-300">No payment transactions found for this student.</p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500">Payments made online or logged at the counter will appear here.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100 dark:divide-slate-700/80 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden text-xs bg-white dark:bg-slate-800">
                      {studentPayments.map(p => (
                        <div key={p._id} className="p-3.5 flex justify-between items-center hover:bg-purple-50/40 dark:hover:bg-slate-700/50 transition">
                          <div>
                            <p className="font-extrabold text-gray-900 dark:text-white text-xs">
                              {p.course?.title || p.remarks || 'Tuition Fee Payment'}
                            </p>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                              💳 Method: {p.paymentMethod || 'CARD_OTP'} • Ref: {p.transactionId || p.receiptNumber || p._id}
                            </p>
                            <p className="text-[10px] text-purple-700 dark:text-purple-300 font-mono font-semibold">
                              📅 Paid on: {new Date(p.createdAt || p.paymentDate).toLocaleDateString()} at {new Date(p.createdAt || p.paymentDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="font-extrabold text-xs text-purple-950 dark:text-white">
                              LKR {p.amount ? p.amount.toLocaleString() : '0'}
                            </p>
                            <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-extrabold text-[10px] inline-block">
                              {p.status || 'COMPLETED'} ✓
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl shadow-lg p-4 sm:p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-3xl font-extrabold tracking-tight">
              {isTeacher ? "My Class Attendance & Roster Workspace" : "Attendance Reports & Management Workspace"}
            </h1>
            <p className="text-purple-200 text-xs sm:text-sm mt-1">
              {isTeacher
                ? "Audit daily classroom attendance, view live check-ins, and mark attendance strictly for your assigned classes."
                : "Audit daily classroom attendance, query all-time attendance history by date, and mark student daily attendance."}
            </p>
          </div>
          <div className="bg-white/10 border border-white/20 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl flex items-center gap-2.5 self-start md:self-center">
            <FaCalendarAlt className="text-purple-300 text-xs sm:text-sm" />
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider">{new Date().toDateString()}</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Container */}
      <div className="space-y-4 sm:space-y-6">
        {/* Navigation Tabs - Responsive 2x2 grid on mobile, flex on desktop */}
        {/*
          🎨 HOW TO CHANGE TAB / BUTTON COLOR IN ATTENDANCE:
          - Active Tab Color (Default Deep Purple): 'bg-purple-700 text-white shadow-md'
          - To change active tab to Emerald Green:  'bg-emerald-600 text-white shadow-md'
          - To change active tab to Royal Blue:     'bg-blue-600 text-white shadow-md'
          - To change active tab to Amber / Gold:   'bg-amber-500 text-slate-900 shadow-md'
        */}
        <div className="grid grid-cols-2 lg:flex bg-white dark:bg-slate-900 p-1.5 sm:p-2 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm gap-1.5 sm:gap-2">
          {/* Admin & Counter Staff Only: Manual Marking & QR Kiosk */}
          {!isTeacher && (
            <>
              {/* 1st Tab: MARK STUDENT DAILY ATTENDANCE */}
              <button
                type="button"
                onClick={() => setAdminMode('manual')}
                className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
                  adminMode === 'manual'
                    ? 'bg-purple-700 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-900 dark:hover:text-white'
                }`}
              >
                <FaEdit className="text-sm sm:text-base shrink-0" />
                <span>Mark Attendance</span>
              </button>

              {/* 2nd Tab: LIVE QR SCANNING */}
              <button
                type="button"
                onClick={() => setAdminMode('qr')}
                className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
                  adminMode === 'qr'
                    ? 'bg-purple-700 text-white shadow-md'
                    : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-900 dark:hover:text-white'
                }`}
              >
                <FaCamera className="text-sm sm:text-base shrink-0" />
                <span>Live QR Scan</span>
              </button>
            </>
          )}

          {/* 3rd Tab: DAILY ATTENDANCE */}
          <button
            type="button"
            onClick={() => setAdminMode('daily')}
            className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
              adminMode === 'daily'
                ? 'bg-purple-700 text-white shadow-md'
                : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-900 dark:hover:text-white'
            }`}
          >
            <FaCalendarDay className="text-sm sm:text-base shrink-0" />
            <span className="sm:hidden">Daily Log</span>
            <span className="hidden sm:inline">{isTeacher ? "Daily Class Attendance (By Date)" : "Daily Attendance Log (By Date)"}</span>
          </button>

          {/* 4th Tab: ALL-TIME ATTENDANCE HISTORY */}
          <button
            type="button"
            onClick={() => setAdminMode('history')}
            className={`flex-1 py-2.5 sm:py-3 px-2 sm:px-4 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center ${
              adminMode === 'history'
                ? 'bg-purple-700 text-white shadow-md'
                : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-slate-700 hover:text-purple-900 dark:hover:text-white'
            }`}
          >
            <FaHistory className="text-sm sm:text-base shrink-0" />
            <span className="sm:hidden">Full History</span>
            <span className="hidden sm:inline">{isTeacher ? "All-Time Class Attendance History" : "All-Time Attendance History"}</span>
          </button>
        </div>

        {/* 1. LIVE QR SCANNER KIOSK */}
        {adminMode === 'qr' && renderQrScannerKiosk()}

        {/* 2. DAILY ATTENDANCE LOG VIEW */}
        {adminMode === 'daily' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Filter Control Bar */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                  <FaCalendarDay className="text-purple-600 dark:text-purple-400" />
                  Select Date & Filter Daily Attendance Roster
                </h3>
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold hidden sm:inline">
                  Filter by date, grade, or student
                </span>
              </div>

              <form onSubmit={handleAdminSearchSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Target Date */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                    Select Target Date
                  </label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-3 py-2.5 bg-purple-50/70 dark:bg-slate-800 border border-purple-300 dark:border-slate-700 rounded-xl text-xs font-bold text-purple-950 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
                  />
                </div>

                {/* Grade Filter */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Filter by Grade
                  </label>
                  <select
                    value={adminGradeFilter}
                    onChange={(e) => setAdminGradeFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
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
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Filter by Course
                  </label>
                  <select
                    value={adminCourseFilter}
                    onChange={(e) => setAdminCourseFilter(e.target.value)}
                    className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
                  >
                    <option value="">All Courses</option>
                    {coursesList.map(c => (
                      <option key={c._id} value={c._id}>{c.title} ({c.grade})</option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Student Search
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Search student name / Reg No..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="flex-1 px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-600"
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

            {/* Daily Attendance Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gray-50 dark:bg-slate-800/80">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FaListAlt className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Daily Attendance Log for {selectedDate}</span>
                </h4>
                <span className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 text-xs font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></span>
                  {adminLogs.length} Checked In
                </span>
              </div>

              {loadingAdminLogs ? (
                <div className="p-12 text-center text-purple-600 dark:text-purple-400 space-y-2">
                  <FaSpinner className="animate-spin text-3xl mx-auto" />
                  <p className="text-xs font-semibold">Loading daily attendance records...</p>
                </div>
              ) : adminLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 dark:text-gray-500 space-y-2">
                  <FaCalendarAlt className="text-4xl mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No attendance records found for {selectedDate}.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Pick another target date or mark attendance using QR Scan / Manual Roster.</p>
                </div>
              ) : (
                <div>
                  {(() => {
                    const totalPages = Math.ceil(adminLogs.length / itemsPerPage) || 1;
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedLogs = adminLogs.slice(startIndex, startIndex + itemsPerPage);

                    return (
                      <>
                        {/* Desktop Table View (hidden on mobile < md) */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700">
                              <tr>
                                <th className="p-3.5">Student Name & Reg No</th>
                                <th className="p-3.5">Grade</th>
                                <th className="p-3.5">Check-in Time</th>
                                <th className="p-3.5">Subject / Course</th>
                                <th className="p-3.5">Weekly Session</th>
                                <th className="p-3.5">Check-in Mode</th>
                                <th className="p-3.5">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-gray-300">
                              {paginatedLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-purple-50/40 dark:hover:bg-slate-800/60 transition-colors">
                                  <td className="p-3.5 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-extrabold flex items-center justify-center text-xs border border-purple-200 dark:border-purple-800 shrink-0">
                                      {log.studentId?.name ? log.studentId.name.charAt(0).toUpperCase() : 'S'}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-white">{log.studentId?.name || 'Unknown Student'}</p>
                                      <p className="text-[10px] text-purple-700 dark:text-purple-400 font-mono font-bold">
                                        {log.studentId?.registrationNumber || log.studentId?.email || 'N/A'}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-md font-bold text-[10px] border border-gray-200 dark:border-slate-700">
                                      {log.studentId?.grade || 'Grade 7'}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <p className="font-bold text-gray-900 dark:text-white">
                                      {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                      {new Date(log.date).toLocaleDateString()}
                                    </p>
                                  </td>
                                  <td className="p-3.5 font-bold text-purple-950 dark:text-purple-300">
                                    {log.courseId?.title || log.scheduleId?.title || 'Class Session'}
                                  </td>
                                  <td className="p-3.5">
                                    <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 px-2.5 py-1 rounded-md font-extrabold text-[10px] border border-purple-200 dark:border-purple-800">
                                      {log.remarks || `${log.month || 'August'} - Week ${log.weekNumber || 2}`}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      log.mode === 'PHYSICAL_QR' 
                                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    }`}>
                                      {log.mode || 'PHYSICAL_QR'}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full font-extrabold text-[10px] flex items-center gap-1 w-max border border-emerald-200 dark:border-emerald-800">
                                      <FaCheckCircle className="text-emerald-600 text-[10px]" />
                                      {log.status || 'Present'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View for Daily Attendance (< md) */}
                        <div className="md:hidden space-y-2.5 p-3">
                          {paginatedLogs.map((log) => (
                            <div key={log._id} className="bg-gray-50/70 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold flex items-center justify-center text-xs border border-purple-200 dark:border-purple-800 shrink-0">
                                    {log.studentId?.name ? log.studentId.name.charAt(0).toUpperCase() : 'S'}
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-xs text-gray-900 dark:text-white">{log.studentId?.name || 'Unknown Student'}</p>
                                    <p className="text-[10px] text-purple-700 dark:text-purple-400 font-mono font-bold">{log.studentId?.registrationNumber || 'No Reg No'}</p>
                                  </div>
                                </div>
                                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-extrabold text-[10px] flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                  <FaCheckCircle className="text-[10px]" /> {log.status || 'Present'}
                                </span>
                              </div>

                              <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-[10px] font-bold uppercase">Course</span>
                                  <span className="font-extrabold text-purple-950 dark:text-purple-300 text-right">{log.courseId?.title || log.scheduleId?.title || 'Class Session'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-[10px] font-bold uppercase">Grade & Session</span>
                                  <span className="text-gray-700 dark:text-gray-300 text-[11px] font-semibold">
                                    {log.studentId?.grade || 'Grade'} • {log.remarks || `${log.month || 'August'} - W${log.weekNumber || 1}`}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-[10px] font-bold uppercase">Check-in Time</span>
                                  <span className="font-mono text-gray-600 dark:text-gray-400 text-[10px]">
                                    {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {log.mode || 'QR'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-800/50">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Showing <span className="font-extrabold text-gray-800 dark:text-white">{adminLogs.length === 0 ? 0 : startIndex + 1}</span> to{' '}
                            <span className="font-extrabold text-gray-800 dark:text-white">{Math.min(startIndex + itemsPerPage, adminLogs.length)}</span> of{' '}
                            <span className="font-extrabold text-gray-800 dark:text-white">{adminLogs.length}</span> daily records
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800"
                            >
                              <FaChevronLeft className="text-[10px]" /> Previous
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                              <button
                                type="button"
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                                  currentPage === pageNum
                                    ? 'bg-purple-900 dark:bg-purple-700 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages || adminLogs.length === 0}
                              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800"
                            >
                              Next <FaChevronRight className="text-[10px]" />
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. MASTER ALL-TIME ATTENDANCE HISTORY ARCHIVE */}
        {adminMode === 'history' && (
          <div className="space-y-6 animate-fadeIn">
            {/* Master History Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-lg font-bold">
                  <FaHistory />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Total Archive Records</p>
                  <p className="text-xl font-extrabold text-gray-900 dark:text-white">{adminLogs.length}</p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-lg font-bold">
                  <FaGraduationCap />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Unique Students Logged</p>
                  <p className="text-xl font-extrabold text-indigo-900 dark:text-indigo-300">
                    {new Set(adminLogs.map(l => (l.studentId?._id || l.studentId)?.toString()).filter(Boolean)).size}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg font-bold">
                  <FaQrcode />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-gray-400">Method Breakdown</p>
                  <p className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    ⚡ {adminLogs.filter(l => l.mode === 'PHYSICAL_QR' || l.markedVia === 'QR_SCAN' || l.markedVia === 'AUTO_KIOSK').length} QR • ✏ {adminLogs.filter(l => l.mode !== 'PHYSICAL_QR' && l.markedVia !== 'QR_SCAN' && l.markedVia !== 'AUTO_KIOSK').length} Manual
                  </p>
                </div>
              </div>
            </div>

            {/* Filter Control Bar with Presets & Date Range */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-slate-800 pb-3">
                <div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                    <FaHistory className="text-purple-600 dark:text-purple-400" />
                    Search & Query Master Attendance Records Archive
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Filter by date range, target grades, courses, or specific student details.</p>
                </div>

                {/* Quick Date Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyHistoryPreset('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      activeHistoryPreset === 'ALL'
                        ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    All-Time
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHistoryPreset('MONTH')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      activeHistoryPreset === 'MONTH'
                        ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHistoryPreset('30DAYS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      activeHistoryPreset === '30DAYS'
                        ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    Last 30 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHistoryPreset('7DAYS')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer border ${
                      activeHistoryPreset === '7DAYS'
                        ? 'bg-purple-900 text-white border-purple-900 shadow-xs'
                        : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-purple-50'
                    }`}
                  >
                    Last 7 Days
                  </button>
                </div>
              </div>

              <form onSubmit={handleAdminSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
                {/* Start Date */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                    From Date
                  </label>
                  <input
                    type="date"
                    value={historyStartDate}
                    onChange={(e) => {
                      setHistoryStartDate(e.target.value);
                      setActiveHistoryPreset('CUSTOM');
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                    To Date
                  </label>
                  <input
                    type="date"
                    value={historyEndDate}
                    onChange={(e) => {
                      setHistoryEndDate(e.target.value);
                      setActiveHistoryPreset('CUSTOM');
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-medium text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-purple-600"
                  />
                </div>

                {/* Grade Filter */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Grade Filter
                  </label>
                  <select
                    value={adminGradeFilter}
                    onChange={(e) => setAdminGradeFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
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
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Course Filter
                  </label>
                  <select
                    value={adminCourseFilter}
                    onChange={(e) => setAdminCourseFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-white focus:ring-2 focus:ring-purple-600 outline-none cursor-pointer"
                  >
                    <option value="">All Courses</option>
                    {coursesList.map(c => (
                      <option key={c._id} value={c._id}>{c.title} ({c.grade})</option>
                    ))}
                  </select>
                </div>

                {/* Search Box */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                    Student Search
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Name or Reg No..."
                      value={adminSearchQuery}
                      onChange={(e) => setAdminSearchQuery(e.target.value)}
                      className="flex-1 px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="submit"
                      className="bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer shrink-0"
                      title="Search Master History"
                    >
                      <FaSearch />
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Master History Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-3.5 sm:p-4 border-b border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-gray-50 dark:bg-slate-800/80">
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <FaHistory className="text-purple-600 dark:text-purple-400 shrink-0" />
                  <span>Master Historical Attendance Records Archive</span>
                </h4>
                <span className="whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 text-xs font-black text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/80 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800 self-start sm:self-auto">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-purple-400"></span>
                  {adminLogs.length} Total Historical Records
                </span>
              </div>

              {loadingAdminLogs ? (
                <div className="p-12 text-center text-purple-600 dark:text-purple-400 space-y-2">
                  <FaSpinner className="animate-spin text-3xl mx-auto" />
                  <p className="text-xs font-semibold">Loading historical archive records...</p>
                </div>
              ) : adminLogs.length === 0 ? (
                <div className="p-12 text-center text-gray-400 dark:text-gray-500 space-y-2">
                  <FaHistory className="text-4xl mx-auto text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No historical attendance records found.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Try selecting "All-Time" preset or clearing the filters above.</p>
                </div>
              ) : (
                <div>
                  {(() => {
                    const totalPages = Math.ceil(adminLogs.length / itemsPerPage) || 1;
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedLogs = adminLogs.slice(startIndex, startIndex + itemsPerPage);

                    return (
                      <>
                        {/* Desktop Table View (hidden on mobile < md) */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-extrabold uppercase text-[10px] tracking-wider border-b border-gray-200 dark:border-slate-700">
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
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 font-medium text-gray-700 dark:text-gray-300">
                              {paginatedLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-purple-50/40 dark:hover:bg-slate-800/60 transition-colors">
                                  <td className="p-3.5 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 font-extrabold flex items-center justify-center text-xs border border-purple-200 dark:border-purple-800 shrink-0">
                                      {log.studentId?.name ? log.studentId.name.charAt(0).toUpperCase() : 'S'}
                                    </div>
                                    <div>
                                      <p className="font-bold text-gray-900 dark:text-white">{log.studentId?.name || 'Unknown Student'}</p>
                                      <p className="text-[10px] text-purple-700 dark:text-purple-400 font-mono font-bold">
                                        {log.studentId?.registrationNumber || log.studentId?.email || 'N/A'}
                                      </p>
                                    </div>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 px-2.5 py-1 rounded-md font-bold text-[10px] border border-gray-200 dark:border-slate-700">
                                      {log.studentId?.grade || 'Grade 7'}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <p className="font-bold text-gray-900 dark:text-white">{new Date(log.date).toLocaleDateString()}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                                      {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </td>
                                  <td className="p-3.5 font-bold text-purple-950 dark:text-purple-300">
                                    {log.courseId?.title || log.scheduleId?.title || 'Class Session'}
                                  </td>
                                  <td className="p-3.5">
                                    <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 px-2.5 py-1 rounded-md font-extrabold text-[10px] border border-purple-200 dark:border-purple-800">
                                      {log.remarks || `${log.month || 'August'} - Week ${log.weekNumber || 2}`}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      log.mode === 'PHYSICAL_QR' 
                                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                                        : 'bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                                    }`}>
                                      {log.mode || 'PHYSICAL_QR'}
                                    </span>
                                  </td>
                                  <td className="p-3.5">
                                    <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-1 rounded-full font-extrabold text-[10px] flex items-center gap-1 w-max border border-emerald-200 dark:border-emerald-800">
                                      <FaCheckCircle className="text-emerald-600 text-[10px]" />
                                      {log.status || 'Present'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Mobile Cards View for Historical Attendance (< md) */}
                        <div className="md:hidden space-y-2.5 p-3">
                          {paginatedLogs.map((log) => (
                            <div key={log._id} className="bg-gray-50/70 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 font-extrabold flex items-center justify-center text-xs border border-purple-200 dark:border-purple-800 shrink-0">
                                    {log.studentId?.name ? log.studentId.name.charAt(0).toUpperCase() : 'S'}
                                  </div>
                                  <div>
                                    <p className="font-extrabold text-xs text-gray-900 dark:text-white">{log.studentId?.name || 'Unknown Student'}</p>
                                    <p className="text-[10px] text-purple-700 dark:text-purple-400 font-mono font-bold">{log.studentId?.registrationNumber || 'No Reg No'}</p>
                                  </div>
                                </div>
                                <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-extrabold text-[10px] flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 shrink-0">
                                  <FaCheckCircle className="text-[10px]" /> {log.status || 'Present'}
                                </span>
                              </div>

                              <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1 text-xs">
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-[10px] font-bold uppercase">Date & Time</span>
                                  <span className="font-bold text-gray-800 dark:text-gray-200 text-[11px]">
                                    📅 {new Date(log.date).toLocaleDateString()} at {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-[10px] font-bold uppercase">Course</span>
                                  <span className="font-extrabold text-purple-950 dark:text-purple-300 text-right">{log.courseId?.title || log.scheduleId?.title || 'Class Session'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-gray-400 text-[10px] font-bold uppercase">Grade & Mode</span>
                                  <span className="text-gray-700 dark:text-gray-300 text-[11px]">
                                    {log.studentId?.grade || 'Grade'} • {log.mode || 'QR'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-gray-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-800/50">
                          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                            Showing <span className="font-extrabold text-gray-800 dark:text-white">{adminLogs.length === 0 ? 0 : startIndex + 1}</span> to{' '}
                            <span className="font-extrabold text-gray-800 dark:text-white">{Math.min(startIndex + itemsPerPage, adminLogs.length)}</span> of{' '}
                            <span className="font-extrabold text-gray-800 dark:text-white">{adminLogs.length}</span> historical records
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                              disabled={currentPage === 1}
                              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800"
                            >
                              <FaChevronLeft className="text-[10px]" /> Previous
                            </button>

                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                              <button
                                type="button"
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                                  currentPage === pageNum
                                    ? 'bg-purple-900 dark:bg-purple-700 text-white shadow-sm'
                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                                }`}
                              >
                                {pageNum}
                              </button>
                            ))}

                            <button
                              type="button"
                              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                              disabled={currentPage === totalPages || adminLogs.length === 0}
                              className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1 bg-white dark:bg-slate-800"
                            >
                              Next <FaChevronRight className="text-[10px]" />
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. MANUAL ROSTER & WEEKLY ATTENDANCE MARKING */}
        {adminMode === 'manual' && renderManualRosterWorkspace()}

      </div>

      {/* Record Physical / Counter Payment Modal */}
      <RecordPhysicalPaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        initialStudentId={selectedStudent?._id || ''}
        onSuccess={() => {
          if (selectedStudent?._id) {
            fetchStudentPayments(selectedStudent._id);
          }
        }}
      />
    </div>
  );
};

export default Attendance;
