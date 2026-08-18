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
  FaUserFriends
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

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

  const currentParentPhone = studentRegMethod === 'email' ? parentsPhoneNumber : phoneNumber;

  return (
    <div
      className="flex min-h-screen font-sans text-slate-900 bg-cover bg-center overflow-y-auto"
      style={{ backgroundImage: "url('/assets/Login_screen_BG.png')" }}
    >

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

      {/* Right Side - White Register Panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20 overflow-y-auto min-h-screen">
        <div className="w-full max-w-md py-4">

          {/* Header */}
          <div className="mb-5">
            <h2 className="text-4xl font-bold text-[#1e1e38]">Online Student Register</h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Create your online student account with instant verification
            </p>

            {/* Registration Method Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl gap-1.5 mt-4">
              <button
                type="button"
                onClick={() => setStudentRegMethod('email')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${studentRegMethod === 'email'
                    ? 'bg-purple-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FaEnvelope className="text-xs" /> Register with Email
              </button>
              <button
                type="button"
                onClick={() => setStudentRegMethod('phone')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 ${studentRegMethod === 'phone'
                    ? 'bg-purple-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FaPhone className="text-xs" /> Register with Phone No
              </button>
            </div>
          </div>

          {/* Verification Notice Banner */}
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 text-xs flex gap-2.5 items-start shadow-xs">
            <span className="text-base leading-none mt-0.5">⚠️</span>
            <div>
              <h4 className="font-semibold text-amber-900">Security Verification Required</h4>
              <p className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                {studentRegMethod === 'email'
                  ? "A 6-digit passcode will be emailed to you to verify your identity before registration is finalized."
                  : "A 6-digit OTP will be sent to your mobile phone (logged in dev console) for verification."}
              </p>
            </div>
          </div>

          <form onSubmit={handleInitiateRegister} className="space-y-3">

            {/* Full Name Input */}
            <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="text"
                placeholder="Enter student full name"
                className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none placeholder:text-slate-500 font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email Input (If Email Method) */}
            {studentRegMethod === 'email' && (
              <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaEnvelope className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="email"
                  placeholder="Enter student email address"
                  className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Phone Number Input (If Phone Method) */}
            {studentRegMethod === 'phone' && (
              <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaPhone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="tel"
                  placeholder="Mobile phone (e.g. 0771234567)"
                  className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none placeholder:text-slate-500 font-medium"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Parent's Phone Number (If Email Method) */}
            {studentRegMethod === 'email' && (
              <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaPhone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="tel"
                  placeholder="Parent's mobile phone (e.g. 0771234567)"
                  className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                  value={parentsPhoneNumber}
                  onChange={(e) => setParentsPhoneNumber(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Password Input */}
            <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
              <input
                type="password"
                placeholder="Set password (min 6 chars)"
                className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Date of Birth Input */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-950 mb-1">
                Student Date of Birth (Birthday) <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaCalendarAlt className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <input
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none cursor-pointer"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Grade Selection */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-950 mb-1">
                Select Current Grade <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-xl bg-slate-100 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaGraduationCap className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                <select
                  className="w-full bg-transparent pl-8 text-xs text-slate-900 outline-none cursor-pointer"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  required
                >
                  <option value="">-- Choose Grade --</option>
                  {gradeOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center rounded-xl bg-lumina-purple px-6 py-4 text-xs font-bold text-white transition-all hover:bg-purple-800 shadow-lg shadow-purple-900/20 cursor-pointer disabled:opacity-50 mt-2"
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
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                <div className="relative mx-auto w-max bg-white px-3 text-xs text-slate-400">
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
          <div className="mt-6 text-center text-xs text-slate-500">
            <p>
              Already have an account?{' '}
              <button
                className="font-semibold text-[#3a1c8a] hover:underline cursor-pointer"
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
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-purple-100">

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
                  <label className="block text-center text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                    Enter 6-Digit Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[12px] text-2xl font-mono font-black py-3.5 bg-purple-50/60 border-2 border-purple-200 focus:border-purple-600 rounded-2xl outline-none text-purple-950 transition-all shadow-inner"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-gray-400 text-center mt-2">
                    Valid for 10 minutes.
                    {verifyChannel === 'phone' && (
                      <span className="block text-amber-700 font-semibold mt-0.5">
                        (Development Mode: OTP logged in backend server terminal)
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
                    className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FaSyncAlt className={`text-xs text-purple-700 ${resending ? 'animate-spin' : ''}`} />
                    {resending ? 'Resending Code...' : 'Resend Code'}
                  </button>
                </div>
              </form>
            )}

            {/* Modal Body: STEP 2 - Ask to Create Parent Account */}
            {modalStep === 'parentPrompt' && (
              <div className="p-6 md:p-8 space-y-5 animate-fadeIn">
                <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 text-purple-950 text-xs leading-relaxed">
                  <p className="font-bold text-sm text-purple-900 mb-1">
                    Would you like to create a Parent Account?
                  </p>
                  <p className="text-purple-800">
                    A parent account associated with phone number <strong>{currentParentPhone}</strong> allows parents to monitor attendance, fee payments, and exam reports online.
                  </p>
                  <div className="mt-2.5 pt-2 border-t border-purple-200/80 text-[11px] text-purple-700">
                    🔑 Default password on 1st login: <strong className="font-mono text-purple-900">Parent@123</strong> (Mandatory password change enforced on first login).
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
                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
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
