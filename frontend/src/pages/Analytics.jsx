import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
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
  FaChartPie
} from 'react-icons/fa';

const Analytics = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [studentTypeFilter, setStudentTypeFilter] = useState('all'); // 'all', 'online', 'physical'

  useEffect(() => {
    fetchAnalytics(studentTypeFilter);
  }, [studentTypeFilter]);

  const fetchAnalytics = async (typeFilter) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/auth/analytics-summary?studentType=${typeFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      toast.error('Failed to load platform analytics.');
    } finally {
      setLoading(false);
    }
  };

  const { metrics, gradeDistribution = [], topCourses = [], courseRevenueList = [], weeklyStudentTrend = [] } = data || {};

  const onlineCount = metrics?.onlineStudents || 0;
  const physicalCount = metrics?.physicalStudents || 0;
  const totalCount = metrics?.totalStudents || (onlineCount + physicalCount);

  const onlinePercent = totalCount > 0 ? Math.round((onlineCount / totalCount) * 100) : 0;
  const physicalPercent = 100 - onlinePercent;

  const maxGradeCount = Math.max(...gradeDistribution.map(g => g.count), 1);
  const maxCourseEnrolled = Math.max(...topCourses.map(c => c.enrolledCount), 1);

  // Calculate SVG Pie/Donut Chart Stroke Dasharray
  const circumference = 2 * Math.PI * 40; // radius = 40
  const onlineDash = (onlinePercent / 100) * circumference;

  // Maximum scale for line chart Y-axis (prevents shooting out of bounds)
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
                  Real-time visual charts on weekly student mode growth, grade concentration, course popularity, and revenue matrices.
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

        {/* Executive Summary Cards with Rich Tinted Ground Colors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Total Students (Soft Purple Ground) */}
          <div className="bg-purple-50/90 p-6 rounded-3xl border border-purple-100 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-purple-600 font-bold uppercase tracking-wider">
                  {studentTypeFilter === 'all' ? 'Total Students' : `${studentTypeFilter} Students`}
                </p>
                <h3 className="text-3xl font-extrabold text-purple-950 mt-1">{totalCount}</h3>
              </div>
              <div className="w-12 h-12 bg-purple-200/60 text-[#2d1b64] rounded-2xl flex items-center justify-center text-xl shadow-inner">
                <FaUsers />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-purple-100 flex items-center justify-between text-xs font-bold">
              <span className="text-purple-800 flex items-center gap-1">
                <FaGlobe /> {onlineCount} Online ({onlinePercent}%)
              </span>
              <span className="text-indigo-900 flex items-center gap-1">
                <FaSchool /> {physicalCount} Physical ({physicalPercent}%)
              </span>
            </div>
          </div>

          {/* Card 2: Active Teachers (Soft Indigo Ground) */}
          <div className="bg-indigo-50/90 p-6 rounded-3xl border border-indigo-100 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">Active Teachers</p>
                <h3 className="text-3xl font-extrabold text-indigo-950 mt-1">{metrics?.totalTeachers || 0}</h3>
              </div>
              <div className="w-12 h-12 bg-indigo-200/60 text-indigo-700 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                <FaChalkboardTeacher />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center justify-between text-xs">
              <span className="text-indigo-600 font-medium">Active Courses:</span>
              <span className="font-bold text-indigo-950">{metrics?.totalCourses || 0} Courses</span>
            </div>
          </div>

          {/* Card 3: Total Platform Revenue (Soft Emerald Ground) */}
          <div className="bg-emerald-50/90 p-6 rounded-3xl border border-emerald-100 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Revenue Collected</p>
                <h3 className="text-3xl font-extrabold text-emerald-800 mt-1">
                  LKR {(metrics?.totalRevenue || 0).toLocaleString()}
                </h3>
              </div>
              <div className="w-12 h-12 bg-emerald-200/60 text-emerald-700 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                <FaMoneyBillWave />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center justify-between text-xs">
              <span className="text-emerald-700 font-medium">Receipts Settled:</span>
              <span className="font-bold text-emerald-950">{metrics?.totalPaymentsCount || 0} Payments</span>
            </div>
          </div>

          {/* Card 4: Platform Attendance Compliance (Soft Sky Blue Ground) */}
          <div className="bg-blue-50/90 p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs text-blue-700 font-bold uppercase tracking-wider">Attendance Compliance</p>
                <h3 className="text-3xl font-extrabold text-blue-900 mt-1">{metrics?.attendanceRate || 100}%</h3>
              </div>
              <div className="w-12 h-12 bg-blue-200/60 text-blue-700 rounded-2xl flex items-center justify-center text-xl shadow-inner">
                <FaCheckCircle />
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-blue-100 flex items-center justify-between text-xs">
              <span className="text-blue-700 font-medium">Logged Sessions:</span>
              <span className="font-bold text-blue-950">{metrics?.attendanceBreakdown?.total || 0} Records</span>
            </div>
          </div>

        </div>

        {/* Section 1: Weekly Growth Line Chart & Donut Mode Share Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Chart A: Weekly Line Chart (Warm Amber Ground) - 2 Cols */}
          <div className="lg:col-span-2 bg-[#fffaf5] p-8 rounded-[30px] border border-amber-100 shadow-sm space-y-6 overflow-hidden">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FaChartLine className="text-red-500" /> Student Mode Growth Trend (Weekly Line Chart)
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {studentTypeFilter === 'all' 
                    ? 'Weekly breakdown of Online, Physical, and Total registrations' 
                    : `Weekly growth trend for ${studentTypeFilter.toUpperCase()} students`}
                </p>
              </div>

              {/* Line Chart Legend filtered dynamically */}
              <div className="flex gap-3 text-xs font-bold">
                {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                  <span className="flex items-center gap-1.5 text-red-600">
                    <span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span> Online
                  </span>
                )}
                {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                  <span className="flex items-center gap-1.5 text-blue-700">
                    <span className="w-3 h-3 bg-blue-600 rounded-full inline-block"></span> Physical
                  </span>
                )}
                {studentTypeFilter === 'all' && (
                  <span className="flex items-center gap-1.5 text-amber-600">
                    <span className="w-3 h-3 bg-amber-400 rounded-full inline-block"></span> Total
                  </span>
                )}
              </div>
            </div>

            {weeklyStudentTrend.length === 0 ? (
              <p className="text-sm text-gray-400 py-12 text-center">No weekly registration trend data available yet.</p>
            ) : (
              <div className="pt-4">
                {/* SVG Visual Line Chart */}
                <div className="relative h-64 w-full overflow-hidden">
                  <svg className="w-full h-full overflow-hidden" viewBox="0 0 500 200" preserveAspectRatio="none">
                    {/* Background Horizontal Grid Lines */}
                    <line x1="0" y1="30" x2="500" y2="30" stroke="#f3e8dc" strokeWidth="1.5" />
                    <line x1="0" y1="80" x2="500" y2="80" stroke="#f3e8dc" strokeWidth="1.5" />
                    <line x1="0" y1="130" x2="500" y2="130" stroke="#f3e8dc" strokeWidth="1.5" />
                    <line x1="0" y1="180" x2="500" y2="180" stroke="#f3e8dc" strokeWidth="1.5" />

                    {/* Red Line Path (Online) - Shown when 'all' or 'online' */}
                    {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                      <path
                        d={weeklyStudentTrend.map((t, idx) => {
                          const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                          const val = t.online || 0;
                          const y = 175 - (val / maxWeeklyValue) * 140;
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Blue Line Path (Physical) - Shown when 'all' or 'physical' */}
                    {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                      <path
                        d={weeklyStudentTrend.map((t, idx) => {
                          const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                          const val = t.physical || 0;
                          const y = 175 - (val / maxWeeklyValue) * 140;
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#1d4ed8"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Yellow Line Path (Total Combined) - Shown only when 'all' */}
                    {studentTypeFilter === 'all' && (
                      <path
                        d={weeklyStudentTrend.map((t, idx) => {
                          const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                          const val = t.total || 0;
                          const y = 175 - (val / maxWeeklyValue) * 140;
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Circular Data Point Vertices */}
                    {weeklyStudentTrend.map((t, idx) => {
                      const x = (idx / Math.max(weeklyStudentTrend.length - 1, 1)) * 500;
                      const yOnline = 175 - ((t.online || 0) / maxWeeklyValue) * 140;
                      const yPhysical = 175 - ((t.physical || 0) / maxWeeklyValue) * 140;
                      const yTotal = 175 - ((t.total || 0) / maxWeeklyValue) * 140;

                      return (
                        <g key={t.week}>
                          {(studentTypeFilter === 'all' || studentTypeFilter === 'online') && (
                            <circle cx={x} cy={yOnline} r="5" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
                          )}
                          {(studentTypeFilter === 'all' || studentTypeFilter === 'physical') && (
                            <circle cx={x} cy={yPhysical} r="5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="2" />
                          )}
                          {studentTypeFilter === 'all' && (
                            <circle cx={x} cy={yTotal} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="2" />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Timeline Weekly Labels */}
                <div className="flex justify-between items-center text-xs font-bold text-gray-500 pt-4 border-t border-amber-200/60">
                  {weeklyStudentTrend.map(t => (
                    <div key={t.week} className="text-center">
                      <span className="block text-gray-900 font-extrabold">{t.week}</span>
                      <span className="text-[10px] text-gray-600 font-bold">
                        {studentTypeFilter === 'online' ? `${t.online} Online` : studentTypeFilter === 'physical' ? `${t.physical} Physical` : `${t.online} Online / ${t.physical} Physical`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chart B: Pie / Donut Chart (Soft Lavender Ground) - 1 Col */}
          <div className="bg-[#f8f5ff] p-8 rounded-[30px] border border-purple-100 shadow-sm flex flex-col justify-between space-y-6">
            <div>
              <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                <FaChartPie className="text-purple-600" /> Mode Share (Pie Chart)
              </h3>
              <p className="text-xs text-purple-400 mt-0.5">Visual ratio of Online vs Physical students</p>
            </div>

            <div className="relative w-48 h-48 mx-auto flex items-center justify-center my-4">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Physical Base Segment Ring (Indigo) */}
                <circle cx="50" cy="50" r="40" stroke="#1e1b4b" strokeWidth="16" fill="transparent" />
                
                {/* Online Segment Ring (Purple) */}
                <circle 
                  cx="50" 
                  cy="50" 
                  r="40" 
                  stroke="#9333ea" 
                  strokeWidth="16" 
                  fill="transparent"
                  strokeDasharray={`${onlineDash} ${circumference}`}
                  className="transition-all duration-700"
                />
              </svg>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-extrabold text-purple-950">{totalCount}</span>
                <span className="text-[10px] text-purple-500 font-bold uppercase tracking-wider">Students</span>
              </div>
            </div>

            {/* Pie Chart Legend */}
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

        {/* Section 2: Grade Concentration & Demographics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Chart 1: Grade Concentration Bar Chart (Soft Violet Ground) */}
          <div className="bg-[#f5f3ff] p-8 rounded-[30px] border border-indigo-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-purple-950 flex items-center gap-2">
                  <FaGraduationCap className="text-purple-600" /> Grade Concentration
                </h3>
                <p className="text-xs text-purple-400 mt-0.5">Which student grades are most represented on the platform</p>
              </div>
              <span className="text-xs bg-purple-200/60 text-purple-900 font-bold px-3 py-1 rounded-full">
                {gradeDistribution.length} Grades Active
              </span>
            </div>

            {gradeDistribution.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No student grade data recorded yet.</p>
            ) : (
              <div className="space-y-4 pt-2">
                {gradeDistribution.map((g) => {
                  const percentage = Math.round((g.count / maxGradeCount) * 100);
                  return (
                    <div key={g.grade} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-purple-950 font-bold">{g.grade}</span>
                        <span className="text-purple-900 font-bold">{g.count} Students ({g.online} Online / {g.physical} Physical)</span>
                      </div>
                      <div className="w-full bg-purple-100/70 h-3.5 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chart 2: Online vs Physical Ratio per Grade (Soft Slate Indigo Ground) */}
          <div className="bg-[#eef2ff] p-8 rounded-[30px] border border-indigo-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-indigo-950 flex items-center gap-2">
                  <FaGlobe className="text-indigo-600" /> Online vs Physical Mode Split per Grade
                </h3>
                <p className="text-xs text-indigo-400 mt-0.5">Ratio of online to physical students per grade level</p>
              </div>
              <div className="flex gap-2 text-xs font-bold">
                <span className="px-2 py-0.5 bg-red-500 text-white rounded">Online</span>
                <span className="px-2 py-0.5 bg-indigo-900 text-white rounded">Physical</span>
              </div>
            </div>

            {gradeDistribution.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">No grade mode data available.</p>
            ) : (
              <div className="space-y-5 pt-2">
                {gradeDistribution.map((g) => {
                  const totalInGrade = g.count || 1;
                  const onlineRatio = Math.round((g.online / totalInGrade) * 100);
                  const physicalRatio = 100 - onlineRatio;
                  return (
                    <div key={g.grade} className="space-y-1.5">
                      <div className="flex justify-between items-center text-sm font-semibold">
                        <span className="text-indigo-950 font-bold">{g.grade}</span>
                        <span className="text-xs text-indigo-600 font-bold">{onlineRatio}% Online / {physicalRatio}% Physical</span>
                      </div>
                      <div className="w-full bg-indigo-900 h-4 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                          className="bg-red-500 h-full transition-all duration-500"
                          style={{ width: `${onlineRatio}%` }}
                          title={`${onlineRatio}% Online`}
                        ></div>
                        <div 
                          className="bg-indigo-900 h-full transition-all duration-500"
                          style={{ width: `${physicalRatio}%` }}
                          title={`${physicalRatio}% Physical`}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Section 3: Most Taken Courses Leaderboard (Soft Warm Gold Ground) */}
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
                    {/* Rank Badge */}
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

                    {/* Student Progress Bar */}
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

        {/* Section 4: Revenue Contribution by Course Chart (Soft Emerald Ground) */}
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

      </div>
    </div>
  );
};

export default Analytics;
