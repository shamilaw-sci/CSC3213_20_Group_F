import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaEnvelope, FaLock } from 'react-icons/fa';
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
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success('Welcome back!');

      if (res.data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
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

      const res = await axios.post('http://localhost:5000/api/auth/google', {
        credential,
      });

      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      toast.success('Signed in with Google');

      if (res.data.user.mustChangePassword) {
        navigate('/change-password');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Google sign-in is not available for this account.');
    }
  };

  const handleGoogleError = () => {
    toast.error('Google sign-in was cancelled or failed.');
  };

  return (
    <div className="flex min-h-screen bg-white font-sans">
      <div className="hidden lg:flex w-1/2 bg-lumina-purple items-center justify-center p-12 text-white flex-col">
        <h1 className="text-4xl font-bold mb-4">Welcome Back!</h1>
        <p className="text-purple-200 text-center mb-8">
          Use your institute-issued LuminaLearn credentials to continue.
        </p>
        <div className="w-64 h-64 bg-purple-500/20 rounded-full flex items-center justify-center text-8xl">
          LL
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 md:p-16">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Login</h2>
          <p className="text-gray-500 mb-8">Enter the credentials provided by the institute</p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <FaEnvelope className="absolute left-3 top-4 text-gray-400" />
              <input
                type="email"
                placeholder="Email Address"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <FaLock className="absolute left-3 top-4 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <label className="flex items-center gap-2 text-gray-600">
                <input type="checkbox" className="accent-purple-600" /> Remember me
              </label>
              <span className="text-purple-600 font-medium cursor-pointer">Forgot password?</span>
            </div>

            <button
              type="submit"
              className="w-full bg-lumina-purple hover:bg-purple-800 text-white font-bold py-3 rounded-xl shadow-lg transition duration-300"
            >
              Login
            </button>
          </form>

          {googleClientId && (
            <div className="mt-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                />
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-gray-600">
            Only accounts already created by the institute can sign in with Google.
          </p>
          <p className="mt-2 text-center text-gray-600">
            Need an account? Please contact the institute administration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
