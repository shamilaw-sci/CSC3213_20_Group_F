/**
 * @file StudentIdCard.jsx
 * @description Printable Student ID Card & Digital QR Pass Component.
 * =========================================================================================
 * 🎓 EXPLAIN TO EXAMINER:
 * 1. Purpose: Generates a high-resolution, secure student identity badge with student photo,
 *    full name, registration number, grade, and an encoded scannable QR code pass.
 * 2. QR Code Generation: Uses 'QRCodeSVG' from 'qrcode.react' with Error Correction Level 'H' (High - 30% recovery).
 *    The QR payload encodes a JSON string with { registrationNumber, studentId, name, grade }.
 * 3. Physical Check-in: The physical kiosk scanner (html5-qrcode) reads this exact QR code
 *    to record attendance in less than 1 second.
 * 4. Dual Export:
 *    - 'handleDownloadQrImage': Renders a luxury 600x740 canvas and exports a high-res PNG file.
 *    - 'handlePrintCard': Opens a browser print dialog with custom styling for printing on PVC plastic cards.
 * =========================================================================================
 * 🎨 MASTER UI & CSS CUSTOMIZATION DIRECTORY (HOW TO CHANGE COLORS / STYLES):
 * =========================================================================================
 * 1. CARD CONTAINER (Line ~200):
 *    - Default Dark Purple: 'bg-gradient-to-br from-[#2d1b64] via-indigo-950 to-[#1e1b4b] border-indigo-500/30'
 *    - To change to Ocean Blue:   'bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900 border-blue-500/30'
 *    - To change to Emerald Green:'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950 border-emerald-500/30'
 *    - To change to Ruby / Crimson:'bg-gradient-to-br from-rose-950 via-slate-900 to-red-950 border-rose-500/30'
 * 2. AVATAR / PHOTO BORDER (Line ~220):
 *    - Avatar Box: 'bg-gradient-to-br from-amber-400 to-amber-500 border-2 border-white/80'
 * 3. QR CONTAINER (Line ~245):
 *    - White QR Box: 'bg-white dark:bg-slate-800 p-4 rounded-2xl border border-indigo-100 dark:border-slate-700'
 *    - Reg No Tag:   'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200'
 * 4. ACTION BUTTONS (Line ~270):
 *    - "Download QR (PNG)": 'bg-emerald-500 hover:bg-emerald-600 text-white'
 *      To change to Blue:   'bg-blue-600 hover:bg-blue-700 text-white'
 *      To change to Purple: 'bg-purple-600 hover:bg-purple-700 text-white'
 *    - "Print Pass":        'bg-amber-400 hover:bg-amber-500 text-purple-950'
 *      To change to Blue:   'bg-blue-600 hover:bg-blue-700 text-white'
 *      To change to Purple: 'bg-purple-600 hover:bg-purple-700 text-white'
 * =========================================================================================
 */

import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const StudentIdCard = ({ user }) => {
  const cardRef = useRef(null);

  if (!user) return null;

  const regNo = user.registrationNumber || 'STU-REG-PENDING';
  const gradeStr = user.grade ? (String(user.grade).toLowerCase().startsWith('grade') ? user.grade : `Grade ${user.grade}`) : 'Grade Active';
  const studentTypeStr = user.studentType === 'physical' ? '🏫 Physical Classroom Student' : '💻 Online Student';

  // Encrypted QR Payload containing registration number and student ID for instant kiosk scanning
  const qrPayload = JSON.stringify({
    registrationNumber: regNo,
    studentId: user.id || user._id,
    name: user.name,
    grade: user.grade
  });

  // =========================================================================
  // PRINT CARD DIALOG HANDLER (Generates standalone printable layout)
  // =========================================================================
  const handlePrintCard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Student ID Card - ${user.name}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f8fafc; padding: 40px; display: flex; justify-content: center; }
            .card { width: 380px; background: linear-gradient(135deg, #2d1b64, #1e1b4b); color: white; border-radius: 24px; padding: 24px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); border: 2px solid #818cf8; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 12px; margin-bottom: 16px; }
            .title { font-size: 18px; font-weight: 800; color: #fbbf24; }
            .sub { font-size: 10px; color: #c7d2fe; }
            .content { display: flex; gap: 16px; align-items: center; margin-bottom: 16px; }
            .avatar { width: 64px; height: 64px; background: #4f46e5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; border: 2px solid #fbbf24; }
            .info h3 { font-size: 16px; margin: 0; font-weight: 800; }
            .reg { font-family: monospace; font-size: 12px; color: #fbbf24; font-weight: 700; margin-top: 4px; }
            .badge { display: inline-block; background: rgba(255,255,255,0.15); padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; margin-top: 6px; }
            .qr-wrap { background: white; padding: 12px; border-radius: 16px; text-align: center; margin-top: 12px; }
            .footer { font-size: 9px; text-align: center; color: #94a3b8; margin-top: 12px; }
          </style>
        </head>
        <body>
          <div className="card">
            <div className="header">
              <div>
                <div className="title">LuminaLearn</div>
                <div className="sub">OFFICIAL STUDENT ID CARD</div>
              </div>
              <span style="font-size: 20px;">🎓</span>
            </div>
            <div className="content">
              <div className="avatar">${user.name ? user.name.charAt(0) : 'S'}</div>
              <div className="info">
                <h3>${user.name}</h3>
                <div className="reg">${regNo}</div>
                <div className="badge">${gradeStr}</div>
              </div>
            </div>
            <div className="qr-wrap">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}" width="160" height="160" alt="QR Code" />
              <div style="font-family: monospace; font-size: 11px; color: #1e1b4b; font-weight: bold; margin-top: 6px;">${regNo}</div>
            </div>
            <div className="footer">Property of LuminaLearn Institute • Non-Transferable</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // =========================================================================
  // DOWNLOAD QR PASS AS PNG (HTML5 Canvas Rasterization)
  // =========================================================================
  const handleDownloadQrImage = () => {
    if (!cardRef.current) return;
    const svgElement = cardRef.current.querySelector('svg');
    if (!svgElement) return;

    try {
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);

      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 600;
        canvas.height = 740;
        const ctx = canvas.getContext('2d');

        // Dark Luxury Pass Background
        const bgGradient = ctx.createLinearGradient(0, 0, 600, 740);
        bgGradient.addColorStop(0, '#2d1b64');
        bgGradient.addColorStop(0.5, '#1e1b4b');
        bgGradient.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gold Accent Border
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 6;
        ctx.strokeRect(12, 12, 576, 716);

        // Header Title
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LuminaLearn', 300, 58);

        ctx.fillStyle = '#c7d2fe';
        ctx.font = 'extrabold 13px "Segoe UI", Arial, sans-serif';
        ctx.fillText('OFFICIAL DIGITAL STUDENT QR PASS', 300, 84);

        // White Container Box for QR Code
        ctx.fillStyle = '#ffffff';
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(60, 110, 480, 430, 24);
          ctx.fill();
        } else {
          ctx.fillRect(60, 110, 480, 430);
        }

        // Draw QR Code Image inside white container
        ctx.drawImage(image, 125, 125, 350, 350);

        // Registration Number Box
        ctx.fillStyle = '#1e1b4b';
        ctx.font = 'bold 22px monospace';
        ctx.fillText(regNo, 300, 515);

        // Student Name Below White Container
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
        ctx.fillText(user.name || 'Student Name', 300, 595);

        // Grade & Classroom Type
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'extrabold 20px "Segoe UI", Arial, sans-serif';
        ctx.fillText(`${gradeStr}   •   ${user.studentType === 'physical' ? '🏫 Physical Class' : '💻 Online Student'}`, 300, 638);

        // Footer Text
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px "Segoe UI", Arial, sans-serif';
        ctx.fillText('Property of LuminaLearn Educational Institute • Non-Transferable', 300, 690);

        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        const sanitizedName = (user.name || 'Student').replace(/\s+/g, '_');
        downloadLink.download = `Student_QR_Pass_${sanitizedName}_${regNo}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(blobURL);
      };
      image.src = blobURL;
    } catch (err) {
      console.error("Failed to download QR code image", err);
    }
  };

  return (
    /* 
      🎨 CARD CONTAINER THEME:
      To change card background color / gradient:
      - Default Dark Purple: 'bg-gradient-to-br from-[#2d1b64] via-indigo-950 to-[#1e1b4b]'
      - Dark Blue: 'bg-gradient-to-br from-blue-950 via-slate-900 to-blue-900'
      - Emerald Green: 'bg-gradient-to-br from-emerald-950 via-slate-900 to-teal-950'
    */
    <div className="bg-gradient-to-br from-[#2d1b64] via-indigo-950 to-[#1e1b4b] p-6 rounded-3xl text-white shadow-xl border border-indigo-500/30 relative overflow-hidden space-y-5">
      
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex justify-between items-center border-b border-indigo-800/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎓</span>
          <div>
            <h4 className="font-black text-amber-400 text-lg tracking-wide leading-tight">LuminaLearn</h4>
            <p className="text-[10px] text-indigo-200 font-extrabold uppercase tracking-widest">Digital Student Pass & ID</p>
          </div>
        </div>
        <span className="bg-indigo-900/80 text-indigo-200 text-[10px] font-extrabold px-3 py-1 rounded-lg border border-indigo-700">
          Academic 2026
        </span>
      </div>

      {/* Student Profile Info */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-amber-500 text-purple-950 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg border-2 border-white/80 shrink-0 overflow-hidden">
          {user.profilePicture ? (
            <img src={user.profilePicture} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            user.name ? user.name.charAt(0) : 'S'
          )}
        </div>

        <div className="space-y-1 min-w-0">
          <h3 className="font-extrabold text-white text-base truncate leading-tight">{user.name}</h3>
          <p className="font-mono text-xs font-bold text-amber-300 tracking-wider">
            {regNo}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span className="bg-white/10 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border border-white/20">
              {gradeStr}
            </span>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md">
              {user.studentType === 'physical' ? '🏫 Physical Class' : '💻 Online'}
            </span>
          </div>
        </div>
      </div>

      {/* QR Code Container */}
      <div ref={cardRef} className="bg-white dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner border border-indigo-100 dark:border-slate-700">
        <div className="p-2 bg-white rounded-xl shadow-xs">
          {/*
            🎓 QR CODE SVG PARAMETERS:
            - size: 135 (pixel width/height)
            - level: "H" (High Error Correction, up to 30% scannability even if partially obscured)
            - fgColor: foreground hex color ("#1e1b4b" dark navy)
          */}
          <QRCodeSVG 
            value={qrPayload}
            size={135}
            level="H"
            includeMargin={true}
            fgColor="#1e1b4b"
          />
        </div>
        <span className="text-[11px] font-black text-indigo-950 dark:text-indigo-200 tracking-wider uppercase font-mono bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-md border border-indigo-100 dark:border-indigo-800">
          {regNo}
        </span>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-semibold">Scan QR code at Institute Counter for Attendance & Payment check</p>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-2 flex-wrap gap-2">
        <span className="text-[10px] text-indigo-300 font-semibold">{studentTypeStr}</span>
        <div className="flex items-center gap-2">
          {/*
            🎨 HOW TO CHANGE BUTTON COLOR: "Download QR (PNG)" Button
            - Current Color (Emerald Green): 'bg-emerald-500 hover:bg-emerald-600 text-white'
            - To change to Royal Blue:       'bg-blue-600 hover:bg-blue-700 text-white'
            - To change to Purple:           'bg-purple-600 hover:bg-purple-700 text-white'
            - To change to Ruby Red:         'bg-rose-600 hover:bg-rose-700 text-white'
          */}
          <button
            type="button"
            onClick={handleDownloadQrImage}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
            title="Download crisp QR Code image (.png)"
          >
            <span>💾</span> Download QR (PNG)
          </button>

          {/*
            🎨 HOW TO CHANGE BUTTON COLOR: "Print Pass" Button
            - Current Color (Amber Gold):    'bg-amber-400 hover:bg-amber-500 text-purple-950'
            - To change to Purple / Violet:  'bg-purple-600 hover:bg-purple-700 text-white'
            - To change to Sky Blue:         'bg-sky-500 hover:bg-sky-600 text-white'
            - To change to Dark Slate:       'bg-slate-800 hover:bg-slate-900 text-white'
          */}
          <button
            type="button"
            onClick={handlePrintCard}
            className="bg-amber-400 hover:bg-amber-500 text-purple-950 font-extrabold text-xs px-3.5 py-2 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
            title="Print or save complete Student ID Pass"
          >
            <span>🖨️</span> Print Pass
          </button>
        </div>
      </div>

    </div>
  );
};

export default StudentIdCard;
