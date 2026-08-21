import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowRight, FaArrowLeft, FaKey, FaShieldAlt, FaSyncAlt, FaCheckCircle, FaSun, FaMoon, FaEye, FaEyeSlash } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Enter identifier, 2: Enter code & new password
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [maskedDestination, setMaskedDestination] = useState('');
  const [channel, setChannel] = useState('email');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const handleInitiateReset = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) {
      toast.error("Please enter your email, registration number, or phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password-initiate', { identifier: identifier.trim() });

      setMaskedDestination(res.data.maskedDestination);
      setChannel(res.data.channel);
      setTargetIdentifier(res.data.identifier);
      setStep(2);
      toast.success(res.data.message || 'Password reset code sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndReset = async (e) => {
    e.preventDefault();

    if (!code || code.trim().length !== 6) {
      toast.error('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password-verify-reset', {
        identifier: targetIdentifier,
        code: code.trim(),
        newPassword
      });

      toast.success(res.data.message || 'Password has been reset successfully!');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const res = await api.post('/auth/forgot-password-initiate', { identifier: identifier.trim() });
      toast.success('A new verification code has been dispatched!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend reset code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      className="flex min-h-screen font-sans text-slate-900 dark:text-white bg-cover bg-center overflow-hidden relative"
      style={{ backgroundImage: "url('/assets/Login_screen_BG.png')" }}
    >
      {/* Theme Switcher Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-30 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/90 text-slate-700 dark:text-amber-400 hover:bg-white dark:hover:bg-slate-700 shadow-lg backdrop-blur-md border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer hover:scale-105 active:scale-95"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <FaSun className="text-base text-amber-400" /> : <FaMoon className="text-base text-purple-700" />}
      </button>

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
            Don't worry, it happens. Enter your registered email, registration number, or mobile phone to reset your account password.
          </p>
        </div>
      </div>

      {/* Right Side - Form Panel */}
      <div className="flex w-full items-center justify-center bg-white dark:bg-slate-900/95 dark:backdrop-blur-xl px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20 overflow-y-auto border-l border-transparent dark:border-slate-800 transition-colors">
        <div className="w-full max-w-md py-4">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-black text-[#1e1e38] dark:text-white tracking-tight">Forgot Password</h2>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
              {step === 1
                ? "Enter your credentials to receive a verification passcode"
                : `Enter the 6-digit code sent to ${maskedDestination}`}
            </p>
          </div>

          {step === 1 ? (
            /* STEP 1: Enter Identifier */
            <form onSubmit={handleInitiateReset} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email, Registration No or Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaKey className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type="text"
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/40 p-3.5 rounded-2xl border border-purple-100 dark:border-purple-800/60 text-purple-900 dark:text-purple-200 text-xs leading-relaxed">
                💡 <strong>Auto-Routing:</strong> If your account has a registered email, the passcode is sent via email. If you only have a mobile number, an SMS OTP will be dispatched.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 dark:from-purple-600 dark:to-indigo-600 dark:hover:from-purple-500 dark:hover:to-indigo-500 px-6 py-4 text-xs font-extrabold text-white transition-all shadow-lg shadow-purple-900/20 dark:shadow-purple-950/60 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
              >
                {loading ? 'Sending Code...' : 'Send Reset Code'}
                {!loading && (
                  <span className="absolute right-5 transition-transform group-hover:translate-x-1">
                    <FaArrowRight />
                  </span>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Enter Code & New Password */
            <form onSubmit={handleVerifyAndReset} className="space-y-4">

              <div className="bg-purple-50/90 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 p-3.5 rounded-2xl text-xs text-purple-950 dark:text-purple-200">
                <p className="font-semibold">Code sent to: {maskedDestination}</p>
                {channel === 'phone' && (
                  <p className="text-[11px] text-purple-700 dark:text-purple-300 mt-0.5">
                    (Check your mobile for OTP)
                  </p>
                )}
              </div>

              {/* 6-Digit Passcode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  6-Digit Passcode / OTP <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaShieldAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type="text"
                    maxLength={6}
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm font-mono font-bold tracking-widest text-slate-900 dark:text-white outline-none rounded-2xl"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-transparent pl-11 pr-11 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 p-1.5 rounded-lg transition cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Confirm New Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full bg-transparent pl-11 pr-11 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 p-1.5 rounded-lg transition cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 dark:from-purple-600 dark:to-indigo-600 dark:hover:from-purple-500 dark:hover:to-indigo-500 px-6 py-4 text-xs font-extrabold text-white transition-all shadow-lg shadow-purple-900/20 dark:shadow-purple-950/60 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password & Log In'}
                  {!loading && (
                    <span className="absolute right-5 transition-transform group-hover:translate-x-1">
                      <FaCheckCircle />
                    </span>
                  )}
                </button>

                <div className="flex justify-between items-center text-xs mt-1">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-gray-500 hover:text-gray-800 transition cursor-pointer"
                  >
                    ← Change ID
                  </button>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="text-purple-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <FaSyncAlt className={`text-[10px] ${resending ? 'animate-spin' : ''}`} />
                    Resend Code
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Footer Text */}
          <div className="mt-8 text-center text-xs">
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
