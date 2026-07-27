import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const CourseEnrollmentModal = ({ isOpen, onClose, course, student, onEnrollSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  // Step 1 State: Enrollment details
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBatch, setSelectedBatch] = useState(student?.grade ? `Grade ${student.grade} - Regular Session` : 'Regular Session');

  // Step 2 State: Card payment details
  const [cardholderName, setCardholderName] = useState(student?.name || '');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardError, setCardError] = useState('');

  // Step 3 State: OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [demoOtpCode, setDemoOtpCode] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for Resend OTP button
  useEffect(() => {
    let timer;
    if (step === 3 && resendTimer > 0) {
      timer = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, resendTimer]);

  if (!isOpen || !course) return null;

  const courseFee = course.price || 2500;

  // Format Card Number (adds space every 4 digits)
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') || raw;
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (e) => {
    let raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 3) {
      raw = raw.slice(0, 2) + '/' + raw.slice(2);
    }
    setExpiry(raw);
  };

  // Request Real OTP from Backend
  const requestOtpDispatch = async () => {
    setSendingOtp(true);
    setOtpError('');
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5000/api/payments/send-otp',
        { courseId: course._id },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setDemoOtpCode(res.data.otpCode || '');
      setPhoneMasked(res.data.phoneMasked || student?.parentsPhoneNumber || '');
      setResendTimer(60);
      setCanResend(false);
      setOtpCode('');
      toast.success(res.data.message || 'OTP code sent to mobile!');
      return true;
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to dispatch OTP.';
      setCardError(errorMsg);
      toast.error(errorMsg);
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  // Validate Card Details in Step 2 & Dispatch OTP
  const handleProceedToOTP = async (e) => {
    e.preventDefault();
    setCardError('');

    const rawCard = cardNumber.replace(/\s/g, '');
    if (rawCard.length !== 16) {
      setCardError('Please enter a valid 16-digit card number.');
      return;
    }

    if (!cardholderName.trim() || cardholderName.trim().length < 3) {
      setCardError('Please enter a valid cardholder name.');
      return;
    }

    if (!expiry || !expiry.includes('/') || expiry.length !== 5) {
      setCardError('Please enter expiry date in MM/YY format.');
      return;
    }

    const [mmStr, yyStr] = expiry.split('/');
    const expMM = parseInt(mmStr, 10);
    const expYY = parseInt('20' + yyStr, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    if (isNaN(expMM) || expMM < 1 || expMM > 12) {
      setCardError('Invalid expiry month. Must be between 01 and 12.');
      return;
    }

    if (isNaN(expYY) || expYY < currentYear || (expYY === currentYear && expMM < currentMonth)) {
      setCardError(`Card has expired. Expiry date must exceed or equal current date (${currentMonth < 10 ? '0' + currentMonth : currentMonth}/${currentYear.toString().slice(-2)}).`);
      return;
    }

    if (!cvv || cvv.length < 3 || cvv.length > 4 || isNaN(cvv)) {
      setCardError('Please enter a valid 3 or 4 digit CVV code.');
      return;
    }

    // Call backend to generate & dispatch real OTP
    const sent = await requestOtpDispatch();
    if (sent) {
      setStep(3);
    }
  };

  // Submit Payment & Verify Real OTP (Step 3)
  const handleCompletePayment = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const cardLastFour = cardNumber.replace(/\s/g, '').slice(-4) || '4242';

      const res = await axios.post(
        'http://localhost:5000/api/payments/process-mock',
        {
          courseId: course._id,
          enrollmentDate,
          amount: courseFee,
          cardLastFour,
          otpCode: otpCode.trim()
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(res.data.message || 'Payment & Enrollment successful!');
      if (onEnrollSuccess) {
        onEnrollSuccess();
      }
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Payment process failed. Please try again.';
      setOtpError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 animate-fadeIn">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full w-8 h-8 flex items-center justify-center transition"
          >
            ✕
          </button>
          
          <div className="flex items-center space-x-3">
            <span className="text-3xl">🎓</span>
            <div>
              <h3 className="text-xl font-bold">Course Registration & Payment</h3>
              <p className="text-xs text-indigo-200 mt-0.5">{course.title}</p>
            </div>
          </div>

          {/* Stepper Bar */}
          <div className="flex items-center justify-between mt-6 px-4">
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 1 ? 'bg-amber-400 text-purple-950' : 'bg-white/20 text-white'}`}>1</span>
              <span className="text-xs text-white/90 hidden sm:inline font-medium">Registration</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step >= 2 ? 'bg-amber-400' : 'bg-white/20'}`}></div>
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step >= 2 ? 'bg-amber-400 text-purple-950' : 'bg-white/20 text-white'}`}>2</span>
              <span className="text-xs text-white/90 hidden sm:inline font-medium">Payment Gateway</span>
            </div>
            <div className={`h-0.5 flex-1 mx-2 ${step >= 3 ? 'bg-amber-400' : 'bg-white/20'}`}></div>
            <div className="flex items-center gap-2">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === 3 ? 'bg-amber-400 text-purple-950' : 'bg-white/20 text-white'}`}>3</span>
              <span className="text-xs text-white/90 hidden sm:inline font-medium">OTP Verification</span>
            </div>
          </div>
        </div>

        {/* STEP 1: Registration Form */}
        {step === 1 && (
          <div className="p-6 md:p-8 space-y-6">
            <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 mb-3 flex items-center gap-1.5">
                <span>📋</span> Student Information (Database Records)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500 block">Student Name:</span>
                  <span className="font-semibold text-gray-800">{student?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Email Address:</span>
                  <span className="font-semibold text-gray-800">{student?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Registration Number:</span>
                  <span className="font-semibold text-gray-800">{student?.registrationNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 block">Registered Grade:</span>
                  <span className="inline-block px-2 py-0.5 bg-purple-200 text-purple-900 font-bold rounded-md text-xs">
                    Grade {student?.grade || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Enrollment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 font-medium text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Class Session / Batch
                </label>
                <input
                  type="text"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 font-medium text-sm"
                />
              </div>
            </div>

            {/* Fee Breakdown */}
            <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-2xl">
              <div>
                <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">Total Course Fee</span>
                <span className="text-2xl font-extrabold text-amber-400">LKR {courseFee.toLocaleString()}</span>
              </div>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-sm"
              >
                Proceed to Pay ➔
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Simulated Online Payment Gateway (Card Details) */}
        {step === 2 && (
          <form onSubmit={handleProceedToOTP} className="p-6 md:p-8 space-y-5">
            {/* Sampath / Card Acquiring Branding Banner */}
            <div className="flex justify-between items-center bg-indigo-50 border border-indigo-100 p-3 rounded-xl">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-indigo-900">Online Payment Gateway</span>
                <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-semibold">Sampath Bank IPG Partner</span>
              </div>
              <div className="flex gap-1.5 text-xs font-bold">
                <span className="px-2 py-1 bg-blue-600 text-white rounded">VISA</span>
                <span className="px-2 py-1 bg-red-600 text-white rounded">MC</span>
              </div>
            </div>

            {cardError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 font-medium">
                ⚠️ {cardError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="e.g. A.B. PERERA"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 font-semibold text-sm uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Card Number (16 Digits)
              </label>
              <input
                type="text"
                placeholder="4000 0000 0000 0000"
                value={cardNumber}
                onChange={handleCardNumberChange}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 font-mono font-bold tracking-widest text-sm"
                maxLength={19}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 font-mono font-bold text-sm"
                  maxLength={5}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  CVV Code
                </label>
                <input
                  type="password"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 font-mono font-bold text-sm"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-xs text-gray-600 font-bold hover:text-gray-900 transition"
              >
                ← Back to Details
              </button>

              <button
                type="submit"
                disabled={sendingOtp}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition text-sm flex items-center gap-2"
              >
                {sendingOtp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Sending OTP...
                  </>
                ) : (
                  `Pay LKR ${courseFee.toLocaleString()}`
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Real OTP Verification */}
        {step === 3 && (
          <form onSubmit={handleCompletePayment} className="p-6 md:p-8 space-y-5 text-center">
            <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center text-2xl mx-auto font-bold shadow-inner">
              🔐
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-800">Two-Factor Payment Authentication</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
                Enter the 6-digit OTP code sent to your registered mobile number{' '}
                <span className="font-bold text-gray-800">{phoneMasked || student?.parentsPhoneNumber || 'your mobile'}</span>.
              </p>
            </div>

            {/* Demo Helper Banner */}
            {demoOtpCode && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl p-3 text-xs text-purple-900 font-medium">
                📱 <strong>Real Generated OTP Code:</strong>{' '}
                <span className="bg-purple-200 text-purple-950 px-2.5 py-1 rounded-md font-mono font-bold text-sm tracking-widest">
                  {demoOtpCode}
                </span>
                <span className="block text-[10px] text-purple-700 mt-1">
                  (Valid for 5 minutes • Saved in MongoDB OTP collection)
                </span>
              </div>
            )}

            {otpError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-200 font-medium">
                ⚠️ {otpError}
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-52 mx-auto px-4 py-3 bg-gray-50 border-2 border-purple-500 rounded-2xl text-center text-2xl font-mono font-bold tracking-[0.5em] focus:ring-4 focus:ring-purple-200 outline-none text-purple-950 shadow-inner"
                maxLength={6}
                required
              />
            </div>

            <div className="flex justify-center items-center text-xs">
              {canResend ? (
                <button
                  type="button"
                  onClick={requestOtpDispatch}
                  disabled={sendingOtp}
                  className="text-indigo-600 font-bold hover:underline cursor-pointer"
                >
                  {sendingOtp ? 'Sending new code...' : 'Didn\'t receive code? Resend OTP 🔄'}
                </button>
              ) : (
                <span className="text-gray-400">
                  Resend code in <strong className="text-gray-700 font-mono">{resendTimer}s</strong>
                </span>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-xs text-gray-600 font-bold hover:text-gray-900 transition"
              >
                ← Back to Card
              </button>

              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition text-sm flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Verifying...
                  </>
                ) : (
                  'Verify & Complete Enrollment ✓'
                )}
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};

export default CourseEnrollmentModal;
