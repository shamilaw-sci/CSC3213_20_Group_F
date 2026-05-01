import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { FaTrash, FaUserShield, FaUserGraduate, FaChalkboardTeacher } from 'react-icons/fa';

const ManageUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- NEW: Tab Filter State ---
  const [activeTab, setActiveTab] = useState('All'); // Options: 'All', 'admin', 'teacher', 'student'

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:5000/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data);
      setLoading(false);
    } catch (err) {
      toast.error("Failed to load users");
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/auth/users/${userId}/role`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("User role updated!");
      setUsers(users.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${userName}?`)) return;

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/auth/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success(`${userName} deleted successfully`);
      setUsers(users.filter(u => u._id !== userId));
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  const getRoleIcon = (role) => {
    if (role === 'admin') return <FaUserShield className="text-red-500" />;
    if (role === 'teacher') return <FaChalkboardTeacher className="text-blue-500" />;
    return <FaUserGraduate className="text-green-500" />;
  };

  // --- NEW: Filter Logic ---
  // This instantly filters the table data based on which tab is clicked
  const filteredUsers = users.filter(user => {
    if (activeTab === 'All') return true;
    return user.role === activeTab;
  });

  if (loading) return <div className="text-center p-10 text-gray-500 font-bold">Loading users...</div>;

  return (
    <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      
      {/* Header Section */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <p className="text-gray-500 text-sm mt-1">Total Users: {users.length}</p>
        </div>
      </div>

      {/* --- NEW: Tabbed Navigation --- */}
      <div className="flex border-b border-gray-200 mb-6 space-x-8">
        {['All', 'admin', 'teacher', 'student'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-semibold text-sm capitalize transition-all border-b-2 ${
              activeTab === tab 
                ? 'border-lumina-purple text-lumina-purple' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'All' ? 'All Users' : `${tab}s`} 
            {/* Creates dynamic labels: "All Users", "Admins", "Teachers", "Students" */}
          </button>
        ))}
      </div>
      
      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 text-gray-600 uppercase text-xs tracking-wider border-b border-gray-200">
              <th className="p-4 font-semibold">User</th>
              <th className="p-4 font-semibold">Email</th>
              <th className="p-4 font-semibold">Current Role</th>
              <th className="p-4 font-semibold">Joined</th>
              <th className="p-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {/* Notice we are mapping over 'filteredUsers' now instead of 'users' */}
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
                  <td className="p-4">
                    <select 
                      value={u.role}
                      onChange={(e) => handleRoleChange(u._id, e.target.value)}
                      className={`text-sm border rounded-lg px-3 py-1.5 font-medium outline-none cursor-pointer focus:ring-2 focus:ring-purple-500
                        ${u.role === 'admin' ? 'bg-red-50 text-red-700 border-red-200' : 
                          u.role === 'teacher' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          'bg-green-50 text-green-700 border-green-200'}`}
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-4 text-gray-500 text-sm">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    {JSON.parse(localStorage.getItem('user')).id !== u._id && (
                      <button 
                        onClick={() => handleDelete(u._id, u.name)}
                        className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
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
                <td colSpan="5" className="p-8 text-center text-gray-500">
                  No users found in this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ManageUsers;