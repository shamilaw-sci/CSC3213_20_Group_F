import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowRight, FaPhone, FaUserGraduate, FaUserFriends } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [portalType, setPortalType] = useState('student'); // 'student' | 'parent'
  const [emailOrReg, setEmailOrReg] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

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
      className="flex min-h-screen font-sans text-slate-900 bg-cover bg-center overflow-hidden"
      style={{ backgroundImage: "url('/assets/Login_screen_BG.png')" }}
    >

      {/* Left Side - Welcome Text */}
      <div className="relative hidden w-full flex-col justify-start pt-5 px-12 lg:flex lg:w-[55%] xl:px-24">
        <div className="relative z-10 max-w-lg">
          <img
            src="/assets/LuminaLearn_Logo_banner.png"
            alt="LuminaLearn logo"
            className="mb-2 h-30 w-auto object-contain"
          />
          <h1 className="text-5xl font-bold tracking-tight text-white xl:text-6xl">
            Welcome Back!
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-200">
            Continue your learning journey with <br />
            <span className="font-medium text-[#00e5ff]">LuminaLearn</span> Smart Learning Platform.
          </p>
        </div>
      </div>

      {/* Right Side - White Login Panel */}
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20 overflow-y-auto">
        <div className="w-full max-w-md py-4">

          {/* Header */}
          <div className="mb-6">
            <h2 className="text-4xl font-bold text-[#1e1e38]">Login</h2>
            <p className="mt-2 text-xs text-slate-500">
              Sign in to your learning account or parent portal
            </p>

            {/* Portal Switcher Tabs */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 mt-5">
              <button
                type="button"
                onClick={() => setPortalType('student')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${portalType === 'student'
                    ? 'bg-purple-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FaUserGraduate /> Student & Staff
              </button>
              <button
                type="button"
                onClick={() => setPortalType('parent')}
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 ${portalType === 'parent'
                    ? 'bg-purple-900 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                <FaUserFriends /> Parent Portal
              </button>
            </div>
          </div>

          {/* Info Notice */}
          {portalType === 'parent' ? (
            <div className="mb-6 rounded-xl bg-purple-50 border border-purple-200 p-3.5 text-purple-950 text-xs flex gap-2.5 items-start shadow-xs">
              <span className="text-base leading-none mt-0.5">📱</span>
              <div>
                <h4 className="font-semibold text-purple-900">Parent Access Portal</h4>
                <p className="mt-0.5 text-[11px] text-purple-700 leading-relaxed">
                  Log in using your registered mobile phone number. If this is your first time, use your default password.
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-3.5 text-slate-700 text-xs flex gap-2.5 items-start">
              <span className="text-base leading-none mt-0.5">🎓</span>
              <div>
                <h4 className="font-semibold text-slate-900">Student & Staff Portal</h4>
                <p className="mt-0.5 text-[11px] text-slate-500 leading-relaxed">
                  Sign in with your email address or official registration number (e.g. <strong>OL-G06-2012-XXXX</strong> or <strong>REG-XXXX</strong>).
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">

            {/* Student/Staff: Email or Registration Number Input */}
            {portalType === 'student' ? (
              <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter email or registration number"
                  className="w-full bg-transparent pl-10 text-xs text-slate-900 outline-none placeholder:text-slate-500 font-medium"
                  value={emailOrReg}
                  onChange={(e) => setEmailOrReg(e.target.value)}
                  required
                />
              </div>
            ) : (
              /* Parent: Mobile Phone Number Input */
              <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
                <FaPhone className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="tel"
                  placeholder="Enter parent mobile phone (e.g. 0771234567)"
                  className="w-full bg-transparent pl-10 text-xs text-slate-900 outline-none placeholder:text-slate-500 font-medium"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Password Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder={portalType === 'parent' ? "Enter password (or default password on 1st login)" : "Password"}
                className="w-full bg-transparent pl-10 text-xs text-slate-900 outline-none placeholder:text-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-[#3a1c8a] accent-[#3a1c8a] cursor-pointer" />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="font-semibold text-[#3a1c8a] hover:text-purple-800 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full items-center justify-center rounded-xl bg-lumina-purple px-6 py-4 text-xs font-bold text-white transition-all hover:bg-purple-800 shadow-lg shadow-purple-900/20 cursor-pointer disabled:opacity-50"
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
            <div className="mt-6">
              <div className="relative mb-5">
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                <div className="relative mx-auto w-max bg-white px-4 text-xs text-slate-400">
                  Or continue with
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  shape="pill"
                />
              </div>
            </div>
          )}

          {/* Footer Text */}
          <div className="mt-8 space-y-2 text-center text-xs text-slate-500">
            <p>
              Are you an online student?{' '}
              <button
                className="font-semibold text-[#3a1c8a] hover:underline cursor-pointer"
                onClick={() => navigate('/register')}
              >
                Register here.
              </button>
            </p>
            <p>
              Need an account? Please{' '}
              <button
                className="font-medium text-[#3a1c8a] hover:underline cursor-pointer"
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