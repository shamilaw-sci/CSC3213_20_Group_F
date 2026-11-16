/**
 * @file PdfReaderModal.jsx
 * @description In-App PDF Reader Modal. Feature-rich PDF viewer with zoom controls, page navigation, fullscreen mode, and automatic reading progress tracking.
 */

import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { fetchBlobUrl, downloadProtectedFile } from '../utils/fileApi';
import {
  FaTimes, FaBookOpen, FaDownload, FaSync,
  FaSpinner, FaChevronLeft, FaChevronRight, FaCheckCircle
} from 'react-icons/fa';

const PdfReaderModal = ({ pdf, courseId, lessonId, initialProgress, onClose, onProgressUpdated }) => {
  const [status, setStatus]             = useState('loading'); // loading | done | native
  const [totalPages, setTotalPages]     = useState(initialProgress?.totalPages || 20);
  const [maxPageRead, setMaxPageRead]   = useState(initialProgress?.maxPageRead || 0);
  const [currentPage, setCurrentPage]   = useState(initialProgress?.maxPageRead || 1);
  const [saving, setSaving]             = useState(false);
  const [savedFlash, setSavedFlash]     = useState(false);
  const [blobUrl, setBlobUrl]           = useState(null);
  const [downloading, setDownloading]   = useState(false);

  const maxPageReadRef   = useRef(initialProgress?.maxPageRead || 0);
  const totalPagesRef    = useRef(initialProgress?.totalPages  || 20);
  const debounceRef      = useRef(null);
  const pageRatiosRef    = useRef({});
  const renderedRef      = useRef(new Set());
  const pdfDocRef        = useRef(null);
  const scrollContRef    = useRef(null);
  const pagesContRef     = useRef(null);
  const visObsRef        = useRef(null);
  const renderObsRef     = useRef(null);
  const blobCleanupRef   = useRef(null);
  const onProgressUpdRef = useRef(onProgressUpdated);
  useEffect(() => { onProgressUpdRef.current = onProgressUpdated; }, [onProgressUpdated]);

  const pdfTitle = pdf?.title || 'Study Material PDF';
  const pdfId    = pdf?._id ? String(pdf._id) : (pdf?.filename || pdf?.title || 'pdf-doc');
  const pct      = totalPages > 0 ? Math.min(100, Math.round((maxPageRead / totalPages) * 100)) : 0;
  const canDownload = pdf?.allowDownload !== false;

  // ── Save progress ────────────────────────────────────────────────────────
  const doSave = (page, total) => {
    if (!courseId || !lessonId || !pdfId || total <= 0 || page <= 0) return;
    const safe = Math.min(total, Math.max(1, page));
    setSaving(true);
    api.post('/progress/pdf', { courseId, lessonId, pdfId, pdfTitle, currentPage: safe, totalPages: total })
      .then(res => {
        if (res.data?.progress && onProgressUpdRef.current) {
          onProgressUpdRef.current(pdfId, { ...res.data.progress, pdfId, pdfTitle });
        }
        setSavedFlash(true);
        setTimeout(() => setSavedFlash(false), 2500);
      })
      .catch(err => console.error('Save failed:', err))
      .finally(() => setSaving(false));
  };

  // ── Scroll detection: called by IntersectionObserver ────────────────────
  const onPageSeen = (pageNum) => {
    setCurrentPage(pageNum);
    if (pageNum > maxPageReadRef.current) {
      maxPageReadRef.current = pageNum;
      setMaxPageRead(pageNum);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        doSave(maxPageReadRef.current, totalPagesRef.current);
      }, 1500);
    }
  };

  // ── Lazy-render a single page canvas ────────────────────────────────────
  const renderOnePage = async (pageNum) => {
    if (!pdfDocRef.current || renderedRef.current.has(pageNum)) return;
    renderedRef.current.add(pageNum);
    const wrapper = document.getElementById(`pdf-page-${pageNum}`);
    if (!wrapper) return;
    const canvas = wrapper.querySelector('canvas');
    const placeholder = wrapper.querySelector('.ph');
    if (!canvas) return;
    try {
      const page = await pdfDocRef.current.getPage(pageNum);
      const vp   = page.getViewport({ scale: 1.4 });
      canvas.width  = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      canvas.style.display = 'block';
      if (placeholder) placeholder.remove();
    } catch (e) {
      console.warn(`Page ${pageNum} render error`, e);
    }
  };

  // ── Load PDF.js with CDN fallbacks ──────────────────────────────────────
  const loadPdfJsScript = () => {
    if (window.pdfjsLib) return Promise.resolve();
    const cdnUrls = [
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js',
      'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js'
    ];

    const tryLoad = (index) => {
      if (index >= cdnUrls.length) return Promise.reject(new Error('All PDF.js CDNs failed'));
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = cdnUrls[index];
        s.onload = resolve;
        s.onerror = () => tryLoad(index + 1).then(resolve).catch(reject);
        document.head.appendChild(s);
      });
    };

    return tryLoad(0);
  };

  // ── Fetch authenticated Blob and load PDF.js ────────────────────────────
  useEffect(() => {
    let alive = true;

    (async () => {
      setStatus('loading');
      try {
        // 1. Determine protected API route
        let targetEndpoint = '';
        if (lessonId && (pdf?._id || pdf?.filename)) {
          targetEndpoint = `/files/lesson/${lessonId}/pdf/${pdf._id || pdf.filename}`;
        } else if (pdf?.fileUrl) {
          targetEndpoint = pdf.fileUrl.replace(/^https?:\/\/[^/]+\/api/, '').replace(/^\/api/, '');
        }

        if (!targetEndpoint) {
          setStatus('native');
          return;
        }

        // 2. Fetch authenticated blob
        const { blobUrl: objectUrl, revoke } = await fetchBlobUrl(targetEndpoint);
        if (!alive) {
          revoke();
          return;
        }

        blobCleanupRef.current = revoke;
        setBlobUrl(objectUrl);

        // 3. Initialize PDF.js
        await loadPdfJsScript();
        if (!alive) return;

        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        const doc = await window.pdfjsLib.getDocument({
          url: objectUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        }).promise;
        if (!alive) return;

        pdfDocRef.current = doc;
        const n = doc.numPages;
        setTotalPages(n);
        totalPagesRef.current = n;

        // Build page containers
        const container = pagesContRef.current;
        if (!container) return;
        container.innerHTML = '';
        pageRatiosRef.current = {};
        renderedRef.current   = new Set();

        for (let p = 1; p <= n; p++) {
          const w = document.createElement('div');
          w.id    = `pdf-page-${p}`;
          w.setAttribute('data-page-number', String(p));
          Object.assign(w.style, {
            position:'relative', borderRadius:'14px', marginBottom:'28px',
            overflow:'hidden', border:'1px solid #334155', background:'#1e293b',
            boxShadow:'0 20px 40px -15px rgba(0,0,0,0.6)', minHeight:'500px',
            display:'flex', alignItems:'center', justifyContent:'center'
          });

          const ph = document.createElement('div');
          ph.className = 'ph';
          ph.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#475569;font-size:12px;font-weight:600;';
          ph.textContent = `Page ${p} of ${n}`;
          w.appendChild(ph);

          const cv = document.createElement('canvas');
          cv.style.cssText = 'display:none;width:100%;height:auto;border-radius:14px;';
          w.appendChild(cv);

          container.appendChild(w);
        }

        // Set up IntersectionObservers
        if (visObsRef.current) visObsRef.current.disconnect();
        visObsRef.current = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            const p = parseInt(e.target.getAttribute('data-page-number'), 10);
            if (e.isIntersecting) {
              pageRatiosRef.current[p] = e.intersectionRatio;
            } else {
              delete pageRatiosRef.current[p];
            }
          });
          const active = Object.entries(pageRatiosRef.current).sort((a,b) => b[1] - a[1])[0];
          if (active) onPageSeen(parseInt(active[0], 10));
        }, { root: scrollContRef.current, threshold: [0.1, 0.3, 0.6] });

        if (renderObsRef.current) renderObsRef.current.disconnect();
        renderObsRef.current = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              const p = parseInt(e.target.getAttribute('data-page-number'), 10);
              renderOnePage(p);
            }
          });
        }, { root: scrollContRef.current, rootMargin: '400px 0px' });

        for (let p = 1; p <= n; p++) {
          const el = document.getElementById(`pdf-page-${p}`);
          if (el) {
            visObsRef.current.observe(el);
            renderObsRef.current.observe(el);
          }
        }

        // Render page 1 immediately
        await renderOnePage(1);
        setStatus('done');
      } catch (err) {
        console.warn('PDF.js rendering error, switching to native viewer:', err);
        if (alive) setStatus('native');
      }
    })();

    return () => {
      alive = false;
      if (visObsRef.current) visObsRef.current.disconnect();
      if (renderObsRef.current) renderObsRef.current.disconnect();
      if (blobCleanupRef.current) {
        blobCleanupRef.current();
      }
    };
  }, [lessonId, pdf?._id, pdf?.filename, pdf?.fileUrl]);

  // ── Handle Download ──────────────────────────────────────────────────────
  const handleDownload = async () => {
    if (!canDownload) return;
    setDownloading(true);
    try {
      const targetEndpoint = lessonId && (pdf?._id || pdf?.filename)
        ? `/files/lesson/${lessonId}/pdf/${pdf._id || pdf.filename}?download=true`
        : (pdf?.fileUrl || '');
      await downloadProtectedFile(targetEndpoint, `${pdfTitle}.pdf`);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:9999,
      display:'flex', flexDirection:'column',
      background:'rgba(2,6,23,0.96)', backdropFilter:'blur(12px)',
      fontFamily:'system-ui,-apple-system,sans-serif'
    }}>
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'12px 20px', background:'#0f172a', borderBottom:'1px solid #1e293b',
        gap:'12px', flexWrap:'wrap'
      }}>
        {/* Title */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
          <div style={{ width:'36px', height:'36px', borderRadius:'10px',
            background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <FaBookOpen style={{ color:'#fff', fontSize:'16px' }} />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:'14px', color:'#f8fafc',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'280px' }}>
              {pdfTitle}
            </div>
            <div style={{ fontSize:'11px', color:'#94a3b8' }}>
              Reading Progress: {pct}%
            </div>
          </div>
        </div>

        {/* Progress status */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
            <div style={{ fontSize:'12px', color:'#94a3b8', fontWeight:600 }}>
              Page {currentPage} of {totalPages}
            </div>
          </div>
          <div style={{ width:'52px', height:'10px', background:'#1e293b',
            borderRadius:'999px', overflow:'hidden', border:'1px solid #334155' }}>
            <div style={{
              width:`${pct}%`, height:'100%', borderRadius:'999px',
              background: pct >= 100 ? '#34d399' : 'linear-gradient(90deg,#7c3aed,#6366f1)',
              transition:'width .6s ease'
            }} />
          </div>
          {saving
            ? <span style={{ fontSize:'10px', color:'#fbbf24', fontWeight:700,
                display:'flex', alignItems:'center', gap:'4px' }}>
                <FaSync style={{ animation:'_spin 1s linear infinite', fontSize:'9px' }} /> Saving
              </span>
            : savedFlash
            ? <span style={{ fontSize:'10px', color:'#34d399', fontWeight:700,
                display:'flex', alignItems:'center', gap:'4px' }}>
                <FaCheckCircle style={{ fontSize:'9px' }} /> Saved!
              </span>
            : null}
        </div>

        {/* Download + Close */}
        <div style={{ display:'flex', gap:'8px' }}>
          {canDownload && (
            <button 
              onClick={handleDownload} 
              disabled={downloading}
              title="Download PDF"
              style={{ padding:'8px 12px', background:'#1e293b', border:'1px solid #334155',
                borderRadius:'10px', color:'#94a3b8', cursor: downloading ? 'wait' : 'pointer', 
                display:'flex', alignItems:'center', gap:'6px', fontSize:'13px' }}>
              {downloading ? <FaSpinner style={{ animation:'_spin 1s linear infinite' }} /> : <FaDownload />}
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
          <button onClick={onClose}
            style={{ padding:'8px 12px', background:'rgba(220,38,38,.8)', border:'none',
              borderRadius:'10px', color:'#fff', cursor:'pointer' }}>
            <FaTimes />
          </button>
        </div>
      </div>

      {/* ── Scroll viewport ────────────────────────────────────────────── */}
      <div ref={scrollContRef}
        style={{ flex:1, overflowY:'auto', background:'#020617',
          padding:'24px 16px', display:'flex', justifyContent:'center', alignItems:'flex-start' }}>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', padding:'120px 0', gap:'16px' }}>
            <FaSpinner style={{ fontSize:'40px', color:'#7c3aed', animation:'_spin 1s linear infinite' }} />
            <p style={{ fontWeight:700, fontSize:'14px', color:'#cbd5e1' }}>Loading Protected PDF…</p>
            <p style={{ fontSize:'12px', color:'#475569' }}>Authenticating access and preparing document</p>
          </div>
        )}

        {/* Native browser viewer fallback with authenticated blob */}
        {status === 'native' && (
          <div style={{ width:'100%', maxWidth:'1000px', height:'calc(100vh - 120px)', background:'#1e293b', borderRadius:'16px', overflow:'hidden', border:'1px solid #334155' }}>
            {blobUrl ? (
              <object
                data={`${blobUrl}#toolbar=1`}
                type="application/pdf"
                style={{ width:'100%', height:'100%', border:'none' }}
              >
                <iframe
                  src={`${blobUrl}#toolbar=1`}
                  title={pdfTitle}
                  style={{ width:'100%', height:'100%', border:'none' }}
                />
              </object>
            ) : (
              <div style={{ textAlign:'center', padding:'80px 20px', color:'#94a3b8' }}>
                PDF file is unavailable or you do not have permission to view it.
              </div>
            )}
          </div>
        )}

        {/* PDF.js lazy-rendered pages */}
        <div ref={pagesContRef}
          style={{ width:'100%', maxWidth:'900px', paddingBottom:'80px',
            display: status === 'done' ? 'block' : 'none' }} />
      </div>

      <style>{`@keyframes _spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
};

export default PdfReaderModal;
