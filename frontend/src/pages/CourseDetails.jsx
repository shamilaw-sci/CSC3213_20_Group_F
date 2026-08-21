import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import CourseEnrollmentModal from '../components/CourseEnrollmentModal';
import TeacherModal from '../components/TeacherModal';
import PdfReaderModal from '../components/PdfReaderModal';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import LiveChatBox from '../components/LiveChatBox';
import ScheduledLiveHero from '../components/ScheduledLiveHero';
import LiveThumbnailCropperModal from '../components/LiveThumbnailCropperModal';
import { 
  FaChalkboardTeacher, 
  FaBookOpen, 
  FaLock, 
  FaLockOpen, 
  FaVideo, 
  FaYoutube, 
  FaCalendarAlt, 
  FaChevronDown, 
  FaChevronUp, 
  FaClock, 
  FaMapMarkerAlt, 
  FaTimes, 
  FaStop,
  FaComments,
  FaCrop,
  FaImage,
  FaTrashAlt,
  FaBroadcastTower,
  FaPlay,
  FaCalendarCheck,
  FaUserGraduate,
  FaSearch,
  FaUserPlus,
  FaUserMinus,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaPhoneAlt,
  FaEnvelope,
  FaIdCard,
  FaHistory,
  FaCheck,
  FaTimesCircle,
  FaArrowRight,
  FaFilter,
  FaUsers,
  FaReceipt
} from 'react-icons/fa';

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

const normalizeGrade = (g) => g ? String(g).toLowerCase().replace(/\s+/g, '').replace('grade', '') : '';

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const gradeFromUrl = searchParams.get('grade');

  const [course, setCourse] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`lumina_cached_course_${courseId}`);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [lessons, setLessons] = useState(() => {
    try {
      const cached = sessionStorage.getItem(`lumina_cached_lessons_${courseId}`);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(() => {
    try {
      return !sessionStorage.getItem(`lumina_cached_course_${courseId}`);
    } catch {
      return true;
    }
  });
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState(null);
  const [pdfProgressMap, setPdfProgressMap] = useState({});
  const [activePdfModal, setActivePdfModal] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || {};
    } catch {
      return {};
    }
  })();

  // Track selected class. When null, show class cards grid.
  const [selectedGrade, setSelectedGrade] = useState(gradeFromUrl || null);
  const hasAutoSelectedGradeRef = useRef(false);
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

  const currentLesson = useMemo(() => {
    if (!selectedGrade) return null;
    const norm = normalizeGrade(selectedGrade);
    const matching = (lessons || []).filter(l => {
      if (l.grade === selectedGrade) return true;
      const lNorm = normalizeGrade(l.grade);
      return lNorm === norm || (l.grade && String(l.grade).split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade).includes(norm));
    });

    if (matching.length === 0) return null;
    const liveLesson = matching.find(l => l.liveStream && l.liveStream.isLive);
    if (liveLesson) return liveLesson;
    return matching[matching.length - 1] || matching[0];
  }, [lessons, selectedGrade]);

  const filteredPickerStudents = useMemo(() => {
    return (gradeStudents || []).filter((student) => {
      if (pickerSearchQuery.trim() !== "") {
        const q = pickerSearchQuery.toLowerCase().trim();
        const matchesName = student.name && student.name.toLowerCase().includes(q);
        const matchesReg = student.registrationNumber && student.registrationNumber.toLowerCase().includes(q);
        const matchesEmail = student.email && student.email.toLowerCase().includes(q);
        const matchesPhone = student.parentsPhoneNumber && student.parentsPhoneNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesReg && !matchesEmail && !matchesPhone) return false;
      }
      if (pickerFilter === "due") {
        return student.payment && student.payment.status === "Due";
      }
      if (pickerFilter === "absent") {
        return student.attendance && student.attendance.isChronicallyAbsent;
      }
      return true;
    });
  }, [gradeStudents, pickerSearchQuery, pickerFilter]);

  const pickerCounts = useMemo(() => {
    const list = gradeStudents || [];
    const total = list.length;
    const due = list.filter(s => s.payment && s.payment.status === "Due").length;
    const absent = list.filter(s => s.attendance && s.attendance.isChronicallyAbsent).length;
    const enrolled = list.filter(s => s.isEnrolled).length;
    const available = list.filter(s => !s.isEnrolled).length;
    return { total, due, absent, enrolled, available };
  }, [gradeStudents]);

  const studentGrade = user?.grade;
  const currentUserId = user?.id || user?._id;
  const alreadyEnrolled = Boolean(
    course?.enrolledStudents?.some(
      (s) => {
        const sId = (typeof s === 'object' && s !== null) ? (s._id || s.id) : s;
        return sId && currentUserId && sId.toString() === currentUserId.toString();
      }
    )
  );
  const canEnroll = user?.role === 'student' && studentGrade && course?.enrolledGrades?.some(g => normalizeGrade(g.gradeNumber) === normalizeGrade(studentGrade)) && !alreadyEnrolled;

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
    try {
      const saved = localStorage.getItem(`completed_materials_${user?.id || user?._id}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
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
      const [courseResult, lessonsResult, quizzesResult] = await Promise.allSettled([
        api.get(`/courses/${courseId}`),
        api.get(`/lessons/course/${courseId}`),
        api.get(`/quizzes/course/${courseId}`)
      ]);

      if (courseResult.status === 'rejected') {
        throw courseResult.reason;
      }

      const courseData = courseResult.value?.data;
      if (courseData) {
        setCourse(courseData);
        try {
          sessionStorage.setItem(`lumina_cached_course_${courseId}`, JSON.stringify(courseData));
        } catch {}
      }

      if (lessonsResult.status === 'fulfilled') {
        const freshLessons = lessonsResult.value?.data || [];
        setLessons(freshLessons);
        try {
          sessionStorage.setItem(`lumina_cached_lessons_${courseId}`, JSON.stringify(freshLessons));
        } catch {}
      } else if (!lessons.length) {
        setLessons([]);
      }

      if (quizzesResult.status === 'fulfilled') {
        setQuizzes(quizzesResult.value?.data || []);
      } else {
        setQuizzes([]);
      }

      // Auto-enter grade workspace if grade query param is present or if user is enrolled student
      if (!hasAutoSelectedGradeRef.current && courseData) {
        if (gradeFromUrl) {
          setSelectedGrade(gradeFromUrl);
          hasAutoSelectedGradeRef.current = true;
        } else if (user?.role === 'student') {
          const currentUserId = (user?.id || user?._id || '').toString();
          const isEnrolled = Boolean(
            courseData.enrolledStudents?.some(s => {
              const sId = (typeof s === 'object' && s !== null) ? (s._id || s.id) : s;
              return sId && currentUserId && sId.toString() === currentUserId;
            })
          );
          if (isEnrolled && courseData.enrolledGrades && courseData.enrolledGrades.length > 0) {
            const studentGradeNorm = normalizeGrade(user?.grade);
            const matchingGrade = courseData.enrolledGrades.find(eg => {
              const gNum = eg.gradeNumber || '';
              const parts = String(gNum).split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade);
              return parts.includes(studentGradeNorm) || normalizeGrade(gNum) === studentGradeNorm;
            }) || (courseData.enrolledGrades.length === 1 ? courseData.enrolledGrades[0] : null);

            if (matchingGrade) {
              setSelectedGrade(matchingGrade.gradeNumber || matchingGrade.title);
              hasAutoSelectedGradeRef.current = true;
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch course details:", err);
      toast.error(err.response?.data?.error || "Failed to fetch details.");
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
    const updatedVideos = [...(currentLesson.videoLessons || []), { title: videoTitle, url: videoUrl }];
    try {
      await api.put(`/lessons/${currentLesson._id}`,
        { videoLessons: updatedVideos }
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

    try {
      await api.post(`/lessons/${currentLesson._id}/pdf`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("PDF uploaded successfully!");
      setPdfFile(null);
      setPdfTitle("");
      await fetchCourseDetails();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to upload PDF.";
      toast.error(errMsg);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Live Streaming States & Scheduled Live
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [showEndStreamConfirmModal, setShowEndStreamConfirmModal] = useState(false);
  const [isEndingStream, setIsEndingStream] = useState(false);
  const [liveStreamTitle, setLiveStreamTitle] = useState('');
  const [liveYoutubeUrl, setLiveYoutubeUrl] = useState('');
  const [saveLiveAsVideo, setSaveLiveAsVideo] = useState(true);
  const [isPublishingLive, setIsPublishingLive] = useState(false);
  const [showPostStreamChat, setShowPostStreamChat] = useState(false);

  // Live Stream Scheduling & Thumbnail Cropper States
  const [isScheduledLive, setIsScheduledLive] = useState(false);
  const [scheduledDate, setScheduledDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d.toTimeString().slice(0, 5);
  });
  const [liveThumbnail, setLiveThumbnail] = useState('');
  const [cropperRawImage, setCropperRawImage] = useState(null);
  const [isThumbnailCropperOpen, setIsThumbnailCropperOpen] = useState(false);
  const thumbnailInputRef = useRef(null);

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

    try {
      await api.post(`/lessons/${currentLesson._id}/assignment`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("Assignment PDF uploaded successfully!");
      setAssignmentFile(null);
      setAssignmentTitle("");
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

  const handleSelectThumbnailFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file (PNG, JPG, JPEG).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropperRawImage(reader.result);
      setIsThumbnailCropperOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCropComplete = (croppedDataUrl) => {
    setLiveThumbnail(croppedDataUrl);
    toast.success("16:9 Thumbnail cropped & attached!");
  };

  const handleStartLiveStream = async (e) => {
    e.preventDefault();
    const targetLesson = currentLesson || (lessons || []).find(l => String(l.grade) === String(selectedGrade)) || (lessons || []).find(l => l.liveStream?.isLive) || (lessons || [])[0];
    if (!targetLesson?._id) {
      toast.error("Please select a class workspace first.");
      return;
    }

    if (!liveYoutubeUrl.trim()) {
      toast.error("Please enter a YouTube Live link or Video ID.");
      return;
    }

    let scheduledStartTime = null;
    if (isScheduledLive) {
      if (!scheduledDate || !scheduledTime) {
        toast.error("Please select a scheduled date and time.");
        return;
      }
      scheduledStartTime = new Date(`${scheduledDate}T${scheduledTime}`);
      if (isNaN(scheduledStartTime.getTime())) {
        toast.error("Invalid scheduled date or time.");
        return;
      }
    }

    try {
      setIsPublishingLive(true);
      const res = await api.post(`/lessons/${targetLesson._id}/live-stream`, {
        youtubeUrl: liveYoutubeUrl.trim(),
        title: liveStreamTitle.trim(),
        isScheduled: isScheduledLive,
        scheduledStartTime,
        thumbnail: liveThumbnail
      });
      toast.success(res.data.message || (isScheduledLive ? "Live Class scheduled successfully!" : "Live Class published successfully!"));
      setShowLiveModal(false);
      setLiveYoutubeUrl('');
      setLiveStreamTitle('');
      setLiveThumbnail('');
      setIsScheduledLive(false);
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to publish live class.");
    } finally {
      setIsPublishingLive(false);
    }
  };

  const handleGoLiveImmediately = async (lessonId) => {
    const targetLesson = (lessons || []).find(l => l._id === lessonId || String(l.grade) === String(selectedGrade)) || currentLesson || (lessons || [])[0];
    if (!targetLesson?._id) return;
    try {
      const res = await api.post(`/lessons/${targetLesson._id}/live-stream`, {
        youtubeUrl: targetLesson.liveStream?.youtubeUrl,
        title: targetLesson.liveStream?.title,
        thumbnail: targetLesson.liveStream?.thumbnail,
        isScheduled: false,
        goLiveNow: true
      });
      toast.success("🔴 You are now LIVE! Class stream started.");
      await fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to start live stream immediately.");
    }
  };

  const handleOpenEditScheduledLive = (lesson) => {
    const targetLesson = lesson || currentLesson || (lessons || []).find(l => String(l.grade) === String(selectedGrade)) || (lessons || []).find(l => l.liveStream?.isLive) || (lessons || [])[0];
    const ls = targetLesson?.liveStream || {};
    setLiveStreamTitle(ls.title || '');
    setLiveYoutubeUrl(ls.youtubeUrl || '');
    setLiveThumbnail(ls.thumbnail || '');
    setIsScheduledLive(Boolean(ls.isScheduled));
    if (ls.scheduledStartTime) {
      try {
        const d = new Date(ls.scheduledStartTime);
        setScheduledDate(d.toISOString().split('T')[0]);
        setScheduledTime(d.toTimeString().slice(0, 5));
      } catch (e) {}
    }
    setShowLiveModal(true);
  };

  const handleEndLiveStream = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setShowEndStreamConfirmModal(true);
  };

  const confirmEndLiveStream = async (shouldSaveVideo = saveLiveAsVideo) => {
    const targetLesson = currentLesson || (lessons || []).find(l => String(l.grade) === String(selectedGrade)) || (lessons || []).find(l => l.liveStream?.isLive) || (lessons || []).find(l => l._id) || (lessons || [])[0];
    if (!targetLesson?._id) {
      toast.error("Class not found.");
      setShowEndStreamConfirmModal(false);
      setIsEndingStream(false);
      return;
    }

    setIsEndingStream(true);
    try {
      const res = await api.delete(`/lessons/${targetLesson._id}/live-stream?saveAsVideo=${Boolean(shouldSaveVideo)}`, {
        data: { saveAsVideo: Boolean(shouldSaveVideo) }
      });
      toast.success(res.data?.message || "Live Class ended successfully!");
      setShowEndStreamConfirmModal(false);
      setShowLiveModal(false);
      await fetchCourseDetails();
    } catch (err) {
      console.warn("DELETE live stream failed, trying POST fallback:", err);
      try {
        const resPost = await api.post(`/lessons/${targetLesson._id}/live-stream/end`, {
          saveAsVideo: Boolean(shouldSaveVideo)
        });
        toast.success(resPost.data?.message || "Live Class ended successfully!");
        setShowEndStreamConfirmModal(false);
        setShowLiveModal(false);
        await fetchCourseDetails();
      } catch (fallbackErr) {
        console.error("Failed to end live stream:", fallbackErr);
        toast.error(fallbackErr.response?.data?.error || err.response?.data?.error || "Failed to end live stream.");
      }
    } finally {
      setIsEndingStream(false);
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2d1b64]"></div>
    </div>
  );

  if (!course) return (
    <div className="min-h-[60vh] p-8 flex flex-col items-center justify-center text-center">
      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-200 max-w-md w-full space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-100 text-[#2d1b64] flex items-center justify-center text-3xl mx-auto">
          📚
        </div>
        <h3 className="text-xl font-black text-gray-900">Course Not Found</h3>
        <p className="text-gray-500 text-sm">The course you are looking for does not exist or could not be loaded.</p>
        <button
          onClick={() => navigate('/courses')}
          className="w-full py-3 bg-[#2d1b64] hover:bg-purple-900 text-white font-bold rounded-xl transition cursor-pointer"
        >
          ← Return to All Courses
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto font-sans text-gray-800 space-y-6">

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
                      className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover ring-4 ring-white shadow-2xl bg-white border-2 border-purple-100 group-hover/teacher:ring-purple-600 group-hover/teacher:scale-105 transition-all duration-300"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white rounded-full flex items-center justify-center font-black text-4xl sm:text-5xl ring-4 ring-white shadow-2xl border-2 border-purple-100 group-hover/teacher:ring-purple-600 group-hover/teacher:scale-105 transition-all">
                      {course.instructor.name ? course.instructor.name.charAt(0) : '?'}
                    </div>
                  )}
                </div>

                {/* Instructor Badge & Prominent Name (No Arrow) */}
                <div className="pb-1">
                  <span className="text-xs font-black text-white bg-purple-600 px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5 w-fit mb-1 border border-purple-400/40 uppercase tracking-widest">
                    <FaChalkboardTeacher /> INSTRUCTOR
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight group-hover/teacher:text-purple-800 transition-colors">
                    {course.instructor.name || 'Unassigned'}
                  </h4>
                </div>
              </div>
            </div>
          )}

          {/* Course Title & Description */}
          <div className="mt-6">
            <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight mb-3">{course?.title}</h1>
            <p className="text-gray-600 text-base leading-relaxed font-medium">{course?.description}</p>
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
              <div className="mt-3 p-6 bg-gradient-to-br from-purple-900/5 via-indigo-900/5 to-purple-950/10 rounded-3xl border border-purple-200/90 shadow-lg space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-purple-200/60">
                  <div>
                    <h3 className="text-lg font-black text-purple-950 flex items-center gap-2">
                      <span>📅</span> Class Timetables & Weekly Schedule
                    </h3>
                    <p className="text-xs text-purple-800/80 font-medium">Live class session times, scheduled days, and venue locations for enrolled grades.</p>
                  </div>
                  <span className="bg-purple-950 text-amber-300 text-xs font-black px-3.5 py-1 rounded-xl shadow-xs border border-purple-800">
                    {courseSchedules.length} Timetable Sessions
                  </span>
                </div>

                {courseSchedules.length === 0 ? (
                  <div className="p-6 bg-white/80 rounded-2xl border border-purple-100 text-center text-xs font-semibold text-purple-900 shadow-2xs">
                    No specific live timetable schedules registered for this course yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {courseSchedules.map((sch) => (
                      <div key={sch._id} className="p-4.5 bg-white rounded-2xl border border-purple-200/90 shadow-sm hover:shadow-md transform hover:-translate-y-1 hover:border-purple-300 transition-all duration-300 space-y-3 group cursor-pointer">
                        <div className="flex justify-between items-center gap-1.5 flex-wrap">
                          <span className="px-3 py-1 bg-gradient-to-r from-purple-900 to-indigo-950 text-amber-300 font-black text-[11px] rounded-xl uppercase tracking-wider shadow-xs">
                            🎓 {sch.className || sch.grade || 'All Grades'}
                          </span>
                          <span className="px-3 py-1 bg-amber-100 text-amber-950 font-black text-[11px] rounded-xl border border-amber-300 uppercase shadow-2xs">
                            🗓️ {sch.dayOfWeek}
                          </span>
                        </div>
                        <h5 className="font-extrabold text-slate-900 text-sm group-hover:text-purple-950 transition-colors line-clamp-2">
                          {sch.title}
                        </h5>
                        <div className="pt-2 border-t border-purple-100 text-xs font-extrabold text-purple-950 flex items-center justify-between gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200 text-purple-900">
                            <FaClock className="text-purple-600" /> {sch.startTime} - {sch.endTime}
                          </span>
                          <span className="inline-flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 text-indigo-950">
                            <FaMapMarkerAlt className="text-indigo-600" /> {sch.room || 'Main Hall'}
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
              className="mb-2 flex items-center gap-2 text-[#2d1b64] hover:underline font-bold transition cursor-pointer"
            >
              ← Back to Classes
            </button>
            <h1 className="text-3xl font-extrabold text-gray-800 mb-1">{course?.title}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-purple-600 font-bold text-lg">{selectedGrade} Workspace</p>
              {currentLesson?.liveStream?.isLive ? (
                <span className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-red-500/20 flex items-center gap-1.5 border border-red-400 animate-pulse ring-2 ring-red-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                  LIVE NOW
                </span>
              ) : currentLesson?.liveStream?.isScheduled ? (
                <span className="bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-amber-500/20 flex items-center gap-1.5 border border-amber-400">
                  <FaBroadcastTower className="text-[10px] animate-pulse" />
                  SCHEDULED LIVE
                </span>
              ) : (
                <span className="bg-emerald-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  Workspace Active
                </span>
              )}
            </div>
          </div>

          {(user?.role === 'admin' || user?.role === 'teacher') && (
            <button
              type="button"
              onClick={() => {
                const targetLesson = currentLesson || (lessons || []).find(l => String(l.grade) === String(selectedGrade)) || (lessons || []).find(l => l.liveStream?.isLive) || (lessons || [])[0];
                if (targetLesson?.liveStream?.isLive || targetLesson?.liveStream?.isScheduled) {
                  handleOpenEditScheduledLive(targetLesson);
                } else {
                  setLiveStreamTitle('');
                  setLiveYoutubeUrl('');
                  setLiveThumbnail('');
                  setIsScheduledLive(false);
                  setShowLiveModal(true);
                }
              }}
              className={`px-5 py-3 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-lg flex items-center gap-3 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 border ${
                currentLesson?.liveStream?.isLive
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white border-red-400 shadow-red-500/30 ring-2 ring-red-300'
                  : currentLesson?.liveStream?.isScheduled
                  ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:to-orange-800 text-white border-amber-400 shadow-amber-500/30 ring-2 ring-amber-300'
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
                {currentLesson?.liveStream?.isLive 
                  ? 'Manage Live Class' 
                  : currentLesson?.liveStream?.isScheduled 
                  ? 'Manage Scheduled Live' 
                  : 'Start YouTube Live Class'}
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
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-bold text-gray-700 mb-1">Assign/Remove Classes</h3>
                  <p className="text-sm text-gray-500">
                    Add grades that can access this course and remove them when needed.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddGrade(true)}
                    className="rounded-full bg-purple-600 px-5 py-2 text-white font-semibold hover:bg-purple-700 transition cursor-pointer shadow-xs"
                  >
                    + Add Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-full bg-red-500 px-5 py-2 text-white font-semibold hover:bg-red-600 transition cursor-pointer shadow-xs"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Course'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {course?.enrolledGrades?.map((eg) => {
                  const isGradeLive = lessons?.some(l => {
                    if (!l?.liveStream?.isLive) return false;
                    const lGradeNorm = normalizeGrade(l.grade);
                    const gNum = eg.gradeNumber || '';
                    const parts = gNum.split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade);
                    return parts.includes(lGradeNorm) || normalizeGrade(gNum) === lGradeNorm;
                  });

                  return (
                    <div
                      key={eg.gradeNumber}
                      onClick={() => setSelectedGrade(eg.gradeNumber)}
                      className={`relative bg-white p-5 rounded-2xl border shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md cursor-pointer group ${
                        isGradeLive ? 'border-red-400 bg-red-50/30 ring-2 ring-red-300/60 shadow-red-500/10' : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="absolute right-4 top-4 flex flex-col gap-2 z-10">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openStudentPicker(eg.gradeNumber);
                          }}
                          className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition cursor-pointer shadow-xs"
                        >
                          Manage Students
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleGrade(eg.gradeNumber);
                          }}
                          className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100 transition cursor-pointer shadow-xs"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="text-xs text-gray-400 group-hover:text-purple-600 font-bold transition-colors">{eg.gradeNumber}</div>
                        {isGradeLive && (
                          <span className="bg-red-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shadow-xs animate-pulse flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-white animate-ping"></span>
                            LIVE NOW
                          </span>
                        )}
                      </div>
                      <h4 className="text-lg font-extrabold text-gray-800 mb-1 group-hover:text-purple-900 transition-colors">{eg.title || eg.gradeNumber}</h4>
                      <p className="text-gray-500 text-xs font-medium">
                        {isGradeLive ? '🔴 Live Class currently in progress.' : 'This class can enrol in the course when assigned.'}
                      </p>
                    </div>
                  );
                })}
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

                    const isGradeLive = lessons?.some(l => {
                      if (!l?.liveStream?.isLive) return false;
                      const lGradeNorm = normalizeGrade(l.grade);
                      const gNum = eg.gradeNumber || '';
                      const parts = gNum.split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade);
                      return parts.includes(lGradeNorm) || normalizeGrade(gNum) === lGradeNorm;
                    });
                    
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
                          if (isGradeLive) {
                            setSelectedGrade(eg.gradeNumber);
                            return;
                          }

                          if (isDeactive) {
                            if (user?.role === 'admin' || user?.role === 'teacher') {
                              setSelectedGrade(eg.gradeNumber);
                              return;
                            }
                            toast.error("This grade stream is currently deactivated.");
                            return;
                          }

                          if (user?.role === 'student' && !alreadyEnrolled) {
                            toast.error("Please click 'Enroll & Pay Online' to enroll before accessing the workspace.");
                            setShowEnrollModal(true);
                            return;
                          }
                          setSelectedGrade(eg.gradeNumber);
                        }}
                        className={`bg-white p-6 rounded-2xl shadow-xs border transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative ${
                          isGradeLive
                            ? 'border-red-400 bg-gradient-to-b from-red-50/50 via-white to-white ring-2 ring-red-400/50 shadow-md shadow-red-500/10 cursor-pointer'
                            : isDeactive
                            ? 'border-red-200 bg-red-50/40 cursor-pointer'
                            : user?.role === 'student' && !alreadyEnrolled
                            ? 'border-gray-200 bg-gray-50/60 cursor-pointer hover:border-purple-300' 
                            : 'border-purple-100/80 hover:border-purple-400 cursor-pointer group'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors ${
                              isGradeLive
                                ? 'bg-red-600 text-white shadow-md shadow-red-500/30'
                                : isDeactive
                                ? 'bg-red-100 text-red-600'
                                : user?.role === 'student' && !alreadyEnrolled
                                ? 'bg-gray-200 text-gray-500'
                                : 'bg-[#f3f4f6] group-hover:bg-[#2d1b64] group-hover:text-white'
                            }`}>
                              {isGradeLive ? '📹' : isDeactive ? '🔒' : user?.role === 'student' && !alreadyEnrolled ? '🔒' : '🎓'}
                            </div>

                            {/* Live / Status Button on Top Right of Grade Card */}
                            {isGradeLive ? (
                              <span className="bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-full uppercase tracking-widest shadow-md shadow-red-500/30 flex items-center gap-1.5 border border-red-400 animate-pulse ring-2 ring-red-400/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping"></span>
                                LIVE NOW
                              </span>
                            ) : user?.role === 'student' && !alreadyEnrolled ? (
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">
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
                          isGradeLive
                            ? 'text-red-950 font-black'
                            : user?.role === 'student' && !alreadyEnrolled ? 'text-gray-700' : 'text-gray-800 group-hover:text-[#2d1b64]'
                        }`}>
                          {eg.title || eg.gradeNumber}
                        </h3>
                        <p className={`text-xs mt-2 font-medium ${isGradeLive ? 'text-red-600 font-bold flex items-center gap-1.5' : 'text-gray-400'}`}>
                          {isGradeLive ? (
                            <>
                              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping inline-block"></span>
                              <span>Live Class in progress • Click to Join</span>
                            </>
                          ) : user?.role === 'student' && !alreadyEnrolled ? (
                            'Enroll required to view announcements & lessons' 
                          ) : (
                            'Click to view announcements and lessons'
                          )}
                        </p>
                      </div>

                      {user?.role === 'teacher' && (
                        <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end" onClick={(e) => e.stopPropagation()}>
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
                                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                                : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-300 cursor-pointer'
                            }`}
                          >
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {/* Active YouTube Live Stream Player or Scheduled Live Hero */}
          {(() => {
            const ls = currentLesson?.liveStream;
            if (!ls) return null;

            if (ls.isLive) {
              return (
                <LiveStreamPlayer
                  liveStream={ls}
                  isTeacherOrAdmin={user?.role === 'admin' || user?.role === 'teacher'}
                  onEndStream={() => handleEndLiveStream(saveLiveAsVideo)}
                  lessonId={currentLesson._id}
                  grade={selectedGrade}
                  courseTitle={course?.title}
                />
              );
            }

            if (ls.isScheduled && ls.scheduledStartTime) {
              const diffMs = new Date(ls.scheduledStartTime).getTime() - Date.now();
              const isPreLive = diffMs <= 15 * 60 * 1000; // Unlocks 15 minutes before

              if (isPreLive) {
                return (
                  <LiveStreamPlayer
                    liveStream={ls}
                    isPreLive={true}
                    isTeacherOrAdmin={user?.role === 'admin' || user?.role === 'teacher'}
                    onGoLiveNow={() => handleGoLiveImmediately(currentLesson._id)}
                    onEndStream={() => handleEndLiveStream(saveLiveAsVideo)}
                    lessonId={currentLesson._id}
                    grade={selectedGrade}
                    courseTitle={course?.title}
                  />
                );
              }

              return (
                <ScheduledLiveHero
                  liveStream={ls}
                  isTeacherOrAdmin={user?.role === 'admin' || user?.role === 'teacher'}
                  onGoLiveNow={() => handleGoLiveImmediately(currentLesson._id)}
                  onEditSchedule={() => handleOpenEditScheduledLive(currentLesson)}
                  onCancelSchedule={() => handleEndLiveStream(false)}
                  grade={selectedGrade}
                  courseTitle={course?.title}
                />
              );
            }

            return null;
          })()}

          {/* Post-Stream Feedback & Q&A Discussion Thread (When Stream is Concluded) */}
          {currentLesson?._id && !currentLesson?.liveStream?.isLive && (
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-purple-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-900 flex items-center justify-center text-lg font-black shadow-2xs">
                    <FaComments />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-gray-900 text-sm sm:text-base flex items-center gap-2">
                      <span>Provide Messages or Replies About Stream</span>
                      <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10.5px]">
                        Post-Stream Q&A
                      </span>
                    </h4>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {user?.role === 'admin' || user?.role === 'teacher'
                        ? "Review student reactions and questions about the stream, and send direct replies anytime."
                        : "Provide your reactions, final feedback, or questions about the stream to receive teacher replies."}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowPostStreamChat(!showPostStreamChat)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white text-xs font-black shadow-md transition cursor-pointer flex items-center gap-2 shrink-0 transform hover:scale-105 active:scale-95"
                >
                  <FaComments className="text-xs" />
                  <span>{showPostStreamChat ? "Close Post-Stream Discussion" : "Provide Messages / View Discussion"}</span>
                </button>
              </div>

              {showPostStreamChat && (
                <div className="pt-2 animate-fadeIn">
                  <LiveChatBox
                    lessonId={currentLesson._id}
                    isTeacherOrAdmin={user?.role === 'admin' || user?.role === 'teacher'}
                    isFullscreen={false}
                    currentGrade={selectedGrade}
                    classTitle={currentLesson.liveStream?.title}
                    isStreamEnded={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Month Selector Bar */}
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                  <span>🗓️</span> Academic Month Selector
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">Select a month to view weekly study materials and attendance logs. Future months are locked.</p>
              </div>

              {/* Year Navigation */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleNavYearPrev}
                  disabled={navYear <= MIN_NAV_YEAR}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-800 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Year"
                >
                  ‹
                </button>
                <span className="font-black text-gray-900 text-base min-w-[56px] text-center tabular-nums">{navYear}</span>
                <button
                  type="button"
                  onClick={handleNavYearNext}
                  disabled={navYear >= currentYear}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-purple-100 text-gray-600 hover:text-purple-800 flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
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
                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed border border-dashed border-gray-200'
                        : isSelected
                          ? 'bg-purple-700 text-white shadow-md ring-2 ring-purple-400 ring-offset-1 scale-105 cursor-pointer'
                          : 'bg-gray-100 text-gray-700 hover:bg-purple-100 hover:text-purple-900 cursor-pointer'
                    }`}
                  >
                    {locked && (
                      <span className="absolute top-1 right-1 text-[9px] text-gray-300">🔒</span>
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
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-extrabold text-gray-900 text-lg flex items-center gap-2">
                  <span>📅</span> Class Sessions & Workspace — {selectedMonth}
                </h4>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activeSchedule ? (
                    <span>Timetable: <strong className="text-purple-900 font-extrabold">{activeSchedule.dayOfWeek} ({activeSchedule.startTime} - {activeSchedule.endTime})</strong> • {currentMonthSessions.length} sessions in {selectedMonth}</span>
                  ) : (
                    <span>Select a scheduled class date to access study materials and attendance logs. ({currentMonthSessions.length} sessions in {selectedMonth})</span>
                  )}
                </p>
              </div>
              <span className="bg-purple-100 text-purple-900 text-xs font-extrabold px-3 py-1 rounded-lg self-start sm:self-auto border border-purple-200">
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
                        ? 'border-purple-600 bg-purple-50/95 ring-2 ring-purple-400/50 shadow-md scale-[1.02]'
                        : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50/70 shadow-2xs'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5 gap-1">
                      <span className={`text-xs font-black tracking-wide ${isActive ? 'text-purple-900' : 'text-slate-800'}`}>
                        📅 {session.label}
                      </span>
                      {isAttended ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          ✓ Attended
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                          Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px]">
                      <span className="text-purple-700 font-bold">
                        Session {wNum} {session.isFifthWeek ? '• 5th Class' : ''}
                      </span>
                      <span className="text-gray-400 font-medium text-[10px]">
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
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-5 rounded-2xl flex items-start gap-3 shadow-xs">
              <span className="text-2xl shrink-0">🏫</span>
              <div>
                <h4 className="font-extrabold text-amber-950 text-sm">Physical Classroom Student Mode</h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
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
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h4 className="font-bold text-lg text-gray-800 mb-4">Teacher's Announcement (Week {activeWeek})</h4>
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
              <p className="text-green-700 font-semibold">This course is recommended for {studentGrade && (String(studentGrade).toLowerCase().startsWith('grade') ? studentGrade : `Grade ${studentGrade}`)}.</p>
              <button
                onClick={() => setShowEnrollModal(true)}
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-white font-bold hover:from-green-700 hover:to-emerald-700 shadow-md transition"
              >
                Enroll in this Course 🎓
              </button>
            </div>
          )}

          {/* Video Lessons Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800">Video Lessons (Week {activeWeek} — {selectedMonth})</h4>
                <p className="text-xs text-gray-500">Watch the lecture video below to complete video study requirement.</p>
              </div>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${isVideoWatched ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {isVideoWatched ? '✓ Video Completed' : 'Pending View'}
              </span>
            </div>

            {/* Video addition form (Teacher/Admin only) */}
            {isTeacherOrAdmin && (
              <form onSubmit={handleAddVideo} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4 p-4 bg-gray-50 rounded-xl">
                <input
                  type="text"
                  placeholder="Video Title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="p-3 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                  required
                />
                <input
                  type="url"
                  placeholder="Video Link (e.g. YouTube URL)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="p-3 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                  required
                />
                <button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg py-3 shadow-sm cursor-pointer text-sm"
                >
                  + Add Video
                </button>
              </form>
            )}

            {/* Demo / Real Videos List */}
            <div className="space-y-3">
              {!currentLesson?.hideDemoVideo && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-purple-100 rounded-xl bg-purple-50/40 hover:bg-purple-50 transition-all gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-red-500 text-2xl">🎬</div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-sm">
                        Week {activeWeek} Master Lecture Video: Theory & Concepts ({selectedMonth})
                      </p>
                      <p className="text-xs text-purple-700 font-semibold mt-0.5">
                        Required Video Material — 45 mins HD Recording
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isVideoWatched ? (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-4 py-2 rounded-xl border border-emerald-200">
                        ✓ Watched & Completed
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          markMaterialCompleted('video');
                          setActiveVideoModal({
                            title: `Week ${activeWeek} Master Lecture Video (${selectedMonth})`,
                            youtubeUrl: currentLesson?.videoLessons?.[0]?.url || 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
                          });
                        }}
                        className="bg-purple-700 hover:bg-purple-800 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                      >
                        <span>▶</span> Watch Lecture Video
                      </button>
                    )}
                    {isTeacherOrAdmin && (
                      <button
                        onClick={handleDeleteDemoVideo}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}

              {currentLesson?.hideDemoVideo && (!currentLesson?.videoLessons || currentLesson.videoLessons.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No video lessons uploaded for this grade yet.</p>
              )}

              {currentLesson?.videoLessons?.map((vid) => (
                <div key={vid._id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="text-red-500 text-xl">🎬</div>
                    <div>
                      <p className="font-bold text-gray-800">{vid.title}</p>
                      <button
                        type="button"
                        onClick={() => {
                          markMaterialCompleted('video');
                          setActiveVideoModal({
                            title: vid.title,
                            youtubeUrl: vid.url
                          });
                        }}
                        className="text-xs text-purple-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                      >
                        ▶ Watch Video in Secure Player
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        markMaterialCompleted('video');
                        setActiveVideoModal({
                          title: vid.title,
                          youtubeUrl: vid.url
                        });
                      }}
                      className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-extrabold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1"
                    >
                      ▶ Play
                    </button>
                    {isTeacherOrAdmin && (
                      <button
                        onClick={() => handleDeleteVideo(vid._id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PDF Materials Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800">Study Materials — PDF Notes (Week {activeWeek} — {selectedMonth})</h4>
                <p className="text-xs text-gray-500">Download and review the lecture PDF notes to complete document requirement.</p>
              </div>
              <span className={`text-xs font-extrabold px-3 py-1 rounded-full ${isPdfDownloaded ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
                {isPdfDownloaded ? '✓ PDF Completed' : 'Pending View'}
              </span>
            </div>

            {/* PDF upload form (Teacher/Admin only) */}
            {isTeacherOrAdmin && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-gray-700">Upload PDF Lesson Material</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Document Title (Optional)"
                    value={pdfTitle}
                    onChange={(e) => setPdfTitle(e.target.value)}
                    className="p-3 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                  />
                  <div>
                    <input
                      type="file"
                      accept="application/pdf"
                      key={pdfFile ? 'loaded' : 'empty'}
                      onChange={(e) => setPdfFile(e.target.files[0])}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleUploadPdf}
                    disabled={isUploadingPdf}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-lg py-3 shadow-sm cursor-pointer transition-colors text-sm"
                  >
                    {isUploadingPdf ? 'Uploading...' : '+ Upload PDF'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Maximum size: 5MB. Only PDF files are allowed.</p>
              </div>
            )}

            {/* PDF Notes List with Reading Progress */}
            <div className="space-y-3">
              {!currentLesson?.hideDemoPdf && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-blue-100 rounded-xl bg-blue-50/40 hover:bg-blue-50 transition-all gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-red-600 text-2xl font-bold">📕</div>
                    <div>
                      <p className="font-extrabold text-gray-900 text-sm">
                        Week {activeWeek} Lecture Notes & Tutorial Problems ({selectedMonth}).pdf
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-xs text-blue-700 font-semibold">
                          Required Study Notes — PDF Document (2.4 MB)
                        </span>
                        {(() => {
                          const prog = pdfProgressMap['demo-pdf'];
                          const percent = prog?.progressPercentage || 0;
                          const maxRead = prog?.maxPageRead || 0;
                          const total = prog?.totalPages || 20;
                          const nextPage = prog?.nextPageToRead || (maxRead > 0 ? Math.min(total, maxRead + 1) : 1);

                          if (percent >= 100) {
                            return (
                              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                ✓ 100% Completed
                              </span>
                            );
                          } else if (percent > 0) {
                            return (
                              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300">
                                📖 {percent}% Read (Page {maxRead} of {total} • Continue Pg {nextPage})
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setActivePdfModal({
                        pdf: {
                          _id: 'demo-pdf',
                          title: `Week ${activeWeek} Lecture Notes (${selectedMonth}).pdf`,
                          fileUrl: ''
                        },
                        lessonId: currentLesson?._id || 'demo-lesson'
                      })}
                      className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer flex items-center gap-1.5"
                    >
                      <span>📖</span> {(() => {
                        const prog = pdfProgressMap['demo-pdf'];
                        const percent = prog?.progressPercentage || 0;
                        const maxRead = prog?.maxPageRead || 0;
                        const total = prog?.totalPages || 20;
                        const nextPage = prog?.nextPageToRead || (maxRead > 0 ? Math.min(total, maxRead + 1) : 1);

                        if (percent >= 100) return 'Review PDF Notes ▶';
                        if (percent > 0) return `Continue from Page ${nextPage} ▶`;
                        return 'Start Reading PDF ▶';
                      })()}
                    </button>

                    {isPdfDownloaded ? (
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-3 py-2 rounded-xl border border-emerald-200">
                        ✓ Covered
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markMaterialCompleted('pdf')}
                        className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-xl text-xs font-extrabold transition shadow-sm cursor-pointer"
                      >
                        Mark Done
                      </button>
                    )}
                    {isTeacherOrAdmin && (
                      <button
                        onClick={handleDeleteDemoPdf}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition text-xs font-bold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              )}

              {currentLesson?.hideDemoPdf && (!currentLesson?.pdfMaterials || currentLesson.pdfMaterials.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">No study materials uploaded for this grade yet.</p>
              )}

              {currentLesson?.pdfMaterials?.map((pdf) => {
                // Normalize the PDF id to a plain string (MongoDB ObjectId arrives as object)
                const pId = pdf._id ? String(pdf._id) : (pdf.filename || pdf.title);
                // Look up using all possible keys
                const pProg = pdfProgressMap[pId] || pdfProgressMap[pdf.title] || pdfProgressMap[pdf.filename];
                const pPercent = pProg?.progressPercentage || 0;
                const pMaxRead = pProg?.maxPageRead || 0;
                const pTotal = pProg?.totalPages || 0;
                const pNextPage = pProg?.nextPageToRead || (pMaxRead > 0 ? Math.min(pTotal, pMaxRead + 1) : 1);

                return (
                  <div key={pdf._id || pdf.title} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-purple-100 rounded-xl bg-purple-50/20 hover:bg-purple-50 transition-all gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-red-600 text-2xl font-bold">📕</div>
                      <div>
                        <p className="font-extrabold text-gray-900 text-sm">{pdf.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 font-medium">
                            Size: {pdf.fileSize ? (pdf.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '0.99 MB'}
                          </span>

                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden border border-slate-300">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${pPercent >= 100 ? 'bg-emerald-500' : 'bg-purple-600'}`}
                                style={{ width: `${pPercent}%` }}
                              ></div>
                            </div>

                            <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                              pPercent >= 100 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : pPercent > 0 
                                  ? 'bg-purple-100 text-purple-900 border-purple-300'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                            }`}>
                              {pPercent >= 100 
                                ? '✓ 100% Completed' 
                                : pPercent > 0 
                                  ? `📖 ${pPercent}% Read (Page ${pMaxRead} of ${pTotal} • Continue Pg ${pNextPage})`
                                  : '📖 Unread (0%)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
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

                      <a
                        href={pdf.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition"
                        title="Download File"
                      >
                        Download
                      </a>

                      {isTeacherOrAdmin && (
                        <button
                          onClick={() => handleDeletePdf(pdf._id)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition text-xs font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignments Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800">
                  Assignments ({String(selectedGrade || '').toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`} — {selectedMonth})
                </h4>
                <p className="text-xs text-gray-500">Download class assignment PDF documents or upload new ones.</p>
              </div>
            </div>

            {/* Assignment upload form (Teacher/Admin only) */}
            {isTeacherOrAdmin && (
              <div className="mb-4 p-4 bg-gray-50 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-gray-700">Upload Assignment PDF</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Assignment Title (Optional)"
                    value={assignmentTitle}
                    onChange={(e) => setAssignmentTitle(e.target.value)}
                    className="p-3 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                  />
                  <div>
                    <input
                      type="file"
                      accept="application/pdf"
                      key={assignmentFile ? 'loaded' : 'empty'}
                      onChange={(e) => setAssignmentFile(e.target.files[0])}
                      className="w-full p-2 bg-white border border-gray-200 rounded-lg outline-none text-sm"
                    />
                  </div>
                  <button
                    onClick={handleUploadAssignment}
                    disabled={isUploadingAssignment}
                    className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white font-bold rounded-lg py-3 shadow-sm cursor-pointer transition-colors text-sm"
                  >
                    {isUploadingAssignment ? 'Uploading...' : '+ Upload Assignment'}
                  </button>
                </div>
                <p className="text-xs text-gray-500">Maximum size: 5MB. Only PDF files are allowed.</p>
              </div>
            )}

            {/* Assignment PDFs List */}
            <div className="space-y-3">
              {!currentLesson?.assignments || currentLesson.assignments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No assignments uploaded for this grade yet.</p>
              ) : (
                currentLesson.assignments.map((assignment) => (
                  <div key={assignment._id || assignment.title} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-purple-100 rounded-xl bg-purple-50/20 hover:bg-purple-50 transition-all gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-purple-600 text-2xl font-bold">📝</div>
                      <div>
                        <p className="font-extrabold text-gray-900 text-sm">{assignment.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500 font-medium">
                            Size: {assignment.fileSize ? (assignment.fileSize / (1024 * 1024)).toFixed(2) + ' MB' : '0.99 MB'}
                          </span>
                          <span className="text-[10px] text-gray-400 font-medium">
                            Uploaded: {assignment.uploadedAt ? new Date(assignment.uploadedAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <a
                        href={assignment.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold transition"
                        title="Download Assignment"
                      >
                        Download
                      </a>

                      {isTeacherOrAdmin && (
                        <button
                          onClick={() => handleDeleteAssignment(assignment._id)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition text-xs font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Live Class Q&A, Good Reactions & Attendance Summary */}
          {(currentLesson?.liveStream?.feedbacks?.length > 0 || currentLesson?.liveStream?.viewers?.length > 0) && (
            <div className="bg-gradient-to-br from-indigo-950/90 via-slate-900 to-purple-950/90 p-6 rounded-3xl border border-indigo-500/30 text-white shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-indigo-500/30 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 flex items-center justify-center text-xl font-black shadow-lg">
                    ⭐
                  </div>
                  <div>
                    <h4 className="font-extrabold text-lg text-white flex items-center gap-2">
                      Live Class Feedback, Reactions & Q&A
                    </h4>
                    <p className="text-xs text-indigo-200">
                      Student feedback, lecture questions, and positive ratings for {String(selectedGrade || '').toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`}.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-3 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-extrabold text-xs">
                    👥 {currentLesson?.liveStream?.viewers?.length || 0} Attended Live
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 font-extrabold text-xs">
                    🌟 {currentLesson?.liveStream?.feedbacks?.length || 0} Good Reactions
                  </span>
                </div>
              </div>

              {/* Good Reactions Breakdown Badges */}
              {(currentLesson?.liveStream?.feedbacks || []).length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {Object.entries(
                    (currentLesson?.liveStream?.feedbacks || []).reduce((acc, f) => {
                      if (!f) return acc;
                      const label = f.reactionLabel || 'Superb Class';
                      const emoji = f.reactionEmoji || '⭐';
                      const key = `${emoji} ${label}`;
                      acc[key] = (acc[key] || 0) + 1;
                      return acc;
                    }, {})
                  ).map(([reactionKey, count]) => (
                    <div key={reactionKey} className="px-3 py-1.5 rounded-2xl bg-indigo-900/60 border border-indigo-400/40 text-xs font-black text-indigo-100 flex items-center gap-2 shadow-sm">
                      <span>{reactionKey}</span>
                      <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] text-amber-300 font-mono">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Student Questions & Messages List */}
              <div className="space-y-3 pt-2 max-h-96 overflow-y-auto pr-1 scrollbar-thin">
                {(currentLesson?.liveStream?.feedbacks || []).map((item, idx) => {
                  if (!item) return null;
                  const itemGradeStr = String(item.grade || selectedGrade || '').trim();
                  const displayGrade = itemGradeStr.toLowerCase().startsWith('grade') ? itemGradeStr : `Grade ${itemGradeStr}`;
                  return (
                    <div key={item._id || idx} className="p-4 rounded-2xl bg-slate-900/80 border border-indigo-500/20 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-white">{item.name || 'Student'}</span>
                          <span className="px-2 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-300 font-bold text-[10px]">
                            {displayGrade}
                          </span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-black text-xs flex items-center gap-1.5">
                          <span>{item.reactionEmoji || '⭐'}</span>
                          <span>{item.reactionLabel || 'Superb'}</span>
                        </span>
                      </div>

                      {item.question && (
                        <div className="bg-amber-950/40 border border-amber-500/30 p-2.5 rounded-xl text-xs space-y-0.5">
                          <span className="font-extrabold text-amber-400 flex items-center gap-1">
                            <span>❓ Question from Lesson:</span>
                          </span>
                          <p className="text-amber-100 italic">"{item.question}"</p>
                        </div>
                      )}

                      {item.message && (
                        <div className="bg-indigo-950/40 border border-indigo-500/30 p-2.5 rounded-xl text-xs space-y-0.5">
                          <span className="font-extrabold text-indigo-300 flex items-center gap-1">
                            <span>💬 Feedback Message:</span>
                          </span>
                          <p className="text-indigo-100 italic">"{item.message}"</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quizzes & Assessments Section */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h4 className="font-bold text-lg text-gray-800">
                  Quizes ({String(selectedGrade || '').toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`} — {selectedMonth})
                </h4>
                <p className="text-xs text-gray-500">Test your knowledge by attempting the weekly quiz assessments.</p>
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
              {(quizzes || []).filter(q => normalizeGrade(q.grade) === normalizeGrade(selectedGrade) || q.grade === selectedGrade).length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No quizzes available for this grade yet.</p>
              ) : (
                (quizzes || []).filter(q => normalizeGrade(q.grade) === normalizeGrade(selectedGrade) || q.grade === selectedGrade).map((quiz) => {
                  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
                  return (
                    <div key={quiz._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-all gap-4">
                      <div className="flex items-center gap-3">
                        <div className="text-yellow-500 text-2xl">📝</div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-extrabold text-gray-900 text-sm">{quiz.title}</p>
                            {!quiz.isActive && (
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-extrabold px-2 py-0.5 rounded border border-gray-200">
                                Inactive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
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
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                              }`}
                            >
                              {quiz.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => navigate(`/quiz/${quiz._id}/submissions`)}
                              className="bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Submissions
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(quiz._id)}
                              className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <>
                            {quiz.hasAttempted ? (
                              <div className="flex items-center gap-3">
                                <span className="text-xs font-bold text-gray-500">
                                  Score: <strong className="text-purple-600">{quiz.score}</strong> / {quiz.totalPoints}
                                </span>
                                <button
                                  onClick={() => navigate(`/quiz/${quiz._id}/take`)}
                                  className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-6xl h-[690px] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            {(() => {
              const cleanGradeTitle = selectedEnrollGrade 
                ? (String(selectedEnrollGrade).toLowerCase().startsWith('grade') ? selectedEnrollGrade : `Grade ${selectedEnrollGrade}`) 
                : 'Grade';

              return (
                <div className="px-6 py-4.5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-50/80 via-white to-purple-50/40">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-700 via-indigo-700 to-purple-800 text-white flex items-center justify-center text-lg shadow-md border border-purple-400/30 shrink-0">
                      <FaUserGraduate className="text-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                          {cleanGradeTitle} Student Directory & Ledger
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 text-xs font-black border border-purple-200 shadow-2xs">
                          {pickerCounts.enrolled} Enrolled
                        </span>
                        {pickerCounts.due > 0 ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-xs font-black border border-rose-200 shadow-2xs flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                            {pickerCounts.due} Due Fees
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-200 shadow-2xs">
                            Fees Clear
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Manage student enrollments, monitor fee payments, and inspect live attendance records.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowStudentPicker(false)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition shadow-2xs cursor-pointer active:scale-95"
                  >
                    <FaTimes className="text-slate-400 text-xs" />
                    <span>Close Dashboard</span>
                  </button>
                </div>
              );
            })()}

            {/* Split Pane Work Area */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT PANE: Student List & Search & Filters */}
              <div className="w-5/12 flex flex-col border-r border-slate-200 pr-3.5 pl-5 pt-4 pb-3 overflow-hidden bg-slate-50/40">
                {/* Search Bar */}
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <FaSearch className="text-xs" />
                  </div>
                  <input
                    type="text"
                    value={pickerSearchQuery}
                    onChange={(e) => setPickerSearchQuery(e.target.value)}
                    placeholder="Search name, reg no, email, phone..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 shadow-2xs transition"
                  />
                  {pickerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPickerSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>

                {/* Quick Filters */}
                <div className="grid grid-cols-3 gap-1.5 mt-2.5 bg-slate-200/70 p-1 rounded-xl text-xs font-bold text-slate-600">
                  <button
                    type="button"
                    onClick={() => setPickerFilter("all")}
                    className={`py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      pickerFilter === "all" ? "bg-white text-purple-900 shadow-xs font-black" : "hover:text-slate-900"
                    }`}
                  >
                    <span>All</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${pickerFilter === "all" ? "bg-purple-100 text-purple-900 font-black" : "bg-slate-300 text-slate-700"}`}>
                      {pickerCounts.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickerFilter("due")}
                    className={`py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      pickerFilter === "due" ? "bg-white text-rose-700 shadow-xs font-black" : "hover:text-rose-700"
                    }`}
                  >
                    <span>Due Fees</span>
                    {pickerCounts.due > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${pickerFilter === "due" ? "bg-rose-100 text-rose-800" : "bg-rose-200 text-rose-800"}`}>
                        {pickerCounts.due}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPickerFilter("absent")}
                    className={`py-1.5 px-1 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
                      pickerFilter === "absent" ? "bg-white text-amber-700 shadow-xs font-black" : "hover:text-amber-700"
                    }`}
                  >
                    <span>Abs. &gt;2</span>
                    {pickerCounts.absent > 0 && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${pickerFilter === "absent" ? "bg-amber-100 text-amber-900" : "bg-amber-200 text-amber-900"}`}>
                        {pickerCounts.absent}
                      </span>
                    )}
                  </button>
                </div>

                {/* Student Scroll List */}
                {isLoadingGradeStudents ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-xs font-semibold text-slate-500">
                    <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Loading grade directory...</span>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto space-y-3.5 mt-3 pr-1 custom-scrollbar">
                    {/* Section 1: Enrolled Students */}
                    <div>
                      {(() => {
                        const enrolledList = filteredPickerStudents.filter(s => s.isEnrolled);
                        return (
                          <>
                            <div className="bg-gradient-to-r from-purple-100 via-indigo-50 to-purple-50 text-purple-950 font-black px-3.5 py-2 rounded-xl text-xs flex justify-between items-center mb-2 sticky top-0 z-10 border border-purple-200/80 shadow-2xs">
                              <span className="flex items-center gap-1.5">
                                <FaUserGraduate className="text-purple-700 text-[11px]" />
                                <span>Enrolled Students</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-purple-200 text-purple-950 font-black text-[10px]">
                                {enrolledList.length}
                              </span>
                            </div>
                            
                            <div className="space-y-1.5">
                              {enrolledList.length === 0 ? (
                                <p className="text-xs text-slate-400 italic pl-3 py-1">No enrolled students match current filter.</p>
                              ) : (
                                enrolledList.map((student) => {
                                  const isSelected = selectedStudentDetail?._id === student._id;
                                  return (
                                    <div
                                      key={student._id}
                                      onClick={() => setSelectedStudentDetail(student)}
                                      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition cursor-pointer select-none ${
                                        isSelected
                                          ? "bg-gradient-to-r from-purple-50/90 via-white to-purple-50/50 border-2 border-purple-500 shadow-xs ring-2 ring-purple-100"
                                          : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                      }`}
                                    >
                                      {user?.role === 'admin' && (
                                        <div className="flex items-center pl-0.5" onClick={(e) => e.stopPropagation()}>
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
                                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                          />
                                        </div>
                                      )}

                                      {/* Student Initial Avatar Bubble */}
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                                        isSelected
                                          ? "bg-gradient-to-tr from-purple-700 to-indigo-700 text-white"
                                          : "bg-purple-100 text-purple-900 border border-purple-200"
                                      }`}>
                                        {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <p className="font-extrabold text-slate-900 text-xs truncate leading-tight">{student.name}</p>
                                          {isSelected && <FaArrowRight className="text-[10px] text-purple-600 shrink-0" />}
                                        </div>
                                        <p className="text-[10.5px] text-slate-500 font-mono font-medium truncate mt-0.5">
                                          Reg: {student.registrationNumber || 'N/A'}
                                        </p>
                                        
                                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                          <span className="px-1.5 py-0.2 rounded-md bg-purple-100 text-purple-900 border border-purple-200 font-black text-[9px] uppercase tracking-tight">
                                            Enrolled
                                          </span>
                                          <span className={`px-1.5 py-0.2 rounded-md font-black text-[9px] uppercase tracking-tight border ${
                                            student.payment?.status === "Due" 
                                              ? "bg-rose-50 text-rose-700 border-rose-200" 
                                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          }`}>
                                            {student.payment?.status || "Paid"}
                                          </span>
                                          {student.attendance?.isChronicallyAbsent && (
                                            <span className="px-1.5 py-0.2 rounded-md bg-rose-600 text-white font-black text-[9px] uppercase tracking-tight animate-pulse shadow-2xs">
                                              Abs &gt;2 Days
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Section 2: Available Students (Not Enrolled) */}
                    <div>
                      {(() => {
                        const availableList = filteredPickerStudents.filter(s => !s.isEnrolled);
                        return (
                          <>
                            <div className="bg-gradient-to-r from-slate-100 via-gray-50 to-slate-100 text-slate-800 font-black px-3.5 py-2 rounded-xl text-xs flex justify-between items-center mb-2 sticky top-0 z-10 border border-slate-200/90 shadow-2xs">
                              <span className="flex items-center gap-1.5">
                                <FaUsers className="text-slate-600 text-[11px]" />
                                <span>Available Students</span>
                              </span>
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px]">
                                {availableList.length}
                              </span>
                            </div>

                            <div className="space-y-1.5">
                              {availableList.length === 0 ? (
                                <p className="text-xs text-slate-400 italic pl-3 py-1">No unenrolled students available.</p>
                              ) : (
                                availableList.map((student) => {
                                  const isSelected = selectedStudentDetail?._id === student._id;
                                  return (
                                    <div
                                      key={student._id}
                                      onClick={() => setSelectedStudentDetail(student)}
                                      className={`flex items-center gap-2.5 p-2.5 rounded-2xl border transition cursor-pointer select-none ${
                                        isSelected
                                          ? "bg-gradient-to-r from-purple-50/90 via-white to-purple-50/50 border-2 border-purple-500 shadow-xs ring-2 ring-purple-100"
                                          : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                                      }`}
                                    >
                                      {user?.role === 'admin' && (
                                        <div className="flex items-center pl-0.5" onClick={(e) => e.stopPropagation()}>
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
                                            className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                                          />
                                        </div>
                                      )}

                                      {/* Student Initial Avatar Bubble */}
                                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-2xs ${
                                        isSelected
                                          ? "bg-gradient-to-tr from-purple-700 to-indigo-700 text-white"
                                          : "bg-slate-100 text-slate-700 border border-slate-200"
                                      }`}>
                                        {student.name ? student.name.charAt(0).toUpperCase() : 'S'}
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1">
                                          <p className="font-extrabold text-slate-900 text-xs truncate leading-tight">{student.name}</p>
                                          {isSelected && <FaArrowRight className="text-[10px] text-purple-600 shrink-0" />}
                                        </div>
                                        <p className="text-[10.5px] text-slate-500 font-mono font-medium truncate mt-0.5">
                                          Reg: {student.registrationNumber || 'N/A'}
                                        </p>
                                        
                                        <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                          <span className="px-1.5 py-0.2 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[9px] uppercase tracking-tight">
                                            Not Enrolled
                                          </span>
                                          <span className={`px-1.5 py-0.2 rounded-md font-black text-[9px] uppercase tracking-tight border ${
                                            student.payment?.status === "Due" 
                                              ? "bg-rose-50 text-rose-700 border-rose-200" 
                                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                                          }`}>
                                            {student.payment?.status || "Paid"}
                                          </span>
                                          {student.attendance?.isChronicallyAbsent && (
                                            <span className="px-1.5 py-0.2 rounded-md bg-rose-600 text-white font-black text-[9px] uppercase tracking-tight animate-pulse shadow-2xs">
                                              Abs &gt;2 Days
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {/* Batch Action Buttons Panel (Admin only) */}
                {user?.role === 'admin' && (
                  <div className="pt-3 border-t border-slate-200 flex flex-col gap-2 mt-auto">
                    <div className="flex justify-between items-center text-xs text-slate-600 font-bold px-1">
                      <span>{selectedStudentIds.length} Selected for Batch</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds(gradeStudents.map((s) => s._id))}
                          className="text-purple-700 hover:text-purple-900 hover:underline cursor-pointer font-bold"
                        >
                          Select All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="text-slate-500 hover:text-slate-800 hover:underline cursor-pointer font-bold"
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
                        className="rounded-xl bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-700 hover:to-green-800 py-2.5 text-xs font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <FaUserPlus className="text-xs" />
                        <span>{isUpdatingGradeStudents ? 'Enrolling...' : 'Batch Enroll'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleBatchRemove}
                        disabled={isUpdatingGradeStudents || selectedStudentIds.length === 0}
                        className="rounded-xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-700 hover:to-red-800 py-2.5 text-xs font-black text-white transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                      >
                        <FaUserMinus className="text-xs" />
                        <span>{isUpdatingGradeStudents ? 'Removing...' : 'Batch Remove'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANE: Selected Student Detailed Overview */}
              <div className="w-7/12 flex flex-col pl-5 pr-6 pt-4 pb-4 overflow-hidden bg-white">
                {!selectedStudentDetail ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/70 rounded-3xl border-2 border-dashed border-slate-200">
                    <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-2xl mb-3 shadow-xs">
                      <FaUserGraduate />
                    </div>
                    <h4 className="font-extrabold text-slate-800 text-base">No Student Selected</h4>
                    <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                      Select any student card from the left directory to inspect their real-time attendance history and fee ledger.
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header Detail Card */}
                    <div className="bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-slate-50 border border-purple-200/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-xs">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-13 h-13 bg-gradient-to-tr from-purple-700 via-indigo-700 to-purple-800 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-md border-2 border-white ring-2 ring-purple-200 shrink-0">
                          {selectedStudentDetail.name ? selectedStudentDetail.name.charAt(0).toUpperCase() : 'S'}
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-black text-slate-900 text-base leading-tight truncate">
                              {selectedStudentDetail.name}
                            </h4>
                            <span className="font-mono bg-purple-100 text-purple-900 px-2 py-0.5 rounded-md text-[11px] font-bold border border-purple-200">
                              {selectedStudentDetail.registrationNumber || 'No Reg ID'}
                            </span>
                          </div>
                          
                          <p className="text-xs text-slate-500 font-medium truncate flex items-center gap-1.5">
                            <FaEnvelope className="text-[10px] text-slate-400" />
                            <span>{selectedStudentDetail.email || 'No email registered'}</span>
                          </p>

                          {selectedStudentDetail.parentsPhoneNumber && (
                            <p className="text-xs text-purple-700 font-bold flex items-center gap-1.5 pt-0.5">
                              <FaPhoneAlt className="text-[10px] text-purple-600" />
                              <span>Parent Contact:</span>
                              <a href={`tel:${selectedStudentDetail.parentsPhoneNumber}`} className="hover:underline text-purple-900 font-mono font-extrabold">
                                {selectedStudentDetail.parentsPhoneNumber}
                              </a>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Enrolling Action Button (Admin only) */}
                      {user?.role === 'admin' && (
                        <div className="shrink-0">
                          {selectedStudentDetail.isEnrolled ? (
                            <button
                              type="button"
                              onClick={() => handleSingleStudentEnrollRemove('remove', selectedStudentDetail._id)}
                              disabled={isUpdatingGradeStudents}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 text-xs font-black px-4 py-2.5 rounded-xl transition shadow-2xs cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                              <FaUserMinus className="text-xs" />
                              <span>{isUpdatingGradeStudents ? 'Updating...' : 'Remove from Class'}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSingleStudentEnrollRemove('enroll', selectedStudentDetail._id)}
                              disabled={isUpdatingGradeStudents}
                              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white text-xs font-black px-4.5 py-2.5 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                              <FaUserPlus className="text-xs" />
                              <span>{isUpdatingGradeStudents ? 'Updating...' : 'Enroll in Class'}</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex border-b border-slate-200 mt-4 text-xs font-bold tracking-wider text-slate-500">
                      <button
                        type="button"
                        onClick={() => setStudentDetailTab("attendance")}
                        className={`flex-1 pb-3 text-center border-b-2 transition flex items-center justify-center gap-2 cursor-pointer ${
                          studentDetailTab === "attendance" 
                            ? "border-purple-600 text-purple-950 font-black" 
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <FaCalendarAlt className="text-sm" />
                        <span>Attendance History</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                          studentDetailTab === "attendance" ? "bg-purple-100 text-purple-900" : "bg-slate-100 text-slate-600"
                        }`}>
                          {selectedStudentDetail.attendance?.history?.length || 0}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setStudentDetailTab("payments")}
                        className={`flex-1 pb-3 text-center border-b-2 transition flex items-center justify-center gap-2 cursor-pointer ${
                          studentDetailTab === "payments" 
                            ? "border-purple-600 text-purple-950 font-black" 
                            : "border-transparent text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <FaMoneyBillWave className="text-sm" />
                        <span>Payment Ledger</span>
                        <span className={`px-2 py-0.2 rounded-full text-[10px] font-black ${
                          selectedStudentDetail.payment?.status === "Due" 
                            ? "bg-rose-100 text-rose-800" 
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {selectedStudentDetail.payment?.status || 'Paid'}
                        </span>
                      </button>
                    </div>

                    {/* Tab Panels */}
                    <div className="flex-1 overflow-y-auto mt-3 pr-1 custom-scrollbar">
                      
                      {/* Tab 1: ATTENDANCE HISTORY VIEW */}
                      {studentDetailTab === "attendance" && (
                        <div className="space-y-3.5">
                          {/* Alert Notice for high absences */}
                          {selectedStudentDetail.attendance?.isChronicallyAbsent && (
                            <div className="bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border border-rose-200 rounded-2xl p-3.5 flex items-center gap-3 text-rose-900 text-xs animate-pulse shadow-2xs">
                              <FaExclamationTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                              <div>
                                <p className="font-black text-rose-950">Absenteeism Notice</p>
                                <p className="mt-0.5 font-medium text-rose-800">
                                  This student was absent for {selectedStudentDetail.attendance.consecutiveAbsences} consecutive class sessions in this course.
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Quick Stats Strip */}
                          {(() => {
                            const present = selectedStudentDetail.attendance?.totalPresent || 0;
                            const absent = selectedStudentDetail.attendance?.totalAbsent || 0;
                            const total = present + absent;
                            const rate = total > 0 ? Math.round((present / total) * 100) : 100;

                            return (
                              <div className="grid grid-cols-3 gap-3">
                                <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-50 border border-emerald-200/90 rounded-2xl p-3 text-center shadow-2xs">
                                  <p className="text-[10px] text-emerald-800 font-black uppercase tracking-wider">Attended</p>
                                  <p className="text-2xl font-black text-emerald-950 mt-0.5">{present}</p>
                                  <span className="text-[10px] text-emerald-700 font-semibold">Sessions</span>
                                </div>

                                <div className="bg-gradient-to-br from-rose-50 via-red-50 to-rose-50 border border-rose-200/90 rounded-2xl p-3 text-center shadow-2xs">
                                  <p className="text-[10px] text-rose-800 font-black uppercase tracking-wider">Absent</p>
                                  <p className="text-2xl font-black text-rose-950 mt-0.5">{absent}</p>
                                  <span className="text-[10px] text-rose-700 font-semibold">Sessions</span>
                                </div>

                                <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50 border border-indigo-200/90 rounded-2xl p-3 text-center shadow-2xs">
                                  <p className="text-[10px] text-indigo-800 font-black uppercase tracking-wider">Attendance Rate</p>
                                  <p className="text-2xl font-black text-indigo-950 mt-0.5">{rate}%</p>
                                  <span className="text-[10px] text-indigo-700 font-semibold">Participation</span>
                                </div>
                              </div>
                            );
                          })()}

                          {/* History Table */}
                          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                              <thead className="bg-slate-50 font-black uppercase tracking-wider text-slate-500 border-b border-slate-200">
                                <tr>
                                  <th className="px-4 py-3">Session Date</th>
                                  <th className="px-4 py-3 text-right">Attendance Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-150 text-slate-800 bg-white">
                                {!selectedStudentDetail.attendance?.history || selectedStudentDetail.attendance.history.length === 0 ? (
                                  <tr>
                                    <td colSpan="2" className="py-8 px-4 text-center text-slate-400 font-medium italic">
                                      No attendance records logged for this student yet.
                                    </td>
                                  </tr>
                                ) : (
                                  selectedStudentDetail.attendance.history.map((record, index) => (
                                    <tr key={index} className="hover:bg-purple-50/30 transition-colors">
                                      <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                                        <FaCalendarAlt className="text-slate-400 text-xs" />
                                        <span>{new Date(record.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                      </td>
                                      <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-black uppercase text-[10px] shadow-2xs ${
                                          record.status === 'Present' 
                                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                                            : 'bg-rose-100 text-rose-900 border border-rose-300'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${record.status === 'Present' ? 'bg-emerald-600' : 'bg-rose-600'}`}></span>
                                          <span>{record.status}</span>
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
                        <div className="space-y-3.5">
                          {/* Alert Notice for overdue bills */}
                          {selectedStudentDetail.payment?.status === "Due" ? (
                            <div className="bg-gradient-to-r from-rose-50 via-red-50 to-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-rose-900 text-xs shadow-2xs">
                              <div className="flex items-center gap-3">
                                <FaExclamationTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                                <div>
                                  <p className="font-black text-rose-950 text-sm">Tuition Fees Pending</p>
                                  <p className="mt-0.5 font-bold text-rose-800">
                                    Outstanding amount: LKR {Number(selectedStudentDetail.payment.amountDue || 2500).toLocaleString()}.00
                                  </p>
                                </div>
                              </div>
                              <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-black text-xs uppercase tracking-tight shadow-sm shrink-0">
                                Overdue
                              </span>
                            </div>
                          ) : (
                            <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 text-emerald-900 text-xs shadow-2xs">
                              <div className="flex items-center gap-3">
                                <FaCheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                                <div>
                                  <p className="font-black text-emerald-950 text-sm">Account in Good Standing</p>
                                  <p className="mt-0.5 font-medium text-emerald-800">
                                    Course tuition fee is fully settled. Student has full active class access.
                                  </p>
                                </div>
                              </div>
                              <span className="px-3 py-1 rounded-full bg-emerald-600 text-white font-black text-xs uppercase tracking-tight shadow-sm shrink-0">
                                Fully Paid
                              </span>
                            </div>
                          )}

                          {/* Payment Ledger */}
                          <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                              <h5 className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                <FaReceipt className="text-purple-600 text-xs" />
                                <span>Transaction History Log</span>
                              </h5>
                              <span className="text-[10px] font-mono font-extrabold text-slate-400 uppercase tracking-widest">
                                Live Office Ledger
                              </span>
                            </div>
                            <div className="divide-y divide-slate-150 text-xs bg-white">
                              {!selectedStudentDetail.payment?.history || selectedStudentDetail.payment.history.length === 0 ? (
                                <div className="py-8 px-4 text-center text-slate-400 font-medium italic">
                                  No transaction receipts logged for this student yet.
                                </div>
                              ) : (
                                selectedStudentDetail.payment.history.map((invoice, index) => (
                                  <div key={index} className="p-3.5 flex justify-between items-center hover:bg-purple-50/30 transition">
                                    <div>
                                      <p className="font-black text-slate-900 text-sm">
                                        LKR {Number(invoice.amount).toLocaleString()}.00 • <span className="font-semibold text-slate-700">{invoice.courseTitle}</span>
                                      </p>
                                      <p className="text-[11px] text-purple-700 font-mono font-bold mt-0.5">
                                        Receipt: {invoice.transactionId} • Method: {invoice.paymentMethod}
                                      </p>
                                    </div>
                                    <div className="text-right space-y-1">
                                      <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-200 text-[10px] font-black uppercase">
                                        {invoice.status || 'Completed'}
                                      </span>
                                      <p className="text-slate-500 font-bold text-[11px]">{invoice.date}</p>
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

      {/* Grade Deactivation / Activation Confirmation Modal */}
      {deactivateConfirmGrade && (
        <div className="fixed inset-0 z-55 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-purple-100 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shrink-0 shadow-md ${
                deactivateConfirmGrade.isDeactive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
              }`}>
                {deactivateConfirmGrade.isDeactive ? <FaLockOpen /> : <FaLock />}
              </div>
              <div>
                <h3 className="text-base font-black text-gray-900">
                  Confirm {deactivateConfirmGrade.isDeactive ? 'Activation' : 'Deactivation'}
                </h3>
                <p className="text-xs text-gray-500 font-medium mt-0.5">
                  Grade Stream: <span className="font-extrabold text-purple-900">{deactivateConfirmGrade.title || deactivateConfirmGrade.gradeNumber}</span>
                </p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 text-xs font-semibold text-gray-700 leading-relaxed">
              {deactivateConfirmGrade.isDeactive ? (
                <span>Are you sure you want to <strong className="text-emerald-700">activate</strong> this grade stream? Students and teachers will be able to access all lessons and workspace announcements.</span>
              ) : (
                <span>Are you sure you want to <strong className="text-red-600">deactivate</strong> this grade stream? Deactivating will lock this grade stream and restrict access for non-admin users.</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeactivateConfirmGrade(null)}
                className="px-4 py-2.5 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition cursor-pointer"
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

      {/* Video Player Modal with Engine/Gear Quality Switcher */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-4xl bg-[#1e1b4b] rounded-3xl overflow-hidden shadow-2xl border border-purple-500/40 relative animate-in zoom-in-95 duration-200">
            <div className="p-4 bg-purple-950/90 flex justify-between items-center border-b border-purple-800/80 px-6">
              <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
                <span>🎬</span> {activeVideoModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="text-gray-300 hover:text-white bg-white/10 hover:bg-white/20 p-2 px-3.5 rounded-xl transition cursor-pointer text-xs font-bold"
              >
                ✕ Close Player
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <LiveStreamPlayer
                liveStream={{
                  isLive: true,
                  title: activeVideoModal.title,
                  youtubeUrl: activeVideoModal.youtubeUrl || activeVideoModal.url
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Add Grade Modal */}
      {showAddGrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900">Add Grade Assignment</h3>
                <p className="text-xs text-gray-500">Select a grade or combination to access this course.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddGrade(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddGrade} className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="text-xs font-bold text-gray-700">Assignment Mode</label>
                <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
                  <button
                    type="button"
                    onClick={() => { setGradeMode('single'); setCombinationGrades([]); setCustomGradeInput(''); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${gradeMode === 'single' ? 'bg-[#2d1b64] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    Single Grade
                  </button>
                  <button
                    type="button"
                    onClick={() => { setGradeMode('combination'); setNewGradeNumber(''); }}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${gradeMode === 'combination' ? 'bg-[#2d1b64] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    Combination Grade
                  </button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Grade Title</label>
                  <input
                    value={newGradeTitle}
                    onChange={(e) => setNewGradeTitle(e.target.value)}
                    placeholder="e.g. Grade 8 or Theory Class"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    required
                  />
                </div>

                {gradeMode === 'single' ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Select Grade</label>
                    <select
                      value={newGradeNumber}
                      onChange={(e) => setNewGradeNumber(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
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
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Custom Combination Name</label>
                    <input
                      value={customGradeInput}
                      onChange={(e) => setCustomGradeInput(e.target.value)}
                      placeholder="e.g. Grade 10 & 11"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    />
                  </div>
                )}
              </div>

              {gradeMode === 'combination' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Select Grades to Combine</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-36 overflow-y-auto">
                    {allGrades.map((g) => {
                      const isChecked = combinationGrades.includes(g);
                      return (
                        <label key={g} className={`flex items-center gap-2 p-1.5 rounded-lg text-xs font-medium cursor-pointer transition ${isChecked ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'hover:bg-gray-100 text-gray-700'}`}>
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
                    <p className="mt-1.5 text-xs text-purple-700 font-semibold">
                      Combined Result: <span className="underline">{combinationGrades.join(' & ')}</span>
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddGrade(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2d1b64] px-5 py-2 text-sm font-semibold text-white hover:bg-purple-900 transition shadow-xs cursor-pointer"
                >
                  Save Grade Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Stream Setup & Management Modal with Scheduling and 16:9 Thumbnail Cropper */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b pb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#FF0000] to-[#CC0000] text-white flex items-center justify-center shadow-md shadow-red-500/20 shrink-0">
                  <FaYoutube className="text-2xl" />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-gray-900">
                    {currentLesson?.liveStream?.isLive 
                      ? 'Manage Active Live Class' 
                      : currentLesson?.liveStream?.isScheduled 
                      ? 'Manage Scheduled Live Stream' 
                      : 'Live Class Broadcast Setup'}
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Grade: {selectedGrade} • {course?.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLiveModal(false)}
                className="rounded-xl p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Mode Tabs: Go Live Now vs Schedule for Later */}
            <div className="grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80 shadow-inner gap-1">
              <button
                type="button"
                onClick={() => setIsScheduledLive(false)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
                  !isScheduledLive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 ring-1 ring-red-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {!isScheduledLive ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                )}
                <span>Go Live Immediately</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScheduledLive(true)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2.5 transition-all duration-200 cursor-pointer ${
                  isScheduledLive
                    ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white shadow-md shadow-purple-600/25 ring-1 ring-purple-400'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <FaCalendarAlt className={`text-sm ${isScheduledLive ? 'text-purple-200' : 'text-purple-600'}`} />
                <span>Schedule for Later</span>
              </button>
            </div>

            <form onSubmit={handleStartLiveStream} className="space-y-4">
              {/* Stream Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Live Class Title (Optional)</label>
                <input
                  type="text"
                  value={liveStreamTitle}
                  onChange={(e) => setLiveStreamTitle(e.target.value)}
                  placeholder="e.g. Unit 4 Live Revision Class"
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-medium"
                />
              </div>

              {/* YouTube Link / ID */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center justify-between">
                  <span>YouTube Live Stream Link or Video ID <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-red-600 font-extrabold uppercase">Required</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={liveYoutubeUrl}
                    onChange={(e) => setLiveYoutubeUrl(e.target.value)}
                    placeholder="e.g. https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="w-full rounded-2xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 font-medium"
                    required
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-red-600">
                    <FaYoutube className="text-lg" />
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
                  💡 Tip: Set your YouTube Live Stream to <strong>Unlisted</strong> on YouTube Studio so only enrolled students inside LuminaLearn can access it.
                </p>
              </div>

              {/* Date & Time Pickers when Scheduling is Active */}
              {isScheduledLive && (
                <div className="p-4 bg-purple-50/70 border border-purple-100 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                    <FaCalendarCheck className="text-purple-600" />
                    <span>Select Scheduled Broadcast Date & Time</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Broadcast Date</label>
                      <input
                        type="date"
                        min={new Date().toISOString().split('T')[0]}
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-purple-500"
                        required={isScheduledLive}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Broadcast Time</label>
                      <input
                        type="time"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-purple-500"
                        required={isScheduledLive}
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-purple-800/90 font-medium">
                    ⏱️ <strong>15-Minute Pre-Live Feature:</strong> The player unlocks automatically 15 minutes before this time with a countdown ticker, letting students test their audio & video.
                  </p>
                </div>
              )}

              {/* 16:9 Custom Thumbnail Picture Uploader with Cropper */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                  <span>Custom Thumbnail Picture (16:9)</span>
                  <span className="text-[11px] text-gray-400 font-semibold">Custom Image Cropper Enabled</span>
                </label>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={thumbnailInputRef}
                  accept="image/*"
                  onChange={handleSelectThumbnailFile}
                  className="hidden"
                />

                {liveThumbnail ? (
                  <div className="relative aspect-video rounded-2xl overflow-hidden border border-gray-200 shadow-md group">
                    <img
                      src={liveThumbnail.startsWith('http') || liveThumbnail.startsWith('data:')
                        ? liveThumbnail
                        : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '')}${liveThumbnail.startsWith('/') ? '' : '/'}${liveThumbnail}`}
                      alt="Thumbnail Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-2xs">
                      <button
                        type="button"
                        onClick={() => thumbnailInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white text-gray-900 rounded-xl text-xs font-bold shadow-md hover:bg-gray-100 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FaImage className="text-xs" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCropperRawImage(liveThumbnail);
                          setIsThumbnailCropperOpen(true);
                        }}
                        className="px-3 py-1.5 bg-purple-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-purple-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FaCrop className="text-xs" />
                        <span>Re-Crop</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setLiveThumbnail('')}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-red-700 flex items-center gap-1.5 cursor-pointer"
                      >
                        <FaTrashAlt className="text-xs" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="aspect-video rounded-2xl border-2 border-dashed border-gray-300 hover:border-red-500 bg-gray-50/80 hover:bg-red-50/20 transition-all flex flex-col items-center justify-center p-4 text-center cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl mb-2 group-hover:scale-110 transition-transform">
                      <FaImage />
                    </div>
                    <span className="text-xs font-bold text-gray-800">Click to Upload Thumbnail</span>
                    <span className="text-[11px] text-gray-400 mt-0.5">Interactive 16:9 crop tool will open automatically</span>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 gap-2">
                {(currentLesson?.liveStream?.isLive || currentLesson?.liveStream?.isScheduled) ? (
                  <button
                    type="button"
                    onClick={() => handleEndLiveStream(saveLiveAsVideo)}
                    className="px-4 py-2.5 bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs rounded-2xl transition shadow-md shadow-red-950/20 hover:shadow-red-900/40 cursor-pointer flex items-center gap-2 active:scale-95 transform duration-200"
                  >
                    <FaTimes className="text-xs" />
                    <span>{currentLesson?.liveStream?.isScheduled ? 'Cancel Scheduled Stream' : 'End Live Class'}</span>
                  </button>
                ) : (
                  <div></div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLiveModal(false)}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPublishingLive}
                    className={`px-5 py-2.5 rounded-2xl ${
                      isScheduledLive
                        ? 'bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 hover:from-purple-800 hover:to-indigo-800 shadow-purple-600/30'
                        : 'bg-gradient-to-r from-[#FF0000] via-[#E60000] to-[#CC0000] hover:from-[#E60000] hover:to-[#B30000] shadow-red-600/30'
                    } text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 transform hover:-translate-y-0.5 active:scale-95`}
                  >
                    {isScheduledLive ? <FaCalendarAlt className="text-sm" /> : <FaYoutube className="text-xl text-white" />}
                    <span>
                      {isPublishingLive 
                        ? 'Saving...' 
                        : isScheduledLive 
                        ? (currentLesson?.liveStream?.isScheduled ? 'Update Scheduled Stream' : 'Schedule Live Class')
                        : (currentLesson?.liveStream?.isLive ? 'Update Live Stream' : 'Publish Live Class')}
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 16:9 Live Stream Thumbnail Cropper Modal */}
      <LiveThumbnailCropperModal
        isOpen={isThumbnailCropperOpen}
        imageSrc={cropperRawImage}
        onClose={() => setIsThumbnailCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />

      {/* INTERACTIVE END LIVE STREAM CONFIRMATION MODAL */}
      {showEndStreamConfirmModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
          onClick={() => {
            setIsEndingStream(false);
            setShowEndStreamConfirmModal(false);
          }}
        >
          <div 
            className="relative w-full max-w-md bg-white rounded-3xl border border-gray-200 p-6 text-gray-900 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 text-2xl shadow-sm shrink-0">
                <span className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600"></span>
                </span>
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">End Live Class?</h3>
                <p className="text-xs text-gray-500 font-medium">Broadcast Termination Confirmation</p>
              </div>
            </div>

            {/* Info Message Box */}
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80 space-y-2 text-xs text-gray-700">
              <p className="font-bold text-amber-800 flex items-center gap-1.5">
                <span>⚠️</span> This will conclude the session for all attendees.
              </p>
              <p className="text-gray-600 leading-relaxed">
                Students currently watching <strong>"{currentLesson?.liveStream?.title || 'Live Stream'}"</strong> will be notified that the live lecture has ended.
              </p>
            </div>

            {/* Save as video lesson option */}
            <label className="flex items-center gap-3 bg-purple-50/70 p-3.5 rounded-2xl border border-purple-200/80 cursor-pointer hover:bg-purple-100/50 transition">
              <input
                type="checkbox"
                checked={saveLiveAsVideo}
                onChange={(e) => setSaveLiveAsVideo(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-purple-300 cursor-pointer"
              />
              <span className="text-xs font-bold text-purple-950">
                Save recording as Lesson Video for student replay
              </span>
            </label>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEndingStream(false);
                  setShowEndStreamConfirmModal(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900 text-xs font-bold transition cursor-pointer border border-gray-200 active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isEndingStream}
                onClick={() => confirmEndLiveStream(saveLiveAsVideo)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-red-600/25 border border-red-500 transition flex items-center gap-2 cursor-pointer disabled:opacity-60 active:scale-95"
              >
                {isEndingStream ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Ending Stream...</span>
                  </>
                ) : (
                  <>
                    <FaTimes className="text-xs" />
                    <span>Yes, End Live Stream</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;