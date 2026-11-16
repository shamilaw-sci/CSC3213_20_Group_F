/**
 * @file RescheduleModal.jsx
 * @description Reschedule Class Modal. Allows instructors and administrators to change class session dates, notify students, and send automated SMS alerts.
 */

import React, { useState, useEffect } from 'react';
import {
  FaHistory,
  FaCalendarAlt,
  FaClock,
  FaTimes,
  FaExclamationTriangle,
  FaCheckCircle,
  FaMapMarkerAlt
} from 'react-icons/fa';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function RescheduleModal({
  isOpen,
  onClose,
  schedule,
  onSuccess
}) {
  const [status, setStatus] = useState('rescheduled'); // 'rescheduled' | 'postponed' | 'scheduled'
  const [postponeReason, setPostponeReason] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDayOfWeek, setNewDayOfWeek] = useState('Monday');
  const [newStartTime, setNewStartTime] = useState('10:00 AM');
  const [newEndTime, setNewEndTime] = useState('12:00 PM');
  const [newRoom, setNewRoom] = useState('Main Hall');

  const [submitting, setSubmitting] = useState(false);
  const [conflictWarning, setConflictWarning] = useState(null);

  useEffect(() => {
    if (schedule && isOpen) {
      setStatus(schedule.status === 'postponed' ? 'postponed' : 'rescheduled');
      setPostponeReason(schedule.postponeReason || '');
      setNewDate(schedule.rescheduledTo?.date || schedule.date || '');
      setNewDayOfWeek(schedule.rescheduledTo?.dayOfWeek || schedule.dayOfWeek || 'Monday');
      setNewStartTime(schedule.rescheduledTo?.startTime || schedule.startTime || '10:00 AM');
      setNewEndTime(schedule.rescheduledTo?.endTime || schedule.endTime || '12:00 PM');
      setNewRoom(schedule.rescheduledTo?.room || schedule.room || 'Main Hall');
      setConflictWarning(null);
    }
  }, [schedule, isOpen]);

  if (!isOpen || !schedule) return null;

  // Real-time conflict preflight check
  const handleCheckConflict = async () => {
    if (status !== 'rescheduled') {
      setConflictWarning(null);
      return;
    }

    try {
      const res = await api.post('/schedule/check-conflicts', {
        scheduleId: schedule._id,
        teacherId: schedule.teacherId?._id || schedule.teacherId,
        room: newRoom,
        className: schedule.className,
        dayOfWeek: newDayOfWeek,
        date: newDate || null,
        startTime: newStartTime,
        endTime: newEndTime
      });

      if (res.data.hasConflict) {
        setConflictWarning(res.data.conflicts[0]);
      } else {
        setConflictWarning(null);
      }
    } catch (err) {
      console.warn("Conflict check error", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        status,
        postponeReason: postponeReason.trim(),
        rescheduledTo: status === 'rescheduled' ? {
          date: newDate || '',
          dayOfWeek: newDayOfWeek,
          startTime: newStartTime,
          endTime: newEndTime,
          room: newRoom
        } : undefined
      };

      const res = await api.patch(`/schedule/${schedule._id}/reschedule`, payload);
      toast.success(res.data.message || `Class marked as ${status}!`);
      if (onSuccess) onSuccess(res.data.schedule);
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to update schedule status.";
      toast.error(msg);
      if (err.response?.data?.conflicts) {
        setConflictWarning(err.response.data.conflicts[0]);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative text-slate-800 dark:text-white space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 text-lg">
              <FaHistory />
            </span>
            <div>
              <h3 className="text-base font-black">Reschedule or Postpone Class</h3>
              <p className="text-xs text-slate-400 font-medium">
                {schedule.title} ({schedule.className})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Action Type */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
              Select Schedule Action
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'rescheduled', label: '🔄 Reschedule Slot' },
                { id: 'postponed', label: '⚠️ Postpone Session' },
                { id: 'scheduled', label: '✓ Restore Regular' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setStatus(opt.id);
                    setConflictWarning(null);
                  }}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition cursor-pointer ${
                    status === opt.id
                      ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-700 dark:text-purple-300 font-black shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Postpone / Reschedule Reason */}
          <div>
            <label className="block text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1">
              Reason / Announcement Message
            </label>
            <textarea
              rows="2"
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              placeholder="e.g. Rescheduled due to public holiday, special revision session..."
              className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* New Slot Fields (If Rescheduled) */}
          {status === 'rescheduled' && (
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
              <span className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 block">
                New Target Date & Time
              </span>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Specific Date (Optional)</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => {
                      setNewDate(e.target.value);
                      handleCheckConflict();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Day of Week</label>
                  <select
                    value={newDayOfWeek}
                    onChange={(e) => {
                      setNewDayOfWeek(e.target.value);
                      handleCheckConflict();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none cursor-pointer"
                  >
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Start Time</label>
                  <input
                    type="text"
                    value={newStartTime}
                    onChange={(e) => {
                      setNewStartTime(e.target.value);
                      handleCheckConflict();
                    }}
                    placeholder="10:00 AM"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">End Time</label>
                  <input
                    type="text"
                    value={newEndTime}
                    onChange={(e) => {
                      setNewEndTime(e.target.value);
                      handleCheckConflict();
                    }}
                    placeholder="12:00 PM"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Allocated Classroom / Venue</label>
                <input
                  type="text"
                  value={newRoom}
                  onChange={(e) => {
                    setNewRoom(e.target.value);
                    handleCheckConflict();
                  }}
                  placeholder="e.g. Hall A, Lab 2, Online Class"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs bg-white dark:bg-slate-800 outline-none"
                />
              </div>
            </div>
          )}

          {/* Live Conflict Warning Box */}
          {conflictWarning && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2.5 text-xs animate-shake">
              <FaExclamationTriangle className="text-rose-500 mt-0.5 shrink-0" />
              <div>
                <strong className="font-black block uppercase tracking-wider text-[11px]">Conflict Detected!</strong>
                <p className="mt-0.5">{conflictWarning.message}</p>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <FaCheckCircle /> {submitting ? "Applying..." : "Save Schedule Change"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
