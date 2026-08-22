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
  FaCheckCircle
} from 'react-icons/fa';
import { INSTRUCTORS, GET_DIVERSE_TIMETABLE_PREVIEW, INSTITUTE_INFO } from '../utils/instituteData';

const Home = () => {
  const navigate = useNavigate();

  // Automatic time-based theme detection
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lumina_theme');
    if (saved) return saved === 'dark';
    const hour = new Date().getHours();
    return !(hour >= 6 && hour < 18);
  });

  const [systemTimeStr, setSystemTimeStr] = useState('');
  const [isAutoDetected, setIsAutoDetected] = useState(() => !localStorage.getItem('lumina_theme'));

  // --- SHUFFLE & ANIMATION STATES ---
  const [currentInstructorIdx, setCurrentInstructorIdx] = useState(0);
  const [isFading, setIsFading] = useState(false);

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

  // Timer for random instructor shuffling (continuous 5s interval)
  useEffect(() => {
    const shuffleTimer = setInterval(() => {
      transitionToInstructor((currentInstructorIdx + 1) % INSTRUCTORS.length);
    }, 5000);
    return () => clearInterval(shuffleTimer);
  }, [currentInstructorIdx]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    setIsAutoDetected(false);
    localStorage.setItem('lumina_theme', nextMode ? 'dark' : 'light');
  };

  const resetToAuto = () => {
    localStorage.removeItem('lumina_theme');
    const hour = new Date().getHours();
    setIsDarkMode(!(hour >= 6 && hour < 18));
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

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 flex flex-col selection:bg-purple-600 selection:text-white relative overflow-hidden ${isDarkMode
        ? 'bg-slate-950 text-slate-100'
        : 'bg-gradient-to-br from-purple-100/90 via-purple-50/80 to-indigo-100/90 text-slate-800'
      }`}>

      {/* Background Dot Texture Overlay */}
      <div
        className={`absolute inset-0 pointer-events-none -z-10 transition-opacity duration-500 ${isDarkMode
            ? 'bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07]'
            : 'bg-[radial-gradient(#2d1b64_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.08]'
          }`}
      />

      {/* Ambient Lumina Purple Radial Glow Orbs */}
      <div className={`absolute top-0 left-1/4 w-[650px] h-[650px] blur-[140px] rounded-full pointer-events-none -z-10 ${isDarkMode ? 'bg-purple-900/25' : 'bg-purple-400/35'
        }`} />
      <div className={`absolute top-[35%] right-5 w-[550px] h-[550px] blur-[150px] rounded-full pointer-events-none -z-10 ${isDarkMode ? 'bg-cyan-900/20' : 'bg-indigo-300/40'
        }`} />

      {/* --- NAVBAR --- */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${isDarkMode
          ? 'bg-slate-950/80 border-slate-800/80'
          : 'bg-white/85 border-purple-200/70 shadow-xs'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img
              src="/assets/kirula_logo.png"
              alt="Kirula Education Center"
              className="h-12 w-auto object-contain drop-shadow-sm"
            />
            <div className={`h-8 w-px hidden sm:block ${isDarkMode ? 'bg-slate-800' : 'bg-purple-200'}`} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className={`text-xl font-extrabold tracking-tight bg-gradient-to-r ${isDarkMode
                    ? 'from-purple-400 via-indigo-300 to-cyan-400'
                    : 'from-purple-950 via-purple-800 to-indigo-900'
                  } bg-clip-text text-transparent`}>
                  LuminaLearn
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isDarkMode
                    ? 'bg-purple-950/80 border border-purple-500/30 text-purple-300'
                    : 'bg-purple-200/80 border border-purple-300 text-purple-900'
                  }`}>
                  Portal
                </span>
              </div>
              <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-purple-800/90'}`}>
                by Kirula Education Center
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className={`hidden md:flex items-center gap-8 text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
            <button onClick={() => navigate('/instructors')} className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors font-semibold cursor-pointer">
              Instructors
            </button>
            <button onClick={() => navigate('/instructors#timetable')} className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors font-semibold cursor-pointer">
              Timetable
            </button>
            <button onClick={() => navigate('/about')} className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors font-semibold cursor-pointer">
              About Us
            </button>
            <a href="#features" className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors">Features</a>
            <a href="#contact" className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors">Contact</a>
          </nav>

          {/* Right Controls: Theme Toggle & Login Button */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                title={isAutoDetected ? `Auto-theme active (${systemTimeStr}) - Click to toggle` : 'Toggle Light/Dark Theme'}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 cursor-pointer ${isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800 hover:border-slate-700'
                    : 'bg-purple-100/90 border-purple-300 text-purple-950 hover:bg-purple-200/80 shadow-2xs'
                  }`}
              >
                {isDarkMode ? <FaSun className="text-yellow-400 text-sm" /> : <FaMoon className="text-purple-900 text-sm" />}
                <span className="hidden sm:inline">{isDarkMode ? 'Dark' : 'Light'}</span>
              </button>

              <div
                onClick={resetToAuto}
                className={`hidden lg:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${isAutoDetected
                    ? (isDarkMode ? 'bg-purple-950/60 border-purple-800/60 text-purple-300' : 'bg-purple-100/80 border-purple-300 text-purple-900 font-semibold')
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-purple-300' : 'bg-white border-purple-200 text-slate-700 hover:text-purple-900')
                  }`}
              >
                <FaClock className="text-[10px]" />
                <span>{systemTimeStr}</span>
                {isAutoDetected && <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-600/20 px-1 py-0.2 rounded">Auto</span>}
              </div>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="group relative flex items-center gap-2 bg-gradient-to-r from-purple-800 via-purple-900 to-indigo-900 hover:from-purple-700 hover:to-indigo-800 text-white text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-xl shadow-md hover:shadow-purple-900/30 transition-all duration-300 transform active:scale-95 cursor-pointer"
            >
              <span>Portal Login</span>
              <FaSignInAlt className="text-xs transition-transform group-hover:translate-x-1" />
            </button>
          </div>

        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 pb-16 md:pt-16 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">

              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border backdrop-blur-md ${isDarkMode
                  ? 'bg-purple-900/40 border-purple-500/30 text-purple-300'
                  : 'bg-purple-200/70 border-purple-300 text-purple-950 shadow-xs'
                }`}>
                <FaGraduationCap className={isDarkMode ? 'text-cyan-400' : 'text-purple-800'} />
                <span>Next-Gen Institute Management System</span>
              </div>

              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight ${isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                Empowering Education with <br className="hidden sm:inline" />
                <span className={`bg-gradient-to-r ${isDarkMode
                    ? 'from-cyan-400 via-indigo-300 to-purple-400'
                    : 'from-purple-900 via-indigo-800 to-purple-700'
                  } bg-clip-text text-transparent`}>
                  LuminaLearn
                </span>
              </h1>

              <h2 className={`text-xl sm:text-2xl font-semibold ${isDarkMode ? 'text-purple-200/90' : 'text-purple-950'
                }`}>
                Official Digital Platform of <span className={isDarkMode ? 'text-cyan-300 font-bold' : 'text-purple-800 font-extrabold'}>Kirula Education Center</span>
              </h2>

              <p className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 ${isDarkMode ? 'text-slate-300' : 'text-slate-700 font-medium'
                }`}>
                A modern, comprehensive institute management portal engineered to streamline class management, student enrollments, fee payments, attendance tracking, and real-time performance analytics.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="flex items-center justify-center gap-3 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-xl hover:shadow-purple-900/40 transition-all cursor-pointer"
                >
                  <FaSignInAlt />
                  <span>Portal Login</span>
                </button>

                <button
                  onClick={() => navigate('/instructors')}
                  className={`flex items-center justify-center gap-2 font-bold text-sm sm:text-base px-6 py-3.5 rounded-xl border transition-all cursor-pointer ${isDarkMode
                      ? 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border-slate-700'
                      : 'bg-white hover:bg-purple-50 text-purple-950 border-purple-300 shadow-md'
                    }`}
                >
                  <FaChalkboardTeacher />
                  <span>Teachers & Timetable</span>
                </button>
              </div>

              <div className={`pt-8 border-t grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left ${isDarkMode ? 'border-slate-800/80' : 'border-purple-200/80'
                }`}>
                <div>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-cyan-400' : 'text-purple-900'}`}>6+</p>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-purple-900/80'}`}>Expert Teachers</p>
                </div>
                <div>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-purple-400' : 'text-indigo-900'}`}>Gr 1-11</p>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-purple-900/80'}`}>Grades Offered</p>
                </div>
                <div>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-indigo-400' : 'text-purple-950'}`}>Smart</p>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-purple-900/80'}`}>Institute Portal</p>
                </div>
              </div>

            </div>

            {/* Right Card / Logo Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`relative w-full max-w-md p-8 rounded-3xl border backdrop-blur-xl transition-all ${isDarkMode
                  ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-purple-500/20 shadow-2xl shadow-purple-950/50'
                  : 'bg-gradient-to-b from-white via-purple-50/50 to-white border-purple-200/90 shadow-2xl shadow-purple-950/15'
                }`}>

                <div className="flex flex-col items-center text-center space-y-6">

                  <div className={`p-4 rounded-2xl border w-full flex items-center justify-center ${isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-purple-200 shadow-inner'
                    }`}>
                    <img
                      src="/assets/kirula_full_logo.png"
                      alt="Kirula Full Logo"
                      className="max-h-24 w-auto object-contain py-2"
                      onError={(e) => { e.currentTarget.src = "/assets/kirula_logo.png"; }}
                    />
                  </div>

                  <div className={`p-3.5 rounded-xl border w-full flex items-center justify-center ${isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 border-purple-800 shadow-md'
                    }`}>
                    <img
                      src="/assets/LuminaLearn_Logo_banner.png"
                      alt="LuminaLearn Banner"
                      className="max-h-14 w-auto object-contain brightness-110 drop-shadow-md"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Kirula Education Center</h3>
                    <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                      621 road, Menikhinna, Kandy &bull; Excellence in Secondary & Primary Education
                    </p>
                  </div>

                  <div className={`w-full pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-purple-200'}`}>
                    <button
                      onClick={() => navigate('/instructors')}
                      className={`w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${isDarkMode
                          ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40'
                          : 'bg-purple-900 hover:bg-purple-800 text-white border border-purple-800 shadow-md'
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

      {/* --- RANDOM INSTRUCTOR SPOTLIGHT SHUFFLE SECTION (FIXED HEIGHT & CIRCULAR PHOTO) --- */}
      <section
        className={`py-16 border-y relative transition-colors duration-300 ${isDarkMode
            ? 'bg-slate-900/70 border-slate-800'
            : 'bg-gradient-to-r from-purple-100/90 via-white/80 to-indigo-100/90 border-purple-200/90 shadow-sm'
          }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-10">
            <div>
              <div className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold border mb-2 ${isDarkMode ? 'bg-purple-950/80 border-purple-500/30 text-purple-300' : 'bg-purple-200 border-purple-300 text-purple-950'
                }`}>
                <FaChalkboardTeacher /> Spotlight
              </div>
              <h2 className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
                Featured Instructor
              </h2>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevInstructor}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-purple-300 text-purple-900 hover:bg-purple-50 shadow-xs'
                  }`}
                title="Previous Instructor"
              >
                <FaChevronLeft className="text-xs" />
              </button>

              <button
                onClick={handleRandomShuffle}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all active:scale-95"
                title="Shuffle Random Instructor"
              >
                <FaRandom className="text-xs" />
                <span>Shuffle</span>
              </button>

              <button
                onClick={handleNextInstructor}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${isDarkMode ? 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800' : 'bg-white border-purple-300 text-purple-900 hover:bg-purple-50 shadow-xs'
                  }`}
                title="Next Instructor"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>
          </div>

          {/* Shuffling Instructor Spotlight Card (Fixed height container with smooth fade/slide) */}
          <div className={`p-8 sm:p-10 rounded-3xl border transition-all duration-300 shadow-2xl relative overflow-hidden ${isDarkMode
              ? 'bg-slate-950/90 border-purple-500/30'
              : 'bg-white border-purple-200'
            }`}>

            <div className={`grid grid-cols-1 md:grid-cols-12 gap-8 items-center min-h-[320px] transition-all duration-300 transform ${isFading ? 'opacity-0 scale-98 translate-y-1' : 'opacity-100 scale-100 translate-y-0'
              }`}>

              {/* Circular Instructor Photo Frame */}
              <div className="md:col-span-4 flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-400 blur-md opacity-40 group-hover:opacity-80 transition duration-500" />
                  <img
                    src={currentInstructor.photo}
                    alt={currentInstructor.name}
                    className={`relative w-44 h-44 sm:w-52 sm:h-52 rounded-full object-cover shadow-2xl border-4 ${isDarkMode ? 'border-purple-500/40 bg-slate-900' : 'border-purple-300 bg-white'
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

              {/* Details with CONSISTENT height (Single-line class schedule summary) */}
              <div className="md:col-span-8 space-y-4 text-center md:text-left flex flex-col justify-center">
                <div>
                  <span className={`inline-block text-xs font-extrabold px-3 py-1 rounded-lg border uppercase tracking-wider mb-2 ${currentInstructor.subject.includes('Science') ? 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30' :
                      currentInstructor.subject.includes('Math') ? 'bg-purple-500/10 text-purple-500 border-purple-500/30' :
                        currentInstructor.subject.includes('English') ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' :
                          currentInstructor.subject.includes('Sinhala') ? 'bg-amber-500/10 text-amber-500 border-amber-500/30' : 'bg-pink-500/10 text-pink-500 border-pink-500/30'
                    }`}>
                    {currentInstructor.subject}
                  </span>
                  <h3 className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
                    {currentInstructor.name}
                  </h3>
                  <p className={`text-xs sm:text-sm font-semibold mt-1 ${isDarkMode ? 'text-cyan-300' : 'text-purple-800'}`}>
                    Target Grades: {currentInstructor.grades}
                  </p>
                </div>

                <p className={`text-sm leading-relaxed max-w-2xl ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  {currentInstructor.bio}
                </p>

                {/* CONSISTENT ONE-LINE SCHEDULE SUMMARY TO PREVENT CARD LENGTH CHANGING */}
                <div className="pt-2 border-t border-slate-800/30 dark:border-slate-800 flex items-center gap-2 flex-wrap justify-center md:justify-start text-xs">
                  <span className={`font-bold uppercase tracking-wider ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    Class Sessions:
                  </span>
                  <span className={`px-3 py-1 rounded-xl font-bold border ${isDarkMode ? 'bg-purple-950/80 border-purple-800 text-purple-300' : 'bg-purple-100 border-purple-200 text-purple-950'
                    }`}>
                    {currentInstructor.singleLineSummary}
                  </span>
                  <span className={`text-[11px] font-medium ${isDarkMode ? 'text-cyan-400' : 'text-indigo-700'}`}>
                    ({currentInstructor.schedules.length} Sessions Weekly)
                  </span>
                </div>

                {/* Redirect Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
                  <button
                    onClick={() => navigate('/instructors')}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-900 hover:bg-purple-800 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <span>View All Instructors</span>
                    <FaArrowRight className="text-xs" />
                  </button>

                  <button
                    onClick={() => navigate('/instructors#timetable')}
                    className={`w-full sm:w-auto flex items-center justify-center gap-2 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl border transition-all cursor-pointer ${isDarkMode ? 'bg-slate-900 border-slate-800 text-cyan-300 hover:bg-slate-800' : 'bg-purple-50 border-purple-300 text-purple-950 hover:bg-purple-100'
                      }`}
                  >
                    <FaCalendarAlt />
                    <span>View Full Schedule</span>
                  </button>
                </div>

              </div>

            </div>

            {/* Carousel dots indicator */}
            <div className="mt-6 flex justify-center gap-2">
              {INSTRUCTORS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => transitionToInstructor(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${currentInstructorIdx === idx
                      ? 'w-8 bg-purple-600 dark:bg-cyan-400'
                      : 'w-2 bg-slate-300 dark:bg-slate-800'
                    }`}
                  title={`Show instructor ${idx + 1}`}
                />
              ))}
            </div>

          </div>

        </div>
      </section>

      {/* --- INSTITUTE SCHEDULE SPOTLIGHT PREVIEW (DIVERSE SUBJECT MIXTURE) --- */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2 border ${isDarkMode ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300' : 'bg-purple-200 border-purple-300 text-purple-950'
              }`}>
              <FaCalendarAlt /> Class Timetable Preview
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
              Institute Weekly Schedule
            </h2>
            <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
              Saturday & Sunday academic sessions across Science, Mathematics, Sinhala, English, and Scholarship
            </p>
          </div>

          {/* Schedule Table Preview with Diverse Mixture */}
          <div className={`rounded-3xl border overflow-hidden shadow-xl mb-8 ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white border-purple-200'
            }`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className={`border-b font-bold uppercase tracking-wider ${isDarkMode ? 'bg-slate-950 text-cyan-400 border-slate-800' : 'bg-purple-950 text-white'
                    }`}>
                    <th className="py-3.5 px-6">Subject</th>
                    <th className="py-3.5 px-6">Grade / Group</th>
                    <th className="py-3.5 px-6">Instructor</th>
                    <th className="py-3.5 px-6">Day</th>
                    <th className="py-3.5 px-6">Time Slot</th>
                    <th className="py-3.5 px-6 text-right">Class Fees</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-slate-800 text-slate-300' : 'divide-purple-100 text-slate-800'}`}>
                  {masterTimetablePreview.map((item) => (
                    <tr key={item.id} className={isDarkMode ? 'hover:bg-slate-950/60' : 'hover:bg-purple-50/50'}>
                      <td className="py-3.5 px-6 font-bold flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${item.subject.includes('Science') ? 'bg-cyan-400' :
                            item.subject.includes('Math') ? 'bg-purple-500' :
                              item.subject.includes('English') ? 'bg-emerald-400' :
                                item.subject.includes('Sinhala') ? 'bg-amber-400' : 'bg-pink-400'
                          }`} />
                        {item.subject}
                      </td>
                      <td className="py-3.5 px-6 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-950'
                          }`}>
                          {item.grade}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-medium">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={item.instructorPhoto}
                            alt={item.instructor}
                            className="w-7 h-7 rounded-full object-cover border-2 border-purple-300 dark:border-purple-600/70 shadow-xs shrink-0 bg-slate-100 dark:bg-slate-800"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = item.defaultPhoto;
                            }}
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{item.instructor}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`font-bold ${item.day === 'Saturday' ? 'text-purple-600 dark:text-cyan-400' : 'text-indigo-600 dark:text-purple-400'}`}>
                          {item.day}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 font-semibold">{item.time}</td>
                      <td className="py-3.5 px-6 text-right font-mono text-[11px]">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${isDarkMode ? 'bg-slate-950 border-slate-800 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}>
                          {item.fees}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* View Full Schedule Button CTA */}
          <div className="text-center">
            <button
              onClick={() => navigate('/instructors#timetable')}
              className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <FaCalendarAlt />
              <span>View Full Institute Schedule</span>
              <FaArrowRight className="text-xs" />
            </button>
          </div>

        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className={`py-16 border-y relative transition-colors duration-300 ${isDarkMode
          ? 'bg-slate-900/50 border-slate-800/80'
          : 'bg-gradient-to-r from-purple-100/80 via-purple-50/90 to-indigo-100/80 border-purple-200/80'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-cyan-400' : 'text-purple-800'
              }`}>About The System</h2>
            <p className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
              Welcome to <span className={`bg-gradient-to-r ${isDarkMode ? 'from-purple-400 to-cyan-400' : 'from-purple-900 to-indigo-800'
                } bg-clip-text text-transparent`}>LuminaLearn</span>
            </p>
            <p className={`mt-4 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
              LuminaLearn is the central institute management system created specifically for <strong className={isDarkMode ? 'text-slate-100' : 'text-purple-950'}>Kirula Education Center</strong>. Designed with state-of-the-art web technology, it seamlessly connects students, teachers, and administration into one unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode
                ? 'bg-slate-950/70 border-slate-800 hover:border-purple-500/40'
                : 'bg-white/90 backdrop-blur-sm border-purple-200 shadow-md hover:shadow-xl hover:border-purple-400'
              }`}>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl mb-4 ${isDarkMode
                  ? 'bg-purple-900/40 border-purple-500/30 text-purple-400'
                  : 'bg-purple-100 border-purple-300 text-purple-900'
                }`}>
                <FaGraduationCap />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Student Center</h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Students can browse available courses, track physical & online class enrollments, view attendance, and keep up with instant broadcast notices.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode
                ? 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/40'
                : 'bg-white/90 backdrop-blur-sm border-purple-200 shadow-md hover:shadow-xl hover:border-purple-400'
              }`}>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl mb-4 ${isDarkMode
                  ? 'bg-cyan-900/40 border-cyan-500/30 text-cyan-400'
                  : 'bg-indigo-100 border-indigo-300 text-indigo-900'
                }`}>
                <FaCreditCard />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Payment Management</h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Supports verified online course payments and physical institute receipts tracking, providing instant slip uploads and digital clearance.
              </p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all duration-300 ${isDarkMode
                ? 'bg-slate-950/70 border-slate-800 hover:border-indigo-500/40'
                : 'bg-white/90 backdrop-blur-sm border-purple-200 shadow-md hover:shadow-xl hover:border-purple-400'
              }`}>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl mb-4 ${isDarkMode
                  ? 'bg-indigo-900/40 border-indigo-500/30 text-indigo-400'
                  : 'bg-purple-100 border-purple-300 text-purple-900'
                }`}>
                <FaChartLine />
              </div>
              <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Admin Analytics</h3>
              <p className={`text-sm leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                Empowers Kirula Education Center administration with real-time financial metrics, enrollment statistics, attendance tracking, and user controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className={`text-xs font-bold uppercase tracking-widest mb-2 ${isDarkMode ? 'text-purple-400' : 'text-purple-800'
              }`}>Capabilities</h2>
            <p className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
              Key System Features
            </p>
            <p className={`mt-3 text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
              Everything built for Kirula Education Center students and administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className={`p-6 rounded-2xl border transition-all ${isDarkMode
                ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                : 'bg-white/90 backdrop-blur-xs border-purple-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
              }`}>
              <FaBookOpen className={`text-2xl mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-purple-800'}`} />
              <h4 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Course Catalog</h4>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Comprehensive course list with subject details, fee structure, and teacher details.</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${isDarkMode
                ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                : 'bg-white/90 backdrop-blur-xs border-purple-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
              }`}>
              <FaUserCheck className={`text-2xl mb-3 ${isDarkMode ? 'text-purple-400' : 'text-indigo-800'}`} />
              <h4 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Attendance System</h4>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Instant physical and online attendance marking with search filters and reporting.</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${isDarkMode
                ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                : 'bg-white/90 backdrop-blur-xs border-purple-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
              }`}>
              <FaShieldAlt className={`text-2xl mb-3 ${isDarkMode ? 'text-indigo-400' : 'text-purple-900'}`} />
              <h4 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Secure Sign-In</h4>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>JWT authentication, Google OAuth single sign-on, and role-based route security.</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${isDarkMode
                ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80'
                : 'bg-white/90 backdrop-blur-xs border-purple-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
              }`}>
              <FaUsers className={`text-2xl mb-3 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-800'}`} />
              <h4 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>User Management</h4>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Role assignment for Admins, Teachers, and Physical/Online Students.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- INSTITUTE CONTACT DETAILS & LOCATION --- */}
      <section id="contact" className={`py-16 border-t ${isDarkMode
          ? 'bg-slate-900/60 border-slate-800'
          : 'bg-gradient-to-b from-purple-100/70 to-indigo-100/60 border-purple-200'
        }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">

            <div className="lg:col-span-6 space-y-6">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${isDarkMode
                  ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                  : 'bg-purple-200 border-purple-300 text-purple-950'
                }`}>
                <FaMapMarkerAlt /> Institute Headquarters
              </div>
              <h2 className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
                Kirula Education Center
              </h2>
              <p className={`text-sm sm:text-base leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
                Located in Menikhinna, Kandy, Kirula Education Center offers top-quality education and student guidance.
              </p>

              <div className="space-y-4 pt-2">
                <div className={`flex items-start gap-4 p-4 rounded-xl border ${isDarkMode
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-white/90 border-purple-200 shadow-xs'
                  }`}>
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-base shrink-0 mt-0.5 ${isDarkMode
                      ? 'bg-cyan-900/40 border-cyan-500/30 text-cyan-400'
                      : 'bg-purple-100 border-purple-300 text-purple-900'
                    }`}>
                    <FaPhoneAlt />
                  </div>
                  <div>
                    <h4 className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contact Phone</h4>
                    <p className={`text-base font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>{INSTITUTE_INFO.contact.phone}</p>
                  </div>
                </div>

                <div className={`flex items-start gap-4 p-4 rounded-xl border ${isDarkMode
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-white/90 border-purple-200 shadow-xs'
                  }`}>
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-base shrink-0 mt-0.5 ${isDarkMode
                      ? 'bg-purple-900/40 border-purple-500/30 text-purple-400'
                      : 'bg-indigo-100 border-indigo-300 text-indigo-900'
                    }`}>
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <h4 className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Institute Address</h4>
                    <p className={`text-sm font-semibold mt-0.5 leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      {INSTITUTE_INFO.address.full}
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="lg:col-span-6 flex justify-center">
              <div className={`w-full max-w-lg p-8 rounded-3xl border shadow-xl text-center space-y-6 ${isDarkMode
                  ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/60 border-slate-800'
                  : 'bg-gradient-to-br from-purple-950 via-purple-900 to-indigo-950 border-purple-800 text-white shadow-2xl shadow-purple-950/30'
                }`}>

                <div className="inline-block p-4 rounded-2xl bg-white/95 border border-purple-200 shadow-lg">
                  <img
                    src="/assets/kirula_logo.png"
                    alt="Kirula Emblem"
                    className="h-28 w-auto mx-auto object-contain"
                  />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white">LuminaLearn Portal</h3>
                  <p className="text-sm text-cyan-300 font-medium mt-1">Kirula Education Center - Kandy</p>
                </div>

                <div className="pt-2 border-t border-purple-800/60 text-xs text-slate-300 leading-relaxed">
                  For enrollment inquiries or technical support, please contact the institute directly at <strong className="text-white">{INSTITUTE_INFO.contact.phone}</strong>.
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className={`border-t py-10 mt-auto transition-colors duration-300 ${isDarkMode
          ? 'bg-slate-950 border-slate-900 text-slate-400'
          : 'bg-purple-950 border-purple-900 text-purple-200'
        }`}>
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

          <div className={`text-center text-xs font-semibold ${isDarkMode ? 'text-slate-400' : 'text-purple-100'}`}>
            {INSTITUTE_INFO.copyright}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button onClick={() => navigate('/instructors')} className="hover:text-cyan-300 transition-colors cursor-pointer">Instructors</button>
            <span>&bull;</span>
            <button onClick={() => navigate('/instructors#timetable')} className="hover:text-cyan-300 transition-colors cursor-pointer">Timetable</button>
            <span>&bull;</span>
            <button onClick={() => navigate('/about')} className="hover:text-cyan-300 transition-colors cursor-pointer">About Us</button>
            <span>&bull;</span>
            <button onClick={() => navigate('/login')} className="hover:text-cyan-300 transition-colors cursor-pointer font-semibold">Sign In</button>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;
