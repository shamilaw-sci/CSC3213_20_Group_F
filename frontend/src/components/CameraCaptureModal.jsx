import React, { useState, useRef, useEffect } from 'react';
import { FaCamera, FaTimes, FaRedo, FaCheck, FaVideoSlash } from 'react-icons/fa';

const CameraCaptureModal = ({ isOpen, onClose, onPhotoCaptured }) => {
  const [stream, setStream] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Initialize camera stream
  useEffect(() => {
    let activeStream = null;

    if (isOpen && !photoPreview) {
      setCameraError(null);
      navigator.mediaDevices?.getUserMedia({ 
        video: { 
          width: { ideal: 1920, min: 1280 }, 
          height: { ideal: 1080, min: 720 }, 
          frameRate: { ideal: 60, min: 30 },
          facingMode: 'user' 
        } 
      })
      .then(mediaStream => {
        activeStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          try {
            videoRef.current.disablePictureInPicture = true;
            if (document.pictureInPictureElement) {
              document.exitPictureInPicture().catch(() => {});
            }
          } catch (e) {}
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(err => {
        console.error("Camera access error:", err);
        setCameraError("Camera access was denied or not available. Please allow camera permissions.");
      });
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(track => track.stop());
      }
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch(() => {});
      }
    };
  }, [isOpen, photoPreview]);

  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setPhotoPreview(dataUrl);

    // Stop stream while previewing
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setPhotoPreview(null);
  };

  const handleConfirm = () => {
    if (photoPreview) {
      onPhotoCaptured(photoPreview);
      handleClose();
    }
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setPhotoPreview(null);
    setCameraError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs rounded-2xl sm:rounded-3xl animate-fadeIn select-none overflow-y-auto">
      <div className="relative w-full max-w-sm bg-white rounded-2xl sm:rounded-3xl border border-gray-200 p-4 shadow-2xl space-y-3 text-gray-900 animate-in zoom-in-95 my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg">
              <FaCamera />
            </div>
            <div>
              <h3 className="text-base font-black text-gray-900">Take Photo</h3>
              <p className="text-xs text-gray-500 font-medium">Capture a snapshot to attach in live chat</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 flex items-center justify-center transition cursor-pointer"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Camera Viewport / Photo Preview */}
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-gray-200 flex items-center justify-center shadow-inner">
          {cameraError ? (
            <div className="text-center p-4 space-y-2 text-red-400">
              <FaVideoSlash className="text-3xl mx-auto text-red-500" />
              <p className="text-xs font-bold text-gray-200 max-w-xs">{cameraError}</p>
            </div>
          ) : photoPreview ? (
            <img src={photoPreview} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              disablePictureInPicture
              controls={false}
              controlsList="nodownload noplaybackrate nopictureinpicture"
              className="w-full h-full object-cover mirror"
            />
          )}

          {/* Hidden Canvas for capture processing */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 pt-1">
          {photoPreview ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition active:scale-95"
              >
                <FaRedo className="text-xs" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-extrabold text-xs flex items-center gap-2 shadow-md transition active:scale-95 cursor-pointer"
              >
                <FaCheck className="text-xs" />
                <span>Attach Photo</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!!cameraError}
              onClick={handleSnap}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white font-black text-sm shadow-lg shadow-purple-950/30 flex items-center gap-2.5 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <FaCamera />
              <span>Capture Photo</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CameraCaptureModal;
