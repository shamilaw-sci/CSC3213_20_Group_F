import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
  FaCalendarCheck
} from 'react-icons/fa';

// Grade options matching registration grade requirements
const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

// Helper to get auth header config
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    headers: { Authorization: `Bearer ${token}` }
  };
};

// --- CUSTOM SVG LINE CHART COMPONENT ---
const SvgLineChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const padding = 35;
  const width = 500;
  const height = 220;
  const maxVal = Math.max(...data.map(d => d.count)) * 1.25 || 10;

  // Calculate points for path
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
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
        </linearGradient>
      </defs>

      {/* Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const y = padding + r * (height - padding * 2);
        const value = Math.round(maxVal * (1 - r));
        return (
          <g key={i}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f3f4f6" strokeWidth="1" />
            <text x={padding - 8} y={y + 4} fill="#9ca3af" fontSize="9" textAnchor="end" className="font-semibold">{value}</text>
          </g>
        );
      })}

      {/* Area under the line */}
      <path d={fillD} fill="url(#chartGrad)" />

      {/* Main Line */}
      <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots and Interactions */}
      {points.map((p, i) => (
        <g key={i} className="group cursor-pointer">
          <circle cx={p.x} cy={p.y} r="4.5" fill="#6366f1" stroke="white" strokeWidth="2" />
          <circle cx={p.x} cy={p.y} r="10" fill="#6366f1" opacity="0" className="hover:opacity-15 transition-opacity" />

          {/* Tooltip */}
          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <rect x={p.x - 22} y={p.y - 28} width="44" height="18" rx="4" fill="#1e1b4b" />
            <text x={p.x} y={p.y - 16} fill="white" fontSize="8" fontWeight="bold" textAnchor="middle">{p.count}</text>
          </g>
          <text x={p.x} y={height - padding + 15} fill="#6b7280" fontSize="9" fontWeight="medium" textAnchor="middle">{p.month}</text>
        </g>
      ))}
    </svg>
  );
};

// --- PAYMENT METRICS DONUT CHART COMPONENT ---
const PaymentDonut = ({ totalCollected = 0 }) => {
  const displayAmount = totalCollected > 0 ? totalCollected : 7500;
  const percentage = 100;
  const strokeDashoffset = 0;

  return (
    <div className="flex flex-col items-center justify-center p-4 h-full">
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="9" fill="transparent" />
          <circle cx="50" cy="50" r="40" stroke="#10b981" strokeWidth="9" fill="transparent"
            strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-gray-800">100%</span>
          <span className="text-3xs text-gray-400 font-bold uppercase tracking-widest mt-0.5">Complete</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 w-full text-xs font-semibold">
        <div className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100 flex flex-col items-center">
          <span className="text-gray-400 font-bold text-3xs uppercase">Paid Invoices</span>
          <span className="text-sm font-bold text-emerald-600 mt-0.5">LKR {displayAmount.toLocaleString()}</span>
        </div>
        <div className="bg-amber-50/50 p-2 rounded-lg border border-amber-100 flex flex-col items-center">
          <span className="text-gray-400 font-bold text-3xs uppercase">Pending Dues</span>
          <span className="text-sm font-bold text-amber-600 mt-0.5">LKR 0</span>
        </div>
      </div>
    </div>
  );
};

// --- ATTENDANCE SUMMARY CIRCULAR BAR ---
const AttendanceRing = ({ percentage = 94 }) => {
  const strokeDashoffset = 251.2 * (1 - percentage / 100);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" />
          <circle cx="50" cy="50" r="40" stroke="#4f46e5" strokeWidth="8" fill="transparent"
            strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-gray-800">{percentage}%</span>
          <span className="text-3xs text-gray-400 font-semibold uppercase">Avg Rate</span>
        </div>
      </div>
      <span className="mt-3 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full">
        Excellent Attendance
      </span>
    </div>
  );
};

// ==========================================
//          ADMINISTRATOR DASHBOARD
// ==========================================
const AdminDashboard = ({ user }) => {
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0, recentRegistrations: [], growthData: [] });
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ today: { present: 0, late: 0, absent: 0, total: 0 } });

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
    fetchAdminStats();
    fetchSchedule();
    fetchSupportingData();
  }, []);

  const fetchAdminStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/admin-stats', getAuthHeaders());
      setStats(res.data);

      const attRes = await axios.get('http://localhost:5000/api/attendance/stats/summary', getAuthHeaders());
      setAttendanceStats(attRes.data);
    } catch (err) {
      console.error("Admin stats fetch failed", err);
    }
  };

  const fetchSchedule = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/schedule', getAuthHeaders());
      setSchedule(res.data);
    } catch (err) {
      console.error("Schedule fetch failed", err);
    }
  };

  const fetchSupportingData = async () => {
    try {
      // Fetch courses and teachers list to populate select tags in scheduling form
      const coursesRes = await axios.get('http://localhost:5000/api/courses', getAuthHeaders());
      setCourses(coursesRes.data);

      const usersRes = await axios.get('http://localhost:5000/api/auth/users', getAuthHeaders());
      setTeachers(usersRes.data.filter(u => u.role === 'teacher'));
    } catch (err) {
      console.error("Supporting data fetch failed", err);
    }
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.className || !formData.dayOfWeek || !formData.startTime || !formData.endTime) {
      toast.error("Please fill in all required calendar details.");
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/schedule', formData, getAuthHeaders());
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
      await axios.delete(`http://localhost:5000/api/schedule/${id}`, getAuthHeaders());
      toast.success("Schedule entry deleted successfully.");
      setSchedule(schedule.filter(item => item._id !== id));
    } catch (err) {
      toast.error("Failed to delete schedule entry");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats KPI ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-purple-50 text-indigo-600 rounded-lg">
            <FaUsers className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400">Total Students</p>
            <h3 className="text-2xl font-bold text-gray-855">{stats.students}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-lg">
            <FaChalkboardTeacher className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400">Total Teachers</p>
            <h3 className="text-2xl font-bold text-gray-855">{stats.teachers}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-orange-50 text-orange-500 rounded-lg">
            <FaBookOpen className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400">Active Courses</p>
            <h3 className="text-2xl font-bold text-gray-855">{stats.courses}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg">
            <FaCalendarCheck className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-400">Arrived Today</p>
            <h3 className="text-2xl font-bold text-gray-855">
              {attendanceStats.today?.present || 0} Student{attendanceStats.today?.present !== 1 ? 's' : ''}
            </h3>
          </div>
        </div>
      </div>

      {/* Visual Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between h-96">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Student Intake Analytics</h3>
            <p className="text-xs text-gray-400">Monthly student registrations trend</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            <SvgLineChart data={stats.growthData} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between h-96">
          <div>
            <h3 className="font-bold text-gray-800 text-lg">Fee Collections Ratio</h3>
            <p className="text-xs text-gray-400">Total target vs actual payment logs</p>
          </div>
          <div className="flex-1">
            <PaymentDonut totalCollected={stats.totalCollected} />
          </div>
        </div>
      </div>

      {/* Middle Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent student registrations logs */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Recent Registrations</h3>
            <div className="space-y-4">
              {stats.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                stats.recentRegistrations.map((reg) => (
                  <div key={reg._id} className="flex justify-between items-center border-b border-gray-50 pb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-850">{reg.name}</h4>
                      <p className="text-2xs text-gray-400 font-medium">{reg.email}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-3xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                        {reg.grade || 'No Grade'}
                      </span>
                      <p className="text-3xs text-gray-400 font-medium mt-1">
                        {new Date(reg.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-400 italic text-center py-6">No recent registrations</p>
              )}
            </div>
          </div>
        </div>

        {/* Timetable / Schedule logs */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">Institute Timetable</h3>
              <p className="text-xs text-gray-400">Active recurring schedule for student classes</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-lumina-purple hover:bg-purple-800 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            >
              <FaPlusCircle /> Add Class to Calendar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[300px] space-y-3">
            {schedule && schedule.length > 0 ? (
              schedule.map((sch) => (
                <div key={sch._id} className="flex justify-between items-center p-3.5 rounded-lg border border-gray-100 hover:border-purple-200 hover:bg-purple-50/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-50 text-lumina-purple p-3 rounded-lg flex flex-col items-center min-w-[70px]">
                      <span className="text-3xs font-extrabold uppercase text-purple-500">{sch.dayOfWeek.slice(0, 3)}</span>
                      <FaCalendarAlt className="text-sm mt-0.5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-850">{sch.title}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-2xs text-gray-500 mt-0.5">
                        <span className="flex items-center gap-1">🕒 {sch.startTime} - {sch.endTime}</span>
                        <span className="flex items-center gap-1">🏫 {sch.className}</span>
                        <span className="flex items-center gap-1">📍 {sch.room}</span>
                        {sch.teacherId && <span className="flex items-center gap-1">👨‍🏫 {sch.teacherId.name}</span>}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSchedule(sch._id, sch.title)}
                    className="text-red-400 hover:text-red-650 hover:bg-red-50 p-2 rounded-lg transition cursor-pointer"
                    title="Delete Class"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-400 italic">
                No classes scheduled yet. Click the button to schedule classes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CREATE SCHEDULE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-150 max-w-lg w-full mx-4 transform scale-100 transition-all duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Add Class to Calendar</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-lg cursor-pointer">×</button>
            </div>

            <form onSubmit={handleSaveSchedule} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Class Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Grade 10 Science"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Target Grade/Class *</label>
                  <select
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
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
                  <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Day of Week *</label>
                  <select
                    required
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
                    value={formData.dayOfWeek}
                    onChange={(e) => setFormData({ ...formData, dayOfWeek: e.target.value })}
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Start Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 10:00 AM"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">End Time *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 12:00 PM"
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Link Course (Optional)</label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
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
                  <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Assign Teacher (Optional)</label>
                  <select
                    className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white cursor-pointer"
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
                <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Room / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Hall A, Lab 2"
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                  value={formData.room}
                  onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-lumina-purple hover:bg-purple-800 text-white font-bold rounded-lg text-sm transition active:scale-95 cursor-pointer"
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
  const [stats, setStats] = useState({ coursesCount: 0, studentsCount: 0, rating: 4.8, coursesList: [] });
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Quick Attendance Mock State
  const [selectedCourse, setSelectedCourse] = useState('');
  const [markedStudents, setMarkedStudents] = useState([
    { id: 1, name: "Arun Perera", present: true },
    { id: 2, name: "Saman Silva", present: true },
    { id: 3, name: "Priya Fernando", present: false },
    { id: 4, name: "Nimal Jayasinghe", present: true }
  ]);

  useEffect(() => {
    fetchTeacherStats();
    fetchTeacherSchedule();
    fetchTeacherAttendanceLogs();
  }, []);

  const fetchTeacherAttendanceLogs = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/attendance/teacher', getAuthHeaders());
      setAttendanceLogs(res.data);
    } catch (err) {
      console.error("Teacher attendance logs fetch failed", err);
    }
  };

  const fetchTeacherStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/teacher-stats', getAuthHeaders());
      setStats(res.data);
      if (res.data.coursesList?.length > 0) {
        setSelectedCourse(res.data.coursesList[0].id);
      }
    } catch (err) {
      console.error("Teacher stats fetch failed", err);
    }
  };

  const fetchTeacherSchedule = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/schedule', getAuthHeaders());
      setSchedule(res.data);
    } catch (err) {
      console.error("Teacher schedule fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttendance = (id) => {
    setMarkedStudents(markedStudents.map(student =>
      student.id === id ? { ...student, present: !student.present } : student
    ));
  };

  const handleSubmitAttendance = (e) => {
    e.preventDefault();
    // Simulate API request trigger
    toast.success("Attendance logged successfully! Parents have been notified via automated email alert.");
  };

  return (
    <div className="space-y-6">
      {/* Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-purple-50 text-lumina-purple rounded-lg">
            <FaVideo className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">My Courses</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.coursesCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-purple-50 text-lumina-purple rounded-lg">
            <FaUserGraduate className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Students</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.studentsCount}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-yellow-50 text-yellow-500 rounded-lg">
            <FaStar className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Average Rating</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.rating} / 5.0</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-lg">
            <FaClock className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Classes Scheduled</p>
            <h3 className="text-2xl font-bold text-gray-800">{schedule.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Side: Timetable Schedule */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">My Timetable</h3>
            <p className="text-xs text-gray-400 mb-4">Timetable entries for courses assigned to you</p>

            <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
              {schedule && schedule.length > 0 ? (
                schedule.map((sch) => (
                  <div key={sch._id} className="flex justify-between items-center p-3 rounded-lg border border-gray-50 hover:bg-gray-50/50 transition">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-50 text-indigo-600 font-bold px-3 py-1.5 rounded-lg text-xs min-w-[80px] text-center">
                        {sch.dayOfWeek}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{sch.title}</h4>
                        <p className="text-2xs text-gray-500 font-medium">
                          🕒 {sch.startTime} - {sch.endTime} | 📍 Room: {sch.room}
                        </p>
                      </div>
                    </div>
                    <span className="text-3xs font-bold bg-purple-50 text-lumina-purple px-3 py-1 rounded-full uppercase">
                      {sch.className}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-400 italic">
                  No upcoming classes scheduled. Contact administrators to link your courses.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Column for Forms and Real-time Logs */}
        <div className="space-y-6 lg:col-span-1">
          {/* Quick Attendance Logging Mockup */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <form onSubmit={handleSubmitAttendance} className="space-y-4">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">Record Attendance</h3>
                <p className="text-xs text-gray-400">Quick logging helper tool for teachers</p>
              </div>

              <div>
                <label className="block text-3xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Select Class/Batch</label>
                <select
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white outline-none cursor-pointer focus:ring-2 focus:ring-purple-500"
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  {stats.coursesList?.length > 0 ? (
                    stats.coursesList.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))
                  ) : (
                    <option value="">No Course Linked</option>
                  )}
                </select>
              </div>

              <div className="space-y-2 border border-gray-100 rounded-lg p-2 max-h-[170px] overflow-y-auto">
                <span className="block text-4xs font-bold text-gray-400 uppercase tracking-widest px-1">Roll Call</span>
                {markedStudents.map(student => (
                  <div key={student.id} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded-md">
                    <span className="text-xs font-semibold text-gray-700">{student.name}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleAttendance(student.id)}
                      className={`p-1 px-3 rounded-full text-4xs font-extrabold uppercase transition cursor-pointer
                        ${student.present
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                          : 'bg-red-50 text-red-600 border border-red-200'}`}
                    >
                      {student.present ? "Present" : "Absent"}
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="w-full bg-lumina-purple hover:bg-purple-800 text-white font-bold text-xs py-3 rounded-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <FaCheck /> Save Attendance
              </button>
            </form>
          </div>

          {/* Live Check-ins Box */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 text-lg mb-1 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Recent Arrivals
            </h3>
            <p className="text-xs text-gray-400 mb-4">Real-time check-ins for your classes</p>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {attendanceLogs && attendanceLogs.length > 0 ? (
                attendanceLogs.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between items-center p-2.5 rounded-lg border border-gray-50 hover:bg-gray-50 transition">
                    <div>
                      <h4 className="text-xs font-bold text-gray-800">{log.studentId?.name || 'Student'}</h4>
                      <p className="text-4xs text-gray-400 font-medium mt-0.5">
                        {log.scheduleId?.title || 'Class'} • {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-4xs font-extrabold uppercase ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
                      log.status === 'Late' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-450 italic text-xs">
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
  const [stats, setStats] = useState({ coursesCount: 0, grade: 'Grade 10', enrolledCoursesList: [] });
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState([]);
  const [attendancePercentage, setAttendancePercentage] = useState(100);

  // Mock Notification Alert State
  const [showInvoiceMock, setShowInvoiceMock] = useState(false);

  useEffect(() => {
    fetchStudentStats();
    fetchStudentSchedule();
    fetchStudentAttendance();
  }, []);

  const fetchStudentAttendance = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/attendance/my', getAuthHeaders());
      setAttendance(res.data);
      if (res.data.length > 0) {
        const presentCount = res.data.filter(r => r.status === 'Present' || r.status === 'Late').length;
        const pct = Math.round((presentCount / res.data.length) * 100);
        setAttendancePercentage(pct);
      } else {
        setAttendancePercentage(100);
      }
    } catch (err) {
      console.error("Student attendance fetch failed", err);
    }
  };

  const fetchStudentStats = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/student-stats', getAuthHeaders());
      setStats(res.data);
    } catch (err) {
      console.error("Student stats fetch failed", err);
    }
  };

  const fetchStudentSchedule = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/schedule', getAuthHeaders());
      setSchedule(res.data);
    } catch (err) {
      console.error("Student schedule fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Determine continue learning card course title
  const activeCourseTitle = stats.enrolledCoursesList?.length > 0
    ? stats.enrolledCoursesList[0].title
    : "No Registered Course Enrolled";

  return (
    <div className="space-y-6">
      {/* Continuing learning card */}
      <div className="bg-gradient-to-r from-indigo-900 to-purple-850 rounded-xl shadow-lg p-7 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        {/* Subtle geometric circles */}
        <div className="absolute right-0 top-0 w-44 h-44 bg-white/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>

        <div className="relative z-5">
          <span className="bg-white/20 border border-white/10 px-3.5 py-1 rounded-full text-4xs font-extrabold uppercase tracking-widest mb-3 inline-block">
            Resume Course
          </span>
          <h2 className="text-2xl font-bold mb-1.5 tracking-tight">{activeCourseTitle}</h2>
          <p className="text-purple-200 text-xs mb-4">Module 1: General Core Lectures</p>

          <div className="w-56 h-1.5 bg-indigo-950/80 rounded-full overflow-hidden mb-2">
            <div className="bg-indigo-400 h-full w-[35%] rounded-full animate-pulse"></div>
          </div>
          <p className="text-4xs text-purple-200 font-bold uppercase tracking-wider">35% Completed</p>
        </div>

        {stats.enrolledCoursesList?.length > 0 ? (
          <button className="bg-white text-indigo-900 hover:bg-gray-150 px-6 py-3 rounded-lg font-bold text-xs transition shadow-lg flex items-center gap-1.5 cursor-pointer relative z-5 active:scale-95">
            <FaPlayCircle className="text-base" /> Resume Learning
          </button>
        ) : (
          <span className="text-xs text-white/50 italic">Enroll in a course from administration to begin learning</span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Enrolled Courses count */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 bg-purple-50 text-lumina-purple rounded-lg">
            <FaTrophy className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Enrolled Courses</p>
            <h3 className="text-2xl font-bold text-gray-800">{stats.coursesCount}</h3>
          </div>
        </div>

        {/* Circular attendance indicator */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-gray-500">Attendance Rating</h4>
            <p className="text-3xs text-gray-450 font-medium mt-1">
              Logged: {attendance.length} class{attendance.length !== 1 ? 'es' : ''}
            </p>
            <p className="text-4xs text-gray-400 mt-1">
              Present: {attendance.filter(r => r.status === 'Present' || r.status === 'Late').length} | Absent: {attendance.filter(r => r.status === 'Absent').length}
            </p>
          </div>
          <AttendanceRing percentage={attendancePercentage} />
        </div>

        {/* Fees status mockup widget */}
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-sm font-semibold text-gray-500">Tuition Fees Status</h4>
              <p className="text-3xs text-gray-450 font-medium mt-0.5">July Monthly Fees due</p>
            </div>
            <span className="text-4xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
              Paid ✅
            </span>
          </div>

          <div className="mt-4 flex justify-between items-center bg-gray-50 rounded-lg p-2.5">
            <div>
              <p className="text-3xs font-bold text-gray-800">July Fees Receipt</p>
              <p className="text-4xs text-gray-400">LKR 2,500.00 | Paid 05/07</p>
            </div>
            <button
              onClick={() => setShowInvoiceMock(true)}
              className="text-lumina-purple hover:underline text-3xs font-extrabold cursor-pointer"
            >
              View Receipt
            </button>
          </div>
        </div>
      </div>

      {/* TIMETABLE & ANNOUNCEMENTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Timetable List filtered for student grade */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-gray-800 text-lg mb-1">My Timetable ({stats.grade})</h3>
            <p className="text-xs text-gray-400 mb-4">Timetable classes matching your registered grade</p>

            <div className="space-y-3.5 max-h-[300px] overflow-y-auto">
              {schedule && schedule.length > 0 ? (
                schedule.map((sch) => (
                  <div key={sch._id} className="flex justify-between items-center p-3 rounded-lg border border-gray-50 hover:bg-purple-50/10 transition">
                    <div className="flex items-center gap-3">
                      <div className="bg-purple-50 text-lumina-purple font-bold px-3 py-1.5 rounded-lg text-xs min-w-[70px] text-center uppercase">
                        {sch.dayOfWeek.slice(0, 3)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-800">{sch.title}</h4>
                        <p className="text-2xs text-gray-500 font-medium mt-0.5">
                          🕒 {sch.startTime} - {sch.endTime} | 📍 Room: {sch.room}
                        </p>
                      </div>
                    </div>
                    {sch.teacherId && (
                      <span className="text-3xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                        👨‍🏫 {sch.teacherId.name}
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-gray-400 italic">
                  No classes scheduled for your grade ({stats.grade}) this week.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Announcements + Attendance Side Column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Announcements widget */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-lg mb-4 flex items-center gap-2">
                <FaBullhorn className="text-purple-600" /> Institute Announcements
              </h3>

              <div className="space-y-4">
                <div className="border-l-3 border-purple-600 pl-3">
                  <h4 className="text-xs font-bold text-gray-850">Class Reschedule Notice</h4>
                  <p className="text-3xs text-gray-500 mt-0.5">Grade 10 Science class will commence at 11 AM instead of 10 AM this Saturday.</p>
                  <span className="text-4xs text-gray-400 mt-1 block">Just now</span>
                </div>

                <div className="border-l-3 border-gray-300 pl-3">
                  <h4 className="text-xs font-bold text-gray-850">Monthly Exams - Term 2</h4>
                  <p className="text-3xs text-gray-500 mt-0.5">Term 2 evaluation exams for Grade 10-12 batches will begin on July 25th.</p>
                  <span className="text-4xs text-gray-400 mt-1 block">2 days ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* My Check-in Log widget */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
            <h3 className="font-bold text-gray-800 text-base mb-1">My Check-in Log</h3>
            <p className="text-xs text-gray-400 mb-3">Your physical class entrance logs</p>
            <div className="space-y-2.5 max-h-[200px] overflow-y-auto pr-1">
              {attendance && attendance.length > 0 ? (
                attendance.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between items-center p-2 rounded-lg border border-gray-50 text-xs">
                    <div>
                      <h4 className="font-bold text-gray-850">{log.scheduleId?.title || 'Class'}</h4>
                      <p className="text-4xs text-gray-450">{new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-4xs font-bold uppercase ${log.status === 'Present' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                      log.status === 'Late' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-red-50 text-red-600 border border-red-200'
                      }`}>
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-450 italic text-xs">
                  No physical arrivals logged yet.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* MOCK RECEIPT MODAL */}
      {showInvoiceMock && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-150 max-w-sm w-full mx-4 transform scale-100 transition-all duration-200">
            <div className="text-center pb-4 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">LuminaLearn Tuition Institute</h3>
              <p className="text-3xs text-gray-400 font-medium">Receipt #LL-2026-0798</p>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-gray-600">
              <div className="flex justify-between font-medium">
                <span>Student Name:</span>
                <span className="text-gray-800">{user.name}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Registration No:</span>
                <span className="text-gray-800">{user.registrationNumber || '-'}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Payment Purpose:</span>
                <span className="text-gray-800">Grade 10 Science (July Tuition)</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Date Paid:</span>
                <span className="text-gray-800">05/07/2026</span>
              </div>
              <div className="flex justify-between font-medium border-t border-gray-100 pt-2 text-sm">
                <span className="font-bold text-gray-800">Amount Paid:</span>
                <span className="font-bold text-emerald-600">LKR 2,500.00</span>
              </div>
            </div>

            <div className="flex justify-center border-t border-gray-100 pt-4">
              <button
                onClick={() => setShowInvoiceMock(false)}
                className="px-5 py-2 bg-lumina-purple hover:bg-purple-800 text-white font-bold rounded-lg text-xs transition cursor-pointer"
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
      <h1 className="text-3xl font-extrabold text-gray-850 mb-6 tracking-tight">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
      </h1>

      {/* Role-Based Switchboard */}
      {user.role === 'admin' && <AdminDashboard user={user} />}
      {user.role === 'teacher' && <TeacherDashboard user={user} />}
      {user.role === 'student' && <StudentDashboard user={user} />}
    </div>
  );
};

export default Dashboard;