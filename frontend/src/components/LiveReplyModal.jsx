/**
 * @file LiveReplyModal.jsx
 * @description Live Question Reply Modal. Allows instructors during a live stream to view, listen to student voice questions, and record audio/text replies.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  FaTimes, 
  FaMicrophone, 
  FaCamera, 
  FaImage, 
  FaPaperclip, 
  FaFileAlt, 
  FaPlay, 
  FaPause, 
  FaTrash, 
  FaCheck, 
  FaSync,
  FaPaperPlane,
  FaComments,
  FaSmile
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { getMediaUrl } from '../utils/mediaUrl';
import { useTheme } from '../context/ThemeContext';
import CameraCaptureModal from './CameraCaptureModal';

const QUICK_RESPONSES = [
  { text: "Great question! We will cover this in detail in our next class.", emoji: "🎓", label: "Cover in Next Class" },
  { text: "Thank you for the wonderful feedback! Keep up the great work!", emoji: "⭐", label: "Appreciation" },
  { text: "I've made a note of your doubt and will share extra reading notes soon.", emoji: "📚", label: "Extra Notes" },
  { text: "Well done! Perfect understanding of today's lesson.", emoji: "👏", label: "Well Done" },
  { text: "Please review the lesson slides before our next session.", emoji: "📖", label: "Review Slides" }
];

const QUICK_EMOJIS = [
  { emoji: "👍", code: "1f44d", name: "Thumbs Up" },
  { emoji: "❤️", code: "2764-fe0f", name: "Heart" },
  { emoji: "⭐", code: "2b50", name: "Star" },
  { emoji: "💡", code: "1f4a1", name: "Idea" },
  { emoji: "👏", code: "1f44f", name: "Clap" },
  { emoji: "🎯", code: "1f3af", name: "Target" },
  { emoji: "🚀", code: "1f680", name: "Rocket" },
  { emoji: "📚", code: "1f4da", name: "Books" },
  { emoji: "🔥", code: "1f525", name: "Fire" },
  { emoji: "🎓", code: "1f393", name: "Graduation" },
  { emoji: "✅", code: "2705", name: "Checkmark" },
  { emoji: "💯", code: "1f4af", name: "100" },
  { emoji: "😊", code: "1f60a", name: "Smile" },
  { emoji: "🙌", code: "1f64c", name: "Celebration" }
];

// Ultra-High Definition Apple / Retina 160px Emoji Asset URL
const getHighResEmojiUrl = (code) => {
  if (!code) return '';
  return `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160/${code}.png`;
};

// Check if string contains only emoji graphemes/spaces for giant sticker chat rendering
const isOnlyEmoji = (text) => {
  if (!text || typeof text !== 'string') return false;
  const trimmed = text.trim();
  if (!trimmed) return false;
  const emojiRegex = /^(\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji_Modifier_Base}|\p{Emoji_Component}|\s)+$/u;
  return emojiRegex.test(trimmed) && trimmed.length <= 20;
};

// Get matching Apple code for high-res rendering
const getEmojiAppleCode = (text) => {
  if (!text) return null;
  const trimmed = text.trim();
  const match = QUICK_EMOJIS.find(item => item.emoji === trimmed);
  return match ? match.code : null;
};

const LiveReplyModal = ({ 
  isOpen, 
  onClose, 
  replyTarget, 
  lessonId, 
  onSuccess 
}) => {
  const { isDark } = useTheme();
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const currentUserRole = (currentUser?.role || '').toLowerCase();
  const isCurrentAdmin = currentUserRole === 'admin' || currentUserRole === 'superadmin';

  // Role of the person who replied previously (if existing)
  const isPreviousReplyAdmin = useMemo(() => {
    if (!replyTarget?.reply) return isCurrentAdmin;
    const r = replyTarget.reply;
    const rawRole = (r.role || r.repliedByRole || (typeof r.repliedBy === 'object' && r.repliedBy?.role) || (r.repliedByName?.toLowerCase().includes('admin') ? 'admin' : (isCurrentAdmin ? 'admin' : 'teacher')) || '').toLowerCase();
    return rawRole === 'admin' || rawRole === 'superadmin';
  }, [replyTarget?.reply, isCurrentAdmin]);

  // File & Camera Attachments
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  // Voice Note Recording
  const [voiceBlob, setVoiceBlob] = useState(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceTimer, setVoiceTimer] = useState(0);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const mediaRecorderRef = useRef(null);
  const voiceChunksRef = useRef([]);
  const voiceStreamRef = useRef(null);
  const voiceTimerIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const sendImmediatelyRef = useRef(false);

  // Reset states when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      cleanupAll();
    }
  }, [isOpen]);

  const cleanupAll = () => {
    cancelVoiceRecording();
    removeAttachedFile();
    setReplyText('');
    setIsSending(false);
  };

  // --- VOICE RECORDING LOGIC ---
  const startVoiceRecording = async () => {
    try {
      if (attachedFile) {
        removeAttachedFile();
      }
      sendImmediatelyRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      voiceStreamRef.current = stream;
      voiceChunksRef.current = [];

      let mime = 'audio/webm';
      if (typeof MediaRecorder !== 'undefined') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mime = 'audio/webm;codecs=opus';
        else if (MediaRecorder.isTypeSupported('audio/mp4')) mime = 'audio/mp4';
      }

      const recorder = new MediaRecorder(stream, { mimeType: mime });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          voiceChunksRef.current.push(e.data);
        }
      };

      const startTime = Date.now();
      recorder.onstop = () => {
        const finalBlob = new Blob(voiceChunksRef.current, { type: mime });
        const duration = Math.max(1, Math.round((Date.now() - startTime) / 1000));
        setVoiceBlob(finalBlob);
        setVoiceDuration(duration);
        setIsRecordingVoice(false);
        if (voiceTimerIntervalRef.current) {
          clearInterval(voiceTimerIntervalRef.current);
          voiceTimerIntervalRef.current = null;
        }
        if (voiceStreamRef.current) {
          voiceStreamRef.current.getTracks().forEach(t => t.stop());
          voiceStreamRef.current = null;
        }
        if (sendImmediatelyRef.current) {
          sendImmediatelyRef.current = false;
          executeSend(finalBlob);
        }
      };

      recorder.start(250);
      setIsRecordingVoice(true);
      setVoiceTimer(0);

      voiceTimerIntervalRef.current = setInterval(() => {
        setVoiceTimer(prev => {
          if (prev >= 120) { // Max 2 minutes
            recorder.stop();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone permission is required to record a voice note.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (voiceTimerIntervalRef.current) {
      clearInterval(voiceTimerIntervalRef.current);
      voiceTimerIntervalRef.current = null;
    }
  };

  const cancelVoiceRecording = () => {
    sendImmediatelyRef.current = false;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      try { mediaRecorderRef.current.stop(); } catch(e) {}
    }
    if (voiceStreamRef.current) {
      voiceStreamRef.current.getTracks().forEach(t => t.stop());
      voiceStreamRef.current = null;
    }
    if (voiceTimerIntervalRef.current) {
      clearInterval(voiceTimerIntervalRef.current);
      voiceTimerIntervalRef.current = null;
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setVoiceBlob(null);
    setVoiceDuration(0);
    setVoiceTimer(0);
    setIsRecordingVoice(false);
    setIsPlayingVoice(false);
  };

  const handleSendVoiceImmediately = () => {
    sendImmediatelyRef.current = true;
    stopVoiceRecording();
  };

  const toggleVoicePlayback = () => {
    if (!voiceBlob) return;
    if (!audioPreviewRef.current) {
      const audioUrl = URL.createObjectURL(voiceBlob);
      const audio = new Audio(audioUrl);
      audioPreviewRef.current = audio;
      audio.onended = () => setIsPlayingVoice(false);
      audio.onerror = () => setIsPlayingVoice(false);
    }
    if (isPlayingVoice) {
      audioPreviewRef.current.pause();
      setIsPlayingVoice(false);
    } else {
      audioPreviewRef.current.play().catch(() => setIsPlayingVoice(false));
      setIsPlayingVoice(true);
    }
  };

  // --- FILE & IMAGE ATTACHMENT LOGIC ---
  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (voiceBlob || isRecordingVoice) {
      cancelVoiceRecording();
    }

    const isImage = file.type.startsWith('image/');
    const maxImgSize = 5 * 1024 * 1024;
    const maxDocSize = 10 * 1024 * 1024;

    if (isImage && file.size > maxImgSize) {
      toast.error("Image file size exceeds the 5MB limit.");
      return;
    }
    if (!isImage && file.size > maxDocSize) {
      toast.error("Document size exceeds the 10MB limit.");
      return;
    }

    setAttachedFile(file);
    if (isImage) {
      const preview = URL.createObjectURL(file);
      setFilePreview(preview);
    } else {
      setFilePreview(null);
    }
  };

  const removeAttachedFile = () => {
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handlePhotoCaptured = (dataUrl) => {
    if (voiceBlob || isRecordingVoice) {
      cancelVoiceRecording();
    }
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setAttachedFile(file);
        setFilePreview(dataUrl);
        setShowCamera(false);
      })
      .catch(err => {
        console.error("Error processing captured camera photo:", err);
        setShowCamera(false);
      });
  };

  // --- SENDING REPLY LOGIC ---
  const executeSend = async (overrideVoiceBlob = null) => {
    const activeVoice = overrideVoiceBlob || voiceBlob;
    const hasText = Boolean(replyText.trim());
    const hasFile = Boolean(attachedFile);
    const hasVoice = Boolean(activeVoice);

    if (!replyTarget || (!hasText && !hasFile && !hasVoice)) {
      toast.error("Please enter a reply message, voice note, or attach a file.");
      return;
    }

    const targetStudentId = replyTarget.studentId || (typeof replyTarget.student === 'object' ? replyTarget.student?._id : replyTarget.student) || replyTarget._id;

    if (!targetStudentId) {
      toast.error("Could not identify the target student.");
      return;
    }

    setIsSending(true);
    try {
      if (hasFile || hasVoice) {
        const formData = new FormData();
        formData.append('recipientId', String(targetStudentId));
        formData.append('content', replyText.trim() || (hasVoice ? '🎙️ Voice Note from Teacher' : '📎 Attachment from Teacher'));

        if (attachedFile) {
          formData.append('attachment', attachedFile);
        } else if (activeVoice) {
          const voiceFile = new File([activeVoice], `voice-note-${Date.now()}.webm`, { type: activeVoice.type || 'audio/webm' });
          formData.append('attachment', voiceFile);
        }

        // 1. Direct Message
        await api.post('/messages/send', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        // 2. Sync to Live Stream Class Chat
        if (lessonId) {
          try {
            const chatFormData = new FormData();
            chatFormData.append('text', replyText.trim() || (hasVoice ? '🎙️ Voice Note' : '📎 Attachment'));
            chatFormData.append('studentId', String(targetStudentId));
            chatFormData.append('isBroadcast', 'false');
            if (attachedFile) {
              chatFormData.append('file', attachedFile);
            } else if (activeVoice) {
              const voiceFile = new File([activeVoice], `voice-${Date.now()}.webm`, { type: activeVoice.type || 'audio/webm' });
              chatFormData.append('file', voiceFile);
            }
            await api.post(`/lessons/${lessonId}/live-stream/messages`, chatFormData, {
              headers: { 'Content-Type': 'multipart/form-data' }
            });
            await api.post(`/lessons/${lessonId}/live-stream/feedbacks/reply`, {
              feedbackId: replyTarget.feedbackId,
              studentId: String(targetStudentId),
              text: replyText.trim() || (hasVoice ? '🎙️ Voice Note' : '📎 Attachment')
            });
          } catch (chatErr) {
            console.warn("Live stream chat sync notification:", chatErr);
          }
        }
      } else {
        // Text / Emoji direct message
        await api.post('/messages/send', {
          recipientId: String(targetStudentId),
          content: replyText.trim()
        });

        if (lessonId) {
          try {
            await api.post(`/lessons/${lessonId}/live-stream/messages`, {
              text: replyText.trim(),
              studentId: String(targetStudentId),
              isBroadcast: false
            });
            await api.post(`/lessons/${lessonId}/live-stream/feedbacks/reply`, {
              feedbackId: replyTarget.feedbackId,
              studentId: String(targetStudentId),
              text: replyText.trim() || 'Sent direct message'
            });
          } catch (chatErr) {
            console.warn("Live stream chat sync notification:", chatErr);
          }
        }
      }

      if (lessonId) {
        try {
          await api.post(`/lessons/${lessonId}/live-stream/feedbacks/reply`, {
            feedbackId: replyTarget.feedbackId,
            studentId: String(targetStudentId),
            text: replyText.trim() || (hasVoice ? '🎙️ Voice Note' : 'Replied')
          });
        } catch (e) {}
      }

      toast.success(`Reply sent to ${replyTarget.studentName || 'student'} successfully!`);
      cleanupAll();
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("Failed to send reply", err);
      toast.error(err.response?.data?.message || err.response?.data?.error || "Failed to send reply to student.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSend = () => executeSend(null);

  if (!isOpen || !replyTarget) return null;

  const targetName = replyTarget.studentName || replyTarget.name || 'Student';
  const targetPic = replyTarget.studentProfilePicture || replyTarget.avatar || replyTarget.profilePicture || replyTarget.studentAvatar || '';
  const isOnlyEmojiText = isOnlyEmoji(replyText);

  return (
    <>
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none overflow-y-auto">
        <div className={`rounded-3xl border max-w-xl sm:max-w-2xl w-full shadow-2xl overflow-hidden animate-in zoom-in-95 my-auto flex flex-col max-h-[92vh] transition-colors ${
          isDark ? 'bg-[#111b21] border-slate-750 text-slate-100 shadow-slate-950/70' : 'bg-white border-slate-200 text-slate-900 shadow-xl'
        }`}>
          
          {/* 1. WHATSAPP CHAT HEADER */}
          <div className="px-4 sm:px-5 py-3.5 bg-[#008069] dark:bg-[#1f2c34] text-white flex items-center justify-between gap-3 shrink-0 shadow-sm">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative shrink-0">
                {targetPic ? (
                  <img
                    src={getMediaUrl(targetPic)}
                    alt={targetName}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-white/50 shadow-xs"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-emerald-700 to-teal-800 text-white font-bold text-base items-center justify-center shadow-xs border-2 border-white/50 ${targetPic ? 'hidden' : 'flex'}`}>
                  {(targetName.charAt(0) || 'S').toUpperCase()}
                </div>
                {/* Active Live Student Online Dot */}
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white dark:border-[#1f2c34] shadow-xs" />
              </div>

              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-bold text-white truncate leading-tight">
                  {targetName}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-emerald-100/90 dark:text-slate-400 font-medium truncate mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                  <span>Live Student • Direct Reply</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="Close chat"
            >
              <FaTimes className="text-sm" />
            </button>
          </div>

          {/* 2. WHATSAPP CHAT THREAD (WALLPAPER BACKGROUND) */}
          <div className={`p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar min-h-[220px] max-h-[460px] ${
            isDark 
              ? 'bg-[#0b141a]' 
              : 'bg-[#efeae2] bg-[radial-gradient(#d1d7db_1px,transparent_1px)] [background-size:16px_16px]'
          }`}>
            {/* Timestamp pill in center */}
            <div className="flex justify-center">
              <span className={`px-3 py-0.5 rounded-lg text-[10.5px] font-bold shadow-2xs ${
                isDark ? 'bg-[#182229] text-slate-400' : 'bg-white/85 text-slate-600'
              }`}>
                Live Broadcast Feedback Thread
              </span>
            </div>

            {/* INCOMING CHAT BUBBLE: STUDENT QUESTION / MESSAGE / REACTION */}
            <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%] animate-fadeIn">
              {/* Student Small Avatar next to their bubble */}
              <div className="relative shrink-0 mt-1">
                {targetPic ? (
                  <img
                    src={getMediaUrl(targetPic)}
                    alt={targetName}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                    className="w-7 h-7 rounded-full object-cover border border-white/50 shadow-2xs"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div className={`w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-700 text-white font-bold text-xs items-center justify-center shadow-2xs border border-purple-300 ${targetPic ? 'hidden' : 'flex'}`}>
                  {(targetName.charAt(0) || 'S').toUpperCase()}
                </div>
              </div>

              {/* Student Theme Container: Purple Border & Accents */}
              <div className={`p-3.5 sm:p-4 rounded-2xl rounded-tl-xs shadow-xs border border-l-4 border-l-purple-500 space-y-2 relative flex-1 ${
                isDark 
                  ? 'bg-[#1f2c34] border-purple-900/60 text-slate-100' 
                  : 'bg-white border-purple-200/90 text-slate-900'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-black text-purple-700 dark:text-purple-300 truncate">
                      {targetName}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 shrink-0">
                      Student
                    </span>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                    replyTarget.question 
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300' 
                      : replyTarget.message
                        ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300'
                        : 'bg-purple-100 dark:bg-purple-950/70 border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200'
                  }`}>
                    {replyTarget.question 
                      ? '❓ Question / Doubt' 
                      : replyTarget.message 
                        ? '💬 Class Review' 
                        : (replyTarget.reactionEmoji ? `${replyTarget.reactionEmoji} Live Reaction` : '✨ Student Reaction')}
                  </span>
                </div>

                {/* If text question or message is present */}
                {(replyTarget.question || replyTarget.message) ? (
                  <p className="text-sm sm:text-[15px] font-medium leading-relaxed whitespace-pre-wrap">
                    "{replyTarget.question || replyTarget.message}"
                  </p>
                ) : (
                  /* Student Live Reaction Box with Purple Student Theme */
                  <div className={`p-3 rounded-xl border flex items-center gap-3 ${
                    isDark 
                      ? 'bg-gradient-to-br from-purple-950/40 via-slate-800/80 to-slate-800/60 border-purple-800/70 text-slate-200' 
                      : 'bg-gradient-to-br from-purple-50/80 via-white to-purple-50/40 border-purple-200/90 text-purple-950'
                  }`}>
                    <span className="text-3xl filter drop-shadow-sm shrink-0">
                      {replyTarget.reactionEmoji || '💡'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-black text-sm text-purple-950 dark:text-purple-200">
                        {replyTarget.reactionLabel || 'Understood Everything'}
                      </p>
                      <p className="text-xs text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                        Reacted to this live broadcast
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                  {(replyTarget.question || replyTarget.message) && (replyTarget.reactionEmoji || replyTarget.reactionLabel) ? (
                    <span className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                      isDark 
                        ? 'bg-purple-950/60 border-purple-800 text-purple-300' 
                        : 'bg-purple-50 border-purple-200 text-purple-800'
                    }`}>
                      <span>{replyTarget.reactionEmoji || '💡'}</span>
                      <span>{replyTarget.reactionLabel || 'Understood'}</span>
                    </span>
                  ) : <span />}

                  <span className="ml-auto font-mono text-[9.5px]">
                    {replyTarget.submittedAt || replyTarget.createdAt 
                      ? new Date(replyTarget.submittedAt || replyTarget.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                      : 'Live'}
                  </span>
                </div>
              </div>
            </div>

            {/* PREVIOUS TEACHER / ADMIN REPLY BUBBLE (IF ALREADY REPLIED) */}
            {replyTarget.reply?.text && (
              <div className="flex items-end justify-end ml-auto max-w-[90%] sm:max-w-[85%]">
                <div className={`p-3.5 sm:p-4 rounded-2xl rounded-tr-xs shadow-xs space-y-1.5 border border-r-4 ${
                  isPreviousReplyAdmin
                    ? (isDark 
                        ? 'bg-blue-950/80 border-blue-700 text-white border-r-blue-500' 
                        : 'bg-[#e0f2fe] text-blue-950 border-blue-300 border-r-blue-600')
                    : (isDark 
                        ? 'bg-[#005c4b] border-emerald-600 text-white border-r-emerald-500' 
                        : 'bg-[#d9fdd3] text-emerald-950 border-emerald-300 border-r-emerald-500')
                }`}>
                  <div className="flex items-center justify-between gap-3 text-[10px] font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full animate-pulse ${isPreviousReplyAdmin ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                      <span className={`font-black ${isPreviousReplyAdmin ? 'text-blue-950 dark:text-blue-100' : 'text-emerald-950 dark:text-emerald-100'}`}>
                        {isPreviousReplyAdmin ? 'You (Admin)' : 'You (Teacher)'}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded-md text-[8.5px] font-black uppercase tracking-wider text-white shadow-2xs ${
                        isPreviousReplyAdmin ? 'bg-blue-600' : 'bg-emerald-700'
                      }`}>
                        {isPreviousReplyAdmin ? 'Admin' : 'Teacher'}
                      </span>
                    </div>
                    <span className={`text-[9px] uppercase tracking-wider font-extrabold ${
                      isPreviousReplyAdmin ? 'text-blue-700 dark:text-blue-300' : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      ✓ Replied
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">
                    {replyTarget.reply.text}
                  </p>
                </div>
              </div>
            )}

            {/* ATTACHMENT PREVIEW INSIDE CHAT (PHOTO / DOCUMENT) */}
            {(attachedFile || filePreview) && (
              <div className="flex items-end justify-end ml-auto max-w-[90%] sm:max-w-[85%] animate-fadeIn">
                <div className={`p-2.5 rounded-2xl rounded-tr-xs shadow-xs border relative ${
                  isDark ? 'bg-[#005c4b] border-emerald-700/60 text-white' : 'bg-[#d9fdd3] border-emerald-300 text-slate-900'
                }`}>
                  {filePreview ? (
                    <div className="relative">
                      <img 
                        src={filePreview} 
                        alt="Preview" 
                        className="w-48 h-32 object-cover rounded-xl border border-black/10" 
                      />
                      <button
                        type="button"
                        onClick={removeAttachedFile}
                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow-md hover:bg-rose-700 cursor-pointer"
                        title="Remove attachment"
                      >
                        <FaTimes />
                      </button>
                    </div>
                  ) : attachedFile ? (
                    <div className="flex items-center gap-2 p-1">
                      <FaFileAlt className="text-xl text-emerald-700 dark:text-emerald-200" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate max-w-[160px]">{attachedFile.name}</p>
                        <p className="text-[10px] opacity-75">{(attachedFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeAttachedFile}
                        className="p-1 text-rose-600 hover:text-rose-700 cursor-pointer ml-1"
                        title="Remove attachment"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            {/* RECORDED VOICE NOTE PREVIEW INSIDE CHAT */}
            {voiceBlob && !isRecordingVoice && (
              <div className="flex items-end justify-end ml-auto max-w-[90%] sm:max-w-[85%] animate-fadeIn">
                <div className={`p-3 rounded-2xl rounded-tr-xs shadow-xs border flex items-center gap-2.5 ${
                  isDark ? 'bg-[#005c4b] border-emerald-700 text-white' : 'bg-[#d9fdd3] border-emerald-300 text-slate-900'
                }`}>
                  <button
                    type="button"
                    onClick={toggleVoicePlayback}
                    className="w-9 h-9 rounded-full bg-[#008069] hover:bg-[#00a884] text-white flex items-center justify-center text-xs shadow-sm transition active:scale-95 cursor-pointer shrink-0"
                    title={isPlayingVoice ? "Pause" : "Play"}
                  >
                    {isPlayingVoice ? <FaPause /> : <FaPlay className="ml-0.5" />}
                  </button>
                  <div className="space-y-0.5 min-w-[120px]">
                    <div className="flex items-center gap-1 h-3.5">
                      {[30, 60, 90, 45, 80, 50, 100, 70, 40, 85, 55, 90, 35, 75, 45].map((h, i) => (
                        <span 
                          key={i} 
                          className={`w-1 rounded-full ${isPlayingVoice ? 'bg-emerald-600 dark:bg-white animate-pulse' : 'bg-emerald-400 dark:bg-emerald-300'}`}
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono font-bold">
                      {Math.floor(voiceDuration / 60)}:{(voiceDuration % 60).toString().padStart(2, '0')} • Voice Note
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="p-1.5 text-rose-600 hover:text-rose-700 cursor-pointer"
                    title="Delete voice note"
                  >
                    <FaTrash className="text-xs" />
                  </button>
                </div>
              </div>
            )}

            {/* LIVE DRAFT / EMOJI PREVIEW BUBBLE */}
            {replyText.trim() && (
              <div className="flex items-end justify-end ml-auto max-w-[90%] sm:max-w-[85%] animate-fadeIn">
                {isOnlyEmojiText ? (
                  <div className="p-1 select-none flex items-center justify-center gap-2">
                    {replyText.trim().split(/\s+/).map((em, eIdx) => {
                      const code = getEmojiAppleCode(em);
                      return (
                        <div key={eIdx} className="hover:scale-125 transition-transform">
                          {code ? (
                            <img
                              src={getHighResEmojiUrl(code)}
                              alt={em}
                              className="w-14 h-14 sm:w-16 sm:h-16 object-contain drop-shadow-md animate-bounce"
                            />
                          ) : (
                            <span className="text-4xl sm:text-5xl drop-shadow-md">{em}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className={`p-3.5 rounded-2xl rounded-tr-xs shadow-xs border-2 ${
                    isCurrentAdmin
                      ? (isDark 
                          ? 'bg-blue-950/90 border-blue-500 text-white' 
                          : 'bg-[#e0f2fe] border-blue-400 text-blue-950')
                      : (isDark 
                          ? 'bg-[#005c4b]/90 border-emerald-500 text-white' 
                          : 'bg-[#d9fdd3] border-emerald-400 text-emerald-950')
                  }`}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isCurrentAdmin ? 'text-blue-800 dark:text-blue-200' : 'text-emerald-800 dark:text-emerald-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full animate-ping ${isCurrentAdmin ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                        <span>Your Reaction / Reply ({isCurrentAdmin ? 'Admin' : 'Teacher'}):</span>
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[8.5px] font-black text-white uppercase ${
                        isCurrentAdmin ? 'bg-blue-600' : 'bg-emerald-600'
                      }`}>
                        Live Draft
                      </span>
                    </div>
                    <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap font-medium">
                      {replyText}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 3. QUICKS ROW - THEMED (GREEN FOR TEACHER, BLUE FOR ADMIN) */}
          <div className={`px-3.5 sm:px-4 py-2 border-t flex items-center gap-2 overflow-x-auto custom-scrollbar shrink-0 select-none ${
            isDark ? 'bg-[#111b21] border-slate-800' : 'bg-white/95 border-slate-200/90'
          }`}>
            <span className={`text-[10.5px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${
              isCurrentAdmin ? 'text-blue-600 dark:text-blue-400' : 'text-[#008069] dark:text-emerald-400'
            }`}>
              <span>⚡</span>
              <span>Quicks:</span>
            </span>

            {QUICK_RESPONSES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyText(preset.text)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border active:scale-95 whitespace-nowrap ${
                  replyText === preset.text
                    ? (isCurrentAdmin 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-400' 
                        : 'bg-[#008069] text-white border-[#008069] shadow-xs ring-2 ring-emerald-400')
                    : isCurrentAdmin
                      ? (isDark
                          ? 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 border-blue-800/80'
                          : 'bg-blue-50/70 hover:bg-blue-100 text-blue-950 border-blue-200/90')
                      : (isDark
                          ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-200 border-emerald-800/80'
                          : 'bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 border-emerald-200/90')
                }`}
                title={preset.text}
              >
                <span>{preset.emoji}</span>
                <span className="truncate max-w-[150px]">{preset.label || preset.text}</span>
              </button>
            ))}
          </div>

          {/* 3B. DEDICATED EMOJIS / REACTIONS ROW - GREEN THEME (UNDER THE QUICKS) */}
          <div className={`px-3.5 sm:px-4 py-1.5 border-t flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0 select-none ${
            isDark ? 'bg-[#182229]/80 border-slate-800/80' : 'bg-slate-50/90 border-slate-200/60'
          }`}>
            <span className="text-[10px] font-black uppercase tracking-wider text-[#008069] dark:text-emerald-400 shrink-0 flex items-center gap-1 mr-1">
              <span>😊</span>
              <span>Reactions:</span>
            </span>

            {QUICK_EMOJIS.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReplyText(prev => prev ? `${prev} ${item.emoji}` : item.emoji)}
                className={`shrink-0 w-8 h-8 rounded-full hover:scale-125 transition-all flex items-center justify-center cursor-pointer text-lg select-none active:scale-95 ${
                  isDark ? 'hover:bg-slate-700/80' : 'hover:bg-white hover:shadow-xs'
                }`}
                title={item.name}
              >
                {item.emoji}
              </button>
            ))}
          </div>

          {/* 4. WHATSAPP SINGLE-ROW TYPE AREA */}
          <div className={`px-3.5 sm:px-4 py-3 border-t flex items-center gap-2.5 shrink-0 select-none ${
            isDark ? 'bg-[#202c33] border-slate-800' : 'bg-[#f0f2f5] border-slate-200/80'
          }`}>
            {isRecordingVoice ? (
              /* WhatsApp Voice Recording Active Bar */
              <div className={`flex-1 rounded-full px-3.5 py-2 flex items-center justify-between gap-2 shadow-xs border animate-pulse ${
                isDark ? 'bg-[#2a3942] border-rose-800 text-white' : 'bg-white border-rose-300 text-slate-900'
              }`}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                  <span className="font-mono text-xs font-black text-rose-600 dark:text-rose-400">
                    {Math.floor(voiceTimer / 60)}:{(voiceTimer % 60).toString().padStart(2, '0')}
                  </span>
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    Recording voice note...
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={cancelVoiceRecording}
                    className="w-7 h-7 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-600 flex items-center justify-center transition cursor-pointer text-xs"
                    title="Discard recording"
                  >
                    <FaTrash />
                  </button>
                  <button
                    type="button"
                    onClick={stopVoiceRecording}
                    className="px-3.5 py-1.5 rounded-full bg-[#00a884] text-white font-bold text-xs flex items-center gap-1 cursor-pointer hover:bg-[#008f6f]"
                    title="Finish recording"
                  >
                    <FaCheck className="text-[10px]" />
                    <span>Done</span>
                  </button>
                </div>
              </div>
            ) : (
              /* WhatsApp Single-Line Input Capsule */
              <div className={`flex-1 min-w-0 rounded-full px-3 sm:px-3.5 py-1.5 flex items-center gap-2 shadow-xs border focus-within:ring-2 focus-within:ring-[#00a884] transition-all ${
                isDark ? 'bg-[#2a3942] border-transparent' : 'bg-white border-slate-200'
              }`}>
                {/* Emoji button */}
                <button
                  type="button"
                  onClick={() => setReplyText(prev => prev ? `${prev} 😊` : '😊')}
                  className="text-slate-500 hover:text-amber-500 dark:text-slate-400 text-lg transition cursor-pointer shrink-0 p-1"
                  title="Add emoji"
                >
                  <FaSmile />
                </button>

                {/* Attach File Clip */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-slate-500 hover:text-purple-600 dark:text-slate-400 text-base transition cursor-pointer shrink-0 p-1"
                  title="Attach document (PDF, Word, etc.)"
                >
                  <FaPaperclip />
                </button>

                {/* Camera Photo */}
                <button
                  type="button"
                  onClick={() => setShowCamera(true)}
                  className="text-slate-500 hover:text-purple-600 dark:text-slate-400 text-base transition cursor-pointer shrink-0 p-1"
                  title="Take photo with camera"
                >
                  <FaCamera />
                </button>

                {/* Upload Image */}
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="text-slate-500 hover:text-purple-600 dark:text-slate-400 text-base transition cursor-pointer shrink-0 p-1"
                  title="Upload image photo"
                >
                  <FaImage />
                </button>

                {/* WhatsApp Textarea */}
                <textarea
                  rows={1}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={`Type reply to ${targetName}...`}
                  className="flex-1 min-w-0 bg-transparent text-sm sm:text-[14.5px] text-slate-900 dark:text-white placeholder:text-slate-400 outline-none resize-none py-1 leading-normal font-medium max-h-24"
                />

                {/* Record Voice Button */}
                <button
                  type="button"
                  onClick={startVoiceRecording}
                  className="text-slate-500 hover:text-rose-600 dark:text-slate-400 text-base transition cursor-pointer shrink-0 p-1"
                  title="Record voice note"
                >
                  <FaMicrophone />
                </button>

                {/* Hidden File Inputs */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.zip"
                  onChange={handleFileSelected}
                  className="hidden"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  className="hidden"
                />
              </div>
            )}

            {/* Circular WhatsApp Send Action Button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={(!replyText.trim() && !attachedFile && !voiceBlob) || isSending}
              className={`w-11 h-11 rounded-full text-white flex items-center justify-center shadow-md active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                isOnlyEmojiText 
                  ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-950/20' 
                  : (isCurrentAdmin 
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-950/20' 
                      : 'bg-[#00a884] hover:bg-[#008f6f] shadow-emerald-950/20')
              }`}
              title={isOnlyEmojiText ? "Send as chat emoji sticker" : "Send reply (Enter)"}
            >
              {isSending ? (
                <FaSync className="text-base animate-spin" />
              ) : (
                <FaPaperPlane className="text-base ml-0.5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CAMERA CAPTURE MODAL */}
      <CameraCaptureModal
        isOpen={showCamera}
        onClose={() => setShowCamera(false)}
        onPhotoCaptured={handlePhotoCaptured}
      />
    </>
  );
};

export default LiveReplyModal;
