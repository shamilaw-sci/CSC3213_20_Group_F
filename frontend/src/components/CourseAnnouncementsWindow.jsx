import React, { useState } from 'react';
import { FaBullhorn, FaChevronDown, FaChevronUp, FaChalkboardTeacher, FaCalendarAlt } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

export default function CourseAnnouncementsWindow({ 
  course, 
  lessons = [], 
  selectedGrade, 
  isTeacherOrAdmin = false,
  isExpanded,
  onToggle 
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  const isCollapsed = isExpanded !== undefined ? !isExpanded : internalCollapsed;
  const toggleCollapse = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalCollapsed(prev => !prev);
    }
  };

  // Only students should see this window
  if (isTeacherOrAdmin) {
    return null;
  }

  // Normalize grade string helper
  const normalize = (g) => {
    if (!g) return '';
    const str = String(g).toLowerCase().trim();
    const match = str.match(/\d+/);
    return match ? match[0] : str;
  };

  const currentGradeNorm = normalize(selectedGrade);

  // Collect all announcements for this course/grade
  const announcements = React.useMemo(() => {
    const list = [];
    const targetLessons = lessons.filter(l => 
      !currentGradeNorm || normalize(l.grade) === currentGradeNorm
    );

    targetLessons.forEach((l) => {
      if (l.teacherMessage && l.teacherMessage.trim() && l.teacherMessage !== 'No teacher message for this class yet.') {
        const date = l.updatedAt || l.createdAt || null;
        list.push({
          id: l._id ? `lesson-${l._id}` : `msg-${Math.random()}`,
          text: l.teacherMessage.trim(),
          date: date,
          title: l.liveStream?.title || (l.grade ? `Grade ${l.grade} Class` : 'Class Announcement'),
          grade: l.grade,
          authorName: course?.instructor?.name || 'Instructor',
          authorAvatar: course?.instructor?.profilePicture || course?.instructor?.avatar || '',
          authorRole: course?.instructor?.role || 'teacher'
        });
      }
    });

    // Also check course grade messages if available
    if (course?.enrolledGrades) {
      course.enrolledGrades.forEach(g => {
        if (!currentGradeNorm || normalize(g.gradeNumber) === currentGradeNorm) {
          if (Array.isArray(g.messages)) {
            g.messages.forEach((m, idx) => {
              if (m.text && m.text.trim()) {
                list.push({
                  id: m._id || `grade-msg-${idx}`,
                  text: m.text.trim(),
                  date: m.createdAt || null,
                  title: g.title || `Grade ${g.gradeNumber} Announcement`,
                  grade: g.gradeNumber,
                  authorName: course?.instructor?.name || 'Instructor',
                  authorAvatar: course?.instructor?.profilePicture || course?.instructor?.avatar || '',
                  authorRole: course?.instructor?.role || 'teacher'
                });
              }
            });
          }
        }
      });
    }

    // Sort descending by date (latest announcement on top)
    return list.sort((a, b) => {
      const timeA = a.date ? new Date(a.date).getTime() : 0;
      const timeB = b.date ? new Date(b.date).getTime() : 0;
      return timeB - timeA;
    });
  }, [lessons, course, currentGradeNorm]);

  const hasAnnouncements = announcements.length > 0;

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return 'Recent Update';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Recent Update';
    }
  };

  // Helper for image URLs
  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
    return `${base}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const [hasBeenSeen, setHasBeenSeen] = useState(false);

  const handleContainerClick = () => {
    if (!hasBeenSeen) {
      setHasBeenSeen(true);
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      className={`relative rounded-3xl border transition-all duration-300 shadow-xl overflow-hidden ${
        isDark 
          ? 'bg-slate-900/95 border-amber-900/40 shadow-slate-950/60' 
          : 'bg-gradient-to-br from-[#fffdf7] via-white to-[#fff9ee] border-amber-300/80 shadow-amber-900/5'
      } ${hasAnnouncements && !hasBeenSeen ? 'ring-2 ring-emerald-500/60 border-emerald-400 dark:border-emerald-500/60' : ''}`}
    >
      {hasAnnouncements && !hasBeenSeen && (
        <span className="absolute -top-1 -left-1 flex h-3.5 w-3.5 z-20 pointer-events-none" title="New announcements">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 shadow-xs shadow-emerald-500/50"></span>
        </span>
      )}

      {/* Header Bar */}
      <div 
        onClick={toggleCollapse}
        className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none cursor-pointer transition-colors ${
          isDark 
            ? 'hover:bg-slate-800/60' 
            : 'hover:bg-amber-50/50'
        }`}
      >
        {/* Left: Icon & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 text-white flex items-center justify-center text-lg sm:text-xl font-black shrink-0 shadow-md shadow-amber-500/30 border border-amber-300/40">
            <FaBullhorn className="transform -rotate-12 drop-shadow-xs" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-tight truncate">
                Course Announcements
              </h3>
              {hasAnnouncements && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 dark:border-amber-700/50 shadow-2xs shrink-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>{announcements.length} {announcements.length === 1 ? 'Notice' : 'Notices'}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium truncate">
              {hasAnnouncements 
                ? 'Important guidelines, schedule reminders, and notices from your teacher'
                : 'No notices or announcements published for this course yet'}
            </p>
          </div>
        </div>

        {/* Right: Expand / Collapse Button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse();
            }}
            className={`px-3.5 py-1.5 rounded-xl border text-xs font-black transition-all duration-200 flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95 ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200' 
                : 'bg-white hover:bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            {isCollapsed ? (
              <>
                <FaChevronDown className="text-[10px]" />
                <span>Expand</span>
              </>
            ) : (
              <>
                <FaChevronUp className="text-[10px]" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body: Announcements List (when !isCollapsed) */}
      {!isCollapsed && (
        <div className={`p-4 sm:p-6 pt-2 border-t space-y-3.5 transition-all duration-300 ${
          isDark ? 'border-slate-800/80' : 'border-amber-100'
        }`}>
          {!hasAnnouncements ? (
            <div className={`p-6 rounded-2xl border border-dashed text-center text-xs sm:text-sm font-semibold italic ${
              isDark ? 'bg-slate-950/40 border-slate-800 text-slate-400' : 'bg-amber-50/30 border-amber-200 text-amber-800/80'
            }`}>
              No announcement or teacher notice published for this course yet.
            </div>
          ) : (
            announcements.map((ann, idx) => (
              <div
                key={ann.id || idx}
                className={`p-4 sm:p-5 rounded-2xl border border-l-4 transition-all duration-200 space-y-3 shadow-xs ${
                  idx === 0
                    ? (isDark
                        ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-800/60 border-l-amber-500'
                        : 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-200 border-l-amber-500')
                    : (isDark
                        ? 'bg-slate-800/50 border-slate-700 border-l-amber-600/70'
                        : 'bg-white border-slate-200 border-l-amber-400')
                }`}
              >
                {/* Author & Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap border-b pb-2.5 border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center text-xs font-black shadow-xs shrink-0 ring-2 ring-amber-400/30 overflow-hidden">
                      {ann.authorAvatar ? (
                        <img 
                          src={getImageUrl(ann.authorAvatar)} 
                          alt={ann.authorName} 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <FaChalkboardTeacher />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                          {ann.authorName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-100 dark:bg-amber-950/90 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 shrink-0">
                          Teacher
                        </span>
                        {idx === 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shrink-0">
                            Latest
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date Stamp */}
                  <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-semibold shrink-0">
                    <FaCalendarAlt className="text-[10px] text-amber-500" />
                    <span>{formatDate(ann.date)}</span>
                  </div>
                </div>

                {/* Announcement Message Content */}
                <div className="text-xs sm:text-sm leading-relaxed font-semibold text-slate-800 dark:text-slate-200 whitespace-pre-line pl-1">
                  "{ann.text}"
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
