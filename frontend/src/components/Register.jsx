/**
 * @file Register.jsx
 * @description User Registration Component. Supports student self-registration and counter registration with phone number verification and grade selection.
 */

import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import {
  FaEnvelope,
  FaLock,
  FaArrowRight,
  FaPhone,
  FaGraduationCap,
  FaUser,
  FaCalendarAlt,
  FaTimes,
  FaShieldAlt,
  FaSyncAlt,
  FaCheckCircle,
  FaUserFriends,
  FaSun,
  FaMoon,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../context/ThemeContext';

const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

const Register = () => {
  const [studentRegMethod, setStudentRegMethod] = useState('email'); // 'email' | 'phone'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [grade, setGrade] = useState('');
  const [parentsPhoneNumber, setParentsPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');

  // Verification & Parent Prompt Modal States
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [modalStep, setModalStep] = useState('verify'); // 'verify' | 'parentPrompt'
  const [verifyIdentifier, setVerifyIdentifier] = useState('');
  const [verifyChannel, setVerifyChannel] = useState('email');
  const [verifyCode, setVerifyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleInitiateRegister = async (e) => {
    e.preventDefault();

    if (!dateOfBirth) {
      toast.error('Please select your Date of Birth (Birthday).');
      return;
    }

    if (!grade) {
      toast.error('Please select a grade.');
      return;
    }

    if (studentRegMethod === 'email') {
      if (!email) {
        toast.error('Please enter your email address.');
        return;
      }
      if (!parentsPhoneNumber) {
        toast.error("Please enter parent's mobile phone number.");
        return;
      }
    } else {
      if (!phoneNumber) {
        toast.error('Please enter your mobile phone number.');
        return;
      }
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        registrationType: studentRegMethod,
        name,
        password,
        grade,
        dateOfBirth,
        email: studentRegMethod === 'email' ? email : undefined,
        parentsPhoneNumber: studentRegMethod === 'email' ? parentsPhoneNumber : phoneNumber,
        phoneNumber: studentRegMethod === 'phone' ? phoneNumber : undefined
      };

      const res = await api.post('/auth/register-initiate', payload);

      setVerifyIdentifier(res.data.identifier);
      setVerifyChannel(res.data.channel);
      setVerifyCode('');
      setModalStep('verify');
      setShowVerifyModal(true);

      toast.success(res.data.message || 'Verification code sent!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate registration.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 in modal: Check code format and open parent creation prompt
  const handleProceedToParentPrompt = (e) => {
    e.preventDefault();
    if (!verifyCode || verifyCode.trim().length !== 6) {
      toast.error('Please enter the full 6-digit verification code.');
      return;
    }
    setModalStep('parentPrompt');
  };

  // Step 2 in modal: Submit registration with parent creation decision
  const executeCompleteRegistration = async (createParentAccount) => {
    setVerifying(true);
    try {
      const res = await api.post('/auth/register-verify', {
        identifier: verifyIdentifier,
        code: verifyCode.trim(),
        createParentAccount
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      setShowVerifyModal(false);
      toast.success(res.data.message || `Registration complete! Your ID is ${res.data.user.registrationNumber}`);
      window.dispatchEvent(new Event('userUpdated'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed. Please check the code.');
      setModalStep('verify');
    } finally {
      setVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setResending(true);
    try {
      const payload = {
        registrationType: studentRegMethod,
        name,
        password,
        grade,
        dateOfBirth,
        email: studentRegMethod === 'email' ? email : undefined,
        parentsPhoneNumber: studentRegMethod === 'email' ? parentsPhoneNumber : phoneNumber,
        phoneNumber: studentRegMethod === 'phone' ? phoneNumber : undefined
      };

      const res = await api.post('/auth/register-initiate', payload);
      toast.success('A new verification code has been dispatched!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    if (!dateOfBirth) {
      toast.error("Please select your Date of Birth first before registering with Google.");
      return;
    }

    if (!grade) {
      toast.error("Please select your Grade first before registering with Google.");
      return;
    }

    if (!parentsPhoneNumber) {
      toast.error("Please enter your Parent's Phone Number first before registering with Google.");
      return;
    }

    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        throw new Error('Google credential is missing from the response.');
      }

      const res = await api.post('/auth/google-register', {
        credential,
        grade,
        parentsPhoneNumber,
        dateOfBirth
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success(`Successfully registered with Google! Your Registration ID is ${res.data.user.registrationNumber}`);
      window.dispatchEvent(new Event('userUpdated'));
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google registration failed.');
    }
  };

  const handleGoogleError = () => {
    toast.error('Google registration was cancelled or failed.');
  };

  const { isDark, toggleTheme } = useTheme();
  const currentParentPhone = studentRegMethod === 'email' ? parentsPhoneNumber : phoneNumber;

  return (
    <div
      className="flex min-h-screen font-sans text-slate-900 dark:text-white bg-cover bg-center overflow-y-auto relative"
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

      {/* Left Side - Welcome Text */}
      <div className="relative hidden w-full flex-col justify-start pt-5 px-12 lg:flex lg:w-[55%] xl:px-24">
        <div className="relative z-10 max-w-lg">
          <img
            src="/assets/LuminaLearn_Logo_banner.png"
            alt="LuminaLearn logo"
            className="mb-2 h-30 w-auto object-contain"
          />
          <h1 className="text-5xl font-bold tracking-tight text-white xl:text-6xl">
            Join LuminaLearn!
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-200">
            Begin your online learning journey with <br />
            <span className="font-medium text-[#00e5ff]">LuminaLearn</span> Smart Learning Platform.
          </p>
        </div>
      </div>

      {/* Right Side - Register Panel */}
      <div className="flex w-full items-center justify-center bg-white dark:bg-slate-900/95 dark:backdrop-blur-xl px-4 sm:px-6 py-6 sm:py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20 overflow-y-auto min-h-screen border-l border-transparent dark:border-slate-800 transition-colors">
        <div className="w-full max-w-md py-2 sm:py-4">

          {/* Mobile Branding Logo */}
          <div className="lg:hidden flex flex-col items-center mb-5 text-center">
            <img
              src="/assets/LuminaLearn_Logo_banner.png"
              alt="LuminaLearn Logo"
              className="h-14 sm:h-16 w-auto object-contain mb-1 drop-shadow-sm cursor-pointer"
              onClick={() => navigate('/')}
            />
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Smart Learning Platform
            </span>
          </div>

          {/* Header */}
          <div className="mb-5">
            <h2 className="text-2xl sm:text-4xl font-black text-[#1e1e38] dark:text-white tracking-tight">Student Registration</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 font-medium">
              Create your online student account with instant verification
            </p>

            {/* Registration Method Switcher */}
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-2xl gap-1.5 mt-4 border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setStudentRegMethod('email')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${studentRegMethod === 'email'
                  ? 'bg-purple-900 dark:bg-purple-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <FaEnvelope className="text-xs" /> Register with Email
              </button>
              <button
                type="button"
                onClick={() => setStudentRegMethod('phone')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${studentRegMethod === 'phone'
                  ? 'bg-purple-900 dark:bg-purple-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
              >
                <FaPhone className="text-xs" /> Register with Phone No
              </button>
            </div>
          </div>

          {/* Verification Notice Banner */}
          <div className="mb-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 p-3 text-amber-800 dark:text-amber-200 text-xs flex gap-2.5 items-start shadow-xs">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <div>
              <h4 className="font-extrabold text-amber-900 dark:text-amber-300">Security Verification Required</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400 font-medium">
                {studentRegMethod === 'email'
                  ? "A 6-digit passcode will be emailed to you to verify your identity before registration is finalized."
                  : "A 6-digit OTP will be sent to your mobile phone (logged in dev console) for verification."}
              </p>
            </div>
          </div>

          <form onSubmit={handleInitiateRegister} className="space-y-4 mt-4">

            {/* Full Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Student Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                <input
                  type="text"
                  placeholder="e.g. Kasun Jayawardena"
                  className="w-full bg-transparent pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email Input (If Email Method) */}
            {studentRegMethod === 'email' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Student Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type="email"
                    placeholder="e.g. student@example.com"
                    className="w-full bg-transparent pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Phone Number Input (If Phone Method) */}
            {studentRegMethod === 'phone' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Student Mobile Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type="tel"
                    placeholder="e.g. 0712345678"
                    className="w-full bg-transparent pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Parent's Phone Number (If Email Method) */}
            {studentRegMethod === 'email' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Parent's Mobile Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type="tel"
                    placeholder="e.g. 0771234567"
                    className="w-full bg-transparent pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={parentsPhoneNumber}
                    onChange={(e) => setParentsPhoneNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Set Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Minimum 6 characters"
                  className="w-full bg-transparent pl-11 pr-11 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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

            {/* Date of Birth Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Student Date of Birth (Birthday) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                <FaCalendarAlt className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-transparent pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl cursor-pointer"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Grade Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Select Current Grade <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                <FaGraduationCap className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                <select
                  className="w-full bg-transparent pl-11 pr-4 py-3 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl cursor-pointer"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                >
                  <option value="" className="dark:bg-slate-900">-- Choose Grade --</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g} className="dark:bg-slate-900">{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 dark:from-purple-600 dark:to-indigo-600 dark:hover:from-purple-500 dark:hover:to-indigo-500 px-6 py-4 text-xs font-extrabold text-white transition-all shadow-lg shadow-purple-900/20 dark:shadow-purple-950/60 cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading ? (
                <span>Sending Verification Code...</span>
              ) : (
                <>
                  Continue to Verification
                  <span className="absolute right-5 transition-transform group-hover:translate-x-1">
                    <FaArrowRight />
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Google Sign In Divider (Students with email method only) */}
          {studentRegMethod === 'email' && googleClientId && (
            <div className="mt-5">
              <div className="relative mb-3">
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-slate-800" />
                <div className="relative mx-auto w-max bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Or register with
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  shape="pill"
                  text="signup_with"
                />
              </div>
            </div>
          )}

          {/* Footer Text */}
          <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
            <p>
              Already have an account?{' '}
              <button
                className="font-bold text-purple-800 hover:text-purple-950 dark:text-purple-400 dark:hover:text-purple-300 hover:underline cursor-pointer"
                onClick={() => navigate('/login')}
              >
                Sign in here.
              </button>
            </p>
          </div>

        </div>
      </div>

      {/* ========================================================================= */}
      {/* VERIFICATION & PARENT PROMPT POPUP MODAL */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* VERIFICATION & PARENT PROMPT POPUP MODAL */}
      {/* ========================================================================= */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 text-gray-800 dark:text-gray-100">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white text-center relative">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center mb-3 border border-white/20 shadow-inner">
                {modalStep === 'verify' ? (
                  <FaShieldAlt className="text-2xl text-amber-400" />
                ) : (
                  <FaUserFriends className="text-2xl text-emerald-400" />
                )}
              </div>

              <h3 className="text-xl font-extrabold tracking-tight">
                {modalStep === 'verify' ? 'Security Verification' : 'Parent Account Setup'}
              </h3>
              <p className="text-indigo-200 text-xs mt-1">
                {modalStep === 'verify'
                  ? (verifyChannel === 'email'
                    ? `Enter the 6-digit passcode sent to ${verifyIdentifier}`
                    : `Enter the 6-digit OTP sent to ${verifyIdentifier}`)
                  : 'Configure parental monitoring access for this student'
                }
              </p>
            </div>

            {/* Modal Body: STEP 1 - Enter 6-digit Code */}
            {modalStep === 'verify' && (
              <form onSubmit={handleProceedToParentPrompt} className="p-6 md:p-8 space-y-6">
                <div>
                  <label className="block text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Enter 6-Digit Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[12px] text-2xl font-mono font-black py-3.5 bg-purple-50/60 dark:bg-slate-800 border-2 border-purple-200 dark:border-slate-700 focus:border-purple-600 dark:focus:border-purple-400 rounded-2xl outline-none text-purple-950 dark:text-white transition-all shadow-inner"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-400 text-center mt-2">
                    Valid for 10 minutes.
                    {verifyChannel === 'phone' && (
                      <span className="block text-amber-700 dark:text-amber-400 font-semibold mt-0.5">
                        (Check your mobile for OTP)
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    type="submit"
                    disabled={verifyCode.length !== 6}
                    className="w-full py-3.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <FaCheckCircle className="text-amber-400 text-sm" /> Verify & Continue
                  </button>

                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resending}
                    className="w-full py-2.5 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FaSyncAlt className={`text-xs text-purple-700 dark:text-purple-400 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Resending Code...' : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            {/* Modal Body: STEP 2 - Ask to Create Parent Account */}
            {modalStep === 'parentPrompt' && (
              <div className="p-6 md:p-8 space-y-5 animate-fadeIn">
                <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-2xl p-4 text-purple-950 dark:text-purple-200 text-xs leading-relaxed">
                  <p className="font-bold text-sm text-purple-900 dark:text-purple-300 mb-1">
                    Would you like to create a Parent Account?
                  </p>
                  <p className="text-purple-800 dark:text-purple-300">
                    A parent account associated with phone number <strong>{currentParentPhone}</strong> allows parents to monitor attendance, fee payments, and exam reports online.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-purple-200/80 dark:border-purple-800/60 text-[11px] text-purple-700 dark:text-purple-400">
                    📲 A unique temporary password will be sent via SMS to the parent's phone number upon creation.
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    disabled={verifying}
                    onClick={() => executeCompleteRegistration(true)}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {verifying ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                    ) : (
                      <>
                        <FaCheckCircle className="text-white text-sm" /> Yes, Create Parent Account
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={verifying}
                    onClick={() => executeCompleteRegistration(false)}
                    className="w-full py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    No, Skip & Create Student Only
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Register;
