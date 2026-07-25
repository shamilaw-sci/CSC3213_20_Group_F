import React, { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  FaCamera, 
  FaTrash, 
  FaUser, 
  FaLock, 
  FaEnvelope, 
  FaUserShield, 
  FaSave
} from 'react-icons/fa';

const Settings = () => {
  // Grab current user from local storage
  const storedUser = JSON.parse(localStorage.getItem('user'));

  // State for the form
  const [name, setName] = useState(storedUser?.name || '');
  const [email] = useState(storedUser?.email || 'Not Available');
  const [profilePicture, setProfilePicture] = useState(storedUser?.profilePicture || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef(null);

  // Handle file select and size check
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate size (1MB limit = 1048576 bytes)
    if (file.size > 1024 * 1024) {
      toast.error("Profile picture size cannot exceed 1MB!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, GIF)!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result); // Base64 Data URL
    };
    reader.readAsDataURL(file);
  };

  // Remove photo
  const handleRemovePhoto = () => {
    setProfilePicture('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success("Profile photo cleared. Save changes to commit.");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    // Password validation
    if (newPassword && newPassword !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    setIsSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put('http://localhost:5000/api/auth/update-profile', 
        { name, newPassword, profilePicture },
        { headers: { Authorization: `Bearer ${token}` } } // Must send token to prove who we are
      );

      // Update local storage with the new user details so the UI updates instantly
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      toast.success(res.data.message);
      setNewPassword('');
      setConfirmPassword('');
      
      // Force a tiny reload so the header picks up the new details
      window.dispatchEvent(new Event('storage')); 

    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold tracking-tight">Account Settings</h1>
          <p className="text-purple-200 text-sm mt-2">Manage your profile image, account name, security preferences, and system credentials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Picture Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-6 w-full text-left border-b border-gray-50 pb-3">
            Profile Photo
          </h3>

          <div className="relative group cursor-pointer mb-4" onClick={handleAvatarClick}>
            {/* Avatar Circle */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-100 shadow-inner flex items-center justify-center bg-purple-50 transition-transform duration-300 group-hover:scale-[1.02]">
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt="Profile Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-700 text-5xl font-bold bg-purple-100">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <FaCamera className="text-2xl mb-1" />
              <span className="text-xs font-semibold">Upload Photo</span>
            </div>
          </div>

          <input 
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <div className="flex gap-2">
            <button 
              type="button"
              onClick={handleAvatarClick}
              className="text-xs font-semibold px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg transition-colors cursor-pointer"
            >
              Upload New
            </button>
            {profilePicture && (
              <button 
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs font-semibold px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <FaTrash className="text-[10px]" /> Remove
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed max-w-[200px]">
            PNG, JPG, or GIF allowed. Size limit: <span className="font-semibold text-gray-500">1MB</span>.
          </p>
        </div>

        {/* Main Forms Card */}
        <div className="md:col-span-2 bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* Form Section: Profile Details */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 border-b border-gray-50 pb-2">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Readonly: Email */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <FaEnvelope />
                    </span>
                    <input 
                      type="text" 
                      value={email} 
                      disabled 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl cursor-not-allowed text-sm font-medium focus:outline-none" 
                    />
                  </div>
                </div>

                {/* Readonly: Role */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">System Role</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <FaUserShield />
                    </span>
                    <input 
                      type="text" 
                      value={storedUser?.role?.toUpperCase() || ''} 
                      disabled 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 text-gray-500 border border-gray-200 rounded-xl cursor-not-allowed text-sm font-semibold tracking-wide focus:outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Editable: Full Name */}
              <div className="space-y-1 mt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                    <FaUser />
                  </span>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-sm transition-all shadow-sm"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Form Section: Security */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-4 border-b border-gray-50 pb-2">
                Security & Password
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">New Password</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                      <FaLock />
                    </span>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-sm transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Confirm Password</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-purple-600 transition-colors">
                      <FaLock />
                    </span>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-sm transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 mt-2">Leave blank to keep your current password.</p>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-lumina-purple hover:bg-purple-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-900/10 hover:shadow-purple-900/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FaSave />
                {isSaving ? 'Saving Changes...' : 'Save All Changes'}
              </button>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
};

export default Settings;