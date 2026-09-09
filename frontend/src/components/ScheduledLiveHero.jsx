import React, { useState, useEffect } from 'react';
import { 
  FaYoutube, 
  FaCalendarAlt, 
  FaClock, 
  FaPlay, 
  FaEdit, 
  FaTrash, 
  FaBroadcastTower, 
  FaHourglassHalf,
  FaCheckCircle,
  FaInfoCircle
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { getMediaUrl } from '../utils/mediaUrl';

const ScheduledLiveHero = ({
  liveStream,
  lessonId,
  isTeacherOrAdmin,
  onGoLiveNow,
  onEditSchedule,
  onCancelSchedule,
  grade,
  courseTitle,
  onUpdateStatusNotice
}) => {
  const [activeQuickMessage, setActiveQuickMessage] = useState(liveStream?.statusNotice || null);
  const [showQuickMsgSelector, setShowQuickMsgSelector] = useState(false);
  const [customMsgInput, setCustomMsgInput] = useState('');
  const [isSavingNotice, setIsSavingNotice] = useState(false);

  // Sync activeQuickMessage whenever parent liveStream updates
  useEffect(() => {
    if (liveStream?.statusNotice) {
      setActiveQuickMessage(liveStream.statusNotice);
    }
  }, [liveStream?.statusNotice]);

  // Fast real-time polling to catch teacher status updates immediately on student devices
  useEffect(() => {
    if (!lessonId) return;

    const syncLiveStatus = async () => {
      try {
        const res = await api.get(`/lessons/${lessonId}/live-stream/status`);
        if (res.data?.statusNotice) {
          setActiveQuickMessage(res.data.statusNotice);
        }
      } catch (err) {}
    };

    syncLiveStatus();
    const timer = setInterval(syncLiveStatus, 3000);
    return () => clearInterval(timer);
  }, [lessonId]);

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isStarted: false
  });

  useEffect(() => {
    if (!liveStream?.scheduledStartTime) return;

    const calculateTime = () => {
      const targetTime = new Date(liveStream.scheduledStartTime).getTime();
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          totalSeconds: 0,
          isStarted: true
        });
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds: totalSecs,
        isStarted: false
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [liveStream?.scheduledStartTime]);

  const handleSelectStatusNotice = async (noticeObj) => {
    setActiveQuickMessage(noticeObj);
    setShowQuickMsgSelector(false);
    if (!lessonId) return;

    try {
      setIsSavingNotice(true);
      const res = await api.patch(`/lessons/${lessonId}/live-stream/status-notice`, noticeObj);
      toast.success("⚡ Status notice broadcasted to all students!");
      if (onUpdateStatusNotice) {
        onUpdateStatusNotice(res.data?.statusNotice || noticeObj);
      }
    } catch (err) {
      console.warn("Error updating status notice via PATCH, trying fallback:", err);
      try {
        const res = await api.post(`/lessons/${lessonId}/live-stream/status-notice`, noticeObj);
        toast.success("⚡ Status notice broadcasted to all students!");
        if (onUpdateStatusNotice) {
          onUpdateStatusNotice(res.data?.statusNotice || noticeObj);
        }
      } catch (fallbackErr) {
        toast.error("Failed to sync status notice to students.");
      }
    } finally {
      setIsSavingNotice(false);
    }
  };

  const formattedScheduleDate = liveStream?.scheduledStartTime
    ? new Date(liveStream.scheduledStartTime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    : '';

  const formattedScheduleTime = liveStream?.scheduledStartTime
    ? new Date(liveStream.scheduledStartTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  const thumbnailSrc = liveStream?.thumbnail ? getMediaUrl(liveStream.thumbnail) : null;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c0a1a] via-[#120f2b] to-[#0a0816] text-white shadow-2xl border border-purple-900/40 animate-fadeIn backdrop-blur-2xl ring-1 ring-purple-500/20">
      {/* Blurred Thumbnail Backdrop */}
      {thumbnailSrc && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-xl scale-110 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${thumbnailSrc})` }}
        />
      )}

      {/* Radiant Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a1a] via-[#0c0a1a]/95 to-purple-950/40 pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left Side: Class & Stream Info */}
        <div className="flex-1 space-y-5 sm:space-y-6 text-center lg:text-left">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600/25 via-rose-600/25 to-red-600/25 border border-red-500/50 text-red-400 text-xs font-black tracking-wide uppercase shadow-md shadow-red-950/50">
              <FaBroadcastTower className="animate-pulse text-red-500 text-xs" />
              <span>Upcoming Scheduled Live</span>
            </span>

            <span className="px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-600/25 to-indigo-600/25 border border-purple-400/40 text-purple-200 text-xs font-black tracking-wide shadow-md shadow-purple-950/50">
              {grade ? (String(grade).toLowerCase().startsWith('grade') ? grade : `Grade ${grade}`) : 'All Grades'}
            </span>
          </div>

          {/* Stream Title & Subject Subheading */}
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-md">
              {liveStream?.title || `${grade ? (String(grade).toLowerCase().startsWith('grade') ? grade : `Grade ${grade}`) : 'Live'} Session`}
            </h2>
            {courseTitle && (
              <p className="text-xs sm:text-sm text-purple-300/90 font-extrabold tracking-wider uppercase">
                {courseTitle}
              </p>
            )}
          </div>

          {/* Scheduled Date & Time Pill */}
          <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-4 bg-slate-900/95 border border-purple-500/35 rounded-2xl px-5 py-3.5 text-xs sm:text-sm text-white shadow-xl backdrop-blur-xl ring-1 ring-white/10">
            <span className="flex items-center gap-2 text-rose-400 font-black tracking-wide">
              <FaCalendarAlt className="text-xs text-rose-400 shrink-0" />
              <span>{formattedScheduleDate}</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-2 text-indigo-300 font-black tracking-wide">
              <FaClock className="text-xs text-indigo-400 shrink-0" />
              <span>{formattedScheduleTime}</span>
            </span>
          </div>

          {/* Glassmorphic Informational Notice Box */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900/90 via-purple-950/40 to-slate-900/90 border border-purple-500/30 backdrop-blur-md flex items-center justify-center lg:justify-start gap-3 text-xs text-purple-100 shadow-md max-w-xl mx-auto lg:mx-0 font-medium">
            <FaInfoCircle className={timeLeft.isStarted ? "text-amber-400 text-base shrink-0 animate-bounce" : "text-purple-400 text-base shrink-0"} />
            {timeLeft.isStarted ? (
              isTeacherOrAdmin ? (
                <span className="text-amber-300 font-extrabold flex items-center gap-1.5 animate-pulse leading-relaxed">
                  <span>Class scheduled time has arrived! Click "Go Live Immediately" below to start your broadcast now.</span>
                </span>
              ) : (
                <span className="text-amber-300 font-extrabold flex items-center gap-1.5 animate-pulse leading-relaxed">
                  <span>Class scheduled time has arrived! Broadcast initialization in progress. Please stand by...</span>
                </span>
              )
            ) : (
              isTeacherOrAdmin ? (
                <span className="font-semibold leading-relaxed">
                  Click "Go Live Immediately" to start now, or wait for the scheduled time.
                </span>
              ) : (
                <span className="font-semibold leading-relaxed">
                  The live stream will begin at the scheduled start time.
                </span>
              )
            )}
          </div>

          {/* Teacher / Admin Action Buttons */}
          {isTeacherOrAdmin && (
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-1 sm:pt-2">
              <button
                type="button"
                onClick={onGoLiveNow}
                className="px-5.5 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/30 flex items-center gap-2.5 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <FaPlay className="text-xs" />
                <span>Go Live Immediately (Start Now)</span>
              </button>

              <button
                type="button"
                onClick={onEditSchedule}
                className="px-4.5 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold text-xs sm:text-sm border border-slate-750 hover:border-slate-600 flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-xs"
              >
                <FaEdit className="text-xs text-purple-400" />
                <span>Edit Schedule & Thumbnail</span>
              </button>

              <button
                type="button"
                onClick={onCancelSchedule}
                className="px-4.5 py-3 rounded-2xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold text-xs sm:text-sm border border-red-800/50 flex items-center gap-2 transition-all duration-200 cursor-pointer shadow-xs"
              >
                <FaTrash className="text-xs text-red-400" />
                <span>Cancel Stream</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Thumbnail & Live Countdown */}
        <div className="w-full lg:w-96 flex flex-col items-center gap-4">
          {/* Custom 16:9 Thumbnail Display */}
          {thumbnailSrc ? (
            <div className="relative w-full aspect-video rounded-2xl overflow-hidden shadow-xl border border-slate-800 group">
              <img
                src={thumbnailSrc}
                alt="Live Stream Thumbnail"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-red-600 text-white flex items-center justify-center text-sm shadow-md">
                    <FaYoutube />
                  </div>
                  <span className="text-xs font-bold text-slate-200">HD Live Broadcast</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 shadow-inner p-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-600/10 text-red-500 flex items-center justify-center text-3xl mb-2">
                <FaYoutube />
              </div>
              <span className="text-xs font-semibold">Live Broadcast Preview</span>
            </div>
          )}

          {/* Countdown Clock Grid OR Interactive Live Starting Soon Card */}
          {timeLeft.isStarted ? (
            <div className="w-full bg-gradient-to-b from-red-950/80 via-slate-900 to-slate-950 backdrop-blur-md rounded-2xl border-2 border-red-500/60 p-4 sm:p-5 shadow-2xl shadow-red-950/40 relative overflow-hidden select-none animate-in fade-in zoom-in-95 duration-300 space-y-3">
              {/* Ambient Glow */}
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-red-500/20 rounded-full blur-xl pointer-events-none" />

              {/* Header Badge */}
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white font-black text-xs uppercase tracking-wider shadow-md animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
                  <span>🔴 LIVE STARTING SOON</span>
                </div>
                <span className="text-[10.5px] font-mono text-red-300 font-bold bg-red-950/80 px-2 py-0.5 rounded-md border border-red-500/30">
                  Stand By
                </span>
              </div>

              {/* Interactive Message & Pulse Icon */}
              <div className="flex items-start gap-3 bg-black/40 p-3 rounded-xl border border-red-500/30">
                <div className="w-10 h-10 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center shrink-0 mt-0.5">
                  <FaBroadcastTower className="text-xl text-red-400 animate-bounce" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs sm:text-sm font-black text-white tracking-tight">
                    {activeQuickMessage?.title || "Instructor Connecting Live Broadcast..."}
                  </h4>
                  <p className="text-[11px] text-slate-300 font-medium leading-relaxed mt-0.5">
                    {activeQuickMessage?.text || "Please stand by. The video stream will initialize automatically in a few seconds!"}
                  </p>
                </div>
              </div>

              {/* Teacher / Admin Quick Status Controls */}
              {isTeacherOrAdmin && (
                <div className="pt-1.5 border-t border-red-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                      <span>⚡ Quick Teacher Status Notice</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickMsgSelector(!showQuickMsgSelector)}
                      className="px-3 py-1 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-300 text-slate-950 font-black text-xs rounded-xl border border-amber-300 shadow-md shadow-amber-500/30 transition-all duration-200 cursor-pointer active:scale-95 flex items-center gap-1.5 shrink-0"
                    >
                      <FaEdit className="text-xs text-slate-950" />
                      <span>{showQuickMsgSelector ? "Close Options" : "Select / Add Status"}</span>
                    </button>
                  </div>

                  {/* Preset Selector Dropdown / Menu */}
                  {showQuickMsgSelector && (
                    <div className="p-3.5 rounded-2xl bg-slate-950/95 border border-slate-800 shadow-2xl space-y-3 animate-in zoom-in-95 backdrop-blur-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10.5px] font-black text-amber-300 uppercase tracking-widest block">
                          Select Quick Preset Status:
                        </span>
                        <span className="text-[9.5px] font-bold text-slate-400 font-mono">
                          1-Click Broadcast
                        </span>
                      </div>

                      <div className="space-y-2">
                        {[
                          { icon: '📡', title: 'Connecting Live Broadcast...', text: 'Please stand by. The video stream will initialize automatically in a few seconds!' },
                          { icon: '🎥', title: 'Connecting Audio & Video Feed...', text: 'Testing camera and microphone feed. Class starting in 1 minute!' },
                          { icon: '📄', title: 'Finalizing Slides & Notes...', text: 'Preparing lecture slides and study materials. Stand by!' },
                          { icon: '📚', title: 'Get Your Notebooks Ready!', text: 'Class is starting right now — please open your books and notes!' }
                        ].map((item, idx) => {
                          const isSelected = (activeQuickMessage?.title === item.title) || (!activeQuickMessage && idx === 0);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectStatusNotice(item)}
                              disabled={isSavingNotice}
                              className={`w-full text-left p-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.99] group ${
                                isSelected
                                  ? 'bg-gradient-to-r from-red-950/90 via-purple-950/60 to-slate-900 border-red-500/80 shadow-md ring-1 ring-red-400/40 text-white'
                                  : 'bg-slate-900/80 hover:bg-slate-800/80 border-slate-800 hover:border-slate-700 text-slate-200 shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                                <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                                <div className="min-w-0 flex-1">
                                  <span className={`font-black block text-xs tracking-tight ${isSelected ? 'text-amber-300' : 'text-white'}`}>
                                    {item.title}
                                  </span>
                                  <span className="text-[11px] font-medium text-slate-300/90 block truncate leading-snug mt-0.5">
                                    {item.text}
                                  </span>
                                </div>
                              </div>

                              {isSelected && (
                                <div className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm">
                                  ✓
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Custom Input Field */}
                      <div className="pt-2.5 border-t border-slate-800 space-y-2">
                        <span className="text-[10.5px] font-black text-purple-300 uppercase tracking-widest block">
                          Or Type Custom Status Notice:
                        </span>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={customMsgInput}
                            onChange={(e) => setCustomMsgInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && customMsgInput.trim() && !isSavingNotice) {
                                handleSelectStatusNotice({
                                  icon: '📢',
                                  title: 'Instructor Live Notice',
                                  text: customMsgInput.trim()
                                });
                                setCustomMsgInput('');
                              }
                            }}
                            placeholder="Type custom note (e.g. Starting in 3 minutes)..."
                            className="flex-1 bg-black/80 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40 font-sans font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customMsgInput.trim() && !isSavingNotice) {
                                handleSelectStatusNotice({
                                  icon: '📢',
                                  title: 'Instructor Live Notice',
                                  text: customMsgInput.trim()
                                });
                                setCustomMsgInput('');
                              }
                            }}
                            disabled={!customMsgInput.trim() || isSavingNotice}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-xl disabled:opacity-40 cursor-pointer shadow-sm transition active:scale-95 shrink-0"
                          >
                            {isSavingNotice ? 'Saving...' : 'Apply Status'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Animated Connection Wave Bar */}
              <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-red-500/30 p-0.5">
                <div className="bg-gradient-to-r from-red-600 via-amber-400 to-red-500 h-full rounded-full animate-pulse w-full shadow-md" />
              </div>
            </div>
          ) : (
            <div className="w-full bg-gradient-to-b from-slate-900/90 via-[#130f2d]/90 to-slate-950/90 backdrop-blur-xl rounded-2xl border border-purple-500/35 p-4 sm:p-5 shadow-2xl ring-1 ring-purple-500/20">
              <div className="text-[11px] font-black uppercase tracking-widest text-purple-300 mb-3 text-center flex items-center justify-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-80" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
                </span>
                <span>Time Remaining to Broadcast</span>
              </div>

              <div className="grid grid-cols-4 gap-2 sm:gap-2.5 text-center">
                <div className="bg-slate-950/90 border border-purple-500/30 rounded-xl p-2.5 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black text-white font-mono drop-shadow-sm">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-black uppercase text-purple-300/80 tracking-wider">Days</span>
                </div>

                <div className="bg-slate-950/90 border border-purple-500/30 rounded-xl p-2.5 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black text-indigo-300 font-mono drop-shadow-sm">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-black uppercase text-indigo-300/80 tracking-wider">Hours</span>
                </div>

                <div className="bg-slate-950/90 border border-purple-500/30 rounded-xl p-2.5 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black text-purple-300 font-mono drop-shadow-sm">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-black uppercase text-purple-300/80 tracking-wider">Mins</span>
                </div>

                <div className="bg-slate-950/90 border border-rose-500/40 rounded-xl p-2.5 bg-gradient-to-b from-slate-950 to-rose-950/40 shadow-inner">
                  <span className="block text-2xl sm:text-3xl font-black text-rose-400 font-mono drop-shadow-sm animate-pulse">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-black uppercase text-rose-400/90 tracking-wider">Secs</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledLiveHero;
