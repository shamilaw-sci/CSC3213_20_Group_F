import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaSignInAlt, 
  FaGraduationCap, 
  FaBookOpen, 
  FaUserCheck, 
  FaCreditCard, 
  FaChartLine, 
  FaPhoneAlt, 
  FaMapMarkerAlt, 
  FaEnvelope, 
  FaAward,
  FaShieldAlt,
  FaUsers
} from 'react-icons/fa';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white relative overflow-hidden">
      
      {/* Background Glow Overlay Effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-900/20 blur-[150px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-[40%] right-10 w-[500px] h-[500px] bg-cyan-900/15 blur-[140px] rounded-full pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-1/3 w-[600px] h-[600px] bg-indigo-900/20 blur-[160px] rounded-full pointer-events-none -z-10" />

      {/* --- NAVBAR --- */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img 
              src="/assets/kirula_logo.png" 
              alt="Kirula Education Center" 
              className="h-12 w-auto object-contain drop-shadow-md"
            />
            <div className="h-8 w-px bg-slate-800 hidden sm:block" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-purple-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
                  LuminaLearn
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 font-medium">
                  Portal
                </span>
              </div>
              <span className="text-xs text-slate-400 font-medium">
                by Kirula Education Center
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#about" className="hover:text-cyan-400 transition-colors">About</a>
            <a href="#features" className="hover:text-cyan-400 transition-colors">Features</a>
            <a href="#contact" className="hover:text-cyan-400 transition-colors">Contact Us</a>
            <a href="#founder" className="hover:text-cyan-400 transition-colors">Founder</a>
          </nav>

          {/* Login Button */}
          <button
            onClick={() => navigate('/login')}
            className="group relative flex items-center gap-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-purple-900/30 hover:shadow-purple-700/40 transition-all duration-300 transform active:scale-95 cursor-pointer"
          >
            <span>Portal Login</span>
            <FaSignInAlt className="text-xs transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/30 text-purple-300 text-xs sm:text-sm font-medium backdrop-blur-sm">
                <FaGraduationCap className="text-cyan-400 text-base" />
                <span>Next-Gen Institute Management System</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
                Empowering Education with <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  LuminaLearn
                </span>
              </h1>

              <h2 className="text-xl sm:text-2xl font-semibold text-purple-200/90">
                Official Digital Platform of <span className="text-cyan-300 font-bold">Kirula Education Center</span>
              </h2>

              <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0">
                A modern, comprehensive institute management portal engineered to streamline class management, student enrollments, fee payments, attendance tracking, and real-time performance analytics.
              </p>

              {/* CTA Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold text-base px-8 py-4 rounded-xl shadow-xl shadow-cyan-900/20 hover:shadow-purple-900/40 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
                >
                  <FaSignInAlt />
                  <span>Access Student & Staff Login</span>
                </button>
                <a
                  href="#about"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-base px-6 py-4 rounded-xl border border-slate-800 hover:border-slate-700 transition-all duration-200"
                >
                  <span>Learn More</span>
                </a>
              </div>

              {/* Key Quick Stats */}
              <div className="pt-8 border-t border-slate-800/80 grid grid-cols-3 gap-4 max-w-lg mx-auto lg:mx-0 text-center lg:text-left">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400">100%</p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Digital Institute Operations</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-purple-400">24/7</p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Portal Accessibility</p>
                </div>
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-indigo-400">Smart</p>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">Student & Admin Portal</p>
                </div>
              </div>

            </div>

            {/* Right Card / Logo Showcase */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-md bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-8 rounded-3xl border border-purple-500/20 shadow-2xl shadow-purple-950/50 backdrop-blur-xl">
                
                {/* Decorative glows inside card */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl pointer-events-none" />

                <div className="flex flex-col items-center text-center space-y-6">
                  
                  {/* Logos Banner Container */}
                  <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 w-full flex items-center justify-center shadow-inner">
                    <img 
                      src="/assets/kirula_full_logo.png" 
                      alt="Kirula Full Logo" 
                      className="max-h-24 w-auto object-contain py-2"
                      onError={(e) => { e.currentTarget.src = "/assets/kirula_logo.png"; }}
                    />
                  </div>

                  <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 w-full flex items-center justify-center">
                    <img 
                      src="/assets/LuminaLearn_Logo_banner.png" 
                      alt="LuminaLearn Banner" 
                      className="max-h-14 w-auto object-contain"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Kirula Education Center</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Menikhinna, Kandy &bull; Excellence in Secondary & Higher Education
                    </p>
                  </div>

                  <div className="w-full pt-4 border-t border-slate-800">
                    <button
                      onClick={() => navigate('/login')}
                      className="w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 font-semibold py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <FaSignInAlt /> Go to Portal Login
                    </button>
                  </div>

                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- ABOUT SECTION --- */}
      <section id="about" className="py-16 bg-slate-900/50 border-y border-slate-800/80 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <h2 className="text-xs font-bold uppercase tracking-widest text-cyan-400 mb-2">About The System</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Welcome to <span className="bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">LuminaLearn</span>
            </p>
            <p className="text-slate-300 mt-4 leading-relaxed">
              LuminaLearn is the central institute management system created specifically for <strong className="text-slate-100">Kirula Education Center</strong>. Designed with state-of-the-art web technology, it seamlessly connects students, teachers, and administration into one unified platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 hover:border-purple-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl mb-4">
                <FaGraduationCap />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Student Center</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Students can browse available courses, track physical & online class enrollments, view attendance, and keep up with instant broadcast notices.
              </p>
            </div>

            <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 hover:border-cyan-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl mb-4">
                <FaCreditCard />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Payment Management</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Supports verified online course payments and physical institute receipts tracking, providing instant slip uploads and digital clearance.
              </p>
            </div>

            <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800 hover:border-indigo-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-indigo-900/40 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl mb-4">
                <FaChartLine />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Admin Analytics</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                Empowers Kirula Education Center administration with real-time financial metrics, enrollment statistics, attendance tracking, and user controls.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES GRID --- */}
      <section id="features" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-bold uppercase tracking-widest text-purple-400 mb-2">Capabilities</h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Key System Features
            </p>
            <p className="text-slate-400 mt-3 text-base">
              Everything built for Kirula Education Center students and administration.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800 hover:bg-slate-900/80 transition-all">
              <FaBookOpen className="text-cyan-400 text-2xl mb-3" />
              <h4 className="text-lg font-bold text-white mb-1">Course Catalog</h4>
              <p className="text-slate-400 text-xs leading-relaxed">Comprehensive course list with subject details, fee structure, and teacher details.</p>
            </div>

            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800 hover:bg-slate-900/80 transition-all">
              <FaUserCheck className="text-purple-400 text-2xl mb-3" />
              <h4 className="text-lg font-bold text-white mb-1">Attendance System</h4>
              <p className="text-slate-400 text-xs leading-relaxed">Instant physical and online attendance marking with search filters and reporting.</p>
            </div>

            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800 hover:bg-slate-900/80 transition-all">
              <FaShieldAlt className="text-indigo-400 text-2xl mb-3" />
              <h4 className="text-lg font-bold text-white mb-1">Secure Sign-In</h4>
              <p className="text-slate-400 text-xs leading-relaxed">JWT authentication, Google OAuth single sign-on, and role-based route security.</p>
            </div>

            <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-800 hover:bg-slate-900/80 transition-all">
              <FaUsers className="text-emerald-400 text-2xl mb-3" />
              <h4 className="text-lg font-bold text-white mb-1">User Management</h4>
              <p className="text-slate-400 text-xs leading-relaxed">Role assignment for Admins, Teachers, and Physical/Online Students.</p>
            </div>

          </div>

        </div>
      </section>

      {/* --- INSTITUTE CONTACT DETAILS & LOCATION --- */}
      <section id="contact" className="py-16 bg-slate-900/60 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-300 text-xs font-semibold">
                <FaMapMarkerAlt /> Institute Headquarters
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Kirula Education Center
              </h2>
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                Located in Menikhinna, Kandy, Kirula Education Center offers top-quality education and student guidance.
              </p>

              <div className="space-y-4 pt-2">
                
                {/* Contact Phone */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-cyan-900/40 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-base shrink-0 mt-0.5">
                    <FaPhoneAlt />
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-400 font-medium">Contact Phone</h4>
                    <p className="text-base font-bold text-white mt-0.5">071 7577 688</p>
                  </div>
                </div>

                {/* Contact Address */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                  <div className="w-10 h-10 rounded-lg bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-400 text-base shrink-0 mt-0.5">
                    <FaMapMarkerAlt />
                  </div>
                  <div>
                    <h4 className="text-xs text-slate-400 font-medium">Institute Address</h4>
                    <p className="text-sm font-semibold text-white mt-0.5 leading-relaxed">
                      Kirula Education Center,<br />
                      621 road,<br />
                      Menikhinna,<br />
                      Kandy
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Visual Kirula Emblem / Badge Card */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full max-w-lg bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950/60 p-8 rounded-3xl border border-slate-800 shadow-xl text-center space-y-6">
                
                <div className="inline-block p-4 rounded-2xl bg-slate-950 border border-slate-800 shadow-lg">
                  <img 
                    src="/assets/kirula_logo.png" 
                    alt="Kirula Emblem" 
                    className="h-28 w-auto mx-auto object-contain"
                  />
                </div>

                <div>
                  <h3 className="text-2xl font-bold text-white">LuminaLearn Portal</h3>
                  <p className="text-sm text-cyan-300 font-medium mt-1">Kirula Education Center - Kandy</p>
                </div>

                <div className="pt-2 border-t border-slate-800/80 text-xs text-slate-400 leading-relaxed">
                  For enrollment inquiries or technical support, please contact the institute directly at <strong className="text-white">071 7577 688</strong>.
                </div>

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* --- FOUNDER SHOWCASE SECTION --- */}
      <section id="founder" className="py-20 relative bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/30 text-purple-300 text-xs font-semibold mb-3">
              <FaAward /> Leadership & Vision
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Meet Our Founder
            </h2>
            <p className="text-slate-400 mt-2 text-sm sm:text-base">
              The driving force behind Kirula Education Center & LuminaLearn
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-b from-slate-900/90 to-slate-950 p-8 sm:p-10 rounded-3xl border border-purple-500/30 shadow-2xl shadow-purple-950/40 backdrop-blur-xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              {/* Founder Image */}
              <div className="md:col-span-5 flex justify-center">
                <div className="relative group">
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 blur opacity-40 group-hover:opacity-75 transition duration-500" />
                  <img
                    src="/assets/founder_photo.png"
                    alt="Mr. Chaminda Kumara Herath"
                    className="relative w-64 h-64 sm:w-72 sm:h-72 object-cover object-top rounded-2xl shadow-xl border-2 border-slate-800"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = "https://ui-avatars.com/api/?name=Chaminda+Kumara+Herath&size=300&background=2d1b64&color=fff";
                    }}
                  />
                </div>
              </div>

              {/* Founder Details */}
              <div className="md:col-span-7 space-y-5 text-left">
                <div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                    Mr. Chaminda Kumara Herath
                  </h3>
                  <p className="text-sm font-semibold text-cyan-400 mt-1">
                    Founder & Director &bull; Kirula Education Center
                  </p>
                </div>

                <div className="space-y-3 pt-2 text-sm text-slate-300">
                  
                  {/* Phone */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                      <FaPhoneAlt className="text-xs" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Phone</span>
                      <a href="tel:0717577688" className="font-bold text-white hover:text-cyan-400 transition-colors">
                        071 7577 688
                      </a>
                    </div>
                  </div>

                  {/* Email */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-purple-400 shrink-0">
                      <FaEnvelope className="text-xs" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Email</span>
                      <a href="mailto:ckumarah@gmail.com" className="font-semibold text-white hover:text-purple-400 transition-colors">
                        ckumarah@gmail.com
                      </a>
                    </div>
                  </div>

                  {/* Address */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <FaMapMarkerAlt className="text-xs" />
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block">Address</span>
                      <p className="font-medium text-slate-200 leading-relaxed">
                        16/2, Koongahamula,<br />
                        Menikhinna,<br />
                        Kandy
                      </p>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 border-t border-slate-900 text-slate-400 py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          
          <div className="flex items-center gap-3">
            <img 
              src="/assets/kirula_logo.png" 
              alt="Kirula Logo" 
              className="h-8 w-auto object-contain opacity-80"
            />
            <span className="text-xs text-slate-400">
              LuminaLearn Institute Management System
            </span>
          </div>

          <div className="text-center text-xs text-slate-500">
            LuminaLearn by Kirula Education Center @ 2026
          </div>

          <div className="flex items-center gap-4 text-xs">
            <button 
              onClick={() => navigate('/login')}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <span>&bull;</span>
            <a href="#about" className="hover:text-cyan-400 transition-colors">About</a>
            <span>&bull;</span>
            <a href="#contact" className="hover:text-cyan-400 transition-colors">Contact</a>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default Home;
