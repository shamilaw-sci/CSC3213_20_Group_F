import React, { useState, useRef } from 'react';
import { FaVideo, FaTimes, FaExpand, FaCompress, FaLock } from 'react-icons/fa';

const LiveStreamPlayer = ({ liveStream, isTeacherOrAdmin, onEndStream }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  if (!liveStream || !liveStream.isLive || !liveStream.youtubeUrl) {
    return null;
  }

  // Extract YouTube Video ID from any YouTube URL (live, watch, short, embed)
  const getYouTubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|&v=))([\w-]{11})/);
    return match ? match[1] : url.trim();
  };

  const videoId = getYouTubeId(liveStream.youtubeUrl);

  const toggleNativeFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`bg-gradient-to-br from-[#1e1b4b] via-indigo-950 to-[#2d1b64] p-5 sm:p-6 rounded-3xl text-white shadow-2xl border border-indigo-500/40 space-y-4 animate-fadeIn transition-all duration-300 ${
        isFullscreen ? 'p-4 rounded-none h-screen flex flex-col justify-between' : ''
      }`}
    >
      {/* Live Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-indigo-800/60 pb-3">
        <div className="flex items-center gap-3">
          <span className="flex h-3.5 w-3.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500"></span>
          </span>
          <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5">
            <FaVideo className="text-xs" /> LIVE CLASS NOW
          </span>
          <h3 className="font-extrabold text-base sm:text-lg text-amber-300 truncate max-w-md">
            {liveStream.title || 'Online Live Stream'}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* LuminaLearn Safe Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition cursor-pointer text-xs font-bold flex items-center gap-1.5 shadow-md border border-purple-400/30"
            title="Safe Fullscreen inside LuminaLearn"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
            <span>{isFullscreen ? "Exit Fullscreen" : "🔒 Safe Fullscreen"}</span>
          </button>

          {isTeacherOrAdmin && onEndStream && (
            <button
              type="button"
              onClick={onEndStream}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
            >
              <FaTimes /> End Stream
            </button>
          )}
        </div>
      </div>

      {/* Embedded YouTube Player Container with Security Shield Overlays */}
      <div 
        onContextMenu={(e) => e.preventDefault()}
        className={`relative w-full aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black select-none group/player ${
          isFullscreen ? 'flex-1 h-full' : ''
        }`}
      >
        {videoId ? (
          <>
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&fs=0`}
              title={liveStream.title || "LuminaLearn Live Classroom"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="absolute top-0 left-0 w-full h-full border-0"
            />

            {/* TOP SECURITY SHIELD: Extra tall (h-28 / 112px) overlay covering 100% of Settings gear icon, sound/CC icons, title links & top controls */}
            <div 
              className="absolute top-0 left-0 right-0 h-28 z-40 bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-auto flex items-start justify-between p-4 cursor-default select-none"
              title="LuminaLearn Secure Live Player"
            >
              <div className="flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-white/10 backdrop-blur-md">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-xs font-black text-white tracking-wide flex items-center gap-1">
                  <FaLock className="text-red-400 text-[10px]" /> LuminaLearn Encrypted Stream
                </span>
              </div>
            </div>

            {/* BOTTOM SECURITY SHIELD: Invisible overlay (h-24) blocking 100% of share, watch later, more videos & YouTube logo */}
            <div 
              className="absolute bottom-0 left-0 right-0 h-24 z-30 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-auto cursor-default select-none"
              title="Protected Stream"
            />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-red-300 font-semibold text-sm">
            Invalid YouTube Live Stream Link. Please check the URL.
          </div>
        )}
      </div>

      {/* Live Stream Footer Info */}
      <div className="flex items-center justify-between text-xs text-indigo-200/90 pt-1 font-medium">
        <span>⚡ Interactive High Definition Stream</span>
        <span>LuminaLearn Digital Classroom</span>
      </div>
    </div>
  );
};

export default LiveStreamPlayer;
