import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AddCourse from './pages/AddCourse';
import ChangePassword from './pages/ChangePassword';
import DashboardLayout from './components/DashboardLayout';
// 1. ADD THIS IMPORT
import Courses from './pages/Courses'; 

const ProtectedRoute = ({ children }) => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) return <Navigate to="/login" />;

  if (user.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" />;
  }

  return children;
};

function App() {
  return (
    <Router>
      <Toaster position="top-center" reverseOrder={false} />
      
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* PROTECTED ROUTES */}
        {/* We nest the pages inside DashboardLayout so the Sidebar always shows */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-course" element={<AddCourse />} />
          <Route path="/courses" element={<Courses />} /> 
        </Route>
        
        {/* Catch-all for undefined routes */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;