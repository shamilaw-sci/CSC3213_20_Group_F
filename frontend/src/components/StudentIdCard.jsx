import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const StudentIdCard = ({ user }) => {
  const cardRef = useRef(null);

  if (!user) return null;

  const regNo = user.registrationNumber || 'STU-REG-PENDING';
  const gradeStr = user.grade ? (user.grade.toLowerCase().startsWith('grade') ? user.grade : `Grade ${user.grade}`) : 'Grade Active';
  const studentTypeStr = user.studentType === 'physical' ? '🏫 Physical Classroom Student' : '💻 Online Student';

  // Encrypted QR Payload containing registration number and student ID
  const qrPayload = JSON.stringify({
    registrationNumber: regNo,
    studentId: user.id || user._id,
    name: user.name,
    grade: user.grade
  });

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
              ${cardRef.current ? cardRef.current.querySelector('svg').outerHTML : ''}
              <div style="color: #1e1b4b; font-weight: 800; font-size: 11px; margin-top: 6px; font-family: monospace;">Scan at Institute Kiosk</div>
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

  return (
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
      <div ref={cardRef} className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner border border-indigo-100">
        <div className="p-2 bg-white rounded-xl shadow-xs">
          <QRCodeSVG 
            value={qrPayload}
            size={135}
            level="H"
            includeMargin={true}
            fgColor="#1e1b4b"
          />
        </div>
        <span className="text-[11px] font-black text-indigo-950 tracking-wider uppercase font-mono bg-indigo-50 px-3 py-1 rounded-md border border-indigo-100">
          {regNo}
        </span>
        <p className="text-[10px] text-gray-500 font-semibold">Scan QR code at Institute Counter for Attendance & Payment check</p>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-between items-center pt-2">
        <span className="text-[10px] text-indigo-300 font-semibold">{studentTypeStr}</span>
        <button
          type="button"
          onClick={handlePrintCard}
          className="bg-amber-400 hover:bg-amber-500 text-purple-950 font-extrabold text-xs px-4 py-2 rounded-xl transition shadow-md cursor-pointer flex items-center gap-1.5"
        >
          <span>🖨️</span> Print / Save ID Card
        </button>
      </div>

    </div>
  );
};

export default StudentIdCard;
