import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import {
  FaTimes, FaBookOpen, FaDownload, FaSync,
  FaSpinner, FaChevronLeft, FaChevronRight, FaCheckCircle, FaExclamationTriangle
} from 'react-icons/fa';

const PdfReaderModal = ({ pdf, courseId, lessonId, initialProgress, onClose, onProgressUpdated }) => {
  const [status, setStatus]             = useState('loading'); // loading | done | error
  const [totalPages, setTotalPages]     = useState(initialProgress?.totalPages || 0);
  const [maxPageRead, setMaxPageRead]   = useState(initialProgress?.maxPageRead || 0);
  const [currentPage, setCurrentPage]   = useState(initialProgress?.maxPageRead || 1);
  const [saving, setSaving]             = useState(false);
  const [savedFlash, setSavedFlash]     = useState(false);
  const [manualPage, setManualPage]     = useState('');
  const [showManual, setShowManual]     = useState(false);

  const maxPageReadRef   = useRef(initialProgress?.maxPageRead || 0);
  const totalPagesRef    = useRef(initialProgress?.totalPages  || 0);
  const debounceRef      = useRef(null);
  const pageRatiosRef    = useRef({});
  const renderedRef      = useRef(new Set());
  const pdfDocRef        = useRef(null);
  const scrollContRef    = useRef(null);
  const pagesContRef     = useRef(null);
  const visObsRef        = useRef(null);
  const renderObsRef     = useRef(null);
  const onProgressUpdRef = useRef(onProgressUpdated);
  useEffect(() => { onProgressUpdRef.current = onProgressUpdated; }, [onProgressUpdated]);

  // ── URL builder ─────────────────────────────────────────────────────────
  const getFullPdfUrl = (raw) => {
    if (!raw || !raw.trim()) return null;
    if (/^https?:\/\/|^data:/.test(raw)) return raw;
    const file = raw.includes('/uploads/') ? raw.split('/uploads/').pop() : raw.replace(/^\//, '');
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
    return `${base}/uploads/${file}`;
  };

  const fileUrl  = getFullPdfUrl(pdf?.fileUrl);
  const pdfTitle = pdf?.title || 'Study Material PDF';
  const pdfId    = pdf?._id ? String(pdf._id) : (pdf?.filename || pdf?.title || 'pdf-doc');
  const pct      = totalPages > 0 ? Math.min(100, Math.round((maxPageRead / totalPages) * 100)) : 0;

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
      // Debounce: save 1.5s after scrolling stops
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
    const wrapper     = document.getElementById(`pdf-page-${pageNum}`);
    if (!wrapper) return;
    const canvas      = wrapper.querySelector('canvas');
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

  // ── PDF.js init — runs ONCE per fileUrl ──────────────────────────────────
  useEffect(() => {
    if (!fileUrl) { setStatus('error'); return; }
    let alive = true;

    (async () => {
      setStatus('loading');
      try {
        // Load PDF.js script if needed
        if (!window.pdfjsLib) {
          await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
          });
        }
        if (!alive) return;

        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

        // Fetch document metadata only (fast)
        const doc = await window.pdfjsLib.getDocument({
          url: fileUrl,
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        }).promise;
        if (!alive) return;

        pdfDocRef.current = doc;
        const n = doc.numPages;
        setTotalPages(n);
        totalPagesRef.current = n;

        // Build ALL page placeholders instantly
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
            minHeight:'320px', display:'flex', alignItems:'center', justifyContent:'center',
          });

          // Spinner placeholder (removed once canvas renders)
          const ph = document.createElement('div');
          ph.className = 'ph';
          ph.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;padding:40px;color:#475569;';
          ph.innerHTML = `
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2"
              style="animation:_spin 1s linear infinite">
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83
                       M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
            </svg>
            <span style="font-size:11px;font-weight:600;color:#64748b;">Page ${p} of ${n}</span>`;

          const cv = document.createElement('canvas');
          cv.style.cssText = 'display:none;width:100%;height:auto;';

          const badge = document.createElement('div');
          badge.style.cssText = `position:absolute;top:10px;right:10px;z-index:5;
            background:rgba(15,23,42,.9);color:#fff;font-size:10px;font-weight:700;
            padding:3px 9px;border-radius:999px;border:1px solid #475569;
            pointer-events:none;font-family:monospace;`;
          badge.innerText = `${p} / ${n}`;

          w.appendChild(ph); w.appendChild(cv); w.appendChild(badge);
          container.appendChild(w);
        }

        setStatus('done');

        // Observer A — picks most-visible page → updates header + triggers debounced save
        if (visObsRef.current) visObsRef.current.disconnect();
        visObsRef.current = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            const p = parseInt(e.target.getAttribute('data-page-number'), 10);
            if (!isNaN(p)) pageRatiosRef.current[p] = e.intersectionRatio;
          });
          const ratios = pageRatiosRef.current;
          const keys   = Object.keys(ratios).filter(k => ratios[k] > 0);
          if (!keys.length) return;
          const best = parseInt(keys.reduce((a, b) => ratios[a] > ratios[b] ? a : b), 10);
          onPageSeen(best);
        }, { root: scrollContRef.current, threshold: [0, 0.25, 0.5, 0.75, 1] });

        // Observer B — triggers canvas render when page is 400px from viewport
        if (renderObsRef.current) renderObsRef.current.disconnect();
        renderObsRef.current = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              const p = parseInt(e.target.getAttribute('data-page-number'), 10);
              if (!isNaN(p)) renderOnePage(p);
            }
          });
        }, { root: scrollContRef.current, rootMargin: '400px 0px', threshold: 0 });

        container.querySelectorAll('[data-page-number]').forEach(el => {
          visObsRef.current.observe(el);
          renderObsRef.current.observe(el);
        });

        // Auto-scroll to last-read page
        const startPg = maxPageReadRef.current > 1 ? maxPageReadRef.current : 1;
        if (startPg > 1) {
          setTimeout(() => {
            document.getElementById(`pdf-page-${startPg}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
          }, 400);
        }

      } catch (err) {
        console.error('PDF.js init failed:', err);
        if (alive) setStatus('error');
      }
    })();

    return () => {
      alive = false;
      visObsRef.current?.disconnect();
      renderObsRef.current?.disconnect();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fileUrl]); // Only re-runs when the PDF URL changes

  // ── Prev / Next button ───────────────────────────────────────────────────
  const handlePageChange = (newPage) => {
    const vp = Math.min(totalPagesRef.current, Math.max(1, newPage));
    setCurrentPage(vp);
    if (vp > maxPageReadRef.current) { maxPageReadRef.current = vp; setMaxPageRead(vp); }
    document.getElementById(`pdf-page-${vp}`)?.scrollIntoView({ behavior:'smooth', block:'start' });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSave(Math.max(vp, maxPageReadRef.current), totalPagesRef.current);
  };

  // ── Manual page sync (student types current page number) ─────────────────
  const handleManualSync = () => {
    const pg = parseInt(manualPage, 10);
    if (!pg || pg < 1 || pg > totalPagesRef.current) return;
    maxPageReadRef.current = Math.max(maxPageReadRef.current, pg);
    setMaxPageRead(maxPageReadRef.current);
    setCurrentPage(pg);
    setManualPage('');
    setShowManual(false);
    doSave(maxPageReadRef.current, totalPagesRef.current);
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:50,display:'flex',flexDirection:'column',
      background:'rgba(2,6,23,.97)', fontFamily:"'Inter',sans-serif", color:'#f1f5f9' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ background:'#0f172a', borderBottom:'1px solid #1e293b',
        padding:'10px 20px', display:'flex', flexWrap:'wrap',
        justifyContent:'space-between', alignItems:'center', gap:'10px', zIndex:20 }}>

        {/* Title */}
        <div style={{ display:'flex', alignItems:'center', gap:'10px', minWidth:0 }}>
          <div style={{ padding:'8px', background:'#3b0764', border:'1px solid #6b21a8',
            borderRadius:'10px', color:'#d8b4fe', flexShrink:0 }}><FaBookOpen /></div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:'13px', color:'#fff',
              whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', maxWidth:'200px' }}>{pdfTitle}</div>
            <div style={{ fontSize:'10px', color:'#a855f7', fontWeight:600 }}>Scroll Detection Active • Auto-Save</div>
          </div>
        </div>

        {/* Page counter + manual sync */}
        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'8px',
            background:'#1e293b', border:'1px solid #334155',
            padding:'7px 14px', borderRadius:'12px', fontWeight:700, fontSize:'14px' }}>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1}
              style={{ background:'none', border:'none', color: currentPage <= 1 ? '#475569' : '#94a3b8',
                cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
                paddingRight:'8px', borderRight:'1px solid #334155' }}>
              <FaChevronLeft />
            </button>
            <span style={{ fontFamily:'monospace', color:'#fff', padding:'0 4px' }}>
              {currentPage} <span style={{ color:'#475569' }}>/</span> {totalPages || '…'}
            </span>
            <button onClick={() => handlePageChange(currentPage + 1)}
              disabled={!totalPages || currentPage >= totalPages}
              style={{ background:'none', border:'none',
                color: (!totalPages || currentPage >= totalPages) ? '#475569' : '#94a3b8',
                cursor: (!totalPages || currentPage >= totalPages) ? 'not-allowed' : 'pointer',
                paddingLeft:'8px', borderLeft:'1px solid #334155' }}>
              <FaChevronRight />
            </button>
          </div>

          {/* Manual "I'm on page X" sync button */}
          {!showManual ? (
            <button onClick={() => setShowManual(true)} title="Manually set current page"
              style={{ fontSize:'10px', fontWeight:700, color:'#94a3b8',
                background:'#1e293b', border:'1px solid #334155', borderRadius:'8px',
                padding:'6px 10px', cursor:'pointer', whiteSpace:'nowrap' }}>
              Set page
            </button>
          ) : (
            <div style={{ display:'flex', alignItems:'center', gap:'4px' }}>
              <input
                type="number" min={1} max={totalPages || 999}
                value={manualPage}
                onChange={e => setManualPage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleManualSync()}
                placeholder={`1–${totalPages || '?'}`}
                style={{ width:'70px', padding:'6px 8px', fontSize:'12px', fontWeight:700,
                  background:'#0f172a', border:'1px solid #7c3aed', borderRadius:'8px',
                  color:'#fff', outline:'none' }}
                autoFocus
              />
              <button onClick={handleManualSync}
                style={{ padding:'6px 10px', fontSize:'11px', fontWeight:700,
                  background:'#7c3aed', border:'none', borderRadius:'8px',
                  color:'#fff', cursor:'pointer' }}>Save</button>
              <button onClick={() => { setShowManual(false); setManualPage(''); }}
                style={{ padding:'6px 8px', fontSize:'11px',
                  background:'#1e293b', border:'1px solid #334155', borderRadius:'8px',
                  color:'#94a3b8', cursor:'pointer' }}>✕</button>
            </div>
          )}
        </div>

        {/* Progress pill */}
        <div style={{ display:'flex', alignItems:'center', gap:'12px',
          background:'#020617', border:'1px solid #1e293b', padding:'8px 14px', borderRadius:'12px' }}>
          <div>
            <div style={{ fontSize:'14px', fontWeight:800, color: pct >= 100 ? '#34d399' : '#a855f7' }}>
              {pct}% Read
            </div>
            <div style={{ fontSize:'10px', color:'#475569' }}>
              Up to pg {maxPageRead}{totalPages ? ` of ${totalPages}` : ''}
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
          {fileUrl && (
            <a href={fileUrl} target="_blank" rel="noopener noreferrer" download title="Download PDF"
              style={{ padding:'8px', background:'#1e293b', border:'1px solid #334155',
                borderRadius:'10px', color:'#94a3b8', cursor:'pointer', display:'flex', alignItems:'center' }}>
              <FaDownload />
            </a>
          )}
          <button onClick={onClose}
            style={{ padding:'8px', background:'rgba(220,38,38,.8)', border:'none',
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
            <p style={{ fontWeight:700, fontSize:'14px', color:'#cbd5e1' }}>Loading PDF…</p>
            <p style={{ fontSize:'12px', color:'#475569' }}>Preparing document (just a moment)</p>
          </div>
        )}

        {/* Error with download fallback */}
        {status === 'error' && (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <FaExclamationTriangle style={{ fontSize:'40px', color:'#f59e0b', marginBottom:'16px' }} />
            <p style={{ color:'#f87171', fontWeight:700, marginBottom:'12px' }}>
              Could not render the PDF in-browser.
            </p>
            {fileUrl && (
              <a href={fileUrl} target="_blank" rel="noopener noreferrer"
                style={{ display:'inline-flex', alignItems:'center', gap:'8px', padding:'10px 20px',
                  background:'#7c3aed', color:'#fff', borderRadius:'10px', fontWeight:700,
                  textDecoration:'none', fontSize:'13px' }}>
                <FaDownload /> Open / Download PDF
              </a>
            )}
          </div>
        )}

        {/* PDF.js lazy-rendered pages injected here */}
        <div ref={pagesContRef}
          style={{ width:'100%', maxWidth:'900px', paddingBottom:'80px',
            display: status === 'done' ? 'block' : 'none' }} />
      </div>

      <style>{`@keyframes _spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );
};

export default PdfReaderModal;
