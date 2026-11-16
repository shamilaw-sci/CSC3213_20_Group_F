/**
 * @file Settings.jsx
 * @description System Settings Page. General administration page to configure institute metadata, academic calendar parameters, and announcement banners.
 */

import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FaCamera, 
  FaTrash, 
  FaUser, 
  FaLock, 
  FaEnvelope, 
  FaUserShield, 
  FaSave,
  FaCopy,
  FaCheck,
  FaPhone,
  FaIdCard,
  FaCheckCircle,
  FaExclamationTriangle,
  FaTimes,
  FaShieldAlt,
  FaSyncAlt,
  FaPlus
} from 'react-icons/fa';

const Settings = () => {
  // Grab current user from local storage
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  // State for the form
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [profilePicture, setProfilePicture] = useState(currentUser?.profilePicture || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedRegNo, setCopiedRegNo] = useState(false);

  // Add Email Modal States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailStep, setEmailStep] = useState(1); // 1: Input email, 2: Input code
  const [newEmailInput, setNewEmailInput] = useState('');
  const [emailCodeInput, setEmailCodeInput] = useState('');
  const [sendingEmailCode, setSendingEmailCode] = useState(false);
  const [verifyingEmailCode, setVerifyingEmailCode] = useState(false);

  const fileInputRef = useRef(null);

  // Sync state if user changes
  useEffect(() => {
    const fetchLatestUser = async () => {
      try {
        const res = await api.get('/auth/me');
        if (res.data) {
          setCurrentUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
          setName(res.data.name || '');
          setEmail(res.data.email || '');
          setProfilePicture(res.data.profilePicture || '');
        }
      } catch (err) {
        console.warn('Could not refresh user profile:', err);
      }
    };
    fetchLatestUser();
  }, []);

  // Handle Copy Reg No
  const handleCopyRegNo = () => {
    if (!currentUser?.registrationNumber) return;
    navigator.clipboard.writeText(currentUser.registrationNumber);
    setCopiedRegNo(true);
    toast.success('Registration number copied to clipboard!');
    setTimeout(() => setCopiedRegNo(false), 2500);
  };

  // Handle file select and size check
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      toast.error("Profile picture size cannot exceed 1MB!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (PNG, JPG, JPEG, GIF)!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicture(reader.result);
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

    if (newPassword && newPassword !== confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    if (newPassword && newPassword.length < 6) {
      return toast.error("New password must be at least 6 characters long!");
    }

    setIsSaving(true);
    try {
      const res = await api.put('/auth/update-profile', 
        { name, newPassword, profilePicture }
      );

      const updated = res.data.user;
      setCurrentUser(updated);
      localStorage.setItem('user', JSON.stringify(updated));
      
      toast.success(res.data.message || 'Profile updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
      
      window.dispatchEvent(new Event('userUpdated')); 

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

  // Add & Verify Email Step 1: Send Code
  const handleSendEmailCode = async (e) => {
    e.preventDefault();
    if (!newEmailInput || !newEmailInput.trim()) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setSendingEmailCode(true);
    try {
      const res = await api.post('/auth/add-email-initiate', { email: newEmailInput.trim() });
      toast.success(res.data.message || 'Verification passcode sent to email!');
      setEmailStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send verification passcode.');
    } finally {
      setSendingEmailCode(false);
    }
  };

  // Add & Verify Email Step 2: Verify Code
  const handleVerifyEmailCode = async (e) => {
    e.preventDefault();
    if (!emailCodeInput || emailCodeInput.trim().length !== 6) {
      toast.error('Please enter the 6-digit code.');
      return;
    }

    setVerifyingEmailCode(true);
    try {
      const res = await api.post('/auth/add-email-verify', {
        email: newEmailInput.trim(),
        code: emailCodeInput.trim()
      });

      const updated = res.data.user;
      setCurrentUser(updated);
      setEmail(updated.email);
      localStorage.setItem('user', JSON.stringify(updated));

      toast.success(res.data.message || 'Email verified and added successfully!');
      setShowEmailModal(false);
      setEmailStep(1);
      setNewEmailInput('');
      setEmailCodeInput('');

      window.dispatchEvent(new Event('userUpdated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to verify email code.');
    } finally {
      setVerifyingEmailCode(false);
    }
  };

  const isStudent = currentUser?.role === 'student';
  const hasVerifiedEmail = !!currentUser?.isEmailVerified && !!currentUser?.email;

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-gray-800 dark:text-gray-100 transition-colors duration-200">
      
      {/* Email Verification Reminder Banner for unverified users */}
      {!hasVerifiedEmail && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-2xl shadow-md p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-white/20 rounded-xl text-xl">⚠️</span>
            <div>
              <h3 className="text-sm font-extrabold tracking-tight">Complete Your Profile: Add Email Address</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Without a verified email, you will miss important class announcements, reminders, and payment receipts.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setEmailStep(1);
              setShowEmailModal(true);
            }}
            className="px-4 py-2 bg-white text-amber-900 font-bold text-xs rounded-xl shadow hover:bg-amber-50 transition cursor-pointer shrink-0 flex items-center gap-1.5"
          >
            <FaPlus className="text-[10px]" /> Add & Verify Email
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-2xl shadow-xl p-8 text-white relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-3xl transform translate-x-20 -translate-y-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">Account Settings</h1>
              {hasVerifiedEmail && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-[11px] font-bold px-2.5 py-1 rounded-full shadow-xs">
                  <FaCheckCircle className="text-emerald-400" /> Verified Account
                </span>
              )}
            </div>
            <p className="text-purple-200 text-xs mt-2">Manage your profile image, account name, security preferences, and system credentials.</p>
          </div>

          {isStudent && currentUser?.registrationNumber && (
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 px-4 flex items-center gap-3 self-start md:self-auto">
              <div>
                <span className="block text-[10px] font-bold text-purple-200 uppercase tracking-wider">Registration Index</span>
                <span className="font-mono font-black text-sm text-white tracking-wide">{currentUser.registrationNumber}</span>
              </div>
              <button
                onClick={handleCopyRegNo}
                title="Copy Registration Number"
                className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition cursor-pointer flex items-center justify-center"
              >
                {copiedRegNo ? <FaCheck className="text-emerald-400 text-xs" /> : <FaCopy className="text-xs" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Profile Picture Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-6 w-full text-left border-b border-gray-50 dark:border-slate-800 pb-3">
            Profile Photo
          </h3>

          <div className="relative group cursor-pointer mb-4" onClick={handleAvatarClick}>
            {/* Avatar Circle */}
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-100 dark:border-slate-700 shadow-inner flex items-center justify-center bg-purple-50 dark:bg-slate-800 transition-transform duration-300 group-hover:scale-[1.02] relative">
              {profilePicture ? (
                <img 
                  src={profilePicture} 
                  alt="Profile Preview" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-purple-700 dark:text-purple-300 text-5xl font-bold bg-purple-100 dark:bg-slate-800">
                  {name ? name.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            {/* Verified Badge on Avatar */}
            {hasVerifiedEmail && (
              <div 
                className="absolute bottom-1 right-1 bg-emerald-500 text-white w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center shadow-md"
                title="Email Verified User"
              >
                <FaCheckCircle className="text-xs" />
              </div>
            )}

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
              className="text-xs font-semibold px-3 py-1.5 bg-purple-50 dark:bg-slate-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Upload New
            </button>
            {profilePicture && (
              <button 
                type="button"
                onClick={handleRemovePhoto}
                className="text-xs font-semibold px-3 py-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <FaTrash className="text-[10px]" /> Remove
              </button>
            )}
          </div>

          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 leading-relaxed max-w-[200px]">
            PNG, JPG, or GIF allowed. Size limit: <span className="font-semibold text-gray-500 dark:text-gray-400">1MB</span>.
          </p>
        </div>

        {/* Main Forms Card */}
        <div className="md:col-span-2 bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-800">
          <form onSubmit={handleUpdate} className="space-y-6">
            
            {/* Form Section: Profile Details */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 border-b border-gray-50 dark:border-slate-800 pb-2">
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Email Field with Verified Status & Add Button */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Email Address</label>
                    {hasVerifiedEmail ? (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <FaCheckCircle /> Verified
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEmailStep(1);
                          setShowEmailModal(true);
                        }}
                        className="text-[10px] font-bold text-purple-700 dark:text-purple-400 hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <FaPlus className="text-[9px]" /> {email ? 'Verify Email' : 'Add Email'}
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <FaEnvelope />
                    </span>
                    <input 
                      type="text" 
                      value={email || '(No email linked)'} 
                      disabled 
                      className={`w-full pl-10 pr-4 py-3 border rounded-xl cursor-not-allowed text-xs font-medium focus:outline-none ${
                        hasVerifiedEmail 
                          ? 'bg-gray-50 dark:bg-slate-800/80 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-slate-700' 
                          : 'bg-amber-50/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-200 dark:border-amber-800 italic'
                      }`} 
                    />
                  </div>
                </div>

                {/* System Role */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">System Role</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                      <FaUserShield />
                    </span>
                    <input 
                      type="text" 
                      value={currentUser?.role?.toUpperCase() || ''} 
                      disabled 
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700 rounded-xl cursor-not-allowed text-xs font-semibold tracking-wide focus:outline-none" 
                    />
                  </div>
                </div>

                {/* Student Registration Number (Student Only) */}
                {isStudent && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Registration Number</label>
                    <div className="relative flex items-center">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-purple-700 dark:text-purple-400">
                        <FaIdCard />
                      </span>
                      <input 
                        type="text" 
                        value={currentUser?.registrationNumber || 'Not Assigned'} 
                        disabled 
                        className="w-full pl-10 pr-12 py-3 bg-purple-50/50 dark:bg-slate-800/80 text-purple-950 dark:text-purple-300 font-mono font-bold border border-purple-200 dark:border-slate-700 rounded-xl cursor-not-allowed text-xs focus:outline-none" 
                      />
                      {currentUser?.registrationNumber && (
                        <button
                          type="button"
                          onClick={handleCopyRegNo}
                          className="absolute right-2.5 px-2 py-1 bg-white dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-slate-600 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-slate-600 rounded-lg text-[10px] font-bold transition cursor-pointer flex items-center gap-1"
                        >
                          {copiedRegNo ? <FaCheck className="text-emerald-600 dark:text-emerald-400" /> : <FaCopy />}
                          <span>{copiedRegNo ? 'Copied' : 'Copy'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Parent's Phone Number (Student Only) */}
                {isStudent && (
                  <div className="space-y-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Parent's Phone Number</label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                        <FaPhone />
                      </span>
                      <input 
                        type="text" 
                        value={currentUser?.parentsPhoneNumber || currentUser?.phoneNumber || 'Not Available'} 
                        disabled 
                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-700 rounded-xl cursor-not-allowed text-xs font-medium focus:outline-none" 
                      />
                    </div>
                  </div>
                )}

              </div>

              {/* Editable: Full Name */}
              <div className="space-y-1 mt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Full Name</label>
                <div className="relative group">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
                    <FaUser />
                  </span>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-xs transition-all shadow-sm font-semibold text-slate-800 dark:text-white"
                    placeholder="Enter your name"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Form Section: Security */}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4 border-b border-gray-50 dark:border-slate-800 pb-2">
                Security & Password
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">New Password</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
                      <FaLock />
                    </span>
                    <input 
                      type="password" 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-xs text-gray-900 dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Confirm Password</label>
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors">
                      <FaLock />
                    </span>
                    <input 
                      type="password" 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none text-xs text-gray-900 dark:text-white transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2">Leave blank to keep your current password.</p>
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full bg-lumina-purple hover:bg-purple-800 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-purple-900/10 hover:shadow-purple-900/20 hover:scale-[1.01] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                <FaSave />
                {isSaving ? 'Saving Changes...' : 'Save All Changes'}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* ADD / VERIFY EMAIL POPUP MODAL */}
      {/* ========================================================================= */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white text-center relative">
              <button
                onClick={() => setShowEmailModal(false)}
                className="absolute top-4 right-4 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition cursor-pointer"
              >
                <FaTimes />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-white/10 mx-auto flex items-center justify-center mb-2.5 border border-white/20 shadow-inner">
                <FaEnvelope className="text-xl text-amber-400" />
              </div>

              <h3 className="text-lg font-extrabold tracking-tight">Add & Verify Email</h3>
              <p className="text-indigo-200 text-xs mt-0.5">
                {emailStep === 1 
                  ? "Enter the email address you wish to link to your account" 
                  : `Enter the 6-digit passcode sent to ${newEmailInput}`}
              </p>
            </div>

            {/* Modal Body */}
            {emailStep === 1 ? (
              <form onSubmit={handleSendEmailCode} className="p-6 md:p-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative rounded-xl bg-slate-100 dark:bg-slate-800 p-3 border border-transparent focus-within:border-purple-300 focus-within:bg-white dark:focus-within:bg-slate-800 transition-colors">
                    <FaEnvelope className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm" />
                    <input
                      type="email"
                      placeholder="student@example.com"
                      value={newEmailInput}
                      onChange={(e) => setNewEmailInput(e.target.value)}
                      className="w-full bg-transparent pl-8 text-xs text-slate-900 dark:text-white outline-none font-medium"
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 py-3 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sendingEmailCode}
                    className="flex-1 py-3 bg-lumina-purple hover:bg-purple-800 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {sendingEmailCode ? 'Sending...' : 'Send Passcode'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyEmailCode} className="p-6 md:p-8 space-y-5">
                <div>
                  <label className="block text-center text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-2">
                    Enter 6-Digit Passcode
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={emailCodeInput}
                    onChange={(e) => setEmailCodeInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[12px] text-2xl font-mono font-black py-3 bg-purple-50 dark:bg-slate-800 border-2 border-purple-200 dark:border-slate-700 focus:border-purple-600 rounded-2xl outline-none text-purple-950 dark:text-purple-300 transition-all shadow-inner"
                    autoFocus
                    required
                  />
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center mt-2">
                    Check your inbox (and spam folder) for the 6-digit code.
                  </p>
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={verifyingEmailCode || emailCodeInput.length !== 6}
                    className="w-full py-3 bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {verifyingEmailCode ? 'Verifying...' : 'Verify & Save Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailStep(1)}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition text-center mt-1 cursor-pointer"
                  >
                    ← Change Email Address
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;