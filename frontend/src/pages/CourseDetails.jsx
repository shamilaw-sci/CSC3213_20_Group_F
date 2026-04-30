import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const CourseDetails = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  
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
      toast.error("Failed to fetch course details.");
    } finally {
      setLoading(false);
    }
  };

  // Admin: Add Grade to Course
  const handleAddGrade = async (gradeNumber) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/courses/${courseId}/add-grade`, 
        { gradeNumber },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Grade ${gradeNumber} added to course!`);
      fetchCourseDetails(); // Refresh UI
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add grade");
    }
  };

  // Teacher: Send Message
  const handleSendMessage = async () => {
    if (!message) return toast.error("Please enter a message.");
    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/courses/${courseId}/send-message`, 
        { gradeNumber: selectedGrade, text: message },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Message sent successfully!");
      setMessage("");
    } catch (err) {
      toast.error("Failed to send message.");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">Loading course data...</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">{course?.title}</h1>
        <p className="text-gray-600 mt-2">{course?.description}</p>
      </div>

      {/* GRADE SELECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">
          {user?.role === 'admin' ? "Assign Grades to Course" : "Select Grade to Message"}
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Admin sees all grades to add them */}
          {user?.role === 'admin' ? (
            allGrades.map((grade) => {
              const isAdded = course?.enrolledGrades?.some(g => g.gradeNumber === grade);
              return (
                <button
                  key={grade}
                  onClick={() => !isAdded && handleAddGrade(grade)}
                  disabled={isAdded}
                  className={`py-3 px-4 rounded-xl border-2 transition font-bold ${
                    isAdded 
                    ? "bg-green-50 border-green-200 text-green-600 cursor-not-allowed" 
                    : "border-purple-100 text-gray-700 hover:border-purple-500 hover:bg-purple-50"
                  }`}
                >
                  Grade {grade} {isAdded && "✓"}
                </button>
              );
            })
          ) : (
            /* Teacher only sees grades added by Admin */
            course?.enrolledGrades?.map((g) => (
              <button
                key={g.gradeNumber}
                onClick={() => setSelectedGrade(g.gradeNumber)}
                className={`py-3 px-4 rounded-xl border-2 transition font-bold ${
                  selectedGrade === g.gradeNumber 
                  ? "border-purple-600 bg-purple-600 text-white shadow-md" 
                  : "border-purple-100 text-gray-700 hover:border-purple-500 hover:bg-purple-50"
                }`}
              >
                Grade {g.gradeNumber}
              </button>
            ))
          )}
        </div>
        {user?.role === 'teacher' && course?.enrolledGrades?.length === 0 && (
          <p className="text-amber-600 mt-2 text-sm italic">No grades assigned to this course yet. Please contact Admin.</p>
        )}
      </div>

      {/* TEACHER MESSAGE BOX */}
      {selectedGrade && user?.role === 'teacher' && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-purple-200 animate-in fade-in duration-500">
          <h3 className="text-lg font-bold text-purple-800 mb-4">Send Message to Grade {selectedGrade}</h3>
          <textarea 
            className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
            rows="4"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          ></textarea>
          <button 
            onClick={handleSendMessage}
            className="mt-4 bg-purple-600 text-white px-8 py-2 rounded-lg font-semibold hover:bg-purple-700 transition"
          >
            Send Message
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;