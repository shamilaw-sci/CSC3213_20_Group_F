import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Courses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate(); 

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
        
        {/* Header Section - Button completely removed */}
        <div className="flex justify-between items-center mb-10">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-800">Available Courses</h2>
            <p className="text-gray-500 mt-1">Manage and view all your educational content</p>
          </div>
        </div>

        {courses.length === 0 ? (
          <div className="bg-white p-20 rounded-[30px] text-center shadow-sm">
            <div className="text-6xl mb-4">📚</div>
            <p className="text-gray-500 text-lg">No courses available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {courses.map((course) => (
              <div 
                key={course._id} 
                /* --- INJECTED FRIEND'S NAVIGATION LOGIC HERE --- */
                onClick={() => navigate(`/course/${course._id}`)} 
                /* Added cursor-pointer to your existing beautiful styling */
                className="bg-white p-8 rounded-[30px] shadow-sm border border-transparent hover:border-[#2d1b64]/20 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
              >
                <div>
                  {/* Top Meta Details */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-12 h-12 bg-[#f3f4f6] rounded-2xl flex items-center justify-center text-2xl group-hover:bg-[#2d1b64] group-hover:text-white transition-colors">
                      📖
                    </div>
                    <div className="bg-green-100 text-green-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                      Active
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