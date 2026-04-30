import React from 'react';

// --- SUB-COMPONENTS (You can move these to separate files later!) ---
const AdminDashboard = ({ user }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-xl font-bold text-lumina-purple mb-4">System Overview</h3>
    <p>Welcome, Admin {user.name}. Here you can manage all users and platform settings.</p>
    {/* Add admin stats cards here */}
  </div>
);

const TeacherDashboard = ({ user }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-xl font-bold text-lumina-purple mb-4">Instructor Portal</h3>
    <p>Welcome, Teacher {user.name}. Here are your active classes and student analytics.</p>
    {/* Add course management quick-links here */}
  </div>
);

const StudentDashboard = ({ user }) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
    <h3 className="text-xl font-bold text-lumina-purple mb-4">My Learning</h3>
    <p>Welcome back, {user.name}! You have 2 assignments due this week.</p>
    {/* Add enrolled courses list here */}
  </div>
);

// --- MAIN DASHBOARD COMPONENT ---
const Dashboard = () => {
  // 1. Grab the user data from localStorage
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : { name: 'Guest', role: 'student' };

  // 2. Render the correct view based on the role
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