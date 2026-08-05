import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowRight, FaPhone, FaGraduationCap, FaUser, FaCalendarAlt, FaIdCard } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [grade, setGrade] = useState('');
  const [parentsPhoneNumber, setParentsPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const isGrade10OrAbove = (selectedGrade) => {
    if (!selectedGrade) return false;
    const digitsMatch = String(selectedGrade).match(/\d+/);
    const val = digitsMatch ? parseInt(digitsMatch[0], 10) : 0;
    return val >= 10;
  };

  const requiresNic = isGrade10OrAbove(grade);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!dateOfBirth) {
      toast.error('Please select your Date of Birth (Birthday).');
      return;
    }

    if (!grade) {
      toast.error('Please select a grade.');
      return;
    }

    if (!parentsPhoneNumber) {
      toast.error("Please enter parent's phone number.");
      return;
    }

    if (requiresNic && (!nicNumber || !nicNumber.trim())) {
      toast.error("National ID / NIC Number is required for Grade 10 or above students.");
      return;
    }

    try {
      const res = await api.post('/auth/register', { 
        name,
        email, 
        password,
        grade,
        parentsPhoneNumber,
        dateOfBirth,
        nicNumber
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success(`Registration successful! Your Online Registration ID is ${res.data.user.registrationNumber}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed!');
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

    if (requiresNic && (!nicNumber || !nicNumber.trim())) {
      toast.error("Please enter your National ID / NIC Number first before registering with Google.");
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
        dateOfBirth,
        nicNumber
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success(`Successfully registered with Google! Your Registration ID is ${res.data.user.registrationNumber}`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google registration failed.');
    }
  };

  const handleGoogleError = () => {
    toast.error('Google registration was cancelled or failed.');
  };

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
            Begin your learning journey with <br />
            <span className="font-medium text-[#00e5ff]">LuminaLearn</span> Smart Learning Platform.
          </p>
        </div>
      </div>

      {/* Right Side - White Register Panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20 overflow-y-auto min-h-screen">
        <div className="w-full max-w-md py-4">
          
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-[#1e1e38]">Register</h2>
            <p className="mt-3 text-sm text-slate-500">
              Create an online student account
            </p>
          </div>

          {/* Warning/Reminder Alert Banner */}
          <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 p-4 text-amber-800 text-sm flex gap-3 items-start shadow-sm">
            <span className="text-lg leading-none mt-0.5">⚠️</span>
            <div>
              <h4 className="font-semibold text-amber-900">Online Student Account Self-Registration</h4>
              <p className="mt-1 text-xs leading-relaxed text-amber-700">
                Registering will automatically assign your unique Online Student Registration ID (e.g. <strong>OL-G06-2012-XXXX</strong>) based on your grade and birth year.
              </p>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            {/* Full Name Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaUser className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500 font-medium"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            {/* Email Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Set password"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Parent's Phone Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="Parent's phone number (e.g. 077XXXXXXX)"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={parentsPhoneNumber}
                onChange={(e) => setParentsPhoneNumber(e.target.value)}
                required
              />
            </div>

            {/* Date of Birth (Birthday) */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 mb-1">
                Student Date of Birth (Birthday) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center">
                <FaCalendarAlt className="pointer-events-none text-slate-400 mr-3" />
                <input
                  type="date"
                  className="w-full bg-transparent text-sm text-slate-900 outline-none font-medium"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Grade Selector */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaGraduationCap className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500 cursor-pointer font-medium"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                required
              >
                <option value="" disabled>Select your Grade</option>
                {gradeOptions.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Conditional NIC Input Field — ONLY rendered when Grade 10 or above is selected */}
            {requiresNic && (
              <div className="relative rounded-xl p-3.5 border transition-all bg-purple-50/90 border-purple-300 ring-2 ring-purple-100 shadow-xs animate-fadeIn">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-950">
                    National ID / NIC Number <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-purple-200 text-purple-950">
                    Required for {grade}
                  </span>
                </div>
                <div className="flex items-center">
                  <FaIdCard className="pointer-events-none text-purple-600 mr-3" />
                  <input
                    type="text"
                    placeholder="Enter NIC Number (e.g. 200412304928 / 987654321V)"
                    className="w-full bg-transparent text-sm text-slate-900 outline-none font-mono uppercase font-semibold"
                    value={nicNumber}
                    onChange={(e) => setNicNumber(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Register Button */}
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center rounded-xl bg-lumina-purple px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-purple-800 shadow-lg shadow-purple-900/20 cursor-pointer mt-6"
            >
              Register
              <span className="absolute right-5 transition-transform group-hover:translate-x-1">
                <FaArrowRight />
              </span>
            </button> 
          </form>

          {/* Google Sign In Divider */}
          {googleClientId && (
            <div className="mt-6">
              <div className="relative mb-4">
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                <div className="relative mx-auto w-max bg-white px-4 text-sm text-slate-400">
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
          <div className="mt-8 text-center text-sm text-slate-500">
            <p>
              Already have an account?{' '}
              <button
                className="font-medium text-[#3a1c8a] hover:underline cursor-pointer"
                onClick={() => navigate('/login')}
              >
                Sign in here.
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;
