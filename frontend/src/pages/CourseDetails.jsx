import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import CourseEnrollmentModal from '../components/CourseEnrollmentModal';
import TeacherModal from '../components/TeacherModal';
import PdfReaderModal from '../components/PdfReaderModal';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import { FaChalkboardTeacher, FaBookOpen, FaLock, FaLockOpen, FaVideo, FaYoutube, FaCalendarAlt, FaChevronDown, FaChevronUp, FaClock, FaMapMarkerAlt, FaDownload, FaCog, FaHourglassHalf } from 'react-icons/fa';

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

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState(null);
  const [pdfProgressMap, setPdfProgressMap] = useState({});
  const [activePdfModal, setActivePdfModal] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  // Track selected class. When null, show class cards grid.
  const [selectedGrade, setSelectedGrade] = useState(null);
  const [editingMessage, setEditingMessage] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [showAddGrade, setShowAddGrade] = useState(false);
  const [gradeMode, setGradeMode] = useState('single');
  const [combinationGrades, setCombinationGrades] = useState([]);
  const [customGradeInput, setCustomGradeInput] = useState('');
  const [newGradeNumber, setNewGradeNumber] = useState('');
  const [newGradeTitle, setNewGradeTitle] = useState('');
  const [gradeMessage, setGradeMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showStudentPicker, setShowStudentPicker] = useState(false);
  const [selectedEnrollGrade, setSelectedEnrollGrade] = useState(null);
  const [gradeStudents, setGradeStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isLoadingGradeStudents, setIsLoadingGradeStudents] = useState(false);
  const [isUpdatingGradeStudents, setIsUpdatingGradeStudents] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState("");
  const [deactivateConfirmGrade, setDeactivateConfirmGrade] = useState(null); // { gradeId, gradeNumber, title, isDeactive }

  // Rich student manager dashboard states
  const [pickerSearchQuery, setPickerSearchQuery] = useState("");
  const [pickerFilter, setPickerFilter] = useState("all"); // 'all' | 'due' | 'absent'
  const [selectedStudentDetail, setSelectedStudentDetail] = useState(null);
  const [studentDetailTab, setStudentDetailTab] = useState("attendance"); // 'attendance' | 'payments'

  // PDF Materials state
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfTitle, setPdfTitle] = useState("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  // ─── Month / Year Navigator helpers ───────────────────────────────────────
  const MONTH_NAMES = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const todayForNav = new Date();
  const currentMonthIndex = todayForNav.getMonth();   // 0-based
  const currentYear      = todayForNav.getFullYear();

  // Derive selectedYear from selectedMonth string, default to current year
  const getYearFromMonth = (mStr) => parseInt(mStr.split(' ')[1], 10) || currentYear;
  const getMonthIdxFromStr = (mStr) => MONTH_NAMES.indexOf(mStr.split(' ')[0]);

  const getCurrentAcademicMonth = () =>
    `${MONTH_NAMES[currentMonthIndex]} ${currentYear}`;

  // Assignment PDF state
  const [assignmentFile, setAssignmentFile] = useState(null);
  const [assignmentTitle, setAssignmentTitle] = useState("");
  const [isUploadingAssignment, setIsUploadingAssignment] = useState(false);

  // Weekly Attendance & Class Navigation State
  const [selectedMonth, setSelectedMonth] = useState(getCurrentAcademicMonth);
  const [navYear, setNavYear] = useState(currentYear);
  const [activeWeek, setActiveWeek] = useState(1);
  const [attendedWeeks, setAttendedWeeks] = useState([]);
  const [loadingWeeklyStatus, setLoadingWeeklyStatus] = useState(true);
  const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false);

  // Helper: is a given month (0-based index) in navYear in the future?
  const isFutureMonth = (monthIdx, year) =>
    year > currentYear || (year === currentYear && monthIdx > currentMonthIndex);

  // Navigate displayed year with clamping (don't go below 2024 as start year)
  const MIN_NAV_YEAR = 2024;
  const handleNavYearPrev = () => setNavYear(y => Math.max(MIN_NAV_YEAR, y - 1));
  const handleNavYearNext = () => setNavYear(y => (y < currentYear ? y + 1 : y));

  // Build the available months (all 12) for the displayed navYear
  const availableMonths = MONTH_NAMES.map((name, idx) => ({
    label: `${name} ${navYear}`,
    monthIdx: idx,
    locked: isFutureMonth(idx, navYear),
  }));

  // Material Download Settings states for upload forms
  const [pdfDownloadType, setPdfDownloadType] = useState('immediate');
  const [pdfCustomUnlockDate, setPdfCustomUnlockDate] = useState('');

  const [assignmentDownloadType, setAssignmentDownloadType] = useState('immediate');
  const [assignmentCustomUnlockDate, setAssignmentCustomUnlockDate] = useState('');

  const [videoDownloadType, setVideoDownloadType] = useState('immediate');
  const [videoCustomUnlockDate, setVideoCustomUnlockDate] = useState('');

  // Material Download Settings Edit Modal state (Teacher/Admin)
  const [editingDownloadModal, setEditingDownloadModal] = useState({
    isOpen: false,
    materialType: null,
    material: null,
    lessonId: null
  });
  const [editDownloadType, setEditDownloadType] = useState('immediate');
  const [editCustomUnlockDate, setEditCustomUnlockDate] = useState('');
  const [isSavingDownloadSettings, setIsSavingDownloadSettings] = useState(false);

  // Helper to determine material download availability status
  const getMaterialDownloadStatus = (item) => {
    if (!item) return { isAvailable: true, status: 'immediate', label: 'Download Available' };
    if (item.allowDownload === false || item.downloadDelayType === 'disabled') {
      return { isAvailable: false, status: 'disabled', label: 'View Only (Download Disabled)' };
    }
    if (item.downloadUnlockDate) {
      const unlockTime = new Date(item.downloadUnlockDate).getTime();
      const nowTime = Date.now();
      if (nowTime < unlockTime) {
        const diffDays = Math.max(1, Math.ceil((unlockTime - nowTime) / (1000 * 60 * 60 * 24)));
        const formattedDate = new Date(item.downloadUnlockDate).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
        return {
          isAvailable: false,
          status: 'scheduled',
          unlockDate: item.downloadUnlockDate,
          daysRemaining: diffDays,
          label: `🔒 Unlocks on ${formattedDate} (${diffDays}d left)`,
          formattedDate
        };
      }
    }
    return { isAvailable: true, status: 'immediate', label: 'Download Available' };
  };

  const handleOpenDownloadSettingsModal = (materialType, material, lessonId) => {
    setEditingDownloadModal({
      isOpen: true,
      materialType,
      material,
      lessonId
    });
    setEditDownloadType(material?.downloadDelayType || (material?.allowDownload === false ? 'disabled' : 'immediate'));
    setEditCustomUnlockDate(
      material?.downloadUnlockDate ? new Date(material.downloadUnlockDate).toISOString().split('T')[0] : ''
    );
  };

  const handleSaveMaterialDownloadSettings = async () => {
    if (!editingDownloadModal.material || !editingDownloadModal.lessonId) return;
    setIsSavingDownloadSettings(true);
    try {
      await api.patch(`/lessons/${editingDownloadModal.lessonId}/material-download-settings`, {
        materialType: editingDownloadModal.materialType,
        materialId: editingDownloadModal.material._id || editingDownloadModal.material.id,
        downloadDelayType: editDownloadType,
        downloadUnlockDate: editDownloadType === 'custom_date' ? editCustomUnlockDate : null,
        allowDownload: editDownloadType !== 'disabled'
      });
      toast.success("Download permissions updated successfully!");
      setEditingDownloadModal({ isOpen: false, materialType: null, material: null, lessonId: null });
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update download settings.");
    } finally {
      setIsSavingDownloadSettings(false);
    }
  };

  // Timetables and Role Helpers
  const [courseSchedules, setCourseSchedules] = useState([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const isTeacherOrAdmin = user?.role === 'admin' || user?.role === 'teacher';
  const isParent = user?.role === 'parent';

  useEffect(() => {
    if (courseId) {
      api.get('/schedules').then(res => {
        const matching = (res.data || []).filter(s => {
          const sCourseId = s.courseId?._id || s.courseId;
          return String(sCourseId) === String(courseId);
        });
        setCourseSchedules(matching);
      }).catch(() => {});
    }
  }, [courseId]);

  // Match course schedule matching student's grade or selected class
  const getActiveCourseSchedule = (schedules, userGrade, sGrade) => {
    if (!schedules || schedules.length === 0) return null;
    const targetGrade = userGrade || sGrade;
    if (targetGrade) {
      const uNum = targetGrade.toString().replace(/[^0-9]/g, '');
      const gradeMatch = schedules.find(s => {
        const sGradeStr = (s.grade || '').toString().toLowerCase();
        const sClassStr = (s.className || '').toString().toLowerCase();
        const sNum = (s.grade || s.className || '').toString().replace(/[^0-9]/g, '');
        return (uNum && sNum === uNum) || sGradeStr.includes(targetGrade.toString().toLowerCase()) || sClassStr.includes(targetGrade.toString().toLowerCase());
      });
      if (gradeMatch) return gradeMatch;
    }
    return schedules[0];
  };

  // Resolve all class session dates for the selected academic month according to class timetable day
  const getMonthSessionDates = (monthStr, schedule) => {
    if (!monthStr) return [];
    const parts = monthStr.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1], 10) || new Date().getFullYear();
    const monthIdx = MONTH_NAMES.indexOf(monthName);
    if (monthIdx === -1) return [];

    const dayMap = {
      'sunday': 0, 'sun': 0,
      'monday': 1, 'mon': 1,
      'tuesday': 2, 'tue': 2,
      'wednesday': 3, 'wed': 3,
      'thursday': 4, 'thu': 4,
      'friday': 5, 'fri': 5,
      'saturday': 6, 'sat': 6
    };

    // Use timetable's scheduled day (e.g. Monday, Tuesday, Friday, Saturday)
    const targetDayName = schedule?.dayOfWeek || 'Saturday';
    const targetDayIdx = dayMap[targetDayName.toLowerCase()] ?? 6;
    const sessions = [];
    const numDaysInMonth = new Date(year, monthIdx + 1, 0).getDate();
    let weekNum = 1;

    for (let day = 1; day <= numDaysInMonth; day++) {
      const d = new Date(year, monthIdx, day);
      if (d.getDay() === targetDayIdx) {
        const shortMonth = monthName.slice(0, 3);
        const dayPad = String(day).padStart(2, '0');
        const shortDay = targetDayName.slice(0, 3);
        sessions.push({
          weekNumber: weekNum,
          dayNumber: day,
          label: `${shortMonth} ${dayPad} (${shortDay})`,
          fullDateStr: `${shortMonth} ${dayPad}, ${year} (${targetDayName})`,
          dateObj: d,
          isFifthWeek: weekNum === 5,
          dayName: targetDayName
        });
        weekNum++;
      }
    }

    if (sessions.length === 0) {
      for (let w = 1; w <= 4; w++) {
        sessions.push({
          weekNumber: w,
          dayNumber: w * 7,
          label: `Week ${w}`,
          fullDateStr: `Week ${w} (${monthName} ${year})`,
          dateObj: new Date(year, monthIdx, Math.min(w * 7, numDaysInMonth)),
          isFifthWeek: false,
          dayName: targetDayName
        });
      }
    }

    return sessions;
  };

  // Helper to determine the relevant session week for today's date
  const getRelevantWeekForDate = (sessions, targetDate = new Date()) => {
    if (!sessions || sessions.length === 0) return 1;
    const todayMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    let matchedWeek = 1;
    for (const session of sessions) {
      if (session.dateObj && todayMidnight >= session.dateObj) {
        matchedWeek = session.weekNumber;
      }
    }
    return matchedWeek;
  };

  const activeSchedule = useMemo(() => {
    return getActiveCourseSchedule(courseSchedules, user?.grade, selectedGrade);
  }, [courseSchedules, user?.grade, selectedGrade]);

  const currentMonthSessions = useMemo(() => {
    return getMonthSessionDates(selectedMonth, activeSchedule);
  }, [selectedMonth, activeSchedule]);

  const hasAutoNavigatedRef = useRef(false);

  // Auto-navigate to current month and relevant session week when student enters
  useEffect(() => {
    if (currentMonthSessions.length > 0) {
      const isCurrentAcademicMonth = selectedMonth === getCurrentAcademicMonth();
      if (isCurrentAcademicMonth && !hasAutoNavigatedRef.current) {
        const relWeek = getRelevantWeekForDate(currentMonthSessions);
        setActiveWeek(relWeek);
        hasAutoNavigatedRef.current = true;
      } else if (activeWeek > currentMonthSessions.length) {
        setActiveWeek(1);
      }
    }
  }, [selectedMonth, currentMonthSessions, activeWeek]);

  const activeSessionObj = currentMonthSessions.find(s => s.weekNumber === activeWeek) || currentMonthSessions[0] || {
    weekNumber: activeWeek,
    label: `Week ${activeWeek}`,
    fullDateStr: `Week ${activeWeek} (${selectedMonth})`
  };

  // Material Completion Tracking (stored in localStorage per student/course/month/week)
  const [completedMaterials, setCompletedMaterials] = useState(() => {
    const saved = localStorage.getItem(`completed_materials_${user?.id || user?._id}`);
    return saved ? JSON.parse(saved) : {};
  });


  const markMaterialCompleted = (type) => {
    const key = `${user?.id || user?._id}_${courseId}_${selectedMonth}_w${activeWeek}_${type}`;
    const newCompleted = { ...completedMaterials, [key]: true };
    setCompletedMaterials(newCompleted);
    localStorage.setItem(`completed_materials_${user?.id || user?._id}`, JSON.stringify(newCompleted));
    toast.success(`${type === 'video' ? '🎬 Lecture Video' : '📄 PDF Notes'} marked as completed for Week ${activeWeek}!`);
  };

  const isVideoWatched = !!completedMaterials[`${user?.id || user?._id}_${courseId}_${selectedMonth}_w${activeWeek}_video`];
  const isPdfDownloaded = !!completedMaterials[`${user?.id || user?._id}_${courseId}_${selectedMonth}_w${activeWeek}_pdf`];
  const allMaterialsCovered = isVideoWatched && isPdfDownloaded;
  const coveredCount = (isVideoWatched ? 1 : 0) + (isPdfDownloaded ? 1 : 0);

  const fetchWeeklyAttendanceStatus = async () => {
    if (!courseId) return;
    try {
      const res = await api.get(`/attendance/weekly-status/${courseId}?month=${encodeURIComponent(selectedMonth)}`);
      setAttendedWeeks(res.data.attendedWeeks || []);
    } catch (err) {
      console.error("Error fetching weekly attendance status:", err);
    }
  };

  const fetchPdfReadingProgress = async () => {
    if (user?.role !== 'student' || !courseId) return;
    try {
      const res = await api.get(`/progress/course/${courseId}`);
      // Build a normalized map keyed by EVERY possible identifier (string _id, title, filename)
      const map = {};
      (res.data?.progressList || []).forEach(p => {
        const nextPage = p.isCompleted ? p.totalPages : Math.min(p.totalPages, (p.maxPageRead || 1) + 1);
        const itemData = {
          maxPageRead: p.maxPageRead,
          totalPages: p.totalPages,
          progressPercentage: p.progressPercentage,
          isCompleted: p.isCompleted,
          nextPageToRead: nextPage,
          lastReadAt: p.lastReadAt
        };
        // Always store by all identifiers as strings
        if (p.pdfId) {
          map[String(p.pdfId)] = itemData;
        }
        if (p.pdfTitle) {
          map[p.pdfTitle] = itemData;
        }
      });
      console.log('[PDF Progress] Loaded map keys:', Object.keys(map));
      setPdfProgressMap(map);
    } catch (err) {
      console.error("Error fetching PDF reading progress:", err);
    }
  };

  useEffect(() => {
    fetchWeeklyAttendanceStatus();
    fetchPdfReadingProgress();
  }, [courseId, user?._id || user?.id, selectedMonth]);

  const handleSubmitWeeklyAttendance = async (weekNum) => {
    if (!allMaterialsCovered) {
      toast.error(`Please complete all study materials for Week ${weekNum} before submitting attendance.`);
      return;
    }

    setIsSubmittingAttendance(true);
    try {
      const res = await api.post('/attendance/submit-weekly', {
        courseId,
        weekNumber: weekNum,
        month: selectedMonth
      });
      toast.success(res.data.message || `Attendance for Week ${weekNum} (${selectedMonth}) submitted!`);
      setAttendedWeeks(prev => Array.from(new Set([...prev, weekNum])));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit weekly attendance.');
    } finally {
      setIsSubmittingAttendance(false);
    }
  };

  const allGrades = [
    "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11",
    "Grade 12 Science", "Grade 12 Commerce", "Grade 12 Arts", "Grade 12 Tech",
    "Grade 13 Science", "Grade 13 Commerce", "Grade 13 Arts", "Grade 13 Tech"
  ];

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get(`/quizzes/course/${courseId}`);
      setQuizzes(res.data);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  };

  const handleToggleQuizActive = async (quizId) => {
    try {
      await api.patch(`/quizzes/${quizId}/toggle`);
      toast.success("Quiz status updated!");
      await fetchQuizzes();
    } catch (err) {
      toast.error("Failed to toggle quiz status.");
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm("Are you sure you want to delete this quiz?")) return;
    try {
      await api.delete(`/quizzes/${quizId}`);
      toast.success("Quiz deleted successfully!");
      await fetchQuizzes();
    } catch (err) {
      toast.error("Failed to delete quiz.");
    }
  };

  const fetchCourseDetails = async () => {
    try {
      const res = await api.get(`/courses/${courseId}`);
      setCourse(res.data);

      const lessonsRes = await api.get(`/lessons/course/${courseId}`);
      setLessons(lessonsRes.data);
      
      await fetchQuizzes();
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
      const res = await api.post(`/courses/${courseId}/toggle-grade`,
        { gradeNumber }
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
    let targetGradeNumber = '';

    if (gradeMode === 'single') {
      if (!newGradeNumber) {
        toast.error('Please select a grade.');
        return;
      }
      targetGradeNumber = newGradeNumber;
    } else {
      if (combinationGrades.length > 0) {
        targetGradeNumber = combinationGrades.join(' & ');
      } else if (customGradeInput.trim()) {
        targetGradeNumber = customGradeInput.trim();
      } else {
        toast.error('Please select grades or enter a combination grade name.');
        return;
      }
    }

    if (!newGradeTitle.trim()) {
      toast.error('Please enter a grade title.');
      return;
    }

    try {
      const res = await api.post('/lessons/add-grade', {
        grade: targetGradeNumber,
        title: newGradeTitle,
        courseId
      });
      toast.success(res.data.message || `Grade "${targetGradeNumber}" added successfully.`);
      const isCourseDeactive = course?.status === 'deactive' || course?.isActive === false;
      const newGradeEntry = res.data.newGradeEntry || {
        gradeNumber: targetGradeNumber,
        title: newGradeTitle.trim(),
        status: isCourseDeactive ? 'deactive' : 'active',
        isActive: !isCourseDeactive,
        deactivatedBy: isCourseDeactive ? 'admin' : null,
        messages: []
      };
      setCourse((prev) => prev ? {
        ...prev,
        enrolledGrades: [...(prev.enrolledGrades || []), newGradeEntry]
      } : prev);
      setNewGradeNumber('');
      setCombinationGrades([]);
      setCustomGradeInput('');
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
      const res = await api.delete(`/courses/${courseId}`);
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

  const executeToggleGradeStatus = async (confirmObj) => {
    if (!confirmObj) return;
    const { gradeId, gradeNumber, isDeactive, deactivatedBy } = confirmObj;
    const isUserAdmin = user?.role === 'admin';
    const isUserTeacher = user?.role === 'teacher';

    const isFullCourseDeactive = course?.status === 'deactive' || course?.isActive === false;
    if (isFullCourseDeactive) {
      toast.error("Full course is currently deactivated. Please activate the full course first to change grade statuses.");
      setDeactivateConfirmGrade(null);
      return;
    }

    if (!isUserAdmin && deactivatedBy === 'admin') {
      toast.error("This grade stream was deactivated by Admin. Only Admin can reactivate it.");
      setDeactivateConfirmGrade(null);
      return;
    }

    const newStatus = isDeactive ? 'active' : 'deactive';
    const deactivatedByRole = isUserAdmin ? 'admin' : 'teacher';

    try {
      await api.put(`/courses/${courseId}/grades/${gradeId || gradeNumber}/status`, {
        status: newStatus,
        deactivatedBy: newStatus === 'deactive' ? deactivatedByRole : null
      });
      toast.success(`Grade "${gradeNumber}" has been ${newStatus === 'deactive' ? 'deactivated' : 'activated'} by ${isUserAdmin ? 'Admin' : 'Teacher'}.`);
    } catch {
      toast.success(`Grade "${gradeNumber}" has been ${newStatus === 'deactive' ? 'deactivated' : 'activated'}.`);
    }

    setCourse((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        enrolledGrades: (prev.enrolledGrades || []).map(g => {
          if (g._id === gradeId || g.id === gradeId || g.gradeNumber === gradeNumber) {
            return {
              ...g,
              status: newStatus,
              isActive: newStatus === 'active',
              deactivatedBy: newStatus === 'deactive' ? deactivatedByRole : null
            };
          }
          return g;
        })
      };
    });

    setDeactivateConfirmGrade(null);
  };

  const handleEnroll = async () => {
    try {
      setIsEnrolling(true);
      await api.post(`/courses/${courseId}/enroll`, {});
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
      const res = await api.get(`/courses/${courseId}/students/${encodeURIComponent(gradeNumber)}`);
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

  const refreshGradeStudentsList = async (gradeNumber) => {
    try {
      const updatedRes = await api.get(`/courses/${courseId}/students/${encodeURIComponent(gradeNumber)}`);
      setGradeStudents(updatedRes.data);
      if (selectedStudentDetail) {
        const freshStudent = updatedRes.data.find(s => s._id === selectedStudentDetail._id);
        if (freshStudent) setSelectedStudentDetail(freshStudent);
      }
      setSelectedStudentIds(updatedRes.data.filter((student) => student.isEnrolled).map((student) => student._id));
      await fetchCourseDetails();
    } catch (err) {
      console.error("Failed refreshing grade students", err);
    }
  };

  const handleBatchEnroll = async () => {
    if (!selectedEnrollGrade) return;
    const unenrolledSelected = selectedStudentIds.filter(id => {
      const st = gradeStudents.find(s => s._id === id);
      return st && !st.isEnrolled;
    });

    const targetIds = unenrolledSelected.length > 0 ? unenrolledSelected : selectedStudentIds;

    if (targetIds.length === 0) {
      toast.error('Please select at least one student to enroll.');
      return;
    }

    try {
      setIsUpdatingGradeStudents(true);
      const res = await api.post(`/courses/${courseId}/enroll-students/${encodeURIComponent(selectedEnrollGrade)}`, {
        studentIds: targetIds
      });
      toast.success(res.data.message || 'Batch enrollment successful.');
      await refreshGradeStudentsList(selectedEnrollGrade);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed batch enrollment.');
    } finally {
      setIsUpdatingGradeStudents(false);
    }
  };

  const handleBatchRemove = async () => {
    if (!selectedEnrollGrade) return;
    const enrolledSelected = selectedStudentIds.filter(id => {
      const st = gradeStudents.find(s => s._id === id);
      return st && st.isEnrolled;
    });

    const targetIds = enrolledSelected.length > 0 ? enrolledSelected : selectedStudentIds;

    if (targetIds.length === 0) {
      toast.error('Please select at least one enrolled student to remove.');
      return;
    }

    try {
      setIsUpdatingGradeStudents(true);
      const res = await api.post(`/courses/${courseId}/remove-students/${encodeURIComponent(selectedEnrollGrade)}`, {
        studentIds: targetIds
      });
      toast.success(res.data.message || 'Batch removal successful.');
      await refreshGradeStudentsList(selectedEnrollGrade);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed batch removal.');
    } finally {
      setIsUpdatingGradeStudents(false);
    }
  };

  const handleSingleStudentEnrollRemove = async (mode, studentId) => {
    if (!selectedEnrollGrade) return;
    try {
      setIsUpdatingGradeStudents(true);
      const endpoint = mode === 'enroll'
        ? `/courses/${courseId}/enroll-students/${encodeURIComponent(selectedEnrollGrade)}`
        : `/courses/${courseId}/remove-students/${encodeURIComponent(selectedEnrollGrade)}`;

      const res = await api.post(endpoint, { studentIds: [studentId] });
      toast.success(res.data.message || 'Student enrollment updated.');
      await refreshGradeStudentsList(selectedEnrollGrade);
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
      await api.put(`/lessons/${currentLesson._id}`,
        { teacherMessage: editingMessage }
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
    const newVideoItem = {
      title: videoTitle.trim(),
      url: videoUrl.trim(),
      allowDownload: videoDownloadType !== 'disabled',
      downloadDelayType: videoDownloadType,
      downloadUnlockDate: videoDownloadType === 'custom_date' && videoCustomUnlockDate ? new Date(videoCustomUnlockDate) : null,
      uploadedAt: new Date()
    };
    const updatedVideos = [...(currentLesson.videoLessons || []), newVideoItem];
    try {
      await api.put(`/lessons/${currentLesson._id}`,
        { videoLessons: updatedVideos }
      );
      toast.success("Video lesson added with download permissions!");
      setVideoTitle("");
      setVideoUrl("");
      setVideoDownloadType('immediate');
      setVideoCustomUnlockDate('');
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
      await api.put(`/lessons/${currentLesson._id}`,
        { videoLessons: updatedVideos }
      );
      toast.success("Video lesson removed!");
      fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to delete video.");
    }
  };

  const handleUploadPdf = async (e) => {
    e.preventDefault();
    if (!pdfFile) {
      toast.error("Please select a PDF file first.");
      return;
    }

    // Client-side validation: Max 5MB
    if (pdfFile.size > 5 * 1024 * 1024) {
      toast.error("Cannot upload file. The maximum allowed size is 5MB.");
      return;
    }

    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;

    setIsUploadingPdf(true);
    const formData = new FormData();
    formData.append('pdf', pdfFile);
    formData.append('title', pdfTitle.trim() || pdfFile.name);
    formData.append('allowDownload', pdfDownloadType !== 'disabled');
    formData.append('downloadDelayType', pdfDownloadType);
    if (pdfDownloadType === 'custom_date' && pdfCustomUnlockDate) {
      formData.append('downloadUnlockDate', pdfCustomUnlockDate);
    }

    try {
      await api.post(`/lessons/${currentLesson._id}/pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("PDF uploaded with download permissions!");
      setPdfFile(null);
      setPdfTitle("");
      setPdfDownloadType('immediate');
      setPdfCustomUnlockDate('');
      await fetchCourseDetails();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to upload PDF.";
      toast.error(errMsg);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Live Streaming States
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveStreamTitle, setLiveStreamTitle] = useState('');
  const [liveYoutubeUrl, setLiveYoutubeUrl] = useState('');
  const [saveLiveAsVideo, setSaveLiveAsVideo] = useState(true);
  const [isPublishingLive, setIsPublishingLive] = useState(false);

  const handleDeletePdf = async (pdfId) => {
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    if (!window.confirm("Are you sure you want to delete this PDF?")) return;

    try {
      await api.delete(`/lessons/${currentLesson._id}/pdf/${pdfId}`);
      toast.success("PDF material removed!");
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete PDF.");
    }
  };

  const handleUploadAssignment = async (e) => {
    e.preventDefault();
    if (!assignmentFile) {
      toast.error("Please select an assignment PDF file first.");
      return;
    }

    if (assignmentFile.size > 5 * 1024 * 1024) {
      toast.error("Cannot upload file. The maximum allowed size is 5MB.");
      return;
    }

    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;

    setIsUploadingAssignment(true);
    const formData = new FormData();
    formData.append('pdf', assignmentFile);
    formData.append('title', assignmentTitle.trim() || assignmentFile.name);
    formData.append('allowDownload', assignmentDownloadType !== 'disabled');
    formData.append('downloadDelayType', assignmentDownloadType);
    if (assignmentDownloadType === 'custom_date' && assignmentCustomUnlockDate) {
      formData.append('downloadUnlockDate', assignmentCustomUnlockDate);
    }

    try {
      await api.post(`/lessons/${currentLesson._id}/assignment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("Assignment PDF uploaded with download permissions!");
      setAssignmentFile(null);
      setAssignmentTitle("");
      setAssignmentDownloadType('immediate');
      setAssignmentCustomUnlockDate('');
      await fetchCourseDetails();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to upload Assignment PDF.";
      toast.error(errMsg);
    } finally {
      setIsUploadingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (pdfId) => {
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    if (!window.confirm("Are you sure you want to delete this Assignment PDF?")) return;

    try {
      await api.delete(`/lessons/${currentLesson._id}/assignment/${pdfId}`);
      toast.success("Assignment PDF removed!");
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete Assignment PDF.");
    }
  };

  const handleDeleteDemoVideo = async () => {
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    if (!window.confirm("Are you sure you want to remove the default master lecture video?")) return;

    try {
      await api.put(`/lessons/${currentLesson._id}`, { hideDemoVideo: true });
      toast.success("Default lecture video removed!");
      await fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to remove default video.");
    }
  };

  const handleDeleteDemoPdf = async () => {
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    if (!window.confirm("Are you sure you want to remove the default study material PDF?")) return;

    try {
      await api.put(`/lessons/${currentLesson._id}`, { hideDemoPdf: true });
      toast.success("Default study material PDF removed!");
      await fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to remove default PDF.");
    }
  };

  const handleStartLiveStream = async (e) => {
    e.preventDefault();
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) {
      toast.error("Please select a class workspace first.");
      return;
    }

    if (!liveYoutubeUrl.trim()) {
      toast.error("Please enter a YouTube Live link or Video ID.");
      return;
    }

    try {
      setIsPublishingLive(true);
      const res = await api.post(`/lessons/${currentLesson._id}/live-stream`, {
        youtubeUrl: liveYoutubeUrl.trim(),
        title: liveStreamTitle.trim()
      });
      toast.success(res.data.message || "Live Class published successfully!");
      setShowLiveModal(false);
      setLiveYoutubeUrl('');
      setLiveStreamTitle('');
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to publish live class.");
    } finally {
      setIsPublishingLive(false);
    }
  };

  const handleEndLiveStream = async (shouldSaveVideo = true) => {
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    if (!window.confirm("Are you sure you want to end this Live Class?")) return;

    try {
      const res = await api.delete(`/lessons/${currentLesson._id}/live-stream`, {
        data: { saveAsVideo: shouldSaveVideo }
      });
      toast.success(res.data.message || "Live Class ended!");
      setShowLiveModal(false);
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to end live stream.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-10 gap-3">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600 dark:border-purple-400"></div>
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 animate-pulse">Loading course details...</span>
      </div>
    );
  }

  const normalizeGrade = (g) => g ? String(g).toLowerCase().replace(/\s+/g, '').replace('grade', '') : '';
  const currentLesson = lessons.find(l => l.grade === selectedGrade);
  const studentGrade = user?.grade;
  const alreadyEnrolled = course?.enrolledStudents?.some(
    (s) => s?._id?.toString() === user?.id?.toString()
  );
  const canEnroll = user?.role === 'student' && studentGrade && course?.enrolledGrades?.some(g => normalizeGrade(g.gradeNumber) === normalizeGrade(studentGrade)) && !alreadyEnrolled;

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
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans text-gray-800 dark:text-gray-100 space-y-6 transition-colors duration-200">

      {/* Parent Read-Only Overview Banner */}
      {user?.role === 'parent' && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-900 text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-purple-700/50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-2xl font-black shrink-0">
              👨‍👩‍👧
            </div>
            <div>
              <h4 className="font-extrabold text-white text-base sm:text-lg">Parent Read-Only Mode</h4>
              <p className="text-xs text-purple-200/90 mt-0.5 max-w-2xl leading-relaxed">
                Overview of course curriculum, assigned instructors, available grade streams, and live class timetables. Management and upload controls are disabled for parents.
              </p>
            </div>
          </div>
          <span className="px-4 py-1.5 bg-amber-400 text-purple-950 text-xs font-black rounded-full uppercase tracking-wider shadow-sm">
            👁️ Read-Only View
          </span>
        </div>
      )}

      {/* Dynamic Header: Shows course details or class breadcrumbs */}
      {selectedGrade === null ? (
        <div className="mb-8 relative">
          {/* Facebook Style Cover Banner */}
          <div className="relative w-full h-72 md:h-96 rounded-3xl overflow-hidden shadow-lg bg-gradient-to-r from-[#2d1b64] via-purple-900 to-indigo-900 group">
            {course?.banner || course?.cardImage ? (
              <img 
                src={getImageUrl(course.banner || course.cardImage)} 
                alt={course.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-indigo-900 to-[#2d1b64] flex items-center justify-center text-white">
                <FaBookOpen className="text-6xl text-purple-300/40" />
              </div>
            )}
          </div>

          {/* Facebook Style Instructor Profile Overlay (Prominent Size, NO Arrow) */}
          {course?.instructor && (
            <div className="relative -mt-14 sm:-mt-20 px-6 sm:px-8 z-20 flex items-end justify-between flex-wrap gap-4">
              <div 
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTeacherForModal(course.instructor);
                }}
                className="flex items-end gap-4 sm:gap-5 cursor-pointer group/teacher transition-transform duration-300 transform hover:scale-102"
                title="Click to view Teacher Profile"
              >
                {/* Facebook Style Large Profile Avatar */}
                <div className="relative shrink-0">
                  {course.instructor.profilePicture ? (
                    <img
                      src={getImageUrl(course.instructor.profilePicture)}
                      alt={course.instructor.name || 'Instructor'}
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-white dark:ring-slate-900 shadow-2xl bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-800 group-hover/teacher:ring-purple-600 group-hover/teacher:scale-105 transition-all duration-300"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white rounded-full flex items-center justify-center font-black text-4xl sm:text-5xl ring-4 ring-white dark:ring-slate-900 shadow-2xl border-2 border-purple-100 dark:border-purple-800 group-hover/teacher:ring-purple-600 group-hover/teacher:scale-105 transition-all">
                      {course.instructor.name ? course.instructor.name.charAt(0) : '?'}
                    </div>
                  )}
                </div>

                {/* Instructor Badge & Prominent Name (No Arrow) */}
                <div className="pb-1">
                  <span className="text-xs font-black text-white bg-purple-600 px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5 w-fit mb-1 border border-purple-400/40 uppercase tracking-widest">
                    <FaChalkboardTeacher /> INSTRUCTOR
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight group-hover/teacher:text-purple-800 dark:group-hover/teacher:text-purple-400 transition-colors">
                    {course.instructor.name || 'Unassigned'}
                  </h4>
                </div>
              </div>
            </div>
          )}

          {/* Course Title & Description */}
          <div className="mt-6">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 dark:text-white tracking-tight mb-3">{course?.title}</h1>
            <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed font-medium">{course?.description}</p>
          </div>

          {/* Class Timetables & Schedule Toggle Section */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className={`px-5 py-3 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-lg flex items-center gap-3 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 border ${
                  showSchedule
                    ? 'bg-gradient-to-r from-purple-800 via-indigo-900 to-slate-900 text-white border-purple-400/60 shadow-purple-900/30 ring-2 ring-purple-400/30'
                    : 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-900 hover:from-purple-800 hover:to-indigo-950 text-white border-purple-400/50 shadow-purple-600/30 ring-2 ring-purple-300/40'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FaCalendarAlt className="text-xl sm:text-2xl text-amber-300 drop-shadow-xs" />
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-90"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
                  </span>
                </div>
                <span className="tracking-tight">
                  {showSchedule ? 'Hide Class Schedule' : 'View Class Timetables'}
                </span>
                <span className="ml-1 text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-extrabold backdrop-blur-xs">
                  {courseSchedules.length} Sessions
                </span>
                {showSchedule ? <FaChevronUp className="text-xs text-amber-300" /> : <FaChevronDown className="text-xs text-amber-300" />}
              </button>

              {user?.role === 'student' && (
                <>
                  {user?.grade && (
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/80 px-4 py-2.5 rounded-2xl shadow-sm">
                      <div className="w-9 h-9 rounded-xl bg-[#2d1b64] text-white flex items-center justify-center font-bold text-base shadow-sm">
                        🎓
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-purple-600/80 uppercase tracking-widest block leading-none">Your Grade</span>
                        <span className="text-sm font-extrabold text-gray-900">{user.grade}</span>
                      </div>
                    </div>
                  )}

                  {!alreadyEnrolled ? (
                    <button
                      type="button"
                      onClick={() => setShowEnrollModal(true)}
                      className="rounded-2xl bg-gradient-to-r from-purple-600 to-[#2d1b64] text-white px-7 py-3 text-sm font-extrabold hover:from-purple-700 hover:to-purple-900 transition-all shadow-md hover:shadow-xl cursor-pointer flex items-center gap-2"
                    >
                      <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V8a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span>Enroll & Pay Online 💳</span>
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-2 bg-green-50 text-green-700 border border-green-200 px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-sm">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                      </svg>
                      Enrolled Student
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Collapsible Schedule Section */}
            {showSchedule && (
              <div className="mt-3 p-6 bg-gradient-to-br from-purple-900/5 via-indigo-900/5 to-purple-950/10 dark:from-slate-900 dark:via-purple-950/30 dark:to-slate-900 rounded-3xl border border-purple-200/90 dark:border-slate-800 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-purple-200/60 dark:border-slate-800">
                  <div>
                    <h3 className="text-lg font-black text-purple-950 dark:text-white flex items-center gap-2">
                      <span>📅</span> Class Timetables & Weekly Schedule
                    </h3>
                    <p className="text-xs text-purple-800/80 dark:text-purple-300/80 font-medium">Live class session times, scheduled days, and venue locations for enrolled grades.</p>
                  </div>
                  <span className="bg-purple-950 dark:bg-purple-900 text-amber-300 text-xs font-black px-3.5 py-1 rounded-xl shadow-xs border border-purple-800 dark:border-purple-700">
                    {courseSchedules.length} Timetable Sessions
                  </span>
                </div>

                {courseSchedules.length === 0 ? (
                  <div className="p-6 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-purple-100 dark:border-slate-800 text-center text-xs font-semibold text-purple-900 dark:text-purple-300 shadow-2xs">
                    No specific live timetable schedules registered for this course yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {courseSchedules.map((sch) => (
                      <div key={sch._id} className="p-4.5 bg-white dark:bg-slate-900 rounded-2xl border border-purple-200/90 dark:border-slate-800 shadow-sm hover:shadow-md transform hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-300 space-y-3 group cursor-pointer">
                        <div className="flex justify-between items-center gap-1.5 flex-wrap">
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-900 to-indigo-950 dark:from-purple-800 dark:to-indigo-900 text-amber-300 font-black text-[11px] rounded-xl uppercase tracking-wider shadow-xs">
                            🎓 {sch.className || sch.grade || 'All Grades'}
                          </span>
                          <span className="px-3 py-1 bg-amber-100 dark:bg-amber-950/60 text-amber-950 dark:text-amber-300 font-black text-[11px] rounded-xl border border-amber-300 dark:border-amber-800 uppercase shadow-2xs">
                            🗓️ {sch.dayOfWeek}
                          </span>
                        </div>
                        <h5 className="font-extrabold text-slate-900 dark:text-white text-sm group-hover:text-purple-950 dark:group-hover:text-purple-300 transition-colors line-clamp-2">
                          {sch.title}
                        </h5>
                        <div className="pt-2 border-t border-purple-100 dark:border-slate-800 text-xs font-extrabold text-purple-950 dark:text-purple-300 flex items-center justify-between gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-300">
                            <FaClock className="text-purple-600 dark:text-purple-400" /> {sch.startTime} - {sch.endTime}
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-300">
                            <FaMapMarkerAlt className="text-indigo-600 dark:text-indigo-400" /> {sch.room || 'Main Hall'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <button
              onClick={() => setSelectedGrade(null)}
              className="mb-2 flex items-center gap-2 text-[#2d1b64] dark:text-purple-400 hover:underline font-bold transition cursor-pointer"
            >
              ← Back to Classes
            </button>
            <h1 className="text-3xl font-extrabold text-gray-800 dark:text-white mb-1">{course?.title}</h1>
            <p className="text-purple-600 dark:text-purple-400 font-bold text-lg">{selectedGrade} Workspace</p>
          </div>

          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <button
              type="button"
              onClick={() => {
                if (currentLesson?.liveStream?.isLive) {
                  setLiveStreamTitle(currentLesson.liveStream.title || '');
                  setLiveYoutubeUrl(currentLesson.liveStream.youtubeUrl || '');
                }
                setShowLiveModal(true);
              }}
              className={`px-5 py-3 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-lg flex items-center gap-3 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 border ${
                currentLesson?.liveStream?.isLive
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white border-red-400 shadow-red-500/30 ring-2 ring-red-300'
                  : 'bg-gradient-to-r from-[#FF0000] via-[#E60000] to-[#CC0000] hover:from-[#E60000] hover:to-[#B30000] text-white border-red-500/40 shadow-red-600/30'
              }`}
            >
              <div className="flex items-center gap-2">
                <FaYoutube className="text-2xl sm:text-3xl text-white drop-shadow-sm" />
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                </span>
              </div>
              <span className="tracking-tight">
                {currentLesson?.liveStream?.isLive ? 'Manage Live Class' : 'Start YouTube Live Class'}
              </span>
            </button>
          )}
        </div>
      )}

      {/* VIEW 1: GRID OF CLASS CARDS (Shown when no class is selected) */}
      {selectedGrade === null && (
        <div className="space-y-8">

          {/* Class Management Section */}
          {user?.role === 'admin' && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-700 dark:text-white mb-1">Assign/Remove Classes</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Add grades that can access this course and remove them when needed.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddGrade(true)}
                    className="rounded-full bg-purple-600 hover:bg-purple-700 text-white px-5 py-2 font-semibold transition cursor-pointer shadow-xs"
                  >
                    + Add Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-full bg-red-500 hover:bg-red-600 px-5 py-2 text-white font-semibold transition cursor-pointer shadow-xs"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Course'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {course?.enrolledGrades?.map((eg) => (
                  <div
                    key={eg.gradeNumber}
                    className="relative bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500 cursor-pointer group"
                  >
                    <div className="absolute right-4 top-4 flex flex-col gap-2 z-10">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openStudentPicker(eg.gradeNumber);
                        }}
                        className="rounded-full border border-green-200 dark:border-green-800/60 bg-green-50 dark:bg-green-950/40 px-3 py-1 text-xs font-semibold text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/60 transition cursor-pointer shadow-xs"
                      >
                        Manage Students
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleGrade(eg.gradeNumber);
                        }}
                        className="rounded-full border border-red-200 dark:border-red-800/60 bg-red-50 dark:bg-red-950/40 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 transition cursor-pointer shadow-xs"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="mb-2 text-xs text-gray-400 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 font-bold transition-colors">{eg.gradeNumber}</div>
                    <h4 className="text-lg font-extrabold text-gray-800 dark:text-white mb-1 group-hover:text-purple-900 dark:group-hover:text-purple-300 transition-colors">{eg.title || eg.gradeNumber}</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">This class can enrol in the course when assigned.</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes Grid */}
          <div>
            {course?.enrolledGrades?.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-[30px] text-center border border-dashed border-gray-200 dark:border-slate-800">
                <p className="text-gray-400 italic">No classes assigned to this course yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {course?.enrolledGrades
                  ?.filter((eg) => {
                    if (user?.role !== 'student') return true;
                    if (!user?.grade) return false;
                    const studentGradeNorm = normalizeGrade(user.grade);
                    const gNum = eg.gradeNumber || '';
                    const parts = gNum.split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade);
                    return parts.includes(studentGradeNorm) || normalizeGrade(gNum) === studentGradeNorm;
                  })
                  .map((eg) => {
                    const isFullCourseDeactive = course?.status === 'deactive' || course?.isActive === false;
                    const isDeactive = isFullCourseDeactive || eg.status === 'deactive' || eg.isActive === false;
                    const deactivatedByRole = eg.deactivatedBy || 'admin';
                    
                    let canToggleStatus = false;
                    if (user?.role === 'admin') {
                      // Admin cannot reactivate a grade stream deactivated by Teacher
                      canToggleStatus = !(isDeactive && deactivatedByRole === 'teacher');
                    } else if (user?.role === 'teacher') {
                      // Teacher cannot reactivate a grade stream deactivated by Admin
                      canToggleStatus = !(isDeactive && deactivatedByRole === 'admin');
                    }

                    return (
                      <div
                        key={eg.gradeNumber}
                        onClick={() => {
                          if (isDeactive) {
                            if (user?.role === 'admin') {
                              setSelectedGrade(eg.gradeNumber);
                              return;
                            }
                            if (user?.role === 'teacher') {
                              if (deactivatedByRole === 'admin') {
                                toast.error("This grade stream was deactivated by Admin. You cannot access it.");
                                return;
                              }
                              setSelectedGrade(eg.gradeNumber);
                              return;
                            }
                            toast.error("This grade stream is currently deactivated.");
                            return;
                          }

                          if (user?.role === 'student' && !alreadyEnrolled) {
                            toast.error("Please click the '+ Enroll Course' button above to enroll before accessing the workspace.");
                            return;
                          }
                          setSelectedGrade(eg.gradeNumber);
                        }}
                        className={`bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xs border transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative ${
                          isDeactive
                            ? 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 cursor-pointer'
                            : user?.role === 'student' && !alreadyEnrolled
                            ? 'border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 cursor-pointer hover:border-purple-300' 
                            : 'border-purple-100/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer group'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors ${
                              isDeactive
                                ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                                : user?.role === 'student' && !alreadyEnrolled
                                ? 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                                : 'bg-[#f3f4f6] dark:bg-slate-800 group-hover:bg-[#2d1b64] group-hover:text-white'
                            }`}>
                              {isDeactive ? '🔒' : user?.role === 'student' && !alreadyEnrolled ? '🔒' : '🎓'}
                            </div>

                            {user?.role === 'student' && !alreadyEnrolled ? (
                              <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                                🔒 Enroll Required
                              </span>
                            ) : isDeactive ? (
                              canToggleStatus ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isFullCourseDeactive) {
                                      toast.error("This full course is currently deactivated. Please activate the full course first to manage grade statuses.");
                                      return;
                                    }
                                    if (user?.role === 'admin' && deactivatedByRole === 'teacher') {
                                      toast.error("This grade stream was deactivated by Teacher. Only the teacher can reactivate it.");
                                      return;
                                    }
                                    setDeactivateConfirmGrade({
                                      gradeId: eg._id || eg.id,
                                      gradeNumber: eg.gradeNumber,
                                      title: eg.title || eg.gradeNumber,
                                      isDeactive: true,
                                      deactivatedBy: eg.deactivatedBy
                                    });
                                  }}
                                  className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1.5 border border-red-500 transition-all cursor-pointer hover:scale-105"
                                  title="Click to Reactivate Grade Stream"
                                >
                                  <FaLock className="text-xs" /> Deactive
                                </button>
                              ) : (
                                <span className="bg-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm flex items-center gap-1.5 border border-red-500 opacity-80 cursor-not-allowed" title="Deactivated by Admin">
                                  <FaLock className="text-xs" /> Deactive
                                </span>
                              )
                            ) : (
                              canToggleStatus ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (isFullCourseDeactive) {
                                      toast.error("This full course is currently deactivated. Please activate the full course first to manage grade statuses.");
                                      return;
                                    }
                                    setDeactivateConfirmGrade({
                                      gradeId: eg._id || eg.id,
                                      gradeNumber: eg.gradeNumber,
                                      title: eg.title || eg.gradeNumber,
                                      isDeactive: false,
                                      deactivatedBy: eg.deactivatedBy
                                    });
                                  }}
                                  className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xs flex items-center gap-1.5 border border-emerald-400 transition-all cursor-pointer hover:scale-105"
                                  title="Click to Deactivate Grade Stream"
                                >
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                  Active
                                </button>
                              ) : (
                                <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest shadow-xs flex items-center gap-1.5 border border-emerald-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                  Active
                                </span>
                              )
                            )}
                          </div>
                        <h3 className={`text-2xl font-bold mb-2 transition-colors ${
                          user?.role === 'student' && !alreadyEnrolled ? 'text-gray-700 dark:text-gray-300' : 'text-gray-800 dark:text-white group-hover:text-[#2d1b64] dark:group-hover:text-purple-300'
                        }`}>
                          {eg.title || eg.gradeNumber}
                        </h3>
                        <p className="text-gray-400 text-xs mt-2 font-medium">
                          {user?.role === 'student' && !alreadyEnrolled
                            ? 'Enroll required to view announcements & lessons' 
                            : 'Click to view announcements and lessons'}
                        </p>
                      </div>

                      {user?.role === 'teacher' && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isDeactive && deactivatedByRole === 'admin') {
                                toast.error("This grade stream was deactivated by Admin. Managing students is disabled.");
                                return;
                              }
                              openStudentPicker(eg.gradeNumber);
                            }}
                            disabled={isDeactive && deactivatedByRole === 'admin'}
                            className={`rounded-xl border px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${
                              isDeactive && deactivatedByRole === 'admin'
                                ? 'border-gray-200 dark:border-slate-700 bg-gray-100 dark:bg-slate-800 text-gray-400 cursor-not-allowed opacity-60'
                                : 'border-green-200 dark:border-green-900/60 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/60 hover:border-green-300 cursor-pointer'
                            }`}
                          >
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                            View Students & Details
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CLASS WORKSPACE CONTENT PANEL (Shown when a class is clicked) */}
      {selectedGrade !== null && (
        <div className="space-y-6">

          {/* Active YouTube Live Stream Player */}
          {currentLesson?.liveStream?.isLive && (
            <LiveStreamPlayer
              liveStream={currentLesson.liveStream}
              isTeacherOrAdmin={user?.role === 'admin' || user?.role === 'teacher'}
              onEndStream={() => handleEndLiveStream(saveLiveAsVideo)}
            />
          )}

          {/* Month Selector Bar */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                  <span>🗓️</span> Academic Month Selector
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Select a month to view weekly study materials and attendance logs. Future months are locked.</p>
              </div>

              {/* Year Navigation */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleNavYearPrev}
                  disabled={navYear <= MIN_NAV_YEAR}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-300 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Year"
                >
                  ‹
                </button>
                <span className="font-black text-gray-900 dark:text-white text-base min-w-[56px] text-center tabular-nums">{navYear}</span>
                <button
                  type="button"
                  onClick={handleNavYearNext}
                  disabled={navYear >= currentYear}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 hover:text-purple-800 dark:hover:text-purple-300 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Year"
                >
                  ›
                </button>
              </div>
            </div>

            {/* 12-Month Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {availableMonths.map(({ label, monthIdx, locked }) => {
                const isSelected = selectedMonth === label;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setSelectedMonth(label)}
                    title={locked ? 'This month is not available yet' : label}
                    className={`relative px-2 py-2.5 text-xs font-bold rounded-xl transition text-center leading-tight ${
                      locked
                        ? 'bg-gray-50 dark:bg-slate-800/40 text-gray-300 dark:text-gray-600 cursor-not-allowed border border-dashed border-gray-200 dark:border-slate-800'
                        : isSelected
                          ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-400 ring-offset-1 scale-105 cursor-pointer'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-slate-700 hover:text-purple-900 dark:hover:text-white cursor-pointer'
                    }`}
                  >
                    {locked && (
                      <span className="absolute top-1 right-1 text-[9px] text-gray-300 dark:text-gray-600">🔒</span>
                    )}
                    {MONTH_NAMES[monthIdx].slice(0, 3)}
                    {isSelected && !locked && (
                      <span className="block text-[9px] font-extrabold text-purple-200 mt-0.5 uppercase tracking-wide">Active</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Workspace Navigation Tabs */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                  <span>📅</span> Class Sessions & Workspace — {selectedMonth}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {activeSchedule ? (
                    <span>Timetable: <strong className="text-purple-900 dark:text-purple-300 font-extrabold">{activeSchedule.dayOfWeek} ({activeSchedule.startTime} - {activeSchedule.endTime})</strong> • {currentMonthSessions.length} sessions in {selectedMonth}</span>
                  ) : (
                    <span>Select a scheduled class date to access study materials and attendance logs. ({currentMonthSessions.length} sessions in {selectedMonth})</span>
                  )}
                </p>
              </div>
              <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-xs font-extrabold px-3 py-1 rounded-lg self-start sm:self-auto border border-purple-200 dark:border-purple-800">
                Active: {activeSessionObj.label}
              </span>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 ${currentMonthSessions.length >= 5 ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3`}>
              {currentMonthSessions.map((session) => {
                const wNum = session.weekNumber;
                const isAttended = attendedWeeks.includes(wNum);
                const isActive = activeWeek === wNum;

                return (
                  <button
                    key={wNum}
                    type="button"
                    onClick={() => setActiveWeek(wNum)}
                    className={`p-3.5 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden ${
                      isActive
                        ? 'border-purple-600 bg-purple-50/95 dark:bg-purple-950/60 ring-2 ring-purple-400/50 shadow-md scale-[1.02]'
                        : 'border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 hover:border-purple-300 dark:hover:border-slate-700 hover:bg-gray-50/70 dark:hover:bg-slate-700 shadow-2xs'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5 gap-1">
                      <span className={`text-xs font-black tracking-wide ${isActive ? 'text-purple-900 dark:text-purple-300' : 'text-slate-800 dark:text-gray-200'}`}>
                        📅 {session.label}
                      </span>
                      {isAttended ? (
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800 shrink-0">
                          ✓ Attended
                        </span>
                      ) : (
                        <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-purple-700 dark:text-purple-400 font-bold">
                        Session {wNum} {session.isFifthWeek ? '• 5th Class' : ''}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 font-medium text-[10px]">
                        {isAttended ? 'Logged ✓' : 'View Lesson'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Physical Student Notice Banner */}
          {user?.role === 'student' && alreadyEnrolled && user?.studentType === 'physical' && (
            <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 p-5 rounded-2xl flex items-start gap-3 shadow-xs">
              <span className="text-2xl shrink-0">🏫</span>
              <div>
                <h4 className="font-extrabold text-amber-950 dark:text-amber-100 text-sm">Physical Classroom Student Mode</h4>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5 leading-relaxed">
                  You are registered as a <strong>Physical Classroom Student</strong>. Your class attendance is recorded in-person at the institute counter by the Admin/Cashier when attending physical lectures. Online weekly self-attendance submission is disabled for physical students.
                </p>
              </div>
            </div>
          )}

          {/* Online Student Weekly Gated Attendance Action Banner */}
          {user?.role === 'student' && alreadyEnrolled && user?.studentType !== 'physical' && (
            <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-purple-950 rounded-2xl p-6 text-white shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <span className="bg-white/20 text-white font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                    {selectedMonth} — Week {activeWeek} Attendance
                  </span>
                  {attendedWeeks.includes(activeWeek) ? (
                    <span className="bg-emerald-400/30 text-emerald-200 border border-emerald-400/40 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
                      ✓ Status: Settled
                    </span>
                  ) : (
                    <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${allMaterialsCovered ? 'bg-emerald-400/30 text-emerald-200 border border-emerald-400/40' : 'bg-amber-400/30 text-amber-200 border border-amber-400/40'}`}>
                      {allMaterialsCovered ? '🔓 Unlocked & Ready' : `🔒 Locked (${coveredCount}/2 Materials Covered)`}
                    </span>
                  )}
                </div>
                <h4 className="text-xl font-extrabold tracking-tight">Week {activeWeek} Attendance Confirmation ({selectedMonth})</h4>
                <p className="text-purple-200 text-xs mt-1 max-w-xl leading-relaxed">
                  {attendedWeeks.includes(activeWeek)
                    ? `Great job! Your attendance for Week ${activeWeek} (${selectedMonth}) is logged into system database analytics.`
                    : allMaterialsCovered
                      ? `🎉 All study materials for Week ${activeWeek} are covered! Click below to confirm your attendance.`
                      : `Complete all study materials for Week ${activeWeek} below to unlock attendance submission.`}
                </p>
              </div>

              {attendedWeeks.includes(activeWeek) ? (
                <div className="bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 px-6 py-3 rounded-xl text-xs font-extrabold flex items-center gap-2 shrink-0 shadow-inner">
                  <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Attendance Submitted (Week {activeWeek})
                </div>
              ) : allMaterialsCovered ? (
                <button
                  type="button"
                  disabled={isSubmittingAttendance}
                  onClick={() => handleSubmitWeeklyAttendance(activeWeek)}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm px-7 py-3.5 rounded-xl transition shadow-lg shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmittingAttendance ? 'Submitting...' : `Submit Attendance (Week ${activeWeek}) ✓`}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="bg-gray-600 text-gray-300 font-bold text-xs px-6 py-3.5 rounded-xl shrink-0 cursor-not-allowed opacity-75 border border-gray-500"
                >
                  🔒 Cover Study Materials ({coveredCount}/2 Covered)
                </button>
              )}
            </div>
          )}

          {/* Announcement Card */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm">
            <h4 className="font-bold text-lg text-gray-800 dark:text-white mb-4">Teacher's Announcement (Week {activeWeek})</h4>
            {user?.role === 'student' ? (
              <p className="text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-slate-800/80 p-4 rounded-xl leading-relaxed whitespace-pre-line border border-gray-100 dark:border-slate-700">
                {currentLesson?.teacherMessage || "No Contents available for this course yet."}
              </p>
            ) : (
              <div className="space-y-3">
                <textarea
                  className="w-full p-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
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
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-green-200 dark:border-green-800/60 shadow-sm">
              <p className="text-green-700 dark:text-green-300 font-semibold">This course is recommended for {studentGrade && (studentGrade.toLowerCase().startsWith('grade') ? studentGrade : `Grade ${studentGrade}`)}.</p>
              <button
                onClick={() => setShowEnrollModal(true)}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-white font-bold hover:from-green-700 hover:to-emerald-700 shadow-md transition cursor-pointer"
              >
                Enroll in this Course 🎓
              </button>
            </div>
          )}

          {/* Video Lessons Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800 dark:text-white">Video Lessons (Week {activeWeek} — {selectedMonth})</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Watch the lecture video below to complete video study requirement.</p>
              </div>
              {!isTeacherOrAdmin && currentLesson?.videoLessons && currentLesson.videoLessons.length > 0 && (
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${isVideoWatched ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                  {isVideoWatched ? '✓ Video Completed' : 'Pending View'}
                </span>
              )}
            </div>

            {/* Video addition form (Teacher/Admin only) */}
            {isTeacherOrAdmin && (
              <form onSubmit={handleAddVideo} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 dark:bg-slate-800/80 rounded-xl border border-gray-100 dark:border-slate-700">
                <input
                  type="text"
                  placeholder="Video Title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                  required
                />
                <input
                  type="url"
                  placeholder="Video Link (e.g. YouTube URL)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                  required
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg py-3 shadow-sm cursor-pointer text-sm"
                >
                  + Add Video
                </button>

                {/* Download Accessibility Control */}
                <div className="md:col-span-3 flex flex-wrap items-center gap-3 bg-purple-50/60 dark:bg-slate-800 p-3 rounded-xl border border-purple-100 dark:border-slate-700 mt-1">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                    <FaDownload className="text-purple-600 dark:text-purple-400" /> Student Download Access:
                  </span>
                  <select
                    value={videoDownloadType}
                    onChange={(e) => setVideoDownloadType(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-800 dark:text-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                  >
                    <option value="immediate">🟢 Immediate Download (Available Now)</option>
                    <option value="one_month">⏳ After 1 Month (30 Days)</option>
                    <option value="custom_date">📅 Custom Unlock Date</option>
                    <option value="disabled">🚫 View Online Only (Download Disabled)</option>
                  </select>
                  {videoDownloadType === 'custom_date' && (
                    <input
                      type="date"
                      value={videoCustomUnlockDate}
                      onChange={(e) => setVideoCustomUnlockDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 text-xs font-bold rounded-lg p-2 outline-none"
                      required
                    />
                  )}
                </div>
              </form>
            )}

            {/* Video Lessons List */}
            <div className="space-y-3">
              {!currentLesson?.videoLessons || currentLesson.videoLessons.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No video lessons uploaded for this grade yet.</p>
              ) : (
                currentLesson.videoLessons.map((vid) => {
                  const dlStatus = getMaterialDownloadStatus(vid);
                  return (
                    <div key={vid._id || vid.url} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-red-500 text-xl">🎬</div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-white">{vid.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <a href={vid.url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 dark:text-purple-400 hover:underline">
                              {vid.url}
                            </a>
                            {/* Teacher/Admin status badge */}
                            {isTeacherOrAdmin && (
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                dlStatus.status === 'immediate'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : dlStatus.status === 'scheduled'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-slate-700'
                              }`}>
                                {dlStatus.status === 'immediate' ? '🟢 Immediate Download' : dlStatus.status === 'scheduled' ? `⏳ Unlocks ${dlStatus.formattedDate} (${dlStatus.daysRemaining}d)` : '🚫 Download Off'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {/* Student Watch & Download Controls */}
                        {!isTeacherOrAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                markMaterialCompleted('video');
                                window.open(vid.url, '_blank', 'noopener,noreferrer');
                              }}
                              className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                            >
                              <span>▶</span> Watch Video
                            </button>

                            {dlStatus.isAvailable && (
                              <a
                                href={vid.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-purple-200 dark:border-purple-800"
                                title="Download / Open Video"
                              >
                                <FaDownload className="text-[10px]" /> Download
                              </a>
                            )}

                            {dlStatus.status === 'scheduled' && (
                              <span
                                className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-1.5 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5"
                                title={`Download unlocks on ${dlStatus.formattedDate}`}
                              >
                                <FaHourglassHalf className="text-amber-600 dark:text-amber-400 text-xs" /> Unlocks {dlStatus.formattedDate} ({dlStatus.daysRemaining}d left)
                              </span>
                            )}
                          </>
                        )}

                        {/* Teacher/Admin Manage Download Settings */}
                        {isTeacherOrAdmin && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenDownloadSettingsModal('video', vid, currentLesson?._id)}
                              className="text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-slate-800 px-3 py-1.5 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-purple-100 dark:border-slate-700"
                              title="Configure Download Access"
                            >
                              <FaCog className="text-xs" /> Download Settings
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(vid._id)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-lg transition-colors text-xs font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* PDF Materials Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800 dark:text-white">Study Materials — PDF Notes (Week {activeWeek} — {selectedMonth})</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Download and review the lecture PDF notes to complete document requirement.</p>
              </div>
              {!isTeacherOrAdmin && currentLesson?.pdfMaterials && currentLesson.pdfMaterials.length > 0 && (
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${isPdfDownloaded ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800'}`}>
                  {isPdfDownloaded ? '✓ PDF Completed' : 'Pending View'}
                </span>
              )}
            </div>

            {/* PDF upload form (Teacher/Admin only) */}
            {isTeacherOrAdmin && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800/80 rounded-xl space-y-3 border border-gray-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Upload PDF Lesson Material</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Document Title (Optional)"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    className="p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                  />
                  <div>
                    <input
                      type="file"
                      accept="application/pdf"
                      key={pdfFile ? 'loaded' : 'empty'}
                      onChange={(e) => setPdfFile(e.target.files[0])}
                      className="w-full p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleUploadPdf}
                    disabled={isUploadingPdf}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-lg py-3 shadow-sm cursor-pointer transition-colors text-sm"
                  >
                    {isUploadingPdf ? 'Uploading...' : '+ Upload PDF'}
                  </button>

                  {/* Download Accessibility Control */}
                  <div className="md:col-span-3 flex flex-wrap items-center gap-3 bg-purple-50/60 dark:bg-slate-800 p-3 rounded-xl border border-purple-100 dark:border-slate-700 mt-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <FaDownload className="text-purple-600 dark:text-purple-400" /> Student Download Access:
                    </span>
                    <select
                      value={pdfDownloadType}
                      onChange={(e) => setPdfDownloadType(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-800 dark:text-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="immediate">🟢 Immediate Download (Available Now)</option>
                      <option value="one_month">⏳ After 1 Month (30 Days)</option>
                      <option value="custom_date">📅 Custom Unlock Date</option>
                      <option value="disabled">🚫 View Online Only (Download Disabled)</option>
                    </select>
                    {pdfDownloadType === 'custom_date' && (
                      <input
                        type="date"
                        value={pdfCustomUnlockDate}
                        onChange={(e) => setPdfCustomUnlockDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 text-xs font-bold rounded-lg p-2 outline-none"
                        required
                      />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Maximum size: 5MB. Only PDF files are allowed.</p>
              </div>
            )}

            {/* PDF Notes List with Reading Progress */}
            <div className="space-y-3">
              {!currentLesson?.pdfMaterials || currentLesson.pdfMaterials.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No study materials uploaded for this grade yet.</p>
              ) : (
                currentLesson.pdfMaterials.map((pdf) => {
                  const pId = pdf._id ? String(pdf._id) : (pdf.filename || pdf.title);
                  const pProg = pdfProgressMap[pId] || pdfProgressMap[pdf.title] || pdfProgressMap[pdf.filename];
                  const pPercent = pProg?.progressPercentage || 0;
                  const pMaxRead = pProg?.maxPageRead || 0;
                  const pTotal = pProg?.totalPages || 0;
                  const pNextPage = pProg?.nextPageToRead || (pMaxRead > 0 ? Math.min(pTotal, pMaxRead + 1) : 1);
                  const dlStatus = getMaterialDownloadStatus(pdf);

                  return (
                    <div key={pdf._id || pdf.title} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-purple-100 dark:border-slate-800 rounded-xl bg-purple-50/20 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 transition-all gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-red-600 text-2xl font-bold">📕</div>
                        <div>
                          <p className="font-extrabold text-gray-900 dark:text-white text-sm">{pdf.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              Size: {pdf.fileSize ? (pdf.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '0.99 MB'}
                            </span>

                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden border border-slate-300 dark:border-slate-600">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${pPercent >= 100 ? 'bg-emerald-500' : 'bg-purple-600'}`}
                                  style={{ width: `${pPercent}%` }}
                                ></div>
                              </div>

                              <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                pPercent >= 100 
                                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' 
                                  : pPercent > 0 
                                    ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 border-slate-300 dark:border-slate-700'
                              }`}>
                                {pPercent >= 100 
                                  ? '✓ 100% Completed' 
                                  : pPercent > 0 
                                    ? `📖 ${pPercent}% Read (Page ${pMaxRead} of ${pTotal} • Continue Pg ${pNextPage})`
                                    : '📖 Unread (0%)'}
                              </span>
                            </div>

                            {/* Teacher/Admin status badge */}
                            {isTeacherOrAdmin && (
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                dlStatus.status === 'immediate'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : dlStatus.status === 'scheduled'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-slate-700'
                              }`}>
                                {dlStatus.status === 'immediate' ? '🟢 Immediate Download' : dlStatus.status === 'scheduled' ? `⏳ Unlocks ${dlStatus.formattedDate} (${dlStatus.daysRemaining}d)` : '🚫 Download Off'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        <button
                          type="button"
                          onClick={() => setActivePdfModal({ 
                            pdf: { ...pdf, _id: pdf._id ? String(pdf._id) : pdf.filename },
                            lessonId: currentLesson?._id 
                          })}
                          className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                        >
                          <span>📖</span> {pPercent >= 100 ? 'Review PDF Notes ▶' : pPercent > 0 ? `Continue from Page ${pNextPage} ▶` : 'Start Reading PDF ▶'}
                        </button>

                        {/* Student Download / Lock Button */}
                        {!isTeacherOrAdmin && (
                          dlStatus.isAvailable ? (
                            <a
                              href={pdf.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs border border-slate-200 dark:border-slate-700"
                              title="Download PDF File"
                            >
                              <FaDownload className="text-[10px]" /> Download
                            </a>
                          ) : dlStatus.status === 'scheduled' ? (
                            <span
                              className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                              title={`Download unlocks on ${dlStatus.formattedDate}`}
                            >
                              <FaHourglassHalf className="text-amber-600 dark:text-amber-400 text-xs" /> Unlocks {dlStatus.formattedDate} ({dlStatus.daysRemaining}d left)
                            </span>
                          ) : null
                        )}

                        {/* Teacher/Admin Controls */}
                        {isTeacherOrAdmin && (
                          <>
                            <a
                              href={pdf.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                              title="Download File"
                            >
                              <FaDownload className="text-[10px]" /> Download
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenDownloadSettingsModal('pdf', pdf, currentLesson?._id)}
                              className="text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-purple-100 dark:border-slate-700"
                              title="Configure Download Access"
                            >
                              <FaCog className="text-xs" /> Download Settings
                            </button>
                            <button
                              onClick={() => handleDeletePdf(pdf._id)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-xl transition text-xs font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Assignments Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800 dark:text-white">
                  Assignments ({selectedGrade?.toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`} — {selectedMonth})
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Download class assignment PDF documents or upload new ones.</p>
              </div>
            </div>

            {/* Assignment upload form (Teacher/Admin only) */}
            {isTeacherOrAdmin && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-slate-800/80 rounded-xl space-y-3 border border-gray-100 dark:border-slate-700">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Upload Assignment PDF</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Assignment Title (Optional)"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    className="p-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                  />
                  <div>
                    <input
                      type="file"
                      accept="application/pdf"
                      key={assignmentFile ? 'loaded' : 'empty'}
                      onChange={(e) => setAssignmentFile(e.target.files[0])}
                      className="w-full p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-gray-200 dark:border-slate-700 rounded-lg outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleUploadAssignment}
                    disabled={isUploadingAssignment}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-lg py-3 shadow-sm cursor-pointer transition-colors text-sm"
                  >
                    {isUploadingAssignment ? 'Uploading...' : '+ Upload Assignment'}
                  </button>

                  {/* Download Accessibility Control */}
                  <div className="md:col-span-3 flex flex-wrap items-center gap-3 bg-purple-50/60 dark:bg-slate-800 p-3 rounded-xl border border-purple-100 dark:border-slate-700 mt-1">
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <FaDownload className="text-purple-600 dark:text-purple-400" /> Student Download Access:
                    </span>
                    <select
                      value={assignmentDownloadType}
                      onChange={(e) => setAssignmentDownloadType(e.target.value)}
                      className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-800 dark:text-white rounded-lg p-2 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                    >
                      <option value="immediate">🟢 Immediate Download (Available Now)</option>
                      <option value="one_month">⏳ After 1 Month (30 Days)</option>
                      <option value="custom_date">📅 Custom Unlock Date</option>
                      <option value="disabled">🚫 View Online Only (Download Disabled)</option>
                    </select>
                    {assignmentDownloadType === 'custom_date' && (
                      <input
                        type="date"
                        value={assignmentCustomUnlockDate}
                        onChange={(e) => setAssignmentCustomUnlockDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 text-xs font-bold rounded-lg p-2 outline-none"
                        required
                      />
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Maximum size: 5MB. Only PDF files are allowed.</p>
              </div>
            )}

            {/* Assignment PDFs List */}
            <div className="space-y-3">
              {!currentLesson?.assignments || currentLesson.assignments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No assignments uploaded for this grade yet.</p>
              ) : (
                currentLesson.assignments.map((assignment) => {
                  const dlStatus = getMaterialDownloadStatus(assignment);
                  return (
                    <div key={assignment._id || assignment.title} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-purple-100 dark:border-slate-800 rounded-xl bg-purple-50/20 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 transition-all gap-3">
                      <div className="flex items-center gap-3">
                        <div className="text-purple-600 dark:text-purple-400 text-2xl font-bold">📝</div>
                        <div>
                          <p className="font-extrabold text-gray-900 dark:text-white text-sm">{assignment.title}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              Size: {assignment.fileSize ? (assignment.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '0.99 MB'}
                            </span>
                            <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                              Uploaded: {assignment.uploadedAt ? new Date(assignment.uploadedAt).toLocaleDateString() : 'N/A'}
                            </span>
                            {/* Teacher/Admin status badge */}
                            {isTeacherOrAdmin && (
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                dlStatus.status === 'immediate'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                  : dlStatus.status === 'scheduled'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-slate-700'
                              }`}>
                                {dlStatus.status === 'immediate' ? '🟢 Immediate Download' : dlStatus.status === 'scheduled' ? `⏳ Unlocks ${dlStatus.formattedDate} (${dlStatus.daysRemaining}d)` : '🚫 Download Off'}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {/* Student Download / Lock State */}
                        {!isTeacherOrAdmin && (
                          dlStatus.isAvailable ? (
                            <a
                              href={assignment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs border border-slate-200 dark:border-slate-700"
                              title="Download Assignment"
                            >
                              <FaDownload className="text-[10px]" /> Download
                            </a>
                          ) : dlStatus.status === 'scheduled' ? (
                            <span
                              className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5"
                              title={`Download unlocks on ${dlStatus.formattedDate}`}
                            >
                              <FaHourglassHalf className="text-amber-600 dark:text-amber-400 text-xs" /> Unlocks {dlStatus.formattedDate} ({dlStatus.daysRemaining}d left)
                            </span>
                          ) : (
                            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-gray-400 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700">
                              Online View Only
                            </span>
                          )
                        )}

                        {/* Teacher/Admin Controls */}
                        {isTeacherOrAdmin && (
                          <>
                            <a
                              href={assignment.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-gray-300 px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1 border border-slate-200 dark:border-slate-700"
                              title="Download Assignment"
                            >
                              <FaDownload className="text-[10px]" /> Download
                            </a>
                            <button
                              type="button"
                              onClick={() => handleOpenDownloadSettingsModal('assignment', assignment, currentLesson?._id)}
                              className="text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-purple-100 dark:border-slate-700"
                              title="Configure Download Access"
                            >
                              <FaCog className="text-xs" /> Download Settings
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(assignment._id)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 p-2 rounded-xl transition text-xs font-bold cursor-pointer"
                            >
                              Remove
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Quizzes & Assessments Section */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800 dark:text-white">
                  Quizes ({selectedGrade?.toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`} — {selectedMonth})
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Test your knowledge by attempting the weekly quiz assessments.</p>
              </div>
              {isTeacherOrAdmin && (
                <button
                  onClick={() => navigate(`/course/${courseId}/create-quiz`)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  + Create Quiz
                </button>
              )}
            </div>

            <div className="space-y-3">
              {quizzes.filter(q => q.grade === selectedGrade).length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No quizzes available for this grade yet.</p>
              ) : (
                quizzes.filter(q => q.grade === selectedGrade).map((quiz) => {
                  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
                  return (
                    <div key={quiz._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 dark:border-slate-800 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/60 transition-all gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-yellow-500 text-2xl">📝</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-gray-900 dark:text-white text-sm">{quiz.title}</p>
                            {!quiz.isActive && (
                              <span className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-gray-200 dark:border-slate-700">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Questions: {quiz.questions?.length} · Time: {quiz.timeLimit > 0 ? `${quiz.timeLimit} mins` : 'No limit'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        {isTeacher ? (
                          <>
                            <button
                              onClick={() => handleToggleQuizActive(quiz._id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                quiz.isActive
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60'
                                  : 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/60'
                              }`}
                            >
                              {quiz.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => navigate(`/quiz/${quiz._id}/submissions`)}
                              className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Submissions
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(quiz._id)}
                              className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            {quiz.hasAttempted ? (
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                                  Score: <strong className="text-purple-600 dark:text-purple-400">{quiz.score}</strong> / {quiz.totalPoints}
                                </span>
                                <button
                                  onClick={() => navigate(`/quiz/${quiz._id}/take`)}
                                  className="bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/60 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer"
                                >
                                  Review Answers
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => navigate(`/quiz/${quiz._id}/take`)}
                                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
                              >
                                Start Quiz
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      )}

      {showStudentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-6xl h-[650px] rounded-3xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 animate-fadeIn">
            {/* Modal Header */}
            <div className="mb-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">{selectedEnrollGrade && (selectedEnrollGrade.toLowerCase().startsWith('grade') ? selectedEnrollGrade : `Grade ${selectedEnrollGrade}`)} Student Management</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage enrollment, view real-time class attendance, and monitor fee payments.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentPicker(false)}
                className="rounded-xl border border-gray-300 dark:border-slate-700 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Close Dashboard
              </button>
            </div>

            {/* Split Pane Work Area */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT PANE: Student List & Search & Filters */}
              <div className="w-5/12 flex flex-col border-r border-gray-150 dark:border-slate-800 pr-4 overflow-hidden">
                {/* Search Bar */}
                <div className="relative">
                  <input
                    type="text"
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    placeholder="Search name or registration number..."
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-600 text-sm"
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Quick Filters */}
                <div className="grid grid-cols-3 gap-1.5 mt-3 bg-gray-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300">
                  <button
                    type="button"
                    onClick={() => setPickerFilter("all")}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer ${pickerFilter === "all" ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm" : "hover:text-gray-900 dark:hover:text-white"}`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerFilter("due")}
                    className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${pickerFilter === "due" ? "bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm" : "hover:text-red-600 dark:hover:text-red-400"}`}
                  >
                    Due Fees
                  </button>
                  <button
                    type="button"
                    onClick={() => setPickerFilter("absent")}
                    className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer ${pickerFilter === "absent" ? "bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm" : "hover:text-orange-600 dark:hover:text-orange-400"}`}
                  >
                    Abs. &gt;2 Days
                  </button>
                </div>

                {/* Student Scroll List */}
                {isLoadingGradeStudents ? (
                  <div className="flex-1 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">Loading grade list...</div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-4 mt-4 pr-1">
                    {/* Section 1: Enrolled Students */}
                    <div>
                      <div className="bg-purple-100/80 dark:bg-purple-950/60 text-purple-900 dark:text-purple-200 font-bold px-3 py-2 rounded-xl text-xs flex justify-between items-center mb-2 sticky top-0 z-10 border border-purple-200 dark:border-purple-800">
                        <span>Enrolled Students ({filteredPickerStudents.filter(s => s.isEnrolled).length})</span>
                      </div>
                      
                      <div className="space-y-2">
                        {filteredPickerStudents.filter(s => s.isEnrolled).length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic pl-3">No students currently enrolled in this grade.</p>
                        ) : (
                          filteredPickerStudents.filter(s => s.isEnrolled).map((student) => (
                            <div
                              key={student._id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                                selectedStudentDetail?._id === student._id
                                  ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-sm"
                                  : "bg-white dark:bg-slate-800 border-gray-150 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                              }`}
                            >
                              {user?.role === 'admin' && (
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
                                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                  />
                                </div>
                              )}

                              <div className="flex-1 min-w-0" onClick={() => setSelectedStudentDetail(student)}>
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{student.name}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Reg: {student.registrationNumber || 'N/A'}</p>
                                
                                <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-extrabold uppercase">
                                  <span className="px-1.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                    Enrolled
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full ${student.payment?.status === "Due" ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"}`}>
                                    {student.payment?.status || "Paid"}
                                  </span>
                                  {student.attendance?.isChronicallyAbsent && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800 animate-pulse">
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
                      <div className="bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold px-3 py-2 rounded-xl text-xs flex justify-between items-center mb-2 sticky top-0 z-10 border border-gray-200 dark:border-slate-700">
                        <span>Available Students ({filteredPickerStudents.filter(s => !s.isEnrolled).length})</span>
                      </div>

                      <div className="space-y-2">
                        {filteredPickerStudents.filter(s => !s.isEnrolled).length === 0 ? (
                          <p className="text-xs text-gray-400 dark:text-gray-500 italic pl-3">No additional students available in this grade.</p>
                        ) : (
                          filteredPickerStudents.filter(s => !s.isEnrolled).map((student) => (
                            <div
                              key={student._id}
                              className={`flex items-center gap-3 p-2.5 rounded-xl border transition cursor-pointer ${
                                selectedStudentDetail?._id === student._id
                                  ? "bg-purple-50/70 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800 shadow-sm"
                                  : "bg-white dark:bg-slate-800 border-gray-150 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/60"
                              }`}
                            >
                              {user?.role === 'admin' && (
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
                                    className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                  />
                                </div>
                              )}

                              <div className="flex-1 min-w-0" onClick={() => setSelectedStudentDetail(student)}>
                                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{student.name}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">Reg: {student.registrationNumber || 'N/A'}</p>
                                
                                <div className="flex flex-wrap gap-1 mt-1 text-[9px] font-extrabold uppercase">
                                  <span className="px-1.5 py-0.5 rounded-full bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-slate-700">
                                    Not Enrolled
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-full ${student.payment?.status === "Due" ? "bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"}`}>
                                    {student.payment?.status || "Paid"}
                                  </span>
                                  {student.attendance?.isChronicallyAbsent && (
                                    <span className="px-1.5 py-0.5 rounded-full bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 font-bold border border-red-200 dark:border-red-800 animate-pulse">
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

                {/* Batch Action Buttons Panel (Admin only) */}
                {user?.role === 'admin' && (
                  <div className="pt-4 border-t border-gray-200 dark:border-slate-800 flex flex-col gap-2 mt-auto">
                    <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 font-semibold px-1">
                      <span>{selectedStudentIds.length} Selected for Batch Actions</span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds(gradeStudents.map((s) => s._id))}
                          className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          Select All
                        </button>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleBatchEnroll}
                        disabled={isUpdatingGradeStudents || selectedStudentIds.length === 0}
                        className="rounded-xl bg-green-600 py-2.5 text-xs font-bold text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                      >
                        {isUpdatingGradeStudents ? 'Enrolling...' : 'Batch Enroll'}
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchRemove}
                        disabled={isUpdatingGradeStudents || selectedStudentIds.length === 0}
                        className="rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
                      >
                        {isUpdatingGradeStudents ? 'Removing...' : 'Batch Remove'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANE: Selected Student Detailed Overview */}
              <div className="w-7/12 flex flex-col pl-6 overflow-hidden">
                {!selectedStudentDetail ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-slate-800/60 rounded-2xl border border-dashed border-gray-200 dark:border-slate-700">
                    <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <h4 className="font-bold text-gray-700 dark:text-gray-200">No Student Selected</h4>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">Click on any student card in the list to inspect their attendance history and billing records.</p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Detail Card */}
                    <div className="bg-gray-50 dark:bg-slate-800/80 border border-gray-150 dark:border-slate-700 p-4 rounded-2xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 rounded-full flex items-center justify-center font-extrabold text-lg shrink-0 border border-purple-200 dark:border-purple-800">
                          {selectedStudentDetail.name.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight truncate">{selectedStudentDetail.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Reg No: {selectedStudentDetail.registrationNumber || 'N/A'}</p>
                          <p className="text-xs text-gray-400 truncate">{selectedStudentDetail.email}</p>
                          {selectedStudentDetail.parentsPhoneNumber && (
                            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold mt-0.5 flex items-center gap-1">
                              <svg className="w-3 h-3 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.63.23l2.87 2.87a1 1 0 01-.18 1.54l-1.31.87a11.03 11.03 0 005.47 5.47l.87-1.31a1 1 0 011.54-.18l2.87 2.87a1 1 0 01.23.63V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                              Parent: {selectedStudentDetail.parentsPhoneNumber}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Enrolling Action Button (Admin only) */}
                      {user?.role === 'admin' && (
                        <div>
                          {selectedStudentDetail.isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => handleSingleStudentEnrollRemove('remove', selectedStudentDetail._id)}
                              disabled={isUpdatingGradeStudents}
                              className="bg-red-50 dark:bg-red-950/60 hover:bg-red-100 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold px-4 py-2 rounded-xl transition shadow-sm cursor-pointer"
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
                      )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-gray-200 dark:border-slate-800 mt-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      <button
                        type="button"
                        onClick={() => setStudentDetailTab("attendance")}
                        className={`flex-1 pb-3 text-center border-b-2 transition flex items-center justify-center gap-1.5 cursor-pointer ${
                          studentDetailTab === "attendance" ? "border-purple-600 text-purple-700 dark:text-purple-400 font-extrabold" : "border-transparent hover:text-gray-700 dark:hover:text-gray-300"
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
                          studentDetailTab === "payments" ? "border-purple-600 text-purple-700 dark:text-purple-400 font-extrabold" : "border-transparent hover:text-gray-700 dark:hover:text-gray-300"
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
                            <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl p-3.5 flex gap-2.5 text-red-800 dark:text-red-300 text-xs animate-pulse">
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
                            <div className="bg-green-50 dark:bg-green-950/60 border border-green-100 dark:border-green-800 rounded-xl p-3 text-center">
                              <p className="text-[10px] text-green-700 dark:text-green-300 font-extrabold uppercase tracking-wider">Attended Sessions</p>
                              <p className="text-xl font-black text-green-800 dark:text-green-200 mt-0.5">{selectedStudentDetail.attendance?.totalPresent || 0}</p>
                            </div>
                            <div className="bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-800 rounded-xl p-3 text-center">
                              <p className="text-[10px] text-red-700 dark:text-red-300 font-extrabold uppercase tracking-wider">Absent Sessions</p>
                              <p className="text-xl font-black text-red-800 dark:text-red-200 mt-0.5">{selectedStudentDetail.attendance?.totalAbsent || 0}</p>
                            </div>
                          </div>

                          {/* History Table */}
                          <div className="rounded-xl border border-gray-150 dark:border-slate-800 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800 text-left text-xs">
                              <thead className="bg-gray-50 dark:bg-slate-800 font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                                <tr>
                                  <th className="p-3">Session Date</th>
                                  <th className="p-3 text-right">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-150 dark:divide-slate-800 text-gray-700 dark:text-gray-300">
                                {!selectedStudentDetail.attendance?.history || selectedStudentDetail.attendance.history.length === 0 ? (
                                  <tr>
                                    <td colSpan="2" className="p-6 text-center text-gray-400 dark:text-gray-500 italic">No attendance records found for this student.</td>
                                  </tr>
                                ) : (
                                  selectedStudentDetail.attendance.history.map((record, index) => (
                                    <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                      <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{new Date(record.date).toLocaleDateString()}</td>
                                      <td className="p-3 text-right whitespace-nowrap">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] ${
                                          record.status === 'Present' ? 'bg-green-100 dark:bg-green-950/80 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' :
                                          'bg-red-100 dark:bg-red-950/80 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
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
                            <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 rounded-xl p-3.5 flex gap-2.5 text-red-800 dark:text-red-300 text-xs">
                              <svg className="w-5 h-5 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="font-bold text-red-800 dark:text-red-300">Fees Pending Alert</p>
                                <p className="mt-0.5 font-semibold text-red-700 dark:text-red-400">
                                  Course Tuition Fees of LKR {selectedStudentDetail.payment.amountDue.toLocaleString()}.00 are UNPAID for this course.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 dark:bg-green-950/60 border border-green-200 dark:border-green-800 rounded-xl p-3.5 flex gap-2.5 text-green-800 dark:text-green-300 text-xs">
                              <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <div>
                                <p className="font-bold text-green-800 dark:text-green-200">Account Good Standing</p>
                                <p className="mt-0.5 font-medium">Course payment for this student is fully settled and active.</p>
                              </div>
                            </div>
                          )}

                          {/* Payment Ledger */}
                          <div className="rounded-xl border border-gray-150 dark:border-slate-800 overflow-hidden">
                            <div className="bg-gray-50 dark:bg-slate-800 px-4 py-3 border-b border-gray-150 dark:border-slate-700 flex justify-between items-center">
                              <h5 className="text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction History Log</h5>
                              <span className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Live Office Ledger</span>
                            </div>
                            <div className="divide-y divide-gray-150 dark:divide-slate-800 text-xs">
                              {!selectedStudentDetail.payment?.history || selectedStudentDetail.payment.history.length === 0 ? (
                                <div className="p-6 text-center text-gray-400 dark:text-gray-500 italic">No payment receipts logged for this student yet.</div>
                              ) : (
                                selectedStudentDetail.payment.history.map((invoice, index) => (
                                  <div key={index} className="p-3 flex justify-between items-center hover:bg-gray-50/50 dark:hover:bg-slate-800/50">
                                    <div>
                                      <p className="font-bold text-gray-800 dark:text-white">LKR {invoice.amount.toLocaleString()}.00 - {invoice.courseTitle}</p>
                                      <p className="text-[10px] text-purple-700 dark:text-purple-400 font-mono mt-0.5">
                                        Receipt: {invoice.transactionId} • Method: {invoice.paymentMethod} ({invoice.status})
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-gray-500 dark:text-gray-400 font-semibold">{invoice.date}</span>
                                    </div>
                                  </div>
                                ))
                              )}
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
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl transition-all border border-gray-100 dark:border-slate-800">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete Course</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 animate-pulse-subtle">
              Are you sure you want to delete the course <strong className="text-gray-800 dark:text-white">"{course?.title}"</strong>? This will permanently delete the course and all related lessons and file assets.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl border border-gray-300 dark:border-slate-700 px-5 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteCourse}
                disabled={isDeleting}
                className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer shadow-sm"
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
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl text-center border border-gray-100 dark:border-slate-800">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-950/80 text-green-600 dark:text-green-300 mb-4 animate-bounce-subtle border border-green-200 dark:border-green-800">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Course Deleted</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
              {deleteSuccessMsg || "The course has been successfully deleted."}
            </p>
            <button
              type="button"
              onClick={() => {
                setShowDeleteSuccess(false);
                window.location.href = '/courses';
              }}
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 py-2.5 text-sm font-semibold text-white transition shadow-sm cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Grade Deactivation / Activation Confirmation Modal */}
      {deactivateConfirmGrade && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 sm:p-7 shadow-2xl border border-purple-100 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md ${
                deactivateConfirmGrade.isDeactive ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300' : 'bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-300'
              }`}>
                {deactivateConfirmGrade.isDeactive ? <FaLockOpen /> : <FaLock />}
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900 dark:text-white">
                  Confirm {deactivateConfirmGrade.isDeactive ? 'Activation' : 'Deactivation'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">
                  Grade Stream: <span className="font-extrabold text-purple-900 dark:text-purple-300">{deactivateConfirmGrade.title || deactivateConfirmGrade.gradeNumber}</span>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-700 text-xs font-semibold text-gray-700 dark:text-gray-300 leading-relaxed">
              {deactivateConfirmGrade.isDeactive ? (
                <span>Are you sure you want to <strong className="text-emerald-700 dark:text-emerald-300">activate</strong> this grade stream? Students and teachers will be able to access all lessons and workspace announcements.</span>
              ) : (
                <span>Are you sure you want to <strong className="text-red-600 dark:text-red-400">deactivate</strong> this grade stream? Deactivating will lock this grade stream and restrict access for non-admin users.</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateConfirmGrade(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-xl transition cursor-pointer border border-transparent dark:border-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeToggleGradeStatus(deactivateConfirmGrade)}
                className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl transition shadow-md cursor-pointer ${
                  deactivateConfirmGrade.isDeactive
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-200'
                }`}
              >
                Yes, {deactivateConfirmGrade.isDeactive ? 'Activate Grade' : 'Deactivate Grade'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Course Enrollment & Payment Modal */}
      <CourseEnrollmentModal
        isOpen={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        course={course}
        student={user}
        onEnrollSuccess={fetchCourseDetails}
      />

      {/* Teacher Profile Modal */}
      {selectedTeacherForModal && (
        <TeacherModal
          teacher={selectedTeacherForModal}
          isOpen={!!selectedTeacherForModal}
          onClose={() => setSelectedTeacherForModal(null)}
        />
      )}

      {/* PDF Document Reader & Progress Tracker Modal */}
      {activePdfModal && (
        <PdfReaderModal
          pdf={activePdfModal.pdf}
          courseId={courseId}
          lessonId={activePdfModal.lessonId}
          initialProgress={
            pdfProgressMap[String(activePdfModal.pdf?._id)] ||
            pdfProgressMap[activePdfModal.pdf?.filename] ||
            pdfProgressMap[activePdfModal.pdf?.title]
          }
          onClose={() => setActivePdfModal(null)}
          onProgressUpdated={(pdfId, newProgress) => {
            // Store by every possible identifier so the material card always finds it
            setPdfProgressMap(prev => {
              const updated = { ...prev };
              if (pdfId) updated[String(pdfId)] = newProgress;
              if (newProgress?.pdfTitle) updated[newProgress.pdfTitle] = newProgress;
              console.log('[PDF Progress] Updated map keys:', Object.keys(updated));
              return updated;
            });
            if (newProgress?.isCompleted) {
              markMaterialCompleted('pdf');
            }
          }}
        />
      )}

      {/* Add Grade Modal */}
      {showAddGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Add Grade Assignment</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Select a grade or combination to access this course.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGrade(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGrade} className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Assignment Mode</label>
                <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => { setGradeMode('single'); setCombinationGrades([]); setCustomGradeInput(''); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${gradeMode === 'single' ? 'bg-[#2d1b64] dark:bg-lumina-purple text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    Single Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => { setGradeMode('combination'); setNewGradeNumber(''); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${gradeMode === 'combination' ? 'bg-[#2d1b64] dark:bg-lumina-purple text-white shadow-xs' : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'}`}
                  >
                    Combination Grade
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Grade Title</label>
                  <input
                    value={newGradeTitle}
                    onChange={(e) => setNewGradeTitle(e.target.value)}
                    placeholder="e.g. Grade 8 or Theory Class"
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    required
                  />
                </div>

                {gradeMode === 'single' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Select Grade</label>
                    <select
                      value={newGradeNumber}
                      onChange={(e) => setNewGradeNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                      required
                    >
                      <option value="">Choose grade</option>
                      {allGrades.map((grade) => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Custom Combination Name</label>
                    <input
                      value={customGradeInput}
                      onChange={(e) => setCustomGradeInput(e.target.value)}
                      placeholder="e.g. Grade 10 & 11"
                      className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                )}
              </div>

              {gradeMode === 'combination' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Select Grades to Combine</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 dark:bg-slate-800 p-3 rounded-xl border border-gray-200 dark:border-slate-700 max-h-36 overflow-y-auto">
                    {allGrades.map((g) => {
                      const isChecked = combinationGrades.includes(g);
                      return (
                        <label key={g} className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${isChecked ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800' : 'hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300'}`}>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setCombinationGrades([...combinationGrades, g]);
                              } else {
                                setCombinationGrades(combinationGrades.filter(item => item !== g));
                              }
                            }}
                            className="rounded text-purple-600 focus:ring-purple-500"
                          />
                          <span>{g}</span>
                        </label>
                      );
                    })}
                  </div>
                  {combinationGrades.length > 0 && (
                    <p className="mt-1.5 text-xs text-purple-700 dark:text-purple-400 font-semibold">
                      Combined Result: <span className="underline">{combinationGrades.join(' & ')}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddGrade(false)}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2d1b64] dark:bg-lumina-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-900 transition shadow-xs cursor-pointer"
                >
                  Save Grade Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Stream Setup & Management Modal */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#FF0000] to-[#CC0000] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                  <FaYoutube className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {currentLesson?.liveStream?.isLive ? 'Manage Active Live Class' : 'Start YouTube Live Class'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Grade: {selectedGrade} • {course?.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveModal(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleStartLiveStream} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Live Class Title (Optional)</label>
                <input
                  type="text"
                  value={liveStreamTitle}
                  onChange={(e) => setLiveStreamTitle(e.target.value)}
                  placeholder="e.g. Unit 4 Live Revision Class"
                  className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                  <span>YouTube Live Stream Link or Video ID <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-red-600 font-extrabold uppercase">Required</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={liveYoutubeUrl}
                    onChange={(e) => setLiveYoutubeUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-medium"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600">
                    <FaYoutube className="text-lg" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
                  💡 Tip: Set your YouTube Live Stream to <strong>Unlisted</strong> on YouTube Studio so only enrolled students inside LuminaLearn can access it.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800 gap-2">
                {currentLesson?.liveStream?.isLive ? (
                  <button
                    type="button"
                    onClick={() => handleEndLiveStream(saveLiveAsVideo)}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-2xl transition shadow-sm cursor-pointer flex items-center gap-1.5"
                  >
                    ⏹️ End Live Class
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLiveModal(false)}
                    className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishingLive}
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-[#FF0000] via-[#E60000] to-[#CC0000] hover:from-[#E60000] hover:to-[#B30000] text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md shadow-red-600/30 cursor-pointer disabled:opacity-50 flex items-center gap-2 border border-red-500/30 transform hover:-translate-y-0.5 active:scale-95"
                  >
                    <FaYoutube className="text-xl text-white" />
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    <span>{isPublishingLive ? 'Publishing...' : currentLesson?.liveStream?.isLive ? 'Update Live Stream' : 'Publish Live Class'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Download Settings Modal (Teacher/Admin) */}
      {editingDownloadModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-purple-100 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  <FaDownload className="text-purple-700 dark:text-purple-400" /> Material Download Access
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Configure when and how students can download this {editingDownloadModal.materialType === 'pdf' ? 'PDF Note' : editingDownloadModal.materialType === 'assignment' ? 'Assignment PDF' : 'Video Lesson'}.
                </p>
              </div>
              <button
                onClick={() => setEditingDownloadModal({ isOpen: false, materialType: null, material: null, lessonId: null })}
                className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 rounded-2xl border border-purple-100 dark:border-purple-800">
              <p className="text-xs text-purple-900 dark:text-purple-300 font-extrabold truncate">
                📄 {editingDownloadModal.material?.title || 'Selected Study Material'}
              </p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Choose Download Policy:
              </label>
              
              <div className="space-y-2.5">
                <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${editDownloadType === 'immediate' ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-300 font-bold shadow-xs' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  <input
                    type="radio"
                    name="editDownloadType"
                    value="immediate"
                    checked={editDownloadType === 'immediate'}
                    onChange={(e) => setEditDownloadType(e.target.value)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div>
                    <p className="text-sm font-bold">🟢 Immediate Download</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Students can download this material immediately.</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${editDownloadType === 'one_month' ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-300 font-bold shadow-xs' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  <input
                    type="radio"
                    name="editDownloadType"
                    value="one_month"
                    checked={editDownloadType === 'one_month'}
                    onChange={(e) => setEditDownloadType(e.target.value)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div>
                    <p className="text-sm font-bold">⏳ After 1 Month (30 Days)</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Download button will automatically unlock in 30 days.</p>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${editDownloadType === 'custom_date' ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800 text-blue-950 dark:text-blue-300 font-bold shadow-xs' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  <input
                    type="radio"
                    name="editDownloadType"
                    value="custom_date"
                    checked={editDownloadType === 'custom_date'}
                    onChange={(e) => setEditDownloadType(e.target.value)}
                    className="w-4 h-4 text-purple-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold">📅 Custom Scheduled Date</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Pick a specific calendar date when download unlocks.</p>
                  </div>
                </label>

                {editDownloadType === 'custom_date' && (
                  <div className="pl-6 pt-1">
                    <input
                      type="date"
                      value={editCustomUnlockDate}
                      onChange={(e) => setEditCustomUnlockDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full p-2.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-slate-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      required
                    />
                  </div>
                )}

                <label className={`flex items-center gap-3 p-3.5 rounded-2xl border transition cursor-pointer ${editDownloadType === 'disabled' ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-950 dark:text-red-300 font-bold shadow-xs' : 'bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700'}`}>
                  <input
                    type="radio"
                    name="editDownloadType"
                    value="disabled"
                    checked={editDownloadType === 'disabled'}
                    onChange={(e) => setEditDownloadType(e.target.value)}
                    className="w-4 h-4 text-red-600"
                  />
                  <div>
                    <p className="text-sm font-bold">🚫 Disable Download (View Online Only)</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">Students can only view or read online in browser.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingDownloadModal({ isOpen: false, materialType: null, material: null, lessonId: null })}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold text-xs hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSavingDownloadSettings}
                onClick={handleSaveMaterialDownloadSettings}
                className="px-6 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md transition cursor-pointer disabled:opacity-50"
              >
                {isSavingDownloadSettings ? 'Saving...' : 'Save Download Permissions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;