import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FaHome, FaBook, FaCalendarCheck, FaCreditCard, FaChartBar, FaUsers, FaSignOutAlt, FaUserPlus } from 'react-icons/fa';

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role;

  // --- LOGOUT LOGIC ---
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  // Helper function to highlight the active menu item
  const isActive = (path) => location.pathname === path 
    ? "bg-purple-700 border-l-4 border-white text-white" 
    : "hover:bg-purple-700 text-purple-100";

  return (
    <div className="w-64 h-screen bg-lumina-purple text-white fixed left-0 top-0 flex flex-col overflow-hidden shadow-2xl z-30">
      
      {/* Brand / Logo Area */}
      <div className="p-6 mb-4">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <img src="/assets/LuminaLearn_Logo_icon.png" alt="LuminaLearn Logo" className="h-10 w-auto" />
          LuminaLearn
        </h2>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 min-h-0 px-4 pb-6 space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {role === 'counter_staff' ? (
          <>
            <div className="bg-purple-800/60 p-3 rounded-xl mb-4 border border-purple-600/40">
              <span className="text-[10px] font-extrabold uppercase text-amber-300 tracking-wider block">Staff Account</span>
              <span className="text-xs font-bold text-white block">Attendance Counter Kiosk</span>
            </div>
            <Link to="/attendance" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/attendance')}`}>
              <FaCalendarCheck /> Live QR Kiosk
            </Link>
          </>
        ) : role === 'parent' ? (
          <>
            <div className="bg-purple-800/60 p-3 rounded-xl mb-4 border border-purple-600/40">
              <span className="text-[10px] font-extrabold uppercase text-purple-200 tracking-wider block">Parent Account</span>
              <span className="text-xs font-bold text-white block">Child Monitoring Portal</span>
            </div>
            <Link to="/parent-dashboard" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/parent-dashboard')}`}>
              <FaHome /> Child Dashboard
            </Link>
            <Link to="/courses" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/courses')}`}>
              <FaBook /> Institute Courses
            </Link>
          </>
        ) : (
          <>
            <Link to="/dashboard" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/dashboard')}`}><FaHome /> Dashboard</Link>
            <Link to="/courses" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/courses')}`}><FaBook /> Courses</Link>
            {role !== 'student' && (
              <Link to="/attendance" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/attendance')}`}><FaCalendarCheck /> Attendance</Link>
            )}
            <Link to="/payments" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/payments')}`}><FaCreditCard /> Payments</Link>
            <Link to="/analytics" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/analytics')}`}><FaChartBar /> Analytics</Link>

            {/* Admin Only Section */}
            {role === 'admin' && (
              <>
                <div className="pt-6 pb-2">
                  <p className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Administration</p>
                </div>
                <Link to="/manage-users" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/manage-users')}`}><FaUsers /> Manage Users</Link>
                <Link to="/enrollments" className={`flex items-center gap-3 p-3 rounded-lg transition-all ${isActive('/enrollments')}`}><FaUserPlus /> Enrollments</Link>
              </>
            )}
          </>
        )}
      </nav>

      {/* Logout Button (Pinned to bottom) */}
      <div className="p-4 border-t border-purple-800 mt-auto">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-500 hover:text-white transition-colors text-purple-200 font-medium cursor-pointer"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
