import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const ChangePassword = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/auth/change-password', 
        { newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const user = JSON.parse(localStorage.getItem('user'));
      user.mustChangePassword = false;
      localStorage.setItem('user', JSON.stringify(user));

      toast.success("Password changed! Redirecting...");
      navigate('/dashboard');
    } catch (err) {
      toast.error("Failed to update password");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="p-8 border rounded shadow-lg">
        <h2 className="text-xl font-bold mb-4">Set New Password</h2>
        <input 
          type="password" 
          placeholder="New Password" 
          className="block w-full p-2 border mb-2"
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <input 
          type="password" 
          placeholder="Confirm Password" 
          className="block w-full p-2 border mb-4"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <button type="submit" className="bg-blue-600 text-white w-full py-2">
          Update Password
        </button>
      </form>
    </div>
  );
};

export default ChangePassword;