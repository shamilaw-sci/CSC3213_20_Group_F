import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
// MERGED: All icons are now in one single import line
import { FaBell, FaUserCircle, FaCog, FaSearch } from 'react-icons/fa';

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // --- UI STATES ---
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hasUnread, setHasUnread] = useState(true); // Controls the red dot
  
  // --- CLICK OUTSIDE REFS ---
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));

  // Listen for storage changes (triggered by Settings.jsx)
  useEffect(() => {
    const handleStorageChange = () => {
      const updatedUser = JSON.parse(localStorage.getItem('user'));
      if (updatedUser) setUser(updatedUser);
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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

  const notifications = [
    { id: 1, message: "Welcome to LuminaLearn!", time: "Just now" },
    { id: 2, message: "Please complete your profile setup.", time: "2 hours ago" },
  ];

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

  const showAddCourseButton = (role === 'admin') && (location.pathname === '/dashboard' || location.pathname === '/courses');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-y-auto ml-64">
        
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-10">
           
           <h2 className="text-xl font-bold text-gray-800 w-1/4 truncate">
             {getPageTitle()}
           </h2>

           {/* --- SEARCH BAR --- */}
           <div className="flex-1 max-w-xl mx-8">
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
           
           <div className="flex items-center gap-6 w-1/4 justify-end">
             
             {showAddCourseButton && (
               <button 
                 onClick={() => navigate('/add-course')}
                 className="bg-lumina-purple hover:bg-purple-800 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2"
               >
                 <span className="text-xl leading-none">+</span> Create Course
               </button>
             )}

             {/* --- NOTIFICATION SYSTEM --- */}
             <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => { 
                    setShowNotifications(!showNotifications); 
                    setShowProfileMenu(false);
                    setHasUnread(false); 
                  }}
                  className="p-2 text-gray-500 hover:text-lumina-purple hover:bg-purple-50 rounded-full transition-all relative outline-none"
                >
                  <FaBell className="text-2xl" />
                  {hasUnread && notifications.length > 0 && (
                    <span className="absolute top-1 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-700">Notifications</h3>
                      {hasUnread && (
                        <span className="text-xs font-bold bg-lumina-purple text-white px-2 py-1 rounded-full">
                          {notifications.length} New
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div key={notif.id} className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer text-sm">
                            <p className="text-gray-800 font-medium mb-1">{notif.message}</p>
                            <p className="text-gray-400 text-xs font-semibold">{notif.time}</p>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-gray-500 text-sm">You're all caught up!</div>
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
                  className="flex items-center gap-2 p-1 text-gray-500 hover:text-lumina-purple rounded-full transition-all outline-none"
                >
                  <FaUserCircle className="text-3xl" />
                </button>

                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 text-center">
                      <p className="font-bold text-gray-800 truncate">{userName}</p>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mt-1">
                        {role}
                      </p>
                    </div>
                    
                    <div className="p-2">
                      <button 
                        onClick={() => { navigate('/settings'); setShowProfileMenu(false); }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-purple-50 text-gray-700 hover:text-lumina-purple rounded-lg transition-colors font-medium text-sm"
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
    </div>
  );
};

export default DashboardLayout;