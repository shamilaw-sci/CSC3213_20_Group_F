import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
  FaCheck
} from 'react-icons/fa';

const Attendance = () => {
  const [scannerMode, setScannerMode] = useState('qr'); // 'qr' | 'search'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('mark'); // 'mark', 'history', 'payments'

  // Live QR Scanner State
  const [kioskScheduleId, setKioskScheduleId] = useState('AUTO');
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

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

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

  const processQrCheckIn = async (rawCode) => {
    if (scanning || !rawCode) return;
    setScanning(true);

    let regNo = rawCode.trim();
    try {
      const parsed = JSON.parse(rawCode);
      if (parsed.registrationNumber) {
        regNo = parsed.registrationNumber;
      }
    } catch (e) {
      // raw regNo string
    }

    try {
      const res = await api.post('/attendance/scan-qr', {
        registrationNumber: regNo,
        scheduleId: kioskScheduleId
      });

      playChimeSound();
      setLastScannedResult(res.data);
      setRecentScans(prev => [res.data, ...prev.slice(0, 9)]);
      toast.success(res.data.message || `Check-in recorded for ${res.data.student.name}!`);
    } catch (err) {
      toast.error(err.response?.data?.error || "QR scan check-in failed.");
    } finally {
      setTimeout(() => setScanning(false), 2000);
    }
  };

  useEffect(() => {
    let scanner;
    if (scannerMode === 'qr') {
      scanner = new Html5QrcodeScanner(
        "qr-reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );

      scanner.render(
        (decodedText) => processQrCheckIn(decodedText),
        () => { /* per frame noop */ }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(e => console.error("Scanner clear error", e));
      }
    };
  }, [scannerMode]);

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

  const fetchSchedules = async (studentGrade) => {
    try {
      const res = await api.get('/schedule');
      // Prioritize schedules matching student's grade
      const sortedSchedules = [...res.data].sort((a, b) => {
        if (a.className === studentGrade && b.className !== studentGrade) return -1;
        if (a.className !== studentGrade && b.className === studentGrade) return 1;
        return 0;
      });
      setSchedules(sortedSchedules);

      // Auto-select first schedule matching grade if available
      const matching = sortedSchedules.find(s => s.className === studentGrade);
      if (matching) {
        setSelectedScheduleId(matching._id);
      } else if (sortedSchedules.length > 0) {
        setSelectedScheduleId(sortedSchedules[0]._id);
      }
    } catch (err) {
      console.error("Error fetching schedules", err);
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
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Attendance Marking Workspace</h1>
            <p className="text-purple-200 text-sm mt-1">Mark and monitor real-time classroom attendance for arriving students.</p>
          </div>
          <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-lg flex items-center gap-3 self-start md:self-center">
            <FaCalendarAlt className="text-purple-300" />
            <span className="text-xs font-bold uppercase tracking-wider">{new Date().toDateString()}</span>
          </div>
        </div>
      </div>

      {/* Mode Switcher Bar */}
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

      {/* MODE 1: LIVE QR CODE SCANNER KIOSK */}
      {scannerMode === 'qr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left 2 Columns: Camera Scanner & Live Scan Result Card */}
          <div className="lg:col-span-2 space-y-6">

            {/* Camera Scanner Container */}
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

              {/* Target Class Schedule Selector */}
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

              {/* HTML5 Camera Viewport */}
              <div className="relative">
                <div id="qr-reader" className="w-full max-w-md mx-auto rounded-2xl overflow-hidden shadow-inner border border-purple-200"></div>
              </div>

              {/* Quick Reg No Manual Override */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manualQrCode) processQrCheckIn(manualQrCode);
                }}
                className="flex gap-2 pt-2 border-t border-gray-100"
              >
                <input
                  type="text"
                  placeholder="Enter Student Reg No manually (e.g. STU-2026-G06-0042 / OL-G06-2012-4829)..."
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

            {/* Last Scanned Result Card */}
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="bg-white/10 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                        {lastScannedResult.student.grade}
                      </span>
                      <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
                        Attendance Status: Present ✓
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 p-3 rounded-xl border border-white/10 text-xs text-purple-200 flex items-center gap-2">
                  <span>📱</span>
                  <span>Automated Parent SMS Alert dispatched to <strong>{lastScannedResult.student.parentsPhoneNumber || 'Parent'}</strong></span>
                </div>
              </div>
            )}

          </div>

          {/* Right Column: Live Recent Check-ins Feed */}
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-md space-y-4 h-fit">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h4 className="font-extrabold text-gray-900 text-base flex items-center gap-2">
                <span>📋</span> Today's Check-ins Feed
              </h4>
              <span className="bg-purple-100 text-purple-900 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                {recentScans.length} Students
              </span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {recentScans.length > 0 ? (
                recentScans.map((scan, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 border border-gray-150 rounded-2xl flex items-center justify-between hover:bg-purple-50/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-purple-200 text-purple-950 rounded-xl flex items-center justify-center font-bold text-sm">
                        {scan.student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-extrabold text-gray-900 text-xs">{scan.student.name}</p>
                        <p className="font-mono text-[10px] text-purple-700 font-bold">{scan.student.registrationNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full block ${scan.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {scan.paymentStatus === 'PAID' ? 'Paid ✓' : 'Unsettled'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold block mt-0.5">
                        {new Date(scan.scanTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 italic text-xs">
                  No QR check-ins scanned yet today.
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* MODE 2: STUDENT SEARCH & MANUAL ROSTER (Rendered when scannerMode === 'search') */}
      {scannerMode === 'search' && (
        <>
          {/* Student Search & Select Box */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <form onSubmit={handleSearchSubmit} className="relative">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Search Student</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student's name or registration number (e.g. REG1001)..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm shadow-inner transition-all"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
            >
              {searching ? <FaSpinner className="animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-150 animate-fadeIn">
              {searchResults.map(student => (
                <div
                  key={student._id}
                  onClick={() => handleSelectStudent(student)}
                  className="p-3 hover:bg-purple-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{student.name}</p>
                    <p className="text-xs text-gray-500 uppercase font-bold">{student.registrationNumber || 'No Reg No'}</p>
                  </div>
                  <span className="bg-purple-100 text-purple-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    {student.grade || 'No Grade'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Selected Student Details and Operations Workspace */}
      {selectedStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Student Details Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col items-center text-center relative">
              {/* Close/Deselect button */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-red-500 text-sm transition-colors cursor-pointer font-bold border-none bg-transparent"
              >
                ✕ Close
              </button>

              {selectedStudent.profilePicture ? (
                <img 
                  src={selectedStudent.profilePicture} 
                  alt={selectedStudent.name} 
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover border-2 border-purple-200 shadow-sm mb-4 mt-2"
                />
              ) : (
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-3xl font-bold shadow-inner mb-4 mt-2">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-800 leading-tight">{selectedStudent.name}</h2>
              <p className="bg-purple-100 text-purple-800 font-extrabold text-xs tracking-wider px-3 py-1 rounded-full mt-2 uppercase">
                {selectedStudent.registrationNumber || 'UNASSIGNED'}
              </p>

              <hr className="w-full my-5 border-gray-100" />

              <div className="w-full space-y-3.5 text-left text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <FaGraduationCap className="text-purple-500 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Assigned Grade</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.grade || 'Not Assigned'}</p>
                  </div>
                </div>
                {selectedStudent.parentsPhoneNumber && (
                  <div className="flex items-center gap-3">
                    <FaPhone className="text-purple-500 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Parent's Phone</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.parentsPhoneNumber}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <FaEnvelope className="text-purple-500 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Student Email</p>
                    <p className="font-semibold text-gray-800 truncate max-w-[200px]">{selectedStudent.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Helper Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                  <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider">Attended</p>
                  <p className="text-xl font-extrabold text-green-800 mt-1">
                    {attendanceHistory.filter(r => r.status === 'Present').length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                  <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Absent</p>
                  <p className="text-xl font-extrabold text-red-800 mt-1">
                    {attendanceHistory.filter(r => r.status === 'Absent').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">

            {/* Tab Headers */}
            <div className="flex border-b border-gray-150 bg-gray-50/50">
              <button
                onClick={() => setActiveTab('mark')}
                className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'mark'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
              >
                <FaCalendarDay /> Mark Attendance
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'history'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
              >
                <FaHistory /> Attendance History
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'payments'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
              >
                <FaCreditCard /> Payment Records
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 flex-1 min-h-[400px]">

              {/* Tab 1: MARK ATTENDANCE */}
              {activeTab === 'mark' && (
                <form onSubmit={handleMarkAttendance} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Select Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Class Schedule</label>
                      <select
                        value={selectedScheduleId}
                        onChange={(e) => setSelectedScheduleId(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 focus:outline-none text-sm"
                      >
                        <option value="">-- Choose Class Schedule --</option>
                        {schedules.map(schedule => {
                          const isRecommended = schedule.className === selectedStudent.grade;
                          return (
                            <option key={schedule._id} value={schedule._id}>
                              {schedule.title} ({schedule.className}) {isRecommended ? '★ Recommended' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Schedule Details Box (Dynamic Preview) */}
                  {activeSchedule && (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2 animate-fadeIn text-xs text-purple-800">
                      <h4 className="font-bold text-purple-900 text-sm">{activeSchedule.title} Schedule Specs:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <FaClock className="text-purple-500 shrink-0" />
                          <span>{activeSchedule.dayOfWeek} at {activeSchedule.startTime} - {activeSchedule.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FaMapMarkerAlt className="text-purple-500 shrink-0" />
                          <span>Room: {activeSchedule.room}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FaGraduationCap className="text-purple-500 shrink-0" />
                          <span>Grade Target: {activeSchedule.className}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Picker (Present, Absent) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">Attendance Status</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setAttendanceStatus('Present')}
                        className={`py-3 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${attendanceStatus === 'Present'
                            ? 'bg-green-600 border-green-600 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <FaCheckCircle /> Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendanceStatus('Absent')}
                        className={`py-3 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${attendanceStatus === 'Absent'
                            ? 'bg-red-600 border-red-600 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <FaTimesCircle /> Absent
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                    >
                      {submitting ? <FaSpinner className="animate-spin" /> : 'Log Attendance'}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                      * Logging attendance will trigger parent SMS notifications and student email alerts in the next rollout phase.
                    </p>
                  </div>
                </form>
              )}

              {/* Tab 2: ATTENDANCE HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <FaSpinner className="animate-spin text-purple-600 text-2xl" />
                      <p className="text-xs text-gray-500">Retrieving attendance logs...</p>
                    </div>
                  ) : attendanceHistory.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <FaHistory className="mx-auto text-gray-300 text-3xl mb-3" />
                      <p className="text-sm font-semibold text-gray-500">No attendance logs logged yet for this student.</p>
                      <button
                        onClick={() => setActiveTab('mark')}
                        className="text-xs text-purple-600 font-bold mt-2 hover:underline cursor-pointer border-none bg-transparent"
                      >
                        Mark Today's Attendance
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-150">
                      <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead className="bg-gray-50 font-bold uppercase tracking-wider text-gray-500">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Class/Course</th>
                            <th className="p-3">Schedule Spec</th>
                            <th className="p-3">Marked By</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-700">
                          {attendanceHistory.map(record => (
                            <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-medium whitespace-nowrap">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <p className="font-semibold">{record.scheduleId?.title || 'Unknown Class'}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{record.courseId?.title || ''}</p>
                              </td>
                              <td className="p-3">
                                {record.scheduleId ? (
                                  <span>{record.scheduleId.dayOfWeek} • {record.scheduleId.startTime}</span>
                                ) : '-'}
                              </td>
                              <td className="p-3">
                                {record.markedBy?.name || 'Admin'}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                  record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: REAL PAYMENT RECORDS VIEW */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  {loadingPayments ? (
                    <div className="p-8 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="text-xs text-gray-500 mt-2 font-semibold">Loading student payment records...</p>
                    </div>
                  ) : studentPayments.length === 0 ? (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center space-y-2">
                      <FaCreditCard className="text-gray-400 text-2xl mx-auto" />
                      <p className="text-sm font-bold text-gray-700">No Payment Records Found</p>
                      <p className="text-xs text-gray-500">
                        {selectedStudent?.name} has not completed any course fee payments yet.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Real Payment Transaction Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {studentPayments.slice(0, 2).map((payment) => {
                          const isCounter = payment.paymentMethod === 'CASH_COUNTER' || payment.paymentMethod === 'POS_CARD' || payment.paymentMethod === 'BANK_TRANSFER' || payment.transactionId?.startsWith('REC-PHYS');
                          return (
                            <div key={payment._id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-200">
                                  STATUS: SETTLED ✓
                                </span>
                                <span className="text-[10px] font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded-md">
                                  {isCounter ? '🏫 Counter Cashier' : '💳 Online Card'}
                                </span>
                              </div>
                              <h4 className="text-base font-extrabold text-gray-800 line-clamp-1">
                                {payment.course?.title || 'Course Fee'}
                              </h4>
                              <div className="text-xs text-gray-600 space-y-1.5 pt-1">
                                <p className="flex justify-between">
                                  <span className="text-gray-400 font-semibold">Receipt / Tx ID:</span>
                                  <span className="font-mono text-purple-900 font-bold">{payment.transactionId}</span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-gray-400 font-semibold">Amount Paid:</span>
                                  <span className="font-extrabold text-emerald-700">LKR {(payment.amount || 2500).toLocaleString()}.00</span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-gray-400 font-semibold">Payment Date:</span>
                                  <span className="font-medium text-gray-800">{new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}</span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-gray-400 font-semibold">Method:</span>
                                  <span className="font-semibold text-gray-800">{payment.paymentMethod || 'Card'}</span>
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Transaction History Table */}
                      <div className="border border-gray-150 rounded-xl overflow-hidden shadow-xs">
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-150 flex justify-between items-center">
                          <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Verified Transaction History Log</h4>
                          <span className="text-[10px] text-purple-700 font-extrabold uppercase">Live Database Receipts</span>
                        </div>
                        <div className="divide-y divide-gray-150 text-xs">
                          {studentPayments.map((payment) => (
                            <div key={payment._id} className="p-3.5 flex justify-between items-center hover:bg-gray-50/50 transition">
                              <div>
                                <p className="font-bold text-gray-900">
                                  LKR {(payment.amount || 2500).toLocaleString()}.00 — {payment.course?.title || 'Course Fee'}
                                </p>
                                <p className="text-[10px] text-purple-700 font-mono mt-0.5">
                                  Receipt #{payment.transactionId} ({payment.paymentMethod || 'Card'})
                                </p>
                              </div>
                              <div className="text-right">
                                <span className="text-gray-600 font-semibold">{new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}</span>
                                <span className="block text-[10px] text-emerald-600 font-extrabold uppercase">Completed ✓</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

        </div>
      ) : (
        /* Empty State: Prompt Search */
        <div className="bg-white rounded-xl shadow-md border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-xl mx-auto mb-4 border border-purple-100">
            <FaUser />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Student Selected</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 leading-normal">
            Use the search panel above to search for a student by their Name or Registration Number to start marking attendance or auditing logs.
          </p>
        </div>
      )}
        </>
      )}
    </div>
  );
};

export default Attendance;
