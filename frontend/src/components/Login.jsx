import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowRight, FaPhone, FaUserGraduate, FaUserFriends, FaEye, FaEyeSlash, FaSun, FaMoon, FaShieldAlt } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const [portalType, setPortalType] = useState('student'); // 'student' | 'parent'
  const [emailOrReg, setEmailOrReg] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleTheme } = useTheme();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const isConcurrentSession = new URLSearchParams(location.search).get('reason') === 'concurrent_session';

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (portalType === 'parent') {
        const res = await api.post('/auth/parent-login', {
          phoneNumber: parentPhone,
          password
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        toast.success(`Welcome, ${res.data.user.name}!`);

        const targetPath = res.data.user.mustChangePassword
          ? '/change-password'
          : '/parent-dashboard';

        if (res.data.user.mustChangePassword) {
          toast('Please change your default password to secure your account.', {
            icon: '🔑',
            duration: 5000
          });
        }

        window.dispatchEvent(new Event('userUpdated'));
        navigate(targetPath);

      } else {
        const res = await api.post('/auth/login', {
          email: emailOrReg,
          password
        });

        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));

        toast.success('Welcome back!');

        const targetPath = res.data.user.mustChangePassword
          ? '/change-password'
          : res.data.user.role === 'parent'
            ? '/parent-dashboard'
            : res.data.user.role === 'counter_staff'
              ? '/attendance'
              : '/dashboard';

        window.dispatchEvent(new Event('userUpdated'));
        navigate(targetPath);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid login credentials!');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const credential = credentialResponse?.credential;
      if (!credential) {
        throw new Error('Google credential is missing from the response.');
      }

      const res = await api.post('/auth/google', {
        credential,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success('Signed in with Google');

      const targetPath = res.data.user.mustChangePassword
        ? '/change-password'
        : res.data.user.role === 'parent'
          ? '/parent-dashboard'
          : res.data.user.role === 'counter_staff'
            ? '/attendance'
            : '/dashboard';

      window.dispatchEvent(new Event('userUpdated'));
      navigate(targetPath);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in is not available for this account.');
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in was cancelled or failed.');
  };

  return (
    <div
      className="flex min-h-screen font-sans text-slate-900 dark:text-white bg-cover bg-center overflow-hidden relative"
      style={{ backgroundImage: "url('/assets/Login_screen_BG.png')" }}
    >

      {/* Theme Switcher Toggle */}
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute top-6 right-6 z-30 p-3 rounded-2xl bg-white/80 dark:bg-slate-800/90 text-slate-700 dark:text-amber-400 hover:bg-white dark:hover:bg-slate-700 shadow-lg backdrop-blur-md border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer hover:scale-105 active:scale-95"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      >
        {isDark ? <FaSun className="text-base text-amber-400" /> : <FaMoon className="text-base text-purple-700" />}
      </button>

      {/* Left Side - Welcome Text */}
      <div className="relative hidden w-full flex-col justify-start pt-8 px-12 lg:flex lg:w-[55%] xl:px-24">
        <div className="relative z-10 max-w-lg">
          <img
            src="/assets/LuminaLearn_Logo_banner.png"
            alt="LuminaLearn logo"
            className="mb-3 h-28 w-auto object-contain"
          />
          <h1 className="text-5xl font-extrabold tracking-tight text-white xl:text-6xl">
            Welcome Back!
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-200">
            Continue your learning journey with <br />
            <span className="font-semibold text-[#00e5ff]">LuminaLearn</span> Smart Learning Platform.
          </p>
        </div>
      </div>

      {/* Right Side - Login Panel */}
      <div className="flex w-full items-center justify-center bg-white dark:bg-slate-900/95 lg:dark:bg-slate-900/95 dark:backdrop-blur-xl px-4 sm:px-6 py-8 sm:py-10 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20 overflow-y-auto border-l border-transparent dark:border-slate-800 transition-colors">
        <div className="w-full max-w-md py-2">

          {/* Mobile Branding Logo */}
          <div className="lg:hidden flex flex-col items-center mb-6 text-center">
            <img
              src="/assets/LuminaLearn_Logo_banner.png"
              alt="LuminaLearn Logo"
              className="h-14 sm:h-16 w-auto object-contain mb-1 drop-shadow-sm cursor-pointer"
              onClick={() => navigate('/')}
            />
            <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
              Smart Learning Platform
            </span>
          </div>

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl sm:text-4xl font-black text-[#1e1e38] dark:text-white tracking-tight">Login</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              Sign in to your learning account or parent portal
            </p>

            {/* Portal Switcher Tabs */}
            <div className="flex bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl sm:rounded-2xl gap-1.5 sm:gap-2 mt-4 sm:mt-5 border border-slate-200/80 dark:border-slate-700/80">
              <button
                type="button"
                onClick={() => setPortalType('student')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${portalType === 'student'
                    ? 'bg-purple-900 dark:bg-purple-600 text-white shadow-md scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
              >
                <FaUserGraduate /> Student & Staff
              </button>
              <button
                type="button"
                onClick={() => setPortalType('parent')}
                className={`flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 ${portalType === 'parent'
                    ? 'bg-purple-900 dark:bg-purple-600 text-white shadow-md scale-[1.02]'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/50'
                  }`}
              >
                <FaUserFriends /> Parent Portal
              </button>
            </div>
          </div>

          {/* Concurrent Session Termination Alert Banner */}
          {isConcurrentSession && (
            <div className="mb-5 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-3 text-amber-700 dark:text-amber-300 text-xs sm:text-sm animate-fade-in shadow-sm">
              <FaShieldAlt className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">Security Notice: Previous Session Ended</p>
                <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                  Your session was automatically logged out because this student account was logged in from another browser or device. LuminaLearn enforces single active session policy for students to protect account integrity.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 mt-6">

            {/* Student/Staff: Email or Registration Number Input */}
            {portalType === 'student' ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email or Registration Number <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type="text"
                    placeholder="Enter email or registration number"
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={emailOrReg}
                    onChange={(e) => setEmailOrReg(e.target.value)}
                    required
                  />
                </div>
              </div>
            ) : (
              /* Parent: Mobile Phone Number Input */
              <div className="space-y-1.5">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Parent Mobile Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                  <FaPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                  <input
                    type="tel"
                    placeholder="Enter parent mobile phone (e.g. 0712345678)"
                    className="w-full bg-transparent pl-11 pr-4 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    value={parentPhone}
                    onChange={(e) => setParentPhone(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative rounded-2xl bg-white dark:bg-slate-800/80 border-2 border-slate-200 dark:border-slate-700 focus-within:border-purple-600 dark:focus-within:border-purple-400 focus-within:ring-4 focus-within:ring-purple-100 dark:focus-within:ring-purple-950/60 transition-all shadow-2xs">
                <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 text-sm" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  className="w-full bg-transparent pl-11 pr-11 py-3.5 text-sm font-semibold text-slate-900 dark:text-white outline-none rounded-2xl placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-700 dark:hover:text-purple-300 p-1.5 rounded-lg transition cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash className="text-sm" /> : <FaEye className="text-sm" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-purple-700 dark:text-purple-500 accent-purple-700 dark:accent-purple-500 cursor-pointer" />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="font-bold text-purple-800 hover:text-purple-950 dark:text-purple-400 dark:hover:text-purple-300 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#2d1b64] to-indigo-900 hover:from-purple-900 hover:to-indigo-950 dark:from-purple-600 dark:to-indigo-600 dark:hover:from-purple-500 dark:hover:to-indigo-500 px-6 py-4 text-sm font-extrabold text-white transition-all shadow-lg shadow-purple-900/20 dark:shadow-purple-950/60 cursor-pointer disabled:opacity-50 mt-2 active:scale-98"
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  {portalType === 'parent' ? 'Sign in to Parent Portal' : 'Login'}
                  <span className="absolute right-5 transition-transform group-hover:translate-x-1">
                    <FaArrowRight />
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Google Sign In Divider (Students only) */}
          {portalType === 'student' && googleClientId && (
            <div className="mt-5">
              <div className="relative mb-4">
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-slate-800" />
                <div className="relative mx-auto w-max bg-white dark:bg-slate-900 px-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  Or continue with
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  shape="pill"
                  theme={isDark ? "filled_black" : "outline"}
                />
              </div>
            </div>
          )}

          {/* Footer Text */}
          <div className="mt-7 space-y-1.5 text-center text-xs text-slate-500 dark:text-slate-400">
            <p>
              Are you an online student?{' '}
              <button
                className="font-bold text-purple-800 hover:text-purple-950 dark:text-purple-400 dark:hover:text-purple-300 hover:underline cursor-pointer"
                onClick={() => navigate('/register')}
              >
                Register here.
              </button>
            </p>
            <p>
              Need an account? Please{' '}
              <button
                className="font-semibold text-purple-800 hover:text-purple-950 dark:text-purple-400 dark:hover:text-purple-300 hover:underline cursor-pointer"
                onClick={() => {
                  const mailto = "mailto:admin.luminalearn@gmail.com?subject=Account%20Inquiry";
                  window.location.href = mailto;
                }}
              >
                contact the institute administration.
              </button>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;