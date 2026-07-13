import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Settings = () => {
  // Grab current user from local storage
  const storedUser = JSON.parse(localStorage.getItem('user'));

  // State for the form
  const [name, setName] = useState(storedUser?.name || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleUpdate = async (e) => {
    e.preventDefault();

    // Password validation
    if (newPassword && newPassword !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5000/api/auth/update-profile', 
        { name, newPassword },
        { headers: { Authorization: `Bearer ${token}` } } // Must send token to prove who we are
      );

      // Update local storage with the new name so the UI updates instantly
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      toast.success(res.data.message);
      setNewPassword('');
      setConfirmPassword('');
      
      // Force a tiny reload so the header picks up the new name
      window.dispatchEvent(new Event('storage')); 

    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Account Settings</h2>
      
      <form onSubmit={handleUpdate} className="space-y-6">
        
        {/* Uneditable Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Role</label>
            <input type="text" value={storedUser?.role.toUpperCase()} disabled className="w-full p-3 bg-gray-100 text-gray-500 border border-gray-200 rounded-lg cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-1">Email</label>
            <input type="text" value="Cannot change email" disabled className="w-full p-3 bg-gray-100 text-gray-500 border border-gray-200 rounded-lg cursor-not-allowed" />
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Editable Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">Full Name</label>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            required
          />
        </div>

        {/* Optional Password Change */}
        <div>
          <label className="block text-sm font-semibold text-gray-600 mb-1">New Password (Optional)</label>
          <input 
            type="password" 
            value={newPassword} 
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Leave blank to keep current password"
            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none mb-3"
          />
          <input 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full p-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
          />
        </div>

        <button type="submit" className="w-full bg-lumina-purple hover:bg-purple-800 text-white font-bold py-3 rounded-lg shadow-md transition-all cursor-pointer">
          Save Changes
        </button>

      </form>
    </div>
  );
};

export default Settings;