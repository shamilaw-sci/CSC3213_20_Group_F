import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
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
  FaClock 
} from 'react-icons/fa';

// --- SUB-COMPONENTS ---
const AdminDashboard = ({ user }) => {
  // 1. HOOKS MUST LIVE INSIDE THE COMPONENT
  const [stats, setStats] = useState({ students: 0, teachers: 0, courses: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/auth/admin-stats', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStats(res.data);
      } catch (err) {
        console.error("Stats fetch failed", err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* --- STATS RIBBON (Top Row) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Total Students */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-purple-50 text-lumina-purple rounded-lg">
            <FaUsers className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Students</p>
            {/* 2. REAL DATA INJECTED HERE */}
            <h3 className="text-2xl font-bold text-gray-800">{stats.students}</h3>
          </div>
        </div>

        {/* Card 2: Total Teachers */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-lg">
            <FaChalkboardTeacher className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Total Teachers</p>
            {/* 3. REAL DATA INJECTED HERE */}
            <h3 className="text-2xl font-bold text-gray-800">{stats.teachers}</h3>
          </div>
        </div>

        {/* Card 3: Active Courses */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-orange-50 text-orange-500 rounded-lg">
            <FaBookOpen className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Active Courses</p>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">{stats.courses}</h3>
            </div>
          </div>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-green-50 text-green-500 rounded-lg">
            <FaChartLine className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Monthly Revenue</p>
            <h3 className="text-2xl font-bold text-gray-800">$0.00</h3>
          </div>
        </div>

      </div>

      {/* --- MIDDLE SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm lg:col-span-2 h-96 flex flex-col items-center justify-center text-gray-400">
           <FaChartLine className="text-4xl mb-2 text-gray-300" />
           <p className="font-semibold">User Growth Chart Loading...</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm h-96 flex flex-col items-center justify-center text-gray-400">
           <p className="font-semibold">Recent Registrations Loading...</p>
        </div>
      </div>

    </div>
  );
};

const TeacherDashboard = ({ user }) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Teacher Stats Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-purple-50 text-lumina-purple rounded-lg">
            <FaUserGraduate className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">My Students</p>
            <h3 className="text-2xl font-bold text-gray-800">0</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-yellow-50 text-yellow-500 rounded-lg">
            <FaStar className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Average Rating</p>
            <h3 className="text-2xl font-bold text-gray-800">0.0</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-4 bg-blue-50 text-blue-500 rounded-lg">
            <FaVideo className="text-2xl" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-500">Active Courses</p>
            <h3 className="text-2xl font-bold text-gray-800">0</h3>
          </div>
        </div>
      </div>

      {/* Teacher Main Section */}
      <div className="bg-white p-8 rounded-xl border border-gray-100 shadow-sm text-center">
        <div className="max-w-md mx-auto py-8">
          <FaBookOpen className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-800 mb-2">You haven't created any courses yet</h3>
          <p className="text-gray-500 mb-6">Share your knowledge with the world. Start building your first course today!</p>
          <button 
              onClick={() => navigate('/add-course')} // This maps it to your actual form!
              className="bg-lumina-purple hover:bg-purple-800 text-white px-6 py-3 rounded-lg font-semibold transition-all shadow-md flex items-center justify-center gap-2 mx-auto active:scale-95"
            >
              <FaPlusCircle /> Create New Course
            </button>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard = ({ user }) => (
  <div className="space-y-6">
    
    {/* Student "Continue Learning" Hero Card */}
    <div className="bg-gradient-to-r from-lumina-purple to-purple-900 rounded-xl shadow-md p-8 text-white flex justify-between items-center">
      <div>
        <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">Pick up where you left off</span>
        <h2 className="text-2xl font-bold mb-1">Introduction to Web Development</h2>
        <p className="text-purple-200 text-sm mb-4">Module 3: Advanced React Hooks</p>
        
        {/* Progress Bar */}
        <div className="w-64 h-2 bg-purple-950 rounded-full overflow-hidden mb-2">
          <div className="bg-white h-full w-[45%] rounded-full"></div>
        </div>
        <p className="text-xs text-purple-200 font-semibold">45% Completed</p>
      </div>
      
      <button className="bg-white text-lumina-purple hover:bg-gray-100 px-6 py-3 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2">
        <FaPlayCircle className="text-xl" /> Resume Course
      </button>
    </div>

    {/* Student Stats Ribbon */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="p-4 bg-green-50 text-green-500 rounded-lg">
          <FaTrophy className="text-2xl" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500">Completed Courses</p>
          <h3 className="text-2xl font-bold text-gray-800">0</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
        <div className="p-4 bg-orange-50 text-orange-500 rounded-lg">
          <FaClock className="text-2xl" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-500">Hours Learned</p>
          <h3 className="text-2xl font-bold text-gray-800">0h</h3>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center gap-2 hover:shadow-md transition-shadow">
        <p className="text-sm font-semibold text-gray-500">Upcoming Deadlines</p>
        <p className="text-sm text-gray-400 italic">No assignments due this week! 🎉</p>
      </div>
    </div>

  </div>
);

// --- MAIN DASHBOARD COMPONENT ---
const Dashboard = () => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : { name: 'Guest', role: 'student' };

  return (
    <div className="w-full">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)} Dashboard
      </h1>
      
      {/* The Traffic Cop Logic */}
      {user.role === 'admin' && <AdminDashboard user={user} />}
      {user.role === 'teacher' && <TeacherDashboard user={user} />}
      {user.role === 'student' && <StudentDashboard user={user} />}
    </div>
  );
};

export default Dashboard;