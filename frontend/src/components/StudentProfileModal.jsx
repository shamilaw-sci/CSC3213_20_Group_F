import React, { useState, useEffect } from 'react';
import { 
  FaUserGraduate, 
  FaEnvelope, 
  FaIdCard, 
  FaPhoneAlt, 
  FaBookOpen, 
  FaTimes, 
  FaChalkboardTeacher, 
  FaGraduationCap, 
  FaComments,
  FaCheckCircle,
  FaPhoneVolume,
  FaCopy,
  FaCheck
} from 'react-icons/fa';
import api from '../utils/api';
import { getMediaUrl } from '../utils/mediaUrl';

const getImageUrl = (url) => getMediaUrl(url);

const formatGrade = (grade) => {
  if (!grade) return '';
  const gStr = String(grade).trim();
  if (gStr.toLowerCase().startsWith('grade')) {
    return gStr;
  }
  return `Grade ${gStr}`;
};

const StudentProfileModal = ({ isOpen, onClose, studentId, initialStudent = null, onSelectPrivateChat, containerScoped = false }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    if (isOpen && studentId) {
      setLoading(true);
      setError(null);
      api.get(`/lessons/student-profile/${studentId}`)
        .then(res => {
          setProfileData(res.data);
        })
        .catch(err => {
          setError(err.response?.data?.error || "Failed to load student profile.");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setProfileData(null);
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const student = profileData?.student || initialStudent;
  const enrolledCourses = profileData?.enrolledCourses || [];

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  return (
    <div 
      className={
        containerScoped
          ? "absolute inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200 select-none overflow-hidden"
          : "fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-hidden"
      }
      onClick={onClose}
    >
      <div 
        className={
          containerScoped
            ? "relative w-full h-full max-h-full bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-4 sm:p-5 text-slate-900 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
            : "relative w-full max-w-[500px] sm:max-w-[540px] bg-white rounded-3xl border border-slate-100 shadow-2xl shadow-purple-950/30 p-5 sm:p-6 text-slate-900 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Accent Gradient Bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-amber-500 rounded-t-3xl" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 w-8.5 h-8.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-20 border border-slate-200/80 shadow-xs"
          title="Close profile details"
        >
          <FaTimes className="text-xs sm:text-sm" />
        </button>

        {loading && !student ? (
          <div className="py-16 flex flex-col items-center justify-center text-center space-y-3.5">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent shadow-md"></div>
            <p className="text-xs sm:text-sm font-extrabold text-slate-600 tracking-wide">Loading student profile...</p>
          </div>
        ) : error && !student ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-2xl mx-auto border border-rose-200 shadow-xs">
              ⚠️
            </div>
            <p className="text-xs sm:text-sm font-extrabold text-rose-600">{error}</p>
          </div>
        ) : student ? (
          <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-4.5 pt-1 pr-1 custom-scrollbar">
            
            {/* 1. HERO PROFILE HEADER CARD */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-slate-50 via-purple-50/30 to-indigo-50/20 border border-slate-200/80 shadow-xs flex items-start gap-3.5 sm:gap-4">
              
              {/* Avatar with Status Ring */}
              <div className="relative shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-800 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md shadow-purple-900/20 border-2 border-white ring-2 ring-purple-400/40 overflow-hidden">
                  {(student.profilePicture || student.avatar) ? (
                    <img 
                      src={getImageUrl(student.profilePicture || student.avatar)} 
                      alt={student.name} 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        if (e.currentTarget.nextSibling) {
                          e.currentTarget.nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <span className={student.profilePicture ? 'hidden' : 'inline'}>
                    {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[9px] text-white font-black shadow-xs" title="Enrolled Student">
                  ✓
                </div>
              </div>

              {/* Student Details */}
              <div className="min-w-0 flex-1 pr-6 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black text-slate-950 tracking-tight leading-snug truncate">
                    {student.name}
                  </h3>
                </div>

                {/* Grade & Student Type Badges */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  {student.grade && (
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold text-[10.5px] sm:text-xs shadow-2xs border border-purple-400/30">
                      {formatGrade(student.grade)}
                    </span>
                  )}
                  {student.studentType && (
                    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] sm:text-xs font-extrabold capitalize border shadow-2xs ${
                      student.studentType === 'physical' 
                        ? 'bg-amber-100 text-amber-950 border-amber-300' 
                        : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                    }`}>
                      {student.studentType} Student
                    </span>
                  )}
                </div>

                {/* Email & Registration Number Tags */}
                <div className="pt-1.5 space-y-1">
                  {student.email && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-slate-200/90 text-xs text-slate-700 font-medium shadow-2xs max-w-full truncate">
                      <FaEnvelope className="text-purple-600 text-xs shrink-0" />
                      <span className="truncate">{student.email}</span>
                    </div>
                  )}

                  {student.registrationNumber && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50/80 border border-purple-200/90 text-xs text-purple-950 font-medium shadow-2xs">
                      <FaIdCard className="text-purple-700 text-xs shrink-0" />
                      <span>Reg No: <strong className="text-purple-950 font-mono font-bold tracking-wide">{student.registrationNumber}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 2. CONTACT PHONES SECTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {student.phoneNumber && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-blue-50/30 border border-indigo-200/80 shadow-2xs flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-indigo-900 text-[10.5px] uppercase font-black tracking-wider flex items-center gap-1.5">
                      <FaPhoneAlt className="text-indigo-600 text-[11px]" />
                      <span>Student Phone</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="font-black text-slate-950 text-sm sm:text-base font-mono tracking-wider">
                      {student.phoneNumber}
                    </span>
                    <a
                      href={`tel:${student.phoneNumber}`}
                      className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[11px] shadow-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <FaPhoneVolume className="text-[10px]" /> Call
                    </a>
                  </div>
                </div>
              )}

              {student.parentsPhoneNumber && (
                <div className={`p-3.5 rounded-2xl bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-amber-100/40 border border-amber-300/80 shadow-2xs flex flex-col justify-between space-y-2 ${!student.phoneNumber ? 'col-span-full' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-amber-950 text-[10.5px] uppercase font-black tracking-wider flex items-center gap-1.5">
                      <FaPhoneAlt className="text-amber-600 text-[11px]" />
                      <span>Parent Phone</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(student.parentsPhoneNumber)}
                      className="text-amber-800 hover:text-amber-950 text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                      title="Copy parent phone"
                    >
                      {copiedPhone ? <FaCheck className="text-emerald-600 text-[10px]" /> : <FaCopy className="text-[10px]" />}
                      <span>{copiedPhone ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="font-black text-amber-950 text-base sm:text-lg font-mono tracking-wider">
                      {student.parentsPhoneNumber}
                    </span>
                    <a
                      href={`tel:${student.parentsPhoneNumber}`}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-black text-xs shadow-xs active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <FaPhoneVolume className="text-xs" /> Call Parent
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* 3. ENROLLED COURSES SECTION */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <FaBookOpen className="text-purple-600 text-sm" />
                  <span>Enrolled Courses</span>
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-950 font-black text-xs border border-purple-200">
                  {enrolledCourses.length} {enrolledCourses.length === 1 ? 'Course' : 'Courses'}
                </span>
              </div>

              {enrolledCourses.length === 0 ? (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center space-y-1">
                  <p className="text-xs text-slate-500 font-bold">No active course enrollments found for this student.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-44 sm:max-h-52 overflow-y-auto pr-1.5 custom-scrollbar">
                  {enrolledCourses.map(course => {
                    const courseImg = getImageUrl(course.cardImage || course.banner);

                    return (
                      <div 
                        key={course._id}
                        className="flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 bg-white hover:bg-purple-50/40 hover:border-purple-300 transition-all duration-200 gap-3 shadow-xs hover:shadow-md hover:-translate-y-0.5 cursor-default group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center text-lg shrink-0 overflow-hidden font-black border border-purple-300/40 shadow-xs group-hover:scale-105 transition-transform">
                            {courseImg ? (
                              <img 
                                src={courseImg} 
                                alt={course.title} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                  if (e.currentTarget.nextSibling) {
                                    e.currentTarget.nextSibling.style.display = 'flex';
                                  }
                                }}
                              />
                            ) : null}
                            <div className={`${courseImg ? 'hidden' : 'flex'} w-full h-full items-center justify-center bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-800 text-white text-sm sm:text-base`}>
                              <FaGraduationCap />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h5 className="font-extrabold text-xs sm:text-sm text-slate-950 truncate leading-snug group-hover:text-purple-900 transition-colors">
                              {course.title}
                            </h5>
                            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold truncate mt-0.5">
                              {course.instructor?.name ? (
                                <span>{course.instructor.name}</span>
                              ) : course.subject && course.subject !== course.title ? (
                                <span>{course.subject}</span>
                              ) : course.grade && course.grade !== 'All Grades' ? (
                                <span>{formatGrade(course.grade)}</span>
                              ) : (
                                <span>Enrolled Course</span>
                              )}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-xl bg-emerald-100 text-emerald-950 border border-emerald-300/90 font-black text-[11px] shrink-0 shadow-2xs flex items-center gap-1">
                          <FaCheckCircle className="text-emerald-600 text-[10px]" />
                          <span>Active</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 4. HERO ACTION BUTTON */}
            {onSelectPrivateChat && (
              <div className="pt-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPrivateChat(student._id, student.name);
                    onClose();
                  }}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-900 text-white font-black text-xs sm:text-sm shadow-lg shadow-purple-900/25 border border-purple-400/30 hover:border-purple-300 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2.5"
                >
                  <FaComments className="text-sm sm:text-base text-purple-200" />
                  <span>Reply Privately to {student.name}</span>
                </button>
              </div>
            )}

          </div>
        ) : null}
      </div>
    </div>
  );
};

export default StudentProfileModal;

