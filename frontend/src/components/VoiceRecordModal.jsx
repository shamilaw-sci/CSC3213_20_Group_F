/**
 * @file VoiceRecordModal.jsx
 * @description Voice Recording Modal. MediaRecorder microphone component to capture, preview, re-record, and attach audio voice messages to chat.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FaMicrophone, 
  FaStop, 
  FaPlay, 
  FaPause, 
  FaRedo, 
  FaPaperPlane, 
  FaTimes,
  FaLock
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

const VoiceRecordModal = ({ isOpen, onClose, onSendVoice, isTeacherOrAdmin, targetStudentName }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [duration, setDuration] = useState(0);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const audioPreviewRef = useRef(null);
  const streamRef = useRef(null);

  // Format seconds as MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  useEffect(() => {
    if (!isOpen) {
      cleanup();
    }
  }, [isOpen]);

  const cleanup = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setIsPlayingPreview(false);
    setPreviewProgress(0);
  };

  const startRecording = async () => {
    try {
      cleanup();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setIsRecording(false);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setDuration(0);

      timerIntervalRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 120) { // Auto stop at 2 minutes
            stopRecording();
            return 120;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      toast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePreviewPlay = () => {
    if (!audioUrl) return;

    if (!audioPreviewRef.current) {
      const audio = new Audio(audioUrl);
      audioPreviewRef.current = audio;

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setPreviewProgress((audio.currentTime / audio.duration) * 100);
        }
      };

      audio.onended = () => {
        setIsPlayingPreview(false);
        setPreviewProgress(0);
      };
    }

    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const handleSend = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);

    try {
      // Convert blob to base64 data URL
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result;
        await onSendVoice(base64Audio, duration);
        setIsProcessing(false);
        onClose();
      };
    } catch (err) {
      console.error("Voice send error:", err);
      toast.error("Failed to send voice note.");
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs rounded-2xl sm:rounded-3xl animate-fadeIn select-none overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-4 sm:p-5 shadow-2xl space-y-3.5 text-gray-900 animate-in zoom-in-95 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm">
              <FaMicrophone />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">
                {isTeacherOrAdmin ? "Voice Message" : "Voice Question"}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium flex items-center gap-1">
                <FaLock className="text-amber-600 text-[9px]" />
                <span>
                  {isTeacherOrAdmin && targetStudentName 
                    ? `To: ${targetStudentName}`
                    : "Direct & Private to Teacher"}
                </span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
          >
            <FaTimes className="text-xs" />
          </button>
        </div>

        {/* Informative Clarification Notice */}
        <div className="px-3 py-2 rounded-xl bg-purple-50/70 border border-purple-200 text-left flex items-start gap-2">
          <span className="text-sm shrink-0">🎙️</span>
          <p className="text-[11px] text-purple-950 font-medium leading-tight">
            {isTeacherOrAdmin 
              ? "Record a voice explanation to send in this live class."
              : "Record your question. You can listen to the preview before sending to your teacher."}
          </p>
        </div>

        {/* Recording Visualizer & Timer Area */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-center space-y-3 shadow-inner">
          {isRecording ? (
            <div className="space-y-2 flex flex-col items-center">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-12 w-12 rounded-full bg-red-400 opacity-60"></span>
                <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center text-xl shadow-lg shadow-red-600/40">
                  <FaMicrophone className="animate-pulse" />
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="font-mono text-xl font-black text-red-600 tracking-wider">
                  {formatTime(duration)}
                </p>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Recording Voice (Max 2:00)
                </p>
              </div>
            </div>
          ) : audioBlob ? (
            <div className="w-full space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold text-gray-700">Voice Recorded</span>
                <span className="text-xs font-mono font-bold text-purple-700">{formatTime(duration)}</span>
              </div>

              {/* Progress Slider */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div 
                  className="bg-purple-600 h-full transition-all duration-100 rounded-full" 
                  style={{ width: `${previewProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={togglePreviewPlay}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  {isPlayingPreview ? <FaPause className="text-xs" /> : <FaPlay className="text-xs" />}
                  <span>{isPlayingPreview ? "Pause" : "Listen Preview"}</span>
                </button>
                <button
                  type="button"
                  onClick={startRecording}
                  className="px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-1 transition cursor-pointer"
                >
                  <FaRedo className="text-[10px]" />
                  <span>Re-record</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 flex flex-col items-center">
              <div className="w-12 h-12 rounded-full bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center text-xl shadow-xs">
                <FaMicrophone />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-black text-gray-900">
                  Ready to Record
                </p>
                <p className="text-[11px] text-gray-500 max-w-xs">
                  Speak clearly into your microphone to record your voice question.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-end gap-2 pt-0.5">
          {isRecording ? (
            <button
              type="button"
              onClick={stopRecording}
              className="w-full py-2.5 rounded-xl sm:rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <FaStop className="text-xs" />
              <span>Stop Recording</span>
            </button>
          ) : audioBlob ? (
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleSend}
              className="w-full py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95 disabled:opacity-50"
            >
              <FaPaperPlane className={`text-xs ${isProcessing ? 'animate-bounce' : ''}`} />
              <span>{isProcessing ? "Sending..." : "Send Voice Question"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="w-full py-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <FaMicrophone className="text-xs" />
              <span>Start Recording</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoiceRecordModal;
