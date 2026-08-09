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
  FaClock
} from 'react-icons/fa';

const Home = () => {
  const navigate = useNavigate();

  // Automatic time-based theme detection (Day: 6 AM - 6 PM -> Light, Night: 6 PM - 6 AM -> Dark)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lumina_theme');
    if (saved) return saved === 'dark';
    const hour = new Date().getHours();
    return !(hour >= 6 && hour < 18);
  });

  const [systemTimeStr, setSystemTimeStr] = useState('');
  const [isAutoDetected, setIsAutoDetected] = useState(() => !localStorage.getItem('lumina_theme'));

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

  return (
    <div className={`min-h-screen font-sans transition-colors duration-500 flex flex-col selection:bg-purple-600 selection:text-white relative overflow-hidden ${
      isDarkMode 
        ? 'bg-slate-950 text-slate-100' 
        : 'bg-gradient-to-br from-purple-100/90 via-purple-50/80 to-indigo-100/90 text-slate-800'
    }`}>
      
      {/* Background Dot Texture Overlay */}
      <div 
        className={`absolute inset-0 pointer-events-none -z-10 transition-opacity duration-500 ${
          isDarkMode 
            ? 'bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:28px_28px] opacity-[0.07]' 
            : 'bg-[radial-gradient(#2d1b64_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.08]'
        }`} 
      />

      {/* Ambient Lumina Purple Radial Glow Orbs */}
      <div className={`absolute top-0 left-1/4 w-[650px] h-[650px] blur-[140px] rounded-full pointer-events-none -z-10 ${
        isDarkMode ? 'bg-purple-900/25' : 'bg-purple-400/35'
      }`} />
      <div className={`absolute top-[35%] right-5 w-[550px] h-[550px] blur-[150px] rounded-full pointer-events-none -z-10 ${
        isDarkMode ? 'bg-cyan-900/20' : 'bg-indigo-300/40'
      }`} />
      <div className={`absolute bottom-10 left-1/3 w-[600px] h-[600px] blur-[160px] rounded-full pointer-events-none -z-10 ${
        isDarkMode ? 'bg-indigo-900/25' : 'bg-purple-300/35'
      }`} />

      {/* --- NAVBAR --- */}
      <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors duration-300 ${
        isDarkMode 
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
                <span className={`text-xl font-extrabold tracking-tight bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-purple-400 via-indigo-300 to-cyan-400' 
                    : 'from-purple-950 via-purple-800 to-indigo-900'
                } bg-clip-text text-transparent`}>
                  LuminaLearn
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  isDarkMode 
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
          <nav className={`hidden md:flex items-center gap-8 text-sm font-medium ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            <a href="#about" className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors">About</a>
            <a href="#features" className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors">Features</a>
            <a href="#contact" className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors">Contact Us</a>
            <a href="#founder" className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors">Founder</a>
          </nav>

          {/* Right Controls: Theme Toggle & Login Button */}
          <div className="flex items-center gap-3">
            
            {/* Theme Toggle & Time Badge */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleTheme}
                title={isAutoDetected ? `Auto-theme active (${systemTimeStr}) - Click to toggle` : 'Toggle Light/Dark Theme'}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all duration-300 cursor-pointer ${
                  isDarkMode 
                    ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800 hover:border-slate-700' 
                    : 'bg-purple-100/90 border-purple-300 text-purple-950 hover:bg-purple-200/80 shadow-2xs'
                }`}
              >
                {isDarkMode ? <FaSun className="text-yellow-400 text-sm" /> : <FaMoon className="text-purple-900 text-sm" />}
                <span className="hidden sm:inline">
                  {isDarkMode ? 'Dark' : 'Light'}
                </span>
              </button>

              {/* Time / Auto Indicator */}
              <div 
                onClick={resetToAuto} 
                className={`hidden lg:flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border cursor-pointer transition-colors ${
                  isAutoDetected 
                    ? (isDarkMode ? 'bg-purple-950/60 border-purple-800/60 text-purple-300' : 'bg-purple-100/80 border-purple-300 text-purple-900 font-semibold')
                    : (isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-purple-300' : 'bg-white border-purple-200 text-slate-700 hover:text-purple-900')
                }`}
                title="Click to reset to automatic system time theme mode"
              >
                <FaClock className="text-[10px]" />
                <span>{systemTimeStr}</span>
                {isAutoDetected && <span className="text-[9px] font-bold uppercase tracking-wider bg-purple-600/20 px-1 py-0.2 rounded">Auto</span>}
              </div>
            </div>

            {/* Login Button */}
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
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Badge */}
              <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium border backdrop-blur-md ${
                isDarkMode 
                  ? 'bg-purple-900/40 border-purple-500/30 text-purple-300' 
                  : 'bg-purple-200/70 border-purple-300 text-purple-950 shadow-xs'
              }`}>
                <FaGraduationCap className={isDarkMode ? 'text-cyan-400' : 'text-purple-800'} />
                <span>Next-Gen Institute Management System</span>
              </div>

              {/* Main Headline */}
              <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}>
                Empowering Education with <br className="hidden sm:inline" />
                <span className={`bg-gradient-to-r ${
                  isDarkMode 
                    ? 'from-cyan-400 via-indigo-300 to-purple-400' 
                    : 'from-purple-900 via-indigo-800 to-purple-700'
                } bg-clip-text text-transparent`}>
                  LuminaLearn
                </span>
              </h1>

              <h2 className={`text-xl sm:text-2xl font-semibold ${
                isDarkMode ? 'text-purple-200/90' : 'text-purple-950'
              }`}>
                Official Digital Platform of <span className={isDarkMode ? 'text-cyan-300 font-bold' : 'text-purple-800 font-extrabold'}>Kirula Education Center</span>
              </h2>

              <p className={`text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700 font-medium'
              }`}>
                A modern, comprehensive institute management portal engineered to streamline class management, student enrollments, fee payments, attendance tracking, and real-time performance analytics.
              </p>

              {/* CTA Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-purple-900 via-purple-800 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-purple-900/30 hover:shadow-purple-900/50 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <FaSignInAlt />
                  <span>Access Student & Staff Login</span>
                </button>
                <a
                  href="#about"
                  className={`w-full sm:w-auto flex items-center justify-center gap-2 font-semibold text-base px-6 py-4 rounded-xl border transition-all duration-200 ${
                    isDarkMode 
                      ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700' 
                      : 'bg-white/90 hover:bg-white text-purple-950 border-purple-300 hover:border-purple-400 shadow-md'
                  }`}
                >
                  <span>Learn More</span>
                </a>
              </div>

              {/* Key Quick Stats */}
              <div className={`pt-8 border-t grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left ${
                isDarkMode ? 'border-slate-800/80' : 'border-purple-200/80'
              }`}>
                <div>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-cyan-400' : 'text-purple-900'}`}>100%</p>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-purple-900/80'}`}>Digital Operations</p>
                </div>
                <div>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-purple-400' : 'text-indigo-900'}`}>24/7</p>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-purple-900/80'}`}>Portal Access</p>
                </div>
                <div>
                  <p className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-indigo-400' : 'text-purple-950'}`}>Smart</p>
                  <p className={`text-xs sm:text-sm mt-1 font-medium ${isDarkMode ? 'text-slate-400' : 'text-purple-900/80'}`}>Institute Portal</p>
                </div>
              </div>

            </div>

            {/* Right Card / Logo Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className={`relative w-full max-w-md p-8 rounded-3xl border backdrop-blur-xl transition-all ${
                isDarkMode 
                  ? 'bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-purple-500/20 shadow-2xl shadow-purple-950/50' 
                  : 'bg-gradient-to-b from-white via-purple-50/50 to-white border-purple-200/90 shadow-2xl shadow-purple-950/15'
              }`}>
                
                {/* Decorative glows inside card */}
                <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
                  isDarkMode ? 'bg-cyan-500/20' : 'bg-purple-300/40'
                }`} />
                <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-2xl pointer-events-none ${
                  isDarkMode ? 'bg-purple-500/20' : 'bg-indigo-300/40'
                }`} />

                <div className="flex flex-col items-center text-center space-y-6">
                  
                  {/* Logos Banner Container */}
                  <div className={`p-4 rounded-2xl border w-full flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-purple-200 shadow-inner'
                  }`}>
                    <img 
                      src="/assets/kirula_full_logo.png" 
                      alt="Kirula Full Logo" 
                      className="max-h-24 w-auto object-contain py-2"
                      onError={(e) => { e.currentTarget.src = "/assets/kirula_logo.png"; }}
                    />
                  </div>

                  <div className={`p-3.5 rounded-xl border w-full flex items-center justify-center ${
                    isDarkMode ? 'bg-slate-950/60 border-slate-800/80' : 'bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 border-purple-800 shadow-md'
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
                      Menikhinna, Kandy &bull; Excellence in Secondary & Higher Education
                    </p>
                  </div>

                  <div className={`w-full pt-4 border-t ${isDarkMode ? 'border-slate-800' : 'border-purple-200'}`}>
                    <button
                      onClick={() => navigate('/login')}
                      className={`w-full font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isDarkMode 
                          ? 'bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40' 
                          : 'bg-purple-900 hover:bg-purple-800 text-white border border-purple-800 shadow-md'
                      }`}
                    >
                      <FaSignInAlt /> Go to Portal Login
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className={`py-16 border-y relative transition-colors duration-300 ${
        isDarkMode 
          ? 'bg-slate-900/50 border-slate-800/80' 
          : 'bg-gradient-to-r from-purple-100/80 via-purple-50/90 to-indigo-100/80 border-purple-200/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className={`text-xs font-bold uppercase tracking-widest mb-2 ${
              isDarkMode ? 'text-cyan-400' : 'text-purple-800'
            }`}>About The System</h2>
            <p className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
              Welcome to <span className={`bg-gradient-to-r ${
                isDarkMode ? 'from-purple-400 to-cyan-400' : 'from-purple-900 to-indigo-800'
              } bg-clip-text text-transparent`}>LuminaLearn</span>
            </p>
            <p className={`mt-4 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-700 font-medium'}`}>
              LuminaLearn is the central institute management system created specifically for <strong className={isDarkMode ? 'text-slate-100' : 'text-purple-950'}>Kirula Education Center</strong>. Designed with state-of-the-art web technology, it seamlessly connects students, teachers, and administration into one unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-6 rounded-2xl border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-950/70 border-slate-800 hover:border-purple-500/40' 
                : 'bg-white/90 backdrop-blur-sm border-purple-200 shadow-md hover:shadow-xl hover:border-purple-400'
            }`}>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl mb-4 ${
                isDarkMode 
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

            <div className={`p-6 rounded-2xl border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-950/70 border-slate-800 hover:border-cyan-500/40' 
                : 'bg-white/90 backdrop-blur-sm border-purple-200 shadow-md hover:shadow-xl hover:border-purple-400'
            }`}>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl mb-4 ${
                isDarkMode 
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

            <div className={`p-6 rounded-2xl border transition-all duration-300 ${
              isDarkMode 
                ? 'bg-slate-950/70 border-slate-800 hover:border-indigo-500/40' 
                : 'bg-white/90 backdrop-blur-sm border-purple-200 shadow-md hover:shadow-xl hover:border-purple-400'
            }`}>
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-xl mb-4 ${
                isDarkMode 
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
            <h2 className={`text-xs font-bold uppercase tracking-widest mb-2 ${
              isDarkMode ? 'text-purple-400' : 'text-purple-800'
            }`}>Capabilities</h2>
            <p className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
              Key System Features
            </p>
            <p className={`mt-3 text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
              Everything built for Kirula Education Center students and administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className={`p-6 rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80' 
                : 'bg-white/90 backdrop-blur-xs border-purple-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
            }`}>
              <FaBookOpen className={`text-2xl mb-3 ${isDarkMode ? 'text-cyan-400' : 'text-purple-800'}`} />
              <h4 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Course Catalog</h4>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Comprehensive course list with subject details, fee structure, and teacher details.</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80' 
                : 'bg-white/90 backdrop-blur-xs border-purple-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
            }`}>
              <FaUserCheck className={`text-2xl mb-3 ${isDarkMode ? 'text-purple-400' : 'text-indigo-800'}`} />
              <h4 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Attendance System</h4>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>Instant physical and online attendance marking with search filters and reporting.</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              isDarkMode 
                ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-900/80' 
                : 'bg-white/90 backdrop-blur-xs border-purple-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
            }`}>
              <FaShieldAlt className={`text-2xl mb-3 ${isDarkMode ? 'text-indigo-400' : 'text-purple-900'}`} />
              <h4 className={`text-lg font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>Secure Sign-In</h4>
              <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>JWT authentication, Google OAuth single sign-on, and role-based route security.</p>
            </div>

            <div className={`p-6 rounded-2xl border transition-all ${
              isDarkMode 
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
      <section id="contact" className={`py-16 border-t ${
        isDarkMode 
          ? 'bg-slate-900/60 border-slate-800' 
          : 'bg-gradient-to-b from-purple-100/70 to-indigo-100/60 border-purple-200'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${
                isDarkMode 
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
                
                {/* Contact Phone */}
                <div className={`flex items-start gap-4 p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-slate-950/80 border-slate-800' 
                    : 'bg-white/90 border-purple-200 shadow-xs'
                }`}>
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-base shrink-0 mt-0.5 ${
                    isDarkMode 
                      ? 'bg-cyan-900/40 border-cyan-500/30 text-cyan-400' 
                      : 'bg-purple-100 border-purple-300 text-purple-900'
                  }`}>
                    <FaPhoneAlt />
                  </div>
                  <div>
                    <h4 className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Contact Phone</h4>
                    <p className={`text-base font-bold mt-0.5 ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>071 7577 688</p>
                  </div>
                </div>

                {/* Contact Address */}
                <div className={`flex items-start gap-4 p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-slate-950/80 border-slate-800' 
                    : 'bg-white/90 border-purple-200 shadow-xs'
                }`}>
                  <div className={`w-10 h-10 rounded-lg border flex items-center justify-center text-base shrink-0 mt-0.5 ${
                    isDarkMode 
                      ? 'bg-purple-900/40 border-purple-500/30 text-purple-400' 
                      : 'bg-indigo-100 border-indigo-300 text-indigo-900'
                  }`}>
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <h4 className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Institute Address</h4>
                    <p className={`text-sm font-semibold mt-0.5 leading-relaxed ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                      Kirula Education Center,<br />
                      621 road,<br />
                      Menikhinna,<br />
                      Kandy
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Visual Kirula Emblem / Badge Card */}
            <div className="lg:col-span-6 flex justify-center">
              <div className={`w-full max-w-lg p-8 rounded-3xl border shadow-xl text-center space-y-6 ${
                isDarkMode 
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
                  For enrollment inquiries or technical support, please contact the institute directly at <strong className="text-white">071 7577 688</strong>.
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* --- FOUNDER SHOWCASE SECTION --- */}
      <section id="founder" className={`py-20 relative ${
        isDarkMode ? 'bg-slate-950' : 'bg-gradient-to-b from-indigo-100/60 via-purple-50/70 to-indigo-100/80'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 border ${
              isDarkMode 
                ? 'bg-purple-950/80 border-purple-500/30 text-purple-300' 
                : 'bg-purple-200 border-purple-300 text-purple-950'
            }`}>
              <FaAward /> Leadership & Vision
            </div>
            <h2 className={`text-3xl sm:text-4xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
              Meet Our Founder
            </h2>
            <p className={`mt-2 text-sm sm:text-base ${isDarkMode ? 'text-slate-400' : 'text-slate-700 font-medium'}`}>
              The driving force behind Kirula Education Center & LuminaLearn
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className={`p-8 sm:p-10 rounded-3xl border backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center ${
              isDarkMode 
                ? 'bg-gradient-to-b from-slate-900/90 to-slate-950 border-purple-500/30 shadow-2xl shadow-purple-950/40' 
                : 'bg-white/95 border-purple-200/90 shadow-2xl shadow-purple-900/15'
            }`}>
              
              {/* Founder Image */}
              <div className="md:col-span-5 flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 blur opacity-40 group-hover:opacity-75 transition duration-500" />
                  <img
                    src="/assets/founder_photo.png"
                    alt="Mr. Chaminda Kumara Herath"
                    className={`relative w-64 h-64 sm:w-72 sm:h-72 object-cover object-top rounded-2xl shadow-xl border-2 ${
                      isDarkMode ? 'border-slate-800' : 'border-purple-200'
                    }`}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://ui-avatars.com/api/?name=Chaminda+Kumara+Herath&size=300&background=2d1b64&color=fff";
                    }}
                  />
                </div>
              </div>

              {/* Founder Details */}
              <div className="md:col-span-7 space-y-5 text-left">
                <div>
                  <h3 className={`text-2xl sm:text-3xl font-extrabold ${isDarkMode ? 'text-white' : 'text-purple-950'}`}>
                    Mr. Chaminda Kumara Herath
                  </h3>
                  <p className={`text-sm font-semibold mt-1 ${isDarkMode ? 'text-cyan-400' : 'text-purple-800'}`}>
                    Founder & Director &bull; Kirula Education Center
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-sm">
                  
                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-cyan-400' : 'bg-purple-100 border-purple-200 text-purple-900'
                    }`}>
                      <FaPhoneAlt className="text-xs" />
                    </div>
                    <div>
                      <span className={`text-xs block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Phone</span>
                      <a href="tel:0717577688" className={`font-bold transition-colors ${
                        isDarkMode ? 'text-white hover:text-cyan-400' : 'text-purple-950 hover:text-purple-800'
                      }`}>
                        071 7577 688
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-purple-400' : 'bg-indigo-100 border-indigo-200 text-indigo-900'
                    }`}>
                      <FaEnvelope className="text-xs" />
                    </div>
                    <div>
                      <span className={`text-xs block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Email</span>
                      <a href="mailto:ckumarah@gmail.com" className={`font-semibold transition-colors ${
                        isDarkMode ? 'text-white hover:text-purple-400' : 'text-purple-950 hover:text-purple-800'
                      }`}>
                        ckumarah@gmail.com
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 ${
                      isDarkMode ? 'bg-slate-900 border-slate-800 text-indigo-400' : 'bg-purple-100 border-purple-200 text-purple-950'
                    }`}>
                      <FaMapMarkerAlt className="text-xs" />
                    </div>
                    <div>
                      <span className={`text-xs block ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Address</span>
                      <p className={`font-medium leading-relaxed ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
                        16/2, Koongahamula,<br />
                        Menikhinna,<br />
                        Kandy
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className={`border-t py-10 mt-auto transition-colors duration-300 ${
        isDarkMode 
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
            LuminaLearn by Kirula Education Center @ 2026
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button 
              onClick={() => navigate('/login')}
              className="hover:text-cyan-300 transition-colors cursor-pointer font-semibold"
            >
              Sign In
            </button>
            <span>&bull;</span>
            <a href="#about" className="hover:text-cyan-300 transition-colors">About</a>
            <span>&bull;</span>
            <a href="#contact" className="hover:text-cyan-300 transition-colors">Contact</a>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;
