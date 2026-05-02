import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  // --- TRADITIONAL LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success("Welcome back!");

      if (res.data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid Login!");
    }
  };

  // --- GOOGLE LOGIN HANDLER ---
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // Send the Google credential to your new backend route
      const res = await axios.post('http://localhost:5000/api/auth/google', {
        credential: credentialResponse.credential,
      });

      // Save the session just like the normal login
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success("Successfully logged in with Google!");
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error("Google authentication failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* LEFT SIDE */}
      <div className="hidden lg:flex w-1/2 bg-lumina-purple items-center justify-center p-12 text-white flex-col">
        <h1 className="text-4xl font-bold mb-4">Welcome Back! 👋</h1>
        <p className="text-purple-200 text-center mb-8">Login to your LuminaLearn account to continue your studies.</p>
        <div className="w-64 h-64 bg-purple-500/20 rounded-full flex items-center justify-center text-8xl">📚</div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Login</h2>
          <p className="text-gray-500 mb-8">Enter your credentials to access your dashboard</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-4 text-gray-400" />
              <input 
                type="email" placeholder="Email Address" 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                onChange={(e) => setEmail(e.target.value)} 
                required
              />
            </div>
            <div className="relative">
              <FaLock className="absolute left-3 top-4 text-gray-400" />
              <input 
                type="password" placeholder="Password" 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                onChange={(e) => setPassword(e.target.value)} 
                required
              />
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" className="accent-purple-600" /> Remember me
              </label>
              <span className="text-purple-600 font-medium cursor-pointer">Forgot password?</span>
            </div>

            <button type="submit" className="w-full bg-lumina-purple hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-lg transition duration-300">
              Login
            </button>
          </form>

          {/* --- THE "OR" DIVIDER --- */}
          <div className="flex items-center my-6 before:flex-1 before:border-t before:border-gray-200 after:flex-1 after:border-t after:border-gray-200">
            <p className="text-center font-semibold mx-4 text-gray-400 text-sm">OR</p>
          </div>

          {/* --- THE GOOGLE BUTTON --- */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google Login Failed')}
              useOneTap
              theme="outline"
              shape="pill"
              size="large"
              width="384" // Matches the width of your input fields (max-w-md)
            />
          </div>

          <p className="mt-8 text-center text-gray-600">
            Don't have an account? <span onClick={() => navigate('/register')} className="text-purple-600 font-bold cursor-pointer">Register</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;