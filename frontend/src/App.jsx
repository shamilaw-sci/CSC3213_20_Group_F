import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Components
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import AddCourse from './pages/AddCourse';
import ChangePassword from './pages/ChangePassword';
import DashboardLayout from './components/DashboardLayout';

const ProtectedRoute = ({ children }) => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  if (!user) return <Navigate to="/login" />;

  // Force redirect if password needs changing
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

        {/* PROTECTED ROUTES (Using Layout) */}
        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/add-course" element={<AddCourse />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;