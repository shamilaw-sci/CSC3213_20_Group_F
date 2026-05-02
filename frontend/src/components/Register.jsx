import React, { useState } from 'react';
import axios from 'axios';
import { FaUser, FaEnvelope, FaLock } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
// 1. Import the Google component
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
  const navigate = useNavigate();

  // --- TRADITIONAL REGISTRATION ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', formData);
      toast.success(res.data.message);
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed!");
    }
  };

  // --- GOOGLE REGISTRATION/LOGIN HANDLER ---
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      // We use the exact same backend route as Login!
      const res = await axios.post('http://localhost:5000/api/auth/google', {
        credential: credentialResponse.credential,
      });

      // Save the session
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success("Account created successfully with Google!");
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error("Google registration failed. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      {/* LEFT SIDE: Illustration/Branding */}
      <div className="hidden lg:flex w-1/2 bg-lumina-purple items-center justify-center p-12 text-white flex-col">
        <h1 className="text-4xl font-bold mb-4">Join LuminaLearn Today!</h1>
        <p className="text-purple-200 text-center mb-8">Create your account and start your learning journey with us.</p>
        <div className="w-64 h-64 bg-purple-500/20 rounded-full flex items-center justify-center text-8xl">🎓</div>
      </div>

      {/* RIGHT SIDE: Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Create Account</h2>
          <p className="text-gray-500 mb-8">Fill in the details to get started</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <FaUser className="absolute left-3 top-4 text-gray-400" />
              <input 
                type="text" placeholder="Full Name" 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
                required
              />
            </div>
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-4 text-gray-400" />
              <input 
                type="email" placeholder="Email Address" 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                required
              />
            </div>
            <div className="relative">
              <FaLock className="absolute left-3 top-4 text-gray-400" />
              <input 
                type="password" placeholder="Password" 
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                required
              />
            </div>
            
            <button type="submit" className="w-full bg-lumina-purple hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-lg transition duration-300">
              Register
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
              onError={() => toast.error('Google Registration Failed')}
              theme="outline"
              shape="pill"
              size="large"
              width="384"
              text="signup_with" // Changes the button text to "Sign up with Google"
            />
          </div>

          <p className="mt-8 text-center text-gray-600">
            Already have an account?{" "}
            <span 
              onClick={() => navigate('/login')} 
              className="text-purple-600 font-bold cursor-pointer hover:underline">
              Login
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;