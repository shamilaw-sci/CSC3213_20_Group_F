import React, { useState, useEffect, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import api from '../utils/api';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

// ── Reusable image upload zone ───────────────────────────────────────────────
const ImageUploadZone = ({ label, hint, accept, file, onFileChange }) => {
  const inputRef = useRef();
  const previewUrl = file ? URL.createObjectURL(file) : null;

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <p className="text-xs text-gray-400 mb-2">Recommended size: <span className="font-semibold text-purple-600">{hint}</span> · Max 5 MB · JPG, PNG, WebP</p>

      <div
        onClick={() => inputRef.current.click()}
        className="relative w-full border-2 border-dashed border-gray-300 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500 transition group"
        style={{ minHeight: '120px' }}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="preview"
              className="w-full object-cover"
              style={{ maxHeight: '180px' }}
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <span className="text-white text-sm font-semibold">Click to change</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400 group-hover:text-purple-500 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm">Click to upload image</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onFileChange(e.target.files[0] || null)}
      />

      {file && (
        <button
          type="button"
          onClick={() => onFileChange(null)}
          className="mt-1 text-xs text-red-500 hover:underline"
        >
          ✕ Remove image
        </button>
      )}
    </div>
  );
};

const SUBJECT_CATEGORIES = ['All', 'Science', 'Mathematics', 'History', 'English', 'Sinhala', 'Tamil', 'Health', 'Nature', 'Physics', 'Technology', 'Art & Music', 'General'];

const SUBJECT_PRESETS = [
  // Science (4)
  { id: 'p1', title: 'Chemistry Laboratory', subject: 'Science', url: '/sample-presets/p1.jpg' },
  { id: 'p2', title: 'Microscope & Cells', subject: 'Science', url: '/sample-presets/p2.jpg' },
  { id: 'p3', title: 'DNA & Genetics Lab', subject: 'Science', url: '/sample-presets/p3.jpg' },
  { id: 'p4', title: 'Scientific Research', subject: 'Science', url: '/sample-presets/p4.jpg' },

  // Mathematics (3)
  { id: 'p5', title: 'Calculus Chalkboard', subject: 'Mathematics', url: '/sample-presets/p5.jpg' },
  { id: 'p6', title: 'Geometry & Equations', subject: 'Mathematics', url: '/sample-presets/p6.jpg' },
  { id: 'p7', title: 'Data & Statistics', subject: 'Mathematics', url: '/sample-presets/p7.jpg' },

  // History (3)
  { id: 'p8', title: 'Ancient Artifacts & Ruins', subject: 'History', url: '/sample-presets/p8.jpg' },
  { id: 'p9', title: 'Vintage World Map', subject: 'History', url: '/sample-presets/p9.jpg' },
  { id: 'p10', title: 'Historical Manuscripts', subject: 'History', url: '/sample-presets/p10.jpg' },

  // English (3)
  { id: 'p11', title: 'Classic Literature & Books', subject: 'English', url: '/sample-presets/p11.jpg' },
  { id: 'p12', title: 'Writing & Creative Prose', subject: 'English', url: '/sample-presets/p12.jpg' },
  { id: 'p13', title: 'Dictionary & Vocabulary', subject: 'English', url: '/sample-presets/p13.jpg' },

  // Sinhala (3)
  { id: 'p14', title: 'Sri Lankan Cultural Heritage', subject: 'Sinhala', url: '/sample-presets/p14.jpg' },
  { id: 'p15', title: 'Temple & Traditional Art', subject: 'Sinhala', url: '/sample-presets/p15.jpg' },
  { id: 'p16', title: 'Palm Leaf Ola Manuscript', subject: 'Sinhala', url: '/sample-presets/p16.jpg' },

  // Tamil (3)
  { id: 'p17', title: 'Classical Tamil Literature', subject: 'Tamil', url: '/sample-presets/p17.jpg' },
  { id: 'p18', title: 'Dravidian Architecture', subject: 'Tamil', url: '/sample-presets/p18.jpg' },
  { id: 'p19', title: 'Traditional Sculptures', subject: 'Tamil', url: '/sample-presets/p19.jpg' },

  // Health (3)
  { id: 'p20', title: 'Human Anatomy & Fitness', subject: 'Health', url: '/sample-presets/p20.jpg' },
  { id: 'p21', title: 'Medical Care & Wellness', subject: 'Health', url: '/sample-presets/p21.jpg' },
  { id: 'p22', title: 'Healthy Nutrition & Diet', subject: 'Health', url: '/sample-presets/p22.jpg' },

  // Nature (3)
  { id: 'p23', title: 'Green Forest Ecosystem', subject: 'Nature', url: '/sample-presets/p23.jpg' },
  { id: 'p24', title: 'Mountain Environment', subject: 'Nature', url: '/sample-presets/p24.jpg' },
  { id: 'p25', title: 'Wildlife & Biodiversity', subject: 'Nature', url: '/sample-presets/p25.jpg' },

  // Physics (3)
  { id: 'p26', title: 'Optics & Light Spectrum', subject: 'Physics', url: '/sample-presets/p26.jpg' },
  { id: 'p27', title: 'Space & Astronomy', subject: 'Physics', url: '/sample-presets/p27.jpg' },
  { id: 'p28', title: 'Quantum Field & Energy', subject: 'Physics', url: '/sample-presets/p28.jpg' },

  // Technology (3)
  { id: 'p29', title: 'Coding & Software Tech', subject: 'Technology', url: '/sample-presets/p29.jpg' },
  { id: 'p30', title: 'Robotics & Hardware', subject: 'Technology', url: '/sample-presets/p30.jpg' },
  { id: 'p31', title: 'Artificial Intelligence', subject: 'Technology', url: '/sample-presets/p31.jpg' },

  // Art & Music (2)
  { id: 'p32', title: 'Fine Arts & Painting', subject: 'Art & Music', url: '/sample-presets/p32.jpg' },
  { id: 'p33', title: 'Musical Composition', subject: 'Art & Music', url: '/sample-presets/p33.jpg' },

  // General (2)
  { id: 'p34', title: 'Study & Campus Life', subject: 'General', url: '/sample-presets/p34.jpg' },
  { id: 'p35', title: 'Global Education', subject: 'General', url: '/sample-presets/p35.jpg' }
];

// ── Main component ───────────────────────────────────────────────────────────
const AddCourse = () => {
  const [courseData, setCourseData] = useState({ title: '', description: '' });
  const [studentType, setStudentType] = useState('all'); // 'all' | 'online' | 'physical'
  const [bannerFile, setBannerFile] = useState(null);
  const [cardImageFile, setCardImageFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [cardPreview, setCardPreview] = useState(null);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState('All');

  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountName: '',
    accountNumber: '',
    branchName: '',
    paymentInstructions: ''
  });

  const [cropFile, setCropFile] = useState(null);
  const [cropMode, setCropMode] = useState('banner');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isCropping, setIsCropping] = useState(false);
  const [cropSourceType, setCropSourceType] = useState('banner');
  const [cropSourceFileType, setCropSourceFileType] = useState('image/jpeg');
  const [cropSourceFileName, setCropSourceFileName] = useState('cropped-image.jpg');

  const [newTeacherData, setNewTeacherData] = useState({
    teacherName: '',
    teacherEmail: '',
    defaultPassword: ''
  });

  const [teachers, setTeachers] = useState([]);
  const [assignmentMode, setAssignmentMode] = useState('existing');
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const [addAnother, setAddAnother] = useState(false);

  // Fetch all teachers on component load or on demand
  const fetchTeachers = useCallback(async () => {
    try {
      const res = await api.get('/auth/users');
      setTeachers(res.data.filter(u => u.role === 'teacher'));
    } catch (err) {
      toast.error("Failed to load existing teachers list.");
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  const resetForm = () => {
    setCourseData({ title: '', description: '' });
    setStudentType('all');
    setBannerFile(null);
    setCardImageFile(null);
    setBannerPreview(null);
    setCardPreview(null);
    setBankDetails({ bankName: '', accountName: '', accountNumber: '', branchName: '', paymentInstructions: '' });
    setNewTeacherData({ teacherName: '', teacherEmail: '', defaultPassword: '' });
    setSelectedTeacherId('');
  };

  const createImage = (url) => new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

  const getCroppedImg = async (imageSrc, pixelCrop, fileName, fileType, maxDimension = 1200) => {
    const image = await createImage(imageSrc);
    
    let width = pixelCrop.width;
    let height = pixelCrop.height;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      width,
      height
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return;
        resolve(new File([blob], fileName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.85);
    });
  };

  const handleCropComplete = useCallback((croppedArea, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const openCropper = (file, type) => {
    if (!file) return;
    const src = URL.createObjectURL(file);
    setCropFile(src);
    setCropSourceType(type);
    setCropSourceFileType(file.type);
    setCropSourceFileName(file.name);
    setIsCropping(true);
    setCropMode(type);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const closeCropper = () => {
    setIsCropping(false);
    setCropFile(null);
    setCroppedAreaPixels(null);
  };

  const handleCropConfirm = async () => {
    if (!cropFile || !croppedAreaPixels) {
      toast.error('Please complete the crop selection before confirming.');
      return;
    }

    const maxDim = cropSourceType === 'banner' ? 1200 : 600;
    const croppedFile = await getCroppedImg(cropFile, croppedAreaPixels, cropSourceFileName, cropSourceFileType, maxDim);

    if (cropSourceType === 'banner') {
      setBannerFile(croppedFile);
      setBannerPreview(URL.createObjectURL(croppedFile));
    } else {
      setCardImageFile(croppedFile);
      setCardPreview(URL.createObjectURL(croppedFile));
    }

    closeCropper();
  };

  const handleRawFileChange = (file, type) => {
    if (!file) {
      if (type === 'banner') {
        setBannerFile(null);
        setBannerPreview(null);
      } else {
        setCardImageFile(null);
        setCardPreview(null);
      }
      return;
    }

    openCropper(file, type);
  };

  const cropAspectRatio = cropSourceType === 'banner' ? 1200 / 400 : 600 / 450;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Use FormData so we can send files
    const formData = new FormData();
    formData.append('title', courseData.title);
    formData.append('description', courseData.description);
    formData.append('studentType', studentType);
    formData.append('bankDetails', JSON.stringify(bankDetails));

    if (bannerFile)    formData.append('banner',    bannerFile);
    if (cardImageFile) formData.append('cardImage', cardImageFile);

    if (assignmentMode === 'existing') {
      const teacher = teachers.find(t => t._id === selectedTeacherId);
      if (!teacher) {
        toast.error("Please select a teacher.");
        setIsLoading(false);
        return;
      }
      formData.append('teacherName',       teacher.name);
      formData.append('teacherEmail',      teacher.email);
      formData.append('defaultPassword',   'existing_user_placeholder_123');
    } else {
      if (!newTeacherData.teacherName || !newTeacherData.teacherEmail || !newTeacherData.defaultPassword) {
        toast.error("Please fill in all teacher fields.");
        setIsLoading(false);
        return;
      }
      formData.append('teacherName',     newTeacherData.teacherName);
      formData.append('teacherEmail',    newTeacherData.teacherEmail);
      formData.append('defaultPassword', newTeacherData.defaultPassword);
    }

    try {
      await api.post('/courses/add-with-teacher', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success("Course and Teacher set up successfully!");
      await fetchTeachers();

      if (addAnother) {
        resetForm();
      } else {
        navigate('/courses');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to create course");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-lg border border-gray-100">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Create Course &amp; Assign Teacher</h2>

      <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">

        {/* Course Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Course Title</label>
          <input
            type="text"
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={courseData.title}
            onChange={(e) => setCourseData({ ...courseData, title: e.target.value })}
            required
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <button
              type="button"
              onClick={() => {
                const title = courseData.title.trim() || '[Course Title]';
                const sampleText = `Welcome to ${title}! In this course, students will explore [Subject/Key Topic], master core concepts in [Focus Area], and practice with interactive exercises and model exam papers. Special guidance provided by [Teacher Name].`;
                setCourseData(prev => ({ ...prev, description: sampleText }));
                toast.success("Sample description loaded! Change yellow [...] boxes.");
              }}
              className="text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-3 py-1 rounded-full transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
            >
              ✨ Use Sample Description
            </button>
          </div>
          <textarea
            rows={3}
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none text-sm"
            placeholder="Enter course description or click 'Use Sample Description' above..."
            value={courseData.description}
            onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
            required
          />
          {courseData.description && (
            <div className="mt-2.5 p-3.5 bg-amber-50/80 border border-amber-200/90 rounded-xl text-xs text-gray-700 leading-relaxed shadow-xs">
              <div className="flex items-center justify-between gap-1.5 text-amber-900 font-extrabold mb-1.5 uppercase tracking-wider text-[10px]">
                <span>✨ Live Edit Preview</span>
                <span className="text-amber-700 font-medium">Yellow boxes = Parts to customize</span>
              </div>
              <p className="font-medium text-gray-800">
                {courseData.description.split(/(\[[^\]]+\])/g).map((part, idx) => {
                  if (part.startsWith('[') && part.endsWith(']')) {
                    return (
                      <span key={idx} className="bg-amber-300 text-amber-950 font-black px-1.5 py-0.5 rounded border border-amber-400 mx-0.5 shadow-2xs animate-pulse">
                        {part}
                      </span>
                    );
                  }
                  return <span key={idx}>{part}</span>;
                })}
              </p>
            </div>
          )}
        </div>

        {/* Student Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Target Student Type</label>
          <div className="flex bg-gray-100 p-1 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setStudentType('all')}
              className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition ${studentType === 'all' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              🌐 All Students
            </button>
            <button
              type="button"
              onClick={() => setStudentType('online')}
              className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition ${studentType === 'online' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              💻 Online Students Only
            </button>
            <button
              type="button"
              onClick={() => setStudentType('physical')}
              className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition ${studentType === 'physical' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              🏫 Physical Students Only
            </button>
          </div>
        </div>

        {/* Image uploads & Subject-Wise Sample Pictures */}
        <div className="space-y-5">
          {/* Upload Zones for Banner & Card FIRST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploadZone
              label="Course Banner Image"
              hint="1200 × 400 px"
              accept="image/jpeg,image/png,image/webp,image/gif"
              file={bannerFile}
              onFileChange={(file) => handleRawFileChange(file, 'banner')}
            />
            <ImageUploadZone
              label="Course Card Thumbnail"
              hint="600 × 450 px"
              accept="image/jpeg,image/png,image/webp,image/gif"
              file={cardImageFile}
              onFileChange={(file) => handleRawFileChange(file, 'card')}
            />
          </div>

          {/* Subject-Wise Sample Pictures UNDER Upload Zones */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
            <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">
                🖼️ Subject-Wise Sample Pictures
              </label>
              <span className="text-xs text-purple-700 font-semibold">
                Click any picture to open in System Cropper
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-3">Select a subject category to filter sample images, then click to crop.</p>

            {/* Subject Category Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {SUBJECT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedSubjectFilter(cat)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                    selectedSubjectFilter === cat
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-700 border border-gray-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Subject Preset Gallery Grid (2 Pictures Per Row for High-Res Visibility) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-96 overflow-y-auto p-1 custom-scrollbar">
              {SUBJECT_PRESETS
                .filter(p => selectedSubjectFilter === 'All' || p.subject === selectedSubjectFilter)
                .map((preset) => (
                  <div key={preset.id} className="group relative rounded-xl overflow-hidden border border-gray-200 shadow-xs hover:border-purple-500 hover:shadow-lg transition-all">
                    <img src={preset.url} alt={preset.title} className="w-full h-32 sm:h-36 object-cover group-hover:scale-105 transition-transform duration-300" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent p-3 flex flex-col justify-between">
                      <span className="self-start text-xs font-semibold bg-purple-700/90 text-white px-2.5 py-0.5 rounded-md shadow-xs">
                        {preset.subject}
                      </span>
                      <span className="text-sm font-semibold text-white leading-tight truncate [text-shadow:_0_1px_4px_rgba(0,0,0,0.9)]">
                        {preset.title}
                      </span>
                    </div>

                    {/* Action buttons overlay */}
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col sm:flex-row items-center justify-center gap-2 p-3 backdrop-blur-2xs">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(preset.url);
                            const blob = await res.blob();
                            const file = new File([blob], `${preset.title.toLowerCase().replace(/\s+/g, '-')}-banner.jpg`, { type: 'image/jpeg' });
                            handleRawFileChange(file, 'banner');
                            toast.success(`Loaded "${preset.title}" into Banner Cropper!`);
                          } catch {
                            toast.error("Failed to load sample image.");
                          }
                        }}
                        className="w-full sm:w-auto flex-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition cursor-pointer shadow-md text-center"
                      >
                        Set Banner
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const res = await fetch(preset.url);
                            const blob = await res.blob();
                            const file = new File([blob], `${preset.title.toLowerCase().replace(/\s+/g, '-')}-card.jpg`, { type: 'image/jpeg' });
                            handleRawFileChange(file, 'card');
                            toast.success(`Loaded "${preset.title}" into Card Cropper!`);
                          } catch {
                            toast.error("Failed to load sample image.");
                          }
                        }}
                        className="w-full sm:w-auto flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition cursor-pointer shadow-md text-center"
                      >
                        Set Card
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <hr className="my-4 border-gray-200" />

        {/* Bank Account Details Section for Bank Slip Deposits */}
        <div className="bg-purple-50/60 p-5 rounded-2xl border border-purple-200 space-y-4">
          <div>
            <h3 className="font-extrabold text-purple-950 text-base flex items-center gap-2">
              <span>🏦</span> Bank Deposit Account Details (For Bank Slip Payments)
            </h3>
            <p className="text-xs text-purple-700 mt-0.5">
              Specify the institute bank account information where students can transfer funds and upload deposit slips.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-1">Bank Name</label>
              <input
                type="text"
                placeholder="e.g. Sampath Bank / Commercial Bank"
                className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-1">Account Holder Name</label>
              <input
                type="text"
                placeholder="e.g. LuminaLearn Education Pvt Ltd"
                className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600"
                value={bankDetails.accountName}
                onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-1">Account Number</label>
              <input
                type="text"
                placeholder="e.g. 1098 7654 3210"
                className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-purple-600"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-1">Branch Name</label>
              <input
                type="text"
                placeholder="e.g. Colombo Super Branch"
                className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-purple-600"
                value={bankDetails.branchName}
                onChange={(e) => setBankDetails({ ...bankDetails, branchName: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-purple-900 mb-1">Deposit Instructions for Students</label>
            <textarea
              rows="2"
              placeholder="e.g. Deposit exact course fee of LKR 2,500 and upload a clear photo/receipt of the bank transfer slip."
              className="w-full p-2.5 bg-white border border-purple-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-purple-600"
              value={bankDetails.paymentInstructions}
              onChange={(e) => setBankDetails({ ...bankDetails, paymentInstructions: e.target.value })}
            ></textarea>
          </div>
        </div>

        <hr className="my-4 border-gray-200" />

        <h3 className="font-semibold text-gray-700">Assign Teacher</h3>

        {/* Toggle between existing and new */}
        <div className="flex bg-gray-100 p-1 rounded-lg gap-2">
          <button
            type="button"
            onClick={() => setAssignmentMode('existing')}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${assignmentMode === 'existing' ? 'bg-white text-gray-800 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Select Existing Teacher
          </button>
          <button
            type="button"
            onClick={() => setAssignmentMode('new')}
            className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${assignmentMode === 'new' ? 'bg-white text-gray-800 shadow' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Register New Teacher
          </button>
        </div>

        {assignmentMode === 'existing' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">Choose Teacher</label>
            <select
              className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white cursor-pointer"
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              required={assignmentMode === 'existing'}
            >
              <option value="">-- Select Teacher --</option>
              {teachers.map(t => (
                <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Teacher Name</label>
              <input
                type="text"
                className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={newTeacherData.teacherName}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, teacherName: e.target.value })}
                required={assignmentMode === 'new'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Teacher Email</label>
              <input
                type="email"
                className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={newTeacherData.teacherEmail}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, teacherEmail: e.target.value })}
                required={assignmentMode === 'new'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Password</label>
              <input
                type="password"
                className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                value={newTeacherData.defaultPassword}
                onChange={(e) => setNewTeacherData({ ...newTeacherData, defaultPassword: e.target.value })}
                required={assignmentMode === 'new'}
                autoComplete="new-password"
              />
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="submit"
            onClick={() => setAddAnother(false)}
            disabled={isLoading}
            className={`flex-1 text-white p-3 rounded-lg font-bold transition ${isLoading ? 'bg-gray-400' : 'bg-lumina-purple hover:bg-purple-800 cursor-pointer'}`}
          >
            {isLoading && !addAnother ? 'Creating...' : 'Create Course'}
          </button>
          <button
            type="submit"
            onClick={() => setAddAnother(true)}
            disabled={isLoading}
            className={`flex-1 border-2 border-purple-600 text-purple-700 hover:bg-purple-50 p-3 rounded-lg font-bold transition ${isLoading ? 'opacity-50' : 'cursor-pointer'}`}
          >
            {isLoading && addAnother ? 'Creating...' : '+ Create & Add Another'}
          </button>
        </div>
      </form>

      {isCropping && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {cropSourceType === 'banner' ? 'Crop Banner Image' : 'Crop Thumbnail Image'}
                </h3>
                <p className="text-sm text-gray-500">
                  Drag the image, zoom in or out, and confirm the selected area.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCropper}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>

            <div className="relative h-[420px] overflow-hidden rounded-xl bg-gray-100">
              <Cropper
                image={cropFile}
                crop={crop}
                zoom={zoom}
                aspect={cropAspectRatio}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                cropShape="rect"
                showGrid={true}
              />
            </div>

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Zoom</label>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full accent-purple-600"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeCropper}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCropConfirm}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  Use cropped image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddCourse;