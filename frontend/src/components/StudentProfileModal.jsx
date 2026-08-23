import React, { useState, useEffect } from 'react';
import { 
  FaUserGraduate, 
  FaEnvelope, 
  FaIdCard, 
  FaPhone, 
  FaBookOpen, 
  FaTimes, 
  FaChalkboardTeacher, 
  FaGraduationCap, 
  FaComments,
  FaCheckCircle
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

const StudentProfileModal = ({ isOpen, onClose, studentId, onSelectPrivateChat, containerScoped = false }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  const student = profileData?.student;
  const enrolledCourses = profileData?.enrolledCourses || [];

  return (
    <div 
      className={
        containerScoped
          ? "absolute inset-0 z-50 flex items-center justify-center p-2 sm:p-3 bg-slate-950/60 backdrop-blur-xs animate-fadeIn select-none overflow-hidden"
          : "fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn select-none overflow-hidden"
      }
      onClick={onClose}
    >
      <div 
        className={
          containerScoped
            ? "relative w-full h-full max-h-full bg-white rounded-2xl border border-gray-200 shadow-2xl p-3.5 sm:p-4.5 text-gray-900 animate-in zoom-in-95 duration-200 flex flex-col overflow-hidden"
            : "relative w-full max-w-[480px] sm:max-w-[520px] bg-white rounded-3xl border border-gray-100 shadow-2xl shadow-purple-950/20 p-5 sm:p-6 text-gray-900 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] overflow-hidden"
        }
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-gray-100/90 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer z-10 shadow-xs"
          title="Close details"
        >
          <FaTimes className="text-xs sm:text-sm" />
        </button>

        {loading ? (
          <div className="py-12 sm:py-16 flex flex-col items-center justify-center text-center space-y-3">
            <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-3 border-purple-600 border-t-transparent"></div>
            <p className="text-xs sm:text-sm font-bold text-gray-600">Loading student details...</p>
          </div>
        ) : error ? (
          <div className="py-8 sm:py-12 text-center space-y-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-xl sm:text-2xl mx-auto border border-red-200">
              ⚠️
            </div>
            <p className="text-xs sm:text-sm font-bold text-red-600">{error}</p>
          </div>
        ) : student ? (
          <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 pr-1 custom-scrollbar">
            {/* Header / Avatar & Info */}
            <div className="flex items-start gap-3 border-b border-gray-100 pb-3">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-800 text-white flex items-center justify-center text-xl sm:text-2xl font-black shadow-md shadow-purple-600/20 border-2 border-purple-100 ring-2 sm:ring-4 ring-purple-50 shrink-0 overflow-hidden">
                {student.profilePicture ? (
                  <img 
                    src={getImageUrl(student.profilePicture)} 
                    alt={student.name} 
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

              <div className="min-w-0 flex-1 pr-6">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm sm:text-base font-black text-gray-950 tracking-tight leading-snug truncate">
                    {student.name}
                  </h3>
                  {student.grade && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 font-extrabold text-[10px] sm:text-xs border border-purple-200/80 shrink-0 shadow-2xs">
                      {formatGrade(student.grade)}
                    </span>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {student.studentType && (
                    <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-extrabold capitalize border shadow-2xs ${
                      student.studentType === 'physical' 
                        ? 'bg-amber-50 text-amber-900 border-amber-200' 
                        : 'bg-emerald-50 text-emerald-900 border-emerald-200'
                    }`}>
                      {student.studentType} Student
                    </span>
                  )}
                </div>

                {student.email && (
                  <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-1.5 truncate font-medium">
                    <FaEnvelope className="text-purple-600 text-[11px] shrink-0" />
                    <span className="truncate">{student.email}</span>
                  </p>
                )}

                {student.registrationNumber && (
                  <p className="text-xs text-gray-600 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                    <FaIdCard className="text-purple-600 text-[11px] shrink-0" />
                    <span>Reg No: <strong className="text-gray-900 font-mono font-bold tracking-wide">{student.registrationNumber}</strong></span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick Contact & Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {student.phoneNumber && (
                <div className="p-2.5 bg-gradient-to-br from-purple-50/80 to-indigo-50/40 rounded-xl border border-purple-200/80 shadow-2xs">
                  <span className="text-purple-800 text-[10.5px] uppercase font-extrabold flex items-center gap-1 tracking-wide">
                    <FaPhone className="text-purple-600 text-[10px]" /> Student Phone
                  </span>
                  <p className="font-extrabold text-gray-900 mt-0.5 text-xs sm:text-sm font-mono">{student.phoneNumber}</p>
                </div>
              )}

              {student.parentsPhoneNumber && (
                <div className="p-2.5 bg-gradient-to-br from-amber-50/80 to-orange-50/40 rounded-xl border border-amber-200/90 shadow-2xs">
                  <span className="text-amber-900 text-[10.5px] uppercase font-extrabold flex items-center gap-1 tracking-wide">
                    <FaPhone className="text-amber-600 text-[10px]" /> Parent Phone
                  </span>
                  <p className="font-extrabold text-gray-900 mt-0.5 text-xs sm:text-sm font-mono">{student.parentsPhoneNumber}</p>
                </div>
              )}
            </div>

            {/* Assigned & Enrolled Courses Section */}
            <div className="space-y-2 pt-0.5">
              <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                <h4 className="text-[11px] sm:text-xs font-black uppercase text-gray-800 tracking-wider flex items-center gap-1.5">
                  <FaBookOpen className="text-purple-700" />
                  <span>Enrolled Courses</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-900 font-extrabold text-[10.5px]">
                    {enrolledCourses.length}
                  </span>
                </h4>
              </div>

              {enrolledCourses.length === 0 ? (
                <p className="text-xs text-gray-400 italic p-3 bg-gray-50 rounded-xl text-center">
                  No other enrolled courses found for this student.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-36 sm:max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                  {enrolledCourses.map(course => {
                    const courseImg = getImageUrl(course.cardImage || course.banner);

                    return (
                      <div 
                        key={course._id}
                        className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl border border-gray-200/90 bg-gray-50/70 hover:bg-purple-50/50 hover:border-purple-300 hover:shadow-xs transition-all duration-200 gap-2.5 shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-100 text-purple-900 flex items-center justify-center text-sm shrink-0 overflow-hidden font-black border border-purple-200 shadow-2xs">
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
                            <div className={`${courseImg ? 'hidden' : 'flex'} w-full h-full items-center justify-center bg-gradient-to-tr from-purple-700 to-indigo-600 text-white text-xs sm:text-sm`}>
                              <FaGraduationCap />
                            </div>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h5 className="font-extrabold text-xs sm:text-sm text-gray-950 truncate leading-snug">
                              {course.title}
                            </h5>
                            <p className="text-[10.5px] sm:text-xs text-gray-500 font-medium truncate mt-0.2">
                              {course.subject ? `${course.subject} • ` : ''}{formatGrade(course.grade) || 'All Grades'}
                            </p>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-900 border border-emerald-300 font-extrabold text-[10px] shrink-0 shadow-2xs">
                          Active
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            {onSelectPrivateChat && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => {
                    onSelectPrivateChat(student._id, student.name);
                    onClose();
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 text-white font-extrabold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <FaComments className="text-xs sm:text-sm" />
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

