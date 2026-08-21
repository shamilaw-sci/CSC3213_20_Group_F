import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowRight, FaArrowLeft, FaKey, FaShieldAlt, FaSyncAlt, FaCheckCircle } from 'react-icons/fa';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Enter identifier, 2: Enter code & new password
  const [identifier, setIdentifier] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [maskedDestination, setMaskedDestination] = useState('');
  const [channel, setChannel] = useState('email');
  const [targetIdentifier, setTargetIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();

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
            Don't worry, it happens. Enter your registered email, registration number, or mobile phone to reset your account password.
          </p>
        </div>
      </div>

      {/* Right Side - Form Panel */}
      <div className="auth-light-panel flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20 overflow-y-auto">
        <div className="w-full max-w-md py-4">

          {/* Header */}
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-[#1e1e38]">Forgot Password</h2>
            <p className="mt-2 text-xs text-slate-500">
              {step === 1
                ? "Enter your credentials to receive a verification passcode"
                : `Enter the 6-digit code sent to ${maskedDestination}`}
            </p>
          </div>

          {step === 1 ? (
            /* STEP 1: Enter Identifier */
            <form onSubmit={handleInitiateReset} className="space-y-5">
              <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaKey className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="text"
                  placeholder="Enter email, reg number, or phone number"
                  className="w-full bg-transparent pl-10 text-xs text-slate-900 outline-none placeholder:text-slate-500 font-medium"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={loading}
                  autoFocus
                />
              </div>

              <div className="bg-purple-50 p-3 rounded-xl border border-purple-100 text-purple-900 text-xs leading-relaxed">
                💡 <strong>Auto-Routing:</strong> If your account has a registered email, the passcode is sent via email. If you only have a mobile number, an SMS OTP will be dispatched.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full items-center justify-center rounded-xl bg-lumina-purple px-6 py-4 text-xs font-bold text-white transition-all hover:bg-purple-800 shadow-lg shadow-purple-900/20 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
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

              <div className="bg-purple-50/90 border border-purple-200 p-3.5 rounded-2xl text-xs text-purple-950">
                <p className="font-semibold">Code sent to: {maskedDestination}</p>
                {channel === 'phone' && (
                  <p className="text-[11px] text-purple-700 mt-0.5">
                    (Check your mobile for OTP)
                  </p>
                )}
              </div>

              {/* 6-Digit Passcode */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-950 mb-1">
                  6-Digit Passcode / OTP
                </label>
                <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                  <FaShieldAlt className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-600 text-sm" />
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    className="w-full bg-transparent pl-8 text-sm font-mono tracking-widest text-slate-900 outline-none font-bold placeholder:text-slate-400"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-950 mb-1">
                  New Password
                </label>
                <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                  <FaLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="password"
                    placeholder="Enter new password (min 6 chars)"
                    className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-purple-950 mb-1">
                  Confirm Password
                </label>
                <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                  <FaLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                  <input
                    type="password"
                    placeholder="Confirm new password"
                    className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="group relative flex w-full items-center justify-center rounded-xl bg-lumina-purple px-6 py-3.5 text-xs font-bold text-white transition-all hover:bg-purple-800 shadow-lg shadow-purple-900/20 cursor-pointer disabled:opacity-50"
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
