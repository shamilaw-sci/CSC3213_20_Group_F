/**
 * @file AddScheduleModal.jsx
 * @description Add Schedule Modal. Modal dialog to create new timetable classes or schedule YouTube live streams with course, grade, hall/room, and time slots.
 */

import React, { useState, useEffect } from 'react';
import {
  FaCalendarAlt,
  FaClock,
  FaTimes,
  FaBookOpen,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaMapMarkerAlt,
  FaPlusCircle,
  FaCheckCircle,
  FaLink,
  FaGraduationCap,
  FaExclamationTriangle,
  FaEdit
} from 'react-icons/fa';
import api from '../utils/api';

// Standard 12-hour time options
const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];
const PERIODS = ['AM', 'PM'];

// Common room presets
const ROOM_PRESETS = ['Online Class', 'Main Hall', 'Hall A', 'Hall B', 'Science Lab', 'Computer Lab', 'Room 101', 'Room 202'];

// Popular class time presets
const POPULAR_SLOTS = [
  { label: 'Morning Slot 1', start: '08:00 AM', end: '10:00 AM' },
  { label: 'Morning Slot 2', start: '10:30 AM', end: '12:30 PM' },
  { label: 'Afternoon Slot', start: '01:00 PM', end: '03:00 PM' },
  { label: 'Evening Slot 1', start: '03:30 PM', end: '05:30 PM' },
  { label: 'Evening Slot 2', start: '06:00 PM', end: '08:00 PM' }
];

// Helper: Parse '10:00 AM' string into { hour, minute, period }
const parseTimeString = (timeStr) => {
  if (!timeStr) return { hour: '10', minute: '00', period: 'AM' };
  const str = String(timeStr).trim();
  const isPM = /pm/i.test(str);
  const clean = str.replace(/(am|pm)/i, '').trim();
  const parts = clean.split(':');
  let h = parseInt(parts[0], 10) || 10;
  let m = parseInt(parts[1], 10) || 0;
  if (h > 12) h = h % 12 || 12;
  if (h === 0) h = 12;
  const hour = String(h).padStart(2, '0');
  const minute = String(m).padStart(2, '0');
  const period = isPM ? 'PM' : 'AM';
  return { hour, minute, period };
};

// Helper: Format { hour, minute, period } into '10:00 AM'
const formatTimeString = ({ hour, minute, period }) => {
  const h = String(parseInt(hour, 10) || 12).padStart(2, '0');
  const m = String(parseInt(minute, 10) || 0).padStart(2, '0');
  const p = (period || 'AM').toUpperCase();
  return `${h}:${m} ${p}`;
};

// Helper: Add minutes to a time string and return new 'hh:mm A'
const addMinutesToTime = (timeStr, addedMinutes) => {
  const parsed = parseTimeString(timeStr);
  let h = parseInt(parsed.hour, 10);
  if (parsed.period === 'PM' && h < 12) h += 12;
  if (parsed.period === 'AM' && h === 12) h = 0;
  let totalMin = h * 60 + parseInt(parsed.minute, 10) + addedMinutes;

  // Wrap 24h
  totalMin = ((totalMin % 1440) + 1440) % 1440;

  let newH = Math.floor(totalMin / 60);
  let newM = totalMin % 60;
  let newPeriod = newH >= 12 ? 'PM' : 'AM';
  newH = newH % 12;
  if (newH === 0) newH = 12;

  // Round minute to nearest 5
  newM = Math.round(newM / 5) * 5;
  if (newM === 60) {
    newM = 0;
    newH = newH === 12 ? 1 : newH + 1;
  }

  return formatTimeString({
    hour: String(newH).padStart(2, '0'),
    minute: String(newM).padStart(2, '0'),
    period: newPeriod
  });
};

export default function AddScheduleModal({
  isOpen,
  onClose,
  onSave,
  courses = [],
  teachers = [],
  gradeOptions = [],
  editSchedule = null
}) {
  const isEditing = !!editSchedule;

  const [formData, setFormData] = useState({
    title: '',
    className: '',
    dayOfWeek: 'Saturday',
    startTime: '10:00 AM',
    endTime: '12:00 PM',
    courseId: '',
    teacherId: '',
    room: 'Hall A',
    eventType: 'class',
    date: '',
    subject: '',
    description: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [selectedCourseObj, setSelectedCourseObj] = useState(null);
  const [conflictWarning, setConflictWarning] = useState(null);

  // Time sub-states
  const [startTimeParts, setStartTimeParts] = useState(parseTimeString('10:00 AM'));
  const [endTimeParts, setEndTimeParts] = useState(parseTimeString('12:00 PM'));

  useEffect(() => {
    if (isOpen) {
      if (editSchedule) {
        setFormData({
          title: editSchedule.title || '',
          className: editSchedule.className || '',
          dayOfWeek: editSchedule.dayOfWeek || 'Saturday',
          startTime: editSchedule.startTime || '10:00 AM',
          endTime: editSchedule.endTime || '12:00 PM',
          courseId: editSchedule.courseId?._id || editSchedule.courseId || '',
          teacherId: editSchedule.teacherId?._id || editSchedule.teacherId || '',
          room: editSchedule.room || 'Hall A',
          eventType: editSchedule.eventType || 'class',
          date: editSchedule.date || '',
          subject: editSchedule.subject || '',
          description: editSchedule.description || ''
        });
        setStartTimeParts(parseTimeString(editSchedule.startTime || '10:00 AM'));
        setEndTimeParts(parseTimeString(editSchedule.endTime || '12:00 PM'));

        const cId = editSchedule.courseId?._id || editSchedule.courseId;
        const matched = courses.find(c => c && c._id === cId);
        setSelectedCourseObj(matched || null);
      } else {
        setFormData({
          title: '',
          className: '',
          dayOfWeek: 'Saturday',
          startTime: '10:00 AM',
          endTime: '12:00 PM',
          courseId: '',
          teacherId: '',
          room: 'Hall A',
          eventType: 'class',
          date: '',
          subject: '',
          description: ''
        });
        setSelectedCourseObj(null);
        setStartTimeParts(parseTimeString('10:00 AM'));
        setEndTimeParts(parseTimeString('12:00 PM'));
      }
      setConflictWarning(null);
    }
  }, [isOpen, editSchedule]);

  if (!isOpen) return null;

  // Handle Start Time changes
  const updateStartTime = (field, value) => {
    const updated = { ...startTimeParts, [field]: value };
    setStartTimeParts(updated);
    const formatted = formatTimeString(updated);
    setFormData(prev => ({ ...prev, startTime: formatted }));
    checkConflictsLive(formatted, formatTimeString(endTimeParts));
  };

  // Handle End Time changes
  const updateEndTime = (field, value) => {
    const updated = { ...endTimeParts, [field]: value };
    setEndTimeParts(updated);
    const formatted = formatTimeString(updated);
    setFormData(prev => ({ ...prev, endTime: formatted }));
    checkConflictsLive(formatTimeString(startTimeParts), formatted);
  };

  // Quick duration click (e.g. +120 mins for 2 hours)
  const handleQuickDuration = (minutes) => {
    const currentStart = formatTimeString(startTimeParts);
    const newEndStr = addMinutesToTime(currentStart, minutes);
    setEndTimeParts(parseTimeString(newEndStr));
    setFormData(prev => ({ ...prev, endTime: newEndStr }));
    checkConflictsLive(currentStart, newEndStr);
  };

  // Apply preset slot
  const handleApplyPreset = (slot) => {
    setStartTimeParts(parseTimeString(slot.start));
    setEndTimeParts(parseTimeString(slot.end));
    setFormData(prev => ({
      ...prev,
      startTime: slot.start,
      endTime: slot.end
    }));
    checkConflictsLive(slot.start, slot.end);
  };

  // Live conflict preflight checking
  const checkConflictsLive = async (sTime, eTime) => {
    try {
      const res = await api.post('/schedule/check-conflicts', {
        scheduleId: editSchedule?._id || null,
        teacherId: formData.teacherId || undefined,
        room: formData.room || 'Main Hall',
        className: formData.className || '',
        dayOfWeek: formData.dayOfWeek || '',
        date: formData.date || null,
        startTime: sTime || formatTimeString(startTimeParts),
        endTime: eTime || formatTimeString(endTimeParts)
      });

      if (res.data.hasConflict) {
        setConflictWarning(res.data.conflicts[0]);
      } else {
        setConflictWarning(null);
      }
    } catch (err) {
      console.warn("Live conflict check error:", err);
    }
  };

  // Handle course linking with automatic cascade to teacher, title & grade
  const handleCourseChange = (selectedCourseId) => {
    if (!selectedCourseId) {
      setFormData(prev => ({
        ...prev,
        courseId: '',
        teacherId: ''
      }));
      setSelectedCourseObj(null);
      return;
    }

    const matchedCourse = courses.find(c => c && c._id === selectedCourseId);
    if (matchedCourse) {
      setSelectedCourseObj(matchedCourse);

      let assignedTeacherId = '';
      if (matchedCourse.instructor) {
        if (typeof matchedCourse.instructor === 'object') {
          assignedTeacherId = matchedCourse.instructor._id || matchedCourse.instructor.id || '';
        } else if (typeof matchedCourse.instructor === 'string') {
          assignedTeacherId = matchedCourse.instructor;
        }
      }

      let targetGrade = '';
      if (typeof matchedCourse.grade === 'string' && matchedCourse.grade) {
        targetGrade = matchedCourse.grade;
      } else if (Array.isArray(matchedCourse.enrolledGrades) && matchedCourse.enrolledGrades.length > 0) {
        const firstGrade = matchedCourse.enrolledGrades[0];
        if (typeof firstGrade === 'string') {
          targetGrade = firstGrade;
        } else if (firstGrade && typeof firstGrade === 'object') {
          targetGrade = firstGrade.gradeNumber || firstGrade.title || '';
        }
      }

      setFormData(prev => ({
        ...prev,
        courseId: selectedCourseId,
        title: prev.title || matchedCourse.title || '',
        className: targetGrade || prev.className || '',
        teacherId: assignedTeacherId || prev.teacherId || ''
      }));
    } else {
      setSelectedCourseObj(null);
      setFormData(prev => ({ ...prev, courseId: selectedCourseId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const finalPayload = {
        ...formData,
        className: typeof formData.className === 'string' ? formData.className : '',
        startTime: formatTimeString(startTimeParts),
        endTime: formatTimeString(endTimeParts)
      };

      if (isEditing) {
        finalPayload._id = editSchedule._id;
      }

      await onSave(finalPayload, isEditing);
    } catch (err) {
      if (err.response?.data?.conflicts) {
        setConflictWarning(err.response.data.conflicts[0]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Get available course-specific grades if any
  const courseSpecificGrades = [];
  if (selectedCourseObj) {
    if (typeof selectedCourseObj.grade === 'string' && selectedCourseObj.grade) {
      courseSpecificGrades.push(selectedCourseObj.grade);
    }
    if (Array.isArray(selectedCourseObj.enrolledGrades)) {
      selectedCourseObj.enrolledGrades.forEach(g => {
        const gName = typeof g === 'string' ? g : (g?.gradeNumber || g?.title);
        if (gName && !courseSpecificGrades.includes(gName)) {
          courseSpecificGrades.push(gName);
        }
      });
    }
    if (Array.isArray(selectedCourseObj.classes)) {
      selectedCourseObj.classes.forEach(cls => {
        if (cls?.className && !courseSpecificGrades.includes(cls.className)) {
          courseSpecificGrades.push(cls.className);
        }
      });
    }
  }

  const assignedTeacherObj = teachers.find(t => t._id === formData.teacherId) ||
    (selectedCourseObj?.instructor && typeof selectedCourseObj.instructor === 'object' ? selectedCourseObj.instructor : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-gray-100 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100/80 dark:border-slate-800 animate-fadeIn my-6 max-h-[92vh] flex flex-col">

        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-5 sm:p-6 text-white relative flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
            title="Close"
          >
            <FaTimes className="text-sm" />
          </button>

          <div className="flex items-center gap-3.5 pr-8">
            <div className="p-3 bg-amber-400 text-purple-950 rounded-2xl text-xl font-black shadow-md flex items-center justify-center">
              {isEditing ? <FaEdit /> : <FaCalendarAlt />}
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                {isEditing ? "Edit Class Schedule" : "Add Class or Examination to Timetable"}
              </h3>
              <p className="text-indigo-200 text-xs mt-0.5 font-medium">
                Automatic conflict detection will ensure teachers, rooms, and grades do not overlap.
              </p>
            </div>
          </div>
        </div>

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

          {/* Section 0: Event Category (Class vs Examination) */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider">
              Event Category:
            </span>
            <div className="flex gap-2">
              {[
                { id: 'class', label: '📘 Regular Lecture / Class' },
                { id: 'examination', label: '📝 Examination / Test' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, eventType: cat.id })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    formData.eventType === cat.id
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Section 1: Course & Class Linking */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <FaBookOpen className="text-purple-600 dark:text-purple-400" /> Course & Class Linking
              </span>
              {selectedCourseObj ? (
                <span className="text-[11px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                  <FaLink className="text-[10px]" /> Linked to Course
                </span>
              ) : (
                <span className="text-[11px] bg-slate-200/80 dark:bg-slate-700 text-slate-600 dark:text-gray-300 font-medium px-2 py-0.5 rounded-full">
                  Standalone Session
                </span>
              )}
            </div>

            {/* Link Course Dropdown */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                Select Course to Link <span className="text-purple-600 dark:text-purple-400 font-semibold text-[10px] lowercase">(links course, syllabus & teacher)</span>
              </label>
              <select
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 font-medium text-slate-800 dark:text-white cursor-pointer shadow-xs transition"
                value={formData.courseId}
                onChange={(e) => handleCourseChange(e.target.value)}
              >
                <option value="">-- Standalone Session (No Course Link) --</option>
                {courses.map(c => {
                  if (!c) return null;
                  const gradeLabel = typeof c.grade === 'string'
                    ? c.grade
                    : (Array.isArray(c.enrolledGrades) && c.enrolledGrades[0]?.gradeNumber ? c.enrolledGrades[0].gradeNumber : '');
                  const teacherLabel = c.instructor?.name || (typeof c.instructor === 'string' ? 'Teacher Assigned' : '');

                  return (
                    <option key={c._id} value={c._id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                      {c.title} {gradeLabel ? `[${gradeLabel}]` : ''} {teacherLabel ? `— 👨‍🏫 ${teacherLabel}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* If Course is Linked, show smart linking preview */}
            {selectedCourseObj && (
              <div className="bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-600 text-white rounded-lg">
                    <FaGraduationCap />
                  </div>
                  <div>
                    <span className="font-extrabold text-purple-950 dark:text-white block">{selectedCourseObj.title}</span>
                    <span className="text-purple-700 dark:text-purple-300 text-[11px]">
                      Instructor: <strong className="font-bold">{assignedTeacherObj?.name || 'Assigned Instructor'}</strong>
                      {courseSpecificGrades.length > 0 && ` • Available Grades: ${courseSpecificGrades.join(', ')}`}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-purple-200/80 dark:bg-purple-900/60 text-purple-900 dark:text-purple-200 font-bold px-2 py-0.5 rounded-md border border-purple-300 dark:border-purple-700">
                  Active
                </span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Class Title */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Session Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grade 10 Science - Theory"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 shadow-xs transition"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Target Grade / Stream */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Target Grade / Class <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer transition"
                  value={typeof formData.className === 'string' ? formData.className : ''}
                  onChange={(e) => {
                    const cName = e.target.value;
                    setFormData({ ...formData, className: cName });
                    checkConflictsLive(formatTimeString(startTimeParts), formatTimeString(endTimeParts));
                  }}
                >
                  <option value="">-- Select Target Grade / Class --</option>
                  {courseSpecificGrades.length > 0 && (
                    <optgroup label="Course Enrolled Grades / Classes">
                      {courseSpecificGrades.map(cg => (
                        <option key={cg} value={cg}>{cg} (Course Cohort)</option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="All Institute Grades">
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Day & Standardized Time Picker */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                <FaCalendarAlt className="text-purple-600 dark:text-purple-400" /> Schedule & Time Slots
              </span>
              <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-3 py-1 rounded-full">
                {formData.dayOfWeek} • {formatTimeString(startTimeParts)} – {formatTimeString(endTimeParts)}
              </span>
            </div>

            {/* Day of Week */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Recurring Day of the Week <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-7 gap-1.5">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => {
                  const isSelected = formData.dayOfWeek === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, dayOfWeek: d });
                        checkConflictsLive(formatTimeString(startTimeParts), formatTimeString(endTimeParts));
                      }}
                      className={`py-2 text-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-gray-300 border border-slate-200 dark:border-slate-700 hover:bg-purple-50'
                      }`}
                    >
                      {d.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Specific Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                Or Specific Date (Optional for one-off sessions / exams)
              </label>
              <input
                type="date"
                value={formData.date || ''}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  checkConflictsLive(formatTimeString(startTimeParts), formatTimeString(endTimeParts));
                }}
                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1.5 uppercase tracking-wider">
                Popular Time Slot Presets
              </label>
              <div className="flex flex-wrap gap-2">
                {POPULAR_SLOTS.map((slot, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyPreset(slot)}
                    className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-purple-300 hover:bg-purple-50 text-slate-700 dark:text-gray-300 font-semibold px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                  >
                    ⚡ {slot.start} – {slot.end}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Time & End Time Clean Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* START TIME */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FaClock className="text-purple-600 dark:text-purple-400" /> Start Time <span className="text-red-500">*</span>
                  </span>
                  <span className="text-xs font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 px-2.5 py-1 rounded-lg">
                    {formatTimeString(startTimeParts)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Hour</label>
                    <select
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      value={startTimeParts.hour}
                      onChange={(e) => updateStartTime('hour', e.target.value)}
                    >
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <span className="text-slate-400 font-extrabold text-lg pt-4">:</span>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Minute</label>
                    <select
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      value={startTimeParts.minute}
                      onChange={(e) => updateStartTime('minute', e.target.value)}
                    >
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="pt-4">
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      {PERIODS.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateStartTime('period', p)}
                          className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                            startTimeParts.period === p ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-gray-400'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* END TIME */}
              <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FaClock className="text-indigo-600 dark:text-indigo-400" /> End Time <span className="text-red-500">*</span>
                  </span>
                  <span className="text-xs font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 px-2.5 py-1 rounded-lg">
                    {formatTimeString(endTimeParts)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Hour</label>
                    <select
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      value={endTimeParts.hour}
                      onChange={(e) => updateEndTime('hour', e.target.value)}
                    >
                      {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <span className="text-slate-400 font-extrabold text-lg pt-4">:</span>
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold text-slate-400 mb-0.5 uppercase">Minute</label>
                    <select
                      className="w-full px-2.5 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                      value={endTimeParts.minute}
                      onChange={(e) => updateEndTime('minute', e.target.value)}
                    >
                      {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="pt-4">
                    <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      {PERIODS.map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => updateEndTime('period', p)}
                          className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition cursor-pointer ${
                            endTimeParts.period === p ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 dark:text-gray-400'
                          }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Duration Bar */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-600 dark:text-gray-300 flex items-center gap-1.5">
                <FaClock className="text-indigo-500 text-xs" /> Set End Time by Duration:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '+1 Hour', mins: 60 },
                  { label: '+1.5 Hours', mins: 90 },
                  { label: '+2 Hours', mins: 120 },
                  { label: '+2.5 Hours', mins: 150 },
                  { label: '+3 Hours', mins: 180 }
                ].map(item => (
                  <button
                    key={item.mins}
                    type="button"
                    onClick={() => handleQuickDuration(item.mins)}
                    className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-900 hover:bg-purple-50 hover:text-purple-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-gray-300 font-bold transition active:scale-95 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Teacher & Venue */}
          <div className="bg-slate-50/80 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700 space-y-4">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <FaChalkboardTeacher className="text-purple-600 dark:text-purple-400" /> Instructor & Classroom Allocation
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Assign Teacher */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Assign Teacher
                </label>
                <select
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 shadow-xs cursor-pointer transition"
                  value={typeof formData.teacherId === 'string' ? formData.teacherId : ''}
                  onChange={(e) => {
                    const tId = e.target.value;
                    setFormData({ ...formData, teacherId: tId });
                    checkConflictsLive(formatTimeString(startTimeParts), formatTimeString(endTimeParts));
                  }}
                >
                  <option value="">-- No Specific Teacher Assigned --</option>
                  {teachers.map(t => {
                    if (!t) return null;
                    return (
                      <option key={t._id} value={t._id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                        {t.name} ({t.email})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Room / Location */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-gray-300 mb-1 uppercase tracking-wider">
                  Classroom / Venue Allocation
                </label>
                <input
                  type="text"
                  placeholder="e.g. Hall A, Lab 2"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500 shadow-xs transition"
                  value={formData.room}
                  onChange={(e) => {
                    const r = e.target.value;
                    setFormData({ ...formData, room: r });
                    checkConflictsLive(formatTimeString(startTimeParts), formatTimeString(endTimeParts));
                  }}
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {ROOM_PRESETS.slice(0, 5).map(roomName => (
                    <button
                      key={roomName}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, room: roomName });
                        checkConflictsLive(formatTimeString(startTimeParts), formatTimeString(endTimeParts));
                      }}
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-semibold transition cursor-pointer ${
                        formData.room === roomName
                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-300'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-gray-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {roomName}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Conflict Warning Box */}
          {conflictWarning && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-3 text-xs animate-shake shadow-xs">
              <FaExclamationTriangle className="text-rose-500 text-base mt-0.5 shrink-0" />
              <div>
                <strong className="font-black block uppercase tracking-wider text-[11px]">Timetable Conflict Warning!</strong>
                <p className="mt-0.5 font-semibold">{conflictWarning.message}</p>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-gray-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-800 active:scale-95 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-purple-600/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  {isEditing ? <FaEdit className="text-sm" /> : <FaPlusCircle className="text-sm" />}
                  <span>{isEditing ? "Save Schedule Changes" : "Add Class to Timetable"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
