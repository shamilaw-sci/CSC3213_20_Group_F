/**
 * @file TeacherAvailabilityModal.jsx
 * @description Teacher Availability Modal. Interface for teachers to define recurring weekly consultation hours and availability slots.
 */

import React, { useState, useEffect } from 'react';
import {
  FaUserClock,
  FaPlus,
  FaTrash,
  FaTimes,
  FaCheckCircle,
  FaCalendarAlt,
  FaClock,
  FaExclamationCircle
} from 'react-icons/fa';
import api from '../utils/api';
import toast from 'react-hot-toast';

export default function TeacherAvailabilityModal({
  isOpen,
  onClose,
  teachers = [],
  role = 'student'
}) {
  const [availabilities, setAvailabilities] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [selectedTeacherId, setSelectedTeacherId] = useState(teachers[0]?._id || '');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00 AM');
  const [endTime, setEndTime] = useState('05:00 PM');
  const [slotType, setSlotType] = useState('unavailable'); // 'available' | 'unavailable' | 'leave' | 'preferred'
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchAvailabilities();
      if (teachers.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(teachers[0]._id);
      }
    }
  }, [isOpen]);

  const fetchAvailabilities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/schedule/teacher-availability');
      setAvailabilities(res.data || []);
    } catch (err) {
      console.error("Failed to fetch teacher availability", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleAddSlot = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        teacherId: selectedTeacherId || undefined,
        dayOfWeek: date ? undefined : dayOfWeek,
        date: date || undefined,
        startTime,
        endTime,
        slotType,
        isAvailable: slotType === 'available' || slotType === 'preferred',
        reason: reason.trim()
      };

      const res = await api.post('/schedule/teacher-availability', payload);
      toast.success(res.data.message || "Availability rule added successfully!");
      setReason('');
      fetchAvailabilities();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save availability rule.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSlot = async (id) => {
    try {
      await api.delete(`/schedule/teacher-availability/${id}`);
      toast.success("Availability rule deleted.");
      setAvailabilities(prev => prev.filter(a => a._id !== id));
    } catch (err) {
      toast.error("Failed to delete availability rule.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative text-slate-800 dark:text-white space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-lg">
              <FaUserClock />
            </span>
            <div>
              <h3 className="text-base font-black">Teacher Availability & Leave Management</h3>
              <p className="text-xs text-slate-400 font-medium">
                Set working hours, preferred slots, and unavailable/leave times to prevent timetable conflicts.
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

        {/* Content Body */}
        <div className="space-y-5 overflow-y-auto pr-1 flex-1">
          {/* Add New Availability Rule Form */}
          <form onSubmit={handleAddSlot} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-3.5">
            <span className="text-xs font-black uppercase text-purple-700 dark:text-purple-300 block">
              + Define Availability or Leave Slot
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {role === 'admin' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Select Teacher</label>
                  <select
                    value={selectedTeacherId}
                    onChange={(e) => setSelectedTeacherId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                  >
                    {teachers.map(t => (
                      <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Rule Category</label>
                <select
                  value={slotType}
                  onChange={(e) => setSlotType(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                >
                  <option value="unavailable">🚫 Unavailable (Cannot Schedule)</option>
                  <option value="leave">🏖️ On Leave / Holiday</option>
                  <option value="available">🟢 Available Window</option>
                  <option value="preferred">⭐ Preferred Slot</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Recurring Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  disabled={!!date}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold disabled:opacity-40"
                >
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Or Specific Date (Optional)</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">From Time</label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="08:00 AM"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">To Time</label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="05:00 PM"
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Reason / Notes (Optional)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Faculty board meeting, medical appointment, examination duty"
                className="w-full px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
            >
              <FaPlus /> {saving ? "Saving Rule..." : "Add Availability Rule"}
            </button>
          </form>

          {/* List of Configured Availability Slots */}
          <div className="space-y-2">
            <span className="text-xs font-black uppercase text-slate-400 block px-1">
              Active Availability Rules ({availabilities.length})
            </span>

            {loading ? (
              <div className="text-center py-6 text-slate-400 text-xs">Loading availability slots...</div>
            ) : availabilities.length > 0 ? (
              availabilities.map((rule) => {
                const isUnavail = rule.slotType === 'unavailable' || rule.slotType === 'leave' || !rule.isAvailable;
                return (
                  <div
                    key={rule._id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition ${
                      isUnavail
                        ? 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                        : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs">
                          {rule.teacherId?.name || 'Teacher'}
                        </span>
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isUnavail ? 'bg-rose-200/70 text-rose-800 dark:bg-rose-900' : 'bg-emerald-200/70 text-emerald-800 dark:bg-emerald-900'
                        }`}>
                          {rule.slotType}
                        </span>
                      </div>

                      <p className="text-xs font-bold mt-1">
                        📅 {rule.date || rule.dayOfWeek} • 🕒 {rule.startTime} – {rule.endTime}
                      </p>
                      {rule.reason && (
                        <p className="text-[11px] font-medium opacity-80 mt-0.5 italic">
                          "{rule.reason}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteSlot(rule._id)}
                      className="p-2 text-rose-600 hover:bg-rose-200/50 rounded-xl transition cursor-pointer"
                      title="Remove Rule"
                    >
                      <FaTrash className="text-xs" />
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-400 italic text-xs bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                No availability rules configured yet. All teachers are set to standard availability.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white font-bold text-xs rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
