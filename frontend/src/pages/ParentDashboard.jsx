import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FaUserGraduate, FaCalendarCheck, FaReceipt, FaBookOpen, 
  FaUserFriends, FaPlus, FaCheckCircle, FaTimesCircle, FaClock, 
  FaSync, FaIdCard, FaBuilding, FaChalkboardTeacher, FaClipboardList, FaTrophy,
  FaClipboardCheck, FaAward, FaCommentDots, FaExclamationTriangle, FaShieldAlt, FaEye, FaArrowRight
} from 'react-icons/fa';
import StudentPerformanceModal from '../components/StudentPerformanceModal';

const ParentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'payments' | 'courses' | 'reading' | 'quizzes' | 'assignments' | 'warnings' | 'link'
  const [linkRegNo, setLinkRegNo] = useState('');
  const [linking, setLinking] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);

  const fetchParentData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/auth/parent-summary');
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load parent dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParentData();
  }, []);

  const handleLinkChild = async (e) => {
    e.preventDefault();
    if (!linkRegNo || !linkRegNo.trim()) {
      toast.error('Please enter child registration number.');
      return;
    }
    setLinking(true);
    try {
      const res = await api.post('/auth/link-child', { childRegNo: linkRegNo });
      toast.success(res.data.message);
      setLinkRegNo('');
      fetchParentData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to link child account.');
    } finally {
      setLinking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] p-6 gap-3">
        <div className="w-12 h-12 border-4 border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-semibold text-purple-900 dark:text-purple-300 animate-pulse">Loading Parent Portal...</p>
      </div>
    );
  }

  const childrenData = data?.childrenData || [];
  const currentChildObj = childrenData[selectedChildIndex] || null;
  const child = currentChildObj?.child || null;
  const metrics = currentChildObj?.attendanceMetrics || { total: 0, present: 0, absent: 0, late: 0, attendanceRate: 100 };
  const logs = currentChildObj?.attendanceLogs || [];
  const payments = currentChildObj?.payments || [];
  const courses = currentChildObj?.courses || [];
  const earlyWarning = currentChildObj?.earlyWarning || null;
  const childWarnings = earlyWarning?.warnings || [];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-800 dark:text-gray-100 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto transition-colors duration-200">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-purple-800/40 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-purple-800/60 rounded-full text-xs font-bold border border-purple-400/30 text-purple-200">
            👨‍👩‍👧 Official Parent Monitoring Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome, {data?.parentName || 'Parent'}!
          </h1>
          {child && (
            <div className="inline-flex items-center gap-2 bg-amber-400/20 border border-amber-400/40 px-3.5 py-1.5 rounded-xl text-amber-200 font-black text-sm sm:text-base">
              <span>👦 Currently Viewing Student:</span>
              <span className="text-amber-300 underline underline-offset-4 font-black">{child.name}</span>
            </div>
          )}
          <p className="text-sm text-purple-200/80 max-w-xl leading-relaxed">
            Real-time academic monitoring, classroom attendance tracking, and payment fee receipts for your enrolled children.
          </p>
        </div>

        {/* Multi-Child Selector */}
        <div className="z-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl w-full md:w-auto min-w-[300px] shadow-lg">
          <label className="block text-[11px] uppercase tracking-widest font-extrabold text-amber-300 mb-2 flex items-center gap-1.5">
            <FaUserFriends className="text-amber-400 text-sm" /> Select Active Child ({childrenData.length}):
          </label>

          {childrenData.length === 0 ? (
            <p className="text-xs text-amber-200 font-bold">No linked children found yet.</p>
          ) : (
            <select
              value={selectedChildIndex}
              onChange={(e) => setSelectedChildIndex(Number(e.target.value))}
              className="w-full bg-purple-950 text-white text-base font-extrabold py-3 px-4 rounded-xl border-2 border-amber-400/60 outline-none cursor-pointer focus:ring-2 focus:ring-amber-300 transition shadow-inner"
            >
              {childrenData.map((cObj, idx) => (
                <option key={cObj.child._id} value={idx} className="bg-purple-950 text-white font-bold py-2">
                  👦 {cObj.child.name} ({cObj.child.grade} • {cObj.child.registrationNumber || 'Online'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* No Children Banner */}
      {childrenData.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-amber-200 dark:border-amber-900/50 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 text-2xl mx-auto">
            👨‍👩‍👧
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">No Child Linked to Your Parent Account</h3>
          <p className="text-sm text-slate-500 dark:text-gray-400 max-w-md mx-auto">
            Link your child by entering their unique Student Registration Number (e.g. <strong>OL-G06-2012-4829</strong> or physical Reg No).
          </p>
          
          <form onSubmit={handleLinkChild} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <input
              type="text"
              placeholder="Enter Child Reg No"
              value={linkRegNo}
              onChange={(e) => setLinkRegNo(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-sm font-mono font-bold outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={linking}
              className="px-6 py-3 bg-purple-900 hover:bg-purple-800 text-white font-bold text-sm rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
            >
              <FaPlus /> {linking ? 'Linking...' : 'Link Child'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Child Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Student Profile Card (High Prominence & Large Visible Typography) */}
            <div className="bg-gradient-to-br from-purple-50 via-white to-purple-100/50 dark:from-slate-900 dark:via-purple-950/40 dark:to-slate-900 p-6 rounded-3xl border-2 border-purple-200/90 dark:border-purple-900/60 shadow-md space-y-4 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-purple-900 dark:text-purple-300 uppercase tracking-widest bg-purple-200/70 dark:bg-purple-950/80 px-2.5 py-1 rounded-md border border-purple-300/60 dark:border-purple-800">
                  ACTIVE STUDENT PROFILE
                </span>
                <span className="p-2 bg-purple-900 text-white rounded-xl text-lg shadow-sm">
                  <FaUserGraduate />
                </span>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-800 to-indigo-900 text-white flex items-center justify-center text-2xl font-black shrink-0 shadow-lg border-2 border-purple-300/40">
                  {child?.name ? child.name.charAt(0).toUpperCase() : '🎓'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-2xl sm:text-3xl font-black text-purple-950 dark:text-white tracking-tight leading-none truncate" title={child?.name}>
                    {child?.name}
                  </h4>
                  <div className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-purple-900 text-amber-300 font-mono font-black text-xs rounded-md shadow-xs">
                    🆔 Reg No: {child?.registrationNumber || 'Online'}
                  </div>
                </div>
              </div>

              <div className="pt-1 flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-black text-xs rounded-xl shadow-xs flex items-center gap-1">
                  🎓 {child?.grade}
                </span>
                <span className="px-3 py-1 bg-purple-900 text-purple-100 font-extrabold text-xs rounded-xl shadow-xs">
                  {child?.studentType === 'online' ? '💻 Online Student' : '🏫 Physical Classroom'}
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Attendance Rate</span>
                <span className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-xl text-lg">
                  <FaCalendarCheck />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{metrics.attendanceRate}%</span>
                <span className="text-xs text-slate-500 dark:text-gray-400 font-semibold">Overall Presence</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.attendanceRate}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Course Fees Settled</span>
                <span className="p-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 rounded-xl text-lg">
                  <FaReceipt />
                </span>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-slate-900 dark:text-white">LKR {currentChildObj?.totalPaidAmount?.toLocaleString() || 0}.00</span>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">{payments.length} Fee Transactions</p>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">Enrolled Courses</span>
                <span className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-xl text-lg">
                  <FaBookOpen />
                </span>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900 dark:text-white">{courses.length}</span>
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium mt-0.5">Active Academic Classes</p>
              </div>
            </div>

          </div>

          {/* Academic Alerts & Early Warning Notification Banner */}
          {childWarnings.length > 0 ? (
            <div className="p-5 sm:p-6 rounded-3xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200 dark:border-amber-900/60 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center text-xl shrink-0 shadow-xs">
                    <FaExclamationTriangle />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-amber-950 dark:text-amber-200 flex items-center gap-2">
                      Academic Attention Alert: {child?.name}
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 font-medium">
                      Our system detected {childWarnings.length} academic indicator(s) requiring parental guidance.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPerformanceModal(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center active:scale-95"
                >
                  <FaEye /> View Full Performance Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {childWarnings.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-amber-200 dark:border-amber-900/40 space-y-1.5 text-xs shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 rounded-md font-black uppercase text-[10px]">
                        {w.category}
                      </span>
                      <span className="font-mono font-bold text-slate-500 text-[11px]">
                        {w.metric}
                      </span>
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {w.reason}
                    </p>
                    {w.action && (
                      <p className="text-purple-700 dark:text-purple-300 text-[11px] font-semibold pt-1 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1">
                        <span>💡 <strong>Advice for Parent:</strong> {w.action}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4 sm:p-5 rounded-3xl bg-emerald-50/80 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                  <FaCheckCircle />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                    Good Academic Standing — No Warning Alerts Active
                  </h4>
                  <p className="text-xs text-emerald-800/80 dark:text-emerald-400 font-medium">
                    {child?.name} is meeting institute attendance standards (≥75%), completing coursework, and maintaining progress.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPerformanceModal(true)}
                className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer shrink-0 self-start sm:self-center shadow-xs active:scale-95"
              >
                <FaEye /> Performance Report
              </button>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 gap-2 pb-2">
            <button
              onClick={() => setActiveTab('warnings')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'warnings'
                  ? 'bg-purple-900 text-white shadow-md'
                  : childWarnings.length > 0
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200 border border-amber-300 dark:border-amber-700'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaExclamationTriangle className={childWarnings.length > 0 ? "text-amber-500 animate-pulse" : "text-slate-400"} />
              Academic Alerts ({childWarnings.length})
            </button>
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'attendance'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaCalendarCheck /> Live Attendance Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'payments'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaReceipt /> Payments & Receipts ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'courses'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaBookOpen /> Enrolled Courses ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('reading')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'reading'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaBookOpen className="text-purple-400" /> Reading Progress ({(currentChildObj?.readingProgress || []).length})
            </button>
            <button
              onClick={() => setActiveTab('quizzes')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'quizzes'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaClipboardList className="text-amber-400" /> Quiz Marks & Assessments ({(currentChildObj?.quizSubmissions || []).length})
            </button>
            <button
              onClick={() => setActiveTab('assignments')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'assignments'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaClipboardCheck className="text-indigo-400" /> Homework & Assignments ({(currentChildObj?.assignmentSubmissions || []).length})
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'link'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-800'
              }`}
            >
              <FaPlus /> Link Another Child
            </button>
          </div>

          {/* TAB 0: ACADEMIC ALERTS & EARLY WARNING NOTICES */}
          {activeTab === 'warnings' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6 animate-fadeIn">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FaShieldAlt className="text-amber-500" /> Academic Early Warning & Performance Alerts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">
                    Proactive learning alerts monitoring attendance continuity, quiz mark trends, and homework submissions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPerformanceModal(true)}
                  className="px-4 py-2 bg-purple-900 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-center shrink-0"
                >
                  <FaEye /> Open Detailed Performance View
                </button>
              </div>

              {childWarnings.length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {childWarnings.map((w, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-2xl border space-y-2 ${
                          w.severity === 'high'
                            ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black uppercase tracking-wide ${
                            w.severity === 'high'
                              ? 'bg-red-200 dark:bg-red-900 text-red-900 dark:text-red-200'
                              : 'bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200'
                          }`}>
                            {w.category}
                          </span>
                          <span className="font-mono font-bold text-xs text-slate-600 dark:text-slate-300">
                            {w.metric}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                          {w.reason}
                        </p>
                        {w.action && (
                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-[11px] text-purple-700 dark:text-purple-300 font-medium flex items-start gap-1.5">
                            <span>💡 <strong>Recommendation:</strong> {w.action}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl mx-auto shadow-sm">
                    <FaCheckCircle />
                  </div>
                  <h4 className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                    Excellent Academic Standing!
                  </h4>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 max-w-md mx-auto">
                    {child?.name} has 0 warning alerts. Class attendance is above 75%, assessment results are consistent, and assignments are submitted on time.
                  </p>
                </div>
              )}

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance Rate</span>
                  <span className={`text-xl font-black ${metrics.attendanceRate < 75 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {metrics.attendanceRate}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">{metrics.present} of {metrics.total} attended</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Quiz Average</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white">
                    {currentChildObj?.quizMetrics?.averageQuizPercent || 0}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">{currentChildObj?.quizMetrics?.totalQuizzes || 0} Quizzes taken</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Assignments</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white">
                    {currentChildObj?.assignmentMetrics?.totalAssignments || 0}
                  </span>
                  <span className="text-[10px] text-slate-400 block">{currentChildObj?.assignmentMetrics?.gradedCount || 0} Graded</span>
                </div>
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Study PDFs</span>
                  <span className="text-xl font-black text-slate-800 dark:text-white">
                    {(currentChildObj?.readingProgress || []).length}
                  </span>
                  <span className="text-[10px] text-slate-400 block">Notes Tracked</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ATTENDANCE LOGS */}
          {activeTab === 'attendance' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center flex-wrap gap-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FaCalendarCheck className="text-purple-600 dark:text-purple-400" /> Class Session Attendance History
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Live check-in timestamps and arrival status recorded at institute entry</p>
                </div>

                <div className="flex gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-full">{metrics.present} Present</span>
                  <span className="px-2.5 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-full">{metrics.late} Late</span>
                  <span className="px-2.5 py-1 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-full">{metrics.absent} Absent</span>
                </div>
              </div>

              {logs.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No attendance scan logs recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-gray-300 uppercase text-[10px] font-extrabold tracking-wider border-y border-slate-200 dark:border-slate-700">
                        <th className="py-3 px-4">Date & Day</th>
                        <th className="py-3 px-4">Check-In Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Subject / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {logs.map((log) => {
                        const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
                        const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                        
                        const statusBadge = log.status === 'Present' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                          : log.status === 'Late' 
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' 
                          : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800';

                        return (
                          <tr key={log._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                            <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">{dateStr}</td>
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-gray-300">{timeStr}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${statusBadge}`}>
                                {log.status === 'Present' ? '✓ Present' : log.status === 'Late' ? '⏱️ Late' : '✕ Absent'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-600 dark:text-gray-300">
                              {log.remarks || 'Standard Class Attendance Scan'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PAYMENTS & RECEIPTS */}
          {activeTab === 'payments' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaReceipt className="text-blue-600 dark:text-blue-400" /> Settled Course Fees & Payment Receipts
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Official fee payment history and direct bank transfer receipt records</p>
              </div>

              {payments.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No payment transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-gray-300 uppercase text-[10px] font-extrabold tracking-wider border-y border-slate-200 dark:border-slate-700">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Course Title</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payments.map((p) => {
                        const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A';
                        const statusColor = p.status === 'COMPLETED' 
                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' 
                          : p.status === 'PENDING_APPROVAL' 
                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800' 
                          : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800';

                        return (
                          <tr key={p._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700 dark:text-gray-300">{dateStr}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{p.course?.title || 'General Fee'}</td>
                            <td className="py-3.5 px-4 font-extrabold text-purple-950 dark:text-purple-300">LKR {p.amount?.toLocaleString()}.00</td>
                            <td className="py-3.5 px-4 text-xs font-bold text-slate-600 dark:text-gray-300">
                              {p.paymentMethod === 'BANK_SLIP' ? '🏦 Direct Bank Slip' : '💳 Online IPG Card'}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${statusColor}`}>
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ENROLLED COURSES */}
          {activeTab === 'courses' && (
            <div className="space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaBookOpen className="text-amber-600 dark:text-amber-400" /> Active Enrolled Academic Classes
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Subject courses your child is currently attending</p>
              </div>

              {courses.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-sm text-slate-400">Child is not currently enrolled in any course.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((c) => (
                    <div key={c._id} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-xs font-bold rounded-full border border-purple-200 dark:border-purple-800">
                          LKR {c.price?.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                          Active Enrolled
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-extrabold text-slate-900 dark:text-white">{c.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-400 dark:text-gray-400 font-semibold flex items-center gap-1">
                          <FaChalkboardTeacher /> Instructor:
                        </span>
                        <span className="font-bold text-purple-950 dark:text-purple-300">{c.instructorName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PDF READING & STUDY PROGRESS */}
          {activeTab === 'reading' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaBookOpen className="text-purple-600 dark:text-purple-400" /> PDF Study Notes Reading Completion
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400">Track how many pages and what percentage of lecture PDF notes your child has read</p>
              </div>

              {(currentChildObj?.readingProgress || []).length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No PDF reading activity recorded for this student yet.</p>
              ) : (
                <div className="space-y-3">
                  {(currentChildObj?.readingProgress || []).map((item) => (
                    <div key={item._id} className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-md border border-purple-200 dark:border-purple-800">
                          {item.course?.title || 'Subject Course'}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{item.pdfTitle}</h4>
                        <p className="text-xs text-slate-500 dark:text-gray-400">
                          Highest Page Read: <strong className="text-slate-700 dark:text-gray-200">Page {item.maxPageRead}</strong> of {item.totalPages} pages {!item.isCompleted && item.maxPageRead > 0 && <span className="text-purple-700 dark:text-purple-300 font-bold ml-1">• Next: Page {Math.min(item.totalPages, item.maxPageRead + 1)}</span>}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className={`text-sm font-extrabold ${item.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-900 dark:text-purple-300'}`}>
                            {item.progressPercentage}% Completed
                          </span>
                          <span className="block text-[10px] text-slate-400 dark:text-gray-500">
                            Last read: {item.lastReadAt ? new Date(item.lastReadAt).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>

                        <div className="w-20 bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${item.isCompleted ? 'bg-emerald-500' : 'bg-purple-600'}`}
                            style={{ width: `${item.progressPercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: QUIZ MARKS & ASSESSMENTS */}
          {activeTab === 'quizzes' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FaClipboardList className="text-amber-500" /> Child's Academic Quiz Marks & Assessments
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Official quiz marks, completion timestamps, and grading criteria for weekly class assessments</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 px-3.5 py-1.5 rounded-xl border border-purple-200 dark:border-purple-800">
                    {(currentChildObj?.quizSubmissions || []).length} Completed Quizzes
                  </span>
                </div>
              </div>

              {/* Assessment Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400">Total Assessments</span>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                      {(currentChildObj?.quizSubmissions || []).length}
                    </h4>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center text-lg">
                    <FaClipboardList />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400">Average Score</span>
                    <h4 className="text-2xl font-black text-purple-900 dark:text-purple-300 mt-0.5">
                      {currentChildObj?.quizMetrics?.averageQuizPercent || 0}%
                    </h4>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center text-lg">
                    <FaTrophy />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400">Pass Compliance</span>
                    <h4 className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {currentChildObj?.quizMetrics?.passedQuizzesCount || 0} Passed <span className="text-xs text-slate-400 dark:text-gray-400 font-bold">({currentChildObj?.quizMetrics?.passRate || 0}%)</span>
                    </h4>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg">
                    <FaCheckCircle />
                  </div>
                </div>
              </div>

              {/* Submissions List Table */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                {(currentChildObj?.quizSubmissions || []).length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-gray-400 py-12 text-center">No quiz assessments completed by this student yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-gray-300 uppercase text-[10px] font-extrabold tracking-wider border-y border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-4">Quiz Title & Curriculum</th>
                          <th className="py-3 px-4">Subject Course</th>
                          <th className="py-3 px-4">Completed Date</th>
                          <th className="py-3 px-4">Score / Total</th>
                          <th className="py-3 px-4">Performance</th>
                          <th className="py-3 px-4">Result</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(currentChildObj?.quizSubmissions || []).map((sub) => {
                          const pct = sub.totalPoints > 0 ? Math.round((sub.score / sub.totalPoints) * 100) : 0;
                          const passMark = sub.quiz?.passingPercentage || 50;
                          const isPassed = pct >= passMark;
                          const dateStr = sub.completedAt ? new Date(sub.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                          const timeStr = sub.completedAt ? new Date(sub.completedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

                          return (
                            <tr key={sub._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-slate-900 dark:text-white">{sub.quiz?.title || 'Academic Quiz'}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-md border border-purple-100 dark:border-purple-800">
                                    Grade {sub.quiz?.grade || child?.grade}
                                  </span>
                                  {sub.quiz?.month && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md border border-amber-100 dark:border-amber-800">
                                      {sub.quiz.month} {sub.quiz.weekNumber > 0 && `(W${sub.quiz.weekNumber})`}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-bold text-slate-700 dark:text-gray-300">
                                {sub.quiz?.course?.title || 'Course Assessment'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-gray-300">
                                {dateStr} {timeStr && <span className="text-[10px] text-slate-400 dark:text-gray-400 block">{timeStr}</span>}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                                <span className="text-purple-700 dark:text-purple-400 text-base">{sub.score}</span> / {sub.totalPoints}
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="w-28 space-y-1">
                                  <div className="flex justify-between text-xs font-black">
                                    <span className={isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{pct}%</span>
                                    <span className="text-[10px] text-slate-400 dark:text-gray-400">Pass: {passMark}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}
                                      style={{ width: `${pct}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-3 py-1 text-xs font-extrabold rounded-full ${
                                  isPassed ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800' : 'bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-800'
                                }`}>
                                  {isPassed ? '✓ Passed' : '✕ Needs Work'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: HOMEWORK & ASSIGNMENTS */}
          {activeTab === 'assignments' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FaClipboardCheck className="text-indigo-600 dark:text-indigo-400" /> Child's Homework & Assignment Evaluations
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-gray-400">Official marks, submission timeliness, and instructor feedback remarks on homework assignments</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-300 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
                    {(currentChildObj?.assignmentSubmissions || []).length} Submitted Homeworks
                  </span>
                </div>
              </div>

              {/* Assessment Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400">Total Homeworks</span>
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                      {(currentChildObj?.assignmentSubmissions || []).length}
                    </h4>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-lg">
                    <FaClipboardCheck />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400">Average Marks</span>
                    <h4 className="text-2xl font-black text-purple-900 dark:text-purple-300 mt-0.5">
                      {currentChildObj?.assignmentMetrics?.averageAssignmentMarks || 0}%
                    </h4>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-300 flex items-center justify-center text-lg">
                    <FaAward />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-gray-400">Evaluated Tasks</span>
                    <h4 className="text-2xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {currentChildObj?.assignmentMetrics?.gradedCount || 0} Graded <span className="text-xs text-slate-400 dark:text-gray-400 font-bold">({currentChildObj?.assignmentMetrics?.passRate || 0}% pass)</span>
                    </h4>
                  </div>
                  <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-lg">
                    <FaCheckCircle />
                  </div>
                </div>
              </div>

              {/* Submissions List Table */}
              <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
                {(currentChildObj?.assignmentSubmissions || []).length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-gray-400 py-12 text-center">No homework assignments submitted by this student yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-gray-300 uppercase text-[10px] font-extrabold tracking-wider border-y border-slate-200 dark:border-slate-700">
                          <th className="py-3 px-4">Assignment Title & Curriculum</th>
                          <th className="py-3 px-4">Subject Course</th>
                          <th className="py-3 px-4">Submitted Date</th>
                          <th className="py-3 px-4">Marks / Total</th>
                          <th className="py-3 px-4">Performance</th>
                          <th className="py-3 px-4">Teacher Feedback</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {(currentChildObj?.assignmentSubmissions || []).map((sub) => {
                          const asgn = sub.assignment;
                          const maxMarks = asgn?.maxMarks || 100;
                          const isGraded = sub.status === 'graded' && sub.marks !== null;
                          const pct = isGraded ? Math.round((sub.marks / maxMarks) * 100) : 0;
                          const passMark = asgn?.passingMarks || 50;
                          const isPassed = isGraded && sub.marks >= passMark;
                          const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
                          const timeStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';

                          return (
                            <tr key={sub._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition">
                              <td className="py-3.5 px-4">
                                <div className="font-extrabold text-slate-900 dark:text-white">{asgn?.title || 'Homework Assignment'}</div>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 rounded-md border border-purple-100 dark:border-purple-800">
                                    Grade {asgn?.grade || child?.grade}
                                  </span>
                                  {asgn?.month && (
                                    <span className="text-[10px] font-extrabold px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 rounded-md border border-amber-100 dark:border-amber-800">
                                      {asgn.month} {asgn.weekNumber > 0 && `(W${asgn.weekNumber})`}
                                    </span>
                                  )}
                                  {sub.isLate && (
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 rounded border border-red-200 dark:border-red-800">
                                      Late
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 text-xs font-bold text-slate-700 dark:text-gray-300">
                                {asgn?.course?.title || 'Course Homework'}
                              </td>
                              <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-gray-300">
                                {dateStr} {timeStr && <span className="text-[10px] text-slate-400 dark:text-gray-400 block">{timeStr}</span>}
                              </td>
                              <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-white">
                                {isGraded ? (
                                  <>
                                    <span className="text-purple-700 dark:text-purple-400 text-base">{sub.marks}</span> / {maxMarks}
                                  </>
                                ) : (
                                  <span className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-md font-bold">
                                    Pending Grade
                                  </span>
                                )}
                              </td>
                              <td className="py-3.5 px-4">
                                {isGraded ? (
                                  <div className="w-28 space-y-1">
                                    <div className="flex justify-between text-xs font-black">
                                      <span className={isPassed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}>{pct}%</span>
                                      <span className="text-[10px] text-slate-400 dark:text-gray-400">Pass: {passMark}</span>
                                    </div>
                                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full rounded-full ${isPassed ? 'bg-emerald-500' : 'bg-red-500'}`}
                                        style={{ width: `${pct}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-400 dark:text-gray-400">Awaiting teacher review</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 max-w-xs">
                                {sub.feedback ? (
                                  <p className="text-xs text-slate-700 dark:text-gray-300 font-medium italic line-clamp-2">
                                    "{sub.feedback}"
                                  </p>
                                ) : (
                                  <span className="text-xs text-slate-400 dark:text-gray-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: LINK ANOTHER CHILD */}
          {activeTab === 'link' && (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs max-w-xl mx-auto space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FaPlus className="text-purple-600 dark:text-purple-400" /> Link Additional Child
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  Connect another child enrolled at LuminaLearn using their unique Student Registration Number.
                </p>
              </div>

              <form onSubmit={handleLinkChild} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-gray-300">
                    Child's Registration Number (e.g. OL-G06-2012-4829 or Physical Reg No):
                  </label>
                  <div className="relative">
                    <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. OL-G06-2012-4829"
                      value={linkRegNo}
                      onChange={(e) => setLinkRegNo(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white pl-11 pr-4 py-3 rounded-2xl text-sm font-mono font-bold outline-none border border-slate-200 dark:border-slate-700 focus:border-purple-500 uppercase"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={linking}
                  className="w-full py-3.5 bg-purple-900 hover:bg-purple-800 text-white font-bold text-sm rounded-2xl transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <FaPlus /> {linking ? 'Linking Child...' : 'Attach Child to Account'}
                </button>
              </form>
            </div>
          )}
        </>
      )}

      {/* STUDENT PERFORMANCE & EARLY WARNING MODAL */}
      <StudentPerformanceModal
        isOpen={showPerformanceModal}
        onClose={() => setShowPerformanceModal(false)}
        studentId={child?._id}
      />

    </div>
  );
};

export default ParentDashboard;
