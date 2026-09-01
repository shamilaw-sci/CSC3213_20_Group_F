import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  FaVideo, 
  FaTimes, 
  FaExpand, 
  FaCompress, 
  FaLock, 
  FaPlay, 
  FaPause, 
  FaVolumeUp, 
  FaVolumeDown,
  FaVolumeMute,
  FaUsers,
  FaComments,
  FaStar,
  FaCircle,
  FaMicrophone,
  FaMicrophoneSlash
} from 'react-icons/fa';
import api, { getApiBaseUrl } from '../utils/api';
import { toast } from 'react-hot-toast';
import LiveChatBox from './LiveChatBox';
import LiveEndFeedbackModal from './LiveEndFeedbackModal';
import LiveViewersModal from './LiveViewersModal';

const LiveStreamPlayer = ({ 
  liveStream, 
  isTeacherOrAdmin, 
  onEndStream, 
  onGoLiveNow,
  lessonId, 
  grade,
  courseTitle 
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [behindLiveSeconds, setBehindLiveSeconds] = useState(0);
  const [isAtLiveEdge, setIsAtLiveEdge] = useState(true);
  const [qualityNotification, setQualityNotification] = useState(null);
  const [showCenterAction, setShowCenterAction] = useState(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isStreamEnded, setIsStreamEnded] = useState(liveStream?.isLive === false);
  const [activeViewerCount, setActiveViewerCount] = useState(1);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showChatBox, setShowChatBox] = useState(true);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [showFsHint, setShowFsHint] = useState(false);

  // Student Live Microphone State & Web Audio Visualizer
  const [isLiveMicActive, setIsLiveMicActive] = useState(false);
  const [liveMicAudioLevel, setLiveMicAudioLevel] = useState(0);
  const [isChatVoiceRecording, setIsChatVoiceRecording] = useState(false);
  const micStreamRef = useRef(null);
  const micAudioContextRef = useRef(null);
  const micAnalyserRef = useRef(null);
  const micAnimationRef = useRef(null);

  const stopLiveMic = useCallback(() => {
    if (micAnimationRef.current) {
      cancelAnimationFrame(micAnimationRef.current);
      micAnimationRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      micStreamRef.current = null;
    }
    if (micAudioContextRef.current) {
      micAudioContextRef.current.close().catch(() => {});
      micAudioContextRef.current = null;
    }
    setIsLiveMicActive(false);
    setLiveMicAudioLevel(0);
  }, []);

  const handleToggleLiveMic = async () => {
    if (isLiveMicActive) {
      stopLiveMic();
      toast.success("🎙️ Live Microphone Muted");
      return;
    }

    if (isChatVoiceRecording) {
      toast.error("⚠️ Cannot unmute live mic while recording a voice note in chat. Please finish or cancel your voice recording first.", {
        duration: 4000
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        micAudioContextRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        micAnalyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAudioLevel = () => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          setLiveMicAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
          micAnimationRef.current = requestAnimationFrame(updateAudioLevel);
        };
        updateAudioLevel();
      }

      setIsLiveMicActive(true);
      toast.success("🎙️ Live Microphone Active - You are LIVE!");
    } catch (err) {
      console.error("Microphone access failed", err);
      toast.error("Could not access microphone. Please check browser permissions.");
      stopLiveMic();
    }
  };

  // Ensure mic cleanup on unmount
  useEffect(() => {
    return () => {
      stopLiveMic();
    };
  }, [stopLiveMic]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isStudent = user?.role === 'student';

  // Heartbeat ping & real-time viewer tracking
  useEffect(() => {
    if (!lessonId || liveStream?.isLive === false) return;

    const performViewerPing = async () => {
      try {
        if (isStudent) {
          const res = await api.post(`/lessons/${lessonId}/live-stream/viewer-ping`, {
            isPlaying: isPlaying
          });
          if (typeof res.data.activeViewerCount === 'number') {
            setActiveViewerCount(res.data.activeViewerCount);
          }
          if (res.data.streamEnded || res.data.isLive === false) {
            setIsStreamEnded(true);
            setIsPlaying(false);
            setShowFeedbackModal(true);
            if (typeof onEndStream === 'function') {
              onEndStream();
            }
          }
        } else {
          const res = await api.get(`/lessons/${lessonId}/live-stream/viewers`);
          if (typeof res.data.activeViewerCount === 'number') {
            setActiveViewerCount(res.data.activeViewerCount);
          }
          if (res.data.isLive === false || res.data.streamEnded) {
            setIsStreamEnded(true);
            setIsPlaying(false);
            if (typeof onEndStream === 'function') {
              onEndStream();
            }
          }
        }
      } catch (err) {
        // silent ping fail
      }
    };

    performViewerPing();
    const pingInterval = setInterval(() => {
      if (!document.hidden) {
        performViewerPing();
      }
    }, isStudent ? 6000 : 3500);
    return () => {
      clearInterval(pingInterval);
      if (isStudent && lessonId) {
        api.post(`/lessons/${lessonId}/live-stream/viewer-leave`).catch(() => {});
      }
    };
  }, [lessonId, liveStream?.isLive, isPlaying, isStudent]);

  useEffect(() => {
    if (!lessonId || !isStudent) return;
    const handleUnload = () => {
      try {
        const url = `${getApiBaseUrl()}/lessons/${lessonId}/live-stream/viewer-leave`;
        navigator.sendBeacon(url);
      } catch (e) {}
    };
    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, [lessonId, isStudent]);

  useEffect(() => {
    if (liveStream && liveStream.isLive === false) {
      setIsStreamEnded(true);
      setIsPlaying(false);
      if (isStudent) {
        setShowFeedbackModal(true);
      }
    }
  }, [liveStream?.isLive, isStudent]);

  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const iframeRef = useRef(null);
  const iframeId = useRef('lumina-live-stream-iframe');
  const controlsTimeoutRef = useRef(null);

  const pauseWallClockStartRef = useRef(null);
  const baseDelayWhenPausedRef = useRef(0);
  const isPausedRef = useRef(false);
  const exactStoppedTimeRef = useRef(null);

  useEffect(() => {
    isPausedRef.current = !isPlaying;
  }, [isPlaying]);

  // Auto-hide controls in fullscreen after 3 seconds of mouse inactivity
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setControlsVisible(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      resetControlsTimer();
    }
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [isFullscreen, resetControlsTimer]);

  // Sync fullscreen state with native document fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsActive = Boolean(document.fullscreenElement);
      setIsFullscreen(fsActive);
      setControlsVisible(true);
      if (fsActive) {
        setShowChatBox(false); // Default to clean 100% full screen video without chat
        setShowFsHint(true);
        setTimeout(() => setShowFsHint(false), 3000);
      } else {
        setShowFsHint(false);
      }
      if (fsActive && playerRef.current) {
        try {
          if (typeof playerRef.current.setPlaybackQuality === 'function') {
            playerRef.current.setPlaybackQuality('large');
          }
          if (typeof playerRef.current.setSuggestedQuality === 'function') {
            playerRef.current.setSuggestedQuality('large');
          }
          if (typeof playerRef.current.setPlaybackQualityRange === 'function') {
            playerRef.current.setPlaybackQualityRange('large', 'large');
          }
        } catch (e) {}
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Extract YouTube Video ID from any YouTube URL (live, watch, short, embed, mobile)
  const getYouTubeId = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/|shorts\/|&v=))([\w-]{11})/);
    if (match) return match[1];
    if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
    return null;
  };

  const videoId = getYouTubeId(liveStream?.youtubeUrl);

  const formatStandardTime = (sec) => {
    if (!sec || isNaN(sec) || sec <= 0) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const remM = m % 60;
      return `${h}:${remM < 10 ? '0' : ''}${remM}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Direct HTML5 postMessage command dispatcher with multi-target fallback
  const sendCommand = useCallback((func, args = []) => {
    const targets = [
      iframeRef.current,
      document.getElementById(iframeId.current),
      document.querySelector('#lumina-player-screen iframe'),
      document.querySelector('iframe[src*="youtube"]')
    ].filter(Boolean);

    targets.forEach((target) => {
      if (target && target.contentWindow) {
        try {
          target.contentWindow.postMessage(JSON.stringify({
            event: 'command',
            func: func,
            args: args
          }), '*');
        } catch (e) {}
      }
    });
  }, []);

  // Real-time live delay counter (Accurate Wall-Clock Tracking)
  useEffect(() => {
    if (!videoId) return;

    const interval = setInterval(() => {
      if (isPausedRef.current) {
        if (pauseWallClockStartRef.current) {
          const elapsedSecs = Math.floor((Date.now() - pauseWallClockStartRef.current) / 1000);
          const totalDelay = (baseDelayWhenPausedRef.current || 0) + elapsedSecs;
          setBehindLiveSeconds(totalDelay);
          setIsAtLiveEdge(totalDelay <= 3);
        }
      } else {
        const currentDelay = baseDelayWhenPausedRef.current || 0;
        setBehindLiveSeconds(currentDelay);
        setIsAtLiveEdge(currentDelay <= 3);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [videoId]);

  // Initialize YouTube IFrame Player API with direct native YouTube quality
  useEffect(() => {
    if (!videoId) return;

    let ytPlayerInstance = null;

    const setupPlayer = () => {
      const el = document.getElementById(iframeId.current) || iframeRef.current;
      if (window.YT && window.YT.Player && el) {
        try {
          ytPlayerInstance = new window.YT.Player(el, {
            events: {
              onReady: (event) => {
                playerRef.current = event.target;
                if (typeof event.target.setPlaybackQuality === 'function') {
                  try {
                    event.target.setPlaybackQuality('auto');
                    event.target.setPlaybackQuality('default');
                  } catch (e) {}
                }
                const pState = event.target.getPlayerState ? event.target.getPlayerState() : 1;
                setIsPlaying(pState === 1);
                setIsAtLiveEdge(true);
                setBehindLiveSeconds(0);
                setIsMuted(event.target.isMuted ? event.target.isMuted() : false);
                if (typeof event.target.getVolume === 'function') {
                  const v = event.target.getVolume();
                  if (typeof v === 'number') setVolume(v);
                }
              },
              onStateChange: (event) => {
                if (event.data === 1) {
                  setIsPlaying(true);
                  setIsStreamEnded(false);
                  if (!pauseWallClockStartRef.current && (baseDelayWhenPausedRef.current || 0) <= 3) {
                    setIsAtLiveEdge(true);
                    setBehindLiveSeconds(0);
                  }
                } else if (event.data === 0) {
                  setIsPlaying(false);
                  setIsStreamEnded(true);
                } else if (event.data === 2 || event.data === 5 || event.data === -1) {
                  setIsPlaying(false);
                }
              }
            }
          });
        } catch (err) {
          console.warn('YouTube Player API init error:', err);
        }
      }
    };

    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }

      window.onYouTubeIframeAPIReady = () => {
        setupPlayer();
      };
    } else {
      setTimeout(setupPlayer, 200);
    }

    return () => {
      if (ytPlayerInstance && typeof ytPlayerInstance.destroy === 'function') {
        try { ytPlayerInstance.destroy(); } catch (e) {}
      }
    };
  }, [videoId]);

  if (!liveStream || !liveStream.isLive || !liveStream.youtubeUrl) {
    return null;
  }

  // 1. LuminaLearn Play / Resume / Pause Toggle (Guaranteed Single Click Instant Response)
  const togglePlayPause = () => {
    resetControlsTimer();
    try {
      let pState = null;
      if (playerRef.current && typeof playerRef.current.getPlayerState === 'function') {
        pState = playerRef.current.getPlayerState();
      }

      const shouldPause = (pState === 1 || (pState === null && isPlaying));

      if (shouldPause) {
        let curr = null;
        try {
          if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
            curr = playerRef.current.getCurrentTime();
          }
        } catch (e) {}

        exactStoppedTimeRef.current = curr;
        pauseWallClockStartRef.current = Date.now();

        setIsPlaying(false);
        triggerCenterSplash('paused');

        if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
          try { playerRef.current.pauseVideo(); } catch (e) {}
        }
        sendCommand('pauseVideo');
      } else {
        if (pauseWallClockStartRef.current) {
          const elapsedSecs = Math.floor((Date.now() - pauseWallClockStartRef.current) / 1000);
          baseDelayWhenPausedRef.current = (baseDelayWhenPausedRef.current || 0) + elapsedSecs;
          pauseWallClockStartRef.current = null;
        }

        if (exactStoppedTimeRef.current !== null && exactStoppedTimeRef.current !== undefined) {
          if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
            try { playerRef.current.seekTo(exactStoppedTimeRef.current, true); } catch (e) {}
          }
          sendCommand('seekTo', [exactStoppedTimeRef.current, true]);
        }

        setIsPlaying(true);
        triggerCenterSplash('playing');

        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
          try { playerRef.current.playVideo(); } catch (e) {}
        }
        sendCommand('playVideo');
      }
    } catch (err) {
      console.warn('Play/Pause error:', err);
      setIsPlaying(!isPlaying);
    }
  };

  // 2. LuminaLearn Go Live Point Function (Instant sync to live broadcast edge)
  const handleGoLive = () => {
    resetControlsTimer();
    try {
      exactStoppedTimeRef.current = null;
      baseDelayWhenPausedRef.current = 0;
      pauseWallClockStartRef.current = null;
      setBehindLiveSeconds(0);
      setIsAtLiveEdge(true);
      setIsPlaying(true);

      let duration = 9999999;
      if (playerRef.current && typeof playerRef.current.getDuration === 'function') {
        duration = playerRef.current.getDuration() || 9999999;
      }

      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        try { playerRef.current.seekTo(duration, true); } catch (e) {}
      }
      sendCommand('seekTo', [duration, true]);

      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        try { playerRef.current.playVideo(); } catch (e) {}
      }
      sendCommand('playVideo');

      triggerCenterSplash('live');
      setQualityNotification('Synced to Live Broadcast Point');
      setTimeout(() => setQualityNotification(null), 2500);
    } catch (err) {
      console.warn('Go Live error:', err);
    }
  };

  // 3. Audio Mute / Unmute & Volume Adjust
  const toggleMute = () => {
    resetControlsTimer();
    try {
      if (isMuted) {
        if (playerRef.current && typeof playerRef.current.unMute === 'function') {
          try { playerRef.current.unMute(); } catch (e) {}
        }
        sendCommand('unMute');
        if (volume === 0) {
          setVolume(80);
          if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
            try { playerRef.current.setVolume(80); } catch (e) {}
          }
          sendCommand('setVolume', [80]);
        }
        setIsMuted(false);
      } else {
        if (playerRef.current && typeof playerRef.current.mute === 'function') {
          try { playerRef.current.mute(); } catch (e) {}
        }
        sendCommand('mute');
        setIsMuted(true);
      }
    } catch (err) {
      console.warn('Mute toggle error:', err);
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    resetControlsTimer();
    const val = Number(e.target.value);
    setVolume(val);
    try {
      if (val === 0) {
        setIsMuted(true);
        if (playerRef.current && typeof playerRef.current.mute === 'function') {
          try { playerRef.current.mute(); } catch (e) {}
        }
        sendCommand('mute');
      } else {
        if (isMuted) setIsMuted(false);
        if (playerRef.current && typeof playerRef.current.unMute === 'function') {
          try { playerRef.current.unMute(); } catch (e) {}
        }
        if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
          try { playerRef.current.setVolume(val); } catch (e) {}
        }
        sendCommand('unMute');
        sendCommand('setVolume', [val]);
      }
    } catch (err) {
      console.warn('Volume adjust error:', err);
    }
  };

  const triggerCenterSplash = (actionType) => {
    setShowCenterAction(actionType);
    setTimeout(() => {
      setShowCenterAction(null);
    }, 700);
  };

  const toggleNativeFullscreen = () => {
    resetControlsTimer();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      setShowChatBox(false); // Default to clean 100% full screen video
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };
  
  // Direct Native YouTube Live Stream URL with Full High-Definition Quality & Zero Downsampling
  const stableEmbedUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&fs=0&iv_load_policy=3&vq=auto&suggestedQuality=auto&origin=${origin}&widget_referrer=${origin}`;
  }, [videoId]);

  const currentVolPercentage = isMuted ? 0 : volume;

  return (
    <div 
      ref={containerRef}
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      className={
        isFullscreen 
          ? `fixed inset-0 w-screen h-screen bg-black z-50 overflow-hidden flex flex-row select-none ${controlsVisible ? 'cursor-default' : 'cursor-none'}` 
          : "w-full max-w-5xl mx-auto bg-gradient-to-br from-[#1e1b4b] via-indigo-950 to-[#2d1b64] p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl text-white shadow-2xl border border-indigo-500/40 space-y-3 sm:space-y-3.5 animate-fadeIn transition-all duration-300 relative"
      }
    >
      {/* Video Player Display Area (Shrinks on left when fullscreen chat is open) */}
      <div className={
        isFullscreen 
          ? "relative flex-1 min-w-0 h-full bg-black overflow-hidden flex flex-col justify-center items-center transition-all duration-300"
          : "w-full space-y-3 sm:space-y-3.5"
      }>
        {/* Top Header Bar (Direct Floating Elements Over Video in Fullscreen) */}
        <div 
          className={
            isFullscreen
              ? `absolute top-4 sm:top-5 left-4 sm:left-6 right-4 sm:right-6 z-40 flex items-center justify-between transition-all duration-300 ${
                  controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-4 pointer-events-none'
                }`
              : "flex items-center justify-between gap-3 px-1 py-0.5 shrink-0 flex-wrap sm:flex-nowrap"
          }
        >
        {/* Left Side: Pulsing Beacon + LIVE CLASS Badge (Red Border) + Large Stream Title */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
          {/* Pulsing Beacon */}
          <span className={`relative shrink-0 flex items-center justify-center ${isFullscreen ? 'h-4 w-4 sm:h-5 sm:w-5' : 'h-3.5 w-3.5 sm:h-4 sm:w-4'}`}>
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-85"></span>
            <span className="relative inline-flex rounded-full h-full w-full bg-red-500 shadow-red-500/70 shadow-lg"></span>
          </span>

          {/* LIVE CLASS Badge */}
          <div 
            className={`bg-gradient-to-r from-red-600 via-rose-600 to-red-700 border-red-400/90 shadow-red-950/60 text-white font-black uppercase border-2 shadow-xl flex items-center shrink-0 cursor-default select-none transition-all duration-200 transform hover:scale-105 ${
              isFullscreen 
                ? 'tracking-wider text-sm sm:text-base px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl' 
                : 'tracking-wider text-xs sm:text-sm px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl'
            }`}
          >
            <span>LIVE CLASS</span>
          </div>

          {/* Stream Title (Large, Bold & Prominent Header in Vibrant Yellow) */}
          <h3 className={`font-black truncate font-sans pl-1 select-none pointer-events-none transform-none tracking-tight text-yellow-300 ${
            isFullscreen 
              ? 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl drop-shadow-[0_3px_14px_rgba(0,0,0,0.95)]' 
              : 'text-lg sm:text-xl md:text-2xl lg:text-3xl drop-shadow-md'
          }`}>
            {liveStream.title || 'Online Live Stream'}
          </h3>
        </div>

        {/* Right Side: Active Viewers Badge + Chat Toggle + End Stream Button / Secure Badge */}
        <div className="flex items-center justify-end gap-2 shrink-0">

          {/* Active Lively Watching Badge (Teachers & Admins Only) */}
          {isTeacherOrAdmin && lessonId && (
            <button
              type="button"
              onClick={() => setShowViewersModal(true)}
              className={`flex items-center gap-1.5 bg-emerald-950/85 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 rounded-xl font-bold shadow-lg transition active:scale-95 cursor-pointer backdrop-blur-md ${
                isFullscreen ? 'px-3.5 py-2 text-xs sm:text-sm' : 'px-2.5 py-1 text-[11px]'
              }`}
              title="Click to view all active students watching this class"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <FaUsers className="text-emerald-400 text-xs" />
              <span>{activeViewerCount} Watching</span>
            </button>
          )}

          {/* End Stream Button (for Teachers/Admins) OR LuminaLearn Secure Player Badge (for Students) */}
          {isTeacherOrAdmin ? (
            <button
              type="button"
              onClick={() => {
                if (document.fullscreenElement) {
                  document.exitFullscreen().catch(() => {});
                }
                if (typeof onEndStream === 'function') {
                  onEndStream();
                } else {
                  setShowEndConfirm(true);
                }
              }}
              className={`bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-extrabold border border-red-400/40 shadow-2xl hover:shadow-red-900/50 backdrop-blur-md transition-all duration-200 cursor-pointer flex items-center gap-2 transform hover:scale-105 active:scale-95 shrink-0 ${
                isFullscreen 
                  ? 'px-5 py-2.5 sm:px-6 sm:py-3 rounded-2xl text-xs sm:text-sm' 
                  : 'px-3 py-1 sm:px-4 sm:py-2 rounded-xl text-xs'
              }`}
            >
              <FaTimes className={isFullscreen ? "text-sm" : "text-xs"} />
              <span>End Stream</span>
            </button>
          ) : (
            <div className={`flex items-center gap-2 bg-slate-950/85 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl border border-white/15 backdrop-blur-xl shadow-lg select-none ${
              isFullscreen ? 'text-xs sm:text-sm' : 'text-[11px]'
            }`}>
              <span className="font-semibold text-slate-200 tracking-wide flex items-center gap-1.5">
                <FaLock className="text-red-400 text-[10px]" /> LuminaLearn
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Video Player Display Container (Smooth Hover Elevation on Cursor) */}
      <div 
        id="lumina-player-screen"
        onContextMenu={(e) => e.preventDefault()}
        className={
          isFullscreen 
            ? "relative w-full h-full rounded-none overflow-hidden bg-black select-none z-0 flex items-center justify-center" 
            : "relative w-full aspect-video rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border border-white/20 hover:border-purple-400/50 bg-black select-none group/player transition-shadow duration-300 hover:shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_25px_rgba(147,51,234,0.25)]"
        }
      >
        {videoId ? (
          <>
            {/* 1. Embedded YouTube Player (100% Native 1:1 Hardware Decoded 1080p/4K YouTube Quality) */}
            <iframe
              ref={iframeRef}
              id={iframeId.current}
              src={stableEmbedUrl}
              title={liveStream.title || "LuminaLearn Live Classroom"}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              className="absolute inset-0 w-full h-full border-0 pointer-events-none select-none z-0"
              style={{
                width: '100%',
                height: '100%'
              }}
              tabIndex="-1"
            />

            {/* 2. Full-surface Click Layer for Play / Pause (Blocks ALL native YouTube overlays permanently) */}
            <div 
              onClick={togglePlayPause}
              className="absolute inset-0 z-20 cursor-pointer"
              style={{ backgroundColor: 'rgba(0,0,0,0.01)' }}
            />

            {/* 3. Top Edge Conceal Mask (Guarantees zero native YouTube header visibility) */}
            <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/80 via-black/20 to-transparent pointer-events-none z-22" />

            {/* 4. Bottom Edge Conceal Mask */}
            <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none z-22" />

            {/* Interactive Luminous Toast Notification */}
            {qualityNotification && (
              <div 
                onClick={() => setQualityNotification(null)}
                className={`absolute left-1/2 -translate-x-1/2 z-40 bg-slate-950/90 backdrop-blur-2xl px-5 py-2 sm:px-6 sm:py-2.5 rounded-full border border-emerald-500/40 shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_20px_rgba(16,185,129,0.25)] flex items-center gap-3 cursor-pointer select-none transition-all duration-300 transform hover:scale-105 active:scale-95 animate-in fade-in slide-in-from-top-4 ${
                  isFullscreen ? 'top-24 text-xs sm:text-sm' : 'top-8 sm:top-10 text-xs'
                }`}
                title="Click to dismiss"
              >
                <span className="relative flex h-2.5 w-2.5 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400 shadow-sm shadow-emerald-400"></span>
                </span>
                <span className="font-extrabold text-white tracking-wide font-sans">
                  {qualityNotification}
                </span>
                <span className="text-emerald-400/80 hover:text-white text-xs pl-1 font-bold">✕</span>
              </div>
            )}

            {/* Continuous Red Color Live Mic Pop-Up (Visible continuously while student mic is unmuted) */}
            {isLiveMicActive && (
              <div className={`absolute z-45 transition-all duration-300 animate-in fade-in zoom-in-95 pointer-events-auto ${
                isFullscreen 
                  ? 'top-20 left-6 sm:left-10' 
                  : 'top-4 left-4 sm:top-5 sm:left-5'
              }`}>
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white p-3 sm:p-3.5 pr-4 sm:pr-5 rounded-2xl sm:rounded-3xl shadow-[0_10px_35px_rgba(220,38,38,0.75),0_0_25px_rgba(239,68,68,0.45)] border-2 border-red-300/80 flex items-center gap-3 backdrop-blur-xl ring-4 ring-red-500/30">
                  {/* Pulsing Live Red Mic Circle */}
                  <div className="relative flex items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white text-red-600 flex items-center justify-center text-base sm:text-lg shadow-lg font-bold">
                      <FaMicrophone className="animate-pulse" />
                    </div>
                  </div>

                  {/* Info & Live Audio Wave Spectrum */}
                  <div className="flex flex-col select-none">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-white drop-shadow-sm">
                        Live Mic Active
                      </span>
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                      </span>
                    </div>

                    {/* Real-time Sound-Reactive Light Green Dots Spectrum */}
                    <div className="flex items-center gap-1.5 mt-1 h-4 px-2 py-0.5 bg-emerald-950/85 rounded-full border border-emerald-500/40 shadow-inner">
                      {[0, 1, 2, 3, 4].map((i) => {
                        const threshold = i * 14;
                        const isLit = liveMicAudioLevel > threshold;
                        const scale = isLit ? Math.min(1.4, 0.9 + (liveMicAudioLevel - threshold) / 45) : 0.75;
                        return (
                          <span
                            key={i}
                            style={{
                              transform: `scale(${scale})`,
                              transition: 'transform 75ms ease-out, opacity 75ms ease-out'
                            }}
                            className={`w-2 h-2 rounded-full transition-all duration-75 ${
                              isLit
                                ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.95)] opacity-100 ring-1 ring-emerald-300'
                                : 'bg-emerald-500/40 opacity-40'
                            }`}
                          />
                        );
                      })}
                      <span className="text-[9.5px] text-emerald-200 font-bold ml-1 font-mono tracking-tight">
                        {liveMicAudioLevel > 12 ? "Speaking..." : "Live"}
                      </span>
                    </div>
                  </div>

                  {/* Direct Mute Button in Popup */}
                  <button
                    type="button"
                    onClick={handleToggleLiveMic}
                    className="ml-2 px-3 py-1.5 bg-black/40 hover:bg-black/60 active:scale-95 text-white text-xs font-black rounded-xl border border-white/30 transition shadow-inner cursor-pointer flex items-center gap-1.5"
                    title="Click to Mute Microphone"
                  >
                    <FaMicrophoneSlash className="text-xs text-red-200" />
                    <span>Mute</span>
                  </button>
                </div>
              </div>
            )}

            {/* Center Play / Pause / Live Splash Animation (Transparent Ripple Circular Icons) */}
            {showCenterAction && (
              <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                <div className="bg-black/80 backdrop-blur-md p-5 rounded-full text-white border border-white/20 shadow-2xl animate-ping opacity-90">
                  {showCenterAction === 'playing' && <FaPlay className="text-3xl text-purple-400 pl-1" />}
                  {showCenterAction === 'paused' && <FaPause className="text-3xl text-amber-400" />}
                  {showCenterAction === 'live' && <span className="text-2xl font-black text-red-500">🔴 LIVE</span>}
                </div>
              </div>
            )}

            {/* Stream Ended Notification Overlay on Video (Visible for Students & Viewers) */}
            {isStreamEnded && (
              <div className="absolute inset-0 z-35 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 text-center animate-fadeIn select-none">
                <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 text-gray-900">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shadow-sm">
                    <span>🎓</span>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="text-lg font-black text-gray-900">Live Class Concluded</h4>
                    <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 text-left space-y-1.5">
                      <p className="font-bold text-amber-800 text-xs flex items-center gap-1.5">
                        <span>✅</span> Lecture ended for "{liveStream?.title || 'Live Stream'}".
                      </p>
                      <p className="text-gray-600 text-xs leading-relaxed">
                        Thank you for attending! Please share your reaction, feedback, or any questions for the teacher.
                      </p>
                    </div>
                  </div>

                  <div className="pt-1 flex flex-col gap-2">
                    {isStudent && (
                      <button
                        type="button"
                        onClick={() => setShowFeedbackModal(true)}
                        className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-indigo-900/40 cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                      >
                        <FaStar className="text-amber-300" />
                        <span>Leave Feedback & Ask Questions</span>
                      </button>
                    )}
                    <p className="text-[11px] text-gray-500 font-medium">
                      The recording will also be available in your lesson video library.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-red-300 font-semibold text-sm">
            Invalid YouTube Live Stream Link. Please check the URL.
          </div>
        )}
      </div>

      {/* LUMINALEARN CUSTOM CONTROLLER BAR (Interactive Normal Flow or Floating Overlay with Auto-Hide in Fullscreen) */}
      <div 
        className={
          isFullscreen 
            ? `absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 bg-slate-950/95 backdrop-blur-3xl border border-purple-500/35 rounded-3xl px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(147,51,234,0.2)] flex items-center justify-between gap-4 sm:gap-6 flex-nowrap transition-all duration-300 ${
                controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
              }`
            : "bg-slate-950/90 backdrop-blur-2xl border border-purple-500/30 hover:border-purple-500/50 rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(147,51,234,0.15)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(147,51,234,0.25)] grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 transition-all duration-300 transform hover:scale-[1.004]"
        }
      >
        {/* Col 1: Left Wing - LIVE / GO LIVE Button (Aligned Left) */}
        <div className="flex items-center justify-start min-w-0">
          <button
            type="button"
            onClick={handleGoLive}
            className={`font-black flex items-center gap-1.5 sm:gap-2 shadow-md active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 cursor-pointer backdrop-blur-md border shrink-0 group ${
              isFullscreen ? 'h-9 sm:h-9.5 px-3 sm:px-4 rounded-xl sm:rounded-2xl text-xs' : 'h-7.5 sm:h-8 px-2 sm:px-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[10.5px]'
            } ${
              isAtLiveEdge && isPlaying
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 border-red-400/60 shadow-red-950/70 hover:shadow-red-600/40 text-white'
                : 'bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-600 hover:to-rose-600 border-red-400/60 shadow-red-950/80 ring-1.5 ring-red-500/40 animate-pulse text-white'
            }`}
            title={isAtLiveEdge && isPlaying ? "Currently Streaming Live (Click to re-sync)" : "Click to jump to real-time live broadcast"}
          >
            {/* Pulsing Beacon */}
            <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white shadow-xs"></span>
            </span>

            {/* Typography */}
            <span className="tracking-wider font-black uppercase text-[10px] sm:text-[10.5px] text-white drop-shadow-xs font-sans">
              {isAtLiveEdge && isPlaying ? "LIVE" : "GO LIVE"}
            </span>

            {/* Delay / Paused Latency Chip */}
            {(!isAtLiveEdge || !isPlaying || behindLiveSeconds > 0) && (
              <span className="px-1.5 py-0.2 rounded-md bg-black/60 border border-white/20 text-white font-mono font-bold text-[9.5px] sm:text-[10px] tracking-tight shadow-inner flex items-center gap-0.5 backdrop-blur-sm ml-0.5">
                <span className="text-amber-300">{!isPlaying ? "⏸" : "⏱"}</span>
                <span className="text-amber-200 font-semibold">
                  -{formatStandardTime(behindLiveSeconds)}
                </span>
              </span>
            )}
          </button>
        </div>

        {/* Col 2: Center Hub - Balanced [ Q&A ] - [ HERO RESUME ] - [ LIVE MIC ] (Exact Geometric Center) */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 shrink-0">
          {/* Left: Compact Q&A / Live Chat Button */}
          {lessonId && (
            <button
              type="button"
              onClick={() => setShowChatBox(!showChatBox)}
              className={`relative font-bold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 cursor-pointer backdrop-blur-md border group shrink-0 ${
                isFullscreen 
                  ? 'h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl text-xs' 
                  : 'h-8 sm:h-8.5 px-2.5 sm:px-3 rounded-lg sm:rounded-xl text-[10.5px] sm:text-[11px]'
              } ${
                showChatBox
                  ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 text-white border-purple-400/80 shadow-purple-950/70 ring-1.5 ring-purple-400/50'
                  : 'bg-slate-900/90 hover:bg-slate-850 text-purple-300 hover:text-white border-purple-500/40 hover:border-purple-400/70 shadow-sm'
              }`}
              title={showChatBox ? "Hide Live Chat / Discussion" : "Open Live Chat / Discussion"}
            >
              {/* Refined Notification Dot on Top Right Corner for Unread Messages (Only when chat is closed) */}
              {hasUnreadChat && !showChatBox && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 z-30 pointer-events-none" title="New unread messages">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-slate-950 shadow-xs"></span>
                </span>
              )}

              <span className={`rounded-lg flex items-center justify-center shadow-inner transition-colors ${
                isFullscreen ? 'w-5.5 h-5.5' : 'w-4.5 h-4.5 sm:w-5 sm:h-5'
              } ${
                showChatBox 
                  ? 'bg-white/25 text-amber-300' 
                  : 'bg-purple-600/30 text-purple-300 group-hover:bg-purple-600 group-hover:text-white'
              }`}>
                <FaComments className="text-[10px] sm:text-xs" />
              </span>
              <span className="tracking-wider uppercase font-black font-sans text-[10px] sm:text-[11px]">
                Chat
              </span>
            </button>
          )}

          {/* Center: Maximum Size Hero Resume / Pause Centerpiece */}
          <button
            type="button"
            onClick={togglePlayPause}
            className={`font-black flex items-center justify-center gap-2 sm:gap-2.5 shadow-2xl active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 cursor-pointer backdrop-blur-md border-2 group shrink-0 ${
              isFullscreen 
                ? 'h-12 sm:h-13 px-7 sm:px-9 rounded-2xl text-sm sm:text-base md:text-lg' 
                : 'h-9.5 sm:h-10.5 px-4.5 sm:px-5.5 rounded-2xl text-xs sm:text-sm font-black'
            } ${
              isPlaying
                ? 'bg-gradient-to-r from-slate-900 via-purple-950/90 to-slate-900 hover:from-purple-900 hover:to-indigo-900 text-white border-purple-400/60 hover:border-purple-300 shadow-[0_4px_25px_rgba(147,51,234,0.35)]'
                : 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white border-emerald-300 shadow-[0_4px_25px_rgba(16,185,129,0.45)]'
            }`}
            title={isPlaying ? "Pause Live Stream" : "Resume Live Stream"}
          >
            <span className={`rounded-xl flex items-center justify-center shadow-inner transition-colors ${
              isFullscreen ? 'w-7.5 h-7.5 sm:w-8.5 sm:h-8.5' : 'w-6 h-6 sm:w-6.5 sm:h-6.5'
            } ${
              isPlaying 
                ? 'bg-purple-600/40 border border-purple-400/50 text-purple-200 group-hover:bg-purple-600 group-hover:text-white' 
                : 'bg-white/25 text-white'
            }`}>
              {isPlaying ? <FaPause className="text-xs sm:text-sm" /> : <FaPlay className="text-xs sm:text-sm pl-0.5" />}
            </span>
            <span className="tracking-widest uppercase font-black text-xs sm:text-sm">{isPlaying ? "Pause" : "Resume"}</span>
          </button>

          {/* Right: Compact Live Mic Icon Button for Students */}
          <button
            type="button"
            onClick={handleToggleLiveMic}
            className={`font-bold flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 cursor-pointer backdrop-blur-md border group shrink-0 ${
              isFullscreen 
                ? 'w-9.5 h-9.5 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl text-sm' 
                : 'w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-lg sm:rounded-xl text-xs'
            } ${
              isLiveMicActive
                ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white border-red-400 shadow-red-950/80 ring-2 ring-red-400/70 animate-pulse'
                : 'bg-slate-900/90 hover:bg-slate-850 text-purple-300 hover:text-white border-purple-500/40 hover:border-purple-400/70 shadow-sm'
            }`}
            title={isLiveMicActive ? "Mute Live Microphone" : "Unmute Live Microphone"}
          >
            {isLiveMicActive ? (
              <FaMicrophone className="text-xs sm:text-sm text-white animate-pulse" />
            ) : (
              <FaMicrophoneSlash className="text-xs sm:text-sm text-purple-300 group-hover:text-white transition-colors" />
            )}
          </button>
        </div>

        {/* Col 3: Right Wing - Compact Sound Adjust & Fullscreen Toggle (Aligned Right) */}
        <div className="flex items-center justify-end gap-1.5 sm:gap-2 min-w-0">
          <div className={`flex items-center gap-1.5 bg-slate-900/90 hover:bg-slate-850 rounded-xl sm:rounded-2xl border border-purple-500/30 hover:border-purple-400/60 transition-all shadow-md group shrink-0 ${
            isFullscreen ? 'px-3 py-1.5' : 'px-2 py-1'
          }`}>
            <button
              type="button"
              onClick={toggleMute}
              className="text-purple-300 hover:text-white transition cursor-pointer p-0.5 shrink-0"
              title={isMuted ? "Unmute Sound" : "Mute Sound"}
            >
              {isMuted || volume === 0 ? (
                <FaVolumeMute className={`text-red-400 animate-pulse ${isFullscreen ? 'text-base' : 'text-xs sm:text-sm'}`} />
              ) : volume < 50 ? (
                <FaVolumeDown className={`text-purple-300 group-hover:text-white transition-colors ${isFullscreen ? 'text-base' : 'text-xs sm:text-sm'}`} />
              ) : (
                <FaVolumeUp className={`text-purple-300 group-hover:text-white transition-colors ${isFullscreen ? 'text-base' : 'text-xs sm:text-sm'}`} />
              )}
            </button>
            
            {/* Compact Volume Slider */}
            <input
              type="range"
              min="0"
              max="100"
              value={currentVolPercentage}
              onChange={handleVolumeChange}
              style={{
                background: `linear-gradient(to right, #9333ea 0%, #c084fc ${currentVolPercentage}%, #334155 ${currentVolPercentage}%, #334155 100%)`
              }}
              className={`rounded-lg appearance-none cursor-pointer accent-purple-400 hover:accent-purple-300 transition-all shadow-inner ${
                isFullscreen ? 'w-16 sm:w-24 h-2' : 'w-10 sm:w-14 h-1.5'
              }`}
              title={`Volume: ${currentVolPercentage}%`}
            />

            <span className={`font-mono font-bold text-purple-200 text-right select-none ${isFullscreen ? 'text-xs w-6' : 'text-[9.5px] sm:text-[10px] w-5'}`}>
              {currentVolPercentage}%
            </span>
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className={`bg-slate-900/90 hover:bg-purple-900/70 border border-purple-500/30 hover:border-purple-400/70 shadow-md backdrop-blur-md flex items-center justify-center text-purple-300 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 group shrink-0 ${
              isFullscreen ? 'w-9.5 h-9.5 sm:w-10.5 sm:h-10.5 rounded-2xl' : 'w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-xl'
            }`}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <FaCompress className="text-xs sm:text-sm group-hover:scale-110 transition-transform text-purple-300" />
            ) : (
              <FaExpand className="text-xs group-hover:scale-110 transition-transform" />
            )}
          </button>
        </div>
      </div>

      {/* REAL-TIME INTERACTIVE MESSAGE BAR AT BOTTOM OF BUTTON BAR (Controlled by Left Chat Button) */}
      {!isFullscreen && lessonId && (
        <div className={!showChatBox ? 'hidden' : 'pt-2 animate-fadeIn'}>
          <LiveChatBox
            lessonId={lessonId}
            isTeacherOrAdmin={isTeacherOrAdmin}
            isFullscreen={false}
            isVisible={showChatBox}
            currentGrade={grade}
            classTitle={liveStream?.title}
            isLiveMicActive={isLiveMicActive}
            isStreamEnded={!liveStream?.isLive}
            onVoiceRecordingChange={setIsChatVoiceRecording}
            onUnreadChange={setHasUnreadChat}
          />
        </div>
      )}
      </div>

      {/* FULLSCREEN SIDE-BY-SIDE LIVE CHAT SIDEBAR (Floating Rounded Card Beside Video on Right) */}
      {isFullscreen && lessonId && showChatBox && (
        <div className="p-3 sm:p-4 h-full flex flex-col justify-center shrink-0 z-40 animate-in slide-in-from-right duration-300">
          <div className="w-80 sm:w-96 lg:w-[410px] xl:w-[450px] h-[calc(100vh-24px)] sm:h-[calc(100vh-32px)] bg-white rounded-3xl border-2 border-purple-500/40 shadow-[0_15px_40px_rgba(0,0,0,0.85),0_0_30px_rgba(147,51,234,0.25)] flex flex-col overflow-hidden select-auto">
            {/* Sidebar Header */}
            <div className="px-3 py-2 sm:px-4 sm:py-2.5 bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-900 text-white flex items-center justify-between shadow-md border-b border-purple-500/30 shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-white/15 text-amber-300 flex items-center justify-center text-xs shadow-inner">
                  <FaComments />
                </span>
                <div>
                  <h4 className="font-extrabold text-xs sm:text-[13px] tracking-wide text-white flex items-center gap-1.5">
                    <span>{!liveStream?.isLive ? "Stream Discussion & Feedback" : "Live Discussion & Chat"}</span>
                    {liveStream?.isLive ? (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.2 rounded-full bg-rose-500/80 text-white font-bold text-[8.5px]">
                        Concluded
                      </span>
                    )}
                  </h4>
                  <span className="text-[9.5px] sm:text-[10px] text-purple-200 font-medium">
                    {!liveStream?.isLive 
                      ? "Stream Feedback & Questions" 
                      : (isStudent ? "Private Questions to Teacher" : "Live Student Chat Stream")}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChatBox(false)}
                className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
                title="Close Chat (Shift to 100% Fullscreen Video)"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>

            {/* Full-height Chatbox */}
            <div className="flex-1 min-h-0 h-full overflow-hidden bg-white flex flex-col">
              <LiveChatBox
                lessonId={lessonId}
                isTeacherOrAdmin={isTeacherOrAdmin}
                isFullscreen={true}
                isVisible={showChatBox}
                currentGrade={grade}
                classTitle={liveStream?.title}
                isLiveMicActive={isLiveMicActive}
                isStreamEnded={!liveStream?.isLive}
                onVoiceRecordingChange={setIsChatVoiceRecording}
                onUnreadChange={setHasUnreadChat}
              />
            </div>
          </div>
        </div>
      )}

      {/* Simple End Stream Confirmation Pop-Up Modal (Bright Light Mode Window) */}
      {showEndConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn select-none">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200 text-gray-900">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 text-2xl shadow-sm">
              <FaTimes />
            </div>
            
            <div className="space-y-1.5">
              <h4 className="text-lg font-black text-gray-900">End Live Stream?</h4>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                Are you sure you want to stop this live class session for all participants?
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 font-bold text-xs border border-gray-200 transition cursor-pointer active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEndConfirm(false);
                  if (onEndStream) onEndStream();
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs shadow-lg shadow-red-600/25 transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <FaTimes className="text-xs" />
                <span>Yes, End Stream</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Live End Stream Feedback Modal with Curated Good Reactions & Questions */}
      <LiveEndFeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        lessonId={lessonId}
        streamTitle={liveStream?.title}
        grade={grade}
      />

      {/* Lively Watching Students Inspector Modal for Teachers & Admins */}
      {isTeacherOrAdmin && (
        <LiveViewersModal
          isOpen={showViewersModal}
          onClose={() => setShowViewersModal(false)}
          lessonId={lessonId}
          grade={grade}
          streamTitle={liveStream?.title}
        />
      )}
    </div>
  );
};

export default LiveStreamPlayer;

