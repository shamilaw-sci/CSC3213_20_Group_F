import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaUsers,
  FaChalkboardTeacher,
  FaBookOpen,
  FaChartLine,
  FaUserGraduate,
  FaStar,
  FaRegStar,
  FaVideo,
  FaPlusCircle,
  FaPlayCircle,
  FaTrophy,
  FaClock,
  FaCalendarAlt,
  FaTrash,
  FaCheck,
  FaTimes,
  FaMapMarkerAlt,
  FaFileInvoiceDollar,
  FaBullhorn,
  FaCalendarCheck,
  FaReceipt,
  FaCheckCircle,
  FaExclamationTriangle,
  FaArrowRight,
  FaGraduationCap,
  FaCoins,
  FaMoneyBillWave,
  FaFilter,
  FaExternalLinkAlt,
  FaComments,
  FaUserShield,
  FaSearch,
  FaAward,
  FaCommentDots,
  FaClipboardList
} from 'react-icons/fa';
import StudentIdCard from './StudentIdCard';
import AddScheduleModal from './AddScheduleModal';
import ConfirmModal from './ConfirmModal';

// Grade options matching registration grade requirements
const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

// --- HERO WELCOME BANNER ---
const DashboardHero = ({ user, roleBadge, quickActions, extraBadge }) => {
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      setDateStr(now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }));
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-6 sm:p-8 text-white shadow-xl mb-6 border border-purple-900/40 animate-fadeIn">
      {/* Ambient background glow orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none transform translate-x-24 -translate-y-24" />
      <div className="absolute bottom-0 left-1/3 w-72 h-72 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-2.5">
            <span className="bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-black uppercase px-3.5 py-1 rounded-full tracking-widest backdrop-blur-md shadow-xs">
              {roleBadge}
            </span>
            <span className="text-purple-200/90 text-xs font-semibold flex items-center gap-1.5 bg-white/10 border border-white/10 px-3 py-1 rounded-full backdrop-blur-sm">
              <FaClock className="text-purple-400 text-xs" /> {timeStr}
            </span>
            <span className="text-purple-300/80 text-xs font-medium hidden sm:inline-flex items-center gap-1 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              📅 {dateStr}
            </span>
            {extraBadge && (
              <span className="text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 text-[11px] font-bold px-3 py-1 rounded-full">
                {extraBadge}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2">
            Welcome back, {user?.name || 'Administrator'}! <span className="inline-block animate-wave">👋</span>
          </h1>
          <p className="text-purple-200/80 text-xs sm:text-sm mt-1 max-w-xl font-medium">
            Live institute management overview, student enrolment analytics, and real-time operations.
          </p>
        </div>

        {quickActions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {quickActions}
          </div>
        )}
      </div>
    </div>
  );
};

// --- CUSTOM SMOOTH BEZIER SVG LINE CHART COMPONENT ---
const SvgLineChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const padding = 40;
  const width = 560;
  const height = 240;
  const maxVal = Math.max(...data.map(d => d.count)) * 1.3 || 10;

  const points = data.map((d, index) => {
    const x = padding + (index * (width - padding * 2) / (data.length - 1 || 1));
    const y = height - padding - (d.count * (height - padding * 2) / maxVal);
    return { x, y, month: d.month, count: d.count };
  });

  // Calculate smooth cubic Bezier path
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) / 2;
    const cpy1 = prev.y;
    const cpx2 = prev.x + (curr.x - prev.x) / 2;
    const cpy2 = curr.y;
    pathD += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }

  const fillD = pathD + ` L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full select-none">
      <defs>
        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
          <stop offset="60%" stopColor="#6366f1" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
        </linearGradient>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#7c3aed" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* Horizontal Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
        const y = padding + r * (height - padding * 2);
        const value = Math.round(maxVal * (1 - r));
        return (
          <g key={i}>
            <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray={r === 1 ? 'none' : '3 3'} />
            <text x={padding - 10} y={y + 3.5} fill="#94a3b8" fontSize="9" textAnchor="end" className="font-bold">{value}</text>
          </g>
        );
      })}

      {/* Area under curve */}
      <path d={fillD} fill="url(#chartGrad)" />

      {/* Main Curve */}
      <path d={pathD} fill="none" stroke="#7c3aed" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />

      {/* Interactive Dots and Badges */}
      {points.map((p, i) => (
        <g key={i} className="group cursor-pointer">
          <circle cx={p.x} cy={p.y} r="5" fill="#7c3aed" stroke="white" strokeWidth="2.5" className="transition-transform group-hover:scale-125" />
          <circle cx={p.x} cy={p.y} r="14" fill="#7c3aed" opacity="0" className="hover:opacity-15 transition-opacity" />

          {/* Hover Tooltip Card */}
          <g className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            <rect x={p.x - 28} y={p.y - 32} width="56" height="22" rx="6" fill="#0f172a" />
            <text x={p.x} y={p.y - 18} fill="white" fontSize="9" fontWeight="900" textAnchor="middle">{p.count} Enrolled</text>
          </g>
          <text x={p.x} y={height - padding + 16} fill="#64748b" fontSize="10" fontWeight="bold" textAnchor="middle">{p.month}</text>
        </g>
      ))}
    </svg>
  );
};

// --- PAYMENT METRICS DONUT CHART COMPONENT ---
const PaymentDonut = ({ totalCollected = 0, pendingDues = 0, onNavigate }) => {
  const total = totalCollected + pendingDues;
  const percentage = total > 0 ? Math.round((totalCollected / total) * 100) : 100;
  const strokeDashoffset = 251.2 * (1 - percentage / 100);

  return (
    <div className="flex flex-col items-center justify-between p-2 h-full">
      <div className="relative w-36 h-36 flex items-center justify-center my-auto">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="9" fill="transparent" className="dark:stroke-slate-800" />
          <circle
            cx="50"
            cy="50"
            r="40"
            stroke="#10b981"
            strokeWidth="9"
            fill="transparent"
            strokeDasharray="251.2"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-3xl font-black text-slate-800 dark:text-white tracking-tight">{percentage}%</span>
          <span className="text-[10px] text-slate-400 dark:text-slate-400 font-black uppercase tracking-widest mt-0.5">Settled</span>
        </div>
      </div>

      <div className="w-full space-y-2 mt-3">
        <div className="grid grid-cols-2 gap-2.5 text-xs font-semibold">
          <div className="bg-emerald-50/90 dark:bg-emerald-950/30 p-3 rounded-2xl border border-emerald-100/80 dark:border-emerald-800/40 flex flex-col items-center shadow-2xs">
            <span className="text-emerald-800 dark:text-emerald-300 font-black text-[10px] uppercase tracking-wider">Paid Total</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5">LKR {totalCollected.toLocaleString()}</span>
          </div>
          <div className="bg-amber-50/90 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-100/80 dark:border-amber-800/40 flex flex-col items-center shadow-2xs">
            <span className="text-amber-800 dark:text-amber-300 font-black text-[10px] uppercase tracking-wider">Pending Dues</span>
            <span className="text-sm font-black text-amber-600 dark:text-amber-400 mt-0.5">LKR {pendingDues.toLocaleString()}</span>
          </div>
        </div>

        {onNavigate && (
          <button
            type="button"
            onClick={onNavigate}
            className="w-full py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
          >
            <span>View Fee Records & Invoices</span>
            <FaArrowRight className="text-[10px]" />
          </button>
        )}
      </div>
    </div>
  );
};

// --- ATTENDANCE SUMMARY CIRCULAR BAR ---
const AttendanceRing = ({ percentage = 100 }) => {
  const safePct = Math.min(100, Math.max(0, percentage));
  const strokeDashoffset = 251.2 * (1 - safePct / 100);

  const getStatusText = (pct) => {
    if (pct >= 90) return { label: 'Excellent Attendance', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50' };
    if (pct >= 75) return { label: 'Good Standing', color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/50' };
    return { label: 'Needs Improvement', color: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50' };
  };

  const statusInfo = getStatusText(safePct);

  return (
    <div className="flex flex-col items-center justify-center p-3">
      <div className="relative w-28 h-28 flex items-center justify-center">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="8" fill="transparent" className="dark:stroke-slate-800" />
          <circle cx="50" cy="50" r="40" stroke="#6366f1" strokeWidth="8" fill="transparent"
            strokeDasharray="251.2" strokeDashoffset={strokeDashoffset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-slate-800 dark:text-white">{safePct}%</span>
          <span className="text-4xs text-slate-400 dark:text-slate-400 font-bold uppercase tracking-wider">Avg Rate</span>
        </div>
      </div>
      <span className={`mt-3 text-3xs font-extrabold border px-3 py-1 rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    </div>
  );
};

// --- INTERACTIVE COURSE & TEACHER RATING MODAL ---
const RateCourseModal = ({ isOpen, onClose, course, onRatingSubmitted }) => {
  const [rating, setRating] = useState(course?.myRating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState(course?.myReviewText || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (course) {
      setRating(course.myRating || 5);
      setReviewText(course.myReviewText || '');
    }
  }, [course]);

  if (!isOpen || !course) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast.error("Please select a star rating (1 to 5).");
      return;
    }

    setSubmitting(true);
    try {
      const courseId = course._id || course.id;
      const res = await api.post(`/courses/${courseId}/reviews`, {
        rating: Number(rating),
        review: reviewText.trim()
      });
      toast.success(res.data.message || "Rating and review saved successfully!");
      if (onRatingSubmitted) {
        onRatingSubmitted(courseId, rating, reviewText.trim());
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  const getRatingLabel = (val) => {
    switch (val) {
      case 5: return '⭐⭐⭐⭐⭐ Excellent! Outstanding teaching!';
      case 4: return '⭐⭐⭐⭐ Very Good! Clear explanations.';
      case 3: return '⭐⭐⭐ Good, satisfactory course delivery.';
      case 2: return '⭐⭐ Fair, needs some improvements.';
      case 1: return '⭐ Poor, difficult to follow.';
      default: return 'Select your rating';
    }
  };

  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative text-slate-800 dark:text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <FaTimes />
        </button>

        <div className="text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto mb-3 text-xl shadow-xs">
            <FaStar />
          </div>
          <h3 className="text-lg font-black text-slate-800 dark:text-white">Rate Course & Instructor</h3>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate px-4">
            {course.title} {course.instructorName ? `• ${course.instructorName}` : ''}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col items-center justify-center py-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-2xl sm:text-3xl">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-125 cursor-pointer p-1 focus:outline-none"
                >
                  <FaStar
                    className={
                      star <= displayRating
                        ? 'text-amber-400 drop-shadow-sm'
                        : 'text-slate-300 dark:text-slate-600'
                    }
                  />
                </button>
              ))}
            </div>
            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400 mt-2">
              {getRatingLabel(displayRating)}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Your Feedback / Review (Optional)
            </label>
            <textarea
              rows="3"
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Tell other students how helpful this course and teacher are..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FaCheck /> {submitting ? "Saving..." : "Submit Rating"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// --- TEACHER BROADCAST CLASS NOTICE MODAL ---
const BroadcastClassNoticeModal = ({ isOpen, onClose, coursesList = [] }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(coursesList[0]?._id || coursesList[0]?.id || '');
  const [type, setType] = useState('CLASS_POSTPONED');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (coursesList.length > 0 && !selectedCourseId) {
      setSelectedCourseId(coursesList[0]._id || coursesList[0].id || '');
    }
  }, [coursesList]);

  if (!isOpen) return null;

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter both notice title and message.");
      return;
    }

    setSending(true);
    try {
      const res = await api.post('/notifications/broadcast', {
        title: title.trim(),
        message: message.trim(),
        courseId: selectedCourseId || undefined,
        type,
        channels: ['in_app', 'email']
      });

      toast.success(res.data?.message || "Class notice broadcasted successfully!");
      setTitle('');
      setMessage('');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to broadcast notice.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative text-slate-800 dark:text-white">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <FaTimes />
        </button>

        <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl shrink-0 shadow-xs">
            <FaBullhorn />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-white">Broadcast Class Notice</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Publish urgent notices & updates directly to enrolled students
            </p>
          </div>
        </div>

        <form onSubmit={handleBroadcast} className="space-y-4">
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Select Target Class / Course
            </label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white font-semibold outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              {coursesList.length > 0 ? (
                coursesList.map((c) => (
                  <option key={c._id || c.id} value={c._id || c.id}>
                    {c.title}
                  </option>
                ))
              ) : (
                <option value="">No assigned courses</option>
              )}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Notice Category
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'CLASS_POSTPONED', label: '⏰ Class Reschedule' },
                { id: 'ASSIGNMENT_REMINDER', label: '📝 Homework Alert' },
                { id: 'GENERAL_NOTICE', label: '📢 General Update' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`p-2.5 rounded-xl text-[11px] font-bold border transition text-center cursor-pointer ${type === t.id
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 shadow-xs font-black'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Notice Headline / Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Special Lecture Rescheduled for Friday 4 PM"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
              Notice Announcement Message
            </label>
            <textarea
              required
              rows="3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide instructions, venue updates, or study guidelines for your students..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500 resize-none font-medium"
            />
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sending}
              className="flex-1 py-2.5 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-md transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <FaBullhorn /> {sending ? "Broadcasting..." : "Send Class Notice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ==========================================
//          ADMINISTRATOR DASHBOARD
// ==========================================
const AdminDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    students: 0,
    onlineStudents: 0,
    physicalStudents: 0,
    teachers: 0,
    courses: 0,
    recentRegistrations: [],
    growthData: [],
    totalCollected: 0,
    pendingDues: 0,
    todayArrivalsCount: 0
  });
  const [schedule, setSchedule] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [attendanceStats, setAttendanceStats] = useState({ today: { present: 0, late: 0, absent: 0, total: 0 } });
  const [loading, setLoading] = useState(true);

  // Timetable Day Filter State
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [deleteScheduleModal, setDeleteScheduleModal] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, schedRes, coursesRes, usersRes, attRes] = await Promise.allSettled([
        api.get('/auth/admin-stats'),
        api.get('/schedule'),
        api.get('/courses'),
        api.get('/auth/users'),
        api.get('/attendance/stats/summary')
      ]);

      if (statsRes.status === 'fulfilled') setStats(statsRes.value.data);
      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value.data);
      if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data);
      if (usersRes.status === 'fulfilled') {
        setTeachers(usersRes.value.data.filter(u => u.role === 'teacher'));
      }
      if (attRes.status === 'fulfilled') setAttendanceStats(attRes.value.data);
    } catch (err) {
      console.error("Admin dashboard fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSchedule = async (scheduleData) => {
    if (!scheduleData.title || !scheduleData.className || !scheduleData.dayOfWeek || !scheduleData.startTime || !scheduleData.endTime) {
      toast.error("Please fill in all required calendar details.");
      return;
    }

    try {
      const res = await api.post('/schedule', scheduleData);
      toast.success(res.data.message || "Class added to timetable successfully!");
      if (res.data.schedule) {
        setSchedule(prev => [...prev, res.data.schedule]);
      } else {
        fetchAdminData();
      }
      setShowModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to add class schedule");
      throw err;
    }
  };

  const handleDeleteSchedule = (id, title) => {
    setDeleteScheduleModal({ id, title });
  };

  const executeDeleteSchedule = async () => {
    if (!deleteScheduleModal) return;
    const { id, title } = deleteScheduleModal;

    try {
      await api.delete(`/schedule/${id}`);
      toast.success("Schedule entry deleted successfully.");
      setSchedule(prev => prev.filter(item => item._id !== id));
    } catch (err) {
      toast.error("Failed to delete schedule entry");
    } finally {
      setDeleteScheduleModal(null);
    }
  };

  // Helper for Schedule Day of Week
  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const getTodayDayCode = () => {
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[new Date().getDay()];
  };
  const todayCode = getTodayDayCode();

  const filteredSchedule = schedule.filter(sch => {
    if (selectedDayFilter === 'ALL') return true;
    if (selectedDayFilter === 'TODAY') {
      const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
      return schDay === todayCode;
    }
    const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
    return schDay === selectedDayFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* ========================================================================= */}
      {/* 1. HERO COMMAND BANNER */}
      {/* ========================================================================= */}
      <DashboardHero
        user={user}
        roleBadge="System Administrator"
        extraBadge="🟢 Operations Active"
        quickActions={
          <>
            <button
              onClick={() => navigate('/add-course')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-purple-900/30 active:scale-95 cursor-pointer"
            >
              <FaPlusCircle /> Create Course
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-2xl transition flex items-center gap-2 backdrop-blur-md active:scale-95 cursor-pointer"
            >
              <FaCalendarAlt /> Add Class
            </button>
            <button
              onClick={() => navigate('/sms-settings')}
              className="bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              title="Broadcast SMS Announcement"
            >
              <FaBullhorn /> SMS Broadcast
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-2xl transition flex items-center gap-1.5 backdrop-blur-md active:scale-95 cursor-pointer"
              title="View In-Depth Analytics"
            >
              <FaChartLine /> Analytics
            </button>
          </>
        }
      />

      {/* ========================================================================= */}
      {/* 2. STATS KPI MATRIX (5 METRICS RIBBON) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: Total Students */}
        <div
          onClick={() => navigate('/manage-users')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Students</span>
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaUsers className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.students || 0}</h3>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-extrabold bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-md border border-purple-100 dark:border-purple-800/60">
                💻 {stats.onlineStudents || Math.max(0, (stats.students || 0) - (stats.physicalStudents || 0))} Online
              </span>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-extrabold bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800/60">
                🏫 {stats.physicalStudents || 0} Physical
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Teachers */}
        <div
          onClick={() => navigate('/manage-users')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Faculty Staff</span>
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaChalkboardTeacher className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.teachers || 0}</h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-extrabold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/60">
                👨‍🏫 Active Instructors
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Active Courses */}
        <div
          onClick={() => navigate('/courses')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Active Courses</span>
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaBookOpen className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.courses || 0}</h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-extrabold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-800/60">
                📚 Grades 6–13
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Arrived Today */}
        <div
          onClick={() => navigate('/attendance')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Arrived Today</span>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaCalendarCheck className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {attendanceStats.today?.present || stats.todayArrivalsCount || 0}
            </h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/60">
                🏫 Counter Check-ins
              </span>
            </div>
          </div>
        </div>

        {/* Metric 5: Revenue Collected */}
        <div
          onClick={() => navigate('/payments')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Revenue (LKR)</span>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaCoins className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-xl font-black text-slate-800 dark:text-white">
              {(stats.totalCollected || 0).toLocaleString()}
            </h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/60">
                💳 {stats.pendingDues > 0 ? `${stats.pendingDues.toLocaleString()} Pending` : '100% Settled'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. VISUAL CHARTS ROW (Curved Intake Line & Fee Collection Donut) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Intake Curve */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between min-h-[380px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Student Intake & Registration Trend</h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">Monthly enrollment progression across all academic grades</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-black px-3 py-1 rounded-xl border border-purple-100 dark:border-purple-800/60">
                📈 {stats.students || 0} Total Registered
              </span>
            </div>
          </div>

          <div className="h-64 flex items-center justify-center pt-2">
            {stats.growthData && stats.growthData.length > 0 ? (
              <SvgLineChart data={stats.growthData} />
            ) : (
              <p className="text-xs text-slate-400 italic">Intake trend will display as student registrations grow.</p>
            )}
          </div>
        </div>

        {/* Fee Collection Donut */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between min-h-[380px]">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Fee Collections & Settlement</h3>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">Total collected vs outstanding student fee dues</p>
          </div>
          <div className="flex-1 py-2">
            <PaymentDonut
              totalCollected={stats.totalCollected}
              pendingDues={stats.pendingDues}
              onNavigate={() => navigate('/payments')}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. OPERATIONS & SCHEDULE GRID */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Registrations Log */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Recent Admissions</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Newest enrolled student profiles</p>
              </div>
              <span className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                {stats.recentRegistrations?.length || 0}
              </span>
            </div>

            <div className="space-y-3.5">
              {stats.recentRegistrations && stats.recentRegistrations.length > 0 ? (
                stats.recentRegistrations.map((reg, idx) => {
                  const colors = ['bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300', 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300', 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300', 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300', 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300'];
                  const avatarColor = colors[idx % colors.length];
                  const initial = (reg.name || 'S').charAt(0).toUpperCase();

                  return (
                    <div key={reg._id || idx} className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl ${avatarColor} flex items-center justify-center font-black text-sm shrink-0 shadow-2xs`}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{reg.name}</h4>
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium truncate">{reg.email}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 pl-2">
                        <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-lg border border-purple-100 dark:border-purple-800/60 block">
                          {reg.grade || 'General'}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 block">
                          {reg.createdAt ? new Date(reg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Recent'}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic text-center py-8">No recent registrations</p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={() => navigate('/manage-users')}
              className="w-full py-2.5 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/40 text-purple-800 dark:text-purple-300 font-black text-xs rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>View All Enrolled Students</span>
              <FaArrowRight className="text-[10px]" />
            </button>
          </div>
        </div>

        {/* Timetable Schedule Manager */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Institute Master Timetable</h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Recurring class schedules and room assignments</p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs self-start sm:self-auto"
              >
                <FaPlusCircle /> Add Class Session
              </button>
            </div>

            {/* Day of Week Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${selectedDayFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
              >
                ALL ({schedule.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayFilter('TODAY')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${selectedDayFilter === 'TODAY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800'
                  }`}
              >
                <span>TODAY ({todayCode})</span>
              </button>
              {daysOfWeek.map((day) => {
                const count = schedule.filter(s => (s.dayOfWeek || '').toUpperCase().slice(0, 3) === day).length;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(day)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${selectedDayFilter === day
                        ? 'bg-purple-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                  >
                    {day} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Timetable List */}
            <div className="overflow-y-auto max-h-[300px] space-y-2.5 pr-1">
              {filteredSchedule && filteredSchedule.length > 0 ? (
                filteredSchedule.map((sch) => {
                  const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
                  const isToday = schDay === todayCode;

                  return (
                    <div
                      key={sch._id}
                      className={`flex justify-between items-center p-3.5 rounded-2xl border transition-all ${isToday
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40'
                          : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50/20 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                        }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-2xl flex flex-col items-center min-w-[62px] shrink-0 ${isToday ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          }`}>
                          <span className="text-[10px] font-black uppercase tracking-wider">{sch.dayOfWeek ? sch.dayOfWeek.slice(0, 3) : 'DAY'}</span>
                          <FaCalendarAlt className="text-sm mt-0.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{sch.title}</h4>
                            {isToday && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Happening Today
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                            <span className="flex items-center gap-1">🕒 {sch.startTime} – {sch.endTime}</span>
                            <span className="flex items-center gap-1">📍 {sch.room || 'Classroom'}</span>
                            {(sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName) && (
                              <span className="flex items-center gap-1 text-purple-700 dark:text-purple-300 font-bold">
                                👨‍🏫 {sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteSchedule(sch._id, sch.title)}
                        className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-xl transition cursor-pointer shrink-0 ml-2"
                        title="Delete Class Schedule"
                      >
                        <FaTrash className="text-sm" />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-xs bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No classes scheduled for {selectedDayFilter === 'ALL' ? 'this institute' : selectedDayFilter === 'TODAY' ? 'today' : selectedDayFilter}.
                  <p
                    onClick={() => setShowModal(true)}
                    className="text-purple-600 dark:text-purple-400 font-bold not-italic mt-1 cursor-pointer hover:underline"
                  >
                    + Click here to schedule a class
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ADMINISTRATIVE QUICK ACTION DOCK */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-purple-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
          <div>
            <h3 className="text-base font-black text-white">Institute Administration Shortcuts</h3>
            <p className="text-xs text-purple-200 font-medium">Quick navigation to frequent institutional operations</p>
          </div>
          <span className="text-[10px] font-black text-purple-300 bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
            Fast Access
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            onClick={() => navigate('/sms-settings')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📢
            </div>
            <h4 className="font-extrabold text-sm text-white">SMS Broadcast</h4>
            <p className="text-xs text-purple-200 mt-0.5">Send instant notices to parents & students.</p>
          </div>

          <div
            onClick={() => navigate('/payments')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              💳
            </div>
            <h4 className="font-extrabold text-sm text-white">Fee Settlement</h4>
            <p className="text-xs text-purple-200 mt-0.5">Record offline payments & cash receipts.</p>
          </div>

          <div
            onClick={() => navigate('/manage-users')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              👥
            </div>
            <h4 className="font-extrabold text-sm text-white">User Directory</h4>
            <p className="text-xs text-purple-200 mt-0.5">Manage student & teacher accounts.</p>
          </div>

          <div
            onClick={() => navigate('/enrollments')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📑
            </div>
            <h4 className="font-extrabold text-sm text-white">Course Admissions</h4>
            <p className="text-xs text-purple-200 mt-0.5">View and approve student enrollments.</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. CREATE SCHEDULE MODAL */}
      {/* ========================================================================= */}
      <AddScheduleModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveSchedule}
        courses={courses}
        teachers={teachers}
        gradeOptions={gradeOptions}
      />

      <ConfirmModal
        isOpen={!!deleteScheduleModal}
        onClose={() => setDeleteScheduleModal(null)}
        onConfirm={executeDeleteSchedule}
        title="Remove Calendar Schedule"
        message={
          deleteScheduleModal
            ? `Are you sure you want to remove "${deleteScheduleModal.title}" from the calendar?`
            : ''
        }
        confirmText="Remove Entry"
        type="danger"
      />
    </div>
  );
};

// ==========================================
//            TEACHER DASHBOARD
// ==========================================
const TeacherDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    coursesCount: 0,
    studentsCount: 0,
    rating: "0.0",
    totalReviews: 0,
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
    recentReviews: [],
    coursesList: [],
    studentsList: [],
    gradingQueue: { pendingCount: 0, gradedCount: 0 },
    academicStats: { totalAssignments: 0, totalQuizzes: 0, totalQuizSubmissions: 0 }
  });
  const [schedule, setSchedule] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timetable Day Filter State
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');

  // Broadcast Class Notice Modal State
  const [showBroadcastNoticeModal, setShowBroadcastNoticeModal] = useState(false);

  // Attendance Roll Call State
  const [selectedCourse, setSelectedCourse] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState([]);
  const [rollCallStatus, setRollCallStatus] = useState({}); // { [studentId]: 'Present' | 'Absent' }
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [rollCallSearch, setRollCallSearch] = useState('');

  useEffect(() => {
    fetchTeacherData();
  }, []);

  const fetchTeacherData = async () => {
    setLoading(true);
    try {
      const [statsRes, schedRes, attRes] = await Promise.allSettled([
        api.get('/auth/teacher-stats'),
        api.get('/schedule'),
        api.get('/attendance/teacher')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        const d = statsRes.value.data;
        setStats(d);
        if (d.coursesList && d.coursesList.length > 0) {
          const firstCourseId = d.coursesList[0]._id || d.coursesList[0].id;
          setSelectedCourse(firstCourseId);
          fetchStudentsForCourse(firstCourseId);
        }
      }

      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value.data);
      if (attRes.status === 'fulfilled') setAttendanceLogs(attRes.value.data);
    } catch (err) {
      console.error("Teacher dashboard data fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentsForCourse = async (courseId) => {
    if (!courseId) return;
    try {
      const res = await api.get(`/courses/${courseId}`);
      if (res.data && res.data.enrolledStudents) {
        const list = Array.isArray(res.data.enrolledStudents) ? res.data.enrolledStudents : [];
        setEnrolledStudents(list);

        // Initialize status map to Present by default
        const initStatus = {};
        list.forEach(s => {
          const sId = typeof s === 'object' ? s._id : s;
          initStatus[sId] = 'Present';
        });
        setRollCallStatus(initStatus);
      }
    } catch (err) {
      console.error("Error fetching students for course", err);
      if (stats.studentsList && stats.studentsList.length > 0) {
        setEnrolledStudents(stats.studentsList);
        const initStatus = {};
        stats.studentsList.forEach(s => { initStatus[s._id] = 'Present'; });
        setRollCallStatus(initStatus);
      }
    }
  };

  const handleCourseChange = (e) => {
    const courseId = e.target.value;
    setSelectedCourse(courseId);
    fetchStudentsForCourse(courseId);
  };

  const toggleStudentStatus = (studentId) => {
    setRollCallStatus(prev => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present'
    }));
  };

  const markAllStudents = (status) => {
    const updated = {};
    enrolledStudents.forEach(s => {
      const sId = typeof s === 'object' ? s._id : s;
      updated[sId] = status;
    });
    setRollCallStatus(updated);
    toast.success(`Marked all students as ${status}`);
  };

  const handleSubmitRollCall = async (e) => {
    e.preventDefault();
    if (!selectedCourse) {
      toast.error("Please select a course for roll call.");
      return;
    }
    if (enrolledStudents.length === 0) {
      toast.error("No enrolled students found for this course.");
      return;
    }

    setSavingAttendance(true);
    try {
      const records = enrolledStudents.map(student => {
        const studentId = typeof student === 'object' ? student._id : student;
        return {
          studentId,
          status: rollCallStatus[studentId] || 'Present'
        };
      });

      const res = await api.post('/attendance/mark-batch', {
        courseId: selectedCourse,
        records
      });

      toast.success(res.data.message || "Attendance recorded successfully!");
      const attRes = await api.get('/attendance/teacher');
      if (attRes.data) setAttendanceLogs(attRes.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save roll call attendance.");
    } finally {
      setSavingAttendance(false);
    }
  };

  // Helper for Timetable Day of Week Filter
  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const getTodayDayCode = () => {
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[new Date().getDay()];
  };
  const todayCode = getTodayDayCode();

  const filteredSchedule = schedule.filter(sch => {
    if (selectedDayFilter === 'ALL') return true;
    if (selectedDayFilter === 'TODAY') {
      const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
      return schDay === todayCode;
    }
    const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
    return schDay === selectedDayFilter;
  });

  const filteredRollCallStudents = enrolledStudents.filter(student => {
    const name = typeof student === 'object' ? student.name || '' : '';
    const regNo = typeof student === 'object' ? student.registrationNumber || '' : '';
    const q = rollCallSearch.toLowerCase();
    return name.toLowerCase().includes(q) || regNo.toLowerCase().includes(q);
  });

  const totalReviewsCount = stats.totalReviews || 0;
  const ratingBreakdown = stats.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const pendingGradingCount = stats.gradingQueue?.pendingCount || 0;

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* 1. HERO COMMAND BANNER */}
      <DashboardHero
        user={user}
        roleBadge="Teacher / Faculty Instructor"
        extraBadge="🟢 Faculty Active"
        quickActions={
          <>
            <button
              onClick={() => navigate('/courses')}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs px-4 py-2.5 rounded-2xl transition flex items-center gap-2 shadow-lg shadow-purple-900/30 active:scale-95 cursor-pointer"
            >
              <FaVideo /> Live Classes & Lectures
            </button>
            <button
              onClick={() => navigate('/courses')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-2xl transition flex items-center gap-2 backdrop-blur-md active:scale-95 cursor-pointer"
            >
              <FaBookOpen /> My Courses
            </button>
            <button
              onClick={() => setShowBroadcastNoticeModal(true)}
              className="bg-amber-600/90 hover:bg-amber-600 text-white font-bold text-xs px-3.5 py-2.5 rounded-2xl transition flex items-center gap-1.5 shadow-xs active:scale-95 cursor-pointer"
              title="Broadcast Class Announcement"
            >
              <FaBullhorn /> Class Notice
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-2xl transition flex items-center gap-1.5 backdrop-blur-md active:scale-95 cursor-pointer"
              title="View Teaching Analytics"
            >
              <FaChartLine /> Analytics
            </button>
          </>
        }
      />

      {/* 2. STATS KPI MATRIX (5 METRICS RIBBON) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Metric 1: My Courses */}
        <div
          onClick={() => navigate('/courses')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">My Courses</span>
            <div className="w-10 h-10 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaVideo className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.coursesCount || 0}</h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-extrabold bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 rounded-md border border-purple-100 dark:border-purple-800/60">
                📚 Active Classes
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: Enrolled Students */}
        <div
          onClick={() => navigate('/courses')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Total Students</span>
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaUserGraduate className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{stats.studentsCount || 0}</h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-extrabold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-md border border-blue-100 dark:border-blue-800/60">
                👥 Enrolled Students
              </span>
            </div>
          </div>
        </div>

        {/* Metric 3: Real Average Rating */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Student Rating</span>
            <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 text-amber-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaStar className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {Number(stats.rating) > 0 ? `${stats.rating} / 5.0` : "No Ratings"}
            </h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-extrabold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md border border-amber-100 dark:border-amber-800/60">
                ⭐ {totalReviewsCount > 0 ? `${totalReviewsCount} Reviews` : 'Awaiting feedback'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 4: Pending Grading Queue */}
        <div
          onClick={() => navigate('/courses')}
          className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-rose-200 dark:hover:border-rose-800 transition-all group cursor-pointer"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Pending Grading</span>
            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaClipboardList className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{pendingGradingCount}</h3>
            <div className="mt-1.5">
              <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border ${pendingGradingCount > 0
                  ? 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60'
                  : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                }`}>
                {pendingGradingCount > 0 ? '📝 Submissions due' : '✓ All Graded'}
              </span>
            </div>
          </div>
        </div>

        {/* Metric 5: Scheduled Classes */}
        <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-3xl border border-slate-100/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">Timetable Sessions</span>
            <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <FaClock className="text-xl" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{schedule.length}</h3>
            <div className="mt-1.5">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-800/60">
                🕒 Scheduled Slots
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. REAL STUDENT REVIEWS & COURSE FEEDBACK ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Student Reviews Feed */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <FaStar className="text-amber-500" /> Student Ratings & Feedback Testimonials
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">
                  Real feedback and course ratings submitted by your enrolled students
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-black px-3 py-1 rounded-xl border border-amber-100 dark:border-amber-800/60 flex items-center gap-1.5">
                  <FaStar /> {stats.rating} / 5.0 ({totalReviewsCount} reviews)
                </span>
              </div>
            </div>

            {/* Rating Breakdown & Review List */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-700/60 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-slate-800 dark:text-white">{stats.rating}</span>
                <div className="flex items-center gap-1 text-amber-400 my-1 text-sm">
                  {[1, 2, 3, 4, 5].map(star => (
                    <FaStar key={star} className={star <= Math.round(Number(stats.rating)) ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'} />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Overall Rating</span>
              </div>

              <div className="sm:col-span-2 space-y-1.5 justify-center flex flex-col">
                {[5, 4, 3, 2, 1].map(stars => {
                  const count = ratingBreakdown[stars] || 0;
                  const pct = totalReviewsCount > 0 ? Math.round((count / totalReviewsCount) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-bold text-slate-600 dark:text-slate-300 text-[11px] shrink-0">{stars} ★</span>
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-[10px] font-bold text-slate-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Reviews Stream */}
            <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
              {stats.recentReviews && stats.recentReviews.length > 0 ? (
                stats.recentReviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                          {(rev.student?.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{rev.student?.name || rev.studentName || 'Student'}</h4>
                          <span className="text-[10px] text-slate-400 font-semibold">{rev.course?.title || rev.courseTitle || 'Course'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800/50 text-[11px] font-extrabold">
                        <FaStar /> {rev.rating}.0
                      </div>
                    </div>
                    {rev.review ? (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic pl-1 border-l-2 border-purple-300 dark:border-purple-700 my-1">
                        "{rev.review}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic pl-1">Rated {rev.rating} stars without written comments.</p>
                    )}
                    <span className="text-[9px] text-slate-400 font-semibold block text-right">
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No student reviews submitted yet. When enrolled students rate your classes, their feedback will appear here in real-time.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right (1 Col): Academic Summary & Pending Grading */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                <FaClipboardList className="text-purple-600" /> Academic & Evaluation Queue
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-400 font-medium mt-0.5">
                Assignment evaluation and quiz participation
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-300">Pending Assignment Grading</span>
                  <h4 className="text-xl font-black text-purple-950 dark:text-white mt-0.5">{pendingGradingCount} Submission{pendingGradingCount !== 1 ? 's' : ''}</h4>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center text-lg font-bold">
                  📝
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300">Active Quizzes</span>
                  <h4 className="text-xl font-black text-indigo-950 dark:text-white mt-0.5">{stats.academicStats?.totalQuizzes || 0}</h4>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">{stats.academicStats?.totalQuizSubmissions || 0} Student submissions</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg font-bold">
                  🎯
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800/50 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Graded Assignments</span>
                  <h4 className="text-xl font-black text-emerald-950 dark:text-white mt-0.5">{stats.gradingQueue?.gradedCount || 0}</h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Feedback dispatched to students</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-lg font-bold">
                  ✓
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
            <button
              onClick={() => navigate('/courses')}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
            >
              <span>Open Course Workspaces</span>
              <FaArrowRight className="text-[10px]" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. TIMETABLE & OPERATIONS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Master Timetable with Day Filter */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <FaCalendarAlt className="text-purple-600" /> My Teaching Timetable
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Recurring class schedule assigned to your lecture slots</p>
              </div>
              <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-black px-3 py-1 rounded-xl border border-purple-100 dark:border-purple-800/60">
                {schedule.length} Total Slots
              </span>
            </div>

            {/* Day of Week Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${selectedDayFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
              >
                ALL ({schedule.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayFilter('TODAY')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${selectedDayFilter === 'TODAY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800'
                  }`}
              >
                <span>TODAY ({todayCode})</span>
              </button>
              {daysOfWeek.map((day) => {
                const count = schedule.filter(s => (s.dayOfWeek || '').toUpperCase().slice(0, 3) === day).length;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(day)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${selectedDayFilter === day
                        ? 'bg-purple-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                  >
                    {day} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                  </button>
                );
              })}
            </div>

            {/* Timetable List */}
            <div className="overflow-y-auto max-h-[300px] space-y-2.5 pr-1">
              {filteredSchedule && filteredSchedule.length > 0 ? (
                filteredSchedule.map((sch) => {
                  const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
                  const isToday = schDay === todayCode;

                  return (
                    <div
                      key={sch._id}
                      className={`flex justify-between items-center p-3.5 rounded-2xl border transition-all ${isToday
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/40'
                          : 'border-slate-100 dark:border-slate-800 hover:border-purple-200 dark:hover:border-purple-800 hover:bg-purple-50/20 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                        }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className={`p-2.5 rounded-2xl flex flex-col items-center min-w-[62px] shrink-0 ${isToday ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' : 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                          }`}>
                          <span className="text-[10px] font-black uppercase tracking-wider">{sch.dayOfWeek ? sch.dayOfWeek.slice(0, 3) : 'DAY'}</span>
                          <FaCalendarAlt className="text-sm mt-0.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white truncate">{sch.title}</h4>
                            {isToday && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Happening Today
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                            <span className="flex items-center gap-1">🕒 {sch.startTime} – {sch.endTime}</span>
                            <span className="flex items-center gap-1">📍 {sch.room || 'Classroom'}</span>
                            <span className="bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-md text-[10px] font-bold">
                              {sch.className}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-xs bg-slate-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No classes scheduled for {selectedDayFilter === 'ALL' ? 'this instructor' : selectedDayFilter === 'TODAY' ? 'today' : selectedDayFilter}.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Roll Call & Real-Time Arrivals */}
        <div className="space-y-6 lg:col-span-1">
          {/* Quick Roll Call Helper */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <form onSubmit={handleSubmitRollCall} className="space-y-3.5">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Record Course Roll-Call</h3>
                <p className="text-xs text-slate-400">Save real-time class attendance to database</p>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Select Course</label>
                <select
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-xs bg-white dark:bg-slate-800 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-purple-500 font-semibold"
                  value={selectedCourse}
                  onChange={handleCourseChange}
                >
                  {stats.coursesList?.length > 0 ? (
                    stats.coursesList.map(c => (
                      <option key={c._id || c.id} value={c._id || c.id}>{c.title}</option>
                    ))
                  ) : (
                    <option value="">No Courses Assigned</option>
                  )}
                </select>
              </div>

              {/* Batch Action Buttons & Search */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <input
                  type="text"
                  placeholder="Filter student..."
                  value={rollCallSearch}
                  onChange={(e) => setRollCallSearch(e.target.value)}
                  className="w-1/2 px-2.5 py-1 text-[11px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none"
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => markAllStudents('Present')}
                    className="text-[10px] font-black px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 hover:bg-emerald-100 transition cursor-pointer"
                  >
                    All Present
                  </button>
                  <button
                    type="button"
                    onClick={() => markAllStudents('Absent')}
                    className="text-[10px] font-black px-2 py-1 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 hover:bg-rose-100 transition cursor-pointer"
                  >
                    All Absent
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 border border-slate-100 dark:border-slate-800 rounded-2xl p-2.5 max-h-[160px] overflow-y-auto">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
                  Enrolled Students ({filteredRollCallStudents.length})
                </span>
                {filteredRollCallStudents.length > 0 ? (
                  filteredRollCallStudents.map(student => {
                    const studentId = typeof student === 'object' ? student._id : student;
                    const studentName = typeof student === 'object' ? student.name : `Student (${studentId.slice(-4)})`;
                    const isPresent = rollCallStatus[studentId] === 'Present';

                    return (
                      <div key={studentId} className="flex justify-between items-center p-2 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate max-w-[130px]">{studentName}</span>
                        <button
                          type="button"
                          onClick={() => toggleStudentStatus(studentId)}
                          className={`p-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase transition cursor-pointer
                            ${isPresent
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                              : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'}`}
                        >
                          {isPresent ? "Present" : "Absent"}
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-4">No matching enrolled students</p>
                )}
              </div>

              <button
                type="submit"
                disabled={savingAttendance || enrolledStudents.length === 0}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white font-black text-xs py-2.5 rounded-xl transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shadow-md"
              >
                <FaCheck /> {savingAttendance ? "Saving..." : "Save Roll-Call Attendance"}
              </button>
            </form>
          </div>

          {/* Live Check-in Stream */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <h3 className="font-extrabold text-slate-800 dark:text-white text-base mb-1 flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Recent Arrivals Stream
            </h3>
            <p className="text-xs text-slate-400 mb-3">Real-time attendance entries for your lectures</p>

            <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
              {attendanceLogs && attendanceLogs.length > 0 ? (
                attendanceLogs.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between items-center p-2.5 rounded-xl border border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-white">{log.studentId?.name || 'Student'}</h4>
                      <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                        {log.scheduleId?.title || log.courseId?.title || 'Class'} • {new Date(log.date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${log.status === 'Present' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50' :
                      'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                      }`}>
                      {log.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-5 text-slate-400 italic text-xs">
                  No physical arrivals recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. TEACHER QUICK ACTIONS DOCK */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-purple-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
          <div>
            <h3 className="text-base font-black text-white">Faculty Quick Shortcuts</h3>
            <p className="text-xs text-purple-200 font-medium">Quick navigation to frequent teaching operations</p>
          </div>
          <span className="text-[10px] font-black text-purple-300 bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
            Fast Access
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            onClick={() => navigate('/courses')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              🎥
            </div>
            <h4 className="font-extrabold text-sm text-white">Live Classes & Streams</h4>
            <p className="text-xs text-purple-200 mt-0.5">Start or schedule live virtual lectures.</p>
          </div>

          <div
            onClick={() => navigate('/courses')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📚
            </div>
            <h4 className="font-extrabold text-sm text-white">Manage Coursework</h4>
            <p className="text-xs text-purple-200 mt-0.5">Upload notes, quizzes & assignments.</p>
          </div>

          <div
            onClick={() => setShowBroadcastNoticeModal(true)}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📢
            </div>
            <h4 className="font-extrabold text-sm text-white">Broadcast Class Notice</h4>
            <p className="text-xs text-purple-200 mt-0.5">Publish instant notices to your students.</p>
          </div>

          <div
            onClick={() => navigate('/analytics')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📈
            </div>
            <h4 className="font-extrabold text-sm text-white">Teaching Analytics</h4>
            <p className="text-xs text-purple-200 mt-0.5">Track attendance & learning progress.</p>
          </div>
        </div>
      </div>

      {/* TEACHER BROADCAST CLASS NOTICE MODAL */}
      <BroadcastClassNoticeModal
        isOpen={showBroadcastNoticeModal}
        onClose={() => setShowBroadcastNoticeModal(false)}
        coursesList={stats.coursesList || []}
      />
    </div>
  );
};

// ==========================================
//            STUDENT DASHBOARD
// ==========================================
const StudentDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    coursesCount: 0,
    grade: 'Grade 10',
    enrolledCoursesList: [],
    upcomingTasks: [],
    activeQuizzes: [],
    payments: [],
    latestReceipt: null,
    attendanceStats: { percentage: 100 },
    announcements: []
  });
  const [schedule, setSchedule] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Timetable Day Filter State
  const [selectedDayFilter, setSelectedDayFilter] = useState('ALL');

  // Modals State
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [ratingModalCourse, setRatingModalCourse] = useState(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    setLoading(true);
    try {
      const [statsRes, schedRes, attRes] = await Promise.allSettled([
        api.get('/auth/student-stats'),
        api.get('/schedule'),
        api.get('/attendance/my')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value.data) {
        setStats(statsRes.value.data);
      }
      if (schedRes.status === 'fulfilled') setSchedule(schedRes.value.data);
      if (attRes.status === 'fulfilled') setAttendance(attRes.value.data);
    } catch (err) {
      console.error("Student dashboard data fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSubmitted = (courseId, newRating, newReview) => {
    setStats(prev => ({
      ...prev,
      enrolledCoursesList: (prev.enrolledCoursesList || []).map(c => {
        if (c._id === courseId || c.id === courseId) {
          return { ...c, myRating: newRating, myReviewText: newReview };
        }
        return c;
      })
    }));
    fetchStudentData();
  };

  const activeCourse = stats.enrolledCoursesList?.length > 0 ? stats.enrolledCoursesList[0] : null;
  const otherCourses = stats.enrolledCoursesList?.length > 1 ? stats.enrolledCoursesList.slice(1) : [];
  const hasVerifiedEmail = !!user?.isEmailVerified && !!user?.email;

  // Helper for Timetable Day of Week Filter
  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const getTodayDayCode = () => {
    const map = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
    return map[new Date().getDay()];
  };
  const todayCode = getTodayDayCode();

  const filteredSchedule = schedule.filter(sch => {
    if (selectedDayFilter === 'ALL') return true;
    if (selectedDayFilter === 'TODAY') {
      const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
      return schDay === todayCode;
    }
    const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
    return schDay === selectedDayFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Unverified Email Warning Banner */}
      {!hasVerifiedEmail && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl shadow-md p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/20 rounded-xl text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Complete Your Profile: Add & Verify Email</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                You are currently registered with mobile credentials only. Add your email in Account Settings to receive official notices, payment receipts, and class updates.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="px-4 py-2 bg-white text-amber-900 font-bold text-xs rounded-xl shadow hover:bg-amber-50 transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            Go to Settings →
          </button>
        </div>
      )}

      {/* Hero Banner */}
      <DashboardHero
        user={user}
        roleBadge={`Student • ${stats.grade || user.grade || 'Grade 10'}`}
        quickActions={
          <>
            <button
              onClick={() => navigate('/courses')}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 shadow-lg cursor-pointer active:scale-95"
            >
              <FaBookOpen /> Browse All Courses
            </button>
            <button
              onClick={() => navigate('/payments')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-4 py-2.5 rounded-xl transition flex items-center gap-2 backdrop-blur-md cursor-pointer active:scale-95"
            >
              <FaCoins /> Fee Portal
            </button>
            <button
              onClick={() => navigate('/analytics')}
              className="bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs px-3.5 py-2.5 rounded-xl transition flex items-center gap-1.5 backdrop-blur-md cursor-pointer active:scale-95"
            >
              <FaChartLine /> Analytics
            </button>
          </>
        }
      />

      {/* 1. DYNAMIC REAL COURSE PROGRESS HERO CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-indigo-950 rounded-3xl shadow-xl p-6 sm:p-8 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden border border-purple-900/40">
        <div className="absolute right-0 top-0 w-64 h-64 bg-purple-500/15 rounded-full blur-3xl transform translate-x-12 -translate-y-12 pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-2 flex-wrap mb-2.5">
            <span className="bg-purple-500/25 border border-purple-400/30 px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-purple-200">
              Active Course Progress
            </span>
            {activeCourse?.instructorName && (
              <span className="bg-white/10 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold text-purple-200">
                👨‍🏫 {activeCourse.instructorName}
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-black mb-1.5 tracking-tight text-white">
            {activeCourse ? activeCourse.title : "No Active Enrolled Course"}
          </h2>
          <p className="text-purple-200/80 text-xs mb-3 font-medium line-clamp-2">
            {activeCourse ? (activeCourse.description || "Course modules, lecture videos, notes, and quizzes available.") : "Enroll in courses to unlock live learning modules."}
          </p>

          {/* Real Dynamic Progress Bar & Metrics */}
          {activeCourse && (
            <div className="space-y-2 mt-2">
              <div className="w-full sm:w-80 h-2.5 bg-slate-950/80 rounded-full overflow-hidden border border-white/10">
                <div
                  className="bg-gradient-to-r from-purple-400 via-indigo-400 to-emerald-400 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${activeCourse.progress || 0}%` }}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-purple-200 font-extrabold">
                <span className="text-emerald-400 font-black">{activeCourse.progress || 0}% Completed</span>
                <span>•</span>
                <span>📄 {activeCourse.completedMaterialsCount || 0}/{activeCourse.materialsCount || 0} PDFs</span>
                <span>•</span>
                <span>🎯 {activeCourse.completedQuizzesCount || 0}/{activeCourse.quizzesCount || 0} Quizzes</span>
                <span>•</span>
                <span>📝 {activeCourse.submittedAssignmentsCount || 0}/{activeCourse.assignmentsCount || 0} Assignments</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 shrink-0">
          {activeCourse ? (
            <>
              <button
                onClick={() => navigate(`/course/${activeCourse._id || activeCourse.id}`)}
                className="bg-white text-slate-900 hover:bg-slate-100 px-5 py-3 rounded-2xl font-black text-xs transition shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <FaPlayCircle className="text-base text-purple-700" /> Resume Learning
              </button>
              <button
                onClick={() => setRatingModalCourse(activeCourse)}
                className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-3 rounded-2xl font-black text-xs transition shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95 border border-amber-400/40"
                title="Rate this course and instructor"
              >
                <FaStar /> {activeCourse.myRating ? `Rated ${activeCourse.myRating}★` : "Rate Course"}
              </button>
            </>
          ) : (
            <button
              onClick={() => navigate('/courses')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl font-bold text-xs transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              Explore Course Offerings
            </button>
          )}
        </div>
      </div>

      {/* Multiple Enrolled Courses Strip (if enrolled in more than 1) */}
      {otherCourses.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Other Enrolled Courses ({otherCourses.length})
            </h3>
            <button onClick={() => navigate('/courses')} className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer">
              View All Courses &rarr;
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherCourses.map((c) => (
              <div
                key={c._id}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-black text-sm text-slate-800 dark:text-white truncate">{c.title}</h4>
                    <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                      {c.progress || 0}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mb-3 truncate">👨‍🏫 {c.instructorName || 'Faculty Instructor'}</p>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-3">
                    <div className="h-full bg-purple-600 rounded-full" style={{ width: `${c.progress || 0}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => navigate(`/course/${c._id || c.id}`)}
                    className="flex-1 py-2 bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-black text-xs rounded-xl transition text-center cursor-pointer"
                  >
                    Open Course
                  </button>
                  <button
                    onClick={() => setRatingModalCourse(c)}
                    className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl hover:bg-amber-100 transition cursor-pointer text-xs"
                    title="Rate Course"
                  >
                    <FaStar />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. STATS KPI MATRIX (3 METRICS) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Enrolled Courses count */}
        <div
          onClick={() => navigate('/courses')}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs flex items-center gap-4 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="p-4 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-110 transition-transform">
            <FaTrophy className="text-2xl" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Enrolled Courses</p>
            <h3 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">{stats.coursesCount}</h3>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-extrabold bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2 py-0.5 rounded-full inline-block mt-1">Active Classes</span>
          </div>
        </div>

        {/* Circular Attendance Indicator */}
        <div
          onClick={() => navigate('/attendance')}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex items-center justify-between cursor-pointer"
        >
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Attendance Rating</h4>
            <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
              Logged: {attendance.length} class session{attendance.length !== 1 ? 's' : ''}
            </p>
            <p className="text-4xs text-slate-400 font-medium mt-1">
              Present: {attendance.filter(r => r.status === 'Present').length} | Absent: {attendance.filter(r => r.status === 'Absent').length}
            </p>
          </div>
          <AttendanceRing percentage={stats.attendanceStats?.percentage || 100} />
        </div>

        {/* Tuition Fees Status */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400">Tuition Fees Status</h4>
              <p className="text-3xs text-slate-500 dark:text-slate-400 font-semibold mt-0.5">
                {stats.latestReceipt ? `Last Paid: ${new Date(stats.latestReceipt.date).toLocaleDateString()}` : 'Monthly Tuition Record'}
              </p>
            </div>
            <span className="text-4xs font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 px-2.5 py-1 rounded-full">
              {stats.latestReceipt ? 'Paid ✅' : 'Up to Date'}
            </span>
          </div>

          <div className="mt-4 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 rounded-2xl p-3 border border-slate-100 dark:border-slate-700/60">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-white">
                {stats.latestReceipt ? `Receipt #${stats.latestReceipt.receiptNo}` : 'Monthly Fee Status'}
              </p>
              <p className="text-4xs text-slate-400 dark:text-slate-400 font-semibold mt-0.5">
                {stats.latestReceipt ? `LKR ${stats.latestReceipt.amount.toLocaleString()}` : 'No Pending Dues'}
              </p>
            </div>
            {stats.latestReceipt && (
              <button
                onClick={() => setShowInvoiceModal(true)}
                className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 text-3xs font-extrabold bg-purple-50 dark:bg-purple-950/50 px-3 py-1.5 rounded-xl cursor-pointer transition"
              >
                View Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. ACADEMIC TASKS, DEADLINES & NOTICE BOARD GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left (2 Cols): Upcoming Tasks & Active Quizzes */}
        <div className="space-y-6 lg:col-span-2">
          {/* Upcoming Assignment Deadlines */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <FaClipboardList className="text-purple-600" /> Upcoming Assignments & Tasks
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Assignment deadlines and evaluation feedback</p>
              </div>
              <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-black px-3 py-1 rounded-xl border border-purple-100 dark:border-purple-800/60">
                {stats.upcomingTasks?.length || 0} Tasks
              </span>
            </div>

            <div className="space-y-3">
              {stats.upcomingTasks && stats.upcomingTasks.length > 0 ? (
                stats.upcomingTasks.map((task) => {
                  const isGraded = task.submissionStatus === 'graded';
                  const isSubmitted = task.isSubmitted;
                  return (
                    <div
                      key={task._id}
                      className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-slate-800 dark:text-white">{task.title}</h4>
                          <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 rounded-md">
                            {task.courseTitle}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 font-medium">
                          📅 Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'} • Max: {task.maxMarks} marks
                        </p>
                        {task.feedback && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold italic mt-1">
                            Feedback: "{task.feedback}"
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase ${isGraded
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
                            : isSubmitted
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200'
                          }`}>
                          {isGraded ? `Score: ${task.marks}/${task.maxMarks}` : isSubmitted ? '✓ Submitted' : '⏳ Pending'}
                        </span>
                        <button
                          onClick={() => navigate(`/course/${task.courseId}`)}
                          className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                        >
                          {isSubmitted ? 'View' : 'Submit'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No pending assignments right now. You are completely up to date!
                </div>
              )}
            </div>
          </div>

          {/* Active Quizzes Ready to Take */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <FaTrophy className="text-amber-500" /> Active Quizzes & Self-Assessments
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Test your knowledge on course modules</p>
              </div>
              <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-black px-3 py-1 rounded-xl border border-amber-100 dark:border-amber-800/60">
                {stats.activeQuizzes?.length || 0} Quizzes
              </span>
            </div>

            <div className="space-y-3">
              {stats.activeQuizzes && stats.activeQuizzes.length > 0 ? (
                stats.activeQuizzes.map((quiz) => (
                  <div
                    key={quiz._id}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition flex items-center justify-between gap-3"
                  >
                    <div>
                      <h4 className="text-xs font-black text-slate-800 dark:text-white">{quiz.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {quiz.courseTitle} • {quiz.totalQuestions} Questions
                      </p>
                    </div>
                    <div>
                      {quiz.isAttempted ? (
                        <span className="text-[10px] font-black px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200">
                          Score: {quiz.score}/{quiz.totalPoints}
                        </span>
                      ) : (
                        <button
                          onClick={() => navigate(`/take-quiz/${quiz._id}`)}
                          className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl transition shadow-xs cursor-pointer active:scale-95"
                        >
                          Take Quiz 🚀
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No active quizzes currently available for your enrolled courses.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right (1 Col): Notice Board & Broadcast Announcements */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <FaBullhorn className="text-amber-500" /> Institute Notices
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-400 font-medium">Broadcast updates and alerts</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {stats.announcements && stats.announcements.length > 0 ? (
                stats.announcements.map((notif) => (
                  <div
                    key={notif._id}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{notif.title || 'Notice'}</h4>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No active announcements right now.
                </div>
              )}
            </div>
          </div>

          {/* Quick Rate Course Callout */}
          {activeCourse && (
            <div className="bg-gradient-to-br from-amber-500/10 via-purple-500/10 to-indigo-500/10 p-5 rounded-3xl border border-amber-200/60 dark:border-amber-800/40 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⭐</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-white">Rate Your Experience</h4>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Help instructors improve your classes</p>
                </div>
              </div>
              <button
                onClick={() => setRatingModalCourse(activeCourse)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-2xl transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <FaStar /> {activeCourse.myRating ? "Update My Rating & Review" : "Submit Course Rating"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 4. TIMETABLE & DIGITAL ID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Timetable & Physical Check-in Logs */}
        <div className="space-y-6 lg:col-span-2">
          {/* Timetable List */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base flex items-center gap-2">
                  <FaCalendarAlt className="text-purple-600" /> My Timetable ({stats.grade})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Weekly class schedule matching your registered grade</p>
              </div>
              <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-black px-3 py-1 rounded-xl border border-purple-100 dark:border-purple-800/60">
                {schedule?.length || 0} Classes Scheduled
              </span>
            </div>

            {/* Day of Week Filter Bar */}
            <div className="flex flex-wrap items-center gap-1.5 mb-4 p-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setSelectedDayFilter('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer ${selectedDayFilter === 'ALL'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                  }`}
              >
                ALL ({schedule.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedDayFilter('TODAY')}
                className={`px-3 py-1 rounded-xl text-xs font-black transition cursor-pointer flex items-center gap-1 ${selectedDayFilter === 'TODAY'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800'
                  }`}
              >
                <span>TODAY ({todayCode})</span>
              </button>
              {daysOfWeek.map((day) => {
                const count = schedule.filter(s => (s.dayOfWeek || '').toUpperCase().slice(0, 3) === day).length;
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDayFilter(day)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${selectedDayFilter === day
                        ? 'bg-purple-600 text-white shadow-xs font-black'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700'
                      }`}
                  >
                    {day} {count > 0 && <span className="opacity-70 text-[10px]">({count})</span>}
                  </button>
                );
              })}
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {filteredSchedule && filteredSchedule.length > 0 ? (
                filteredSchedule.map((sch) => {
                  const schDay = (sch.dayOfWeek || '').toUpperCase().slice(0, 3);
                  const isToday = schDay === todayCode;

                  return (
                    <div
                      key={sch._id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition gap-3 ${isToday
                          ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20'
                          : 'border-slate-100 dark:border-slate-800 hover:bg-purple-50/20 dark:hover:bg-slate-800/60'
                        }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`px-3 py-2 rounded-2xl text-xs min-w-[70px] text-center uppercase font-black ${isToday
                            ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                            : 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-800/50'
                          }`}>
                          {sch.dayOfWeek ? sch.dayOfWeek.slice(0, 3) : 'DAY'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-slate-800 dark:text-white">{sch.title}</h4>
                            {isToday && (
                              <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                                Happening Today
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                            🕒 {sch.startTime} - {sch.endTime} &nbsp;|&nbsp; 📍 Room: {sch.room || 'Main Hall'}
                          </p>
                        </div>
                      </div>
                      {(() => {
                        const teacherDisplayName = sch.courseId?.instructor?.name || sch.teacherId?.name || sch.teacherName;
                        if (!teacherDisplayName) return null;
                        return (
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full shrink-0 border border-slate-200 dark:border-slate-700">
                            👨‍🏫 {teacherDisplayName}
                          </span>
                        );
                      })()}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-slate-400 italic text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No classes scheduled for {selectedDayFilter === 'ALL' ? `your grade (${stats.grade})` : selectedDayFilter === 'TODAY' ? 'today' : selectedDayFilter}.
                </div>
              )}
            </div>
          </div>

          {/* Entrance Check-in Log */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 dark:text-white text-base">My Physical Check-in Log</h3>
                <p className="text-xs text-slate-400 mt-0.5">Your recent physical entrance arrival records</p>
              </div>
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Recent 5 Sessions
              </span>
            </div>

            <div className="space-y-2.5">
              {attendance && attendance.length > 0 ? (
                attendance.slice(0, 5).map((log) => (
                  <div key={log._id} className="flex justify-between items-center p-3 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white">{log.scheduleId?.title || log.courseId?.title || 'Class Session'}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">📅 {new Date(log.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${log.status === 'Present'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50'
                      }`}>
                      {log.status === 'Present' ? '✓ Present' : '✗ Absent'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  No physical entrance check-ins recorded yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1 Col): Digital QR Student Pass & ID */}
        <div className="lg:col-span-1">
          <StudentIdCard user={user} />
        </div>
      </div>

      {/* 5. STUDENT QUICK ACTIONS DOCK */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-lg border border-purple-800/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
          <div>
            <h3 className="text-base font-black text-white">Student Learning Shortcuts</h3>
            <p className="text-xs text-purple-200 font-medium">Quick navigation to frequent student operations</p>
          </div>
          <span className="text-[10px] font-black text-purple-300 bg-white/10 px-3 py-1 rounded-full uppercase tracking-wider">
            Fast Access
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div
            onClick={() => navigate('/courses')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📚
            </div>
            <h4 className="font-extrabold text-sm text-white">Course Library</h4>
            <p className="text-xs text-purple-200 mt-0.5">Explore lectures, notes & materials.</p>
          </div>

          <div
            onClick={() => navigate('/payments')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              💳
            </div>
            <h4 className="font-extrabold text-sm text-white">Fee Payments</h4>
            <p className="text-xs text-purple-200 mt-0.5">Settle class fees & download receipts.</p>
          </div>

          <div
            onClick={() => navigate('/analytics')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              📊
            </div>
            <h4 className="font-extrabold text-sm text-white">My Academic Report</h4>
            <p className="text-xs text-purple-200 mt-0.5">View your overall marks & progress.</p>
          </div>

          <div
            onClick={() => navigate('/settings')}
            className="p-4 rounded-2xl bg-white/10 hover:bg-white/20 transition-all border border-white/10 cursor-pointer group active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center text-lg mb-2.5 group-hover:scale-110 transition-transform">
              ⚙️
            </div>
            <h4 className="font-extrabold text-sm text-white">Account Settings</h4>
            <p className="text-xs text-purple-200 mt-0.5">Update credentials & verify email.</p>
          </div>
        </div>
      </div>

      {/* REAL PAYMENT RECEIPT MODAL */}
      {showInvoiceModal && stats.latestReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 max-w-sm w-full mx-4 transform scale-100 transition-all text-slate-800 dark:text-white">
            <div className="text-center pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl w-12 h-12 flex items-center justify-center mx-auto mb-2">
                <FaReceipt className="text-xl" />
              </div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">LuminaLearn Tuition Institute</h3>
              <p className="text-4xs text-slate-400 font-medium">Receipt #{stats.latestReceipt.receiptNo}</p>
            </div>

            <div className="py-4 space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex justify-between font-medium">
                <span>Student Name:</span>
                <span className="text-slate-800 dark:text-white font-bold">{user?.name}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Registration No:</span>
                <span className="text-slate-800 dark:text-white font-bold">{user?.registrationNumber || '-'}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Payment Purpose:</span>
                <span className="text-slate-800 dark:text-white font-bold">{stats.latestReceipt.courseTitle}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Payment Method:</span>
                <span className="text-slate-800 dark:text-white font-bold">{stats.latestReceipt.paymentMethod}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Date Paid:</span>
                <span className="text-slate-800 dark:text-white font-bold">{new Date(stats.latestReceipt.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between font-medium border-t border-slate-100 dark:border-slate-800 pt-2.5 text-sm">
                <span className="font-bold text-slate-800 dark:text-white">Amount Paid:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">LKR {stats.latestReceipt.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-center border-t border-slate-100 dark:border-slate-800 pt-4">
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-md"
              >
                Close Receipt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATING & REVIEW MODAL */}
      <RateCourseModal
        isOpen={!!ratingModalCourse}
        onClose={() => setRatingModalCourse(null)}
        course={ratingModalCourse}
        onRatingSubmitted={handleRatingSubmitted}
      />
    </div>
  );
};

// ==========================================
//          MAIN DASHBOARD CONTROLLER
// ==========================================
const Dashboard = () => {
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : { name: 'Guest', role: 'student' };

  if (user.role === 'parent') {
    return <Navigate to="/parent-dashboard" replace />;
  }

  if (user.role === 'counter_staff') {
    return <Navigate to="/attendance" replace />;
  }

  return (
    <div className="w-full">
      {/* Role-Based Switchboard */}
      {user.role === 'admin' && <AdminDashboard user={user} />}
      {user.role === 'teacher' && <TeacherDashboard user={user} />}
      {user.role === 'student' && <StudentDashboard user={user} />}
    </div>
  );
};

export default Dashboard;