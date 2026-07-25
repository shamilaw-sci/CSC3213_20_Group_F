import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  FaSearch,
  FaUser,
  FaCalendarDay,
  FaHistory,
  FaCreditCard,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaMapMarkerAlt,
  FaGraduationCap,
  FaPhone,
  FaEnvelope,
  FaCalendarAlt,
  FaSpinner
} from 'react-icons/fa';

const Attendance = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [activeTab, setActiveTab] = useState('mark'); // 'mark', 'history', 'payments'

  // Forms & Schedules State
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('Present');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);

  // History & Stats State
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const getAuthHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // Search students when query changes (with min length check)
  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/auth/users/search-students?query=${encodeURIComponent(searchQuery)}`, getAuthHeaders());
      setSearchResults(res.data);
      if (res.data.length === 0) {
        toast.error("No students found with that name or registration number.");
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Error searching students.");
    } finally {
      setSearching(false);
    }
  };

  // Fetch student's attendance history and schedules
  const handleSelectStudent = async (student) => {
    setSelectedStudent(student);
    setSearchResults([]); // clear search list
    setSearchQuery('');
    setSelectedScheduleId('');

    // Fetch schedule entries & attendance history
    fetchSchedules(student.grade);
    fetchHistory(student._id);
  };

  const fetchSchedules = async (studentGrade) => {
    try {
      const res = await axios.get('http://localhost:5000/api/schedule', getAuthHeaders());
      // Prioritize schedules matching student's grade
      const sortedSchedules = [...res.data].sort((a, b) => {
        if (a.className === studentGrade && b.className !== studentGrade) return -1;
        if (a.className !== studentGrade && b.className === studentGrade) return 1;
        return 0;
      });
      setSchedules(sortedSchedules);

      // Auto-select first schedule matching grade if available
      const matching = sortedSchedules.find(s => s.className === studentGrade);
      if (matching) {
        setSelectedScheduleId(matching._id);
      } else if (sortedSchedules.length > 0) {
        setSelectedScheduleId(sortedSchedules[0]._id);
      }
    } catch (err) {
      console.error("Error fetching schedules", err);
    }
  };

  const fetchHistory = async (studentId) => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`http://localhost:5000/api/attendance/student/${studentId}`, getAuthHeaders());
      setAttendanceHistory(res.data);
    } catch (err) {
      console.error("Error fetching attendance history", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleMarkAttendance = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !selectedScheduleId) {
      toast.error("Please select both a student and a class schedule.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        studentId: selectedStudent._id,
        scheduleId: selectedScheduleId,
        status: attendanceStatus,
        date: attendanceDate
      };

      const res = await axios.post('http://localhost:5000/api/attendance', payload, getAuthHeaders());
      toast.success(res.data.message || "Attendance marked successfully!");

      // Refresh history & clean up
      fetchHistory(selectedStudent._id);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to mark attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  // Find the selected schedule details
  const activeSchedule = schedules.find(s => s._id === selectedScheduleId);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Attendance Marking Workspace</h1>
            <p className="text-purple-200 text-sm mt-1">Mark and monitor real-time classroom attendance for arriving students.</p>
          </div>
          <div className="bg-white/10 border border-white/20 px-4 py-2 rounded-lg flex items-center gap-3 self-start md:self-center">
            <FaCalendarAlt className="text-purple-300" />
            <span className="text-xs font-bold uppercase tracking-wider">{new Date().toDateString()}</span>
          </div>
        </div>
      </div>

      {/* Student Search & Select Box */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
        <form onSubmit={handleSearchSubmit} className="relative">
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Search Student</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by student's name or registration number (e.g. REG1001)..."
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent text-sm shadow-inner transition-all"
              />
              <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
            </div>
            <button
              type="submit"
              disabled={searching}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer shadow-md"
            >
              {searching ? <FaSpinner className="animate-spin" /> : 'Search'}
            </button>
          </div>

          {/* Search Dropdown Results */}
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-gray-150 animate-fadeIn">
              {searchResults.map(student => (
                <div
                  key={student._id}
                  onClick={() => handleSelectStudent(student)}
                  className="p-3 hover:bg-purple-50 cursor-pointer flex items-center justify-between transition-colors"
                >
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{student.name}</p>
                    <p className="text-xs text-gray-500 uppercase font-bold">{student.registrationNumber || 'No Reg No'}</p>
                  </div>
                  <span className="bg-purple-100 text-purple-800 text-xs font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                    {student.grade || 'No Grade'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </form>
      </div>

      {/* Selected Student Details and Operations Workspace */}
      {selectedStudent ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Student Details Card */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col items-center text-center relative">
              {/* Close/Deselect button */}
              <button
                onClick={() => setSelectedStudent(null)}
                className="absolute right-4 top-4 text-gray-400 hover:text-red-500 text-sm transition-colors cursor-pointer font-bold border-none bg-transparent"
              >
                ✕ Close
              </button>

              {selectedStudent.profilePicture ? (
                <img 
                  src={selectedStudent.profilePicture} 
                  alt={selectedStudent.name} 
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-full object-cover border-2 border-purple-200 shadow-sm mb-4 mt-2"
                />
              ) : (
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 text-3xl font-bold shadow-inner mb-4 mt-2">
                  {selectedStudent.name.charAt(0).toUpperCase()}
                </div>
              )}

              <h2 className="text-xl font-bold text-gray-800 leading-tight">{selectedStudent.name}</h2>
              <p className="bg-purple-100 text-purple-800 font-extrabold text-xs tracking-wider px-3 py-1 rounded-full mt-2 uppercase">
                {selectedStudent.registrationNumber || 'UNASSIGNED'}
              </p>

              <hr className="w-full my-5 border-gray-100" />

              <div className="w-full space-y-3.5 text-left text-sm text-gray-600">
                <div className="flex items-center gap-3">
                  <FaGraduationCap className="text-purple-500 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Assigned Grade</p>
                    <p className="font-semibold text-gray-800">{selectedStudent.grade || 'Not Assigned'}</p>
                  </div>
                </div>
                {selectedStudent.parentsPhoneNumber && (
                  <div className="flex items-center gap-3">
                    <FaPhone className="text-purple-500 shrink-0" />
                    <div>
                      <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Parent's Phone</p>
                      <p className="font-semibold text-gray-800">{selectedStudent.parentsPhoneNumber}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <FaEnvelope className="text-purple-500 shrink-0" />
                  <div>
                    <p className="text-[10px] uppercase font-extrabold text-gray-400 tracking-wider">Student Email</p>
                    <p className="font-semibold text-gray-800 truncate max-w-[200px]">{selectedStudent.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Helper Card */}
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Quick Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-green-50 rounded-lg p-3 text-center border border-green-100">
                  <p className="text-[10px] text-green-700 font-bold uppercase tracking-wider">Attended</p>
                  <p className="text-xl font-extrabold text-green-800 mt-1">
                    {attendanceHistory.filter(r => r.status === 'Present' || r.status === 'Late').length}
                  </p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
                  <p className="text-[10px] text-red-700 font-bold uppercase tracking-wider">Absent</p>
                  <p className="text-xl font-extrabold text-red-800 mt-1">
                    {attendanceHistory.filter(r => r.status === 'Absent').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Tabbed Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col">

            {/* Tab Headers */}
            <div className="flex border-b border-gray-150 bg-gray-50/50">
              <button
                onClick={() => setActiveTab('mark')}
                className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'mark'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
              >
                <FaCalendarDay /> Mark Attendance
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'history'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
              >
                <FaHistory /> Attendance History
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`flex-1 py-4 text-center font-bold text-xs uppercase tracking-wider border-b-2 flex items-center justify-center gap-2 transition-all cursor-pointer ${activeTab === 'payments'
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                  }`}
              >
                <FaCreditCard /> Payment Records
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 flex-1 min-h-[400px]">

              {/* Tab 1: MARK ATTENDANCE */}
              {activeTab === 'mark' && (
                <form onSubmit={handleMarkAttendance} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Select Date</label>
                      <input
                        type="date"
                        value={attendanceDate}
                        onChange={(e) => setAttendanceDate(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Class Schedule</label>
                      <select
                        value={selectedScheduleId}
                        onChange={(e) => setSelectedScheduleId(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-600 focus:outline-none text-sm"
                      >
                        <option value="">-- Choose Class Schedule --</option>
                        {schedules.map(schedule => {
                          const isRecommended = schedule.className === selectedStudent.grade;
                          return (
                            <option key={schedule._id} value={schedule._id}>
                              {schedule.title} ({schedule.className}) {isRecommended ? '★ Recommended' : ''}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  </div>

                  {/* Schedule Details Box (Dynamic Preview) */}
                  {activeSchedule && (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 space-y-2 animate-fadeIn text-xs text-purple-800">
                      <h4 className="font-bold text-purple-900 text-sm">{activeSchedule.title} Schedule Specs:</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                        <div className="flex items-center gap-1.5">
                          <FaClock className="text-purple-500 shrink-0" />
                          <span>{activeSchedule.dayOfWeek} at {activeSchedule.startTime} - {activeSchedule.endTime}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FaMapMarkerAlt className="text-purple-500 shrink-0" />
                          <span>Room: {activeSchedule.room}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FaGraduationCap className="text-purple-500 shrink-0" />
                          <span>Grade Target: {activeSchedule.className}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Status Picker (Present, Late, Absent) */}
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2.5">Attendance Status</label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => setAttendanceStatus('Present')}
                        className={`py-3 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${attendanceStatus === 'Present'
                            ? 'bg-green-600 border-green-600 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <FaCheckCircle /> Present
                      </button>
                      <button
                        type="button"
                        onClick={() => setAttendanceStatus('Absent')}
                        className={`py-3 rounded-lg border font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer ${attendanceStatus === 'Absent'
                            ? 'bg-red-600 border-red-600 text-white shadow-md'
                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                      >
                        <FaTimesCircle /> Absent
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3.5 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer text-sm"
                    >
                      {submitting ? <FaSpinner className="animate-spin" /> : 'Log Attendance'}
                    </button>
                    <p className="text-[10px] text-gray-400 mt-2 text-center">
                      * Logging attendance will trigger parent SMS notifications and student email alerts in the next rollout phase.
                    </p>
                  </div>
                </form>
              )}

              {/* Tab 2: ATTENDANCE HISTORY */}
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {loadingHistory ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-2">
                      <FaSpinner className="animate-spin text-purple-600 text-2xl" />
                      <p className="text-xs text-gray-500">Retrieving attendance logs...</p>
                    </div>
                  ) : attendanceHistory.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                      <FaHistory className="mx-auto text-gray-300 text-3xl mb-3" />
                      <p className="text-sm font-semibold text-gray-500">No attendance logs logged yet for this student.</p>
                      <button
                        onClick={() => setActiveTab('mark')}
                        className="text-xs text-purple-600 font-bold mt-2 hover:underline cursor-pointer border-none bg-transparent"
                      >
                        Mark Today's Attendance
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-gray-150">
                      <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                        <thead className="bg-gray-50 font-bold uppercase tracking-wider text-gray-500">
                          <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">Class/Course</th>
                            <th className="p-3">Schedule Spec</th>
                            <th className="p-3">Marked By</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-150 text-gray-700">
                          {attendanceHistory.map(record => (
                            <tr key={record._id} className="hover:bg-gray-50/50 transition-colors">
                              <td className="p-3 font-medium whitespace-nowrap">
                                {new Date(record.date).toLocaleDateString()}
                              </td>
                              <td className="p-3">
                                <p className="font-semibold">{record.scheduleId?.title || 'Unknown Class'}</p>
                                <p className="text-[10px] text-gray-400 font-medium">{record.courseId?.title || ''}</p>
                              </td>
                              <td className="p-3">
                                {record.scheduleId ? (
                                  <span>{record.scheduleId.dayOfWeek} • {record.scheduleId.startTime}</span>
                                ) : '-'}
                              </td>
                              <td className="p-3">
                                {record.markedBy?.name || 'Admin'}
                              </td>
                              <td className="p-3 text-center whitespace-nowrap">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                  record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                  record.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: PAYMENT RECORDS (PLACEHOLDER) */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  {/* Warning banner indicating teammates role */}
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs">
                    <FaCreditCard className="text-amber-600 text-lg shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Team Integration Notice</p>
                      <p className="mt-0.5 leading-relaxed">
                        This view acts as a placeholder workspace. Once the Payments module (currently in development by our teammate) is complete, this container will bind directly to the live payments database collections and render transactional metrics.
                      </p>
                    </div>
                  </div>

                  {/* Mock Payment Specs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2">
                      <span className="bg-green-100 text-green-800 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Status: Settled
                      </span>
                      <h4 className="text-lg font-bold text-gray-800">July 2026 Monthly Fees</h4>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Invoice ID: <span className="font-mono text-gray-700">INV-2026-0789</span></p>
                        <p>Amount Paid: <span className="font-semibold text-gray-700">Rs. 6,000.00</span></p>
                        <p>Payment Date: <span className="font-medium text-gray-700">2026-07-02</span></p>
                        <p>Method: <span className="font-medium text-gray-700">Credit/Debit Card</span></p>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-2 opacity-75">
                      <span className="bg-gray-100 text-gray-600 font-extrabold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full">
                        Status: Pending
                      </span>
                      <h4 className="text-lg font-bold text-gray-800">August 2026 Monthly Fees</h4>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>Invoice ID: <span className="font-mono text-gray-700">INV-2026-0812</span></p>
                        <p>Amount Due: <span className="font-semibold text-gray-700">Rs. 6,000.00</span></p>
                        <p>Due Date: <span className="font-medium text-gray-700">2026-08-05</span></p>
                        <p>Status: <span className="font-bold text-red-500">Unpaid</span></p>
                      </div>
                    </div>
                  </div>

                  {/* Payment Logs */}
                  <div className="border border-gray-150 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 p-3 border-b border-gray-150 flex justify-between items-center">
                      <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Transaction History (Recent)</h4>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Mock Ledger</span>
                    </div>
                    <div className="divide-y divide-gray-150 text-xs">
                      <div className="p-3 flex justify-between items-center hover:bg-gray-50/50">
                        <div>
                          <p className="font-semibold text-gray-800">Rs. 6,000.00 - Course Admission</p>
                          <p className="text-[10px] text-gray-400">June Monthly Fees (Receipt #REC-8842)</p>
                        </div>
                        <span className="text-gray-500 font-medium">2026-06-28</span>
                      </div>
                      <div className="p-3 flex justify-between items-center hover:bg-gray-50/50">
                        <div>
                          <p className="font-semibold text-gray-800">Rs. 1,500.00 - Chemistry Practical Kit</p>
                          <p className="text-[10px] text-gray-400">Materials Fee (Receipt #REC-8801)</p>
                        </div>
                        <span className="text-gray-500 font-medium">2026-06-15</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      ) : (
        /* Empty State: Prompt Search */
        <div className="bg-white rounded-xl shadow-md border border-gray-100 py-16 text-center">
          <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center text-xl mx-auto mb-4 border border-purple-100">
            <FaUser />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No Student Selected</h3>
          <p className="text-sm text-gray-500 max-w-sm mx-auto mt-1 leading-normal">
            Use the search panel above to search for a student by their Name or Registration Number to start marking attendance or auditing logs.
          </p>
        </div>
      )}
    </div>
  );
};

export default Attendance;
