import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { FaGraduationCap, FaCompass, FaBookOpen } from 'react-icons/fa';
import CourseEnrollmentModal from '../components/CourseEnrollmentModal';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrollModalOpen, setEnrollModalOpen] = useState(false);
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] = useState(null);
  const navigate = useNavigate(); 
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
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
    fetchCourses();
  }, []);

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

  // Reusable course card renderer for Enrolled / Admin / Teacher courses (clickable to open workspace)
  const renderCourseCard = (course) => (
    <div 
      key={course._id} 
      onClick={() => navigate(`/course/${course._id}`)} 
      className="bg-white p-8 rounded-[30px] shadow-sm border border-transparent hover:border-[#2d1b64]/20 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
    >
      <div>
        {/* Top Meta Details / Card Thumbnail */}
        <div className="mb-6">
          {course.cardImage || course.banner ? (
            <div className="relative h-40 w-full overflow-hidden rounded-2xl mb-4">
              <img
                src={course.cardImage || course.banner}
                alt={course.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-[#f3f4f6] rounded-2xl flex items-center justify-center group-hover:bg-[#2d1b64] transition-colors mb-4">
              <FaBookOpen className="text-xl text-[#2d1b64] group-hover:text-white transition-colors" />
            </div>
          )}
          <div className="flex justify-between items-center w-full flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                Active
              </span>
              {course.studentType === 'online' && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  💻 Online
                </span>
              )}
              {course.studentType === 'physical' && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  🏫 Physical
                </span>
              )}
            </div>
            {user?.role === 'student' && isStudentEnrolled(course) ? (
              <span className="bg-purple-100 text-[#2d1b64] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-purple-200 shadow-sm">
                <svg className="w-3 h-3 text-[#2d1b64]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
                Enrolled
              </span>
            ) : null}
          </div>
        </div>

        {/* Course Title & Description */}
        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-[#2d1b64] transition-colors">
          {course.title}
        </h3>
        <p className="text-gray-500 text-sm mb-6 line-clamp-3 leading-relaxed">
          {course.description}
        </p>
      </div>
      
      {/* Custom Avatar Instructor Section */}
      <div className="flex items-center gap-3 mt-4 pt-6 border-t border-gray-50">
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-[#2d1b64] font-bold border-2 border-white shadow-sm">
          {course.instructor ? course.instructor.name.charAt(0) : '?'}
        </div>
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter leading-none">Instructor</p>
          <p className="text-[#2d1b64] font-bold text-sm">
            {course.instructor ? course.instructor.name : 'Unassigned'}
          </p>
        </div>
      </div>
    </div>
  );

  // Dedicated card renderer for Available Courses (clicking card opens course details page)
  const renderAvailableCourseCard = (course) => (
    <div 
      key={course._id} 
      onClick={() => navigate(`/course/${course._id}`)} 
      className="bg-white p-8 rounded-[30px] shadow-sm border border-gray-100 hover:border-purple-200 hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
    >
      <div>
        {/* Banner / Card Image Preview */}
        <div className="mb-6">
          {course.cardImage || course.banner ? (
            <div className="relative h-44 w-full overflow-hidden rounded-2xl mb-4">
              <img
                src={course.cardImage || course.banner}
                alt={course.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
          ) : (
            <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center text-[#2d1b64] mb-4">
              <FaBookOpen className="text-xl text-[#2d1b64]" />
            </div>
          )}
          <div className="flex justify-between items-center w-full flex-wrap gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="bg-purple-50 text-purple-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest border border-purple-100">
                Available Course
              </span>
              {course.studentType === 'online' && (
                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  💻 Online
                </span>
              )}
              {course.studentType === 'physical' && (
                <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  🏫 Physical
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Course Title & Description */}
        <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-[#2d1b64] transition-colors">
          {course.title}
        </h3>
        <p className="text-gray-500 text-sm mb-6 line-clamp-4 leading-relaxed">
          {course.description}
        </p>
      </div>

      <div>
        {/* Instructor Info & Enroll Button */}
        <div className="flex items-center justify-between gap-3 pt-6 border-t border-gray-100 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-[#2d1b64] font-bold border-2 border-white shadow-sm">
              {course.instructor ? course.instructor.name.charAt(0) : '?'}
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter leading-none">Instructor</p>
              <p className="text-[#2d1b64] font-bold text-sm">
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
    </div>
  );

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
    </div>
  );
};

export default Courses;