import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { 
  FaUsers, 
  FaChalkboardTeacher, 
  FaMoneyBillWave, 
  FaChartLine, 
  FaGraduationCap, 
  FaGlobe, 
  FaSchool, 
  FaCheckCircle, 
  FaTrophy, 
  FaFilter, 
  FaChartPie, 
  FaBookOpen, 
  FaArrowRight,
  FaSearch,
  FaArrowLeft,
  FaUserGraduate,
  FaEye,
  FaReceipt,
  FaClipboardList,
  FaClock,
  FaVideo,
  FaFilePdf,
  FaTasks,
  FaUserTie
} from 'react-icons/fa';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentTypeFilter, setStudentTypeFilter] = useState('all'); // Admin & Teacher filter
  const [chartStyle, setChartStyle] = useState('bars'); // 'bars' | 'area' | 'lines'
  const [modeSortBy, setModeSortBy] = useState('grade'); // 'grade' | 'count' | 'online'
  const [selectedTier, setSelectedTier] = useState('all'); // 'all' | 'junior' | 'ol' | 'al'
  const [selectedChildId, setSelectedChildId] = useState('');
  const [selectedTeacherStudentId, setSelectedTeacherStudentId] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [selectedAdminTeacherId, setSelectedAdminTeacherId] = useState('all');
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('all');

  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  const isStudent = user?.role?.toLowerCase() === 'student';
  const isParent = user?.role?.toLowerCase() === 'parent';
  const isTeacher = user?.role?.toLowerCase() === 'teacher';

  useEffect(() => {
    const targetStudentId = isParent ? selectedChildId : selectedTeacherStudentId;
    fetchAnalytics(studentTypeFilter, targetStudentId, selectedCourseId, selectedAdminTeacherId);
  }, [studentTypeFilter, selectedChildId, selectedTeacherStudentId, selectedCourseId, selectedAdminTeacherId]);

  const fetchAnalytics = async (typeFilter = 'all', childOrStudentId = '', courseId = 'all', adminTeacherId = 'all') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `http://localhost:5000/api/auth/analytics-summary?studentType=${typeFilter}`;
      if (childOrStudentId) {
        url += `&studentId=${childOrStudentId}`;
      }
      if (courseId && courseId !== 'all') {
        url += `&courseId=${courseId}`;
      }
      if (adminTeacherId && adminTeacherId !== 'all') {
        url += `&teacherId=${adminTeacherId}`;
      }
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
      if (res.data?.selectedStudentId && !selectedChildId && isParent) {
        setSelectedChildId(res.data.selectedStudentId);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast.error('Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleChildSelect = (childId) => {
    setSelectedChildId(childId);
  };

  const handleTeacherSelectStudent = (studentId) => {
    setSelectedTeacherStudentId(studentId);
  };

  const handleTeacherBackToOverview = () => {
    setSelectedTeacherStudentId('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d1b64]"></div>
      </div>
    );
  }

  // ==========================================
  // RENDER STUDENT / PARENT / TEACHER-STUDENT-DETAIL VIEW
  // ==========================================
  if (isStudent || isParent || (isTeacher && data?.isStudentDetail) || (data?.isStudentView && !data?.isTeacherView)) {
    const { 
      studentMetrics, 
      attendanceBreakdown, 
      enrolledCoursesList = [], 
      studentPayments = [], 
      quizSubmissions = [], 
      quizMetrics = {}, 
      assignmentSubmissions = [], 
      assignmentMetrics = {} 
    } = data || {};
    
    const presentCount = attendanceBreakdown?.present || 0;
    const absentCount = attendanceBreakdown?.absent || 0;
    const lateCount = attendanceBreakdown?.late || 0;
    const totalAtt = attendanceBreakdown?.total || (presentCount + absentCount + lateCount);

    const attPercentage = studentMetrics?.attendanceRate !== undefined 
      ? studentMetrics.attendanceRate 
      : (totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0);

    return (
      <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-gray-800 space-y-10">
        <div className="max-w-7xl mx-auto space-y-8">
          
          {/* TEACHER VIEW: Selected Student Header / Back button */}
          {isTeacher && data?.isStudentDetail && (
            <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleTeacherBackToOverview}
                  className="px-4 py-2.5 bg-[#2d1b64] hover:bg-purple-900 text-white font-extrabold text-xs rounded-2xl transition flex items-center gap-2 cursor-pointer shadow-md hover:scale-105"
                >
                  <FaArrowLeft /> Back to Class Roster
                </button>
                <div>
                  <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider block">Inspecting Class Student</span>
                  <h3 className="text-lg font-black text-gray-900">{data?.selectedStudent?.name}</h3>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-mono font-bold bg-purple-50 text-purple-900 px-3 py-1.5 rounded-xl border border-purple-200">
                  {data?.selectedStudent?.registrationNumber || data?.selectedStudent?.email || 'No Reg #'}
                </span>
                <span className="text-xs font-bold bg-amber-400 text-purple-950 px-3 py-1.5 rounded-xl shadow-xs">
                  {data?.selectedStudent?.grade || 'Grade'}
                </span>
                <span className="text-xs font-bold bg-indigo-900 text-white px-3 py-1.5 rounded-xl">
                  {data?.selectedStudent?.studentType === 'online' ? '💻 Online Student' : '🏫 Physical Student'}
                </span>
              </div>
            </div>
          )}

          {/* PARENT VIEW: Child Selection Navigation Bar */}
          {isParent && (
            <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
                  <span>🧒</span> Select Child to Monitor:
                </span>
                <span className="text-xs text-purple-700 font-bold bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                  {data?.parentChildren?.length || 0} Registered Children
                </span>
              </div>

              {data?.parentChildren?.length === 0 ? (
                <div className="p-5 bg-purple-50 rounded-2xl text-center text-xs text-purple-900 font-semibold">
                  No linked student profiles found for your parent account. Please verify with institute management.
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {data?.parentChildren?.map(child => {
                    const isSelected = (selectedChildId === child._id) || (!selectedChildId && data?.selectedStudentId === child._id);
                    return (
                      <button
                        key={child._id}
                        type="button"
                        onClick={() => handleChildSelect(child._id)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-3 cursor-pointer border ${
                          isSelected
                            ? 'bg-purple-900 text-white border-purple-950 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                            : 'bg-purple-50/60 hover:bg-purple-100 text-purple-950 border-purple-100'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold shrink-0 ${
                          isSelected ? 'bg-amber-400 text-purple-950' : 'bg-purple-200 text-purple-900'
                        }`}>
                          {child.name ? child.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="text-left">
                          <span className="block leading-tight text-sm">{child.name}</span>
                          <span className={`text-[10px] font-semibold block ${isSelected ? 'text-purple-200' : 'text-purple-600'}`}>
                            {child.grade || 'Grade'} • {child.studentType === 'online' ? 'Online' : 'Physical'}
                          </span>
                        </div>
                        {isSelected && (
                          <span className="bg-amber-400 text-purple-950 text-[10px] font-black px-2 py-0.5 rounded-full ml-1 shadow-2xs">
                            Active
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Header Section for Student, Parent & Teacher Drill-Down */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-8 rounded-[30px] text-white shadow-xl">
            <div>
              <div className="flex items-center gap-3">
                <span className="p-3 bg-white/10 rounded-2xl text-amber-400 text-2xl">
                  {isTeacher ? '🧑‍🎓' : isParent ? '👨‍👩‍👧‍👦' : '🎓'}
                </span>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    {isTeacher && data?.isStudentDetail
                      ? `${data?.selectedStudent?.name || studentMetrics?.studentName || 'Student'}'s Class Performance`
                      : isParent 
                      ? `${studentMetrics?.studentName ? `${studentMetrics.studentName}'s` : 'Child'} Learning Analytics` 
                      : 'My Personal Learning Analytics'}
                  </h2>
                  <p className="text-indigo-200 text-sm mt-1">
                    {isTeacher && data?.isStudentDetail
                      ? 'Detailed breakdown of course attendance compliance and fee settlements for your class.'
                      : isParent
                      ? 'Monitor your child\'s course progress, weekly attendance compliance, and settled payment receipts in real-time.'
                      : 'Track your course progress, attendance records, and settled payment history.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-4 py-2 bg-amber-400 text-purple-950 font-extrabold text-xs rounded-2xl shadow">
                {studentMetrics?.userGrade || 'Grade 6'}
              </span>
              <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white font-extrabold text-xs rounded-2xl">
                {studentMetrics?.userType === 'online' ? '💻 Online Student' : '🏫 Physical Student'}
              </span>
            </div>
          </div>

          {/* Student Executive Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Card 1: Enrolled Courses */}
            <div className="bg-purple-50/90 p-6 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">Enrolled Courses</p>
                  <h3 className="text-3xl font-extrabold text-purple-950 mt-1">{studentMetrics?.enrolledCoursesCount || enrolledCoursesList.length}</h3>
                </div>
                <div className="w-12 h-12 bg-purple-200/60 text-[#2d1b64] rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <FaBookOpen />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-900">
                <span>Active Learning Seats</span>
                <Link to="/courses" className="text-purple-700 underline font-extrabold flex items-center gap-1 hover:text-purple-950">
                  Browse Courses <FaArrowRight />
                </Link>
              </div>
            </div>

            {/* Card 2: Attendance Compliance */}
            <div className="bg-blue-50/90 p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">Weekly Attendance Rate</p>
                  <h3 className="text-3xl font-extrabold text-blue-900 mt-1">{studentMetrics?.attendanceRate ?? 0}%</h3>
                </div>
                <div className="w-12 h-12 bg-blue-200/60 text-blue-700 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <FaCheckCircle />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-blue-100 flex items-center justify-between text-xs font-bold text-blue-900">
                <span>{studentMetrics?.weeklyAttendedCount || 0} / {studentMetrics?.totalAvailableWeeks || 16} Weeks Attended</span>
                <span className="text-blue-700 font-bold">{studentMetrics?.attendanceRate ?? 0}% Compliance</span>
              </div>
            </div>

            {/* Card 3: Payments Settled */}
            <div className="bg-emerald-50/90 p-6 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Payments Settled</p>
                  <h3 className="text-3xl font-extrabold text-emerald-800 mt-1">
                    LKR {(studentMetrics?.totalPaidAmount || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="w-12 h-12 bg-emerald-200/60 text-emerald-700 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <FaMoneyBillWave />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-950">
                <span>{studentMetrics?.totalPaymentsCount || 0} Receipts</span>
                <Link to="/payments" className="text-emerald-700 underline font-extrabold flex items-center gap-1 hover:text-emerald-950">
                  View Receipts <FaArrowRight />
                </Link>
              </div>
            </div>

            {/* Card 4: Registered Grade */}
            <div className="bg-indigo-50/90 p-6 rounded-3xl border border-indigo-100 shadow-sm hover:shadow-md transition">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Registered Grade</p>
                  <h3 className="text-3xl font-extrabold text-indigo-950 mt-1">{studentMetrics?.userGrade || 'Grade 6'}</h3>
                </div>
                <div className="w-12 h-12 bg-indigo-200/60 text-indigo-700 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                  <FaGraduationCap />
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-950">
                <span>Mode: {studentMetrics?.userType || 'online'}</span>
                <span className="text-indigo-700 font-bold">Active Year 2026</span>
              </div>
            </div>

          </div>

          {/* Section 1: Enrolled Courses List & Attendance Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* My Courses Cards (2 Cols) */}
            <div className="lg:col-span-2 bg-[#fffdf7] p-8 rounded-[30px] border border-amber-200/80 shadow-sm space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold text-amber-950 flex items-center gap-2">
                    <FaBookOpen className="text-amber-500" /> My Enrolled Courses
                  </h3>
                  <p className="text-xs text-amber-600/70 mt-0.5">Courses you are currently registered and learning in</p>
                </div>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  {enrolledCoursesList.length} Enrolled
                </span>
              </div>

              {enrolledCoursesList.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <p className="text-sm text-gray-500">You are not enrolled in any courses yet.</p>
                  <Link 
                    to="/courses"
                    className="inline-block px-4 py-2 bg-purple-700 text-white font-bold text-xs rounded-xl shadow hover:bg-purple-800 transition"
                  >
                    Browse & Enroll in Courses
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  {enrolledCoursesList.map((course) => (
                    <div key={course._id} className="bg-white p-6 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-extrabold uppercase bg-purple-100 text-purple-900 px-2.5 py-0.5 rounded-full">
                            Active Learning
                          </span>
                          <span className="text-xs font-bold text-emerald-700">LKR {course.price.toLocaleString()}</span>
                        </div>
                        <h4 className="text-lg font-extrabold text-gray-900 line-clamp-1">{course.title}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500 font-semibold">Teacher: <strong className="text-gray-800">{course.instructorName}</strong></span>
                        <Link 
                          to={`/course/${course._id}`}
                          className="px-3 py-1.5 bg-[#2d1b64] text-white text-xs font-bold rounded-xl hover:bg-indigo-900 transition flex items-center gap-1"
                        >
                          Course <FaArrowRight />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Attendance Breakdown (1 Col) */}
            <div className="bg-[#f5f3ff] p-8 rounded-[30px] border border-indigo-100 shadow-sm flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                  <FaChartPie className="text-purple-600" /> Attendance Compliance
                </h3>
                <p className="text-xs text-purple-400 mt-0.5">Your attendance history across class sessions</p>
              </div>

              <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="#fef2f2" strokeWidth="16" fill="transparent" />
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    stroke="#22c55e" 
                    strokeWidth="16" 
                    fill="transparent"
                    strokeDasharray={`${(attPercentage / 100) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`}
                    className="transition-all duration-700"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-purple-950">{attPercentage}%</span>
                  <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Attendance</span>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-purple-100">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full inline-block"></span> Present
                  </span>
                  <span className="text-emerald-900 font-extrabold">{presentCount} Sessions</span>
                </div>

                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-rose-700 flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-rose-500 rounded-full inline-block"></span> Absent
                  </span>
                  <span className="text-rose-900 font-extrabold">{absentCount} Sessions</span>
                </div>

                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-amber-500 rounded-full inline-block"></span> Late
                  </span>
                  <span className="text-amber-900 font-extrabold">{lateCount} Sessions</span>
                </div>
              </div>
            </div>

          </div>

          {/* Section 1.5: 4-Week Attendance Progress Tracker */}
          <div className="bg-[#f0f9ff] p-8 rounded-[30px] border border-sky-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-xl font-bold text-sky-950 flex items-center gap-2">
                  📅 4-Week Attendance Progress Tracker
                </h3>
                <p className="text-xs text-sky-700/80 mt-0.5">
                  Cumulative weekly attendance formula: ({studentMetrics?.weeklyAttendedCount || 0} / {studentMetrics?.totalAvailableWeeks || 16} total available weeks across active courses = {studentMetrics?.attendanceRate ?? 0}%)
                </p>
              </div>
              <span className="text-xs font-extrabold bg-sky-200 text-sky-900 px-3.5 py-1 rounded-full border border-sky-300">
                Cumulative Rate: {studentMetrics?.attendanceRate ?? 0}%
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
              {[1, 2, 3, 4].map((wNum) => {
                const isWeekAttended = (studentMetrics?.weeklyAttendedCount || 0) >= wNum;
                return (
                  <div key={wNum} className={`p-4 rounded-2xl border ${isWeekAttended ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-white border-sky-100 text-gray-400'}`}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-black uppercase">Week {wNum}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${isWeekAttended ? 'bg-emerald-200 text-emerald-900' : 'bg-gray-100 text-gray-500'}`}>
                        {isWeekAttended ? 'Logged ✓' : 'Pending'}
                      </span>
                    </div>
                    <p className="text-xs font-semibold mt-1">
                      {isWeekAttended ? 'Weekly Class Attended ✓' : 'Study Material Pending'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Recent Payment History Table */}
          <div className="bg-[#f0fdf4] p-8 rounded-[30px] border border-emerald-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
                  <FaMoneyBillWave className="text-emerald-600" /> Settled Course Payments
                </h3>
                <p className="text-xs text-emerald-600/70 mt-0.5">Your official payment receipts for enrolled courses</p>
              </div>
              <Link to="/payments" className="text-xs bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl hover:bg-emerald-800 transition">
                View Full Payments History
              </Link>
            </div>

            {studentPayments.length === 0 ? (
              <p className="text-sm text-gray-500 py-6 text-center">No payment receipts logged yet.</p>
            ) : (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs font-semibold text-gray-700">
                  <thead className="bg-emerald-100/60 text-emerald-950 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Course Name</th>
                      <th className="p-3.5">Transaction ID</th>
                      <th className="p-3.5">Payment Date</th>
                      <th className="p-3.5">Amount</th>
                      <th className="p-3.5 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100/80">
                    {studentPayments.map(p => (
                      <tr key={p._id} className="hover:bg-white/80 transition">
                        <td className="p-3.5 font-bold text-gray-900">{p.course?.title || 'Course Fee'}</td>
                        <td className="p-3.5 font-mono text-purple-900 text-[11px]">{p.transactionId}</td>
                        <td className="p-3.5 text-gray-600">{new Date(p.paymentDate || p.createdAt).toLocaleDateString()}</td>
                        <td className="p-3.5 font-extrabold text-emerald-800">LKR {(p.amount || 0).toLocaleString()}.00</td>
                        <td className="p-3.5">
                          <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-extrabold text-[10px]">
                            COMPLETED ✓
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Academic Quiz & Assessment Performance */}
          <div className="bg-[#fffdf7] p-8 rounded-[30px] border border-amber-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-amber-950 flex items-center gap-2">
                  <FaClipboardList className="text-amber-500" /> Academic Quiz & Assessment Performance
                </h3>
                <p className="text-xs text-amber-700/80 mt-0.5">Summary of marks and grades achieved across course assessments</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black bg-amber-200 text-amber-950 px-3.5 py-1 rounded-full border border-amber-300">
                  Avg Score: {studentMetrics?.avgQuizScorePercent || 0}%
                </span>
                <span className="text-xs font-black bg-purple-100 text-purple-900 px-3.5 py-1 rounded-full border border-purple-200">
                  {studentMetrics?.totalQuizzesAttempted || quizSubmissions.length} Attempted
                </span>
              </div>
            </div>

            {quizSubmissions.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm text-gray-500 font-semibold">No quiz assessments completed yet.</p>
                <Link to="/courses" className="text-xs font-extrabold text-purple-700 underline hover:text-purple-900">
                  Go to Courses to attempt weekly quizzes →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-left text-xs font-semibold text-gray-700">
                  <thead className="bg-amber-100/70 text-amber-950 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Quiz Assessment</th>
                      <th className="p-3.5">Course</th>
                      <th className="p-3.5">Completion Date</th>
                      <th className="p-3.5">Score / Total</th>
                      <th className="p-3.5">Score %</th>
                      <th className="p-3.5 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-amber-100/80">
                    {quizSubmissions.map(sub => {
                      const pct = sub.totalPoints > 0 ? Math.round((sub.score / sub.totalPoints) * 100) : 0;
                      const passThreshold = sub.quiz?.passingPercentage || 50;
                      const isPassed = pct >= passThreshold;
                      const dateStr = sub.completedAt ? new Date(sub.completedAt).toLocaleDateString() : 'N/A';

                      return (
                        <tr key={sub._id} className="hover:bg-white/80 transition">
                          <td className="p-3.5 font-bold text-gray-900">
                            <div>{sub.quiz?.title || 'Course Quiz'}</div>
                            {sub.quiz?.month && (
                              <span className="text-[10px] text-amber-700 font-bold">
                                {sub.quiz.month} {sub.quiz.weekNumber > 0 && `(Week ${sub.quiz.weekNumber})`}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-purple-900">
                            {sub.quiz?.course?.title || 'Enrolled Course'}
                          </td>
                          <td className="p-3.5 text-gray-600 font-mono text-[11px]">{dateStr}</td>
                          <td className="p-3.5 font-extrabold text-gray-900">
                            <span className="text-purple-700">{sub.score}</span> / {sub.totalPoints}
                          </td>
                          <td className="p-3.5 font-black text-gray-800">
                            <span className={isPassed ? 'text-emerald-700' : 'text-red-600'}>{pct}%</span>
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                              isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {isPassed ? 'PASSED ✓' : 'NEEDS WORK'}
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

          {/* Section 4: Academic Homework & Assignment Performance */}
          <div className="bg-[#f8faff] p-8 rounded-[30px] border border-indigo-200/80 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-indigo-950 flex items-center gap-2">
                  <FaClipboardList className="text-indigo-600" /> Academic Homework & Assignment Performance
                </h3>
                <p className="text-xs text-indigo-700/80 mt-0.5">Summary of evaluated homework assignments and instructor remarks</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black bg-indigo-200 text-indigo-950 px-3.5 py-1 rounded-full border border-indigo-300">
                  Avg Marks: {studentMetrics?.avgAssignmentMarksPercent || 0}%
                </span>
                <span className="text-xs font-black bg-purple-100 text-purple-900 px-3.5 py-1 rounded-full border border-purple-200">
                  {studentMetrics?.totalAssignmentsSubmitted || assignmentSubmissions.length} Submitted
                </span>
              </div>
            </div>

            {assignmentSubmissions.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <p className="text-sm text-gray-500 font-semibold">No homework assignments submitted yet.</p>
                <Link to="/courses" className="text-xs font-extrabold text-purple-700 underline hover:text-purple-900">
                  Go to Courses to view weekly homework tasks →
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto pt-1">
                <table className="w-full text-left text-xs font-semibold text-gray-700">
                  <thead className="bg-indigo-100/70 text-indigo-950 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5 rounded-l-xl">Homework Task</th>
                      <th className="p-3.5">Course</th>
                      <th className="p-3.5">Submission Date</th>
                      <th className="p-3.5">Marks / Total</th>
                      <th className="p-3.5">Score %</th>
                      <th className="p-3.5 rounded-r-xl">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-indigo-100/80">
                    {assignmentSubmissions.map(sub => {
                      const asgn = sub.assignment;
                      const maxMarks = asgn?.maxMarks || 100;
                      const isGraded = sub.status === 'graded' && sub.marks !== null;
                      const pct = isGraded ? Math.round((sub.marks / maxMarks) * 100) : 0;
                      const passThreshold = asgn?.passingMarks || 50;
                      const isPassed = isGraded && sub.marks >= passThreshold;
                      const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString() : 'N/A';

                      return (
                        <tr key={sub._id} className="hover:bg-white/80 transition">
                          <td className="p-3.5 font-bold text-gray-900">
                            <div>{asgn?.title || 'Homework Assignment'}</div>
                            {asgn?.month && (
                              <span className="text-[10px] text-indigo-700 font-bold">
                                {asgn.month} {asgn.weekNumber > 0 && `(Week ${asgn.weekNumber})`}
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-semibold text-purple-900">
                            {asgn?.course?.title || 'Enrolled Course'}
                          </td>
                          <td className="p-3.5 text-gray-600 font-mono text-[11px]">{dateStr}</td>
                          <td className="p-3.5 font-extrabold text-gray-900">
                            {isGraded ? (
                              <>
                                <span className="text-purple-700">{sub.marks}</span> / {maxMarks}
                              </>
                            ) : (
                              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-bold">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 font-black text-gray-800">
                            {isGraded ? (
                              <span className={isPassed ? 'text-emerald-700' : 'text-red-600'}>{pct}%</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                              isGraded
                                ? isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {isGraded ? (isPassed ? 'PASSED ✓' : 'NEEDS WORK') : 'SUBMITTED'}
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
      </div>
    );
  }

  // ==========================================
  // RENDER TEACHER CLASS OVERVIEW
  // ==========================================
  if (isTeacher || data?.isTeacherView) {
    const { metrics, studentsList = [], gradeDistribution = [], topCourses = [], teacherCourses = [] } = data || {};

    const onlineCount = metrics?.onlineStudents || 0;
    const physicalCount = metrics?.physicalStudents || 0;
    const totalCount = metrics?.totalStudents || (onlineCount + physicalCount);

    const onlinePercent = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;
    const physicalPercent = 100 - onlinePercent;

    // Filter students list based on search and grade
    const filteredClassStudents = studentsList.filter(s => {
      const matchSearch = !studentSearchTerm || 
        s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
        (s.registrationNumber && s.registrationNumber.toLowerCase().includes(studentSearchTerm.toLowerCase())) ||
        (s.email && s.email.toLowerCase().includes(studentSearchTerm.toLowerCase()));

      const matchGrade = studentGradeFilter === 'all' || s.grade === studentGradeFilter;

      return matchSearch && matchGrade;
    });

    const uniqueGrades = Array.from(new Set(studentsList.map(s => s.grade).filter(Boolean)));

    return (
      <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-gray-800 space-y-10">
        <div className="max-w-7xl mx-auto space-y-8">

          {/* Teacher Header Banner */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-8 rounded-[30px] text-white shadow-xl">
            <div>
              <div className="flex items-center gap-3">
                <span className="p-3 bg-white/10 rounded-2xl text-amber-400 text-2xl">👨‍🏫</span>
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">Teacher Analytics & Class Insights</h2>
                  <p className="text-indigo-200 text-sm mt-1">
                    Monitor enrolled students, class attendance compliance, and fee settlements for your assigned courses.
                  </p>
                </div>
              </div>
            </div>

            {/* Student Mode Filter Control */}
            <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 flex items-center gap-1">
              <span className="text-xs text-indigo-200 px-3 font-semibold flex items-center gap-1">
                <FaFilter className="text-amber-400" /> Mode:
              </span>
              <button
                type="button"
                onClick={() => setStudentTypeFilter('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  studentTypeFilter === 'all' 
                    ? 'bg-amber-400 text-purple-950 shadow-md scale-105' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                🌐 All
              </button>
              <button
                type="button"
                onClick={() => setStudentTypeFilter('online')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  studentTypeFilter === 'online' 
                    ? 'bg-red-500 text-white shadow-md scale-105' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                💻 Online
              </button>
              <button
                type="button"
                onClick={() => setStudentTypeFilter('physical')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                  studentTypeFilter === 'physical' 
                    ? 'bg-blue-600 text-white shadow-md scale-105' 
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                🏫 Physical
              </button>
            </div>
          </div>

          {/* Teacher Class / Course Selector Bar */}
          <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
                <span>📚</span> Filter by Assigned Class / Course:
              </span>
              <span className="text-xs text-purple-700 font-bold bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
                {teacherCourses.length} Assigned Course{teacherCourses.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setSelectedCourseId('all')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                  selectedCourseId === 'all'
                    ? 'bg-purple-900 text-white border-purple-950 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                    : 'bg-purple-50/60 hover:bg-purple-100 text-purple-950 border-purple-100'
                }`}
              >
                <span>🌐 All My Classes</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  selectedCourseId === 'all' ? 'bg-amber-400 text-purple-950' : 'bg-purple-200 text-purple-900'
                }`}>
                  {studentsList.length} Students
                </span>
              </button>

              {teacherCourses.map(course => {
                const isSelected = selectedCourseId === course._id;
                return (
                  <button
                    key={course._id}
                    type="button"
                    onClick={() => setSelectedCourseId(course._id)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                      isSelected
                        ? 'bg-purple-900 text-white border-purple-950 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                        : 'bg-purple-50/60 hover:bg-purple-100 text-purple-950 border-purple-100'
                    }`}
                  >
                    <span>📖 {course.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isSelected ? 'bg-amber-400 text-purple-950' : 'bg-purple-200 text-purple-900'
                    }`}>
                      {course.enrolledCount} Enrolled
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5 Executive Summary Cards for Faculty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {/* Card 1: Total Lessons Published */}
            <div className="bg-purple-50/90 p-5 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-purple-600 font-bold uppercase tracking-wider">Lessons Published</p>
                  <h3 className="text-2xl font-extrabold text-purple-950 mt-1">{metrics?.totalLessonsPublished || 0}</h3>
                </div>
                <div className="w-10 h-10 bg-purple-200/60 text-[#2d1b64] rounded-2xl flex items-center justify-center text-lg shadow-inner">
                  <FaBookOpen />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-100 text-[10px] font-bold text-purple-900 flex items-center justify-between">
                <span>{metrics?.totalVideosCount || 0} Videos • {metrics?.totalPdfsCount || 0} PDFs</span>
                <span>{metrics?.totalAssignmentsCount || 0} Tasks</span>
              </div>
            </div>

            {/* Card 2: Attendance Rate */}
            <div className="bg-blue-50/90 p-5 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">Attendance Rate</p>
                  <h3 className="text-2xl font-extrabold text-blue-900 mt-1">{metrics?.attendanceRate || 100}%</h3>
                </div>
                <div className="w-10 h-10 bg-blue-200/60 text-blue-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                  <FaCheckCircle />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-100 text-[10px] font-bold text-blue-900 flex items-center justify-between">
                <span>{metrics?.attendanceBreakdown?.present || 0} Present</span>
                <span>{metrics?.attendanceBreakdown?.total || 0} Total Logged</span>
              </div>
            </div>

            {/* Card 3: Active Timetable Hours */}
            <div className="bg-amber-50/90 p-5 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">Timetable Hours</p>
                  <h3 className="text-2xl font-extrabold text-amber-900 mt-1">{metrics?.activeTimetableHours || 0} <span className="text-xs font-semibold">Hrs/Wk</span></h3>
                </div>
                <div className="w-10 h-10 bg-amber-200/60 text-amber-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                  <FaClock />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-amber-100 text-[10px] font-bold text-amber-900 flex items-center justify-between">
                <span>Weekly Lecture Load</span>
                <span>Active</span>
              </div>
            </div>

            {/* Card 4: My Enrolled Students */}
            <div className="bg-indigo-50/90 p-5 rounded-3xl border border-indigo-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">Enrolled Students</p>
                  <h3 className="text-2xl font-extrabold text-indigo-950 mt-1">{totalCount}</h3>
                </div>
                <div className="w-10 h-10 bg-indigo-200/60 text-indigo-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                  <FaUsers />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-indigo-100 text-[10px] font-bold text-indigo-900 flex items-center justify-between">
                <span>{onlineCount} Online</span>
                <span>{physicalCount} Physical</span>
              </div>
            </div>

            {/* Card 5: Revenue Generated */}
            <div className="bg-emerald-50/90 p-5 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Revenue Generated</p>
                  <h3 className="text-2xl font-extrabold text-emerald-800 mt-1">
                    LKR {(metrics?.totalRevenue || 0).toLocaleString()}
                  </h3>
                </div>
                <div className="w-10 h-10 bg-emerald-200/60 text-emerald-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                  <FaMoneyBillWave />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-emerald-100 text-[10px] font-bold text-emerald-950 flex items-center justify-between">
                <span>{metrics?.totalCourses || teacherCourses.length} Courses</span>
                <span className="text-emerald-700 font-extrabold">Verified ✓</span>
              </div>
            </div>
          </div>

          {/* CLASS STUDENT ROSTER & INDIVIDUAL ANALYTICS SELECTOR */}
          <div className="bg-white p-6 sm:p-8 rounded-[30px] border border-purple-200/80 shadow-md space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-purple-100 pb-5">
              <div>
                <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                  <FaUsers className="text-purple-600" /> Class Student Roster & Individual Analytics
                </h3>
                <p className="text-xs text-purple-600/80 mt-0.5">
                  All students registered in your class sessions. Select any student to inspect their detailed attendance, enrollment & fee settlement analytics.
                </p>
              </div>
              <span className="px-4 py-1.5 bg-amber-400 text-purple-950 font-black text-xs rounded-full shadow-xs">
                {filteredClassStudents.length} of {studentsList.length} Students
              </span>
            </div>

            {/* Search and Filters Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-purple-50/50 p-4 rounded-2xl border border-purple-100">
              <div className="relative w-full sm:w-80">
                <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-purple-400 text-xs" />
                <input
                  type="text"
                  placeholder="Search by student name, reg # or email..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-purple-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-xs font-bold text-purple-900 whitespace-nowrap">Grade Filter:</span>
                <select
                  value={studentGradeFilter}
                  onChange={(e) => setStudentGradeFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-950 focus:outline-none focus:ring-2 focus:ring-purple-600 cursor-pointer"
                >
                  <option value="all">All Grades</option>
                  {uniqueGrades.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Students Table */}
            {filteredClassStudents.length === 0 ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <p className="text-sm font-semibold">No students found matching your search criteria.</p>
                <button
                  type="button"
                  onClick={() => { setStudentSearchTerm(''); setStudentGradeFilter('all'); }}
                  className="text-xs text-purple-700 underline font-bold cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-semibold">
                  <thead className="bg-purple-900 text-white uppercase text-[10px] tracking-wider rounded-xl">
                    <tr>
                      <th className="p-4 rounded-l-2xl">Student Profile</th>
                      <th className="p-4">Grade & Mode</th>
                      <th className="p-4">Enrolled Classes</th>
                      <th className="p-4 text-center">Class Attendance</th>
                      <th className="p-4 text-right">Total Paid</th>
                      <th className="p-4 text-center rounded-r-2xl">Individual Analytics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-purple-100">
                    {filteredClassStudents.map(student => (
                      <tr key={student._id} className="hover:bg-purple-50/50 transition">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-purple-200 text-purple-900 font-black flex items-center justify-center text-xs shrink-0 shadow-inner">
                              {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                            </div>
                            <div>
                              <span className="font-extrabold text-gray-900 block text-sm">{student.name}</span>
                              <span className="text-[10px] text-purple-700 font-mono block">{student.registrationNumber || student.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="font-bold text-gray-800 block">{student.grade}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-block ${
                              student.studentType === 'online' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {student.studentType === 'online' ? '💻 Online' : '🏫 Physical'}
                            </span>
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {student.enrolledCourses.map((cTitle, i) => (
                              <span key={i} className="text-[10px] font-bold bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md">
                                {cTitle}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="p-4 text-center">
                          <div className="inline-block space-y-1">
                            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                              student.attendanceRate >= 75 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {student.attendanceRate}% Compliance
                            </span>
                            <span className="text-[10px] text-gray-500 block font-semibold">
                              {student.attendanceCount} Session{student.attendanceCount !== 1 ? 's' : ''} Logged
                            </span>
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <span className="font-extrabold text-emerald-800 text-sm">
                            LKR {(student.totalPaid || 0).toLocaleString()}
                          </span>
                        </td>

                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleTeacherSelectStudent(student._id)}
                            className="px-3.5 py-2 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-800 text-white font-extrabold text-xs rounded-xl shadow-xs hover:shadow-md transition cursor-pointer hover:scale-105 flex items-center gap-1.5 mx-auto"
                          >
                            <FaEye className="text-amber-400" /> View Student Analytics
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Academic Stage Donut & Comparative Mode Split for Teacher Classes */}
          {(() => {
            const categorizeGrade = (gradeStr = '') => {
              const g = String(gradeStr).toLowerCase();
              if (g.includes('grade 6') || g.includes('grade 7') || g.includes('grade 8') || g.includes('grade 9')) return 'junior';
              if (g.includes('grade 10') || g.includes('grade 11')) return 'ol';
              if (g.includes('grade 12') || g.includes('grade 13') || g.includes('a/l') || g.includes('al')) return 'al';
              return 'other';
            };

            const tierMeta = {
              junior: { label: 'Junior Secondary', subtitle: 'Grades 6 – 9', color: '#6366f1', lightBg: 'bg-indigo-50/80', text: 'text-indigo-900', border: 'border-indigo-200' },
              ol: { label: 'O/L Candidates', subtitle: 'Grades 10 – 11', color: '#f59e0b', lightBg: 'bg-amber-50/80', text: 'text-amber-900', border: 'border-amber-200' },
              al: { label: 'A/L Academic Streams', subtitle: 'Grades 12 – 13', color: '#0d9488', lightBg: 'bg-teal-50/80', text: 'text-teal-900', border: 'border-teal-200' },
              other: { label: 'Other Active Tracks', subtitle: 'Specialized', color: '#8b5cf6', lightBg: 'bg-purple-50/80', text: 'text-purple-900', border: 'border-purple-200' }
            };

            const tierTotals = {
              junior: { count: 0, online: 0, physical: 0, grades: [] },
              ol: { count: 0, online: 0, physical: 0, grades: [] },
              al: { count: 0, online: 0, physical: 0, grades: [] },
              other: { count: 0, online: 0, physical: 0, grades: [] }
            };

            gradeDistribution.forEach(g => {
              const tier = categorizeGrade(g.grade);
              if (tierTotals[tier]) {
                tierTotals[tier].count += (g.count || 0);
                tierTotals[tier].online += (g.online || 0);
                tierTotals[tier].physical += (g.physical || 0);
                tierTotals[tier].grades.push(g.grade);
              }
            });

            const totalTierStudents = (tierTotals.junior.count + tierTotals.ol.count + tierTotals.al.count + tierTotals.other.count) || 1;

            const C = 2 * Math.PI * 65;
            let accumulatedOffset = 0;
            const donutSegments = [
              { key: 'junior', name: 'Junior (Grades 6–9)', count: tierTotals.junior.count, color: '#6366f1' },
              { key: 'ol', name: 'O/L (Grades 10–11)', count: tierTotals.ol.count, color: '#f59e0b' },
              { key: 'al', name: 'A/L Streams (12–13)', count: tierTotals.al.count, color: '#0d9488' },
              ...(tierTotals.other.count > 0 ? [{ key: 'other', name: 'Other Levels', count: tierTotals.other.count, color: '#8b5cf6' }] : [])
            ].map(seg => {
              const ratio = seg.count / totalTierStudents;
              const strokeDasharray = `${ratio * C} ${C}`;
              const strokeDashoffset = -accumulatedOffset * C;
              accumulatedOffset += ratio;
              return {
                ...seg,
                percent: Math.round(ratio * 100),
                strokeDasharray,
                strokeDashoffset
              };
            });

            const filteredGrades = gradeDistribution.filter(g => {
              if (selectedTier === 'all') return true;
              return categorizeGrade(g.grade) === selectedTier;
            });

            const sortedGrades = [...filteredGrades].sort((a, b) => {
              if (modeSortBy === 'count') return (b.count || 0) - (a.count || 0);
              if (modeSortBy === 'online') {
                const rA = a.count ? (a.online / a.count) : 0;
                const rB = b.count ? (b.online / b.count) : 0;
                return rB - rA;
              }
              const getNum = (s = '') => {
                const m = s.match(/\d+/);
                return m ? parseInt(m[0], 10) : 99;
              };
              const diff = getNum(a.grade) - getNum(b.grade);
              if (diff !== 0) return diff;
              return (a.grade || '').localeCompare(b.grade || '');
            });

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Donut */}
                <div className="bg-[#fcfaff] p-6 sm:p-8 rounded-[30px] border border-purple-100/90 shadow-sm space-y-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center border-b border-purple-100 pb-3">
                      <div>
                        <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                          <FaGraduationCap className="text-purple-600" /> Class Academic Tiers
                        </h3>
                        <p className="text-xs text-purple-600/80 mt-0.5">Enrolled student distribution across academic levels</p>
                      </div>
                      <span className="text-xs bg-purple-100 text-purple-900 font-extrabold px-3 py-1 rounded-full border border-purple-200">
                        {gradeDistribution.length} Active Grades
                      </span>
                    </div>

                    {gradeDistribution.length === 0 ? (
                      <p className="text-sm text-gray-400 py-12 text-center">No student grade data recorded yet.</p>
                    ) : (
                      <div className="pt-4 space-y-6">
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-white p-5 rounded-2xl border border-purple-100/80 shadow-2xs">
                          <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                              <circle cx="80" cy="80" r="65" fill="transparent" stroke="#f1f5f9" strokeWidth="20" />
                              {donutSegments.map(seg => (
                                <circle
                                  key={seg.key}
                                  cx="80"
                                  cy="80"
                                  r="65"
                                  fill="transparent"
                                  stroke={seg.color}
                                  strokeWidth={selectedTier === seg.key ? "24" : "20"}
                                  strokeDasharray={seg.strokeDasharray}
                                  strokeDashoffset={seg.strokeDashoffset}
                                  strokeLinecap="butt"
                                  className="transition-all duration-500 cursor-pointer hover:opacity-90"
                                  onClick={() => setSelectedTier(prev => prev === seg.key ? 'all' : seg.key)}
                                />
                              ))}
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                              <span className="text-3xl font-black text-purple-950 tracking-tight leading-none">{totalCount}</span>
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 mt-1">Students</span>
                            </div>
                          </div>

                          <div className="space-y-2 flex-1 w-full text-xs">
                            {donutSegments.map(seg => {
                              const isSelected = selectedTier === seg.key;
                              return (
                                <div
                                  key={seg.key}
                                  onClick={() => setSelectedTier(prev => prev === seg.key ? 'all' : seg.key)}
                                  className={`p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                                    isSelected 
                                      ? 'bg-purple-900 text-white border-purple-900 shadow-sm' 
                                      : 'bg-purple-50/50 hover:bg-purple-100/70 border-purple-100 text-purple-950'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                                    <span className="font-extrabold">{seg.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 font-black">
                                    <span>{seg.count} Students</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                      isSelected ? 'bg-white/20 text-white' : 'bg-white text-purple-900 border border-purple-200'
                                    }`}>
                                      {seg.percent}%
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Mode Split */}
                <div className="bg-[#f7f9ff] p-6 sm:p-8 rounded-[30px] border border-blue-100/90 shadow-sm space-y-6 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
                      <div>
                        <h3 className="text-xl font-bold text-indigo-950 flex items-center gap-2">
                          <FaGlobe className="text-indigo-600" /> Mode Split in Your Classes
                        </h3>
                        <p className="text-xs text-indigo-500 mt-0.5">Online vs physical student ratio per grade level</p>
                      </div>

                      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-100 self-start sm:self-auto text-xs font-bold shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setModeSortBy('grade')}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                            modeSortBy === 'grade' ? 'bg-indigo-900 text-white' : 'text-indigo-900 hover:bg-blue-50'
                          }`}
                        >
                          Grade
                        </button>
                        <button
                          type="button"
                          onClick={() => setModeSortBy('count')}
                          className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                            modeSortBy === 'count' ? 'bg-indigo-900 text-white' : 'text-indigo-900 hover:bg-blue-50'
                          }`}
                        >
                          Volume
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-blue-100 shadow-2xs my-4 text-xs font-extrabold">
                      <span className="text-gray-500 uppercase text-[10px] tracking-wider">Class Mode Ratio:</span>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-red-600">
                          <span className="w-3 h-3 bg-red-500 rounded-md inline-block"></span>
                          💻 Online ({onlinePercent}%)
                        </span>
                        <span className="flex items-center gap-1.5 text-indigo-900">
                          <span className="w-3 h-3 bg-indigo-900 rounded-md inline-block"></span>
                          🏫 Physical ({physicalPercent}%)
                        </span>
                      </div>
                    </div>

                    {sortedGrades.length === 0 ? (
                      <p className="text-sm text-gray-400 py-12 text-center">No grades recorded in your classes.</p>
                    ) : (
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                        {sortedGrades.map((g) => {
                          const totalInGrade = g.count || 1;
                          const onlineRatio = Math.round((g.online / totalInGrade) * 100);
                          const physicalRatio = 100 - onlineRatio;

                          return (
                            <div key={g.grade} className="bg-white p-3.5 rounded-2xl border border-blue-100/80 shadow-2xs space-y-2">
                              <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-indigo-950 font-black">🎓 {g.grade}</span>
                                <span className="text-[11px] font-extrabold text-gray-600">{g.count} Students ({g.online} On / {g.physical} Phys)</span>
                              </div>

                              <div className="w-full bg-indigo-950 h-5 rounded-xl overflow-hidden flex shadow-inner text-[10px] font-black text-white leading-5 text-center">
                                {onlineRatio > 0 && (
                                  <div style={{ width: `${onlineRatio}%` }} className="bg-gradient-to-r from-red-600 to-red-500 h-full flex items-center justify-center transition-all duration-500">
                                    {onlineRatio >= 15 && <span>{onlineRatio}%</span>}
                                  </div>
                                )}
                                {physicalRatio > 0 && (
                                  <div style={{ width: `${physicalRatio}%` }} className="bg-gradient-to-r from-indigo-900 to-indigo-950 h-full flex items-center justify-center transition-all duration-500">
                                    {physicalRatio >= 15 && <span>{physicalRatio}%</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER ADMIN VIEW
  // ==========================================
  const { metrics, gradeDistribution = [], topCourses = [], courseRevenueList = [], weeklyStudentTrend = [], teacherBreakdownList = [], coursesDetailedList = [] } = data || {};

  const onlineCount = metrics?.onlineStudents || 0;
  const physicalCount = metrics?.physicalStudents || 0;
  const totalCount = metrics?.totalStudents || (onlineCount + physicalCount);

  const onlinePercent = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;
  const physicalPercent = 100 - onlinePercent;

  const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);
  const maxCourseEnrolled = Math.max(...topCourses.map(c => c.enrolledCount), 1);

  const maxWeeklyValue = Math.max(
    ...weeklyStudentTrend.map(t => {
      if (studentTypeFilter === 'online') return t.online || 0;
      if (studentTypeFilter === 'physical') return t.physical || 0;
      return Math.max(t.online || 0, t.physical || 0, t.total || 0);
    }),
    1
  );

  return (
    <div className="min-h-screen bg-[#f1f5f9] p-4 md:p-10 font-sans text-gray-800 space-y-10">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-8 rounded-[30px] text-white shadow-xl">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-3 bg-white/10 rounded-2xl text-amber-400 text-2xl">📊</span>
              <div>
                <h2 className="text-3xl font-extrabold tracking-tight">Analytics & Platform Insights</h2>
                <p className="text-indigo-200 text-sm mt-1">
                  Real-time visual operational analytics on weekly student growth, teacher performance, course workloads, and revenues.
                </p>
              </div>
            </div>
          </div>

          {/* Student Mode Filter Control */}
          <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 flex items-center gap-1">
            <span className="text-xs text-indigo-200 px-3 font-semibold flex items-center gap-1">
              <FaFilter className="text-amber-400" /> Filter Mode:
            </span>
            <button
              onClick={() => setStudentTypeFilter('all')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                studentTypeFilter === 'all' 
                  ? 'bg-amber-400 text-purple-950 shadow-md scale-105' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              🌐 All Students
            </button>
            <button
              onClick={() => setStudentTypeFilter('online')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                studentTypeFilter === 'online' 
                  ? 'bg-red-500 text-white shadow-md scale-105' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              💻 Online Only
            </button>
            <button
              onClick={() => setStudentTypeFilter('physical')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                studentTypeFilter === 'physical' 
                  ? 'bg-blue-600 text-white shadow-md scale-105' 
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              🏫 Physical Only
            </button>
          </div>
        </div>

        {/* ADMIN TEACHER FILTER RIBBON */}
        <div className="bg-white p-5 rounded-3xl border border-purple-200/80 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-purple-950 flex items-center gap-2">
              <FaUserTie className="text-purple-600" /> Filter Analytics by Teacher / Instructor:
            </span>
            <span className="text-xs text-purple-700 font-bold bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
              {teacherBreakdownList.length} Active Instructors
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setSelectedAdminTeacherId('all')}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                selectedAdminTeacherId === 'all'
                  ? 'bg-purple-900 text-white border-purple-950 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                  : 'bg-purple-50/60 hover:bg-purple-100 text-purple-950 border-purple-100'
              }`}
            >
              <span>🌐 All Teachers (Institute Overview)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                selectedAdminTeacherId === 'all' ? 'bg-amber-400 text-purple-950' : 'bg-purple-200 text-purple-900'
              }`}>
                Total Institute
              </span>
            </button>

            {teacherBreakdownList.map(teacher => {
              const isSelected = selectedAdminTeacherId === teacher._id;
              return (
                <button
                  key={teacher._id}
                  type="button"
                  onClick={() => setSelectedAdminTeacherId(teacher._id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer border ${
                    isSelected
                      ? 'bg-purple-900 text-white border-purple-950 shadow-md ring-2 ring-amber-400 scale-[1.02]'
                      : 'bg-purple-50/60 hover:bg-purple-100 text-purple-950 border-purple-100'
                  }`}
                >
                  <span>👨‍🏫 {teacher.name}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isSelected ? 'bg-amber-400 text-purple-950' : 'bg-purple-200 text-purple-900'
                  }`}>
                    {teacher.coursesCount} Course{teacher.coursesCount !== 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Teacher Active Filter Alert */}
        {selectedAdminTeacherId !== 'all' && data?.selectedTeacherInfo && (
          <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-purple-500/30">
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-amber-400 text-purple-950 rounded-xl text-lg font-black">👨‍🏫</span>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base">
                  Teacher Performance Report: {data.selectedTeacherInfo.name}
                </h4>
                <p className="text-xs text-purple-200">
                  {data.selectedTeacherInfo.email} • {data.selectedTeacherInfo.coursesCount} Active Courses • {data.selectedTeacherInfo.activeTimetableHours} Lecture Hours/Wk
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedAdminTeacherId('all')}
              className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-purple-950 font-black text-xs rounded-xl shadow transition cursor-pointer self-start sm:self-auto"
            >
              Reset to All Teachers
            </button>
          </div>
        )}

        {/* Filter Indicator Badge */}
        {studentTypeFilter !== 'all' && (
          <div className="bg-purple-100 border border-purple-200 text-purple-900 px-5 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-sm">
            <span>
              🔍 Currently showing analytics filtered for <strong>{studentTypeFilter.toUpperCase()} STUDENTS ONLY</strong>.
            </span>
            <button 
              onClick={() => setStudentTypeFilter('all')}
              className="text-purple-700 underline font-extrabold hover:text-purple-950 cursor-pointer"
            >
              Reset to All Students
            </button>
          </div>
        )}

        {/* 6 Executive Summary Cards for Admin */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
          {/* Card 1: Total Lessons Published */}
          <div className="bg-purple-50/90 p-5 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-purple-600 font-bold uppercase tracking-wider">Lessons Published</p>
                <h3 className="text-2xl font-extrabold text-purple-950 mt-1">{metrics?.totalLessonsPublished || 0}</h3>
              </div>
              <div className="w-10 h-10 bg-purple-200/60 text-[#2d1b64] rounded-2xl flex items-center justify-center text-lg shadow-inner">
                <FaBookOpen />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-purple-100 text-[10px] font-bold text-purple-900 flex items-center justify-between">
              <span>{metrics?.totalVideosCount || 0} Videos • {metrics?.totalPdfsCount || 0} PDFs</span>
              <span>{metrics?.totalAssignmentsCount || 0} Tasks</span>
            </div>
          </div>

          {/* Card 2: Attendance Compliance */}
          <div className="bg-blue-50/90 p-5 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-blue-700 font-bold uppercase tracking-wider">Attendance Rate</p>
                <h3 className="text-2xl font-extrabold text-blue-900 mt-1">{metrics?.attendanceRate || 100}%</h3>
              </div>
              <div className="w-10 h-10 bg-blue-200/60 text-blue-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                <FaCheckCircle />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-blue-100 text-[10px] font-bold text-blue-900 flex items-center justify-between">
              <span>{metrics?.attendanceBreakdown?.present || 0} Present</span>
              <span>{metrics?.attendanceBreakdown?.total || 0} Logged</span>
            </div>
          </div>

          {/* Card 3: Active Timetable Hours */}
          <div className="bg-amber-50/90 p-5 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-amber-700 font-bold uppercase tracking-wider">Timetable Hours</p>
                <h3 className="text-2xl font-extrabold text-amber-900 mt-1">{metrics?.activeTimetableHours || 0} <span className="text-xs font-semibold">Hrs/Wk</span></h3>
              </div>
              <div className="w-10 h-10 bg-amber-200/60 text-amber-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                <FaClock />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-amber-100 text-[10px] font-bold text-amber-900 flex items-center justify-between">
              <span>Weekly Lecture Load</span>
              <span>Active</span>
            </div>
          </div>

          {/* Card 4: Total Students */}
          <div className="bg-purple-50/90 p-5 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-purple-600 font-bold uppercase tracking-wider">
                  {studentTypeFilter === 'all' ? 'Total Students' : `${studentTypeFilter} Students`}
                </p>
                <h3 className="text-2xl font-extrabold text-purple-950 mt-1">{totalCount}</h3>
              </div>
              <div className="w-10 h-10 bg-purple-200/60 text-[#2d1b64] rounded-2xl flex items-center justify-center text-lg shadow-inner">
                <FaUsers />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-purple-100 text-[10px] font-bold text-purple-900 flex items-center justify-between">
              <span>{onlineCount} Online</span>
              <span>{physicalCount} Physical</span>
            </div>
          </div>

          {/* Card 5: Active Teachers & Courses */}
          <div className="bg-indigo-50/90 p-5 rounded-3xl border border-indigo-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-indigo-600 font-bold uppercase tracking-wider">Active Teachers</p>
                <h3 className="text-2xl font-extrabold text-indigo-950 mt-1">{metrics?.totalTeachers || 0}</h3>
              </div>
              <div className="w-10 h-10 bg-indigo-200/60 text-indigo-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                <FaChalkboardTeacher />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-indigo-100 text-[10px] font-bold text-indigo-900 flex items-center justify-between">
              <span>{metrics?.totalCourses || 0} Active Courses</span>
              <span className="text-indigo-700 font-extrabold">Curriculum</span>
            </div>
          </div>

          {/* Card 6: Revenue Collected */}
          <div className="bg-emerald-50/90 p-5 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Revenue Collected</p>
                <h3 className="text-2xl font-extrabold text-emerald-800 mt-1">
                  LKR {(metrics?.totalRevenue || 0).toLocaleString()}
                </h3>
              </div>
              <div className="w-10 h-10 bg-emerald-200/60 text-emerald-700 rounded-2xl flex items-center justify-center text-lg shadow-inner">
                <FaMoneyBillWave />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-emerald-100 text-[10px] font-bold text-emerald-950 flex items-center justify-between">
              <span>{metrics?.totalPaymentsCount || 0} Payments</span>
              <span className="text-emerald-700 font-extrabold">Verified ✓</span>
            </div>
          </div>
        </div>

        {/* Section 1: Weekly Growth Line Chart & Donut Mode Share Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Section 1: Interactive Weekly Growth Chart & Donut Mode Share Chart */}
          <div className="lg:col-span-2 bg-[#fffaf5] p-6 sm:p-8 rounded-[30px] border border-amber-100 shadow-sm space-y-6 overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-200/60 pb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaChartLine className="text-purple-700 text-lg" /> Weekly Student Growth Analysis
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {studentTypeFilter === 'all' 
                    ? 'Weekly breakdown of Online, Physical, and Total registrations' 
                    : `Weekly growth trend for ${studentTypeFilter.toUpperCase()} students`}
                </p>
              </div>

              {/* Chart Style Switcher Buttons */}
              <div className="flex bg-amber-100/70 p-1 rounded-2xl border border-amber-200/80 items-center gap-1 self-start sm:self-auto">
                <button
                  onClick={() => setChartStyle('bars')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                    chartStyle === 'bars'
                      ? 'bg-purple-900 text-white shadow-sm scale-105'
                      : 'text-amber-900 hover:bg-white/60'
                  }`}
                  title="Grouped Vertical Bar Pillars"
                >
                  📊 Bar Pillars
                </button>
                <button
                  onClick={() => setChartStyle('area')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                    chartStyle === 'area'
                      ? 'bg-purple-900 text-white shadow-sm scale-105'
                      : 'text-amber-900 hover:bg-white/60'
                  }`}
                  title="Smooth Wave Area Chart"
                >
                  🌊 Smooth Area
                </button>
                <button
                  onClick={() => setChartStyle('lines')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center gap-1 ${
                    chartStyle === 'lines'
                      ? 'bg-purple-900 text-white shadow-sm scale-105'
                      : 'text-amber-900 hover:bg-white/60'
                  }`}
                  title="Compact Line Trend"
                >
                  📈 Line Trend
                </button>
              </div>
            </div>

            {/* Legend & Filter Badges */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-bold bg-white p-3 rounded-2xl border border-amber-100 shadow-xs">
              <span className="text-gray-500 font-extrabold uppercase text-[10px] tracking-wider">Metrics Legend:</span>
              <div className="flex flex-wrap items-center gap-4">
                {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                  <span className="flex items-center gap-1.5 text-red-600 font-extrabold">
                    <span className="w-3 h-3 bg-red-500 rounded-full inline-block shadow-xs"></span> Online (Red)
                  </span>
                )}
                {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                  <span className="flex items-center gap-1.5 text-blue-700 font-extrabold">
                    <span className="w-3 h-3 bg-blue-600 rounded-full inline-block shadow-xs"></span> Physical (Blue)
                  </span>
                )}
                {studentTypeFilter === 'all' && (
                  <span className="flex items-center gap-1.5 text-amber-700 font-extrabold">
                    <span className="w-3 h-3 bg-amber-400 rounded-full inline-block shadow-xs"></span> Combined Total
                  </span>
                )}
              </div>
            </div>

            {weeklyStudentTrend.length === 0 ? (
              <p className="text-sm text-gray-400 py-12 text-center">No weekly registration trend data available yet.</p>
            ) : (
              <div className="pt-2">

                {/* 1. BAR PILLARS VIEW */}
                {chartStyle === 'bars' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="h-56 w-full flex items-end justify-between gap-3 pt-6 pb-2 px-2 bg-gradient-to-b from-white to-amber-50/40 rounded-2xl border border-amber-100/60 relative">
                      {weeklyStudentTrend.map((t) => {
                        const onlineHeight = Math.max(Math.round(((t.online || 0) / maxWeeklyValue) * 100), 6);
                        const physicalHeight = Math.max(Math.round(((t.physical || 0) / maxWeeklyValue) * 100), 6);
                        const totalHeight = Math.max(Math.round(((t.total || 0) / maxWeeklyValue) * 100), 6);

                        return (
                          <div key={t.week} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                            {/* Hover Tooltip */}
                            <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none bg-gray-900 text-white text-[11px] font-bold py-1.5 px-3 rounded-xl shadow-xl z-20 whitespace-nowrap border border-gray-700">
                              {t.week}: {t.online || 0} Online • {t.physical || 0} Physical ({t.total || 0} Total)
                            </div>

                            <div className="flex items-end justify-center gap-1.5 w-full h-full">
                              {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                                <div
                                  style={{ height: `${onlineHeight}%` }}
                                  className="w-1/3 max-w-[20px] bg-gradient-to-t from-red-600 to-red-400 rounded-t-lg shadow-sm transition-all duration-500 group-hover:brightness-110 flex items-center justify-center"
                                  title={`Week ${t.week}: ${t.online} Online`}
                                ></div>
                              )}
                              {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                                <div
                                  style={{ height: `${physicalHeight}%` }}
                                  className="w-1/3 max-w-[20px] bg-gradient-to-t from-blue-700 to-blue-500 rounded-t-lg shadow-sm transition-all duration-500 group-hover:brightness-110 flex items-center justify-center"
                                  title={`Week ${t.week}: ${t.physical} Physical`}
                                ></div>
                              )}
                              {studentTypeFilter === 'all' && (
                                <div
                                  style={{ height: `${totalHeight}%` }}
                                  className="w-1/3 max-w-[20px] bg-gradient-to-t from-amber-500 to-amber-300 rounded-t-lg shadow-sm transition-all duration-500 group-hover:brightness-110 flex items-center justify-center opacity-80"
                                  title={`Week ${t.week}: ${t.total} Total`}
                                ></div>
                              )}
                            </div>

                            <span className="text-[11px] font-extrabold text-gray-800 mt-2 truncate max-w-full">
                              {t.week}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. SMOOTH GRADIENT AREA VIEW */}
                {chartStyle === 'area' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="relative h-56 w-full overflow-hidden bg-white p-2 rounded-2xl border border-amber-100">
                      <svg className="w-full h-full overflow-hidden" viewBox="0 0 500 180" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ef4444" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#ef4444" stopOpacity="0.0" />
                          </linearGradient>
                          <linearGradient id="physicalGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.0" />
                          </linearGradient>
                        </defs>

                        {/* Grid lines */}
                        <line x1="0" y1="30" x2="500" y2="30" stroke="#f3e8dc" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="0" y1="90" x2="500" y2="90" stroke="#f3e8dc" strokeWidth="1" strokeDasharray="3 3" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="#f3e8dc" strokeWidth="1" strokeDasharray="3 3" />

                        {/* Physical Area */}
                        {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                          <>
                            <path
                              d={`M 0 160 ${weeklyStudentTrend.map((t, idx) => {
                                const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                                const y = 150 - ((t.physical || 0) / maxWeeklyValue) * 120;
                                return `L ${x} ${y}`;
                              }).join(' ')} L 500 160 Z`}
                              fill="url(#physicalGrad)"
                            />
                            <path
                              d={weeklyStudentTrend.map((t, idx) => {
                                const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                                const y = 150 - ((t.physical || 0) / maxWeeklyValue) * 120;
                                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#1d4ed8"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </>
                        )}

                        {/* Online Area */}
                        {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                          <>
                            <path
                              d={`M 0 160 ${weeklyStudentTrend.map((t, idx) => {
                                const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                                const y = 150 - ((t.online || 0) / maxWeeklyValue) * 120;
                                return `L ${x} ${y}`;
                              }).join(' ')} L 500 160 Z`}
                              fill="url(#onlineGrad)"
                            />
                            <path
                              d={weeklyStudentTrend.map((t, idx) => {
                                const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                                const y = 150 - ((t.online || 0) / maxWeeklyValue) * 120;
                                return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                              }).join(' ')}
                              fill="none"
                              stroke="#ef4444"
                              strokeWidth="3"
                              strokeLinecap="round"
                            />
                          </>
                        )}

                        {/* Dots */}
                        {weeklyStudentTrend.map((t, idx) => {
                          const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                          const yOnline = 150 - ((t.online || 0) / maxWeeklyValue) * 120;
                          const yPhysical = 150 - ((t.physical || 0) / maxWeeklyValue) * 120;

                          return (
                            <g key={t.week}>
                              {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                                <circle cx={x} cy={yOnline} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                              )}
                              {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                                <circle cx={x} cy={yPhysical} r="4.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 px-2">
                      {weeklyStudentTrend.map(t => (
                        <div key={t.week} className="text-center">
                          <span className="block text-gray-900 font-extrabold">{t.week}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. LINE TREND VIEW */}
                {chartStyle === 'lines' && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="relative h-56 w-full overflow-hidden bg-white p-2 rounded-2xl border border-amber-100">
                      <svg className="w-full h-full overflow-hidden" viewBox="0 0 500 180" preserveAspectRatio="none">
                        <line x1="0" y1="30" x2="500" y2="30" stroke="#f3e8dc" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="0" y1="90" x2="500" y2="90" stroke="#f3e8dc" strokeWidth="1.5" strokeDasharray="3 3" />
                        <line x1="0" y1="150" x2="500" y2="150" stroke="#f3e8dc" strokeWidth="1.5" strokeDasharray="3 3" />

                        {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                          <path
                            d={weeklyStudentTrend.map((t, idx) => {
                              const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                              const y = 150 - ((t.online || 0) / maxWeeklyValue) * 120;
                              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                        )}

                        {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                          <path
                            d={weeklyStudentTrend.map((t, idx) => {
                              const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                              const y = 150 - ((t.physical || 0) / maxWeeklyValue) * 120;
                              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#1d4ed8"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                        )}

                        {studentTypeFilter === 'all' && (
                          <path
                            d={weeklyStudentTrend.map((t, idx) => {
                              const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                              const y = 150 - ((t.total || 0) / maxWeeklyValue) * 120;
                              return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#f59e0b"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                          />
                        )}

                        {weeklyStudentTrend.map((t, idx) => {
                          const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                          const yOnline = 150 - ((t.online || 0) / maxWeeklyValue) * 120;
                          const yPhysical = 150 - ((t.physical || 0) / maxWeeklyValue) * 120;
                          const yTotal = 150 - ((t.total || 0) / maxWeeklyValue) * 120;

                          return (
                            <g key={t.week}>
                              {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                                <circle cx={x} cy={yOnline} r="4.5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                              )}
                              {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                                <circle cx={x} cy={yPhysical} r="4.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
                              )}
                              {studentTypeFilter === 'all' && (
                                <circle cx={x} cy={yTotal} r="4.5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                              )}
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold text-gray-500 px-2">
                      {weeklyStudentTrend.map(t => (
                        <div key={t.week} className="text-center">
                          <span className="block text-gray-900 font-extrabold">{t.week}</span>
                          <span className="text-[10px] text-gray-600 font-bold">
                            {studentTypeFilter === 'online' ? `${t.online} Online` : studentTypeFilter === 'physical' ? `${t.physical} Physical` : `${t.online} / ${t.physical}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          <div className="bg-[#f8f5ff] p-8 rounded-[30px] border border-purple-100 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                <FaChartPie className="text-purple-600" /> Mode Share (Pie Chart)
              </h3>
              <p className="text-xs text-purple-400 mt-0.5">Visual ratio of Online vs Physical students</p>
            </div>

            <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="#1e1b4b" strokeWidth="16" fill="transparent" />
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#9333ea" 
                  strokeWidth="16" 
                  fill="transparent"
                  strokeDasharray={`${(onlinePercent / 100) * (2 * Math.PI * 40)} ${2 * Math.PI * 40}`}
                  className="transition-all duration-700"
                />
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-purple-950">{totalCount}</span>
                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Students</span>
              </div>
            </div>

            <div className="space-y-3 pt-2 border-t border-purple-100">
              <div className="flex justify-between items-center text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-purple-600 rounded-full"></span>
                  <span className="text-purple-950">Online Mode</span>
                </div>
                <span className="text-purple-700 font-extrabold">{onlineCount} ({onlinePercent}%)</span>
              </div>

              <div className="flex justify-between items-center text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-indigo-900 rounded-full"></span>
                  <span className="text-purple-950">Physical Mode</span>
                </div>
                <span className="text-indigo-950 font-extrabold">{physicalCount} ({physicalPercent}%)</span>
              </div>
            </div>
          </div>

        </div>

        {/* Section 2: Option 2 - Academic Level Donut & Stream Breakdown + Comparative Mode Split */}
        {(() => {
          // Categorization helpers
          const categorizeGrade = (gradeStr = '') => {
            const g = String(gradeStr).toLowerCase();
            if (g.includes('grade 6') || g.includes('grade 7') || g.includes('grade 8') || g.includes('grade 9')) return 'junior';
            if (g.includes('grade 10') || g.includes('grade 11')) return 'ol';
            if (g.includes('grade 12') || g.includes('grade 13') || g.includes('a/l') || g.includes('al')) return 'al';
            return 'other';
          };

          const tierMeta = {
            junior: { label: 'Junior Secondary', subtitle: 'Grades 6 – 9', color: '#6366f1', lightBg: 'bg-indigo-50/80', text: 'text-indigo-900', border: 'border-indigo-200' },
            ol: { label: 'O/L Candidates', subtitle: 'Grades 10 – 11', color: '#f59e0b', lightBg: 'bg-amber-50/80', text: 'text-amber-900', border: 'border-amber-200' },
            al: { label: 'A/L Academic Streams', subtitle: 'Grades 12 – 13', color: '#0d9488', lightBg: 'bg-teal-50/80', text: 'text-teal-900', border: 'border-teal-200' },
            other: { label: 'Other Active Tracks', subtitle: 'Specialized', color: '#8b5cf6', lightBg: 'bg-purple-50/80', text: 'text-purple-900', border: 'border-purple-200' }
          };

          const tierTotals = {
            junior: { count: 0, online: 0, physical: 0, grades: [] },
            ol: { count: 0, online: 0, physical: 0, grades: [] },
            al: { count: 0, online: 0, physical: 0, grades: [] },
            other: { count: 0, online: 0, physical: 0, grades: [] }
          };

          gradeDistribution.forEach(g => {
            const tier = categorizeGrade(g.grade);
            if (tierTotals[tier]) {
              tierTotals[tier].count += (g.count || 0);
              tierTotals[tier].online += (g.online || 0);
              tierTotals[tier].physical += (g.physical || 0);
              tierTotals[tier].grades.push(g.grade);
            }
          });

          const totalTierStudents = (tierTotals.junior.count + tierTotals.ol.count + tierTotals.al.count + tierTotals.other.count) || 1;

          // Donut SVG circumference calculation (r = 65, C = 2 * PI * 65 = 408.407)
          const C = 2 * Math.PI * 65;
          let accumulatedOffset = 0;
          const donutSegments = [
            { key: 'junior', name: 'Junior (Grades 6–9)', count: tierTotals.junior.count, color: '#6366f1' },
            { key: 'ol', name: 'O/L (Grades 10–11)', count: tierTotals.ol.count, color: '#f59e0b' },
            { key: 'al', name: 'A/L Streams (12–13)', count: tierTotals.al.count, color: '#0d9488' },
            ...(tierTotals.other.count > 0 ? [{ key: 'other', name: 'Other Levels', count: tierTotals.other.count, color: '#8b5cf6' }] : [])
          ].map(seg => {
            const ratio = seg.count / totalTierStudents;
            const strokeDasharray = `${ratio * C} ${C}`;
            const strokeDashoffset = -accumulatedOffset * C;
            accumulatedOffset += ratio;
            return {
              ...seg,
              percent: Math.round(ratio * 100),
              strokeDasharray,
              strokeDashoffset
            };
          });

          // Sorting & filtering for right side Mode Split
          const filteredGrades = gradeDistribution.filter(g => {
            if (selectedTier === 'all') return true;
            return categorizeGrade(g.grade) === selectedTier;
          });

          const sortedGrades = [...filteredGrades].sort((a, b) => {
            if (modeSortBy === 'count') return (b.count || 0) - (a.count || 0);
            if (modeSortBy === 'online') {
              const rA = a.count ? (a.online / a.count) : 0;
              const rB = b.count ? (b.online / b.count) : 0;
              return rB - rA;
            }
            const getNum = (s = '') => {
              const m = s.match(/\d+/);
              return m ? parseInt(m[0], 10) : 99;
            };
            const diff = getNum(a.grade) - getNum(b.grade);
            if (diff !== 0) return diff;
            return (a.grade || '').localeCompare(b.grade || '');
          });

          return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* LEFT CHART: Academic Level Donut & Stream Breakdown */}
              <div className="bg-[#fcfaff] p-6 sm:p-8 rounded-[30px] border border-purple-100/90 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center border-b border-purple-100 pb-3">
                    <div>
                      <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                        <FaGraduationCap className="text-purple-600" /> Academic Level Distribution
                      </h3>
                      <p className="text-xs text-purple-600/80 mt-0.5">Student population grouped by academic stage (Junior, O/L & A/L)</p>
                    </div>
                    <span className="text-xs bg-purple-100 text-purple-900 font-extrabold px-3 py-1 rounded-full border border-purple-200">
                      {gradeDistribution.length} Active Grades
                    </span>
                  </div>

                  {gradeDistribution.length === 0 ? (
                    <p className="text-sm text-gray-400 py-12 text-center">No student grade data recorded yet.</p>
                  ) : (
                    <div className="pt-4 space-y-6">
                      
                      {/* Donut Graphic & Center Metric */}
                      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 bg-white p-5 rounded-2xl border border-purple-100/80 shadow-2xs">
                        <div className="relative w-44 h-44 flex items-center justify-center shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
                            {/* Background Track Circle */}
                            <circle
                              cx="80"
                              cy="80"
                              r="65"
                              fill="transparent"
                              stroke="#f1f5f9"
                              strokeWidth="20"
                            />
                            {/* SVG Donut Segments */}
                            {donutSegments.map(seg => (
                              <circle
                                key={seg.key}
                                cx="80"
                                cy="80"
                                r="65"
                                fill="transparent"
                                stroke={seg.color}
                                strokeWidth={selectedTier === seg.key ? "24" : "20"}
                                strokeDasharray={seg.strokeDasharray}
                                strokeDashoffset={seg.strokeDashoffset}
                                strokeLinecap="butt"
                                className="transition-all duration-500 cursor-pointer hover:opacity-90"
                                onClick={() => setSelectedTier(prev => prev === seg.key ? 'all' : seg.key)}
                              />
                            ))}
                          </svg>

                          {/* Center Donut Hole Content */}
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="text-3xl font-black text-purple-950 tracking-tight leading-none">
                              {totalCount}
                            </span>
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 mt-1">
                              Students
                            </span>
                          </div>
                        </div>

                        {/* Donut Quick Legend */}
                        <div className="space-y-2 flex-1 w-full text-xs">
                          {donutSegments.map(seg => {
                            const isSelected = selectedTier === seg.key;
                            return (
                              <div
                                key={seg.key}
                                onClick={() => setSelectedTier(prev => prev === seg.key ? 'all' : seg.key)}
                                className={`p-2.5 rounded-xl border transition flex items-center justify-between cursor-pointer ${
                                  isSelected 
                                    ? 'bg-purple-900 text-white border-purple-900 shadow-sm' 
                                    : 'bg-purple-50/50 hover:bg-purple-100/70 border-purple-100 text-purple-950'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                                  <span className="font-extrabold">{seg.name}</span>
                                </div>
                                <div className="flex items-center gap-2 font-black">
                                  <span>{seg.count} Students</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-purple-900 border border-purple-200'
                                  }`}>
                                    {seg.percent}%
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Academic Tier Stage Summary Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {['junior', 'ol', 'al'].map(key => {
                          const meta = tierMeta[key];
                          const totals = tierTotals[key];
                          const percent = Math.round((totals.count / totalTierStudents) * 100) || 0;
                          const isSelected = selectedTier === key;

                          return (
                            <div
                              key={key}
                              onClick={() => setSelectedTier(prev => prev === key ? 'all' : key)}
                              className={`p-3.5 rounded-2xl border transition flex flex-col justify-between cursor-pointer space-y-2 ${
                                isSelected
                                  ? 'bg-purple-900 text-white border-purple-900 shadow-md ring-2 ring-purple-400'
                                  : `${meta.lightBg} ${meta.border} hover:shadow-xs`
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start">
                                  <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-amber-300' : 'text-gray-500'}`}>
                                    {meta.subtitle}
                                  </span>
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-white text-purple-900 border border-purple-200'
                                  }`}>
                                    {percent}%
                                  </span>
                                </div>
                                <h4 className={`text-xs font-black mt-1 ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                                  {meta.label}
                                </h4>
                              </div>

                              <div className="pt-2 border-t border-black/5">
                                <div className={`text-base font-extrabold ${isSelected ? 'text-amber-300' : 'text-purple-950'}`}>
                                  {totals.count} <span className="text-[10px] font-bold">Students</span>
                                </div>
                                <div className={`text-[10px] font-semibold mt-0.5 ${isSelected ? 'text-purple-200' : 'text-purple-700'}`}>
                                  {totals.online} Online • {totals.physical} Physical
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  )}
                </div>

                {selectedTier !== 'all' && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedTier('all')}
                      className="text-xs text-purple-700 underline font-extrabold hover:text-purple-950 cursor-pointer"
                    >
                      Clear Tier Filter (Show All Grades)
                    </button>
                  </div>
                )}
              </div>

              {/* RIGHT CHART: Mode Split Comparative Stream Bars */}
              <div className="bg-[#f7f9ff] p-6 sm:p-8 rounded-[30px] border border-blue-100/90 shadow-sm space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
                    <div>
                      <h3 className="text-xl font-bold text-indigo-950 flex items-center gap-2">
                        <FaGlobe className="text-indigo-600" /> Mode Split per Grade
                      </h3>
                      <p className="text-xs text-indigo-500 mt-0.5">Ratio of online vs physical learners across each grade stream</p>
                    </div>

                    {/* Sort Controls */}
                    <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-blue-100 self-start sm:self-auto text-xs font-bold shadow-2xs">
                      <span className="text-[10px] text-gray-400 font-extrabold uppercase px-1.5">Sort:</span>
                      <button
                        type="button"
                        onClick={() => setModeSortBy('grade')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          modeSortBy === 'grade' ? 'bg-indigo-900 text-white' : 'text-indigo-900 hover:bg-blue-50'
                        }`}
                      >
                        Grade
                      </button>
                      <button
                        type="button"
                        onClick={() => setModeSortBy('count')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          modeSortBy === 'count' ? 'bg-indigo-900 text-white' : 'text-indigo-900 hover:bg-blue-50'
                        }`}
                      >
                        Volume
                      </button>
                      <button
                        type="button"
                        onClick={() => setModeSortBy('online')}
                        className={`px-2.5 py-1 rounded-lg transition cursor-pointer text-[11px] ${
                          modeSortBy === 'online' ? 'bg-indigo-900 text-white' : 'text-indigo-900 hover:bg-blue-50'
                        }`}
                      >
                        Online %
                      </button>
                    </div>
                  </div>

                  {/* Mode Legend */}
                  <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-blue-100 shadow-2xs my-4 text-xs font-extrabold">
                    <span className="text-gray-500 uppercase text-[10px] tracking-wider">Mode Proportion:</span>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1.5 text-red-600">
                        <span className="w-3 h-3 bg-red-500 rounded-md inline-block"></span>
                        💻 Online ({onlinePercent}%)
                      </span>
                      <span className="flex items-center gap-1.5 text-indigo-900">
                        <span className="w-3 h-3 bg-indigo-900 rounded-md inline-block"></span>
                        🏫 Physical ({physicalPercent}%)
                      </span>
                    </div>
                  </div>

                  {sortedGrades.length === 0 ? (
                    <p className="text-sm text-gray-400 py-12 text-center">No grades match the selected filter.</p>
                  ) : (
                    <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1">
                      {sortedGrades.map((g) => {
                        const totalInGrade = g.count || 1;
                        const onlineRatio = Math.round((g.online / totalInGrade) * 100);
                        const physicalRatio = 100 - onlineRatio;

                        return (
                          <div key={g.grade} className="bg-white p-3.5 rounded-2xl border border-blue-100/80 shadow-2xs hover:shadow-xs transition space-y-2">
                            <div className="flex justify-between items-center text-xs font-bold">
                              <span className="text-indigo-950 font-black flex items-center gap-1.5">
                                🎓 {g.grade}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] font-extrabold text-gray-600">
                                  {g.count} Students
                                </span>
                                <span className="text-[10px] text-indigo-900 font-bold bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
                                  {g.online} Online • {g.physical} Physical
                                </span>
                              </div>
                            </div>

                            {/* Full-width Stacked Dual-Colored Bar */}
                            <div className="w-full bg-indigo-950 h-5 rounded-xl overflow-hidden flex shadow-inner text-[10px] font-black text-white leading-5 text-center">
                              {onlineRatio > 0 && (
                                <div
                                  style={{ width: `${onlineRatio}%` }}
                                  className="bg-gradient-to-r from-red-600 to-red-500 h-full flex items-center justify-center transition-all duration-500 overflow-hidden"
                                  title={`${g.grade}: ${onlineRatio}% Online (${g.online} students)`}
                                >
                                  {onlineRatio >= 14 && <span>{onlineRatio}%</span>}
                                </div>
                              )}
                              {physicalRatio > 0 && (
                                <div
                                  style={{ width: `${physicalRatio}%` }}
                                  className="bg-gradient-to-r from-indigo-900 to-indigo-950 h-full flex items-center justify-center transition-all duration-500 overflow-hidden"
                                  title={`${g.grade}: ${physicalRatio}% Physical (${g.physical} students)`}
                                >
                                  {physicalRatio >= 14 && <span>{physicalRatio}%</span>}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 font-semibold border-t border-blue-100">
                  <span>Showing {sortedGrades.length} of {gradeDistribution.length} Grades</span>
                  <span>Interactive Real-time Breakdown</span>
                </div>
              </div>

            </div>
          );
        })()}

        {/* Section 3: Most Taken Courses Leaderboard */}
        <div className="bg-[#fffdf7] p-8 rounded-[30px] border border-amber-200/80 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-xl font-bold text-amber-950 flex items-center gap-2">
                <FaTrophy className="text-amber-500" /> Most Taken Courses (Popularity Leaderboard)
              </h3>
              <p className="text-xs text-amber-600/70 mt-0.5">Ranked courses based on enrolled student volume and popularity</p>
            </div>
            <span className="text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
              🏆 Top Performing Educational Content
            </span>
          </div>

          {topCourses.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No courses currently created or enrolled.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {topCourses.map((c, index) => {
                const rank = index + 1;
                const marketShare = Math.round((c.enrolledCount / maxCourseEnrolled) * 100);
                const medalColor = rank === 1 ? 'from-amber-400 to-amber-500 text-purple-950' : rank === 2 ? 'from-slate-300 to-slate-400 text-slate-900' : rank === 3 ? 'from-amber-700 to-amber-800 text-white' : 'bg-gray-100 text-gray-700';

                return (
                  <div key={c._id} className="relative bg-white p-6 rounded-3xl border border-amber-100 shadow-sm hover:shadow-md transition space-y-4">
                    <div className="flex justify-between items-center">
                      <span className={`w-8 h-8 rounded-full bg-gradient-to-r ${medalColor} flex items-center justify-center font-extrabold text-xs shadow`}>
                        #{rank}
                      </span>
                      <span className="text-xs font-bold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-full">
                        LKR {c.price.toLocaleString()} / Student
                      </span>
                    </div>

                    <div>
                      <h4 className="text-lg font-extrabold text-gray-900 line-clamp-1">{c.title}</h4>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{c.description}</p>
                    </div>

                    <div className="pt-2 border-t border-amber-50 flex items-center justify-between text-xs">
                      <span className="text-gray-400 font-semibold">Instructor:</span>
                      <span className="font-bold text-purple-950">{c.instructorName}</span>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600">Enrolled Students</span>
                        <span className="text-purple-700">{c.enrolledCount} Students</span>
                      </div>
                      <div className="w-full bg-amber-50 h-2.5 rounded-full overflow-hidden border border-amber-100">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-amber-500 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${marketShare}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4: Revenue Contribution by Course Chart */}
        <div className="bg-[#f0fdf4] p-8 rounded-[30px] border border-emerald-100 shadow-sm space-y-6">
          <div>
            <h3 className="text-xl font-bold text-emerald-950 flex items-center gap-2">
              <FaMoneyBillWave className="text-emerald-600" /> Course Financial Contribution (Revenue Breakdown)
            </h3>
            <p className="text-xs text-emerald-600/70 mt-0.5">Financial performance and fee income generated per course from enrolled students</p>
          </div>

          {courseRevenueList.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No payment fee transactions recorded yet.</p>
          ) : (
            <div className="space-y-4 pt-2">
              {courseRevenueList.map((item) => {
                const totalCourseRevenue = item.revenue || 0;
                const totalAllRev = metrics?.totalRevenue || 1;
                const revPercentage = Math.round((totalCourseRevenue / totalAllRev) * 100);

                return (
                  <div key={item.title} className="p-4 bg-white rounded-2xl space-y-2 border border-emerald-100 shadow-sm">
                    <div className="flex justify-between items-center text-sm font-bold">
                      <span className="text-emerald-950">{item.title}</span>
                      <span className="text-emerald-700 font-extrabold">LKR {totalCourseRevenue.toLocaleString()}.00 ({revPercentage}%)</span>
                    </div>
                    <div className="w-full bg-emerald-50 h-3 rounded-full overflow-hidden border border-emerald-100">
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${revPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 5: Teachers & Instructors Operational Performance Breakdown */}
        <div className="bg-white p-8 rounded-[30px] border border-purple-200/80 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-purple-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                <FaChalkboardTeacher className="text-purple-600" /> Teachers & Instructors Operational Performance
              </h3>
              <p className="text-xs text-purple-600/80 mt-0.5">
                Comparative workload and delivery metrics across all teachers and instructors (Lessons published, teaching hours, compliance, and revenues).
              </p>
            </div>
            <span className="px-3.5 py-1.5 bg-purple-100 text-purple-950 font-black text-xs rounded-full border border-purple-200 shadow-2xs">
              👨‍🏫 {teacherBreakdownList.length} Active Instructors
            </span>
          </div>

          {teacherBreakdownList.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No teacher accounts recorded in the database.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {teacherBreakdownList.map((teacher) => {
                const isSelected = selectedAdminTeacherId === teacher._id;
                return (
                  <div
                    key={teacher._id}
                    className={`bg-gradient-to-br from-purple-50/60 to-indigo-50/30 p-6 rounded-3xl border transition-all duration-300 space-y-4 relative ${
                      isSelected
                        ? 'border-purple-900 shadow-lg ring-2 ring-amber-400 scale-[1.02]'
                        : 'border-purple-100 hover:shadow-md'
                    }`}
                  >
                    {/* Teacher Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-800 to-indigo-900 text-white flex items-center justify-center font-black text-lg shadow-sm">
                          {teacher.name ? teacher.name.charAt(0).toUpperCase() : 'T'}
                        </div>
                        <div>
                          <h4 className="font-extrabold text-gray-900 text-base leading-tight">{teacher.name}</h4>
                          <span className="text-[11px] text-purple-700 font-semibold block">{teacher.email}</span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="bg-amber-400 text-purple-950 text-[10px] font-black px-2.5 py-1 rounded-full shadow-2xs">
                          Active Filter
                        </span>
                      )}
                    </div>

                    {/* Operational Metric Badges */}
                    <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-2xl border border-purple-100 text-center">
                      <div className="p-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Lessons</span>
                        <span className="text-sm font-black text-purple-950">{teacher.totalLessonsPublished}</span>
                        <span className="text-[9px] text-purple-600 font-semibold block">Modules</span>
                      </div>
                      <div className="p-1 border-x border-purple-50">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Hours</span>
                        <span className="text-sm font-black text-amber-600">{teacher.activeTimetableHours}</span>
                        <span className="text-[9px] text-amber-700 font-semibold block">Hrs / Wk</span>
                      </div>
                      <div className="p-1">
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Compliance</span>
                        <span className="text-sm font-black text-blue-900">{teacher.attendanceRate}%</span>
                        <span className="text-[9px] text-blue-600 font-semibold block">Presence</span>
                      </div>
                    </div>

                    {/* Courses and Revenue Details */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-gray-600 font-semibold">
                        <span>Assigned Courses:</span>
                        <span className="font-bold text-purple-950">{teacher.coursesCount} Courses</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600 font-semibold">
                        <span>Enrolled Students:</span>
                        <span className="font-bold text-indigo-900">{teacher.totalStudents} Learners</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600 font-semibold">
                        <span>Revenue Handled:</span>
                        <span className="font-extrabold text-emerald-700">LKR {(teacher.totalRevenue || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2 border-t border-purple-100">
                      <button
                        type="button"
                        onClick={() => setSelectedAdminTeacherId(prev => prev === teacher._id ? 'all' : teacher._id)}
                        className={`w-full py-2.5 rounded-xl font-extrabold text-xs transition cursor-pointer flex items-center justify-center gap-2 ${
                          isSelected
                            ? 'bg-amber-400 hover:bg-amber-300 text-purple-950 shadow-md'
                            : 'bg-purple-900 hover:bg-purple-800 text-white shadow-xs'
                        }`}
                      >
                        <FaUserTie /> {isSelected ? 'Reset to All Teachers' : `Inspect ${teacher.name.split(' ')[0]}'s Analytics`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 6: Comprehensive Course Operational Matrix Table */}
        <div className="bg-white p-8 rounded-[30px] border border-purple-200/80 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-purple-100 pb-4">
            <div>
              <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                <FaBookOpen className="text-purple-600" /> Comprehensive Course Operational Performance Matrix
              </h3>
              <p className="text-xs text-purple-600/80 mt-0.5">
                Complete institutional course breakdown comparing published curriculum modules, scheduled lecture hours, attendance rates, and revenue.
              </p>
            </div>
            <span className="px-3.5 py-1.5 bg-amber-400 text-purple-950 font-black text-xs rounded-full shadow-2xs">
              📚 {coursesDetailedList.length} Courses Listed
            </span>
          </div>

          {coursesDetailedList.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No courses match the current filter.</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-purple-100 shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-900 to-indigo-950 text-white text-xs font-black tracking-wider uppercase">
                    <th className="p-4 rounded-tl-2xl">Course & Syllabus</th>
                    <th className="p-4">Assigned Instructor</th>
                    <th className="p-4 text-center">Lessons Published</th>
                    <th className="p-4 text-center">Timetable Workload</th>
                    <th className="p-4 text-center">Attendance Rate</th>
                    <th className="p-4 text-center">Enrolled Students</th>
                    <th className="p-4 text-right rounded-tr-2xl">Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50 text-xs font-semibold">
                  {coursesDetailedList.map((course) => (
                    <tr key={course._id} className="hover:bg-purple-50/50 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center font-black text-sm shrink-0">
                            📖
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 text-sm block">{course.title}</span>
                            <span className="text-[10px] text-gray-500 line-clamp-1">{course.description}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="font-bold text-purple-950 flex items-center gap-1.5">
                          <span>👨‍🏫</span> {course.instructorName}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg font-black text-xs">
                            {course.lessonsPublished} Modules
                          </span>
                          <span className="text-[9px] text-gray-500 mt-0.5">
                            {course.videosCount} Vids • {course.pdfsCount} PDFs
                          </span>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-black text-xs">
                          ⏱️ {course.activeTimetableHours} Hrs/Wk
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                          course.attendanceRate >= 80 
                            ? 'bg-emerald-100 text-emerald-900' 
                            : course.attendanceRate >= 60 
                            ? 'bg-amber-100 text-amber-900' 
                            : 'bg-red-100 text-red-900'
                        }`}>
                          ✓ {course.attendanceRate}%
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        <span className="font-extrabold text-indigo-950 text-sm">
                          {course.enrolledCount} Students
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <span className="font-black text-emerald-700 text-sm">
                          LKR {(course.revenue || 0).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Analytics;
