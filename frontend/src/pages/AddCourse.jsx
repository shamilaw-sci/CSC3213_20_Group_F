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

// ── Main component ───────────────────────────────────────────────────────────
const AddCourse = () => {
  const [courseData, setCourseData] = useState({ title: '', description: '' });
  const [studentType, setStudentType] = useState('all'); // 'all' | 'online' | 'physical'
  const [bannerFile, setBannerFile] = useState(null);
  const [cardImageFile, setCardImageFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [cardPreview, setCardPreview] = useState(null);

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
          <label className="block text-sm font-medium text-gray-700">Description</label>
          <textarea
            className="w-full p-3 mt-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            value={courseData.description}
            onChange={(e) => setCourseData({ ...courseData, description: e.target.value })}
            required
          />
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

        {/* Image uploads side by side */}
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