import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// --- COMPONENTS & LAYOUTS ---
import Register from './components/Register';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';

// --- PAGES ---
import AddCourse from './pages/AddCourse';
import ChangePassword from './pages/ChangePassword';
import Courses from './pages/Courses'; 
import CourseDetails from './pages/CourseDetails';

// --- PROTECTED ROUTE LOGIC ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) return <Navigate to="/login" />;
  if (user.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/" element={<Navigate to="/login" />} />

        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} /> 
          <Route path="/course/:courseId" element={<CourseDetails />} />
          <Route path="/add-course" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <AddCourse />
            </ProtectedRoute>
          } />
        </Route>
        
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;