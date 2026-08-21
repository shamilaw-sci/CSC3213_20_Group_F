import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  FaPaperPlane, 
  FaLock, 
  FaUserGraduate, 
  FaChalkboardTeacher, 
  FaChevronDown, 
  FaChevronUp, 
  FaComments,
  FaSmile,
  FaCamera,
  FaPaperclip,
  FaTimes,
  FaBullhorn,
  FaFileAlt,
  FaFilePdf,
  FaFileWord,
  FaFileArchive,
  FaDownload,
  FaInfoCircle,
  FaUserCircle,
  FaMicrophone,
  FaPlay,
  FaPause,
  FaStop,
  FaRedo,
  FaTrash,
  FaBolt,
  FaLightbulb,
  FaShieldAlt,
  FaHourglassHalf,
  FaClock,
  FaListUl
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import StudentProfileModal from './StudentProfileModal';
import CameraCaptureModal from './CameraCaptureModal';

// Realistic WhatsApp-style Waveform Frequency Heights
const WAVEFORM_BARS = [
  35, 60, 40, 80, 100, 70, 45, 90, 65, 30, 75, 95, 60, 40, 85, 100, 50, 70, 90, 45, 60, 80, 55, 35, 70, 90, 40, 65
];

// Centralized Voice Playback Manager (Single-Active Instant Switch)
class AudioQueueManager {
  constructor() {
    this.currentlyPlayingId = null;
    this.listeners = new Set();
    this.playHandlers = new Map(); // id -> () => void
    this.pauseHandlers = new Map(); // id -> () => void
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener({
        currentlyPlayingId: this.currentlyPlayingId
      });
    }
  }

  registerPlayer(id, playFn, pauseFn) {
    this.playHandlers.set(id, playFn);
    this.pauseHandlers.set(id, pauseFn);
    return () => {
      this.playHandlers.delete(id);
      this.pauseHandlers.delete(id);
    };
  }

  requestPlay(id) {
    if (!id) return;

    // 1. If this audio is currently playing -> Pause it
    if (this.currentlyPlayingId === id) {
      const pauseFn = this.pauseHandlers.get(id);
      if (pauseFn) pauseFn();
      this.currentlyPlayingId = null;
      this.notify();
      return;
    }

    // 2. If another audio is currently playing -> Pause previous audio immediately
    if (this.currentlyPlayingId && this.currentlyPlayingId !== id) {
      const prevPause = this.pauseHandlers.get(this.currentlyPlayingId);
      if (prevPause) prevPause();
    }

    // 3. Play clicked voice note instantly
    this.currentlyPlayingId = id;
    const playFn = this.playHandlers.get(id);
    if (playFn) playFn();
    this.notify();
  }

  notifyEnded(id) {
    if (this.currentlyPlayingId === id) {
      this.currentlyPlayingId = null;
      this.notify();
    }
  }

  notifyPaused(id) {
    if (this.currentlyPlayingId === id) {
      this.currentlyPlayingId = null;
      this.notify();
    }
  }
}

export const globalAudioQueue = new AudioQueueManager();

// WhatsApp-Style Interactive Playable Voice Note Component with Instant Playback & Emerald Broadcast Theme
const AudioMessagePlayer = ({ src, duration, isFromMe, role = 'student', isBroadcast = false, audioId }) => {
  const resolvedAudioSrc = useMemo(() => {
    return getFullAttachmentUrl(src);
  }, [src]);

  // Stable Unique ID for this player instance (prefer resolved URL so ID remains identical across state updates)
  const effectiveId = useMemo(() => {
    return resolvedAudioSrc || audioId || String(duration || 'audio_voice');
  }, [audioId, resolvedAudioSrc, duration]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [hasAudioError, setHasAudioError] = useState(false);
  const audioRef = useRef(null);

  // Subscribe to Global Audio Playback Manager
  useEffect(() => {
    const unsubscribe = globalAudioQueue.subscribe(({ currentlyPlayingId }) => {
      const active = currentlyPlayingId === effectiveId;
      setIsPlaying(active);

      if (!active && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause();
      }
    });

    const unregister = globalAudioQueue.registerPlayer(
      effectiveId,
      () => {
        if (audioRef.current) {
          const playPromise = audioRef.current.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                setIsPlaying(true);
                setHasAudioError(false);
              })
              .catch((err) => {
                console.warn("Audio play interrupted:", err);
                setIsPlaying(false);
              });
          }
        }
      },
      () => {
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      }
    );

    return () => {
      unregister();
      unsubscribe();
    };
  }, [effectiveId]);

  useEffect(() => {
    setHasAudioError(false);
  }, [resolvedAudioSrc]);

  const formatSec = (sec) => {
    if (!sec || isNaN(sec) || !isFinite(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const togglePlay = () => {
    globalAudioQueue.requestPlay(effectiveId);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
        setTotalDuration(audioRef.current.duration);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    globalAudioQueue.notifyEnded(effectiveId);
  };

  const togglePlaybackRate = (e) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const handleWaveformClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    const targetDuration = totalDuration || audioRef.current?.duration || 1;
    const newTime = clickPercent * targetDuration;
    if (audioRef.current && targetDuration > 0) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const targetDuration = totalDuration || (audioRef.current?.duration > 0 ? audioRef.current.duration : 0);
  const progressPercent = targetDuration > 0 ? (currentTime / targetDuration) * 100 : 0;

  const isBroadcastMsg = isBroadcast || role === 'broadcast';
  const isTeacher = !isBroadcastMsg && role === 'teacher';
  const isAdmin = !isBroadcastMsg && role === 'admin';

  return (
    <div className={`relative px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl sm:rounded-3xl flex items-center gap-2.5 sm:gap-3 w-full max-w-[285px] sm:max-w-[325px] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
      isPlaying ? 'ring-2 ring-white/70 shadow-xl' : ''
    } ${
      isBroadcastMsg
        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-emerald-950/25 border border-emerald-300/60 ring-1 ring-emerald-200/40 font-medium'
        : isTeacher
          ? 'bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 shadow-amber-950/20 border border-amber-400/80 font-bold'
          : isAdmin
            ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-purple-950/25 border border-purple-400/30 font-medium'
            : 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white shadow-sky-950/25 border border-sky-300/50 font-medium'
    }`}>
      
      <audio
        ref={audioRef}
        src={resolvedAudioSrc}
        preload="metadata"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleTimeUpdate}
        onDurationChange={handleTimeUpdate}
        onCanPlay={handleTimeUpdate}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false);
          setHasAudioError(true);
        }}
        className="hidden"
      />

      {/* WhatsApp Play / Pause Round Button */}
      <button
        type="button"
        onClick={togglePlay}
        title={isPlaying ? "Pause voice note" : "Play voice note"}
        className={`w-8.5 h-8.5 sm:w-9.5 sm:h-9.5 rounded-full flex items-center justify-center text-xs font-black transition-all shadow-md cursor-pointer shrink-0 active:scale-90 hover:scale-105 ${
          isBroadcastMsg
            ? 'bg-white text-emerald-700 hover:bg-emerald-50 shadow-emerald-950/30'
            : isTeacher
              ? 'bg-white text-amber-700 hover:bg-amber-50 shadow-amber-950/30'
              : isAdmin
                ? 'bg-white text-purple-700 hover:bg-purple-50 shadow-purple-950/30'
                : 'bg-white text-sky-700 hover:bg-sky-50 shadow-sky-950/30'
        }`}
      >
        {isPlaying ? (
          <FaPause className="text-xs" />
        ) : (
          <FaPlay className="text-xs pl-0.5" />
        )}
      </button>

      {/* Center Waveform Spectrum & Time */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1.5 select-none">
        {/* Interactive Soundwave Bars */}
        <div 
          onClick={handleWaveformClick}
          className="flex items-center gap-[2px] sm:gap-[2.5px] h-6 cursor-pointer py-1 group/wave"
        >
          {WAVEFORM_BARS.map((heightPct, idx) => {
            const barProgress = (idx / WAVEFORM_BARS.length) * 100;
            const isPlayed = progressPercent >= barProgress;
            return (
              <span
                key={idx}
                className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-75 group-hover/wave:opacity-90 ${
                  isPlayed
                    ? (isBroadcastMsg ? 'bg-amber-300 shadow-2xs' : isTeacher ? 'bg-amber-600' : 'bg-amber-300 shadow-2xs')
                    : (isBroadcastMsg ? 'bg-emerald-200/50' : isTeacher ? 'bg-amber-300/60' : isAdmin ? 'bg-purple-300/40' : 'bg-sky-200/40')
                }`}
                style={{
                  height: `${Math.max(4, Math.round((heightPct / 100) * 18) + 2)}px`
                }}
              />
            );
          })}
        </div>

        {/* Bottom Metadata: Timer + Voice Note Label + Speed Toggle */}
        <div className={`flex items-center justify-between text-xs font-sans font-semibold ${
          isBroadcastMsg ? 'text-emerald-50' : isTeacher ? 'text-amber-950' : 'text-white/95'
        }`}>
          <span className="font-semibold text-xs tracking-tight">
            {formatSec(currentTime > 0 ? currentTime : targetDuration)}
          </span>

          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-semibold flex items-center gap-1 font-sans ${
              isBroadcastMsg
                ? 'text-emerald-100 font-bold'
                : isTeacher ? 'text-amber-900/90' : 'text-white/90'
            }`}>
              {isBroadcastMsg ? (
                <>
                  <FaBullhorn className="text-[10px] text-amber-300" />
                  <span>Broadcast</span>
                </>
              ) : (
                <>
                  <FaMicrophone className="text-[10px]" />
                  <span>Voice Note</span>
                </>
              )}
            </span>

            {/* Playback Speed Pill Button */}
            <button
              type="button"
              onClick={togglePlaybackRate}
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold font-sans transition cursor-pointer active:scale-95 shadow-2xs ${
                isBroadcastMsg
                  ? 'bg-emerald-900/60 hover:bg-emerald-900/80 text-emerald-100 border border-emerald-300/40'
                  : isTeacher
                    ? 'bg-amber-200/80 hover:bg-amber-300 text-amber-950 border border-amber-300/80'
                    : 'bg-white/25 hover:bg-white/35 text-white ring-1 ring-white/30'
              }`}
              title="Change audio playback speed"
            >
              {playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Global helper to format complete attachment URLs
const getFullAttachmentUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('blob:') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;
  if (url.startsWith('/assets/') || url.startsWith('assets/')) return url.startsWith('/') ? url : `/${url}`;
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

// Robust Chat Avatar Component with automatic fallback to instructor photo or initial letter
const ChatAvatar = ({ avatarSrc, senderName, isSenderAdmin, isSenderTeacher }) => {
  const [imgError, setImgError] = useState(false);

  const resolvedSrc = useMemo(() => {
    const nameLower = (senderName || '').toLowerCase();
    
    // 1. If Admin: MUST use admin avatar
    if (isSenderAdmin || (nameLower.includes('admin') && !nameLower.includes('chaminda') && !nameLower.includes('herath') && !isSenderTeacher)) {
      if (avatarSrc && !avatarSrc.includes('LuminaLearn_Logo') && !avatarSrc.includes('logo') && !avatarSrc.includes('kirula_logo') && !avatarSrc.includes('founder_photo')) {
        return avatarSrc;
      }
      return '/assets/LuminaLearn_Logo_icon.png';
    }

    // 2. If teacher / instructor: MUST use instructor photo
    if (isSenderTeacher || nameLower.includes('chaminda') || nameLower.includes('herath') || nameLower.includes('kumara') || nameLower.includes('instructor') || nameLower.includes('teacher')) {
      if (nameLower.includes('pathum')) {
        return '/assets/pathum_gunawardhana.png';
      }
      if (nameLower.includes('sankha')) {
        return '/assets/sankha_dissanayake.png';
      }
      if (nameLower.includes('lasantha')) {
        return '/assets/lasantha_wedagedara.png';
      }
      if (nameLower.includes('kevin')) {
        return '/assets/kevin_daraniyagala.png';
      }
      if (nameLower.includes('rashmi')) {
        return '/assets/rashmi_gunawardhana.png';
      }
      if (avatarSrc && !avatarSrc.includes('LuminaLearn_Logo') && !avatarSrc.includes('logo') && !avatarSrc.includes('kirula_logo') && !avatarSrc.includes('default')) {
        return avatarSrc;
      }
      return '/assets/founder_photo.png';
    }

    return avatarSrc || '';
  }, [avatarSrc, senderName, isSenderTeacher, isSenderAdmin]);

  const fullUrl = getFullAttachmentUrl(resolvedSrc);
  const initial = (senderName || (isSenderAdmin ? 'Admin' : isSenderTeacher ? 'Instructor' : 'User')).charAt(0).toUpperCase();

  const borderClasses = isSenderAdmin 
    ? 'border-purple-300 ring-2 ring-purple-100' 
    : isSenderTeacher 
      ? 'border-amber-300 ring-2 ring-amber-100' 
      : 'border-indigo-300 ring-2 ring-indigo-100';

  const gradientClasses = isSenderAdmin
    ? 'bg-gradient-to-tr from-purple-700 to-indigo-700 text-white'
    : isSenderTeacher 
      ? 'bg-gradient-to-tr from-amber-500 to-yellow-500 text-slate-950' 
      : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white';

  return (
    <div className="shrink-0 pt-0.5 select-none transition-all duration-200 hover:scale-105">
      {fullUrl && !imgError ? (
        <img
          src={fullUrl}
          alt={senderName || 'Avatar'}
          onError={() => setImgError(true)}
          className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full object-cover border-2 shadow-xs ${borderClasses}`}
        />
      ) : (
        <div className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center font-black text-xs shadow-xs border-2 ${borderClasses} ${gradientClasses}`}>
          <span>{initial}</span>
        </div>
      )}
    </div>
  );
};

// WhatsApp / Telegram Style Interactive Document / File Card Component
const DocumentMessageCard = ({ attachment, isFromMe, isSenderAdmin, isSenderTeacher }) => {
  if (!attachment || !attachment.url) return null;

  const fileName = attachment.originalName || 'Document File';
  const fileExt = (fileName.split('.').pop() || 'FILE').toUpperCase();
  const sizeBytes = attachment.size || attachment.fileSize;
  const formattedSize = sizeBytes 
    ? (sizeBytes > 1024 * 1024 
        ? `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB` 
        : `${Math.round(sizeBytes / 1024)} KB`)
    : `${fileExt} File`;

  const getFileIconAndColors = () => {
    const ext = fileExt.toLowerCase();
    if (ext === 'pdf') {
      return {
        icon: <FaFilePdf className="text-lg" />,
        badgeBg: isFromMe ? 'bg-red-400/30 text-red-100 border-red-300/40' : 'bg-red-100 text-red-700 border-red-200',
        iconBg: 'bg-gradient-to-tr from-red-600 to-rose-600 text-white shadow-md shadow-red-950/20'
      };
    }
    if (['doc', 'docx'].includes(ext)) {
      return {
        icon: <FaFileWord className="text-lg" />,
        badgeBg: isFromMe ? 'bg-blue-400/30 text-blue-100 border-blue-300/40' : 'bg-blue-100 text-blue-700 border-blue-200',
        iconBg: 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-950/20'
      };
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return {
        icon: <FaFileArchive className="text-lg" />,
        badgeBg: isFromMe ? 'bg-amber-400/30 text-amber-100 border-amber-300/40' : 'bg-amber-100 text-amber-800 border-amber-200',
        iconBg: 'bg-gradient-to-tr from-amber-600 to-orange-600 text-white shadow-md shadow-amber-950/20'
      };
    }
    return {
      icon: <FaFileAlt className="text-lg" />,
      badgeBg: isFromMe ? 'bg-white/25 text-white border-white/30' : 'bg-indigo-100 text-indigo-800 border-indigo-200',
      iconBg: isFromMe ? 'bg-white/25 text-white shadow-md' : 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-950/20'
    };
  };

  const { icon, badgeBg, iconBg } = getFileIconAndColors();
  const fileUrl = getFullAttachmentUrl(attachment.url);

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      download={fileName}
      className={`group p-3 sm:p-3.5 rounded-2xl flex items-center gap-3 min-w-[240px] sm:min-w-[270px] max-w-[340px] transition-all duration-200 hover:scale-[1.015] hover:shadow-lg select-none no-underline border cursor-pointer ${
        isFromMe
          ? 'bg-white/15 hover:bg-white/25 text-white border-white/30 shadow-md backdrop-blur-xs'
          : isSenderAdmin
            ? 'bg-gradient-to-r from-purple-100/95 via-indigo-50/90 to-purple-100/95 hover:from-purple-200/95 hover:to-indigo-100/95 text-purple-950 border-purple-300 shadow-sm'
            : isSenderTeacher
              ? 'bg-gradient-to-r from-amber-100/95 via-yellow-50/90 to-amber-100/95 hover:from-amber-200/95 hover:to-yellow-100/95 text-amber-950 border-amber-300 shadow-sm'
              : 'bg-gradient-to-r from-sky-100/95 via-blue-50/90 to-sky-100/95 hover:from-sky-200/95 hover:to-blue-100/95 text-sky-950 border-sky-300 shadow-sm'
      }`}
      title={`Click to open/download ${fileName}`}
    >
      {/* File Type Icon Badge */}
      <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center transition-transform duration-200 group-hover:scale-105 shrink-0 ${iconBg}`}>
        {icon}
      </div>

      {/* File Metadata */}
      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p className={`font-bold text-xs sm:text-[13px] truncate leading-snug tracking-tight ${isFromMe ? 'text-white' : 'text-gray-900 group-hover:text-black'}`}>
          {fileName}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={`px-1.5 py-0.2 rounded-md font-mono font-black text-[9.5px] uppercase tracking-wider border ${badgeBg}`}>
            {fileExt}
          </span>
          <span className={`text-[11px] font-semibold font-mono ${isFromMe ? 'text-white/85' : 'text-gray-600'}`}>
            {formattedSize}
          </span>
        </div>
      </div>

      {/* Action Download / Open Icon Circle */}
      <div className={`w-8.5 h-8.5 rounded-full flex items-center justify-center transition-all duration-200 group-hover:scale-110 shrink-0 shadow-2xs ${
        isFromMe 
          ? 'bg-white/20 text-white group-hover:bg-white group-hover:text-purple-900' 
          : 'bg-white text-gray-700 group-hover:bg-gray-900 group-hover:text-white border border-gray-200'
      }`}>
        <FaDownload className="text-xs" />
      </div>
    </a>
  );
};

const QUICK_EMOJIS = [
  { emoji: "😊", code: "1f60a", name: "Blush Smile" },
  { emoji: "👍", code: "1f44d", name: "Thumbs Up" },
  { emoji: "💡", code: "1f4a1", name: "Idea" },
  { emoji: "❓", code: "2753", name: "Question" },
  { emoji: "👏", code: "1f44f", name: "Clap" },
  { emoji: "🔥", code: "1f525", name: "Fire" },
  { emoji: "📚", code: "1f4da", name: "Books" },
  { emoji: "🌟", code: "1f31f", name: "Star" },
  { emoji: "❤️", code: "2764-fe0f", name: "Red Heart" },
  { emoji: "🚀", code: "1f680", name: "Rocket" },
  { emoji: "🎯", code: "1f3af", name: "Target" },
  { emoji: "🎉", code: "1f389", name: "Tada" },
  { emoji: "📝", code: "1f4dd", name: "Notes" },
  { emoji: "✋", code: "270b", name: "Hand" },
  { emoji: "🙋‍♂️", code: "1f64b-200d-2642-fe0f", name: "Raising Hand" },
  { emoji: "💯", code: "1f4af", name: "100" },
  { emoji: "🤔", code: "1f914", name: "Thinking" },
  { emoji: "🤩", code: "1f929", name: "Star-Struck" },
  { emoji: "🎓", code: "1f393", name: "Graduation Cap" },
  { emoji: "🙏", code: "1f64f", name: "Folded Hands" }
];

// Helper to get role styling for bubbles, badges, and themes (Yellow for Instructor, Purple for Admin, Blue for Student)
const getMessageTheme = (msg, isFromMe, currentUserRole, isTeacherOrAdmin) => {
  if (!msg) return 'student';
  
  const role = (
    msg.senderRole || 
    (typeof msg.sender === 'object' && msg.sender !== null ? msg.sender.role : '') || 
    ''
  ).toLowerCase();

  const name = (
    msg.senderName || 
    (typeof msg.sender === 'object' && msg.sender !== null ? msg.sender.name : '') || 
    ''
  ).toLowerCase();

  // 1. Direct check: If explicitly Admin
  if (role === 'admin' || role === 'superadmin' || (name.includes('admin') && !name.includes('chaminda') && !name.includes('herath') && !name.includes('instructor') && !name.includes('teacher'))) {
    return 'admin';
  }

  // 2. Direct check: If Teacher / Instructor
  if (
    role === 'teacher' || 
    role === 'instructor' || 
    name.includes('teacher') || 
    name.includes('instructor') || 
    name.includes('chaminda') || 
    name.includes('herath') || 
    name.includes('kumara') ||
    name.includes('pathum') ||
    name.includes('lasantha') ||
    name.includes('sankha') ||
    name.includes('kevin') ||
    name.includes('rashmi')
  ) {
    return 'teacher';
  }

  if (role === 'student' || name.includes('student')) {
    return 'student';
  }
  
  // 3. If outgoing (isFromMe), check the current user's logged-in role
  if (isFromMe) {
    if (currentUserRole === 'admin' || currentUserRole === 'superadmin') return 'admin';
    if (currentUserRole === 'teacher' || currentUserRole === 'instructor') return 'teacher';
    return 'student';
  }

  // 4. Default for broadcast if not admin
  if (msg.isBroadcast) {
    return 'teacher';
  }
  
  return 'student';
};

const LiveChatBox = ({ 
  lessonId, 
  isTeacherOrAdmin, 
  isFullscreen, 
  isVisible = true,
  currentGrade, 
  classTitle,
  isLiveMicActive = false,
  isStreamEnded = false,
  onVoiceRecordingChange,
  onStudentSubmittedFeedback,
  onUnreadChange
}) => {
  const [messages, setMessages] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`lumina_chat_msgs_${lessonId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [studentThreads, setStudentThreads] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`lumina_chat_threads_${lessonId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [staffMessages, setStaffMessages] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`lumina_chat_staff_${lessonId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [isStaffChatExpanded, setIsStaffChatExpanded] = useState(false);
  const [inlineStaffInput, setInlineStaffInput] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null); // studentId | 'staff' | null
  const [sendMode, setSendMode] = useState(isTeacherOrAdmin ? 'broadcast' : 'private'); // 'broadcast' | 'private'
  const [chatFilterTab, setChatFilterTab] = useState('all'); // 'all' | 'broadcast' | 'inquiries' | 'staff'
  const [loading, setLoading] = useState(false);
  
  // Emojis, Attachments, Camera, and Student Profile States
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [inspectStudentId, setInspectStudentId] = useState(null);
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [heroReaction, setHeroReaction] = useState(null);
  const [studentFeedbackSubmitted, setStudentFeedbackSubmitted] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  const [readThreadTimestamps, setReadThreadTimestamps] = useState({});
  const lastSeenMsgCountRef = useRef(0);
  const sessionStartTimeRef = useRef(Date.now());
  const isVisibleRef = useRef(isVisible);
  useEffect(() => { isVisibleRef.current = isVisible; }, [isVisible]);
  const selectedStudentIdRef = useRef(selectedStudentId);
  useEffect(() => { selectedStudentIdRef.current = selectedStudentId; }, [selectedStudentId]);
  const messagesLengthRef = useRef(messages.length);
  useEffect(() => { messagesLengthRef.current = messages.length; }, [messages.length]);

  // In-Chat Inline Voice Recorder State
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [voiceAudioLevel, setVoiceAudioLevel] = useState(0);
  const [isPlayingVoicePreview, setIsPlayingVoicePreview] = useState(false);
  const [voicePreviewProgress, setVoicePreviewProgress] = useState(0);
  const [isSendingVoice, setIsSendingVoice] = useState(false);

  const voiceMediaRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceTimerRef = useRef(null);
  const voiceStartTimeRef = useRef(null);
  const voiceDurationRef = useRef(0);
  const voicePreviewAudioRef = useRef(null);
  const voiceStreamRef = useRef(null);
  const voiceAudioContextRef = useRef(null);
  const voiceAnalyserRef = useRef(null);
  const voiceAnimationRef = useRef(null);
  const isCancelledRef = useRef(false);
  const onVoiceRecordingChangeRef = useRef(onVoiceRecordingChange);
  useEffect(() => {
    onVoiceRecordingChangeRef.current = onVoiceRecordingChange;
  }, [onVoiceRecordingChange]);

  const fileInputRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isUserAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isStudent = (user?.role === 'student') && !isTeacherOrAdmin;
  const currentUserId = user?._id || user?.id || user?.userId;

  // Universal helper: accurately identify outgoing (me) vs incoming messages across every role & chat mode
  const getIsFromMe = useCallback((msg) => {
    if (!msg) return false;
    if (msg.isOptimistic) return true;
    const msgSenderId = typeof msg.sender === 'object' ? (msg.sender?._id || msg.sender?.id) : msg.sender;
    if (currentUserId && msgSenderId && String(currentUserId) === String(msgSenderId)) {
      return true;
    }
    if (user?.email && msg.senderEmail && user.email === msg.senderEmail) {
      return true;
    }
    if (user?.name && msg.senderName && user.name.trim().toLowerCase() === msg.senderName.trim().toLowerCase()) {
      return true;
    }
    if (isStudent && (msg.senderRole === 'student' || (!msg.senderRole && !msg.isBroadcast && !msg.isStaffOnly))) {
      return true;
    }
    if (isTeacherOrAdmin && selectedStudentId && selectedStudentId !== 'staff') {
      if (msg.senderRole === 'teacher' || msg.senderRole === 'instructor' || msg.senderRole === 'admin') return true;
      if (msg.senderRole === 'student') return false;
    }
    return false;
  }, [currentUserId, user?.email, user?.name, isStudent, isTeacherOrAdmin, selectedStudentId]);

  const formatVoiceTime = (secs) => {
    const totalSecs = Math.max(0, Number(secs) || 0);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const cleanupVoiceRecording = useCallback(() => {
    if (voiceAnimationRef.current) {
      cancelAnimationFrame(voiceAnimationRef.current);
      voiceAnimationRef.current = null;
    }
    if (voiceAudioContextRef.current) {
      voiceAudioContextRef.current.close().catch(() => {});
      voiceAudioContextRef.current = null;
    }
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
      try { voiceMediaRecorderRef.current.stop(); } catch (e) {}
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(track => track.stop());
      voiceStreamRef.current = null;
    }
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current = null;
    }
    voiceChunksRef.current = [];
    voiceStartTimeRef.current = null;
    voiceDurationRef.current = 0;
    setIsVoiceRecording(false);
    setIsSendingVoice(false);
    onVoiceRecordingChangeRef.current?.(false);
    setVoiceBlob(null);
    setVoiceDuration(0);
    setVoiceAudioLevel(0);
    setIsPlayingVoicePreview(false);
    setVoicePreviewProgress(0);
  }, []);

  const startVoiceRecording = async () => {
    // 1. Guard against starting voice note recording when live streaming mic is unmuted/active
    if (isLiveMicActive) {
      toast.error("⚠️ Cannot record a voice note while your live microphone is active. Please mute your live mic first.", {
        duration: 4000
      });
      return;
    }

    try {
      isCancelledRef.current = false;
      
      // Stop previous streams & audio context safely without resetting voice states
      if (voiceAnimationRef.current) {
        cancelAnimationFrame(voiceAnimationRef.current);
        voiceAnimationRef.current = null;
      }
      if (voiceAudioContextRef.current) {
        voiceAudioContextRef.current.close().catch(() => {});
        voiceAudioContextRef.current = null;
      }
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(track => track.stop());
        voiceStreamRef.current = null;
      }
      if (voicePreviewAudioRef.current) {
        voicePreviewAudioRef.current.pause();
        voicePreviewAudioRef.current = null;
      }

      setVoiceBlob(null);
      setVoiceDuration(0);
      voiceDurationRef.current = 0;
      voiceChunksRef.current = [];
      setIsPlayingVoicePreview(false);
      setVoicePreviewProgress(0);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;

      // Real-time sound detection analyzer for animated indicator
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          const ctx = new AudioContextClass();
          voiceAudioContextRef.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          voiceAnalyserRef.current = analyser;

          const source = ctx.createMediaStreamSource(stream);
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateAudioLevel = () => {
            if (!voiceAnalyserRef.current) return;
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setVoiceAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
            voiceAnimationRef.current = requestAnimationFrame(updateAudioLevel);
          };
          updateAudioLevel();
        } catch (audioCtxErr) {
          console.warn("AudioContext setup warning:", audioCtxErr);
        }
      }

      // Check supported MIME types for widest cross-browser compatibility
      let preferredMimeType = '';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          preferredMimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          preferredMimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          preferredMimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          preferredMimeType = 'audio/ogg';
        }
      }

      const mediaRecorder = preferredMimeType 
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      voiceMediaRecorderRef.current = mediaRecorder;
      voiceChunksRef.current = [];
      voiceStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          voiceChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (isCancelledRef.current) {
          voiceChunksRef.current = [];
          setVoiceBlob(null);
          setIsVoiceRecording(false);
          onVoiceRecordingChange?.(false);
          isCancelledRef.current = false;
          return;
        }

        const finalMime = mediaRecorder.mimeType || preferredMimeType || 'audio/webm';
        const blob = new Blob(voiceChunksRef.current, { type: finalMime });
        
        // Compute exact elapsed recording time
        const elapsedSec = voiceStartTimeRef.current 
          ? Math.max(1, Math.round((Date.now() - voiceStartTimeRef.current) / 1000))
          : Math.max(1, voiceDurationRef.current || 1);

        setVoiceDuration(elapsedSec);
        voiceDurationRef.current = elapsedSec;
        setVoiceBlob(blob);
        setIsVoiceRecording(false);
        setIsSendingVoice(false);
        onVoiceRecordingChange?.(false);

        // Turn off microphone tracks to free device hardware
        if (voiceStreamRef.current) {
          voiceStreamRef.current.getTracks().forEach(t => t.stop());
          voiceStreamRef.current = null;
        }
        if (voiceAudioContextRef.current) {
          voiceAudioContextRef.current.close().catch(() => {});
          voiceAudioContextRef.current = null;
        }
      };

      mediaRecorder.onerror = (recErr) => {
        console.error("MediaRecorder error:", recErr);
        toast.error("Audio recording error occurred. Please try again.");
        cleanupVoiceRecording();
      };

      mediaRecorder.start(100);
      setIsVoiceRecording(true);
      onVoiceRecordingChange?.(true);

      voiceTimerRef.current = setInterval(() => {
        if (!voiceStartTimeRef.current) return;
        const elapsed = Math.max(0, Math.round((Date.now() - voiceStartTimeRef.current) / 1000));
        voiceDurationRef.current = elapsed;
        setVoiceDuration(elapsed);
        if (elapsed >= 180) { // 3-minute cap
          stopVoiceRecording();
        }
      }, 500);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone access denied. Please allow microphone permissions in your browser.");
      onVoiceRecordingChange?.(false);
    }
  };

  const stopVoiceRecording = () => {
    isCancelledRef.current = false;
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
    if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
      try {
        if (typeof voiceMediaRecorderRef.current.requestData === 'function') {
          voiceMediaRecorderRef.current.requestData();
        }
        voiceMediaRecorderRef.current.stop();
      } catch (e) {
        console.warn("MediaRecorder stop warning:", e);
      }
    }
  };

  const cancelVoiceRecording = () => {
    isCancelledRef.current = true;
    cleanupVoiceRecording();
  };

  const discardVoiceRecording = () => {
    isCancelledRef.current = true;
    cleanupVoiceRecording();
  };

  const restartVoiceRecording = () => {
    cleanupVoiceRecording();
    setTimeout(() => {
      startVoiceRecording();
    }, 100);
  };

  const toggleVoicePreview = () => {
    if (!voiceBlob) return;

    if (!voicePreviewAudioRef.current) {
      const url = URL.createObjectURL(voiceBlob);
      const audio = new Audio(url);
      voicePreviewAudioRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration && audio.duration > 0) {
          setVoicePreviewProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingVoicePreview(false);
        setVoicePreviewProgress(0);
      };

      audio.onerror = () => {
        setIsPlayingVoicePreview(false);
        setVoicePreviewProgress(0);
      };
    }

    if (isPlayingVoicePreview) {
      voicePreviewAudioRef.current.pause();
      setIsPlayingVoicePreview(false);
    } else {
      if (globalAudioQueue.currentlyPlayingId) {
        globalAudioQueue.requestPlay(globalAudioQueue.currentlyPlayingId);
      }
      const playPromise = voicePreviewAudioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlayingVoicePreview(true);
          })
          .catch((err) => {
            console.warn("Voice preview playback error:", err);
            setIsPlayingVoicePreview(false);
          });
      }
    }
  };

  const handleSendVoice = async (base64Audio, durationSec) => {
    if (!lessonId) return;
    try {
      const payload = {
        audioData: base64Audio,
        audioDuration: durationSec,
        text: isStudent ? '🎙️ Voice Question for Instructor' : '🎙️ Voice Response',
        isBroadcast: sendMode === 'broadcast'
      };
      if (isTeacherOrAdmin && sendMode === 'private' && selectedStudentId) {
        payload.studentId = selectedStudentId;
      }

      await api.post(`/lessons/${lessonId}/live-stream/messages`, payload);
      toast.success("Voice message sent!");
      fetchMessages(false);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send voice message.");
    }
  };

  const sendRecordedVoice = async () => {
    if (!voiceBlob || !lessonId || isSendingVoice) return;
    setIsSendingVoice(true);

    const currentBlob = voiceBlob;
    const currentDuration = voiceDurationRef.current || voiceDuration || 1;

    // Stop and pause any preview audio playback immediately
    if (voicePreviewAudioRef.current) {
      voicePreviewAudioRef.current.pause();
      voicePreviewAudioRef.current = null;
    }
    setIsPlayingVoicePreview(false);

    // 1. Create instant optimistic voice note in 0ms
    const tempId = `temp-voice-${Date.now()}-${Math.random()}`;
    const blobUrl = URL.createObjectURL(currentBlob);
    const voiceText = isStudent 
      ? '🎙️ Voice Question for Instructor' 
      : selectedStudentId === 'staff' 
        ? '🎙️ Staff Voice Note' 
        : selectedStudentId 
          ? `🎙️ Voice Response to ${selectedThreadStudent?.studentName || 'Student'}` 
          : '🎙️ Class Voice Announcement';

    const optimisticMsg = {
      _id: tempId,
      sender: user?._id,
      senderName: user?.name || 'Me',
      senderRole: user?.role || (isTeacherOrAdmin ? 'teacher' : 'student'),
      senderAvatar: user?.profilePicture || '',
      studentContext: isStudent ? user?._id : (selectedStudentId === 'staff' ? null : selectedStudentId),
      recipient: selectedStudentId && selectedStudentId !== 'staff' ? selectedStudentId : null,
      isBroadcast: isTeacherOrAdmin && !selectedStudentId,
      isStaffOnly: selectedStudentId === 'staff',
      text: voiceText,
      attachments: [{
        url: blobUrl,
        originalName: 'voice-note.webm',
        fileType: 'audio/webm',
        duration: currentDuration,
        category: 'audio'
      }],
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Immediately push to message list & clear voice recorder so user is back in standard chat
    if (selectedStudentId === 'staff') {
      setStaffMessages(prev => [...prev, optimisticMsg]);
    } else {
      setMessages(prev => [...prev, optimisticMsg]);
    }
    triggerSmartScroll(true);
    cleanupVoiceRecording();

    try {
      let ext = 'webm';
      let mimeType = 'audio/webm';
      if (currentBlob.type?.includes('ogg')) {
        ext = 'ogg';
        mimeType = 'audio/ogg';
      } else if (currentBlob.type?.includes('mp4') || currentBlob.type?.includes('m4a')) {
        ext = 'm4a';
        mimeType = 'audio/mp4';
      } else if (currentBlob.type?.includes('wav')) {
        ext = 'wav';
        mimeType = 'audio/wav';
      }

      const fileName = `voice-recording-${Date.now()}.${ext}`;
      const audioFile = new File([currentBlob], fileName, { type: mimeType });

      const formData = new FormData();
      formData.append('attachment', audioFile, fileName);
      formData.append('audioDuration', String(currentDuration));
      formData.append('text', voiceText);
      
      if (isTeacherOrAdmin) {
        if (selectedStudentId === 'staff') {
          formData.append('isStaffOnly', 'true');
          formData.append('isBroadcast', 'false');
        } else if (selectedStudentId) {
          formData.append('studentId', selectedStudentId);
          formData.append('isBroadcast', 'false');
        } else {
          formData.append('isBroadcast', 'true');
        }
      }

      const res = await api.post(`/lessons/${lessonId}/live-stream/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (res.data?.liveMessage) {
        if (selectedStudentId === 'staff') {
          setStaffMessages(prev => prev.map(m => m._id === tempId ? res.data.liveMessage : m));
        } else {
          setMessages(prev => prev.map(m => m._id === tempId ? res.data.liveMessage : m));
        }
      }

      fetchMessages(false);
      setTimeout(() => fetchMessages(false), 400);
    } catch (err) {
      console.error("Voice send error:", err);
      // Revert optimistic voice message on error
      if (selectedStudentId === 'staff') {
        setStaffMessages(prev => prev.filter(m => m._id !== tempId));
      } else {
        setMessages(prev => prev.filter(m => m._id !== tempId));
      }
      toast.error(err.response?.data?.error || "Failed to send voice note.");
    } finally {
      setIsSendingVoice(false);
    }
  };

  // Safe cleanup strictly on component unmount
  useEffect(() => {
    return () => {
      if (voiceAnimationRef.current) cancelAnimationFrame(voiceAnimationRef.current);
      if (voiceAudioContextRef.current) voiceAudioContextRef.current.close().catch(() => {});
      if (voiceTimerRef.current) clearInterval(voiceTimerRef.current);
      if (voiceMediaRecorderRef.current && voiceMediaRecorderRef.current.state !== 'inactive') {
        try { voiceMediaRecorderRef.current.stop(); } catch (e) {}
      }
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(t => t.stop());
      }
      if (voicePreviewAudioRef.current) {
        voicePreviewAudioRef.current.pause();
      }
    };
  }, []);

  const messagesEndRef = useRef(null);
  const privateMessagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const privateChatContainerRef = useRef(null);
  const isMainNearBottomRef = useRef(true);
  const isPrivateNearBottomRef = useRef(true);
  const pollIntervalRef = useRef(null);
  const [showMainScrollDown, setShowMainScrollDown] = useState(false);
  const [showPrivateScrollDown, setShowPrivateScrollDown] = useState(false);

  // Scroll ONLY the internal chat container with double-frame guarantee — NEVER scroll the outer window
  const scrollToBottom = useCallback((smooth = true) => {
    const performScroll = () => {
      const behavior = smooth ? 'smooth' : 'auto';

      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight + 1000,
          behavior
        });
      }

      if (privateChatContainerRef.current) {
        privateChatContainerRef.current.scrollTo({
          top: privateChatContainerRef.current.scrollHeight + 1000,
          behavior
        });
      }
    };

    performScroll();
    requestAnimationFrame(() => {
      performScroll();
    });
  }, []);

  const triggerSmartScroll = useCallback((smooth = true) => {
    scrollToBottom(smooth);
  }, [scrollToBottom]);

  // Handle scroll listeners with professional 120px proximity threshold
  const handleMainScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 120;
    isMainNearBottomRef.current = isNearBottom;
    setShowMainScrollDown(!isNearBottom);
  };

  const handlePrivateScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isNearBottom = distanceFromBottom < 120;
    isPrivateNearBottomRef.current = isNearBottom;
    setShowPrivateScrollDown(!isNearBottom);
  };

  const fetchMessages = useCallback(async (isInitial = false) => {
    if (!lessonId) return;
    try {
      if (isInitial && messagesLengthRef.current === 0) setLoading(true);
      const res = await api.get(`/lessons/${lessonId}/live-stream/messages`);
      
      const newMsgs = res.data.messages || [];
      setMessages(prev => {
        if (prev.length === newMsgs.length && prev[prev.length - 1]?._id === newMsgs[newMsgs.length - 1]?._id) {
          if (!prev.some(m => m.isOptimistic)) return prev;
        }
        try {
          sessionStorage.setItem(`lumina_chat_msgs_${lessonId}`, JSON.stringify(newMsgs));
        } catch {}
        return newMsgs;
      });

      if (!isVisibleRef.current) {
        const diff = Math.max(0, newMsgs.length - lastSeenMsgCountRef.current);
        setUnseenCount(diff);
      } else {
        lastSeenMsgCountRef.current = newMsgs.length;
        setUnseenCount(0);
      }

      if (isTeacherOrAdmin && res.data.studentThreads) {
        const newThreads = res.data.studentThreads;
        setStudentThreads(prev => {
          if (prev.length === newThreads.length && prev[0]?.lastMessageTime === newThreads[0]?.lastMessageTime) {
            return prev;
          }
          try {
            sessionStorage.setItem(`lumina_chat_threads_${lessonId}`, JSON.stringify(newThreads));
          } catch {}
          return newThreads;
        });
      }
      if (isTeacherOrAdmin && res.data.staffMessages) {
        const newStaff = res.data.staffMessages;
        setStaffMessages(prev => {
          if (prev.length === newStaff.length && prev[prev.length - 1]?._id === newStaff[newStaff.length - 1]?._id) {
            if (!prev.some(m => m.isOptimistic)) return prev;
          }
          try {
            sessionStorage.setItem(`lumina_chat_staff_${lessonId}`, JSON.stringify(newStaff));
          } catch {}
          return newStaff;
        });
      }

      // ONLY auto-scroll if user is already at the bottom or initial load — NEVER disrupt reading or typing
      if (isInitial) {
        scrollToBottom(false);
      } else if (newMsgs.length > messagesLengthRef.current && isMainNearBottomRef.current) {
        scrollToBottom(true);
      }
    } catch (err) {
      // silent poll fail
    } finally {
      if (isInitial) setLoading(false);
    }
  }, [lessonId, isTeacherOrAdmin, scrollToBottom]);

  // When selectedStudentId changes, auto scroll to bottom in 0ms
  useEffect(() => {
    if (selectedStudentId) {
      scrollToBottom(false);
    }
  }, [selectedStudentId, scrollToBottom]);

  // Reset unseen messages when chat is visible / expanded
  useEffect(() => {
    if (isVisible) {
      lastSeenMsgCountRef.current = messages.length;
      setUnseenCount(0);
      setReadThreadTimestamps(prev => ({
        ...prev,
        student_feed: Date.now()
      }));
    }
  }, [isVisible, messages.length]);

  // Clean up voice recording state only when actually switching threads or closing drawer
  const prevSelectedStudentIdRef = useRef(selectedStudentId);
  useEffect(() => {
    if (prevSelectedStudentIdRef.current !== selectedStudentId) {
      prevSelectedStudentIdRef.current = selectedStudentId;
      cleanupVoiceRecording();
    }
  }, [selectedStudentId, cleanupVoiceRecording]);

  // Calculate overall unread status across all users / threads
  const hasAnyUnread = useMemo(() => {
    if (isTeacherOrAdmin) {
      if (isVisible) return false;
      const baseline = sessionStartTimeRef.current;
      const hasStudentUnread = studentThreads.some(thread => {
        const lastReadTime = readThreadTimestamps[thread.studentId] || baseline;
        const lastMsgTime = thread.lastMessageTime ? new Date(thread.lastMessageTime).getTime() : 0;
        return thread.lastSenderRole === 'student' && lastMsgTime > lastReadTime;
      });
      const lastStaffRead = readThreadTimestamps['staff'] || baseline;
      const lastStaffMsg = staffMessages[staffMessages.length - 1];
      const staffSenderId = lastStaffMsg ? (typeof lastStaffMsg.sender === 'object' ? lastStaffMsg.sender?._id : lastStaffMsg.sender) : null;
      const isStaffFromMe = Boolean(user?._id && String(staffSenderId) === String(user._id));
      const hasStaffUnread = lastStaffMsg && (new Date(lastStaffMsg.createdAt).getTime() > lastStaffRead) && !isStaffFromMe;
      return hasStudentUnread || Boolean(hasStaffUnread);
    } else {
      if (!isVisible) {
        if (unseenCount > 0) return true;
        const lastMsg = messages[messages.length - 1];
        if (lastMsg) {
          const senderId = typeof lastMsg.sender === 'object' ? lastMsg.sender?._id : lastMsg.sender;
          const isFromMe = Boolean(user?._id && String(senderId) === String(user._id));
          const lastReadTime = readThreadTimestamps['student_feed'] || sessionStartTimeRef.current;
          if (!isFromMe && new Date(lastMsg.createdAt).getTime() > lastReadTime) {
            return true;
          }
        }
      }
      return false;
    }
  }, [isTeacherOrAdmin, studentThreads, readThreadTimestamps, staffMessages, user?._id, unseenCount, isVisible, messages]);

  useEffect(() => {
    onUnreadChange?.(hasAnyUnread);
  }, [hasAnyUnread, onUnreadChange]);

  // Ultra-fast real-time adaptive polling (1000ms when tab active, 5000ms when tab hidden)
  useEffect(() => {
    fetchMessages(true);

    const startInterval = () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      const intervalMs = document.hidden ? 5000 : 1000;
      pollIntervalRef.current = setInterval(() => {
        fetchMessages(false);
      }, intervalMs);
    };

    startInterval();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchMessages(false);
      }
      startInterval();
    };

    const handleWindowFocus = () => {
      fetchMessages(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [fetchMessages]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleSendMessage = async (e) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    const textToSend = inputText.trim();
    if (!textToSend && !attachedFile && !capturedPhoto) return;
    if (isSending) return;

    // 1. Create instant optimistic message for 0ms perceived lag
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const currentSelected = selectedStudentId;

    const optimisticMsg = {
      _id: tempId,
      sender: user?._id,
      senderName: user?.name || 'Me',
      senderRole: user?.role || (isTeacherOrAdmin ? 'teacher' : 'student'),
      senderAvatar: user?.profilePicture || '',
      studentContext: isStudent ? user?._id : (currentSelected === 'staff' ? null : currentSelected),
      recipient: currentSelected && currentSelected !== 'staff' ? currentSelected : null,
      isBroadcast: isTeacherOrAdmin && !currentSelected,
      isStaffOnly: currentSelected === 'staff',
      text: textToSend,
      attachments: attachedFile ? [{
        url: URL.createObjectURL(attachedFile),
        originalName: attachedFile.name,
        fileType: attachedFile.type,
        fileSize: attachedFile.size,
        category: attachedFile.type?.startsWith('image/') ? 'image' : attachedFile.type?.startsWith('audio/') ? 'audio' : 'document'
      }] : capturedPhoto ? [{
        url: capturedPhoto,
        originalName: 'camera-photo.jpg',
        fileType: 'image/jpeg',
        category: 'image'
      }] : [],
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    // Append to UI immediately in 0ms
    if (currentSelected === 'staff') {
      setStaffMessages(prev => [...prev, optimisticMsg]);
    } else {
      setMessages(prev => [...prev, optimisticMsg]);
    }

    const currentText = textToSend;
    const currentAttachedFile = attachedFile;
    const currentCapturedPhoto = capturedPhoto;

    // Reset inputs immediately
    setInputText('');
    setAttachedFile(null);
    setCapturedPhoto(null);
    setShowEmojiPicker(false);
    triggerSmartScroll(true);

    setIsSending(true);
    try {
      let res;
      if (!currentAttachedFile && !currentCapturedPhoto) {
        // Ultra-fast pure JSON payload for text messages
        const jsonPayload = {
          text: currentText,
          isBroadcast: Boolean(isTeacherOrAdmin && !currentSelected),
          isStaffOnly: Boolean(currentSelected === 'staff'),
          studentId: currentSelected && currentSelected !== 'staff' ? currentSelected : undefined
        };
        res = await api.post(`/lessons/${lessonId}/live-stream/messages`, jsonPayload);
      } else {
        const formData = new FormData();
        if (currentText) formData.append('text', currentText);
        
        if (isTeacherOrAdmin) {
          if (currentSelected === 'staff') {
            formData.append('isStaffOnly', 'true');
            formData.append('isBroadcast', 'false');
          } else if (currentSelected) {
            formData.append('studentId', currentSelected);
            formData.append('isBroadcast', 'false');
          } else {
            formData.append('isBroadcast', 'true');
          }
        }

        if (currentAttachedFile) {
          formData.append('attachment', currentAttachedFile);
        }

        if (currentCapturedPhoto) {
          formData.append('photoData', currentCapturedPhoto);
        }

        res = await api.post(`/lessons/${lessonId}/live-stream/messages`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (res.data?.liveMessage) {
        if (currentSelected === 'staff') {
          setStaffMessages(prev => prev.map(m => m._id === tempId ? res.data.liveMessage : m));
        } else {
          setMessages(prev => prev.map(m => m._id === tempId ? res.data.liveMessage : m));
        }
      }

      fetchMessages(false);
      setTimeout(() => fetchMessages(false), 300);

      if (isStudent && isStreamEnded) {
        setStudentFeedbackSubmitted(true);
        toast.success("Thank you! Your feedback has been sent to the teacher.");
        if (onStudentSubmittedFeedback) {
          onStudentSubmittedFeedback();
        }
      }
    } catch (err) {
      console.error("Message send error:", err);
      // Revert optimistic message on failure
      if (currentSelected === 'staff') {
        setStaffMessages(prev => prev.filter(m => m._id !== tempId));
      } else {
        setMessages(prev => prev.filter(m => m._id !== tempId));
      }
      toast.error(err.response?.data?.error || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendInlineStaffMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const textToSend = (textOverride || inlineStaffInput).trim();
    if (!textToSend || isSending) return;

    const tempId = `temp-staff-${Date.now()}-${Math.random()}`;
    const optimisticMsg = {
      _id: tempId,
      sender: user?._id,
      senderName: user?.name || 'Staff',
      senderRole: user?.role || 'teacher',
      senderAvatar: user?.profilePicture || '',
      studentContext: null,
      isBroadcast: false,
      isStaffOnly: true,
      text: textToSend,
      attachments: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    setStaffMessages(prev => [...prev, optimisticMsg]);
    setInlineStaffInput('');

    setIsSending(true);
    try {
      const jsonPayload = {
        text: textToSend,
        isStaffOnly: true,
        isBroadcast: false
      };

      const res = await api.post(`/lessons/${lessonId}/live-stream/messages`, jsonPayload);

      if (res.data.liveMessage) {
        setStaffMessages(prev => prev.map(m => m._id === tempId ? res.data.liveMessage : m));
      }

      fetchMessages(false);
      setTimeout(() => fetchMessages(false), 350);
    } catch (err) {
      setStaffMessages(prev => prev.filter(m => m._id !== tempId));
      toast.error(err.response?.data?.error || "Failed to send staff message.");
    } finally {
      setIsSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please upload a file under 5MB.");
      if (e.target) e.target.value = '';
      return;
    }
    setAttachedFile(file);
  };

  const handlePhotoCaptured = (dataUrl) => {
    setCapturedPhoto(dataUrl);
  };

  // Detect if a message consists purely of emoji(s) for large standalone display without a box
  const isOnlyEmoji = (text) => {
    if (!text || typeof text !== 'string') return false;
    const trimmed = text.trim();
    if (!trimmed) return false;
    // Check if string contains only emoji graphemes/spaces (no latin/digits/standard punctuation)
    const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\s)+$/u;
    return emojiRegex.test(trimmed) && trimmed.length <= 16;
  };

  // Get Apple 3D code for high-res rendering
  const getEmojiAppleCode = (text) => {
    if (!text) return null;
    const trimmed = text.trim();
    const match = QUICK_EMOJIS.find(item => item.emoji === trimmed);
    return match ? match.code : null;
  };

  // Ultra-High Definition Apple / WhatsApp 160px Retina Emoji Asset URL
  const getHighResEmojiUrl = (code) => {
    if (!code) return '';
    return `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160/${code}.png`;
  };

  const getStandardEmojiUrl = (code) => {
    if (!code) return '';
    return `https://cdn.jsdelivr.net/npm/emoji-datasource-apple@15.1.2/img/apple/64/${code}.png`;
  };

  // Custom animation CSS class for each emoji type in the chat list
  const getEmojiCustomAnimation = (text) => {
    if (!text) return 'custom-anim-pop';
    if (text.includes('🔥')) return 'custom-anim-fire';
    if (text.includes('❤️')) return 'custom-anim-heart';
    if (text.includes('🚀')) return 'custom-anim-rocket';
    if (text.includes('👏')) return 'custom-anim-clap';
    if (text.includes('🎉')) return 'custom-anim-tada';
    if (text.includes('💡')) return 'custom-anim-bulb';
    if (text.includes('❓')) return 'custom-anim-wobble';
    if (text.includes('💯')) return 'custom-anim-stamp';
    if (text.includes('🌟') || text.includes('🤩')) return 'custom-anim-star';
    if (text.includes('👍')) return 'custom-anim-thumbs';
    if (text.includes('✋') || text.includes('🙋')) return 'custom-anim-wave';
    if (text.includes('🎯')) return 'custom-anim-target';
    if (text.includes('🤔')) return 'custom-anim-think';
    if (text.includes('🎓')) return 'custom-anim-cap';
    if (text.includes('🙏')) return 'custom-anim-pray';
    if (text.includes('😊')) return 'custom-anim-smile';
    return 'custom-anim-pop';
  };

  // Big Screen Full-Chat Hero Entrance & Exit Animation Class for Each Emoji
  const getHeroAnimationType = (text) => {
    if (!text) return 'hero-anim-smile';
    if (text.includes('🚀')) return 'hero-anim-rocket';
    if (text.includes('🔥')) return 'hero-anim-fire';
    if (text.includes('❤️')) return 'hero-anim-heart';
    if (text.includes('🎉')) return 'hero-anim-party';
    if (text.includes('👏')) return 'hero-anim-clap';
    if (text.includes('💡')) return 'hero-anim-bulb';
    if (text.includes('💯')) return 'hero-anim-stamp';
    if (text.includes('🌟') || text.includes('🤩')) return 'hero-anim-star';
    if (text.includes('👍')) return 'hero-anim-thumbs';
    if (text.includes('✋') || text.includes('🙋')) return 'hero-anim-wave';
    if (text.includes('🎯')) return 'hero-anim-target';
    if (text.includes('🎓')) return 'hero-anim-cap';
    if (text.includes('🙏')) return 'hero-anim-pray';
    if (text.includes('❓')) return 'hero-anim-question';
    if (text.includes('🤔')) return 'hero-anim-think';
    if (text.includes('😊')) return 'hero-anim-smile';
    return 'hero-anim-smile';
  };

  // Trigger bursting/floating reaction particles across the entire chat window
  const triggerFloatingReaction = (emojiChar) => {
    const count = 8;
    const now = Date.now();
    const newParticles = [];
    for (let i = 0; i < count; i++) {
      newParticles.push({
        id: `${now}-${i}-${Math.random()}`,
        emoji: emojiChar,
        left: 15 + Math.random() * 70, // 15% to 85% across width
        size: 18 + Math.random() * 12, // 18px to 30px
        duration: 1.8 + Math.random() * 1.2, // 1.8s to 3s
        delay: Math.random() * 0.25,
        animClass: getEmojiCustomAnimation(emojiChar),
        driftX: (Math.random() - 0.5) * 40
      });
    }
    setFloatingReactions(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)));
    }, 3200);
  };

  // Instant Auto-Send when clicking any emoji (with Full Chat Screen Hero Show first)
  const handleAutoSendEmoji = async (emojiItemOrChar) => {
    const emojiChar = typeof emojiItemOrChar === 'object' ? emojiItemOrChar.emoji : emojiItemOrChar;
    const emojiCode = typeof emojiItemOrChar === 'object' ? emojiItemOrChar.code : getEmojiAppleCode(emojiChar);
    const emojiName = typeof emojiItemOrChar === 'object' ? emojiItemOrChar.name : 'Reaction';

    // 1. Trigger the Big Screen Full-Chat Hero Entrance & Leaving Animation first!
    setHeroReaction({
      id: Date.now(),
      emoji: emojiChar,
      code: emojiCode,
      name: emojiName,
      animType: getHeroAnimationType(emojiChar)
    });

    // Clear big screen hero stage after its animation sequence finishes
    setTimeout(() => {
      setHeroReaction(null);
    }, 2200);

    // 2. Also trigger floating ambient particles
    triggerFloatingReaction(emojiChar);

    if (!lessonId) return;

    const tempId = `temp-emoji-${Date.now()}-${Math.random()}`;
    const optimisticMsg = {
      _id: tempId,
      sender: user?._id,
      senderName: user?.name || 'Me',
      senderRole: user?.role || (isTeacherOrAdmin ? 'teacher' : 'student'),
      senderAvatar: user?.profilePicture || '',
      studentContext: isStudent ? user?._id : (selectedStudentId === 'staff' ? null : selectedStudentId),
      recipient: selectedStudentId && selectedStudentId !== 'staff' ? selectedStudentId : null,
      isBroadcast: isTeacherOrAdmin && !selectedStudentId,
      isStaffOnly: selectedStudentId === 'staff',
      text: emojiChar,
      attachments: [],
      createdAt: new Date().toISOString(),
      isOptimistic: true
    };

    if (selectedStudentId === 'staff') {
      setStaffMessages(prev => [...prev, optimisticMsg]);
    } else {
      setMessages(prev => [...prev, optimisticMsg]);
    }
    triggerSmartScroll(true);

    try {
      const jsonPayload = {
        text: emojiChar,
        isBroadcast: Boolean(isTeacherOrAdmin && !selectedStudentId),
        isStaffOnly: Boolean(selectedStudentId === 'staff'),
        studentId: selectedStudentId && selectedStudentId !== 'staff' ? selectedStudentId : undefined
      };
      const res = await api.post(`/lessons/${lessonId}/live-stream/messages`, jsonPayload);

      if (res.data?.liveMessage) {
        if (selectedStudentId === 'staff') {
          setStaffMessages(prev => prev.map(m => m._id === tempId ? res.data.liveMessage : m));
        } else {
          setMessages(prev => prev.map(m => m._id === tempId ? res.data.liveMessage : m));
        }
      }

      fetchMessages(false);
      setTimeout(() => fetchMessages(false), 350);

      if (isStudent && isStreamEnded) {
        setStudentFeedbackSubmitted(true);
        toast.success("Thank you! Your feedback and reaction have been submitted.");
        if (onStudentSubmittedFeedback) {
          onStudentSubmittedFeedback();
        }
      }
    } catch (err) {
      if (selectedStudentId === 'staff') {
        setStaffMessages(prev => prev.filter(m => m._id !== tempId));
      } else {
        setMessages(prev => prev.filter(m => m._id !== tempId));
      }
      console.error("Auto emoji send error:", err);
    }
  };

  const handleInsertEmoji = (emoji) => {
    handleAutoSendEmoji(emoji);
  };

  const formatMessageTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const selectedThreadStudent = studentThreads.find(t => t.studentId === selectedStudentId);

  return (
    <div className={`relative w-full bg-white live-chat-font transition-all duration-300 ${
      isFullscreen 
        ? 'h-full flex flex-col border-0 rounded-none shadow-none' 
        : 'rounded-2xl sm:rounded-3xl border border-gray-200 shadow-xl overflow-hidden'
    }`}>
      {/* Custom Keyframe Animations for Emojis & Chat-wide Floating Reactions */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&display=swap');

        .live-chat-font {
          font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
          letter-spacing: -0.012em;
        }

        @keyframes floatUpFade {
          0% {
            opacity: 0;
            transform: translateY(20px) scale(0.6);
          }
          20% {
            opacity: 1;
            transform: translateY(-20px) scale(1.15);
          }
          75% {
            opacity: 0.9;
          }
          100% {
            opacity: 0;
            transform: translateY(-280px) scale(1.35);
          }
        }

        @keyframes fireAnim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08) translateY(-2px); }
        }

        @keyframes heartAnim {
          0%, 100% { transform: scale(1); }
          25% { transform: scale(1.12); }
          40% { transform: scale(1); }
          60% { transform: scale(1.08); }
        }

        @keyframes rocketAnim {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px) scale(1.05); }
        }

        @keyframes clapAnim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1) rotate(-6deg); }
        }

        @keyframes tadaAnim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1) rotate(4deg); }
        }

        @keyframes bulbAnim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }

        @keyframes wobbleAnim {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(-8deg) scale(1.05); }
        }

        @keyframes stampAnim {
          0% { transform: scale(1.3); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes starAnim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1) rotate(20deg); }
        }

        @keyframes thumbsAnim {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.1) translateY(-3px); }
        }

        @keyframes waveAnim {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(12deg); }
        }

        @keyframes thinkAnim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06) rotate(-4deg); }
        }

        @keyframes smileAnim {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.22); }
        }

        .custom-anim-fire { animation: fireAnim 1.2s infinite ease-in-out; }
        .custom-anim-heart { animation: heartAnim 1.3s infinite ease-in-out; }
        .custom-anim-rocket { animation: rocketAnim 1.5s infinite ease-in-out; }
        .custom-anim-clap { animation: clapAnim 0.9s infinite ease-in-out; }
        .custom-anim-tada { animation: tadaAnim 1.2s infinite ease-in-out; }
        .custom-anim-bulb { animation: bulbAnim 1.4s infinite ease-in-out; }
        .custom-anim-wobble { animation: wobbleAnim 1.2s infinite ease-in-out; }
        .custom-anim-stamp { animation: stampAnim 0.6s ease-out; }
        .custom-anim-star { animation: starAnim 1.8s infinite ease-in-out; }
        .custom-anim-thumbs { animation: thumbsAnim 1.1s infinite ease-in-out; }
        .custom-anim-wave { animation: waveAnim 1.3s infinite ease-in-out; transform-origin: 70% 70%; }
        .custom-anim-target { animation: stampAnim 0.8s ease-out; }
        .custom-anim-think { animation: thinkAnim 1.5s infinite ease-in-out; }
        .custom-anim-cap { animation: tadaAnim 1.6s infinite ease-in-out; }
        .custom-anim-pray { animation: smileAnim 1.6s infinite ease-in-out; }
        .custom-anim-smile { animation: smileAnim 1.1s infinite ease-in-out; }
        .custom-anim-pop { animation: smileAnim 1.2s infinite ease-in-out; }

        /* BIG SCREEN FULL-CHAT HERO ENTRANCE & LEAVING ANIMATIONS (Centered in Middle of Chat) */
        @keyframes heroRocketLaunch {
          0% {
            transform: translate(0, 80px) scale(0.2) rotate(-5deg);
            opacity: 0;
          }
          20% {
            transform: translate(0, 0) scale(1.6) rotate(3deg);
            opacity: 1;
            filter: drop-shadow(0 0 35px rgba(249,115,22,1));
          }
          45% {
            transform: translate(-3px, -5px) scale(1.8) rotate(-4deg);
            filter: drop-shadow(0 0 50px rgba(239,68,68,1));
          }
          65% {
            transform: translate(3px, -15px) scale(1.9) rotate(3deg);
            filter: drop-shadow(0 0 60px rgba(249,115,22,1));
          }
          80% {
            transform: translate(0, -90px) scale(2.0) rotate(-10deg);
            opacity: 1;
          }
          100% {
            transform: translate(0, -360px) scale(2.2) rotate(-18deg);
            opacity: 0;
          }
        }

        @keyframes heroFireErupt {
          0% {
            transform: translate(0, 40px) scale(0.2);
            opacity: 0;
          }
          20% {
            transform: translate(0, 0) scale(1.8);
            opacity: 1;
            filter: drop-shadow(0 0 45px rgba(239,68,68,1)) drop-shadow(0 0 75px rgba(249,115,22,0.9));
          }
          45% {
            transform: translate(0, 0) scale(2.2) rotate(-6deg);
            filter: drop-shadow(0 0 60px rgba(249,115,22,1));
          }
          65% {
            transform: translate(0, 0) scale(2.3) rotate(6deg);
            filter: drop-shadow(0 0 50px rgba(239,68,68,1));
          }
          80% {
            transform: translate(30px, -40px) scale(1.6);
            opacity: 0.85;
          }
          100% {
            transform: translate(80px, -140px) scale(0.6);
            opacity: 0;
          }
        }

        @keyframes heroHeartExplosion {
          0% {
            transform: translate(0, 0) scale(0.2);
            opacity: 0;
          }
          20% {
            transform: translate(0, 0) scale(1.8);
            opacity: 1;
            filter: drop-shadow(0 0 45px rgba(244,63,94,1)) drop-shadow(0 0 80px rgba(225,29,72,0.8));
          }
          35% {
            transform: translate(0, 0) scale(1.4);
          }
          50% {
            transform: translate(0, 0) scale(2.0);
            filter: drop-shadow(0 0 55px rgba(244,63,94,1));
          }
          65% {
            transform: translate(0, 0) scale(1.5);
          }
          80% {
            transform: translate(40px, 20px) scale(1.6);
            opacity: 0.9;
          }
          100% {
            transform: translate(110px, 60px) scale(0.6);
            opacity: 0;
          }
        }

        @keyframes heroPartyCannon {
          0% {
            transform: translate(0, 0) scale(0.2) rotate(-180deg);
            opacity: 0;
          }
          25% {
            transform: translate(0, 0) scale(2.0) rotate(0deg);
            opacity: 1;
            filter: drop-shadow(0 0 45px rgba(168,85,247,0.95));
          }
          50% {
            transform: translate(0, 0) scale(2.2) rotate(15deg);
          }
          70% {
            transform: translate(0, 0) scale(2.0) rotate(-15deg);
          }
          85% {
            transform: translate(40px, 20px) scale(1.5);
            opacity: 0.85;
          }
          100% {
            transform: translate(110px, 60px) scale(0.5);
            opacity: 0;
          }
        }

        @keyframes heroClapImpact {
          0% { transform: translate(0, 0) scale(0.2); opacity: 0; }
          20% { transform: translate(0, 0) scale(1.8) rotate(-12deg); opacity: 1; filter: drop-shadow(0 0 35px rgba(251,191,36,0.9)); }
          40% { transform: translate(0, 0) scale(1.4) rotate(0deg); }
          60% { transform: translate(0, 0) scale(1.9) rotate(12deg); filter: drop-shadow(0 0 45px rgba(251,191,36,1)); }
          80% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroBulbIlluminate {
          0% { transform: translate(0, -60px) scale(0.3); opacity: 0; }
          25% { transform: translate(0, 0) scale(1.6); opacity: 1; filter: drop-shadow(0 0 15px rgba(234,179,8,0.5)); }
          50% { transform: translate(0, 0) scale(2.2); filter: drop-shadow(0 0 65px rgba(250,204,21,1)) drop-shadow(0 0 95px rgba(253,224,71,0.9)); }
          75% { transform: translate(0, 0) scale(1.9); filter: drop-shadow(0 0 50px rgba(250,204,21,1)); }
          88% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroStampSlam {
          0% { transform: translate(0, -80px) scale(3.5) rotate(-20deg); opacity: 0; }
          25% { transform: translate(0, 0) scale(1.8) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 40px rgba(220,38,38,1)); }
          50% { transform: translate(0, 0) scale(2.1); filter: drop-shadow(0 0 50px rgba(220,38,38,0.9)); }
          75% { transform: translate(0, 0) scale(1.8); }
          88% { transform: translate(40px, 20px) scale(1.4); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroStarSupernova {
          0% { transform: translate(0, 0) scale(0.1) rotate(-360deg); opacity: 0; }
          25% { transform: translate(0, 0) scale(2.0) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 50px rgba(250,204,21,1)) drop-shadow(0 0 85px rgba(253,224,71,0.9)); }
          50% { transform: translate(0, 0) scale(2.3) rotate(180deg); }
          75% { transform: translate(0, 0) scale(1.9) rotate(360deg); }
          88% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.5); opacity: 0; }
        }

        @keyframes heroThumbsMega {
          0% { transform: translate(0, 80px) scale(0.3); opacity: 0; }
          25% { transform: translate(0, 0) scale(1.9); opacity: 1; filter: drop-shadow(0 0 35px rgba(59,130,246,0.8)); }
          50% { transform: translate(0, -10px) scale(2.2); }
          75% { transform: translate(0, 0) scale(1.9); filter: drop-shadow(0 0 45px rgba(59,130,246,1)); }
          88% { transform: translate(40px, 20px) scale(1.4); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroWaveMega {
          0% { transform: translate(0, 50px) scale(0.3); opacity: 0; }
          20% { transform: translate(0, 0) scale(1.8) rotate(-20deg); opacity: 1; filter: drop-shadow(0 0 35px rgba(251,191,36,0.8)); }
          40% { transform: translate(0, 0) scale(2.0) rotate(20deg); }
          60% { transform: translate(0, 0) scale(1.9) rotate(-20deg); }
          75% { transform: translate(0, 0) scale(2.0) rotate(15deg); }
          88% { transform: translate(40px, 20px) scale(1.4); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroTargetStrike {
          0% { transform: translate(0, 0) scale(0.2) rotate(-90deg); opacity: 0; }
          25% { transform: translate(0, 0) scale(2.2) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 40px rgba(239,68,68,0.9)); }
          50% { transform: translate(0, 0) scale(1.8); }
          75% { transform: translate(0, 0) scale(2.2); filter: drop-shadow(0 0 55px rgba(239,68,68,1)); }
          88% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroCapToss {
          0% { transform: translate(0, 60px) scale(0.4) rotate(-30deg); opacity: 0; }
          30% { transform: translate(0, -40px) scale(2.0) rotate(15deg); opacity: 1; filter: drop-shadow(0 0 40px rgba(147,51,234,0.9)); }
          60% { transform: translate(0, 0) scale(1.9) rotate(-15deg); }
          85% { transform: translate(40px, 20px) scale(1.4); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroPrayBlessing {
          0% { transform: translate(0, 0) scale(0.3); opacity: 0; }
          25% { transform: translate(0, 0) scale(2.0); opacity: 1; filter: drop-shadow(0 0 40px rgba(251,191,36,0.9)) drop-shadow(0 0 70px rgba(245,158,11,0.7)); }
          65% { transform: translate(0, 0) scale(2.2); filter: drop-shadow(0 0 55px rgba(251,191,36,1)); }
          85% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.7); opacity: 0; }
        }

        @keyframes heroQuestionFlip {
          0% { transform: translate(0, 50px) scale(0.2); opacity: 0; }
          25% { transform: translate(0, 0) scale(2.1) rotate(-18deg); opacity: 1; filter: drop-shadow(0 0 35px rgba(239,68,68,0.9)); }
          60% { transform: translate(0, 0) scale(2.0) rotate(18deg); }
          85% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroThinkFloat {
          0% { transform: translate(0, 50px) scale(0.3); opacity: 0; }
          25% { transform: translate(0, 0) scale(2.0) rotate(12deg); opacity: 1; filter: drop-shadow(0 0 35px rgba(245,158,11,0.8)); }
          60% { transform: translate(0, 0) scale(2.2) rotate(-8deg); }
          85% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        @keyframes heroSmileJoy {
          0% { transform: translate(0, 0) scale(0.2); opacity: 0; }
          25% { transform: translate(0, 0) scale(2.2); opacity: 1; filter: drop-shadow(0 0 45px rgba(251,191,36,0.9)) drop-shadow(0 0 75px rgba(245,158,11,0.7)); }
          50% { transform: translate(0, 0) scale(1.8); }
          75% { transform: translate(0, 0) scale(2.1); filter: drop-shadow(0 0 50px rgba(251,191,36,1)); }
          88% { transform: translate(40px, 20px) scale(1.5); opacity: 0.85; }
          100% { transform: translate(110px, 60px) scale(0.6); opacity: 0; }
        }

        .hero-anim-rocket { animation: heroRocketLaunch 2.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .hero-anim-fire { animation: heroFireErupt 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-heart { animation: heroHeartExplosion 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-party { animation: heroPartyCannon 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-clap { animation: heroClapImpact 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-bulb { animation: heroBulbIlluminate 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-stamp { animation: heroStampSlam 2.0s cubic-bezier(0.2, 0.8, 0.2, 1) forwards; }
        .hero-anim-star { animation: heroStarSupernova 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-thumbs { animation: heroThumbsMega 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-wave { animation: heroWaveMega 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; transform-origin: 70% 80%; }
        .hero-anim-target { animation: heroTargetStrike 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-cap { animation: heroCapToss 2.2s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
        .hero-anim-pray { animation: heroPrayBlessing 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-question { animation: heroQuestionFlip 2.1s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-think { animation: heroThinkFloat 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .hero-anim-smile { animation: heroSmileJoy 2.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* Header Bar (Only in regular inline mode, omitted in fullscreen to avoid duplicate header) */}
      {!isFullscreen && (
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-4 py-3 sm:px-5 sm:py-3.5 bg-gradient-to-r from-purple-50/80 via-white to-indigo-50/70 border-b border-purple-100 flex items-center justify-between cursor-pointer select-none shrink-0 transition-colors"
        >
          {/* Main Hub / Broadcast / Student View Header */}
          <div className="flex items-center justify-between w-full pr-1 gap-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center text-base sm:text-lg shadow-sm shadow-purple-950/20 shrink-0">
                <FaComments />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-xs sm:text-sm font-black text-gray-950 tracking-tight flex items-center gap-1.5">
                    <span>{isStreamEnded ? "Stream Messages & Chat" : "Live Class Discussion & Chat"}</span>
                    {isStreamEnded ? (
                      <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[10px] border border-rose-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                        <span>Concluded</span>
                      </span>
                    ) : (
                      <span className="flex h-2 w-2 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                      </span>
                    )}
                  </h4>

                  {unseenCount > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white font-black text-[10.5px] shadow-2xs animate-pulse flex items-center gap-1 border border-red-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                      <span>{unseenCount} unseen</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-100/90 text-purple-950 font-extrabold text-[10.5px] border border-purple-200">
                      {messages.length} message{messages.length === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {/* Subtitle helper */}
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-600 font-medium">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100/95 border border-amber-300 text-amber-950 font-extrabold text-[10.5px] shrink-0 shadow-2xs">
                    <FaLock className="text-amber-600 text-[9px]" /> Private Chat
                  </span>
                  <p className="text-gray-600 text-[11px] sm:text-xs truncate">
                    {isStreamEnded ? (
                      isStudent 
                        ? "Send questions or feedback directly to your teacher." 
                        : "Review student questions. Click a student card to reply."
                    ) : (
                      isStudent
                        ? "Send questions and reactions directly to your teacher."
                        : "Click any student or staff card to open the chat window."
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-8 h-8 rounded-xl bg-white hover:bg-purple-100 text-gray-500 hover:text-purple-900 flex items-center justify-center transition border border-gray-200/80 shadow-2xs shrink-0">
              {isExpanded ? <FaChevronUp className="text-xs" /> : <FaChevronDown className="text-xs" />}
            </div>
          </div>
        </div>
      )}

      {/* Expanded Chat Body */}
      {isExpanded && (
        <div className={`relative flex flex-col bg-white overflow-x-hidden ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          
          {/* 1. FULL CHAT SCREEN BIG HERO ENTRANCE & LEAVING STAGE (Pinned in Exact Middle of Visible Chat) */}
          {heroReaction && (
            <div className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center overflow-hidden">
              {/* Ambient Spotlight Glow */}
              <div className="absolute inset-0 bg-radial from-purple-600/25 via-transparent to-transparent animate-pulse opacity-95" />

              {/* Big Screen Animated Emoji Actor */}
              <div className={`relative flex flex-col items-center justify-center select-none ${heroReaction.animType}`}>
                {heroReaction.code ? (
                  <img
                    src={getHighResEmojiUrl(heroReaction.code)}
                    alt={heroReaction.emoji}
                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-18 md:h-18 object-contain drop-shadow-md select-none pointer-events-none will-change-transform"
                    onError={(e) => {
                      if (!e.currentTarget.dataset.retried) {
                        e.currentTarget.dataset.retried = 'true';
                        e.currentTarget.src = getStandardEmojiUrl(heroReaction.code);
                      } else {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'inline';
                        }
                      }
                    }}
                  />
                ) : null}
                <span className={`${heroReaction.code ? 'hidden' : 'inline'} text-4xl sm:text-5xl leading-none drop-shadow-md select-none`}>
                  {heroReaction.emoji}
                </span>
              </div>
            </div>
          )}

          {/* Messages Display Area (with Relative Positioning for Full-Chat Hero Reaction & Floating Emoji Particles) */}
          <div 
            ref={chatContainerRef}
            onScroll={handleMainScroll}
            className={`relative ${isFullscreen ? 'flex-1 min-h-0' : 'h-80 sm:h-96'} overflow-y-auto overflow-x-hidden p-3.5 sm:p-4 pb-8 space-y-4 sm:space-y-5 bg-gray-50/70 border-b border-gray-100 scroll-smooth overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400`}
          >

            {/* 2. Live Chat-Wide Floating Reaction Particles Overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
              {floatingReactions.map((p) => (
                <div
                  key={p.id}
                  style={{
                    left: `${p.left}%`,
                    bottom: '12px',
                    fontSize: `${p.size}px`,
                    animation: `floatUpFade ${p.duration}s cubic-bezier(0.22, 1, 0.36, 1) forwards`,
                    animationDelay: `${p.delay}s`,
                    transform: `translateX(${p.driftX}px)`
                  }}
                  className={`absolute select-none will-change-transform ${p.animClass}`}
                >
                  {p.emoji}
                </div>
              ))}
            </div>

            {/* 3. Post-Stream Lecture Ended Notification Banner */}
            {isStreamEnded && (
              <div className="bg-gradient-to-r from-purple-50 via-indigo-50/80 to-purple-50 border border-purple-200/90 rounded-2xl p-3 sm:p-3.5 shadow-2xs space-y-1 select-none animate-fadeIn">
                <div className="flex items-center gap-2">
                  <span className="w-5.5 h-5.5 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-black shadow-2xs">
                    <FaStop className="text-[9px]" />
                  </span>
                  <span className="font-black text-xs text-purple-950">
                    Live Lecture Has Concluded
                  </span>
                  <span className="ml-auto px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-extrabold text-[9.5px]">
                    Feedback & Questions
                  </span>
                </div>
                <p className="text-[11.5px] text-purple-900/90 font-medium pl-7 leading-relaxed">
                  {isStudent 
                    ? "Provide your feedback, final reactions, or post-stream questions below. Your instructor can review and reply to you directly."
                    : "The live stream has ended. You can review student questions, feedback reactions, and reply to each student inquiry anytime."}
                </p>
              </div>
            )}

            {/* 4. Student Feedback Submitted Confirmation Toast Banner */}
            {studentFeedbackSubmitted && isStudent && (
              <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-3 sm:p-3.5 shadow-xs space-y-1 animate-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2">
                  <span className="w-5.5 h-5.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-black shadow-xs">
                    ✓
                  </span>
                  <span className="font-black text-xs text-emerald-950">
                    Feedback & Reaction Delivered!
                  </span>
                </div>
                <p className="text-[11.5px] text-emerald-900 font-medium pl-7 leading-relaxed">
                  Thank you! Your feedback and reaction have been submitted directly to your teacher. Any replies from your teacher will appear right here in this chat thread.
                </p>
              </div>
            )}

            {/* When Teacher/Admin: Main Hub is the primary view with 3 Quick Switcher Buttons on Top */}
            {isTeacherOrAdmin ? (
              <div className="w-full space-y-4 overflow-x-hidden">
                {/* Top 3 Quick Chat Switcher Tabs for Teacher & Admin */}
                {(() => {
                  const hasAnyUnreadStudent = studentThreads.some(thread => {
                    const lastReadTime = readThreadTimestamps[thread.studentId] || sessionStartTimeRef.current;
                    const lastMsgTime = thread.lastMessageTime ? new Date(thread.lastMessageTime).getTime() : 0;
                    return Boolean(thread.lastSenderRole === 'student' && lastMsgTime > lastReadTime);
                  });

                  const lastStaffRead = readThreadTimestamps['staff'] || sessionStartTimeRef.current;
                  const lastStaffMsg = staffMessages[staffMessages.length - 1];
                  const staffSenderId = lastStaffMsg ? (typeof lastStaffMsg.sender === 'object' ? lastStaffMsg.sender?._id : lastStaffMsg.sender) : null;
                  const isStaffFromMe = Boolean(user?._id && String(staffSenderId) === String(user._id));
                  const hasUnreadStaff = Boolean(lastStaffMsg && (new Date(lastStaffMsg.createdAt).getTime() > lastStaffRead) && !isStaffFromMe);
                  const broadcastCount = messages.filter(m => m.isBroadcast).length;

                  return (
                    <div className="sticky top-0 z-30 -mt-1 mb-2.5 pt-1.5 pb-2 bg-white/95 backdrop-blur-md border-b border-gray-100 -mx-3.5 px-3.5 sm:-mx-4 sm:px-4 grid grid-cols-3 gap-1.5 sm:gap-2 shadow-2xs select-none">
                      {/* Button 1: Broadcasts */}
                      <button
                        type="button"
                        onClick={() => setChatFilterTab(chatFilterTab === 'broadcast' ? 'all' : 'broadcast')}
                        className={`relative flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-2xl text-xs font-black transition-all duration-200 cursor-pointer active:scale-95 border ${
                          chatFilterTab === 'broadcast'
                            ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white border-emerald-500 shadow-md shadow-emerald-950/20 ring-2 ring-emerald-400/40 -translate-y-0.5'
                            : 'bg-white hover:bg-emerald-50/70 text-emerald-950 border-emerald-200/90 hover:border-emerald-400 hover:shadow-xs'
                        }`}
                        title="Filter by Class Broadcast Announcements"
                      >
                        <FaBullhorn className={`text-xs shrink-0 ${chatFilterTab === 'broadcast' ? 'text-amber-300' : 'text-emerald-600'}`} />
                        <span className="whitespace-nowrap tracking-tight font-extrabold">Broadcasts</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black shrink-0 transition-all ${
                          chatFilterTab === 'broadcast' 
                            ? 'bg-white/25 text-white ring-1 ring-white/30 backdrop-blur-xs' 
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}>
                          {broadcastCount}
                        </span>
                      </button>

                      {/* Button 2: Student Inquiries */}
                      <button
                        type="button"
                        onClick={() => setChatFilterTab(chatFilterTab === 'inquiries' ? 'all' : 'inquiries')}
                        className={`relative flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-2xl text-xs font-black transition-all duration-200 cursor-pointer active:scale-95 border ${
                          chatFilterTab === 'inquiries'
                            ? 'bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white border-blue-500 shadow-md shadow-blue-950/20 ring-2 ring-sky-400/40 -translate-y-0.5'
                            : 'bg-white hover:bg-sky-50/70 text-sky-950 border-sky-200/90 hover:border-sky-400 hover:shadow-xs'
                        }`}
                        title="Filter by Student Inquiries"
                      >
                        <FaUserGraduate className={`text-xs shrink-0 ${chatFilterTab === 'inquiries' ? 'text-amber-300' : 'text-sky-600'}`} />
                        <span className="whitespace-nowrap tracking-tight font-extrabold">Inquiries</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black shrink-0 transition-all ${
                          chatFilterTab === 'inquiries' 
                            ? 'bg-white/25 text-white ring-1 ring-white/30 backdrop-blur-xs' 
                            : 'bg-sky-100 text-sky-900 border border-sky-200'
                        }`}>
                          {studentThreads.length}
                        </span>
                        {hasAnyUnreadStudent && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                          </span>
                        )}
                      </button>

                      {/* Button 3: Staff Channel */}
                      <button
                        type="button"
                        onClick={() => setChatFilterTab(chatFilterTab === 'staff' ? 'all' : 'staff')}
                        className={`relative flex items-center justify-center gap-1.5 py-2 px-2 sm:px-3 rounded-2xl text-xs font-black transition-all duration-200 cursor-pointer active:scale-95 border ${
                          chatFilterTab === 'staff'
                            ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white border-purple-500 shadow-md shadow-purple-950/20 ring-2 ring-purple-400/40 -translate-y-0.5'
                            : 'bg-white hover:bg-purple-50/70 text-purple-950 border-purple-200/90 hover:border-purple-400 hover:shadow-xs'
                        }`}
                        title="Filter by Admin & Instructor Staff Channel"
                      >
                        <FaShieldAlt className={`text-xs shrink-0 ${chatFilterTab === 'staff' ? 'text-amber-300' : 'text-purple-600'}`} />
                        <span className="whitespace-nowrap tracking-tight font-extrabold">Staff</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-black shrink-0 transition-all ${
                          chatFilterTab === 'staff' 
                            ? 'bg-white/25 text-white ring-1 ring-white/30 backdrop-blur-xs' 
                            : 'bg-purple-100 text-purple-900 border border-purple-200'
                        }`}>
                          {staffMessages.length}
                        </span>
                        {hasUnreadStaff && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-90"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })()}

                {/* 1. Class Broadcast Announcements Section */}
                {(chatFilterTab === 'all' || chatFilterTab === 'broadcast') && (
                  messages.filter(m => m.isBroadcast).length > 0 ? (
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between px-1.5 pb-2.5 border-b-2 border-emerald-200/80">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-xs shadow-xs border border-emerald-400/80 shrink-0">
                            <FaBullhorn className="text-[11px]" />
                          </div>
                          <span className="text-xs sm:text-[13px] font-black uppercase text-emerald-950 tracking-wider flex items-center gap-2">
                            <span>Class Broadcast Announcements</span>
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/90 text-emerald-950 font-black text-[10.5px] border border-emerald-300 shadow-2xs">
                              {messages.filter(m => m.isBroadcast).length}
                            </span>
                          </span>
                        </div>

                        {/* Styled Right Pill Badge for Broadcast */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-100 via-teal-50 to-emerald-100 text-emerald-950 font-black text-xs border border-emerald-300/90 shadow-2xs shrink-0 hover:shadow-xs transition-all">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs animate-pulse shrink-0"></span>
                          <span className="tracking-tight">Broadcast to all students</span>
                        </div>
                      </div>
                      {messages.filter(m => m.isBroadcast).map((msg, index) => {
                        const isFromMe = getIsFromMe(msg);
                        const msgRole = getMessageTheme(msg, isFromMe, user?.role, isTeacherOrAdmin);
                        const isSenderAdmin = msgRole === 'admin';
                        const isSenderTeacher = msgRole === 'teacher';

                        const displaySenderName = isSenderTeacher
                          ? (msg.senderName && !msg.senderName.toLowerCase().includes('admin') ? msg.senderName : 'Chaminda Herath')
                          : isSenderAdmin
                            ? 'LuminaLearn Admin'
                            : msg.senderName;

                        return (
                          <div key={msg._id || index} className="w-full max-w-xl mx-auto bg-gradient-to-b from-emerald-50/95 to-emerald-50/90 hover:from-emerald-100/95 hover:to-emerald-100/80 border-2 border-emerald-400/80 hover:border-emerald-500 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-colors duration-200 text-gray-900 space-y-3 box-border min-h-[110px] flex flex-col justify-between cursor-default">
                            <div className="flex items-center justify-between border-b border-emerald-200/90 pb-2.5">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <ChatAvatar
                                  avatarSrc={
                                    isSenderTeacher
                                      ? '/assets/founder_photo.png'
                                      : isSenderAdmin
                                        ? '/assets/LuminaLearn_Logo_icon.png'
                                        : (msg.senderAvatar || (typeof msg.sender === 'object' && msg.sender !== null ? (msg.sender.profilePicture || msg.sender.avatar) : ''))
                                  }
                                  senderName={displaySenderName}
                                  isSenderAdmin={isSenderAdmin}
                                  isSenderTeacher={isSenderTeacher}
                                />
                                <div className="flex items-center gap-2 flex-wrap min-w-0">
                                  <h5 className="font-extrabold text-xs sm:text-sm text-emerald-950 tracking-tight truncate">
                                    {displaySenderName}
                                  </h5>
                                  {isSenderAdmin ? (
                                    <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-300 shadow-2xs">
                                      Admin
                                    </span>
                                  ) : (
                                    <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black border border-amber-500/60 shadow-2xs">
                                      Instructor
                                    </span>
                                  )}
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider shadow-2xs">
                                    <FaBullhorn className="text-[9px]" />
                                    <span>Broadcast</span>
                                  </span>
                                </div>
                              </div>
                              <span className="text-[11px] text-emerald-800 font-mono font-bold shrink-0 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                                {formatMessageTime(msg.createdAt)}
                              </span>
                            </div>

                          {msg.text && (
                            isOnlyEmoji(msg.text) ? (
                              <div className={`py-1.5 text-center select-none flex items-center justify-center min-h-[56px] transition-all duration-200 transform hover:scale-115 active:scale-95 cursor-pointer ${getEmojiCustomAnimation(msg.text)}`}>
                                {getEmojiAppleCode(msg.text) ? (
                                  <img
                                    src={getHighResEmojiUrl(getEmojiAppleCode(msg.text))}
                                    alt={msg.text}
                                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain drop-shadow-md select-none will-change-transform filter"
                                    onError={(e) => {
                                      if (!e.currentTarget.dataset.retried) {
                                        e.currentTarget.dataset.retried = 'true';
                                        e.currentTarget.src = getStandardEmojiUrl(getEmojiAppleCode(msg.text));
                                      } else {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextSibling) {
                                          e.currentTarget.nextSibling.style.display = 'inline';
                                        }
                                      }
                                    }}
                                  />
                                ) : null}
                                <span className={`${getEmojiAppleCode(msg.text) ? 'hidden' : 'inline'} text-4xl sm:text-5xl md:text-6xl drop-shadow-md select-none leading-none`}>
                                  {msg.text}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm font-semibold text-emerald-950 whitespace-pre-wrap break-words leading-relaxed py-1">
                                {msg.text}
                              </p>
                            )
                          )}

                          {/* Attachments */}
                          {msg.attachments?.map((att, aIdx) => (
                            <div key={aIdx} className="pt-0.5">
                              {att.category === 'image' || att.fileType?.startsWith('image/') ? (
                                <img
                                  src={getFullAttachmentUrl(att.url)}
                                  alt=""
                                  onClick={() => setPreviewImageModal(getFullAttachmentUrl(att.url))}
                                  className="max-h-56 rounded-xl object-contain border border-emerald-300 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg"
                                />
                              ) : (att.category === 'audio' || att.fileType?.startsWith('audio/') || att.fileType === 'video/webm' || att.url?.endsWith('.webm') || att.url?.endsWith('.ogg')) ? (
                                <AudioMessagePlayer
                                  src={att.url}
                                  duration={att.duration}
                                  isFromMe={true}
                                  isBroadcast={true}
                                  role="broadcast"
                                  audioId={att.url}
                                />
                              ) : (
                                <DocumentMessageCard
                                  attachment={att}
                                  isFromMe={true}
                                  isSenderAdmin={false}
                                  isSenderTeacher={true}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    </div>
                  ) : chatFilterTab === 'broadcast' ? (
                    <div className="w-full bg-emerald-50/40 rounded-2xl border-2 border-dashed border-emerald-200 p-6 text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center text-xl mx-auto">
                        📢
                      </div>
                      <p className="text-xs sm:text-sm font-black text-emerald-950">
                        No Broadcast Announcements Sent Yet
                      </p>
                      <p className="text-xs text-emerald-900/80 max-w-sm mx-auto font-medium">
                        Type an announcement in the box below and click Send to broadcast to all connected students.
                      </p>
                    </div>
                  ) : null
                )}

                {/* 2. Admin & Teacher Staff Chat Section (Visible only to Teacher & Admin) */}
                {(chatFilterTab === 'all' || chatFilterTab === 'staff') && (
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between px-1.5 pb-2.5 border-b-2 border-purple-200/80">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white flex items-center justify-center text-xs shadow-xs border border-purple-400/80 shrink-0">
                          <FaShieldAlt className="text-[11px]" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-black uppercase text-purple-950 tracking-wider flex items-center gap-2">
                          <span>Admin & Teacher Staff Chat</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-purple-200/90 text-purple-950 font-black text-[10.5px] border border-purple-300 shadow-2xs">
                            {staffMessages.length}
                          </span>
                        </span>
                      </div>

                      {/* Styled Right Pill Badge for Staff */}
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-purple-100 via-indigo-50 to-purple-100 text-purple-950 font-black text-xs border border-purple-300/90 shadow-2xs shrink-0 hover:shadow-xs transition-all">
                        <span className="w-4 h-4 rounded-full bg-purple-200/90 text-purple-800 flex items-center justify-center text-[10px] shrink-0 border border-purple-300/80">
                          <FaLock className="text-[8px]" />
                        </span>
                        <span className="tracking-tight">Hidden from students</span>
                      </div>
                    </div>

                    {/* Staff Interactive Card (Opens Staff Chat in Modal Window) */}
                    {(() => {
                      const lastStaffRead = readThreadTimestamps['staff'] || sessionStartTimeRef.current;
                      const lastStaffMsg = staffMessages[staffMessages.length - 1];
                      const staffSenderId = lastStaffMsg ? (typeof lastStaffMsg.sender === 'object' ? lastStaffMsg.sender?._id : lastStaffMsg.sender) : null;
                      const isStaffFromMe = Boolean(user?._id && String(staffSenderId) === String(user._id));
                      const hasUnreadStaff = Boolean(lastStaffMsg && (new Date(lastStaffMsg.createdAt).getTime() > lastStaffRead) && !isStaffFromMe);

                      return (
                        <div 
                          onClick={() => {
                            setSelectedStudentId('staff');
                            setSendMode('private');
                            setReadThreadTimestamps(prev => ({
                              ...prev,
                              staff: Date.now()
                            }));
                          }}
                          className="relative w-full max-w-xl mx-auto bg-gradient-to-br from-white via-purple-50/50 to-purple-100/50 hover:from-white hover:to-purple-100/90 rounded-2xl sm:rounded-3xl border-2 border-purple-200/90 hover:border-purple-500 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99] overflow-visible box-border"
                        >
                          {/* Top Row: Staff Icon + Channel Title + Description + Formatted Time / Badge */}
                          <div className="flex items-center justify-between gap-3 min-w-0">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white font-black text-sm sm:text-base flex items-center justify-center border-2 border-purple-400 shadow-xs ring-2 ring-purple-100/80 shrink-0 group-hover:scale-105 group-hover:border-purple-600 transition-all duration-200">
                                <FaShieldAlt className="text-base sm:text-lg" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <h5 className="font-black text-sm sm:text-base text-gray-950 truncate group-hover:text-purple-700 transition leading-tight">
                                    Admin ↔ Instructor Channel
                                  </h5>
                                  <FaLock className="text-xs sm:text-sm text-purple-600 opacity-80 shrink-0" />
                                </div>
                                <span className="text-[11px] sm:text-xs text-purple-800 font-bold block truncate mt-0.5">
                                  Staff Tech Support & Class Coordination
                                </span>
                              </div>
                            </div>

                            {/* Formatted Time and New Badge */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {hasUnreadStaff && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs animate-pulse">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                  <span>New</span>
                                </span>
                              )}
                              {lastStaffMsg ? (
                                <span className="text-xs text-gray-700 font-mono font-bold shrink-0 bg-white/90 px-2.5 py-1 rounded-lg border border-purple-200/90 shadow-2xs">
                                  {formatMessageTime(lastStaffMsg.createdAt)}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-purple-100/90 text-purple-950 font-black text-[10px] uppercase tracking-wider border border-purple-300/90 shadow-2xs shrink-0">
                                  Staff Only
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Bottom Row: Message Count Badge + Action Button */}
                          <div className="flex items-center justify-between pt-3 mt-3 border-t border-purple-200/70 text-xs min-w-0">
                            <span className="px-3 py-1.5 rounded-xl bg-purple-100/90 text-purple-950 font-black text-xs border border-purple-300/90 shadow-2xs shrink-0">
                              {staffMessages.length} msg{staffMessages.length === 1 ? '' : 's'}
                            </span>

                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs sm:text-[13px] shadow-sm shadow-purple-950/20 group-hover:shadow-md group-hover:scale-[1.03] active:scale-95 transition-all duration-200 shrink-0 border border-purple-400/50">
                              <span>Open Staff Chat</span>
                              <span className="text-sm">💬</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* 3. Separate Student Inquiry Boxes Section */}
                {(chatFilterTab === 'all' || chatFilterTab === 'inquiries') && (
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between px-1.5 pb-2.5 border-b-2 border-sky-200/80">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7.5 h-7.5 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center text-xs shadow-xs border border-sky-400/80 shrink-0">
                          <FaUserGraduate className="text-[11px]" />
                        </div>
                        <span className="text-xs sm:text-[13px] font-black uppercase text-sky-950 tracking-wider flex items-center gap-2">
                          <span>Student Inquiry Boxes</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-sky-200/90 text-sky-950 font-black text-[10.5px] border border-sky-300 shadow-2xs">
                            {studentThreads.length}
                          </span>
                        </span>
                      </div>

                      {/* Styled Right Pill Badge for Student Inquiries */}
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-sky-100 via-blue-50 to-sky-100 text-sky-950 font-black text-xs border border-sky-300/90 shadow-2xs shrink-0 hover:shadow-xs transition-all">
                        <span className="w-2 h-2 rounded-full bg-sky-500 shadow-xs animate-pulse shrink-0"></span>
                        <span className="tracking-tight">Click card to reply privately 💬</span>
                      </div>
                    </div>

                    {studentThreads.length === 0 ? (
                      <div className="w-full bg-sky-50/40 rounded-2xl border-2 border-dashed border-sky-200 p-6 text-center space-y-2">
                        <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center text-xl mx-auto">
                          🎓
                        </div>
                        <p className="text-xs sm:text-sm font-black text-sky-950">
                          No Student Messages Yet
                        </p>
                        <p className="text-xs text-sky-900/80 max-w-sm mx-auto font-medium">
                          When students ask questions or send reactions, their individual interactive boxes will appear here for you to click and reply privately.
                        </p>
                      </div>
                    ) : (
                      <div className="w-full space-y-3 flex flex-col items-center">
                        {studentThreads.map(thread => {
                        const lastReadTime = readThreadTimestamps[thread.studentId] || sessionStartTimeRef.current;
                        const lastMsgTime = thread.lastMessageTime ? new Date(thread.lastMessageTime).getTime() : 0;
                        const hasUnread = Boolean(thread.lastSenderRole === 'student' && lastMsgTime > lastReadTime);

                        return (
                          <div
                            key={thread.studentId}
                            onClick={() => {
                              setSelectedStudentId(thread.studentId);
                              setSendMode('private');
                              setReadThreadTimestamps(prev => ({
                                ...prev,
                                [thread.studentId]: Date.now()
                              }));
                            }}
                            className="relative w-full max-w-xl mx-auto bg-gradient-to-br from-white via-sky-50/50 to-sky-100/50 hover:from-white hover:to-sky-100/90 rounded-2xl sm:rounded-3xl border-2 border-sky-200/90 hover:border-sky-500 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between group active:scale-[0.99] overflow-visible box-border"
                          >
                            {/* Top Row: Student Avatar + Name + Grade + Formatted Time */}
                            <div className="flex items-center justify-between gap-3 min-w-0">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {/* 1. Clickable Picture/Avatar ONLY */}
                                <div 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (thread.studentId) {
                                      setInspectStudentId(thread.studentId);
                                    }
                                  }}
                                  className="cursor-pointer group/avatar shrink-0 select-none"
                                  title="Click picture to view student profile & courses"
                                >
                                  {thread.studentAvatar ? (
                                    <img
                                      src={getFullAttachmentUrl(thread.studentAvatar)}
                                      alt={thread.studentName}
                                      className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-sky-400 shadow-xs ring-2 ring-sky-100/80 group-hover/avatar:scale-110 group-hover/avatar:border-sky-600 transition-all duration-200"
                                    />
                                  ) : (
                                    <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-sky-600 to-blue-700 text-white font-black text-sm sm:text-base flex items-center justify-center border-2 border-sky-400 shadow-xs ring-2 ring-sky-100/80 group-hover/avatar:scale-110 group-hover/avatar:border-sky-600 transition-all duration-200">
                                      {(thread.studentName || 'S').charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                {/* 2. Clickable Name ONLY & Grade */}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (thread.studentId) {
                                          setInspectStudentId(thread.studentId);
                                        }
                                      }}
                                      className="font-black text-sm sm:text-base text-gray-950 truncate hover:text-sky-700 transition leading-tight flex items-center gap-1 cursor-pointer text-left"
                                      title="Click name to view student profile & courses"
                                    >
                                      <span>{thread.studentName || 'Student'}</span>
                                      <FaInfoCircle className="text-xs sm:text-sm text-sky-600 opacity-80 hover:opacity-100 shrink-0" />
                                    </button>
                                  </div>
                                  {thread.studentGrade && (
                                    <span className="text-[11px] sm:text-xs text-sky-800 font-bold block truncate mt-0.5">
                                      {thread.studentGrade}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Formatted Message Time and New Badge */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {hasUnread && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider shadow-2xs animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                                    <span>New</span>
                                  </span>
                                )}
                                {thread.lastMessageTime && (
                                  <span className="text-xs text-gray-700 font-mono font-bold shrink-0 bg-white/90 px-2.5 py-1 rounded-lg border border-sky-200/90 shadow-2xs">
                                    {formatMessageTime(thread.lastMessageTime)}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Bottom Row: Message Count Badge + Action Button */}
                            <div className="flex items-center justify-between pt-3 mt-3 border-t border-sky-200/70 text-xs min-w-0">
                              <span className="px-3 py-1.5 rounded-xl bg-sky-100/90 text-sky-950 font-black text-xs border border-sky-300/90 shadow-2xs shrink-0">
                                {thread.messageCount || 1} msg{thread.messageCount === 1 ? '' : 's'}
                              </span>

                              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-700 hover:to-blue-700 text-white font-black text-xs sm:text-[13px] shadow-sm shadow-sky-950/20 group-hover:shadow-md group-hover:scale-[1.03] active:scale-95 transition-all duration-200 shrink-0 border border-sky-300/50">
                                <span>Open Chat & Reply</span>
                                <span className="text-sm">💬</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
              /* When in 1-on-1 Student Chat (Teacher) OR Student Chat Feed (Student) */
              loading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-purple-700 font-bold">
                  <span className="animate-pulse">Loading conversation...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2 select-none">
                  <div className={`w-12 h-12 rounded-2xl ${selectedStudentId === 'staff' ? 'bg-indigo-100 border-indigo-200 text-indigo-700' : 'bg-purple-100 border-purple-200 text-purple-700'} border flex items-center justify-center text-xl shadow-xs`}>
                    {selectedStudentId === 'staff' ? '🛡️' : '💬'}
                  </div>
                  <p className="text-xs sm:text-sm font-extrabold text-gray-900">
                    {isStudent 
                      ? "Have any doubts during today's live lecture?" 
                      : selectedStudentId === 'staff'
                        ? "Admin ↔ Instructor Staff Channel"
                        : `Private chat with ${selectedThreadStudent?.studentName || 'Student'}`}
                  </p>
                  <p className="text-xs text-gray-600 max-w-sm font-medium">
                    {isStudent 
                      ? "Type your question in the message bar below. Your teacher will respond directly to you in real-time." 
                      : selectedStudentId === 'staff'
                        ? "Type your message in the bar below. Messages sent here are private between Admins and Teachers."
                        : "Type your private response in the message bar below to send it directly to this student."}
                  </p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isFromMe = getIsFromMe(msg);
                  const msgRole = getMessageTheme(msg, isFromMe, user?.role, isTeacherOrAdmin);
                  const isSenderAdmin = msgRole === 'admin';
                  const isSenderTeacher = msgRole === 'teacher';
                  const isBroadcast = msg.isBroadcast === true;
                  const isEmojiOnly = isOnlyEmoji(msg.text) && (!msg.attachments || msg.attachments.length === 0);

                  const displaySenderName = isSenderTeacher
                    ? (msg.senderName && !msg.senderName.toLowerCase().includes('admin') ? msg.senderName : 'Chaminda Herath')
                    : isSenderAdmin
                      ? 'LuminaLearn Admin'
                      : msg.senderName;

                  return (
                    <div 
                      key={msg._id || index}
                      className={`flex items-start gap-3 sm:gap-3.5 ${
                        isBroadcast 
                          ? 'justify-center my-3.5 sm:my-4' 
                          : isEmojiOnly 
                            ? 'my-1.5 sm:my-2' 
                            : 'my-2.5 sm:my-3'
                      } ${
                        isFromMe 
                          ? 'justify-end' 
                          : 'justify-start'
                      } w-full animate-in fade-in slide-in-from-bottom-2 duration-150 group`}
                    >
                      {/* 1. WHATSAPP GROUP CHAT STYLE ANNOUNCEMENT BUBBLE (To All Students) */}
                      {isBroadcast ? (
                        <div className="w-full max-w-xl mx-auto bg-gradient-to-b from-emerald-50/95 to-emerald-50/90 hover:from-emerald-100/95 hover:to-emerald-100/80 border-2 border-emerald-400/80 hover:border-emerald-500 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-xs hover:shadow-md transition-colors duration-200 text-gray-900 space-y-3 min-h-[110px] flex flex-col justify-between box-border cursor-default">
                          {/* Header with WhatsApp Group Badge */}
                          <div className="flex items-center justify-between border-b border-emerald-200/90 pb-2.5">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ChatAvatar
                                avatarSrc={
                                  isSenderTeacher
                                    ? '/assets/founder_photo.png'
                                    : isSenderAdmin
                                      ? '/assets/LuminaLearn_Logo_icon.png'
                                      : (msg.senderAvatar || (typeof msg.sender === 'object' && msg.sender !== null ? (msg.sender.profilePicture || msg.sender.avatar) : ''))
                                }
                                senderName={displaySenderName}
                                isSenderAdmin={isSenderAdmin}
                                isSenderTeacher={isSenderTeacher}
                              />
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <h5 className="font-extrabold text-xs sm:text-sm text-emerald-950 tracking-tight truncate">
                                  {displaySenderName}
                                </h5>
                                {isSenderAdmin ? (
                                  <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-300 shadow-2xs">
                                    Admin
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black border border-amber-500/60 shadow-2xs">
                                    Instructor
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[9.5px] font-black uppercase tracking-wider shadow-2xs">
                                  <FaBullhorn className="text-[9px]" />
                                  <span>Broadcast</span>
                                </span>
                              </div>
                            </div>
                            <span className="text-[11px] text-emerald-800 font-mono font-bold shrink-0 bg-white/80 px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                              {formatMessageTime(msg.createdAt)}
                            </span>
                          </div>

                          {/* Text: Standalone Large Animated Emoji or Standard Paragraph */}
                          {msg.text && !(
                            msg.attachments?.some(a => a.category === 'audio' || a.fileType?.startsWith('audio/')) &&
                            (msg.text.includes('Voice Question') || msg.text.includes('Voice Response'))
                          ) && (
                            isOnlyEmoji(msg.text) ? (
                              <div className={`py-1.5 text-center select-none flex items-center justify-center min-h-[56px] transition-all duration-200 transform hover:scale-115 active:scale-95 cursor-pointer ${getEmojiCustomAnimation(msg.text)}`}>
                                {getEmojiAppleCode(msg.text) ? (
                                  <img
                                    src={getHighResEmojiUrl(getEmojiAppleCode(msg.text))}
                                    alt={msg.text}
                                    className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain drop-shadow-md select-none will-change-transform filter"
                                    onError={(e) => {
                                      if (!e.currentTarget.dataset.retried) {
                                        e.currentTarget.dataset.retried = 'true';
                                        e.currentTarget.src = getStandardEmojiUrl(getEmojiAppleCode(msg.text));
                                      } else {
                                        e.currentTarget.style.display = 'none';
                                        if (e.currentTarget.nextSibling) {
                                          e.currentTarget.nextSibling.style.display = 'inline';
                                        }
                                      }
                                    }}
                                  />
                                ) : null}
                                <span className={`${getEmojiAppleCode(msg.text) ? 'hidden' : 'inline'} text-4xl sm:text-5xl md:text-6xl drop-shadow-md select-none leading-none`}>
                                  {msg.text}
                                </span>
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm font-semibold text-emerald-950 whitespace-pre-wrap break-words leading-relaxed py-1">
                                {msg.text}
                              </p>
                            )
                          )}

                          {/* Attachments */}
                          {msg.attachments?.map((att, aIdx) => (
                            <div key={aIdx} className="pt-0.5">
                              {att.category === 'image' || att.fileType?.startsWith('image/') ? (
                                <img
                                  src={getFullAttachmentUrl(att.url)}
                                  alt=""
                                  onClick={() => setPreviewImageModal(getFullAttachmentUrl(att.url))}
                                  className="max-h-56 rounded-xl object-contain border border-emerald-300 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg"
                                />
                              ) : (att.category === 'audio' || att.fileType?.startsWith('audio/') || att.fileType === 'video/webm' || att.url?.endsWith('.webm') || att.url?.endsWith('.ogg')) ? (
                                <AudioMessagePlayer
                                  src={att.url}
                                  duration={att.duration}
                                  isFromMe={isFromMe}
                                  role={msgRole}
                                  audioId={att.url}
                                />
                              ) : (
                                <DocumentMessageCard
                                  attachment={att}
                                  isFromMe={isFromMe}
                                  isSenderAdmin={false}
                                  isSenderTeacher={true}
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* 2. PRIVATE DIRECT MESSAGE BUBBLE (WhatsApp Alignment) */
                        <div className={`flex items-start gap-3 sm:gap-3.5 max-w-[85%] sm:max-w-[78%] ${isFromMe ? 'flex-row-reverse ml-auto mr-0' : 'flex-row mr-auto ml-0'}`}>
                          {(() => {
                            const msgRole = getMessageTheme(msg, isFromMe, user?.role, isTeacherOrAdmin);
                            const isSenderAdmin = msgRole === 'admin';
                            const isSenderTeacher = msgRole === 'teacher';

                            const displaySenderName = isSenderTeacher
                              ? (msg.senderName && !msg.senderName.toLowerCase().includes('admin') ? msg.senderName : 'Chaminda Herath')
                              : isSenderAdmin
                                ? 'LuminaLearn Admin'
                                : (isFromMe ? (user?.name || msg.senderName) : msg.senderName);

                            return (
                              <>
                                {/* Circular Avatar for BOTH Incoming (Left) and Outgoing (Right) Messages */}
                                <ChatAvatar
                                  avatarSrc={
                                    isSenderTeacher
                                      ? '/assets/founder_photo.png'
                                      : isSenderAdmin
                                        ? '/assets/LuminaLearn_Logo_icon.png'
                                        : (msg.senderAvatar || (typeof msg.sender === 'object' && msg.sender !== null ? (msg.sender.profilePicture || msg.sender.avatar) : '') || (isFromMe ? (user?.profilePicture || user?.avatar) : ''))
                                  }
                                  senderName={displaySenderName}
                                  isSenderAdmin={isSenderAdmin}
                                  isSenderTeacher={isSenderTeacher}
                                />

                                {/* Column Container: Header (Name + Time Outside Box) + Message / Voice Bubble */}
                                <div className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'} max-w-full`}>
                                {/* Sender Identity Header & Time OUTSIDE of the message box */}
                                <div className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                                  {isFromMe ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10.5px] text-gray-400 font-mono font-medium">
                                        {formatMessageTime(msg.createdAt)}
                                      </span>
                                      <span className={`font-extrabold text-xs tracking-tight ${
                                        user?.role === 'admin' ? 'text-purple-950' : user?.role === 'teacher' || user?.role === 'instructor' ? 'text-amber-950' : 'text-sky-950'
                                      }`}>
                                        You
                                      </span>
                                      {user?.role === 'admin' ? (
                                        <span className="px-2 py-0.2 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-300 shadow-2xs">
                                          Admin
                                        </span>
                                      ) : user?.role === 'teacher' || user?.role === 'instructor' ? (
                                        <span className="px-2 py-0.2 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black border border-amber-500/60 shadow-2xs">
                                          Instructor
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.2 rounded-md bg-sky-100 text-sky-900 text-[10px] font-black border border-sky-200/90 shadow-2xs">
                                          Student
                                        </span>
                                      )}
                                    </div>
                                  ) : isSenderAdmin ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-xs text-purple-950 tracking-tight">
                                        {displaySenderName}
                                      </span>
                                      <span className="px-2 py-0.2 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-300 shadow-2xs">
                                        Admin
                                      </span>
                                      <span className="text-[10.5px] text-gray-400 font-mono font-medium">• {formatMessageTime(msg.createdAt)}</span>
                                    </div>
                                  ) : isSenderTeacher ? (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-xs text-amber-950 tracking-tight">
                                        {displaySenderName}
                                      </span>
                                      <span className="px-2 py-0.2 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black border border-amber-500/60 shadow-2xs">
                                        Instructor
                                      </span>
                                      <span className="text-[10.5px] text-gray-400 font-mono font-medium">• {formatMessageTime(msg.createdAt)}</span>
                                    </div>
                                  ) : !isFromMe && isTeacherOrAdmin && msg.sender ? (
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const sid = typeof msg.sender === 'object' ? msg.sender._id : msg.sender;
                                          setInspectStudentId(sid);
                                        }}
                                        className="flex items-center gap-1 font-bold text-slate-800 bg-sky-50/90 hover:bg-sky-100 border border-sky-200/90 px-1.5 py-0.2 rounded-md shadow-2xs cursor-pointer transition-all duration-150 hover:scale-105"
                                        title="Click to view student profile and assigned courses"
                                      >
                                        <span className="font-extrabold text-xs text-slate-900 tracking-tight">{displaySenderName}</span>
                                        <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-900 text-[9.5px] font-black border border-sky-300 shadow-2xs">
                                          Student
                                        </span>
                                        <FaInfoCircle className="text-[9px] text-sky-500 ml-0.5" />
                                      </button>
                                      <span className="text-[10.5px] text-gray-400 font-mono font-medium">• {formatMessageTime(msg.createdAt)}</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-extrabold text-xs text-slate-900 tracking-tight">
                                        {displaySenderName}
                                      </span>
                                      <span className="px-2 py-0.2 rounded-md bg-sky-100 text-sky-900 text-[10px] font-black border border-sky-300 shadow-2xs">
                                        Student
                                      </span>
                                      <span className="text-[10.5px] text-gray-400 font-mono font-medium">• {formatMessageTime(msg.createdAt)}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Message Body: Direct WhatsApp Voice Note or Compact Bubble */}
                                {(() => {
                                  const audioAttachment = msg.attachments?.find(a => 
                                    a.category === 'audio' || 
                                    a.fileType?.startsWith('audio/') || 
                                    a.fileType === 'video/webm' || 
                                    a.fileType === 'video/ogg' ||
                                    (a.url && (a.url.endsWith('.webm') || a.url.endsWith('.ogg') || a.url.endsWith('.wav') || a.url.endsWith('.m4a') || a.url.endsWith('.mp3')))
                                  );
                                  const isVoiceText = msg.text && (msg.text.includes('Voice Question') || msg.text.includes('Voice Response'));
                                  const audioSrc = audioAttachment?.url || (msg.attachments?.[0]?.url) || '';

                                  if ((audioAttachment || isVoiceText) && audioSrc) {
                                    return (
                                      <div className="my-1">
                                        <AudioMessagePlayer
                                          src={audioSrc}
                                          duration={audioAttachment?.duration || 10}
                                          isFromMe={isFromMe}
                                          isBroadcast={Boolean(msg.isBroadcast)}
                                          role={msg.isBroadcast ? 'broadcast' : msgRole}
                                          audioId={audioSrc}
                                        />
                                      </div>
                                    );
                                  }

                                  // Proportional Standalone Animated Emoji (Clean Sticker, No Box/Border)
                                  const isEmojiOnly = isOnlyEmoji(msg.text) && (!msg.attachments || msg.attachments.length === 0);

                                  if (isEmojiOnly) {
                                    const appleCode = getEmojiAppleCode(msg.text);

                                    return (
                                      <div className={`py-1 px-1 select-none transition-all duration-200 transform hover:scale-120 active:scale-95 cursor-pointer flex items-center ${isFromMe ? 'justify-end' : 'justify-start'} ${getEmojiCustomAnimation(msg.text)}`}>
                                        {appleCode ? (
                                          <img
                                            src={getHighResEmojiUrl(appleCode)}
                                            alt={msg.text}
                                            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain drop-shadow-md select-none will-change-transform filter"
                                            onError={(e) => {
                                              if (!e.currentTarget.dataset.retried) {
                                                e.currentTarget.dataset.retried = 'true';
                                                e.currentTarget.src = getStandardEmojiUrl(appleCode);
                                              } else {
                                                e.currentTarget.style.display = 'none';
                                                if (e.currentTarget.nextSibling) {
                                                  e.currentTarget.nextSibling.style.display = 'inline';
                                                }
                                              }
                                            }}
                                          />
                                        ) : null}
                                        <span className={`${appleCode ? 'hidden' : 'inline'} text-4xl sm:text-5xl md:text-6xl drop-shadow-md select-none leading-none`}>
                                          {msg.text}
                                        </span>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className={`${isFullscreen ? 'px-3 py-2 rounded-2xl text-[12.5px] sm:text-[13px]' : 'px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-[13.5px] sm:text-[14px]'} leading-relaxed tracking-normal shadow-md space-y-1.5 transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg ${
                                      msgRole === 'admin'
                                        ? `bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white font-bold shadow-purple-950/25 border border-purple-400/40 ${isFromMe ? 'rounded-tr-xs' : 'rounded-tl-xs'}`
                                        : msgRole === 'teacher'
                                          ? `bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-bold shadow-amber-950/20 border border-amber-400/80 ${isFromMe ? 'rounded-tr-xs' : 'rounded-tl-xs'}`
                                          : `bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white font-bold shadow-sky-950/25 border border-sky-300/50 ${isFromMe ? 'rounded-tr-xs' : 'rounded-tl-xs'}`
                                    }`}>
                                      {msg.text && <p className="whitespace-pre-wrap break-words font-sans font-semibold text-inherit">{msg.text}</p>}

                                        {/* Render Other Attachments (Images, Documents) */}
                                        {msg.attachments?.map((att, aIdx) => (
                                          <div key={aIdx} className="pt-0.5">
                                            {att.category === 'image' || att.fileType?.startsWith('image/') ? (
                                              <img
                                                src={getFullAttachmentUrl(att.url)}
                                                alt=""
                                                onClick={() => setPreviewImageModal(getFullAttachmentUrl(att.url))}
                                                className={`${isFullscreen ? 'max-h-44 sm:max-h-52' : 'max-h-56 sm:max-h-72'} rounded-xl object-contain border border-white/20 shadow-sm cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-lg`}
                                              />
                                            ) : (
                                              <DocumentMessageCard
                                                attachment={att}
                                                isFromMe={isFromMe}
                                                isSenderAdmin={isSenderAdmin}
                                                isSenderTeacher={isSenderTeacher}
                                              />
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })
              )
            )}
            <div ref={messagesEndRef} className="h-0.5 shrink-0" />
          </div>

          {/* Floating Jump-to-Bottom Pill Button (Positioned Cleanly Above Quick Chips & Input Bar) */}
          {showMainScrollDown && (
            <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  setShowMainScrollDown(false);
                  isMainNearBottomRef.current = true;
                  scrollToBottom(true);
                }}
                className="pointer-events-auto px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-xs shadow-xl shadow-purple-950/40 backdrop-blur-md flex items-center gap-1.5 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer border border-purple-300/50"
                title="Scroll down to latest messages"
              >
                <FaChevronDown className="text-xs animate-bounce" />
                <span>Latest Messages</span>
              </button>
            </div>
          )}

          {/* WhatsApp-Style High-Quality Emoji Tray (Centered with Auto-Send & Instant Micro-Animations) */}
          {showEmojiPicker && (
            <div className="w-full px-2 py-2.5 bg-gradient-to-r from-purple-50/80 via-white to-purple-50/80 border-b border-purple-100 flex items-center justify-center overflow-x-auto no-scrollbar animate-in slide-in-from-bottom-2 shadow-inner">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 mx-auto flex-nowrap shrink-0">
                {QUICK_EMOJIS.map((item, eIdx) => (
                  <button
                    key={eIdx}
                    type="button"
                    onClick={() => handleAutoSendEmoji(item)}
                    className="p-1 sm:p-1.5 rounded-xl hover:bg-purple-100/70 hover:shadow-xs transition-all duration-200 transform hover:scale-130 hover:-translate-y-1 active:scale-90 cursor-pointer shrink-0 flex items-center justify-center group"
                    title={`Click to send ${item.name} (${item.emoji})`}
                  >
                    <img
                      src={getHighResEmojiUrl(item.code)}
                      alt={item.emoji}
                      className="w-5.5 h-5.5 sm:w-6 sm:h-6 object-contain pointer-events-none drop-shadow-2xs group-hover:drop-shadow-md select-none will-change-transform"
                      onError={(e) => {
                        if (!e.currentTarget.dataset.retried) {
                          e.currentTarget.dataset.retried = 'true';
                          e.currentTarget.src = getStandardEmojiUrl(item.code);
                        } else {
                          e.currentTarget.style.display = 'none';
                          if (e.currentTarget.nextSibling) {
                            e.currentTarget.nextSibling.style.display = 'inline';
                          }
                        }
                      }}
                    />
                    <span className="hidden text-xl select-none leading-none">
                      {item.emoji}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Attachment Preview Chip */}
          {(attachedFile || capturedPhoto) && (
            <div className="px-4 py-2 bg-purple-50 border-b border-purple-200 flex items-center justify-between text-xs animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                {capturedPhoto ? (
                  <img src={capturedPhoto} alt="" className="w-8 h-8 rounded-lg object-cover border border-purple-300" />
                ) : (
                  <FaFileAlt className="text-purple-700 text-base" />
                )}
                <span className="font-bold text-purple-950 truncate">
                  {capturedPhoto ? "Camera Snapshot attached" : attachedFile?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedFile(null);
                  setCapturedPhoto(null);
                }}
                className="text-red-500 hover:text-red-700 p-1 font-bold cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>
          )}

          {/* Message Input / Inline Voice Recorder Area */}
          {isVoiceRecording ? (
            /* 1. Live Recording State (Vibrant Red Theme with Clean, Crisp Typography) */
            <div className="p-3 sm:p-3.5 bg-gradient-to-r from-red-50/95 via-rose-50/70 to-red-50/90 border-t-2 border-red-200 flex items-center justify-between gap-3 animate-fadeIn shrink-0 select-auto">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex items-center justify-center shrink-0">
                  <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-70"></span>
                  <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center text-sm shadow-md ring-2 ring-red-200">
                    <FaMicrophone className="animate-pulse text-xs sm:text-sm" />
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sans text-sm sm:text-base font-black text-red-600 tracking-tight">
                      {formatVoiceTime(voiceDuration)}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 bg-red-100/90 border border-red-200 px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1 font-sans">
                      <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse inline-block"></span>
                      {isStudent ? "Recording Question" : selectedStudentId === 'staff' ? "Recording Staff Note" : selectedStudentId ? "Recording Voice Reply" : "Recording Announcement"}
                    </span>
                  </div>
                  <p className="text-[11px] text-red-900 font-medium font-sans">
                    {isStudent 
                      ? "Direct private question to Teacher" 
                      : selectedStudentId === 'staff' 
                        ? "Private voice note to admin" 
                        : selectedStudentId 
                          ? `Private voice reply to ${selectedThreadStudent?.studentName || 'Student'}` 
                          : "Live voice broadcast to entire class"}
                  </p>
                </div>
              </div>

              {/* Action buttons during live recording */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Cancel */}
                <button
                  type="button"
                  onClick={cancelVoiceRecording}
                  className="px-3 py-1.5 rounded-xl text-gray-700 bg-white hover:bg-gray-100 font-bold text-xs sm:text-sm border border-gray-300 shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95 font-sans"
                  title="Discard recording"
                >
                  <FaTimes className="text-xs" />
                  <span>Cancel</span>
                </button>

                {/* Stop & Review */}
                <button
                  type="button"
                  onClick={stopVoiceRecording}
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 ring-2 ring-red-300/40 font-sans"
                  title="Stop recording"
                >
                  <FaStop className="text-xs" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          ) : voiceBlob ? (
            /* 2. Review & Send Recorded Voice Note State (Vibrant Red Theme) */
            <div className="p-3 sm:p-3.5 bg-gradient-to-r from-red-50/95 via-rose-50/70 to-red-50/90 border-t-2 border-red-200 flex flex-col gap-2 animate-fadeIn shrink-0 select-auto">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={toggleVoicePreview}
                    className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white flex items-center justify-center text-xs shadow-md shadow-red-950/20 transition cursor-pointer shrink-0 active:scale-95 ring-2 ring-red-200"
                    title={isPlayingVoicePreview ? "Pause Preview" : "Play Preview"}
                  >
                    {isPlayingVoicePreview ? <FaPause className="text-xs" /> : <FaPlay className="text-xs pl-0.5" />}
                  </button>
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-black text-red-950 font-sans">🎙️ Voice Note Ready</p>
                    <p className="text-[11px] text-red-600 font-sans font-extrabold">
                      {formatVoiceTime(voiceDuration)} • {isStudent ? "Private Question to Teacher" : selectedStudentId === 'staff' ? "Staff Voice Note" : selectedStudentId ? "Private Voice Reply" : "Live Class Broadcast"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Re-record */}
                  <button
                    type="button"
                    onClick={restartVoiceRecording}
                    className="p-2 rounded-xl text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 shadow-2xs transition cursor-pointer active:scale-95"
                    title="Delete & record again"
                  >
                    <FaRedo className="text-xs" />
                  </button>

                  {/* Discard */}
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="p-2 rounded-xl text-red-600 bg-white hover:bg-red-50 border border-red-200 shadow-2xs transition cursor-pointer active:scale-95"
                    title="Discard voice note"
                  >
                    <FaTrash className="text-xs" />
                  </button>

                  {/* Send Button */}
                  <button
                    type="button"
                    onClick={sendRecordedVoice}
                    disabled={isSendingVoice}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ring-2 ring-red-400/40 font-sans"
                  >
                    <FaPaperPlane className={`text-xs ${isSendingVoice ? 'animate-bounce' : ''}`} />
                    <span>{isSendingVoice ? "Sending..." : "Send Voice"}</span>
                  </button>
                </div>
              </div>

              {/* Mini Audio Playback Progress Bar */}
              <div className="w-full bg-red-100 rounded-full h-1 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-red-600 to-rose-600 h-full transition-all duration-100 rounded-full" 
                  style={{ width: `${voicePreviewProgress}%` }}
                />
              </div>
            </div>
          ) : (
            /* 3. Normal Message Input Bar - Spacious, Clear, Unified with Quick Chips */
            <form 
              onSubmit={handleSendMessage}
              className="p-3 sm:p-3.5 bg-white border-t border-gray-200/80 select-auto shrink-0 space-y-2.5 transition-all"
            >
              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*,.pdf,.doc,.docx,.txt"
                className="hidden"
              />

              {/* Seamless Integrated Quick Suggestion Chips Shelf */}
              {/* 1. Student Quick Questions Chips */}
              {isStudent && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fadeIn pb-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-sky-950 shrink-0 select-none bg-sky-100/90 border border-sky-300/80 px-2.5 py-1 rounded-xl shadow-2xs">
                    <FaBolt className="text-amber-500 text-xs animate-pulse" />
                    <span className="tracking-tight whitespace-nowrap">Tap to Ask</span>
                  </div>
                  {[
                    "Can you please repeat that point?",
                    "Could you explain the formula again?",
                    "Understood clearly, thank you!",
                    "Which textbook page are we on?",
                    "Could you show the previous slide?",
                    "Can you explain with an example?",
                    "Could you please slow down a bit?",
                    "Is this important for the exam?"
                  ].map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(chip)}
                      className="px-3 py-1 rounded-xl bg-sky-50/90 hover:bg-sky-100 text-[11px] sm:text-xs text-sky-950 font-bold border border-sky-200 shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] shrink-0 cursor-pointer active:scale-95 hover:border-sky-300 whitespace-nowrap"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* 2. Class Broadcast Quick Announcement Tips (Admin vs Teacher) */}
              {isTeacherOrAdmin && !selectedStudentId && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fadeIn pb-0.5">
                  <div className={`flex items-center gap-1.5 text-[11px] font-black shrink-0 select-none px-2.5 py-1 rounded-xl shadow-2xs border ${
                    isUserAdmin 
                      ? 'text-purple-950 bg-purple-100/90 border-purple-300/80' 
                      : 'text-emerald-950 bg-emerald-100/90 border-emerald-300/80'
                  }`}>
                    {isUserAdmin ? (
                      <>
                        <FaShieldAlt className="text-purple-700 text-xs" />
                        <span className="tracking-tight whitespace-nowrap">Admin Announcements</span>
                      </>
                    ) : (
                      <>
                        <FaBullhorn className="text-emerald-700 text-xs" />
                        <span className="tracking-tight whitespace-nowrap">Broadcast Tips</span>
                      </>
                    )}
                  </div>
                  {(isUserAdmin ? [
                    "📢 Technical support is monitoring this live stream.",
                    "⚠️ Please keep chat comments respectful and on-topic.",
                    "🔄 If experiencing lag or buffering, please refresh the page.",
                    "📼 Session recording will be available shortly after class.",
                    "📊 Attendance is being verified for active participants.",
                    "ℹ️ Please contact support desk for any technical issues.",
                    "⏰ Stream is scheduled to conclude on time."
                  ] : [
                    "🚀 Welcome everyone! Today's lecture session is now live.",
                    "📝 Take note of this key concept for upcoming exams!",
                    "📖 Please open your textbook / note to today's topic.",
                    "⏱️ 5-minute quick break. Resuming shortly.",
                    "❓ Feel free to send your questions in the live chat.",
                    "📊 Please attempt the question on screen now.",
                    "🔇 Please keep microphones muted unless called upon.",
                    "📋 Handout & materials are attached in course materials.",
                    "👏 Excellent participation today, keep it up!",
                    "⏰ Lecture will conclude in 5 minutes."
                  ]).map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(chip)}
                      className={`px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold border shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] shrink-0 cursor-pointer active:scale-95 whitespace-nowrap ${
                        isUserAdmin
                          ? 'bg-purple-50/90 hover:bg-purple-100 text-purple-950 border-purple-200 hover:border-purple-300'
                          : 'bg-emerald-50/90 hover:bg-emerald-100 text-emerald-950 border-emerald-200 hover:border-emerald-300'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* 3. Teacher/Admin Staff Channel Quick Messages */}
              {isTeacherOrAdmin && selectedStudentId === 'staff' && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fadeIn pb-0.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-indigo-950 shrink-0 select-none bg-indigo-100/90 border border-indigo-300/80 px-2.5 py-1 rounded-xl shadow-2xs">
                    <FaShieldAlt className="text-indigo-700 text-xs" />
                    <span className="tracking-tight whitespace-nowrap">Staff Quick Notes</span>
                  </div>
                  {(isUserAdmin ? [
                    "✅ Video feed & audio bitrate are optimal.",
                    "⚠️ Monitoring student connectivity & bandwidth.",
                    "⏱️ Lecture stream extended successfully.",
                    "📼 Cloud recording is active and saving.",
                    "🔒 Chat moderation & permissions are active.",
                    "📢 Broadcast announcement sent to all students."
                  ] : [
                    "✅ Class is progressing smoothly.",
                    "⚠️ A student reported an audio/mic issue, please check.",
                    "⏱️ Extending lecture session by 10 minutes.",
                    "🎙️ Mic and presentation audio verified.",
                    "📋 Please upload today's lecture slide PDF after class.",
                    "📊 Ready to launch the in-class poll/quiz.",
                    "🔒 Please moderate chat for spam/distractions.",
                    "📼 Please make sure cloud recording is running."
                  ]).map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(chip)}
                      className="px-3 py-1 rounded-xl bg-indigo-50/90 hover:bg-indigo-100 text-[11px] sm:text-xs text-indigo-950 font-bold border border-indigo-200 shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] shrink-0 cursor-pointer active:scale-95 hover:border-indigo-300 whitespace-nowrap"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {/* 4. Teacher/Admin Quick Student Replies (Admin vs Teacher) */}
              {isTeacherOrAdmin && selectedStudentId && selectedStudentId !== 'staff' && (
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] animate-fadeIn pb-0.5">
                  <div className={`flex items-center gap-1.5 text-[11px] font-black shrink-0 select-none px-2.5 py-1 rounded-xl shadow-2xs border ${
                    isUserAdmin
                      ? 'text-purple-950 bg-purple-100/90 border-purple-300/80'
                      : 'text-amber-950 bg-amber-100/90 border-amber-300/80'
                  }`}>
                    {isUserAdmin ? (
                      <>
                        <FaShieldAlt className="text-purple-700 text-xs" />
                        <span className="tracking-tight whitespace-nowrap">Admin Support Reply</span>
                      </>
                    ) : (
                      <>
                        <FaLightbulb className="text-amber-500 text-xs" />
                        <span className="tracking-tight whitespace-nowrap">Teacher Quick Reply</span>
                      </>
                    )}
                  </div>
                  {(isUserAdmin ? [
                    "Technical support is here to assist you.",
                    "Please refresh your browser (Ctrl + F5) to reload the feed.",
                    "Your attendance has been recorded successfully.",
                    "Course materials have been unlocked on your dashboard.",
                    "We have notified your instructor regarding this issue.",
                    "Please contact the help desk if the problem persists."
                  ] : [
                    "✅ Correct answer! Well done.",
                    "💡 Take a look at the previous slide.",
                    "📝 Please check the formula in your lecture notes.",
                    "🎯 Great question! I'm explaining this on screen now.",
                    "⏳ Try solving step 2 first, then check your answer.",
                    "🔍 Re-check your calculation for the final step.",
                    "📚 Please refer to Page 45 in the workbook.",
                    "🗣️ I will review this with you in detail at the end of class.",
                    "👍 Yes, exactly! Keep going.",
                    "❓ Which specific step is unclear?"
                  ]).map((chip, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputText(chip)}
                      className={`px-3 py-1 rounded-xl text-[11px] sm:text-xs font-bold border shadow-2xs hover:shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.02] shrink-0 cursor-pointer active:scale-95 whitespace-nowrap ${
                        isUserAdmin
                          ? 'bg-purple-50/90 hover:bg-purple-100 text-purple-950 border-purple-200 hover:border-purple-300'
                          : 'bg-amber-50/90 hover:bg-amber-100 text-amber-950 border-amber-200 hover:border-amber-300'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              {isFullscreen ? (
                /* Fullscreen Sidebar Mode: 2-Row Layout */
                <div className="flex flex-col gap-2.5">
                  {/* Top Row: Input field + Send button */}
                  <div className="flex items-end gap-2.5">
                    <div className="flex-1 min-w-0 bg-slate-50 hover:bg-slate-50/90 focus-within:bg-white rounded-2xl sm:rounded-3xl border border-gray-300 focus-within:border-purple-600 focus-within:ring-4 focus-within:ring-purple-100 transition-all shadow-2xs px-3.5 py-2 flex items-center gap-2">
                      <div className="shrink-0 select-none">
                        {isStudent ? (
                          <FaLock className="text-purple-600 text-xs" />
                        ) : selectedStudentId === 'staff' ? (
                          <FaShieldAlt className="text-indigo-600 text-xs" />
                        ) : selectedStudentId ? (
                          <FaLock className="text-purple-600 text-xs" />
                        ) : (
                          <FaBullhorn className="text-emerald-600 text-xs" />
                        )}
                      </div>
                      <textarea
                        rows={1}
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={
                          isStudent 
                            ? "Ask a question or type a message..." 
                            : selectedStudentId === 'staff'
                              ? "Type private message to Admin / Teacher..."
                              : selectedStudentId
                                ? `Type reply to ${selectedThreadStudent?.studentName || 'Student'}...`
                                : "Type announcement to broadcast to all students..."
                        }
                        className="w-full bg-transparent text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none font-medium resize-none leading-relaxed max-h-28 py-0.5 block"
                      />
                    </div>

                    {/* Send Button */}
                    <button
                      type="submit"
                      disabled={(!inputText.trim() && !attachedFile && !capturedPhoto) || isSending}
                      className={`h-9.5 sm:h-10 px-4 sm:px-4.5 rounded-xl sm:rounded-2xl text-white font-bold text-xs sm:text-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer flex items-center justify-center gap-1.5 active:scale-95 shrink-0 ${
                        selectedStudentId === 'staff'
                          ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-950/20'
                          : isTeacherOrAdmin && !selectedStudentId
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-950/20'
                            : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 shadow-purple-950/20'
                      }`}
                    >
                      <FaPaperPlane className={`text-xs ${isSending ? 'animate-bounce' : ''}`} />
                      <span>{isTeacherOrAdmin ? (selectedStudentId === 'staff' ? 'Send Staff' : !selectedStudentId ? 'Broadcast' : 'Reply') : 'Send'}</span>
                    </button>
                  </div>

                  {/* Bottom Row: Tool buttons (Emoji, Camera, Attachment, Mic) & Status Label */}
                  <div className="flex items-center justify-between gap-1 pt-0.5">
                    <div className="flex items-center gap-1.5">
                      {/* Emoji Button */}
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:shadow-xs cursor-pointer flex items-center justify-center ${
                        showEmojiPicker ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-2xs' : 'bg-gray-100/90 hover:bg-amber-50 text-gray-600 hover:text-amber-600 border border-gray-200'
                        }`}
                        title="Insert Emoji"
                      >
                        <FaSmile className="text-sm text-amber-500" />
                      </button>

                      {/* Camera Button */}
                      <button
                        type="button"
                        onClick={() => setShowCameraModal(true)}
                        className="p-1.5 sm:p-2 rounded-xl bg-gray-100/90 hover:bg-purple-50 text-purple-700 border border-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:shadow-xs cursor-pointer flex items-center justify-center"
                        title="Take Photo with Camera"
                      >
                        <FaCamera className="text-sm text-purple-700" />
                      </button>

                      {/* Attachment Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 sm:p-2 rounded-xl bg-gray-100/90 hover:bg-blue-50 text-indigo-700 border border-gray-200 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:shadow-xs cursor-pointer flex items-center justify-center"
                        title="Upload Image or Document (PDF/DOC)"
                      >
                        <FaPaperclip className="text-sm text-indigo-700" />
                      </button>

                      {/* Mic Voice Note Button (Starts in-chat voice recording) */}
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="p-1.5 sm:p-2 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-200 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 hover:shadow-xs cursor-pointer flex items-center justify-center active:scale-95 shadow-2xs"
                        title="Record & Send Voice Question"
                      >
                        <FaMicrophone className="text-sm text-purple-800" />
                      </button>
                    </div>

                    <span className="text-[11px] font-bold text-gray-500 truncate">
                      {isStudent ? "🔒 Private to Teacher" : selectedStudentId === 'staff' ? "🛡️ Staff Channel" : "📢 Live Class Chat"}
                    </span>
                  </div>
                </div>
              ) : (
                /* Outside Fullscreen Normal Mode: Sleek, Slightly Taller Capsule */
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 bg-slate-50/90 hover:bg-slate-50 focus-within:bg-white rounded-2xl sm:rounded-3xl border border-gray-300/90 focus-within:border-purple-600 focus-within:ring-3 focus-within:ring-purple-100 transition-all duration-200 px-3.5 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2.5 shadow-2xs hover:shadow-xs hover:border-gray-400">
                    <div className="shrink-0 select-none">
                      {isStudent ? (
                        <FaLock className="text-purple-600 text-xs sm:text-sm" />
                      ) : selectedStudentId === 'staff' ? (
                        <FaShieldAlt className="text-indigo-600 text-xs sm:text-sm" />
                      ) : selectedStudentId ? (
                        <FaLock className="text-purple-600 text-xs sm:text-sm" />
                      ) : (
                        <FaBullhorn className="text-emerald-600 text-xs sm:text-sm" />
                      )}
                    </div>
                    <textarea
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={
                        isStudent 
                          ? "Ask a question or type a message..." 
                          : selectedStudentId === 'staff'
                            ? "Type private message to Admin / Teacher..."
                            : selectedStudentId
                              ? `Type reply to ${selectedThreadStudent?.studentName || 'Student'}...`
                              : "Type announcement to broadcast to all students..."
                      }
                      className="flex-1 min-w-0 bg-transparent text-xs sm:text-sm text-gray-900 placeholder:text-gray-400 outline-none font-medium resize-none leading-relaxed max-h-24 py-0.5 block"
                    />

                    {/* Right Corner Action Icons Inside Capsule */}
                    <div className="flex items-center gap-1.5 shrink-0 border-l border-gray-200/90 pl-2.5">
                      {/* Emoji Button */}
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className={`p-1.5 sm:p-2 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-2xs cursor-pointer flex items-center justify-center ${
                          showEmojiPicker ? 'bg-amber-100 text-amber-800' : 'hover:bg-amber-50 text-gray-500 hover:text-amber-600'
                        }`}
                        title="Insert Emoji"
                      >
                        <FaSmile className="text-lg text-amber-500" />
                      </button>

                      {/* Camera Button */}
                      <button
                        type="button"
                        onClick={() => setShowCameraModal(true)}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-purple-50 text-gray-500 hover:text-purple-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-2xs cursor-pointer flex items-center justify-center"
                        title="Take Photo with Camera"
                      >
                        <FaCamera className="text-lg" />
                      </button>

                      {/* Attachment Button */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-blue-50 text-gray-500 hover:text-indigo-700 transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-2xs cursor-pointer flex items-center justify-center"
                        title="Upload Image or Document (PDF/DOC)"
                      >
                        <FaPaperclip className="text-lg" />
                      </button>

                      {/* Mic Voice Note Button */}
                      <button
                        type="button"
                        onClick={startVoiceRecording}
                        className="p-1.5 sm:p-2 rounded-xl hover:bg-purple-100 text-purple-700 hover:text-purple-900 transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-2xs cursor-pointer flex items-center justify-center active:scale-95"
                        title="Record & Send Voice Question"
                      >
                        <FaMicrophone className="text-lg text-purple-700" />
                      </button>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile && !capturedPhoto) || isSending}
                    className={`h-11 sm:h-12 px-5 sm:px-6 rounded-2xl sm:rounded-3xl text-white font-extrabold text-xs sm:text-sm transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none cursor-pointer flex items-center gap-2 active:scale-95 shrink-0 ${
                      selectedStudentId === 'staff'
                        ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-700 shadow-indigo-950/20'
                        : isTeacherOrAdmin && !selectedStudentId
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-950/20'
                          : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 shadow-purple-950/20'
                    }`}
                  >
                    <FaPaperPlane className={`text-xs sm:text-sm ${isSending ? 'animate-bounce' : ''}`} />
                    <span>{isTeacherOrAdmin ? (selectedStudentId === 'staff' ? 'Send Staff' : !selectedStudentId ? 'Broadcast' : 'Reply') : 'Send'}</span>
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      )}

      {/* 5. Floating Dedicated Chat Window Modal for Teacher/Admin (Student Chat & Staff Chat) */}
      {isTeacherOrAdmin && selectedStudentId && (
        <div 
          className={`absolute inset-0 z-40 flex items-center justify-center ${isFullscreen ? 'p-1.5 sm:p-2' : 'p-2.5 sm:p-4'} bg-slate-950/60 backdrop-blur-xs animate-fadeIn select-none overflow-hidden`}
          onClick={() => {
            setSelectedStudentId(null);
            setSendMode('broadcast');
          }}
        >
          <div 
            className={`relative w-full ${isFullscreen ? 'max-w-full h-full rounded-2xl' : 'max-w-xl sm:max-w-2xl h-[94%] max-h-[670px] rounded-3xl'} bg-white border border-gray-200/90 shadow-2xl text-gray-900 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`flex items-center justify-between ${isFullscreen ? 'px-3 py-2.5 bg-gray-50/95' : 'px-4 py-3 sm:px-5 sm:py-3.5 bg-gray-50/90'} border-b border-gray-100 shrink-0`}>
              {selectedStudentId === 'staff' ? (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className={`${isFullscreen ? 'w-9 h-9 text-sm rounded-xl' : 'w-11 h-11 sm:w-12 sm:h-12 rounded-2xl text-base sm:text-lg'} bg-gradient-to-tr from-purple-700 to-indigo-700 text-white flex items-center justify-center shadow-md ring-2 ring-purple-200/80 shrink-0`}>
                    <FaShieldAlt />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className={`font-black ${isFullscreen ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} text-purple-950 tracking-tight leading-tight truncate`}>
                      Admin ↔ Instructor Channel
                    </h4>
                    <span className="text-[10px] sm:text-[11px] text-purple-700 font-bold block truncate mt-0.5">
                      Private Internal Staff Messages
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold ${isFullscreen ? 'text-[10px]' : 'text-xs'} border border-purple-200 shrink-0 shadow-2xs`}>
                    Staff Only
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div 
                    onClick={() => setInspectStudentId(selectedThreadStudent?.studentId || selectedStudentId)}
                    className="cursor-pointer group flex items-center gap-2.5 min-w-0 flex-1"
                    title="Click to view student profile & assigned courses"
                  >
                    {selectedThreadStudent?.studentAvatar ? (
                      <img
                        src={getFullAttachmentUrl(selectedThreadStudent.studentAvatar)}
                        alt={selectedThreadStudent.studentName}
                        className={`${isFullscreen ? 'w-9 h-9' : 'w-11 h-11 sm:w-12 sm:h-12'} rounded-full object-cover border-2 border-sky-400 shadow-md ring-2 ring-sky-100/80 shrink-0 group-hover:scale-105 group-hover:border-sky-600 transition`}
                      />
                    ) : (
                      <div className={`${isFullscreen ? 'w-9 h-9 text-xs' : 'w-11 h-11 sm:w-12 sm:h-12 text-sm sm:text-base'} rounded-full bg-gradient-to-tr from-sky-600 to-blue-700 text-white font-black flex items-center justify-center border-2 border-sky-400 shadow-md ring-2 ring-sky-100/80 shrink-0 group-hover:scale-105 group-hover:border-sky-600 transition`}>
                        {(selectedThreadStudent?.studentName || 'S').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <h4 className={`font-black ${isFullscreen ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} text-gray-950 tracking-tight group-hover:text-sky-700 transition leading-tight truncate`}>
                          {selectedThreadStudent?.studentName || 'Student'}
                        </h4>
                        <FaInfoCircle className="text-xs text-sky-600 opacity-80 group-hover:opacity-100 shrink-0" />
                      </div>
                      {selectedThreadStudent?.studentGrade && (
                        <span className="text-[10px] sm:text-[11px] text-sky-800 font-bold block truncate mt-0.5">
                          {selectedThreadStudent.studentGrade}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full bg-sky-100 text-sky-900 font-extrabold ${isFullscreen ? 'text-[10px]' : 'text-xs'} border border-sky-200 flex items-center gap-1 shrink-0 shadow-2xs`}>
                    <FaLock className="text-[9px]" /> Private Chat
                  </span>
                </div>
              )}

              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentId(null);
                  setSendMode('broadcast');
                }}
                className={`${isFullscreen ? 'w-7 h-7' : 'w-8 h-8'} rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition cursor-pointer ml-2 shrink-0 shadow-2xs`}
                title="Close chat window"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>

            {/* Conversation Feed */}
            <div 
              ref={privateChatContainerRef}
              onScroll={handlePrivateScroll}
              className={`flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 pb-8 sm:px-6 sm:py-5 custom-scrollbar relative scroll-smooth overscroll-contain scrollbar-thin scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-400 ${
                selectedStudentId === 'staff' 
                  ? 'bg-gradient-to-b from-purple-50/40 via-white to-purple-50/20' 
                  : 'bg-gradient-to-b from-slate-50 via-sky-50/20 to-slate-50'
              }`}
            >
              <div className="w-full max-w-lg sm:max-w-xl mx-auto space-y-2.5 sm:space-y-3 flex flex-col">
                {(() => {
                  const getMongoId = (val) => {
                    if (!val) return '';
                    if (typeof val === 'string') return val;
                    if (typeof val === 'object') {
                      if (val._id) return String(val._id);
                      if (val.id && typeof val.id === 'string') return val.id;
                      return String(val);
                    }
                    return String(val);
                  };

                  const sId = String(selectedStudentId || '').trim();

                  const currentMessages = selectedStudentId === 'staff' 
                    ? staffMessages 
                    : messages.filter(m => {
                        if (m.isBroadcast || m.isStaffOnly) return false;
                        const ctxId = getMongoId(m.studentContext);
                        const senderId = getMongoId(m.sender);
                        const recipientId = getMongoId(m.recipient);
                        return ctxId === sId || senderId === sId || recipientId === sId;
                      });

                  if (currentMessages.length === 0) {
                    return (
                      <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-4 space-y-3 select-none">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-lg ${
                          selectedStudentId === 'staff' 
                            ? 'bg-gradient-to-tr from-purple-700 to-indigo-700 text-white shadow-purple-950/20 ring-4 ring-purple-100 border border-purple-300' 
                            : 'bg-gradient-to-tr from-sky-600 to-blue-700 text-white shadow-sky-950/20 ring-4 ring-sky-100 border border-sky-300'
                        }`}>
                          {selectedStudentId === 'staff' ? '🛡️' : '💬'}
                        </div>
                        <p className={`text-base font-black ${selectedStudentId === 'staff' ? 'text-purple-950' : 'text-gray-950'}`}>
                          {selectedStudentId === 'staff' ? "Admin ↔ Instructor Staff Channel" : `Private chat with ${selectedThreadStudent?.studentName || 'Student'}`}
                        </p>
                        <p className={`text-xs max-w-sm font-medium leading-relaxed ${selectedStudentId === 'staff' ? 'text-purple-800/80' : 'text-gray-500'}`}>
                          {selectedStudentId === 'staff' ? "Type your private notes or updates below to coordinate with the admin." : "Type your reply in the input below to assist this student in real-time."}
                        </p>
                      </div>
                    );
                  }

                  return currentMessages.map((msg, mIdx) => {
                    const isFromMe = getIsFromMe(msg);
                    const isEmojiOnly = isOnlyEmoji(msg.text) && (!msg.attachments || msg.attachments.length === 0);
                    const audioAttachment = msg.attachments?.find(a => 
                      a.category === 'audio' || 
                      a.fileType?.startsWith('audio/') || 
                      a.fileType === 'video/webm' || 
                      a.fileType === 'video/ogg' ||
                      (a.url && (a.url.endsWith('.webm') || a.url.endsWith('.ogg') || a.url.endsWith('.wav') || a.url.endsWith('.m4a') || a.url.endsWith('.mp3')))
                    );
                    const isVoiceText = msg.text && (msg.text.includes('Voice Question') || msg.text.includes('Voice Response') || msg.text.includes('Voice Note'));
                    const msgRole = getMessageTheme(msg, isFromMe, user?.role, isTeacherOrAdmin);
                    const isSenderAdmin = msgRole === 'admin';
                    const isSenderTeacher = msgRole === 'teacher';

                    const displaySenderName = isSenderTeacher
                      ? (msg.senderName && !msg.senderName.toLowerCase().includes('admin') ? msg.senderName : 'Chaminda Herath')
                      : isSenderAdmin
                        ? 'LuminaLearn Admin'
                        : (isFromMe ? (user?.name || msg.senderName) : msg.senderName);

                    return (
                      <div key={msg._id || mIdx} className={`flex items-start gap-3 sm:gap-3.5 ${isEmojiOnly ? 'my-1.5 sm:my-2' : 'my-2.5 sm:my-3'} max-w-[85%] sm:max-w-[78%] ${isFromMe ? 'flex-row-reverse ml-auto mr-0' : 'flex-row mr-auto ml-0'}`}>
                        <ChatAvatar
                          avatarSrc={
                            isSenderTeacher
                              ? '/assets/founder_photo.png'
                              : isSenderAdmin
                                ? '/assets/LuminaLearn_Logo_icon.png'
                                : (msg.senderAvatar || (typeof msg.sender === 'object' && msg.sender !== null ? (msg.sender.profilePicture || msg.sender.avatar) : '') || (isFromMe ? (user?.profilePicture || user?.avatar) : ''))
                          }
                          senderName={displaySenderName}
                          isSenderAdmin={isSenderAdmin}
                          isSenderTeacher={isSenderTeacher}
                        />

                        <div className={`flex flex-col ${isFromMe ? 'items-end' : 'items-start'} max-w-full overflow-hidden`}>
                          <div className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${isFromMe ? 'justify-end' : 'justify-start'}`}>
                            {isFromMe ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10.5px] text-gray-400 font-mono font-medium">
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                                <span className={`font-extrabold text-xs tracking-tight ${
                                  user?.role === 'admin' ? 'text-purple-950' : user?.role === 'teacher' || user?.role === 'instructor' ? 'text-amber-950' : 'text-sky-950'
                                }`}>
                                  You
                                </span>
                                {user?.role === 'admin' ? (
                                  <span className="px-2 py-0.2 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-300 shadow-2xs">
                                    Admin
                                  </span>
                                ) : user?.role === 'teacher' || user?.role === 'instructor' ? (
                                  <span className="px-2 py-0.2 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black border border-amber-500/60 shadow-2xs">
                                    Instructor
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.2 rounded-md bg-sky-100 text-sky-900 text-[10px] font-black border border-sky-200/90 shadow-2xs">
                                    Student
                                  </span>
                                )}
                              </div>
                            ) : isSenderAdmin ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs sm:text-[13px] text-purple-950 tracking-tight">
                                  {displaySenderName}
                                </span>
                                <span className="px-2 py-0.2 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black border border-purple-300 shadow-2xs">
                                  Admin
                                </span>
                                <span className="text-[10.5px] text-gray-400 font-mono font-medium">• {formatMessageTime(msg.createdAt)}</span>
                              </div>
                            ) : isSenderTeacher ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-extrabold text-xs sm:text-[13px] text-amber-950 tracking-tight">
                                  {displaySenderName}
                                </span>
                                <span className="px-2 py-0.2 rounded-md bg-amber-400 text-amber-950 text-[10px] font-black border border-amber-500/60 shadow-2xs">
                                  Instructor
                                </span>
                                <span className="text-[10.5px] text-gray-400 font-mono font-medium">• {formatMessageTime(msg.createdAt)}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className={`font-extrabold text-xs sm:text-[13px] tracking-tight ${selectedStudentId === 'staff' ? 'text-purple-950' : 'text-slate-900'}`}>
                                  {displaySenderName}
                                </span>
                                {selectedStudentId !== 'staff' && (
                                  <span className="px-2 py-0.2 rounded-md bg-sky-100 text-sky-900 text-[10px] font-black border border-sky-300 shadow-2xs">
                                    Student
                                  </span>
                                )}
                                <span className="text-[10.5px] text-gray-400 font-mono font-medium">• {formatMessageTime(msg.createdAt)}</span>
                              </div>
                            )}
                          </div>

                          {/* 1. If Voice Note: Standalone Role Themed Audio Player ONLY (No outer container) */}
                          {(audioAttachment || isVoiceText) && (audioAttachment?.url || msg.attachments?.[0]?.url) ? (
                            <div className="my-1">
                              <AudioMessagePlayer 
                                src={audioAttachment?.url || msg.attachments?.[0]?.url} 
                                duration={audioAttachment?.duration || 10} 
                                isFromMe={isFromMe} 
                                isBroadcast={Boolean(msg.isBroadcast)}
                                role={msg.isBroadcast ? 'broadcast' : msgRole}
                                audioId={audioAttachment?.url || msg.attachments?.[0]?.url}
                              />
                            </div>
                          ) : isEmojiOnly ? (
                            /* 2. Standalone Proportional Animated Emoji (Clean Sticker, No Box/Border) */
                            <div className={`py-1 px-1 select-none transition-all duration-200 transform hover:scale-120 active:scale-95 cursor-pointer flex items-center ${isFromMe ? 'justify-end' : 'justify-start'} ${getEmojiCustomAnimation(msg.text)}`}>
                              {getEmojiAppleCode(msg.text) ? (
                                <img 
                                  src={getHighResEmojiUrl(getEmojiAppleCode(msg.text))} 
                                  alt={msg.text} 
                                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain drop-shadow-md select-none will-change-transform filter" 
                                  onError={(e) => {
                                    if (!e.currentTarget.dataset.retried) {
                                      e.currentTarget.dataset.retried = 'true';
                                      e.currentTarget.src = getStandardEmojiUrl(getEmojiAppleCode(msg.text));
                                    } else {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextSibling) {
                                        e.currentTarget.nextSibling.style.display = 'inline';
                                      }
                                    }
                                  }}
                                />
                              ) : (
                                <span className="text-4xl sm:text-5xl md:text-6xl drop-shadow-md leading-none select-none inline-block">{msg.text}</span>
                              )}
                            </div>
                          ) : (
                            /* 3. Text Message Bubble with Professional Theme Styling & Micro-Interaction */
                            <div className={`${isFullscreen ? 'px-3 py-2 rounded-2xl text-[12.5px] sm:text-[13px]' : 'px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl text-[13.5px] sm:text-[14px]'} leading-relaxed tracking-normal shadow-md space-y-1.5 max-w-full overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-lg cursor-default ${
                              msgRole === 'admin'
                                ? `bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white font-bold shadow-purple-950/25 border border-purple-400/40 ${isFromMe ? 'rounded-tr-xs' : 'rounded-tl-xs'}`
                                : msgRole === 'teacher'
                                  ? `bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-bold shadow-amber-950/20 border border-amber-400/80 ${isFromMe ? 'rounded-tr-xs' : 'rounded-tl-xs'}`
                                  : `bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 text-white font-bold shadow-sky-950/25 border border-sky-300/50 ${isFromMe ? 'rounded-tr-xs' : 'rounded-tl-xs'}`
                            }`}>
                              {msg.text && <p className="whitespace-pre-wrap break-words tracking-wide leading-relaxed font-sans font-semibold text-inherit">{msg.text}</p>}
                              
                              {/* Non-audio attachments */}
                              {msg.attachments?.filter(att => att.category !== 'audio' && !att.fileType?.startsWith('audio/')).map((att, aIdx) => (
                                <div key={aIdx} className="pt-0.5 max-w-full overflow-hidden">
                                  {att.category === 'image' || att.fileType?.startsWith('image/') ? (
                                    <img 
                                      src={getFullAttachmentUrl(att.url)} 
                                      alt="" 
                                      onClick={() => setPreviewImageModal(getFullAttachmentUrl(att.url))} 
                                      className={`${isFullscreen ? 'max-h-44 sm:max-h-52' : 'max-h-56 sm:max-h-72'} max-w-full rounded-xl object-contain border border-white/20 shadow-sm cursor-pointer hover:scale-[1.01] transition block`} 
                                    />
                                  ) : (
                                    <DocumentMessageCard
                                      attachment={att}
                                      isFromMe={isFromMe}
                                      isSenderAdmin={isSenderAdmin}
                                      isSenderTeacher={isSenderTeacher}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  });
                })()}
                <div ref={privateMessagesEndRef} className="h-0.5 shrink-0" />
              </div>
            </div>

            {/* Floating Jump-to-Bottom Pill Button in Drawer (Pinned Above Quick Chips & Input Bar) */}
            {showPrivateScrollDown && (
              <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-fadeIn">
                <button
                  type="button"
                  onClick={() => {
                    setShowPrivateScrollDown(false);
                    isPrivateNearBottomRef.current = true;
                    scrollToBottom(true);
                  }}
                  className="pointer-events-auto px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-900 text-white font-extrabold text-xs shadow-xl shadow-purple-950/40 backdrop-blur-md flex items-center gap-1.5 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer border border-purple-300/50"
                  title="Scroll down to latest messages"
                >
                  <FaChevronDown className="text-xs animate-bounce" />
                  <span>Latest Messages</span>
                </button>
              </div>
            )}

            {/* Quick Suggestion Chips Shelf with Pop-Up Micro-Interactions */}
            <div className={`${isFullscreen ? 'px-2.5 py-1.5 gap-1.5' : 'px-4 py-2.5 gap-2'} bg-gradient-to-r from-slate-50 via-purple-50/30 to-slate-50 border-t border-gray-100 flex items-center overflow-x-auto no-scrollbar shrink-0`}>
              {(isUserAdmin ? (
                selectedStudentId === 'staff' ? [
                  "✅ Video feed & audio bitrate are optimal.",
                  "⚠️ Monitoring student connectivity & bandwidth.",
                  "⏱️ Lecture stream extended successfully.",
                  "📼 Cloud recording is active and saving.",
                  "🔒 Chat moderation & permissions are active.",
                  "📢 Broadcast announcement sent to all students."
                ] : [
                  "Technical support is here to assist you.",
                  "Please refresh your browser (Ctrl + F5) to reload the feed.",
                  "Your attendance has been recorded successfully.",
                  "Course materials have been unlocked on your dashboard.",
                  "We have notified your instructor regarding this issue.",
                  "Please contact the help desk if the problem persists."
                ]
              ) : (
                selectedStudentId === 'staff' ? [
                  "✅ Class is progressing smoothly.",
                  "⚠️ A student reported an audio/mic issue, please check.",
                  "⏱️ Extending lecture session by 10 minutes.",
                  "🎙️ Mic and presentation audio verified.",
                  "📋 Please upload today's lecture slide PDF after class.",
                  "📊 Ready to launch the in-class poll/quiz.",
                  "🔒 Please moderate chat for spam/distractions.",
                  "📼 Please make sure cloud recording is running."
                ] : [
                  "✅ Correct answer! Well done.",
                  "💡 Take a look at the previous slide.",
                  "📝 Please check the formula in your lecture notes.",
                  "🎯 Great question! I'm explaining this on screen now.",
                  "⏳ Try solving step 2 first, then check your answer.",
                  "🔍 Re-check your calculation for the final step.",
                  "📚 Please refer to Page 45 in the workbook.",
                  "🗣️ I will review this with you in detail at the end of class.",
                  "👍 Yes, exactly! Keep going.",
                  "❓ Which specific step is unclear?"
                ]
              )).map((chip, cIdx) => (
                <button
                  key={cIdx}
                  type="button"
                  onClick={() => setInputText(chip)}
                  title={`Click to quickly use: "${chip}"`}
                  className={`${isFullscreen ? 'px-2.5 py-1 text-[10.5px] rounded-lg' : 'px-3.5 py-1.5 text-xs rounded-xl'} font-bold border shadow-2xs hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 shrink-0 whitespace-nowrap cursor-pointer ${
                    isUserAdmin
                      ? 'bg-white hover:bg-purple-50 hover:border-purple-300 text-gray-800 hover:text-purple-950 border-gray-200/90'
                      : 'bg-white hover:bg-amber-50 hover:border-amber-300 text-gray-800 hover:text-amber-950 border-gray-200/90'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Attachment Preview Chip */}
            {(attachedFile || capturedPhoto) && (
              <div className="px-4 py-2 bg-purple-50 border-t border-purple-200 flex items-center justify-between text-xs animate-fadeIn shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  {capturedPhoto ? (
                    <img src={capturedPhoto} alt="" className="w-8 h-8 rounded-lg object-cover border border-purple-300 shadow-2xs" />
                  ) : (
                    <FaFileAlt className="text-purple-700" />
                  )}
                  <span className="font-bold text-purple-950 truncate text-xs">
                    {capturedPhoto ? "Camera Snapshot attached" : attachedFile?.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setAttachedFile(null); setCapturedPhoto(null); }}
                  className="text-red-500 hover:text-red-700 p-1 font-bold cursor-pointer hover:scale-110 active:scale-90 transition-transform"
                  title="Remove attachment"
                >
                  <FaTimes className="text-xs" />
                </button>
              </div>
            )}

            {showEmojiPicker && (
              <div className="w-full px-3 py-2 bg-gradient-to-r from-purple-50 via-white to-purple-50 border-t border-purple-100 flex items-center justify-center overflow-x-auto no-scrollbar animate-fadeIn shrink-0">
                <div className="flex items-center justify-center gap-1.5 mx-auto flex-nowrap shrink-0">
                  {QUICK_EMOJIS.map((item, eIdx) => (
                    <button
                      key={eIdx}
                      type="button"
                      onClick={() => handleAutoSendEmoji(item)}
                      title={`Send ${item.label || 'reaction'}`}
                      className="p-1 rounded-xl hover:bg-purple-100 transition-all duration-200 transform hover:-translate-y-1 hover:scale-125 hover:shadow-2xs cursor-pointer shrink-0"
                    >
                      <img src={getHighResEmojiUrl(item.code)} alt="" className="w-6.5 h-6.5 object-contain" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Voice Recording, Voice Review, or Standard Input Form */}
            {isVoiceRecording ? (
              /* Modal Active Recording Strip */
              <div className="p-3 sm:p-3.5 bg-gradient-to-r from-red-50/95 via-rose-50/70 to-red-50/90 border-t-2 border-red-200 flex items-center justify-between gap-3 animate-fadeIn shrink-0 select-auto">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex items-center justify-center shrink-0">
                    <span className="animate-ping absolute inline-flex h-8 w-8 rounded-full bg-red-400 opacity-70"></span>
                    <div className="w-8.5 h-8.5 sm:w-9 sm:h-9 rounded-full bg-gradient-to-tr from-red-600 to-rose-600 text-white flex items-center justify-center text-sm shadow-md ring-2 ring-red-200">
                      <FaMicrophone className="animate-pulse text-xs sm:text-sm" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-sans text-sm sm:text-base font-black text-red-600 tracking-tight">
                        {formatVoiceTime(voiceDuration)}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700 bg-red-100/90 border border-red-200 px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1 font-sans">
                        <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse inline-block"></span>
                        {selectedStudentId === 'staff' ? "Recording Staff Note" : `Recording Voice Reply`}
                      </span>
                    </div>
                    <p className="text-[11px] text-red-900 font-medium font-sans">
                      {selectedStudentId === 'staff' 
                        ? "Private voice note to admin" 
                        : `Private voice reply to ${selectedThreadStudent?.studentName || 'Student'}`}
                    </p>
                  </div>
                </div>

                {/* Action buttons during live recording */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="px-3 py-1.5 rounded-xl text-gray-700 bg-white hover:bg-gray-100 font-bold text-xs sm:text-sm border border-gray-300 shadow-2xs transition cursor-pointer flex items-center gap-1 active:scale-95 font-sans"
                    title="Discard recording"
                  >
                    <FaTimes className="text-xs" />
                    <span>Cancel</span>
                  </button>

                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer flex items-center gap-1.5 active:scale-95 ring-2 ring-red-300/40 font-sans"
                    title="Stop recording"
                  >
                    <FaStop className="text-xs" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ) : voiceBlob ? (
              /* Modal Voice Review & Send Strip */
              <div className="p-3 sm:p-3.5 bg-gradient-to-r from-red-50/95 via-rose-50/70 to-red-50/90 border-t-2 border-red-200 flex flex-col gap-2 animate-fadeIn shrink-0 select-auto">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={toggleVoicePreview}
                      className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white flex items-center justify-center text-xs shadow-md shadow-red-950/20 transition cursor-pointer shrink-0 active:scale-95 ring-2 ring-red-200"
                      title={isPlayingVoicePreview ? "Pause Preview" : "Play Preview"}
                    >
                      {isPlayingVoicePreview ? <FaPause className="text-xs" /> : <FaPlay className="text-xs pl-0.5" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-black text-red-950 font-sans">🎙️ Voice Note Ready</p>
                      <p className="text-[11px] text-red-600 font-sans font-extrabold">
                        {formatVoiceTime(voiceDuration)} • {selectedStudentId === 'staff' ? "Staff Voice Note" : `Voice Reply to ${selectedThreadStudent?.studentName || 'Student'}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={restartVoiceRecording}
                      className="p-2 rounded-xl text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 shadow-2xs transition cursor-pointer active:scale-95"
                      title="Delete & record again"
                    >
                      <FaRedo className="text-xs" />
                    </button>

                    <button
                      type="button"
                      onClick={cancelVoiceRecording}
                      className="p-2 rounded-xl text-red-600 bg-white hover:bg-red-50 border border-red-200 shadow-2xs transition cursor-pointer active:scale-95"
                      title="Discard voice note"
                    >
                      <FaTrash className="text-xs" />
                    </button>

                    <button
                      type="button"
                      onClick={sendRecordedVoice}
                      disabled={isSendingVoice}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-700 text-white font-black text-xs sm:text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50 ring-2 ring-red-400/40 font-sans"
                    >
                      <FaPaperPlane className={`text-xs ${isSendingVoice ? 'animate-bounce' : ''}`} />
                      <span>{isSendingVoice ? "Sending..." : "Send Voice"}</span>
                    </button>
                  </div>
                </div>

                <div className="w-full bg-red-100 rounded-full h-1 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-red-600 to-rose-600 h-full transition-all duration-100 rounded-full" 
                    style={{ width: `${voicePreviewProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className={`${isFullscreen ? 'p-2 sm:p-2.5 gap-1.5' : 'p-3 sm:p-3.5 gap-2'} bg-white border-t border-gray-200/90 flex flex-col shrink-0`}>
                <div className="flex items-center gap-2">
                  <div className={`flex-1 min-w-0 bg-gray-50/90 rounded-2xl border border-gray-200 focus-within:border-purple-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-purple-100 ${isFullscreen ? 'px-3 py-1.5' : 'px-3.5 py-2'} flex items-center gap-2 shadow-2xs transition-all duration-200`}>
                    <textarea
                      rows={1}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={selectedStudentId === 'staff' ? "Type message to Admin / Teacher..." : `Reply to ${selectedThreadStudent?.studentName || 'Student'}...`}
                      className={`flex-1 min-w-0 bg-transparent ${isFullscreen ? 'text-xs' : 'text-xs sm:text-sm'} text-gray-950 placeholder:text-gray-400 outline-none font-medium resize-none leading-relaxed max-h-24`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !attachedFile && !capturedPhoto) || isSending}
                    title="Send message"
                    className={`${isFullscreen ? 'px-3.5 py-2 rounded-xl text-xs' : 'px-5.5 py-2.5 rounded-2xl text-xs sm:text-sm'} bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white font-black shadow-md hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center gap-1.5 shrink-0 cursor-pointer border border-purple-400/30`}
                  >
                    <FaPaperPlane className={`text-xs ${isSending ? 'animate-bounce' : ''}`} />
                    <span>Send</span>
                  </button>
                </div>

                <div className="flex items-center justify-between px-0.5 pt-0.5">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="w-8.5 h-8.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-600 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-xs active:scale-90 cursor-pointer"
                      title="Insert emoji reactions"
                    >
                      <FaSmile className="text-base text-amber-500" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowCameraModal(true)}
                      className="w-8.5 h-8.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-600 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-xs active:scale-90 cursor-pointer"
                      title="Take photo with camera"
                    >
                      <FaCamera className="text-sm text-purple-600" />
                    </button>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-8.5 h-8.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-600 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-xs active:scale-90 cursor-pointer"
                      title="Upload document or image"
                    >
                      <FaPaperclip className="text-sm text-indigo-600" />
                    </button>

                    <button
                      type="button"
                      onClick={startVoiceRecording}
                      className="w-8.5 h-8.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 hover:scale-115 hover:shadow-xs active:scale-90 cursor-pointer"
                      title="Record & send voice message"
                    >
                      <FaMicrophone className="text-sm text-rose-600" />
                    </button>
                  </div>

                  <span className="text-[11px] text-gray-400 font-medium">
                    Press Enter ↵ to send
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Student Profile & Assigned Courses Modal for Teachers/Admins (Scoped within Chat Container) */}
      <StudentProfileModal
        isOpen={!!inspectStudentId}
        onClose={() => setInspectStudentId(null)}
        studentId={inspectStudentId}
        containerScoped={true}
        onSelectPrivateChat={(sid) => {
          setSelectedStudentId(sid);
          setSendMode('private');
        }}
      />

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={showCameraModal}
        onClose={() => setShowCameraModal(false)}
        onPhotoCaptured={handlePhotoCaptured}
      />

      {/* Image Preview Lightbox Modal */}
      {previewImageModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewImageModal(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img src={previewImageModal} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl" />
            <button
              type="button"
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-2xl bg-black/70 hover:bg-black text-white flex items-center justify-center transition cursor-pointer"
            >
              <FaTimes />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveChatBox;
