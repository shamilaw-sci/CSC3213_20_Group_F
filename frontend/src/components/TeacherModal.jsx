import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { 
  FaTimes, FaChalkboardTeacher, FaBookOpen, FaEnvelope, 
  FaEdit, FaCamera, FaSave, FaPhoneAlt, FaCheck, FaAward, FaImage, FaUpload, FaTrash, 
  FaGraduationCap, FaArrowLeft, FaExternalLinkAlt, FaChevronDown, FaChevronUp, FaTag, FaPlus, FaPalette,
  FaYoutube, FaFacebook, FaInstagram, FaWhatsapp, FaGlobe, FaLinkedin, FaTelegram,
  FaLock, FaLockOpen
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../utils/api';
import { getMediaUrl } from '../utils/mediaUrl';

const createImage = (url) => new Promise((resolve, reject) => {
  const image = new Image();
  image.addEventListener('load', () => resolve(image));
  image.addEventListener('error', (error) => reject(error));
  image.setAttribute('crossOrigin', 'anonymous');
  image.src = url;
});

const getCroppedImg = async (imageSrc, pixelCrop, aspect = 1) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  let targetWidth = aspect === 1 ? 600 : 1200;
  let targetHeight = aspect === 1 ? 600 : 400;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return canvas.toDataURL('image/jpeg', 0.88);
};

const parseTag = (tag) => {
  if (typeof tag === 'string' && tag.includes('::')) {
    const parts = tag.split('::');
    return {
      text: parts[0] || '',
      bg: parts[1] || '#8b5cf6',
      color: parts[2] || '#ffffff',
      isCustomColor: true
    };
  }
  return {
    text: tag,
    bg: null,
    color: null,
    isCustomColor: false
  };
};

const getImageUrl = (url) => getMediaUrl(url);

const renderHighlightedText = (text) => {
  if (!text) return text;
  const parts = text.split(/(\[[^\]]+\])/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('[') && part.endsWith(']')) {
      return (
        <mark key={pIdx} className="bg-amber-300 text-amber-950 font-black px-2 py-0.5 rounded-md border border-amber-400/90 shadow-xs inline-block mx-0.5 animate-pulse">
          {part}
        </mark>
      );
    }
    return part;
  });
};

const renderFormattedBio = (text, isPreview = false) => {
  if (!text) return null;
  const cleanText = text.trim().replace(/^"\s*/, '').replace(/\s*"$/, '');
  const lines = cleanText.split('\n').map(l => l.trim()).filter(Boolean);

  return (
    <div className="bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/40 p-5 rounded-2xl border border-purple-100/90 shadow-sm space-y-3">
      {lines.map((line, idx) => {
        const isHeader = (line.startsWith('**') && line.endsWith('**')) || line.startsWith('🔬') || line.startsWith('🎓') || line.startsWith('⭐') || line.startsWith('🔥') || line.startsWith('💡');
        const content = line.replace(/\*\*/g, '');

        if (isHeader) {
          return (
            <h5 key={idx} className="text-sm sm:text-base font-black text-purple-950 tracking-tight flex items-center gap-2 bg-purple-100/80 px-4 py-1.5 rounded-xl border border-purple-200/80 w-fit shadow-xs flex-wrap">
              <span>{isPreview ? renderHighlightedText(content) : content}</span>
            </h5>
          );
        }

        if (line.startsWith('•') || line.startsWith('-') || line.startsWith('*')) {
          return (
            <div key={idx} className="flex items-start gap-2 text-sm font-semibold text-gray-800 leading-relaxed pl-2">
              <span className="text-purple-600 font-black mt-0.5">✨</span>
              <span>{isPreview ? renderHighlightedText(line.replace(/^[•\-\*]\s*/, '')) : line.replace(/^[•\-\*]\s*/, '')}</span>
            </div>
          );
        }

        return (
          <p key={idx} className="text-sm font-medium text-gray-700 leading-relaxed font-sans">
            {isPreview ? renderHighlightedText(content) : content}
          </p>
        );
      })}
    </div>
  );
};

const CONTACT_TYPES = [
  { id: 'phone', label: 'Phone Number', icon: FaPhoneAlt, color: 'text-emerald-600', bg: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  { id: 'email', label: 'Email Address', icon: FaEnvelope, color: 'text-purple-600', bg: 'bg-purple-50 text-purple-800 border-purple-200' },
  { id: 'whatsapp', label: 'WhatsApp', icon: FaWhatsapp, color: 'text-green-600', bg: 'bg-green-50 text-green-800 border-green-200' },
  { id: 'youtube', label: 'YouTube Channel', icon: FaYoutube, color: 'text-red-600', bg: 'bg-red-50 text-red-800 border-red-200' },
  { id: 'facebook', label: 'Facebook Profile', icon: FaFacebook, color: 'text-blue-600', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'instagram', label: 'Instagram', icon: FaInstagram, color: 'text-pink-600', bg: 'bg-pink-50 text-pink-800 border-pink-200' },
  { id: 'website', label: 'Website / Portfolio', icon: FaGlobe, color: 'text-indigo-600', bg: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  { id: 'linkedin', label: 'LinkedIn', icon: FaLinkedin, color: 'text-sky-600', bg: 'bg-sky-50 text-sky-800 border-sky-200' },
  { id: 'telegram', label: 'Telegram', icon: FaTelegram, color: 'text-blue-500', bg: 'bg-blue-50 text-blue-800 border-blue-200' },
];

const PRESET_TAGS = [
  '🎓 Instructor',
  '✔ Verified Educator',
  '⭐ Senior Lecturer',
  '🏆 Master Educator',
  '🔬 Science Specialist',
  '🔥 Top Rated',
  '✨ Subject Head',
  '💎 Exam Panelist'
];

const SYMBOLS_LIST = [
  '🎓', '✔', '⭐', '🏆', '🔬', '🔥', '✨', '💎', 
  '🚀', '💡', '👑', '🎯', '📚', '🏅', '🥇', '🌟', 
  '⚡', '🌐', '💻', '🧠', '🎖️', '🎨', '📝', '📍'
];



const SAMPLE_COVER_BANNERS = [
  // Science
  { id: 'p1', title: 'Biology & Microscope', category: 'Science', url: '/sample-presets/p1.jpg' },
  { id: 'p2', title: 'DNA Structure & Genetics', category: 'Science', url: '/sample-presets/p2.jpg' },
  { id: 'p3', title: 'Chemistry Lab & Beakers', category: 'Science', url: '/sample-presets/p3.jpg' },
  { id: 'p4', title: 'Molecular Physics', category: 'Science', url: '/sample-presets/p4.jpg' },

  // Mathematics
  { id: 'p5', title: 'Algebra & Equations', category: 'Mathematics', url: '/sample-presets/p5.jpg' },
  { id: 'p6', title: 'Geometry & Angles', category: 'Mathematics', url: '/sample-presets/p6.jpg' },
  { id: 'p7', title: 'Calculus Chalkboard', category: 'Mathematics', url: '/sample-presets/p7.jpg' },

  // History
  { id: 'p8', title: 'Ancient Ruin Architecture', category: 'History', url: '/sample-presets/p8.jpg' },
  { id: 'p9', title: 'World History Map', category: 'History', url: '/sample-presets/p9.jpg' },
  { id: 'p10', title: 'Ancient Manuscripts', category: 'History', url: '/sample-presets/p10.jpg' },

  // English & Literature
  { id: 'p11', title: 'Classic Literature Library', category: 'English', url: '/sample-presets/p11.jpg' },
  { id: 'p12', title: 'Grammar & Writing Books', category: 'English', url: '/sample-presets/p12.jpg' },
  { id: 'p13', title: 'Creative Storytelling', category: 'English', url: '/sample-presets/p13.jpg' },

  // Sinhala & Culture
  { id: 'p14', title: 'Sri Lankan Heritage Temple', category: 'Sinhala', url: '/sample-presets/p14.jpg' },
  { id: 'p15', title: 'Ola Leaf Manuscripts', category: 'Sinhala', url: '/sample-presets/p15.jpg' },
  { id: 'p16', title: 'Sigiriya Rock Fortress', category: 'Sinhala', url: '/sample-presets/p16.jpg' },

  // Tamil & Culture
  { id: 'p17', title: 'Tamil Classical Literature', category: 'Tamil', url: '/sample-presets/p17.jpg' },
  { id: 'p18', title: 'Dravidian Architecture', category: 'Tamil', url: '/sample-presets/p18.jpg' },
  { id: 'p19', title: 'Traditional Culture Art', category: 'Tamil', url: '/sample-presets/p19.jpg' },

  // Health & Physical Education
  { id: 'p20', title: 'Human Anatomy & Fitness', category: 'Health', url: '/sample-presets/p20.jpg' },
  { id: 'p21', title: 'Sports & Physical Health', category: 'Health', url: '/sample-presets/p21.jpg' },
  { id: 'p22', title: 'Medical Science & Wellbeing', category: 'Health', url: '/sample-presets/p22.jpg' },

  // Nature & Environment
  { id: 'p23', title: 'Tropical Rainforest & Wildlife', category: 'Nature', url: '/sample-presets/p23.jpg' },
  { id: 'p24', title: 'Ocean Ecosystem & Reefs', category: 'Nature', url: '/sample-presets/p24.jpg' },
  { id: 'p25', title: 'Green Forest Canopy', category: 'Nature', url: '/sample-presets/p25.jpg' },

  // Physics
  { id: 'p26', title: 'Quantum Physics & Lasers', category: 'Physics', url: '/sample-presets/p26.jpg' },
  { id: 'p27', title: 'Astrophysics & Space', category: 'Physics', url: '/sample-presets/p27.jpg' },
  { id: 'p28', title: 'Thermodynamics & Energy', category: 'Physics', url: '/sample-presets/p28.jpg' },

  // Technology
  { id: 'p29', title: 'Computer Science & Code', category: 'Technology', url: '/sample-presets/p29.jpg' },
  { id: 'p30', title: 'Artificial Intelligence & Circuit', category: 'Technology', url: '/sample-presets/p30.jpg' },
  { id: 'p31', title: 'Robotics & Hardware', category: 'Technology', url: '/sample-presets/p31.jpg' },

  // Art & Music
  { id: 'p32', title: 'Fine Arts Palette & Canvas', category: 'Art & Music', url: '/sample-presets/p32.jpg' },
  { id: 'p33', title: 'Classical Music Notes', category: 'Art & Music', url: '/sample-presets/p33.jpg' },

  // General
  { id: 'p34', title: 'Graduation Cap & Diploma', category: 'General', url: '/sample-presets/p34.jpg' },
  { id: 'p35', title: 'Modern Classroom Setup', category: 'General', url: '/sample-presets/p35.jpg' }
];

const TeacherModal = ({ teacher, teacherId, isOpen, onClose }) => {
  const navigate = useNavigate();
  const profileFileInputRef = useRef(null);
  const coverFileInputRef = useRef(null);

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null); // Selected course for in-modal preview view
  const [showCoursesList, setShowCoursesList] = useState(false); // Toggle to show assigned courses on click

  // System Image Cropper States
  const [cropFile, setCropFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropSourceType, setCropSourceType] = useState('profile'); // 'profile' | 'cover'
  const [cropAspect, setCropAspect] = useState(1); // 1:1 for profile, 3:1 for cover

  const handleCropComplete = useCallback((croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const openCropperForSource = async (source, type = 'profile') => {
    try {
      let dataUrl = '';
      if (typeof source === 'string') {
        const res = await fetch(source);
        const blob = await res.blob();
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      } else if (source instanceof File || source instanceof Blob) {
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(source);
        });
      }

      if (dataUrl) {
        setCropFile(dataUrl);
        setCropSourceType(type);
        setCropAspect(type === 'profile' ? 1 : 3);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setIsCropping(true);
      }
    } catch (err) {
      console.error("Open cropper error:", err);
      toast.error("Failed to load image into System Cropper");
    }
  };

  const confirmCroppedImage = async () => {
    try {
      if (!croppedAreaPixels || !cropFile) return;
      const croppedBase64 = await getCroppedImg(cropFile, croppedAreaPixels, cropAspect);
      if (cropSourceType === 'profile') {
        setEditProfilePicture(croppedBase64);
        toast.success("Cropped Profile Photo updated!");
      } else {
        setEditCoverPicture(croppedBase64);
        toast.success("Cropped Cover Banner updated!");
      }
      setIsCropping(false);
    } catch (err) {
      console.error("Crop error:", err);
      toast.error("Failed to crop image.");
    }
  };

  // Admin Tag Management States
  const [teacherTags, setTeacherTags] = useState(['🎓 Instructor', '✔ Verified Educator']);
  const [isManagingTags, setIsManagingTags] = useState(false);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagBgColor, setCustomTagBgColor] = useState('#8b5cf6');
  const [customTagTextColor, setCustomTagTextColor] = useState('#ffffff');
  const [selectedCoverCategory, setSelectedCoverCategory] = useState('All');
  const [isSavingTags, setIsSavingTags] = useState(false);
  const [isImageEnlarged, setIsImageEnlarged] = useState(false); // Lightbox enlarge modal for profile picture

  // Form edit states
  const [editName, setEditName] = useState('');
  const [editQualifications, setEditQualifications] = useState('');
  const [qualificationsList, setQualificationsList] = useState(['']);
  const [contactsList, setContactsList] = useState([{ type: 'phone', value: '' }]);
  const [editBio, setEditBio] = useState('');
  const [editPhoneNumber, setEditPhoneNumber] = useState('');
  const [editProfilePicture, setEditProfilePicture] = useState('');
  const [editCoverPicture, setEditCoverPicture] = useState('');

  const parseQualifications = (qualData) => {
    if (!qualData) return [''];
    if (Array.isArray(qualData)) return qualData.length > 0 ? qualData : [''];
    const splitItems = String(qualData).split(/\n|;\s*/).map(s => s.trim()).filter(Boolean);
    return splitItems.length > 0 ? splitItems : [''];
  };

  const parseContactsList = (tData) => {
    if (!tData) return [{ type: 'phone', value: '' }];
    if (tData.contactsList && Array.isArray(tData.contactsList) && tData.contactsList.length > 0) {
      return tData.contactsList;
    }
    if (tData.contacts && Array.isArray(tData.contacts) && tData.contacts.length > 0) {
      return tData.contacts;
    }
    if (typeof tData.contacts === 'string' && tData.contacts.trim()) {
      try {
        const parsed = JSON.parse(tData.contacts);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {}
    }
    const list = [];
    if (tData.email) list.push({ type: 'email', value: tData.email });
    if (tData.phoneNumber) list.push({ type: 'phone', value: tData.phoneNumber });
    return list.length > 0 ? list : [{ type: 'phone', value: '' }];
  };

  const loggedInUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user')) || null;
    } catch {
      return null;
    }
  })();

  const activeTeacherId = teacherId || teacher?._id || teacher?.id;
  const currentTeacher = profileData?.teacher || teacher || {};

  const loggedInId = String(loggedInUser?.id || loggedInUser?._id || '');
  const targetTeacherId = String(activeTeacherId || teacher?._id || teacher?.id || currentTeacher?._id || currentTeacher?.id || '');

  // REQUIREMENT: Assigned teacher can edit their profile
  const isOwnProfile = Boolean(
    loggedInUser && 
    loggedInUser.role === 'teacher' && 
    (!targetTeacherId || 
     loggedInId === targetTeacherId ||
     (loggedInUser.email && currentTeacher?.email && String(loggedInUser.email).toLowerCase() === String(currentTeacher.email).toLowerCase()) ||
     (loggedInUser.name && currentTeacher?.name && String(loggedInUser.name).toLowerCase() === String(currentTeacher.name).toLowerCase()))
  );

  // STRICT REQUIREMENT: ONLY Admin can see "+ Manage Teacher Tags" button & edit tags
  const isAdminUser = Boolean(loggedInUser && loggedInUser.role === 'admin');



  const handleGradeClick = (g) => {
    const isDeactive = g.status === 'deactive' || g.isActive === false;
    const deactivatedByRole = g.deactivatedBy || 'admin';
    const cId = selectedCourse._id || selectedCourse.id;
    const gParam = encodeURIComponent(g.gradeNumber || g.title || '');

    // Admin can ALWAYS log inside
    if (isAdminUser) {
      onClose();
      navigate(`/course/${cId}?grade=${gParam}`);
      return;
    }

    if (isOwnProfile || loggedInUser?.role === 'teacher') {
      if (isDeactive && deactivatedByRole === 'admin') {
        toast.error("This grade stream was deactivated by Admin. You cannot access it.");
        return;
      }
      onClose();
      navigate(`/course/${cId}?grade=${gParam}`);
      return;
    }

    // Student cannot log inside if deactivated
    if (isDeactive) {
      toast.error("This grade stream is currently deactivated.");
      return;
    }

    onClose();
    navigate(`/course/${cId}?grade=${gParam}`);
  };

  useEffect(() => {
    if (!isOpen || !activeTeacherId) return;

    // ⚡ INSTANT UNBLOCKING LOAD: If teacher prop is passed, render it instantly (0ms) so modal pops up immediately!
    if (teacher) {
      setProfileData(prev => ({
        teacher: teacher,
        courses: prev?.courses || teacher.courses || [],
        totalStudentsCount: prev?.totalStudentsCount || teacher.totalStudentsCount || 0,
        totalCoursesCount: prev?.totalCoursesCount || (teacher.courses?.length || 0)
      }));
      populateEditForm(teacher);
      if (teacher.teacherTags && teacher.teacherTags.length > 0) {
        setTeacherTags(teacher.teacherTags);
      }
      setLoading(false); // Instant load without waiting!
    } else {
      setLoading(true);
    }

    const fetchTeacherProfile = async () => {
      try {
        const res = await api.get(`/auth/teacher-profile/${activeTeacherId}`);
        setProfileData(res.data);
        populateEditForm(res.data?.teacher);
        if (res.data?.teacher?.teacherTags && res.data.teacher.teacherTags.length > 0) {
          setTeacherTags(res.data.teacher.teacherTags);
        }
      } catch (err) {
        console.error("Failed to load teacher profile modal data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTeacherProfile();
    setIsEditing(false);
    setSelectedCourse(null);
    setShowCoursesList(false);
    setIsManagingTags(false);
  }, [isOpen, activeTeacherId]);

  const populateEditForm = (tData) => {
    if (!tData) return;
    setEditName(tData.name || '');
    setEditQualifications(tData.qualifications || '');
    setQualificationsList(parseQualifications(tData.qualifications));
    setContactsList(parseContactsList(tData));
    setEditBio(tData.bio || '');
    setEditPhoneNumber(tData.phoneNumber || '');
    setEditProfilePicture(tData.profilePicture || '');
    setEditCoverPicture(tData.coverPicture || '');
  };

  const handleImageChange = (e, type = 'profile') => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo size should be under 5MB");
      return;
    }

    openCropperForSource(file, type);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Teacher name cannot be empty");
      return;
    }

    setIsSaving(true);
    try {
      const finalQualifications = qualificationsList
        .map(q => q.trim())
        .filter(Boolean)
        .join('\n');

      const cleanedContacts = contactsList
        .map(c => ({ type: c.type, value: c.value.trim() }))
        .filter(c => Boolean(c.value));

      const primaryPhoneObj = cleanedContacts.find(c => c.type === 'phone' || c.type === 'whatsapp');

      const payload = {
        name: editName.trim(),
        qualifications: finalQualifications,
        contactsList: cleanedContacts,
        contacts: JSON.stringify(cleanedContacts),
        phoneNumber: primaryPhoneObj ? primaryPhoneObj.value : editPhoneNumber.trim(),
        bio: editBio.trim(),
        profilePicture: editProfilePicture,
        coverPicture: editCoverPicture
      };

      const res = await api.put(`/auth/teacher-profile/${activeTeacherId}`, payload);
      
      toast.success("Teacher profile updated successfully!");

      const updatedTeacher = res.data?.teacher || {
        ...profileData?.teacher,
        ...payload
      };

      setProfileData(prev => ({
        ...prev,
        teacher: updatedTeacher,
        courses: (prev?.courses || []).map(c => ({
          ...c,
          instructor: typeof c.instructor === 'object' && c.instructor !== null ? {
            ...c.instructor,
            name: updatedTeacher.name,
            profilePicture: updatedTeacher.profilePicture
          } : c.instructor
        }))
      }));

      if (isOwnProfile && loggedInUser) {
        const updatedLocalUser = {
          ...loggedInUser,
          name: updatedTeacher.name,
          profilePicture: updatedTeacher.profilePicture
        };
        localStorage.setItem('user', JSON.stringify(updatedLocalUser));
        window.dispatchEvent(new Event('storage'));
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedLocalUser }));
      }

      window.dispatchEvent(new Event('teacherProfileUpdated'));
      setIsEditing(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update teacher profile");
      console.error("Save profile error:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Tag Management Handlers (Admin Only)
  const handleAddTag = (tagText, isPreset = false) => {
    if (!tagText.trim()) return;
    const trimmed = tagText.trim();
    
    // Construct final tag string (if custom color selected, encode as text::bg::color)
    const finalTag = isPreset ? trimmed : `${trimmed}::${customTagBgColor}::${customTagTextColor}`;

    // Check duplicate by tag text
    const alreadyExists = teacherTags.some(t => parseTag(t).text.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) {
      toast.error("Tag already added");
      return;
    }
    setTeacherTags(prev => [...prev, finalTag]);
    setCustomTagInput('');
    toast.success(`Tag "${trimmed}" added with custom colors!`);
  };

  const handleRemoveTag = (tagToRemove) => {
    setTeacherTags(prev => prev.filter(t => t !== tagToRemove));
  };

  const handleSaveTags = async () => {
    setIsSavingTags(true);
    try {
      const res = await api.put(`/auth/teacher-tags/${activeTeacherId}`, { tags: teacherTags });
      toast.success("Teacher tags saved successfully!");
      if (res.data?.teacherTags) {
        setTeacherTags(res.data.teacherTags);
      }
      setProfileData(prev => ({
        ...prev,
        teacher: {
          ...prev?.teacher,
          teacherTags: res.data?.teacherTags || teacherTags
        }
      }));
      setIsManagingTags(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to save teacher tags");
      console.error("Save tags error:", err);
    } finally {
      setIsSavingTags(false);
    }
  };

  const handleOpenFullCoursePage = (courseId) => {
    onClose();
    if (window.location.pathname === `/course/${courseId}`) {
      window.location.reload();
    } else {
      navigate(`/course/${courseId}`);
    }
  };

  if (!isOpen) return null;

  const courses = profileData?.courses || [];
  const displayCover = isEditing ? editCoverPicture : currentTeacher?.coverPicture;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-100 rounded-3xl shadow-2xl overflow-y-auto max-h-[92vh] border border-purple-100/50 dark:border-slate-800 custom-scrollbar">
        
        {/* Floating Top-Right Red Cross Close Button (Compact Size) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-50 bg-red-600 hover:bg-red-700 active:scale-95 text-white w-8 h-8 rounded-full shadow-md border border-white dark:border-slate-700 flex items-center justify-center transition-all duration-200 cursor-pointer group/close"
          title="Close Profile"
          aria-label="Close Profile"
        >
          <FaTimes className="text-sm group-hover/close:rotate-90 transition-transform duration-200" />
        </button>

        {/* Cover Banner (Facebook Style) - Expanded for Crystal-Clear Picture Display */}
        <div className="relative h-56 sm:h-64 sm:min-h-[260px] bg-gradient-to-r from-[#2d1b64] via-purple-900 to-indigo-900 shadow-inner group/cover overflow-hidden">
          {displayCover ? (
            <img
              src={getImageUrl(displayCover)}
              alt="Teacher Cover Page"
              className="w-full h-full object-cover object-center transition-transform duration-500 group-hover/cover:scale-105"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          ) : (
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
          
          <div className="relative z-10 p-6 flex justify-between items-start">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30 text-white text-xs font-extrabold uppercase tracking-widest shadow-md">
              <FaChalkboardTeacher className="text-purple-300 text-sm" /> Teacher Profile Page
            </div>

            <div className="flex items-center gap-2 mr-12">
              {isOwnProfile && !selectedCourse && isEditing && (
                <button
                  type="button"
                  onClick={() => coverFileInputRef.current?.click()}
                  className="bg-black/60 hover:bg-black/80 text-white px-4 py-1.5 rounded-full text-xs font-bold transition backdrop-blur-md flex items-center gap-1.5 border border-white/30 cursor-pointer shadow-md"
                >
                  <FaImage className="text-amber-300" /> Upload Cover Photo
                </button>
              )}
            </div>
          </div>

          {/* Hidden Cover Input */}
          <input
            ref={coverFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleImageChange(e, 'cover')}
          />
        </div>

        {/* Profile Info Header (Avatar Overlapping Banner, Name, Contacts & Tags Lined Up From Left-Most Corner) */}
        <div className="relative px-6 sm:px-8 pb-4 border-b border-gray-100 dark:border-slate-800 space-y-3">
          {/* EDIT PROFILE BUTTON (TOP RIGHT CORNER FOR ASSIGNED TEACHER) */}
          {isOwnProfile && !selectedCourse && !isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="absolute top-3 right-6 sm:right-8 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-full text-xs font-black transition shadow-lg flex items-center gap-1.5 cursor-pointer border border-purple-400/40 hover:scale-105 z-30"
            >
              <FaEdit /> Edit Profile
            </button>
          )}

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 pr-0 sm:pr-36">
            {/* Avatar (Overlapping bottom edge of cover banner) */}
            <div 
              onClick={() => {
                if (!isEditing && (currentTeacher?.profilePicture || editProfilePicture)) {
                  setIsImageEnlarged(true);
                }
              }}
              className={`relative group shrink-0 -mt-14 sm:-mt-20 z-20 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1.5 hover:shadow-2xl ${
                !isEditing ? 'cursor-pointer' : ''
              }`}
              title={!isEditing ? "Click to view full picture" : "Profile Avatar"}
            >
              {(isEditing ? editProfilePicture : currentTeacher?.profilePicture) ? (
                <img
                  src={getImageUrl(isEditing ? editProfilePicture : currentTeacher.profilePicture)}
                  alt={currentTeacher.name}
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-2xl border-2 border-purple-100 dark:border-slate-700 bg-white dark:bg-slate-800 group-hover:ring-purple-600 transition-all duration-300"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              ) : (
                <div className="w-28 h-28 sm:w-36 sm:h-36 bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white rounded-full flex items-center justify-center font-extrabold text-4xl sm:text-5xl ring-4 ring-white dark:ring-slate-800 shadow-2xl border-2 border-purple-100 dark:border-slate-700 group-hover:ring-purple-600 transition-all duration-300">
                  {(isEditing ? editName : currentTeacher?.name) ? (isEditing ? editName : currentTeacher.name).charAt(0) : '?'}
                </div>
              )}

              {isEditing && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    profileFileInputRef.current?.click();
                  }}
                  className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center gap-1 opacity-90 hover:opacity-100 transition cursor-pointer"
                  title="Upload Profile Photo"
                >
                  <FaCamera className="text-xl" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">Upload</span>
                </button>
              )}

              <input
                ref={profileFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleImageChange(e, 'profile')}
              />
            </div>

            {/* Profile Details (Name and Contacts) */}
            <div className="text-center sm:text-left flex-1 pt-2 sm:pt-3 space-y-1.5">
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight transition-all duration-300 inline-block transform hover:scale-[1.03] hover:-translate-y-0.5 hover:text-purple-900 dark:hover:text-purple-300 cursor-pointer">
                {currentTeacher?.name || 'Teacher'}
              </h2>

              {/* Dynamic Contact Method Badges (Email, Phone, WhatsApp, YouTube, Facebook, Instagram, etc.) */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-bold pt-0.5">
                {parseContactsList(currentTeacher).map((c, cIdx) => {
                  if (!c.value) return null;
                  const typeObj = CONTACT_TYPES.find(t => t.id === c.type) || CONTACT_TYPES[0];
                  const Icon = typeObj.icon;
                  const isExternalLink = ['youtube', 'facebook', 'instagram', 'website', 'linkedin', 'telegram'].includes(c.type);
                  const href = isExternalLink
                    ? (c.value.startsWith('http://') || c.value.startsWith('https://') ? c.value : `https://${c.value}`)
                    : c.type === 'email' ? `mailto:${c.value}`
                    : c.type === 'whatsapp' ? `https://wa.me/${c.value.replace(/[^0-9]/g, '')}`
                    : c.type === 'phone' ? `tel:${c.value}`
                    : c.value;

                  return (
                    <a
                      key={cIdx}
                      href={href}
                      target={isExternalLink || c.type === 'whatsapp' ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      className={`flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-xs transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 cursor-pointer ${typeObj.bg}`}
                      title={`${typeObj.label}: ${c.value}`}
                    >
                      <Icon className={`text-xs ${typeObj.color}`} />
                      <span>{c.value}</span>
                      {isExternalLink && <FaExternalLinkAlt className="text-[9px] opacity-70 ml-0.5" />}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. TAGS LINED UP FROM THE LEFT-MOST CORNER BELOW NAME AND CONTACTS */}
          <div className="flex flex-wrap items-center justify-start gap-2 pt-2">
            {teacherTags.map((rawTag, idx) => {
              const { text, bg, color, isCustomColor } = parseTag(rawTag);
              const isVerified = text.includes('Verified');
              const isInstructor = text.includes('Instructor');

              const badgeStyle = isCustomColor ? {
                backgroundColor: bg,
                color: color,
                borderColor: color.startsWith('#') ? `${color}40` : 'transparent'
              } : {};

              const badgeClass = isCustomColor 
                ? 'text-[11px] sm:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border flex items-center gap-1.5 shadow-sm transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-xl cursor-pointer'
                : `text-[11px] sm:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider border flex items-center gap-1.5 shadow-sm transition-all duration-300 transform hover:scale-110 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
                    isVerified
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                      : isInstructor
                      ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-800 hover:bg-purple-200'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800 hover:bg-indigo-100'
                  }`;

              return (
                <span
                  key={idx}
                  style={badgeStyle}
                  className={badgeClass}
                  title="Teacher Tag"
                >
                  {text}
                  {isAdminUser && isManagingTags && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(rawTag)}
                      className="ml-1 text-red-500 hover:text-red-700 transition cursor-pointer"
                      title="Remove Tag"
                    >
                      <FaTimes className="text-xs" />
                    </button>
                  )}
                </span>
              );
            })}

            {/* ONLY ADMIN CAN SEE + MANAGE TEACHER TAGS BUTTON */}
            {isAdminUser && !isEditing && (
              <button
                type="button"
                onClick={() => setIsManagingTags(!isManagingTags)}
                className="text-[11px] font-extrabold bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 text-amber-900 dark:text-amber-300 px-3.5 py-1 rounded-full border border-amber-300 dark:border-amber-800 uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer shadow-sm hover:scale-105"
              >
                <FaTag className="text-amber-600 dark:text-amber-400" /> {isManagingTags ? 'Close Tag Editor' : '+ Manage Teacher Tags'}
              </button>
            )}
          </div>
        </div>

        {/* Modal Body (UNIFIED SCROLL WITH COVER HEADER) */}
        <div className="p-6 sm:p-8 space-y-6">

          {selectedCourse ? (
            /* ──────────────── IN-MODAL COURSE DETAILS VIEW ──────────────── */
            <div className="space-y-6 animate-fadeIn">
              {/* Back Button Header */}
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer border border-purple-200"
                >
                  <FaArrowLeft /> Back to Teacher Profile
                </button>
                <span className="text-xs font-extrabold bg-purple-100 text-purple-800 px-3 py-1 rounded-full uppercase tracking-wider">
                  Course Preview
                </span>
              </div>

              {/* Course Banner Header (Pure Original Image without Dark Overlays) */}
              <div className="relative h-64 sm:h-72 rounded-3xl overflow-hidden border border-purple-100 shadow-lg bg-gray-100 group">
                {selectedCourse.banner || selectedCourse.cardImage ? (
                  <img
                    src={getImageUrl(selectedCourse.banner || selectedCourse.cardImage)}
                    alt={selectedCourse.title}
                    className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-500"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-700 via-indigo-800 to-[#2d1b64] flex flex-col items-center justify-center text-white p-6 text-center">
                    <FaBookOpen className="text-5xl mb-3 text-purple-300" />
                    <span className="text-2xl font-black">{selectedCourse.title}</span>
                  </div>
                )}

                {/* Overlaid Badges & Prominent Bold Title */}
                <div className="absolute inset-0 p-6 flex flex-col justify-between items-start z-10">
                  {/* Top Badges */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-purple-600/95 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                      {selectedCourse.studentType === 'online' ? '💻 Online Class' : selectedCourse.studentType === 'physical' ? '🏫 Physical Class' : '💻 Online & Physical'}
                    </span>
                    <span className="bg-emerald-600/95 backdrop-blur-md text-white text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-md">
                      LKR {selectedCourse.price || 2500} / month
                    </span>
                  </div>

                  {/* Prominent Large Course Title in High-Contrast Black Typography */}
                  <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-black tracking-tight leading-tight [text-shadow:_0_2px_12px_rgba(255,255,255,0.98)] drop-shadow-lg">
                    {selectedCourse.title}
                  </h3>
                </div>
              </div>

              {/* Premium Course Overview & Description Section */}
              <div className="relative bg-gradient-to-br from-purple-50/90 via-white to-indigo-50/50 p-6 sm:p-7 rounded-3xl border border-purple-100/90 shadow-sm overflow-hidden group hover:shadow-md hover:border-purple-200 transition-all duration-300 space-y-3.5">
                {/* Decorative Background Accent Glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl pointer-events-none"></div>

                {/* Header with Icon & Title starting from left-most corner */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 via-indigo-700 to-[#2d1b64] text-white flex items-center justify-center text-base font-black shadow-md shrink-0 border border-purple-200/40">
                    <FaBookOpen />
                  </div>
                  <h4 className="text-xs font-black text-purple-900 dark:text-purple-300 uppercase tracking-widest">
                    Course Overview &amp; Description
                  </h4>
                </div>

                {/* Full-width Description Box starting from left-most corner */}
                <div className="bg-white/90 dark:bg-slate-800/90 p-5 rounded-2xl border border-purple-100/90 dark:border-slate-700 shadow-inner w-full">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed font-sans">
                    {selectedCourse.description || 'No detailed description specified for this course.'}
                  </p>
                </div>
              </div>

              {/* Active Grades & Classes Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-gray-800 dark:text-white uppercase tracking-widest flex items-center gap-2">
                    <span className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white flex items-center justify-center shadow-md">
                      <FaGraduationCap className="text-sm" />
                    </span>
                    Active Grades
                  </h4>
                </div>

                {(!selectedCourse.enrolledGrades || selectedCourse.enrolledGrades.length === 0) ? (
                  <div className="bg-gray-50 dark:bg-slate-800/60 border border-dashed border-gray-200 dark:border-slate-700 p-5 rounded-2xl text-center">
                    <p className="text-xs text-gray-400 font-medium italic">Standard Single Class Course (No separate grade streams)</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {selectedCourse.enrolledGrades.map((g, idx) => {
                      const isDeactive = g.status === 'deactive' || g.isActive === false;
                      const isNotEnrolled = g.isEnrolled === false || g.enrolled === false;
                      const gradeDisplayTitle = g.gradeNumber 
                        ? (String(g.gradeNumber).toLowerCase().includes('grade') ? g.gradeNumber : `Grade ${g.gradeNumber}`)
                        : (g.title || `Grade Stream ${idx + 1}`);

                      return (
                        <div
                          key={idx}
                          className={`group relative p-4 rounded-2xl border shadow-sm transition-all duration-300 flex items-center justify-between cursor-default z-10 hover:z-30 hover:scale-[1.02] hover:shadow-xl ${
                            isDeactive 
                              ? 'bg-red-50/50 dark:bg-red-950/30 border-red-200/90 dark:border-red-900/60 hover:border-red-300' 
                              : isNotEnrolled 
                              ? 'bg-amber-50/30 dark:bg-amber-950/30 border-amber-200/80 dark:border-amber-900/60 hover:border-amber-300'
                              : 'bg-white dark:bg-slate-800 border-purple-100/80 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500'
                          }`}
                        >
                          {/* Grade Card Content */}
                          <div className="flex items-center gap-3.5">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-md group-hover:scale-105 transition-transform shrink-0 ${
                              isDeactive || isNotEnrolled 
                                ? 'bg-gradient-to-br from-red-600 via-rose-700 to-red-900 text-white' 
                                : 'bg-gradient-to-br from-purple-600 via-purple-700 to-[#2d1b64] text-white'
                            }`}>
                              {g.gradeNumber ? (String(g.gradeNumber).toLowerCase().includes('grade') ? String(g.gradeNumber).replace(/grade\s*/i, 'G') : `G${g.gradeNumber}`) : `G${idx + 1}`}
                            </div>
                            <div>
                              <h5 className="text-sm font-extrabold text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors flex items-center gap-1.5">
                                {gradeDisplayTitle}
                                {(isDeactive || isNotEnrolled) && (
                                  <FaLock className="text-red-500 text-xs shrink-0" title={isDeactive ? `Deactivated by ${g.deactivatedBy === 'admin' ? 'Admin' : 'Teacher'}` : "Locked: Not Enrolled"} />
                                )}
                              </h5>
                              <p className="text-[11px] font-bold flex items-center gap-1.5 mt-0.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${isDeactive ? 'bg-red-500' : isNotEnrolled ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
                                <span className={isDeactive ? 'text-red-600 font-extrabold' : isNotEnrolled ? 'text-amber-700 font-bold' : 'text-emerald-600 font-bold'}>
                                  {isDeactive ? 'Deactive' : isNotEnrolled ? 'Not Enrolled' : 'Active'}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Right Side: Pure Read-Only Grade Status Badge (No Action Button) */}
                          <div className="shrink-0">
                            {isDeactive ? (
                              <span className="bg-red-100 text-red-700 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-red-200 flex items-center gap-1 shadow-xs">
                                <FaLock className="text-[9px]" /> Deactive
                              </span>
                            ) : (
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider border border-emerald-200 flex items-center gap-1 shadow-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span> Active
                              </span>
                            )}
                          </div>



                          {/* POP-UP CARD VIEW ON CURSOR HOVER */}
                          <div className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 scale-95 group-hover:scale-100 absolute bottom-full mb-3 left-1/2 -translate-x-1/2 z-40 w-64 bg-[#2d1b64] text-white p-3.5 rounded-2xl shadow-2xl border border-purple-400/40 backdrop-blur-md">
                            <div className="flex items-center justify-between pb-1.5 border-b border-purple-400/30 mb-1.5">
                              <span className="text-[10px] font-black uppercase tracking-widest text-purple-300 flex items-center gap-1">
                                <FaGraduationCap /> Grade Details
                              </span>
                              <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                isDeactive ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                              }`}>
                                {isDeactive ? 'Deactive' : 'Active'}
                              </span>
                            </div>
                            <h6 className="font-extrabold text-white text-xs mb-0.5">
                              {gradeDisplayTitle}
                            </h6>
                            <p className="text-[11px] text-purple-200 leading-relaxed font-normal">
                              {isDeactive 
                                ? 'Grade Stream Deactivated by Admin' 
                                : isNotEnrolled 
                                ? 'Locked in Red: Not Enrolled' 
                                : `Enrolled Class Stream for ${selectedCourse.title}`}
                            </p>
                            {/* Tooltip Triangle Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-x-6 border-x-transparent border-t-6 border-t-[#2d1b64]"></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer"
                >
                  <FaArrowLeft /> Back to Teacher Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenFullCoursePage(selectedCourse._id)}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-[#2d1b64] text-white rounded-xl font-bold text-xs shadow-md hover:from-purple-700 hover:to-purple-900 transition flex items-center gap-2 cursor-pointer"
                >
                  <FaExternalLinkAlt /> Open Full Course Details Page
                </button>
              </div>
            </div>
          ) : isEditing ? (
            /* ──────────────── EDIT PROFILE FORM ──────────────── */
            <form onSubmit={handleSaveProfile} className="bg-purple-50/40 dark:bg-slate-900 p-6 rounded-3xl border border-purple-100 dark:border-slate-800 space-y-5 animate-fadeIn">
              <div className="flex justify-between items-center pb-3 border-b border-purple-100 dark:border-slate-800">
                <h3 className="font-extrabold text-gray-900 dark:text-white text-lg flex items-center gap-2">
                  <FaEdit className="text-purple-600 dark:text-purple-400" /> Edit Profile &amp; Cover Page
                </h3>
              </div>

              {/* Photo Upload Cards Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-col justify-between items-center text-center">
                  <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Profile Photo</span>
                  {editProfilePicture ? (
                    <div className="relative mb-3">
                      <img
                        src={getImageUrl(editProfilePicture)}
                        alt="Profile Preview"
                        className="w-24 h-24 rounded-full object-cover border-2 border-purple-200 dark:border-purple-700 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => setEditProfilePicture('')}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600 transition cursor-pointer"
                        title="Remove Photo"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-purple-50 dark:bg-slate-800 border-2 border-dashed border-purple-200 dark:border-slate-700 flex items-center justify-center text-purple-400 mb-3">
                      <FaCamera className="text-2xl" />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => profileFileInputRef.current?.click()}
                    className="w-full py-2 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-purple-200/60 dark:border-purple-800"
                  >
                    <FaUpload /> {editProfilePicture ? "Change Profile Photo" : "Upload Profile Photo"}
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 flex flex-col justify-between items-center text-center">
                  <span className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">Cover Banner Photo</span>
                  {editCoverPicture ? (
                    <div className="relative w-full h-24 mb-3 overflow-hidden rounded-xl border border-purple-200 dark:border-purple-700">
                      <img
                        src={getImageUrl(editCoverPicture)}
                        alt="Cover Preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setEditCoverPicture('')}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 text-xs hover:bg-red-600 transition cursor-pointer"
                        title="Remove Cover"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-xl bg-purple-50 dark:bg-slate-800 border-2 border-dashed border-purple-200 dark:border-slate-700 flex flex-col items-center justify-center text-purple-400 mb-3">
                      <FaImage className="text-2xl mb-1" />
                      <span className="text-[10px] font-bold">No Cover Uploaded</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => coverFileInputRef.current?.click()}
                    className="w-full py-2 bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-800 dark:text-purple-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-purple-200/60 dark:border-purple-800"
                  >
                    <FaUpload /> {editCoverPicture ? "Change Cover Banner" : "Upload Cover Banner"}
                  </button>
                </div>
              </div>

              {/* Sample Cover Banners Presets Gallery (35 Local HD Presets - 2 Pictures Per Row) */}
              <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-gray-200 dark:border-slate-800 space-y-3.5 shadow-xs">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Sample Cover Banner</label>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Recommended 3:1 banner ratio · 35 Local HD preset images available. Click any image to open in cropper.</p>
                </div>

                {/* Subject Category Pills */}
                <div className="flex flex-wrap gap-1.5 pt-0.5 pb-1">
                  {['All', 'Science', 'Mathematics', 'History', 'English', 'Sinhala', 'Tamil', 'Health', 'Nature', 'Physics', 'Technology', 'Art & Music', 'General'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCoverCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                        selectedCoverCategory === cat
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* 2 Pictures Per Row Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                  {SAMPLE_COVER_BANNERS
                    .filter(sc => selectedCoverCategory === 'All' || sc.category === selectedCoverCategory)
                    .map((sc) => (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => openCropperForSource(sc.url, 'cover')}
                        className="relative group rounded-2xl overflow-hidden border-2 border-transparent hover:border-purple-600 focus:border-purple-600 transition shadow-sm cursor-pointer h-28 sm:h-32 bg-gray-100 text-left"
                        title={sc.title}
                      >
                        <img
                          src={sc.url}
                          alt={sc.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent p-3 flex flex-col justify-between">
                          <span className="self-start text-[10px] font-extrabold text-white bg-purple-600/90 backdrop-blur-md px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow">
                            {sc.category}
                          </span>
                          <div>
                            <span className="text-xs sm:text-sm font-extrabold text-white drop-shadow line-clamp-1">{sc.title}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Chaminda Herath"
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-sm font-semibold"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FaAward className="text-purple-600 dark:text-purple-400" /> Qualifications &amp; Subject Specializations
                </label>

                <div className="space-y-2 bg-purple-50/40 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-purple-100/90 dark:border-slate-700">
                  {qualificationsList.map((qual, qIdx) => (
                    <div key={qIdx} className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-purple-600 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                        {qIdx + 1}
                      </span>
                      <input
                        type="text"
                        value={qual}
                        onChange={(e) => {
                          const updated = [...qualificationsList];
                          updated[qIdx] = e.target.value;
                          setQualificationsList(updated);
                        }}
                        placeholder={
                          qIdx === 0 
                            ? "e.g. B.Sc. (Hons) in Computer Science University of Peradeniya" 
                            : qIdx === 1
                            ? "e.g. Master of Education (M.Ed) - Science Education"
                            : "e.g. Senior Science & IT Lecturer (10+ Years Experience)"
                        }
                        className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs sm:text-sm font-semibold shadow-xs"
                      />
                      {qualificationsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = qualificationsList.filter((_, idx) => idx !== qIdx);
                            setQualificationsList(updated.length > 0 ? updated : ['']);
                          }}
                          className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-950/60 rounded-xl flex items-center justify-center transition border border-transparent hover:border-red-200 cursor-pointer shrink-0"
                          title="Remove Qualification"
                        >
                          <FaTrash className="text-xs" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => setQualificationsList([...qualificationsList, ''])}
                    className="mt-1 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-102"
                  >
                    <FaPlus className="text-xs" /> + Add Another Qualification
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FaPhoneAlt className="text-purple-600 dark:text-purple-400" /> Contact Details &amp; Social Links
                </label>

                <div className="space-y-2.5 bg-purple-50/40 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-purple-100/90 dark:border-slate-700">
                  {contactsList.map((contact, cIdx) => {
                    const selectedTypeObj = CONTACT_TYPES.find(t => t.id === contact.type) || CONTACT_TYPES[0];
                    const TypeIcon = selectedTypeObj.icon;
                    return (
                      <div key={cIdx} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-xs">
                        {/* Type Select Dropdown */}
                        <div className="relative min-w-[175px]">
                          <select
                            value={contact.type}
                            onChange={(e) => {
                              const updated = [...contactsList];
                              updated[cIdx].type = e.target.value;
                              setContactsList(updated);
                            }}
                            className="w-full pl-8 pr-7 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl text-xs font-black text-gray-800 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
                          >
                            {CONTACT_TYPES.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                          <TypeIcon className={`absolute left-2.5 top-2.5 text-xs ${selectedTypeObj.color}`} />
                          <FaChevronDown className="absolute right-2.5 top-3 text-[10px] text-gray-400 pointer-events-none" />
                        </div>

                        {/* Value Input */}
                        <input
                          type="text"
                          value={contact.value}
                          onChange={(e) => {
                            const updated = [...contactsList];
                            updated[cIdx].value = e.target.value;
                            setContactsList(updated);
                          }}
                          placeholder={
                            contact.type === 'phone' ? 'e.g. +94771234567' :
                            contact.type === 'email' ? 'e.g. teacher@gmail.com' :
                            contact.type === 'whatsapp' ? 'e.g. +94771234567' :
                            contact.type === 'youtube' ? 'e.g. youtube.com/@ScienceWithPathum' :
                            contact.type === 'facebook' ? 'e.g. facebook.com/pathum.edu' :
                            contact.type === 'instagram' ? 'e.g. @pathum_science' :
                            contact.type === 'website' ? 'e.g. www.pathumscience.com' :
                            contact.type === 'linkedin' ? 'e.g. linkedin.com/in/pathum' :
                            'e.g. t.me/pathum_edu'
                          }
                          className="flex-1 px-3.5 py-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs sm:text-sm font-semibold shadow-xs"
                        />

                        {/* Delete Button */}
                        {contactsList.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = contactsList.filter((_, idx) => idx !== cIdx);
                              setContactsList(updated.length > 0 ? updated : [{ type: 'phone', value: '' }]);
                            }}
                            className="w-8 h-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/60 rounded-xl flex items-center justify-center transition border border-transparent hover:border-red-200 cursor-pointer shrink-0"
                            title="Remove Contact Method"
                          >
                            <FaTrash className="text-xs" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => setContactsList([...contactsList, { type: 'phone', value: '' }])}
                    className="mt-1 text-xs font-black bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-md hover:scale-102"
                  >
                    <FaPlus className="text-xs" /> + Add Another Contact Method
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                  <label className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FaChalkboardTeacher className="text-purple-600 dark:text-purple-400" /> About Instructor (Bio &amp; Profile Description)
                  </label>
                  
                  {/* Quick Formatting Tools */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setEditBio(prev => `🎓 **[SUBJECT NAME] Educator | [SPECIALIZATION]**\n\n${prev}`.trim())}
                      className="text-[10px] font-extrabold bg-purple-100 dark:bg-purple-950/60 hover:bg-purple-200 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 px-2.5 py-1 rounded-lg transition border border-purple-200 dark:border-purple-800 cursor-pointer"
                      title="Insert Generalized Headline Header"
                    >
                      + Headline
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBio(prev => `${prev}\n• Focus on concept clarity & unit-by-unit practice for [SUBJECT NAME]`.trim())}
                      className="text-[10px] font-extrabold bg-indigo-100 dark:bg-indigo-950/60 hover:bg-indigo-200 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-300 px-2.5 py-1 rounded-lg transition border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                      title="Insert Generalized Bullet Point"
                    >
                      + Bullet Point
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditBio("🎓 **Passionate [SUBJECT NAME] Educator**\n\nDedicated [SUBJECT NAME] teacher with [10+] years of proven experience helping students master concepts, solve exam problems, and achieve outstanding results in exams.\n\n• Unit-by-unit structured revision for [SUBJECT NAME]\n• Comprehensive model paper discussions & past paper practice for [EXAM LEVEL]\n• Individual student guidance & doubt clearing sessions")}
                      className="text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950/60 hover:bg-amber-200 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 px-2.5 py-1 rounded-lg transition border border-amber-200 dark:border-amber-800 cursor-pointer"
                      title="Load Generalized Bio Template"
                    >
                      ✨ Sample Bio
                    </button>
                  </div>
                </div>

                <textarea
                  rows={5}
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  placeholder="Write a short summary about your teaching experience, subjects, and background..."
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs sm:text-sm font-semibold leading-relaxed shadow-xs"
                />

                {/* Live Student View Preview Box */}
                {editBio.trim() && (
                  <div className="mt-3 space-y-1.5">
                    <span className="text-[10px] font-black text-purple-700 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1">
                      <FaBookOpen /> Live Profile Preview:
                    </span>
                    {renderFormattedBio(editBio, true)}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-purple-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-[#2d1b64] text-white rounded-xl text-sm font-bold shadow-md hover:from-purple-700 hover:to-purple-900 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <FaSave /> {isSaving ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          ) : (
            /* ──────────────── PUBLIC READ-ONLY PROFILE ──────────────── */
            <div className="space-y-6">
              {/* ADMIN TAG MANAGER CREATION BAR (EXPANDS INSIDE BODY WHEN MANAGING TAGS) */}
              {isAdminUser && isManagingTags && (
                <div className="bg-amber-50/90 dark:bg-slate-800/90 border border-amber-200 dark:border-slate-700 p-4 rounded-2xl space-y-3.5 animate-fadeIn shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-200/80 dark:border-slate-700">
                    <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <FaTag className="text-amber-600 dark:text-amber-400" /> Admin Tag Management Bar
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveTags}
                      disabled={isSavingTags}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <FaSave /> {isSavingTags ? "Saving Tags..." : "Save Tags to Profile"}
                    </button>
                  </div>

                  {/* Preset Common & Important Tags */}
                  <div>
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1.5">
                      Quick Common &amp; Important Tags:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_TAGS.map((pTag, idx) => {
                        const isAdded = teacherTags.some(t => parseTag(t).text === pTag);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              if (isAdded) {
                                const tagToRemove = teacherTags.find(t => parseTag(t).text === pTag);
                                handleRemoveTag(tagToRemove || pTag);
                              } else {
                                handleAddTag(pTag, true);
                              }
                            }}
                            className={`text-xs font-bold px-3 py-1 rounded-xl border transition cursor-pointer ${
                              isAdded
                                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border-amber-200 dark:border-slate-700 hover:bg-amber-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {isAdded ? `✓ ${pTag}` : `+ ${pTag}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Symbol / Emoji Palette Picker */}
                  <div>
                    <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Click Symbol to Insert into Custom Tag:</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-normal">Click any symbol e.g. ⭐, 🏆, 💎</span>
                    </p>
                    <div className="flex flex-wrap gap-1 bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-amber-200 dark:border-slate-700 shadow-inner max-h-24 overflow-y-auto">
                      {SYMBOLS_LIST.map((sym, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => setCustomTagInput(prev => `${sym} ${prev}`.trim())}
                          className="w-7 h-7 bg-amber-50 dark:bg-slate-750 hover:bg-amber-200 dark:hover:bg-slate-700 text-amber-900 dark:text-amber-300 rounded-lg text-sm flex items-center justify-center transition cursor-pointer hover:scale-110 shadow-xs border border-amber-200/60 dark:border-slate-700"
                          title={`Click to add ${sym} symbol to tag`}
                        >
                          {sym}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Tag Color Customizer (Box Background & Letter Text Colors) */}
                  <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-amber-200 dark:border-slate-700 space-y-3 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                        <FaPalette className="text-amber-600 dark:text-amber-400" /> Select Custom Tag Colors:
                      </span>

                      {/* Live Tag Badge Preview */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">Live Preview:</span>
                        <span
                          style={{ backgroundColor: customTagBgColor, color: customTagTextColor, borderColor: customTagTextColor + '40' }}
                          className="text-[11px] font-black px-3.5 py-1 rounded-full uppercase tracking-wider border shadow-sm transition-all"
                        >
                          {customTagInput.trim() || '🚀 CUSTOM TAG'}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-amber-100 dark:border-slate-700">
                      {/* 1. Box Background Color Picker & Swatches */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-700 flex items-center justify-between">
                          <span>Box Background Color:</span>
                          <input
                            type="color"
                            value={customTagBgColor}
                            onChange={(e) => setCustomTagBgColor(e.target.value)}
                            className="w-6 h-6 rounded-md cursor-pointer border border-gray-300"
                            title="Custom Box Color Picker"
                          />
                        </label>

                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: 'Purple', bg: '#8b5cf6', text: '#ffffff' },
                            { name: 'Light Purple', bg: '#f3e8ff', text: '#581c87' },
                            { name: 'Emerald', bg: '#10b981', text: '#ffffff' },
                            { name: 'Light Emerald', bg: '#d1fae5', text: '#065f46' },
                            { name: 'Amber Gold', bg: '#f59e0b', text: '#ffffff' },
                            { name: 'Light Amber', bg: '#fef3c7', text: '#92400e' },
                            { name: 'Indigo Blue', bg: '#6366f1', text: '#ffffff' },
                            { name: 'Rose Red', bg: '#f43f5e', text: '#ffffff' },
                            { name: 'Cyan Sky', bg: '#06b6d4', text: '#ffffff' },
                            { name: 'Dark Slate', bg: '#1e293b', text: '#ffffff' },
                            { name: 'Pure White', bg: '#ffffff', text: '#1e293b' }
                          ].map((sw, swIdx) => (
                            <button
                              key={swIdx}
                              type="button"
                              onClick={() => {
                                setCustomTagBgColor(sw.bg);
                                setCustomTagTextColor(sw.text);
                              }}
                              style={{ backgroundColor: sw.bg }}
                              className={`w-5 h-5 rounded-full border shadow-xs transition hover:scale-125 cursor-pointer ${
                                customTagBgColor === sw.bg ? 'ring-2 ring-amber-600 ring-offset-1 scale-110' : 'border-gray-300'
                              }`}
                              title={`Select ${sw.name} Box Color`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* 2. Letter / Text Color Picker & Swatches */}
                      <div className="space-y-1.5">
                        <label className="block text-[11px] font-bold text-gray-700 flex items-center justify-between">
                          <span>Letter / Text Color:</span>
                          <input
                            type="color"
                            value={customTagTextColor}
                            onChange={(e) => setCustomTagTextColor(e.target.value)}
                            className="w-6 h-6 rounded-md cursor-pointer border border-gray-300"
                            title="Custom Text Color Picker"
                          />
                        </label>

                        <div className="flex flex-wrap gap-1.5">
                          {[
                            { name: 'White', color: '#ffffff' },
                            { name: 'Dark Slate', color: '#1e293b' },
                            { name: 'Deep Purple', color: '#581c87' },
                            { name: 'Deep Emerald', color: '#065f46' },
                            { name: 'Deep Gold', color: '#92400e' },
                            { name: 'Deep Indigo', color: '#3730a3' },
                            { name: 'Deep Red', color: '#9f1239' },
                            { name: 'Bright Yellow', color: '#facc15' }
                          ].map((tSw, tIdx) => (
                            <button
                              key={tIdx}
                              type="button"
                              onClick={() => setCustomTagTextColor(tSw.color)}
                              style={{ backgroundColor: tSw.color }}
                              className={`w-5 h-5 rounded-full border shadow-xs transition hover:scale-125 cursor-pointer ${
                                customTagTextColor === tSw.color ? 'ring-2 ring-amber-600 ring-offset-1 scale-110' : 'border-gray-300'
                              }`}
                              title={`Select ${tSw.name} Text Color`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Custom Tag Creation Bar */}
                  <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
                    <input
                      type="text"
                      value={customTagInput}
                      onChange={(e) => setCustomTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(customTagInput);
                        }
                      }}
                      placeholder="Create custom tag e.g. 💎 Exam Panelist..."
                      className="flex-1 px-3.5 py-2 bg-white border border-amber-300 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAddTag(customTagInput)}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow transition flex items-center gap-1 cursor-pointer"
                    >
                      <FaPlus className="text-xs" /> Add Custom Tag
                    </button>
                  </div>
                </div>
              )}

              {/* Unified Qualifications, Specialization & About Educator Section */}
              {(currentTeacher?.qualifications || currentTeacher?.bio) && (
                <div className="bg-gradient-to-br from-purple-50/50 via-white to-indigo-50/30 p-6 sm:p-7 rounded-3xl border border-purple-100/90 shadow-sm space-y-5">
                  {currentTeacher?.qualifications && (
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center text-base font-black shadow-sm shrink-0 mt-0.5 border border-purple-200/60">
                        <FaAward />
                      </div>
                      <div className="space-y-2 flex-1">
                        <p className="text-xs font-black text-purple-700 uppercase tracking-widest">
                          Qualifications &amp; Specialization
                        </p>
                        <div className="space-y-1.5">
                          {parseQualifications(currentTeacher.qualifications).map((qualItem, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 text-sm font-extrabold text-gray-900 leading-snug bg-white/90 px-3.5 py-2 rounded-xl border border-purple-100/90 shadow-xs">
                              <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0"></span>
                              <span>{qualItem}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentTeacher?.bio && (
                    <div className={currentTeacher?.qualifications ? "pt-4 border-t border-purple-100/80 space-y-2.5" : "space-y-2.5"}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center text-sm font-bold shadow-sm border border-indigo-200/60">
                          <FaChalkboardTeacher />
                        </div>
                        <p className="text-xs font-black text-purple-700 uppercase tracking-widest">
                          About Instructor
                        </p>
                      </div>
                      {renderFormattedBio(currentTeacher.bio)}
                    </div>
                  )}
                </div>
              )}

              {/* Interactive ASSIGNED COURSES Bar (LAST/BOTTOM) */}
              <div
                onClick={() => setShowCoursesList(!showCoursesList)}
                className={`p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex items-center justify-between group ${
                  showCoursesList 
                    ? 'bg-gradient-to-br from-purple-600 to-[#2d1b64] text-white border-purple-600 shadow-xl scale-[1.01]'
                    : 'bg-gradient-to-br from-purple-50 to-indigo-50/60 text-gray-900 border-purple-200 shadow-sm hover:shadow-md hover:border-purple-400 hover:scale-[1.01]'
                }`}
                title="Click to toggle assigned courses list"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl shadow-md transition-transform group-hover:scale-110 ${
                    showCoursesList ? 'bg-white text-purple-700' : 'bg-purple-600 text-white'
                  }`}>
                    <FaBookOpen />
                  </div>
                  <div>
                    <p className={`text-xs font-black uppercase tracking-widest ${showCoursesList ? 'text-purple-200' : 'text-purple-700'}`}>
                      Assigned Courses
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xl font-black">{profileData?.totalCoursesCount || courses.length || 0}</span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        showCoursesList ? 'bg-purple-500/40 text-white' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {courses.filter(c => c.status !== 'deactive' && c.isActive !== false).length} Active {courses.filter(c => c.status !== 'deactive' && c.isActive !== false).length === 1 ? 'Course' : 'Courses'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-4 py-2 rounded-full transition-all flex items-center gap-1.5 shadow-sm ${
                    showCoursesList
                      ? 'bg-white text-purple-900 shadow-md'
                      : 'bg-purple-600 text-white group-hover:bg-purple-700'
                  }`}>
                    {showCoursesList ? (
                      <>Hide Courses <FaChevronUp className="text-xs" /></>
                    ) : (
                      <>View Courses <FaChevronDown className="text-xs" /></>
                    )}
                  </span>
                </div>
              </div>

              {/* Assigned Courses List (Appears ON CLICK of the ASSIGNED COURSES bar at bottom) */}
              {showCoursesList && (
                <div className="space-y-4 animate-fadeIn pt-2 border-t border-purple-100">
                  {loading ? (
                    <div className="py-12 text-center text-gray-400 font-medium animate-pulse">
                      Loading teacher courses...
                    </div>
                  ) : courses.length === 0 ? (
                    <div className="bg-gray-50 border border-dashed border-gray-200 p-8 rounded-2xl text-center">
                      <p className="text-gray-400 text-sm italic">No courses publicly listed for this instructor at the moment.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {courses.map((c) => {
                        const courseImg = c.cardImage || c.banner;
                        const resolvedImg = getImageUrl(courseImg);
                        const isCourseDeactive = c.status === 'deactive' || c.isActive === false;
                        
                        const getGradeBadgeText = () => {
                          const extractGradeName = (item) => {
                            if (!item) return '';
                            if (typeof item === 'string' || typeof item === 'number') return String(item);
                            if (typeof item === 'object') {
                              return item.gradeName || item.name || item.grade || item.title || item.code || '';
                            }
                            return '';
                          };

                          if (c.grade) return `GRADE ${extractGradeName(c.grade)}`;
                          if (c.targetGrade) return `GRADE ${extractGradeName(c.targetGrade)}`;

                          if (Array.isArray(c.enrolledGrades) && c.enrolledGrades.length > 0) {
                            const parsedList = c.enrolledGrades.map(extractGradeName).filter(Boolean);
                            if (parsedList.length > 0) return `GRADES: ${parsedList.join(', ')}`;
                          }
                          if (Array.isArray(c.grades) && c.grades.length > 0) {
                            const parsedList = c.grades.map(extractGradeName).filter(Boolean);
                            if (parsedList.length > 0) return `GRADES: ${parsedList.join(', ')}`;
                          }
                          return 'ACTIVE GRADE';
                        };

                        return (
                          <div
                            key={c._id}
                            onClick={() => {
                              if (isCourseDeactive) {
                                toast.error("This course is currently deactivated. Access is restricted.");
                                return;
                              }
                              setSelectedCourse(c);
                            }}
                            className={`rounded-3xl overflow-hidden shadow-sm border transition-all duration-300 cursor-pointer flex flex-col justify-between group transform hover:-translate-y-0.5 ${
                              isCourseDeactive ? 'border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/20' : 'bg-white dark:bg-slate-800 border-gray-100/90 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500 hover:shadow-xl'
                            }`}
                          >
                            {/* Card Hero Box (Card Picture with Course Title in Top-Left Corner) */}
                            <div className="relative h-52 sm:h-60 w-full overflow-hidden bg-gray-100 dark:bg-slate-900">
                              {resolvedImg ? (
                                <img
                                  src={resolvedImg}
                                  alt={c.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-purple-700 via-indigo-900 to-[#2d1b64] flex items-center justify-center">
                                  <FaBookOpen className="text-4xl text-purple-300/40" />
                                </div>
                              )}

                              {/* Course Title ON the Card Picture (Top Left Corner - Large Bold Typography) */}
                              <div className="absolute top-4 left-4 right-4 z-10">
                                <h4 className="text-3xl sm:text-4xl font-black text-black dark:text-white tracking-tight leading-tight [text-shadow:_0_2px_10px_rgba(255,255,255,0.98)] dark:[text-shadow:_0_2px_10px_rgba(0,0,0,0.95)] group-hover:text-purple-950 dark:group-hover:text-purple-300 transition-colors line-clamp-2">
                                  {c.title}
                                </h4>
                              </div>
                            </div>

                            {/* Card Body: Active / Deactive Status Badge */}
                            <div className="p-4 bg-white dark:bg-slate-800 flex items-center justify-between">
                              {isCourseDeactive ? (
                                <span className="text-[11px] font-black bg-red-600 text-white px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-red-500 flex items-center gap-1">
                                  <FaLock className="text-[10px]" /> DEACTIVE COURSE
                                </span>
                              ) : (
                                <span className="text-[11px] font-black bg-emerald-600 text-white px-3.5 py-1 rounded-full uppercase tracking-wider shadow-sm border border-emerald-400/30">
                                  {getGradeBadgeText()}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bottom Right Close Profile Button */}
          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-end items-center">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-200 dark:bg-slate-800 hover:bg-gray-300 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 px-6 py-2.5 text-sm font-bold transition cursor-pointer shadow-sm hover:scale-102"
            >
              Close Profile
            </button>
          </div>

        </div>

      </div>

      {/* Fullscreen Picture Enlarge Lightbox */}
      {isImageEnlarged && (
        <div 
          onClick={() => setIsImageEnlarged(false)}
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn cursor-zoom-out"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-xl max-h-[85vh] p-3 bg-white/10 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-2xl flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => setIsImageEnlarged(false)}
              className="absolute -top-4 -right-4 w-10 h-10 bg-white text-gray-900 rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition cursor-pointer font-bold border border-gray-200 z-10 text-base"
              title="Close enlarged picture"
            >
              ✕
            </button>
            <img
              src={getImageUrl(isEditing ? editProfilePicture : currentTeacher?.profilePicture)}
              alt={currentTeacher?.name || 'Enlarged Teacher Profile Picture'}
              className="w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl ring-4 ring-white/20"
            />
            <p className="mt-3 text-white text-xs sm:text-sm font-black tracking-wider uppercase bg-white/20 px-4 py-1.5 rounded-full border border-white/30 backdrop-blur-md">
              {currentTeacher?.name} - Profile Picture
            </p>
          </div>
        </div>
      )}

      {/* Interactive System Image Cropper Modal */}
      {isCropping && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl space-y-4 border border-purple-100 dark:border-slate-800 text-gray-800 dark:text-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-3">
              <div>
                <h4 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                  {cropSourceType === 'profile' ? '📷 Crop Profile Photo (1:1 Ratio)' : '🖼️ Crop Cover Banner Image (3:1 Ratio)'}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Drag to adjust crop position and scroll to zoom before confirming.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCropping(false)}
                className="w-8 h-8 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center font-bold text-sm border border-white cursor-pointer transition active:scale-95"
                title="Close Cropper"
              >
                ✕
              </button>
            </div>

            <div className="relative h-[360px] w-full rounded-2xl overflow-hidden bg-gray-950 border border-gray-800">
              <Cropper
                image={cropFile}
                crop={crop}
                zoom={zoom}
                aspect={cropAspect}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>

            <div className="flex items-center justify-between gap-4 pt-2">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Zoom:</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsCropping(false)}
                  className="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmCroppedImage}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <FaCheck /> Confirm Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherModal;
