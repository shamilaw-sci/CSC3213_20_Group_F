import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import {
  FaChalkboardTeacher,
  FaPlus,
  FaTrash,
  FaUserGraduate,
  FaUserShield,
  FaQrcode,
  FaUserFriends,
  FaTimes,
  FaSearch,
  FaCheckCircle,
  FaSyncAlt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';

const emptyStudentForm = {
  name: '',
  email: '',
  registrationNumber: '',
  parentsPhoneNumber: '',
  grade: '',
  temporaryPassword: ''
};

const emptyAdminForm = {
  name: '',
  email: '',
  role: 'admin',
  temporaryPassword: ''
};

const gradeOptions = [
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
  "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
  "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
];

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Form States
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [adminForm, setAdminForm] = useState(emptyAdminForm);
  const [batchSource, setBatchSource] = useState('');
  const [batchTarget, setBatchTarget] = useState('');
  const [updatingBatch, setUpdatingBatch] = useState(false);

  // Modal Visibility States
  const [showRegisterStudentModal, setShowRegisterStudentModal] = useState(false);
  const [showBatchGradeModal, setShowBatchGradeModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showConfirmBatchModal, setShowConfirmBatchModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/auth/users');
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load users');
      setLoading(false);
    }
  };

  const handleStudentFieldChange = (field, value) => {
    setStudentForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const handleCreateStudent = async (e) => {
    e.preventDefault();
    setCreating(true);

    try {
      const res = await api.post(
        '/auth/users',
        {
          ...studentForm,
          role: 'student',
          studentType: 'physical'
        }
      );

      setUsers((currentUsers) => [res.data.user, ...currentUsers]);
      setStudentForm(emptyStudentForm);
      setShowRegisterStudentModal(false);
      setActiveTab('student');
      toast.success('Student account created. Temporary password change is required on first login.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  const handleAdminFieldChange = (field, value) => {
    setAdminForm((currentForm) => ({
      ...currentForm,
      [field]: value
    }));
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setCreating(true);
    const targetRole = adminForm.role || 'admin';

    try {
      const res = await api.post(
        '/auth/users',
        {
          name: adminForm.name,
          email: adminForm.email,
          temporaryPassword: adminForm.temporaryPassword,
          role: targetRole
        }
      );

      setUsers((currentUsers) => [res.data.user, ...currentUsers]);
      setAdminForm(emptyAdminForm);
      setShowAddStaffModal(false);
      setActiveTab(targetRole);
      toast.success(`${targetRole === 'counter_staff' ? 'Counter Staff' : 'Admin'} account created successfully.`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user account');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(
        `/auth/users/${userId}/role`,
        { role: newRole }
      );

      toast.success('User role updated!');
      setUsers(users.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleGradeChange = async (userId, newGrade) => {
    try {
      await api.put(
        `/auth/users/${userId}/grade`,
        { grade: newGrade }
      );

      toast.success("Student's grade updated successfully!");
      setUsers(users.map((u) => (u._id === userId ? { ...u, grade: newGrade } : u)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update grade');
    }
  };

  const handleOpenBatchConfirm = (e) => {
    e.preventDefault();
    if (!batchSource || !batchTarget) {
      toast.error("Please select both source and target grades.");
      return;
    }
    if (batchSource === batchTarget) {
      toast.error("Source and target grades must be different.");
      return;
    }
    setShowConfirmBatchModal(true);
  };

  const executeBatchUpdate = async () => {
    setUpdatingBatch(true);
    try {
      const res = await api.post(
        '/auth/users/batch-update-grade',
        { sourceGrade: batchSource, targetGrade: batchTarget }
      );

      toast.success(res.data.message || 'Batch update completed successfully!');
      fetchUsers();
      setBatchSource('');
      setBatchTarget('');
      setShowConfirmBatchModal(false);
      setShowBatchGradeModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete batch update');
    } finally {
      setUpdatingBatch(false);
    }
  };

  const handleDelete = (userId, userName) => {
    setUserToDelete({ id: userId, name: userName });
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (!userToDelete) return;
    const { id: userId, name: userName } = userToDelete;
    try {
      await api.delete(`/auth/users/${userId}`);

      toast.success(`${userName} deleted successfully`);
      setUsers(users.filter((u) => u._id !== userId));
    } catch (err) {
      toast.error('Failed to delete user');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <FaUserShield className="text-red-500" />;
    if (role === 'teacher') return <FaChalkboardTeacher className="text-blue-500" />;
    if (role === 'counter_staff') return <FaQrcode className="text-purple-500" />;
    if (role === 'parent') return <FaUserFriends className="text-amber-500" />;
    return <FaUserGraduate className="text-green-500" />;
  };

  // Filter users by tab and search query
  const filteredUsers = users.filter((user) => {
    const matchesTab = activeTab === 'All' || user.role === activeTab;
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesTab;
    const matchesSearch =
      (user.name && user.name.toLowerCase().includes(q)) ||
      (user.email && user.email.toLowerCase().includes(q)) ||
      (user.registrationNumber && user.registrationNumber.toLowerCase().includes(q)) ||
      (user.grade && user.grade.toLowerCase().includes(q)) ||
      (user.role && user.role.toLowerCase().includes(q)) ||
      (user.parentsPhoneNumber && user.parentsPhoneNumber.toLowerCase().includes(q));
    return matchesTab && matchesSearch;
  });

  // Pagination logic (25 per page)
  const itemsPerPage = 25;
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-gray-500 font-bold">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#2d1b64] mb-3"></div>
        <span>Loading system users...</span>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 font-sans">

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 font-sans tracking-tight flex items-center gap-2">
            User Management
          </h2>
          <p className="text-gray-500 text-xs mt-1">
            Total System Users: <span className="font-bold text-gray-800">{users.length}</span>
          </p>
        </div>

        {/* Action Buttons styled as popups trigger */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowRegisterStudentModal(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer"
          >
            <FaUserGraduate className="text-amber-400 text-sm" />
            <span>+ Register New Student</span>
          </button>

          <button
            onClick={() => setShowBatchGradeModal(true)}
            className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/80 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <FaSyncAlt className="text-indigo-600 text-xs" />
            <span>Batch Grade Update</span>
          </button>

          <button
            onClick={() => setShowAddStaffModal(true)}
            className="px-4 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200/80 font-bold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer"
          >
            <FaPlus className="text-purple-700 text-xs" />
            <span>Add Staff / Admin</span>
          </button>
        </div>
      </div>

      {/* Search & Role Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-2 border-b border-gray-100">

        {/* Category Tabs */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {[
            { id: 'All', label: 'All Users', count: users.length },
            { id: 'student', label: 'Students', count: users.filter(u => u.role === 'student').length },
            { id: 'teacher', label: 'Teachers', count: users.filter(u => u.role === 'teacher').length },
            { id: 'counter_staff', label: 'Counter Staff', count: users.filter(u => u.role === 'counter_staff').length },
            { id: 'parent', label: 'Parents', count: users.filter(u => u.role === 'parent').length },
            { id: 'admin', label: 'Admins', count: users.filter(u => u.role === 'admin').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${activeTab === tab.id
                  ? 'bg-[#2d1b64] text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Input Bar */}
        <div className="relative w-full md:w-64">
          <FaSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            placeholder="Search name, email, reg no, grade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-medium"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
            >
              <FaTimes />
            </button>
          )}
        </div>

      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200/80 shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 text-gray-600 uppercase text-[11px] tracking-wider border-b border-gray-200 font-bold">
              <th className="p-3.5 pl-4">User</th>
              <th className="p-3.5">Email</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Reg No.</th>
              <th className="p-3.5">Grade</th>
              <th className="p-3.5">Parent Phone</th>
              <th className="p-3.5">Current Role</th>
              <th className="p-3.5">Password</th>
              <th className="p-3.5">Joined</th>
              <th className="p-3.5 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((u) => (
                <tr key={u._id} className="hover:bg-purple-50/30 transition-colors">

                  {/* User Name & Icon */}
                  <td className="p-3.5 pl-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-sm shadow-xs shrink-0">
                      {getRoleIcon(u.role)}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 block leading-tight">{u.name}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{u.role}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="p-3.5 text-gray-600 font-medium">{u.email}</td>

                  {/* Student Type */}
                  <td className="p-3.5">
                    {u.role === 'student' ? (
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${u.studentType === 'online'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                        {u.studentType === 'online' ? 'Online' : 'Physical'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Registration Number */}
                  <td className="p-3.5 font-mono font-semibold text-gray-700">{u.registrationNumber || '-'}</td>

                  {/* Grade Select for Students */}
                  <td className="p-3.5">
                    {u.role === 'student' ? (
                      <select
                        value={u.grade || ''}
                        onChange={(e) => handleGradeChange(u._id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-800 font-medium outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="">No Grade</option>
                        {gradeOptions.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Parent's Phone */}
                  <td className="p-3.5 text-gray-600 font-medium">{u.parentsPhoneNumber || '-'}</td>

                  {/* Current Role Select (Including Parent Role!) */}
                  <td className="p-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className={`text-xs border rounded-xl px-3 py-1.5 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-purple-500 transition-all ${u.role === 'admin'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : u.role === 'teacher'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : u.role === 'counter_staff'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : u.role === 'parent'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-green-50 text-green-700 border-green-200'
                        }`}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="counter_staff">Counter Staff</option>
                      <option value="parent">Parent</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>

                  {/* Password Status */}
                  <td className="p-3.5">
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${u.mustChangePassword
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-green-100 text-green-800'
                      }`}>
                      {u.mustChangePassword ? 'Temporary' : 'Updated'}
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="p-3.5 text-gray-500 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right pr-4">
                    {currentUserId !== u._id && (
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        title="Delete User"
                      >
                        <FaTrash className="text-xs" />
                      </button>
                    )}
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="p-10 text-center text-gray-500 font-medium">
                  No users found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer (25 records per page) */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100">
        <div className="text-xs font-semibold text-gray-500">
          Showing <span className="font-extrabold text-gray-800">{filteredUsers.length === 0 ? 0 : startIndex + 1}</span> to{' '}
          <span className="font-extrabold text-gray-800">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of{' '}
          <span className="font-extrabold text-gray-800">{filteredUsers.length}</span> users
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
          >
            <FaChevronLeft className="text-[10px]" /> Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${currentPage === pageNum
                  ? 'bg-[#2d1b64] text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || filteredUsers.length === 0}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
          >
            Next <FaChevronRight className="text-[10px]" />
          </button>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* POPUP MODAL 1: REGISTER NEW STUDENT (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {showRegisterStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 animate-fadeIn my-8">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white relative">
              <button
                onClick={() => setShowRegisterStudentModal(false)}
                className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-3 bg-amber-400 text-purple-950 rounded-2xl text-xl font-black">🎓</span>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">Register New Student</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    Create student accounts after physical institute registration.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateStudent} className="p-6 md:p-8 space-y-5">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Student Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kasun Perera"
                    value={studentForm.name}
                    onChange={(e) => handleStudentFieldChange('name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold"
                    required
                  />
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="kasun@example.com"
                    value={studentForm.email}
                    onChange={(e) => handleStudentFieldChange('email', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold"
                    required
                  />
                </div>

                {/* Registration Number */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Registration Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REG-2026-0891"
                    value={studentForm.registrationNumber}
                    onChange={(e) => handleStudentFieldChange('registrationNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-mono font-bold"
                    required
                  />
                </div>

                {/* Parent's Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Parent's Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="0771234567"
                    value={studentForm.parentsPhoneNumber}
                    onChange={(e) => handleStudentFieldChange('parentsPhoneNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold"
                    required
                  />
                </div>

                {/* Select Grade */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Current Grade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={studentForm.grade}
                    onChange={(e) => handleStudentFieldChange('grade', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Grade --</option>
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Temporary Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={studentForm.temporaryPassword}
                    onChange={(e) => handleStudentFieldChange('temporaryPassword', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold"
                    required
                  />
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterStudentModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="text-amber-400" /> Create Student Account
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* POPUP MODAL 2: BATCH GRADE UPDATE (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {showBatchGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 animate-fadeIn my-8">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white relative">
              <button
                onClick={() => setShowBatchGradeModal(false)}
                className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-3 bg-amber-400 text-purple-950 rounded-2xl text-xl font-black">🔄</span>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">Batch Grade Promotion / Update</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    Promote or update grade for a batch of students (e.g. Grade 8 to Grade 9).
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleOpenBatchConfirm} className="p-6 md:p-8 space-y-6">

              <div className="space-y-4">

                {/* Source Grade */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Source Grade (Current) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchSource}
                    onChange={(e) => setBatchSource(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-800 font-semibold cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Current Grade --</option>
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Arrow indicator */}
                <div className="text-center text-gray-400 font-bold text-lg">
                  ↓
                </div>

                {/* Target Grade */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Target Grade (Promoted To) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchTarget}
                    onChange={(e) => setBatchTarget(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-800 font-semibold cursor-pointer"
                    required
                  >
                    <option value="">-- Choose New Grade --</option>
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowBatchGradeModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <FaSyncAlt className="text-amber-400 text-xs" /> Apply Batch Update
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* POPUP MODAL 3: ADD STAFF / ADMIN ACCOUNT */}
      {/* ========================================================================= */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 animate-fadeIn my-8">

            {/* Header */}
            <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white relative">
              <button
                onClick={() => setShowAddStaffModal(false)}
                className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>

              <div className="flex items-center gap-3">
                <span className="p-3 bg-amber-400 text-purple-950 rounded-2xl text-xl font-black">🛡️</span>
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight">Add Staff / Admin Account</h3>
                  <p className="text-indigo-200 text-xs mt-0.5">
                    Create administrative or counter staff accounts with specialized system access.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateStaff} className="p-6 md:p-8 space-y-4">

              {/* Account Role Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Account Type / Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={adminForm.role}
                  onChange={(e) => handleAdminFieldChange('role', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-extrabold cursor-pointer"
                  required
                >
                  <option value="admin">🔴 System Administrator (Full Access)</option>
                  <option value="counter_staff">🟣 Attendance Counter Staff (QR Scanner restricted)</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nimal Fernando"
                  value={adminForm.name}
                  onChange={(e) => handleAdminFieldChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="nimal@institute.lk"
                  value={adminForm.email}
                  onChange={(e) => handleAdminFieldChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold"
                  required
                />
              </div>

              {/* Temporary Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminForm.temporaryPassword}
                  onChange={(e) => handleAdminFieldChange('temporaryPassword', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 font-semibold"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Creating Staff...
                    </>
                  ) : (
                    <>
                      <FaCheckCircle className="text-amber-400" /> Create Staff Account
                    </>
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* CONFIRM BATCH UPDATE MODAL */}
      {/* ========================================================================= */}
      {showConfirmBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border border-purple-100 max-w-md w-full mx-4">
            <div className="text-center font-sans">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-200">
                ⚠️
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">Confirm Batch Promotion</h3>
              <p className="text-gray-600 text-xs mb-6 leading-relaxed">
                Are you sure you want to promote/change all students currently in <strong className="text-purple-900 font-bold">{batchSource}</strong> to <strong className="text-purple-900 font-bold">{batchTarget}</strong>? This action will apply to all matching student accounts.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowConfirmBatchModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeBatchUpdate}
                  disabled={updatingBatch}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {updatingBatch ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                      Updating Batch...
                    </>
                  ) : (
                    'Yes, Update Batch'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* DELETE USER CONFIRMATION MODAL */}
      {/* ========================================================================= */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-2xl border border-red-100 max-w-md w-full mx-4">
            <div className="text-center font-sans">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-200">
                <FaTrash className="text-xl text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 mb-2">Delete User Account</h3>
              <p className="text-gray-600 text-xs mb-6 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-red-600 font-bold">{userToDelete.name}</strong>? This action is irreversible.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDelete}
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  Yes, Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;
