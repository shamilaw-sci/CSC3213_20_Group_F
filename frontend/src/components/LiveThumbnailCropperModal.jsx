import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { FaTimes, FaCrop, FaSearchPlus, FaSearchMinus, FaCheck, FaRedo, FaUndo } from 'react-icons/fa';

const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

const getCroppedImg = async (imageSrc, pixelCrop) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  // High definition 16:9 thumbnail resolution (1280x720)
  const targetWidth = 1280;
  const targetHeight = 720;

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');

  ctx.imageSmoothingQuality = 'high';
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

  return canvas.toDataURL('image/jpeg', 0.90);
};

const LiveThumbnailCropperModal = ({
  isOpen,
  imageSrc,
  onClose,
  onCropComplete
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = (newCrop) => setCrop(newCrop);
  const onZoomChange = (newZoom) => setZoom(newZoom);

  const handleCropAreaComplete = useCallback((croppedArea, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApplyCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      setIsProcessing(true);
      const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBase64);
      onClose();
    } catch (err) {
      console.error('Cropping error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  if (!isOpen || !imageSrc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-rose-500 via-red-600 to-rose-700 text-white flex items-center justify-center text-lg font-black shadow-md shadow-red-500/25">
              <FaCrop />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-base sm:text-lg tracking-tight">Crop Live Class Thumbnail</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">16:9 Standard YouTube Widescreen Aspect Ratio (1280 × 720)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition cursor-pointer"
            title="Close"
          >
            <FaTimes className="text-sm" />
          </button>
        </div>

        {/* Cropper Canvas Area */}
        <div className="relative w-full h-72 sm:h-96 bg-slate-950 select-none overflow-hidden shadow-inner">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={16 / 9}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropAreaComplete}
            showGrid={true}
          />
        </div>

        {/* Controls Toolbar */}
        <div className="p-5 sm:p-6 bg-white border-t border-slate-100 space-y-4">
          <div className="p-3.5 sm:p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-xs">
            {/* Zoom Slider */}
            <div className="flex items-center gap-3 flex-1">
              <button 
                type="button" 
                onClick={() => setZoom(z => Math.max(1, +(z - 0.2).toFixed(2)))} 
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                title="Zoom Out"
              >
                <FaSearchMinus className="text-xs" />
              </button>
              <input
                type="range"
                min={1}
                max={3}
                step={0.05}
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
              />
              <button 
                type="button" 
                onClick={() => setZoom(z => Math.min(3, +(z + 0.2).toFixed(2)))} 
                className="text-slate-400 hover:text-slate-700 transition cursor-pointer p-1"
                title="Zoom In"
              >
                <FaSearchPlus className="text-xs" />
              </button>
              <span className="text-xs font-black text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200/80 shadow-2xs min-w-[42px] text-center">
                {zoom.toFixed(1)}x
              </span>
            </div>

            {/* Rotation & Reset Buttons */}
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
              >
                <FaRedo className="text-xs text-slate-500" />
                <span>Rotate 90°</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition shadow-2xs cursor-pointer active:scale-95"
                title="Reset crop and rotation"
              >
                <FaUndo className="text-xs" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-rose-800 text-white font-black text-xs sm:text-sm shadow-lg shadow-red-500/25 ring-1 ring-red-400/40 flex items-center gap-2 transition cursor-pointer disabled:opacity-50 transform hover:-translate-y-0.5 active:scale-95"
            >
              <FaCheck className="text-xs" />
              <span>{isProcessing ? 'Processing Crop...' : 'Apply & Save Thumbnail'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveThumbnailCropperModal;
