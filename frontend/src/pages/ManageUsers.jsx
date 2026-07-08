import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  FaChalkboardTeacher,
  FaPlus,
  FaTrash,
  FaUserGraduate,
  FaUserShield
} from 'react-icons/fa';

const emptyStudentForm = {
  name: '',
  email: '',
  registrationNumber: '',
  parentsPhoneNumber: '',
  grade: '',
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
  const [studentForm, setStudentForm] = useState(emptyStudentForm);
  const [batchSource, setBatchSource] = useState('');
  const [batchTarget, setBatchTarget] = useState('');
  const [updatingBatch, setUpdatingBatch] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const getAuthHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fetchUsers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/users', {
        headers: getAuthHeaders()
      });
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
      const res = await axios.post(
        'http://localhost:5000/api/auth/users',
        {
          ...studentForm,
          role: 'student'
        },
        { headers: getAuthHeaders() }
      );

      setUsers((currentUsers) => [res.data.user, ...currentUsers]);
      setStudentForm(emptyStudentForm);
      setActiveTab('student');
      toast.success('Student account created. Temporary password change is required on first login.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create student');
    } finally {
      setCreating(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axios.put(
        `http://localhost:5000/api/auth/users/${userId}/role`,
        { role: newRole },
        { headers: getAuthHeaders() }
      );

      toast.success('User role updated!');
      setUsers(users.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      toast.error('Failed to update role');
    }
  };

  const handleGradeChange = async (userId, newGrade) => {
    try {
      await axios.put(
        `http://localhost:5000/api/auth/users/${userId}/grade`,
        { grade: newGrade },
        { headers: getAuthHeaders() }
      );

      toast.success("Student's grade updated successfully!");
      setUsers(users.map((u) => (u._id === userId ? { ...u, grade: newGrade } : u)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update grade');
    }
  };

  const handleBatchUpdateGrade = (e) => {
    e.preventDefault();
    if (!batchSource || !batchTarget) {
      toast.error("Please select both source and target grades.");
      return;
    }
    if (batchSource === batchTarget) {
      toast.error("Source and target grades must be different.");
      return;
    }
    setShowBatchModal(true);
  };

  const executeBatchUpdate = async () => {
    setUpdatingBatch(true);
    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/users/batch-update-grade',
        { sourceGrade: batchSource, targetGrade: batchTarget },
        { headers: getAuthHeaders() }
      );

      toast.success(res.data.message || 'Batch update completed successfully!');
      fetchUsers();
      setBatchSource('');
      setBatchTarget('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to complete batch update');
    } finally {
      setUpdatingBatch(false);
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${userName}?`)) return;

    try {
      await axios.delete(`http://localhost:5000/api/auth/users/${userId}`, {
        headers: getAuthHeaders()
      });

      toast.success(`${userName} deleted successfully`);
      setUsers(users.filter((u) => u._id !== userId));
    } catch (err) {
      toast.error('Failed to delete user');
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <FaUserShield className="text-red-500" />;
    if (role === 'teacher') return <FaChalkboardTeacher className="text-blue-500" />;
    return <FaUserGraduate className="text-green-500" />;
  };

  const filteredUsers = users.filter((user) => {
    if (activeTab === 'All') return true;
    return user.role === activeTab;
  });

  const currentUserId = JSON.parse(localStorage.getItem('user'))?.id;

  if (loading) return <div className="text-center p-10 text-gray-500 font-bold">Loading users...</div>;

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <p className="text-gray-500 text-sm mt-1">Total Users: {users.length}</p>
        </div>
      </div>

      <form onSubmit={handleCreateStudent} className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
            <FaUserGraduate />
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Add Registered Student</h3>
            <p className="text-sm text-gray-500">Create accounts only after physical institute registration.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Student Full Name"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={studentForm.name}
            onChange={(e) => handleStudentFieldChange('name', e.target.value)}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={studentForm.email}
            onChange={(e) => handleStudentFieldChange('email', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Registration Number"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={studentForm.registrationNumber}
            onChange={(e) => handleStudentFieldChange('registrationNumber', e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Parents Phone Number"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={studentForm.parentsPhoneNumber}
            onChange={(e) => handleStudentFieldChange('parentsPhoneNumber', e.target.value)}
            required
          />
          <select
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none hover:cursor-pointer"
            value={studentForm.grade}
            onChange={(e) => handleStudentFieldChange('grade', e.target.value)}
            required
          >
            <option value="">Select Student's Current Grade</option>
            {gradeOptions.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <input
            type="password"
            placeholder="Temporary Password"
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={studentForm.temporaryPassword}
            onChange={(e) => handleStudentFieldChange('temporaryPassword', e.target.value)}
            required
          />
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 bg-lumina-purple hover:bg-purple-800 cursor-pointer disabled:bg-purple-300 text-white font-bold px-5 py-3 rounded-lg transition"
          >
            <FaPlus />
            {creating ? 'Creating...' : 'Create Student'}
          </button>
        </div>
      </form>

      {/* Batch Grade Update Section */}
      <form onSubmit={handleBatchUpdateGrade} className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-lg">
            🔄
          </div>
          <div>
            <h3 className="font-bold text-gray-800">Batch Grade Promotion / Update</h3>
            <p className="text-sm text-gray-500">Apply grade promotions to a batch of students (e.g. promoting all Grade 8 students to Grade 9).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Source Grade</label>
            <select
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none hover:cursor-pointer"
              value={batchSource}
              onChange={(e) => setBatchSource(e.target.value)}
              required
            >
              <option value="">Select Current Grade</option>
              {gradeOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Target Grade</label>
            <select
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none hover:cursor-pointer"
              value={batchTarget}
              onChange={(e) => setBatchTarget(e.target.value)}
              required
            >
              <option value="">Select New Grade</option>
              {gradeOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              type="submit"
              disabled={updatingBatch}
              className="w-full inline-flex items-center justify-center gap-2 bg-lumina-purple hover:bg-purple-800 cursor-pointer disabled:bg-purple-300 text-white font-bold px-5 py-3 rounded-lg transition"
            >
              {updatingBatch ? 'Updating...' : 'Apply Batch Update'}
            </button>
          </div>
        </div>
      </form>

      <div className="flex border-b border-gray-200 mb-6 space-x-8">
        {['All', 'admin', 'teacher', 'student'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold text-sm capitalize transition-all border-b-2 ${activeTab === tab
              ? 'border-lumina-purple text-lumina-purple'
              : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            {tab === 'All' ? 'All Users' : `${tab}s`}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Registration No.</th>
              <th className="p-4 font-semibold">Grade</th>
              <th className="p-4 font-semibold">Parent's Phone</th>
              <th className="p-4 font-semibold">Current Role</th>
              <th className="p-4 font-semibold">Password Status</th>
              <th className="p-4 font-semibold">Joined</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <tr key={u._id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
                      {getRoleIcon(u.role)}
                    </div>
                    <span className="font-medium text-gray-800">{u.name}</span>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{u.email}</td>
                  <td className="p-4 text-gray-600 text-sm">{u.registrationNumber || '-'}</td>
                  <td className="p-4">
                    {u.role === 'student' ? (
                      <select
                        value={u.grade || ''}
                        onChange={(e) => handleGradeChange(u._id, e.target.value)}
                        className="text-sm border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-750 outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                      >
                        <option value="">No Grade</option>
                        {gradeOptions.map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{u.parentsPhoneNumber || '-'}</td>
                  <td className="p-4">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className={`text-sm border rounded-lg px-3 py-1.5 font-medium outline-none cursor-pointer focus:ring-2 focus:ring-purple-500
                        ${u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200'
                          : u.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-green-50 text-green-700 border-green-200'}`}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${u.mustChangePassword
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {u.mustChangePassword ? 'Temporary' : 'Updated'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    {currentUserId !== u._id && (
                      <button
                        onClick={() => handleDelete(u._id, u.name)}
                        className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        title="Delete User"
                      >
                        <FaTrash />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="p-8 text-center text-gray-500">
                  No users found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Batch Promotion Custom Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white p-6 rounded-2xl shadow-2xl border border-gray-150 max-w-md w-full mx-4 transform transition-all scale-100 duration-200">
            <div className="text-center">
              <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center text-3xl mx-auto mb-4 border border-amber-200">
                ⚠️
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Confirm Batch Update</h3>
              <p className="text-gray-500 text-sm mb-6">
                Are you sure you want to promote/change all students currently in <strong className="text-purple-800 font-semibold">{batchSource}</strong> to <strong className="text-purple-800 font-semibold">{batchTarget}</strong>? This action will apply to all students matching this grade.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg text-sm transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowBatchModal(false);
                    executeBatchUpdate();
                  }}
                  disabled={updatingBatch}
                  className="px-5 py-2.5 bg-[#2d1b64] hover:bg-purple-900 cursor-pointer text-white font-semibold rounded-lg text-sm transition flex items-center gap-2 cursor-pointer"
                >
                  {updatingBatch ? 'Updating...' : 'Yes, Update Batch'}
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
