import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock, FaArrowRight } from 'react-icons/fa';
import toast from 'react-hot-toast';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post('/auth/login', { email, password });

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
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid Login!');
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
      <div className="flex w-full items-center justify-center bg-white px-6 py-12 lg:w-[45%] lg:rounded-l-[40px] shadow-2xl z-20">
        <div className="w-full max-w-md">

          {/* Header */}
          <div className="mb-10">
            <h2 className="text-4xl font-bold text-[#1e1e38]">Login</h2>
            <p className="mt-3 text-sm text-slate-500">
              Enter the credentials provided by the institute
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email / Registration Number Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaEnvelope className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Enter your email or registration number"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password Input */}
            <div className="relative rounded-xl bg-slate-100 p-3.5 border border-transparent focus-within:border-purple-300 focus-within:bg-white transition-colors">
              <FaLock className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                placeholder="Password"
                className="w-full bg-transparent pl-10 text-sm text-slate-900 outline-none placeholder:text-slate-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm py-2">
              <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#3a1c8a] accent-[#3a1c8a] cursor-pointer" />
                Remember me
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="font-medium text-[#3a1c8a] hover:text-purple-800 transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="group relative flex w-full items-center justify-center rounded-xl bg-lumina-purple px-6 py-4 text-sm font-semibold text-white transition-all hover:bg-purple-800 shadow-lg shadow-purple-900/20 cursor-pointer"
            >
              Login
              <span className="absolute right-5 transition-transform group-hover:translate-x-1">
                <FaArrowRight />
              </span>
            </button>
          </form>

          {/* Google Sign In Divider */}
          {googleClientId && (
            <div className="mt-8">
              <div className="relative mb-6">
                <div className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
                <div className="relative mx-auto w-max bg-white px-4 text-sm text-slate-400">
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
          <div className="mt-10 space-y-3 text-center text-sm text-slate-500">
            <p>
              Are you an online student?{' '}
              <button
                className="font-semibold text-[#3a1c8a] hover:underline cursor-pointer"
                onClick={() => navigate('/register')}
              >
                Register as an Online Student here.
              </button>
            </p>
            <p>Only physical students can sign in with Google directly.</p>
            <p>
              Need an account? Please{' '}
              <button
                className="font-medium text-[#3a1c8a] hover:underline cursor-pointer"
                onClick={() => {
                  const email = "admin.luminalearn@gmail.com";
                  const subject = encodeURIComponent("Request to add new course");
                  const body = encodeURIComponent("Hi LuminaLearn \n\nI would like to start a new course.");
                  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
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