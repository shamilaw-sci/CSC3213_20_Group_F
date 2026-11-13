import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Settings from './pages/Settings';

// --- COMPONENTS & LAYOUTS ---
import Login from './components/Login';
import Register from './components/Register';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './components/Dashboard';
import ChatWidget from './components/ChatWidget';

import ErrorBoundary from './components/ErrorBoundary';

// --- PAGES ---
import Home from './pages/Home';
import Instructors from './pages/Instructors';
import AboutUs from './pages/AboutUs';
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
import ParentDashboard from './pages/ParentDashboard';
import CreateQuiz from './pages/CreateQuiz';
import TakeQuiz from './pages/TakeQuiz';
import QuizSubmissions from './pages/QuizSubmissions';
import SmsSettings from './pages/SmsSettings';
import AuditLogs from './pages/AuditLogs';
import ExportBackupCenter from './pages/ExportBackupCenter';

// --- PROTECTED ROUTE & ROLE SECURITY LOGIC ---
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  // 1. Not logged in? Kick back to login screen.
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  // 2. Forced password change check.
  if (user.mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  // 3. Counter staff auto-redirect to attendance & payments
  if (user.role === 'counter_staff' && window.location.pathname !== '/attendance' && window.location.pathname !== '/payments' && window.location.pathname !== '/change-password') {
    return <Navigate to="/attendance" replace />;
  }

  // 4. Parent role auto-redirect to parent dashboard
  if (user.role === 'parent' && location.pathname === '/dashboard') {
    return <Navigate to="/parent-dashboard" replace />;
  }

  // 5. Role verification (The Bouncer).
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    console.warn(`Access denied. Role '${user.role}' cannot access this route.`);
    const fallbackPath = user.role === 'counter_staff' ? "/attendance" : user.role === 'parent' ? "/parent-dashboard" : "/dashboard";
    return <Navigate to={fallbackPath} replace />;
  }

  // 6. All checks passed! Let them through.
  return children;
};

// --- AUTO SCROLL TO TOP ON ROUTE CHANGE ---
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  React.useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
    const mainContainer = document.querySelector('main');
    if (mainContainer) {
      mainContainer.scrollTop = 0;
    }
  }, [pathname, search]);

  return null;
};

function App() {
  return (
    <Router>
      <ScrollToTop />
      <Toaster position="top-center" />
      <Routes>
        {/* === PUBLIC ROUTES === */}
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/instructors" element={<Instructors />} />
        <Route path="/timetable" element={<Instructors />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* === DASHBOARD & PROTECTED ROUTES === */}
        {/* Everything inside here gets the Sidebar and Header automatically */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          
          {/* Level 1: Accessible to EVERYONE (Student, Teacher, Admin) */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/courses" element={<Courses />} /> 
          <Route path="/course/:courseId" element={<ErrorBoundary><CourseDetails /></ErrorBoundary>} />
          <Route path="/courses/:courseId" element={<ErrorBoundary><CourseDetails /></ErrorBoundary>} />
          
          <Route path="/course/:courseId/create-quiz" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <CreateQuiz />
            </ProtectedRoute>
          } />

          <Route path="/course/:courseId/quiz/:quizId/edit" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <CreateQuiz />
            </ProtectedRoute>
          } />
          
          <Route path="/quiz/:quizId/take" element={
            <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
              <TakeQuiz />
            </ProtectedRoute>
          } />

          <Route path="/quiz/:quizId/submissions" element={
            <ProtectedRoute allowedRoles={['teacher', 'admin']}>
              <QuizSubmissions />
            </ProtectedRoute>
          } />

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
            <ProtectedRoute allowedRoles={['admin', 'counter_staff', 'teacher']}>
              <Attendance />
            </ProtectedRoute>
          } />

          <Route path="/parent-dashboard" element={
            <ProtectedRoute allowedRoles={['parent', 'admin']}>
              <ParentDashboard />
            </ProtectedRoute>
          } />

          <Route path="/audit-logs" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AuditLogs />
            </ProtectedRoute>
          } />

          <Route path="/export-center" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ExportBackupCenter />
            </ProtectedRoute>
          } />

          <Route path="/sms-settings" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <SmsSettings />
            </ProtectedRoute>
          } />

        </Route>
        
        {/* Catch-all for random URLs */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
      <ChatWidget />
    </Router>
  );
}

export default App;
