import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const CourseDetails = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [message, setMessage] = useState("");

  const allGrades = [6, 7, 8, 9, 10, 11];

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchCourseDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCourse(res.data);
    } catch (err) {
      toast.error("Failed to fetch details.");
    } finally {
      setLoading(false);
    }
  };

  // අලුත් Toggle function එක
  const handleToggleGrade = async (gradeNumber) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/courses/${courseId}/toggle-grade`, 
        { gradeNumber }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      toast.success("Grade updated!");
      fetchCourseDetails(); 
    } catch (err) { 
      toast.error("Error updating grade"); 
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-gray-800">{course?.title}</h1>
      
      {/* Grade Selection Area */}
      {user?.role === 'admin' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200 mt-6 mb-8">
          <h3 className="font-semibold text-gray-700 mb-4">Assign/Remove Grades</h3>
          <div className="flex flex-wrap gap-3">
            {allGrades.map(g => {
              const isEnrolled = course?.enrolledGrades?.find(eg => eg.gradeNumber === g);
              return (
                <button 
                  key={g} 
                  onClick={() => handleToggleGrade(g)}
                  className={`px-4 py-2 rounded-lg border transition ${
                    isEnrolled 
                    ? 'bg-green-100 border-green-500 text-green-700' 
                    : 'bg-gray-50 border-gray-300'
                  }`}
                >
                  Grade {g} {isEnrolled && '✓'}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Enrolled Grades List */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold text-gray-700 mb-4">Enrolled Grades:</h3>
        <div className="flex flex-wrap gap-4">
          {course?.enrolledGrades?.map((g) => (
            <div key={g.gradeNumber} className="bg-white p-6 rounded-2xl border-l-4 border-purple-500 shadow-sm min-w-[160px]">
              <div className="font-bold text-xl text-gray-800">Grade {g.gradeNumber}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CourseDetails;