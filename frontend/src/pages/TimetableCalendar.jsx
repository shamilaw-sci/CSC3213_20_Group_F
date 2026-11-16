/**
 * @file TimetableCalendar.jsx
 * @description Master Timetable Calendar Page. Comprehensive institutional calendar displaying weekly recurring classes, hall allocations, and live stream schedules.
 */

import React, { useState, useEffect } from 'react';
import {
  FaCalendarAlt,
  FaPlusCircle,
  FaUserClock,
  FaDoorOpen,
  FaArrowLeft,
  FaGraduationCap,
  FaChalkboardTeacher,
  FaHistory
} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import toast from 'react-hot-toast';
import InteractiveCalendar from '../components/InteractiveCalendar';
import AddScheduleModal from '../components/AddScheduleModal';
import RescheduleModal from '../components/RescheduleModal';
import TeacherAvailabilityModal from '../components/TeacherAvailabilityModal';
import ClassroomAllocationsModal from '../components/ClassroomAllocationsModal';
import ConfirmModal from '../components/ConfirmModal';

const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

export default function TimetableCalendar() {
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const role = user?.role || 'student';

  const [schedules, setSchedules] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [reschedulingSchedule, setReschedulingSchedule] = useState(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showClassroomModal, setShowClassroomModal] = useState(false);
  const [deleteConfirmSchedule, setDeleteConfirmSchedule] = useState(null);

  useEffect(() => {
    fetchCalendarData();
  }, []);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const [schedRes, coursesRes, usersRes] = await Promise.allSettled([
        api.get('/schedule'),
        api.get('/courses'),
        api.get('/auth/users')
      ]);

      if (schedRes.status === 'fulfilled') setSchedules(schedRes.value.data || []);
      if (coursesRes.status === 'fulfilled') setCourses(coursesRes.value.data || []);
      if (usersRes.status === 'fulfilled') {
        setTeachers((usersRes.value.data || []).filter(u => u.role === 'teacher'));
      }
    } catch (err) {
      console.error("Error loading timetable calendar data", err);
      toast.error("Failed to load timetable calendar data.");
    } finally {
      setLoading(false);
    }
  };

  // Add / Edit Schedule Save Handler
  const handleSaveSchedule = async (payload, isEditing) => {
    try {
      if (isEditing) {
        const res = await api.put(`/schedule/${payload._id}`, payload);
        toast.success(res.data.message || "Class schedule updated successfully!");
        setSchedules(prev => prev.map(s => s._id === payload._id ? res.data.schedule : s));
      } else {
        const res = await api.post('/schedule', payload);
        toast.success(res.data.message || "Class added to timetable successfully!");
        if (res.data.schedule) {
          setSchedules(prev => [...prev, res.data.schedule]);
        } else {
          fetchCalendarData();
        }
      }
      setShowAddModal(false);
      setEditingSchedule(null);
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to save class schedule";
      toast.error(msg);
      throw err;
    }
  };

  // Delete Schedule Execute Handler
  const executeDeleteSchedule = async () => {
    if (!deleteConfirmSchedule) return;
    const { id } = deleteConfirmSchedule;

    try {
      await api.delete(`/schedule/${id}`);
      toast.success("Schedule entry removed from calendar.");
      setSchedules(prev => prev.filter(s => s._id !== id));
    } catch (err) {
      toast.error("Failed to delete schedule entry.");
    } finally {
      setDeleteConfirmSchedule(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 p-6 sm:p-8 text-white shadow-xl border border-purple-900/40">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/15 rounded-full blur-3xl pointer-events-none transform translate-x-24 -translate-y-24" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-purple-500/30 border border-purple-400/40 text-purple-200 text-[10px] font-black uppercase px-3.5 py-1 rounded-full tracking-widest">
                {role === 'admin' ? 'Institute Master Calendar' : role === 'teacher' ? 'Teaching Timetable' : 'Student Academic Calendar'}
              </span>
              <span className="text-purple-300 text-xs font-semibold bg-white/10 px-3 py-1 rounded-full">
                Interactive Schedule Manager
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-2.5">
              <FaCalendarAlt className="text-purple-400" />
              Interactive Timetable & Calendar
            </h1>
            <p className="text-purple-200/80 text-xs sm:text-sm mt-1 max-w-xl font-medium">
              Explore monthly, weekly, and daily views. Manage class sessions, room allocations, teacher availability, and resolve scheduling conflicts seamlessly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {role === 'admin' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowAvailabilityModal(true)}
                  className="px-3.5 py-2.5 bg-indigo-600/80 hover:bg-indigo-600 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <FaUserClock /> Teacher Availability
                </button>

                <button
                  type="button"
                  onClick={() => setShowClassroomModal(true)}
                  className="px-3.5 py-2.5 bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold text-xs rounded-2xl transition flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <FaDoorOpen /> Classroom Allocations
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingSchedule(null);
                    setShowAddModal(true);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-2xl transition flex items-center gap-2 shadow-lg shadow-purple-900/30 cursor-pointer active:scale-95"
                >
                  <FaPlusCircle /> Add Class Session
                </button>
              </>
            )}

            {role === 'teacher' && (
              <button
                type="button"
                onClick={() => setShowAvailabilityModal(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-2xl transition flex items-center gap-2 shadow cursor-pointer active:scale-95"
              >
                <FaUserClock /> Manage My Availability & Leave
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-xs rounded-2xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <FaArrowLeft /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Interactive Calendar */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold">Synchronizing Calendar Schedules...</p>
        </div>
      ) : (
        <InteractiveCalendar
          schedules={schedules}
          role={role}
          onAddSchedule={() => {
            setEditingSchedule(null);
            setShowAddModal(true);
          }}
          onEditSchedule={(sch) => {
            setEditingSchedule(sch);
            setShowAddModal(true);
          }}
          onReschedule={(sch) => setReschedulingSchedule(sch)}
          onDeleteSchedule={(id, title) => setDeleteConfirmSchedule({ id, title })}
          onManageAvailability={() => setShowAvailabilityModal(true)}
          onViewClassrooms={() => setShowClassroomModal(true)}
        />
      )}

      {/* Add / Edit Schedule Modal */}
      <AddScheduleModal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
        courses={courses}
        teachers={teachers}
        gradeOptions={gradeOptions}
        editSchedule={editingSchedule}
      />

      {/* Reschedule / Postpone Modal */}
      <RescheduleModal
        isOpen={!!reschedulingSchedule}
        onClose={() => setReschedulingSchedule(null)}
        schedule={reschedulingSchedule}
        onSuccess={(updated) => {
          setSchedules(prev => prev.map(s => s._id === updated._id ? updated : s));
        }}
      />

      {/* Teacher Availability Management Modal */}
      <TeacherAvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        teachers={teachers}
        role={role}
      />

      {/* Classroom Allocations Modal */}
      <ClassroomAllocationsModal
        isOpen={showClassroomModal}
        onClose={() => setShowClassroomModal(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmSchedule}
        onClose={() => setDeleteConfirmSchedule(null)}
        onConfirm={executeDeleteSchedule}
        title="Remove Calendar Schedule"
        message={
          deleteConfirmSchedule
            ? `Are you sure you want to remove "${deleteConfirmSchedule.title}" from the timetable calendar?`
            : ''
        }
        confirmText="Remove Entry"
        type="danger"
      />
    </div>
  );
}
