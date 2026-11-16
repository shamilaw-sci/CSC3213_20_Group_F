/**
 * @file LiveStreamPlayer.jsx
 * @description Live Stream Video Player. Embeds YouTube live video player with heartbeat telemetry tracking active student watch duration and attendance.
 */

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
  FaMicrophoneSlash,
  FaSync,
  FaGraduationCap,
  FaQuestionCircle,
  FaCommentDots,
  FaClock,
  FaChevronDown,
  FaChevronUp,
  FaCalendarAlt,
  FaUser,
  FaStop,
  FaTrash,
  FaPaperclip,
  FaCamera,
  FaImage,
  FaFileAlt,
  FaSmile,
  FaCheck
} from 'react-icons/fa';
import api, { getApiBaseUrl } from '../utils/api';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import LiveChatBox from './LiveChatBox';
import LiveEndFeedbackModal from './LiveEndFeedbackModal';
import LiveViewersModal from './LiveViewersModal';
import StudentProfileModal from './StudentProfileModal';
import LiveReplyModal from './LiveReplyModal';
import { getMediaUrl } from '../utils/mediaUrl';

const getImageUrl = (url) => getMediaUrl(url);

const LiveStreamPlayer = ({ 
  liveStream, 
  isTeacherOrAdmin, 
  onEndStream, 
  onGoLiveNow,
  onStreamEnded,
  lessonId, 
  grade,
  courseTitle,
  allLessons = [],
  onSelectGrade
}) => {
  const { isDark } = useTheme();
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
  const [isStreamEnded, setIsStreamEnded] = useState(liveStream?.isLive === false || liveStream?.isEnded === true);
  const [activeViewerCount, setActiveViewerCount] = useState(1);
  const [showViewersModal, setShowViewersModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showChatBox, setShowChatBox] = useState(true);
  const [hasUnreadChat, setHasUnreadChat] = useState(false);
  const [showFsHint, setShowFsHint] = useState(false);

  // Live Session Switcher & Feedbacks State (for Teachers & Admins)
  const [activeFeedbackLessonId, setActiveFeedbackLessonId] = useState(lessonId);
  const [showLiveSessionSelector, setShowLiveSessionSelector] = useState(false);
  const sessionSelectorRef1 = useRef(null);
  const sessionSelectorRef2 = useRef(null);

  // Close live session dropdown on click outside or escape key
  useEffect(() => {
    if (!showLiveSessionSelector) return;

    const handleClickOutside = (event) => {
      const inRef1 = sessionSelectorRef1.current && sessionSelectorRef1.current.contains(event.target);
      const inRef2 = sessionSelectorRef2.current && sessionSelectorRef2.current.contains(event.target);

      if (!inRef1 && !inRef2) {
        setShowLiveSessionSelector(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowLiveSessionSelector(false);
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
  }, [showLiveSessionSelector]);

  const [feedbacksData, setFeedbacksData] = useState({ 
    feedbacks: [], 
    totalFeedbacks: 0, 
    unrepliedCount: 0, 
    repliedCount: 0, 
    reactionsSummary: {} 
  });
  const [isLoadingFeedbacks, setIsLoadingFeedbacks] = useState(false);
  const [feedbackTab, setFeedbackTab] = useState('all'); // 'all' | 'questions' | 'reviews'

  // Direct Reply Modal State (for replying to student doubts/feedback in Studio)
  const [replyTarget, setReplyTarget] = useState(null); // { studentId, studentName, studentEmail, studentProfilePicture, question, message }
  const [isStudioCollapsed, setIsStudioCollapsed] = useState(true);

  // Concluded Live Session Viewers & Watch Time Stats State
  const [viewersSummaryStats, setViewersSummaryStats] = useState({
    totalViewersCount: 0,
    totalWatchedHours: 0,
    totalWatchedSeconds: 0,
    averageWatchedSeconds: 0
  });

  // Clicked Reaction Modal & Inspect Student Profile Modal State
  const [selectedReactionModal, setSelectedReactionModal] = useState(null); // { id, emoji, label }
  const [inspectStudent, setInspectStudent] = useState(null); // { studentId, name, email, profilePicture, grade }

  const formatGrade = useCallback((g) => {
    if (!g) return '';
    const s = String(g).trim();
    return s.toLowerCase().startsWith('grade') ? s : `Grade ${s}`;
  }, []);

  const handleInspectStudent = useCallback((f) => {
    if (!f) return;
    const sid = f.studentId || (typeof f.student === 'object' ? f.student?._id : f.student) || f._id;
    setInspectStudent({
      studentId: sid ? String(sid) : '',
      name: f.studentName || f.name || f.student?.name || 'Student',
      email: f.studentEmail || f.email || f.student?.email || '',
      profilePicture: f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar || '',
      grade: f.grade || f.student?.grade || ''
    });
  }, []);

  const normalizeGrade = useCallback((g) => {
    if (!g) return '';
    return String(g).toLowerCase().replace(/\s+/g, '').replace('grade', '');
  }, []);

  const thisGradeConcludedSessions = useMemo(() => {
    const currentGradeNorm = normalizeGrade(grade);

    // Filter lessons belonging strictly to this grade
    const matchingLessons = (Array.isArray(allLessons) ? allLessons : []).filter(l => {
      if (!l) return false;
      if (currentGradeNorm) {
        return normalizeGrade(l.grade) === currentGradeNorm;
      }
      return l._id === lessonId;
    });

    const sessions = [];

    matchingLessons.forEach(l => {
      const feedbacksList = Array.isArray(l.liveStream?.feedbacks) ? l.liveStream.feedbacks : [];
      const unrepliedInLesson = feedbacksList.filter(f => !f.reply?.text && !f.reply?.repliedAt).length;

      // 1. Current lesson liveStream ONLY if concluded/ended (NEVER before live end, NEVER when active live or scheduled)
      const ls = l.liveStream;
      const isConcluded = Boolean(ls && !ls.isLive && !ls.isScheduled && (ls.endedAt || ls.isEnded));

      if (isConcluded) {
        const cleanGrade = l.grade ? (String(l.grade).toLowerCase().startsWith('grade') ? l.grade : `Grade ${l.grade}`) : (grade ? (String(grade).toLowerCase().startsWith('grade') ? grade : `Grade ${grade}`) : '');
        sessions.push({
          id: l._id,
          lessonId: l._id,
          title: ls.title || l.title || `${cleanGrade || 'Live'} Session`,
          startedAt: ls.startedAt || l.createdAt,
          endedAt: ls.endedAt,
          isCurrent: l._id === (activeFeedbackLessonId || lessonId),
          grade: l.grade,
          hasUnreplied: unrepliedInLesson > 0,
          unrepliedCount: unrepliedInLesson
        });
      }

      // 2. Any archived past live streams for this lesson
      const pastList = Array.isArray(ls?.pastLiveStreams) 
        ? ls.pastLiveStreams 
        : (Array.isArray(l.pastLiveStreams) ? l.pastLiveStreams : []);

      pastList.forEach((past, pIdx) => {
        if (past && !past.isLive && !past.isScheduled && (past.endedAt || past.startedAt)) {
          const isSameTime = sessions.some(s => s.startedAt && past.startedAt && new Date(s.startedAt).getTime() === new Date(past.startedAt).getTime());
          if (!isSameTime) {
            sessions.push({
              id: past._id || `${l._id}-past-${pIdx}`,
              lessonId: l._id,
              title: past.title || ls?.title || (l.grade ? `Grade ${l.grade} Live Class` : 'Live Session'),
              startedAt: past.startedAt || past.createdAt,
              endedAt: past.endedAt,
              isCurrent: false,
              grade: l.grade,
              hasUnreplied: false,
              unrepliedCount: 0
            });
          }
        }
      });

      // 3. Any videoLessons that were recorded live streams
      if (Array.isArray(l.videoLessons)) {
        l.videoLessons.forEach((vl, vIdx) => {
          if (vl.title && (vl.title.toLowerCase().includes('live') || vl.title.toLowerCase().includes('recorded'))) {
            if (!sessions.some(s => s.title === vl.title)) {
              sessions.push({
                id: vl._id || `${l._id}-video-${vIdx}`,
                lessonId: l._id,
                title: vl.title,
                startedAt: vl.uploadedAt || vl.createdAt,
                endedAt: null,
                isCurrent: false,
                grade: l.grade,
                hasUnreplied: false,
                unrepliedCount: 0
              });
            }
          }
        });
      }
    });

    // Fallback: If no sessions found in matching lessons, use current liveStream ONLY if actually concluded/ended
    const isCurrStreamConcluded = Boolean(liveStream && !liveStream.isLive && !liveStream.isScheduled && (liveStream.endedAt || isStreamEnded));
    if (sessions.length === 0 && isCurrStreamConcluded) {
      const cleanGrade = grade ? (String(grade).toLowerCase().startsWith('grade') ? grade : `Grade ${grade}`) : '';
      const fallbackUnreplied = (feedbacksData.feedbacks || []).filter(f => !f.isReplied).length;
      sessions.push({
        id: lessonId || 'current',
        lessonId: lessonId,
        title: liveStream?.title || `${cleanGrade || 'Live'} Session`,
        startedAt: liveStream?.startedAt,
        endedAt: liveStream?.endedAt,
        isCurrent: true,
        grade: grade,
        hasUnreplied: fallbackUnreplied > 0,
        unrepliedCount: fallbackUnreplied
      });
    }

    // Sort all sessions by endedAt or startedAt DESCENDING so latest live session is ALWAYS first!
    sessions.sort((a, b) => {
      const timeA = new Date(a.endedAt || a.startedAt || 0).getTime();
      const timeB = new Date(b.endedAt || b.startedAt || 0).getTime();
      return timeB - timeA;
    });

    return sessions;
  }, [allLessons, grade, lessonId, activeFeedbackLessonId, liveStream, isStreamEnded, normalizeGrade]);

  // Active selected session (defaults to latest live session for this grade)
  const activeSession = useMemo(() => {
    if (thisGradeConcludedSessions.length === 0) return null;
    const found = thisGradeConcludedSessions.find(s => s.lessonId === activeFeedbackLessonId || s.id === activeFeedbackLessonId);
    return found || thisGradeConcludedSessions[0];
  }, [thisGradeConcludedSessions, activeFeedbackLessonId]);

  const currentSessionTitle = activeSession?.title || liveStream?.title || 'Live Stream Session';

  // Always default to the latest live session for this grade!
  useEffect(() => {
    if (thisGradeConcludedSessions.length > 0) {
      const latest = thisGradeConcludedSessions[0];
      if (latest?.lessonId) {
        const isValid = thisGradeConcludedSessions.some(s => s.lessonId === activeFeedbackLessonId);
        if (!isValid || !activeFeedbackLessonId) {
          setActiveFeedbackLessonId(latest.lessonId);
        }
      }
    } else if (lessonId) {
      setActiveFeedbackLessonId(lessonId);
    }
  }, [thisGradeConcludedSessions, lessonId]);

  const fetchPostStreamFeedbacks = useCallback(async (targetId = null) => {
    const targetLessonId = targetId || activeFeedbackLessonId || lessonId;
    if (!targetLessonId) return;
    setIsLoadingFeedbacks(true);
    try {
      const [feedbacksRes, viewersRes] = await Promise.allSettled([
        api.get(`/lessons/${targetLessonId}/live-stream/feedbacks`),
        api.get(`/lessons/${targetLessonId}/live-stream/viewers`)
      ]);

      if (feedbacksRes.status === 'fulfilled') {
        const fList = feedbacksRes.value.data.feedbacks || [];
        const unreplied = feedbacksRes.value.data.unrepliedCount !== undefined
          ? feedbacksRes.value.data.unrepliedCount
          : fList.filter(f => !f.isReplied).length;
        const replied = feedbacksRes.value.data.repliedCount !== undefined
          ? feedbacksRes.value.data.repliedCount
          : fList.filter(f => f.isReplied).length;

        setFeedbacksData({
          feedbacks: fList,
          totalFeedbacks: feedbacksRes.value.data.totalFeedbacks || fList.length,
          unrepliedCount: unreplied,
          repliedCount: replied,
          reactionsSummary: feedbacksRes.value.data.reactionsSummary || {}
        });
      }

      if (viewersRes.status === 'fulfilled') {
        setViewersSummaryStats({
          totalViewersCount: viewersRes.value.data.totalViewersCount || 0,
          totalWatchedHours: viewersRes.value.data.totalWatchedHours || 0,
          totalWatchedSeconds: viewersRes.value.data.totalWatchedSeconds || 0,
          averageWatchedSeconds: viewersRes.value.data.averageWatchedSeconds || 0
        });
      }
    } catch (err) {
      console.warn("Failed to fetch stream feedbacks and viewers summary", err);
    } finally {
      setIsLoadingFeedbacks(false);
    }
  }, [lessonId, activeFeedbackLessonId]);

  const handleOpenReplyModal = (f) => {
    const sId = f.student || f.studentId || f._id;
    setReplyTarget({
      feedbackId: f._id,
      studentId: sId,
      studentName: f.studentName || f.name || f.student?.name || 'Student',
      studentEmail: f.studentEmail || f.email || f.student?.email || '',
      studentProfilePicture: f.studentProfilePicture || f.avatar || f.student?.profilePicture || f.student?.avatar || f.studentAvatar || '',
      question: f.question || '',
      message: f.message || '',
      reaction: f.reaction || '',
      reactionLabel: f.reactionLabel || '',
      reactionEmoji: f.reactionEmoji || '',
      submittedAt: f.submittedAt || f.createdAt || '',
      reply: f.reply || null
    });
  };

  useEffect(() => {
    if (lessonId && (isTeacherOrAdmin || isStreamEnded)) {
      fetchPostStreamFeedbacks();
    }
  }, [lessonId, isTeacherOrAdmin, isStreamEnded, fetchPostStreamFeedbacks]);

  const filteredFeedbacks = useMemo(() => {
    const list = feedbacksData.feedbacks || [];
    let result = list;
    if (feedbackTab === 'unreplied') {
      result = list.filter(f => !f.isReplied);
    } else if (feedbackTab === 'replied') {
      result = list.filter(f => f.isReplied);
    } else if (feedbackTab === 'questions') {
      result = list.filter(f => f.question && f.question.trim().length > 0);
    } else if (feedbackTab === 'reviews') {
      result = list.filter(f => f.message && f.message.trim().length > 0);
    }

    const getTime = (item) => {
      if (item.submittedAt) return new Date(item.submittedAt).getTime();
      if (item.createdAt) return new Date(item.createdAt).getTime();
      if (item._id) {
        try {
          return parseInt(item._id.toString().substring(0, 8), 16) * 1000;
        } catch {}
      }
      return 0;
    };

    // Sort: 1. Unreplied / Unread first ("unread in up"), 2. Latest timestamp first ("latest in up")
    return [...result].sort((a, b) => {
      const aUnreplied = !a.isReplied;
      const bUnreplied = !b.isReplied;
      if (aUnreplied && !bUnreplied) return -1;
      if (!aUnreplied && bUnreplied) return 1;

      const aTime = getTime(a);
      const bTime = getTime(b);
      return bTime - aTime;
    });
  }, [feedbacksData.feedbacks, feedbackTab]);

  const formattedEndedDate = useMemo(() => {
    const dateVal = activeSession?.endedAt || liveStream?.endedAt || liveStream?.ended_at;
    if (!dateVal) {
      const fallbackDate = activeSession?.startedAt || liveStream?.startedAt;
      if (fallbackDate) {
        try {
          const d = new Date(fallbackDate);
          return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } catch {}
      }
      return '';
    }
    try {
      const d = new Date(dateVal);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' • ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }, [activeSession?.endedAt, activeSession?.startedAt, liveStream?.endedAt, liveStream?.ended_at, liveStream?.startedAt]);

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

  useEffect(() => {
    return () => {
      stopLiveMic();
    };
  }, [stopLiveMic]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isStudent = user?.role === 'student';

  useEffect(() => {
    if (!lessonId || liveStream?.isLive === false || isStreamEnded) return;

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
            if (typeof onStreamEnded === 'function') {
              onStreamEnded({
                lessonId,
                streamTitle: res.data.streamTitle || liveStream?.title,
                grade
              });
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
  }, [lessonId, liveStream?.isLive, isPlaying, isStudent, isStreamEnded, onStreamEnded, grade, liveStream?.title]);

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
    if (liveStream && (liveStream.isLive === false || liveStream.isEnded === true || liveStream.endedAt)) {
      setIsStreamEnded(true);
      setIsPlaying(false);
      if (isStudent) {
        setShowFeedbackModal(true);
        if (typeof onStreamEnded === 'function') {
          onStreamEnded({
            lessonId,
            streamTitle: liveStream?.title,
            grade
          });
        }
      }
    }
  }, [liveStream?.isLive, liveStream?.isEnded, liveStream?.endedAt, isStudent, lessonId, grade, onStreamEnded, liveStream?.title]);

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

  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsActive = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(fsActive);
      setControlsVisible(true);
      if (fsActive) {
        setShowChatBox(false);
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

  const stableEmbedUrl = useMemo(() => {
    const origin = typeof window !== 'undefined' ? encodeURIComponent(window.location.origin) : '';
    return `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=0&enablejsapi=1&playsinline=1&rel=0&modestbranding=1&fs=0&iv_load_policy=3&vq=auto&suggestedQuality=auto&origin=${origin}&widget_referrer=${origin}`;
  }, [videoId]);

  // Sync fullscreen state with native document fullscreen events
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fsActive = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
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

  // -------------------------------------------------------------
  // CONCLUDED STREAM HANDLERS FOR STUDENTS, INSTRUCTORS & ADMINS
  // -------------------------------------------------------------
  if (isStudent && (isStreamEnded || !liveStream?.isLive)) {
    return (
      <>
        {showFeedbackModal && (
          <LiveEndFeedbackModal
            isOpen={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
            lessonId={lessonId}
            streamTitle={liveStream?.title}
            grade={grade}
          />
        )}
      </>
    );
  }

  if (isTeacherOrAdmin && (isStreamEnded || !liveStream?.isLive)) {
    const unrepliedFeedbacksCount = feedbacksData.unrepliedCount ?? feedbacksData.feedbacks.filter(f => !f.isReplied).length;
    const hasUnrepliedFeedbacks = unrepliedFeedbacksCount > 0;

    return (
      <div className="space-y-4 animate-fadeIn">
        {/* TEACHER & ADMIN POST-STREAM REACTIONS, DOUBTS & REVIEWS STUDIO */}
        <div className={`w-full rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-4 border transition-all duration-300 ${
          isDark 
            ? 'bg-slate-900/95 border-slate-800 text-slate-100 shadow-slate-950/60' 
            : 'bg-gradient-to-br from-[#faf9fe] via-white to-[#f5f2ff] border-purple-200 text-slate-900 shadow-purple-900/10'
        } ${isStudioCollapsed && showLiveSessionSelector ? 'min-h-[420px] pb-12 sm:pb-16' : ''}`}>
          {/* Top Bar Header */}
          <div className={`space-y-3.5 border-b pb-4 ${
            isDark ? 'border-slate-800' : 'border-purple-200/80'
          }`}>
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3.5 sm:gap-4 w-full">
              <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 w-full lg:flex-1">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-white flex items-center justify-center text-xl sm:text-2xl shadow-md shadow-purple-900/20 border border-purple-300 shrink-0 mt-0.5">
                  <FaGraduationCap />
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {/* Session Title */}
                  <h3 className={`text-lg sm:text-2xl md:text-3xl font-black tracking-tight leading-snug break-words ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {currentSessionTitle}
                  </h3>

                  {/* Sleek, Modern, Unified Status & Metrics Bar */}
                  <div className="space-y-2 pt-0.5">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                      {/* Status: Concluded Live */}
                      <span className={`px-2.5 py-1 rounded-xl border text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap ${
                        isDark 
                          ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' 
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}>
                        <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] shrink-0" />
                        <span>Concluded Live</span>
                      </span>

                      {/* Unified Live Summary Metrics Segmented Capsule */}
                      <div className={`flex items-center rounded-xl border shadow-2xs divide-x text-[11px] sm:text-xs font-bold transition-all shrink-0 max-w-full overflow-x-auto ${
                        isDark 
                          ? 'bg-slate-800/90 border-slate-700 divide-slate-700 text-slate-200' 
                          : 'bg-white border-slate-200/90 divide-slate-200 text-slate-700'
                      }`}>
                        {/* Students Watched (Non-clickable) */}
                        <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 select-none whitespace-nowrap shrink-0">
                          <FaUsers className="text-emerald-600 dark:text-emerald-400 text-xs shrink-0" />
                          <span>{viewersSummaryStats.totalViewersCount} Watched</span>
                        </div>

                        {/* Total Watched Duration (Non-clickable) */}
                        <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 select-none whitespace-nowrap shrink-0">
                          <FaClock className="text-amber-500 text-xs shrink-0" />
                          <span>
                            {viewersSummaryStats.totalWatchedSeconds >= 3600
                              ? `${(viewersSummaryStats.totalWatchedSeconds / 3600).toFixed(1)}h`
                              : (viewersSummaryStats.totalWatchedSeconds > 0
                                  ? `${Math.round(viewersSummaryStats.totalWatchedSeconds / 60)}m`
                                  : (viewersSummaryStats.totalWatchedHours > 0 ? `${viewersSummaryStats.totalWatchedHours}h` : '0m'))}
                          </span>
                        </div>

                        {/* Student Submissions */}
                        <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 text-purple-700 dark:text-purple-300 select-none whitespace-nowrap shrink-0">
                          <FaCommentDots className="text-purple-500 text-xs shrink-0" />
                          <span>{feedbacksData.totalFeedbacks} Submissions</span>
                        </div>
                      </div>

                      {/* Concluded Date Badge */}
                      {formattedEndedDate && (
                        <div className="flex items-center shrink-0">
                          <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 shadow-2xs select-none shrink-0 whitespace-nowrap ${
                            isDark 
                              ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' 
                              : 'bg-slate-50/90 border-slate-200/90 text-slate-700'
                          }`}>
                            <FaCalendarAlt className="text-purple-500 dark:text-purple-400 text-xs shrink-0" />
                            <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 shrink-0">
                              Concluded:
                            </span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                              {formattedEndedDate}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP RIGHT CORNER CONTROLS */}
              <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-start gap-2.5 shrink-0 w-full lg:w-auto pt-1 lg:pt-0">
                <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto">
                  {/* 1. Switch Live Session Dropdown Selector */}
                  <div className="relative flex-1 sm:flex-none" ref={sessionSelectorRef1}>
                    <button
                      type="button"
                      onClick={() => setShowLiveSessionSelector(!showLiveSessionSelector)}
                      className={`w-full sm:w-auto px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95 border whitespace-nowrap ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 border-purple-500/60 text-purple-300' 
                          : 'bg-white hover:bg-purple-50/80 border-purple-300 text-purple-900'
                      }`}
                      title="Select a concluded live session to inspect reactions and reviews"
                    >
                      <FaVideo className="text-purple-600 dark:text-purple-400 text-xs shrink-0" />
                      <span>Switch Live Session</span>
                      <FaChevronDown className={`text-[10px] text-purple-600 dark:text-purple-400 transition-transform shrink-0 ${showLiveSessionSelector ? 'rotate-180' : ''}`} />
                    </button>

                    {showLiveSessionSelector && (
                      <div className={`absolute left-0 sm:left-auto right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-2.5 shadow-2xl z-50 animate-fadeIn space-y-1.5 border ${
                        isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-900'
                      }`}>
                        <div className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b flex items-center justify-between ${
                          isDark ? 'text-purple-300 border-slate-800' : 'text-purple-800 border-purple-100'
                        }`}>
                          <span>Concluded Live Sessions</span>
                          <span className="text-[9.5px] text-purple-400 font-bold">{grade || 'This Grade'}</span>
                        </div>

                        <div className="max-h-72 overflow-y-auto space-y-1.5 custom-scrollbar">
                          {thisGradeConcludedSessions.length === 0 ? (
                            <div className="p-3.5 text-center text-slate-400 text-xs font-medium">
                              No previous live sessions found for {grade || 'this grade'}.
                            </div>
                          ) : (
                            thisGradeConcludedSessions.map((s, idx) => {
                              const isCurrent = s.isCurrent || (s.lessonId === (activeFeedbackLessonId || lessonId));

                              let dateStr = '';
                              const dVal = s.endedAt || s.startedAt;
                              if (dVal) {
                                try {
                                  dateStr = new Date(dVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                } catch {}
                              }
                              if (!dateStr && formattedEndedDate) {
                                dateStr = formattedEndedDate.split('•')[0].trim();
                              }

                              let startStr = '';
                              let endStr = '';
                              if (s.startedAt) {
                                try {
                                  startStr = new Date(s.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                } catch {}
                              }
                              if (s.endedAt) {
                                try {
                                  endStr = new Date(s.endedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                } catch {}
                              } else if (!endStr && formattedEndedDate && formattedEndedDate.includes('•')) {
                                endStr = formattedEndedDate.split('•')[1]?.trim() || '';
                              }

                              return (
                                <button
                                  key={s.id || idx}
                                  type="button"
                                  onClick={() => {
                                    if (s.lessonId) {
                                      setActiveFeedbackLessonId(s.lessonId);
                                      fetchPostStreamFeedbacks(s.lessonId);
                                    }
                                    setShowLiveSessionSelector(false);
                                  }}
                                  className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                                    isCurrent
                                      ? isDark
                                        ? 'bg-purple-950/60 border-purple-500/80 text-white shadow-xs font-bold ring-1 ring-purple-500/40'
                                        : 'bg-purple-100 border-purple-400 text-purple-950 shadow-xs font-bold ring-1 ring-purple-400/40'
                                      : isDark
                                        ? 'bg-slate-800/80 border-slate-700 hover:bg-purple-950/40 text-slate-300'
                                        : 'bg-slate-50 border-slate-200 hover:bg-purple-50 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1.5">
                                    <p className={`font-extrabold text-xs truncate flex-1 ${isDark ? 'text-purple-200' : 'text-slate-900'}`}>
                                      {s.title}
                                    </p>
                                    {isCurrent && (
                                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7] shrink-0" />
                                    )}
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                    {dateStr && (
                                      <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 shadow-2xs ${
                                        isDark ? 'bg-purple-950/60 border-purple-800/60 text-purple-300' : 'bg-purple-100/90 border-purple-200 text-purple-900'
                                      }`}>
                                        <FaCalendarAlt className="text-[8.5px] text-purple-400" />
                                        <span>{dateStr}</span>
                                      </span>
                                    )}

                                    {(startStr || endStr) && (
                                      <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 shadow-2xs ${
                                        isDark ? 'bg-amber-950/60 border-amber-800/60 text-amber-300' : 'bg-amber-100/90 border-amber-200 text-amber-900'
                                      }`}>
                                        <FaClock className="text-[8.5px] text-amber-500" />
                                        <span>
                                          {startStr && endStr 
                                            ? `${startStr} – ${endStr}` 
                                            : (startStr ? `Start: ${startStr}` : `End: ${endStr}`)}
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 3. Refresh Reviews Button */}
                  <button
                    type="button"
                    onClick={() => fetchPostStreamFeedbacks()}
                    disabled={isLoadingFeedbacks}
                    className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs border whitespace-nowrap ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-700 border-indigo-500/60 text-indigo-300' 
                        : 'bg-white hover:bg-indigo-50/80 border-indigo-300 text-indigo-900'
                    }`}
                    title="Refresh reviews and doubts"
                  >
                    <FaSync className={`text-xs text-indigo-600 dark:text-indigo-400 shrink-0 ${isLoadingFeedbacks ? 'animate-spin' : ''}`} />
                    <span>{isLoadingFeedbacks ? 'Syncing...' : 'Refresh Reviews'}</span>
                  </button>

                  {/* 4. Expand / Collapse Button */}
                  <button
                    type="button"
                    onClick={() => setIsStudioCollapsed(!isStudioCollapsed)}
                    className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95 border whitespace-nowrap ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-700 border-purple-500/60 text-purple-300' 
                        : 'bg-white hover:bg-purple-50/80 border-purple-300 text-purple-900'
                    }`}
                    title={isStudioCollapsed ? "Expand reviews & student feedback" : "Collapse reviews & student feedback"}
                  >
                    {isStudioCollapsed ? <FaChevronDown className="text-xs text-purple-500 shrink-0" /> : <FaChevronUp className="text-xs text-purple-500 shrink-0" />}
                    {hasUnrepliedFeedbacks && (
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                      </span>
                    )}
                    <span>{isStudioCollapsed ? 'Expand' : 'Collapse'}</span>
                  </button>
                </div>

                {/* Increased Size Unread Messages Button (Positioned Directly Under Expand or Inline on Mobile) */}
                <div className="flex justify-start sm:justify-end w-full sm:w-auto pt-1 sm:pt-0">
                  {hasUnrepliedFeedbacks ? (
                    <span className={`px-4 py-2 sm:px-5 sm:py-2 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-md animate-pulse whitespace-nowrap shrink-0 ${
                      isDark 
                        ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-950/60' 
                        : 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-emerald-900/10'
                    }`}>
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                      </span>
                      <span>{unrepliedFeedbacksCount} Unread {unrepliedFeedbacksCount === 1 ? 'Message' : 'Messages'}</span>
                    </span>
                  ) : (
                    <span className={`px-4 py-2 sm:px-5 sm:py-2 rounded-2xl border text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-2xs select-none whitespace-nowrap shrink-0 ${
                      isDark 
                        ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' 
                        : 'bg-emerald-50 border-emerald-300/80 text-emerald-800'
                    }`}>
                      <FaCheck className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span>0 Unread Messages</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* EXPANDABLE / COLLAPSIBLE BODY */}
          {!isStudioCollapsed && (
            <>
              {/* Reaction Summary Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {[
                  { id: 'superb', emoji: '⭐', label: 'Superb Class', border: 'border-amber-200 bg-amber-50/70 text-amber-900' },
                  { id: 'understood', emoji: '💡', label: 'Understood', border: 'border-emerald-200 bg-emerald-50/70 text-emerald-900' },
                  { id: 'great_teaching', emoji: '👏', label: 'Great Teaching', border: 'border-purple-200 bg-purple-50/70 text-purple-900' },
                  { id: 'loved', emoji: '❤️', label: 'Loved Session', border: 'border-rose-200 bg-rose-50/70 text-rose-900' },
                  { id: 'inspiring', emoji: '🚀', label: 'Inspiring', border: 'border-blue-200 bg-blue-50/70 text-blue-900' },
                  { id: 'crystal_clear', emoji: '🎯', label: 'Spot On', border: 'border-orange-200 bg-orange-50/70 text-orange-900' }
                ].map(item => {
                  const count = feedbacksData.reactionsSummary?.[item.id] || 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedReactionModal(item)}
                      className={`p-3 rounded-2xl border flex flex-col justify-between space-y-1.5 transition-all shadow-xs hover:shadow-md hover:scale-[1.03] active:scale-95 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-purple-400 group ${
                        isDark 
                          ? 'bg-slate-800/80 border-slate-700/80 hover:border-purple-500/60 text-slate-200' 
                          : `${item.border} hover:border-purple-400 text-slate-800`
                      }`}
                      title={`Click to view students who reacted "${item.label}"`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-2xl transition-transform group-hover:scale-110">{item.emoji}</span>
                        <span className={`px-2.5 py-0.5 rounded-full font-black text-xs border shadow-2xs ${
                          isDark 
                            ? 'bg-slate-900 border-slate-700 text-white' 
                            : 'bg-white border-slate-300/80 text-slate-900'
                        }`}>
                          {count}
                        </span>
                      </div>
                      <p className={`text-[11px] font-extrabold truncate leading-tight mt-1 flex items-center justify-between ${
                        isDark ? 'text-slate-300' : 'text-slate-800'
                      }`}>
                        <span>{item.label}</span>
                        <span className="text-[9px] text-purple-400 font-bold opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Filter Tabs & Content */}
              <div className="space-y-3.5 pt-1">
                <div className={`flex items-center justify-center gap-2.5 sm:gap-3 border-b pb-3 flex-wrap ${
                  isDark ? 'border-slate-800' : 'border-purple-200/80'
                }`}>
                  <button
                    type="button"
                    onClick={() => setFeedbackTab('all')}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer shadow-xs ${
                      feedbackTab === 'all'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-900/20'
                        : isDark
                          ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                          : 'bg-white hover:bg-purple-50 text-purple-950 border border-purple-200'
                    }`}
                  >
                    All Submissions ({feedbacksData.totalFeedbacks})
                  </button>

                  {/* UNREPLIED MESSAGES IDENTIFIER BUTTON */}
                  <button
                    type="button"
                    onClick={() => setFeedbackTab('unreplied')}
                    className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-xs ${
                      feedbackTab === 'unreplied'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-950/20 ring-2 ring-emerald-400'
                        : isDark
                          ? 'bg-emerald-950/50 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-700/60'
                          : 'bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-300'
                    }`}
                    title="Filter to show only unreplied messages waiting for teacher response"
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                    </span>
                    <span>Unreplied Messages ({feedbacksData.unrepliedCount ?? feedbacksData.feedbacks.filter(f => !f.isReplied).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackTab('questions')}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      feedbackTab === 'questions'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-900/20'
                        : isDark
                          ? 'bg-slate-800 hover:bg-slate-750 text-amber-400 border border-slate-700'
                          : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    <FaQuestionCircle className="text-xs" />
                    <span>Doubts & Questions ({feedbacksData.feedbacks.filter(f => f.question?.trim()).length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFeedbackTab('reviews')}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                      feedbackTab === 'reviews'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-900/20'
                        : isDark
                          ? 'bg-slate-800 hover:bg-slate-750 text-indigo-300 border border-slate-700'
                          : 'bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200'
                    }`}
                  >
                    <FaCommentDots className="text-xs" />
                    <span>Reviews & Feedback ({feedbacksData.feedbacks.filter(f => f.message?.trim()).length})</span>
                  </button>

                  {/* 5. Live Session Summary Button (placed after the filter tabs) */}
                  <button
                    type="button"
                    onClick={() => setShowViewersModal(true)}
                    className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs active:scale-95 border ${
                      isDark 
                        ? 'bg-emerald-950/50 hover:bg-emerald-900/60 border-emerald-600/70 text-emerald-300' 
                        : 'bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 text-emerald-950'
                    }`}
                    title="View live stream summary, duration, and viewers analytics"
                  >
                    <FaUsers className="text-emerald-600 dark:text-emerald-400 text-xs" />
                    <span>Live Session Summary ({viewersSummaryStats.totalViewersCount})</span>
                  </button>
                </div>

                {/* Feedbacks Submissions List */}
                {filteredFeedbacks.length === 0 ? (
                  <div className={`border rounded-2xl p-8 text-center space-y-2.5 shadow-xs ${
                    isDark ? 'bg-slate-800/80 border-slate-700 text-slate-300' : 'bg-white border-purple-200/80 text-slate-900'
                  }`}>
                    <span className="text-4xl block">💬</span>
                    <p className={`text-sm font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>No student feedback found for this view.</p>
                    <p className={`text-xs max-w-sm mx-auto font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                      {feedbackTab === 'unreplied' 
                        ? "Great job! All student doubts and feedback have been replied to."
                        : "Student reactions, doubts, and reviews for this live session will display here in real-time as students submit them."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {filteredFeedbacks.map(f => (
                      <div key={f._id || f.createdAt} className={`rounded-2xl p-4 space-y-3 shadow-xs transition-all border ${
                        isDark 
                          ? 'bg-slate-800/90 border-slate-700 hover:border-purple-500/60 text-slate-100 shadow-slate-950/40' 
                          : 'bg-white border-purple-200 hover:border-purple-400 text-slate-900 shadow-xs'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div 
                            onClick={() => handleInspectStudent(f)}
                            className="flex items-center gap-3 min-w-0 cursor-pointer group"
                            title="Click to view student details"
                          >
                            {Boolean(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? (
                              <img 
                                src={getImageUrl(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar)} 
                                alt={f.studentName || f.name || 'Student'} 
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                className="w-9 h-9 rounded-full object-cover border border-purple-300 shadow-2xs group-hover:ring-2 group-hover:ring-purple-400 transition shrink-0" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) {
                                    e.currentTarget.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs items-center justify-center shadow-2xs border border-purple-300 group-hover:ring-2 group-hover:ring-purple-400 transition shrink-0 ${(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? 'hidden' : 'flex'}`}>
                              {((f.studentName || f.name || 'S')[0]).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className={`text-xs font-black truncate ${
                                  isDark ? 'text-white group-hover:text-purple-400' : 'text-slate-900 group-hover:text-purple-700'
                                }`}>
                                  {f.studentName || f.name || 'Student'}
                                </p>
                                {/* Green dot before reply to identify unreplied message */}
                                {!f.isReplied && (
                                  <span 
                                    className="relative flex h-2.5 w-2.5 shrink-0" 
                                    title="Unreplied - Waiting for reply"
                                  >
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                                  </span>
                                )}
                              </div>
                              <p className={`text-[10px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {f.studentEmail || f.email || (f.grade ? formatGrade(f.grade) : '')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Unreplied badge vs Replied badge */}
                            {!f.isReplied ? (
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-black flex items-center gap-1 shadow-2xs animate-pulse ${
                                isDark 
                                  ? 'bg-emerald-950/70 border-emerald-600/70 text-emerald-300' 
                                  : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                              }`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>Unreplied</span>
                              </span>
                            ) : (
                              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold flex items-center gap-1 shadow-2xs ${
                                isDark 
                                  ? 'bg-purple-950/60 border-purple-700/60 text-purple-300' 
                                  : 'bg-purple-50 border-purple-200 text-purple-800'
                              }`}>
                                <FaCheck className="text-[8.5px] text-purple-400" />
                                <span>Replied</span>
                              </span>
                            )}

                            <span className={`px-2.5 py-1 rounded-xl border text-[10.5px] font-extrabold flex items-center gap-1 shadow-2xs ${
                              isDark 
                                ? 'bg-slate-700/80 border-slate-600 text-slate-200' 
                                : 'bg-purple-50 border-purple-200 text-purple-900'
                            }`}>
                              <span>{f.reactionEmoji || '⭐'}</span>
                              <span>{f.reactionLabel || 'Reaction'}</span>
                            </span>
                          </div>
                        </div>

                        {f.question?.trim() && (
                          <div className={`rounded-2xl p-3 space-y-1 shadow-inner border ${
                            isDark 
                              ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' 
                              : 'bg-amber-50/90 border-amber-200 text-amber-950'
                          }`}>
                            <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                              <FaQuestionCircle className="text-amber-400" /> Student Doubt / Question:
                            </span>
                            <p className="text-xs font-medium leading-relaxed">"{f.question}"</p>
                          </div>
                        )}

                        {f.message?.trim() && (
                          <div className={`rounded-2xl p-3 space-y-1 shadow-inner border ${
                            isDark 
                              ? 'bg-purple-950/40 border-purple-800/60 text-purple-200' 
                              : 'bg-purple-50/90 border-purple-200 text-purple-950'
                          }`}>
                            <span className="text-[10px] font-black uppercase text-purple-400 tracking-wider flex items-center gap-1">
                              <FaCommentDots className="text-purple-400" /> Class Review / Feedback:
                            </span>
                            <p className="text-xs font-medium leading-relaxed">"{f.message}"</p>
                          </div>
                        )}

                        {/* Teacher / Admin reply if already sent */}
                        {f.reply?.text && (() => {
                          const isReplyAdmin = f.reply?.role === 'admin' || f.reply?.repliedByRole === 'admin' || (typeof f.reply?.repliedBy === 'object' && f.reply?.repliedBy?.role === 'admin') || (f.reply?.repliedByName?.toLowerCase().includes('admin')) || (user?.role === 'admin' && !f.reply?.role);
                          return (
                            <div className={`rounded-2xl p-2.5 space-y-0.5 shadow-2xs border ${
                              isReplyAdmin
                                ? (isDark 
                                    ? 'bg-blue-950/40 border-blue-800/60 text-blue-200' 
                                    : 'bg-blue-50/90 border-blue-200 text-blue-950')
                                : (isDark 
                                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
                                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-950')
                            }`}>
                              <span className={`text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                isReplyAdmin ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'
                              }`}>
                                <FaCheck className={`text-[9px] ${isReplyAdmin ? 'text-blue-500' : 'text-emerald-500'}`} /> 
                                {isReplyAdmin ? 'Your Reply (Admin):' : 'Your Reply (Teacher):'}
                              </span>
                              <p className={`text-xs font-medium leading-relaxed ${
                                isReplyAdmin ? 'text-blue-900 dark:text-blue-100' : 'text-emerald-900 dark:text-emerald-100'
                              }`}>"{f.reply.text}"</p>
                            </div>
                          );
                        })()}

                        <div className={`flex items-center justify-between pt-1.5 border-t text-[10px] ${
                          isDark ? 'border-slate-700/80' : 'border-purple-100'
                        }`}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleInspectStudent(f)}
                              className={`px-3 py-1.5 rounded-xl border font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer ${
                                isDark 
                                  ? 'bg-slate-700 hover:bg-slate-650 border-slate-600 text-slate-200' 
                                  : 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-800'
                              }`}
                              title="View student profile and attendance details"
                            >
                              <FaUser className="text-[10px] text-purple-400" />
                              <span>Profile</span>
                            </button>
                            
                            {!f.isReplied ? (
                              <button
                                type="button"
                                onClick={() => handleOpenReplyModal(f)}
                                className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer border border-purple-400/40"
                                title="Open chat to reply directly to this student"
                              >
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"></span>
                                <FaComments className="text-xs text-purple-200" />
                                <span>Open Chat & Reply</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReplyModal(f)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer border ${
                                  isDark 
                                    ? 'bg-slate-700 hover:bg-slate-650 text-slate-200 border-slate-600' 
                                    : 'bg-slate-100 hover:bg-purple-100 text-slate-800 border-slate-200'
                                }`}
                                title="View conversation or send follow-up message"
                              >
                                <FaCheck className="text-[10px] text-emerald-400" />
                                <span>Replied • Open Chat</span>
                              </button>
                            )}
                          </div>

                          <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                            {f.createdAt || f.submittedAt ? new Date(f.createdAt || f.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* DIRECT REPLY MODAL TO STUDENT */}
        <LiveReplyModal
          isOpen={!!replyTarget}
          onClose={() => setReplyTarget(null)}
          replyTarget={replyTarget}
          lessonId={lessonId}
          onSuccess={fetchPostStreamFeedbacks}
        />

        {/* REACTED STUDENTS MODAL */}
        {selectedReactionModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn select-none">
            <div className="bg-white rounded-3xl border border-purple-200 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-900 max-h-[85vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-purple-100 pb-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                    {selectedReactionModal.emoji}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm sm:text-base font-black text-slate-900 truncate flex items-center gap-2">
                      <span>{selectedReactionModal.label}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                        {feedbacksData.feedbacks.filter(f => f.reaction === selectedReactionModal.id || (selectedReactionModal.id === 'crystal_clear' && (f.reaction === 'crystal_clear' || f.reaction === 'spot_on')) || f.reactionEmoji === selectedReactionModal.emoji).length} Reacted
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-medium">Students who reacted with {selectedReactionModal.emoji} for this class</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedReactionModal(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                >
                  <FaTimes className="text-sm" />
                </button>
              </div>

              {/* Students List */}
              <div className="overflow-y-auto space-y-2.5 custom-scrollbar pr-1 flex-1">
                {(() => {
                  const matchingStudents = feedbacksData.feedbacks.filter(f => 
                    f.reaction === selectedReactionModal.id || 
                    (selectedReactionModal.id === 'crystal_clear' && (f.reaction === 'crystal_clear' || f.reaction === 'spot_on')) ||
                    f.reactionEmoji === selectedReactionModal.emoji
                  );

                  if (matchingStudents.length === 0) {
                    return (
                      <div className="p-8 text-center space-y-2 text-slate-400">
                        <span className="text-4xl block">{selectedReactionModal.emoji}</span>
                        <p className="text-xs font-bold text-slate-600">No students have submitted this reaction yet.</p>
                        <p className="text-[11px] text-slate-400">When students submit {selectedReactionModal.label}, they will appear here.</p>
                      </div>
                    );
                  }

                  return matchingStudents.map((f, idx) => {
                    const studentId = f.student || f.studentId || f._id;
                    return (
                      <div 
                        key={f._id || idx} 
                        className="p-3 rounded-2xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          {/* Student Identity Clickable to open Profile */}
                          <div 
                            onClick={() => handleInspectStudent(f)}
                            className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                            title="Click to view student details"
                          >
                            {Boolean(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? (
                              <img 
                                src={getImageUrl(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar)} 
                                alt={f.studentName || f.name || 'Student'} 
                                referrerPolicy="no-referrer"
                                crossOrigin="anonymous"
                                className="w-8 h-8 rounded-full object-cover border border-purple-300 shadow-2xs shrink-0 group-hover:ring-2 group-hover:ring-purple-400 transition" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) {
                                    e.currentTarget.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs items-center justify-center shadow-2xs border border-purple-300 shrink-0 group-hover:ring-2 group-hover:ring-purple-400 transition ${(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? 'hidden' : 'flex'}`}>
                              {((f.studentName || f.name || 'S')[0]).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-black text-slate-900 group-hover:text-purple-700 truncate">
                                  {f.studentName || f.name || 'Student'}
                                </p>
                                {!f.isReplied && (
                                  <span 
                                    className="relative flex h-2 w-2 shrink-0" 
                                    title="Unreplied"
                                  >
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-medium truncate">
                                {f.studentEmail || f.email || (f.grade ? formatGrade(f.grade) : '')}
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleInspectStudent(f)}
                              className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                              title="View detailed student profile and courses"
                            >
                              <FaUser className="text-[9px] text-purple-600" />
                              <span>Profile</span>
                            </button>
                            
                            {!f.isReplied ? (
                              <button
                                type="button"
                                onClick={() => handleOpenReplyModal(f)}
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10.5px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                title="Direct reply to this student"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                <FaComments className="text-[9px] text-purple-200" />
                                <span>Reply</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenReplyModal(f)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-700 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200"
                                title="View conversation or send reply"
                              >
                                <FaCheck className="text-[8.5px] text-emerald-600" />
                                <span>Replied</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Optional Student Comment or Question if present */}
                        {(f.message || f.question) && (
                          <div className="p-2 rounded-xl bg-white border border-purple-100 text-[11px] text-slate-700 italic">
                            {f.question ? (
                              <span><strong className="text-amber-700 not-italic">Doubt:</strong> "{f.question}"</span>
                            ) : (
                              <span><strong className="text-purple-700 not-italic">Review:</strong> "{f.message}"</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end pt-2 border-t border-purple-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedReactionModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STUDENT PROFILE & DETAILS MODAL */}
        <StudentProfileModal
          isOpen={!!inspectStudent}
          onClose={() => setInspectStudent(null)}
          studentId={inspectStudent?.studentId}
          initialStudent={inspectStudent}
          containerScoped={false}
          onSelectPrivateChat={(sid) => {
            const targetFeedback = feedbacksData.feedbacks.find(f => (f.student === sid || f.studentId === sid || f._id === sid));
            if (targetFeedback) {
              handleOpenReplyModal(targetFeedback);
            }
          }}
        />

        {/* LIVE STREAM SUMMARY & VIEWERS MODAL */}
        <LiveViewersModal
          isOpen={showViewersModal}
          onClose={() => setShowViewersModal(false)}
          lessonId={activeFeedbackLessonId || lessonId}
          streamTitle={currentSessionTitle || liveStream?.title}
          grade={grade}
        />
      </div>
    );
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
    const doc = document;
    const isFs = Boolean(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    if (!isFs) {
      setShowChatBox(false); // Default to clean 100% full screen video
      const el = containerRef.current;
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      } else if (iframeRef.current && iframeRef.current.webkitEnterFullscreen) {
        try { iframeRef.current.webkitEnterFullscreen(); } catch (e) {}
      }
    } else {
      if (doc.exitFullscreen) {
        doc.exitFullscreen().catch(() => {});
      } else if (doc.webkitExitFullscreen) {
        doc.webkitExitFullscreen();
      } else if (doc.mozCancelFullScreen) {
        doc.mozCancelFullScreen();
      } else if (doc.msExitFullscreen) {
        doc.msExitFullscreen();
      }
    }
  };
  
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

            {/* Stream Ended Notification Overlay on Video (Visible for Students, Teachers & Admins) */}
            {isStreamEnded && (
              isTeacherOrAdmin ? (
                /* TEACHER & ADMIN POST-STREAM REACTIONS, DOUBTS & REVIEWS STUDIO */
                <div className="absolute inset-0 z-35 backdrop-blur-xl p-4 sm:p-6 overflow-y-auto animate-fadeIn select-none transition-colors duration-300 space-y-5 border bg-gradient-to-br from-[#faf9fe] via-white to-[#f5f2ff] border-purple-200 text-slate-900 shadow-2xl">
                  {/* Top Bar Header */}
                  <div className="space-y-3.5 border-b border-purple-200/80 pb-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3.5 sm:gap-4 w-full">
                      <div className="flex items-start gap-3 sm:gap-3.5 min-w-0 w-full lg:flex-1">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 text-white flex items-center justify-center text-xl sm:text-2xl shadow-md shadow-purple-900/20 border border-purple-300 shrink-0 mt-0.5">
                          <FaGraduationCap />
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <h3 className={`text-lg sm:text-2xl md:text-3xl font-black tracking-tight leading-snug break-words ${
                            isDark ? 'text-white' : 'text-slate-900'
                          }`}>
                            {currentSessionTitle}
                          </h3>

                          {/* Sleek, Modern, Unified Status & Metrics Bar */}
                          <div className="space-y-2 pt-0.5">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                              {/* Status: Concluded Live */}
                              <span className={`px-2.5 py-1 rounded-xl border text-[10px] sm:text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs shrink-0 whitespace-nowrap ${
                                isDark 
                                  ? 'bg-rose-950/40 border-rose-800/60 text-rose-300' 
                                  : 'bg-rose-50 border-rose-200 text-rose-700'
                              }`}>
                                <span className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e] shrink-0" />
                                <span>Concluded Live</span>
                              </span>

                              {/* Unified Live Summary Metrics Segmented Capsule */}
                              <div className={`flex items-center rounded-xl border shadow-2xs divide-x text-[11px] sm:text-xs font-bold transition-all shrink-0 max-w-full overflow-x-auto ${
                                isDark 
                                  ? 'bg-slate-800/90 border-slate-700 divide-slate-700 text-slate-200' 
                                  : 'bg-white border-slate-200/90 divide-slate-200 text-slate-700'
                              }`}>
                                {/* Students Watched (Non-clickable) */}
                                <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 select-none whitespace-nowrap shrink-0">
                                  <FaUsers className="text-emerald-600 dark:text-emerald-400 text-xs shrink-0" />
                                  <span>{viewersSummaryStats.totalViewersCount} Watched</span>
                                </div>

                                {/* Total Watched Duration (Non-clickable) */}
                                <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 select-none whitespace-nowrap shrink-0">
                                  <FaClock className="text-amber-500 text-xs shrink-0" />
                                  <span>
                                    {viewersSummaryStats.totalWatchedSeconds >= 3600
                                      ? `${(viewersSummaryStats.totalWatchedSeconds / 3600).toFixed(1)}h`
                                      : (viewersSummaryStats.totalWatchedSeconds > 0
                                          ? `${Math.round(viewersSummaryStats.totalWatchedSeconds / 60)}m`
                                          : (viewersSummaryStats.totalWatchedHours > 0 ? `${viewersSummaryStats.totalWatchedHours}h` : '0m'))}
                                  </span>
                                </div>

                                {/* Student Submissions */}
                                <div className="px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 text-purple-700 dark:text-purple-300 select-none whitespace-nowrap shrink-0">
                                  <FaCommentDots className="text-purple-500 text-xs shrink-0" />
                                  <span>{feedbacksData.totalFeedbacks} Submissions</span>
                                </div>
                              </div>

                              {/* Concluded Date Badge */}
                              {formattedEndedDate && (
                                <div className="flex items-center shrink-0">
                                  <div className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl border text-[11px] sm:text-xs font-bold flex items-center gap-1.5 sm:gap-2 shadow-2xs select-none shrink-0 whitespace-nowrap ${
                                    isDark 
                                      ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' 
                                      : 'bg-slate-50/90 border-slate-200/90 text-slate-700'
                                  }`}>
                                    <FaCalendarAlt className="text-purple-500 dark:text-purple-400 text-xs shrink-0" />
                                    <span className="text-[10px] sm:text-[10.5px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 shrink-0">
                                      Concluded:
                                    </span>
                                    <span className="font-extrabold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                                      {formattedEndedDate}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* TOP RIGHT CORNER CONTROLS */}
                      <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end justify-between lg:justify-start gap-2.5 shrink-0 w-full lg:w-auto pt-1 lg:pt-0">
                        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap w-full sm:w-auto">
                          {/* Change Live Session Dropdown Selector */}
                          <div className="relative flex-1 sm:flex-none" ref={sessionSelectorRef2}>
                            <button
                              type="button"
                              onClick={() => setShowLiveSessionSelector(!showLiveSessionSelector)}
                              className={`w-full sm:w-auto px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95 border whitespace-nowrap ${
                                isDark 
                                  ? 'bg-slate-800 hover:bg-slate-700 border-purple-500/60 text-purple-300' 
                                  : 'bg-white hover:bg-purple-50/80 border-purple-300 text-purple-900'
                              }`}
                              title="Select a concluded live session to inspect reactions and reviews"
                            >
                              <FaVideo className="text-purple-600 dark:text-purple-400 text-xs shrink-0" />
                              <span>Switch Live Session</span>
                              <FaChevronDown className={`text-[10px] text-purple-600 dark:text-purple-400 transition-transform shrink-0 ${showLiveSessionSelector ? 'rotate-180' : ''}`} />
                            </button>

                            {showLiveSessionSelector && (
                              <div className={`absolute left-0 sm:left-auto right-0 top-full mt-2 w-72 sm:w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-2.5 shadow-2xl z-50 animate-fadeIn space-y-1.5 border ${
                                isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-purple-200 text-slate-900'
                              }`}>
                                <div className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-b flex items-center justify-between ${
                                  isDark ? 'text-purple-300 border-slate-800' : 'text-purple-800 border-purple-100'
                                }`}>
                                  <span>Concluded Live Sessions</span>
                                  <span className="text-[9.5px] text-purple-400 font-bold">{grade || 'This Grade'}</span>
                                </div>

                                <div className="max-h-72 overflow-y-auto space-y-1.5 custom-scrollbar">
                                  {thisGradeConcludedSessions.length === 0 ? (
                                    <div className="p-3.5 text-center text-slate-400 text-xs font-medium">
                                      No previous live sessions found for {grade || 'this grade'}.
                                    </div>
                                  ) : (
                                    thisGradeConcludedSessions.map((s, idx) => {
                                      const isCurrent = s.isCurrent || (s.lessonId === (activeFeedbackLessonId || lessonId));

                                      // Format Date
                                      let dateStr = '';
                                      const dVal = s.endedAt || s.startedAt;
                                      if (dVal) {
                                        try {
                                          dateStr = new Date(dVal).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                                        } catch {}
                                      }
                                      if (!dateStr && formattedEndedDate) {
                                        dateStr = formattedEndedDate.split('•')[0].trim();
                                      }

                                      // Format Start & End Time
                                      let startStr = '';
                                      let endStr = '';
                                      if (s.startedAt) {
                                        try {
                                          startStr = new Date(s.startedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                        } catch {}
                                      }
                                      if (s.endedAt) {
                                        try {
                                          endStr = new Date(s.endedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                                        } catch {}
                                      } else if (!endStr && formattedEndedDate && formattedEndedDate.includes('•')) {
                                        endStr = formattedEndedDate.split('•')[1]?.trim() || '';
                                      }

                                      return (
                                        <button
                                          key={s.id || idx}
                                          type="button"
                                          onClick={() => {
                                            if (s.lessonId) {
                                              setActiveFeedbackLessonId(s.lessonId);
                                              fetchPostStreamFeedbacks(s.lessonId);
                                            }
                                            setShowLiveSessionSelector(false);
                                          }}
                                          className={`w-full text-left p-2.5 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                                            isCurrent
                                              ? isDark
                                                ? 'bg-purple-950/60 border-purple-500/80 text-white shadow-xs font-bold ring-1 ring-purple-500/40'
                                                : 'bg-purple-100 border-purple-400 text-purple-950 shadow-xs font-bold ring-1 ring-purple-400/40'
                                              : isDark
                                                ? 'bg-slate-800/80 border-slate-700 hover:bg-purple-950/40 text-slate-300'
                                                : 'bg-slate-50 border-slate-200 hover:bg-purple-50 text-slate-800'
                                          }`}
                                        >
                                          <div className="flex items-center justify-between gap-1.5">
                                            <p className={`font-extrabold text-xs truncate flex-1 ${isDark ? 'text-purple-200' : 'text-slate-900'}`}>
                                              {s.title}
                                            </p>
                                            {isCurrent && (
                                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_#a855f7] shrink-0" />
                                            )}
                                          </div>

                                          <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                                            {dateStr && (
                                              <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 shadow-2xs ${
                                                isDark ? 'bg-purple-950/60 border-purple-800/60 text-purple-300' : 'bg-purple-100/90 border-purple-200 text-purple-900'
                                              }`}>
                                                <FaCalendarAlt className="text-[8.5px] text-purple-400" />
                                                <span>{dateStr}</span>
                                              </span>
                                            )}

                                            {(startStr || endStr) && (
                                              <span className={`px-2 py-0.5 rounded-md border font-bold flex items-center gap-1 shadow-2xs ${
                                                isDark ? 'bg-amber-950/60 border-amber-800/60 text-amber-300' : 'bg-amber-100/90 border-amber-200 text-amber-900'
                                              }`}>
                                                <FaClock className="text-[8.5px] text-amber-500" />
                                                <span>
                                                  {startStr && endStr 
                                                    ? `${startStr} – ${endStr}` 
                                                    : (startStr ? `Start: ${startStr}` : `End: ${endStr}`)}
                                                </span>
                                              </span>
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => fetchPostStreamFeedbacks()}
                            disabled={isLoadingFeedbacks}
                            className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer shadow-xs border whitespace-nowrap ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 border-indigo-500/60 text-indigo-300' 
                                : 'bg-white hover:bg-indigo-50/80 border-indigo-300 text-indigo-900'
                            }`}
                            title="Refresh reviews and doubts"
                          >
                            <FaSync className={`text-xs text-indigo-600 dark:text-indigo-400 shrink-0 ${isLoadingFeedbacks ? 'animate-spin' : ''}`} />
                            <span>{isLoadingFeedbacks ? 'Syncing...' : 'Refresh Reviews'}</span>
                          </button>

                          {/* Expand / Collapse Button (Top-Most Right Corner) */}
                          <button
                            type="button"
                            onClick={() => setIsStudioCollapsed(!isStudioCollapsed)}
                            className={`flex-1 sm:flex-none px-3.5 sm:px-4 py-2 rounded-full text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer shadow-xs active:scale-95 border whitespace-nowrap ${
                              isDark 
                                ? 'bg-slate-800 hover:bg-slate-700 border-purple-500/60 text-purple-300' 
                                : 'bg-white hover:bg-purple-50/80 border-purple-300 text-purple-900'
                            }`}
                            title={isStudioCollapsed ? "Expand reviews & student feedback" : "Collapse reviews & student feedback"}
                          >
                            {isStudioCollapsed ? <FaChevronDown className="text-xs text-purple-500 shrink-0" /> : <FaChevronUp className="text-xs text-purple-500 shrink-0" />}
                            {hasUnrepliedFeedbacks && (
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                              </span>
                            )}
                            <span>{isStudioCollapsed ? 'Expand' : 'Collapse'}</span>
                          </button>
                        </div>

                        {/* Increased Size Unread Messages Button (Positioned Directly Under Expand or Inline on Mobile) */}
                        <div className="flex justify-start sm:justify-end w-full sm:w-auto pt-1 sm:pt-0">
                          {hasUnrepliedFeedbacks ? (
                            <span className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl border-2 text-xs sm:text-sm font-black flex items-center gap-2.5 shadow-md animate-pulse whitespace-nowrap shrink-0 ${
                              isDark 
                                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 shadow-emerald-950/60' 
                                : 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-emerald-900/10'
                            }`}>
                              <span className="relative flex h-2.5 w-2.5 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80" />
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                              </span>
                              <span>{unrepliedFeedbacksCount} Unread {unrepliedFeedbacksCount === 1 ? 'Message' : 'Messages'}</span>
                            </span>
                          ) : (
                            <span className={`px-4 py-2 sm:px-5 sm:py-2.5 rounded-2xl border text-xs sm:text-sm font-extrabold flex items-center gap-2 shadow-2xs select-none whitespace-nowrap shrink-0 ${
                              isDark 
                                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300' 
                                : 'bg-emerald-50 border-emerald-300/80 text-emerald-800'
                            }`}>
                              <FaCheck className="text-xs text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>0 Unread Messages</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reaction Summary Breakdown Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                    {[
                      { id: 'superb', emoji: '⭐', label: 'Superb Class', border: 'border-amber-200 bg-amber-50/70 text-amber-900' },
                      { id: 'understood', emoji: '💡', label: 'Understood', border: 'border-emerald-200 bg-emerald-50/70 text-emerald-900' },
                      { id: 'great_teaching', emoji: '👏', label: 'Great Teaching', border: 'border-purple-200 bg-purple-50/70 text-purple-900' },
                      { id: 'loved', emoji: '❤️', label: 'Loved Session', border: 'border-rose-200 bg-rose-50/70 text-rose-900' },
                      { id: 'inspiring', emoji: '🚀', label: 'Inspiring', border: 'border-blue-200 bg-blue-50/70 text-blue-900' },
                      { id: 'crystal_clear', emoji: '🎯', label: 'Spot On', border: 'border-orange-200 bg-orange-50/70 text-orange-900' }
                    ].map(item => {
                      const count = feedbacksData.reactionsSummary?.[item.id] || 0;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedReactionModal(item)}
                          className={`p-3 rounded-2xl border ${item.border} flex flex-col justify-between space-y-1.5 transition-all shadow-xs hover:shadow-md hover:scale-[1.03] active:scale-95 cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-purple-400 group`}
                          title={`Click to view students who reacted "${item.label}"`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-2xl transition-transform group-hover:scale-110">{item.emoji}</span>
                            <span className="px-2.5 py-0.5 rounded-full font-black text-xs border border-slate-300/80 bg-white text-slate-900 shadow-2xs">
                              {count}
                            </span>
                          </div>
                          <p className="text-[11px] font-extrabold truncate leading-tight mt-1 text-slate-800 flex items-center justify-between">
                            <span>{item.label}</span>
                            <span className="text-[9px] text-purple-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">View</span>
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Filter Tabs & Content */}
                  <div className="space-y-3.5 pt-1">
                    <div className="flex items-center justify-center gap-2.5 sm:gap-3 border-b border-purple-200/80 pb-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setFeedbackTab('all')}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer shadow-xs ${
                          feedbackTab === 'all'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-purple-900/20'
                            : 'bg-white hover:bg-purple-50 text-purple-950 border border-purple-200'
                        }`}
                      >
                        All Submissions ({feedbacksData.totalFeedbacks})
                      </button>

                      {/* UNREPLIED MESSAGES IDENTIFIER BUTTON */}
                      <button
                        type="button"
                        onClick={() => setFeedbackTab('unreplied')}
                        className={`px-4 py-2 rounded-xl font-black text-xs transition cursor-pointer flex items-center gap-2 shadow-xs ${
                          feedbackTab === 'unreplied'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-950/20 ring-2 ring-emerald-400'
                            : 'bg-white hover:bg-emerald-50 text-emerald-950 border border-emerald-300'
                        }`}
                        title="Filter to show only unreplied messages waiting for teacher response"
                      >
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                        </span>
                        <span>Unreplied Messages ({feedbacksData.unrepliedCount ?? feedbacksData.feedbacks.filter(f => !f.isReplied).length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFeedbackTab('questions')}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                          feedbackTab === 'questions'
                            ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-amber-900/20'
                            : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200'
                        }`}
                      >
                        <FaQuestionCircle className="text-xs" />
                        <span>Doubts & Questions ({feedbacksData.feedbacks.filter(f => f.question?.trim()).length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFeedbackTab('reviews')}
                        className={`px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-xs ${
                          feedbackTab === 'reviews'
                            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-900/20'
                            : 'bg-white hover:bg-indigo-50 text-indigo-900 border border-indigo-200'
                        }`}
                      >
                        <FaCommentDots className="text-xs" />
                        <span>Reviews & Feedback ({feedbacksData.feedbacks.filter(f => f.message?.trim()).length})</span>
                      </button>

                      {/* Live Session Summary Button (placed after the filter tabs) */}
                      <button
                        type="button"
                        onClick={() => setShowViewersModal(true)}
                        className="px-4 py-2 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs active:scale-95 border bg-emerald-50/90 hover:bg-emerald-100 border-emerald-300 text-emerald-950"
                        title="View live stream summary, duration, and viewers analytics"
                      >
                        <FaUsers className="text-emerald-600 text-xs" />
                        <span>Live Session Summary ({viewersSummaryStats.totalViewersCount})</span>
                      </button>
                    </div>

                    {/* Feedbacks Submissions List */}
                    {filteredFeedbacks.length === 0 ? (
                      <div className="border border-purple-200/80 rounded-2xl p-8 text-center space-y-2.5 bg-white shadow-xs">
                        <span className="text-4xl block">💬</span>
                        <p className="text-sm font-black text-slate-900">No student feedback found for this view.</p>
                        <p className="text-xs max-w-sm mx-auto font-medium text-slate-500">
                          {feedbackTab === 'unreplied' 
                            ? "Great job! All student doubts and feedback have been replied to."
                            : "Student reactions, doubts, and reviews for this live session will display here in real-time as students submit them."}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {filteredFeedbacks.map(f => (
                          <div key={f._id || f.createdAt} className="rounded-2xl p-4 space-y-3 shadow-xs transition-all border bg-white border-purple-200 hover:border-purple-400 hover:shadow-md">
                            <div className="flex items-center justify-between">
                              <div 
                                onClick={() => handleInspectStudent(f)}
                                className="flex items-center gap-3 min-w-0 cursor-pointer group"
                                title="Click to view student details"
                              >
                                {Boolean(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? (
                                  <img 
                                    src={getImageUrl(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar)} 
                                    alt={f.studentName || f.name || 'Student'} 
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    className="w-9 h-9 rounded-full object-cover border border-purple-300 shadow-2xs group-hover:ring-2 group-hover:ring-purple-400 transition shrink-0" 
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                      if (e.currentTarget.nextSibling) {
                                        e.currentTarget.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                  />
                                ) : null}
                                <div className={`w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs items-center justify-center shadow-2xs border border-purple-300 group-hover:ring-2 group-hover:ring-purple-400 transition shrink-0 ${(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? 'hidden' : 'flex'}`}>
                                  {((f.studentName || f.name || 'S')[0]).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs font-black truncate text-slate-900 group-hover:text-purple-700">
                                      {f.studentName || f.name || 'Student'}
                                    </p>
                                    {/* Green dot before reply to identify unreplied message */}
                                    {!f.isReplied && (
                                      <span 
                                        className="relative flex h-2.5 w-2.5 shrink-0" 
                                        title="Unreplied - Waiting for reply"
                                      >
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] truncate text-slate-500">
                                    {f.studentEmail || f.email || (f.grade ? formatGrade(f.grade) : '')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {/* Unreplied badge vs Replied badge */}
                                {!f.isReplied ? (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10px] font-black flex items-center gap-1 shadow-2xs animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                    <span>Unreplied</span>
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-extrabold flex items-center gap-1 shadow-2xs">
                                    <FaCheck className="text-[8.5px] text-purple-600" />
                                    <span>Replied</span>
                                  </span>
                                )}

                                <span className="px-2.5 py-1 rounded-xl border text-[10.5px] font-extrabold flex items-center gap-1 shadow-2xs bg-purple-50 border-purple-200 text-purple-900">
                                  <span>{f.reactionEmoji || '⭐'}</span>
                                  <span>{f.reactionLabel || 'Reaction'}</span>
                                </span>
                              </div>
                            </div>

                            {f.question?.trim() && (
                              <div className="rounded-2xl p-3 space-y-1 shadow-inner border bg-amber-50/90 border-amber-200 text-amber-950">
                                <span className="text-[10px] font-black uppercase text-amber-600 tracking-wider flex items-center gap-1">
                                  <FaQuestionCircle className="text-amber-600" /> Student Doubt / Question:
                                </span>
                                <p className="text-xs font-medium leading-relaxed">"{f.question}"</p>
                              </div>
                            )}

                            {f.message?.trim() && (
                              <div className="rounded-2xl p-3 space-y-1 shadow-inner border bg-purple-50/90 border-purple-200 text-purple-950">
                                <span className="text-[10px] font-black uppercase text-purple-700 tracking-wider flex items-center gap-1">
                                  <FaCommentDots className="text-purple-600" /> Class Review / Feedback:
                                </span>
                                <p className="text-xs font-medium leading-relaxed">"{f.message}"</p>
                              </div>
                            )}

                            {/* Teacher / Admin reply if already sent */}
                            {f.reply?.text && (() => {
                              const isReplyAdmin = f.reply?.role === 'admin' || f.reply?.repliedByRole === 'admin' || (typeof f.reply?.repliedBy === 'object' && f.reply?.repliedBy?.role === 'admin') || (f.reply?.repliedByName?.toLowerCase().includes('admin')) || (user?.role === 'admin' && !f.reply?.role);
                              return (
                                <div className={`rounded-2xl p-2.5 space-y-0.5 shadow-2xs border ${
                                  isReplyAdmin
                                    ? 'bg-blue-50/90 border-blue-200 text-blue-950'
                                    : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                                }`}>
                                  <span className={`text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                    isReplyAdmin ? 'text-blue-700' : 'text-emerald-700'
                                  }`}>
                                    <FaCheck className={`text-[9px] ${isReplyAdmin ? 'text-blue-600' : 'text-emerald-600'}`} /> 
                                    {isReplyAdmin ? 'Your Reply (Admin):' : 'Your Reply (Teacher):'}
                                  </span>
                                  <p className={`text-xs font-medium leading-relaxed ${
                                    isReplyAdmin ? 'text-blue-900' : 'text-emerald-900'
                                  }`}>"{f.reply.text}"</p>
                                </div>
                              );
                            })()}

                            <div className="flex items-center justify-between pt-1.5 border-t border-purple-100 text-[10px]">
                              <div className="flex items-center gap-2 flex-wrap">
                                <button
                                  type="button"
                                  onClick={() => handleInspectStudent(f)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer"
                                  title="View student profile and attendance details"
                                >
                                  <FaUser className="text-[10px] text-purple-600" />
                                  <span>Profile</span>
                                </button>
                                
                                {!f.isReplied ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReplyModal(f)}
                                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-xs transition active:scale-95 cursor-pointer border border-purple-400/40"
                                    title="Open chat to reply directly to this student"
                                  >
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] animate-pulse"></span>
                                    <FaComments className="text-xs text-purple-200" />
                                    <span>Open Chat & Reply</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenReplyModal(f)}
                                    className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-800 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition active:scale-95 cursor-pointer border border-slate-200"
                                    title="View conversation or send follow-up message"
                                  >
                                    <FaCheck className="text-[10px] text-emerald-600" />
                                    <span>Replied • Open Chat</span>
                                  </button>
                                )}
                              </div>

                              <span className="font-bold text-slate-500">
                                {f.createdAt || f.submittedAt ? new Date(f.createdAt || f.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* DIRECT REPLY MODAL TO STUDENT */}
                  <LiveReplyModal
                    isOpen={!!replyTarget}
                    onClose={() => setReplyTarget(null)}
                    replyTarget={replyTarget}
                    lessonId={lessonId}
                    onSuccess={fetchPostStreamFeedbacks}
                  />

                  {/* REACTED STUDENTS MODAL */}
                  {selectedReactionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fadeIn select-none">
                      <div className="bg-white rounded-3xl border border-purple-200 p-5 sm:p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in zoom-in-95 text-slate-900 max-h-[85vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between border-b border-purple-100 pb-3 shrink-0">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-11 h-11 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-center text-2xl shrink-0 shadow-2xs">
                              {selectedReactionModal.emoji}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-sm sm:text-base font-black text-slate-900 truncate flex items-center gap-2">
                                <span>{selectedReactionModal.label}</span>
                                <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold border border-purple-200">
                                  {feedbacksData.feedbacks.filter(f => f.reaction === selectedReactionModal.id || (selectedReactionModal.id === 'crystal_clear' && (f.reaction === 'crystal_clear' || f.reaction === 'spot_on')) || f.reactionEmoji === selectedReactionModal.emoji).length} Reacted
                                </span>
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium">Students who reacted with {selectedReactionModal.emoji} for this class</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedReactionModal(null)}
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer shrink-0"
                          >
                            <FaTimes className="text-sm" />
                          </button>
                        </div>

                        {/* Students List */}
                        <div className="overflow-y-auto space-y-2.5 custom-scrollbar pr-1 flex-1">
                          {(() => {
                            const matchingStudents = feedbacksData.feedbacks.filter(f => 
                              f.reaction === selectedReactionModal.id || 
                              (selectedReactionModal.id === 'crystal_clear' && (f.reaction === 'crystal_clear' || f.reaction === 'spot_on')) ||
                              f.reactionEmoji === selectedReactionModal.emoji
                            );

                            if (matchingStudents.length === 0) {
                              return (
                                <div className="p-8 text-center space-y-2 text-slate-400">
                                  <span className="text-4xl block">{selectedReactionModal.emoji}</span>
                                  <p className="text-xs font-bold text-slate-600">No students have submitted this reaction yet.</p>
                                  <p className="text-[11px] text-slate-400">When students submit {selectedReactionModal.label}, they will appear here.</p>
                                </div>
                              );
                            }

                            return matchingStudents.map((f, idx) => {
                              const studentId = f.student || f.studentId || f._id;
                              return (
                                <div 
                                  key={f._id || idx} 
                                  className="p-3 rounded-2xl border border-purple-100 bg-purple-50/40 hover:bg-purple-50 hover:border-purple-300 transition-all space-y-2"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    {/* Student Identity Clickable to open Profile */}
                                    <div 
                                      onClick={() => handleInspectStudent(f)}
                                      className="flex items-center gap-2.5 min-w-0 cursor-pointer group flex-1"
                                      title="Click to view student details"
                                    >
                                      {Boolean(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? (
                                        <img 
                                          src={getImageUrl(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar)} 
                                          alt={f.studentName || f.name || 'Student'} 
                                          referrerPolicy="no-referrer"
                                          crossOrigin="anonymous"
                                          className="w-8 h-8 rounded-full object-cover border border-purple-300 shadow-2xs shrink-0 group-hover:ring-2 group-hover:ring-purple-400 transition" 
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            if (e.currentTarget.nextSibling) {
                                              e.currentTarget.nextSibling.style.display = 'flex';
                                            }
                                          }}
                                        />
                                      ) : null}
                                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-white font-black text-xs items-center justify-center shadow-2xs border border-purple-300 shrink-0 group-hover:ring-2 group-hover:ring-purple-400 transition ${(f.studentProfilePicture || f.avatar || f.profilePicture || f.student?.profilePicture || f.student?.avatar) ? 'hidden' : 'flex'}`}>
                                        {((f.studentName || f.name || 'S')[0]).toUpperCase()}
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5">
                                          <p className="text-xs font-black text-slate-900 group-hover:text-purple-700 truncate">
                                            {f.studentName || f.name || 'Student'}
                                          </p>
                                          {!f.isReplied && (
                                            <span 
                                              className="relative flex h-2 w-2 shrink-0" 
                                              title="Unreplied"
                                            >
                                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium truncate">
                                          {f.studentEmail || f.email || (f.grade ? formatGrade(f.grade) : '')}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => handleInspectStudent(f)}
                                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-purple-100 border border-purple-200 text-purple-800 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-2xs"
                                        title="View detailed student profile and courses"
                                      >
                                        <FaUser className="text-[9px] text-purple-600" />
                                        <span>Profile</span>
                                      </button>

                                      {!f.isReplied ? (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenReplyModal(f)}
                                          className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[10.5px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                                          title="Direct reply to this student"
                                        >
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                          <FaComments className="text-[9px] text-purple-200" />
                                          <span>Reply</span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleOpenReplyModal(f)}
                                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-purple-100 text-slate-700 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer border border-slate-200"
                                          title="View conversation or send reply"
                                        >
                                          <FaCheck className="text-[8.5px] text-emerald-600" />
                                          <span>Replied</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Optional Student Comment or Question if present */}
                                  {(f.message || f.question) && (
                                    <div className="p-2 rounded-xl bg-white border border-purple-100 text-[11px] text-slate-700 italic">
                                      {f.question ? (
                                        <span><strong className="text-amber-700 not-italic">Doubt:</strong> "{f.question}"</span>
                                      ) : (
                                        <span><strong className="text-purple-700 not-italic">Review:</strong> "{f.message}"</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            });
                          })()}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex justify-end pt-2 border-t border-purple-100 shrink-0">
                          <button
                            type="button"
                            onClick={() => setSelectedReactionModal(null)}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STUDENT PROFILE & DETAILS MODAL */}
                  <StudentProfileModal
                    isOpen={!!inspectStudent}
                    onClose={() => setInspectStudent(null)}
                    studentId={inspectStudent?.studentId}
                    initialStudent={inspectStudent}
                    containerScoped={false}
                    onSelectPrivateChat={(sid) => {
                      const targetFeedback = feedbacksData.feedbacks.find(f => (f.student === sid || f.studentId === sid || f._id === sid));
                      if (targetFeedback) {
                        handleOpenReplyModal(targetFeedback);
                      }
                    }}
                  />
                </div>
            ) : (
                /* STUDENT POST-STREAM CONCLUDED CARD */
                <div className="absolute inset-0 z-35 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-6 text-center animate-fadeIn select-none">
                  <div className="bg-slate-900 rounded-3xl border border-purple-500/30 p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95 text-white">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-600/30 to-indigo-600/30 border border-purple-400/40 flex items-center justify-center text-2xl shadow-inner text-purple-300">
                      <FaGraduationCap />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-lg font-black text-white">Live Class Concluded</h4>
                      <div className="bg-slate-950/80 p-3.5 rounded-2xl border border-slate-800 text-left space-y-1.5">
                        <p className="font-bold text-amber-300 text-xs flex items-center gap-1.5">
                          <span>✅</span> Lecture ended for "{liveStream?.title || 'Live Stream'}".
                        </p>
                        <p className="text-slate-300 text-xs leading-relaxed">
                          Thank you for attending! Please share your reaction, feedback, or any questions for the teacher.
                        </p>
                      </div>
                    </div>

                    <div className="pt-1 flex flex-col gap-2">
                      {isStudent && (
                        <button
                          type="button"
                          onClick={() => setShowFeedbackModal(true)}
                          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm shadow-xl shadow-purple-950/40 cursor-pointer transition active:scale-95 flex items-center justify-center gap-2"
                        >
                          <FaStar className="text-amber-300" />
                          <span>Leave Feedback & Ask Questions</span>
                        </button>
                      )}
                      <p className="text-[11px] text-slate-400 font-medium">
                        The recording will also be available in your lesson video library.
                      </p>
                    </div>
                  </div>
                </div>
              )
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
            ? `absolute bottom-6 left-1/2 -translate-x-1/2 w-[95%] max-w-5xl z-40 bg-slate-950/95 backdrop-blur-3xl border border-purple-500/35 rounded-3xl px-4 py-3 sm:px-6 sm:py-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.9),0_0_25px_rgba(147,51,234,0.2)] flex items-center justify-between gap-3 sm:gap-6 flex-nowrap transition-all duration-300 ${
                controlsVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
              }`
            : "bg-slate-950/90 backdrop-blur-2xl border border-purple-500/30 hover:border-purple-500/50 rounded-2xl sm:rounded-3xl p-2 sm:p-3 shadow-[0_8px_30px_rgba(0,0,0,0.8),0_0_20px_rgba(147,51,234,0.15)] hover:shadow-[0_10px_35px_rgba(0,0,0,0.9),0_0_25px_rgba(147,51,234,0.25)] flex flex-wrap sm:grid sm:grid-cols-[1fr_auto_1fr] items-center justify-between gap-2 sm:gap-4 transition-all duration-300 transform hover:scale-[1.004]"
        }
      >
        {/* Col 1: Left Wing - LIVE / GO LIVE Button (Aligned Left) */}
        <div className="flex items-center justify-start min-w-0">
          <button
            type="button"
            onClick={handleGoLive}
            className={`font-black flex items-center gap-1.5 sm:gap-2 shadow-md active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 cursor-pointer backdrop-blur-md border shrink-0 group touch-manipulation ${
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
        <div className="flex items-center justify-center gap-1.5 sm:gap-3 shrink-0">
          {/* Left: Compact Q&A / Live Chat Button */}
          {lessonId && (
            <button
              type="button"
              onClick={() => setShowChatBox(!showChatBox)}
              className={`relative font-bold flex items-center justify-center gap-1.5 shadow-lg active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 cursor-pointer backdrop-blur-md border group shrink-0 touch-manipulation ${
                isFullscreen 
                  ? 'h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl text-xs' 
                  : 'h-8 sm:h-8.5 px-2 sm:px-3 rounded-lg sm:rounded-xl text-[10.5px] sm:text-[11px]'
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
            className={`font-black flex items-center justify-center gap-1.5 sm:gap-2.5 shadow-2xl active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 cursor-pointer backdrop-blur-md border-2 group shrink-0 touch-manipulation ${
              isFullscreen 
                ? 'h-12 sm:h-13 px-7 sm:px-9 rounded-2xl text-sm sm:text-base md:text-lg' 
                : 'h-9.5 sm:h-10.5 px-3.5 sm:px-5.5 rounded-2xl text-xs sm:text-sm font-black'
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
            className={`font-bold flex items-center justify-center shadow-lg active:scale-95 transition-all duration-200 hover:-translate-y-0.5 hover:scale-110 cursor-pointer backdrop-blur-md border group shrink-0 touch-manipulation ${
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
        <div className="flex items-center justify-end gap-1 sm:gap-2 min-w-0">
          <div className={`flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 hover:bg-slate-850 rounded-xl sm:rounded-2xl border border-purple-500/30 hover:border-purple-400/60 transition-all shadow-md group shrink-0 ${
            isFullscreen ? 'px-3 py-1.5' : 'px-1.5 sm:px-2 py-1'
          }`}>
            <button
              type="button"
              onClick={toggleMute}
              className="text-purple-300 hover:text-white transition cursor-pointer p-0.5 shrink-0 touch-manipulation"
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
            
            {/* Compact Volume Slider (Hidden on mobile phones < sm to prevent overlapping, visible on desktop/tablets) */}
            <input
              type="range"
              min="0"
              max="100"
              value={currentVolPercentage}
              onChange={handleVolumeChange}
              style={{
                background: `linear-gradient(to right, #9333ea 0%, #c084fc ${currentVolPercentage}%, #334155 ${currentVolPercentage}%, #334155 100%)`
              }}
              className={`rounded-lg appearance-none cursor-pointer accent-purple-400 hover:accent-purple-300 transition-all shadow-inner touch-manipulation hidden sm:inline-block ${
                isFullscreen ? 'w-16 sm:w-24 h-2' : 'w-10 sm:w-14 h-1.5'
              }`}
              title={`Volume: ${currentVolPercentage}%`}
            />

            <span className={`font-mono font-bold text-purple-200 text-right select-none hidden sm:inline-block ${isFullscreen ? 'text-xs w-6' : 'text-[9.5px] sm:text-[10px] w-4 sm:w-5'}`}>
              {currentVolPercentage}%
            </span>
          </div>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleNativeFullscreen}
            className={`bg-slate-900/90 hover:bg-purple-900/70 border border-purple-500/30 hover:border-purple-400/70 shadow-md backdrop-blur-md flex items-center justify-center text-purple-300 hover:text-white transition-all duration-200 cursor-pointer active:scale-95 group shrink-0 touch-manipulation ${
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

      {/* REAL-TIME INTERACTIVE MESSAGE BAR AT BOTTOM OF BUTTON BAR (Controlled by Left Chat Button - Only active during live stream) */}
      {!isFullscreen && lessonId && liveStream?.isLive && (
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
            endedAt={liveStream?.endedAt || liveStream?.ended_at}
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
                endedAt={liveStream?.endedAt || liveStream?.ended_at}
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
          lessonId={activeFeedbackLessonId || lessonId}
          grade={grade}
          streamTitle={currentSessionTitle || liveStream?.title}
        />
      )}
    </div>
  );
};

export default LiveStreamPlayer;

