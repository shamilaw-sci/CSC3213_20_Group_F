import React, { useState } from 'react';
import { 
  FaStar, 
  FaCheckCircle, 
  FaPaperPlane, 
  FaQuestionCircle, 
  FaCommentDots, 
  FaTimes
} from 'react-icons/fa';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const GOOD_REACTIONS = [
  {
    id: 'superb',
    emoji: '⭐',
    code: '2b50',
    label: 'Superb Class',
    desc: 'Outstanding delivery & explanation',
    borderColor: 'border-amber-400',
    bgActive: 'bg-amber-50 text-amber-950 border-amber-400'
  },
  {
    id: 'understood',
    emoji: '💡',
    code: '1f4a1',
    label: 'Understood Everything',
    desc: 'Concepts were crystal clear',
    borderColor: 'border-emerald-400',
    bgActive: 'bg-emerald-50 text-emerald-950 border-emerald-400'
  },
  {
    id: 'great_teaching',
    emoji: '👏',
    code: '1f44f',
    label: 'Great Teaching',
    desc: 'Engaging, interactive and easy to follow',
    borderColor: 'border-purple-400',
    bgActive: 'bg-purple-50 text-purple-950 border-purple-400'
  },
  {
    id: 'loved',
    emoji: '❤️',
    code: '2764-fe0f',
    label: 'Loved the Session',
    desc: 'One of the best lessons so far',
    borderColor: 'border-rose-400',
    bgActive: 'bg-rose-50 text-rose-950 border-rose-400'
  },
  {
    id: 'inspiring',
    emoji: '🚀',
    code: '1f680',
    label: '100% Inspiring',
    desc: 'Highly motivating and valuable',
    borderColor: 'border-blue-400',
    bgActive: 'bg-blue-50 text-blue-950 border-blue-400'
  },
  {
    id: 'crystal_clear',
    emoji: '🎯',
    code: '1f3af',
    label: 'Spot On & Clear',
    desc: 'Direct, focused, and well explained',
    borderColor: 'border-orange-400',
    bgActive: 'bg-orange-50 text-orange-950 border-orange-400'
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none overflow-y-auto">
      <div className="relative w-full max-w-xl bg-white rounded-3xl border border-gray-200 p-6 sm:p-7 text-gray-900 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 my-8">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
        >
          <FaTimes className="text-sm" />
        </button>

        {isSubmitted ? (
          /* Success Screen */
          <div className="text-center py-6 space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-3xl mx-auto shadow-sm text-emerald-600">
              <FaCheckCircle />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xl sm:text-2xl font-black text-gray-900">Thank You for Participating!</h3>
              <p className="text-xs sm:text-sm text-gray-600">
                Your live class reaction ({currentReactionObj.emoji} {currentReactionObj.label}) and feedback have been shared with your teacher.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-left space-y-2 text-xs">
              {question.trim() && (
                <div>
                  <span className="font-bold text-amber-800">Your Question:</span>
                  <p className="text-gray-700 italic mt-0.5 font-medium">"{question}"</p>
                </div>
              )}
              {message.trim() && (
                <div>
                  <span className="font-bold text-purple-900">Your Feedback:</span>
                  <p className="text-gray-700 italic mt-0.5 font-medium">"{message}"</p>
                </div>
              )}
              <div className="flex items-center gap-2 pt-1 text-[11px] text-emerald-700 font-bold">
                <FaCheckCircle className="text-emerald-600" /> Attendance successfully recorded for this session.
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-extrabold text-sm shadow-lg cursor-pointer transition active:scale-95"
            >
              Done & Return to Course
            </button>
          </div>
        ) : (
          /* Main Feedback & Questions Form */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center text-2xl shadow-sm shrink-0">
                <span>🎓</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 font-black uppercase text-[10px] tracking-wider">
                    Live Session Concluded
                  </span>
                  {grade && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-bold text-[10px]">
                      {formatGrade(grade)}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-gray-900 truncate mt-0.5">
                  {streamTitle || 'Live Lecture Ended'}
                </h3>
              </div>
            </div>

            {/* Attendance Confirmation Notice */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center gap-2.5 text-xs text-emerald-900 font-medium">
              <FaCheckCircle className="text-emerald-600 text-base shrink-0" />
              <span>Great job attending today's live lecture! Your live presence has been logged.</span>
            </div>

            {/* Curated Good Reactions Form */}
            <div className="space-y-2.5">
              <label className="block text-xs font-black uppercase text-gray-700 tracking-wider flex items-center gap-1.5">
                <FaStar className="text-amber-500" />
                <span>How was today's live class? (Select Reaction)</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {GOOD_REACTIONS.map(reaction => {
                  const isSelected = selectedReaction === reaction.id;
                  return (
                    <button
                      key={reaction.id}
                      type="button"
                      onClick={() => setSelectedReaction(reaction.id)}
                      className={`p-3 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-1 transform active:scale-95 ${
                        isSelected
                          ? `bg-purple-50 ${reaction.borderColor} border-2 shadow-md scale-[1.02]`
                          : 'bg-gray-50 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        {reaction.code ? (
                          <img
                            src={`https://cdn.jsdelivr.net/gh/iamcal/emoji-data@master/img-apple-160/${reaction.code}.png`}
                            alt={reaction.emoji}
                            className="w-7 h-7 object-contain pointer-events-none drop-shadow-2xs select-none"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              if (e.currentTarget.nextSibling) {
                                e.currentTarget.nextSibling.style.display = 'inline';
                              }
                            }}
                          />
                        ) : null}
                        <span className={`${reaction.code ? 'hidden' : 'inline'} text-2xl`}>{reaction.emoji}</span>
                        {isSelected && (
                          <span className="w-4 h-4 rounded-full bg-purple-700 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-900 leading-tight">
                          {reaction.label}
                        </p>
                        <p className="text-[10px] text-gray-500 leading-tight mt-0.5 line-clamp-1">
                          {reaction.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Bar for the Class */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FaCommentDots className="text-purple-600" />
                <span>Message about the class (Feedback / Review):</span>
              </label>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Share your thoughts, what you enjoyed most, or a thank you note for your teacher..."
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-purple-600 focus:ring-2 focus:ring-purple-100 font-medium resize-none"
              />
            </div>

            {/* Ask Questions Section */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <FaQuestionCircle className="text-amber-600" />
                <span>Ask Questions or Doubts from this Lesson:</span>
              </label>
              <textarea
                rows={2}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Did you have any questions or confusion on today's topics? Type your question here for the teacher..."
                className="w-full rounded-2xl border border-gray-300 bg-gray-50 px-4 py-2.5 text-xs sm:text-sm text-gray-900 placeholder-gray-400 outline-none focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-100 font-medium resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer transition"
              >
                Skip for Now
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-950/20 cursor-pointer transition active:scale-95 flex items-center gap-2 disabled:opacity-50"
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
