import React, { useState } from 'react';
import { 
  FaStar, 
  FaCheckCircle, 
  FaPaperPlane, 
  FaQuestionCircle, 
  FaCommentDots, 
  FaTimes,
  FaGraduationCap
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

const GOOD_REACTIONS = [
  {
    id: 'superb',
    emoji: '⭐',
    code: '2b50',
    label: 'Superb Class',
    desc: 'Outstanding delivery & explanation',
    borderColor: 'border-amber-400',
    selectedBgDark: 'bg-amber-500/15 border-amber-400 text-amber-200 shadow-amber-500/20',
    activeGlowDark: 'shadow-[0_0_20px_rgba(251,191,36,0.3)]'
  },
  {
    id: 'understood',
    emoji: '💡',
    code: '1f4a1',
    label: 'Understood Everything',
    desc: 'Concepts were crystal clear',
    borderColor: 'border-emerald-400',
    selectedBgDark: 'bg-emerald-500/15 border-emerald-400 text-emerald-200 shadow-emerald-500/20',
    activeGlowDark: 'shadow-[0_0_20px_rgba(52,211,153,0.3)]'
  },
  {
    id: 'great_teaching',
    emoji: '👏',
    code: '1f44f',
    label: 'Great Teaching',
    desc: 'Engaging, interactive & easy to follow',
    borderColor: 'border-purple-400',
    selectedBgDark: 'bg-purple-500/15 border-purple-400 text-purple-200 shadow-purple-500/20',
    activeGlowDark: 'shadow-[0_0_20px_rgba(192,132,252,0.3)]'
  },
  {
    id: 'loved',
    emoji: '❤️',
    code: '2764-fe0f',
    label: 'Loved the Session',
    desc: 'One of the best lessons so far',
    borderColor: 'border-rose-400',
    selectedBgDark: 'bg-rose-500/15 border-rose-400 text-rose-200 shadow-rose-500/20',
    activeGlowDark: 'shadow-[0_0_20px_rgba(251,113,133,0.3)]'
  },
  {
    id: 'inspiring',
    emoji: '🚀',
    code: '1f680',
    label: '100% Inspiring',
    desc: 'Highly motivating and valuable',
    borderColor: 'border-blue-400',
    selectedBgDark: 'bg-blue-500/15 border-blue-400 text-blue-200 shadow-blue-500/20',
    activeGlowDark: 'shadow-[0_0_20px_rgba(96,165,250,0.3)]'
  },
  {
    id: 'crystal_clear',
    emoji: '🎯',
    code: '1f3af',
    label: 'Spot On & Clear',
    desc: 'Direct, focused, and well explained',
    borderColor: 'border-amber-500',
    selectedBgDark: 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-amber-500/20',
    activeGlowDark: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]'
  }
];

const formatGrade = (grade) => {
  if (!grade) return '';
  const gStr = String(grade).trim();
  if (gStr.toLowerCase().startsWith('grade')) {
    return gStr.replace(/^grade\s*/i, 'Grade ');
  }
  return `Grade ${gStr}`;
};

const LiveEndFeedbackModal = ({ isOpen, onClose, lessonId, streamTitle, grade }) => {
  const [selectedReaction, setSelectedReaction] = useState('superb');
  const [message, setMessage] = useState('');
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Safely detect theme
  let isDark = true;
  try {
    const themeCtx = useTheme();
    isDark = themeCtx?.isDark ?? document.documentElement.classList.contains('dark');
  } catch (e) {
    isDark = document.documentElement.classList.contains('dark');
  }

  // Lock body scroll when modal is open to prevent page background scrolling
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentReactionObj = GOOD_REACTIONS.find(r => r.id === selectedReaction) || GOOD_REACTIONS[0];

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!lessonId) {
      toast.error("Lesson details missing.");
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post(`/lessons/${lessonId}/live-stream/feedback`, {
        reaction: currentReactionObj.id,
        reactionLabel: currentReactionObj.label,
        reactionEmoji: currentReactionObj.emoji,
        message: message.trim(),
        question: question.trim()
      });

      setIsSubmitted(true);
      toast.success("Thank you! Feedback and questions sent to instructor.");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit feedback.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn select-none ${
      isDark ? 'bg-slate-950/85 backdrop-blur-xl' : 'bg-slate-950/60 backdrop-blur-md'
    }`}>
      <div className={`relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-3xl p-5 sm:p-6 animate-in zoom-in-95 duration-200 my-auto overflow-hidden ${
        isDark 
          ? 'bg-slate-900/95 border border-purple-500/30 text-white shadow-[0_25px_70px_rgba(0,0,0,0.95),0_0_35px_rgba(147,51,234,0.25)] backdrop-blur-2xl'
          : 'bg-white border border-gray-200 text-gray-900 shadow-2xl'
      }`}>
        
        {/* Top Vibrant Gradient Line Accent */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${
          isDark 
            ? 'bg-gradient-to-r from-purple-500 via-rose-500 to-amber-400' 
            : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600'
        }`} />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className={`absolute top-4.5 right-4.5 w-9 h-9 rounded-2xl flex items-center justify-center transition cursor-pointer active:scale-95 shadow-md ${
            isDark 
              ? 'bg-slate-800/80 hover:bg-slate-750 border border-slate-700/70 text-slate-400 hover:text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900'
          }`}
        >
          <FaTimes className="text-xs" />
        </button>

        {isSubmitted ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-5 animate-in zoom-in-95">
            <div className="relative w-18 h-18 mx-auto flex items-center justify-center">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-3xl opacity-30 ${isDark ? 'bg-emerald-500' : 'bg-emerald-400'}`}></span>
              <div className={`w-18 h-18 rounded-3xl flex items-center justify-center text-3xl shadow-md ${
                isDark 
                  ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400/50 text-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.3)]'
                  : 'bg-emerald-50 border-2 border-emerald-200 text-emerald-600'
              }`}>
                <FaCheckCircle />
              </div>
            </div>
            
            <div className="space-y-1.5">
              <h3 className={`text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>Thank You for Participating!</h3>
              <p className={`text-xs sm:text-sm max-w-md mx-auto ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                Your live class reaction ({currentReactionObj.emoji} <span className={`font-bold ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>{currentReactionObj.label}</span>) and feedback have been shared with your teacher.
              </p>
            </div>

            <div className={`border rounded-2xl p-4 text-left space-y-2.5 text-xs shadow-inner ${
              isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-gray-50 border-gray-200'
            }`}>
              {question.trim() && (
                <div>
                  <span className={`font-bold uppercase tracking-wider text-[10px] ${isDark ? 'text-amber-400' : 'text-amber-800'}`}>Your Question for Teacher:</span>
                  <p className={`italic mt-0.5 font-medium p-2.5 rounded-xl border ${
                    isDark ? 'text-slate-200 bg-slate-900/90 border-slate-800' : 'text-gray-700 bg-white border-gray-200'
                  }`}>"{question}"</p>
                </div>
              )}
              {message.trim() && (
                <div>
                  <span className={`font-bold uppercase tracking-wider text-[10px] ${isDark ? 'text-purple-400' : 'text-purple-900'}`}>Your Review / Feedback:</span>
                  <p className={`italic mt-0.5 font-medium p-2.5 rounded-xl border ${
                    isDark ? 'text-slate-200 bg-slate-900/90 border-slate-800' : 'text-gray-700 bg-white border-gray-200'
                  }`}>"{message}"</p>
                </div>
              )}
              <div className={`flex items-center gap-2 pt-1 text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                <FaCheckCircle className={isDark ? 'text-emerald-400' : 'text-emerald-600'} /> Live attendance log recorded for this session.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className={`w-full py-3.5 rounded-2xl font-black text-sm text-white shadow-lg cursor-pointer transition-all duration-200 transform hover:scale-[1.01] active:scale-95 ${
                isDark 
                  ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 shadow-purple-600/30'
                  : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 shadow-purple-950/20'
              }`}
            >
              Done & Return to Course
            </button>
          </div>
        ) : (
          /* Main Feedback & Questions Form */
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-3">
            {/* Fixed Header */}
            <div className={`flex items-center gap-3.5 border-b pb-3 shrink-0 ${isDark ? 'border-slate-800/80' : 'border-gray-100'}`}>
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0 ${
                isDark 
                  ? 'bg-gradient-to-br from-rose-500/20 via-purple-500/20 to-indigo-500/20 border border-rose-500/40 text-rose-400'
                  : 'bg-red-50 border border-red-200 text-red-600 text-2xl'
              }`}>
                {isDark ? <FaGraduationCap /> : <span>🎓</span>}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-black uppercase text-[10px] tracking-wider ${
                    isDark 
                      ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {isDark && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>}
                    <span>Live Session Concluded</span>
                  </span>
                  {grade && (
                    <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                      isDark 
                        ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300'
                        : 'bg-purple-100 text-purple-900'
                    }`}>
                      {formatGrade(grade)}
                    </span>
                  )}
                </div>
                <h3 className={`text-base sm:text-lg font-black truncate mt-0.5 tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {streamTitle || 'Live Lecture Ended'}
                </h3>
              </div>
            </div>

            {/* Scrollable Form Body Container */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 custom-scrollbar">
              {/* Attendance Confirmation Notice */}
              <div className={`border rounded-2xl p-3 flex items-center gap-3 text-xs font-semibold shadow-inner ${
                isDark 
                  ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-emerald-950/60 border-emerald-500/30 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="relative flex h-3 w-3 shrink-0 items-center justify-center">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-90 ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`}></span>
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isDark ? 'bg-emerald-400' : 'bg-emerald-600'}`}></span>
                </div>
                <span>Great job attending today's live lecture! Your live presence has been logged.</span>
              </div>

              {/* Curated Good Reactions Form */}
              <div className="space-y-2">
                <label className={`block text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <FaStar className="text-amber-500 text-sm" />
                  <span>How was today's live class? (Select Reaction)</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {GOOD_REACTIONS.map(reaction => {
                    const isSelected = selectedReaction === reaction.id;
                    return (
                      <button
                        key={reaction.id}
                        type="button"
                        onClick={() => setSelectedReaction(reaction.id)}
                        className={`p-2.5 sm:p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-1 transform active:scale-95 ${
                          isSelected
                            ? isDark 
                              ? `${reaction.selectedBgDark} border-2 ${reaction.activeGlowDark} scale-[1.02]`
                              : `bg-purple-50 ${reaction.borderColor} border-2 shadow-md scale-[1.02]`
                            : isDark
                              ? 'bg-slate-950/70 border-slate-800/80 hover:border-purple-500/50 hover:bg-slate-850/80 text-slate-300'
                              : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50 text-gray-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          {reaction.code ? (
                            <img
                              src={`https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160/${reaction.code}.png`}
                              alt={reaction.emoji}
                              className="w-6.5 h-6.5 object-contain pointer-events-none drop-shadow-md select-none"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'inline';
                                }
                              }}
                            />
                          ) : null}
                          <span className={`${reaction.code ? 'hidden' : 'inline'} text-xl`}>{reaction.emoji}</span>
                          {isSelected && (
                            <span className={`w-4 h-4 rounded-full text-white flex items-center justify-center text-[9px] font-bold shadow-md ${
                              isDark ? 'bg-purple-500' : 'bg-purple-700'
                            }`}>
                              ✓
                            </span>
                          )}
                        </div>
                        <div>
                          <p className={`text-xs font-black leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {reaction.label}
                          </p>
                          <p className={`text-[10px] leading-tight mt-0.5 line-clamp-1 font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            {reaction.desc}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Message Bar for the Class */}
              <div className="space-y-1">
                <label className={`block text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <FaCommentDots className={isDark ? 'text-purple-400' : 'text-purple-600'} />
                  <span>Message about the class (Feedback / Review):</span>
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Share your thoughts, what you enjoyed most, or a thank you note for your teacher..."
                  className={`w-full rounded-2xl border px-3.5 py-2 text-xs font-medium resize-none transition-all outline-none ${
                    isDark
                      ? 'border-slate-800/90 bg-slate-950/80 text-slate-100 placeholder-slate-500 focus:bg-slate-950 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 shadow-inner'
                      : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100'
                  }`}
                />
              </div>

              {/* Ask Questions Section */}
              <div className="space-y-1">
                <label className={`block text-xs font-bold flex items-center gap-1.5 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <FaQuestionCircle className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                  <span>Ask Questions or Doubts from this Lesson:</span>
                </label>
                <textarea
                  rows={2}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Did you have any questions or confusion on today's topics? Type your question here for the teacher..."
                  className={`w-full rounded-2xl border px-3.5 py-2 text-xs font-medium resize-none transition-all outline-none ${
                    isDark
                      ? 'border-slate-800/90 bg-slate-950/80 text-slate-100 placeholder-slate-500 focus:bg-slate-950 focus:border-amber-500/70 focus:ring-2 focus:ring-amber-500/20 shadow-inner'
                      : 'border-gray-300 bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100'
                  }`}
                />
              </div>
            </div>

            {/* Fixed Bottom Action Buttons */}
            <div className={`flex items-center justify-end gap-3 pt-3 border-t shrink-0 ${isDark ? 'border-slate-800/80' : 'border-gray-100'}`}>
              <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2 rounded-2xl font-bold text-xs cursor-pointer transition active:scale-95 shadow-sm ${
                  isDark 
                    ? 'bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/80 hover:border-slate-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Skip for Now
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-2xl text-white font-black text-xs sm:text-sm cursor-pointer transition-all duration-200 transform hover:scale-[1.02] active:scale-95 flex items-center gap-2 disabled:opacity-50 ${
                  isDark 
                    ? 'bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-600/30'
                    : 'bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 shadow-lg shadow-purple-950/20'
                }`}
              >
                <FaPaperPlane className="text-xs" />
                <span>{isSubmitting ? "Submitting..." : "Send Feedback & Reaction"}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LiveEndFeedbackModal;

