import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import BroadcastModal from './BroadcastModal';
import ChatWidget from './ChatWidget';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

import {
  FaBell,
  FaUserCircle,
  FaCog,
  FaSearch,
  FaBullhorn,
  FaCheckDouble,
  FaMoneyBillWave,
  FaUserPlus,
  FaCalendarCheck,
  FaBookOpen,
  FaExclamationCircle,
  FaInfoCircle
} from 'react-icons/fa';
import api from '../utils/api';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  let filename = url;
  if (url.includes('/uploads/')) {
    filename = url.split('/uploads/').pop();
  } else if (url.startsWith('/')) {
    filename = url.substring(1);
  }
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${backendBase}/uploads/${filename}`;
};

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // --- UI STATES ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);

  // --- NOTIFICATION DATA STATES ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // --- CLICK OUTSIDE REFS ---
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  // Listen for storage and userUpdated changes
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem('user'));
      if (updatedUser) setUser(updatedUser);
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleStorageChange);
    window.addEventListener('teacherProfileUpdated', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleStorageChange);
      window.removeEventListener('teacherProfileUpdated', handleStorageChange);
    };
  }, []);

  // --- FETCH NOTIFICATIONS FROM BACKEND ---
  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 20 seconds for real-time notifications
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, []);

  // --- CLICK OUTSIDE LOGIC ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const role = user?.role;
  const userName = user?.name || 'User';

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleNotificationClick = async (notif) => {
    try {
      if (!notif.isRead) {
        await api.put(`/notifications/${notif.id || notif._id}/read`);
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error marking notification read:', err);
    } finally {
      setShowNotifications(false);
      if (notif.link) {
        navigate(notif.link);
      }
    }
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'PAYMENT':
        return <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><FaMoneyBillWave className="text-base" /></div>;
      case 'REGISTRATION':
        return <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><FaUserPlus className="text-base" /></div>;
      case 'ATTENDANCE':
        return <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaCalendarCheck className="text-base" /></div>;
      case 'COURSE_ADDED':
      case 'NEW_CONTENT':
        return <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FaBookOpen className="text-base" /></div>;
      case 'CLASS_POSTPONED':
        return <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FaExclamationCircle className="text-base" /></div>;
      default:
        return <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><FaInfoCircle className="text-base" /></div>;
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return `Welcome back, ${userName}!`;
      case '/courses': return `${userName} - Courses`;
      case '/attendance': return `${userName} - Attendance`;
      case '/payments': return `${userName} - Payments`;
      case '/analytics': return `${userName} - Analytics`;
      case '/manage-users': return `${userName} - Manage Users`;
      case '/add-course': return `${userName} - Create Course`;
      case '/settings': return `${userName} - Settings`;
      default: return userName;
    }
  };

  const canCreateCourse = role === 'admin';
  const canBroadcast = role === 'admin' || role === 'teacher';
  const showAddCourseButton = canCreateCourse && (location.pathname === '/dashboard' || location.pathname === '/courses');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-y-auto ml-64">

        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-40">

          <h2 className="text-xl font-bold text-gray-800 flex-shrink-0 truncate max-w-[25%] mr-4">
            {getPageTitle()}
          </h2>

          {/* --- SEARCH BAR --- */}
          <div className="flex-1 max-w-xl mx-4 min-w-[200px]">
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 group-focus-within:text-lumina-purple transition-colors">
                <FaSearch />
              </span>
              <input
                type="text"
                placeholder="Search for courses and teachers..."
                className="w-full py-2.5 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 w-auto flex-shrink-0 justify-end">

            {/* --- BROADCAST ANNOUNCEMENT BUTTON (TEACHERS & ADMINS) --- */}
            {canBroadcast && (
              <button
                onClick={() => setIsBroadcastOpen(true)}
                className="bg-amber-500 hover:bg-amber-600 cursor-pointer text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm flex items-center gap-2"
                title="Broadcast Announcement via SMS, Email & In-App"
              >
                <FaBullhorn className="text-sm" /> Announcement
              </button>
            )}

            {showAddCourseButton && (
              <Link
                to="/add-course"
                className="bg-lumina-purple hover:bg-purple-800 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2 whitespace-nowrap flex-shrink-0 text-sm"
              >
                <span className="text-xl leading-none">+</span> Create Course
              </Link>
            )}

            {/* --- NOTIFICATION SYSTEM --- */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                }}
                className="p-2.5 text-gray-500 hover:text-lumina-purple hover:bg-purple-50 rounded-full transition-all relative outline-none cursor-pointer"
                title="Notifications"
              >
                <FaBell className="text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white min-w-[18px] text-center leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-3 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all z-50">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[11px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FaCheckDouble className="text-xs" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id || notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 hover:bg-purple-50/50 transition-colors cursor-pointer flex gap-3 text-sm relative ${!notif.isRead ? 'bg-purple-50/20 font-semibold' : 'opacity-80'
                            }`}
                        >
                          {!notif.isRead && (
                            <span className="absolute top-4 right-3 w-2 h-2 bg-purple-600 rounded-full"></span>
                          )}
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 pr-3">
                            <p className="text-gray-900 font-bold text-xs mb-0.5">{notif.title}</p>
                            <p className="text-gray-600 text-xs leading-relaxed line-clamp-2">{notif.message}</p>
                            <p className="text-gray-400 text-[10px] font-medium mt-1.5">{notif.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 text-xs font-medium">
                        <FaBell className="text-3xl mx-auto mb-2 text-gray-300" />
                        You're all caught up! No notifications.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* --- USER PROFILE SYSTEM --- */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-1 text-gray-500 hover:text-lumina-purple rounded-full transition-all outline-none cursor-pointer"
              >
                {user?.profilePicture ? (
                  <img
                    src={getImageUrl(user.profilePicture)}
                    alt="Profile"
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded-full object-cover border border-purple-200 shadow-sm"
                  />
                ) : (
                  <FaUserCircle className="text-3xl" />
                )}
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all z-50">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 text-center flex flex-col items-center">
                    {user?.profilePicture ? (
                      <img
                        src={getImageUrl(user.profilePicture)}
                        alt="Profile"
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 mb-2 shadow-inner"
                      />
                    ) : (
                      <FaUserCircle className="text-4xl text-gray-400 mb-2" />
                    )}
                    <p className="font-bold text-gray-800 truncate w-full">{userName}</p>
                    <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mt-1">
                      {role}
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 text-gray-700 hover:text-lumina-purple rounded-lg transition-colors font-medium text-sm cursor-pointer"
                    >
                      <FaCog className="text-lg" /> Account Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-grow p-8 bg-gray-50 min-h-[calc(100vh-5rem)]">
          <Outlet />
        </main>
      </div>

      {/* --- BROADCAST ANNOUNCEMENT MODAL --- */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
      />

      {/* --- LUMINA CHAT FLOATING AI ASSISTANT WIDGET --- */}
      <ChatWidget />
    </div>
  );
};

export default DashboardLayout;

