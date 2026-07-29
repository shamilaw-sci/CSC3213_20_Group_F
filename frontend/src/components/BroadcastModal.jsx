import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { FaBullhorn, FaTimes, FaPaperPlane, FaSms, FaEnvelope, FaBell, FaUsers } from 'react-icons/fa';

const BroadcastModal = ({ isOpen, onClose, defaultGrade = '' }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [targetGrade, setTargetGrade] = useState(defaultGrade);
  const [type, setType] = useState('CLASS_POSTPONED');
  const [channels, setChannels] = useState(['in_app', 'sms', 'email']);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (defaultGrade) setTargetGrade(defaultGrade);
  }, [defaultGrade]);

  if (!isOpen) return null;

  const toggleChannel = (ch) => {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-purple-100 overflow-hidden transform transition-all">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-purple-800 to-indigo-900 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-xl backdrop-blur-md">
              <FaBullhorn className="text-2xl text-purple-200" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Broadcast Announcement</h3>
              <p className="text-xs text-purple-200 font-medium mt-0.5">Send updates to students & parents via In-App, SMS & Email</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-purple-200 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            <FaTimes className="text-lg" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {feedback && (
            <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {feedback.text}
            </div>
          )}

          {/* Announcement Type & Target Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-sm font-medium text-gray-800 outline-none transition-all"
              >
                <option value="CLASS_POSTPONED">Class Postponed / Rescheduled</option>
                <option value="NEW_CONTENT">New Content / Material Alert</option>
                <option value="ATTENDANCE">Attendance Update</option>
                <option value="GENERAL">General Announcement</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Target Grade (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Grade 6 (Leave blank for all)"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-sm font-medium text-gray-800 outline-none transition-all"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Announcement Title *</label>
            <input
              type="text"
              placeholder="e.g. Science Class Postponed to Next Thursday"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-sm font-medium text-gray-800 outline-none transition-all"
            />
          </div>

          {/* Message Content */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Message Body *</label>
            <textarea
              rows={4}
              placeholder="Provide details about the update, revised dates/times, or instructions..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:bg-white text-sm font-medium text-gray-800 outline-none transition-all"
            />
          </div>

          {/* Channel Selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">Dispatch Channels</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => toggleChannel('in_app')}
                className={`py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  channels.includes('in_app')
                    ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <FaBell className="text-sm" /> In-App
              </button>

              <button
                type="button"
                onClick={() => toggleChannel('sms')}
                className={`py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  channels.includes('sms')
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <FaSms className="text-sm" /> Parent SMS
              </button>

              <button
                type="button"
                onClick={() => toggleChannel('email')}
                className={`py-2.5 px-3 rounded-xl border font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                  channels.includes('email')
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <FaEnvelope className="text-sm" /> Email
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50"
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
