import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  FaGraduationCap, 
  FaVideo, 
  FaChevronDown, 
  FaClock, 
  FaCalendarAlt, 
  FaCheckCircle, 
  FaExclamationCircle, 
  FaCommentDots, 
  FaReply, 
  FaTimesCircle,
  FaCheck,
  FaSync,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaEye,
  FaEyeSlash
} from 'react-icons/fa';
import api from '../utils/api';
import { getMediaUrl } from '../utils/mediaUrl';
import { useTheme } from '../context/ThemeContext';

const getImageUrl = (url) => getMediaUrl(url);

const StudentLiveFeedbackWindow = ({
  currentLesson,
  lessons = [],
  selectedGrade,
  user,
  isExpanded,
  onToggle
}) => {
  let isDark = false;
  try {
    const themeCtx = useTheme();
    isDark = Boolean(themeCtx?.isDark);
  } catch {
    isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  }

  // Only students should see this window
  if (user?.role === 'admin' || user?.role === 'teacher') {
    return null;
  }

  // 1. Gather all concluded live sessions for this subject/grade
  const liveSessions = useMemo(() => {
    const sessions = [];
    const targetGrade = selectedGrade || user?.grade;

    (lessons || []).forEach(l => {
      // If a grade is specified, filter by grade
      if (targetGrade && l.grade && String(l.grade).trim() !== String(targetGrade).trim()) {
        return;
      }

      // Concluded or ended live streams ONLY (MUST NOT be currently live and MUST NOT be scheduled)
      const ls = l.liveStream;
      const isConcluded = Boolean(ls && !ls.isLive && !ls.isScheduled && (ls.endedAt || ls.isEnded));
      if (isConcluded) {
        sessions.push({
          id: l._id,
          lessonId: l._id,
          title: ls.title || `Grade ${l.grade} Live Class`,
          startedAt: ls.startedAt || l.createdAt,
          endedAt: ls.endedAt,
          grade: l.grade
        });
      }

      // Archived past live streams
      const pastList = Array.isArray(ls?.pastLiveStreams)
        ? ls.pastLiveStreams
        : (Array.isArray(l.pastLiveStreams) ? l.pastLiveStreams : []);

      pastList.forEach((past, idx) => {
        if (past && !past.isLive && !past.isScheduled && (past.endedAt || past.startedAt)) {
          const isDuplicate = sessions.some(s => s.startedAt && past.startedAt && new Date(s.startedAt).getTime() === new Date(past.startedAt).getTime());
          if (!isDuplicate) {
            sessions.push({
              id: past._id || `${l._id}-past-${idx}`,
              lessonId: l._id,
              title: past.title || `Grade ${l.grade} Live Session`,
              startedAt: past.startedAt || past.createdAt,
              endedAt: past.endedAt,
              grade: l.grade
            });
          }
        }
      });
    });

    // Fallback: If no sessions found from lesson list, check currentLesson ONLY if it has actually concluded
    const currLs = currentLesson?.liveStream;
    const isCurrEnded = Boolean(currLs && !currLs.isLive && !currLs.isScheduled && (currLs.endedAt || currLs.isEnded));
    if (sessions.length === 0 && isCurrEnded) {
      sessions.push({
        id: currentLesson._id,
        lessonId: currentLesson._id,
        title: currLs.title || `Grade ${currentLesson.grade || selectedGrade} Live Class`,
        startedAt: currLs.startedAt || currentLesson.createdAt,
        endedAt: currLs.endedAt,
        grade: currentLesson.grade || selectedGrade
      });
    }

    // Sort: newest endedAt or startedAt first
    return sessions.sort((a, b) => {
      const aTime = new Date(a.endedAt || a.startedAt || 0).getTime();
      const bTime = new Date(b.endedAt || b.startedAt || 0).getTime();
      return bTime - aTime;
    });
  }, [lessons, currentLesson, selectedGrade, user?.grade]);

  // Selected session state
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [unseenReplySessionIds, setUnseenReplySessionIds] = useState([]);
  const dropdownRef = useRef(null);
  const statusCacheRef = useRef({});

  // Sync with external isExpanded prop (from Expand All / Collapse All)
  useEffect(() => {
    if (isExpanded !== undefined) {
      setIsCollapsed(!isExpanded);
    }
  }, [isExpanded]);

  const handleToggleCollapse = (customState) => {
    const nextState = typeof customState === 'boolean' ? customState : !isCollapsed;
    setIsCollapsed(nextState);
    if (onToggle) {
      onToggle(!nextState);
    }
  };

  // Derive courseId to check for unseen replies across this course
  const courseId = currentLesson?.course || lessons?.[0]?.course || statusData?.session?.courseId;

  // Whenever entering or switching classes, automatically start in collapsed mode if not explicitly overridden
  useEffect(() => {
    if (isExpanded === undefined) {
      setIsCollapsed(true);
    }
  }, [currentLesson?._id, courseId]);

  // Fetch all sessions in this course with unseen teacher replies for this student
  useEffect(() => {
    if (!courseId) return;
    let isMounted = true;
    api.get(`/lessons/course/${courseId}/student-unseen-replies`)
      .then(res => {
        if (isMounted && Array.isArray(res.data?.unseenLessonIds)) {
          setUnseenReplySessionIds(res.data.unseenLessonIds);
        }
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, [courseId]);

  // Automatically close dropdown whenever the card is collapsed
  useEffect(() => {
    if (isCollapsed) {
      setShowSessionDropdown(false);
    }
  }, [isCollapsed]);

  // Close session dropdown when clicking outside ("clicking around") or pressing Escape
  useEffect(() => {
    if (!showSessionDropdown) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSessionDropdown(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowSessionDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showSessionDropdown]);

  // Initialize selected session
  useEffect(() => {
    if (liveSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(liveSessions[0].lessonId);
    }
  }, [liveSessions, selectedSessionId]);

  // Fetch status whenever selectedSessionId changes (cached for 0ms instantaneous display)
  useEffect(() => {
    if (!selectedSessionId) return;

    let isMounted = true;
    const cached = statusCacheRef.current[selectedSessionId];
    if (cached) {
      setStatusData(cached);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
    setError(null);

    const fetchStatus = async () => {
      try {
        const res = await api.get(`/lessons/${selectedSessionId}/student-live-status`);
        if (isMounted) {
          statusCacheRef.current[selectedSessionId] = res.data;
          setStatusData(res.data);
          if (res.data?.hasUnseenReply) {
            setUnseenReplySessionIds(prev => 
              prev.includes(selectedSessionId) ? prev : [...prev, selectedSessionId]
            );
          } else if (res.data?.studentSeenReply) {
            setUnseenReplySessionIds(prev => prev.filter(id => id !== selectedSessionId));
          }
        }
      } catch (err) {
        if (isMounted && !cached) {
          console.error("Error fetching student live status:", err);
          setError("Unable to load live class review data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, [selectedSessionId]);

  // When student views the expanded reply, mark it as seen after 1.5s
  useEffect(() => {
    if (!isCollapsed && selectedSessionId && statusData?.teacherReply?.text && statusData?.hasUnseenReply) {
      const timer = setTimeout(async () => {
        try {
          await api.post(`/lessons/${selectedSessionId}/live-stream/feedbacks/reply/student-seen`);
          setStatusData(prev => prev ? { ...prev, hasUnseenReply: false, studentSeenReply: true } : prev);
          setUnseenReplySessionIds(prev => prev.filter(id => id !== selectedSessionId));
        } catch (e) {
          console.error("Error marking reply as seen by student:", e);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed, selectedSessionId, statusData?.teacherReply?.text, statusData?.hasUnseenReply]);

  // If no live sessions exist for this course/grade at all, don't show the window
  if (liveSessions.length === 0) {
    return null;
  }

  const activeSession = liveSessions.find(s => s.lessonId === selectedSessionId) || liveSessions[0];
  const activeTitle = statusData?.session?.title || activeSession?.title || 'Live Class';
  const activeStartedAt = statusData?.session?.startedAt || activeSession?.startedAt;
  const activeEndedAt = statusData?.session?.endedAt || activeSession?.endedAt;

  const formatSeconds = (totalSec = 0) => {
    if (!totalSec || totalSec <= 0) return '0m';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    if (hrs > 0) return `${hrs}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const formatDateOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return '';
    }
  };

  const formatTimeOnly = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const activeDate = formatDateOnly(activeEndedAt || activeStartedAt);
  const activeStartTime = formatTimeOnly(activeStartedAt);
  const activeConcludeTime = formatTimeOnly(activeEndedAt);
  const hasAnyUnseenReply = unseenReplySessionIds.length > 0 || Boolean(statusData?.hasUnseenReply);

  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  const handleContainerClick = () => {
    if (!hasBeenSeen) {
      setHasBeenSeen(true);
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      className={`relative rounded-3xl border transition-all duration-300 shadow-xl overflow-hidden ${
        isDark 
          ? 'bg-slate-900/95 border-blue-900/40 shadow-slate-950/60' 
          : 'bg-gradient-to-br from-[#f0f7ff] via-white to-[#e6f0ff] border-blue-300/80 shadow-blue-900/10'
      } ${hasAnyUnseenReply && !hasBeenSeen ? 'ring-2 ring-emerald-500/60 border-emerald-400 dark:border-emerald-500/60' : ''}`}
    >
      {hasAnyUnseenReply && !hasBeenSeen && (
        <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5 z-20 pointer-events-none" title="New teacher reply available">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs shadow-emerald-500/50"></span>
        </span>
      )}
      {/* Top Header Strip */}
      <div className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none cursor-pointer transition-colors ${
        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-blue-50/50'
      }`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-sky-600 to-blue-800 text-white flex items-center justify-center text-lg shadow-md shadow-blue-600/25 shrink-0 ring-1 ring-blue-400/30">
            <FaGraduationCap />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-black text-base sm:text-lg tracking-tight text-slate-900 dark:text-white truncate">
                Live Session Review
              </h4>
              {hasAnyUnseenReply && isCollapsed && (
                <span className="relative flex h-2.5 w-2.5 shrink-0" title="New teacher reply available">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              Your reactions, questions and teacher responses
            </p>
          </div>
        </div>

        {/* Action Controls: Live Session Button, Refresh, Collapse */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {/* Live Session Selector Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => {
                const nextState = !showSessionDropdown;
                setShowSessionDropdown(nextState);
                if (nextState && isCollapsed) {
                  handleToggleCollapse(false);
                }
              }}
              className={`relative px-3.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer shadow-xs active:scale-95 border ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 border-blue-500/60 text-blue-300' 
                  : 'bg-white hover:bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
              }`}
              title={`Active: ${activeTitle}`}
            >
              <FaVideo className="text-blue-600 dark:text-blue-400 text-xs" />
              <span>Live Session</span>
              {hasAnyUnseenReply && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
                </span>
              )}
              <FaChevronDown className={`text-[10px] text-blue-500 transition-transform duration-200 ${showSessionDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showSessionDropdown && (
              <div className={`absolute right-0 top-full mt-2 w-72 sm:w-84 max-w-[calc(100vw-2rem)] rounded-2xl p-2.5 shadow-2xl z-50 animate-fadeIn space-y-1.5 border ${
                isDark ? 'bg-slate-900 border-slate-700 text-slate-100 shadow-slate-950/80' : 'bg-white border-blue-200 text-slate-900 shadow-blue-900/15'
              }`}>
                <div className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b flex items-center justify-between ${
                  isDark ? 'border-slate-800 text-blue-300' : 'border-blue-100 text-blue-800'
                }`}>
                  <span>Concluded Live Sessions</span>
                  <span className="text-[9.5px] font-bold opacity-75">{liveSessions.length} Available</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pr-0.5">
                  {liveSessions.map((s, idx) => {
                    const isSelected = s.lessonId === selectedSessionId;
                    const sDate = formatDateOnly(s.endedAt || s.startedAt);
                    const sStart = formatTimeOnly(s.startedAt);
                    const sConclude = formatTimeOnly(s.endedAt);
                    const hasUnseenThisSession = unseenReplySessionIds.includes(s.lessonId) || (isSelected && Boolean(statusData?.hasUnseenReply));

                    return (
                      <button
                        key={s.id || idx}
                        type="button"
                        onClick={() => {
                          setSelectedSessionId(s.lessonId);
                          setShowSessionDropdown(false);
                          if (isCollapsed) {
                            handleToggleCollapse(false);
                          }
                        }}
                        className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer space-y-1 ${
                          isSelected
                            ? (isDark ? 'bg-blue-950/60 border-blue-500/80 text-white ring-1 ring-blue-500/40' : 'bg-blue-100 border-blue-400 text-blue-950 font-bold ring-1 ring-blue-400/40')
                            : (isDark ? 'bg-slate-800/80 border-slate-700 hover:bg-blue-950/40 text-slate-300' : 'bg-slate-50 border-slate-200 hover:bg-blue-50 text-slate-800')
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-black text-xs truncate">
                            {s.title}
                          </p>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {hasUnseenThisSession && (
                              <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                <span>New Reply</span>
                              </span>
                            )}
                            {isSelected && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10.5px] text-slate-500 dark:text-slate-400 font-semibold">
                          {sDate && (
                            <span className="flex items-center gap-1">
                              <FaCalendarAlt className="text-[9px] text-blue-500" />
                              <span>{sDate}</span>
                            </span>
                          )}
                          {(sStart || sConclude) && (
                            <span className="flex items-center gap-1">
                              <FaClock className="text-[9px] text-amber-500" />
                              <span>
                                {sStart && sConclude
                                  ? `${sStart} – ${sConclude}`
                                  : sStart
                                    ? `Start: ${sStart}`
                                    : `Concluded: ${sConclude}`}
                              </span>
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Refresh Status Button */}
          <button
            type="button"
            onClick={async () => {
              if (!selectedSessionId || isLoading) return;
              delete statusCacheRef.current[selectedSessionId];
              setIsLoading(true);
              try {
                const res = await api.get(`/lessons/${selectedSessionId}/student-live-status`);
                statusCacheRef.current[selectedSessionId] = res.data;
                setStatusData(res.data);
              } catch (e) {}
              setIsLoading(false);
            }}
            disabled={isLoading}
            className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs transition cursor-pointer active:scale-90 shadow-2xs ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white' 
                : 'bg-white hover:bg-blue-50 border-blue-200 text-blue-700'
            }`}
            title="Refresh Status"
          >
            <FaSync className={`${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          </button>

          {/* Collapse / Expand Toggle Button */}
          <button
            type="button"
            onClick={() => {
              setShowSessionDropdown(false);
              handleToggleCollapse(!isCollapsed);
            }}
            className={`relative px-3.5 py-1.5 rounded-xl text-xs font-black border flex items-center gap-1.5 transition cursor-pointer active:scale-95 shadow-2xs ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                : 'bg-white hover:bg-blue-50 border-blue-200 text-blue-900'
            }`}
            title={isCollapsed ? "Expand live session feedback" : "Collapse view"}
          >
            <FaChevronDown className={`text-[10px] text-blue-500 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-180'}`} />
            {hasAnyUnseenReply && isCollapsed && (
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
              </span>
            )}
            <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {!isCollapsed && (
        <div className={`p-4 sm:p-6 pt-2 border-t space-y-4 transition-all duration-300 ${
          isDark ? 'border-blue-900/40' : 'border-blue-100'
        }`}>
          {isLoading ? (
            <div className="py-8 text-center space-y-2.5">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-400">Loading live session status & reaction...</p>
            </div>
          ) : error ? (
            <div className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold ${
              isDark ? 'bg-rose-950/30 border-rose-800 text-rose-300' : 'bg-rose-50 border-rose-200 text-rose-700'
            }`}>
              <FaExclamationCircle className="text-base shrink-0" />
              <span>{error}</span>
            </div>
          ) : statusData?.isAbsent ? (
            /* ABSENT STATE: Student did NOT attend this live session */
            <div className={`rounded-3xl p-5 sm:p-6 border transition-all space-y-3.5 ${
              isDark 
                ? 'bg-gradient-to-br from-rose-950/25 via-slate-900 to-slate-900 border-rose-800/50 shadow-rose-950/20' 
                : 'bg-gradient-to-br from-rose-50/80 via-white to-amber-50/30 border-rose-200 shadow-sm'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-center justify-center text-xl shrink-0">
                    <FaTimesCircle />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <h2 className="font-black text-lg sm:text-xl md:text-2xl text-slate-900 dark:text-white tracking-tight truncate">
                        {activeTitle}
                      </h2>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200/90 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60 shadow-2xs shrink-0 self-center">
                        <FaTimesCircle className="text-[9px] text-rose-500" />
                        <span>Absent</span>
                      </span>
                    </div>
                    {/* Title, Date, Start Time & Conclude Time */}
                    <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 mt-1">
                      {activeDate && (
                        <span className="flex items-center gap-1">
                          <FaCalendarAlt className="text-rose-500 text-[11px]" />
                          <span>{activeDate}</span>
                        </span>
                      )}
                      {activeStartTime && (
                        <span className="flex items-center gap-1">
                          <FaClock className="text-amber-500 text-[11px]" />
                          <span>Start: {activeStartTime}</span>
                        </span>
                      )}
                      {activeConcludeTime && (
                        <span className="flex items-center gap-1">
                          <FaCheckCircle className="text-emerald-500 text-[11px]" />
                          <span>Concluded: {activeConcludeTime}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed ${
                isDark ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-white/80 border-slate-200 text-slate-600'
              }`}>
                <p>
                  You were marked as <strong>absent</strong> for this live broadcast. Post-stream live reactions, doubt submissions, and teacher replies are available for students who joined the live classroom.
                </p>
                <p className="mt-1.5 text-purple-600 dark:text-purple-400 font-semibold flex items-center gap-1.5">
                  <span>💡 Tip:</span> Check the Academic Calendar below to review class notes, study guides, and video lessons for this week.
                </p>
              </div>
            </div>
          ) : (
            /* ATTENDED STATE: Student attended! Show reactions & teacher response */
            <div className="space-y-4">
              {/* Session Details & Attendance Ribbon */}
              <div className={`p-3 sm:p-3.5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-2.5 sm:gap-3 transition-all ${
                isDark 
                  ? 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-slate-950/40' 
                  : 'bg-gradient-to-r from-purple-50/70 via-white to-purple-50/40 border-purple-200 text-slate-800 shadow-2xs'
              }`}>
                {/* Left: Session Title first, followed by Attended badge after the title */}
                <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                  <h2 className="font-black text-lg sm:text-xl md:text-2xl text-slate-900 dark:text-white tracking-tight truncate">
                    {activeTitle}
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/90 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60 shadow-2xs shrink-0 self-center">
                    <FaCheck className="text-[9px] text-emerald-600 dark:text-emerald-400" />
                    <span>Attended</span>
                  </span>
                </div>

                {/* Right: Date, Start Time, Conclude Time & Watch Duration */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-bold">
                  {activeDate && (
                    <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-purple-200 text-purple-950'
                    }`}>
                      <FaCalendarAlt className="text-purple-500 text-[11px]" />
                      <span>{activeDate}</span>
                    </span>
                  )}

                  {activeStartTime && (
                    <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-amber-300' : 'bg-white border-amber-200 text-amber-900'
                    }`}>
                      <FaClock className="text-amber-500 text-[11px]" />
                      <span>Start: {activeStartTime}</span>
                    </span>
                  )}

                  {activeConcludeTime && (
                    <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs ${
                      isDark ? 'bg-slate-800/80 border-slate-700 text-emerald-300' : 'bg-white border-emerald-200 text-emerald-900'
                    }`}>
                      <FaCheckCircle className="text-emerald-500 text-[11px]" />
                      <span>Concluded: {activeConcludeTime}</span>
                    </span>
                  )}

                  {statusData?.watchedSeconds > 0 && (
                    <span className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 shadow-2xs ${
                      isDark ? 'bg-purple-950/60 border-purple-700 text-purple-300' : 'bg-purple-100 border-purple-300 text-purple-900'
                    }`}>
                      <span>👁️</span>
                      <span>{formatSeconds(statusData.watchedSeconds)} watched</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Side-by-Side Cards: Student Reaction vs Teacher Reply */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Student Reaction Card (Purple Student Theme) */}
                <div className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 space-y-3.5 ${
                  isDark 
                    ? 'bg-gradient-to-br from-purple-950/30 via-slate-900 to-slate-900 border-purple-800/60 shadow-purple-950/30' 
                    : 'bg-gradient-to-br from-purple-50/70 via-white to-purple-50/30 border-purple-200 shadow-xs'
                }`}>
                  <div className="flex items-center justify-between gap-2 border-b border-purple-100 dark:border-purple-900/60 pb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-700 text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0 ring-2 ring-purple-400/30">
                        {user?.profilePicture ? (
                          <img 
                            src={getImageUrl(user.profilePicture)} 
                            alt="Student" 
                            className="w-full h-full rounded-full object-cover" 
                          />
                        ) : (
                          <FaUserGraduate />
                        )}
                      </div>
                      <p className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                        {user?.name || 'You'}
                      </p>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/90 border border-purple-300 dark:border-purple-800 text-purple-800 dark:text-purple-300 shrink-0">
                      Student
                    </span>
                  </div>

                  {/* Student Message / Reaction Box */}
                  {statusData?.studentReaction?.reactionEmoji || statusData?.studentReaction?.reactionLabel || statusData?.studentReaction?.question || statusData?.studentReaction?.message ? (
                    <div className="space-y-2">
                      <div className={`p-3 sm:p-3.5 min-h-[52px] sm:min-h-[56px] rounded-2xl rounded-tr-xs border border-r-4 text-xs sm:text-[13px] leading-relaxed font-semibold shadow-xs flex flex-col justify-center ${
                        isDark 
                          ? 'bg-purple-950/80 border-purple-700 border-r-purple-400 text-white' 
                          : 'bg-[#f5f0ff] border-purple-300 border-r-purple-500 text-purple-950'
                      }`}>
                        <div className="flex items-center gap-2">
                          {statusData?.studentReaction?.reactionEmoji && (
                            <span className="text-base sm:text-lg leading-none filter drop-shadow-xs select-none shrink-0">
                              {statusData.studentReaction.reactionEmoji}
                            </span>
                          )}
                          <span className="font-extrabold text-xs sm:text-[13px] text-purple-950 dark:text-purple-100">
                            {statusData?.studentReaction?.reactionLabel || 'Understood Everything'}
                          </span>
                        </div>

                        {/* Question / Doubt Asked */}
                        {statusData?.studentReaction?.question && (
                          <div className="pt-2 mt-2 border-t border-purple-300/40 dark:border-purple-800/60 font-semibold italic text-xs sm:text-[12.5px] text-purple-900/90 dark:text-purple-200">
                            "{statusData.studentReaction.question}"
                          </div>
                        )}

                        {/* Feedback Message */}
                        {!statusData?.studentReaction?.question && statusData?.studentReaction?.message && (
                          <div className="pt-2 mt-2 border-t border-purple-300/40 dark:border-purple-800/60 font-medium italic text-xs sm:text-[12.5px] text-purple-900/90 dark:text-purple-200">
                            "{statusData.studentReaction.message}"
                          </div>
                        )}
                      </div>

                      {/* Submission Timestamp aligned symmetrically with teacher card */}
                      {statusData?.studentReaction?.submittedAt && (
                        <div className="flex items-center justify-end text-[11px] text-slate-400 font-semibold pt-0.5">
                          <span>{formatDate(statusData.studentReaction.submittedAt)}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`p-3.5 rounded-2xl border text-xs text-slate-500 dark:text-slate-400 italic ${
                      isDark ? 'bg-slate-950/30 border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}>
                      No reaction rating submitted for this session.
                    </div>
                  )}
                </div>

                {/* 2. Teacher / Admin Reaction & Reply Card */}
                {(() => {
                  const isReplyAdmin = statusData?.teacherReply?.teacherRole === 'admin' || statusData?.teacherReply?.role === 'admin' || statusData?.teacherReply?.repliedByRole === 'admin';
                  const roleLabel = isReplyAdmin ? 'Admin' : 'Teacher';
                  return (
                    <div className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 space-y-3.5 ${
                      isReplyAdmin
                        ? (isDark 
                            ? 'bg-gradient-to-br from-blue-950/30 via-slate-900 to-slate-900 border-blue-800/60 shadow-blue-950/30' 
                            : 'bg-gradient-to-br from-blue-50/70 via-white to-blue-50/30 border-blue-200 shadow-xs')
                        : (isDark 
                            ? 'bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900 border-emerald-800/60 shadow-emerald-950/30' 
                            : 'bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border-emerald-200 shadow-xs')
                    }`}>
                      <div className={`flex items-center justify-between gap-2 border-b pb-3 ${
                        isReplyAdmin ? 'border-blue-100 dark:border-blue-900/60' : 'border-emerald-100 dark:border-emerald-900/60'
                      }`}>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-black shadow-sm shrink-0 ring-2 ${
                            isReplyAdmin ? 'bg-gradient-to-tr from-blue-600 to-indigo-700 ring-blue-400/30' : 'bg-gradient-to-tr from-emerald-600 to-teal-700 ring-emerald-400/30'
                          }`}>
                            {statusData?.teacherReply?.teacherAvatar ? (
                              <img 
                                src={getImageUrl(statusData.teacherReply.teacherAvatar)} 
                                alt={roleLabel} 
                                className="w-full h-full rounded-full object-cover" 
                              />
                            ) : (
                              <FaChalkboardTeacher />
                            )}
                          </div>
                          <p className="font-black text-sm sm:text-base text-slate-900 dark:text-white truncate">
                            {statusData?.teacherReply?.teacherName || `${roleLabel} Response`}
                          </p>
                        </div>

                        {statusData?.teacherReply?.text ? (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border shrink-0 ${
                            isReplyAdmin 
                              ? 'bg-blue-100 dark:bg-blue-950/90 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                          }`}>
                            {roleLabel}
                          </span>
                        ) : Boolean(statusData?.hasTeacherSeen || statusData?.studentReaction?.seen) ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-500/10 dark:bg-blue-950/80 border border-blue-400/40 text-blue-600 dark:text-blue-400 flex items-center gap-1 shrink-0 shadow-2xs">
                            <FaEye className="text-[10px]" />
                            <span>Seen by Teacher</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 dark:bg-amber-950/80 border border-amber-400/40 text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0 shadow-2xs">
                            <FaEyeSlash className="text-[10px]" />
                            <span>Not Seen Yet</span>
                          </span>
                        )}
                      </div>

                      {statusData?.teacherReply?.text ? (
                        <div className="space-y-2">
                          <div className={`p-3 sm:p-3.5 min-h-[52px] sm:min-h-[56px] rounded-2xl rounded-tr-xs border border-r-4 text-xs sm:text-[13px] leading-relaxed font-semibold shadow-xs flex flex-col justify-center ${
                            isReplyAdmin
                              ? (isDark 
                                  ? 'bg-blue-950/80 border-blue-700 border-r-blue-500 text-blue-100' 
                                  : 'bg-[#e0f2fe] border-blue-300 border-r-blue-600 text-blue-950')
                              : (isDark 
                                  ? 'bg-[#005c4b] border-emerald-600 border-r-emerald-400 text-white' 
                                  : 'bg-[#d9fdd3] border-emerald-300 border-r-emerald-500 text-emerald-950')
                          }`}>
                            "{statusData.teacherReply.text}"
                          </div>
                          {statusData.teacherReply.repliedAt && (
                            <div className="flex items-center justify-end text-[11px] text-slate-400 font-semibold pt-0.5">
                              <span>{formatDate(statusData.teacherReply.repliedAt)}</span>
                            </div>
                          )}
                        </div>
                      ) : Boolean(statusData?.hasTeacherSeen || statusData?.studentReaction?.seen) ? (
                        /* Teacher has seen the message, but hasn't reacted yet */
                        <div className={`p-5 rounded-2xl border text-center space-y-3 ${
                          isDark ? 'bg-blue-950/20 border-blue-800/40 text-blue-200' : 'bg-blue-50/70 border-blue-200 text-blue-900 shadow-2xs'
                        }`}>
                          <div className="w-10 h-10 rounded-2xl bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-base mx-auto shadow-2xs">
                            <FaEye />
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-xs sm:text-sm font-black text-blue-900 dark:text-blue-200">
                              Teacher Has Seen Your Message
                            </h5>
                            <p className="text-[11.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
                              The {roleLabel.toLowerCase()} has seen your question and is preparing a response. Their reaction and answer will appear here soon.
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 text-blue-700 dark:text-blue-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span>Seen • Awaiting Reaction</span>
                          </div>
                        </div>
                      ) : (
                        /* Teacher hasn't seen and hasn't reacted yet */
                        <div className={`p-5 rounded-2xl border text-center space-y-3 ${
                          isDark ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-amber-50/70 border-amber-200 text-amber-900 shadow-2xs'
                        }`}>
                          <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center text-base mx-auto shadow-2xs">
                            <FaEyeSlash />
                          </div>
                          <div className="space-y-1">
                            <h5 className="text-xs sm:text-sm font-black text-amber-900 dark:text-amber-200">
                              Teacher Hasn't Seen & Reacted Yet
                            </h5>
                            <p className="text-[11.5px] text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-sm mx-auto">
                              Your question and reaction have been delivered, but the {roleLabel.toLowerCase()} hasn't seen or reacted to your message yet. Once reviewed, their response will appear here.
                            </p>
                          </div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-300 shadow-2xs">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                            <span>Awaiting Teacher Review</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentLiveFeedbackWindow;
