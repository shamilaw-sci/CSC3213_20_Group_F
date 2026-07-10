import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const CourseDetails = () => {
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user'));
  
  // Track selected class. When null, show class cards grid.
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [newGradeNumber, setNewGradeNumber] = useState('');
  const [newGradeTitle, setNewGradeTitle] = useState('');
  const [gradeMessage, setGradeMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

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

      const lessonsRes = await axios.get(`http://localhost:5000/api/lessons/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLessons(lessonsRes.data);
    } catch (err) {
      toast.error("Failed to fetch details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGrade !== null) {
      const currentLesson = lessons.find(l => l.grade === selectedGrade);
      setEditingMessage(currentLesson ? currentLesson.teacherMessage : "");
    }
  }, [selectedGrade, lessons]);

  const handleToggleGrade = async (gradeNumber) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:5000/api/courses/${courseId}/toggle-grade`, 
        { gradeNumber }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || "Class updated!");
      setCourse((prev) => prev ? {
        ...prev,
        enrolledGrades: (prev.enrolledGrades || []).filter((g) => g.gradeNumber !== Number(gradeNumber))
      } : prev);
      await fetchCourseDetails();
    } catch (err) { 
      toast.error(err.response?.data?.error || "Error updating grade");
    }
  };

  const handleAddGrade = async (e) => {
    e.preventDefault();
    if (!newGradeNumber) {
      toast.error('Please select a grade to add.');
      return;
    }
    if (!newGradeTitle.trim()) {
      toast.error('Please enter a grade title.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:5000/api/lessons/add-grade', {
        grade: newGradeNumber,
        title: newGradeTitle,
        courseId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || `Grade ${newGradeTitle} added successfully.`);
      const newGradeEntry = res.data.newGradeEntry || {
        gradeNumber: Number(newGradeNumber),
        title: newGradeTitle.trim(),
        messages: []
      };
      setCourse((prev) => prev ? {
        ...prev,
        enrolledGrades: [...(prev.enrolledGrades || []), newGradeEntry]
      } : prev);
      setNewGradeNumber('');
      setNewGradeTitle('');
      setShowAddGrade(false);
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add grade.');
    }
  };

  const handleDeleteCourse = async () => {
    if (!window.confirm('Delete this course and all related lessons?')) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || 'Course deleted successfully.');
      window.location.href = '/courses';
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete course.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/courses/${courseId}/enroll`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Enrollment successful!');
      fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enroll in course.');
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleEnrollGradeStudents = async (gradeNumber) => {
    if (!window.confirm(`Enroll all students from Grade ${gradeNumber} into this course?`)) return;

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:5000/api/courses/${courseId}/enroll-grade/${gradeNumber}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(res.data.message || `Grade ${gradeNumber} students enrolled.`);
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to enroll grade students.');
    }
  };

  const handleSaveMessage = async () => {
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/lessons/${currentLesson._id}`, 
        { teacherMessage: editingMessage }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Announcement updated!");
      fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to update announcement.");
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    const updatedVideos = [...(currentLesson.videoLessons || []), { title: videoTitle, url: videoUrl }];
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/lessons/${currentLesson._id}`, 
        { videoLessons: updatedVideos }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Video lesson added!");
      setVideoTitle("");
      setVideoUrl("");
      fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to add video.");
    }
  };

  const handleDeleteVideo = async (videoId) => {
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    const updatedVideos = currentLesson.videoLessons.filter(v => v._id !== videoId);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`http://localhost:5000/api/lessons/${currentLesson._id}`, 
        { videoLessons: updatedVideos }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Video lesson removed!");
      fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to delete video.");
    }
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  const currentLesson = lessons.find(l => l.grade === selectedGrade);
  const studentGrade = user?.grade;
  const alreadyEnrolled = course?.enrolledStudents?.some(
    (s) => s?._id?.toString() === user?.id?.toString()
  );
  const canEnroll = user?.role === 'student' && studentGrade && course?.enrolledGrades?.some(g => g.gradeNumber === studentGrade) && !alreadyEnrolled;

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans text-gray-800">
      
      {/* Dynamic Header: Shows course details or class breadcrumbs */}
      {selectedGrade === null ? (
        <div className="mb-8">
          {course?.banner && (
            <img 
              src={course.banner} 
              alt={course.title} 
              className="w-full h-64 object-cover rounded-3xl mb-6 shadow-sm"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <h1 className="text-4xl font-extrabold text-gray-800 mb-2">{course?.title}</h1>
          <p className="text-gray-500">{course?.description}</p>
        </div>
      ) : (
        <div className="mb-8">
          <button
            onClick={() => setSelectedGrade(null)}
            className="mb-4 flex items-center gap-2 text-[#2d1b64] hover:underline font-bold transition cursor-pointer"
          >
            ← Back to Classes
          </button>
          <h1 className="text-3xl font-extrabold text-gray-800 mb-1">{course?.title}</h1>
          <p className="text-purple-600 font-bold text-lg">Class {selectedGrade} Workspace</p>
        </div>
      )}

      {/* VIEW 1: GRID OF CLASS CARDS (Shown when no class is selected) */}
      {selectedGrade === null && (
        <div className="space-y-8">
          
          {/* Admin Management Section */}
          {user?.role === 'admin' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-700 mb-2">Assign/Remove Classes</h3>
                  <p className="text-sm text-gray-500">
                    Add grades that can access this course and remove them when needed.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => setShowAddGrade(!showAddGrade)}
                    className="rounded-full bg-purple-600 px-5 py-2 text-white font-semibold hover:bg-purple-700 transition"
                  >
                    {showAddGrade ? 'Cancel New Grade' : '+ Add Grade'}
                  </button>
                  <button
                    onClick={handleDeleteCourse}
                    className="rounded-full bg-red-500 px-5 py-2 text-white font-semibold hover:bg-red-600 transition"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Course'}
                  </button>
                </div>
              </div>

              {showAddGrade && (
                <form onSubmit={handleAddGrade} className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Grade Title</label>
                    <input
                      value={newGradeTitle}
                      onChange={(e) => setNewGradeTitle(e.target.value)}
                      placeholder="Enter title for this grade"
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Class Number</label>
                    <select
                      value={newGradeNumber}
                      onChange={(e) => setNewGradeNumber(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      required
                    >
                      <option value="">Choose class</option>
                      {allGrades.map((grade) => (
                        <option key={grade} value={grade}>Grade {grade}</option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-3 flex justify-end">
                    <button
                      type="submit"
                      className="rounded-xl bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-700 transition"
                    >
                      Save Grade
                    </button>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {course?.enrolledGrades?.map((eg) => (
                  <div
                    key={eg.gradeNumber}
                    className="relative bg-white p-6 rounded-3xl border border-gray-200 shadow-sm"
                  >
                    <div className="absolute right-4 top-4 flex flex-col gap-2">
                      {user?.role === 'admin' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnrollGradeStudents(eg.gradeNumber);
                          }}
                          className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Enroll Grade
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGrade(eg.gradeNumber);
                        }}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mb-4 text-sm text-gray-500">Grade {eg.gradeNumber}</div>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">{eg.title || `Class ${eg.gradeNumber}`}</h4>
                    <p className="text-gray-500 text-sm">This class can enrol in the course when assigned.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes Grid */}
          <div>
            {course?.enrolledGrades?.length === 0 ? (
              <div className="bg-white p-12 rounded-[30px] text-center border border-dashed border-gray-200">
                <p className="text-gray-400 italic">No classes assigned to this course yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {course?.enrolledGrades?.map((eg) => (
                  <div
                    key={eg.gradeNumber}
                    onClick={() => setSelectedGrade(eg.gradeNumber)}
                    className="bg-white p-8 rounded-[30px] shadow-sm border border-transparent hover:border-[#2d1b64]/20 hover:shadow-xl transition-all duration-300 group flex flex-col justify-between cursor-pointer"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 bg-[#f3f4f6] rounded-2xl flex items-center justify-center text-2xl group-hover:bg-[#2d1b64] group-hover:text-white transition-colors">
                          🎓
                        </div>
                        <span className="bg-purple-100 text-purple-600 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest">
                          Active
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-800 mb-2 group-hover:text-[#2d1b64] transition-colors">
                        {eg.title || `Class ${eg.gradeNumber}`}
                      </h3>
                      <p className="text-gray-400 text-xs mt-2">
                        Click to view announcements and lessons
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CLASS WORKSPACE CONTENT PANEL (Shown when a class is clicked) */}
      {selectedGrade !== null && (
        <div className="space-y-6">
          
          {/* Announcement Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-lg text-gray-800 mb-4">Teacher's Announcement</h4>
            {user?.role === 'student' ? (
              <p className="text-gray-600 bg-gray-50 p-4 rounded-xl leading-relaxed whitespace-pre-line">
                {currentLesson?.teacherMessage || "මෙම පන්තිය සඳහා ගුරුවරයාගෙන් පණිවිඩයක් නැත."}
              </p>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  rows="4"
                  placeholder="Type an announcement or message for this class here..."
                  value={editingMessage}
                  onChange={(e) => setEditingMessage(e.target.value)}
                />
                <button
                  onClick={handleSaveMessage}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2.5 rounded-xl transition shadow-sm cursor-pointer"
                >
                  Save Announcement
                </button>
              </div>
            )}
          </div>

          {canEnroll && (
            <div className="bg-white p-6 rounded-2xl border border-green-200 shadow-sm">
              <p className="text-green-700 font-semibold">This course is recommended for Grade {studentGrade}.</p>
              <button
                onClick={handleEnroll}
                disabled={isEnrolling}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-white font-semibold hover:bg-green-700 transition"
              >
                {isEnrolling ? 'Enrolling...' : 'Enroll in this Course'}
              </button>
            </div>
          )}

          {/* Video Lessons Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-lg text-gray-800 mb-4">Video Lessons</h4>

            {/* Video addition form (Teacher/Admin only) */}
            {user?.role !== 'student' && (
              <form onSubmit={handleAddVideo} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 p-4 bg-gray-50 rounded-xl">
                <input
                  type="text"
                  placeholder="Video Title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="p-3 bg-white border border-gray-200 rounded-lg outline-none"
                  required
                />
                <input
                  type="url"
                  placeholder="Video Link (e.g. YouTube URL)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="p-3 bg-white border border-gray-200 rounded-lg outline-none"
                  required
                />
                <button 
                  type="submit" 
                  className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg py-3 shadow-sm cursor-pointer"
                >
                  + Add Video
                </button>
              </form>
            )}

            {/* Videos List */}
            <div className="space-y-3">
              {currentLesson?.videoLessons?.length > 0 ? (
                currentLesson.videoLessons.map((vid) => (
                  <div key={vid._id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="text-red-500 text-xl">🎬</div>
                      <div>
                        <p className="font-bold text-gray-800">{vid.title}</p>
                        <a href={vid.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline">
                          {vid.url}
                        </a>
                      </div>
                    </div>
                    {user?.role !== 'student' && (
                      <button
                        onClick={() => handleDeleteVideo(vid._id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 italic">මෙම පන්තිය සඳහා පාඩම් දත්ත නොමැත.</p>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default CourseDetails;