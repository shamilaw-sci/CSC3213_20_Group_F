import React, { useState } from 'react';
import api from '../utils/api';
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
      await api.post('/auth/change-password', { newPassword });

      const storedUser = localStorage.getItem('user');
      let user = storedUser ? JSON.parse(storedUser) : null;
      if (user) {
        user.mustChangePassword = false;
        localStorage.setItem('user', JSON.stringify(user));
        window.dispatchEvent(new Event('userUpdated'));
      }

      toast.success("Security updated! Redirecting...");
      
      const targetPath = user?.role === 'parent'
        ? '/parent-dashboard'
        : user?.role === 'counter_staff'
        ? '/attendance'
        : '/dashboard';

      setTimeout(() => navigate(targetPath), 1200);
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to update password");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-950 p-4 font-sans text-gray-800 dark:text-gray-100">

      {/* Main Container */}
      <div className="flex w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[30px] shadow-2xl overflow-hidden min-h-[550px] border border-gray-100 dark:border-slate-800">

        {/* Left Sidebar - Background set to luminaPurple (#2d1b64) */}
        <div className="hidden md:flex md:w-5/12 bg-[#2d1b64] dark:bg-purple-950 p-10 flex-col justify-between text-white border-r border-purple-900/50">
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
        <div className="w-full md:w-7/12 p-10 md:p-16 flex flex-col justify-center bg-white dark:bg-slate-900">
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Set New Password</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Please enter your new security credentials.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-4 bg-gray-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#2d1b64] dark:focus:ring-purple-500 transition-all outline-none text-gray-700 dark:text-white"
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full p-4 bg-gray-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#2d1b64] dark:focus:ring-purple-500 transition-all outline-none text-gray-700 dark:text-white"
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#2d1b64] hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 cursor-pointer text-white font-bold py-4 rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:bg-gray-300 dark:disabled:bg-slate-700 disabled:shadow-none"
            >
              {isLoading ? 'Updating Security...' : 'Update Password'}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400 dark:text-gray-500">
            Need Help?{' '}
            <button
              className="font-medium text-[#3a1c8a] dark:text-purple-400 hover:underline cursor-pointer"
              onClick={() => {
                const email = "admin.luminalearn@gmail.com";
                const subject = encodeURIComponent("Request to change password");
                const body = encodeURIComponent("Hi LuminaLearn \n\nI would like to change my password.");
                window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
              }}
            >
              Contact Us.
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChangePassword;