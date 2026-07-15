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
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedEnrollGrade, setSelectedEnrollGrade] = useState(null);
  const [gradeStudents, setGradeStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isLoadingGradeStudents, setIsLoadingGradeStudents] = useState(false);
  const [isUpdatingGradeStudents, setIsUpdatingGradeStudents] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState("");

  // Rich student manager dashboard states
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");
  const [pickerFilter, setPickerFilter] = useState("all"); // 'all' | 'due' | 'absent'
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [studentDetailTab, setStudentDetailTab] = useState("attendance"); // 'attendance' | 'payments'


  const allGrades = [
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
    "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
    "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
  ];

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
        enrolledGrades: (prev.enrolledGrades || []).filter((g) => g.gradeNumber !== gradeNumber)
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
        gradeNumber: newGradeNumber,
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
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token');
      const res = await axios.delete(`http://localhost:5000/api/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowDeleteConfirm(false);
      setDeleteSuccessMsg(res.data.message || 'Course deleted successfully.');
      setShowDeleteSuccess(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete course.');
      setShowDeleteConfirm(false);
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

  const openStudentPicker = async (gradeNumber) => {
    setSelectedEnrollGrade(gradeNumber);
    setShowStudentPicker(true);
    setSelectedStudentIds([]);
    setIsLoadingGradeStudents(true);
    setPickerSearchQuery("");
    setPickerFilter("all");
    setSelectedStudentDetail(null);

    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:5000/api/courses/${courseId}/students/${gradeNumber}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGradeStudents(res.data);
      setSelectedStudentIds(res.data.filter((student) => student.isEnrolled).map((student) => student._id));
      if (res.data.length > 0) {
        setSelectedStudentDetail(res.data[0]);
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load grade students.');
    } finally {
      setIsLoadingGradeStudents(false);
    }
  };

  const handleUpdateGradeStudents = async (mode) => {
    if (!selectedEnrollGrade) return;

    try {
      setIsUpdatingGradeStudents(true);
      const token = localStorage.getItem('token');
      const endpoint = mode === 'enroll'
        ? `http://localhost:5000/api/courses/${courseId}/enroll-students/${selectedEnrollGrade}`
        : `http://localhost:5000/api/courses/${courseId}/remove-students/${selectedEnrollGrade}`;

      const res = await axios.post(endpoint, { studentIds: selectedStudentIds }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || 'Student enrollment updated.');
      await fetchCourseDetails();
      setShowStudentPicker(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update student enrollment.');
    } finally {
      setIsUpdatingGradeStudents(false);
    }
  };

  const handleSingleStudentEnrollRemove = async (mode, studentId) => {
    try {
      setIsUpdatingGradeStudents(true);
      const token = localStorage.getItem('token');
      const endpoint = mode === 'enroll'
        ? `http://localhost:5000/api/courses/${courseId}/enroll-students/${selectedEnrollGrade}`
        : `http://localhost:5000/api/courses/${courseId}/remove-students/${selectedEnrollGrade}`;

      const res = await axios.post(endpoint, { studentIds: [studentId] }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(res.data.message || 'Student enrollment updated.');
      
      const updatedRes = await axios.get(`http://localhost:5000/api/courses/${courseId}/students/${selectedEnrollGrade}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGradeStudents(updatedRes.data);
      const freshStudent = updatedRes.data.find(s => s._id === studentId);
      if (freshStudent) {
        setSelectedStudentDetail(freshStudent);
      }
      setSelectedStudentIds(updatedRes.data.filter((student) => student.isEnrolled).map((student) => student._id));
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update student enrollment.');
    } finally {
      setIsUpdatingGradeStudents(false);
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

  const filteredPickerStudents = gradeStudents.filter((student) => {
    if (pickerSearchQuery.trim() !== "") {
      const q = pickerSearchQuery.toLowerCase();
      const matchesName = student.name && student.name.toLowerCase().includes(q);
      const matchesReg = student.registrationNumber && student.registrationNumber.toLowerCase().includes(q);
      if (!matchesName && !matchesReg) return false;
    }
    if (pickerFilter === "due") {
      return student.payment && student.payment.status === "Due";
    }
    if (pickerFilter === "absent") {
      return student.attendance && student.attendance.isChronicallyAbsent;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-5xl mx-auto font-sans text-gray-800">

      {/* Dynamic Header: Shows course details or class breadcrumbs */}
      {selectedGrade === null ? (
        <div className="mb-8">
          {course?.banner && (
            <img 
              src={course.banner} 
              alt={course.title} 
              className="w-full h-72 md:h-96 object-cover object-center rounded-3xl mb-6 shadow-sm"
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
          <p className="text-purple-600 font-bold text-lg">{selectedGrade} Workspace</p>
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
                    onClick={() => setShowDeleteConfirm(true)}
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
                        <option key={grade} value={grade}>{grade}</option>
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
                            openStudentPicker(eg.gradeNumber);
                          }}
                          className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                        >
                          Manage Students
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
                    <div className="mb-4 text-sm text-gray-500">{eg.gradeNumber}</div>
                    <h4 className="text-xl font-bold text-gray-800 mb-2">{eg.title || eg.gradeNumber}</h4>
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
                        {eg.title || eg.gradeNumber}
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
                {currentLesson?.teacherMessage || "No Contents available for this course yet."}
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
              <p className="text-green-700 font-semibold">This course is recommended for {studentGrade && (studentGrade.toLowerCase().startsWith('grade') ? studentGrade : `Grade ${studentGrade}`)}.</p>
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
                <p className="text-gray-400 italic">No lesson Data for this Class</p>
              )}
            </div>
          </div>

        </div>
      )}

      {showStudentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl h-[650px] rounded-3xl bg-white p-6 shadow-2xl flex flex-col overflow-hidden border border-gray-200 animate-fadeIn">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{selectedEnrollGrade && (selectedEnrollGrade.toLowerCase().startsWith('grade') ? selectedEnrollGrade : `Grade ${selectedEnrollGrade}`)} Student Management</h3>
                <p className="text-sm text-gray-500">Manage enrollment, view real-time class attendance, and monitor fee payments.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentPicker(false)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                Close Dashboard
              </button>
            </div>

            {/* Split Pane Work Area */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT PANE: Student List & Search & Filters */}
              <div className="w-5/12 flex flex-col border-r border-gray-150 pr-4 overflow-hidden">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    placeholder="Search name or registration number..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="grid grid-cols-3 gap-1.5 mt-3 bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
                  <button
                    type="button"
                    onClick={() => setPickerFilter("all")}
                    className={`py-1.5 rounded-lg transition-all ${pickerFilter === "all" ? "bg-white text-purple-700 shadow-sm" : "hover:text-gray-900"}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerFilter("due")}
                    className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${pickerFilter === "due" ? "bg-white text-red-600 shadow-sm" : "hover:text-red-600"}`}
                  >
                    Due Fees
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerFilter("absent")}
                    className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${pickerFilter === "absent" ? "bg-white text-orange-600 shadow-sm" : "hover:text-orange-600"}`}
                  >
                    Abs. &gt;2 Days
                  </button>
                </div>

                {/* Student Scroll List */}
                {isLoadingGradeStudents ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-500">Loading grade list...</div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-1">
                    {/* Section 1: Enrolled Students */}
                    <div>
                      <div className="bg-purple-100/80 text-purple-900 font-bold px-3 py-2 rounded-xl text-xs flex justify-between items-center mb-2 sticky top-0 z-10 border border-purple-200">
                        <span>Enrolled Students ({filteredPickerStudents.filter(s => s.isEnrolled).length})</span>
                      </div>
                      
                      <div className="space-y-2">
                        {filteredPickerStudents.filter(s => s.isEnrolled).length === 0 ? (
                          <p className="text-xs text-gray-400 italic pl-3">No students currently enrolled in this grade.</p>
                        ) : (
                          filteredPickerStudents.filter(s => s.isEnrolled).map((student) => (
                            <div
                              key={student._id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                                selectedStudentDetail?._id === student._id
                                  ? "bg-purple-50/70 border-purple-300 shadow-sm"
                                  : "bg-white border-gray-150 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedStudentIds.includes(student._id)}
                                  onChange={() => {
                                    setSelectedStudentIds((prev) =>
                                      prev.includes(student._id)
                                        ? prev.filter((id) => id !== student._id)
                                        : [...prev, student._id]
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                              </div>

                              <div className="flex-1 min-w-0" onClick={() => setSelectedStudentDetail(student)}>
                                <p className="font-semibold text-gray-905 text-sm truncate">{student.name}</p>
                                <p className="text-[11px] text-gray-500 truncate">Reg: {student.registrationNumber || 'N/A'}</p>
                                
                                <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-extrabold uppercase">
                                  <span className="px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                                    Enrolled
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full ${student.payment?.status === "Due" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                                    {student.payment?.status || "Paid"}
                                  </span>
                                  {student.attendance?.isChronicallyAbsent && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200 animate-pulse">
                                      Absent &gt;2 Days
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Section 2: Available Students (Not Enrolled) */}
                    <div>
                      <div className="bg-gray-100 text-gray-700 font-bold px-3 py-2 rounded-xl text-xs flex justify-between items-center mb-2 sticky top-0 z-10 border border-gray-200">
                        <span>Available Students ({filteredPickerStudents.filter(s => !s.isEnrolled).length})</span>
                      </div>

                      <div className="space-y-2">
                        {filteredPickerStudents.filter(s => !s.isEnrolled).length === 0 ? (
                          <p className="text-xs text-gray-400 italic pl-3">No additional students available in this grade.</p>
                        ) : (
                          filteredPickerStudents.filter(s => !s.isEnrolled).map((student) => (
                            <div
                              key={student._id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                                selectedStudentDetail?._id === student._id
                                  ? "bg-purple-50/70 border-purple-300 shadow-sm"
                                  : "bg-white border-gray-150 hover:bg-gray-50"
                              }`}
                            >
                              <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="checkbox"
                                  checked={selectedStudentIds.includes(student._id)}
                                  onChange={() => {
                                    setSelectedStudentIds((prev) =>
                                      prev.includes(student._id)
                                        ? prev.filter((id) => id !== student._id)
                                        : [...prev, student._id]
                                    );
                                  }}
                                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                />
                              </div>

                              <div className="flex-1 min-w-0" onClick={() => setSelectedStudentDetail(student)}>
                                <p className="font-semibold text-gray-905 text-sm truncate">{student.name}</p>
                                <p className="text-[11px] text-gray-500 truncate">Reg: {student.registrationNumber || 'N/A'}</p>
                                
                                <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-extrabold uppercase">
                                  <span className="px-1.5 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                                    Not Enrolled
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full ${student.payment?.status === "Due" ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                                    {student.payment?.status || "Paid"}
                                  </span>
                                  {student.attendance?.isChronicallyAbsent && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-bold border border-red-200 animate-pulse">
                                      Absent &gt;2 Days
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Batch Action Buttons Panel */}
                <div className="pt-4 border-t flex flex-col gap-2 mt-auto">
                  <div className="flex justify-between items-center text-xs text-gray-500 font-semibold px-1">
                    <span>{selectedStudentIds.length} Selected for Batch Actions</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(gradeStudents.map((s) => s._id))}
                        className="text-purple-600 hover:underline cursor-pointer"
                      >
                        Select All
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="text-purple-600 hover:underline cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateGradeStudents('enroll')}
                      disabled={isUpdatingGradeStudents || selectedStudentIds.length === 0}
                      className="rounded-xl bg-green-600 py-2.5 text-xs font-bold text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                    >
                      {isUpdatingGradeStudents ? 'Enrolling...' : 'Batch Enroll'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdateGradeStudents('remove')}
                      disabled={isUpdatingGradeStudents || selectedStudentIds.length === 0}
                      className="rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                    >
                      {isUpdatingGradeStudents ? 'Removing...' : 'Batch Remove'}
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT PANE: Selected Student Detailed Overview */}
              <div className="w-7/12 flex flex-col pl-6 overflow-hidden">
                {!selectedStudentDetail ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h4 className="font-bold text-gray-700">No Student Selected</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">Click on any student card in the list to inspect their attendance history and billing records.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Detail Card */}
                    <div className="bg-gray-50 border border-gray-150 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0">
                          {selectedStudentDetail.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 text-base leading-tight truncate">{selectedStudentDetail.name}</h4>
                          <p className="text-xs text-gray-500 font-medium">Reg No: {selectedStudentDetail.registrationNumber || 'N/A'}</p>
                          <p className="text-xs text-gray-400 truncate">{selectedStudentDetail.email}</p>
                          {selectedStudentDetail.parentsPhoneNumber && (
                            <p className="text-[11px] text-purple-600 font-semibold mt-0.5 flex items-center gap-1">
                              <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.63.23l2.87 2.87a1 1 0 01-.18 1.54l-1.31.87a11.03 11.03 0 005.47 5.47l.87-1.31a1 1 0 011.54-.18l2.87 2.87a1 1 0 01.23.63V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Parent: {selectedStudentDetail.parentsPhoneNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Enrolling Action Button */}
                      <div>
                        {selectedStudentDetail.isEnrolled ? (
                          <button
                            type="button"
                            onClick={() => handleSingleStudentEnrollRemove('remove', selectedStudentDetail._id)}
                            disabled={isUpdatingGradeStudents}
                            className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSingleStudentEnrollRemove('enroll', selectedStudentDetail._id)}
                            disabled={isUpdatingGradeStudents}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
                          >
                            Enroll
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 mt-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                      <button
                        type="button"
                        onClick={() => setStudentDetailTab("attendance")}
                        className={`flex-1 pb-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          studentDetailTab === "attendance" ? "border-purple-600 text-purple-700 font-extrabold" : "border-transparent hover:text-gray-700"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Attendance History
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudentDetailTab("payments")}
                        className={`flex-1 pb-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          studentDetailTab === "payments" ? "border-purple-600 text-purple-700 font-extrabold" : "border-transparent hover:text-gray-700"
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Payment Ledger
                      </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="flex-1 overflow-y-auto mt-4 pr-1">
                      
                      {/* Tab 1: ATTENDANCE HISTORY VIEW */}
                      {studentDetailTab === "attendance" && (
                        <div className="space-y-4">
                          {/* Alert Notice for high absences */}
                          {selectedStudentDetail.attendance?.isChronicallyAbsent && (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-2.5 text-red-800 text-xs animate-pulse">
                              <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div>
                                <p className="font-bold">Absenteeism Alert</p>
                                <p className="mt-0.5 font-medium">This student has been marked absent for {selectedStudentDetail.attendance.consecutiveAbsences} consecutive class sessions in this course.</p>
                              </div>
                            </div>
                          )}

                          {/* Quick Stats */}
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                              <p className="text-[10px] text-green-700 font-extrabold uppercase tracking-wider">Attended Sessions</p>
                              <p className="text-xl font-black text-green-800 mt-0.5">{selectedStudentDetail.attendance?.totalPresent || 0}</p>
                            </div>
                            <div className="bg-red-50 border border-red-100 rounded-xl p-3 text-center">
                              <p className="text-[10px] text-red-700 font-extrabold uppercase tracking-wider">Absent Sessions</p>
                              <p className="text-xl font-black text-red-800 mt-0.5">{selectedStudentDetail.attendance?.totalAbsent || 0}</p>
                            </div>
                          </div>

                          {/* History Table */}
                          <div className="rounded-xl border border-gray-150 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                              <thead className="bg-gray-50 font-bold uppercase tracking-wider text-gray-500 border-b">
                                <tr>
                                  <th className="p-3">Session Date</th>
                                  <th className="p-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-150 text-gray-700">
                                {!selectedStudentDetail.attendance?.history || selectedStudentDetail.attendance.history.length === 0 ? (
                                  <tr>
                                    <td colSpan="2" className="p-6 text-center text-gray-400 italic">No attendance records found for this student.</td>
                                  </tr>
                                ) : (
                                  selectedStudentDetail.attendance.history.map((record, index) => (
                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                      <td className="p-3 font-semibold text-gray-800">{new Date(record.date).toLocaleDateString()}</td>
                                      <td className="p-3 text-right whitespace-nowrap">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                          record.status === 'Present' ? 'bg-green-100 text-green-800' :
                                          record.status === 'Late' ? 'bg-amber-100 text-amber-800' :
                                          'bg-red-100 text-red-800'
                                        }`}>
                                          {record.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Tab 2: PAYMENT RECORDS LEDGER VIEW */}
                      {studentDetailTab === "payments" && (
                        <div className="space-y-4">
                          {/* Alert Notice for overdue bills */}
                          {selectedStudentDetail.payment?.status === "Due" ? (
                            <div className="bg-red-50 border border-red-200 rounded-xl p-3.5 flex gap-2.5 text-red-800 text-xs">
                              <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="font-bold text-red-800">Fees Overdue Alert</p>
                                <p className="mt-0.5 font-semibold text-red-700">
                                  August 2026 Monthly Fees of Rs. {selectedStudentDetail.payment.amountDue.toLocaleString()}.00 are UNPAID.
                                  <br />
                                  <span className="font-medium text-xs text-red-500">Payment Due Date: {selectedStudentDetail.payment.dueDate}</span>
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3.5 flex gap-2.5 text-green-800 text-xs">
                              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="font-bold">Account Good Standing</p>
                                <p className="mt-0.5 font-medium">All course payments for this student are fully settled up to date.</p>
                              </div>
                            </div>
                          )}

                          {/* Payment Ledger */}
                          <div className="rounded-xl border border-gray-150 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-150 flex justify-between items-center">
                              <h5 className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider">Transaction History Log</h5>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Office Ledger</span>
                            </div>
                            <div className="divide-y divide-gray-150 text-xs">
                              {selectedStudentDetail.payment?.history?.map((invoice, index) => (
                                <div key={index} className="p-3 flex justify-between items-center hover:bg-gray-50/50">
                                  <div>
                                    <p className="font-bold text-gray-800">Rs. {invoice.amount.toLocaleString()}.00 - Monthly Tuition Fees</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">Billing Period: {invoice.month} ({invoice.status})</p>
                                  </div>
                                  <div className="text-right">
                                    <span className="text-gray-500 font-semibold">{invoice.date}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl transition-all border border-gray-100">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Course</h3>
            <p className="text-gray-500 text-sm mb-6 animate-pulse-subtle">
              Are you sure you want to delete the course <strong className="text-gray-800">"{course?.title}"</strong>? This will permanently delete the course and all related lessons and file assets.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Success Modal */}
      {showDeleteSuccess && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/55 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center border border-gray-100">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4 animate-bounce-subtle">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Course Deleted</h3>
            <p className="text-gray-500 text-sm mb-6">
              {deleteSuccessMsg || "The course has been successfully deleted."}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowDeleteSuccess(false);
                window.location.href = '/courses';
              }}
              className="w-full rounded-xl bg-purple-600 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 transition"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;