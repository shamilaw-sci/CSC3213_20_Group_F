import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate, Link } from 'react-router-dom';
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
  FaArrowRight
} from 'react-icons/fa';
import StudentIdCard from './StudentIdCard';

// Grade options matching registration grade requirements
const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

// --- HERO WELCOME BANNER ---
const DashboardHero = ({ user, roleBadge, quickActions }) => {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 p-6 sm:p-8 text-white shadow-xl mb-6 border border-purple-900/30">
      {/* Ambient background glow orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/15 rounded-full blur-3xl pointer-events-none transform translate-x-20 -translate-y-20" />
      <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="bg-purple-500/25 border border-purple-400/30 text-purple-200 text-3xs font-extrabold uppercase px-3.5 py-1 rounded-full tracking-widest backdrop-blur-md">
              {roleBadge}
            </span>
            <span className="text-purple-300/80 text-xs font-medium flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <FaClock className="text-purple-400 text-xs" /> {timeStr}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, {user?.name || 'User'}! 👋
          </h1>
          <p className="text-purple-200/80 text-xs sm:text-sm mt-1 max-w-xl">
            Here is your live institute management overview and real-time operations performance.
          </p>
        </div>

        {quickActions && (
          <div className="flex items-center gap-3">
            {quickActions}
          </div>
        )}
      </div>
    </div>
  );
};

// --- CUSTOM SVG LINE CHART COMPONENT ---
const SvgLineChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const padding = 35;
  const width = 500;
  const height = 220;
  const maxVal = Math.max(...data.map(d => d.count)) * 1.25 || 10;

  const points = data.map((d, index) => {
    const x = padding + (index * (width - padding * 2) / (data.length - 1 || 1));
    const y = height - padding - (d.count * (height - padding * 2) / maxVal);
    return { x, y, month: d.month, count: d.count };
  });

  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathD += ` L ${points[i].x} ${points[i].y}`;
  }

  const fillD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const y = padding + r * (height - padding * 2);
        const value = Math.round(maxVal * (1 - r));
        return (
          <g key={i}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={padding - 8} y={y + 4} fill="#94a3b8" fontSize="9" textAnchor="end" className="font-semibold">{value}</text>
          </g>
        );
      })}

      {/* Area under line */}
      <path d={fillD} fill="url(#chartGrad)" />

      {/* Main Line */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots and Tooltips */}
      {points.map((p, i) => (
        <g key={i} className="group cursor-pointer">
          <circle cx={p.x} cy={p.y} r="4.5" fill="#6366f1" stroke="white" strokeWidth="2.5" />
          <circle cx={p.x} cy={p.y} r="12" fill="#6366f1" opacity="0" className="hover:opacity-15 transition-opacity" />

          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <rect x={p.x - 22} y={p.y - 28} width="44" height="18" rx="4" fill="#0f172a" />
            <text x={p.x} y={p.y - 16} fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">{p.count}</text>
          </g>
          <text x={p.x} y={height - padding + 15} fill="#64748b" fontSize="9" fontWeight="bold" textAnchor="middle">{p.month}</text>
        </g>
      ))}
    </svg>
  );
};

// --- PAYMENT METRICS DONUT CHART COMPONENT ---
const PaymentDonut = ({ totalCollected = 0, pendingDues = 0 }) => {
  const total = totalCollected + pendingDues;
  const percentage = total > 0 ? Math.round((totalCollected / total) * 100) : 100;
  const strokeDashoffset = 251.2 * (1 - percentage / 100);

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="9" fill="transparent" />
          <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="9" fill="transparent"
            strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-slate-800">{percentage}%</span>
          <span className="text-4xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Collected</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 w-full text-xs font-semibold">
        <div className="bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-100 flex flex-col items-center">
          <span className="text-slate-400 font-bold text-4xs uppercase tracking-wider">Paid Total</span>
          <span className="text-sm font-bold text-emerald-600 mt-0.5">LKR {totalCollected.toLocaleString()}</span>
        </div>
        <div className="bg-amber-50/80 p-2.5 rounded-xl border border-amber-100 flex flex-col items-center">
          <span className="text-slate-400 font-bold text-4xs uppercase tracking-wider">Pending Dues</span>
          <span className="text-sm font-bold text-amber-600 mt-0.5">LKR {pendingDues.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

// --- ATTENDANCE SUMMARY CIRCULAR BAR ---
const AttendanceRing = ({ percentage = 100 }) => {
  const safePct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = 251.2 * (1 - safePct / 100);

  const getStatusText = (pct) => {
    if (pct >= 90) return { label: 'Excellent Attendance', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    if (pct >= 75) return { label: 'Good Standing', color: 'text-blue-700 bg-blue-50 border-blue-200' };
    return { label: 'Needs Improvement', color: 'text-amber-700 bg-amber-50 border-amber-200' };
  };

  const statusInfo = getStatusText(safePct);

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
          <circle cx="50" cy="50" r="40" stroke="#6366f1" strokeWidth="8" fill="transparent"
            strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-slate-800">{safePct}%</span>
          <span className="text-4xs text-slate-400 font-bold uppercase tracking-wider">Avg Rate</span>
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

  // Modal & Form state
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    className: '',
    dayOfWeek: 'Saturday',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    courseId: '',
    teacherId: '',
    room: 'Hall A'
  });

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

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.className || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required calendar details.");
      return;
    }

    try {
      const res = await api.post('/schedule', formData);
      toast.success(res.data.message || "Class added to timetable successfully!");
      setSchedule([...schedule, res.data.schedule]);
      setShowModal(false);
      setFormData({
        title: '',
        className: '',
        dayOfWeek: 'Saturday',
        startTime: '10:00 AM',
        endTime: '12:00 PM',
        courseId: '',
        teacherId: '',
        room: 'Hall A'
      });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add class schedule");
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Banner */}
      <DashboardHero
        user={user}
        roleBadge="System Administrator"
        quickActions={
          <>
            <button
              onClick={() => navigate('/add-course')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer"
            >
              <FaPlusCircle /> Create Course
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 backdrop-blur-md cursor-pointer"
            >
              <FaCalendarAlt /> Add Class
            </button>
          </>
        }
      />

      {/* Stats KPI Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
            <FaUsers className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.students || 0}</h3>
            <span className="text-4xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Active Learners
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
            <FaChalkboardTeacher className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Institute Teachers</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.teachers || 0}</h3>
            <span className="text-4xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Teaching Staff
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
            <FaBookOpen className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Courses</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.courses || 0}</h3>
            <span className="text-4xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Curriculum Programs
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
            <FaCalendarCheck className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Arrived Today</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">
              {attendanceStats.today?.present || stats.todayArrivalsCount || 0}
            </h3>
            <span className="text-4xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">
              Physical Check-ins
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 flex flex-col justify-between h-96">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Student Intake Analytics</h3>
            <p className="text-xs text-slate-400">Monthly student registrations trend</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {stats.growthData && stats.growthData.length > 0 ? (
              <SvgLineChart data={stats.growthData} />
            ) : (
              <p className="text-xs text-slate-400 italic">Intake trend will display as student registrations grow.</p>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between h-96">
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Fee Collections Ratio</h3>
            <p className="text-xs text-slate-400">Total collected vs expected pending dues</p>
          </div>
          <div className="flex-1">
            <PaymentDonut totalCollected={stats.totalCollected} pendingDues={stats.pendingDues} />
          </div>
        </div>
      </div>

      {/* Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registrations Log */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-lg mb-4">Recent Registrations</h3>
            <div className="space-y-3.5">
              {stats.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                stats.recentRegistrations.map((reg) => (
                  <div key={reg._id} className="flex justify-between items-center border-b border-slate-50 pb-2.5">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{reg.name}</h4>
                      <p className="text-4xs text-slate-400 font-medium">{reg.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-4xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        {reg.grade || 'No Grade'}
                      </span>
                      <p className="text-4xs text-slate-400 font-medium mt-1">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-6">No recent registrations</p>
              )}
            </div>
          </div>
        </div>

        {/* Timetable Schedule Manager */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Institute Timetable</h3>
              <p className="text-xs text-slate-400">Active recurring schedule for student classes</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
            >
              <FaPlusCircle /> Add Class to Calendar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3 pr-1">
            {schedule && schedule.length > 0 ? (
              schedule.map((sch) => (
                <div key={sch._id} className="flex justify-between items-center p-3.5 rounded-xl border border-slate-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-50 text-purple-700 p-3 rounded-xl flex flex-col items-center min-w-[70px]">
                      <span className="text-4xs font-extrabold uppercase text-purple-600">{sch.dayOfWeek ? sch.dayOfWeek.slice(0, 3) : 'DAY'}</span>
                      <FaCalendarAlt className="text-sm mt-0.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800">{sch.title}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-4xs text-slate-500 font-semibold mt-1">
                        <span>🕒 {sch.startTime} - {sch.endTime}</span>
                        <span>📍 {sch.room}</span>
                        {(sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName) && (
                          <span>👨‍🏫 {sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(sch._id, sch.title)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl transition cursor-pointer"
                    title="Delete Class"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400 italic text-xs">
                No classes scheduled yet. Click "Add Class to Calendar" to create class sessions.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE SCHEDULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full mx-4 transform scale-100 transition-all">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800">Add Class to Timetable</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Class Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grade 10 Science"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Target Grade *</label>
                  <select
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                  >
                    <option value="">-- Select Grade --</option>
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Day of Week *</label>
                  <select
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Start Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">End Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12:00 PM"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Link Course</label>
                  <select
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                    value={formData.courseId}
                    onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  >
                    <option value="">-- No Link --</option>
                    {courses.map(c => (
                      <option key={c._id} value={c._id}>{c.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Assign Teacher</label>
                  <select
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                    value={formData.teacherId}
                    onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                  >
                    <option value="">-- No Link --</option>
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Room / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Hall A, Lab 2"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition active:scale-95 cursor-pointer shadow-md"
                >
                  Add Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
//            TEACHER DASHBOARD
// ==========================================
const TeacherDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ coursesCount: 0, studentsCount: 0, rating: "4.9", coursesList: [], studentsList: [] });
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
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
            <FaVideo className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">My Courses</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.coursesCount}</h3>
            <span className="text-4xs text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full inline-block mt-1">Assigned Classes</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
            <FaUserGraduate className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.studentsCount}</h3>
            <span className="text-4xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">Active Enrolled</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-amber-50 text-amber-500 rounded-xl group-hover:scale-110 transition-transform">
            <FaStar className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Average Rating</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.rating} / 5.0</h3>
            <span className="text-4xs text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">Course Reviews</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all group">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
            <FaClock className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Scheduled Classes</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{schedule.length}</h3>
            <span className="text-4xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">Timetable Sessions</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Timetable Schedule */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">My Timetable</h3>
            <p className="text-xs text-slate-400 mb-4">Recurring class timetable assigned to your lectures</p>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {schedule && schedule.length > 0 ? (
                schedule.map((sch) => (
                  <div key={sch._id} className="flex justify-between items-center p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/80 transition">
                    <div className="flex items-center gap-3.5">
                      <div className="bg-indigo-50 text-indigo-700 font-bold px-3 py-1.5 rounded-xl text-xs min-w-[75px] text-center uppercase">
                        {sch.dayOfWeek}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{sch.title}</h4>
                        <p className="text-4xs text-slate-500 font-semibold mt-0.5">
                          🕒 {sch.startTime} - {sch.endTime} | 📍 Room: {sch.room}
                        </p>
                      </div>
                    </div>
                    <span className="text-4xs font-bold bg-purple-50 text-purple-700 px-3 py-1 rounded-full uppercase">
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
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <form onSubmit={handleSubmitRollCall} className="space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Record Course Roll-Call</h3>
                <p className="text-xs text-slate-400">Save real-time class attendance to database</p>
              </div>

              <div>
                <label className="block text-4xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Select Course</label>
                <select
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs bg-white outline-none cursor-pointer focus:ring-2 focus:ring-purple-500"
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

              <div className="space-y-2 border border-slate-100 rounded-xl p-2.5 max-h-[180px] overflow-y-auto">
                <span className="block text-4xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
                  Enrolled Students ({enrolledStudents.length})
                </span>
                {enrolledStudents.length > 0 ? (
                  enrolledStudents.map(student => {
                    const studentId = typeof student === 'object' ? student._id : student;
                    const studentName = typeof student === 'object' ? student.name : `Student (${studentId.slice(-4)})`;
                    const isPresent = rollCallStatus[studentId] === 'Present';

                    return (
                      <div key={studentId} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg">
                        <span className="text-xs font-semibold text-slate-700 truncate max-w-[140px]">{studentName}</span>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(studentId)}
                          className={`p-1 px-3 rounded-full text-4xs font-extrabold uppercase transition cursor-pointer
                            ${isPresent
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-red-50 text-red-600 border border-red-200'}`}
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
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white font-bold text-xs py-3 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <FaCheck /> {savingAttendance ? "Saving..." : "Save Roll-Call"}
              </button>
            </form>
          </div>

          {/* Live Check-in Stream */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="font-bold text-slate-800 text-base mb-1 flex items-center gap-2">
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
                  <div key={log._id} className="flex justify-between items-center p-2.5 rounded-xl border border-slate-50 hover:bg-slate-50 transition">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{log.studentId?.name || 'Student'}</h4>
                      <p className="text-4xs text-slate-400 font-medium mt-0.5">
                        {log.scheduleId?.title || log.courseId?.title || 'Class'} • {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-4xs font-extrabold uppercase ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      'bg-red-50 text-red-600 border border-red-200'
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
              style={{ width: `${activeCourse ? (activeCourse.progress || 45) : 0}%` }}
            />
          </div>
          <p className="text-4xs text-purple-200 font-extrabold uppercase tracking-wider">
            {activeCourse ? `${activeCourse.progress || 45}% Completed` : '0% Completed'}
          </p>
        </div>

        {activeCourse ? (
          <button
            onClick={() => navigate('/courses')}
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
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 bg-purple-50 text-purple-600 rounded-xl">
            <FaTrophy className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Enrolled Courses</p>
            <h3 className="text-2xl font-extrabold text-slate-800 mt-0.5">{stats.coursesCount}</h3>
            <span className="text-4xs text-emerald-700 font-extrabold bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full inline-block mt-1">Active Classes</span>
          </div>
        </div>

        {/* Circular Attendance Indicator */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attendance Rating</h4>
            <p className="text-3xs text-slate-500 font-semibold mt-1">
              Logged: {attendance.length} class session{attendance.length !== 1 ? 's' : ''}
            </p>
            <p className="text-4xs text-slate-400 font-medium mt-1">
              Present: {attendance.filter(r => r.status === 'Present').length} | Absent: {attendance.filter(r => r.status === 'Absent').length}
            </p>
          </div>
          <AttendanceRing percentage={stats.attendanceStats?.percentage || 100} />
        </div>

        {/* Tuition Fees Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Tuition Fees Status</h4>
              <p className="text-3xs text-slate-500 font-semibold mt-0.5">
                {stats.latestReceipt ? `Last Paid: ${new Date(stats.latestReceipt.date).toLocaleDateString()}` : 'Monthly Tuition Record'}
              </p>
            </div>
            <span className="text-4xs font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              {stats.latestReceipt ? 'Paid ✅' : 'Up to Date'}
            </span>
          </div>

          <div className="mt-4 flex justify-between items-center bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div>
              <p className="text-xs font-bold text-slate-800">
                {stats.latestReceipt ? `Receipt #${stats.latestReceipt.receiptNo}` : 'Monthly Fee Status'}
              </p>
              <p className="text-4xs text-slate-400 font-semibold mt-0.5">
                {stats.latestReceipt ? `LKR ${stats.latestReceipt.amount.toLocaleString()}` : 'No Pending Dues'}
              </p>
            </div>
            {stats.latestReceipt && (
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="text-purple-700 hover:text-purple-900 text-3xs font-extrabold bg-purple-50 px-3 py-1.5 rounded-lg cursor-pointer transition"
              >
                View Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TIMETABLE & ANNOUNCEMENTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Timetable List */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-lg mb-1">My Timetable ({stats.grade})</h3>
            <p className="text-xs text-slate-400 mb-4">Timetable classes matching your registered grade</p>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto pr-1">
              {schedule && schedule.length > 0 ? (
                schedule.map((sch) => (
                  <div key={sch._id} className="flex justify-between items-center p-3.5 rounded-xl border border-slate-100 hover:bg-purple-50/10 transition">
                    <div className="flex items-center gap-3.5">
                      <div className="bg-purple-50 text-purple-700 font-bold px-3 py-1.5 rounded-xl text-xs min-w-[70px] text-center uppercase">
                        {sch.dayOfWeek ? sch.dayOfWeek.slice(0, 3) : 'DAY'}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">{sch.title}</h4>
                        <p className="text-4xs text-slate-500 font-semibold mt-0.5">
                          🕒 {sch.startTime} - {sch.endTime} | 📍 Room: {sch.room}
                        </p>
                      </div>
                    </div>
                    {(() => {
                      const teacherDisplayName = sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName;
                      if (!teacherDisplayName) return null;
                      return (
                        <span className="text-4xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full shrink-0">
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
        </div>

        {/* Announcements & Check-in Log */}
        <div className="space-y-6 lg:col-span-1">
          {/* Digital QR Student ID Card */}
          <StudentIdCard user={user} />

          {/* Announcements Widget */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center gap-2">
              <FaBullhorn className="text-purple-600" /> Institute Announcements
            </h3>

            <div className="space-y-3.5">
              {stats.announcements && stats.announcements.length > 0 ? (
                stats.announcements.map((notif) => (
                  <div key={notif._id} className="border-l-3 border-purple-600 pl-3 py-0.5">
                    <h4 className="text-xs font-bold text-slate-800">{notif.title || 'Announcement'}</h4>
                    <p className="text-4xs text-slate-500 mt-0.5 leading-relaxed">{notif.message}</p>
                    <span className="text-4xs text-slate-400 mt-1 block font-medium">
                      {new Date(notif.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <div className="border-l-3 border-slate-300 pl-3">
                  <h4 className="text-xs font-bold text-slate-800">Welcome to LuminaLearn</h4>
                  <p className="text-4xs text-slate-500 mt-0.5">Official announcements from institute administration will appear here.</p>
                </div>
              )}
            </div>
          </div>

          {/* Entrance Check-in Log */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            <h3 className="font-bold text-slate-800 text-base mb-1">My Check-in Log</h3>
            <p className="text-xs text-slate-400 mb-3">Your physical entrance arrival records</p>

            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
              {attendance && attendance.length > 0 ? (
                attendance.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between items-center p-2.5 rounded-xl border border-slate-50 text-xs">
                    <div>
                      <h4 className="font-bold text-slate-800">{log.scheduleId?.title || log.courseId?.title || 'Class Session'}</h4>
                      <p className="text-4xs text-slate-400 font-medium">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                      {log.status}
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

      </div>

      {/* REAL PAYMENT RECEIPT MODAL */}
      {showInvoiceModal && stats.latestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full mx-4 transform scale-100 transition-all">
            <div className="text-center pb-4 border-b border-slate-100">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <FaReceipt className="text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-800">LuminaLearn Tuition Institute</h3>
              <p className="text-4xs text-slate-400 font-medium">Receipt #{stats.latestReceipt.receiptNo}</p>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between font-medium">
                <span>Student Name:</span>
                <span className="text-slate-800 font-bold">{user?.name}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Registration No:</span>
                <span className="text-slate-800 font-bold">{user?.registrationNumber || '-'}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Payment Purpose:</span>
                <span className="text-slate-800 font-bold">{stats.latestReceipt.courseTitle}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Payment Method:</span>
                <span className="text-slate-800 font-bold">{stats.latestReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Date Paid:</span>
                <span className="text-slate-800 font-bold">{new Date(stats.latestReceipt.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-slate-100 pt-2.5 text-sm">
                <span className="font-bold text-slate-800">Amount Paid:</span>
                <span className="font-bold text-emerald-600">LKR {stats.latestReceipt.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-center border-t border-slate-100 pt-4">
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