import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Settings from './pages/Settings';

// --- COMPONENTS & LAYOUTS ---
import Login from './components/Login';
import Register from './components/Register';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';

// --- PAGES ---
import AddCourse from './pages/AddCourse';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Courses from './pages/Courses'; 
import CourseDetails from './pages/CourseDetails';
import ManageUsers from './pages/ManageUsers';
import Attendance from './pages/Attendance';
import Enrollments from './pages/Enrollments';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';

// --- PROTECTED ROUTE & ROLE SECURITY LOGIC ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // 1. Not logged in? Kick back to login screen.
  if (!user) return <Navigate to="/login" />;

  // 2. Forced password change check.
  if (user.mustChangePassword && window.location.pathname !== '/change-password') {
    return <Navigate to="/change-password" />;
  }

  // 3. Role verification (The Bouncer).
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn(`Access denied. Role '${user.role}' cannot access this route.`);
    return <Navigate to="/dashboard" replace />;
  }

  // 4. All checks passed! Let them through.
  return children;
};

function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        {/* === PUBLIC ROUTES === */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/" element={<Navigate to="/login" />} />

        {/* === DASHBOARD & PROTECTED ROUTES === */}
        {/* Everything inside here gets the Sidebar and Header automatically */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          
          {/* Level 1: Accessible to EVERYONE (Student, Teacher, Admin) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} /> 
          <Route path="/course/:courseId" element={<CourseDetails />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/settings" element={<Settings />} />

          {/* Level 2: Restricted Access (Admin Only) */}
          <Route path="/add-course" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AddCourse />
            </ProtectedRoute>
          } />

          {/* Level 3: Top Secret (Admin Only) */}
          <Route path="/manage-users" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ManageUsers />
            </ProtectedRoute>
          } />

          <Route path="/enrollments" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Enrollments />
            </ProtectedRoute>
          } />

          <Route path="/attendance" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Attendance />
            </ProtectedRoute>
          } />

        </Route>
        
        {/* Catch-all for random URLs */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;
