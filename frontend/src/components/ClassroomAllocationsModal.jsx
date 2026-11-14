import React, { useState, useEffect } from 'react';
import {
  FaDoorOpen,
  FaCalendarAlt,
  FaClock,
  FaTimes,
  FaCheckCircle,
  FaExclamationCircle,
  FaSearch
} from 'react-icons/fa';
import api from '../utils/api';

export default function ClassroomAllocationsModal({
  isOpen,
  onClose
}) {
  const [data, setData] = useState({ totalRooms: 0, rooms: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState('ALL');
  const [searchRoom, setSearchRoom] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchClassrooms();
    }
  }, [isOpen, selectedDay]);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const url = selectedDay === 'ALL' ? '/schedule/classrooms' : `/schedule/classrooms?dayOfWeek=${selectedDay}`;
      const res = await api.get(url);
      setData(res.data || { totalRooms: 0, rooms: [] });
    } catch (err) {
      console.error("Failed to load classroom allocations", err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredRooms = (data.rooms || []).filter(r =>
    r.room.toLowerCase().includes(searchRoom.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-2xl w-full shadow-2xl relative text-slate-800 dark:text-white space-y-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-lg">
              <FaDoorOpen />
            </span>
            <div>
              <h3 className="text-base font-black">Classroom & Venue Allocations</h3>
              <p className="text-xs text-slate-400 font-medium">
                Live timetable occupancy and classroom assignment matrix.
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

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Filter by classroom name..."
              value={searchRoom}
              onChange={(e) => setSearchRoom(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {['ALL', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDay(d)}
                className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                  selectedDay === d
                    ? 'bg-purple-600 text-white shadow-xs font-black'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {d === 'ALL' ? 'ALL DAYS' : d.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {/* Room Allocations Grid / Cards */}
        <div className="overflow-y-auto pr-1 flex-1 space-y-3.5">
          {loading ? (
            <div className="text-center py-10 text-slate-400 text-xs">Loading classroom allocations...</div>
          ) : filteredRooms.length > 0 ? (
            filteredRooms.map((roomItem) => (
              <div
                key={roomItem.room}
                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🚪</span>
                    <div>
                      <h4 className="font-black text-sm text-slate-900 dark:text-white">{roomItem.room}</h4>
                      <span className="text-[10px] text-slate-400 font-semibold">
                        {roomItem.isPhysical ? '🏛️ Physical Venue' : '🌐 Virtual Session'}
                      </span>
                    </div>
                  </div>

                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    roomItem.totalBookings > 0
                      ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  }`}>
                    {roomItem.totalBookings} Booking{roomItem.totalBookings !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Bookings within this room */}
                {roomItem.bookings && roomItem.bookings.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {roomItem.bookings.map((b, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-800 dark:text-white">{b.title}</span>
                            <span className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.2 rounded">
                              {b.className}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">
                            👨‍🏫 {b.teacherName}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-black text-purple-600 dark:text-purple-400 block text-xs">
                            {b.startTime} – {b.endTime}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {b.date || b.dayOfWeek}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-1">
                    No classes currently allocated for this venue {selectedDay !== 'ALL' ? `on ${selectedDay}` : ''}.
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 text-slate-400 italic text-xs">
              No matching classrooms found.
            </div>
          )}
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
