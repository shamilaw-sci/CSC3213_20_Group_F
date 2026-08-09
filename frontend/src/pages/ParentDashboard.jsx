import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FaUserGraduate, FaCalendarCheck, FaReceipt, FaBookOpen, 
  FaUserFriends, FaPlus, FaCheckCircle, FaTimesCircle, FaClock, 
  FaSync, FaIdCard, FaBuilding, FaChalkboardTeacher
} from 'react-icons/fa';

const ParentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'payments' | 'courses' | 'link'
  const [linkRegNo, setLinkRegNo] = useState('');
  const [linking, setLinking] = useState(false);

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
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6">
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-sm font-semibold text-purple-900">Loading Parent Portal...</p>
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 p-4 sm:p-8 space-y-8 max-w-7xl mx-auto">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-purple-950 via-purple-900 to-indigo-950 text-white p-6 sm:p-8 rounded-[32px] shadow-xl border border-purple-800/40 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-purple-800/60 rounded-full text-xs font-bold border border-purple-400/30 text-purple-200">
            👨‍👩‍👧 Official Parent Monitoring Portal
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome, {data?.parentName || 'Parent'}!
          </h1>
          <p className="text-sm text-purple-200/80 max-w-xl">
            Real-time academic monitoring, classroom attendance tracking, and payment fee receipts for your enrolled children.
          </p>
        </div>

        {/* Multi-Child Selector */}
        <div className="z-10 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl w-full md:w-auto min-w-[280px]">
          <label className="block text-[10px] uppercase tracking-wider font-extrabold text-purple-200 mb-1.5 flex items-center gap-1.5">
            <FaUserFriends className="text-amber-400" /> Active Selected Child ({childrenData.length}):
          </label>

          {childrenData.length === 0 ? (
            <p className="text-xs text-amber-200 font-bold">No linked children found yet.</p>
          ) : (
            <select
              value={selectedChildIndex}
              onChange={(e) => setSelectedChildIndex(Number(e.target.value))}
              className="w-full bg-purple-950/90 text-white text-sm font-bold py-2.5 px-3 rounded-xl border border-purple-400/40 outline-none cursor-pointer"
            >
              {childrenData.map((cObj, idx) => (
                <option key={cObj.child._id} value={idx}>
                  👦 {cObj.child.name} ({cObj.child.grade} • {cObj.child.registrationNumber || 'Online'})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* No Children Banner */}
      {childrenData.length === 0 ? (
        <div className="bg-white p-8 rounded-3xl border border-amber-200 shadow-sm text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-2xl mx-auto">
            👨‍👩‍👧
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Child Linked to Your Parent Account</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Link your child by entering their unique Student Registration Number (e.g. <strong>OL-G06-2012-4829</strong> or physical Reg No).
          </p>
          
          <form onSubmit={handleLinkChild} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
            <input
              type="text"
              placeholder="Enter Child Reg No"
              value={linkRegNo}
              onChange={(e) => setLinkRegNo(e.target.value)}
              className="flex-1 px-4 py-3 bg-slate-100 rounded-xl text-sm font-mono font-bold outline-none border border-slate-200 focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={linking}
              className="px-6 py-3 bg-purple-900 text-white font-bold text-sm rounded-xl hover:bg-purple-800 transition cursor-pointer flex items-center justify-center gap-2"
            >
              <FaPlus /> {linking ? 'Linking...' : 'Link Child'}
            </button>
          </form>
        </div>
      ) : (
        <>
          {/* Child Quick Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Student Profile</span>
                <span className="p-2 bg-purple-100 text-purple-900 rounded-xl text-lg">
                  <FaUserGraduate />
                </span>
              </div>
              <div>
                <h4 className="text-lg font-extrabold text-slate-900 line-clamp-1">{child?.name}</h4>
                <p className="text-xs font-mono font-bold text-purple-700">{child?.registrationNumber || 'Online Student'}</p>
              </div>
              <div className="inline-block px-2.5 py-0.5 bg-purple-50 text-purple-900 text-[11px] font-bold rounded-md border border-purple-200">
                {child?.grade} ({child?.studentType === 'online' ? '💻 Online' : '🏫 Physical'})
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Attendance Rate</span>
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl text-lg">
                  <FaCalendarCheck />
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-slate-900">{metrics.attendanceRate}%</span>
                <span className="text-xs text-slate-500 font-semibold">Overall Presence</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${metrics.attendanceRate}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Fees Settled</span>
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl text-lg">
                  <FaReceipt />
                </span>
              </div>
              <div>
                <span className="text-2xl font-extrabold text-slate-900">LKR {currentChildObj?.totalPaidAmount?.toLocaleString() || 0}.00</span>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{payments.length} Fee Transactions</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Courses</span>
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl text-lg">
                  <FaBookOpen />
                </span>
              </div>
              <div>
                <span className="text-3xl font-extrabold text-slate-900">{courses.length}</span>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Active Academic Classes</p>
              </div>
            </div>

          </div>

          {/* Tab Navigation */}
          <div className="flex flex-wrap border-b border-slate-200 gap-2 pb-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'attendance'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FaCalendarCheck /> Live Attendance Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('payments')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'payments'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FaReceipt /> Payments & Receipts ({payments.length})
            </button>
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'courses'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FaBookOpen /> Enrolled Courses ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('reading')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'reading'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FaBookOpen className="text-purple-400" /> Reading Progress ({(currentChildObj?.readingProgress || []).length})
            </button>
            <button
              onClick={() => setActiveTab('link')}
              className={`px-5 py-2.5 text-sm font-bold rounded-2xl transition cursor-pointer flex items-center gap-2 ${
                activeTab === 'link'
                  ? 'bg-purple-900 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FaPlus /> Link Another Child
            </button>
          </div>

          {/* TAB 1: ATTENDANCE LOGS */}
          {activeTab === 'attendance' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 animate-fadeIn">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FaCalendarCheck className="text-purple-600" /> Class Session Attendance History
                  </h3>
                  <p className="text-xs text-slate-500">Live check-in timestamps and arrival status recorded at institute entry</p>
                </div>

                <div className="flex gap-2 text-xs font-bold">
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">{metrics.present} Present</span>
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full">{metrics.late} Late</span>
                  <span className="px-2.5 py-1 bg-red-100 text-red-800 rounded-full">{metrics.absent} Absent</span>
                </div>
              </div>

              {logs.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No attendance scan logs recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-y border-slate-200">
                        <th className="py-3 px-4">Date & Day</th>
                        <th className="py-3 px-4">Check-In Time</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Subject / Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {logs.map((log) => {
                        const dateStr = log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
                        const timeStr = log.createdAt ? new Date(log.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A';
                        
                        const statusBadge = log.status === 'Present' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                          : log.status === 'Late' 
                          ? 'bg-amber-100 text-amber-800 border-amber-300' 
                          : 'bg-red-100 text-red-800 border-red-300';

                        return (
                          <tr key={log._id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-extrabold text-slate-900">{dateStr}</td>
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">{timeStr}</td>
                            <td className="py-3.5 px-4">
                              <span className={`px-3 py-1 text-xs font-extrabold rounded-full border ${statusBadge}`}>
                                {log.status === 'Present' ? '✓ Present' : log.status === 'Late' ? '⏱️ Late' : '✕ Absent'}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-xs font-medium text-slate-600">
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
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaReceipt className="text-blue-600" /> Settled Course Fees & Payment Receipts
                </h3>
                <p className="text-xs text-slate-500">Official fee payment history and direct bank transfer receipt records</p>
              </div>

              {payments.length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No payment transactions recorded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold tracking-wider border-y border-slate-200">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4">Course Title</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Payment Method</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => {
                        const dateStr = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'N/A';
                        const statusColor = p.status === 'COMPLETED' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : p.status === 'PENDING_APPROVAL' 
                          ? 'bg-amber-100 text-amber-800' 
                          : 'bg-red-100 text-red-800';

                        return (
                          <tr key={p._id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">{dateStr}</td>
                            <td className="py-3.5 px-4 font-bold text-slate-900">{p.course?.title || 'General Fee'}</td>
                            <td className="py-3.5 px-4 font-extrabold text-purple-950">LKR {p.amount?.toLocaleString()}.00</td>
                            <td className="py-3.5 px-4 text-xs font-bold text-slate-600">
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
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaBookOpen className="text-amber-600" /> Active Enrolled Academic Classes
                </h3>
                <p className="text-xs text-slate-500">Subject courses your child is currently attending</p>
              </div>

              {courses.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
                  <p className="text-sm text-slate-400">Child is not currently enrolled in any course.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {courses.map((c) => (
                    <div key={c._id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-0.5 bg-purple-100 text-purple-900 text-xs font-bold rounded-full">
                          LKR {c.price?.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          Active Enrolled
                        </span>
                      </div>

                      <div>
                        <h4 className="text-lg font-extrabold text-slate-900">{c.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-1">
                          <FaChalkboardTeacher /> Instructor:
                        </span>
                        <span className="font-bold text-purple-950">{c.instructorName}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PDF READING & STUDY PROGRESS */}
          {activeTab === 'reading' && (
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4 animate-fadeIn">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FaBookOpen className="text-purple-600" /> PDF Study Notes Reading Completion
                </h3>
                <p className="text-xs text-slate-500">Track how many pages and what percentage of lecture PDF notes your child has read</p>
              </div>

              {(currentChildObj?.readingProgress || []).length === 0 ? (
                <p className="text-sm text-slate-400 py-12 text-center">No PDF reading activity recorded for this student yet.</p>
              ) : (
                <div className="space-y-3">
                  {(currentChildObj?.readingProgress || []).map((item) => (
                    <div key={item._id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-700 bg-purple-100 px-2.5 py-0.5 rounded-md">
                          {item.course?.title || 'Subject Course'}
                        </span>
                        <h4 className="text-sm font-extrabold text-slate-900">{item.pdfTitle}</h4>
                        <p className="text-xs text-slate-500">
                          Highest Page Read: <strong>Page {item.maxPageRead}</strong> of {item.totalPages} pages
                        </p>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                        <div className="text-right">
                          <span className={`text-sm font-extrabold ${item.isCompleted ? 'text-emerald-600' : 'text-purple-900'}`}>
                            {item.progressPercentage}% Completed
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Last read: {item.lastReadAt ? new Date(item.lastReadAt).toLocaleDateString() : 'Recently'}
                          </span>
                        </div>

                        <div className="w-20 bg-slate-200 h-3 rounded-full overflow-hidden border border-slate-300">
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

          {/* TAB 4: LINK ANOTHER CHILD */}
          {activeTab === 'link' && (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto space-y-6 animate-fadeIn">
              <div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <FaPlus className="text-purple-600" /> Link Additional Child
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Connect another child enrolled at LuminaLearn using their unique Student Registration Number.
                </p>
              </div>

              <form onSubmit={handleLinkChild} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold text-slate-700">
                    Child's Registration Number (e.g. OL-G06-2012-4829 or Physical Reg No):
                  </label>
                  <div className="relative">
                    <FaIdCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. OL-G06-2012-4829"
                      value={linkRegNo}
                      onChange={(e) => setLinkRegNo(e.target.value)}
                      className="w-full bg-slate-50 pl-11 pr-4 py-3 rounded-2xl text-sm font-mono font-bold outline-none border border-slate-200 focus:border-purple-500 uppercase"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={linking}
                  className="w-full py-3.5 bg-purple-900 text-white font-bold text-sm rounded-2xl hover:bg-purple-800 transition shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  <FaPlus /> {linking ? 'Linking Child...' : 'Attach Child to Account'}
                </button>
              </form>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default ParentDashboard;
