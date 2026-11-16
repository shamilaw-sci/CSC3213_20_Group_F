/**
 * @file AuditLogs.jsx
 * @description System Audit Logs Page. Protected administrative page to search, filter, and inspect security audit trails across user logins, course modifications, and system edits.
 */

import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  FaShieldAlt,
  FaSearch,
  FaFilter,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight,
  FaEye,
  FaTimes,
  FaUser,
  FaClock,
  FaCalendarAlt,
  FaExchangeAlt,
  FaLaptop,
  FaInfoCircle
} from 'react-icons/fa';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  // Filter States
  const [search, setSearch] = useState('');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Selected Log for Modal
  const [selectedLog, setSelectedLog] = useState(null);

  // Fetch Stats
  const fetchStats = async () => {
    try {
      const res = await api.get('/audit-logs/stats');
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load audit stats', err);
    }
  };

  // Fetch Logs
  const fetchLogs = async (targetPage = page) => {
    try {
      setLoading(true);
      const params = {
        page: targetPage,
        limit: 20
      };
      if (search.trim()) params.search = search.trim();
      if (entityFilter !== 'ALL') params.entity = entityFilter;
      if (actionFilter !== 'ALL') params.action = actionFilter;
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await api.get('/audit-logs', { params });
      if (res.data?.success) {
        setLogs(res.data.logs || []);
        setTotalPages(res.data.pagination?.totalPages || 1);
        setTotalRecords(res.data.pagination?.total || 0);
        setPage(res.data.pagination?.page || 1);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchLogs(page);
  }, [page, entityFilter, actionFilter, roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLogs(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setEntityFilter('ALL');
    setActionFilter('ALL');
    setRoleFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Action badge color styling
  const getActionBadgeClass = (action) => {
    if (action.includes('CREATE') || action.includes('APPROVE') || action.includes('ENROLL')) {
      return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
    }
    if (action.includes('DELETE') || action.includes('REJECT') || action.includes('REVOKE')) {
      return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
    }
    if (action.includes('UPDATE') || action.includes('CHANGE') || action.includes('OVERRIDE')) {
      return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    }
    if (action.includes('EXPORT') || action.includes('BACKUP')) {
      return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    }
    return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300';
      case 'teacher':
        return 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300';
      case 'counter_staff':
        return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300';
      case 'student':
        return 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300';
      default:
        return 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-5 border-b border-gray-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <FaShieldAlt className="text-xl" />
            </span>
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Audit Log System
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Immutable, tamper-evident security records of all system administrative modifications.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              fetchStats();
              fetchLogs(page);
              toast.success('Audit records refreshed');
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-gray-200 cursor-pointer"
          >
            <FaSyncAlt className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">
              Total Recorded Logs
            </span>
            <span className="text-2xl font-black text-gray-900 dark:text-white mt-1 block">
              {stats.totalLogs?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              Today's Actions
            </span>
            <span className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-1 block">
              {stats.todayLogsCount?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
            <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              Past 7 Days
            </span>
            <span className="text-2xl font-black text-blue-700 dark:text-blue-300 mt-1 block">
              {stats.weekLogsCount?.toLocaleString() || 0}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              Entities Monitored
            </span>
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1 block">
              {stats.entityBreakdown?.length || 0}
            </span>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-gray-50 dark:bg-slate-800/40 p-4 rounded-xl border border-gray-100 dark:border-slate-800 mb-6 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
          <div className="relative flex-1">
            <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by summary, actor name, email, or entity ID..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            Search Logs
          </button>
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-1">
          {/* Entity Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block">
              Entity
            </label>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="ALL">All Entities</option>
              <option value="User">User</option>
              <option value="Payment">Payment</option>
              <option value="Attendance">Attendance</option>
              <option value="Course">Course</option>
              <option value="Enrollment">Enrollment</option>
              <option value="System">System</option>
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block">
              Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="ALL">All Actions</option>
              <option value="USER_CREATE">USER_CREATE</option>
              <option value="USER_UPDATE">USER_UPDATE</option>
              <option value="USER_ROLE_CHANGE">USER_ROLE_CHANGE</option>
              <option value="USER_DELETE">USER_DELETE</option>
              <option value="PAYMENT_RECORD">PAYMENT_RECORD</option>
              <option value="PAYMENT_APPROVE">PAYMENT_APPROVE</option>
              <option value="PAYMENT_REJECT">PAYMENT_REJECT</option>
              <option value="ATTENDANCE_MARK">ATTENDANCE_MARK</option>
              <option value="COURSE_CREATE">COURSE_CREATE</option>
              <option value="COURSE_DELETE">COURSE_DELETE</option>
              <option value="ENROLLMENT_CREATE">ENROLLMENT_CREATE</option>
              <option value="ENROLLMENT_REVOKE">ENROLLMENT_REVOKE</option>
              <option value="DATA_EXPORT">DATA_EXPORT</option>
              <option value="SYSTEM_BACKUP">SYSTEM_BACKUP</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block">
              Actor Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="ALL">All Roles</option>
              <option value="admin">Admin</option>
              <option value="counter_staff">Counter Staff</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1 block">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>

          {/* End Date & Reset */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                End Date
              </label>
              {(search || entityFilter !== 'ALL' || actionFilter !== 'ALL' || roleFilter !== 'ALL' || startDate || endDate) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[10px] text-purple-600 dark:text-purple-400 hover:underline font-bold cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-2 py-1.5 text-xs rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* Main Logs Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/70 border-b border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold text-[10px]">
              <th className="py-3 px-3.5">Timestamp</th>
              <th className="py-3 px-3.5">Actor</th>
              <th className="py-3 px-3.5">Action</th>
              <th className="py-3 px-3.5">Entity</th>
              <th className="py-3 px-3.5">Summary</th>
              <th className="py-3 px-3.5">IP / Device</th>
              <th className="py-3 px-3.5 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-purple-600 border-t-transparent"></div>
                    <span className="text-xs">Loading audit entries...</span>
                  </div>
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-gray-400 dark:text-gray-500">
                  <FaInfoCircle className="mx-auto text-2xl mb-2 opacity-50" />
                  <p className="text-xs font-semibold">No audit logs match your criteria.</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const dateObj = new Date(log.createdAt);
                const formattedDate = dateObj.toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const formattedTime = dateObj.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <tr
                    key={log._id}
                    className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="font-semibold text-gray-900 dark:text-white block">
                        {formattedDate}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {formattedTime}
                      </span>
                    </td>

                    {/* Actor */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {log.actor?.name || 'System'}
                            </span>
                            <span
                              className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md ${getRoleBadgeClass(
                                log.actor?.role
                              )}`}
                            >
                              {log.actor?.role || 'system'}
                            </span>
                          </div>
                          {log.actor?.email && (
                            <span className="text-[10px] text-gray-400 block font-mono">
                              {log.actor.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${getActionBadgeClass(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">
                        {log.entity}
                      </span>
                      {log.entityId && (
                        <span className="text-[10px] text-gray-400 block font-mono truncate max-w-[120px]" title={log.entityId}>
                          #{log.entityId}
                        </span>
                      )}
                    </td>

                    {/* Summary */}
                    <td className="py-3 px-3.5 max-w-xs md:max-w-md">
                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug line-clamp-2">
                        {log.summary}
                      </p>
                    </td>

                    {/* IP & Device */}
                    <td className="py-3 px-3.5 whitespace-nowrap">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono block">
                        {log.ipAddress || 'Internal'}
                      </span>
                      {log.userAgent && (
                        <span
                          className="text-[9px] text-gray-400 block truncate max-w-[110px]"
                          title={log.userAgent}
                        >
                          {log.userAgent.split(' ')[0]}
                        </span>
                      )}
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3 px-3.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors cursor-pointer"
                        title="View Full Audit Snapshot & Diff"
                      >
                        <FaEye className="text-xs" /> Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5 pt-4 border-t border-gray-100 dark:border-slate-800 text-xs text-gray-500 dark:text-gray-400">
        <div>
          Showing page <span className="font-bold text-gray-800 dark:text-white">{page}</span> of{' '}
          <span className="font-bold text-gray-800 dark:text-white">{totalPages}</span> ({totalRecords.toLocaleString()} total events)
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <FaChevronLeft className="text-[10px]" /> Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            Next <FaChevronRight className="text-[10px]" />
          </button>
        </div>
      </div>

      {/* Audit Detail & Diff Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl border border-gray-200 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${getActionBadgeClass(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                  Audit Entry Details
                </h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FaTimes />
              </button>
            </div>

            {/* Summary */}
            <div className="p-3 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/30">
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
                Operation Summary
              </span>
              <p className="text-xs font-semibold text-gray-900 dark:text-white mt-1">
                {selectedLog.summary}
              </p>
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Actor</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedLog.actor?.name}</span>
                <span className="text-[10px] text-gray-500 block">({selectedLog.actor?.role})</span>
              </div>

              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Entity</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedLog.entity}</span>
                {selectedLog.entityId && (
                  <span className="text-[10px] text-gray-500 block font-mono truncate" title={selectedLog.entityId}>
                    #{selectedLog.entityId}
                  </span>
                )}
              </div>

              <div className="p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">Client IP</span>
                <span className="font-mono text-gray-900 dark:text-white font-semibold">
                  {selectedLog.ipAddress || 'Internal'}
                </span>
              </div>

              <div className="col-span-2 sm:col-span-3 p-2.5 rounded-lg bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800">
                <span className="text-[10px] font-bold text-gray-400 block uppercase">User Agent</span>
                <span className="text-[11px] text-gray-700 dark:text-gray-300 font-mono break-all">
                  {selectedLog.userAgent || 'N/A'}
                </span>
              </div>
            </div>

            {/* Diffs (Before & After) */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                <FaExchangeAlt className="text-purple-500" /> State Modification Snapshot
              </h4>

              {selectedLog.diff && (selectedLog.diff.before || selectedLog.diff.after) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  {/* Before */}
                  <div className="p-3 rounded-xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40">
                    <span className="text-[10px] font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1.5">
                      State Before Action
                    </span>
                    <pre className="text-[11px] text-rose-900 dark:text-rose-200 whitespace-pre-wrap overflow-x-auto max-h-48">
                      {selectedLog.diff.before
                        ? JSON.stringify(selectedLog.diff.before, null, 2)
                        : '(None / New Document Creation)'}
                    </pre>
                  </div>

                  {/* After */}
                  <div className="p-3 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40">
                    <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1.5">
                      State After Action
                    </span>
                    <pre className="text-[11px] text-emerald-900 dark:text-emerald-200 whitespace-pre-wrap overflow-x-auto max-h-48">
                      {selectedLog.diff.after
                        ? JSON.stringify(selectedLog.diff.after, null, 2)
                        : '(None / Document Deletion)'}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl bg-gray-50 dark:bg-slate-800/40 border border-gray-100 dark:border-slate-800 text-gray-500 dark:text-gray-400 text-xs">
                  No structural property delta was attached to this transaction.
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
