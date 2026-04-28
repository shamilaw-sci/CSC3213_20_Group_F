import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // Brings in the beautiful alerts!
import Register from './components/Register';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar'; // Don't forget to import this!

function App() {
  return (
    <Router>
      {/* This invisible component listens for our toast messages and displays them */}
      <Toaster position="top-center" reverseOrder={false} />
      
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        
        {/* We wrap the Dashboard AND Sidebar together here! */}
        <Route path="/dashboard" element={
          <div className="flex">
            <Sidebar />
            <Dashboard />
          </div>
        } />
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;