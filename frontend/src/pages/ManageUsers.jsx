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

import StudentIdCard from '../components/StudentIdCard';

const emptyStudentForm = {
  name: '',
  hasEmail: true,
  email: '',
  registrationNumber: '',
  parentsPhoneNumber: '',
  grade: '',
  dateOfBirth: '',
  studentType: 'physical',
  temporaryPassword: 'Student@123'
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
  const [showParentPromptModal, setShowParentPromptModal] = useState(false);
  const [showBatchGradeModal, setShowBatchGradeModal] = useState(false);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [showConfirmBatchModal, setShowConfirmBatchModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // QR Code Pass Modal States
  const [selectedQrStudent, setSelectedQrStudent] = useState(null);
  const [showAllQrModal, setShowAllQrModal] = useState(false);

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

  const handleAutoGenerateRegNo = () => {
    const digitsMatch = String(studentForm.grade || '').match(/\d+/);
    const gradeNum = digitsMatch ? digitsMatch[0].padStart(2, '0') : '00';
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const prefix = studentForm.studentType === 'online' ? 'OL' : 'REG';
    const generated = `${prefix}-G${gradeNum}-${year}-${randomSeq}`;
    handleStudentFieldChange('registrationNumber', generated);
    toast.success(`Generated: ${generated}`);
  };

  // Called when Admin submits the registration form -> Opens Parent Account Prompt Modal
  const handleOpenParentPrompt = (e) => {
    e.preventDefault();
    if (!studentForm.name || !studentForm.parentsPhoneNumber || !studentForm.grade) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (studentForm.hasEmail && !studentForm.email) {
      toast.error("Please enter email address or select 'Phone Only'.");
      return;
    }
    setShowParentPromptModal(true);
  };

  // Executes the creation with user's answer for Parent Account
  const executeCreateStudent = async (createParentAccount) => {
    setCreating(true);

    try {
      const res = await api.post(
        '/auth/users',
        {
          name: studentForm.name,
          email: studentForm.hasEmail ? studentForm.email : undefined,
          registrationNumber: studentForm.registrationNumber || undefined,
          parentsPhoneNumber: studentForm.parentsPhoneNumber,
          grade: studentForm.grade,
          dateOfBirth: studentForm.dateOfBirth ? studentForm.dateOfBirth : undefined,
          temporaryPassword: studentForm.temporaryPassword,
          role: 'student',
          studentType: studentForm.studentType || 'physical',
          createParentAccount
        }
      );

      setUsers((currentUsers) => [res.data.user, ...currentUsers]);
      setStudentForm(emptyStudentForm);
      setShowParentPromptModal(false);
      setShowRegisterStudentModal(false);
      setActiveTab('student');
      
      const parentMsg = createParentAccount ? ' Parent account linked!' : ' (No parent account created).';
      toast.success(`Student account created for ${res.data.user.name}.${parentMsg}`);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-16 text-gray-500 dark:text-gray-400 font-bold gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 dark:border-purple-400"></div>
        <span className="text-xs animate-pulse">Loading system users...</span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 font-sans text-gray-800 dark:text-gray-100 transition-colors duration-200">

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white font-sans tracking-tight flex items-center gap-2">
            User Management
          </h2>
          <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            Total System Users: <span className="font-bold text-gray-800 dark:text-white">{users.length}</span>
          </p>
        </div>

        {/* Action Buttons: Responsive 2x2 grid on mobile, flex row on desktop */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5 w-full lg:w-auto">
          <button
            type="button"
            onClick={() => setShowRegisterStudentModal(true)}
            className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-[11px] sm:text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center"
          >
            <FaUserGraduate className="text-amber-400 text-xs sm:text-sm shrink-0" />
            <span className="truncate">Register Student</span>
          </button>

          <button
            type="button"
            onClick={() => setShowBatchGradeModal(true)}
            className="px-3 sm:px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 font-bold text-[11px] sm:text-xs rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center"
          >
            <FaSyncAlt className="text-indigo-600 dark:text-indigo-400 text-xs shrink-0" />
            <span className="truncate">Batch Grade</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAllQrModal(true)}
            className="px-3 sm:px-4 py-2.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 font-bold text-[11px] sm:text-xs rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer shadow-2xs text-center"
          >
            <FaQrcode className="text-emerald-700 dark:text-emerald-400 text-xs shrink-0" />
            <span className="truncate">Student QR Cards</span>
          </button>

          <button
            type="button"
            onClick={() => setShowAddStaffModal(true)}
            className="px-3 sm:px-4 py-2.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 font-bold text-[11px] sm:text-xs rounded-xl transition flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer text-center"
          >
            <FaPlus className="text-purple-700 dark:text-purple-400 text-xs shrink-0" />
            <span className="truncate">Add Staff</span>
          </button>
        </div>
      </div>

      {/* Search & Role Filter Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-2 border-b border-gray-100 dark:border-slate-800">

        {/* Category Tabs: 3x2 Grid on Mobile, Flex Row on Desktop */}
        <div className="grid grid-cols-3 sm:flex sm:space-x-2 gap-1.5 sm:gap-2 w-full md:w-auto">
          {[
            { id: 'All', label: 'All', fullLabel: 'All Users', count: users.length },
            { id: 'student', label: 'Students', fullLabel: 'Students', count: users.filter(u => u.role === 'student').length },
            { id: 'teacher', label: 'Teachers', fullLabel: 'Teachers', count: users.filter(u => u.role === 'teacher').length },
            { id: 'counter_staff', label: 'Staff', fullLabel: 'Counter Staff', count: users.filter(u => u.role === 'counter_staff').length },
            { id: 'parent', label: 'Parents', fullLabel: 'Parents', count: users.filter(u => u.role === 'parent').length },
            { id: 'admin', label: 'Admins', fullLabel: 'Admins', count: users.filter(u => u.role === 'admin').length }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 sm:px-3.5 py-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center ${activeTab === tab.id
                  ? 'bg-[#2d1b64] text-white shadow-sm'
                  : 'bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'
                }`}
            >
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.fullLabel}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-extrabold ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300'
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
            className="w-full pl-9 pr-3.5 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-medium"
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

      {/* Users Table (Desktop View - hidden on mobile < md) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300 uppercase text-[11px] tracking-wider border-b border-gray-200 dark:border-slate-700 font-bold">
              <th className="p-3.5 pl-4">User</th>
              <th className="p-3.5">Email</th>
              <th className="p-3.5">Type</th>
              <th className="p-3.5">Reg No.</th>
              <th className="p-3.5">Grade</th>
              <th className="p-3.5">Parent Phone</th>
              <th className="p-3.5">Current Role</th>
              <th className="p-3.5">Password</th>
              <th className="p-3.5">Joined</th>
              <th className="p-3.5 text-center">QR Pass</th>
              <th className="p-3.5 text-right pr-4">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-xs">
            {paginatedUsers.length > 0 ? (
              paginatedUsers.map((u) => (
                <tr key={u._id} className="hover:bg-purple-50/30 dark:hover:bg-slate-800/60 transition-colors">

                  {/* User Name & Icon */}
                  <td className="p-3.5 pl-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-sm shadow-xs shrink-0">
                      {getRoleIcon(u.role)}
                    </div>
                    <div>
                      <span className="font-bold text-gray-900 dark:text-white block leading-tight">{u.name}</span>
                      <span className="text-[10px] text-gray-400 capitalize">{u.role}</span>
                    </div>
                  </td>

                  {/* Email */}
                  <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">{u.email}</td>

                  {/* Student Type */}
                  <td className="p-3.5">
                    {u.role === 'student' ? (
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${u.studentType === 'online'
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        }`}>
                        {u.studentType === 'online' ? 'Online' : 'Physical'}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Registration Number */}
                  <td className="p-3.5 font-mono font-semibold text-gray-700 dark:text-gray-300">{u.registrationNumber || '-'}</td>

                  {/* Grade Select for Students */}
                  <td className="p-3.5">
                    {u.role === 'student' ? (
                      <select
                        value={u.grade || ''}
                        onChange={(e) => handleGradeChange(u._id, e.target.value)}
                        className="text-xs border border-gray-200 dark:border-slate-700 rounded-lg px-2 py-1 bg-white dark:bg-slate-800 text-gray-800 dark:text-white font-medium outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
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
                  <td className="p-3.5 text-gray-600 dark:text-gray-300 font-medium">{u.parentsPhoneNumber || '-'}</td>

                  {/* Current Role Select (Including Parent Role!) */}
                  <td className="p-3.5">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className={`text-xs border rounded-xl px-3 py-1.5 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-purple-500 transition-all ${u.role === 'admin'
                          ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                          : u.role === 'teacher'
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            : u.role === 'counter_staff'
                              ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                              : u.role === 'parent'
                                ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                                : 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
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
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                        : 'bg-green-100 dark:bg-green-950/60 text-green-800 dark:text-green-300'
                      }`}>
                      {u.mustChangePassword ? 'Temporary' : 'Updated'}
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="p-3.5 text-gray-500 dark:text-gray-400 text-xs">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>

                  {/* QR Code Pass Button */}
                  <td className="p-3.5 text-center">
                    {u.role === 'student' ? (
                      <button
                        onClick={() => setSelectedQrStudent(u)}
                        className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800 font-bold text-[11px] rounded-lg transition flex items-center gap-1.5 mx-auto cursor-pointer shadow-2xs"
                        title="View Official Student QR Pass"
                      >
                        <FaQrcode className="text-purple-700 dark:text-purple-400 text-xs" />
                        <span>QR Pass</span>
                      </button>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-right pr-4">
                    {currentUserId !== u._id && (
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
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
                <td colSpan="11" className="p-10 text-center text-gray-500 dark:text-gray-400 font-medium">
                  No users found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile User Cards View (visible only on mobile < md) */}
      <div className="md:hidden space-y-3">
        {paginatedUsers.length > 0 ? (
          paginatedUsers.map((u) => (
            <div key={u._id} className="bg-white dark:bg-slate-800/90 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs space-y-3 overflow-hidden">
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-slate-700 flex items-center justify-center text-sm shrink-0">
                    {getRoleIcon(u.role)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                      <span className="truncate">{u.name}</span>
                      {currentUserId === u._id && (
                        <span className="text-[9px] bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 font-extrabold px-1.5 py-0.5 rounded shrink-0">You</span>
                      )}
                    </h4>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{u.email || 'No Email'}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold capitalize border shrink-0 whitespace-nowrap ${
                  u.role === 'admin'
                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                    : u.role === 'teacher'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                    : u.role === 'counter_staff'
                    ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {u.role?.replace('_', ' ')}
                </span>
              </div>

              <div className="bg-gray-50 dark:bg-slate-900/60 p-3 rounded-xl border border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
                {u.registrationNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Reg Number</span>
                    <span className="font-mono font-bold text-purple-950 dark:text-purple-300 text-[11px]">{u.registrationNumber}</span>
                  </div>
                )}
                {u.grade && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Grade</span>
                    <span className="font-bold text-gray-800 dark:text-white text-[11px]">{u.grade}</span>
                  </div>
                )}
                {u.studentType && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Mode</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-[11px]">
                      {u.studentType === 'physical' ? '🏫 Physical' : '💻 Online'}
                    </span>
                  </div>
                )}
                {u.parentsPhoneNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Parent Phone</span>
                    <span className="font-mono text-gray-700 dark:text-gray-300 text-[11px]">{u.parentsPhoneNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 dark:text-gray-400 text-[10px] font-bold uppercase">Joined Date</span>
                  <span className="text-gray-600 dark:text-gray-400 text-[11px]">{new Date(u.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                {u.role === 'student' ? (
                  <button
                    onClick={() => setSelectedQrStudent(u)}
                    className="px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold text-xs rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <FaQrcode className="text-purple-700 dark:text-purple-400 text-xs" />
                    <span>View QR Pass</span>
                  </button>
                ) : (
                  <div></div>
                )}

                {currentUserId !== u._id && (
                  <button
                    onClick={() => handleDelete(u._id, u.name)}
                    className="px-3 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 text-red-600 dark:text-red-300 font-bold text-xs rounded-xl transition flex items-center gap-1 cursor-pointer border border-red-200 dark:border-red-900/40"
                  >
                    <FaTrash className="text-[10px]" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-200 dark:border-slate-800 text-gray-500 dark:text-gray-400 font-medium text-xs">
            No users found matching query.
          </div>
        )}
      </div>

      {/* Pagination Footer (25 records per page) */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-slate-800">
        <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">
          Showing <span className="font-extrabold text-gray-800 dark:text-white">{filteredUsers.length === 0 ? 0 : startIndex + 1}</span> to{' '}
          <span className="font-extrabold text-gray-800 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of{' '}
          <span className="font-extrabold text-gray-800 dark:text-white">{filteredUsers.length}</span> users
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
          >
            <FaChevronLeft className="text-[10px]" /> Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${currentPage === pageNum
                  ? 'bg-[#2d1b64] text-white shadow-sm'
                  : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'
                }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || filteredUsers.length === 0}
            className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer flex items-center gap-1"
          >
            Next <FaChevronRight className="text-[10px]" />
          </button>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* POPUP MODAL 1: REGISTER NEW STUDENT (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* POPUP MODAL 1: REGISTER NEW STUDENT (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {showRegisterStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 animate-fadeIn my-8 text-gray-800 dark:text-gray-100">

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
                    Admin Manual Registration (Automatically Verified, Auto Parent Account Linking)
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleOpenParentPrompt} className="p-6 md:p-8 space-y-4">

              {/* Registration Options Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-purple-50/60 dark:bg-slate-800/60 p-3 rounded-2xl border border-purple-100 dark:border-slate-700">
                {/* Email Option Toggle */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-950 dark:text-purple-300 mb-1">
                    Email Account Option
                  </label>
                  <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border border-purple-200 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => handleStudentFieldChange('hasEmail', true)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        studentForm.hasEmail ? 'bg-purple-900 dark:bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      ✉️ With Email
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleStudentFieldChange('hasEmail', false);
                        handleStudentFieldChange('email', '');
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        !studentForm.hasEmail ? 'bg-purple-900 dark:bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      📱 Phone Only
                    </button>
                  </div>
                </div>

                {/* Student Type Selector */}
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-950 dark:text-purple-300 mb-1">
                    Student Type / Mode
                  </label>
                  <select
                    value={studentForm.studentType}
                    onChange={(e) => handleStudentFieldChange('studentType', e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-white outline-none cursor-pointer focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="physical">🏛️ Physical Classroom Student</option>
                    <option value="online">💻 Online Student</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Student Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Kasun Perera"
                    value={studentForm.name}
                    onChange={(e) => handleStudentFieldChange('name', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                    required
                  />
                </div>

                {/* Email Address (Conditional) */}
                {studentForm.hasEmail ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      placeholder="kasun@example.com"
                      value={studentForm.email}
                      onChange={(e) => handleStudentFieldChange('email', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1.5">
                      Email Address (Optional)
                    </label>
                    <input
                      type="text"
                      disabled
                      placeholder="No email provided (Phone Registration)"
                      className="w-full px-4 py-2.5 bg-gray-100 dark:bg-slate-800/50 border border-gray-200 dark:border-slate-700 rounded-xl text-xs text-gray-400 dark:text-gray-500 italic cursor-not-allowed"
                    />
                  </div>
                )}

                {/* Registration Number with Auto-Generate */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                      Registration Number
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateRegNo}
                      className="text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-900 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 px-2 py-0.5 rounded-md transition cursor-pointer border border-purple-200 dark:border-purple-800"
                    >
                      ⚡ Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. REG-G10-2026-1234 or leave blank"
                    value={studentForm.registrationNumber}
                    onChange={(e) => handleStudentFieldChange('registrationNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-mono font-bold"
                  />
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">If left blank, system will auto-assign upon save.</p>
                </div>

                {/* Parent's Phone */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Parent's Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="0771234567"
                    value={studentForm.parentsPhoneNumber}
                    onChange={(e) => handleStudentFieldChange('parentsPhoneNumber', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                    required
                  />
                </div>

                {/* Select Grade */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Current Grade <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={studentForm.grade}
                    onChange={(e) => handleStudentFieldChange('grade', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Grade --</option>
                    {gradeOptions.map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                {/* Date of Birth (Birthday) */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Date of Birth (Birthday)
                  </label>
                  <input
                    type="date"
                    max={new Date().toISOString().split('T')[0]}
                    value={studentForm.dateOfBirth}
                    onChange={(e) => handleStudentFieldChange('dateOfBirth', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold cursor-pointer"
                  />
                </div>

                {/* Temporary Password */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Student@123"
                    value={studentForm.temporaryPassword}
                    onChange={(e) => handleStudentFieldChange('temporaryPassword', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                    required
                  />
                </div>

              </div>

              {/* Notice Box */}
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 p-3 rounded-xl text-amber-900 dark:text-amber-300 text-xs flex gap-2 items-start">
                <span className="text-base">👨‍👩‍👧</span>
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-200">Parent Account Setup Option</p>
                  <p className="text-[11px] text-amber-700 dark:text-amber-400 leading-relaxed mt-0.5">
                    You will be prompted whether to create or link a parent account associated with this phone number after clicking the button below.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRegisterStudentModal(false)}
                  className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FaCheckCircle className="text-amber-400" /> Continue to Register
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP MODAL 1.5: CONFIRM PARENT ACCOUNT CREATION */}
      {/* ========================================================================= */}
      {showParentPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 text-gray-800 dark:text-gray-100">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white text-center relative">
              <button
                onClick={() => setShowParentPromptModal(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-white/10 mx-auto flex items-center justify-center mb-3 border border-white/20 shadow-inner">
                <span className="text-2xl">👨‍👩‍👧</span>
              </div>

              <h3 className="text-xl font-extrabold tracking-tight">Parent Account Setup</h3>
              <p className="text-indigo-200 text-xs mt-1">
                Parent monitoring account configuration for {studentForm.name}
              </p>
            </div>

            {/* Body */}
            <div className="p-6 md:p-8 space-y-5">
              <div className="bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-900/60 rounded-2xl p-4 text-purple-950 dark:text-purple-200 text-xs leading-relaxed">
                <p className="font-bold text-sm text-purple-900 dark:text-purple-300 mb-1">
                  Create Parent Account for this student?
                </p>
                <p className="text-purple-800 dark:text-purple-300">
                  Do you want to create or link a parent account associated with phone number <strong>{studentForm.parentsPhoneNumber}</strong>?
                </p>
                <div className="mt-2.5 pt-2 border-t border-purple-200/80 dark:border-purple-800/60 text-[11px] text-purple-700 dark:text-purple-400">
                  📲 A unique temporary password will be generated and sent via SMS to the parent's phone number.
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={creating}
                  onClick={() => executeCreateStudent(true)}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {creating ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                  ) : (
                    <>
                      <FaCheckCircle className="text-white text-sm" /> Yes, Create / Link Parent Account
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={creating}
                  onClick={() => executeCreateStudent(false)}
                  className="w-full py-3 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  No, Create Student Account Only
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* POPUP MODAL 2: BATCH GRADE UPDATE (Est. Payment Recording Style) */}
      {/* ========================================================================= */}
      {showBatchGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 animate-fadeIn my-8 text-gray-800 dark:text-gray-100">

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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Source Grade (Current) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchSource}
                    onChange={(e) => setBatchSource(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-800 dark:text-white font-semibold cursor-pointer"
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
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Target Grade (Promoted To) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={batchTarget}
                    onChange={(e) => setBatchTarget(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm text-gray-800 dark:text-white font-semibold cursor-pointer"
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
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBatchGradeModal(false)}
                  className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 animate-fadeIn my-8 text-gray-800 dark:text-gray-100">

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
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Account Type / Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={adminForm.role}
                  onChange={(e) => handleAdminFieldChange('role', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-extrabold cursor-pointer"
                  required
                >
                  <option value="admin">🔴 System Administrator (Full Access)</option>
                  <option value="counter_staff">🟣 Attendance Counter Staff (QR Scanner restricted)</option>
                </select>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Nimal Fernando"
                  value={adminForm.name}
                  onChange={(e) => handleAdminFieldChange('name', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                  required
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="nimal@institute.lk"
                  value={adminForm.email}
                  onChange={(e) => handleAdminFieldChange('email', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                  required
                />
              </div>

              {/* Temporary Password */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={adminForm.temporaryPassword}
                  onChange={(e) => handleAdminFieldChange('temporaryPassword', e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs text-gray-800 dark:text-white font-semibold"
                  required
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="px-5 py-2.5 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
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
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl border border-purple-100 dark:border-slate-800 max-w-md w-full mx-4 text-gray-800 dark:text-gray-100">
            <div className="text-center font-sans">
              <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/60 text-amber-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-200 dark:border-amber-800">
                ⚠️
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Confirm Batch Promotion</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs mb-6 leading-relaxed">
                Are you sure you want to promote/change all students currently in <strong className="text-purple-900 dark:text-purple-300 font-bold">{batchSource}</strong> to <strong className="text-purple-900 dark:text-purple-300 font-bold">{batchTarget}</strong>? This action will apply to all matching student accounts.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowConfirmBatchModal(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition cursor-pointer"
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
                    <>
                      <FaCheckCircle className="text-white text-xs" /> Yes, Update Batch
                    </>
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
          <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl shadow-2xl border border-red-100 dark:border-red-900/60 max-w-md w-full mx-4 text-gray-800 dark:text-gray-100">
            <div className="text-center font-sans">
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/60 text-red-500 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 border border-red-200 dark:border-red-800">
                <FaTrash className="text-xl text-red-500" />
              </div>
              <h3 className="text-xl font-extrabold text-gray-900 dark:text-white mb-2">Delete User Account</h3>
              <p className="text-gray-600 dark:text-gray-300 text-xs mb-6 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-red-600 dark:text-red-400 font-bold">{userToDelete.name}</strong>? This action is irreversible.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setUserToDelete(null);
                  }}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition cursor-pointer"
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
      {/* ========================================================================= */}
      {selectedQrStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-purple-100 dark:border-slate-800 text-gray-800 dark:text-gray-100 relative">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-slate-800">
              <h3 className="font-extrabold text-gray-900 dark:text-white text-base flex items-center gap-2">
                <FaQrcode className="text-purple-700 dark:text-purple-400 text-lg" /> Student Official QR Pass Card
              </h3>
              <button
                onClick={() => setSelectedQrStudent(null)}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <FaTimes className="text-xs" />
              </button>
            </div>

            <div className="py-1">
              <StudentIdCard user={selectedQrStudent} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* BATCH ALL STUDENTS QR CODE DIRECTORY MODAL */}
      {/* ========================================================================= */}
      {showAllQrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 border border-purple-100 dark:border-slate-800 text-gray-800 dark:text-gray-100 relative">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="font-black text-gray-900 dark:text-white text-xl flex items-center gap-2">
                  <FaQrcode className="text-purple-700 dark:text-purple-400" /> Student QR Code Pass Directory
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Overview of official QR code passes for all active institute students.</p>
              </div>
              <button
                onClick={() => setShowAllQrModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {users.filter(u => u.role === 'student').map((student) => (
                <div key={student._id} className="p-2 bg-gray-50/60 dark:bg-slate-800/60 rounded-3xl border border-purple-100/80 dark:border-slate-700 shadow-xs">
                  <StudentIdCard user={student} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ManageUsers;
