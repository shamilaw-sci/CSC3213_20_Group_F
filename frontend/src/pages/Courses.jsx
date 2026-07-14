import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate(); 
  const user = JSON.parse(localStorage.getItem('user'));

  useEffect(() => {
    const fetchCourses = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:5000/api/courses', {
          headers: { Authorization: `Bearer ${token}` }
        });
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

  // Filter courses based on search query
  const recommendedCourses = user?.role === 'student' && user?.grade
    ? courses.filter(course => course.enrolledGrades?.some(g => g.gradeNumber === user.grade))
    : [];

  const filteredCourses = (user?.role === 'admin'
    ? courses
    : user?.role === 'teacher'
      ? courses.filter(course => course.instructor?._id?.toString() === user?.id?.toString())
      : courses.filter(course => {
          const isEnrolledByStudent = course.enrolledStudents?.some(student =>
            student?._id?.toString() === user?.id?.toString() || student?.toString() === user?.id?.toString()
          );
          const isGradeAllowed = course.enrolledGrades?.some(g => g.gradeNumber === user?.grade);
          return isEnrolledByStudent || isGradeAllowed;
        })
  ).filter(course => 
    course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (course.instructor?.name && course.instructor.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
            <h2 className="text-3xl font-extrabold text-gray-800">Available Courses</h2>
            <p className="text-gray-500 mt-1">Manage and view all your educational content</p>
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

        {recommendedCourses.length > 0 && (
          <div className="mb-8 rounded-[30px] bg-white p-8 border border-gray-200 shadow-sm">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">Recommended for {user.grade}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recommendedCourses.slice(0, 4).map((course) => (
                <div
                  key={course._id}
                  onClick={() => navigate(`/course/${course._id}`)}
                  className="cursor-pointer rounded-3xl border border-purple-100 bg-purple-50 p-6 shadow-sm transition hover:border-purple-300 hover:shadow-lg"
                >
                  <h4 className="text-lg font-bold text-purple-700 mb-2">{course.title}</h4>
                  <p className="text-sm text-purple-700/80 line-clamp-3">{course.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredCourses.length === 0 ? (
          <div className="bg-white p-20 rounded-[30px] text-center shadow-sm">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg">No courses found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCourses.map((course) => (
              <div 
                key={course._id} 
                onClick={() => navigate(`/course/${course._id}`)} 
                className="bg-white p-8 rounded-[30px] shadow-sm border border-transparent hover:border-[#2d1b64]/20 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top Meta Details / Card Thumbnail */}
                  <div className="mb-6">
                    {course.cardImage ? (
                      <div className="relative h-40 w-full overflow-hidden rounded-2xl mb-4">
                        <img
                          src={course.cardImage}
                          alt={course.title}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-[#f3f4f6] rounded-2xl flex items-center justify-center text-2xl group-hover:bg-[#2d1b64] group-hover:text-white transition-colors mb-4">
                        📖
                      </div>
                    )}
                    <div className="flex justify-between items-center w-full">
                      <span className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                        Active
                      </span>
                      {user?.role === 'student' && (course.enrolledStudents?.some(student => 
                        student?._id?.toString() === user?.id?.toString() || student?.toString() === user?.id?.toString()
                      )) ? (
                        <span className="bg-purple-100 text-[#2d1b64] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 border border-purple-200 shadow-sm animate-pulse">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Courses;