import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSignInAlt,
  FaGraduationCap,
  FaBookOpen,
  FaUserCheck,
  FaCreditCard,
  FaChartLine,
  FaPhoneAlt,
  FaMapMarkerAlt,
  FaEnvelope,
  FaAward,
  FaShieldAlt,
  FaUsers,
  FaSun,
  FaMoon,
  FaClock,
  FaChalkboardTeacher,
  FaRandom,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaArrowRight,
  FaCheckCircle,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import { INSTRUCTORS, GET_DIVERSE_TIMETABLE_PREVIEW, INSTITUTE_INFO } from '../utils/instituteData';
import { useTheme } from '../context/ThemeContext';

const Home = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme: contextToggleTheme, setDarkMode } = useTheme();

  // Mobile menu open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Automatic time-based theme state
  const [isDarkMode, setIsDarkMode] = useState(isDark);
  const [systemTimeStr, setSystemTimeStr] = useState('');
  const [isAutoDetected, setIsAutoDetected] = useState(() => !localStorage.getItem('lumina_theme'));

  // --- SHUFFLE & ANIMATION STATES ---
  const [currentInstructorIdx, setCurrentInstructorIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Synchronize with context isDark
  useEffect(() => {
    setIsDarkMode(isDark);
  }, [isDark]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const formattedHours = hours % 12 || 12;
      setSystemTimeStr(`${formattedHours}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Helper function for smooth transition during index change
  const transitionToInstructor = (nextIndex) => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentInstructorIdx(nextIndex);
      setIsFading(false);
    }, 180);
  };

  // Timer for random instructor shuffling (continuous 6s interval)
  useEffect(() => {
    const shuffleTimer = setInterval(() => {
      transitionToInstructor((currentInstructorIdx + 1) % INSTRUCTORS.length);
    }, 6000);
    return () => clearInterval(shuffleTimer);
  }, [currentInstructorIdx]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    setIsAutoDetected(false);
    setDarkMode(nextMode);
    localStorage.setItem('lumina_theme', nextMode ? 'dark' : 'light');
  };

  const resetToAuto = () => {
    localStorage.removeItem('lumina_theme');
    const hour = new Date().getHours();
    const autoDark = !(hour >= 6 && hour < 18);
    setIsDarkMode(autoDark);
    setDarkMode(autoDark);
    setIsAutoDetected(true);
  };

  // Shuffle instructor handlers
  const handleRandomShuffle = () => {
    let nextIdx;
    do {
      nextIdx = Math.floor(Math.random() * INSTRUCTORS.length);
    } while (nextIdx === currentInstructorIdx && INSTRUCTORS.length > 1);
    transitionToInstructor(nextIdx);
  };

  const handlePrevInstructor = () => {
    const prevIdx = (currentInstructorIdx - 1 + INSTRUCTORS.length) % INSTRUCTORS.length;
    transitionToInstructor(prevIdx);
  };

  const handleNextInstructor = () => {
    const nextIdx = (currentInstructorIdx + 1) % INSTRUCTORS.length;
    transitionToInstructor(nextIdx);
  };

  const currentInstructor = INSTRUCTORS[currentInstructorIdx];
  const masterTimetablePreview = GET_DIVERSE_TIMETABLE_PREVIEW();

  const getSubjectBadgeStyle = (subject) => {
    if (subject.includes('Science')) {
      return isDarkMode
        ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
        : 'bg-cyan-50 text-cyan-700 border-cyan-200';
    }
    if (subject.includes('Math')) {
      return isDarkMode
        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
        : 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (subject.includes('English')) {
      return isDarkMode
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (subject.includes('Sinhala')) {
      return isDarkMode
        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
        : 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return isDarkMode
      ? 'bg-pink-500/10 text-pink-400 border-pink-500/30'
      : 'bg-pink-50 text-pink-700 border-pink-200';
  };

  return (
    <div
      className={`min-h-screen font-sans transition-colors duration-500 flex flex-col selection:bg-purple-600 selection:text-white relative overflow-x-hidden ${
        isDarkMode ? 'bg-[#0b0f19] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Background Micro Dot Texture */}
      <div
        className={`absolute inset-0 pointer-events-none -z-10 transition-opacity duration-500 ${
          isDarkMode
            ? 'bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07]'
            : 'bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.25]'
        }`}
      />

      {/* Modern Ambient Mesh Glow Orbs */}
      <div
        className={`absolute top-[-10%] left-1/4 w-[650px] h-[650px] blur-[140px] rounded-full pointer-events-none -z-10 ${
          isDarkMode
            ? 'bg-purple-900/20'
            : 'bg-gradient-to-tr from-purple-200/50 via-indigo-100/40 to-sky-100/30'
        }`}
      />
      <div
        className={`absolute top-[30%] right-[-5%] w-[550px] h-[550px] blur-[150px] rounded-full pointer-events-none -z-10 ${
          isDarkMode
            ? 'bg-cyan-900/20'
            : 'bg-gradient-to-br from-indigo-200/40 via-purple-100/30 to-pink-100/20'
        }`}
      />

      {/* --- NAVBAR --- */}
      <header
        className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-950/80 border-slate-800/80 shadow-lg shadow-black/20'
            : 'bg-white/80 border-slate-200/80 shadow-xs'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo & Branding */}
          <div
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group shrink-0"
            onClick={() => navigate('/')}
          >
            <img
              src="/assets/kirula_logo.png"
              alt="Kirula Education Center"
              className="h-9 sm:h-12 w-auto object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
            />
            <div
              className={`h-8 w-px hidden sm:block ${
                isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={`text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r ${
                    isDarkMode
                      ? 'from-purple-400 via-indigo-300 to-cyan-400'
                      : 'from-purple-700 via-indigo-600 to-purple-900'
                  } bg-clip-text text-transparent`}
                >
                  LuminaLearn
                </span>
                <span
                  className={`hidden sm:inline-flex text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                    isDarkMode
                      ? 'bg-purple-950/80 border border-purple-500/30 text-purple-300'
                      : 'bg-purple-50 border border-purple-200 text-purple-700'
                  }`}
                >
                  Portal
                </span>
              </div>
              <span
                className={`hidden sm:block text-xs font-medium ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                by Kirula Education Center
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav
            className={`hidden md:flex items-center gap-8 text-sm font-medium ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <button
              onClick={() => navigate('/instructors')}
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors font-semibold cursor-pointer"
            >
              Instructors
            </button>
            <button
              onClick={() => navigate('/instructors#timetable')}
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors font-semibold cursor-pointer"
            >
              Timetable
            </button>
            <button
              onClick={() => navigate('/about')}
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors font-semibold cursor-pointer"
            >
              About Us
            </button>
            <a
              href="#features"
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors"
            >
              Features
            </a>
            <a
              href="#contact"
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors"
            >
              Contact
            </a>
          </nav>

          {/* Right Controls: Theme Toggle & Login Button */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle - Desktop & Tablet (Mobile accessed in drawer) */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={toggleTheme}
                title={
                  isAutoDetected
                    ? `Auto-theme active (${systemTimeStr}) - Click to toggle`
                    : 'Toggle Light/Dark Theme'
                }
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800 hover:border-slate-700'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-purple-300 shadow-2xs'
                }`}
              >
                {isDarkMode ? (
                  <FaSun className="text-yellow-400 text-sm" />
                ) : (
                  <FaMoon className="text-purple-600 text-sm" />
                )}
                <span className="hidden md:inline">
                  {isDarkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              <div
                onClick={resetToAuto}
                title="Reset to automated sunrise/sunset schedule"
                className={`hidden lg:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                  isAutoDetected
                    ? isDarkMode
                      ? 'bg-purple-950/60 border-purple-800/60 text-purple-300'
                      : 'bg-purple-50 border-purple-200 text-purple-700 font-semibold'
                    : isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-purple-300'
                    : 'bg-white border-slate-200 text-slate-600 hover:text-purple-700'
                }`}
              >
                <FaClock className="text-[10px]" />
                <span>{systemTimeStr}</span>
                {isAutoDetected && (
                  <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-600/15 px-1 py-0.2 rounded">
                    Auto
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="group relative flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl shadow-md shadow-purple-900/20 hover:shadow-purple-700/30 transition-all duration-300 transform active:scale-95 cursor-pointer"
            >
              <span>Portal Login</span>
              <FaSignInAlt className="text-xs transition-transform group-hover:translate-x-1" />
            </button>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`md:hidden p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
              title={isMobileMenuOpen ? "Close navigation" : "Open navigation"}
              aria-label="Toggle navigation"
            >
              {isMobileMenuOpen ? <FaTimes className="text-base" /> : <FaBars className="text-base" />}
            </button>
          </div>
        </div>

        {/* --- MOBILE NAVIGATION SHEET --- */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-4 py-4 space-y-2 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-1 text-sm font-semibold">
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/instructors'); }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>👨‍🏫 Instructors</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/instructors#timetable'); }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>📅 Class Timetable</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/about'); }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>🏛️ About Us</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </button>
              <a
                href="#features"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>✨ Features</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </a>
              <a
                href="#contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>📞 Contact</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </a>
            </div>

            {/* Mobile theme toggle row */}
            <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 flex items-center justify-between px-2">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">Theme</span>
              <button
                onClick={toggleTheme}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-yellow-400'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                {isDarkMode ? <FaSun className="text-sm text-yellow-400" /> : <FaMoon className="text-sm text-purple-600" />}
                <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 pb-16 md:pt-20 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-semibold border backdrop-blur-md transition-all ${
                  isDarkMode
                    ? 'bg-purple-900/40 border-purple-500/30 text-purple-300'
                    : 'bg-purple-50 border-purple-200/90 text-purple-700 shadow-2xs'
                }`}
              >
                <FaGraduationCap
                  className={isDarkMode ? 'text-cyan-400' : 'text-purple-600'}
                />
                <span>Next-Gen Institute Management System</span>
              </div>

              <h1
                className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15] ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Empowering Education with <br className="hidden sm:inline" />
                <span
                  className={`bg-gradient-to-r ${
                    isDarkMode
                      ? 'from-cyan-400 via-indigo-300 to-purple-400'
                      : 'from-purple-700 via-indigo-600 to-purple-900'
                  } bg-clip-text text-transparent`}
                >
                  LuminaLearn
                </span>
              </h1>

              <h2
                className={`text-xl sm:text-2xl font-semibold ${
                  isDarkMode ? 'text-purple-200/90' : 'text-slate-700'
                }`}
              >
                Official Digital Platform of{' '}
                <span
                  className={
                    isDarkMode
                      ? 'text-cyan-300 font-bold'
                      : 'text-purple-700 font-bold'
                  }
                >
                  Kirula Education Center
                </span>
              </h2>

              <p
                className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                A modern, comprehensive institute management portal engineered
                to streamline class management, student enrollments, fee
                payments, attendance tracking, and real-time performance
                analytics.
              </p>

              <div className="pt-3 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-lg shadow-purple-900/25 hover:shadow-purple-700/35 transition-all transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                >
                  <FaSignInAlt />
                  <span>Portal Login</span>
                </button>

                <button
                  onClick={() => navigate('/instructors')}
                  className={`flex items-center justify-center gap-2 font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl border transition-all cursor-pointer transform hover:-translate-y-0.5 ${
                    isDarkMode
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border-slate-700 shadow-md'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <FaChalkboardTeacher className="text-purple-600 dark:text-cyan-400" />
                  <span>Teachers & Timetable</span>
                </button>
              </div>

              {/* Stats Grid */}
              <div
                className={`pt-8 border-t grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left ${
                  isDarkMode ? 'border-slate-800/80' : 'border-slate-200/80'
                }`}
              >
                <div
                  className={`p-3 rounded-2xl border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-900/40 border-slate-800/60'
                      : 'bg-white/80 border-slate-200/70 shadow-2xs'
                  }`}
                >
                  <p
                    className={`text-2xl sm:text-3xl font-extrabold ${
                      isDarkMode ? 'text-cyan-400' : 'text-purple-700'
                    }`}
                  >
                    6+
                  </p>
                  <p
                    className={`text-xs mt-1 font-semibold ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Expert Teachers
                  </p>
                </div>
                <div
                  className={`p-3 rounded-2xl border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-900/40 border-slate-800/60'
                      : 'bg-white/80 border-slate-200/70 shadow-2xs'
                  }`}
                >
                  <p
                    className={`text-2xl sm:text-3xl font-extrabold ${
                      isDarkMode ? 'text-purple-400' : 'text-indigo-600'
                    }`}
                  >
                    Gr 1-11
                  </p>
                  <p
                    className={`text-xs mt-1 font-semibold ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Grades Offered
                  </p>
                </div>
                <div
                  className={`p-3 rounded-2xl border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-900/40 border-slate-800/60'
                      : 'bg-white/80 border-slate-200/70 shadow-2xs'
                  }`}
                >
                  <p
                    className={`text-2xl sm:text-3xl font-extrabold ${
                      isDarkMode ? 'text-indigo-400' : 'text-purple-900'
                    }`}
                  >
                    Smart
                  </p>
                  <p
                    className={`text-xs mt-1 font-semibold ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Institute Portal
                  </p>
                </div>
              </div>
            </div>

            {/* Right Card / Logo Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div
                className={`relative w-full max-w-md p-8 rounded-3xl border backdrop-blur-xl transition-all duration-300 ${
                  isDarkMode
                    ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-purple-500/20 shadow-2xl shadow-purple-950/50'
                    : 'bg-white/90 border-slate-200/90 shadow-xl shadow-purple-500/5'
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-6">
                  <div
                    className={`p-5 rounded-2xl border w-full flex items-center justify-center transition-colors ${
                      isDarkMode
                        ? 'bg-slate-950/80 border-slate-800'
                        : 'bg-slate-50/90 border-slate-200/80 shadow-inner'
                    }`}
                  >
                    <img
                      src="/assets/kirula_full_logo.png"
                      alt="Kirula Full Logo"
                      className="max-h-24 w-auto object-contain py-2"
                      onError={(e) => {
                        e.currentTarget.src = '/assets/kirula_logo.png';
                      }}
                    />
                  </div>

                  <div
                    className={`p-3.5 rounded-xl border w-full flex items-center justify-center ${
                      isDarkMode
                        ? 'bg-slate-950/60 border-slate-800/80'
                        : 'bg-gradient-to-r from-purple-800 via-purple-900 to-indigo-950 border-purple-700 shadow-md'
                    }`}
                  >
                    <img
                      src="/assets/LuminaLearn_Logo_banner.png"
                      alt="LuminaLearn Banner"
                      className="max-h-12 w-auto object-contain brightness-110 drop-shadow-md"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <h3
                      className={`text-lg font-bold ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      Kirula Education Center
                    </h3>
                    <p
                      className={`text-xs leading-relaxed ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      621 road, Menikhinna, Kandy &bull; Excellence in Secondary
                      & Primary Education
                    </p>
                  </div>

                  <div
                    className={`w-full pt-4 border-t ${
                      isDarkMode ? 'border-slate-800' : 'border-slate-200'
                    }`}
                  >
                    <button
                      onClick={() => navigate('/instructors')}
                      className={`w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        isDarkMode
                          ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40'
                          : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-purple-900/15'
                      }`}
                    >
                      <FaChalkboardTeacher /> Browse All Instructors & Schedule
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- RANDOM INSTRUCTOR SPOTLIGHT SHUFFLE SECTION --- */}
      <section
        className={`py-16 border-y relative transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-900/50 border-slate-800'
            : 'bg-slate-100/60 border-slate-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div>
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border mb-2 ${
                  isDarkMode
                    ? 'bg-purple-950/80 border-purple-500/30 text-purple-300'
                    : 'bg-purple-50 border-purple-200 text-purple-700'
                }`}
              >
                <FaChalkboardTeacher /> Spotlight
              </div>
              <h2
                className={`text-3xl sm:text-4xl font-extrabold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Featured Instructor
              </h2>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevInstructor}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-purple-300 shadow-2xs'
                }`}
                title="Previous Instructor"
              >
                <FaChevronLeft className="text-xs" />
              </button>

              <button
                onClick={handleRandomShuffle}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 cursor-pointer transition-all active:scale-95"
                title="Shuffle Random Instructor"
              >
                <FaRandom className="text-xs" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={handleNextInstructor}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-purple-300 shadow-2xs'
                }`}
                title="Next Instructor"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>

          {/* Shuffling Instructor Spotlight Card */}
          <div
            className={`p-8 sm:p-10 rounded-3xl border transition-all duration-300 relative overflow-hidden ${
              isDarkMode
                ? 'bg-slate-950/90 border-purple-500/30 shadow-2xl'
                : 'bg-white border-slate-200/90 shadow-xl shadow-slate-200/50'
            }`}
          >
            <div
              className={`grid grid-cols-1 md:grid-cols-12 gap-8 items-center min-h-[300px] transition-all duration-300 transform ${
                isFading
                  ? 'opacity-0 scale-98 translate-y-1'
                  : 'opacity-100 scale-100 translate-y-0'
              }`}
            >
              {/* Circular Instructor Photo Frame */}
              <div className="md:col-span-4 flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-400 blur-md opacity-30 group-hover:opacity-70 transition duration-500" />
                  <img
                    src={currentInstructor.photo}
                    alt={currentInstructor.name}
                    className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full object-cover shadow-xl border-4 ${
                      isDarkMode
                        ? 'border-purple-500/40 bg-slate-900'
                        : 'border-purple-100 bg-white'
                    }`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = currentInstructor.defaultPhoto;
                    }}
                  />
                  <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-xs text-white shadow-md">
                    ✓
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="md:col-span-8 space-y-4 text-center md:text-left flex flex-col justify-center">
                <div>
                  <span
                    className={`inline-block text-xs font-extrabold px-3 py-1 rounded-lg border uppercase tracking-wider mb-2 ${getSubjectBadgeStyle(
                      currentInstructor.subject
                    )}`}
                  >
                    {currentInstructor.subject}
                  </span>
                  <h3
                    className={`text-2xl sm:text-3xl font-extrabold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {currentInstructor.name}
                  </h3>
                  <p
                    className={`text-xs sm:text-sm font-semibold mt-1 ${
                      isDarkMode ? 'text-cyan-300' : 'text-purple-700'
                    }`}
                  >
                    Target Grades: {currentInstructor.grades}
                  </p>
                </div>

                <p
                  className={`text-sm leading-relaxed max-w-2xl ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {currentInstructor.bio}
                </p>

                {/* Single-line Schedule Summary */}
                <div
                  className={`pt-3 border-t flex items-center gap-2 flex-wrap justify-center md:justify-start text-xs ${
                    isDarkMode ? 'border-slate-800' : 'border-slate-100'
                  }`}
                >
                  <span
                    className={`font-bold uppercase tracking-wider ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Class Sessions:
                  </span>
                  <span
                    className={`px-3 py-1 rounded-xl font-bold border ${
                      isDarkMode
                        ? 'bg-purple-950/80 border-purple-800 text-purple-300'
                        : 'bg-purple-50 border-purple-200 text-purple-800'
                    }`}
                  >
                    {currentInstructor.singleLineSummary}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      isDarkMode ? 'text-cyan-400' : 'text-indigo-600'
                    }`}
                  >
                    ({currentInstructor.schedules.length} Sessions Weekly)
                  </span>
                </div>

                {/* Redirect Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                  <button
                    onClick={() => navigate('/instructors')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md shadow-purple-900/20 transition-all cursor-pointer"
                  >
                    <span>View All Instructors</span>
                    <FaArrowRight className="text-xs" />
                  </button>

                  <button
                    onClick={() => navigate('/instructors#timetable')}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl border transition-all cursor-pointer ${
                      isDarkMode
                        ? 'bg-slate-900 border-slate-800 text-cyan-300 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-purple-300'
                    }`}
                  >
                    <FaCalendarAlt />
                    <span>View Full Schedule</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Carousel dots indicator */}
            <div className="mt-8 flex justify-center gap-2">
              {INSTRUCTORS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => transitionToInstructor(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    currentInstructorIdx === idx
                      ? 'w-8 bg-purple-600 dark:bg-cyan-400'
                      : 'w-2 bg-slate-200 dark:bg-slate-800'
                  }`}
                  title={`Show instructor ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- INSTITUTE SCHEDULE SPOTLIGHT PREVIEW --- */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold mb-2 border ${
                isDarkMode
                  ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                  : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              <FaCalendarAlt /> Class Timetable Preview
            </div>
            <h2
              className={`text-3xl sm:text-4xl font-extrabold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Institute Weekly Schedule
            </h2>
            <p
              className={`mt-2 text-sm sm:text-base ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Saturday & Sunday academic sessions across Science, Mathematics,
              Sinhala, English, and Scholarship
            </p>

            {/* Schedule Table Preview */}
            <div className="sm:hidden flex items-center justify-end text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-2 px-1 gap-1">
              <span>👈 Swipe table to view full schedule 👉</span>
            </div>

            <div
              className={`rounded-3xl border overflow-hidden shadow-xl mb-8 ${
                isDarkMode
                  ? 'bg-slate-900/80 border-slate-800'
                  : 'bg-white border-slate-200/90 shadow-slate-200/40'
              }`}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-left border-collapse text-xs">
                  <thead>
                    <tr
                      className={`border-b font-bold uppercase tracking-wider ${
                        isDarkMode
                          ? 'bg-slate-950 text-cyan-400 border-slate-800'
                          : 'bg-slate-100/90 text-slate-700 border-slate-200'
                      }`}
                    >
                      <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Subject</th>
                      <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Grade / Group</th>
                      <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Instructor</th>
                      <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Day</th>
                      <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Time Slot</th>
                      <th className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">Class Fees</th>
                    </tr>
                  </thead>
                  <tbody
                    className={`divide-y ${
                      isDarkMode
                        ? 'divide-slate-800 text-slate-300'
                        : 'divide-slate-100 text-slate-700'
                    }`}
                  >
                    {masterTimetablePreview.map((item) => (
                      <tr
                        key={item.id}
                        className={
                          isDarkMode
                            ? 'hover:bg-slate-950/60 transition-colors'
                            : 'hover:bg-purple-50/40 transition-colors'
                        }
                      >
                        <td className="py-3.5 px-4 sm:px-6 font-bold whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                item.subject.includes('Science')
                                  ? 'bg-cyan-500'
                                  : item.subject.includes('Math')
                                  ? 'bg-purple-500'
                                  : item.subject.includes('English')
                                  ? 'bg-emerald-500'
                                  : item.subject.includes('Sinhala')
                                  ? 'bg-amber-500'
                                  : 'bg-pink-500'
                              }`}
                            />
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {item.subject}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 font-semibold whitespace-nowrap">
                          <span
                            className={`whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-bold border inline-block ${
                              isDarkMode
                                ? 'bg-slate-950 border-slate-800 text-purple-300'
                                : 'bg-purple-50 border-purple-200/70 text-purple-700'
                            }`}
                          >
                            {item.grade}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2.5 whitespace-nowrap">
                            <img
                              src={item.instructorPhoto}
                              alt={item.instructor}
                              className="w-7 h-7 rounded-full object-cover border-2 border-purple-200 dark:border-purple-600/70 shadow-xs shrink-0 bg-slate-100 dark:bg-slate-800"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = item.defaultPhoto;
                              }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {item.instructor}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap">
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] whitespace-nowrap ${
                              item.day === 'Saturday'
                                ? isDarkMode
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                                  : 'bg-purple-50 text-purple-700 font-bold border border-purple-200/60'
                                : isDarkMode
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                                : 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60'
                            }`}
                          >
                            {item.day}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                          {item.time}
                        </td>
                        <td className="py-3.5 px-4 sm:px-6 text-right font-mono text-[11px] whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              isDarkMode
                                ? 'bg-slate-950 border-slate-800 text-amber-400'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}
                          >
                            {item.fees}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* View Full Schedule Button CTA */}
          <div className="text-center">
            <button
              onClick={() => navigate('/instructors#timetable')}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-purple-900/20 transition-all cursor-pointer transform hover:-translate-y-0.5 active:scale-95"
            >
              <FaCalendarAlt />
              <span>View Full Institute Schedule</span>
              <FaArrowRight className="text-xs" />
            </button>
          </div>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section
        id="about"
        className={`py-16 border-y relative transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-900/50 border-slate-800/80'
            : 'bg-slate-100/60 border-slate-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2
              className={`text-xs font-bold uppercase tracking-widest mb-2 ${
                isDarkMode ? 'text-cyan-400' : 'text-purple-700'
              }`}
            >
              About The System
            </h2>
            <p
              className={`text-3xl sm:text-4xl font-extrabold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Welcome to{' '}
              <span
                className={`bg-gradient-to-r ${
                  isDarkMode
                    ? 'from-purple-400 to-cyan-400'
                    : 'from-purple-700 to-indigo-600'
                } bg-clip-text text-transparent`}
              >
                LuminaLearn
              </span>
            </p>
            <p
              className={`mt-4 leading-relaxed ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              LuminaLearn is the central institute management system created
              specifically for{' '}
              <strong
                className={isDarkMode ? 'text-slate-100' : 'text-slate-900'}
              >
                Kirula Education Center
              </strong>
              . Designed with state-of-the-art web technology, it seamlessly
              connects students, teachers, and administration into one unified
              platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div
              className={`p-7 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-slate-950/70 border-slate-800 hover:border-purple-500/40'
                  : 'bg-white border-slate-200/80 shadow-md shadow-slate-200/40 hover:shadow-xl hover:border-purple-300'
              }`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/20">
                <FaGraduationCap />
              </div>
              <h3
                className={`text-xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Student Center
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Students can browse available courses, track physical & online
                class enrollments, view attendance, and keep up with instant
                broadcast notices.
              </p>
            </div>

            <div
              className={`p-7 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/40'
                  : 'bg-white border-slate-200/80 shadow-md shadow-slate-200/40 hover:shadow-xl hover:border-purple-300'
              }`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-md shadow-cyan-600/20">
                <FaCreditCard />
              </div>
              <h3
                className={`text-xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Payment Management
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Supports verified online course payments and physical institute
                receipts tracking, providing instant slip uploads and digital
                clearance.
              </p>
            </div>

            <div
              className={`p-7 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-slate-950/70 border-slate-800 hover:border-indigo-500/40'
                  : 'bg-white border-slate-200/80 shadow-md shadow-slate-200/40 hover:shadow-xl hover:border-purple-300'
              }`}
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 bg-gradient-to-tr from-purple-700 to-pink-600 text-white shadow-md shadow-purple-700/20">
                <FaChartLine />
              </div>
              <h3
                className={`text-xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Admin Analytics
              </h3>
              <p
                className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Empowers Kirula Education Center administration with real-time
                financial metrics, enrollment statistics, attendance tracking,
                and user controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2
              className={`text-xs font-bold uppercase tracking-widest mb-2 ${
                isDarkMode ? 'text-purple-400' : 'text-purple-700'
              }`}
            >
              Capabilities
            </h2>
            <p
              className={`text-3xl sm:text-4xl font-extrabold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Key System Features
            </p>
            <p
              className={`mt-3 text-base ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Everything built for Kirula Education Center students and
              administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                  : 'bg-white border-slate-200/80 shadow-xs hover:shadow-lg hover:border-purple-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 ${
                  isDarkMode
                    ? 'bg-cyan-500/10 text-cyan-400'
                    : 'bg-cyan-50 text-cyan-700'
                }`}
              >
                <FaBookOpen />
              </div>
              <h4
                className={`text-lg font-bold mb-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Course Catalog
              </h4>
              <p
                className={`text-xs leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Comprehensive course list with subject details, fee structure,
                and teacher details.
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                  : 'bg-white border-slate-200/80 shadow-xs hover:shadow-lg hover:border-purple-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 ${
                  isDarkMode
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'bg-purple-50 text-purple-700'
                }`}
              >
                <FaUserCheck />
              </div>
              <h4
                className={`text-lg font-bold mb-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Attendance System
              </h4>
              <p
                className={`text-xs leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Instant physical and online attendance marking with search
                filters and reporting.
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                  : 'bg-white border-slate-200/80 shadow-xs hover:shadow-lg hover:border-purple-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 ${
                  isDarkMode
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'bg-indigo-50 text-indigo-700'
                }`}
              >
                <FaShieldAlt />
              </div>
              <h4
                className={`text-lg font-bold mb-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Secure Sign-In
              </h4>
              <p
                className={`text-xs leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                JWT authentication, Google OAuth single sign-on, and role-based
                route security.
              </p>
            </div>

            <div
              className={`p-6 rounded-2xl border transition-all duration-300 ${
                isDarkMode
                  ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                  : 'bg-white border-slate-200/80 shadow-xs hover:shadow-lg hover:border-purple-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4 ${
                  isDarkMode
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'bg-emerald-50 text-emerald-700'
                }`}
              >
                <FaUsers />
              </div>
              <h4
                className={`text-lg font-bold mb-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                User Management
              </h4>
              <p
                className={`text-xs leading-relaxed ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                }`}
              >
                Role assignment for Admins, Teachers, and Physical/Online
                Students.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- INSTITUTE CONTACT DETAILS & LOCATION --- */}
      <section
        id="contact"
        className={`py-16 border-t ${
          isDarkMode
            ? 'bg-slate-900/60 border-slate-800'
            : 'bg-slate-100/60 border-slate-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold border ${
                  isDarkMode
                    ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                    : 'bg-purple-50 border-purple-200 text-purple-700'
                }`}
              >
                <FaMapMarkerAlt /> Institute Headquarters
              </div>
              <h2
                className={`text-3xl sm:text-4xl font-extrabold ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}
              >
                Kirula Education Center
              </h2>
              <p
                className={`text-sm sm:text-base leading-relaxed ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                Located in Menikhinna, Kandy, Kirula Education Center offers
                top-quality education and student guidance.
              </p>

              <div className="space-y-4 pt-2">
                <div
                  className={`flex items-start gap-4 p-4 rounded-xl border ${
                    isDarkMode
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-xs'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5 ${
                      isDarkMode
                        ? 'bg-cyan-900/40 text-cyan-400'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <FaPhoneAlt />
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-medium ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Contact Phone
                    </h4>
                    <p
                      className={`text-base font-bold mt-0.5 ${
                        isDarkMode ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {INSTITUTE_INFO.contact.phone}
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-4 p-4 rounded-xl border ${
                    isDarkMode
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-white border-slate-200/80 shadow-xs'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 mt-0.5 ${
                      isDarkMode
                        ? 'bg-purple-900/40 text-purple-400'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <h4
                      className={`text-xs font-medium ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Institute Address
                    </h4>
                    <p
                      className={`text-sm font-semibold mt-0.5 leading-relaxed ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {INSTITUTE_INFO.address.full}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div
                className={`w-full max-w-lg p-8 rounded-3xl border shadow-xl text-center space-y-6 ${
                  isDarkMode
                    ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/60 border-slate-800'
                    : 'bg-gradient-to-br from-purple-900 via-indigo-900 to-purple-950 border-purple-700/80 text-white shadow-2xl shadow-purple-950/20'
                }`}
              >
                <div className="inline-block p-4 rounded-2xl bg-white border border-slate-200/80 shadow-lg">
                  <img
                    src="/assets/kirula_logo.png"
                    alt="Kirula Emblem"
                    className="h-24 w-auto mx-auto object-contain"
                  />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white">
                    LuminaLearn Portal
                  </h3>
                  <p className="text-sm text-cyan-300 font-medium mt-1">
                    Kirula Education Center - Kandy
                  </p>
                </div>

                <div className="pt-2 border-t border-purple-700/60 text-xs text-purple-200/90 leading-relaxed">
                  For enrollment inquiries or technical support, please contact
                  the institute directly at{' '}
                  <strong className="text-white font-bold">
                    {INSTITUTE_INFO.contact.phone}
                  </strong>
                  .
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer
        className={`border-t py-10 mt-auto transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-950 border-slate-900 text-slate-400'
            : 'bg-slate-900 border-slate-800 text-slate-300'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="/assets/kirula_logo.png"
              alt="Kirula Logo"
              className="h-8 w-auto object-contain opacity-90"
            />
            <span className="text-xs font-medium">
              LuminaLearn Institute Management System
            </span>
          </div>

          <div
            className={`text-center text-xs font-semibold ${
              isDarkMode ? 'text-slate-400' : 'text-slate-300'
            }`}
          >
            {INSTITUTE_INFO.copyright}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => navigate('/instructors')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Instructors
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigate('/instructors#timetable')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Timetable
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigate('/about')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              About Us
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigate('/login')}
              className="hover:text-cyan-300 transition-colors cursor-pointer font-semibold"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
