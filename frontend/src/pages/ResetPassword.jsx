import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FaLock, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { token } = useParams();
  const navigate = useNavigate();

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return toast.error('Passwords do not match!');
    }

    if (password.length < 6) {
      return toast.error('Password must be at least 6 characters long.');
    }

    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await axios.post(`${apiUrl}/auth/reset-password/${token}`, {
        newPassword: password,
      });
      toast.success(res.data.message || 'Password reset successful!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen font-sans text-slate-900 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: "url('/assets/Login_screen_BG.png')" }}
    >
      {/* Left Side - Info Text */}
      <div className="relative hidden w-full flex-col justify-start pt-5 px-12 lg:flex lg:w-[55%] xl:px-24">
        <div className="relative z-10 max-w-lg">
          <img
            src="/assets/LuminaLearn_Logo_banner.png"
            alt="LuminaLearn logo"
            className="mb-2 h-30 w-auto object-contain"
          />
          <h1 className="text-5xl font-bold tracking-tight text-white xl:text-6xl">
            Choose Password
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-200">
            Set your new strong password below to regain access to your LuminaLearn account. Make sure it contains at least 6 characters.
          </p>
        </div>
      </div>

      {/* Right Side - Form Panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-[#1e1e38]">Reset Password</h2>
            <p className="mt-3 text-sm text-slate-500">
              Enter your new password below
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-5">
            {/* New Password Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="New Password"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Confirm Password Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Confirm New Password"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center rounded-xl bg-lumina-purple px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-purple-800 shadow-lg shadow-purple-900/20 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
              {!loading && (
                <span className="absolute right-5 transition-transform group-hover:translate-x-1">
                  <FaArrowRight />
                </span>
              )}
            </button>
          </form>

          {/* Footer Text */}
          <div className="mt-10 text-center text-sm">
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 font-semibold text-[#3a1c8a] hover:underline cursor-pointer transition-colors"
            >
              <FaArrowLeft className="text-xs" />
              Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
