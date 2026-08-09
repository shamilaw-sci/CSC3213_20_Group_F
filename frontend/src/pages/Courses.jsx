import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { FaGraduationCap, FaCompass, FaBookOpen, FaLock, FaLockOpen } from 'react-icons/fa';
import CourseEnrollmentModal from '../components/CourseEnrollmentModal';
import TeacherModal from '../components/TeacherModal';

const getImageUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  let filename = url;
  if (url.includes('/uploads/')) {
    filename = url.split('/uploads/').pop();
  } else if (url.startsWith('/')) {
    filename = url.substring(1);
  }
  const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${backendBase}/uploads/${filename}`;
};

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState(null);
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState(null);
  const [confirmFullCourseModal, setConfirmFullCourseModal] = useState(null); // { courseId, title, isDeactive }
  const navigate = useNavigate(); 
  const user = JSON.parse(localStorage.getItem('user'));

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses');
      setCourses(res.data);
    } catch (err) {
      console.error("Error fetching courses", err);
      toast.error("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();

    const handleUpdate = () => {
      fetchCourses();
    };

    window.addEventListener('teacherProfileUpdated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('teacherProfileUpdated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const executeToggleFullCourseStatus = async (confirmObj) => {
    if (!confirmObj) return;
    const { courseId, title, isDeactive } = confirmObj;
    const newStatus = isDeactive ? 'active' : 'deactive';

    try {
      await api.put(`/courses/${courseId}/full-status`, { status: newStatus });
      toast.success(`Course "${title}" status set to ${newStatus}`);
      fetchCourses();
    } catch (err) {
      toast.error("Failed to update course status");
    } finally {
      setConfirmFullCourseModal(null);
    }
  };

  const normalizeGrade = (g) => g ? String(g).toLowerCase().replace(/\s+/g, '').replace('grade', '') : '';

  // Helper: check if current student is enrolled in a course
  const isStudentEnrolled = (course) => {
    return course.enrolledStudents?.some(student =>
      student?._id?.toString() === user?.id?.toString() || student?.toString() === user?.id?.toString()
    );
  };

  // Helper: check if a course offers the student's grade (supports single & combination grades)
  const isGradeAllowed = (course) => {
    if (!user?.grade) return false;
    const studentGradeNorm = normalizeGrade(user.grade);
    return course.enrolledGrades?.some(g => {
      const gNum = g.gradeNumber || '';
      const parts = gNum.split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade);
      return parts.includes(studentGradeNorm) || normalizeGrade(gNum) === studentGradeNorm;
    });
  };

  // Helper: check if course target studentType matches student's type (online vs physical)
  const isStudentTypeCompatible = (course) => {
    const targetType = course.studentType || 'all';
    if (targetType === 'all') return true;
    const studentType = user?.studentType || 'physical';
    if (targetType === 'online') return studentType === 'online';
    if (targetType === 'physical') return studentType === 'physical';
    return true;
  };

  // Helper: check if course matches the search query
  const matchesSearch = (course) => {
    if (!searchQuery) return true;
    return course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (course.instructor?.name && course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  // Students: enrolled courses first, then available unenrolled courses matching their grade & student type
  const enrolledCourses = user?.role === 'student'
    ? courses.filter(course => isStudentEnrolled(course) && isGradeAllowed(course) && matchesSearch(course))
    : [];

  const availableCourses = user?.role === 'student'
    ? courses.filter(course => !isStudentEnrolled(course) && isGradeAllowed(course) && isStudentTypeCompatible(course) && matchesSearch(course))
    : [];

  // Admin: all courses | Teacher: only their courses | Students use enrolledCourses + availableCourses
  const filteredCourses = user?.role === 'student'
    ? []
    : (user?.role === 'admin'
      ? courses
      : courses.filter(course => course.instructor?._id?.toString() === user?.id?.toString())
    ).filter(course => matchesSearch(course));

  const [enrollingCourseId, setEnrollingCourseId] = useState(null);

  const handleEnrollStudent = async (courseId, courseTitle) => {
    try {
      setEnrollingCourseId(courseId);
      const res = await api.post(`/courses/${courseId}/enroll`);
      toast.success(res.data?.message || `Successfully enrolled in ${courseTitle}!`);
      const updatedRes = await api.get('/courses');
      setCourses(updatedRes.data);
    } catch (err) {
      toast.error(err.response?.data?.error || "Enrollment failed.");
    } finally {
      setEnrollingCourseId(null);
    }
  };

  const handleCourseClick = (course) => {
    const isDeactive = course.status === 'deactive' || course.isActive === false;
    if (isDeactive) {
      if (user?.role === 'admin') {
        // Admin CAN ALWAYS LOG IN / GO INSIDE!
        navigate(`/course/${course._id}`);
        return;
      }
      toast.error("This course has been deactivated by Admin. Access is restricted.");
      return;
    }
    navigate(`/course/${course._id}`);
  };

  const handleToggleFullCourseStatus = async (e, course) => {
    e.stopPropagation();
    if (user?.role !== 'admin') {
      toast.error("Only Admin can change full course status");
      return;
    }
    const isDeactive = course.status === 'deactive' || course.isActive === false;
    const newStatus = isDeactive ? 'active' : 'deactive';

    try {
      await api.put(`/courses/${course._id}/full-status`, { status: newStatus });
      toast.success(`Full course "${course.title}" set to ${newStatus}`);
      fetchCourses();
    } catch (err) {
      toast.error("Failed to update course status");
    }
  };

  // Reusable course card renderer for Enrolled / Admin / Teacher courses (clickable to open workspace)
  const renderCourseCard = (course) => {
    const courseImg = getImageUrl(course.cardImage || course.banner);
    const isDeactive = course.status === 'deactive' || course.isActive === false;

    return (
      <div 
        key={course._id} 
        onClick={() => handleCourseClick(course)} 
        className={`bg-white rounded-[32px] overflow-hidden shadow-sm border transition-all duration-300 group flex flex-col justify-between cursor-pointer transform hover:-translate-y-1 ${
          isDeactive ? 'border-red-200/90 bg-red-50/20' : 'border-gray-200/80 hover:border-purple-300 hover:shadow-2xl'
        }`}
      >
        <div>
          {/* Card Hero Box (Card Picture in 100% Pure Original Color) */}
          <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-gray-100">
            {courseImg ? (
              <img
                src={courseImg}
                alt={course.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-108 transition-transform duration-700"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-700 via-indigo-900 to-[#2d1b64] flex items-center justify-center">
                <FaBookOpen className="text-6xl text-purple-300/40" />
              </div>
            )}

            {/* TOP LEFT CORNER: Badges & Large Bold Course Title */}
            <div className="absolute inset-0 p-6 flex flex-col justify-start items-start z-10 space-y-2.5">
              {/* Badges Row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {user?.role === 'admin' ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmFullCourseModal({
                        courseId: course._id,
                        title: course.title,
                        isDeactive
                      });
                    }}
                    className={`text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer hover:scale-105 ${
                      isDeactive
                        ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400'
                    }`}
                    title="Admin Privilege: Click to Toggle Course Active / Deactive status"
                  >
                    {isDeactive ? <><FaLock className="text-xs" /> Deactive</> : <><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Active</>}
                  </button>
                ) : (
                  <span className={`text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md flex items-center gap-1.5 ${
                    isDeactive ? 'bg-red-600 text-white border border-red-500' : 'bg-emerald-500 text-white border border-emerald-400'
                  }`}>
                    {isDeactive ? <><FaLock className="text-xs" /> Deactive</> : <><span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span> Active</>}
                  </span>
                )}
                {course.studentType === 'online' && (
                  <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    💻 Online
                  </span>
                )}
                {course.studentType === 'physical' && (
                  <span className="bg-amber-600/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    🏫 Physical
                  </span>
                )}
                {user?.role === 'student' && isStudentEnrolled(course) && (
                  <span className="bg-purple-600/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-purple-400/40 shadow-md">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                    </svg>
                    Enrolled
                  </span>
                )}
              </div>

              {/* Large High-Impact Course Title in Top Left Corner (Black Color with High-Contrast Text Shadow) */}
              <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight leading-tight [text-shadow:_0_2px_8px_rgba(255,255,255,0.95)] group-hover:text-purple-900 transition-colors line-clamp-2">
                {course.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Card Footer (Instructor Info) */}
        <div className="flex items-center justify-between p-4 px-6 bg-white border-t border-gray-100 group/teacher transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {course.instructor?.profilePicture ? (
                <img
                  src={getImageUrl(course.instructor.profilePicture)}
                  alt={course.instructor.name || 'Instructor'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-600/30 group-hover/teacher:ring-purple-600 transition-all duration-300 shadow-md bg-white"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white rounded-full flex items-center justify-center font-extrabold text-lg ring-2 ring-purple-600/30 transition-all duration-300 shadow-md">
                  {course.instructor ? course.instructor.name.charAt(0) : '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-purple-700 font-extrabold uppercase tracking-widest leading-none mb-1">
                INSTRUCTOR
              </p>
              <p className="text-slate-900 font-black text-sm group-hover/teacher:text-purple-900 transition-colors">
                {course.instructor ? course.instructor.name : 'Unassigned'}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dedicated card renderer for Available Courses (clicking card opens course details page)
  const renderAvailableCourseCard = (course) => {
    const courseImg = getImageUrl(course.cardImage || course.banner);
    return (
      <div 
        key={course._id} 
        onClick={() => navigate(`/course/${course._id}`)} 
        className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-200/80 hover:border-purple-300 hover:shadow-2xl transition-all duration-300 group flex flex-col justify-between cursor-pointer transform hover:-translate-y-1"
      >
        <div>
          {/* Card Hero Box (Card Picture in 100% Pure Original Color) */}
          <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-gray-100">
            {courseImg ? (
              <img
                src={courseImg}
                alt={course.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-108 transition-transform duration-700"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-700 via-indigo-900 to-[#2d1b64] flex items-center justify-center">
                <FaBookOpen className="text-6xl text-purple-300/40" />
              </div>
            )}

            {/* TOP LEFT CORNER: Badges & Large Bold Course Title */}
            <div className="absolute inset-0 p-6 flex flex-col justify-start items-start z-10 space-y-2.5">
              {/* Badges Row */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="bg-purple-600/90 backdrop-blur-md text-white text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Available Course
                </span>
                {course.studentType === 'online' && (
                  <span className="bg-blue-600/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    💻 Online
                  </span>
                )}
                {course.studentType === 'physical' && (
                  <span className="bg-amber-600/90 backdrop-blur-md text-white text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                    🏫 Physical
                  </span>
                )}
              </div>

              {/* Large High-Impact Course Title in Top Left Corner (Black Color with High-Contrast Text Shadow) */}
              <h3 className="text-3xl sm:text-4xl font-black text-black tracking-tight leading-tight [text-shadow:_0_2px_8px_rgba(255,255,255,0.95)] group-hover:text-purple-900 transition-colors line-clamp-2">
                {course.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Card Footer (Instructor Info) */}
        <div className="flex items-center justify-between p-4 px-6 bg-white border-t border-gray-100 group/teacher transition-colors">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              {course.instructor?.profilePicture ? (
                <img
                  src={getImageUrl(course.instructor.profilePicture)}
                  alt={course.instructor.name || 'Instructor'}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-purple-600/30 group-hover/teacher:ring-purple-600 transition-all duration-300 shadow-md bg-white"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white rounded-full flex items-center justify-center font-extrabold text-lg ring-2 ring-purple-600/30 transition-all duration-300 shadow-md">
                  {course.instructor ? course.instructor.name.charAt(0) : '?'}
                </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-purple-700 font-extrabold uppercase tracking-widest leading-none mb-1">
                INSTRUCTOR
              </p>
              <p className="text-slate-900 font-black text-sm group-hover/teacher:text-purple-900 transition-colors">
                {course.instructor ? course.instructor.name : 'Unassigned'}
              </p>
            </div>
          </div>

          {user?.role === 'student' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedCourseForEnrollment(course);
                setEnrollModalOpen(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-[#2d1b64] hover:from-purple-700 hover:to-purple-900 text-white font-extrabold text-xs rounded-xl shadow-md transition transform active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              Enroll & Pay Online 💳
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f3f4f6] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d1b64]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f3f4f6] p-4 md:p-10 font-sans text-gray-800">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-800">
              {user?.role === 'admin' ? 'All Courses' : user?.role === 'teacher' ? 'My Teaching Courses' : 'Courses'}
            </h2>
            <p className="text-gray-500 mt-1">
              {user?.role === 'admin' ? 'Manage all courses and educational content' : user?.role === 'teacher' ? 'View and manage your assigned courses' : 'Browse your enrolled and available courses'}
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-8 max-w-md">
          <input
            type="text"
            placeholder="Search courses by title, description or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm transition"
          />
        </div>

        {user?.role === 'student' ? (
          <>
            {/* My Enrolled Courses */}
            <div className="mb-10">
              <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <FaGraduationCap className="text-[#2d1b64]" /> My Enrolled Courses
              </h3>
              {enrolledCourses.length === 0 ? (
                <div className="bg-white p-14 rounded-[30px] text-center shadow-sm border border-gray-100 flex flex-col items-center justify-center">
                  <FaBookOpen className="text-4xl text-purple-300 mb-3" />
                  <p className="text-gray-500 text-lg">You haven't enrolled in any courses yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {enrolledCourses.map((course) => renderCourseCard(course))}
                </div>
              )}
            </div>

            {/* Available Courses for Student's Grade (unenrolled only) */}
            {availableCourses.length > 0 && (
              <div className="mb-10">
                <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <FaCompass className="text-[#2d1b64]" /> Available Courses
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {availableCourses.map((course) => renderAvailableCourseCard(course))}
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Admin / Teacher View */}
            {filteredCourses.length === 0 ? (
              <div className="bg-white p-20 rounded-[30px] text-center shadow-sm flex flex-col items-center justify-center">
                <FaBookOpen className="text-5xl text-purple-300 mb-4" />
                <p className="text-gray-500 text-lg">No courses found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredCourses.map((course) => renderCourseCard(course))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Course Enrollment & Online Payment Gateway Modal */}
      {selectedCourseForEnrollment && (
        <CourseEnrollmentModal
          isOpen={enrollModalOpen}
          onClose={() => {
            setEnrollModalOpen(false);
            setSelectedCourseForEnrollment(null);
          }}
          course={selectedCourseForEnrollment}
          student={user}
          onEnrollSuccess={async () => {
            const res = await api.get('/courses');
            setCourses(res.data);
          }}
        />
      )}

      {/* Full Course Deactivation / Activation Confirmation Modal */}
      {confirmFullCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-purple-100 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md ${
                confirmFullCourseModal.isDeactive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {confirmFullCourseModal.isDeactive ? <FaLockOpen /> : <FaLock />}
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Confirm {confirmFullCourseModal.isDeactive ? 'Course Activation' : 'Course Deactivation'}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Course: <span className="font-extrabold text-purple-900">{confirmFullCourseModal.title}</span>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 text-xs font-semibold text-gray-700 leading-relaxed">
              {confirmFullCourseModal.isDeactive ? (
                <span>Are you sure you want to <strong className="text-emerald-700">activate</strong> this course? Students and teachers will be able to access the course workspace and its grade streams.</span>
              ) : (
                <span>Are you sure you want to <strong className="text-red-600">deactivate</strong> this course? Deactivating will set all grades inside to deactive and restrict access for students and teachers.</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmFullCourseModal(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeToggleFullCourseStatus(confirmFullCourseModal)}
                className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl transition shadow-md cursor-pointer ${
                  confirmFullCourseModal.isDeactive
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                }`}
              >
                Yes, {confirmFullCourseModal.isDeactive ? 'Activate Course' : 'Deactivate Course'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Profile Modal */}
      {selectedTeacherForModal && (
        <TeacherModal
          teacher={selectedTeacherForModal}
          isOpen={!!selectedTeacherForModal}
          onClose={() => setSelectedTeacherForModal(null)}
        />
      )}
    </div>
  );
};

export default Courses;