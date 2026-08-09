import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { 
  FaTimes, FaBookOpen, FaDownload, FaSync, 
  FaSpinner, FaChevronLeft, FaChevronRight, FaCheckCircle
} from 'react-icons/fa';

const PdfReaderModal = ({ pdf, courseId, lessonId, initialProgress, onClose, onProgressUpdated }) => {
  const [loadingPdf, setLoadingPdf] = useState(true);
  const [totalPages, setTotalPages] = useState(initialProgress?.totalPages || 20);
  const [maxPageRead, setMaxPageRead] = useState(initialProgress?.maxPageRead || 1);
  const [currentPage, setCurrentPage] = useState(initialProgress?.maxPageRead || 1);
  const [saving, setSaving] = useState(false);
  const [useIframeFallback, setUseIframeFallback] = useState(false);

  const scrollContainerRef = useRef(null);
  const pagesContainerRef = useRef(null);
  const observerRef = useRef(null);

  const getFullPdfUrl = (rawUrl) => {
    if (!rawUrl || !rawUrl.trim()) {
      return 'https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf';
    }
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
      return rawUrl;
    }
    let filename = rawUrl;
    if (rawUrl.includes('/uploads/')) {
      filename = rawUrl.split('/uploads/').pop();
    } else if (rawUrl.startsWith('/')) {
      filename = rawUrl.substring(1);
    }
    const backendBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    return `${backendBase}/uploads/${filename}`;
  };

  const fileUrl = getFullPdfUrl(pdf?.fileUrl);
  const pdfTitle = pdf?.title || 'Study Material PDF';
  const pdfId = pdf?._id || pdf?.filename || 'pdf-doc';

  const progressPercentage = totalPages > 0 
    ? Math.min(100, Math.round((maxPageRead / totalPages) * 100))
    : 0;

  // Auto-save reading progress to backend
  const saveProgress = async (pageToSave, totalToSave) => {
    if (!courseId || !lessonId || !pdfId || totalToSave <= 0) return;
    setSaving(true);
    try {
      const res = await api.post('/api/progress/pdf', {
        courseId,
        lessonId,
        pdfId,
        pdfTitle,
        currentPage: pageToSave,
        totalPages: totalToSave
      });
      if (onProgressUpdated && res.data?.progress) {
        onProgressUpdated(pdfId, res.data.progress);
      }
    } catch (err) {
      console.error("Auto-save scroll progress failed:", err);
    } finally {
      setSaving(false);
    }
  };

  // Safety timer: If canvas rendering takes more than 2.5 seconds, switch to iframe view
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loadingPdf) {
        console.warn("PDF.js canvas timeout - switching to instant viewer fallback");
        setUseIframeFallback(true);
        setLoadingPdf(false);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [loadingPdf]);

  // Load PDF.js & Render Pages as Native Canvases
  useEffect(() => {
    let isMounted = true;
    setLoadingPdf(true);

    const initPdfJs = async () => {
      try {
        if (!window.pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
          script.async = true;
          document.head.appendChild(script);

          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = reject;
          });
        }

        if (!window.pdfjsLib) {
          throw new Error("pdfjsLib not available");
        }

        // Disable worker to avoid cross-origin CORS worker blocking in Chrome
        if (window.pdfjsLib.GlobalWorkerOptions) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        }

        const loadingTask = window.pdfjsLib.getDocument({
          url: fileUrl,
          disableWorker: true,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true
        });
        
        const pdfDoc = await loadingTask.promise;

        if (!isMounted) return;

        const numPages = pdfDoc.numPages;
        setTotalPages(numPages);

        const container = pagesContainerRef.current;
        if (!container) return;
        container.innerHTML = '';

        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const pageNum = parseInt(entry.target.getAttribute('data-page-number'), 10);
              if (!isNaN(pageNum)) {
                setCurrentPage(pageNum);
                setMaxPageRead((prev) => {
                  const newMax = Math.max(prev, pageNum);
                  if (newMax > prev) {
                    saveProgress(newMax, numPages);
                  }
                  return newMax;
                });
              }
            }
          });
        }, {
          root: scrollContainerRef.current,
          threshold: 0.3
        });

        // Render pages onto canvases
        for (let pageNum = 1; pageNum <= numPages; pageNum++) {
          if (!isMounted) break;

          const pageWrapper = document.createElement('div');
          pageWrapper.id = `pdf-page-${pageNum}`;
          pageWrapper.className = 'pdf-page-card relative bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mb-8 flex flex-col items-center justify-center transition-all duration-300';
          pageWrapper.setAttribute('data-page-number', pageNum);

          const canvas = document.createElement('canvas');
          canvas.className = 'w-full h-auto block';

          const pageBadge = document.createElement('div');
          pageBadge.className = 'absolute top-4 right-4 bg-slate-900/80 text-white text-xs font-bold px-3 py-1 rounded-full border border-slate-700 backdrop-blur-xs z-10 pointer-events-none';
          pageBadge.innerText = `Page ${pageNum} of ${numPages}`;

          pageWrapper.appendChild(canvas);
          pageWrapper.appendChild(pageBadge);
          container.appendChild(pageWrapper);

          observerRef.current.observe(pageWrapper);

          const page = await pdfDoc.getPage(pageNum);
          const viewport = page.getViewport({ scale: 1.4 });
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          const renderContext = {
            canvasContext: canvas.getContext('2d'),
            viewport: viewport
          };
          await page.render(renderContext).promise;
        }

        if (isMounted) setLoadingPdf(false);

      } catch (err) {
        console.warn("PDF.js canvas load failed, switching to instant viewer:", err);
        if (isMounted) {
          setUseIframeFallback(true);
          setLoadingPdf(false);
        }
      }
    };

    initPdfJs();

    return () => {
      isMounted = false;
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [fileUrl]);

  // Jump to specific page button
  const scrollToPage = (pageNum) => {
    const target = document.getElementById(`pdf-page-${pageNum}`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Fallback Scroll Handler for Viewport Container
  const handleViewportScroll = (e) => {
    const el = e.target;
    if (!el || totalPages <= 0) return;
    const scrollRatio = el.scrollTop / (el.scrollHeight - el.clientHeight || 1);
    const estimatedPage = Math.max(1, Math.min(totalPages, Math.ceil(scrollRatio * totalPages)));

    setCurrentPage(estimatedPage);
    setMaxPageRead((prev) => {
      const newMax = Math.max(prev, estimatedPage);
      if (newMax > prev) {
        saveProgress(newMax, totalPages);
      }
      return newMax;
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col animate-fadeIn font-sans text-slate-100">
      
      {/* Top Controls Header */}
      <div className="bg-slate-900 text-white p-4 px-6 border-b border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 shadow-xl z-20">
        
        {/* Document Info */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-900/80 text-purple-300 rounded-xl border border-purple-700/50">
            <FaBookOpen className="text-xl" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white line-clamp-1">{pdfTitle}</h3>
            <p className="text-xs text-purple-300 font-medium">
              Automated Scroll Detection • Anti-Cheat Verification
            </p>
          </div>
        </div>

        {/* Live Page Badge & Navigation Controls */}
        <div className="flex items-center gap-3 bg-slate-800/90 p-2 px-4 rounded-2xl border border-slate-700">
          <button
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer"
            title="Previous Page"
          >
            <FaChevronLeft />
          </button>

          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
            <span className="text-xs font-extrabold text-white">
              Currently Viewing Page {currentPage} of {totalPages > 0 ? totalPages : '...'}
            </span>
          </div>

          <button
            onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 transition cursor-pointer"
            title="Next Page"
          >
            <FaChevronRight />
          </button>

          {saving && (
            <span className="text-[11px] text-amber-400 font-bold animate-pulse flex items-center gap-1 border-l border-slate-700 pl-3">
              <FaSync className="animate-spin text-xs" /> Saving...
            </span>
          )}
        </div>

        {/* Progress Percentage Badge & Close */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800 shadow-inner">
            <div className="text-right">
              <span className={`block text-xs font-extrabold ${progressPercentage >= 100 ? 'text-emerald-400' : 'text-purple-400'}`}>
                {progressPercentage}% Read
              </span>
              <span className="block text-[10px] text-slate-400 font-semibold">
                Highest Scrolled: Page {maxPageRead} / {totalPages}
              </span>
            </div>

            <div className="w-12 bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${progressPercentage >= 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-purple-500 to-indigo-400'}`}
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>

          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer"
              title="Download Original PDF File"
            >
              <FaDownload />
            </a>
          )}

          <button
            onClick={onClose}
            className="p-2.5 bg-red-600/90 hover:bg-red-600 text-white rounded-xl transition cursor-pointer"
            title="Close Reader"
          >
            <FaTimes />
          </button>
        </div>
      </div>

      {/* Main Document Viewport */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleViewportScroll}
        className="flex-1 bg-slate-950 p-4 sm:p-8 overflow-y-auto max-h-[calc(100vh-73px)] scroll-smooth flex justify-center items-start"
      >
        {loadingPdf ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <FaSpinner className="text-4xl text-purple-500 animate-spin" />
            <p className="text-sm font-bold text-slate-300">Rendering PDF Document Pages & Anti-Cheat Scroll Tracker...</p>
          </div>
        ) : useIframeFallback ? (
          <div className="w-full max-w-5xl h-full min-h-[750px] flex flex-col items-center">
            <object
              data={fileUrl}
              type="application/pdf"
              className="w-full h-full min-h-[750px] bg-white rounded-2xl shadow-2xl border border-slate-800"
            >
              <iframe
                src={fileUrl}
                title={pdfTitle}
                className="w-full h-full min-h-[750px] bg-white rounded-2xl shadow-2xl border border-slate-800"
              ></iframe>
            </object>
          </div>
        ) : (
          <div 
            ref={pagesContainerRef}
            className="w-full max-w-4xl space-y-6 pb-20"
          >
            {/* Native HTML Canvases rendered by PDF.js */}
          </div>
        )}
      </div>

    </div>
  );
};

export default PdfReaderModal;
