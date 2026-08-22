import React, { useState, useRef, useEffect } from 'react';
import { FaTimes, FaPlay, FaPause, FaExpand, FaCompress, FaSlidersH, FaShieldAlt } from 'react-icons/fa';

const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const VideoPlayerModal = ({ video, onClose }) => {
  if (!video) return null;

  const [isPlaying, setIsPlaying] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const videoId = getYouTubeVideoId(video.url);
  const isYouTube = Boolean(videoId);

  // Restrict YouTube native controls, share links, annotations, and branding
  const embedUrl = isYouTube 
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&disablekb=1&enablejsapi=1&playsinline=1`
    : video.url;

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleTogglePlay = () => {
    if (isYouTube) {
      const iframe = iframeRef.current;
      if (iframe && iframe.contentWindow) {
        if (isPlaying) {
          iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
          setIsPlaying(false);
        } else {
          iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*');
          setIsPlaying(true);
        }
      }
    } else if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#0a0d1a]/85 backdrop-blur-md animate-fadeIn">
      {/* Modal Card */}
      <div 
        ref={containerRef}
        className="relative w-full max-w-4xl bg-[#121626] border border-[#202742] rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[95vh]"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1f2640] bg-[#121626] shrink-0">
          <div className="flex items-center gap-3.5 min-w-0 pr-4">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-600 text-white flex items-center justify-center shrink-0 font-black shadow-md">
              <FaPlay className="text-xs text-white ml-0.5" />
            </div>
            <h3 className="font-bold text-base sm:text-lg text-white truncate tracking-tight">
              {video.title || 'Video Lesson'}
            </h3>
          </div>
          
          <button
            onClick={() => {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-[#1c223c] transition cursor-pointer shrink-0"
            title="Close Player"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Video Frame Body */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center overflow-hidden group">
          {/* Top Shield Overlay to block YouTube title bar link clicks */}
          {isYouTube && (
            <div className="absolute top-0 left-0 right-0 h-14 z-20 pointer-events-auto bg-transparent" />
          )}

          {isYouTube ? (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={video.title || 'Academy Video Player'}
              className="w-full h-full border-0 pointer-events-auto"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            />
          ) : (
            <video
              ref={videoRef}
              src={video.url}
              autoPlay
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              Your browser does not support playing this video.
            </video>
          )}

          {/* Click Center Overlay */}
          <div 
            onClick={handleTogglePlay}
            className="absolute inset-0 z-10 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center cursor-pointer"
          >
            {!isPlaying && (
              <div className="w-16 h-16 rounded-full bg-[#a855f7]/90 text-white flex items-center justify-center text-2xl shadow-2xl backdrop-blur-md transform scale-100 transition-all animate-pulse">
                <FaPlay className="ml-1" />
              </div>
            )}
          </div>
        </div>

        {/* Restricted Platform Control Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-[#121626] border-t border-[#1f2640] text-xs text-slate-300 shrink-0 flex-wrap gap-3">
          
          {/* Left: Pause / Resume Button & Auto Quality */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-5 py-2.5 rounded-2xl bg-[#a855f7] hover:bg-[#9333ea] text-white font-extrabold text-xs transition cursor-pointer flex items-center gap-2 shadow-lg shadow-purple-600/30 active:scale-95 border border-purple-400/30"
            >
              {isPlaying ? (
                <>
                  <FaPause className="text-xs" />
                  <span>Pause Video</span>
                </>
              ) : (
                <>
                  <FaPlay className="text-xs" />
                  <span>Resume / Play</span>
                </>
              )}
            </button>

            {/* Auto Quality (Recommended) Badge */}
            <span className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-[#1c223c]/80 border border-[#293154] text-purple-200 font-bold text-xs">
              <FaSlidersH className="text-purple-400 text-xs" />
              <span>Auto Quality (Recommended)</span>
            </span>
          </div>

          {/* Right: Fullscreen Button & Status */}
          <div className="flex items-center gap-3">
            <span className="text-emerald-400 text-xs font-semibold hidden md:inline-flex items-center gap-1.5">
              <FaShieldAlt className="text-emerald-400" /> Secure Player Mode
            </span>

            <button
              type="button"
              onClick={handleToggleFullscreen}
              className="px-4 py-2 rounded-2xl bg-[#1c223c] hover:bg-[#272f50] text-white font-extrabold text-xs transition cursor-pointer flex items-center gap-2 border border-[#293154] active:scale-95 shadow-xs"
              title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            >
              {isFullscreen ? (
                <>
                  <FaCompress className="text-xs text-purple-300" />
                  <span>Exit Fullscreen</span>
                </>
              ) : (
                <>
                  <FaExpand className="text-xs text-purple-300" />
                  <span>Fullscreen</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                onClose();
              }}
              className="px-4 py-2 rounded-2xl bg-[#1c223c] hover:bg-[#272f50] text-slate-200 hover:text-white font-bold text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
