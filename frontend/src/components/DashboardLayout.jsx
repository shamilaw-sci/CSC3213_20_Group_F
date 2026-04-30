import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { FaBell, FaUserCircle, FaCog } from 'react-icons/fa'; // 1. Imported Profile Icons

const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 2. Add state to control whether the dropdowns are visible
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // 3. Use state for user so the Header can instantly update when Settings are changed
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

  const role = user?.role;
  const userName = user?.name || 'User';

  // --- DUMMY NOTIFICATIONS ---
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
      case '/settings': return `${userName} - Settings`; // Added Settings Title
      default: return userName;
    }
  };

  // Restored your exact logic for the Add Course button
  const showAddCourseButton = (role === 'teacher' || role === 'admin') && (location.pathname === '/dashboard' || location.pathname === '/courses');

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="flex-1 flex flex-col overflow-y-auto ml-64">
        
        <header className="h-20 bg-white border-b border-gray-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-10">
           
           <h2 className="text-xl font-bold text-gray-800">
             {getPageTitle()}
           </h2>
           
           {/* --- RIGHT SIDE ACTIONS CONTAINER --- */}
           <div className="flex items-center gap-6">
             
             {showAddCourseButton && (
               <button 
                 onClick={() => navigate('/add-course')}
                 className="bg-lumina-purple hover:bg-purple-800 text-white px-5 py-2.5 rounded-lg font-semibold transition-all shadow-md flex items-center gap-2"
               >
                 <span className="text-xl leading-none">+</span> Create Course
               </button>
             )}

             {/* --- NOTIFICATION SYSTEM --- */}
             <div className="relative">
                <button 
                  // Clicking Bell opens notifications and closes profile menu
                  onClick={() => { setShowNotifications(!showNotifications); setShowProfileMenu(false); }}
                  className="p-2 text-gray-500 hover:text-lumina-purple hover:bg-purple-50 rounded-full transition-all relative outline-none"
                >
                  <FaBell className="text-2xl" />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </button>

                {/* The Full Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <h3 className="font-bold text-gray-700">Notifications</h3>
                      <span className="text-xs font-bold bg-lumina-purple text-white px-2 py-1 rounded-full">
                        {notifications.length} New
                      </span>
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
                    
                    <div className="p-3 text-center border-t border-gray-100 bg-white">
                      <button 
                        className="text-sm font-bold text-lumina-purple hover:text-purple-800 transition-colors"
                        onClick={() => setShowNotifications(false)}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
             </div>

             {/* --- NEW USER PROFILE SYSTEM --- */}
             <div className="relative">
                <button 
                  // Clicking Profile opens profile menu and closes notifications
                  onClick={() => { setShowProfileMenu(!showProfileMenu); setShowNotifications(false); }}
                  className="flex items-center gap-2 p-1 text-gray-500 hover:text-lumina-purple rounded-full transition-all outline-none"
                >
                  <FaUserCircle className="text-3xl" />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden transform transition-all">
                    
                    {/* User Info Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50 text-center">
                      <p className="font-bold text-gray-800 truncate">{userName}</p>
                      <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider mt-1">
                        {role}
                      </p>
                    </div>
                    
                    {/* Settings Link */}
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