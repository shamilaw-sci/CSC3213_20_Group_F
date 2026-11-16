/**
 * @file Instructors.jsx
 * @description Instructors Directory Page. Showcases teaching faculty, biographies, subject specializations, and associated course links.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FaUserGraduate,
  FaCalendarAlt,
  FaClock,
  FaBook,
  FaSearch,
  FaSun,
  FaMoon,
  FaSignInAlt,
  FaChalkboardTeacher,
  FaFilter,
  FaInfoCircle,
  FaArrowRight,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import { INSTRUCTORS, GET_MASTER_TIMETABLE } from '../utils/instituteData';
import { useTheme } from '../context/ThemeContext';

const Instructors = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme: contextToggleTheme, setDarkMode } = useTheme();

  // Mobile menu open state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Category and Search Filter states for Instructors
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Timetable Day Filter state
  const [timetableDay, setTimetableDay] = useState('All');
  const [timetableSearch, setTimetableSearch] = useState('');

  // Scroll to timetable if hash present
  useEffect(() => {
    if (location.hash === '#timetable') {
      const el = document.getElementById('timetable');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo(0, 0);
    }
  }, [location]);

  const categories = ['All', 'Science', 'Mathematics', 'English', 'Sinhala', 'Primary'];

  const filteredInstructors = INSTRUCTORS.filter(inst => {
    const matchesCategory = selectedCategory === 'All' || inst.category === selectedCategory;
    const matchesQuery = inst.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inst.grades.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const masterTimetable = GET_MASTER_TIMETABLE();
  const filteredTimetable = masterTimetable.filter(item => {
    const matchesDay = timetableDay === 'All' || item.day === timetableDay;
    const matchesSearch = item.subject.toLowerCase().includes(timetableSearch.toLowerCase()) ||
      item.instructor.toLowerCase().includes(timetableSearch.toLowerCase()) ||
      item.grade.toLowerCase().includes(timetableSearch.toLowerCase());
    return matchesDay && matchesSearch;
  });

  const getSubjectBadgeColor = (subject) => {
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

      {/* Ambient Glows */}
      <div
        className={`absolute top-0 left-1/3 w-[600px] h-[600px] blur-[150px] rounded-full pointer-events-none -z-10 ${
          isDarkMode
            ? 'bg-purple-900/20'
            : 'bg-gradient-to-tr from-purple-200/50 via-indigo-100/40 to-sky-100/30'
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
            className="flex items-center gap-2.5 sm:gap-3.5 cursor-pointer group shrink-0"
            onClick={() => navigate('/')}
          >
            <img
              src="/assets/kirula_logo.png"
              alt="Kirula Education Center"
              className="h-9 sm:h-11 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
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
                className={`hidden sm:block text-xs font-medium ${
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
              className="text-purple-700 dark:text-cyan-400 font-bold border-b-2 border-purple-700 dark:border-cyan-400 py-1 cursor-pointer"
            >
              Instructors
            </button>
            <a
              href="#timetable"
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors"
            >
              Timetable
            </a>
            <button
              onClick={() => navigate('/about')}
              className="hover:text-purple-600 dark:hover:text-cyan-400 transition-colors cursor-pointer"
            >
              About Us
            </button>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Toggle - Desktop/tablet only */}
            <button
              onClick={toggleTheme}
              className={`hidden sm:flex p-2.5 rounded-xl border transition-all cursor-pointer ${
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
              className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-800 hover:from-purple-600 hover:to-indigo-700 text-white text-xs sm:text-sm font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl shadow-md shadow-purple-900/20 hover:shadow-purple-700/30 transition-all cursor-pointer"
            >
              <span>Portal Login</span>
              <FaSignInAlt className="text-xs" />
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
                onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>🏠 Home</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </button>
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/instructors'); }}
                className="flex items-center justify-between p-3 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold transition-colors text-left"
              >
                <span>👨‍🏫 Instructors</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </button>
              <a
                href="#timetable"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>📅 Timetable</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </a>
              <button
                onClick={() => { setIsMobileMenuOpen(false); navigate('/about'); }}
                className="flex items-center justify-between p-3 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 transition-colors text-left"
              >
                <span>🏛️ About Us</span>
                <FaArrowRight className="text-xs text-purple-500" />
              </button>
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

      {/* --- HERO BANNER --- */}
      <section className="pt-12 pb-10 text-center relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold border mb-4 ${
              isDarkMode
                ? 'bg-purple-950/80 border-purple-500/30 text-purple-300'
                : 'bg-purple-50 border-purple-200 text-purple-700 shadow-2xs'
            }`}
          >
            <FaChalkboardTeacher />
            <span>Panel of Expert Educators</span>
          </div>

          <h1
            className={`text-3xl sm:text-5xl font-extrabold tracking-tight ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}
          >
            Meet Our{' '}
            <span
              className={`bg-gradient-to-r ${
                isDarkMode
                  ? 'from-cyan-400 via-purple-300 to-indigo-400'
                  : 'from-purple-700 via-indigo-600 to-purple-900'
              } bg-clip-text text-transparent`}
            >
              Teaching Panel
            </span>
          </h1>

          <p
            className={`mt-3 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            Empowering students with dedicated guidance, deep subject
            expertise, and structured institute class schedules at Kirula
            Education Center.
          </p>

          <div className="mt-6 flex justify-center gap-4 text-xs font-bold">
            <a
              href="#instructors-list"
              className={`px-5 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
                isDarkMode
                  ? 'bg-slate-900 border-slate-800 text-purple-300 hover:bg-slate-800'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-purple-300 shadow-2xs'
              }`}
            >
              <FaUserGraduate className="text-purple-600 dark:text-purple-400" />{' '}
              View Teaching Panel
            </a>
            <a
              href="#timetable"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white shadow-md shadow-purple-900/20 transition-all flex items-center gap-2"
            >
              <FaCalendarAlt /> View Full Institute Schedule
            </a>
          </div>
        </div>
      </section>

      {/* --- INSTRUCTORS SHOWCASE LIST --- */}
      <section id="instructors-list" className="py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`p-4 rounded-2xl border mb-10 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-4 ${
              isDarkMode
                ? 'bg-slate-900/80 border-slate-800'
                : 'bg-white border-slate-200/90 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <span
                className={`text-xs font-bold uppercase tracking-wider flex items-center gap-1 mr-1 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                <FaFilter className="text-[10px]" /> Filter:
              </span>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? isDarkMode
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                        : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md shadow-purple-900/20'
                      : isDarkMode
                      ? 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                      : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-72">
              <FaSearch
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                placeholder="Search instructor or grade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none transition-all ${
                  isDarkMode
                    ? 'bg-slate-950 border-slate-800 text-white focus:border-purple-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-600 focus:bg-white'
                }`}
              />
            </div>
          </div>

          {/* Instructor Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {filteredInstructors.length > 0 ? (
              filteredInstructors.map((inst) => (
                <div
                  key={inst.id}
                  className={`rounded-3xl border overflow-hidden transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1 ${
                    isDarkMode
                      ? 'bg-gradient-to-b from-slate-900 to-slate-950 border-slate-800 hover:border-purple-500/50 shadow-xl'
                      : 'bg-white border-slate-200/90 hover:border-purple-300 shadow-md hover:shadow-xl'
                  }`}
                >
                  {/* Card Header */}
                  <div
                    className={`p-6 border-b flex items-center gap-4 relative overflow-hidden ${
                      isDarkMode
                        ? 'bg-slate-950/60 border-slate-800/80'
                        : 'bg-slate-50/70 border-slate-100'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <img
                        src={inst.photo}
                        alt={inst.name}
                        className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full object-cover shadow-md border-3 ${
                          isDarkMode
                            ? 'border-purple-500/40 bg-slate-900'
                            : 'border-purple-100 bg-white'
                        }`}
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = inst.defaultPhoto;
                        }}
                      />
                      <span
                        className="absolute bottom-0 right-0 w-5 h-5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center text-[10px] text-white"
                        title="Active Institute Faculty"
                      >
                        ✓
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <span
                        className={`inline-block text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border uppercase tracking-wider mb-1.5 ${getSubjectBadgeColor(
                          inst.subject
                        )}`}
                      >
                        {inst.subject}
                      </span>
                      <h3
                        className={`text-base sm:text-lg font-bold truncate ${
                          isDarkMode ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {inst.name}
                      </h3>
                      <p
                        className={`text-xs font-semibold ${
                          isDarkMode ? 'text-cyan-400' : 'text-purple-700'
                        }`}
                      >
                        {inst.grades}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <p
                      className={`text-xs leading-relaxed ${
                        isDarkMode ? 'text-slate-300' : 'text-slate-600'
                      }`}
                    >
                      {inst.bio}
                    </p>

                    {/* Schedule Snippets */}
                    <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-400 mb-1">
                        <span className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <FaClock className="text-purple-600 dark:text-purple-400 text-[10px]" />{' '}
                          Class Schedule:
                        </span>
                        <span className="text-[10px] bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-md font-bold">
                          {inst.schedules.length} Sessions
                        </span>
                      </div>

                      {/* Clean Scroll Container */}
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1.5 custom-scrollbar">
                        {inst.schedules.map((s, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center justify-between text-[11px] p-2.5 rounded-xl border transition-colors ${
                              isDarkMode
                                ? 'bg-slate-950/80 border-slate-800/80 hover:bg-slate-900'
                                : 'bg-slate-50/80 border-slate-100 hover:bg-purple-50/50'
                            }`}
                          >
                            <span
                              className={`font-semibold ${
                                isDarkMode ? 'text-slate-200' : 'text-slate-800'
                              }`}
                            >
                              {s.grade}
                            </span>
                            <div className="text-right">
                              <span
                                className={`font-bold mr-1.5 ${
                                  s.day === 'Saturday'
                                    ? 'text-purple-600 dark:text-cyan-400'
                                    : 'text-indigo-600 dark:text-purple-300'
                                }`}
                              >
                                {s.day}
                              </span>
                              <span
                                className={
                                  isDarkMode
                                    ? 'text-slate-400'
                                    : 'text-slate-500'
                                }
                              >
                                {s.time}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div
                    className={`p-4 border-t text-center ${
                      isDarkMode
                        ? 'bg-slate-950 border-slate-800'
                        : 'bg-slate-50/60 border-slate-100'
                    }`}
                  >
                    <a
                      href="#timetable"
                      className={`text-xs font-bold inline-flex items-center gap-1.5 hover:underline ${
                        isDarkMode
                          ? 'text-cyan-400 hover:text-cyan-300'
                          : 'text-purple-700 hover:text-purple-900'
                      }`}
                    >
                      <span>Check in Institute Timetable</span> &rarr;
                    </a>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <FaInfoCircle className="text-4xl text-slate-400 mx-auto mb-3" />
                <p
                  className={`text-base font-semibold ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  No instructors found matching "{searchQuery}" in category "
                  {selectedCategory}".
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory('All');
                    setSearchQuery('');
                  }}
                  className="mt-3 text-xs font-bold text-purple-600 dark:text-cyan-400 underline cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- INSTITUTE TIMETABLE (SCHEDULE) SECTION --- */}
      <section
        id="timetable"
        className={`py-16 border-t relative transition-colors duration-300 ${
          isDarkMode
            ? 'bg-slate-900/50 border-slate-800'
            : 'bg-slate-100/60 border-slate-200/80'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div
              className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold mb-2 border ${
                isDarkMode
                  ? 'bg-cyan-950/80 border-cyan-500/30 text-cyan-300'
                  : 'bg-purple-50 border-purple-200 text-purple-700'
              }`}
            >
              <FaCalendarAlt /> Complete Weekly Schedule
            </div>
            <h2
              className={`text-3xl sm:text-4xl font-extrabold ${
                isDarkMode ? 'text-white' : 'text-slate-900'
              }`}
            >
              Institute Timetable
            </h2>
            <p
              className={`mt-2 text-sm sm:text-base ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}
            >
              Schedule for Kirula Education Center classes
            </p>
          </div>

          <div
            className={`p-4 rounded-2xl border mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 ${
              isDarkMode
                ? 'bg-slate-950/90 border-slate-800'
                : 'bg-white border-slate-200/90 shadow-xs'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-bold mr-2 ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                Filter Day:
              </span>
              {['All', 'Saturday', 'Sunday'].map((day) => (
                <button
                  key={day}
                  onClick={() => setTimetableDay(day)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    timetableDay === day
                      ? isDarkMode
                        ? 'bg-cyan-500 text-slate-950 shadow-md'
                        : 'bg-gradient-to-r from-purple-700 to-indigo-700 text-white shadow-md shadow-purple-900/20'
                      : isDarkMode
                      ? 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      : 'bg-slate-50 text-slate-700 hover:bg-purple-50 hover:text-purple-700 border border-slate-200'
                  }`}
                >
                  {day === 'All' ? 'All Days' : day}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <FaSearch
                className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-xs ${
                  isDarkMode ? 'text-slate-400' : 'text-slate-400'
                }`}
              />
              <input
                type="text"
                placeholder="Search grade or subject..."
                value={timetableSearch}
                onChange={(e) => setTimetableSearch(e.target.value)}
                className={`w-full pl-9 pr-4 py-2 text-xs rounded-xl border focus:outline-none ${
                  isDarkMode
                    ? 'bg-slate-900 border-slate-800 text-white focus:border-cyan-500'
                    : 'bg-slate-50 border-slate-200 text-slate-800 focus:border-purple-600 focus:bg-white'
                }`}
              />
            </div>
          </div>

          <div className="sm:hidden flex items-center justify-end text-[11px] font-semibold text-purple-600 dark:text-purple-400 mb-2 px-1 gap-1">
            <span>👈 Swipe table to view full schedule 👉</span>
          </div>

          <div
            className={`rounded-3xl border overflow-hidden shadow-xl ${
              isDarkMode
                ? 'bg-slate-950 border-slate-800'
                : 'bg-white border-slate-200/90 shadow-slate-200/40'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left border-collapse">
                <thead>
                  <tr
                    className={`border-b text-xs font-extrabold uppercase tracking-wider ${
                      isDarkMode
                        ? 'bg-slate-900/90 border-slate-800 text-cyan-400'
                        : 'bg-slate-100/90 text-slate-700 border-slate-200'
                    }`}
                  >
                    <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Subject</th>
                    <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Grade / Target Group</th>
                    <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Instructor</th>
                    <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Day</th>
                    <th className="py-4 px-4 sm:px-6 whitespace-nowrap">Time Slot</th>
                    <th className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">Class Fees</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y text-xs ${
                    isDarkMode
                      ? 'divide-slate-800/80 text-slate-200'
                      : 'divide-slate-100 text-slate-700'
                  }`}
                >
                  {filteredTimetable.length > 0 ? (
                    filteredTimetable.map((row) => (
                      <tr
                        key={row.id}
                        className={`transition-colors ${
                          isDarkMode
                            ? 'hover:bg-slate-900/70'
                            : 'hover:bg-purple-50/40'
                        }`}
                      >
                        <td className="py-4 px-4 sm:px-6 font-bold whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                row.subject.includes('Science')
                                  ? 'bg-cyan-500'
                                  : row.subject.includes('Math')
                                  ? 'bg-purple-500'
                                  : row.subject.includes('English')
                                  ? 'bg-emerald-500'
                                  : row.subject.includes('Sinhala')
                                  ? 'bg-amber-500'
                                  : 'bg-pink-500'
                              }`}
                            />
                            <span className="text-slate-900 dark:text-slate-100 font-bold">
                              {row.subject}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6 font-semibold whitespace-nowrap">
                          <span
                            className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold border inline-block ${
                              isDarkMode
                                ? 'bg-slate-900 border-slate-800 text-purple-300'
                                : 'bg-purple-50 border-purple-200/70 text-purple-700'
                            }`}
                          >
                            {row.grade}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6 font-medium whitespace-nowrap">
                          <div className="flex items-center gap-2.5 whitespace-nowrap">
                            <img
                              src={row.instructorPhoto}
                              alt={row.instructor}
                              className="w-7 h-7 rounded-full object-cover border-2 border-purple-200 dark:border-purple-600/70 shadow-xs shrink-0 bg-slate-100 dark:bg-slate-800"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = row.defaultPhoto;
                              }}
                            />
                            <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                              {row.instructor}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                          <span
                            className={`font-bold px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap ${
                              row.day === 'Saturday'
                                ? isDarkMode
                                  ? 'bg-purple-950/80 text-purple-300 border border-purple-800'
                                  : 'bg-purple-50 text-purple-700 font-bold border border-purple-200/60'
                                : isDarkMode
                                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800'
                                : 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/60'
                            }`}
                          >
                            {row.day}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6 font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-white">
                            <FaClock className="text-purple-600 dark:text-purple-400 text-[10px]" />
                            <span className="whitespace-nowrap">{row.time}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right font-mono text-[11px] whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                              isDarkMode
                                ? 'bg-slate-950 border-slate-800 text-amber-400'
                                : 'bg-amber-50 border-amber-200 text-amber-800'
                            }`}
                          >
                            {row.fees}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        No classes found matching your filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div
              className={`p-4 border-t text-xs flex flex-col sm:flex-row items-center justify-between gap-2 ${
                isDarkMode
                  ? 'bg-slate-950 border-slate-800 text-slate-400'
                  : 'bg-slate-50/80 border-slate-100 text-slate-600'
              }`}
            >
              <span>
                Physical Institute venue: Kirula Education Center, 621 road,
                Menikhinna, Kandy
              </span>
              <span className="font-semibold text-purple-700 dark:text-cyan-400">
                Fee payments due on or before 7th of every month
              </span>
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
              LuminaLearn Platform &bull; Teachers & Timetable
            </span>
          </div>
          <div className="text-center text-xs font-semibold">
            LuminaLearn by Kirula Education Center @ 2026
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
              Portal Login
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Instructors;
