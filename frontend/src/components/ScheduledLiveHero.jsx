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
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    isPreLive: false,
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
          isPreLive: true,
          isStarted: true
        });
        return;
      }

      const totalSecs = Math.floor(diff / 1000);
      const days = Math.floor(totalSecs / 86400);
      const hours = Math.floor((totalSecs % 86400) / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      // Pre-live unlocks within 15 minutes (900 seconds)
      const isPreLive = totalSecs <= 900;

      setTimeLeft({
        days,
        hours,
        minutes,
        seconds,
        totalSeconds: totalSecs,
        isPreLive,
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
        <div className="flex-1 space-y-4 text-center lg:text-left">
          {/* Badges */}
          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 text-xs font-black tracking-wide uppercase shadow-xs">
              <FaBroadcastTower className="animate-pulse text-red-500" />
              <span>Upcoming Scheduled Live</span>
            </span>

            <span className="px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold">
              Grade {grade}
            </span>

            {timeLeft.isPreLive && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black animate-pulse">
                <FaHourglassHalf className="text-xs" />
                <span>Pre-Live Active (15m Pre-Roll)</span>
              </span>
            )}
          </div>

          {/* Stream Title */}
          <div>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white tracking-tight leading-tight">
              {liveStream?.title || `Grade ${grade} Live Session`}
            </h2>
            <p className="text-sm text-slate-400 mt-1 font-medium">
              {courseTitle}
            </p>
          </div>

          {/* Scheduled Date & Time Pill */}
          <div className="inline-flex flex-wrap items-center justify-center lg:justify-start gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-300">
            <span className="flex items-center gap-2 text-red-400 font-bold">
              <FaCalendarAlt />
              <span>{formattedScheduleDate}</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="flex items-center gap-2 text-purple-300 font-bold">
              <FaClock />
              <span>{formattedScheduleTime}</span>
            </span>
          </div>

          {/* Informational notice */}
          <div className="flex items-center justify-center lg:justify-start gap-2 text-xs text-slate-400">
            <FaInfoCircle className="text-purple-400 shrink-0" />
            <span>
              {timeLeft.isPreLive 
                ? "Pre-live stream is unlocked! Students can join early to test their audio & video."
                : "The video stream unlocks automatically 15 minutes before the start time."}
            </span>
          </div>

          {/* Teacher / Admin Action Buttons */}
          {isTeacherOrAdmin && (
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 pt-3">
              <button
                type="button"
                onClick={onGoLiveNow}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-600/30 flex items-center gap-2.5 transition transform hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              >
                <FaPlay className="text-xs" />
                <span>Go Live Immediately (Start Now)</span>
              </button>

              <button
                type="button"
                onClick={onEditSchedule}
                className="px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm border border-slate-700 flex items-center gap-2 transition cursor-pointer"
              >
                <FaEdit className="text-xs text-purple-400" />
                <span>Edit Schedule & Thumbnail</span>
              </button>

              <button
                type="button"
                onClick={onCancelSchedule}
                className="px-4 py-3 rounded-2xl bg-red-950/40 hover:bg-red-900/60 text-red-300 font-bold text-xs sm:text-sm border border-red-800/40 flex items-center gap-2 transition cursor-pointer"
              >
                <FaTrash className="text-xs" />
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

          {/* Countdown Clock Grid */}
          <div className="w-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-4 shadow-xl">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 text-center flex items-center justify-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>{timeLeft.isStarted ? 'Live Starting Any Second' : 'Time Remaining to Broadcast'}</span>
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
        </div>
      </div>
    </div>
  );
};

export default ScheduledLiveHero;
