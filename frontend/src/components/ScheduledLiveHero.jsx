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
import { getMediaUrl } from '../utils/mediaUrl';

const ScheduledLiveHero = ({
  liveStream,
  isTeacherOrAdmin,
  onGoLiveNow,
  onEditSchedule,
  onCancelSchedule,
  grade,
  courseTitle
}) => {
  const [activeQuickMessage, setActiveQuickMessage] = useState(null);
  const [showQuickMsgSelector, setShowQuickMsgSelector] = useState(false);
  const [customMsgInput, setCustomMsgInput] = useState('');

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
    <div className="relative overflow-hidden rounded-3xl bg-slate-950 text-white shadow-2xl border border-slate-800 animate-fadeIn">
      {/* Blurred Thumbnail Backdrop */}
      {thumbnailSrc && (
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-25 filter blur-xl scale-110 pointer-events-none transition-all duration-700"
          style={{ backgroundImage: `url(${thumbnailSrc})` }}
        />
      )}

      {/* Radiant Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-red-950/40 pointer-events-none" />

      <div className="relative z-10 p-6 sm:p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8">
        {/* Left Side: Class & Stream Info */}
        <div className="flex-1 space-y-5 sm:space-y-6 text-center lg:text-left">
          {/* Badges Row */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-500/15 border border-red-500/35 text-red-400 text-xs font-black tracking-wide uppercase shadow-xs">
              <FaBroadcastTower className="animate-pulse text-red-500 text-xs" />
              <span>Upcoming Scheduled Live</span>
            </span>

            <span className="px-3.5 py-1.5 rounded-full bg-purple-500/15 border border-purple-500/35 text-purple-300 text-xs font-black tracking-wide">
              {grade ? (String(grade).toLowerCase().startsWith('grade') ? grade : `Grade ${grade}`) : 'All Grades'}
            </span>
          </div>

          {/* Stream Title & Subject Subheading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight drop-shadow-sm">
              {liveStream?.title || `${grade ? (String(grade).toLowerCase().startsWith('grade') ? grade : `Grade ${grade}`) : 'Live'} Session`}
            </h2>
            {courseTitle && (
              <p className="text-xs sm:text-sm text-slate-400 font-semibold tracking-wide">
                {courseTitle}
              </p>
            )}
          </div>

          {/* Scheduled Date & Time Pill */}
          <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-3.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl px-4.5 py-3 text-xs sm:text-sm text-slate-300 shadow-md backdrop-blur-md">
            <span className="flex items-center gap-2 text-rose-400 font-extrabold tracking-wide">
              <FaCalendarAlt className="text-xs" />
              <span>{formattedScheduleDate}</span>
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <span className="flex items-center gap-2 text-indigo-300 font-extrabold tracking-wide">
              <FaClock className="text-xs" />
              <span>{formattedScheduleTime}</span>
            </span>
          </div>

          {/* Glassmorphic Informational Notice Box */}
          <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-md flex items-center justify-center lg:justify-start gap-2.5 text-xs text-slate-300 shadow-xs max-w-xl mx-auto lg:mx-0">
            <FaInfoCircle className={timeLeft.isStarted ? "text-amber-400 text-sm shrink-0" : "text-purple-400 text-sm shrink-0"} />
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
              <span className="font-medium leading-relaxed">
                The live stream will begin automatically at the scheduled start time.
              </span>
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
                      className="text-[10.5px] font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-0.5 rounded-lg border border-white/15 transition cursor-pointer flex items-center gap-1"
                    >
                      <FaEdit className="text-[9px]" />
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
                              onClick={() => {
                                setActiveQuickMessage(item);
                                setShowQuickMsgSelector(false);
                              }}
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
                            placeholder="Type custom note (e.g. Starting in 3 minutes)..."
                            className="flex-1 bg-black/80 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-400/40 font-sans font-medium"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (customMsgInput.trim()) {
                                setActiveQuickMessage({
                                  icon: '📢',
                                  title: 'Instructor Live Notice',
                                  text: customMsgInput.trim()
                                });
                                setCustomMsgInput('');
                                setShowQuickMsgSelector(false);
                              }
                            }}
                            disabled={!customMsgInput.trim()}
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs rounded-xl disabled:opacity-40 cursor-pointer shadow-sm transition active:scale-95 shrink-0"
                          >
                            Apply Status
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
            <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 text-center flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>Time Remaining to Broadcast</span>
              </div>

              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-2">
                  <span className="block text-xl sm:text-2xl font-black text-white font-mono">
                    {String(timeLeft.days).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider">Days</span>
                </div>

                <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-2">
                  <span className="block text-xl sm:text-2xl font-black text-white font-mono">
                    {String(timeLeft.hours).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider">Hours</span>
                </div>

                <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-2">
                  <span className="block text-xl sm:text-2xl font-black text-white font-mono">
                    {String(timeLeft.minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-bold uppercase text-slate-500 tracking-wider">Mins</span>
                </div>

                <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-2 bg-gradient-to-b from-slate-950 to-red-950/30">
                  <span className="block text-xl sm:text-2xl font-black text-red-400 font-mono">
                    {String(timeLeft.seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9.5px] font-bold uppercase text-red-400/80 tracking-wider">Secs</span>
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
