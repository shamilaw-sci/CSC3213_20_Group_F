import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const CourseEnrollmentModal = ({ isOpen, onClose, course, student, onEnrollSuccess }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submittingSlip, setSubmittingSlip] = useState(false);

  // Payment Method Selection: 'CARD' | 'BANK_SLIP'
  const [paymentMethodType, setPaymentMethodType] = useState('CARD');

  // Step 1 State: Enrollment details
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBatch, setSelectedBatch] = useState(student?.grade ? `Grade ${student.grade} - Regular Session` : 'Regular Session');

  // Bank Slip Upload State
  const [slipImage, setSlipImage] = useState('');
  const [depositorName, setDepositorName] = useState(student?.name || '');
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [slipReference, setSlipReference] = useState('');
  const [slipError, setSlipError] = useState('');

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

  const getCardType = (number) => {
    const clean = (number || '').replace(/\D/g, '');
    if (clean.startsWith('4')) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(clean)) return 'mastercard';
    if (/^3[47]/.test(clean)) return 'amex';
    return 'none';
  };

  const cardType = getCardType(cardNumber);

  if (!isOpen || !course) return null;

  const courseFee = course.price || 2500;
  const courseBankDetails = course.bankDetails || {};

  // Handle Slip File Upload to Base64
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setSlipError('File size exceeds 8MB limit. Please upload a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSlipImage(event.target.result);
      setSlipError('');
    };
    reader.readAsDataURL(file);
  };

  // Submit Bank Deposit Slip to Backend
  const handleBankSlipSubmit = async (e) => {
    e.preventDefault();
    setSlipError('');

    if (!slipImage) {
      setSlipError('Please upload a photo or image of your bank deposit receipt/slip.');
      return;
    }

    if (!depositorName.trim()) {
      setSlipError('Please enter depositor name.');
      return;
    }

    setSubmittingSlip(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:5000/api/payments/submit-bank-slip',
        {
          courseId: course._id,
          amount: courseFee,
          slipImage,
          depositorName: depositorName.trim(),
          depositDate,
          transactionId: slipReference ? slipReference.trim() : undefined
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(res.data.message || 'Bank slip submitted successfully! Pending Admin approval.');
      if (onEnrollSuccess) {
        onEnrollSuccess();
      }
      onClose();
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Failed to submit bank slip.';
      setSlipError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setSubmittingSlip(false);
    }
  };

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
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 animate-fadeIn text-gray-800 dark:text-gray-100">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] p-6 text-white relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/20 hover:bg-red-600 text-white font-bold text-xs px-3.5 py-1.5 rounded-full transition flex items-center gap-1.5 shadow-md border border-white/30 cursor-pointer"
            title="Close & Go Back"
          >
            <span className="text-base font-black leading-none">✕</span>
            <span className="font-extrabold text-xs">Close / Go Back</span>
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
            <div className="bg-purple-50 dark:bg-slate-800/80 rounded-2xl p-4 border border-purple-100 dark:border-slate-700">
              <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-1.5">
                <span>📋</span> Student Information (Database Records)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Student Name:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{student?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Email Address:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{student?.email || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Registration Number:</span>
                  <span className="font-semibold text-gray-800 dark:text-white">{student?.registrationNumber || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 block">Registered Grade:</span>
                  <span className="inline-block px-2 py-0.5 bg-purple-200 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 font-bold rounded-md text-xs border border-purple-300 dark:border-purple-800">
                    Grade {student?.grade || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Enrollment Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={enrollmentDate}
                  onChange={(e) => setEnrollmentDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-medium text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Class Session / Batch
                </label>
                <input
                  type="text"
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-medium text-sm"
                />
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Select Payment Method <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Card IPG */}
                  <div 
                    onClick={() => setPaymentMethodType('CARD')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethodType === 'CARD' 
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/60 shadow-md ring-2 ring-purple-200 dark:ring-purple-900' 
                        : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100/80 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-xs text-purple-950 dark:text-purple-300">💳 Online Card Payment</span>
                      {paymentMethodType === 'CARD' && <span className="text-xs text-purple-700 dark:text-purple-400 font-bold">✓ Selected</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                      Visa / Mastercard IPG with OTP. Instant enrollment.
                    </p>
                  </div>

                  {/* Option B: Bank Slip */}
                  <div 
                    onClick={() => setPaymentMethodType('BANK_SLIP')}
                    className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      paymentMethodType === 'BANK_SLIP' 
                        ? 'border-purple-600 bg-purple-50/80 dark:bg-purple-950/60 shadow-md ring-2 ring-purple-200 dark:ring-purple-900' 
                        : 'border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100/80 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-xs text-purple-950 dark:text-purple-300">🏦 Direct Bank Deposit</span>
                      {paymentMethodType === 'BANK_SLIP' && <span className="text-xs text-purple-700 dark:text-purple-400 font-bold">✓ Selected</span>}
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight">
                      Deposit course fee at bank & upload slip for Admin approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* IF BANK SLIP SELECTED: RENDER BANK DETAILS & FILE UPLOAD */}
              {paymentMethodType === 'BANK_SLIP' && (
                <div className="bg-gradient-to-br from-purple-50 to-indigo-50/60 dark:from-slate-800 dark:to-indigo-950/40 p-4 rounded-2xl border border-purple-200 dark:border-slate-700 space-y-4 animate-fadeIn">
                  <div className="border-b border-purple-200/60 dark:border-slate-700 pb-2">
                    <h4 className="font-extrabold text-purple-950 dark:text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏦</span> Institute Bank Account Details
                    </h4>
                    <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">Transfer LKR {courseFee.toLocaleString()} to the account below and upload receipt.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-xl border border-purple-100 dark:border-slate-700 shadow-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Bank Name</span>
                      <span className="font-extrabold text-gray-800 dark:text-white">{courseBankDetails.bankName || 'Sampath Bank PLC'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Account Holder</span>
                      <span className="font-extrabold text-gray-800 dark:text-white">{courseBankDetails.accountName || 'LuminaLearn Institute'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Account Number</span>
                      <span className="font-mono font-bold text-purple-900 dark:text-purple-300">{courseBankDetails.accountNumber || '1098 7654 3210'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-gray-400 block">Branch</span>
                      <span className="font-extrabold text-gray-800 dark:text-white">{courseBankDetails.branchName || 'Colombo Head Office'}</span>
                    </div>
                  </div>

                  {courseBankDetails.paymentInstructions && (
                    <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 p-2.5 rounded-xl text-amber-900 dark:text-amber-200 text-[11px]">
                      <strong>Instructions:</strong> {courseBankDetails.paymentInstructions}
                    </div>
                  )}

                  {slipError && (
                    <div className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs p-2.5 rounded-xl border border-red-200 dark:border-red-800 font-medium">
                      ⚠️ {slipError}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                        Upload Deposit Slip Photo / PDF <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-2 border border-purple-200 dark:border-slate-700 rounded-xl text-xs outline-none cursor-pointer"
                        required
                      />
                      {slipImage && (
                        <div className="mt-2 text-center">
                          <img src={slipImage} alt="Deposit Slip Preview" className="max-h-32 mx-auto rounded-lg border-2 border-purple-400 shadow-md object-contain" />
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">✓ Slip Image Loaded</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                          Depositor Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Name on bank slip"
                          value={depositorName}
                          onChange={(e) => setDepositorName(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                          Deposit Date
                        </label>
                        <input
                          type="date"
                          value={depositDate}
                          onChange={(e) => setDepositDate(e.target.value)}
                          className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-xl text-xs font-semibold outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                        Bank Reference / Receipt No (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. REF98765432"
                        value={slipReference}
                        onChange={(e) => setSlipReference(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-xl text-xs font-mono font-semibold outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleBankSlipSubmit}
                    disabled={submittingSlip}
                    className="w-full py-3 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white font-extrabold rounded-xl shadow-lg transition text-xs flex items-center justify-center gap-2 cursor-pointer mt-2"
                  >
                    {submittingSlip ? 'Submitting Bank Slip...' : 'Submit Bank Slip for Approval ➔'}
                  </button>
                </div>
              )}
            </div>

            {/* Fee Breakdown */}
            <div className="flex justify-between items-center bg-gray-900 dark:bg-slate-800 text-white p-4 rounded-2xl gap-3 border border-transparent dark:border-slate-700">
              <div>
                <span className="text-xs text-gray-400 block uppercase font-bold tracking-wider">Total Course Fee</span>
                <span className="text-2xl font-extrabold text-amber-400">LKR {courseFee.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2.5 bg-gray-800 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-gray-700 hover:border-red-600"
                >
                  <span className="text-sm font-black">✕</span> Cancel & Go Back
                </button>
                {paymentMethodType === 'CARD' && (
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-purple-950 font-bold rounded-xl shadow-lg transition flex items-center gap-2 text-xs sm:text-sm cursor-pointer"
                  >
                    Proceed to Pay Online ➔
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Simulated Online Payment Gateway (Card Details) */}
        {step === 2 && (
          <form onSubmit={handleProceedToOTP} className="p-6 md:p-8 space-y-5">
            {/* Sampath / Card Acquiring Branding Banner with Dynamic Brand Highlighting */}
            <div className="flex justify-between items-center bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-slate-800 dark:via-purple-950/40 dark:to-slate-800 border border-indigo-100 dark:border-slate-700 p-3.5 rounded-2xl shadow-xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">Payment Gateway</span>
                <span className="text-[10px] bg-indigo-200/70 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 px-2.5 py-0.5 rounded-full font-bold border border-indigo-300/40 dark:border-indigo-800">
                  Sampath Bank IPG Partner
                </span>
              </div>

              {/* Card Brand Badges */}
              <div className="flex items-center gap-2">
                {/* Visa Badge */}
                <div 
                  className={`px-3 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1 border ${
                    cardType === 'visa' 
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md scale-110 ring-2 ring-blue-400 font-extrabold' 
                      : cardType === 'none'
                      ? 'bg-blue-100/70 dark:bg-blue-950/40 text-blue-900 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 opacity-30 grayscale'
                  }`}
                >
                  <span className="font-black italic tracking-wider text-xs">VISA</span>
                  {cardType === 'visa' && <span className="text-[10px] font-bold">✓</span>}
                </div>

                {/* Mastercard Badge */}
                <div 
                  className={`px-3 py-1.5 rounded-xl transition-all duration-300 flex items-center gap-1.5 border ${
                    cardType === 'mastercard' 
                      ? 'bg-gradient-to-r from-red-600 via-amber-500 to-red-600 text-white border-red-700 shadow-md scale-110 ring-2 ring-red-400 font-extrabold' 
                      : cardType === 'none'
                      ? 'bg-amber-100/70 dark:bg-amber-950/40 text-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800 font-bold'
                      : 'bg-gray-100 dark:bg-slate-800 text-gray-400 border-gray-200 dark:border-slate-700 opacity-30 grayscale'
                  }`}
                >
                  <div className="flex -space-x-1.5 items-center">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span>
                    <span className="w-2.5 h-2.5 bg-amber-400 rounded-full inline-block opacity-90"></span>
                  </div>
                  <span className="font-bold tracking-tight text-xs">Mastercard</span>
                  {cardType === 'mastercard' && <span className="text-[10px] font-bold">✓</span>}
                </div>
              </div>
            </div>

            {cardError && (
              <div className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 font-medium">
                ⚠️ {cardError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                placeholder="e.g. A.B. PERERA"
                value={cardholderName}
                onChange={(e) => setCardholderName(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-semibold text-sm uppercase"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Card Number (16 Digits)
                </label>
                {cardType === 'visa' && (
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-extrabold flex items-center gap-1 animate-pulse">
                    💳 Visa Card Detected
                  </span>
                )}
                {cardType === 'mastercard' && (
                  <span className="text-xs text-red-600 dark:text-red-400 font-extrabold flex items-center gap-1 animate-pulse">
                    💳 Mastercard Detected
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="4000 0000 0000 0000"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  className={`w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border rounded-xl focus:ring-2 outline-none text-gray-800 dark:text-white font-mono font-bold tracking-widest text-sm transition-all ${
                    cardType === 'visa'
                      ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20'
                      : cardType === 'mastercard'
                      ? 'border-red-500 ring-2 ring-red-100 bg-red-50/20'
                      : 'border-gray-200 dark:border-slate-700 focus:ring-purple-500'
                  }`}
                  maxLength={19}
                  required
                />
                {cardType === 'visa' && (
                  <span className="absolute right-3 top-2.5 px-2 py-0.5 bg-blue-600 text-white font-black italic rounded text-[10px] shadow">
                    VISA
                  </span>
                )}
                {cardType === 'mastercard' && (
                  <span className="absolute right-3 top-2.5 px-2 py-0.5 bg-gradient-to-r from-red-600 to-amber-500 text-white font-bold rounded text-[10px] shadow">
                    MC
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={handleExpiryChange}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-mono font-bold text-sm"
                  maxLength={5}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  CVV Code
                </label>
                <input
                  type="password"
                  placeholder="123"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-mono font-bold text-sm"
                  maxLength={4}
                  required
                />
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition"
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
            <div className="w-14 h-14 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-2xl mx-auto font-bold shadow-inner">
              🔐
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-800 dark:text-white">Two-Factor Payment Authentication</h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                Enter the 6-digit OTP code sent to your registered mobile number{' '}
                <span className="font-bold text-gray-800 dark:text-white">{phoneMasked || student?.parentsPhoneNumber || 'your mobile'}</span>.
              </p>
            </div>

            {/* Demo Helper Banner */}
            {demoOtpCode && (
              <div className="bg-purple-50 dark:bg-slate-800 border border-purple-200 dark:border-slate-700 rounded-2xl p-3 text-xs text-purple-900 dark:text-purple-300 font-medium">
                📱 <strong>Real Generated OTP Code:</strong>{' '}
                <span className="bg-purple-200 dark:bg-purple-950 text-purple-950 dark:text-purple-200 px-2.5 py-1 rounded-md font-mono font-bold text-sm tracking-widest border border-purple-300 dark:border-purple-800">
                  {demoOtpCode}
                </span>
                <span className="block text-[10px] text-purple-700 dark:text-purple-400 mt-1">
                  (Valid for 5 minutes • Saved in MongoDB OTP collection)
                </span>
              </div>
            )}

            {otpError && (
              <div className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs p-3 rounded-xl border border-red-200 dark:border-red-800 font-medium">
                ⚠️ {otpError}
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-52 mx-auto px-4 py-3 bg-gray-50 dark:bg-slate-800 border-2 border-purple-500 rounded-2xl text-center text-2xl font-mono font-bold tracking-[0.5em] focus:ring-4 focus:ring-purple-200 outline-none text-purple-950 dark:text-purple-300 shadow-inner"
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
                  className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                >
                  {sendingOtp ? 'Sending new code...' : 'Didn\'t receive code? Resend OTP 🔄'}
                </button>
              ) : (
                <span className="text-gray-400 dark:text-gray-500">
                  Resend code in <strong className="text-gray-700 dark:text-gray-300 font-mono">{resendTimer}s</strong>
                </span>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2.5 text-xs text-gray-600 dark:text-gray-400 font-bold hover:text-gray-900 dark:hover:text-white transition"
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
