import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/auth/change-password', 
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const user = JSON.parse(localStorage.getItem('user'));
      if (user) {
        user.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(user));
      }

      toast.success("Security updated! Redirecting...");
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // Background set to luminaLight (#f3f4f6)
    <div className="min-h-screen flex items-center justify-center bg-[#f3f4f6] p-4 font-sans">
      
      {/* Main Container */}
      <div className="flex w-full max-w-4xl bg-white rounded-[30px] shadow-2xl overflow-hidden min-h-[550px]">
        
        {/* Left Sidebar - Background set to luminaPurple (#2d1b64) */}
        <div className="hidden md:flex md:w-5/12 bg-[#2d1b64] p-10 flex-col justify-between text-white">
          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="bg-white/10 p-2 rounded-lg">
                <span className="text-xl">💡</span>
              </div>
              <h1 className="text-xl font-bold tracking-tight">LuminaLearn</h1>
            </div>
            <h2 className="text-3xl font-bold leading-tight mb-4">
              Update Your <br /> Password
            </h2>
            <p className="text-white/60 text-sm leading-relaxed">
              To keep your account secure, please set a new password before accessing your dashboard.
            </p>
          </div>
          
          <div className="relative">
            <div className="text-[100px] opacity-10 absolute -bottom-5 -left-5 rotate-12">🔐</div>
          </div>
        </div>

        {/* Right Content - Form */}
        <div className="w-full md:w-7/12 p-10 md:p-16 flex flex-col justify-center">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800">Set New Password</h3>
            <p className="text-gray-500 text-sm mt-1">Please enter your new security credentials.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                New Password
              </label>
              {/* Input field background set to luminaLight (#f3f4f6) */}
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full p-4 bg-[#f3f4f6] border-none rounded-xl focus:ring-2 focus:ring-[#2d1b64] transition-all outline-none text-gray-700"
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Confirm Password
              </label>
              {/* Input field background set to luminaLight (#f3f4f6) */}
              <input 
                type="password" 
                placeholder="••••••••" 
                className="w-full p-4 bg-[#f3f4f6] border-none rounded-xl focus:ring-2 focus:ring-[#2d1b64] transition-all outline-none text-gray-700"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            {/* Button background set to luminaPurple (#2d1b64) */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#2d1b64] hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:bg-gray-300 disabled:shadow-none"
            >
              {isLoading ? 'Updating Security...' : 'Update Password'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Need help? <span className="text-[#2d1b64] cursor-pointer font-medium">Contact Support</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;