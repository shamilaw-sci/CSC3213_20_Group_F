/**
 * @file LiveViewersModal.jsx
 * @description Live Viewers Modal. Displays the real-time roster of active student participants currently watching an ongoing live lecture.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FaUserGraduate, 
  FaTimes, 
  FaSearch, 
  FaCalendarCheck, 
  FaClock, 
  FaSync,
  FaUsers,
  FaTv,
  FaHourglassHalf,
  FaChartLine,
  FaUserCheck,
  FaCheck
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import StudentProfileModal from './StudentProfileModal';
import { getMediaUrl } from '../utils/mediaUrl';
import { useTheme } from '../context/ThemeContext';

const formatSeconds = (sec) => {
  if (!sec || isNaN(sec) || sec <= 0) return '0s';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  }
  if (m > 0) {
    return `${m}m ${s}s`;
  }
  return `${s}s`;
};

const formatHoursDecimal = (sec) => {
  if (!sec || isNaN(sec) || sec <= 0) return '0.0 hrs';
  const hrs = sec / 3600;
  if (hrs < 0.1) {
    const mins = Math.round(sec / 60);
    return `${mins} min${mins === 1 ? '' : 's'}`;
  }
  return `${hrs.toFixed(1)} hrs`;
};

const formatGrade = (grade) => {
  if (!grade) return '';
  const gStr = String(grade).trim();
  if (gStr.toLowerCase().startsWith('grade')) {
    return gStr.replace(/^grade\s*/i, 'Grade ');
  }
  return `Grade ${gStr}`;
};

const LiveViewersModal = ({ isOpen, onClose, lessonId, streamTitle, grade }) => {
  const { isDark } = useTheme();
  const [activeViewers, setActiveViewers] = useState([]);
  const [allViewers, setAllViewers] = useState([]);
  const [statsData, setStatsData] = useState({
    totalWatchedSeconds: 0,
    totalWatchedHours: 0,
    averageWatchedSeconds: 0,
    streamDurationSeconds: 0,
    startedAt: null,
    endedAt: null
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active' | 'high'
  const [isRecordingAttendance, setIsRecordingAttendance] = useState(false);
  const [inspectStudent, setInspectStudent] = useState(null);

  const fetchViewers = useCallback(async (isInitial = false) => {
    if (!lessonId) return;
    if (isInitial) setLoading(true);
    try {
      const res = await api.get(`/lessons/${lessonId}/live-stream/viewers`);
      setActiveViewers(res.data.activeViewers || []);
      setAllViewers(res.data.allViewers || []);
      setStatsData({
        totalWatchedSeconds: res.data.totalWatchedSeconds || 0,
        totalWatchedHours: res.data.totalWatchedHours || 0,
        averageWatchedSeconds: res.data.averageWatchedSeconds || 0,
        streamDurationSeconds: res.data.streamDurationSeconds || 0,
        startedAt: res.data.startedAt,
        endedAt: res.data.endedAt
      });
    } catch (err) {
      console.error("Failed to fetch live viewers:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (isOpen) {
      fetchViewers(true);
      const interval = setInterval(() => fetchViewers(false), 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchViewers]);

  const activeViewerIds = useMemo(() => {
    return new Set(activeViewers.map(v => (v.studentId || v.student?._id || v.student || '').toString()));
  }, [activeViewers]);

  const totalWatchedSec = useMemo(() => {
    if (statsData.totalWatchedSeconds) return statsData.totalWatchedSeconds;
    return allViewers.reduce((acc, v) => acc + (v.watchedSeconds || 0), 0);
  }, [statsData.totalWatchedSeconds, allViewers]);

  const avgWatchedSec = useMemo(() => {
    if (statsData.averageWatchedSeconds) return statsData.averageWatchedSeconds;
    if (allViewers.length === 0) return 0;
    return Math.round(totalWatchedSec / allViewers.length);
  }, [statsData.averageWatchedSeconds, totalWatchedSec, allViewers]);

  // Max watched seconds among viewers to use as benchmark if stream duration is missing
  const maxWatchedSec = useMemo(() => {
    return allViewers.reduce((max, v) => Math.max(max, v.watchedSeconds || 0), 0) || 1;
  }, [allViewers]);

  const sessionDurationSec = useMemo(() => {
    if (statsData.streamDurationSeconds > 0) {
      return Math.max(statsData.streamDurationSeconds, maxWatchedSec);
    }
    return maxWatchedSec;
  }, [statsData.streamDurationSeconds, maxWatchedSec]);

  const filteredViewers = useMemo(() => {
    let baseList = allViewers;
    if (filterMode === 'active') {
      baseList = activeViewers;
    } else if (filterMode === 'high') {
      baseList = allViewers.filter(v => {
        const pct = sessionDurationSec > 0 ? ((v.watchedSeconds || 0) / sessionDurationSec) * 100 : 0;
        return pct >= 50;
      });
    }

    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter(v => (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      (v.registrationNumber && v.registrationNumber.toLowerCase().includes(q)) ||
      (v.grade && v.grade.toLowerCase().includes(q))
    ));
  }, [filterMode, activeViewers, allViewers, searchQuery, sessionDurationSec]);

  const handleRecordLiveAttendance = async () => {
    if (!lessonId) return;
    setIsRecordingAttendance(true);
    try {
      const res = await api.post(`/lessons/${lessonId}/live-stream/record-attendance`, {
        minWatchMinutes: 0
      });
      toast.success(res.data.message || "Attendance logged successfully for all live viewers!");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to log live attendance.");
    } finally {
      setIsRecordingAttendance(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none"
    >
      <div className={`relative w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-purple-200/90 text-slate-900'
      }`}>
        
        {/* Top Accent Gradient Line */}
        <div className="h-2 w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 shrink-0" />

        {/* Modern Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 text-xl sm:text-2xl shadow-inner shrink-0">
              <FaUserGraduate />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Live Stream Summary & Viewers
                </h3>
                {activeViewers.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/50 text-emerald-300 font-extrabold text-[10.5px] flex items-center gap-1.5 shadow-2xs animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    <span>{activeViewers.length} Watching Live</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 border border-white/20 text-purple-200 font-bold text-[10.5px]">
                    Session Concluded
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200 font-medium truncate mt-0.5">
                {formatGrade(grade)} • {streamTitle || 'Live Class Session'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={() => fetchViewers(true)}
              disabled={loading}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition cursor-pointer shadow-inner"
              title="Refresh Viewers & Statistics"
            >
              <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/15 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center transition cursor-pointer shadow-inner"
              title="Close Modal"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>

        {/* 4-Card Summary Analytics Strip */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5 p-3.5 sm:p-4 border-b shrink-0 ${
          isDark ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50/80 border-slate-200/80'
        }`}>
          
          {/* Card 1: Total Students */}
          <div className={`p-4 rounded-2xl border shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
            isDark 
              ? 'bg-gradient-to-br from-purple-950/40 via-slate-900 to-slate-900 border-purple-800/60 text-slate-100 hover:border-purple-500/80 hover:shadow-purple-950/40' 
              : 'bg-gradient-to-br from-purple-50/90 via-white to-purple-50/40 border-purple-200 text-slate-900 hover:border-purple-300 hover:shadow-purple-100'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400 tracking-wide">
                Students Watched
              </span>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-xs shrink-0 shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform">
                <FaUsers />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="block text-2xl sm:text-3xl font-black text-purple-950 dark:text-white tracking-tight leading-none">
                {allViewers.length}
              </span>
              <span className="block text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                {allViewers.length === 1 ? '1 student total' : `${allViewers.length} students total`}
              </span>
            </div>
          </div>

          {/* Card 2: Total Watched Time */}
          <div className={`p-4 rounded-2xl border shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
            isDark 
              ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-800/60 text-slate-100 hover:border-amber-500/80 hover:shadow-amber-950/40' 
              : 'bg-gradient-to-br from-amber-50/90 via-white to-amber-50/40 border-amber-200 text-slate-900 hover:border-amber-300 hover:shadow-amber-100'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400 tracking-wide">
                Total Watch Time
              </span>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-xs shrink-0 shadow-md shadow-amber-500/30 group-hover:scale-105 transition-transform">
                <FaClock />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="block text-2xl sm:text-3xl font-black text-amber-500 dark:text-amber-400 tracking-tight leading-none">
                {formatSeconds(totalWatchedSec)}
              </span>
              <span className="block text-[11px] font-semibold text-amber-700/90 dark:text-amber-400/90">
                {(totalWatchedSec / 3600).toFixed(1)} hrs total
              </span>
            </div>
          </div>

          {/* Card 3: Avg Watch per Student */}
          <div className={`p-4 rounded-2xl border shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
            isDark 
              ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-800/60 text-slate-100 hover:border-emerald-500/80 hover:shadow-emerald-950/40' 
              : 'bg-gradient-to-br from-emerald-50/90 via-white to-emerald-50/40 border-emerald-200 text-slate-900 hover:border-emerald-300 hover:shadow-emerald-100'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400 tracking-wide">
                Avg Watch Time
              </span>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs shrink-0 shadow-md shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                <FaChartLine />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="block text-2xl sm:text-3xl font-black text-emerald-500 dark:text-emerald-400 tracking-tight leading-none">
                {formatSeconds(avgWatchedSec)}
              </span>
              <span className="block text-[11px] font-semibold text-emerald-700/90 dark:text-emerald-400/90">
                {sessionDurationSec > 0 ? `${Math.min(100, Math.round((avgWatchedSec / sessionDurationSec) * 100))}% avg completion` : 'Per student avg'}
              </span>
            </div>
          </div>

          {/* Card 4: Session Duration */}
          <div className={`p-4 rounded-2xl border shadow-xs hover:shadow-lg transition-all duration-200 flex flex-col justify-between gap-2.5 group ${
            isDark 
              ? 'bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-800/60 text-slate-100 hover:border-indigo-500/80 hover:shadow-indigo-950/40' 
              : 'bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 border-indigo-200 text-slate-900 hover:border-indigo-300 hover:shadow-indigo-100'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-400 dark:text-slate-400 tracking-wide">
                Class Duration
              </span>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-blue-600 text-white flex items-center justify-center text-xs shrink-0 shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
                <FaHourglassHalf />
              </div>
            </div>
            <div className="space-y-0.5">
              <span className="block text-2xl sm:text-3xl font-black text-indigo-500 dark:text-indigo-400 tracking-tight leading-none">
                {formatSeconds(sessionDurationSec)}
              </span>
              <span className="block text-[11px] font-semibold text-indigo-700/90 dark:text-indigo-400/90">
                Full broadcast duration
              </span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs & Search Box */}
        <div className={`p-3 sm:p-4 pb-2 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
        }`}>
          <div className={`flex items-center gap-1.5 p-1 rounded-2xl shrink-0 flex-wrap ${
            isDark ? 'bg-slate-800/90' : 'bg-slate-100/80'
          }`}>
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all' 
                  ? 'bg-purple-900 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60')
              }`}
            >
              All Students ({allViewers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('high')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'high' 
                  ? 'bg-indigo-700 text-white shadow-xs' 
                  : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60')
              }`}
            >
              ≥50% Watched
            </button>
            {activeViewers.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterMode('active')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  filterMode === 'active' 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : (isDark ? 'text-slate-400 hover:text-white hover:bg-slate-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60')
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active Live ({activeViewers.length})</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or Reg No..."
              className={`w-full rounded-xl border pl-8 pr-7 py-2 text-xs font-medium transition outline-none ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-purple-500' 
                  : 'border-slate-200 bg-slate-50/80 text-slate-900 placeholder-slate-400 focus:border-purple-600 focus:bg-white'
              }`}
            />
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Viewer List Container */}
        <div className={`flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[240px] max-h-[420px] custom-scrollbar ${
          isDark ? 'bg-slate-950/40' : 'bg-slate-50/50'
        }`}>
          {filteredViewers.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-400 select-none">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-xs border ${
                isDark ? 'bg-slate-800 border-slate-700 text-purple-400' : 'bg-purple-50 border-purple-100 text-purple-600'
              }`}>
                👥
              </div>
              <p className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {searchQuery ? `No students found matching "${searchQuery}"` : "No student viewers recorded for this live class."}
              </p>
              <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                As students attend the live stream, their watch hours and attendance metrics are tracked here.
              </p>
            </div>
          ) : (
            filteredViewers.map((viewer, index) => {
              const viewerId = viewer.studentId || (viewer.student?._id || viewer.student || '').toString();
              const isCurrentlyActive = activeViewerIds.has(viewerId) || viewer.isLivelyWatching;
              const watchSec = viewer.watchedSeconds || 0;
              const watchPercent = sessionDurationSec > 0 
                ? Math.min(100, Math.round((watchSec / sessionDurationSec) * 100))
                : 100;
              const rawPic = viewer.profilePicture || viewer.avatar || viewer.student?.profilePicture || viewer.student?.avatar || '';
              const avatarUrl = getMediaUrl(rawPic);

              return (
                <div
                  key={viewer._id || viewerId || index}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all duration-200 space-y-2 group ${
                    isDark 
                      ? 'border-slate-800 bg-slate-900/90 hover:border-purple-500/80 hover:bg-slate-850 shadow-xs' 
                      : 'border-slate-200/90 bg-white hover:border-purple-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    {/* Student Identity Clickable to open Profile */}
                    <div 
                      onClick={() => {
                        setInspectStudent({
                          studentId: viewerId,
                          name: viewer.name || 'Student',
                          email: viewer.email || '',
                          profilePicture: rawPic,
                          grade: viewer.grade || '',
                          registrationNumber: viewer.registrationNumber || '',
                          phoneNumber: viewer.phoneNumber || '',
                          studentType: viewer.studentType || ''
                        });
                      }}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                      title="Click to view full student details"
                    >
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt={viewer.name || 'Student'} 
                          referrerPolicy="no-referrer"
                          crossOrigin="anonymous"
                          className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover border border-purple-300 dark:border-purple-600 shadow-xs shrink-0 group-hover:scale-105 transition-transform" 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextSibling) {
                              e.currentTarget.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white font-extrabold items-center justify-center text-sm uppercase shrink-0 shadow-xs group-hover:scale-105 transition-transform border border-purple-300 dark:border-purple-600 ${avatarUrl ? 'hidden' : 'flex'}`}>
                        {(viewer.name ? viewer.name.charAt(0) : 'S').toUpperCase()}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className={`font-extrabold text-xs sm:text-sm truncate transition ${
                            isDark ? 'text-white group-hover:text-purple-300' : 'text-slate-900 group-hover:text-purple-700'
                          }`}>
                            {viewer.name || 'Student'}
                          </h5>
                          {viewer.grade && (
                            <span className={`px-2 py-0.2 rounded-md font-bold text-[10px] border shadow-2xs ${
                              isDark ? 'bg-purple-950/70 text-purple-300 border-purple-800/60' : 'bg-purple-100 text-purple-950 border-purple-200'
                            }`}>
                              {formatGrade(viewer.grade)}
                            </span>
                          )}
                          {viewer.registrationNumber && (
                            <span className={`px-2 py-0.2 rounded-md font-mono font-bold text-[10px] border ${
                              isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}>
                              {viewer.registrationNumber}
                            </span>
                          )}
                        </div>
                        <p className={`text-[11px] font-medium truncate mt-0.5 ${
                          isDark ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {viewer.email || 'Enrolled Student'}
                          {viewer.joinedAt && (
                            <span className={isDark ? 'text-slate-500 ml-1.5' : 'text-slate-400 ml-1.5'}>
                              • Joined {new Date(viewer.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Watched Duration and Status Badges */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div className={`text-xs sm:text-sm font-black font-mono flex items-center gap-1 justify-end ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          <FaClock className="text-purple-500 text-[11px]" />
                          <span>{formatSeconds(watchSec)}</span>
                        </div>
                        <span className={`text-[10px] font-bold ${
                          isDark ? 'text-purple-400' : 'text-purple-700'
                        }`}>
                          {watchPercent}% watched
                        </span>
                      </div>

                      <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                        isCurrentlyActive
                          ? (isDark ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/60 animate-pulse' : 'bg-emerald-100 text-emerald-900 border border-emerald-300 animate-pulse')
                          : (isDark ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-slate-100 text-slate-600 border border-slate-200')
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isCurrentlyActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        <span>{isCurrentlyActive ? 'Watching' : 'Concluded'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Watch Progress Bar */}
                  <div className={`w-full rounded-full h-1.5 overflow-hidden ${
                    isDark ? 'bg-slate-800' : 'bg-slate-100'
                  }`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        watchPercent >= 75
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
                          : watchPercent >= 40
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                            : 'bg-gradient-to-r from-amber-500 to-orange-500'
                      }`}
                      style={{ width: `${watchPercent}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer Summary & Log Attendance */}
        <div className={`p-3.5 sm:p-4 border-t flex items-center justify-between gap-3 shrink-0 flex-wrap ${
          isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-100 text-slate-600'
        }`}>
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <span className="text-base">📊</span>
            <span>
              Total <strong className={isDark ? 'text-white' : 'text-slate-900'}>{allViewers.length}</strong> student{allViewers.length === 1 ? '' : 's'} watched <strong className={isDark ? 'text-amber-300' : 'text-slate-900'}>{formatSeconds(totalWatchedSec)}</strong> ({formatHoursDecimal(totalWatchedSec)}) of this live session.
            </span>
          </p>

          <button
            type="button"
            disabled={isRecordingAttendance || allViewers.length === 0}
            onClick={handleRecordLiveAttendance}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 hover:from-purple-600 hover:to-indigo-600 text-white font-black text-xs shadow-md shadow-purple-950/20 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {isRecordingAttendance ? (
              <>
                <FaSync className="text-xs animate-spin" />
                <span>Logging Attendance...</span>
              </>
            ) : (
              <>
                <FaCalendarCheck className="text-xs text-amber-300" />
                <span>Log to Online Attendance</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Nested Student Profile Modal when clicking student */}
      <StudentProfileModal
        isOpen={!!inspectStudent}
        onClose={() => setInspectStudent(null)}
        studentId={inspectStudent?.studentId}
        initialStudent={inspectStudent}
        containerScoped={false}
      />
    </div>
  );
};

export default LiveViewersModal;
