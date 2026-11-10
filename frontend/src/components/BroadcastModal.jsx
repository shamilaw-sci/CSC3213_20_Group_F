import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { 
  FaBullhorn, 
  FaTimes, 
  FaPaperPlane, 
  FaSms, 
  FaEnvelope, 
  FaBell, 
  FaCheckSquare,
  FaSquare,
  FaBan
} from 'react-icons/fa';

const BroadcastModal = ({ isOpen, onClose, defaultGrade = '', defaultCourseId = '' }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGrade, setTargetGrade] = useState(defaultGrade);
  const [targetCourseId, setTargetCourseId] = useState(defaultCourseId);
  const [courses, setCourses] = useState([]);
  const [type, setType] = useState('CLASS_POSTPONED');
  const [channels, setChannels] = useState(['in_app', 'sms', 'email']);
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const availableGrades = [
    'Grade 6',
    'Grade 7',
    'Grade 8',
    'Grade 9',
    'Grade 10',
    'Grade 11',
    'Grade 12',
    'Grade 13'
  ];

  useEffect(() => {
    if (defaultGrade) setTargetGrade(defaultGrade);
  }, [defaultGrade]);

  useEffect(() => {
    if (defaultCourseId) setTargetCourseId(defaultCourseId);
  }, [defaultCourseId]);

  useEffect(() => {
    if (isOpen) {
      api.get('/courses')
        .then(res => {
          const list = Array.isArray(res.data) ? res.data : (res.data?.courses || []);
          setCourses(list);
        })
        .catch(err => console.error('Error fetching courses in broadcast modal:', err));

      api.get('/settings/sms-status')
        .then(res => {
          const isEnabled = res.data?.smsEnabled !== false;
          setSmsEnabled(isEnabled);
          if (!isEnabled) {
            setChannels(prev => prev.filter(c => c !== 'sms'));
          }
        })
        .catch(err => {
          console.warn('Could not fetch SMS status:', err);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleChannel = (ch) => {
    if (ch === 'sms' && !smsEnabled) return;
    if (channels.includes(ch)) {
      if (channels.length === 1) return; // keep at least 1 channel selected
      setChannels(channels.filter(c => c !== ch));
    } else {
      setChannels([...channels, ch]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      setFeedback({ type: 'error', text: 'Please enter both announcement title and message.' });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const res = await api.post('/notifications/broadcast', {
        title,
        message,
        courseId: targetCourseId || undefined,
        targetGrade,
        type,
        channels
      });

      setFeedback({
        type: 'success',
        text: res.data.message || 'Announcement broadcasted successfully!'
      });

      // Clear fields on success
      setTimeout(() => {
        setTitle('');
        setMessage('');
        setTargetCourseId('');
        setFeedback(null);
        onClose();
      }, 1800);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.response?.data?.error || err.response?.data?.message || 'Failed to dispatch announcement.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl border border-purple-100 dark:border-slate-800 overflow-hidden transform transition-all text-gray-800 dark:text-gray-100">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 sm:p-3 bg-white/15 rounded-xl backdrop-blur-md">
              <FaBullhorn className="text-xl sm:text-2xl text-purple-200" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-bold">Broadcast Announcement</h3>
              <p className="text-[11px] sm:text-xs text-purple-200 font-medium mt-0.5">Send updates to students & parents via In-App, SMS & Email</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            title="Close"
          >
            <FaTimes className="text-base sm:text-lg" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1">
          {feedback && (
            <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
            }`}>
              {feedback.text}
            </div>
          )}

          {/* Announcement Type, Target Course & Target Grade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 text-xs font-medium text-gray-800 dark:text-white outline-none transition-all cursor-pointer"
              >
                <option value="CLASS_POSTPONED">Class Postponed / Rescheduled</option>
                <option value="NEW_CONTENT">New Content / Material Alert</option>
                <option value="ATTENDANCE">Attendance Update</option>
                <option value="GENERAL">General Announcement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Target Course (Optional)</label>
              <select
                value={targetCourseId}
                onChange={(e) => setTargetCourseId(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 text-xs font-medium text-gray-800 dark:text-white outline-none transition-all cursor-pointer truncate"
              >
                <option value="">All / Any Course</option>
                {courses.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.title} {c.grade ? `(${c.grade})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Target Grade (Optional)</label>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 text-xs font-medium text-gray-800 dark:text-white outline-none transition-all cursor-pointer"
              >
                <option value="">All Grades</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Announcement Title *</label>
            <input
              type="text"
              placeholder="e.g. Science Class Postponed to Next Thursday"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 text-sm font-medium text-gray-800 dark:text-white outline-none transition-all"
            />
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">Message Body *</label>
            <textarea
              rows={4}
              placeholder="Provide details about the update, revised dates/times, or instructions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white dark:focus:bg-slate-800 text-sm font-medium text-gray-800 dark:text-white outline-none transition-all"
            />
          </div>

          {/* Channel Selector with Checkboxes */}
          <div>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
              Dispatch Channels (Select at least one)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* In-App Checkbox Button */}
              <div
                onClick={() => toggleChannel('in_app')}
                className={`p-3 rounded-xl border font-semibold text-xs flex items-center gap-3 transition-all cursor-pointer select-none ${
                  channels.includes('in_app')
                    ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-800 dark:text-purple-300 shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                <div className="text-base text-purple-600 dark:text-purple-400">
                  {channels.includes('in_app') ? <FaCheckSquare className="text-purple-600 dark:text-purple-400 text-lg" /> : <FaSquare className="text-gray-300 dark:text-gray-600 text-lg" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <FaBell className={`text-sm ${channels.includes('in_app') ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className="text-gray-800 dark:text-gray-200">In-App Notice</span>
                </div>
              </div>

              {/* SMS Checkbox Button */}
              <div
                onClick={() => smsEnabled && toggleChannel('sms')}
                title={!smsEnabled ? 'SMS Service is currently turned OFF in Admin Settings' : 'Toggle Parent SMS'}
                className={`p-3 rounded-xl border font-semibold text-xs flex items-center justify-between transition-all select-none ${
                  !smsEnabled
                    ? 'bg-gray-100/90 dark:bg-slate-800/50 border-gray-200 dark:border-slate-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60'
                    : channels.includes('sms')
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm cursor-pointer'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-750 cursor-pointer'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-base">
                    {!smsEnabled ? (
                      <FaBan className="text-gray-400 dark:text-gray-600 text-lg" />
                    ) : channels.includes('sms') ? (
                      <FaCheckSquare className="text-emerald-600 dark:text-emerald-400 text-lg" />
                    ) : (
                      <FaSquare className="text-gray-300 dark:text-gray-600 text-lg" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FaSms className={`text-sm ${!smsEnabled ? 'text-gray-400 dark:text-gray-600' : channels.includes('sms') ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`} />
                    <span className="text-gray-800 dark:text-gray-200">Parent SMS</span>
                  </div>
                </div>
                {!smsEnabled && (
                  <span className="text-[9px] font-extrabold uppercase bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-md">
                    OFF
                  </span>
                )}
              </div>

              {/* Email Checkbox Button */}
              <div
                onClick={() => toggleChannel('email')}
                className={`p-3 rounded-xl border font-semibold text-xs flex items-center gap-3 transition-all cursor-pointer select-none ${
                  channels.includes('email')
                    ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-800 dark:text-blue-300 shadow-sm'
                    : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-750'
                }`}
              >
                <div className="text-base text-blue-600 dark:text-blue-400">
                  {channels.includes('email') ? <FaCheckSquare className="text-blue-600 dark:text-blue-400 text-lg" /> : <FaSquare className="text-gray-300 dark:text-gray-600 text-lg" />}
                </div>
                <div className="flex items-center gap-1.5">
                  <FaEnvelope className={`text-sm ${channels.includes('email') ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <span className="text-gray-800 dark:text-gray-200">Email Notice</span>
                </div>
              </div>

            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>Dispatching...</span>
              ) : (
                <>
                  <FaPaperPlane /> Send Announcement
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default BroadcastModal;
