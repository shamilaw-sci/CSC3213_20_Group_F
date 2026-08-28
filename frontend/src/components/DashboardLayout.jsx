import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import BroadcastModal from './BroadcastModal';
import MessagingPopup from './MessagingPopup';
import GlobalSearchBar from './GlobalSearchBar';
import TeacherModal from './TeacherModal';
import StudentProfileModal from './StudentProfileModal';
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
  FaInfoCircle,
  FaPaperPlane,
  FaComments,
  FaVideo,
  FaAward,
  FaClipboardCheck,
  FaSun,
  FaMoon,
  FaBars
} from 'react-icons/fa';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { getMediaUrl } from '../utils/mediaUrl';

const getImageUrl = (url) => getMediaUrl(url);

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();

  // --- UI STATES ---
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isBroadcastOpen, setIsBroadcastOpen] = useState(false);
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState(null);
  const [selectedStudentIdForModal, setSelectedStudentIdForModal] = useState(null);

  // --- DATA STATES ---
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

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

  // --- FETCH UNREAD MESSAGES COUNT ---
  const fetchUnreadMessagesCount = async () => {
    try {
      const res = await api.get('/messages/unread-count');
      if (res.data) {
        setUnreadMessageCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching unread messages count:', err.message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadMessagesCount();
    // Poll every 15 seconds for real-time notifications & unread messages
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadMessagesCount();
    }, 15000);
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
      const targetId = notif.id || notif._id;
      if (!notif.isRead && targetId) {
        await api.put(`/notifications/${targetId}/read`);
        setNotifications(prev => prev.map(n => (n.id || n._id) === targetId ? { ...n, isRead: true } : n));
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
      case 'ENROLLMENT':
        return <div className="p-2 bg-teal-100 text-teal-600 rounded-lg"><FaCheckDouble className="text-base" /></div>;
      case 'ATTENDANCE':
        return <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><FaCalendarCheck className="text-base" /></div>;
      case 'COURSE_ADDED':
      case 'NEW_CONTENT':
        return <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><FaBookOpen className="text-base" /></div>;
      case 'LIVE_CLASS':
        return <div className="p-2 bg-red-100 text-red-600 rounded-lg animate-pulse"><FaVideo className="text-base" /></div>;
      case 'CLASS_POSTPONED':
        return <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><FaExclamationCircle className="text-base" /></div>;
      case 'QUIZ':
        return <div className="p-2 bg-amber-100 text-amber-700 rounded-lg"><FaAward className="text-base" /></div>;
      case 'ASSIGNMENT':
        return <div className="p-2 bg-purple-100 text-purple-700 rounded-lg"><FaClipboardCheck className="text-base" /></div>;
      default:
        return <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><FaInfoCircle className="text-base" /></div>;
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return `Welcome back, ${userName}!`;
      case '/parent-dashboard': return userName;
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

  const getMobilePageTitle = () => {
    switch (location.pathname) {
      case '/dashboard': return 'Dashboard';
      case '/parent-dashboard': return 'Parent Portal';
      case '/courses': return 'Courses';
      case '/attendance': return 'Attendance';
      case '/payments': return 'Payments';
      case '/analytics': return 'Analytics';
      case '/manage-users': return 'Users';
      case '/add-course': return 'New Course';
      case '/settings': return 'Settings';
      default: return userName || 'LuminaLearn';
    }
  };

  const canCreateCourse = role === 'admin';
  const canBroadcast = role === 'admin' || role === 'teacher';
  const showAddCourseButton = canCreateCourse && (location.pathname === '/dashboard' || location.pathname === '/courses');

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-gray-100 transition-colors duration-500">
      <Sidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto ml-0 md:ml-64">

        <header className="h-16 sm:h-20 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-6 lg:px-8 shadow-sm sticky top-0 z-40 transition-all duration-500">

          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-lumina-purple hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Open menu"
              aria-label="Open navigation menu"
            >
              <FaBars className="text-lg" />
            </button>

            {/* Title: Concise on mobile, full on desktop */}
            <h2 className="text-base sm:text-lg lg:text-xl font-bold text-gray-800 dark:text-white flex-shrink-0">
              <span className="sm:hidden font-extrabold">{getMobilePageTitle()}</span>
              <span className="hidden sm:inline truncate max-w-[150px] md:max-w-[200px]">{getPageTitle()}</span>
            </h2>
          </div>

          {/* --- SYSTEM GLOBAL SEARCH BAR --- */}
          <GlobalSearchBar
            onSelectTeacher={(t) => setSelectedTeacherForModal(t)}
            onSelectStudent={(sId) => setSelectedStudentIdForModal(sId)}
          />

          <div className="flex items-center gap-1.5 sm:gap-2.5 w-auto flex-shrink-0 justify-end">

            {/* --- BROADCAST ANNOUNCEMENT BUTTON (TEACHERS & ADMINS) - Hidden on mobile (< sm) --- */}
            {canBroadcast && (
              <button
                onClick={() => setIsBroadcastOpen(true)}
                className="hidden sm:flex bg-amber-500 hover:bg-amber-600 cursor-pointer text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-sm items-center gap-1.5"
                title="Broadcast Announcement via SMS, Email & In-App"
              >
                <FaBullhorn className="text-xs sm:text-sm" />
                <span className="hidden lg:inline">Announcement</span>
              </button>
            )}

            {showAddCourseButton && (
              <Link
                to="/add-course"
                className="hidden sm:flex bg-lumina-purple hover:bg-purple-800 text-white px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg font-semibold transition-all shadow-md items-center gap-1.5 whitespace-nowrap flex-shrink-0 text-xs sm:text-sm"
                title="Create Course"
              >
                <span className="text-base sm:text-xl leading-none">+</span>
                <span className="hidden md:inline">Create Course</span>
              </Link>
            )}

            {/* --- THEME TOGGLE — Desktop / Tablet (sm:) — Hidden on mobile to keep topbar clean --- */}
            <button
              onClick={toggleTheme}
              className={`hidden sm:flex relative w-12 sm:w-16 h-7 sm:h-8 rounded-full transition-all duration-500 outline-none cursor-pointer border-2 items-center px-0.5 sm:px-1 group flex-shrink-0 ${
                isDark
                  ? 'bg-slate-800 border-purple-500/60 shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                  : 'bg-gradient-to-r from-sky-400 to-blue-500 border-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
              }`}
              title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {/* Sliding Dot */}
              <div
                className={`w-5 sm:w-5.5 h-5 sm:h-5.5 rounded-full flex items-center justify-center text-[10px] sm:text-[11px] transition-all duration-500 shadow-md ${
                  isDark
                    ? 'translate-x-5 sm:translate-x-8 bg-purple-500 text-white shadow-purple-500/40'
                    : 'translate-x-0 bg-white text-amber-500 shadow-amber-200/60'
                }`}
              >
                {isDark ? <FaMoon className="text-[9px] sm:text-[10px]" /> : <FaSun className="text-[10px] sm:text-[11px]" />}
              </div>
              {/* Background icons */}
              <div className="absolute inset-0 flex items-center justify-between px-1.5 sm:px-2 pointer-events-none">
                <FaSun className={`text-[9px] sm:text-[10px] transition-opacity duration-300 ${isDark ? 'opacity-30 text-slate-500' : 'opacity-0'}`} />
                <FaMoon className={`text-[9px] sm:text-[10px] transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-40 text-white/70'}`} />
              </div>
            </button>

            {/* --- DIRECT MESSAGING SYSTEM ICON --- */}
            <div className="relative">
              <button
                onClick={() => {
                  setIsMessagingOpen(!isMessagingOpen);
                  setShowNotifications(false);
                  setShowProfileMenu(false);
                }}
                className="p-1.5 sm:p-2.5 text-gray-500 dark:text-gray-300 hover:text-lumina-purple dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-full transition-all relative outline-none cursor-pointer"
                title="Direct Messages"
              >
                <FaPaperPlane className="text-base sm:text-lg" />
                {unreadMessageCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 px-1 sm:px-1.5 py-0.5 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900 min-w-[16px] sm:min-w-[18px] text-center leading-none">
                    {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                  </span>
                )}
              </button>
            </div>

            {/* --- NOTIFICATION SYSTEM --- */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowProfileMenu(false);
                  setIsMessagingOpen(false);
                }}
                className="p-1.5 sm:p-2.5 text-gray-500 dark:text-gray-300 hover:text-lumina-purple dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-full transition-all relative outline-none cursor-pointer"
                title="Notifications"
              >
                <FaBell className="text-lg sm:text-xl" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 px-1 sm:px-1.5 py-0.5 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-900 min-w-[16px] sm:min-w-[18px] text-center leading-none">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="fixed sm:absolute left-3 right-3 sm:left-auto sm:right-0 top-16 sm:top-auto sm:mt-3 w-auto sm:w-96 max-w-none sm:max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/80 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-800 dark:text-white text-sm">Notifications</h3>
                      {unreadCount > 0 && (
                        <span className="text-[11px] font-bold bg-purple-600 text-white px-2 py-0.5 rounded-full">
                          {unreadCount} New
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <FaCheckDouble className="text-xs" /> Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800">
                    {notifications.length > 0 ? (
                      notifications.map((notif) => (
                        <div
                          key={notif.id || notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`p-4 hover:bg-purple-50/50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer flex gap-3 text-sm relative ${!notif.isRead ? 'bg-purple-50/20 dark:bg-purple-950/30 font-semibold' : 'opacity-80'
                            }`}
                        >
                          {!notif.isRead && (
                            <span className="absolute top-4 right-3 w-2 h-2 bg-purple-600 rounded-full"></span>
                          )}
                          <div className="flex-shrink-0 mt-0.5">
                            {getNotifIcon(notif.type)}
                          </div>
                          <div className="flex-1 pr-3">
                            <p className="text-gray-900 dark:text-white font-bold text-xs mb-0.5">{notif.title}</p>
                            <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed line-clamp-2">{notif.message}</p>
                            <p className="text-gray-400 dark:text-gray-500 text-[10px] font-medium mt-1.5">{notif.time}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs font-medium">
                        <FaBell className="text-3xl mx-auto mb-2 text-gray-300 dark:text-gray-600" />
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
                  setIsMessagingOpen(false);
                }}
                className="flex items-center gap-2 p-1 text-gray-500 dark:text-gray-300 hover:text-lumina-purple rounded-full transition-all outline-none cursor-pointer relative"
              >
                <div className="relative">
                  {user?.profilePicture ? (
                    <img
                      src={getImageUrl(user.profilePicture)}
                      alt="Profile"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover border border-purple-200 dark:border-purple-800 shadow-sm"
                    />
                  ) : (
                    <FaUserCircle className="text-3xl dark:text-gray-300" />
                  )}
                  {user?.isEmailVerified && user?.email && (
                    <span 
                      className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 text-white rounded-full border border-white dark:border-slate-900 flex items-center justify-center text-[8px] shadow-xs"
                      title="Verified User"
                    >
                      ✓
                    </span>
                  )}
                </div>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-56 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-800 overflow-hidden transform transition-all z-50">
                  <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/80 text-center flex flex-col items-center">
                    <div className="relative mb-2">
                      {user?.profilePicture ? (
                        <img
                          src={getImageUrl(user.profilePicture)}
                          alt="Profile"
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 dark:border-purple-700 shadow-inner"
                        />
                      ) : (
                        <FaUserCircle className="text-4xl text-gray-400" />
                      )}
                      {user?.isEmailVerified && user?.email && (
                        <span 
                          className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 text-white rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-bold shadow-sm"
                          title="Verified User"
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="font-bold text-gray-800 dark:text-white truncate w-full flex items-center justify-center gap-1">
                      <span>{userName}</span>
                    </p>
                    <p className="text-xs font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider mt-0.5">
                      {role}
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200 hover:text-lumina-purple dark:hover:text-purple-400 rounded-lg transition-colors font-medium text-sm cursor-pointer"
                    >
                      <FaCog className="text-lg" /> Account Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="flex-grow p-8 bg-gray-50 dark:bg-slate-950 min-h-[calc(100vh-5rem)] transition-all duration-500">
          <Outlet />
        </main>
      </div>

      {/* --- BROADCAST ANNOUNCEMENT MODAL --- */}
      <BroadcastModal
        isOpen={isBroadcastOpen}
        onClose={() => setIsBroadcastOpen(false)}
      />

      {/* --- EMBEDDED POPUP MESSAGING WIDGET --- */}
      <MessagingPopup
        isOpen={isMessagingOpen}
        onClose={() => setIsMessagingOpen(false)}
        onUnreadUpdate={(count) => setUnreadMessageCount(count)}
      />

      {/* --- TEACHER PROFILE MODAL (LAUNCHABLE FROM SEARCH) --- */}
      <TeacherModal
        isOpen={!!selectedTeacherForModal}
        teacher={selectedTeacherForModal}
        teacherId={selectedTeacherForModal?._id || selectedTeacherForModal?.id}
        onClose={() => setSelectedTeacherForModal(null)}
      />

      {/* --- STUDENT PROFILE MODAL (LAUNCHABLE FROM SEARCH) --- */}
      <StudentProfileModal
        isOpen={!!selectedStudentIdForModal}
        studentId={selectedStudentIdForModal}
        onClose={() => setSelectedStudentIdForModal(null)}
      />
    </div>
  );
};

export default DashboardLayout;


