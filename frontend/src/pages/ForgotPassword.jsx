import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaArrowRight, FaArrowLeft } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      toast.success(res.data.message || 'Password reset link sent successfully!');
      setEmail('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send password reset email.');
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
            Reset Password
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-200">
            Don't worry, it happens. Enter your registered email address and we'll send you a link to reset your password.
          </p>
        </div>
      </div>

      {/* Right Side - Form Panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-[#1e1e38]">Forgot Password</h2>
            <p className="mt-3 text-sm text-slate-500">
              Receive a password reset link in your inbox
            </p>
          </div>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            {/* Email Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Enter your registered email"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
              {loading ? 'Sending link...' : 'Send Reset Link'}
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

export default ForgotPassword;
