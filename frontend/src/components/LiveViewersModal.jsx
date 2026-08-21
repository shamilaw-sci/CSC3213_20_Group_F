import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FaUserGraduate, 
  FaTimes, 
  FaCircle, 
  FaSearch, 
  FaCalendarCheck, 
  FaClock, 
  FaSync,
  FaInfoCircle,
  FaCheckCircle,
  FaUsers,
  FaTv
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import StudentProfileModal from './StudentProfileModal';

const formatSeconds = (sec) => {
  if (!sec || isNaN(sec) || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
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
  const [activeViewers, setActiveViewers] = useState([]);
  const [allViewers, setAllViewers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'active'
  const [isRecordingAttendance, setIsRecordingAttendance] = useState(false);
  const [inspectStudentId, setInspectStudentId] = useState(null);

  const fetchViewers = useCallback(async (isInitial = false) => {
    if (!lessonId) return;
    if (isInitial) setLoading(true);
    try {
      const res = await api.get(`/lessons/${lessonId}/live-stream/viewers`);
      setActiveViewers(res.data.activeViewers || []);
      setAllViewers(res.data.allViewers || []);
    } catch (err) {
      console.error("Failed to fetch live viewers:", err);
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (isOpen) {
      fetchViewers(true);
      const interval = setInterval(() => fetchViewers(false), 4000);
      return () => clearInterval(interval);
    }
  }, [isOpen, fetchViewers]);

  const activeViewerIds = useMemo(() => {
    return new Set(activeViewers.map(v => (v.student?._id || v.student || '').toString()));
  }, [activeViewers]);

  const totalWatchedSeconds = useMemo(() => {
    return allViewers.reduce((acc, v) => acc + (v.watchedSeconds || 0), 0);
  }, [allViewers]);

  const filteredViewers = useMemo(() => {
    const baseList = filterMode === 'active' ? activeViewers : allViewers;
    if (!searchQuery.trim()) return baseList;
    const q = searchQuery.toLowerCase().trim();
    return baseList.filter(v => (
      (v.name && v.name.toLowerCase().includes(q)) ||
      (v.email && v.email.toLowerCase().includes(q)) ||
      (v.registrationNumber && v.registrationNumber.toLowerCase().includes(q))
    ));
  }, [filterMode, activeViewers, allViewers, searchQuery]);

  const handleRecordLiveAttendance = async () => {
    if (!lessonId) return;
    setIsRecordingAttendance(true);
    try {
      const res = await api.post(`/lessons/${lessonId}/live-stream/record-attendance`, {
        minWatchMinutes: 0
      });
      toast.success(res.data.message || "Attendance recorded successfully for all viewers!");
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || "Failed to record live attendance.");
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl border border-gray-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* Modern Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-amber-300 text-lg sm:text-xl shadow-inner shrink-0">
              <FaUserGraduate />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Lively Watching Students
                </h3>
                {activeViewers.length > 0 ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-emerald-300 font-extrabold text-[11px] flex items-center gap-1.5 animate-pulse shadow-xs">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <span>{activeViewers.length} Active Now</span>
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/15 text-purple-200 font-bold text-[11px]">
                    0 Active Now
                  </span>
                )}
              </div>
              <p className="text-xs text-purple-200 font-medium truncate mt-0.5">
                {formatGrade(grade)} • {streamTitle || 'Live Stream Session'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={() => fetchViewers(true)}
              disabled={loading}
              className="w-8.5 h-8.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white flex items-center justify-center transition cursor-pointer shadow-inner"
              title="Refresh Viewer List"
            >
              <FaSync className={`text-xs ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8.5 h-8.5 rounded-xl bg-white/15 hover:bg-rose-600 active:scale-95 text-white flex items-center justify-center transition cursor-pointer shadow-inner"
              title="Close Modal"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>
        </div>

        {/* Quick Statistics Strip */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 p-3 sm:p-4 bg-slate-50 border-b border-gray-100 shrink-0">
          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-purple-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center text-xs shrink-0 font-bold">
              <FaUsers />
            </div>
            <div className="min-w-0">
              <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Total Joined</span>
              <span className="block text-sm sm:text-base font-black text-gray-900 leading-tight">
                {allViewers.length}
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-emerald-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs shrink-0 font-bold">
              <FaTv />
            </div>
            <div className="min-w-0">
              <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Active Live</span>
              <span className="block text-sm sm:text-base font-black text-emerald-700 leading-tight">
                {activeViewers.length}
              </span>
            </div>
          </div>

          <div className="bg-white p-2.5 sm:p-3 rounded-2xl border border-amber-100 shadow-xs flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center text-xs shrink-0 font-bold">
              <FaClock />
            </div>
            <div className="min-w-0">
              <span className="block text-[10.5px] font-bold text-gray-500 uppercase tracking-wider">Total Watched</span>
              <span className="block text-sm sm:text-base font-black text-amber-800 leading-tight truncate">
                {formatSeconds(totalWatchedSeconds)}
              </span>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs & Search Box */}
        <div className="p-3 sm:p-4 pb-2 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shrink-0 bg-white">
          <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl shrink-0">
            <button
              type="button"
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all' 
                  ? 'bg-purple-900 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              All Attendees ({allViewers.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('active')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filterMode === 'active' 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Active Now ({activeViewers.length})</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name or Reg No..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50/80 pl-8 pr-7 py-1.5 text-xs text-gray-900 placeholder-gray-400 outline-none focus:border-purple-600 focus:bg-white font-medium transition"
            />
            <FaSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs p-0.5 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Viewer List Container */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 min-h-[220px] max-h-[380px] scrollbar-thin bg-gray-50/40">
          {filteredViewers.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center p-4 space-y-2.5 text-gray-400 select-none">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-2xl text-purple-600 shadow-xs">
                👥
              </div>
              <p className="text-xs font-bold text-gray-700">
                {searchQuery ? `No students found matching "${searchQuery}"` : "No student viewers recorded yet."}
              </p>
              <p className="text-[11px] text-gray-500 max-w-xs leading-relaxed">
                As students in this grade play the live YouTube class, they will appear here in real time with active presence metrics.
              </p>
            </div>
          ) : (
            filteredViewers.map((viewer, index) => {
              const viewerId = (viewer.student?._id || viewer.student || '').toString();
              const isCurrentlyActive = activeViewerIds.has(viewerId) || viewer.isLivelyWatching;

              return (
                <div
                  key={viewer._id || index}
                  className="flex items-center justify-between p-3 sm:p-3.5 rounded-2xl border border-gray-200/90 bg-white hover:border-purple-300 hover:shadow-md transition-all duration-200 gap-3 group"
                >
                  <div 
                    onClick={() => viewerId && setInspectStudentId(viewerId)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    title="Click to view student profile and assigned courses"
                  >
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white font-extrabold flex items-center justify-center text-sm uppercase shrink-0 overflow-hidden shadow-xs group-hover:scale-105 transition-transform duration-200 border border-purple-300 ring-2 ring-purple-100">
                      {viewer.avatar ? (
                        <img src={viewer.avatar} alt="" className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        viewer.name ? viewer.name.charAt(0) : 'S'
                      )}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="font-extrabold text-xs sm:text-[13.5px] text-gray-900 truncate group-hover:text-purple-700 transition flex items-center gap-1">
                          <span>{viewer.name || 'Student'}</span>
                          <FaInfoCircle className="text-[10px] text-gray-400 group-hover:text-purple-600 opacity-0 group-hover:opacity-100 transition" />
                        </h5>
                        {viewer.grade && (
                          <span className="px-2 py-0.5 rounded-md bg-purple-100 text-purple-950 font-bold text-[10px] border border-purple-200 shadow-2xs">
                            {formatGrade(viewer.grade)}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium truncate mt-0.5">
                        {viewer.registrationNumber ? <strong className="text-gray-700 font-semibold">Reg: {viewer.registrationNumber} • </strong> : ''}
                        <span>{viewer.email || 'Enrolled Student'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-black text-gray-900 font-mono flex items-center gap-1 justify-end">
                        <FaClock className="text-purple-600 text-[10.5px]" />
                        <span>{formatSeconds(viewer.watchedSeconds || 0)}</span>
                      </div>
                      <span className="text-[10px] text-gray-400 font-medium">watch time</span>
                    </div>

                    <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${
                      isCurrentlyActive
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${isCurrentlyActive ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`}></span>
                      <span>{isCurrentlyActive ? 'Watching' : 'Left'}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
            <span>📊</span>
            <span>
              Total <strong>{allViewers.length}</strong> student{allViewers.length === 1 ? '' : 's'} tuned in to this live session.
            </span>
          </p>

          <button
            type="button"
            disabled={isRecordingAttendance || allViewers.length === 0}
            onClick={handleRecordLiveAttendance}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-800 via-indigo-800 to-purple-800 hover:from-purple-700 hover:to-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-purple-950/20 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center gap-2"
          >
            {isRecordingAttendance ? (
              <>
                <FaSync className="text-xs animate-spin" />
                <span>Recording Attendance...</span>
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

      {/* Student Profile Modal */}
      <StudentProfileModal
        isOpen={!!inspectStudentId}
        onClose={() => setInspectStudentId(null)}
        studentId={inspectStudentId}
      />
    </div>
  );
};

export default LiveViewersModal;
