import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaSearch,
  FaTimes,
  FaSpinner,
  FaBookOpen,
  FaChalkboardTeacher,
  FaUserGraduate,
  FaVideo,
  FaFilePdf,
  FaAward,
  FaClipboardCheck,
  FaArrowRight,
  FaHistory,
  FaTrashAlt,
  FaCalendarCheck,
  FaCreditCard,
  FaChartBar,
  FaUsers,
  FaUserPlus,
  FaPlusCircle,
  FaSms,
  FaCog,
  FaHome
} from 'react-icons/fa';
import api from '../utils/api';
import { getMediaUrl } from '../utils/mediaUrl';

const getImageUrl = (url) => getMediaUrl(url);

const getActionIcon = (iconName) => {
  switch (iconName) {
    case 'FaHome': return <FaHome className="text-purple-500" />;
    case 'FaBook': return <FaBookOpen className="text-indigo-500" />;
    case 'FaCalendarCheck': return <FaCalendarCheck className="text-emerald-500" />;
    case 'FaCreditCard': return <FaCreditCard className="text-amber-500" />;
    case 'FaChartBar': return <FaChartBar className="text-cyan-500" />;
    case 'FaUsers': return <FaUsers className="text-blue-500" />;
    case 'FaUserPlus': return <FaUserPlus className="text-teal-500" />;
    case 'FaPlusCircle': return <FaPlusCircle className="text-purple-600" />;
    case 'FaSms': return <FaSms className="text-amber-600" />;
    case 'FaCog': return <FaCog className="text-slate-500" />;
    case 'FaChalkboardTeacher': return <FaChalkboardTeacher className="text-purple-600" />;
    default: return <FaArrowRight className="text-purple-500" />;
  }
};

const GlobalSearchBar = ({ onSelectTeacher, onSelectStudent }) => {
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Search Results State
  const [results, setResults] = useState({
    courses: [],
    teachers: [],
    students: [],
    lessons: [],
    quizzes: [],
    assignments: [],
    quickActions: [],
    totalResults: 0
  });

  // Recent Searches State
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem('lumina_recent_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role || 'student';

  // Save item to recent searches
  const saveRecentSearch = (item) => {
    try {
      const entry = {
        id: item._id || item.id || item.link,
        title: item.title || item.name,
        type: item.type || 'action',
        subTitle: item.subTitle || item.department || item.grade || item.category || '',
        link: item.link || '',
        rawItem: item
      };

      setRecentSearches(prev => {
        const filtered = prev.filter(r => r.id !== entry.id && r.title !== entry.title);
        const updated = [entry, ...filtered].slice(0, 8);
        localStorage.setItem('lumina_recent_searches', JSON.stringify(updated));
        return updated;
      });
    } catch (err) {
      console.error("Save recent search error:", err);
    }
  };

  const removeRecentSearch = (e, id) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(r => r.id !== id);
      localStorage.setItem('lumina_recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const clearAllRecentSearches = (e) => {
    e.stopPropagation();
    setRecentSearches([]);
    localStorage.removeItem('lumina_recent_searches');
  };

  // Perform search fetch with debounce
  useEffect(() => {
    if (!query.trim()) {
      setResults({
        courses: [],
        teachers: [],
        students: [],
        lessons: [],
        quizzes: [],
        assignments: [],
        quickActions: [],
        totalResults: 0
      });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/search?q=${encodeURIComponent(query.trim())}&type=${activeCategory}`);
        if (res.data) {
          setResults(res.data);
        }
      } catch (err) {
        console.error("Search API error:", err);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query, activeCategory]);

  // Global Keyboard Shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click Outside Listener
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Flattened results for keyboard navigation
  const getFlattenedResults = useCallback(() => {
    if (!query.trim()) {
      return recentSearches.map(r => ({ ...r, isRecent: true }));
    }
    const items = [];
    if (results.quickActions?.length) items.push(...results.quickActions.map(i => ({ ...i, resultType: 'action' })));
    if (results.courses?.length) items.push(...results.courses.map(i => ({ ...i, resultType: 'course' })));
    if (results.teachers?.length) items.push(...results.teachers.map(i => ({ ...i, resultType: 'teacher' })));
    if (results.students?.length) items.push(...results.students.map(i => ({ ...i, resultType: 'student' })));
    if (results.lessons?.length) items.push(...results.lessons.map(i => ({ ...i, resultType: 'lesson' })));
    if (results.quizzes?.length) items.push(...results.quizzes.map(i => ({ ...i, resultType: 'quiz' })));
    if (results.assignments?.length) items.push(...results.assignments.map(i => ({ ...i, resultType: 'assignment' })));
    return items;
  }, [query, results, recentSearches]);

  // Handle Item Selection / Click
  const handleItemSelect = (item) => {
    saveRecentSearch(item);
    setIsOpen(false);
    setQuery('');

    // If it's a recent search item wrapper
    const target = item.rawItem || item;

    if (target.type === 'teacher' || target.resultType === 'teacher') {
      if (onSelectTeacher) {
        onSelectTeacher(target);
      } else {
        navigate('/instructors');
      }
      return;
    }

    if (target.type === 'student' || target.resultType === 'student') {
      if (onSelectStudent) {
        onSelectStudent(target._id || target.id);
      } else {
        navigate('/manage-users');
      }
      return;
    }

    if (target.link) {
      navigate(target.link);
    }
  };

  // Keyboard navigation through search results
  const handleInputKeyDown = (e) => {
    const flattened = getFlattenedResults();
    if (!flattened.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < flattened.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : flattened.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex >= 0 && highlightedIndex < flattened.length) {
        handleItemSelect(flattened[highlightedIndex]);
      } else if (flattened.length > 0) {
        handleItemSelect(flattened[0]);
      }
    }
  };

  const hasAnyResults = results.totalResults > 0;
  const categories = [
    { id: 'all', label: 'All Results' },
    { id: 'courses', label: 'Courses' },
    { id: 'teachers', label: 'Instructors' },
    ...(role === 'admin' || role === 'teacher' || role === 'counter_staff' ? [{ id: 'students', label: 'Students' }] : []),
    { id: 'lessons', label: 'Lessons' }
  ];

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl mx-4 min-w-[220px]">
      {/* Search Input Box */}
      <div className="relative group">
        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors pointer-events-none">
          {loading ? (
            <FaSpinner className="animate-spin text-purple-600 dark:text-purple-400" />
          ) : (
            <FaSearch />
          )}
        </span>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleInputKeyDown}
          placeholder="Search courses, teachers, lessons, students..."
          className="w-full py-2.5 pl-10 pr-20 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 dark:text-white dark:placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 transition-all text-sm shadow-xs"
        />

        {/* Clear Button or Ctrl+K shortcut indicator */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 gap-1.5">
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition cursor-pointer"
              title="Clear search"
            >
              <FaTimes className="text-xs" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-bold text-gray-400 dark:text-slate-400 bg-gray-200/70 dark:bg-slate-700/70 rounded-md border border-gray-300 dark:border-slate-600 shadow-2xs">
              <span className="text-xs">⌘</span>K
            </kbd>
          )}
        </div>
      </div>

      {/* Floating Dropdown Results Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden z-50 animate-fadeIn max-h-[80vh] flex flex-col">
          
          {/* Filter Categories Bar (When querying) */}
          {query.trim() && (
            <div className="p-2 border-b border-gray-100 dark:border-slate-800 bg-gray-50/80 dark:bg-slate-800/80 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                    activeCategory === cat.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Results Scroll Area */}
          <div className="overflow-y-auto p-3 space-y-4 flex-1 custom-scrollbar">
            
            {/* 1. ZERO-STATE / EMPTY QUERY: RECENT SEARCHES & QUICK ACTIONS */}
            {!query.trim() && (
              <div className="space-y-4">
                {recentSearches.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2 mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 flex items-center gap-1.5">
                        <FaHistory /> Recent Searches
                      </span>
                      <button
                        onClick={clearAllRecentSearches}
                        className="text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <FaTrashAlt className="text-[9px]" /> Clear all
                      </button>
                    </div>

                    <div className="space-y-1">
                      {recentSearches.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          onClick={() => handleItemSelect(item)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/70 dark:hover:bg-slate-800/80 cursor-pointer transition group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-purple-600 dark:text-purple-400 text-xs">🕒</span>
                            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{item.title}</span>
                            {item.subTitle && (
                              <span className="text-[10px] text-gray-400 dark:text-slate-500 truncate hidden sm:inline">
                                • {item.subTitle}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={(e) => removeRecentSearch(e, item.id)}
                            className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition cursor-pointer"
                            title="Remove from history"
                          >
                            <FaTimes className="text-xs" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommended Quick Shortcuts */}
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500 px-2 mb-2 block">
                    ⚡ Recommended Shortcuts
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div
                      onClick={() => { navigate('/courses'); setIsOpen(false); }}
                      className="p-3 rounded-xl bg-purple-50/60 dark:bg-slate-800/60 hover:bg-purple-100/70 dark:hover:bg-slate-800 border border-purple-100 dark:border-slate-700 cursor-pointer transition flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-sm">
                        📚
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-gray-900 dark:text-white">Courses Catalog</h5>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Browse subject streams</p>
                      </div>
                    </div>

                    <div
                      onClick={() => { navigate('/instructors'); setIsOpen(false); }}
                      className="p-3 rounded-xl bg-blue-50/60 dark:bg-slate-800/60 hover:bg-blue-100/70 dark:hover:bg-slate-800 border border-blue-100 dark:border-slate-700 cursor-pointer transition flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold text-sm">
                        👨‍🏫
                      </div>
                      <div>
                        <h5 className="text-xs font-black text-gray-900 dark:text-white">Teaching Faculty</h5>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">Teacher profiles & timetable</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. SEARCH RESULTS CATEGORIES */}
            {query.trim() && (
              <>
                {/* QUICK ACTIONS */}
                {results.quickActions && results.quickActions.length > 0 && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 px-2 mb-1.5 block">
                      ⚡ Quick Actions
                    </span>
                    <div className="space-y-1">
                      {results.quickActions.map((act) => (
                        <div
                          key={act.id}
                          onClick={() => handleItemSelect(act)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800/90 cursor-pointer transition border border-transparent hover:border-purple-200 dark:hover:border-slate-700"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-xs shrink-0">
                              {getActionIcon(act.icon)}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">{act.title}</h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{act.description}</p>
                            </div>
                          </div>
                          <FaArrowRight className="text-gray-400 text-xs shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* COURSES */}
                {results.courses && results.courses.length > 0 && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 px-2 mb-1.5 block">
                      📚 Courses ({results.courses.length})
                    </span>
                    <div className="space-y-1.5">
                      {results.courses.map((course) => (
                        <div
                          key={course._id}
                          onClick={() => handleItemSelect(course)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800/90 cursor-pointer transition border border-gray-100 dark:border-slate-800 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-purple-100 dark:bg-slate-800 border border-purple-200 dark:border-slate-700">
                              {course.cardImage || course.banner ? (
                                <img
                                  src={getImageUrl(course.cardImage || course.banner)}
                                  alt={course.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-purple-700 font-bold">
                                  <FaBookOpen />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-gray-900 dark:text-white truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                                {course.title}
                              </h5>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                                <span className="font-semibold text-purple-700 dark:text-purple-300">🎓 {course.grades}</span>
                                {course.instructor && (
                                  <span className="truncate">👨‍🏫 {course.instructor.name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-md shrink-0">
                            View Course
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TEACHERS / INSTRUCTORS */}
                {results.teachers && results.teachers.length > 0 && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 px-2 mb-1.5 block">
                      👨‍🏫 Teaching Faculty ({results.teachers.length})
                    </span>
                    <div className="space-y-1.5">
                      {results.teachers.map((teacher) => (
                        <div
                          key={teacher._id}
                          onClick={() => handleItemSelect(teacher)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800/90 cursor-pointer transition border border-gray-100 dark:border-slate-800 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-purple-300 dark:border-purple-700 bg-white dark:bg-slate-800">
                              {teacher.profilePicture ? (
                                <img
                                  src={getImageUrl(teacher.profilePicture)}
                                  alt={teacher.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.target.style.display = 'none'; }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-800 text-white font-black text-sm">
                                  {teacher.name ? teacher.name.charAt(0) : '?'}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-gray-900 dark:text-white truncate group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                                {teacher.name}
                              </h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                {teacher.department || 'Academic Faculty'} {teacher.phoneNumber ? `• ${teacher.phoneNumber}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-2 py-0.5 rounded-md shrink-0">
                            View Profile
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STUDENTS (Admin & Staff) */}
                {results.students && results.students.length > 0 && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 px-2 mb-1.5 block">
                      🎓 Student Admissions ({results.students.length})
                    </span>
                    <div className="space-y-1.5">
                      {results.students.map((student) => (
                        <div
                          key={student._id}
                          onClick={() => handleItemSelect(student)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-emerald-50/60 dark:hover:bg-slate-800/90 cursor-pointer transition border border-gray-100 dark:border-slate-800 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-xs shrink-0">
                              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-gray-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400">
                                {student.name}
                              </h5>
                              <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                                <span>Reg: <strong className="font-mono">{student.registrationNumber}</strong></span>
                                <span>• {student.grade}</span>
                              </div>
                            </div>
                          </div>
                          <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md shrink-0">
                            View Student
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* LESSONS & MATERIALS */}
                {results.lessons && results.lessons.length > 0 && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-cyan-700 dark:text-cyan-400 px-2 mb-1.5 block">
                      📖 Lessons & Study Materials ({results.lessons.length})
                    </span>
                    <div className="space-y-1.5">
                      {results.lessons.map((lesson) => (
                        <div
                          key={lesson._id}
                          onClick={() => handleItemSelect(lesson)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-slate-800/90 cursor-pointer transition border border-gray-100 dark:border-slate-800 group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 flex items-center justify-center text-xs shrink-0">
                              {lesson.type === 'lesson_video' ? <FaVideo /> : <FaFilePdf />}
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">{lesson.title}</h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                {lesson.courseTitle} • {lesson.subTitle}
                              </p>
                            </div>
                          </div>
                          <FaArrowRight className="text-gray-400 text-xs shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* QUIZZES & ASSIGNMENTS */}
                {((results.quizzes && results.quizzes.length > 0) || (results.assignments && results.assignments.length > 0)) && (
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 px-2 mb-1.5 block">
                      🏆 Assessments & Quizzes
                    </span>
                    <div className="space-y-1.5">
                      {(results.quizzes || []).map((quiz) => (
                        <div
                          key={quiz._id}
                          onClick={() => handleItemSelect(quiz)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-amber-50/50 dark:hover:bg-slate-800/90 cursor-pointer transition border border-gray-100 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs shrink-0">
                              <FaAward />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">{quiz.title}</h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                Quiz • {quiz.courseTitle} • {quiz.grade}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md shrink-0">
                            Open
                          </span>
                        </div>
                      ))}

                      {(results.assignments || []).map((asgn) => (
                        <div
                          key={asgn._id}
                          onClick={() => handleItemSelect(asgn)}
                          className="flex items-center justify-between p-2.5 rounded-xl hover:bg-purple-50/50 dark:hover:bg-slate-800/90 cursor-pointer transition border border-gray-100 dark:border-slate-800"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xs shrink-0">
                              <FaClipboardCheck />
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">{asgn.title}</h5>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                Assignment • {asgn.courseTitle} • {asgn.grade}
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-2 py-0.5 rounded-md shrink-0">
                            Open
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* NO RESULTS FOUND */}
                {!loading && !hasAnyResults && (
                  <div className="p-8 text-center text-gray-400 dark:text-gray-500 space-y-2">
                    <FaSearch className="text-3xl mx-auto text-gray-300 dark:text-slate-600" />
                    <p className="text-xs font-semibold">No results found for "{query}".</p>
                    <p className="text-[10px]">Try searching by course title, teacher name, grade or topic.</p>
                  </div>
                )}
              </>
            )}

          </div>

          {/* Footer Guide Bar */}
          <div className="p-2.5 px-4 bg-gray-50 dark:bg-slate-800/90 border-t border-gray-100 dark:border-slate-800 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-[10px] font-mono font-bold">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-[10px] font-mono font-bold">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-[10px] font-mono font-bold">↵</kbd>
                <span>Select</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-slate-700 rounded text-[10px] font-mono font-bold">Esc</kbd>
                <span>Close</span>
              </span>
            </div>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">LuminaLearn Search</span>
          </div>

        </div>
      )}
    </div>
  );
};

export default GlobalSearchBar;
