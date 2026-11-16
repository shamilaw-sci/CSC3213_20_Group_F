/**
 * @file InteractiveCalendar.jsx
 * @description Interactive Timetable Calendar. Full calendar view rendering class schedules, scheduled live streams, exam dates, and monthly/weekly views.
 */

import React, { useState, useMemo } from 'react';
import {
  FaCalendarAlt,
  FaCalendarDay,
  FaCalendarWeek,
  FaList,
  FaChevronLeft,
  FaChevronRight,
  FaPlusCircle,
  FaClock,
  FaMapMarkerAlt,
  FaChalkboardTeacher,
  FaGraduationCap,
  FaExclamationTriangle,
  FaEdit,
  FaTrash,
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaFilter,
  FaUserClock,
  FaDoorOpen
} from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SHORT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper: Format Date to YYYY-MM-DD in local time
export const formatDateKey = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: Parse HH:MM AM/PM to minutes for sorting
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const isPM = /pm/i.test(str);
  const isAM = /am/i.test(str);
  const clean = str.replace(/(am|pm)/i, '').trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10) || 0;
  let m = parseInt(parts[1], 10) || 0;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  return h * 60 + m;
};

export default function InteractiveCalendar({
  schedules = [],
  role = 'student',
  onAddSchedule,
  onEditSchedule,
  onReschedule,
  onDeleteSchedule,
  onManageAvailability,
  onViewClassrooms
}) {
  const { isDark } = useTheme();

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // 'month' | 'week' | 'day' | 'list'
  const [selectedScheduleDetail, setSelectedScheduleDetail] = useState(null);

  // Filters State
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'class' | 'examination'
  const [filterRoom, setFilterRoom] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() - 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setDate(next.getDate() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') {
      next.setMonth(next.getMonth() + 1);
    } else if (viewMode === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setDate(next.getDate() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Extract distinct venues for filter dropdown
  const venueOptions = useMemo(() => {
    const set = new Set();
    schedules.forEach(s => {
      if (s.room) set.add(s.room);
      if (s.rescheduledTo?.room) set.add(s.rescheduledTo.room);
    });
    return Array.from(set);
  }, [schedules]);

  // Filter schedules by type, room, query
  const filteredSchedules = useMemo(() => {
    return schedules.filter(sch => {
      if (filterType !== 'ALL' && (sch.eventType || 'class') !== filterType) return false;
      const activeRoom = sch.rescheduledTo?.room || sch.room || '';
      if (filterRoom !== 'ALL' && activeRoom !== filterRoom) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (sch.title || '').toLowerCase().includes(q);
        const matchClass = (sch.className || '').toLowerCase().includes(q);
        const matchTeacher = (sch.teacherId?.name || sch.courseId?.instructor?.name || '').toLowerCase().includes(q);
        const matchSubject = (sch.subject || '').toLowerCase().includes(q);
        if (!matchTitle && !matchClass && !matchTeacher && !matchSubject) return false;
      }
      return true;
    });
  }, [schedules, filterType, filterRoom, searchQuery]);

  // Match schedules for a given Date object
  const getSchedulesForDate = (dateObj) => {
    const dateKey = formatDateKey(dateObj);
    const dayName = DAY_NAMES[dateObj.getDay()];

    return filteredSchedules.filter(sch => {
      // 1. If schedule was rescheduled to this specific date
      if (sch.status === 'rescheduled' && sch.rescheduledTo?.date) {
        return sch.rescheduledTo.date === dateKey;
      }
      // 2. If schedule is a specific date event
      if (sch.date) {
        return sch.date === dateKey;
      }
      // 3. If recurring weekly schedule matches this day of week
      if (sch.dayOfWeek && sch.dayOfWeek.toLowerCase() === dayName.toLowerCase()) {
        // If it was rescheduled to another date, don't show on original day unless status is kept
        if (sch.status === 'rescheduled' && sch.rescheduledTo?.date && sch.rescheduledTo.date !== dateKey) {
          return false;
        }
        return true;
      }
      return false;
    }).sort((a, b) => {
      const timeA = a.rescheduledTo?.startTime || a.startTime;
      const timeB = b.rescheduledTo?.startTime || b.startTime;
      return timeToMinutes(timeA) - timeToMinutes(timeB);
    });
  };

  // Calendar Title String
  const calendarTitle = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = MONTH_NAMES[currentDate.getMonth()];
    if (viewMode === 'month') {
      return `${month} ${year}`;
    }
    if (viewMode === 'day') {
      return `${DAY_NAMES[currentDate.getDay()]}, ${currentDate.getDate()} ${month} ${year}`;
    }
    if (viewMode === 'week') {
      // Get week range (Monday to Sunday)
      const curr = new Date(currentDate);
      const first = curr.getDate() - ((curr.getDay() + 6) % 7); // Monday
      const monday = new Date(curr.setDate(first));
      const sunday = new Date(curr.setDate(first + 6));
      return `${monday.getDate()} ${MONTH_NAMES[monday.getMonth()].slice(0, 3)} – ${sunday.getDate()} ${MONTH_NAMES[sunday.getMonth()].slice(0, 3)} ${year}`;
    }
    return `Institute Master Timetable (${year})`;
  }, [currentDate, viewMode]);

  // Status visual badge helper
  const getEventBadge = (sch) => {
    if (sch.status === 'postponed') {
      return {
        bg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
        label: 'Postponed',
        icon: '⚠️'
      };
    }
    if (sch.status === 'rescheduled') {
      return {
        bg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        label: 'Rescheduled',
        icon: '🔄'
      };
    }
    if (sch.eventType === 'examination') {
      return {
        bg: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        label: 'Examination',
        icon: '📝'
      };
    }
    return {
      bg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
      label: 'Class',
      icon: '📘'
    };
  };

  // ==========================================
  //            MONTHLY VIEW BUILDER
  // ==========================================
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const totalDays = lastDayOfMonth.getDate();
    const startDayIndex = firstDayOfMonth.getDay(); // 0 is Sunday

    const calendarCells = [];

    // Previous month filler days
    const prevMonthLastDate = new Date(year, month, 0).getDate();
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const fillerDate = new Date(year, month - 1, prevMonthLastDate - i);
      calendarCells.push({
        date: fillerDate,
        isCurrentMonth: false,
        key: `prev-${prevMonthLastDate - i}`
      });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day);
      calendarCells.push({
        date,
        isCurrentMonth: true,
        key: `curr-${day}`
      });
    }

    // Next month trailing filler days to complete rows (7 * 5 or 7 * 6)
    const remaining = 7 - (calendarCells.length % 7);
    if (remaining < 7) {
      for (let day = 1; day <= remaining; day++) {
        const fillerDate = new Date(year, month + 1, day);
        calendarCells.push({
          date: fillerDate,
          isCurrentMonth: false,
          key: `next-${day}`
        });
      }
    }

    const todayKey = formatDateKey(new Date());

    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-center font-black text-xs py-2.5 text-slate-700 dark:text-slate-300">
          {SHORT_DAYS.map((d, i) => (
            <div key={d} className={`uppercase tracking-wider ${i === 0 || i === 6 ? 'text-purple-600 dark:text-purple-400' : ''}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 dark:divide-slate-800/60">
          {calendarCells.map((cell) => {
            const dateKey = formatDateKey(cell.date);
            const isToday = dateKey === todayKey;
            const daySchedules = getSchedulesForDate(cell.date);

            return (
              <div
                key={cell.key}
                onClick={() => {
                  setCurrentDate(cell.date);
                  setViewMode('day');
                }}
                className={`min-h-[115px] sm:min-h-[135px] p-1.5 sm:p-2 transition flex flex-col justify-between cursor-pointer hover:bg-purple-50/40 dark:hover:bg-slate-800/50 ${cell.isCurrentMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/50 dark:bg-slate-950/40 text-slate-400'
                  } ${isToday ? 'ring-2 ring-inset ring-purple-500 bg-purple-50/20 dark:bg-purple-950/20' : ''}`}
              >
                {/* Date Header */}
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-black w-6 h-6 rounded-full flex items-center justify-center ${isToday
                        ? 'bg-purple-600 text-white shadow-xs'
                        : cell.isCurrentMonth
                          ? 'text-slate-800 dark:text-white'
                          : 'text-slate-400 dark:text-slate-600'
                      }`}
                  >
                    {cell.date.getDate()}
                  </span>

                  {daySchedules.length > 0 && (
                    <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 px-1.5 py-0.2 rounded-md">
                      {daySchedules.length}
                    </span>
                  )}
                </div>

                {/* Event Pills */}
                <div className="space-y-1 flex-1 overflow-hidden">
                  {daySchedules.slice(0, 3).map((sch) => {
                    const badge = getEventBadge(sch);
                    const activeTime = sch.rescheduledTo?.startTime || sch.startTime;
                    return (
                      <div
                        key={sch._id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedScheduleDetail(sch);
                        }}
                        className={`px-1.5 py-0.5 rounded-lg text-[10px] font-bold truncate border shadow-2xs transition hover:scale-102 cursor-pointer flex items-center gap-1 ${badge.bg}`}
                        title={`${sch.title} (${activeTime}) - ${sch.room || 'Main Hall'}`}
                      >
                        <span className="shrink-0">{badge.icon}</span>
                        <span className="truncate">{sch.title}</span>
                      </div>
                    );
                  })}

                  {daySchedules.length > 3 && (
                    <div className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 text-center py-0.5">
                      +{daySchedules.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================
  //            WEEKLY VIEW BUILDER
  // ==========================================
  const renderWeekView = () => {
    // Determine 7 days starting from Monday of currentDate's week
    const curr = new Date(currentDate);
    const dayOffset = (curr.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(curr);
    monday.setDate(curr.getDate() - dayOffset);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      weekDays.push(d);
    }

    const todayKey = formatDateKey(new Date());

    return (
      <div className="border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs bg-white dark:bg-slate-900">
        {/* Weekly Column Headers */}
        <div className="grid grid-cols-7 bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 divide-x divide-slate-200 dark:divide-slate-700 text-center py-3">
          {weekDays.map((date) => {
            const dateKey = formatDateKey(date);
            const isToday = dateKey === todayKey;
            return (
              <div
                key={dateKey}
                onClick={() => {
                  setCurrentDate(date);
                  setViewMode('day');
                }}
                className={`cursor-pointer px-1 transition ${isToday ? 'text-purple-600 dark:text-purple-400 font-black' : 'text-slate-700 dark:text-slate-300'}`}
              >
                <span className="text-[11px] uppercase tracking-wider block font-black">
                  {SHORT_DAYS[date.getDay()]}
                </span>
                <span
                  className={`text-base font-black inline-flex items-center justify-center w-8 h-8 rounded-full mt-1 ${isToday ? 'bg-purple-600 text-white shadow-xs' : ''
                    }`}
                >
                  {date.getDate()}
                </span>
              </div>
            );
          })}
        </div>

        {/* Weekly Day Columns */}
        <div className="grid grid-cols-7 divide-x divide-slate-100 dark:divide-slate-800 min-h-[460px]">
          {weekDays.map((date) => {
            const dateKey = formatDateKey(date);
            const isToday = dateKey === todayKey;
            const daySchedules = getSchedulesForDate(date);

            return (
              <div
                key={dateKey}
                className={`p-2 space-y-2.5 transition flex flex-col ${isToday ? 'bg-purple-50/20 dark:bg-purple-950/20' : 'bg-white dark:bg-slate-900'
                  }`}
              >
                {daySchedules.length > 0 ? (
                  daySchedules.map((sch) => {
                    const badge = getEventBadge(sch);
                    const activeStart = sch.rescheduledTo?.startTime || sch.startTime;
                    const activeEnd = sch.rescheduledTo?.endTime || sch.endTime;
                    const activeRoom = sch.rescheduledTo?.room || sch.room || 'Main Hall';
                    const teacherName = sch.teacherId?.name || sch.courseId?.instructor?.name;

                    return (
                      <div
                        key={sch._id}
                        onClick={() => setSelectedScheduleDetail(sch)}
                        className={`p-2.5 rounded-2xl border shadow-xs transition hover:shadow-md hover:scale-102 cursor-pointer flex flex-col justify-between ${badge.bg}`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="text-[10px] font-black uppercase tracking-wider">
                              {badge.icon} {badge.label}
                            </span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 bg-white/70 dark:bg-black/40 rounded">
                              {sch.className}
                            </span>
                          </div>
                          <h4 className="text-xs font-black line-clamp-2">{sch.title}</h4>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-black/10 dark:border-white/10 text-[10px] space-y-0.5 font-medium">
                          <div className="flex items-center gap-1 font-bold">
                            <FaClock className="text-[9px] shrink-0" />
                            <span>{activeStart} – {activeEnd}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FaMapMarkerAlt className="text-[9px] shrink-0" />
                            <span className="truncate">{activeRoom}</span>
                          </div>
                          {teacherName && (
                            <div className="flex items-center gap-1 truncate font-semibold">
                              <FaChalkboardTeacher className="text-[9px] shrink-0" />
                              <span className="truncate">{teacherName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center py-10 text-slate-300 dark:text-slate-700 text-xs italic">
                    Free Day
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ==========================================
  //             DAILY VIEW BUILDER
  // ==========================================
  const renderDayView = () => {
    const daySchedules = getSchedulesForDate(currentDate);
    const dateKey = formatDateKey(currentDate);
    const isToday = dateKey === formatDateKey(new Date());

    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
        {/* Day Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 text-white shadow-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex flex-col items-center justify-center font-black">
              <span className="text-[10px] uppercase text-purple-200">{SHORT_DAYS[currentDate.getDay()]}</span>
              <span className="text-lg leading-tight">{currentDate.getDate()}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black">{DAY_NAMES[currentDate.getDay()]} Schedule</h3>
                {isToday && (
                  <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    Today
                  </span>
                )}
              </div>
              <p className="text-purple-200 text-xs">
                {formatDateKey(currentDate)} • {daySchedules.length} class{daySchedules.length !== 1 ? 'es' : ''} planned
              </p>
            </div>
          </div>

          {role === 'admin' && onAddSchedule && (
            <button
              onClick={() => onAddSchedule(currentDate)}
              className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white font-bold text-xs rounded-xl transition shadow flex items-center gap-2 self-start sm:self-auto cursor-pointer"
            >
              <FaPlusCircle /> Add Class for This Day
            </button>
          )}
        </div>

        {/* Chronological List of Classes for this Day */}
        <div className="space-y-3">
          {daySchedules.length > 0 ? (
            daySchedules.map((sch) => {
              const badge = getEventBadge(sch);
              const activeStart = sch.rescheduledTo?.startTime || sch.startTime;
              const activeEnd = sch.rescheduledTo?.endTime || sch.endTime;
              const activeRoom = sch.rescheduledTo?.room || sch.room || 'Main Hall';
              const teacherName = sch.teacherId?.name || sch.courseId?.instructor?.name || 'Assigned Instructor';

              return (
                <div
                  key={sch._id}
                  className={`p-4 sm:p-5 rounded-2xl border transition shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${badge.bg}`}
                >
                  <div className="flex items-start sm:items-center gap-4 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-white/80 dark:bg-black/30 flex items-center justify-center text-xl shrink-0 shadow-2xs">
                      {badge.icon}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-white/80 dark:bg-black/40 border border-black/10 dark:border-white/10">
                          {badge.label}
                        </span>
                        <span className="text-[10px] font-bold text-purple-900 dark:text-purple-200 bg-purple-200/60 dark:bg-purple-900/60 px-2 py-0.5 rounded-full">
                          {sch.className}
                        </span>
                        {sch.subject && (
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                            • {sch.subject}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm sm:text-base font-black truncate">{sch.title}</h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold mt-1">
                        <span className="flex items-center gap-1 font-bold">
                          🕒 {activeStart} – {activeEnd}
                        </span>
                        <span className="flex items-center gap-1">
                          📍 {activeRoom}
                        </span>
                        <span className="flex items-center gap-1">
                          👨‍🏫 {teacherName}
                        </span>
                      </div>

                      {sch.postponeReason && (
                        <p className="text-xs font-semibold mt-1.5 text-rose-700 dark:text-rose-300 bg-rose-100/70 dark:bg-rose-950/80 p-2 rounded-xl">
                          ℹ️ Note: {sch.postponeReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions Dock */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <button
                      onClick={() => setSelectedScheduleDetail(sch)}
                      className="px-3 py-1.5 bg-white/80 dark:bg-slate-800 hover:bg-white text-slate-700 dark:text-white font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer"
                    >
                      Details
                    </button>

                    {role === 'admin' && (
                      <>
                        {onReschedule && (
                          <button
                            onClick={() => onReschedule(sch)}
                            className="p-2 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-950/60 rounded-xl transition cursor-pointer"
                            title="Reschedule / Postpone Class"
                          >
                            <FaHistory className="text-sm" />
                          </button>
                        )}
                        {onEditSchedule && (
                          <button
                            onClick={() => onEditSchedule(sch)}
                            className="p-2 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-xl transition cursor-pointer"
                            title="Edit Class Schedule"
                          >
                            <FaEdit className="text-sm" />
                          </button>
                        )}
                        {onDeleteSchedule && (
                          <button
                            onClick={() => onDeleteSchedule(sch._id, sch.title)}
                            className="p-2 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 rounded-xl transition cursor-pointer"
                            title="Delete Schedule"
                          >
                            <FaTrash className="text-sm" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              No classes or examinations scheduled for {DAY_NAMES[currentDate.getDay()]}, {formatDateKey(currentDate)}.
            </div>
          )}
        </div>
      </div>
    );
  };

  // ==========================================
  //             LIST VIEW BUILDER
  // ==========================================
  const renderListView = () => {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <span className="text-xs font-black uppercase text-slate-400">All Scheduled Sessions ({filteredSchedules.length})</span>
          <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Sorted by Day & Time</span>
        </div>

        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredSchedules.length > 0 ? (
            filteredSchedules.map((sch) => {
              const badge = getEventBadge(sch);
              const activeDay = sch.rescheduledTo?.dayOfWeek || sch.dayOfWeek;
              const activeStart = sch.rescheduledTo?.startTime || sch.startTime;
              const activeEnd = sch.rescheduledTo?.endTime || sch.endTime;
              const activeRoom = sch.rescheduledTo?.room || sch.room || 'Main Hall';
              const teacherName = sch.teacherId?.name || sch.courseId?.instructor?.name;

              return (
                <div
                  key={sch._id}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 ${badge.bg}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-white/80 dark:bg-black/30 flex items-center justify-center text-lg shrink-0">
                      {badge.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-black truncate">{sch.title}</h4>
                        <span className="text-[10px] font-bold bg-white/70 dark:bg-black/40 px-2 py-0.5 rounded-md">
                          {sch.className}
                        </span>
                        <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full bg-purple-200/50 dark:bg-purple-900/50">
                          {activeDay}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 text-xs font-semibold text-slate-600 dark:text-slate-300 mt-1">
                        <span>🕒 {activeStart} – {activeEnd}</span>
                        <span>📍 {activeRoom}</span>
                        {teacherName && <span>👨‍🏫 {teacherName}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedScheduleDetail(sch)}
                      className="px-2.5 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-pointer"
                    >
                      Details
                    </button>
                    {role === 'admin' && (
                      <>
                        {onReschedule && (
                          <button
                            onClick={() => onReschedule(sch)}
                            className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg cursor-pointer"
                            title="Reschedule / Postpone"
                          >
                            <FaHistory className="text-xs" />
                          </button>
                        )}
                        {onEditSchedule && (
                          <button
                            onClick={() => onEditSchedule(sch)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-lg cursor-pointer"
                            title="Edit"
                          >
                            <FaEdit className="text-xs" />
                          </button>
                        )}
                        {onDeleteSchedule && (
                          <button
                            onClick={() => onDeleteSchedule(sch._id, sch.title)}
                            className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg cursor-pointer"
                            title="Delete"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10 text-slate-400 italic text-xs">
              No schedules match your current filters.
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR: NAVIGATION, VIEW SELECTOR & MAIN CONTROLS */}
      {/* ========================================================================= */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Navigation Controls: Date Title + Prev / Next / Today */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={handlePrev}
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white flex items-center justify-center transition shadow-2xs cursor-pointer"
                title="Previous"
              >
                <FaChevronLeft className="text-xs" />
              </button>

              <button
                type="button"
                onClick={handleToday}
                className="px-3 h-8 rounded-xl bg-white dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-slate-600 text-slate-800 dark:text-white text-xs font-black transition shadow-2xs cursor-pointer"
              >
                Today
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 hover:bg-purple-50 dark:hover:bg-slate-600 text-slate-700 dark:text-white flex items-center justify-center transition shadow-2xs cursor-pointer"
                title="Next"
              >
                <FaChevronRight className="text-xs" />
              </button>
            </div>

            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <FaCalendarAlt className="text-purple-600 dark:text-purple-400 text-base" />
                {calendarTitle}
              </h2>
            </div>
          </div>

          {/* View Mode Switcher + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700">
              {[
                { id: 'month', label: 'Month', icon: <FaCalendarAlt /> },
                { id: 'week', label: 'Week', icon: <FaCalendarWeek /> },
                { id: 'day', label: 'Day', icon: <FaCalendarDay /> },
                { id: 'list', label: 'List', icon: <FaList /> }
              ].map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setViewMode(v.id)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition flex items-center gap-1.5 cursor-pointer ${viewMode === v.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-700'
                    }`}
                >
                  <span className="text-[11px]">{v.icon}</span>
                  <span>{v.label}</span>
                </button>
              ))}
            </div>

            {/* Extra Admin Management Buttons */}
            {role === 'admin' && (
              <>
                {onManageAvailability && (
                  <button
                    type="button"
                    onClick={onManageAvailability}
                    className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5 cursor-pointer"
                    title="Teacher Availability Management"
                  >
                    <FaUserClock /> Availability
                  </button>
                )}

                {onViewClassrooms && (
                  <button
                    type="button"
                    onClick={onViewClassrooms}
                    className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-bold text-xs rounded-xl border border-emerald-200 dark:border-emerald-800 transition flex items-center gap-1.5 cursor-pointer"
                    title="Classroom / Venue Allocations"
                  >
                    <FaDoorOpen /> Venues
                  </button>
                )}

                {onAddSchedule && (
                  <button
                    type="button"
                    onClick={() => onAddSchedule(currentDate)}
                    className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl transition flex items-center gap-1.5 shadow-md shadow-purple-900/25 cursor-pointer active:scale-95"
                  >
                    <FaPlusCircle /> Add Class
                  </button>
                )}
              </>
            )}

            {role === 'teacher' && onManageAvailability && (
              <button
                type="button"
                onClick={onManageAvailability}
                className="px-3 py-2 bg-purple-50 dark:bg-purple-950/50 hover:bg-purple-100 text-purple-700 dark:text-purple-300 font-bold text-xs rounded-xl border border-purple-200 dark:border-purple-800 transition flex items-center gap-1.5 cursor-pointer"
              >
                <FaUserClock /> My Availability & Leave
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1.5 flex-1 min-w-[220px]">
            <input
              type="text"
              placeholder="Search classes, teachers, subjects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Event Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
            >
              <option value="ALL">All Event Types</option>
              <option value="class">📘 Classes Only</option>
              <option value="examination">📝 Examinations</option>
            </select>

            {/* Venue Filter */}
            {venueOptions.length > 0 && (
              <select
                value={filterRoom}
                onChange={(e) => setFilterRoom(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
              >
                <option value="ALL">All Venues / Rooms</option>
                {venueOptions.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. RENDER THE ACTIVE CALENDAR VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'list' && renderListView()}

      {/* ========================================================================= */}
      {/* 3. SCHEDULE DETAIL INSPECTION MODAL */}
      {/* ========================================================================= */}
      {selectedScheduleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-slate-800 dark:text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400">
                  <FaCalendarAlt />
                </span>
                <div>
                  <h3 className="text-base font-black">{selectedScheduleDetail.title}</h3>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-bold">
                    {selectedScheduleDetail.className} • {selectedScheduleDetail.eventType?.toUpperCase() || 'CLASS'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedScheduleDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Day / Date</span>
                  <span className="font-extrabold text-sm text-slate-800 dark:text-white mt-0.5 block">
                    {selectedScheduleDetail.rescheduledTo?.date || selectedScheduleDetail.date || selectedScheduleDetail.dayOfWeek}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Time Slot</span>
                  <span className="font-extrabold text-sm text-purple-600 dark:text-purple-400 mt-0.5 block">
                    {selectedScheduleDetail.rescheduledTo?.startTime || selectedScheduleDetail.startTime} – {selectedScheduleDetail.rescheduledTo?.endTime || selectedScheduleDetail.endTime}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Allocated Classroom / Venue:</span>
                  <span className="font-black text-slate-800 dark:text-white">
                    📍 {selectedScheduleDetail.rescheduledTo?.room || selectedScheduleDetail.room || 'Main Hall'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Assigned Teacher:</span>
                  <span className="font-black text-purple-700 dark:text-purple-300">
                    👨‍🏫 {selectedScheduleDetail.teacherId?.name || selectedScheduleDetail.courseId?.instructor?.name || 'Unassigned'}
                  </span>
                </div>

                {selectedScheduleDetail.courseId?.title && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 dark:text-slate-400 font-semibold">Linked Course:</span>
                    <span className="font-bold text-slate-800 dark:text-white truncate max-w-[200px]">
                      {selectedScheduleDetail.courseId.title}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">Status:</span>
                  <span className="font-black uppercase text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                    {selectedScheduleDetail.status}
                  </span>
                </div>
              </div>

              {selectedScheduleDetail.postponeReason && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300">
                  <span className="font-extrabold block text-[11px] mb-0.5">Postponement / Reschedule Reason:</span>
                  <p>{selectedScheduleDetail.postponeReason}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              {role === 'admin' && (
                <>
                  {onReschedule && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedScheduleDetail;
                        setSelectedScheduleDetail(null);
                        onReschedule(target);
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Reschedule
                    </button>
                  )}
                  {onEditSchedule && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedScheduleDetail;
                        setSelectedScheduleDetail(null);
                        onEditSchedule(target);
                      }}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
                    >
                      Edit
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedScheduleDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
