import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaBuilding,
  FaUserTie,
  FaPhoneAlt,
  FaEnvelope,
  FaMapMarkerAlt,
  FaClock,
  FaMoneyBillWave,
  FaQrcode,
  FaCode,
  FaSun,
  FaMoon,
  FaSignInAlt,
  FaArrowLeft,
  FaAward,
  FaShieldAlt,
  FaGraduationCap
} from 'react-icons/fa';
import { INSTITUTE_INFO } from '../utils/instituteData';
import { useTheme } from '../context/ThemeContext';

const AboutUs = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme: contextToggleTheme, setDarkMode } = useTheme();

  // Dark/Light Theme state
  const [isDarkMode, setIsDarkMode] = useState(isDark);

  useEffect(() => {
    setIsDarkMode(isDark);
  }, [isDark]);

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    setDarkMode(nextMode);
    localStorage.setItem('lumina_theme', nextMode ? 'dark' : 'light');
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

      {/* Ambient Glow Orbs */}
      <div
        className={`absolute top-0 right-1/4 w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none -z-10 ${
          isDarkMode
            ? 'bg-purple-900/20'
            : 'bg-gradient-to-tr from-purple-200/50 via-indigo-100/40 to-sky-100/30'
        }`}
      />
      <div
        className={`absolute bottom-20 left-1/4 w-[500px] h-[500px] blur-[140px] rounded-full pointer-events-none -z-10 ${
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
          <div
            className="flex items-center gap-3.5 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <img
              src="/assets/kirula_logo.png"
              alt="Kirula Education Center"
              className="h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
            <div
              className={`h-8 w-px hidden sm:block ${
                isDarkMode ? 'bg-slate-800' : 'bg-slate-200'
              }`}
            />
            <div className="flex flex-col">
              <span
                className={`text-lg font-extrabold tracking-tight bg-gradient-to-r ${
                  isDarkMode
                    ? 'from-purple-400 via-indigo-300 to-cyan-400'
                    : 'from-purple-700 via-indigo-600 to-purple-900'
                } bg-clip-text text-transparent`}
              >
                LuminaLearn
              </span>
              <span
                className={`text-xs font-medium ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Kirula Education Center
              </span>
            </div>
          </div>

          <nav
            className={`hidden md:flex items-center gap-7 text-sm font-medium ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            <button
              onClick={() => navigate('/')}
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/instructors')}
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Instructors
            </button>
            <button
              onClick={() => navigate('/instructors#timetable')}
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Timetable
            </button>
            <button
              onClick={() => navigate('/about')}
              className="text-purple-700 dark:text-cyan-400 font-bold border-b-2 border-purple-700 dark:border-cyan-400 py-1 cursor-pointer"
            >
              About Us
            </button>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-yellow-400 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-purple-300 shadow-2xs'
              }`}
              title="Toggle Light/Dark Theme"
            >
              {isDarkMode ? (
                <FaSun className="text-sm" />
              ) : (
                <FaMoon className="text-sm text-purple-600" />
              )}
            </button>

            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl shadow-md shadow-purple-900/20 hover:shadow-purple-700/30 transition-all cursor-pointer"
            >
              <span>Portal Login</span>
              <FaSignInAlt className="text-xs" />
            </button>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="pt-14 pb-12 relative text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-4 ${
              isDarkMode
                ? 'bg-purple-950/80 border-purple-500/30 text-purple-300'
                : 'bg-purple-50 border-purple-200 text-purple-700 shadow-2xs'
            }`}
          >
            <FaBuilding />
            <span>Institute Profile & Vision</span>
          </div>

          <h1
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            About{' '}
            <span
              className={`bg-gradient-to-r ${
                isDarkMode
                  ? 'from-cyan-400 via-indigo-300 to-purple-400'
                  : 'from-purple-700 via-indigo-600 to-purple-900'
              } bg-clip-text text-transparent`}
            >
              Kirula Education Center
            </span>
          </h1>

          <p
            className={`mt-4 text-base sm:text-xl max-w-3xl mx-auto leading-relaxed ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {INSTITUTE_INFO.description}
          </p>
        </div>
      </section>

      {/* --- OWNER & FOUNDER SECTION --- */}
      <section className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`p-8 sm:p-10 rounded-3xl border backdrop-blur-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center ${
              isDarkMode
                ? 'bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/40 border-slate-800 shadow-2xl'
                : 'bg-white border-slate-200/90 shadow-xl shadow-slate-200/50'
            }`}
          >
            {/* Founder Photo */}
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative group">
                <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 blur opacity-30 group-hover:opacity-70 transition duration-500" />
                <img
                  src={INSTITUTE_INFO.owner.photo}
                  alt={INSTITUTE_INFO.owner.name}
                  className={`relative w-64 h-64 sm:w-72 sm:h-72 object-cover object-top rounded-full shadow-xl border-4 ${
                    isDarkMode
                      ? 'border-purple-500/30 bg-slate-900'
                      : 'border-purple-100 bg-white'
                  }`}
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/assets/default_instructor_icon.png';
                  }}
                />
              </div>
            </div>

            {/* Founder Info */}
            <div className="lg:col-span-8 space-y-6">
              <div>
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider mb-2 ${
                    isDarkMode
                      ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                      : 'bg-purple-50 text-purple-700 border border-purple-200'
                  }`}
                >
                  <FaUserTie /> Owner & Founder
                </div>
                <h2
                  className={`text-2xl sm:text-4xl font-extrabold ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  {INSTITUTE_INFO.owner.name}
                </h2>
                <p
                  className={`text-sm font-semibold mt-1 ${
                    isDarkMode ? 'text-purple-400' : 'text-purple-700'
                  }`}
                >
                  {INSTITUTE_INFO.owner.role} &bull; Kirula Education Center
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div
                  className={`p-4 rounded-xl border flex items-center gap-3.5 ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-50/80 border-slate-100 shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 ${
                      isDarkMode
                        ? 'bg-purple-900/40 text-purple-400'
                        : 'bg-purple-50 text-purple-700'
                    }`}
                  >
                    <FaPhoneAlt />
                  </div>
                  <div>
                    <span
                      className={`text-[11px] block font-medium ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Contact Phone
                    </span>
                    <a
                      href={`tel:${INSTITUTE_INFO.owner.phone}`}
                      className={`font-bold text-sm ${
                        isDarkMode
                          ? 'text-white hover:text-cyan-400'
                          : 'text-slate-900 hover:text-purple-700'
                      }`}
                    >
                      {INSTITUTE_INFO.owner.phone}
                    </a>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border flex items-center gap-3.5 ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-50/80 border-slate-100 shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 ${
                      isDarkMode
                        ? 'bg-cyan-900/40 text-cyan-400'
                        : 'bg-indigo-50 text-indigo-700'
                    }`}
                  >
                    <FaEnvelope />
                  </div>
                  <div>
                    <span
                      className={`text-[11px] block font-medium ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Contact Email
                    </span>
                    <a
                      href={`mailto:${INSTITUTE_INFO.owner.email}`}
                      className={`font-semibold text-sm ${
                        isDarkMode
                          ? 'text-white hover:text-cyan-400'
                          : 'text-slate-900 hover:text-purple-700'
                      }`}
                    >
                      {INSTITUTE_INFO.owner.email}
                    </a>
                  </div>
                </div>

                <div
                  className={`p-4 rounded-xl border flex items-center gap-3.5 sm:col-span-2 ${
                    isDarkMode
                      ? 'bg-slate-950 border-slate-800'
                      : 'bg-slate-50/80 border-slate-100 shadow-2xs'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-base shrink-0 ${
                      isDarkMode
                        ? 'bg-amber-900/40 text-amber-400'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    <FaClock />
                  </div>
                  <div>
                    <span
                      className={`text-[11px] block font-medium ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Director Contact Hours
                    </span>
                    <p
                      className={`font-semibold text-sm ${
                        isDarkMode ? 'text-slate-200' : 'text-slate-800'
                      }`}
                    >
                      Available {INSTITUTE_INFO.owner.hours}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LOCATION & POLICIES GRID --- */}
      <section
        className={`py-14 border-y transition-colors ${
          isDarkMode
            ? 'bg-slate-900/50 border-slate-800'
            : 'bg-slate-100/60 border-slate-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Institute Address */}
            <div
              className={`p-7 rounded-2xl border flex flex-col justify-between ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-white border-slate-200/90 shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 ${
                    isDarkMode
                      ? 'bg-purple-900/40 text-purple-400'
                      : 'bg-purple-50 text-purple-700'
                  }`}
                >
                  <FaMapMarkerAlt />
                </div>
                <h3
                  className={`text-xl font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Institute Address
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {INSTITUTE_INFO.address.line1}
                  <br />
                  {INSTITUTE_INFO.address.street},<br />
                  {INSTITUTE_INFO.address.city},{' '}
                  {INSTITUTE_INFO.address.district}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-purple-700 dark:text-cyan-400">
                Inquiries: {INSTITUTE_INFO.contact.phone}
              </div>
            </div>

            {/* Fees Policy */}
            <div
              className={`p-7 rounded-2xl border flex flex-col justify-between ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-white border-slate-200/90 shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 ${
                    isDarkMode
                      ? 'bg-emerald-900/40 text-emerald-400'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}
                >
                  <FaMoneyBillWave />
                </div>
                <h3
                  className={`text-xl font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Admission & Fees Policy
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {INSTITUTE_INFO.policies.admissionAndFees}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                Support: {INSTITUTE_INFO.contact.supportEmail}
              </div>
            </div>

            {/* Attendance Policy */}
            <div
              className={`p-7 rounded-2xl border flex flex-col justify-between ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800'
                  : 'bg-white border-slate-200/90 shadow-sm hover:shadow-md'
              }`}
            >
              <div>
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl mb-4 ${
                    isDarkMode
                      ? 'bg-cyan-900/40 text-cyan-400'
                      : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  <FaQrcode />
                </div>
                <h3
                  className={`text-xl font-bold mb-2 ${
                    isDarkMode ? 'text-white' : 'text-slate-900'
                  }`}
                >
                  Attendance Policy
                </h3>
                <p
                  className={`text-sm leading-relaxed ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {INSTITUTE_INFO.policies.attendance}
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 text-xs font-semibold text-indigo-700 dark:text-cyan-400">
                Smart Barcode & QR Counters
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- DEVELOPMENT TEAM CREDITS SECTION --- */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2 border ${
                isDarkMode
                  ? 'bg-purple-950/80 border-purple-500/30 text-purple-300'
                  : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              <FaCode /> Software Development Team
            </div>
            <h2
              className={`text-2xl sm:text-4xl font-extrabold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              LuminaLearn Engineering Team
            </h2>
            <p
              className={`mt-2 text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Designed and developed for Kirula Education Center
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INSTITUTE_INFO.developers.map((dev, idx) => (
              <div
                key={idx}
                className={`p-6 rounded-2xl border transition-all duration-300 text-center flex flex-col justify-between ${
                  isDarkMode
                    ? 'bg-slate-900/70 border-slate-800 hover:border-purple-500/40'
                    : 'bg-white border-slate-200/90 shadow-sm hover:shadow-lg hover:border-purple-300'
                }`}
              >
                <div>
                  <div
                    className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center font-bold text-lg mb-3 ${
                      isDarkMode
                        ? 'bg-purple-950 text-purple-300 border border-purple-800'
                        : 'bg-gradient-to-tr from-purple-700 to-indigo-600 text-white shadow-xs'
                    }`}
                  >
                    {dev.name.charAt(0)}
                  </div>
                  <h4
                    className={`font-bold text-base ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {dev.name}
                  </h4>
                  <p
                    className={`text-xs font-semibold mt-0.5 ${
                      isDarkMode ? 'text-cyan-400' : 'text-purple-700'
                    }`}
                  >
                    {dev.role}
                  </p>
                </div>
                <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <a
                    href={`mailto:${dev.email}`}
                    className={`truncate block hover:underline font-mono text-[11px] ${
                      isDarkMode
                        ? 'text-slate-400 hover:text-cyan-300'
                        : 'text-slate-600 hover:text-purple-700'
                    }`}
                  >
                    {dev.email}
                  </a>
                </div>
              </div>
            ))}
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
              LuminaLearn Portal &bull; About Us
            </span>
          </div>
          <div className="text-center text-xs font-semibold">
            {INSTITUTE_INFO.copyright}
          </div>
          <div className="flex items-center gap-4 text-xs">
            <button
              onClick={() => navigate('/')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Home
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigate('/instructors')}
              className="hover:text-cyan-300 transition-colors cursor-pointer"
            >
              Instructors
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigate('/login')}
              className="hover:text-cyan-300 transition-colors cursor-pointer font-semibold"
            >
              Portal Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutUs;
