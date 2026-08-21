import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaUsers,
  FaChalkboardTeacher,
  FaBookOpen,
  FaChartLine,
  FaUserGraduate,
  FaStar,
  FaVideo,
  FaPlusCircle,
  FaPlayCircle,
  FaTrophy,
  FaClock,
  FaCalendarAlt,
  FaTrash,
  FaCheck,
  FaTimes,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaBullhorn,
  FaCalendarCheck,
  FaReceipt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaGraduationCap,
  FaCoins,
  FaMoneyBillWave,
  FaFilter,
  FaExternalLinkAlt,
  FaComments,
  FaUserShield,
  FaSearch
} from 'react-icons/fa';
import StudentIdCard from './StudentIdCard';
import AddScheduleModal from './AddScheduleModal';

// Grade options matching registration grade requirements
const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

// --- HERO WELCOME BANNER ---
const DashboardHero = ({ user, roleBadge, quickActions, extraBadge }) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-6 sm:p-8 text-white shadow-xl mb-6 border border-purple-900/40 animate-fadeIn">
      {/* Ambient background glow orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none transform translate-x-24 -translate-y-24" />
      <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
            <span className="bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-black uppercase px-3.5 py-1 rounded-full tracking-widest backdrop-blur-md shadow-xs">
              {roleBadge}
            </span>
            <span className="text-purple-200/90 text-xs font-semibold flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <FaClock className="text-purple-400 text-xs" /> {timeStr}
            </span>
            <span className="text-purple-300/80 text-xs font-medium hidden sm:inline-flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              📅 {dateStr}
            </span>
            {extraBadge && (
              <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-bold px-3 py-1 rounded-full">
                {extraBadge}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Welcome back, {user?.name || 'Administrator'}! <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-purple-200/80 text-xs sm:text-sm mt-1 max-w-xl font-medium">
            Live institute management overview, student enrolment analytics, and real-time operations.
          </p>
        </div>

        {quickActions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {quickActions}
          </div>
        )}
      </div>
    </div>
  );
};

// --- CUSTOM SMOOTH BEZIER SVG LINE CHART COMPONENT ---
const SvgLineChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const padding = 40;
  const width = 560;
  const height = 240;
  const maxVal = Math.max(...data.map(d => d.count)) * 1.3 || 10;

  const points = data.map((d, index) => {
    const x = padding + (index * (width - padding * 2) / (data.length - 1 || 1));
    const y = height - padding - (d.count * (height - padding * 2) / maxVal);
    return { x, y, month: d.month, count: d.count };
  });

  // Calculate smooth cubic Bezier path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (curr.x - prev.x) / 2;
    const cpy2 = curr.y;
    pathD += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }

  const fillD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#6366f1" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7c3aed" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Horizontal Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const y = padding + r * (height - padding * 2);
        const value = Math.round(maxVal * (1 - r));
        return (
          <g key={i}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={r === 1 ? 'none' : '3 3'} />
            <text x={padding - 10} y={y + 3.5} fill="#94a3b8" fontSize="9" textAnchor="end" className="font-bold">{value}</text>
          </g>
        );
      })}

      {/* Area under curve */}
      <path d={fillD} fill="url(#chartGrad)" />

      {/* Main Curve */}
      <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

      {/* Interactive Dots and Badges */}
      {points.map((p, i) => (
        <g key={i} className="group cursor-pointer">
          <circle cx={p.x} cy={p.y} r="5" fill="#7c3aed" stroke="white" strokeWidth="2.5" className="transition-transform group-hover:scale-125" />
          <circle cx={p.x} cy={p.y} r="14" fill="#7c3aed" opacity="0" className="hover:opacity-15 transition-opacity" />

          {/* Hover Tooltip Card */}
          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <rect x={p.x - 28} y={p.y - 32} width="56" height="22" rx="6" fill="#0f172a" />
            <text x={p.x} y={p.y - 18} fill="white" fontSize="9" fontWeight="900" textAnchor="middle">{p.count} Enrolled</text>
          </g>
          <text x={p.x} y={height - padding + 16} fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">{p.month}</text>
        </g>
      ))}
    </svg>
  );
};

// --- PAYMENT METRICS DONUT CHART COMPONENT ---
const PaymentDonut = ({ totalCollected = 0, pendingDues = 0, onNavigate }) => {
  const total = totalCollected + pendingDues;
  const percentage = total > 0 ? Math.round((totalCollected / total) * 100) : 100;
  const strokeDashoffset = 251.2 * (1 - percentage / 100);

  return (
    <div className="flex flex-col items-center justify-between p-2 h-full">
      <div className="relative w-36 h-36 flex items-center justify-center my-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="9" fill="transparent" className="dark:stroke-slate-800" />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#10b981"
            strokeWidth="9"
            fill="transparent"
            strokeDasharray="251.2"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{percentage}%</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-widest mt-0.5">Settled</span>
        </div>
      </div>

      <div className="w-full space-y-2 mt-3">
        <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
          <div className="bg-emerald-50/90 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100/80 dark:border-emerald-800/40 flex flex-col items-center shadow-2xs">
            <span className="text-emerald-800 dark:text-emerald-300 font-black text-[10px] uppercase tracking-wider">Paid Total</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">LKR {totalCollected.toLocaleString()}</span>
          </div>
          <div className="bg-amber-50/90 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-100/80 dark:border-amber-800/40 flex flex-col items-center shadow-2xs">
            <span className="text-amber-800 dark:text-amber-300 font-black text-[10px] uppercase tracking-wider">Pending Dues</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">LKR {pendingDues.toLocaleString()}</span>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
          >
            <span>View Fee Records & Invoices</span>
            <FaArrowRight className="text-[10px]" />
          </button>
        )}
      </div>
    </div>
  );
};

// --- ATTENDANCE SUMMARY CIRCULAR BAR ---
const AttendanceRing = ({ percentage = 100 }) => {
  const safePct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = 251.2 * (1 - safePct / 100);

  const getStatusText = (pct) => {
    if (pct >= 90) return { label: 'Excellent Attendance', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50' };
    if (pct >= 75) return { label: 'Good Standing', color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50' };
    return { label: 'Needs Improvement', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50' };
  };

  const statusInfo = getStatusText(safePct);

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" className="dark:stroke-slate-800" />
          <circle cx="50" cy="50" r="40" stroke="#6366f1" strokeWidth="8" fill="transparent"
            strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{safePct}%</span>
          <span className="text-4xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Avg Rate</span>
        </div>
      </div>
      <span className={`mt-3 text-3xs font-extrabold border px-3 py-1 rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    </div>
  );
};

// ==========================================
//          ADMINISTRATOR DASHBOARD
// ==========================================
const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    onlineStudents: 0,
    physicalStudents: 0,
    teachers: 0,
    courses: 0,
    recentRegistrations: [],
    growthData: [],
    totalCollected: 0,
    pendingDues: 0,
    todayArrivalsCount: 0
  });
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ today: { present: 0, late: 0, absent: 0, total: 0 } });
  const [loading, setLoading] = useState(true);

  // Timetable Day Filter State
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, schedRes, coursesRes, usersRes, attRes] = await Promise.allSettled([
        api.get('/auth/admin-stats'),
        api.get('/schedule'),
        api.get('/courses'),
        api.get('/auth/users'),
        api.get('/attendance/stats/summary')
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value.data);
      if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data);
      if (usersRes.status === 'fulfilled') {
        setTeachers(usersRes.value.data.filter(u => u.role === 'teacher'));
      }
      if (attRes.status === 'fulfilled') setAttendanceStats(attRes.value.data);
    } catch (err) {
      console.error("Admin dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (scheduleData) => {
    if (!scheduleData.title || !scheduleData.className || !scheduleData.dayOfWeek || !scheduleData.startTime || !scheduleData.endTime) {
      toast.error("Please fill in all required calendar details.");
      return;
    }

    try {
      const res = await api.post('/schedule', scheduleData);
      toast.success(res.data.message || "Class added to timetable successfully!");
      if (res.data.schedule) {
        setSchedule(prev => [...prev, res.data.schedule]);
      } else {
        fetchAdminData();
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add class schedule");
      throw err;
    }
  };

  const handleDeleteSchedule = async (id, title) => {
    if (!window.confirm(`Are you sure you want to remove "${title}" from the calendar?`)) return;

    try {
      await api.delete(`/schedule/${id}`);
      toast.success("Schedule entry deleted successfully.");
      setSchedule(schedule.filter(item => item._id !== id));
    } catch (err) {
      toast.error("Failed to delete schedule entry");
    }
  };

  // Helper for Schedule Day of Week
  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const getTodayDayCode = () => {
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[new Date().getDay()];
  };
  const todayCode = getTodayDayCode();

  const filteredSchedule = schedule.filter(sch => {
    if (selectedDayFilter === 'ALL') return true;
    if (selectedDayFilter === 'TODAY') {
      const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
      return schDay === todayCode;
    }
    const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
    return schDay === selectedDayFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* ========================================================================= */}
      {/* 1. HERO COMMAND BANNER */}
      {/* ========================================================================= */}
      <DashboardHero
        user={user}
        roleBadge="System Administrator"
        extraBadge="🟢 Operations Active"
        quickActions={
          <>
            <button
              onClick={() => navigate('/add-course')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-purple-900/30 active:scale-95 cursor-pointer"
            >
              <FaPlusCircle /> Create Course
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-2xl transition flex items-center gap-2 backdrop-blur-md active:scale-95 cursor-pointer"
            >
              <FaCalendarAlt /> Add Class
            </button>
            <button
              onClick={() => navigate('/sms-settings')}
              className="bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              title="Broadcast SMS Announcement"
            >
              <FaBullhorn /> SMS Broadcast
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-2xl transition flex items-center gap-1.5 backdrop-blur-md active:scale-95 cursor-pointer"
              title="View In-Depth Analytics"
            >
              <FaChartLine /> Analytics
            </button>
          </>
        }
      />

      {/* ========================================================================= */}
      {/* 2. STATS KPI MATRIX (5 METRICS RIBBON) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Students */}
        <div
          onClick={() => navigate('/manage-users')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Students</span>
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaUsers className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.students || 0}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-extrabold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-800/60">
                💻 {stats.onlineStudents || Math.max(0, (stats.students || 0) - (stats.physicalStudents || 0))} Online
              </span>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-extrabold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/60">
                🏫 {stats.physicalStudents || 0} Physical
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Teachers */}
        <div
          onClick={() => navigate('/manage-users')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Faculty Staff</span>
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaChalkboardTeacher className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.teachers || 0}</h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-extrabold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/60">
                👨‍🏫 Active Instructors
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Active Courses */}
        <div
          onClick={() => navigate('/courses')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Active Courses</span>
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaBookOpen className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.courses || 0}</h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-extrabold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-800/60">
                📚 Grades 6–13
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Arrived Today */}
        <div
          onClick={() => navigate('/attendance')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Arrived Today</span>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaCalendarCheck className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {attendanceStats.today?.present || stats.todayArrivalsCount || 0}
            </h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/60">
                🏫 Counter Check-ins
              </span>
            </div>
          </div>
        </div>

        {/* Metric 5: Revenue Collected */}
        <div
          onClick={() => navigate('/payments')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Revenue (LKR)</span>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaCoins className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">
              {(stats.totalCollected || 0).toLocaleString()}
            </h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/60">
                💳 {stats.pendingDues > 0 ? `${stats.pendingDues.toLocaleString()} Pending` : '100% Settled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL CHARTS ROW (Curved Intake Line & Fee Collection Donut) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Intake Curve */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Student Intake & Registration Trend</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">Monthly enrollment progression across all academic grades</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-black px-3 py-1 rounded-xl border border-purple-100 dark:border-purple-800/60">
                📈 {stats.students || 0} Total Registered
              </span>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center pt-2">
            {stats.growthData && stats.growthData.length > 0 ? (
              <SvgLineChart data={stats.growthData} />
            ) : (
              <p className="text-xs text-slate-400 italic">Intake trend will display as student registrations grow.</p>
            )}
          </div>
        </div>

        {/* Fee Collection Donut */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Fee Collections & Settlement</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">Total collected vs outstanding student fee dues</p>
          </div>
          <div className="flex-1 py-2">
            <PaymentDonut
              totalCollected={stats.totalCollected}
              pendingDues={stats.pendingDues}
              onNavigate={() => navigate('/payments')}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. OPERATIONS & SCHEDULE GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registrations Log */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Recent Admissions</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Newest enrolled student profiles</p>
              </div>
              <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                {stats.recentRegistrations?.length || 0}
              </span>
            </div>

            <div className="space-y-3.5">
              {stats.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                stats.recentRegistrations.map((reg, idx) => {
                  const colors = ['bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300', 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300', 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300', 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'];
                  const avatarColor = colors[idx % colors.length];
                  const initial = (reg.name || 'S').charAt(0).toUpperCase();

                  return (
                    <div key={reg._id || idx} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${avatarColor} flex items-center justify-center font-black text-sm shrink-0 shadow-2xs`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{reg.name}</h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate">{reg.email}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-lg border border-purple-100 dark:border-purple-800/60 block">
                          {reg.grade || 'General'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 block">
                          {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-8">No recent registrations</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={() => navigate('/manage-users')}
              className="w-full py-2.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-black text-xs rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View All Enrolled Students</span>
              <FaArrowRight className="text-[10px]" />
            </button>
          </div>
        </div>

        {/* Timetable Schedule Manager */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Institute Master Timetable</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Recurring class schedules and room assignments</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <FaPlusCircle /> Add Class Session
              </button>
            </div>

            {/* Day of Week Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${
                  selectedDayFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
              >
                ALL ({schedule.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayFilter('TODAY')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${
                  selectedDayFilter === 'TODAY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800'
                }`}
              >
                <span>TODAY ({todayCode})</span>
              </button>
              {daysOfWeek.map((day) => {
                const count = schedule.filter(s => (s.dayOfWeek || '').toUpperCase().slice(0, 3) === day).length;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(day)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedDayFilter === day
                        ? 'bg-purple-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                    }`}
                  >
                    {day} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Timetable List */}
            <div className="overflow-y-auto max-h-[300px] space-y-2.5 pr-1">
              {filteredSchedule && filteredSchedule.length > 0 ? (
                filteredSchedule.map((sch) => {
                  const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
                  const isToday = schDay === todayCode;

                  return (
                    <div
                      key={sch._id}
                      className={`flex justify-between items-center p-3.5 rounded-2xl border transition-all ${
                        isToday
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40'
                          : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50/20 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-2xl flex flex-col items-center min-w-[62px] shrink-0 ${
                          isToday ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        }`}>
                          <span className="text-[10px] font-black uppercase tracking-wider">{sch.dayOfWeek ? sch.dayOfWeek.slice(0, 3) : 'DAY'}</span>
                          <FaCalendarAlt className="text-sm mt-0.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{sch.title}</h4>
                            {isToday && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Happening Today
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                            <span className="flex items-center gap-1">🕒 {sch.startTime} – {sch.endTime}</span>
                            <span className="flex items-center gap-1">📍 {sch.room || 'Classroom'}</span>
                            {(sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName) && (
                              <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold">
                                👨‍🏫 {sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteSchedule(sch._id, sch.title)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-xl transition cursor-pointer shrink-0 ml-2"
                        title="Delete Class Schedule"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-xs bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No classes scheduled for {selectedDayFilter === 'ALL' ? 'this institute' : selectedDayFilter === 'TODAY' ? 'today' : selectedDayFilter}.
                  <p
                    onClick={() => setShowModal(true)}
                    className="text-purple-600 dark:text-purple-400 font-bold not-italic mt-1 cursor-pointer hover:underline"
                  >
                    + Click here to schedule a class
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ADMINISTRATIVE QUICK ACTION DOCK */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-purple-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
          <div>
            <h3 className="text-base font-black text-white">Institute Administration Shortcuts</h3>
            <p className="text-xs text-purple-200 font-medium">Quick navigation to frequent institutional operations</p>
          </div>
          <span className="text-[10px] font-black text-purple-300 bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
            Fast Access
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            onClick={() => navigate('/sms-settings')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📢
            </div>
            <h4 className="font-extrabold text-sm text-white">SMS Broadcast</h4>
            <p className="text-xs text-purple-200 mt-0.5">Send instant notices to parents & students.</p>
          </div>

          <div
            onClick={() => navigate('/payments')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              💳
            </div>
            <h4 className="font-extrabold text-sm text-white">Fee Settlement</h4>
            <p className="text-xs text-purple-200 mt-0.5">Record offline payments & cash receipts.</p>
          </div>

          <div
            onClick={() => navigate('/manage-users')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              👥
            </div>
            <h4 className="font-extrabold text-sm text-white">User Directory</h4>
            <p className="text-xs text-purple-200 mt-0.5">Manage student & teacher accounts.</p>
          </div>

          <div
            onClick={() => navigate('/enrollments')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📑
            </div>
            <h4 className="font-extrabold text-sm text-white">Course Admissions</h4>
            <p className="text-xs text-purple-200 mt-0.5">View and approve student enrollments.</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. CREATE SCHEDULE MODAL */}
      {/* ========================================================================= */}
      <AddScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveSchedule}
        courses={courses}
        teachers={teachers}
        gradeOptions={gradeOptions}
      />
    </div>
  );
};

// ==========================================
//            TEACHER DASHBOARD
// ==========================================
const TeacherDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ coursesCount: 0, studentsCount: 0, rating: "5.0", coursesList: [], studentsList: [] });
  const [schedule, setSchedule] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Attendance Roll Call State
  const [selectedCourse, setSelectedCourse] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [rollCallStatus, setRollCallStatus] = useState({}); // { [studentId]: 'Present' | 'Absent' }
  const [savingAttendance, setSavingAttendance] = useState(false);

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const [statsRes, schedRes, attRes] = await Promise.allSettled([
        api.get('/auth/teacher-stats'),
        api.get('/schedule'),
        api.get('/attendance/teacher')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        const d = statsRes.value.data;
        setStats(d);
        if (d.coursesList && d.coursesList.length > 0) {
          const firstCourseId = d.coursesList[0]._id || d.coursesList[0].id;
          setSelectedCourse(firstCourseId);
          fetchStudentsForCourse(firstCourseId);
        }
      }

      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value.data);
      if (attRes.status === 'fulfilled') setAttendanceLogs(attRes.value.data);
    } catch (err) {
      console.error("Teacher dashboard data fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForCourse = async (courseId) => {
    if (!courseId) return;
    try {
      const res = await api.get(`/courses/${courseId}`);
      if (res.data && res.data.enrolledStudents) {
        const list = Array.isArray(res.data.enrolledStudents) ? res.data.enrolledStudents : [];
        setEnrolledStudents(list);

        // Initialize status map to Present by default
        const initStatus = {};
        list.forEach(s => {
          const sId = typeof s === 'object' ? s._id : s;
          initStatus[sId] = 'Present';
        });
        setRollCallStatus(initStatus);
      }
    } catch (err) {
      console.error("Error fetching students for course", err);
      if (stats.studentsList && stats.studentsList.length > 0) {
        setEnrolledStudents(stats.studentsList);
        const initStatus = {};
        stats.studentsList.forEach(s => { initStatus[s._id] = 'Present'; });
        setRollCallStatus(initStatus);
      }
    }
  };

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    fetchStudentsForCourse(courseId);
  };

  const toggleStudentStatus = (studentId) => {
    setRollCallStatus(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const handleSubmitRollCall = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast.error("Please select a course for roll call.");
      return;
    }
    if (enrolledStudents.length === 0) {
      toast.error("No enrolled students found for this course.");
      return;
    }

    setSavingAttendance(true);
    try {
      const records = enrolledStudents.map(student => {
        const studentId = typeof student === 'object' ? student._id : student;
        return {
          studentId,
          status: rollCallStatus[studentId] || 'Present'
        };
      });

      const res = await api.post('/attendance/mark-batch', {
        courseId: selectedCourse,
        records
      });

      toast.success(res.data.message || "Attendance recorded successfully!");
      const attRes = await api.get('/attendance/teacher');
      if (attRes.data) setAttendanceLogs(attRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save roll call attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <DashboardHero
        user={user}
        roleBadge="Teacher"
        quickActions={
          <button
            onClick={() => navigate('/courses')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <FaBookOpen /> Manage My Courses
          </button>
        }
      />

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl group-hover:scale-110 transition-transform">
            <FaVideo className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">My Courses</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.coursesCount}</h3>
            <span className="text-4xs text-purple-600 dark:text-purple-400 font-bold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full inline-block mt-1">Assigned Classes</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
            <FaUserGraduate className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Students</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.studentsCount}</h3>
            <span className="text-4xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full inline-block mt-1">Active Enrolled</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-amber-50 dark:bg-amber-950/50 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
            <FaStar className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Average Rating</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.rating} / 5.0</h3>
            <span className="text-4xs text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full inline-block mt-1">Course Reviews</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:scale-110 transition-transform">
            <FaClock className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Scheduled Classes</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{schedule.length}</h3>
            <span className="text-4xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full inline-block mt-1">Timetable Sessions</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Timetable Schedule */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1">My Timetable</h3>
            <p className="text-xs text-slate-400 mb-4">Recurring class timetable assigned to your lectures</p>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {schedule && schedule.length > 0 ? (
                schedule.map((sch) => (
                  <div key={sch._id} className="flex justify-between items-center p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                    <div className="flex items-center gap-3.5">
                      <div className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-bold px-3 py-1.5 rounded-xl text-xs min-w-[75px] text-center uppercase">
                        {sch.dayOfWeek}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{sch.title}</h4>
                        <p className="text-4xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                          🕒 {sch.startTime} - {sch.endTime} | 📍 Room: {sch.room}
                        </p>
                      </div>
                    </div>
                    <span className="text-4xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full uppercase">
                      {sch.className}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-400 italic text-xs">
                  No upcoming classes scheduled. Contact administrators to link your courses.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Attendance Roll Call & Live Check-ins */}
        <div className="space-y-6 lg:col-span-1">
          {/* Quick Roll Call Helper */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <form onSubmit={handleSubmitRollCall} className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">Record Course Roll-Call</h3>
                <p className="text-xs text-slate-400">Save real-time class attendance to database</p>
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Select Course</label>
                <select
                  className="w-full px-3.5 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-purple-500"
                  value={selectedCourse}
                  onChange={handleCourseChange}
                >
                  {stats.coursesList?.length > 0 ? (
                    stats.coursesList.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>
                    ))
                  ) : (
                    <option value="">No Courses Assigned</option>
                  )}
                </select>
              </div>

              <div className="space-y-2 border border-slate-100 dark:border-slate-800 rounded-xl p-2.5 max-h-[180px] overflow-y-auto">
                <span className="block text-4xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
                  Enrolled Students ({enrolledStudents.length})
                </span>
                {enrolledStudents.length > 0 ? (
                  enrolledStudents.map(student => {
                    const studentId = typeof student === 'object' ? student._id : student;
                    const studentName = typeof student === 'object' ? student.name : `Student (${studentId.slice(-4)})`;
                    const isPresent = rollCallStatus[studentId] === 'Present';

                    return (
                      <div key={studentId} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[140px]">{studentName}</span>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(studentId)}
                          className={`p-1 px-3 rounded-full text-4xs font-extrabold uppercase transition cursor-pointer
                            ${isPresent
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}
                        >
                          {isPresent ? "Present" : "Absent"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">No enrolled students in this course</p>
                )}
              </div>

              <button
                type="submit"
                disabled={savingAttendance || enrolledStudents.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-bold text-xs py-3 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <FaCheck /> {savingAttendance ? "Saving..." : "Save Roll-Call"}
              </button>
            </form>
          </div>

          {/* Live Check-in Stream */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <h3 className="font-bold text-slate-800 dark:text-white text-base mb-1 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Recent Arrivals Stream
            </h3>
            <p className="text-xs text-slate-400 mb-3">Real-time attendance entries for your lectures</p>

            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
              {attendanceLogs && attendanceLogs.length > 0 ? (
                attendanceLogs.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between items-center p-2.5 rounded-xl border border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">{log.studentId?.name || 'Student'}</h4>
                      <p className="text-4xs text-slate-400 font-medium mt-0.5">
                        {log.scheduleId?.title || log.courseId?.title || 'Class'} • {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-4xs font-extrabold uppercase ${log.status === 'Present' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' :
                      'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                      }`}>
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  No physical arrivals recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// ==========================================
//            STUDENT DASHBOARD
// ==========================================
const StudentDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    coursesCount: 0,
    grade: 'Grade 10',
    enrolledCoursesList: [],
    payments: [],
    latestReceipt: null,
    attendanceStats: { percentage: 100 },
    announcements: []
  });
  const [schedule, setSchedule] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const [statsRes, schedRes, attRes] = await Promise.allSettled([
        api.get('/auth/student-stats'),
        api.get('/schedule'),
        api.get('/attendance/my')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data);
      }
      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value.data);
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.data);
    } catch (err) {
      console.error("Student dashboard data fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const activeCourse = stats.enrolledCoursesList?.length > 0 ? stats.enrolledCoursesList[0] : null;

  const hasVerifiedEmail = !!user?.isEmailVerified && !!user?.email;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Unverified Email Warning Banner */}
      {!hasVerifiedEmail && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl shadow-md p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/20 rounded-xl text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Complete Your Profile: Add & Verify Email</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                You are currently registered with mobile credentials only. Add your email in Account Settings to receive official notices, payment receipts, and class updates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-4 py-2 bg-white text-amber-900 font-bold text-xs rounded-xl shadow hover:bg-amber-50 transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            Go to Settings →
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <DashboardHero
        user={user}
        roleBadge={`Student • ${stats.grade || user.grade || 'Grade 10'}`}
        quickActions={
          <button
            onClick={() => navigate('/courses')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
          >
            <FaBookOpen /> Browse All Courses
          </button>
        }
      />

      {/* Continue Learning Course Hero Card */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-2xl shadow-xl p-7 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-purple-900/30">
        <div className="absolute right-0 top-0 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl transform translate-x-12 -translate-y-12 pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <span className="bg-purple-500/25 border border-purple-400/30 px-3.5 py-1 rounded-full text-4xs font-extrabold uppercase tracking-widest mb-3 inline-block">
            Resume Course Progress
          </span>
          <h2 className="text-2xl font-extrabold mb-1.5 tracking-tight text-white">
            {activeCourse ? activeCourse.title : "No Active Enrolled Course"}
          </h2>
          <p className="text-purple-200/80 text-xs mb-4">
            {activeCourse ? (activeCourse.description || "Course modules and lecture videos available.") : "Enroll in courses to unlock live learning modules."}
          </p>

          <div className="w-64 h-2 bg-slate-950/80 rounded-full overflow-hidden mb-2 border border-white/10">
            <div
              className="bg-gradient-to-r from-purple-400 to-indigo-400 h-full rounded-full transition-all duration-1000"
              style={{ width: `${activeCourse ? (activeCourse.progress || 0) : 0}%` }}
            />
          </div>
          <p className="text-4xs text-purple-200 font-extrabold uppercase tracking-wider">
            {activeCourse ? `${activeCourse.progress || 0}% Completed` : '0% Completed'}
          </p>
        </div>

        {activeCourse ? (
          <button
            onClick={() => navigate(`/course/${activeCourse._id || activeCourse.id}`)}
            className="bg-white text-slate-900 hover:bg-slate-150 px-6 py-3.5 rounded-xl font-bold text-xs transition shadow-lg flex items-center gap-2 cursor-pointer relative z-10 active:scale-95"
          >
            <FaPlayCircle className="text-base text-purple-700" /> Resume Learning
          </button>
        ) : (
          <button
            onClick={() => navigate('/courses')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl font-bold text-xs transition shadow-lg flex items-center gap-2 cursor-pointer relative z-10"
          >
            Explore Course Offerings
          </button>
        )}
      </div>

      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Enrolled Courses count */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
            <FaTrophy className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Enrolled Courses</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.coursesCount}</h3>
            <span className="text-4xs text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full inline-block mt-1">Active Classes</span>
          </div>
        </div>

        {/* Circular Attendance Indicator */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Attendance Rating</h4>
            <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Logged: {attendance.length} class session{attendance.length !== 1 ? 's' : ''}
            </p>
            <p className="text-4xs text-slate-400 font-medium mt-1">
              Present: {attendance.filter(r => r.status === 'Present').length} | Absent: {attendance.filter(r => r.status === 'Absent').length}
            </p>
          </div>
          <AttendanceRing percentage={stats.attendanceStats?.percentage || 100} />
        </div>

        {/* Tuition Fees Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Tuition Fees Status</h4>
              <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                {stats.latestReceipt ? `Last Paid: ${new Date(stats.latestReceipt.date).toLocaleDateString()}` : 'Monthly Tuition Record'}
              </p>
            </div>
            <span className="text-4xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full">
              {stats.latestReceipt ? 'Paid ✅' : 'Up to Date'}
            </span>
          </div>

          <div className="mt-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 rounded-xl p-3 border border-slate-100 dark:border-slate-700/60">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                {stats.latestReceipt ? `Receipt #${stats.latestReceipt.receiptNo}` : 'Monthly Fee Status'}
              </p>
              <p className="text-4xs text-slate-400 dark:text-slate-400 font-semibold mt-0.5">
                {stats.latestReceipt ? `LKR ${stats.latestReceipt.amount.toLocaleString()}` : 'No Pending Dues'}
              </p>
            </div>
            {stats.latestReceipt && (
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 text-3xs font-extrabold bg-purple-50 dark:bg-purple-950/50 px-3 py-1.5 rounded-lg cursor-pointer transition"
              >
                View Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TIMETABLE & DIGITAL ID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Left Column (2 Cols): Timetable & Physical Check-in Logs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Timetable List */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-lg">My Timetable ({stats.grade})</h3>
                <p className="text-xs text-slate-400 mt-0.5">Weekly class schedule matching your registered grade</p>
              </div>
              <span className="px-3 py-1 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 font-extrabold text-xs rounded-full border border-purple-200 dark:border-purple-800">
                {schedule?.length || 0} Classes Scheduled
              </span>
            </div>

            <div className="space-y-3">
              {schedule && schedule.length > 0 ? (
                schedule.map((sch) => (
                  <div key={sch._id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-purple-50/20 dark:hover:bg-slate-800/60 transition gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold px-3 py-2 rounded-xl text-xs min-w-[70px] text-center uppercase border border-purple-100 dark:border-purple-800/50">
                        {sch.dayOfWeek ? sch.dayOfWeek.slice(0, 3) : 'DAY'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800 dark:text-white">{sch.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                          🕒 {sch.startTime} - {sch.endTime} &nbsp;|&nbsp; 📍 Room: {sch.room || 'Main Hall'}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const teacherDisplayName = sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName;
                      if (!teacherDisplayName) return null;
                      return (
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full shrink-0 border border-slate-200 dark:border-slate-700">
                          👨‍🏫 {teacherDisplayName}
                        </span>
                      );
                    })()}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-xs">
                  No classes scheduled for your grade ({stats.grade}) this week.
                </div>
              )}
            </div>
          </div>

          {/* Entrance Check-in Log */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white text-base">My Physical Check-in Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your recent physical entrance arrival records</p>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Recent 5 Sessions
              </span>
            </div>

            <div className="space-y-2.5">
              {attendance && attendance.length > 0 ? (
                attendance.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between items-center p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{log.scheduleId?.title || log.courseId?.title || 'Class Session'}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">📅 {new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                      log.status === 'Present' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' 
                        : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                    }`}>
                      {log.status === 'Present' ? '✓ Present' : '✗ Absent'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  No physical entrance check-ins recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Digital QR Student Pass & ID */}
        <div className="lg:col-span-1">
          <StudentIdCard user={user} />
        </div>

      </div>

      {/* REAL PAYMENT RECEIPT MODAL */}
      {showInvoiceModal && stats.latestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-sm w-full mx-4 transform scale-100 transition-all text-slate-800 dark:text-white">
            <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <FaReceipt className="text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">LuminaLearn Tuition Institute</h3>
              <p className="text-4xs text-slate-400 font-medium">Receipt #{stats.latestReceipt.receiptNo}</p>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between font-medium">
                <span>Student Name:</span>
                <span className="text-slate-800 dark:text-white font-bold">{user?.name}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Registration No:</span>
                <span className="text-slate-800 dark:text-white font-bold">{user?.registrationNumber || '-'}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Payment Purpose:</span>
                <span className="text-slate-800 dark:text-white font-bold">{stats.latestReceipt.courseTitle}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Payment Method:</span>
                <span className="text-slate-800 dark:text-white font-bold">{stats.latestReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Date Paid:</span>
                <span className="text-slate-800 dark:text-white font-bold">{new Date(stats.latestReceipt.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-slate-100 dark:border-slate-800 pt-2.5 text-sm">
                <span className="font-bold text-slate-800 dark:text-white">Amount Paid:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">LKR {stats.latestReceipt.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
//          MAIN DASHBOARD CONTROLLER
// ==========================================
const Dashboard = () => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : { name: 'Guest', role: 'student' };

  if (user.role === 'parent') {
    return <Navigate to="/parent-dashboard" replace />;
  }

  if (user.role === 'counter_staff') {
    return <Navigate to="/attendance" replace />;
  }

  return (
    <div className="w-full">
      {/* Role-Based Switchboard */}
      {user.role === 'admin' && <AdminDashboard user={user} />}
      {user.role === 'teacher' && <TeacherDashboard user={user} />}
      {user.role === 'student' && <StudentDashboard user={user} />}
    </div>
  );
};

export default Dashboard;