import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaThLarge, FaBook, FaUserCheck, FaWallet, FaChartBar } from "react-icons/fa";

const Sidebar = () => {
  const location = useLocation(); // To highlight the active link

  const menuItems = [
    { name: "Dashboard", icon: <FaThLarge />, path: "/dashboard" },
    { name: "Courses", icon: <FaBook />, path: "/courses" },
    { name: "Attendance", icon: <FaUserCheck />, path: "/attendance" },
    { name: "Payments", icon: <FaWallet />, path: "/payments" },
    { name: "Analytics", icon: <FaChartBar />, path: "/analytics" },
  ];

  return (
    <div className="w-64 bg-lumina-purple h-screen text-white flex flex-col p-6 fixed left-0 top-0">
      <h1 className="text-2xl font-bold mb-10 flex items-center gap-2">
        <span className="text-yellow-400">💡</span> LuminaLearn
      </h1>
      
      <nav className="flex flex-col gap-4">
        {menuItems.map((item) => (
          <Link 
            key={item.name} 
            to={item.path}
            className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 
              ${location.pathname === item.path 
                ? "bg-white/20 font-bold shadow-md" 
                : "hover:bg-white/10"
              }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.name}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;