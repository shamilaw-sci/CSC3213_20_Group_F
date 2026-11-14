import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaBook, FaCalendarCheck, FaCalendarAlt, FaCreditCard, FaChartBar, FaUsers, FaSignOutAlt, FaUserPlus, FaSms, FaTimes } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role;

  // Auto-close sidebar on route change on mobile
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    onClose();
    navigate('/login');
  };

  // Active/hover styles that transform between light and dark
  const isActive = (path) => {
    if (location.pathname === path) {
      return isDark
        ? "bg-gradient-to-r from-purple-600/30 to-purple-500/10 border-l-4 border-purple-400 text-white shadow-[inset_0_0_20px_rgba(168,85,247,0.15)]"
        : "bg-purple-700 border-l-4 border-white text-white";
    }
    return isDark
      ? "hover:bg-slate-800/80 hover:border-l-4 hover:border-purple-500/50 text-slate-300 hover:text-white"
      : "hover:bg-purple-700 text-purple-100";
  };

  // Dynamic sidebar classes for the stunning transformation
  const sidebarBg = isDark
    ? "bg-slate-900 border-r border-slate-800/80"
    : "bg-lumina-purple";

  const logoTextColor = isDark ? "text-white" : "text-white";
  const sectionLabelColor = isDark ? "text-purple-400/80" : "text-purple-300";
  const logoutBorderColor = isDark ? "border-slate-800" : "border-purple-800";
  const logoutTextColor = isDark ? "text-slate-400" : "text-purple-200";
  const staffBadgeBg = isDark
    ? "bg-slate-800/80 border-slate-700/60"
    : "bg-purple-800/60 border-purple-600/40";

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <div
        className={`w-64 h-screen ${sidebarBg} text-white fixed left-0 top-0 flex flex-col overflow-hidden shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Ambient glow effect in dark mode */}
        {isDark && (
          <div className="absolute top-0 left-0 w-full h-40 bg-gradient-to-b from-purple-600/8 to-transparent pointer-events-none" />
        )}
        
        {/* Brand / Logo Area */}
        <div className={`p-5 mb-3 flex items-center justify-between relative ${isDark ? 'border-b border-slate-800/50' : ''}`}>
          <h2 className={`text-2xl font-bold flex items-center gap-3 ${logoTextColor}`}>
            <img src="/assets/LuminaLearn_Logo_icon.png" alt="LuminaLearn Logo" className="h-9 w-auto" />
            <span className={isDark ? "bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent" : ""}>
              LuminaLearn
            </span>
          </h2>
          {/* Mobile Close Button */}
          <button
            onClick={onClose}
            className="md:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close navigation"
            aria-label="Close navigation"
          >
            <FaTimes className="text-base" />
          </button>
          {isDark && (
            <div className="absolute bottom-0 left-5 right-5 h-px bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />
          )}
        </div>
      
      {/* Navigation Links */}
      <nav onClick={onClose} className="flex-1 min-h-0 px-4 pb-6 space-y-1.5 overflow-y-auto no-scrollbar relative">
        {role === 'counter_staff' ? (
          <>
            <div className={`${staffBadgeBg} p-3 rounded-xl mb-4 border transition-colors duration-300`}>
              <span className="text-[10px] font-extrabold uppercase text-amber-300 tracking-wider block">Staff Account</span>
              <span className="text-xs font-bold text-white block">Attendance & Payments Portal</span>
            </div>
            <Link to="/attendance" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/attendance')}`}>
              <FaCalendarCheck /> Attendance
            </Link>
            <Link to="/payments" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/payments')}`}>
              <FaCreditCard /> Payments
            </Link>
          </>
        ) : role === 'parent' ? (
          <>
            <div className={`${staffBadgeBg} p-3 rounded-xl mb-4 border transition-colors duration-300`}>
              <span className={`text-[10px] font-extrabold uppercase tracking-wider block ${isDark ? 'text-purple-400' : 'text-purple-200'}`}>Parent Account</span>
              <span className="text-xs font-bold text-white block">Child Monitoring Portal</span>
            </div>
            <Link to="/parent-dashboard" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/parent-dashboard')}`}>
              <FaHome /> Child Dashboard
            </Link>
            <Link to="/calendar" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/calendar')}`}>
              <FaCalendarAlt /> Timetable & Calendar
            </Link>
            <Link to="/courses" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/courses')}`}>
              <FaBook /> Institute Courses
            </Link>
            <Link to="/analytics" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/analytics')}`}>
              <FaChartBar /> Analytics
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/dashboard')}`}><FaHome /> Dashboard</Link>
            <Link to="/calendar" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/calendar')}`}><FaCalendarAlt /> Timetable & Calendar</Link>
            <Link to="/courses" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/courses')}`}><FaBook /> Courses</Link>
            {role !== 'student' && (
              <Link to="/attendance" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/attendance')}`}><FaCalendarCheck /> Attendance</Link>
            )}
            <Link to="/payments" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/payments')}`}><FaCreditCard /> Payments</Link>
            <Link to="/analytics" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/analytics')}`}><FaChartBar /> Analytics</Link>

            {/* Admin Only Section */}
            {role === 'admin' && (
              <>
                <div className="pt-6 pb-2">
                  <p className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-300 ${sectionLabelColor}`}>Administration</p>
                </div>
                <Link to="/manage-users" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/manage-users')}`}><FaUsers /> Manage Users</Link>
                <Link to="/enrollments" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/enrollments')}`}><FaUserPlus /> Enrollments</Link>
                <Link to="/sms-settings" className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${isActive('/sms-settings')}`}><FaSms /> SMS Settings</Link>
              </>
            )}
          </>
        )}
      </nav>

      {/* Logout Button (Pinned to bottom) */}
      <div className={`p-4 border-t ${logoutBorderColor} mt-auto transition-colors duration-300`}>
        <button 
          onClick={handleLogout}
          className={`flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-500/90 hover:text-white hover:shadow-lg hover:shadow-red-500/20 transition-all duration-200 ${logoutTextColor} font-medium cursor-pointer`}
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </div>
  </>
);
};

export default Sidebar;
