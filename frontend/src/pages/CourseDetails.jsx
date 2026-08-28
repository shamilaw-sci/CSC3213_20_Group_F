import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import CourseEnrollmentModal from '../components/CourseEnrollmentModal';
import TeacherModal from '../components/TeacherModal';
import PdfReaderModal from '../components/PdfReaderModal';
import VideoPlayerModal from '../components/VideoPlayerModal';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import ScheduledLiveHero from '../components/ScheduledLiveHero';
import LiveThumbnailCropperModal from '../components/LiveThumbnailCropperModal';
import {
  FaChalkboardTeacher, FaBookOpen, FaLock, FaLockOpen, FaVideo, FaYoutube,
  FaCalendarAlt, FaChevronDown, FaChevronUp, FaClock, FaMapMarkerAlt,
  FaClipboardCheck, FaFileUpload, FaCloudDownloadAlt, FaCheckDouble,
  FaExclamationTriangle, FaCommentDots, FaEdit, FaTrashAlt, FaStar,
  FaAward, FaEye, FaSave, FaTimes, FaPlus, FaCheck, FaCheckCircle, FaTimesCircle, FaPaperPlane,
  FaDownload, FaHourglassHalf, FaCog, FaPlayCircle, FaPlay, FaBroadcastTower,
  FaCalendarCheck, FaCrop, FaImage, FaTrash
} from 'react-icons/fa';
import { getMediaUrl } from '../utils/mediaUrl';
import { downloadProtectedFile } from '../utils/fileApi';

const getYouTubeVideoId = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|live\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
};

const getYouTubeThumbnail = (url) => {
  const videoId = getYouTubeVideoId(url);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
};

const getImageUrl = (url) => getMediaUrl(url);

const CourseDetails = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTeacherForModal, setSelectedTeacherForModal] = useState(null);
  const [pdfProgressMap, setPdfProgressMap] = useState({});
  const [activePdfModal, setActivePdfModal] = useState(null);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const user = JSON.parse(localStorage.getItem('user'));

  // Course Review & Teacher Rating States
  const [courseReviews, setCourseReviews] = useState([]);
  const [avgRating, setAvgRating] = useState('0.0');
  const [totalReviews, setTotalReviews] = useState(0);
  const [ratingBreakdown, setRatingBreakdown] = useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [myReview, setMyReview] = useState(null);
  const [ratingInput, setRatingInput] = useState(5);
  const [hoverRatingInput, setHoverRatingInput] = useState(0);
  const [reviewInputText, setReviewInputText] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Assignment Modal & Action States
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [asgnFormData, setAsgnFormData] = useState({
    title: '',
    description: '',
    month: '',
    weekNumber: 0,
    maxMarks: 100,
    passingMarks: 50,
    dueDate: '',
    allowLateSubmissions: true,
    isActive: true,
    attachmentFile: null
  });
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // Student Submission Modal States
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedAssignmentForSubmit, setSelectedAssignmentForSubmit] = useState(null);
  const [solutionFile, setSolutionFile] = useState(null);
  const [studentNote, setStudentNote] = useState('');
  const [isSubmittingSolution, setIsSubmittingSolution] = useState(false);

  // Student Feedback Modal States
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedSubmissionForFeedback, setSelectedSubmissionForFeedback] = useState(null);

  // Teacher Submissions Drawer / Modal States
  const [showTeacherSubmissionsDrawer, setShowTeacherSubmissionsDrawer] = useState(false);
  const [selectedAssignmentForTeacherSubmissions, setSelectedAssignmentForTeacherSubmissions] = useState(null);
  const [teacherSubmissionsData, setTeacherSubmissionsData] = useState({ submissions: [], totalSubmissions: 0, gradedCount: 0 });
  const [loadingTeacherSubmissions, setLoadingTeacherSubmissions] = useState(false);
  const [teacherSubmissionsFilter, setTeacherSubmissionsFilter] = useState('all');
  const [teacherSubmissionsSearch, setTeacherSubmissionsSearch] = useState('');
  const [gradingInputs, setGradingInputs] = useState({}); // { [subId]: { marks, feedback } }
  const [isSavingGradeMap, setIsSavingGradeMap] = useState({});

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
  const [newGradeFee, setNewGradeFee] = useState('');
  const [editGradeModal, setEditGradeModal] = useState(null); // { gradeId, gradeNumber, title, fee }
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
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const todayForNav = new Date();
  const currentMonthIndex = todayForNav.getMonth();   // 0-based
  const currentYear = todayForNav.getFullYear();

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

  // Expandable Workspace Sections State
  const [expandedSections, setExpandedSections] = useState({
    announcement: true,
    videos: true,
    pdfs: true,
    assignments: true,
    quizzes: true,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const expandAllSections = () => {
    setExpandedSections({
      announcement: true,
      videos: true,
      pdfs: true,
      assignments: true,
      quizzes: true,
    });
  };

  const collapseAllSections = () => {
    setExpandedSections({
      announcement: false,
      videos: false,
      pdfs: false,
      assignments: false,
      quizzes: false,
    });
  };

  // Creation Modals States (Teacher / Admin)
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [showAddVideoModal, setShowAddVideoModal] = useState(false);
  const [showAddPdfModal, setShowAddPdfModal] = useState(false);

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
      }).catch(() => { });
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
    fetchCourseDetails(true);
  }, [courseId]);

  // Real-time live status sync: automatically ends stream on student side when teacher concluding live class
  useEffect(() => {
    const activeLiveLesson = (lessons || []).find(l => l.liveStream?.isLive || l.liveStream?.isScheduled);
    if (!activeLiveLesson?._id) return;

    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/lessons/${activeLiveLesson._id}/live-stream/status`);
        if (res.data && typeof res.data.isLive === 'boolean') {
          if (activeLiveLesson.liveStream?.isLive !== res.data.isLive || activeLiveLesson.liveStream?.isScheduled !== res.data.isScheduled) {
            setLessons(prev => prev.map(l => {
              if (l._id === activeLiveLesson._id) {
                return {
                  ...l,
                  liveStream: {
                    ...(l.liveStream || {}),
                    isLive: res.data.isLive,
                    isScheduled: res.data.isScheduled
                  }
                };
              }
              return l;
            }));
          }
        }
      } catch (err) {}
    }, 4500);

    return () => clearInterval(interval);
  }, [lessons]);

  const fetchQuizzes = async () => {
    try {
      const res = await api.get(`/quizzes/course/${courseId}`);
      setQuizzes(res.data);
    } catch (err) {
      console.error("Error fetching quizzes:", err);
    }
  };

  const fetchAssignments = async () => {
    try {
      setLoadingAssignments(true);
      const res = await api.get(`/assignments/course/${courseId}`);
      setAssignments(res.data);
    } catch (err) {
      console.error("Error fetching assignments:", err);
    } finally {
      setLoadingAssignments(false);
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

  const fetchReviews = async () => {
    try {
      const res = await api.get(`/courses/${courseId}/reviews`);
      if (res.data) {
        setCourseReviews(res.data.reviews || []);
        setAvgRating(res.data.avgRating || '0.0');
        setTotalReviews(res.data.totalReviews || 0);
        setRatingBreakdown(res.data.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
      }
      const token = localStorage.getItem('token');
      if (token && user?.role === 'student') {
        const myRes = await api.get(`/courses/${courseId}/my-review`);
        if (myRes.data?.review) {
          setMyReview(myRes.data.review);
          setRatingInput(myRes.data.review.rating || 5);
          setReviewInputText(myRes.data.review.review || '');
        }
      }
    } catch (err) {
      console.error("Error fetching course reviews", err);
    }
  };

  const handleSubmitCourseReview = async (e) => {
    e.preventDefault();
    if (!ratingInput) {
      toast.error("Please choose a star rating (1 to 5)");
      return;
    }
    setIsSubmittingReview(true);
    try {
      const res = await api.post(`/courses/${courseId}/reviews`, {
        rating: Number(ratingInput),
        review: reviewInputText.trim()
      });
      toast.success(res.data.message || "Review submitted successfully!");
      await fetchReviews();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const fetchCourseDetails = async (isInitial = false) => {
    const cacheKey = `cached_course_${courseId}`;
    if (isInitial) {
      try {
        const cachedStr = sessionStorage.getItem(cacheKey);
        if (cachedStr) {
          const parsed = JSON.parse(cachedStr);
          if (parsed?.course && Array.isArray(parsed?.lessons)) {
            setCourse(parsed.course);
            setLessons(parsed.lessons || []);
            setQuizzes(parsed.quizzes || []);
            setAssignments(parsed.assignments || []);
            setLoading(false);
          }
        }
      } catch (e) {}
    }

    try {
      const [courseRes, lessonsRes, quizzesRes, assignmentsRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/lessons/course/${courseId}`),
        api.get(`/quizzes/course/${courseId}`).catch(err => { console.error("Error fetching quizzes:", err); return { data: [] }; }),
        api.get(`/assignments/course/${courseId}`).catch(err => { console.error("Error fetching assignments:", err); return { data: [] }; })
      ]);

      setCourse(courseRes.data);
      setLessons(lessonsRes.data || []);
      setQuizzes(quizzesRes.data || []);
      setAssignments(assignmentsRes.data || []);

      sessionStorage.setItem(cacheKey, JSON.stringify({
        course: courseRes.data,
        lessons: lessonsRes.data || [],
        quizzes: quizzesRes.data || [],
        assignments: assignmentsRes.data || []
      }));

      await fetchReviews();
    } catch (err) {
      if (!course) toast.error("Failed to fetch details.");
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
      const gradeFeeToSend = (newGradeFee !== '' && !isNaN(Number(newGradeFee)) && Number(newGradeFee) >= 0)
        ? Number(newGradeFee)
        : (course?.price || 2500);

      const res = await api.post('/lessons/add-grade', {
        grade: targetGradeNumber,
        title: newGradeTitle,
        fee: gradeFeeToSend,
        courseId
      });
      toast.success(res.data.message || `Grade "${targetGradeNumber}" added successfully.`);
      const isCourseDeactive = course?.status === 'deactive' || course?.isActive === false;
      const newGradeEntry = res.data.newGradeEntry || {
        gradeNumber: targetGradeNumber,
        title: newGradeTitle.trim(),
        fee: gradeFeeToSend,
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
      setNewGradeFee('');
      setShowAddGrade(false);
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add grade.');
    }
  };

  const handleUpdateGradeDetails = async (e) => {
    e.preventDefault();
    if (!editGradeModal) return;
    try {
      const res = await api.put(`/courses/${courseId}/grades/${editGradeModal.gradeId || editGradeModal.gradeNumber}/details`, {
        fee: Number(editGradeModal.fee),
        title: editGradeModal.title
      });
      toast.success(res.data.message || 'Grade details updated successfully!');
      setEditGradeModal(null);
      await fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update grade details.');
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
      toast.success("Announcement updated successfully!");
      setShowAnnouncementModal(false);
      fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to update announcement.");
    }
  };

  const handleAddVideo = async (e) => {
    e.preventDefault();
    if (!videoUrl.trim()) {
      toast.error("Please provide a valid video link.");
      return;
    }
    const currentLesson = lessons.find(l => l.grade === selectedGrade);
    if (!currentLesson) return;
    const newVideoItem = {
      title: videoTitle.trim() || 'Video Lecture',
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
      toast.success("Video lesson added successfully!");
      setVideoTitle("");
      setVideoUrl("");
      setVideoDownloadType('immediate');
      setVideoCustomUnlockDate('');
      setShowAddVideoModal(false);
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
      toast.success("PDF study material uploaded successfully!");
      setPdfFile(null);
      setPdfTitle("");
      setPdfDownloadType('immediate');
      setPdfCustomUnlockDate('');
      setShowAddPdfModal(false);
      await fetchCourseDetails();
    } catch (err) {
      const errMsg = err.response?.data?.error || "Failed to upload PDF.";
      toast.error(errMsg);
    } finally {
      setIsUploadingPdf(false);
    }
  };

  // Live Streaming & Scheduling states
  const [showLiveModal, setShowLiveModal] = useState(false);
  const [liveStreamTitle, setLiveStreamTitle] = useState('');
  const [liveYoutubeUrl, setLiveYoutubeUrl] = useState('');
  const [isPublishingLive, setIsPublishingLive] = useState(false);
  const [isScheduledLive, setIsScheduledLive] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [liveThumbnail, setLiveThumbnail] = useState('');
  const [isThumbnailCropperOpen, setIsThumbnailCropperOpen] = useState(false);
  const [cropperRawImage, setCropperRawImage] = useState(null);
  const thumbnailInputRef = useRef(null);

  // Interactive End Stream Modal
  const [showEndStreamConfirmModal, setShowEndStreamConfirmModal] = useState(false);
  const [showEndStreamSuccessModal, setShowEndStreamSuccessModal] = useState(false);
  const [endedStreamSummary, setEndedStreamSummary] = useState(null);
  const [isEndingStream, setIsEndingStream] = useState(false);
  const [saveLiveAsVideo, setSaveLiveAsVideo] = useState(true);

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

  // --- Assignment Management Handlers ---
  const handleOpenCreateAssignment = () => {
    setEditingAssignment(null);
    setAsgnFormData({
      title: '',
      description: '',
      month: selectedMonth ? selectedMonth.split(' ')[0] : '',
      weekNumber: activeWeek || 1,
      maxMarks: 100,
      passingMarks: 50,
      dueDate: '',
      allowLateSubmissions: true,
      isActive: true,
      attachmentFile: null
    });
    setShowAssignmentModal(true);
  };

  const handleOpenEditAssignment = (asgn) => {
    setEditingAssignment(asgn);
    setAsgnFormData({
      title: asgn.title || '',
      description: asgn.description || '',
      month: asgn.month || '',
      weekNumber: asgn.weekNumber || 0,
      maxMarks: asgn.maxMarks || 100,
      passingMarks: asgn.passingMarks || 50,
      dueDate: asgn.dueDate ? new Date(asgn.dueDate).toISOString().slice(0, 16) : '',
      allowLateSubmissions: asgn.allowLateSubmissions !== false,
      isActive: asgn.isActive !== false,
      attachmentFile: null
    });
    setShowAssignmentModal(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!asgnFormData.title.trim()) {
      toast.error("Please enter an assignment title.");
      return;
    }

    setIsSavingAssignment(true);
    const formData = new FormData();
    formData.append('title', asgnFormData.title.trim());
    formData.append('description', asgnFormData.description.trim());
    formData.append('courseId', courseId);
    formData.append('grade', selectedGrade);
    formData.append('month', asgnFormData.month);
    formData.append('weekNumber', asgnFormData.weekNumber);
    formData.append('maxMarks', asgnFormData.maxMarks);
    formData.append('passingMarks', asgnFormData.passingMarks);
    if (asgnFormData.dueDate) {
      formData.append('dueDate', asgnFormData.dueDate);
    }
    formData.append('allowLateSubmissions', asgnFormData.allowLateSubmissions);
    formData.append('isActive', asgnFormData.isActive);

    if (asgnFormData.attachmentFile) {
      formData.append('attachment', asgnFormData.attachmentFile);
    }

    try {
      if (editingAssignment) {
        await api.put(`/assignments/${editingAssignment._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Assignment updated successfully!");
      } else {
        await api.post('/assignments', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success("Assignment created successfully!");
      }
      setShowAssignmentModal(false);
      setEditingAssignment(null);
      await fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save assignment.");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleDeleteAssignment = async (asgnId) => {
    if (!window.confirm("Are you sure you want to delete this assignment and all student submissions?")) return;
    try {
      await api.delete(`/assignments/${asgnId}`);
      toast.success("Assignment removed!");
      await fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to delete assignment.");
    }
  };

  // Student Submit Solution Handlers
  const handleOpenSubmitModal = (asgn) => {
    setSelectedAssignmentForSubmit(asgn);
    setSolutionFile(null);
    setStudentNote(asgn.mySubmission?.studentNote || '');
    setShowSubmitModal(true);
  };

  const handleSubmitSolution = async (e) => {
    e.preventDefault();
    if (!solutionFile) {
      toast.error("Please upload your solution file (PDF, Word, Image, or Zip).");
      return;
    }

    if (solutionFile.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit.");
      return;
    }

    setIsSubmittingSolution(true);
    const formData = new FormData();
    formData.append('solution', solutionFile);
    formData.append('studentNote', studentNote.trim());

    try {
      const res = await api.post(`/assignments/${selectedAssignmentForSubmit._id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success(res.data.message || "Assignment solution submitted successfully!");
      setShowSubmitModal(false);
      setSelectedAssignmentForSubmit(null);
      setSolutionFile(null);
      setStudentNote('');
      await fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to submit assignment.");
    } finally {
      setIsSubmittingSolution(false);
    }
  };

  // Student Feedback Modal
  const handleOpenFeedbackModal = (mySub) => {
    setSelectedSubmissionForFeedback(mySub);
    setShowFeedbackModal(true);
  };

  // Teacher Submissions Drawer Handlers
  const handleOpenTeacherSubmissions = async (asgn) => {
    setSelectedAssignmentForTeacherSubmissions(asgn);
    setShowTeacherSubmissionsDrawer(true);
    setLoadingTeacherSubmissions(true);
    try {
      const res = await api.get(`/assignments/${asgn._id}/submissions`);
      setTeacherSubmissionsData(res.data);
      // Pre-fill grading inputs
      const initialGrading = {};
      (res.data.submissions || []).forEach(sub => {
        initialGrading[sub._id] = {
          marks: sub.marks !== null && sub.marks !== undefined ? sub.marks : '',
          feedback: sub.feedback || ''
        };
      });
      setGradingInputs(initialGrading);
    } catch (err) {
      toast.error("Failed to load submissions.");
    } finally {
      setLoadingTeacherSubmissions(false);
    }
  };

  const handleSaveGrade = async (submissionId) => {
    const data = gradingInputs[submissionId];
    if (!data || data.marks === '' || isNaN(Number(data.marks))) {
      toast.error("Please enter a valid numeric mark.");
      return;
    }

    setIsSavingGradeMap(prev => ({ ...prev, [submissionId]: true }));
    try {
      await api.patch(`/assignments/submissions/${submissionId}/grade`, {
        marks: Number(data.marks),
        feedback: data.feedback || '',
        status: 'graded'
      });
      toast.success("Marks & feedback saved! Student notified.");
      if (selectedAssignmentForTeacherSubmissions) {
        const res = await api.get(`/assignments/${selectedAssignmentForTeacherSubmissions._id}/submissions`);
        setTeacherSubmissionsData(res.data);
      }
      await fetchAssignments();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to save marks.");
    } finally {
      setIsSavingGradeMap(prev => ({ ...prev, [submissionId]: false }));
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
      toast.error('Please upload an image file for the thumbnail.');
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

  const handleCropComplete = (croppedBase64) => {
    setLiveThumbnail(croppedBase64);
    setIsThumbnailCropperOpen(false);
    toast.success('16:9 Thumbnail cropped successfully!');
  };

  const handleStartLiveStream = async (e) => {
    if (e) e.preventDefault();
    if (!liveYoutubeUrl.trim()) {
      toast.error('Please enter a valid YouTube Live link or Video ID.');
      return;
    }

    const targetLesson = (lessons || []).find(l => String(l.grade) === String(selectedGrade)) || (lessons || [])[0];
    if (!targetLesson?._id) {
      toast.error('Please select a class workspace first.');
      return;
    }

    let scheduledStartTime = null;
    if (isScheduledLive) {
      if (!scheduledDate || !scheduledTime) {
        toast.error('Please select both broadcast date and time for the scheduled stream.');
        return;
      }
      try {
        const parsedDate = new Date(`${scheduledDate}T${scheduledTime}`);
        if (isNaN(parsedDate.getTime())) {
          toast.error('Invalid broadcast date or time format. Please check your schedule selection.');
          return;
        }
        scheduledStartTime = parsedDate.toISOString();
      } catch (err) {
        toast.error('Invalid broadcast date or time selected.');
        return;
      }
    }

    setIsPublishingLive(true);
    try {
      const res = await api.post(`/lessons/${targetLesson._id}/live-stream`, {
        youtubeUrl: liveYoutubeUrl.trim(),
        title: liveStreamTitle.trim(),
        thumbnail: liveThumbnail,
        isScheduled: Boolean(isScheduledLive),
        scheduledStartTime: scheduledStartTime
      });

      setShowLiveModal(false);
      if (res.data?.lesson) {
        setLessons(prev => prev.map(l => l._id === res.data.lesson._id ? res.data.lesson : l));
      }
      toast.success(res.data.message || (isScheduledLive ? '🗓️ Live Class scheduled successfully!' : '🔴 Live Class started!'));
      fetchCourseDetails();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to publish live stream');
    } finally {
      setIsPublishingLive(false);
    }
  };

  const handleGoLiveImmediately = async (lessonId) => {
    const targetLesson = (lessons || []).find(l => l._id === lessonId || String(l.grade) === String(selectedGrade)) || (lessons || [])[0];
    if (!targetLesson?._id) return;
    try {
      const res = await api.post(`/lessons/${targetLesson._id}/live-stream`, {
        youtubeUrl: targetLesson.liveStream?.youtubeUrl,
        title: targetLesson.liveStream?.title,
        thumbnail: targetLesson.liveStream?.thumbnail,
        isScheduled: false,
        goLiveNow: true
      });
      if (res.data?.lesson) {
        setLessons(prev => prev.map(l => l._id === res.data.lesson._id ? res.data.lesson : l));
      }
      toast.success("🔴 You are now LIVE! Class stream started.");
      fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to start live stream immediately.");
    }
  };

  const handleOpenEditScheduledLive = (lesson) => {
    const targetLesson = lesson || (lessons || []).find(l => String(l.grade) === String(selectedGrade)) || (lessons || []).find(l => l.liveStream?.isLive) || (lessons || [])[0];
    const ls = targetLesson?.liveStream || {};
    setLiveStreamTitle(ls.title || '');
    setLiveYoutubeUrl(ls.youtubeUrl || '');
    setLiveThumbnail(ls.thumbnail || '');
    setIsScheduledLive(true);
    if (ls.scheduledStartTime) {
      try {
        const d = new Date(ls.scheduledStartTime);
        setScheduledDate(d.toISOString().split('T')[0]);
        setScheduledTime(d.toTimeString().slice(0, 5));
      } catch (e) {}
    }
    setShowLiveModal(true);
  };

  const handleCancelScheduledLive = async (lessonId) => {
    if (!window.confirm("Are you sure you want to cancel this scheduled live class?")) return;
    try {
      await api.delete(`/lessons/${lessonId}/live-stream`);
      setLessons(prev => prev.map(l => {
        if (l._id === lessonId) {
          return {
            ...l,
            liveStream: {
              ...(l.liveStream || {}),
              isLive: false,
              isScheduled: false,
              scheduledStartTime: null,
              youtubeUrl: ''
            }
          };
        }
        return l;
      }));
      toast.success("Scheduled live class cancelled.");
      fetchCourseDetails();
    } catch (err) {
      toast.error("Failed to cancel scheduled live class.");
    }
  };

  const handleEndLiveStream = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    setShowEndStreamConfirmModal(true);
  };

  const confirmEndLiveStream = async (shouldSaveVideo = saveLiveAsVideo) => {
    // Prioritize finding the lesson that actually has an active live or scheduled stream
    const targetLesson = (lessons || []).find(l => l.liveStream?.isLive || l.liveStream?.isScheduled) 
      || (lessons || []).find(l => String(l.grade).toLowerCase() === String(selectedGrade).toLowerCase()) 
      || (lessons || [])[0];

    setIsEndingStream(true);
    setShowEndStreamConfirmModal(false);
    setShowLiveModal(false);

    // Optimistically clear liveStream state across ALL lessons so UI updates immediately
    setLessons(prevLessons => prevLessons.map(l => ({
      ...l,
      liveStream: {
        ...(l.liveStream || {}),
        isLive: false,
        isScheduled: false,
        scheduledStartTime: null,
        youtubeUrl: ''
      }
    })));

    setEndedStreamSummary({
      title: targetLesson?.liveStream?.title || 'Live Broadcast',
      grade: selectedGrade,
      savedAsVideo: Boolean(shouldSaveVideo)
    });

    if (!targetLesson?._id) {
      setShowEndStreamSuccessModal(true);
      setIsEndingStream(false);
      return;
    }

    try {
      const res = await api.delete(`/lessons/${targetLesson._id}/live-stream?saveAsVideo=${Boolean(shouldSaveVideo)}`, {
        data: { saveAsVideo: Boolean(shouldSaveVideo) }
      });
      setShowEndStreamSuccessModal(true);
      toast.success(res.data?.message || "🎉 Live Class ended successfully!");
      fetchCourseDetails();
    } catch (err) {
      console.warn("DELETE live stream failed, trying POST fallback:", err);
      try {
        const resPost = await api.post(`/lessons/${targetLesson._id}/live-stream/end`, {
          saveAsVideo: Boolean(shouldSaveVideo)
        });
        setShowEndStreamSuccessModal(true);
        toast.success(resPost.data?.message || "🎉 Live Class ended successfully!");
        fetchCourseDetails();
      } catch (fallbackErr) {
        console.error("Failed to end live stream:", fallbackErr);
        toast.error(fallbackErr.response?.data?.error || err.response?.data?.error || "Failed to end live stream.");
        fetchCourseDetails();
      }
    } finally {
      setIsEndingStream(false);
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
  const currentLesson = lessons.find(l => normalizeGrade(l.grade) === normalizeGrade(selectedGrade)) 
    || lessons.find(l => l.liveStream?.isLive || l.liveStream?.isScheduled) 
    || lessons[0];
  const studentGrade = user?.grade;
  const alreadyEnrolled = course?.enrolledStudents?.some(
    (s) => (s?._id || s)?.toString() === (user?._id || user?.id)?.toString()
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
    <div className="p-3 sm:p-6 md:p-8 max-w-7xl mx-auto font-sans text-gray-800 dark:text-gray-100 space-y-5 sm:space-y-6 transition-colors duration-200">

      {/* Parent Read-Only Overview Banner */}
      {user?.role === 'parent' && (
        <div className="bg-gradient-to-r from-purple-950 via-indigo-900 to-purple-900 text-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg border border-purple-700/50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center text-xl sm:text-2xl font-black shrink-0">
              👨‍👩‍👧
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm sm:text-lg">Parent Read-Only Mode</h4>
              <p className="text-[11px] sm:text-xs text-purple-200/90 mt-0.5 max-w-2xl leading-relaxed">
                Overview of course curriculum, assigned instructors, available grade streams, and live class timetables. Management and upload controls are disabled for parents.
              </p>
            </div>
          </div>
          <span className="px-3 sm:px-4 py-1 sm:py-1.5 bg-amber-400 text-purple-950 text-[10px] sm:text-xs font-black rounded-full uppercase tracking-wider shadow-sm">
            👁️ Read-Only View
          </span>
        </div>
      )}

      {/* Dynamic Header: Shows course details or class breadcrumbs */}
      {selectedGrade === null ? (
        <div className="mb-6 sm:mb-8 relative">
          {/* Facebook Style Cover Banner */}
          <div className="relative w-full h-44 sm:h-64 md:h-96 rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg bg-gradient-to-r from-[#2d1b64] via-purple-900 to-indigo-900 group">
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
                <FaBookOpen className="text-4xl sm:text-6xl text-purple-300/40" />
              </div>
            )}
          </div>

          {/* Facebook Style Instructor Profile Overlay (Prominent Size, NO Arrow) */}
          {course?.instructor && (
            <div className="relative -mt-10 sm:-mt-20 px-3 sm:px-8 z-20 flex items-end justify-between flex-wrap gap-3 sm:gap-4">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTeacherForModal(course.instructor);
                }}
                className="flex items-end gap-3 sm:gap-5 cursor-pointer group/teacher transition-transform duration-300 transform hover:scale-102"
                title="Click to view Teacher Profile"
              >
                {/* Facebook Style Large Profile Avatar */}
                <div className="relative shrink-0">
                  {course.instructor.profilePicture ? (
                    <img
                      src={getImageUrl(course.instructor.profilePicture)}
                      alt={course.instructor.name || 'Instructor'}
                      className="w-18 h-18 sm:w-32 sm:h-32 rounded-full object-cover ring-3 sm:ring-4 ring-white dark:ring-slate-900 shadow-2xl bg-white dark:bg-slate-800 border-2 border-purple-100 dark:border-purple-800 group-hover/teacher:ring-purple-600 group-hover/teacher:scale-105 transition-all duration-300"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  ) : (
                    <div className="w-18 h-18 sm:w-32 sm:h-32 bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white rounded-full flex items-center justify-center font-black text-2xl sm:text-5xl ring-3 sm:ring-4 ring-white dark:ring-slate-900 shadow-2xl border-2 border-purple-100 dark:border-purple-800 group-hover/teacher:ring-purple-600 group-hover/teacher:scale-105 transition-all">
                      {course.instructor.name ? course.instructor.name.charAt(0) : '?'}
                    </div>
                  )}
                </div>

                {/* Instructor Badge, Prominent Name & Rating Badge */}
                <div className="pb-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-black text-white bg-purple-600 px-3.5 py-1 rounded-full shadow-md flex items-center gap-1.5 w-fit border border-purple-400/40 uppercase tracking-widest">
                      <FaChalkboardTeacher /> INSTRUCTOR
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReviewsModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-600 dark:text-amber-300 border border-amber-400/40 px-3 py-1 rounded-full text-xs font-black transition cursor-pointer backdrop-blur-xs shadow-xs"
                    >
                      <FaStar className="text-amber-400" />
                      <span>{Number(avgRating) > 0 ? `${avgRating} / 5.0` : 'New'}</span>
                      <span className="opacity-80">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
                    </button>
                  </div>
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
                className={`px-5 py-3 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-lg flex items-center gap-3 cursor-pointer transform hover:-translate-y-0.5 active:scale-95 border ${showSchedule
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

              <button
                type="button"
                onClick={() => setShowReviewsModal(true)}
                className="px-5 py-3 rounded-2xl font-black text-sm sm:text-base transition-all duration-300 shadow-md flex items-center gap-2.5 cursor-pointer bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white active:scale-95 border border-amber-400/50"
              >
                <FaStar className="text-base text-yellow-200" />
                <span>Reviews & Feedback</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-extrabold">{totalReviews}</span>
              </button>

              {user?.role === 'student' && (
                <>
                  {user?.grade && (
                    <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-slate-800/95 dark:to-slate-800/80 border border-purple-200/80 dark:border-slate-700 px-4 py-2.5 rounded-2xl shadow-sm">
                      <div className="w-9 h-9 rounded-xl bg-[#2d1b64] dark:bg-purple-900/70 text-white dark:text-purple-200 flex items-center justify-center font-bold text-base shadow-sm border border-transparent dark:border-purple-700/60">
                        🎓
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 uppercase tracking-widest block leading-none">Your Grade</span>
                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">{user.grade}</span>
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
                    <span className="inline-flex items-center gap-2 bg-green-50 dark:bg-emerald-950/70 text-green-700 dark:text-emerald-300 border border-green-200 dark:border-emerald-800/80 px-4 py-2.5 rounded-2xl text-xs font-extrabold shadow-sm">
                      <svg className="w-4 h-4 text-green-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <div className="mb-8 space-y-3 animate-fadeIn py-2">
          {/* Top Row: Back to Classes on Top Left, Workspace Badge + Live Status on Top Right */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <button
              onClick={() => setSelectedGrade(null)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-50 dark:bg-slate-800/90 hover:bg-purple-100 dark:hover:bg-slate-700 text-purple-800 dark:text-purple-300 border border-purple-200/70 dark:border-slate-700 text-xs sm:text-sm font-extrabold transition-all duration-200 shadow-2xs hover:shadow-xs cursor-pointer group active:scale-95"
            >
              <span className="text-sm transition-transform duration-200 group-hover:-translate-x-1">←</span>
              <span>Back to Classes</span>
            </button>

            <div className="flex items-center gap-2 flex-wrap">
              {currentLesson?.liveStream?.isLive ? (
                <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-red-600 via-rose-600 to-red-700 px-4 py-2 rounded-full border border-red-400/50 shadow-md shadow-red-600/30 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-white"></span>
                  <span>🔴 LIVE CLASS</span>
                </span>
              ) : currentLesson?.liveStream?.isScheduled ? (
                <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-white bg-gradient-to-r from-amber-500 via-orange-500 to-orange-600 px-4 py-2 rounded-full border border-amber-400/50 shadow-md shadow-orange-500/30">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-200"></span>
                  <span>🗓️ LIVE SCHEDULED</span>
                </span>
              ) : null}

              <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-purple-800 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/70 px-4 py-2 rounded-full border border-purple-200 dark:border-purple-800/80 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                <span>{selectedGrade} Workspace</span>
              </span>
            </div>
          </div>

          {/* Centered Course Title */}
          <div className="text-center space-y-2 py-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight max-w-5xl mx-auto drop-shadow-2xs">{course?.title}</h1>
          </div>
        </div>
      )}

      {/* VIEW 2: CLASS WORKSPACE CONTENT PANEL (Shown when a class is clicked) */}
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
                {course?.enrolledGrades?.map((eg) => {
                  const effectiveFee = (eg.fee !== undefined && eg.fee !== null && Number(eg.fee) >= 0) ? Number(eg.fee) : (course?.price || 2500);
                  return (
                  <div
                    key={eg.gradeNumber}
                    className="relative bg-white dark:bg-slate-800 p-5 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-500 cursor-pointer group"
                  >
                    <div className="absolute right-4 top-4 flex flex-col gap-1.5 z-10">
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
                          setEditGradeModal({
                            gradeId: eg._id || eg.id || eg.gradeNumber,
                            gradeNumber: eg.gradeNumber,
                            title: eg.title || eg.gradeNumber,
                            fee: effectiveFee
                          });
                        }}
                        className="rounded-full border border-purple-200 dark:border-purple-800/60 bg-purple-50 dark:bg-purple-950/40 px-3 py-1 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition cursor-pointer shadow-xs"
                      >
                        Edit Fee / Title
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
                    <h4 className="text-lg font-extrabold text-gray-800 dark:text-white mb-1 group-hover:text-purple-900 dark:group-hover:text-purple-300 transition-colors pr-24">{eg.title || eg.gradeNumber}</h4>
                    <div className="my-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Fee: LKR {effectiveFee.toLocaleString()}
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-medium">This class can enrol in the course when assigned.</p>
                  </div>
                )})}
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
                    const canToggleStatus = user?.role === 'admin' || (user?.role === 'teacher' && (deactivatedByRole === 'teacher' || !isDeactive));

                    const gradeLesson = (lessons || []).find(l => normalizeGrade(l.grade) === normalizeGrade(eg.gradeNumber));
                    const isGradeLive = Boolean(gradeLesson?.liveStream?.isLive);
                    const isGradeScheduled = Boolean(gradeLesson?.liveStream?.isScheduled && !isGradeLive);

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
                      className={`p-6 rounded-2xl shadow-xs border transition-all duration-300 hover:-translate-y-1 hover:shadow-md relative ${
                        isGradeLive
                          ? 'border-2 border-red-500/80 bg-red-50/20 dark:bg-red-950/25 shadow-xl shadow-red-900/15 ring-2 ring-red-400/40 cursor-pointer animate-pulse-subtle'
                          : isGradeScheduled
                            ? 'border-2 border-amber-400/80 bg-amber-50/20 dark:bg-amber-950/20 shadow-md shadow-amber-900/10 cursor-pointer'
                            : isDeactive
                              ? 'border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 cursor-pointer'
                              : user?.role === 'student' && !alreadyEnrolled
                                ? 'border-gray-200 dark:border-slate-800 bg-gray-50/60 dark:bg-slate-800/40 cursor-pointer hover:border-purple-300'
                                : 'bg-white dark:bg-slate-900 border-purple-100/80 dark:border-slate-800 hover:border-purple-400 dark:hover:border-purple-500 cursor-pointer group'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-colors ${
                            isGradeLive
                              ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                              : isGradeScheduled
                                ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                                : isDeactive
                                  ? 'bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                                  : user?.role === 'student' && !alreadyEnrolled
                                    ? 'bg-gray-200 dark:bg-slate-800 text-gray-500 dark:text-gray-400'
                                    : 'bg-[#f3f4f6] dark:bg-slate-800 group-hover:bg-[#2d1b64] group-hover:text-white'
                          }`}>
                            {isGradeLive ? '🔴' : isGradeScheduled ? '🗓️' : isDeactive ? '🔒' : user?.role === 'student' && !alreadyEnrolled ? '🔒' : '🎓'}
                          </div>

                          {/* Status Badge Rendering */}
                          {isGradeLive ? (
                            <span className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-red-500/30 flex items-center gap-1.5 border border-red-400/50 animate-pulse">
                              <span className="w-2 h-2 rounded-full bg-white"></span>
                              LIVE NOW
                            </span>
                          ) : isGradeScheduled ? (
                            <span className="bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md shadow-orange-500/30 flex items-center gap-1.5 border border-amber-400/50">
                              🗓️ SCHEDULED
                            </span>
                          ) : user?.role === 'student' && !alreadyEnrolled ? (
                            <span className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200 dark:border-amber-800">
                              🔒 Enroll Required
                            </span>
                          ) : isDeactive ? (
                            canToggleStatus ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (course?.status === 'deactive' || course?.isActive === false) {
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
                                  if (course?.status === 'deactive' || course?.isActive === false) {
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
                            ? 'text-red-600 dark:text-red-400'
                            : user?.role === 'student' && !alreadyEnrolled 
                              ? 'text-gray-700 dark:text-gray-300' 
                              : 'text-gray-800 dark:text-white group-hover:text-[#2d1b64] dark:group-hover:text-purple-300'
                        }`}>
                          {eg.title || eg.gradeNumber}
                        </h3>
                        
                        <p className={`text-xs mt-2 font-bold ${
                          isGradeLive 
                            ? 'text-red-600 dark:text-red-400 animate-pulse' 
                            : isGradeScheduled 
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-gray-400 font-medium'
                        }`}>
                          {isGradeLive
                            ? '🔴 Live Class is in progress! Click to join now.'
                            : isGradeScheduled
                              ? '🗓️ Live Class scheduled. Click to view schedule.'
                              : user?.role === 'student' && !alreadyEnrolled
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
                              className={`rounded-xl border px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 shadow-sm ${isDeactive && deactivatedByRole === 'admin'
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

          {/* Active YouTube Live Stream Player (Positioned at TOP of Workspace) */}
          {currentLesson?.liveStream?.isLive && (
            <LiveStreamPlayer
              liveStream={currentLesson.liveStream}
              lessonId={currentLesson._id}
              grade={selectedGrade}
              isTeacherOrAdmin={user?.role === 'admin' || user?.role === 'teacher'}
              onEndStream={() => handleEndLiveStream(saveLiveAsVideo)}
            />
          )}

          {/* Scheduled Live Countdown Hero Banner (Positioned at TOP of Workspace) */}
          {!currentLesson?.liveStream?.isLive && currentLesson?.liveStream?.isScheduled && (
            <ScheduledLiveHero
              liveStream={currentLesson.liveStream}
              isTeacherOrAdmin={user?.role === 'admin' || user?.role === 'teacher'}
              onGoLiveNow={() => handleGoLiveImmediately(currentLesson._id)}
              onEditSchedule={() => handleOpenEditScheduledLive(currentLesson)}
              onCancelSchedule={() => handleCancelScheduledLive(currentLesson._id)}
              grade={selectedGrade}
              courseTitle={course?.title}
            />
          )}

          {/* TEACHER & ADMIN QUICK ACTION CREATION TOOLBAR (Class Content Creator) */}
          {isTeacherOrAdmin && (
            <div className="bg-gradient-to-r from-[#2f1066] via-[#241154] to-[#120733] p-4 sm:p-5 rounded-3xl text-white shadow-xl flex flex-col 2xl:flex-row justify-between items-start 2xl:items-center gap-4 border border-purple-500/30 animate-fadeIn">
              <div className="flex items-center gap-3 shrink-0">
                <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-xl shrink-0 shadow-inner border border-white/15">
                  ⚡
                </div>
                <div>
                  <h4 className="font-black text-sm sm:text-base leading-tight">Class Content Creator</h4>
                  <p className="text-purple-200 text-xs mt-0.5 font-medium">
                    Publish learning assets for <strong className="text-white">Week {activeWeek}</strong> ({selectedMonth} • {selectedGrade?.toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`}).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 2xl:flex 2xl:flex-wrap 2xl:items-center 2xl:justify-end gap-2 w-full 2xl:w-auto">
                {/* Integrated YouTube Live Stream Action Button */}
                {currentLesson?.liveStream?.isScheduled ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentLesson?.liveStream) {
                        setLiveStreamTitle(currentLesson.liveStream.title || '');
                        setLiveYoutubeUrl(currentLesson.liveStream.youtubeUrl || '');
                      }
                      setShowLiveModal(true);
                    }}
                    className="w-full 2xl:w-auto px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-amber-300/50 shrink-0 whitespace-nowrap"
                    title="Manage Scheduled Live Stream"
                  >
                    <div className="flex items-center gap-1">
                      <FaCalendarAlt className="text-xs text-white drop-shadow-xs" />
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-200 opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                    </div>
                    <span>🗓️ Live Scheduled</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentLesson?.liveStream?.isLive) {
                        setLiveStreamTitle(currentLesson.liveStream.title || '');
                        setLiveYoutubeUrl(currentLesson.liveStream.youtubeUrl || '');
                      }
                      setShowLiveModal(true);
                    }}
                    className={`w-full 2xl:w-auto px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border shrink-0 whitespace-nowrap ${
                      currentLesson?.liveStream?.isLive
                        ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-500 hover:to-rose-500 text-white border-red-400/50 shadow-red-900/40'
                        : 'bg-gradient-to-r from-[#FF0000] via-[#E60000] to-[#CC0000] hover:from-[#E60000] hover:to-[#B30000] text-white border-red-500/40 shadow-red-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <FaYoutube className="text-sm text-white drop-shadow-xs" />
                      <span className="flex h-1.5 w-1.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-90"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
                      </span>
                    </div>
                    <span>{currentLesson?.liveStream?.isLive ? '🔴 Manage Live Class' : 'Start YouTube Live Class'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setEditingMessage(currentLesson?.teacherMessage || '');
                    setShowAnnouncementModal(true);
                  }}
                  className="w-full 2xl:w-auto px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 border border-white/20 shadow-sm active:scale-95 shrink-0 whitespace-nowrap"
                  title="Post or update weekly announcement for students"
                >
                  <span>📢</span> Announcement
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setVideoTitle('');
                    setVideoUrl('');
                    setVideoDownloadType('immediate');
                    setVideoCustomUnlockDate('');
                    setShowAddVideoModal(true);
                  }}
                  className="w-full 2xl:w-auto px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-emerald-400/30 shrink-0 whitespace-nowrap"
                  title="Add video lecture link"
                >
                  <span>🎬</span> + Video Lesson
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPdfTitle('');
                    setPdfFile(null);
                    setPdfDownloadType('immediate');
                    setPdfCustomUnlockDate('');
                    setShowAddPdfModal(true);
                  }}
                  className="w-full 2xl:w-auto px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-purple-400/30 shrink-0 whitespace-nowrap"
                  title="Upload PDF note / study booklet"
                >
                  <span>📕</span> + PDF Material
                </button>

                <button
                  type="button"
                  onClick={handleOpenCreateAssignment}
                  className="w-full 2xl:w-auto px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-amber-400/30 shrink-0 whitespace-nowrap"
                  title="Create homework assignment"
                >
                  <span>📑</span> + Assignment
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/course/${courseId}/create-quiz`)}
                  className="w-full 2xl:w-auto px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm active:scale-95 border border-blue-400/30 shrink-0 whitespace-nowrap"
                  title="Create weekly interactive quiz"
                >
                  <span>📝</span> + Quiz
                </button>
              </div>
            </div>
          )}

          {/* Academic Month Selector */}
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-500/20 dark:to-indigo-500/20 border border-purple-200/50 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xl shadow-xs shrink-0 font-black">
                  🗓️
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                    Academic Month Selector
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Select a month to view weekly study materials and attendance logs. Future months are locked.
                  </p>
                </div>
              </div>

              {/* Year Navigation */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 shadow-inner shrink-0 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={handleNavYearPrev}
                  disabled={navYear <= MIN_NAV_YEAR}
                  className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white text-slate-600 dark:text-slate-200 flex items-center justify-center transition-all duration-200 shadow-2xs active:scale-90 font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Year"
                >
                  ‹
                </button>
                <span className="px-3 font-extrabold text-slate-900 dark:text-white text-sm tabular-nums tracking-wide">{navYear}</span>
                <button
                  type="button"
                  onClick={handleNavYearNext}
                  disabled={navYear >= currentYear}
                  className="w-7 h-7 rounded-xl bg-white dark:bg-slate-700 hover:bg-purple-600 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white text-slate-600 dark:text-slate-200 flex items-center justify-center transition-all duration-200 shadow-2xs active:scale-90 font-bold disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Year"
                >
                  ›
                </button>
              </div>
            </div>

            {/* 12-Month Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 sm:gap-3">
              {availableMonths.map(({ label, monthIdx, locked }) => {
                const isSelected = selectedMonth === label;
                return (
                  <button
                    key={label}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setSelectedMonth(label)}
                    title={locked ? 'This month is not available yet' : label}
                    className={`relative px-3 py-3 rounded-2xl text-xs font-black transition-all duration-200 text-center leading-tight overflow-hidden ${
                      locked
                        ? 'bg-slate-100/50 dark:bg-slate-800/20 text-slate-400 dark:text-slate-600 border border-dashed border-slate-200 dark:border-slate-800/80 cursor-not-allowed opacity-65'
                        : isSelected
                          ? 'bg-gradient-to-br from-purple-600 via-indigo-600 to-purple-700 text-white shadow-lg shadow-purple-600/30 ring-2 ring-purple-400/80 ring-offset-2 ring-offset-white dark:ring-offset-slate-900 scale-[1.03] cursor-pointer border border-purple-400/30'
                          : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-slate-700 dark:text-slate-200 hover:text-purple-700 dark:hover:text-purple-300 border border-slate-200/60 dark:border-slate-800 hover:border-purple-300/80 dark:hover:border-purple-700/60 shadow-2xs hover:shadow-md hover:-translate-y-0.5 cursor-pointer'
                    }`}
                  >
                    {locked && (
                      <span className="absolute top-1.5 right-1.5 text-[10px] text-slate-400 dark:text-slate-500">🔒</span>
                    )}
                    <span className="block text-xs sm:text-sm font-extrabold tracking-tight">{MONTH_NAMES[monthIdx].slice(0, 3)}</span>
                    {isSelected && !locked && (
                      <span className="inline-block text-[9px] font-black bg-white/25 backdrop-blur-xs text-white px-2 py-0.5 rounded-full mt-1 uppercase tracking-wider shadow-xs">
                        ACTIVE
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Workspace Navigation Tabs */}
          <div className="bg-white dark:bg-slate-900/90 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-5 transition-all duration-300">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/50 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl shadow-xs shrink-0 font-black">
                  📅
                </div>
                <div>
                  <h4 className="font-black text-slate-900 dark:text-white text-base sm:text-lg tracking-tight">
                    Class Sessions & Workspace — <span className="text-purple-700 dark:text-purple-400">{selectedMonth}</span>
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                    {activeSchedule ? (
                      <span>Timetable: <strong className="text-slate-900 dark:text-purple-200 font-extrabold bg-purple-100/70 dark:bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-200/60 dark:border-purple-800/60">{activeSchedule.dayOfWeek} ({activeSchedule.startTime} - {activeSchedule.endTime})</strong> • {currentMonthSessions.length} sessions in {selectedMonth}</span>
                    ) : (
                      <span>Select a scheduled class date to access study materials and attendance logs. ({currentMonthSessions.length} sessions in {selectedMonth})</span>
                    )}
                  </p>
                </div>
              </div>
              <span className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white text-xs font-black shadow-md shadow-purple-500/20 flex items-center gap-1.5 shrink-0 self-start sm:self-auto border border-purple-400/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Active: {activeSessionObj.label}
              </span>
            </div>

            <div className={`grid grid-cols-2 sm:grid-cols-3 ${currentMonthSessions.length >= 5 ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-3 sm:gap-4`}>
              {currentMonthSessions.map((session) => {
                const wNum = session.weekNumber;
                const isAttended = attendedWeeks.includes(wNum);
                const isActive = activeWeek === wNum;

                return (
                  <button
                    key={wNum}
                    type="button"
                    onClick={() => setActiveWeek(wNum)}
                    className={`p-3 sm:p-4 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between cursor-pointer relative overflow-hidden group ${
                      isActive
                        ? 'bg-gradient-to-br from-purple-500/10 via-indigo-500/5 to-purple-600/15 dark:from-purple-950/70 dark:to-indigo-950/50 border-2 border-purple-500/80 shadow-lg shadow-purple-500/15 ring-4 ring-purple-500/10 scale-[1.02] -translate-y-0.5'
                        : 'bg-slate-50/70 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 hover:border-purple-300 dark:hover:border-purple-700/60 hover:bg-white dark:hover:bg-slate-800 shadow-2xs hover:shadow-md hover:-translate-y-0.5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 gap-1">
                      <span className={`text-[11px] sm:text-sm font-black tracking-tight flex items-center gap-1 min-w-0 truncate ${isActive ? 'text-purple-950 dark:text-purple-200' : 'text-slate-800 dark:text-slate-200'}`}>
                        <span className="shrink-0 text-xs">🗓️</span>
                        <span className="truncate">{session.label}</span>
                      </span>
                      {isAttended ? (
                        <span className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                          <span>✓</span> Attended
                        </span>
                      ) : (
                        <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 shrink-0 whitespace-nowrap">
                          <span>⏳</span> Pending
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50 mt-1 gap-1">
                      <span className="text-[11px] sm:text-xs font-extrabold text-purple-700 dark:text-purple-300 shrink-0">
                        Session {wNum}
                        {session.isFifthWeek ? <span className="hidden sm:inline"> • 5th Class</span> : ''}
                      </span>
                      <span className={`text-[10px] sm:text-[11px] font-extrabold flex items-center gap-0.5 transition-transform group-hover:translate-x-0.5 shrink-0 ${isAttended ? 'text-emerald-600 dark:text-emerald-400' : 'text-purple-600 dark:text-purple-400'}`}>
                        <span className="hidden sm:inline">{isAttended ? 'Logged ✓' : 'View Lesson'}</span>
                        <span className="sm:hidden">{isAttended ? 'Logged' : 'View'}</span>
                        <span className="text-[10px]">→</span>
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

          {canEnroll && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-green-200 dark:border-green-800/60 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fadeIn">
              <div>
                <h4 className="font-extrabold text-green-900 dark:text-green-300 text-base">Course Recommended for Your Grade</h4>
                <p className="text-green-700 dark:text-green-400 text-xs mt-0.5 font-medium">This course is recommended for {studentGrade && (studentGrade.toLowerCase().startsWith('grade') ? studentGrade : `Grade ${studentGrade}`)}. Enroll today to participate and access all live classes & assessments.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnrollModal(true)}
                className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-3 text-white font-extrabold text-xs hover:from-green-700 hover:to-emerald-700 shadow-md transition shrink-0 cursor-pointer"
              >
                Enroll in this Course 🎓
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* WORKSPACE SECTIONS CONTROLS BAR */}
          {/* ========================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Learning Materials & Content</span>
              <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                Week {activeWeek} • {selectedGrade?.toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs font-bold self-end sm:self-auto">
              <button
                type="button"
                onClick={expandAllSections}
                className="text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 hover:underline cursor-pointer flex items-center gap-1.5 transition"
              >
                <FaChevronDown className="text-[10px]" /> Expand All
              </button>
              <span className="text-gray-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={collapseAllSections}
                className="text-purple-700 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 hover:underline cursor-pointer flex items-center gap-1.5 transition"
              >
                <FaChevronUp className="text-[10px]" /> Collapse All
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: TEACHER'S ANNOUNCEMENT (Expandable) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
            <div
              onClick={() => toggleSection('announcement')}
              className="w-full p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-gray-50/80 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer select-none"
            >
              <div className="flex items-start sm:items-center justify-between sm:justify-start gap-3 min-w-0 w-full sm:w-auto">
                <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 flex items-center justify-center text-base sm:text-lg font-black shrink-0 shadow-inner">
                    📢
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                      Teacher's Announcement (Week {activeWeek})
                    </h4>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium line-clamp-1">
                      {currentLesson?.teacherMessage
                        ? 'Important guidelines, schedule reminders, and teacher notes for this class.'
                        : 'No announcement published for this class session yet.'}
                    </p>
                  </div>
                </div>

                {/* Mobile-only toggle chevron */}
                <div className="sm:hidden w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs shrink-0 self-center">
                  {expandedSections.announcement ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>

              {/* Badges & action controls */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  {currentLesson?.teacherMessage ? (
                    <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800 whitespace-nowrap">
                      Active Message
                    </span>
                  ) : (
                    <span className="bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 text-[11px] sm:text-xs font-semibold px-2.5 sm:px-3 py-1 rounded-xl border border-transparent dark:border-slate-700 whitespace-nowrap">
                      Empty
                    </span>
                  )}

                  {isTeacherOrAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingMessage(currentLesson?.teacherMessage || '');
                        setShowAnnouncementModal(true);
                      }}
                      className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <FaEdit className="text-xs" /> Edit
                    </button>
                  )}
                </div>

                {/* Desktop-only toggle chevron */}
                <div className="hidden sm:flex w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 items-center justify-center text-gray-500 dark:text-gray-400 text-xs transition">
                  {expandedSections.announcement ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
            </div>

            {expandedSections.announcement && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 animate-fadeIn">
                {currentLesson?.teacherMessage ? (
                  <div className="bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/60 p-4 rounded-2xl text-gray-800 dark:text-purple-100 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {currentLesson.teacherMessage}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 dark:text-gray-500 text-xs italic bg-gray-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    No announcement or teacher message posted for Week {activeWeek} yet.
                    {isTeacherOrAdmin && (
                      <span
                        onClick={() => {
                          setEditingMessage('');
                          setShowAnnouncementModal(true);
                        }}
                        className="block text-purple-600 dark:text-purple-400 font-bold not-italic mt-1.5 cursor-pointer hover:underline"
                      >
                        + Click here to write an announcement
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: VIDEO LESSONS (Expandable) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300 hover:border-purple-200 dark:hover:border-purple-900/50">
            <div
              onClick={() => toggleSection('videos')}
              className="w-full p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-50/20 via-white to-purple-50/10 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 hover:from-purple-50/50 transition-all duration-300 text-left cursor-pointer select-none"
            >
              <div className="flex items-start sm:items-center justify-between sm:justify-start gap-3 min-w-0 w-full sm:w-auto">
                <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center text-base sm:text-xl font-black shrink-0 shadow-md shadow-purple-600/25 border border-purple-400/30">
                    <FaVideo className="text-sm sm:text-base text-white drop-shadow-xs" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h4 className="font-black text-sm sm:text-lg text-slate-900 dark:text-white leading-tight">
                        Video Lessons
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 px-2 py-0.5 rounded-lg border border-purple-200/80 dark:border-purple-800/80 whitespace-nowrap shrink-0">
                        Week {activeWeek} • {selectedMonth}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-semibold line-clamp-1">
                      Recorded lecture streams & walkthrough explanations.
                    </p>
                  </div>
                </div>

                {/* Mobile-only toggle chevron */}
                <div className="sm:hidden w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-purple-300 text-xs shrink-0 self-center">
                  {expandedSections.videos ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>

              {/* Badges & action controls */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-xl shadow-2xs whitespace-nowrap">
                    {currentLesson?.videoLessons?.length || 0} {currentLesson?.videoLessons?.length === 1 ? 'Video' : 'Videos'}
                  </span>

                  {!isTeacherOrAdmin && currentLesson?.videoLessons && currentLesson.videoLessons.length > 0 && (
                    <span className={`text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-xl border whitespace-nowrap ${
                      isVideoWatched
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                    }`}>
                      {isVideoWatched ? '✓ Watched' : 'Pending View'}
                    </span>
                  )}

                  {isTeacherOrAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setVideoTitle('');
                        setVideoUrl('');
                        setVideoDownloadType('immediate');
                        setVideoCustomUnlockDate('');
                        setShowAddVideoModal(true);
                      }}
                      className="px-3 py-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black shadow-md shadow-purple-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95 border border-purple-400/30 whitespace-nowrap"
                    >
                      <FaPlus className="text-[10px]" /> Add Video
                    </button>
                  )}
                </div>

                {/* Desktop-only toggle chevron */}
                <div className="hidden sm:flex w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-purple-100/50 dark:hover:bg-purple-950/60 items-center justify-center text-gray-500 dark:text-purple-300 text-xs transition">
                  {expandedSections.videos ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
            </div>

            {expandedSections.videos && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 animate-fadeIn">
                {!currentLesson?.videoLessons || currentLesson.videoLessons.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 dark:text-gray-500 space-y-1 bg-gray-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-sm font-semibold">No video lessons uploaded for Week {activeWeek} yet.</p>
                    {isTeacherOrAdmin && (
                      <p
                        className="text-xs text-emerald-700 dark:text-emerald-400 font-bold cursor-pointer hover:underline mt-1"
                        onClick={() => {
                          setVideoTitle('');
                          setVideoUrl('');
                          setVideoDownloadType('immediate');
                          setVideoCustomUnlockDate('');
                          setShowAddVideoModal(true);
                        }}
                      >
                        + Click here to add a video lesson
                      </p>
                    )}
                  </div>
                ) : (
                  [...(currentLesson.videoLessons || [])]
                    .sort((a, b) => {
                      const timeA = a.createdAt || a.date 
                        ? new Date(a.createdAt || a.date).getTime() 
                        : (a._id && String(a._id).length >= 8 ? parseInt(String(a._id).substring(0, 8), 16) * 1000 : 0);
                      const timeB = b.createdAt || b.date 
                        ? new Date(b.createdAt || b.date).getTime() 
                        : (b._id && String(b._id).length >= 8 ? parseInt(String(b._id).substring(0, 8), 16) * 1000 : 0);
                      return timeB - timeA; // Latest video on top
                    })
                    .map((vid) => {
                      const dlStatus = getMaterialDownloadStatus(vid);
                      const thumbnail = getYouTubeThumbnail(vid.url);
                      const formattedDate = vid.createdAt || vid.date 
                        ? new Date(vid.createdAt || vid.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : (vid._id && String(vid._id).length >= 8 ? new Date(parseInt(String(vid._id).substring(0, 8), 16) * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null);

                      return (
                        <div key={vid._id || vid.url} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3.5 sm:p-4 border border-gray-200/90 dark:border-slate-800 rounded-2xl hover:bg-purple-50/15 dark:hover:bg-slate-800/90 dark:hover:border-purple-500/40 transition-all gap-4 bg-white dark:bg-slate-800/60 shadow-2xs group">
                          <div className="flex items-center gap-3.5 min-w-0 w-full sm:w-auto">
                            {/* Video Thumbnail Card */}
                            <div
                              onClick={() => {
                                markMaterialCompleted('video');
                                setActiveVideoModal(vid);
                              }}
                              className="relative w-28 sm:w-36 h-18 sm:h-20 rounded-xl overflow-hidden shrink-0 group/thumb cursor-pointer border border-purple-200/60 dark:border-slate-700 bg-slate-900 shadow-xs"
                              title="Play Video"
                            >
                              {thumbnail ? (
                                <img
                                  src={thumbnail}
                                  alt={vid.title}
                                  className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-700 via-indigo-800 to-slate-900 flex items-center justify-center">
                                  <FaPlayCircle className="text-2xl text-white/80" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-slate-950/30 group-hover/thumb:bg-slate-950/10 transition-colors flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-lg group-hover/thumb:scale-110 transition-transform">
                                  <FaPlay className="text-xs ml-0.5 text-white" />
                                </div>
                              </div>
                            </div>

                            <div className="min-w-0 flex-1">
                              <h5
                                onClick={() => {
                                  markMaterialCompleted('video');
                                  setActiveVideoModal(vid);
                                }}
                                className="font-black text-gray-900 dark:text-white text-sm sm:text-base tracking-tight truncate cursor-pointer group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors"
                              >
                                {vid.title}
                              </h5>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {formattedDate && (
                                  <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/90 px-2.5 py-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                                    🗓️ {formattedDate}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2.5 py-0.5 rounded-lg border border-purple-200/60 dark:border-purple-800/50">
                                  🎬 Video Lesson
                                </span>
                              {isTeacherOrAdmin && (
                                <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
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

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap shrink-0">
                          {/* Watch Video Button for Students & Teachers */}
                          <button
                            type="button"
                            onClick={() => {
                              markMaterialCompleted('video');
                              setActiveVideoModal(vid);
                            }}
                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-md shadow-purple-900/30 hover:shadow-lg cursor-pointer flex items-center gap-1.5 active:scale-95"
                          >
                            <FaPlayCircle className="text-sm text-white" /> Watch Video
                          </button>

                          {!isTeacherOrAdmin && (
                            <>
                              {dlStatus.isAvailable && (
                                <a
                                  href={vid.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-purple-200 px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs border border-slate-200 dark:border-slate-700 hover:border-purple-400"
                                  title="Download Video File"
                                >
                                  <FaDownload className="text-[10px]" /> Download
                                </a>
                              )}

                              {dlStatus.status === 'scheduled' && (
                                <span
                                  className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-3 py-2 rounded-xl text-[11px] font-extrabold flex items-center gap-1.5"
                                  title={`Download unlocks on ${dlStatus.formattedDate}`}
                                >
                                  <FaHourglassHalf className="text-amber-600 dark:text-amber-400 text-xs" /> Unlocks {dlStatus.formattedDate} ({dlStatus.daysRemaining}d left)
                                </span>
                              )}
                            </>
                          )}

                          {isTeacherOrAdmin && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenDownloadSettingsModal('video', vid, currentLesson?._id)}
                                className="text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition text-xs font-bold flex items-center gap-1 cursor-pointer border border-purple-100 dark:border-slate-700"
                                title="Configure Download Access"
                              >
                                <FaCog className="text-xs" /> Download Settings
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteVideo(vid._id)}
                                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 rounded-xl transition text-xs font-bold cursor-pointer border border-red-100 dark:border-red-900/60"
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
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: STUDY MATERIALS — PDF NOTES (Expandable) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
            <div
              onClick={() => toggleSection('pdfs')}
              className="w-full p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-gray-50/80 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer select-none"
            >
              <div className="flex items-start sm:items-center justify-between sm:justify-start gap-3 min-w-0 w-full sm:w-auto">
                <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 flex items-center justify-center text-base sm:text-lg font-black shrink-0 shadow-inner">
                    📕
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                        Study Materials — PDF Notes
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-100/80 dark:bg-purple-950/80 px-2 py-0.5 rounded-lg border border-purple-200/80 dark:border-purple-800/80 whitespace-nowrap shrink-0">
                        Week {activeWeek} • {selectedMonth}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium line-clamp-1">
                      Read lecture slides, revision summaries, and structured study booklets.
                    </p>
                  </div>
                </div>

                {/* Mobile-only toggle chevron */}
                <div className="sm:hidden w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs shrink-0 self-center">
                  {expandedSections.pdfs ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>

              {/* Badges & action controls */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-xl shadow-2xs whitespace-nowrap">
                    {currentLesson?.pdfMaterials?.length || 0} {currentLesson?.pdfMaterials?.length === 1 ? 'PDF' : 'PDFs'}
                  </span>

                  {!isTeacherOrAdmin && currentLesson?.pdfMaterials && currentLesson.pdfMaterials.length > 0 && (
                    <span className={`text-[11px] sm:text-xs font-extrabold px-2.5 sm:px-3 py-1 rounded-xl border whitespace-nowrap ${
                      isPdfDownloaded
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                    }`}>
                      {isPdfDownloaded ? '✓ Completed' : 'Pending View'}
                    </span>
                  )}

                  {isTeacherOrAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPdfTitle('');
                        setPdfFile(null);
                        setPdfDownloadType('immediate');
                        setPdfCustomUnlockDate('');
                        setShowAddPdfModal(true);
                      }}
                      className="px-3 py-1 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <FaPlus className="text-[10px]" /> Upload PDF
                    </button>
                  )}
                </div>

                {/* Desktop-only toggle chevron */}
                <div className="hidden sm:flex w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 items-center justify-center text-gray-500 dark:text-gray-400 text-xs transition">
                  {expandedSections.pdfs ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
            </div>

            {expandedSections.pdfs && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 animate-fadeIn">
                {!currentLesson?.pdfMaterials || currentLesson.pdfMaterials.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 dark:text-gray-500 space-y-1 bg-gray-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-sm font-semibold">No PDF study materials uploaded for Week {activeWeek} yet.</p>
                    {isTeacherOrAdmin && (
                      <p
                        className="text-xs text-purple-700 dark:text-purple-400 font-bold cursor-pointer hover:underline mt-1"
                        onClick={() => {
                          setPdfTitle('');
                          setPdfFile(null);
                          setPdfDownloadType('immediate');
                          setPdfCustomUnlockDate('');
                          setShowAddPdfModal(true);
                        }}
                      >
                        + Click here to upload a PDF note
                      </p>
                    )}
                  </div>
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
                      <div key={pdf._id || pdf.title} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-purple-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50/20 dark:hover:bg-slate-800 transition-all gap-3 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 flex items-center justify-center text-xl shrink-0 font-bold shadow-inner">
                            📕
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-gray-900 dark:text-white text-sm truncate">{pdf.title}</p>
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

                                <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full border ${pPercent >= 100
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                                    : pPercent > 0
                                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-800'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 border-slate-300 dark:border-slate-700'
                                  }`}>
                                  {pPercent >= 100
                                    ? '✓ 100% Completed'
                                    : pPercent > 0
                                      ? `📖 ${pPercent}% Read (Pg ${pMaxRead}/${pTotal})`
                                      : '📖 Unread (0%)'}
                                </span>
                              </div>

                              {isTeacherOrAdmin && (
                                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${dlStatus.status === 'immediate'
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

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap shrink-0">
                          <button
                            type="button"
                            onClick={() => setActivePdfModal({
                              pdf: { ...pdf, _id: pdf._id ? String(pdf._id) : pdf.filename },
                              lessonId: currentLesson?._id
                            })}
                            className="bg-purple-700 hover:bg-purple-800 text-white px-4 py-2 rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                          >
                            <span>📖</span> {pPercent >= 100 ? 'Review PDF Notes ▶' : pPercent > 0 ? `Continue (Pg ${pNextPage}) ▶` : 'Start Reading PDF ▶'}
                          </button>

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
                                type="button"
                                onClick={() => handleDeletePdf(pdf._id)}
                                className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 rounded-xl transition text-xs font-bold cursor-pointer border border-red-100 dark:border-red-900/60"
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
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 4: ASSIGNMENTS & HOMEWORK (Expandable) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
            <div
              onClick={() => toggleSection('assignments')}
              className="w-full p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-gray-50/80 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer select-none"
            >
              <div className="flex items-start sm:items-center justify-between sm:justify-start gap-3 min-w-0 w-full sm:w-auto">
                <div className="flex items-center gap-3 min-w-0 flex-1 sm:flex-initial">
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 flex items-center justify-center text-base sm:text-lg font-black shrink-0 shadow-inner">
                    📑
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <h4 className="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white leading-tight">
                        Assignments & Homework
                      </h4>
                      <span className="text-[10px] sm:text-[11px] font-extrabold text-amber-800 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/80 px-2 py-0.5 rounded-lg border border-amber-200/80 dark:border-amber-800/80 whitespace-nowrap shrink-0">
                        {selectedGrade?.toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`} — {selectedMonth}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium line-clamp-1">
                      Submit homework solutions, question sheets, and review instructor grading.
                    </p>
                  </div>
                </div>

                {/* Mobile-only toggle chevron */}
                <div className="sm:hidden w-7 h-7 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs shrink-0 self-center">
                  {expandedSections.assignments ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>

              {/* Badges & action controls */}
              <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100 dark:border-slate-800/60 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] sm:text-xs font-black px-2.5 sm:px-3 py-1 rounded-xl shadow-2xs whitespace-nowrap">
                    {assignments.filter(asgn => {
                      const matchesGrade = asgn.grade === selectedGrade;
                      const matchesMonth = !asgn.month || selectedMonth.toLowerCase().includes(asgn.month.toLowerCase()) || asgn.month.toLowerCase() === 'all';
                      return matchesGrade && matchesMonth;
                    }).length} {assignments.filter(asgn => {
                      const matchesGrade = asgn.grade === selectedGrade;
                      const matchesMonth = !asgn.month || selectedMonth.toLowerCase().includes(asgn.month.toLowerCase()) || asgn.month.toLowerCase() === 'all';
                      return matchesGrade && matchesMonth;
                    }).length === 1 ? 'Assignment' : 'Assignments'}
                  </span>

                  {isTeacherOrAdmin && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateAssignment();
                      }}
                      className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <FaPlus className="text-[10px]" /> Create Asgn
                    </button>
                  )}
                </div>

                {/* Desktop-only toggle chevron */}
                <div className="hidden sm:flex w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 items-center justify-center text-gray-500 dark:text-gray-400 text-xs transition">
                  {expandedSections.assignments ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
            </div>

            {expandedSections.assignments && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-slate-800 space-y-4 bg-white dark:bg-slate-900 animate-fadeIn">
                {assignments.filter(asgn => {
                  const matchesGrade = asgn.grade === selectedGrade;
                  const matchesMonth = !asgn.month || selectedMonth.toLowerCase().includes(asgn.month.toLowerCase()) || asgn.month.toLowerCase() === 'all';
                  return matchesGrade && matchesMonth;
                }).length === 0 ? (
                  <div className="py-8 text-center text-gray-400 dark:text-gray-500 space-y-1 bg-gray-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-sm font-semibold">No assignments posted for {selectedGrade} ({selectedMonth}) yet.</p>
                    {isTeacherOrAdmin && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-bold cursor-pointer hover:underline mt-1" onClick={handleOpenCreateAssignment}>
                        + Click here to create the first assignment
                      </p>
                    )}
                  </div>
                ) : (
                  assignments.filter(asgn => {
                    const matchesGrade = asgn.grade === selectedGrade;
                    const matchesMonth = !asgn.month || selectedMonth.toLowerCase().includes(asgn.month.toLowerCase()) || asgn.month.toLowerCase() === 'all';
                    return matchesGrade && matchesMonth;
                  }).map((asgn) => {
                    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
                    const mySub = asgn.mySubmission;
                    const isGraded = mySub?.status === 'graded' && mySub?.marks !== null;
                    const isSubmitted = !!mySub;
                    const isOverdue = asgn.dueDate ? new Date() > new Date(asgn.dueDate) : false;

                    return (
                      <div key={asgn._id} className="p-5 border border-purple-100/80 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-800/80 hover:bg-purple-50/20 dark:hover:bg-slate-800 transition-all space-y-4 shadow-xs">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xl">📑</span>
                              <h5 className="font-extrabold text-gray-900 dark:text-white text-base">{asgn.title}</h5>
                              {asgn.weekNumber > 0 && (
                                <span className="bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                                  Week {asgn.weekNumber}
                                </span>
                              )}
                              {!asgn.isActive && (
                                <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-gray-200 dark:border-slate-600">
                                  Closed / Inactive
                                </span>
                              )}
                            </div>
                            {asgn.description && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 font-medium pl-7 line-clamp-2 leading-relaxed">
                                {asgn.description}
                              </p>
                            )}
                          </div>

                          {/* Badges / Due Date / Points */}
                          <div className="flex items-center gap-2 flex-wrap text-xs shrink-0 self-end sm:self-auto">
                            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-300 font-black rounded-xl border border-amber-200/60 dark:border-amber-800">
                              Max: {asgn.maxMarks || 100} Marks
                            </span>
                            {asgn.dueDate && (
                              <span className={`px-3 py-1 font-bold rounded-xl border flex items-center gap-1 ${
                                isOverdue ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-slate-700'
                              }`}>
                                <FaClock /> Due: {new Date(asgn.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Action Bar / Status */}
                        <div className="pt-3 border-t border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {asgn.attachmentUrl && (
                              <button
                                type="button"
                                onClick={() => downloadProtectedFile(`/files/assignment/${asgn._id}?download=true`, asgn.attachmentName || 'Question_Sheet.pdf')}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl text-xs font-extrabold transition border border-purple-200 dark:border-purple-800 cursor-pointer"
                              >
                                <FaCloudDownloadAlt className="text-sm" /> Question Sheet ({asgn.attachmentName || 'Download'})
                              </button>
                            )}

                            {!isTeacher && (
                              <div>
                                {isGraded ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    <FaAward className="text-emerald-600 dark:text-emerald-400" /> Graded: {mySub.marks}/{asgn.maxMarks || 100} Marks ({Math.round((mySub.marks / (asgn.maxMarks || 100)) * 100)}%)
                                  </span>
                                ) : isSubmitted ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                    <FaCheckCircle className="text-blue-600 dark:text-blue-400" /> Submitted (Awaiting Teacher Grading)
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                    ⏳ Pending Solution Submission
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right Buttons */}
                          <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                            {isTeacher ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenTeacherSubmissions(asgn)}
                                  className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 rounded-xl text-xs font-black transition cursor-pointer border border-indigo-200 dark:border-indigo-800 flex items-center gap-1.5"
                                >
                                  <FaClipboardCheck /> Submissions ({asgn.submissionsCount || 0})
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAssignment(asgn)}
                                  className="px-3.5 py-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 rounded-xl text-xs font-bold transition cursor-pointer border border-purple-200 dark:border-purple-800"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAssignment(asgn._id)}
                                  className="px-3.5 py-1.5 bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-xl text-xs font-bold transition cursor-pointer border border-red-200 dark:border-red-800"
                                >
                                  Delete
                                </button>
                              </>
                            ) : (
                              <>
                                {isGraded && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFeedbackModal(mySub)}
                                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1.5"
                                  >
                                    <FaCommentDots /> View Remarks & Feedback
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenSubmitModal(asgn)}
                                  className={`px-4 py-2 rounded-xl text-xs font-black transition cursor-pointer shadow-xs flex items-center gap-1.5 ${
                                    isSubmitted
                                      ? 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-white'
                                      : 'bg-purple-700 hover:bg-purple-800 text-white'
                                  }`}
                                >
                                  <FaFileUpload /> {isSubmitted ? 'Resubmit / Update Solution' : 'Submit Solution'}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 5: QUIZZES & ASSESSMENTS (Expandable) */}
          {/* ========================================================================= */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-200/90 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-200">
            <div
              onClick={() => toggleSection('quizzes')}
              className="w-full p-4 sm:p-5 flex items-center justify-between bg-white dark:bg-slate-900 hover:bg-gray-50/80 dark:hover:bg-slate-800/80 transition-colors text-left cursor-pointer select-none"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 flex items-center justify-center text-lg font-black shrink-0 shadow-inner">
                  📝
                </div>
                <div className="min-w-0">
                  <h4 className="font-extrabold text-base text-gray-900 dark:text-white leading-tight">
                    Quizzes & Assessments ({selectedGrade?.toLowerCase().startsWith('grade') ? selectedGrade : `Grade ${selectedGrade}`} — {selectedMonth})
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">Test your knowledge by attempting weekly interactive quiz assessments.</p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <span className="bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-black px-2.5 py-1 rounded-xl">
                  {quizzes.filter(q => {
                    const matchesGrade = q.grade === selectedGrade;
                    const matchesMonth = !q.month || selectedMonth.toLowerCase().includes(q.month.toLowerCase()) || q.month.toLowerCase() === 'all';
                    return matchesGrade && matchesMonth;
                  }).length} {quizzes.filter(q => {
                    const matchesGrade = q.grade === selectedGrade;
                    const matchesMonth = !q.month || selectedMonth.toLowerCase().includes(q.month.toLowerCase()) || q.month.toLowerCase() === 'all';
                    return matchesGrade && matchesMonth;
                  }).length === 1 ? 'Quiz' : 'Quizzes'}
                </span>

                {isTeacherOrAdmin && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/course/${courseId}/create-quiz`);
                    }}
                    className="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                  >
                    <FaPlus className="text-[10px]" /> Create Quiz
                  </button>
                )}

                <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs transition">
                  {expandedSections.quizzes ? <FaChevronUp /> : <FaChevronDown />}
                </div>
              </div>
            </div>

            {expandedSections.quizzes && (
              <div className="p-5 pt-0 border-t border-gray-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900 animate-fadeIn">
                {quizzes.filter(q => {
                  const matchesGrade = q.grade === selectedGrade;
                  const matchesMonth = !q.month || selectedMonth.toLowerCase().includes(q.month.toLowerCase()) || q.month.toLowerCase() === 'all';
                  return matchesGrade && matchesMonth;
                }).length === 0 ? (
                  <div className="py-8 text-center text-gray-400 dark:text-gray-500 space-y-1 bg-gray-50/60 dark:bg-slate-800/40 rounded-2xl border border-dashed border-gray-200 dark:border-slate-800">
                    <p className="text-sm font-semibold">No quizzes available for {selectedGrade} ({selectedMonth}) yet.</p>
                    {isTeacherOrAdmin && (
                      <p
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold cursor-pointer hover:underline mt-1"
                        onClick={() => navigate(`/course/${courseId}/create-quiz`)}
                      >
                        + Click here to create a new quiz assessment
                      </p>
                    )}
                  </div>
                ) : (
                  quizzes.filter(q => {
                    const matchesGrade = q.grade === selectedGrade;
                    const matchesMonth = !q.month || selectedMonth.toLowerCase().includes(q.month.toLowerCase()) || q.month.toLowerCase() === 'all';
                    return matchesGrade && matchesMonth;
                  }).map((quiz) => {
                    const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
                    return (
                      <div key={quiz._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border border-gray-200/90 dark:border-slate-800 rounded-2xl hover:bg-gray-50/70 dark:hover:bg-slate-800/70 transition-all gap-4 bg-white dark:bg-slate-800/80 shadow-2xs">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-2xl bg-yellow-100 dark:bg-yellow-950/60 text-yellow-700 dark:text-yellow-300 text-xl flex items-center justify-center font-bold shrink-0 shadow-inner">
                            📝
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-extrabold text-gray-900 dark:text-white text-sm truncate">{quiz.title}</p>
                              {quiz.weekNumber !== undefined && quiz.weekNumber > 0 && (
                                <span className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                  Week {quiz.weekNumber}
                                </span>
                              )}
                              {!quiz.isActive && (
                                <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 text-[10px] font-extrabold px-2 py-0.5 rounded border border-gray-200 dark:border-slate-600">
                                  Inactive
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              Questions: {quiz.questions?.length} · Time: {quiz.timeLimit > 0 ? `${quiz.timeLimit} mins` : 'No limit'} · Pass Mark: {quiz.passingPercentage || 50}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap shrink-0">
                          {isTeacher ? (
                            <>
                              <button
                                onClick={() => handleToggleQuizActive(quiz._id)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${quiz.isActive
                                    ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800'
                                    : 'bg-green-50 dark:bg-green-950/60 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/60 border border-green-200 dark:border-green-800'
                                  }`}
                              >
                                {quiz.isActive ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => navigate(`/course/${courseId}/quiz/${quiz._id}/edit`)}
                                className="bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/60 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border border-purple-200 dark:border-purple-800"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => navigate(`/quiz/${quiz._id}/submissions`)}
                                className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border border-blue-200 dark:border-blue-800"
                              >
                                Submissions
                              </button>
                              <button
                                onClick={() => handleDeleteQuiz(quiz._id)}
                                className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/60 px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border border-red-200 dark:border-red-800"
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
            )}
          </div>

        </div>
      )}

      {showStudentPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-6xl h-[92vh] sm:h-[650px] rounded-2xl sm:rounded-3xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-3.5 sm:p-6 shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-slate-800 animate-fadeIn">
            {/* Modal Header */}
            <div className="mb-3 sm:mb-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3 sm:pb-4 gap-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base sm:text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight truncate">{selectedEnrollGrade && (selectedEnrollGrade.toLowerCase().startsWith('grade') ? selectedEnrollGrade : `Grade ${selectedEnrollGrade}`)} Student Management</h3>
                <p className="text-[11px] sm:text-sm text-gray-500 dark:text-gray-400 truncate">Manage enrollment, class attendance, and fee payments.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowStudentPicker(false)}
                className="rounded-xl border border-gray-300 dark:border-slate-700 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                Close
              </button>
            </div>

            {/* Split Pane Work Area: Stacked on mobile (< lg), split side-by-side on desktop (lg:) */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden gap-4 lg:gap-0">

              {/* LEFT PANE: Student List & Search & Filters */}
              <div className="w-full lg:w-5/12 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 dark:border-slate-800 pb-4 lg:pb-0 lg:pr-4 overflow-visible lg:overflow-hidden shrink-0 lg:shrink">
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
              <div className="w-full lg:w-7/12 flex flex-col lg:pl-6 overflow-visible lg:overflow-hidden min-h-[280px] flex-1">
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
                className={`px-5 py-2.5 text-xs font-extrabold text-white rounded-xl transition shadow-md cursor-pointer ${deactivateConfirmGrade.isDeactive
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

              {/* Class / Grade Fee (LKR) */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Class / Grade Fee (LKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500">LKR</span>
                  <input
                    type="number"
                    min="0"
                    value={newGradeFee}
                    onChange={(e) => setNewGradeFee(e.target.value)}
                    placeholder={`e.g. ${course?.price || 2500}`}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white pl-12 pr-3.5 py-2 text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  />
                </div>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
                  Leave blank to use course default (LKR {(course?.price || 2500).toLocaleString()}).
                </p>
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

      {/* Edit Grade Details & Fee Modal */}
      {editGradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Edit Grade Details</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">Update class title and fee for {editGradeModal.gradeNumber}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditGradeModal(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateGradeDetails} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Grade Title</label>
                <input
                  value={editGradeModal.title}
                  onChange={(e) => setEditGradeModal({ ...editGradeModal, title: e.target.value })}
                  placeholder="e.g. Grade 8 or Theory Class"
                  className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white px-3.5 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Monthly Class Fee (LKR) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 dark:text-gray-500">LKR</span>
                  <input
                    type="number"
                    min="0"
                    value={editGradeModal.fee}
                    onChange={(e) => setEditGradeModal({ ...editGradeModal, fee: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-800 dark:text-white pl-12 pr-3.5 py-2 text-sm font-bold outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditGradeModal(null)}
                  className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#2d1b64] dark:bg-lumina-purple px-5 py-2 text-sm font-semibold text-white hover:bg-purple-900 transition shadow-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live Stream Setup & Management Modal with Scheduling and 16:9 Thumbnail Cropper */}
      {showLiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl ${isScheduledLive ? 'bg-gradient-to-br from-purple-600 to-indigo-700' : 'bg-gradient-to-br from-[#FF0000] to-[#CC0000]'} text-white flex items-center justify-center shadow-md shrink-0`}>
                  {isScheduledLive ? <FaCalendarAlt className="text-xl" /> : <FaYoutube className="text-2xl" />}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {isScheduledLive 
                      ? (currentLesson?.liveStream?.isScheduled ? 'Manage Scheduled Live Class' : 'Schedule YouTube Live Class')
                      : (currentLesson?.liveStream?.isLive ? 'Manage Active Live Class' : 'Start YouTube Live Class')}
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

            {/* Broadcast Type Switcher: Go Live Immediately vs Schedule for Later */}
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIsScheduledLive(false)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer ${
                  !isScheduledLive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-md shadow-red-500/25 ring-1 ring-red-400'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
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
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700'
                }`}
              >
                <FaCalendarAlt className={`text-sm ${isScheduledLive ? 'text-purple-200' : 'text-purple-600'}`} />
                <span>Schedule for Later</span>
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

              {/* Date & Time Pickers when Scheduling is Active */}
              {isScheduledLive && (
                <div className="p-4 bg-purple-50/70 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800 rounded-2xl space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
                    <FaCalendarCheck className="text-purple-600 dark:text-purple-400" />
                    <span>Select Scheduled Broadcast Date & Time</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Broadcast Date Picker */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <span>Broadcast Date</span>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">📅 Select Calendar</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="date"
                          min={new Date().toISOString().split('T')[0]}
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          onClick={(e) => {
                            try { e.target.showPicker?.(); } catch (err) {}
                          }}
                          className="w-full rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold text-gray-800 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 cursor-pointer shadow-2xs hover:border-purple-400 transition-all"
                          required={isScheduledLive}
                        />
                      </div>
                    </div>

                    {/* Broadcast Time Picker */}
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 flex items-center justify-between">
                        <span>Broadcast Time</span>
                        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold">⏰ Select Time & Scroll</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          onClick={(e) => {
                            try { e.target.showPicker?.(); } catch (err) {}
                          }}
                          className="w-full rounded-xl border border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-sm font-bold text-gray-800 dark:text-white outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 cursor-pointer shadow-2xs hover:border-purple-400 transition-all"
                          required={isScheduledLive}
                        />
                      </div>
                    </div>
                  </div>

                  <p className="text-[11px] text-purple-800/90 dark:text-purple-300/90 font-medium">
                    ⏱️ <strong>15-Minute Pre-Live Feature:</strong> The player unlocks automatically 15 minutes before this time with a countdown ticker, letting students test their audio & video.
                  </p>
                </div>
              )}

              {/* 16:9 Custom Thumbnail Picture Uploader with Cropper */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center justify-between">
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
                  <div className="relative rounded-2xl overflow-hidden border border-purple-200 dark:border-slate-700 shadow-md group">
                    <img
                      src={liveThumbnail}
                      alt="Live Thumbnail Preview"
                      className="w-full aspect-video object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
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
                        <FaTrash className="text-xs" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="w-full aspect-video rounded-2xl border-2 border-dashed border-purple-200 dark:border-slate-700 bg-purple-50/40 dark:bg-slate-800/40 hover:bg-purple-50 dark:hover:bg-slate-800 transition-all flex flex-col items-center justify-center gap-2 cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-400 flex items-center justify-center text-lg group-hover:scale-110 transition-transform">
                      <FaImage />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">Click to Upload 16:9 Thumbnail</p>
                      <p className="text-[10px] text-gray-400">Supports JPG, PNG, WEBP (Auto-crops to 1280x720)</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-800 gap-2">
                {currentLesson?.liveStream?.isLive ? (
                  <button
                    type="button"
                    onClick={() => handleEndLiveStream()}
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
                    disabled={isPublishingLive}
                    onClick={() => {
                      setIsPublishingLive(false);
                      setShowLiveModal(false);
                    }}
                    className="rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-50"
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
                    } text-white font-extrabold text-xs sm:text-sm transition-all duration-300 shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2 border border-white/20 transform hover:-translate-y-0.5 active:scale-95`}
                  >
                    {isScheduledLive ? <FaCalendarAlt className="text-sm" /> : <FaYoutube className="text-xl text-white" />}
                    <span>
                      {isPublishingLive 
                        ? (isScheduledLive ? 'Scheduling...' : 'Publishing...') 
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
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3.5 border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 flex items-center justify-center text-2xl shrink-0 shadow-inner">
                ⏹️
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">Conclude Live Stream?</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Class: {selectedGrade} • {course?.title}</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              Ending this broadcast will immediately disconnect active student viewers and conclude the live attendance tracking.
            </p>

            {/* Save as recorded video lesson option */}
            <div className="p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-800/60 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveLiveAsVideo}
                  onChange={(e) => setSaveLiveAsVideo(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-purple-600 rounded border-purple-300 focus:ring-purple-500 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-black text-purple-950 dark:text-purple-200 block">
                    🎬 Save stream as a recorded Video Lesson
                  </span>
                  <span className="text-[11px] text-purple-800/80 dark:text-purple-300/80 block mt-0.5">
                    Automatically publishes this live recording to the Video Lessons tab for students to re-watch later.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isEndingStream}
                onClick={() => {
                  setIsEndingStream(false);
                  setShowEndStreamConfirmModal(false);
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-black hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                Keep Streaming
              </button>
              <button
                type="button"
                disabled={isEndingStream}
                onClick={() => confirmEndLiveStream(saveLiveAsVideo)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-500/20 transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isEndingStream ? 'Ending Stream...' : 'Yes, End Live Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE STREAM ENDED SUCCESS & SUMMARY MODAL */}
      {showEndStreamSuccessModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn select-none"
          onClick={() => setShowEndStreamSuccessModal(false)}
        >
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 animate-scaleUp text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-3xl shadow-inner border border-emerald-200 dark:border-emerald-800">
              🎉
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Live Class Concluded!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Grade {endedStreamSummary?.grade || selectedGrade} • {course?.title}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span>Broadcast Concluded & Saved</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {endedStreamSummary?.savedAsVideo ? (
                  <span>✅ The live stream recording was published directly to the <strong>Video Lessons</strong> tab for students to re-watch anytime.</span>
                ) : (
                  <span>The live class stream has concluded and student attendance pings have stopped.</span>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndStreamSuccessModal(false)}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-black shadow-lg shadow-purple-600/30 transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Done & Return to Workspace</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: POST / EDIT ANNOUNCEMENT (Teacher/Admin) */}
      {/* ========================================================================= */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-xl flex items-center justify-center font-black">
                  📢
                </span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {currentLesson?.teacherMessage ? 'Update Announcement' : 'Post New Announcement'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Week {activeWeek} • Grade {selectedGrade}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300">
                Announcement Message <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={5}
                placeholder="Type your message, homework expectations, or classroom notices here..."
                value={editingMessage}
                onChange={(e) => setEditingMessage(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-medium text-xs leading-relaxed resize-none"
                required
              />
              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                💡 This announcement will be visible to all enrolled students for Week {activeWeek}.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAnnouncementModal(false)}
                className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMessage}
                className="px-6 py-2.5 bg-purple-700 text-white font-black rounded-xl hover:bg-purple-800 transition shadow-md shadow-purple-200 dark:shadow-none cursor-pointer text-xs"
              >
                Save Announcement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD VIDEO LESSON (Teacher/Admin) */}
      {/* ========================================================================= */}
      {showAddVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xl flex items-center justify-center font-black">
                  🎬
                </span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Add Video Lesson</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Week {activeWeek} • Grade {selectedGrade}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddVideoModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVideo} className="space-y-4 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">Video Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Unit 3 - Lecture 1 (Theory)"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-emerald-600 font-semibold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">Video Link (YouTube URL or Direct Link) <span className="text-red-500">*</span></label>
                <input
                  type="url"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-emerald-600 font-medium text-xs"
                  required
                />
              </div>

              <div className="bg-purple-50/60 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-purple-100 dark:border-slate-700 space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FaDownload className="text-purple-600 dark:text-purple-400" /> Student Download Policy:
                </label>
                <select
                  value={videoDownloadType}
                  onChange={(e) => setVideoDownloadType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-800 dark:text-white rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
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
                    className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none text-gray-800 dark:text-white"
                    required
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVideoModal(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition shadow-md shadow-emerald-200 dark:shadow-none cursor-pointer text-xs"
                >
                  + Add Video Lesson
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: UPLOAD PDF MATERIAL (Teacher/Admin) */}
      {/* ========================================================================= */}
      {showAddPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-xl flex items-center justify-center font-black">
                  📕
                </span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Upload PDF Note / Material</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Week {activeWeek} • Grade {selectedGrade}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddPdfModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadPdf} className="space-y-4 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">Document Title (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Unit 3 - Summary Note & Formulas"
                  value={pdfTitle}
                  onChange={(e) => setPdfTitle(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-semibold text-sm"
                />
              </div>

              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">PDF File (Max 5MB) <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => setPdfFile(e.target.files[0])}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none text-xs"
                  required
                />
              </div>

              <div className="bg-purple-50/60 dark:bg-slate-800/80 p-3.5 rounded-2xl border border-purple-100 dark:border-slate-700 space-y-2">
                <label className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                  <FaDownload className="text-purple-600 dark:text-purple-400" /> Student Download Policy:
                </label>
                <select
                  value={pdfDownloadType}
                  onChange={(e) => setPdfDownloadType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-xs font-bold text-gray-800 dark:text-white rounded-xl p-2.5 outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
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
                    className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-slate-700 text-xs font-bold rounded-xl p-2.5 outline-none text-gray-800 dark:text-white"
                    required
                  />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPdfModal(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingPdf}
                  className="px-6 py-2.5 bg-purple-700 hover:bg-purple-800 text-white font-black rounded-xl transition shadow-md shadow-purple-200 dark:shadow-none cursor-pointer text-xs disabled:opacity-50"
                >
                  {isUploadingPdf ? 'Uploading...' : '+ Upload PDF'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE / EDIT ASSIGNMENT (Teacher/Admin) */}
      {/* ========================================================================= */}
      {showAssignmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 text-xl flex items-center justify-center font-black">
                  📑
                </span>
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    {editingAssignment ? 'Edit Homework Assignment' : 'Create New Class Assignment'}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Grade: {selectedGrade} • {course?.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowAssignmentModal(false); setEditingAssignment(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">Assignment Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  placeholder="e.g. Unit 3 Mechanics & Kinetics Homework"
                  value={asgnFormData.title}
                  onChange={(e) => setAsgnFormData({ ...asgnFormData, title: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-semibold text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">Instructions / Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Detailed guidelines, reference textbook pages, or formatting rules..."
                  value={asgnFormData.description}
                  onChange={(e) => setAsgnFormData({ ...asgnFormData, description: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-medium text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1">Curriculum Month</label>
                  <select
                    value={asgnFormData.month}
                    onChange={(e) => setAsgnFormData({ ...asgnFormData, month: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-bold text-xs"
                  >
                    <option value="">All Months</option>
                    {MONTH_NAMES.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1">Session Week</label>
                  <select
                    value={asgnFormData.weekNumber}
                    onChange={(e) => setAsgnFormData({ ...asgnFormData, weekNumber: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-bold text-xs"
                  >
                    <option value={0}>All Weeks (General)</option>
                    <option value={1}>Week 1</option>
                    <option value={2}>Week 2</option>
                    <option value={3}>Week 3</option>
                    <option value={4}>Week 4</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1">Maximum Marks</label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={asgnFormData.maxMarks}
                    onChange={(e) => setAsgnFormData({ ...asgnFormData, maxMarks: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-bold text-xs"
                  />
                </div>

                <div>
                  <label className="block text-gray-800 dark:text-gray-200 mb-1">Passing Marks Threshold</label>
                  <input
                    type="number"
                    min="1"
                    max={asgnFormData.maxMarks || 100}
                    value={asgnFormData.passingMarks}
                    onChange={(e) => setAsgnFormData({ ...asgnFormData, passingMarks: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">Submission Due Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={asgnFormData.dueDate}
                  onChange={(e) => setAsgnFormData({ ...asgnFormData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-bold text-xs"
                />
              </div>

              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">
                  Question Sheet / Resource Attachment (PDF, Word, Image up to 10MB)
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
                  onChange={(e) => setAsgnFormData({ ...asgnFormData, attachmentFile: e.target.files[0] })}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none text-xs"
                />
                {editingAssignment?.attachmentName && !asgnFormData.attachmentFile && (
                  <p className="text-[11px] text-purple-700 dark:text-purple-400 font-bold mt-1">
                    Current attachment: {editingAssignment.attachmentName}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asgnFormData.allowLateSubmissions}
                    onChange={(e) => setAsgnFormData({ ...asgnFormData, allowLateSubmissions: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Allow Late Submissions</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asgnFormData.isActive}
                    onChange={(e) => setAsgnFormData({ ...asgnFormData, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span>Active & Accepting Submissions</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowAssignmentModal(false); setEditingAssignment(null); }}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingAssignment}
                  className="px-6 py-2.5 bg-purple-700 text-white font-black rounded-xl hover:bg-purple-800 transition shadow-md shadow-purple-200 dark:shadow-none cursor-pointer disabled:opacity-50"
                >
                  {isSavingAssignment ? 'Saving...' : editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STUDENT SUBMIT SOLUTION */}
      {/* ========================================================================= */}
      {showSubmitModal && selectedAssignmentForSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 dark:text-white">Submit Homework Solution</h3>
                <p className="text-xs text-purple-700 dark:text-purple-400 font-bold mt-0.5">{selectedAssignmentForSubmit.title}</p>
              </div>
              <button
                type="button"
                onClick={() => { setShowSubmitModal(false); setSelectedAssignmentForSubmit(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50/60 dark:bg-purple-950/40 p-4 rounded-2xl border border-purple-100 dark:border-purple-800/60 text-xs space-y-1.5 text-purple-950 dark:text-purple-200 font-medium">
              <div className="flex justify-between">
                <span>Maximum Marks:</span>
                <span className="font-extrabold">{selectedAssignmentForSubmit.maxMarks || 100} Marks</span>
              </div>
              {selectedAssignmentForSubmit.dueDate && (
                <div className="flex justify-between">
                  <span>Deadline:</span>
                  <span className="font-extrabold text-red-700 dark:text-red-400">
                    {new Date(selectedAssignmentForSubmit.dueDate).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleSubmitSolution} className="space-y-4 text-xs font-bold text-gray-700 dark:text-gray-300">
              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">
                  Attach Solution File (PDF, Word, Image, Zip up to 10MB) <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.zip"
                  onChange={(e) => setSolutionFile(e.target.files[0])}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-800 dark:text-gray-200 mb-1">Note to Instructor (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Any questions or explanatory notes regarding your solution..."
                  value={studentNote}
                  onChange={(e) => setStudentNote(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-2xl border border-gray-200 dark:border-slate-700 outline-none focus:border-purple-600 font-medium text-xs resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowSubmitModal(false); setSelectedAssignmentForSubmit(null); }}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSolution}
                  className="px-6 py-2.5 bg-purple-700 text-white font-black rounded-xl hover:bg-purple-800 transition shadow-md shadow-purple-200 dark:shadow-none cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <FaPaperPlane /> {isSubmittingSolution ? 'Submitting...' : 'Upload & Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: STUDENT VIEW GRADED FEEDBACK */}
      {/* ========================================================================= */}
      {showFeedbackModal && selectedSubmissionForFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-9 h-9 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 flex items-center justify-center text-lg">
                  🏆
                </span>
                <div>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">Assignment Evaluation</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">Grading Marks & Teacher Remarks</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { setShowFeedbackModal(false); setSelectedSubmissionForFeedback(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
              <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Score Achieved</span>
              <div className="text-3xl font-black text-emerald-950 dark:text-emerald-200">
                {selectedSubmissionForFeedback.marks} <span className="text-base text-gray-400 font-bold">/ {selectedSubmissionForFeedback.assignment?.maxMarks || 100}</span>
              </div>
              <div className="text-xs font-black text-emerald-800 dark:text-emerald-300">
                {Math.round((selectedSubmissionForFeedback.marks / (selectedSubmissionForFeedback.assignment?.maxMarks || 100)) * 100)}% Grade
              </div>
            </div>

            {selectedSubmissionForFeedback.feedback ? (
              <div className="bg-amber-50/70 dark:bg-amber-950/40 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-800/80 space-y-1.5">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <FaCommentDots className="text-amber-500" /> Instructor's Remarks:
                </span>
                <p className="text-xs text-amber-950 dark:text-amber-200 font-semibold leading-relaxed">
                  "{selectedSubmissionForFeedback.feedback}"
                </p>
              </div>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center">No additional remarks written by instructor.</p>
            )}

            <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium space-y-1 border-t border-gray-100 dark:border-slate-800 pt-3">
              <div>Graded on: {selectedSubmissionForFeedback.gradedAt ? new Date(selectedSubmissionForFeedback.gradedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}</div>
              <div>Submitted file: <span className="font-bold text-gray-700 dark:text-gray-300">{selectedSubmissionForFeedback.fileName}</span></div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setShowFeedbackModal(false); setSelectedSubmissionForFeedback(null); }}
                className="px-6 py-2.5 bg-purple-700 text-white font-black rounded-xl hover:bg-purple-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TEACHER SUBMISSIONS & GRADING REVIEW DRAWER */}
      {/* ========================================================================= */}
      {showTeacherSubmissionsDrawer && selectedAssignmentForTeacherSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-slate-800 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex justify-between items-start border-b border-gray-100 dark:border-slate-800 pb-4 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📋</span>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">
                    Submissions: {selectedAssignmentForTeacherSubmissions.title}
                  </h3>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">
                  Grade {selectedAssignmentForTeacherSubmissions.grade} • Max Marks: {selectedAssignmentForTeacherSubmissions.maxMarks || 100} • Total Submissions: {teacherSubmissionsData.totalSubmissions || 0} ({teacherSubmissionsData.gradedCount || 0} Graded)
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setShowTeacherSubmissionsDrawer(false); setSelectedAssignmentForTeacherSubmissions(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-xl p-2 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTeacherSubmissionsFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${teacherSubmissionsFilter === 'all' ? 'bg-purple-900 dark:bg-purple-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  All ({teacherSubmissionsData.totalSubmissions || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherSubmissionsFilter('submitted')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${teacherSubmissionsFilter === 'submitted' ? 'bg-purple-900 dark:bg-purple-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  Pending Grading ({(teacherSubmissionsData.totalSubmissions || 0) - (teacherSubmissionsData.gradedCount || 0)})
                </button>
                <button
                  type="button"
                  onClick={() => setTeacherSubmissionsFilter('graded')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${teacherSubmissionsFilter === 'graded' ? 'bg-purple-900 dark:bg-purple-700 text-white' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300'
                    }`}
                >
                  Graded ({teacherSubmissionsData.gradedCount || 0})
                </button>
              </div>

              <input
                type="text"
                placeholder="Search student name or reg no..."
                value={teacherSubmissionsSearch}
                onChange={(e) => setTeacherSubmissionsSearch(e.target.value)}
                className="px-4 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 outline-none text-xs font-medium w-full sm:w-60"
              />
            </div>

            {/* Submissions List */}
            {loadingTeacherSubmissions ? (
              <div className="py-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-600 mx-auto"></div>
              </div>
            ) : (teacherSubmissionsData.submissions || []).length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-gray-500 font-semibold text-sm">
                No student submissions found for this filter.
              </div>
            ) : (
              <div className="space-y-4">
                {(teacherSubmissionsData.submissions || [])
                  .filter(sub => {
                    if (teacherSubmissionsFilter === 'submitted') return sub.status !== 'graded';
                    if (teacherSubmissionsFilter === 'graded') return sub.status === 'graded';
                    return true;
                  })
                  .filter(sub => {
                    if (!teacherSubmissionsSearch.trim()) return true;
                    const q = teacherSubmissionsSearch.toLowerCase();
                    const s = sub.student;
                    return s?.name?.toLowerCase().includes(q) || s?.registrationNumber?.toLowerCase().includes(q);
                  })
                  .map(sub => {
                    const student = sub.student;
                    const currentMarks = gradingInputs[sub._id]?.marks ?? (sub.marks !== null ? sub.marks : '');
                    const currentFeedback = gradingInputs[sub._id]?.feedback ?? (sub.feedback || '');
                    const isSaving = isSavingGradeMap[sub._id];

                    return (
                      <div key={sub._id} className="p-5 border border-gray-200 dark:border-slate-800 rounded-2xl bg-gray-50/50 dark:bg-slate-800/60 space-y-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-purple-200 dark:bg-purple-900 text-purple-900 dark:text-purple-200 font-black text-sm flex items-center justify-center">
                              {student?.name?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <h5 className="font-black text-gray-900 dark:text-white text-sm">{student?.name || 'Enrolled Student'}</h5>
                              <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">Reg: {student?.registrationNumber || 'N/A'} • {student?.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-xs">
                            {sub.isLate && (
                              <span className="px-2.5 py-0.5 bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 font-black rounded-full border border-red-200 dark:border-red-800">
                                ⏰ LATE SUBMISSION
                              </span>
                            )}
                            <span className="text-gray-500 dark:text-gray-400 font-medium">
                              Submitted: {new Date(sub.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>

                        {/* Student Note */}
                        {sub.studentNote && (
                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-gray-200 dark:border-slate-700 text-xs text-gray-700 dark:text-gray-300">
                            <span className="font-bold text-gray-500 dark:text-gray-400 block mb-0.5">Student Note:</span>
                            "{sub.studentNote}"
                          </div>
                        )}

                        {/* Solution File Download */}
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => downloadProtectedFile(`/files/submission/${sub._id}?download=true`, sub.fileName || 'student_solution.pdf')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black transition shadow-xs cursor-pointer"
                          >
                            <FaCloudDownloadAlt /> Download Student Solution ({sub.fileName || 'Solution File'})
                          </button>
                        </div>

                        {/* Inline Grading Form */}
                        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-purple-100 dark:border-slate-800 space-y-3">
                          <span className="text-xs font-black text-purple-950 dark:text-purple-300 uppercase tracking-wider block">
                            Grade & Evaluation (Max: {selectedAssignmentForTeacherSubmissions.maxMarks || 100} Marks)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Awarded Marks</label>
                              <input
                                type="number"
                                min="0"
                                max={selectedAssignmentForTeacherSubmissions.maxMarks || 100}
                                placeholder="e.g. 85"
                                value={currentMarks}
                                onChange={(e) => setGradingInputs(prev => ({
                                  ...prev,
                                  [sub._id]: { ...prev[sub._id], marks: e.target.value }
                                }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 font-extrabold text-sm outline-none focus:border-purple-600"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Teacher Remarks / Feedback</label>
                              <input
                                type="text"
                                placeholder="e.g. Great structured arguments! Check question 4 calculation."
                                value={currentFeedback}
                                onChange={(e) => setGradingInputs(prev => ({
                                  ...prev,
                                  [sub._id]: { ...prev[sub._id], feedback: e.target.value }
                                }))}
                                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-slate-700 text-xs font-medium outline-none focus:border-purple-600"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveGrade(sub._id)}
                              disabled={isSaving}
                              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                            >
                              <FaSave /> {isSaving ? 'Saving...' : sub.status === 'graded' ? 'Update Grade' : 'Save Grade'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: MATERIAL DOWNLOAD SETTINGS (Teacher/Admin) */}
      {/* ========================================================================= */}
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
                type="button"
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

      {/* Embedded Video Player Modal */}
      {activeVideoModal && (
        <VideoPlayerModal
          video={activeVideoModal}
          onClose={() => setActiveVideoModal(null)}
        />
      )}
      {/* COURSE RATINGS & REVIEWS MODAL */}
      {showReviewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-7 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative text-slate-800 dark:text-white">
            <button
              onClick={() => setShowReviewsModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <FaTimes />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center text-2xl shrink-0 shadow-xs">
                <FaStar />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-white">Course & Instructor Reviews</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {course?.title} {course?.instructor?.name ? `• 👨‍🏫 ${course.instructor.name}` : ''}
                </p>
              </div>
            </div>

            {/* Rating Overview Box */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 mb-5">
              <div className="flex flex-col items-center justify-center text-center">
                <span className="text-4xl font-black text-slate-800 dark:text-white">{avgRating}</span>
                <div className="flex items-center gap-1 text-amber-400 my-1 text-base">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <FaStar
                      key={star}
                      className={star <= Math.round(Number(avgRating)) ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400 font-bold">
                  {totalReviews} Student Review{totalReviews !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="sm:col-span-2 space-y-1.5 justify-center flex flex-col">
                {[5, 4, 3, 2, 1].map((stars) => {
                  const count = ratingBreakdown[stars] || 0;
                  const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <span className="w-8 font-bold text-slate-600 dark:text-slate-300 text-[11px] shrink-0">{stars} ★</span>
                      <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-[10px] font-bold text-slate-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Student Review Submission Form */}
            {user?.role === 'student' && (
              <form onSubmit={handleSubmitCourseReview} className="mb-6 p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800/50 space-y-3">
                <h4 className="text-sm font-black text-purple-950 dark:text-white flex items-center gap-2">
                  <span>✍️</span> {myReview ? 'Update Your Rating & Feedback' : 'Rate This Course & Instructor'}
                </h4>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Your Rating:</span>
                  <div className="flex items-center gap-1.5 text-2xl">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star)}
                        onMouseEnter={() => setHoverRatingInput(star)}
                        onMouseLeave={() => setHoverRatingInput(0)}
                        className="transition-transform hover:scale-125 cursor-pointer p-0.5"
                      >
                        <FaStar
                          className={
                            star <= (hoverRatingInput || ratingInput)
                              ? 'text-amber-400'
                              : 'text-slate-300 dark:text-slate-600'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <textarea
                  rows="2"
                  value={reviewInputText}
                  onChange={(e) => setReviewInputText(e.target.value)}
                  placeholder="Write what you liked about this course or teacher..."
                  className="w-full px-3.5 py-2 rounded-xl border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmittingReview}
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-xs rounded-xl transition shadow-md cursor-pointer active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <FaCheck /> {isSubmittingReview ? 'Submitting...' : myReview ? 'Update Review' : 'Post Review'}
                  </button>
                </div>
              </form>
            )}

            {/* Reviews Stream */}
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400">
                All Student Reviews ({courseReviews.length})
              </h4>

              {courseReviews.length > 0 ? (
                courseReviews.map((rev) => (
                  <div
                    key={rev._id}
                    className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black text-xs shrink-0">
                          {(rev.student?.name || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h5 className="text-xs font-black text-slate-800 dark:text-white">{rev.student?.name || rev.studentName || 'Student'}</h5>
                          <span className="text-[10px] text-slate-400">{rev.student?.grade || 'Enrolled Student'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-800/50 text-[11px] font-extrabold">
                        <FaStar /> {rev.rating}.0
                      </div>
                    </div>
                    {rev.review && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 font-medium italic pl-1 border-l-2 border-purple-300 dark:border-purple-700">
                        "{rev.review}"
                      </p>
                    )}
                    <span className="text-[9px] text-slate-400 font-semibold block text-right">
                      {rev.createdAt ? new Date(rev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 italic text-xs bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                  No student reviews posted yet. Be the first to share feedback!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseDetails;