import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const CourseEnrollmentModal = ({ 
  isOpen, 
  onClose, 
  course, 
  student, 
  onEnrollSuccess,
  isMonthlyFee = false,
  feeStatus = null,
  onPaymentSuccess = null
}) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [submittingSlip, setSubmittingSlip] = useState(false);

  // Payment Method Selection: 'CARD' or 'BANK_SLIP'
  const [paymentMethodType, setPaymentMethodType] = useState('CARD');

  // Step 1 State: Enrollment details
  const [enrollmentDate, setEnrollmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedBatch, setSelectedBatch] = useState(student?.grade ? `${student.grade} - Regular Session` : 'Regular Session');

  // Bank Slip Upload State
  const [slipFile, setSlipFile] = useState(null);
  const [slipPreview, setSlipPreview] = useState('');
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
  const [smsPhone, setSmsPhone] = useState(student?.phoneNumber || student?.parentsPhoneNumber || '');

  // Step 3 State: OTP Verification
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [phoneMasked, setPhoneMasked] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Reset step & error states whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCardError('');
      setSlipError('');
      setOtpError('');
      setSmsPhone(student?.phoneNumber || student?.parentsPhoneNumber || '');
    }
  }, [isOpen]);

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

  const normalizeGrade = (g) => g ? String(g).toLowerCase().replace(/\s+/g, '').replace('grade', '') : '';

  const getMatchingGrade = (gradeVal) => {
    if (!course?.enrolledGrades?.length) return null;
    const targetNorm = normalizeGrade(gradeVal);
    if (!targetNorm) return course.enrolledGrades[0] || null;
    return course.enrolledGrades.find(g => {
      const gNorm = normalizeGrade(g.gradeNumber);
      const parts = String(g.gradeNumber).split(/[\&,/\+\-]|(?:\s+and\s+)/i).map(normalizeGrade);
      return gNorm === targetNorm || parts.includes(targetNorm);
    }) || course.enrolledGrades[0] || null;
  };

  const [selectedGradeOption, setSelectedGradeOption] = useState(() => {
    const matched = getMatchingGrade(student?.grade);
    return matched?.gradeNumber || student?.grade || (course?.enrolledGrades?.[0]?.gradeNumber || '');
  });

  useEffect(() => {
    if (course?.enrolledGrades?.length) {
      const matched = getMatchingGrade(student?.grade);
      if (matched) {
        setSelectedGradeOption(matched.gradeNumber);
      } else if (course.enrolledGrades[0]) {
        setSelectedGradeOption(course.enrolledGrades[0].gradeNumber);
      }
    }
  }, [course?._id, student?.grade]);

  const activeGradeObj = getMatchingGrade(selectedGradeOption) || getMatchingGrade(student?.grade);
  const courseFee = (activeGradeObj && activeGradeObj.fee !== undefined && activeGradeObj.fee !== null && Number(activeGradeObj.fee) >= 0)
    ? Number(activeGradeObj.fee)
    : (course?.price || 2500);
  const courseBankDetails = course?.bankDetails || {};

  // Handle Slip File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setSlipError('File size exceeds 10MB limit. Please upload a smaller file under 10MB.');
      return;
    }

    setSlipFile(file);
    setSlipError('');

    if (file.type.startsWith('image/')) {
      setSlipPreview(URL.createObjectURL(file));
    } else {
      setSlipPreview('');
    }
  };

  // Submit Bank Deposit Slip to Backend via FormData
  const handleBankSlipSubmit = async (e) => {
    if (e) e.preventDefault();
    setSlipError('');

    if (!slipFile) {
      setSlipError('Please upload a photo or image/PDF of your bank deposit receipt/slip.');
      return;
    }

    if (!depositorName.trim()) {
      setSlipError('Please enter depositor name.');
      return;
    }

    setSubmittingSlip(true);
    try {
      const formData = new FormData();
      formData.append('courseId', course._id);
      formData.append('amount', courseFee);
      formData.append('grade', selectedGradeOption || student?.grade || '');
      formData.append('slip', slipFile);
      formData.append('depositorName', depositorName.trim());
      formData.append('depositDate', depositDate);
      if (slipReference && slipReference.trim()) {
        formData.append('transactionId', slipReference.trim());
      }
      if (isMonthlyFee) {
        formData.append('month', feeStatus?.currentMonth || new Date().toLocaleString('en-US', { month: 'long' }));
        formData.append('year', feeStatus?.currentYear || new Date().getFullYear());
      }

      const res = await api.post('/payments/submit-bank-slip', formData);

      toast.success(res.data.message || 'Bank slip submitted successfully! Pending Admin approval.');
      if (onEnrollSuccess) {
        onEnrollSuccess();
      }
      if (onPaymentSuccess) {
        onPaymentSuccess();
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

  // Request Real OTP from Backend via SMS Gateway
  const requestOtpDispatch = async () => {
    setSendingOtp(true);
    setOtpError('');
    try {
      const targetPhone = smsPhone || student?.phoneNumber || student?.parentsPhoneNumber;
      const res = await api.post('/payments/send-otp', { 
        courseId: course._id,
        phone: targetPhone
      });

      setPhoneMasked(res.data.phoneMasked || targetPhone || '');
      setResendTimer(60);
      setCanResend(false);
      setOtpCode('');
      toast.success(res.data.message || 'OTP code sent via SMS to mobile!');
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
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
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

    const targetPhone = smsPhone || student?.phoneNumber || student?.parentsPhoneNumber;
    if (!targetPhone || !targetPhone.trim()) {
      setCardError('Please enter a valid mobile number to receive the SMS OTP.');
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
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setOtpError('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setOtpError('Please enter the 6-digit OTP code.');
      return;
    }

    setLoading(true);
    try {
      const cardLastFour = cardNumber.replace(/\s/g, '').slice(-4) || '4242';

      const res = await api.post('/payments/process-mock', {
        courseId: course._id,
        enrollmentDate,
        amount: courseFee,
        grade: selectedGradeOption || student?.grade,
        cardLastFour,
        otpCode: otpCode.trim(),
        month: isMonthlyFee ? (feeStatus?.currentMonth || new Date().toLocaleString('en-US', { month: 'long' })) : undefined,
        year: isMonthlyFee ? (feeStatus?.currentYear || new Date().getFullYear()) : undefined
      });

      toast.success(res.data.message || (isMonthlyFee ? 'Monthly tuition fee settled successfully!' : 'Payment & Enrollment successful!'));
      if (onEnrollSuccess) {
        onEnrollSuccess();
      }
      if (onPaymentSuccess) {
        onPaymentSuccess();
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

  if (!isOpen || !course) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl max-h-[90vh] flex flex-col rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-slate-800 animate-fadeIn text-gray-800 dark:text-gray-100 my-auto">

        {/* Modal Header (Fixed at top) */}
        <div className="flex-shrink-0 bg-gradient-to-r from-[#2d1b64] via-indigo-900 to-[#2d1b64] px-5 py-4 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-4 bg-white/20 hover:bg-red-600 text-white font-bold text-xs px-3 py-1 rounded-full transition flex items-center gap-1.5 shadow-md border border-white/30 cursor-pointer"
            title="Close & Go Back"
          >
            <span className="text-base font-black leading-none">✕</span>
            <span className="font-extrabold text-xs hidden xs:inline">Close</span>
          </button>

          <div className="flex items-center space-x-3 pr-16">
            <span className="text-2xl sm:text-3xl">{isMonthlyFee ? '💳' : '🎓'}</span>
            <div>
              <h3 className="text-base sm:text-lg font-bold leading-tight">
                {isMonthlyFee ? 'Monthly Tuition Settlement' : 'Course Registration & Payment'}
              </h3>
              <p className="text-xs text-indigo-200 truncate max-w-xs sm:max-w-md mt-0.5">
                {course.title} {isMonthlyFee && feeStatus?.currentMonth ? `• ${feeStatus.currentMonth} ${feeStatus.currentYear || ''}` : ''}
              </p>
            </div>
          </div>

          {/* Flow Information Badge */}
          <div className="flex items-center gap-2 mt-3 bg-white/10 px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span className={`w-2 h-2 rounded-full ${isMonthlyFee && feeStatus?.status === 'OVERDUE' ? 'bg-amber-400' : 'bg-emerald-400'} animate-ping inline-block`}></span>
            <span className="font-medium text-white/90">
              {isMonthlyFee 
                ? `Billing Month: ${feeStatus?.currentMonth || 'Current Month'} ${feeStatus?.currentYear || ''} • Settle fee to unlock class workspace`
                : (paymentMethodType === 'CARD' ? 'Option: Online Gateway Card Payment & Instant Verification' : 'Option: Direct Bank Deposit & Slip Verification')}
            </span>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">

          {/* STEP 1: Registration Form */}
          {step === 1 && (
            <div className="space-y-4">

              {isMonthlyFee && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200 dark:border-purple-800 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 dark:text-purple-300 block">
                      Billing Period
                    </span>
                    <span className="text-sm font-black text-purple-950 dark:text-white">
                      {feeStatus?.currentMonth || 'November'} {feeStatus?.currentYear || new Date().getFullYear()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-purple-700 dark:text-purple-300 block">
                      Monthly Tuition Fee
                    </span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      LKR {courseFee.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Student Information (Database Records) */}
              <div className="bg-purple-50/70 dark:bg-slate-800/80 rounded-xl p-3 sm:p-3.5 border border-purple-100 dark:border-slate-700">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-2 flex items-center gap-1.5">
                  <span>📋</span> Student Information (Database Records)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Student Name:</span>
                    <span className="font-semibold text-gray-800 dark:text-white truncate block">{student?.name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Email Address:</span>
                    <span className="font-semibold text-gray-800 dark:text-white truncate block">{student?.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Registration Number:</span>
                    <span className="font-semibold text-gray-800 dark:text-white">{student?.registrationNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 block">Registered Grade:</span>
                    <span className="inline-block px-1.5 py-0.5 bg-purple-200 dark:bg-purple-950/80 text-purple-900 dark:text-purple-300 font-bold rounded text-[11px] border border-purple-300 dark:border-purple-800">
                      {student?.grade || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Enrolling Class & Batch Selector */}
              {course?.enrolledGrades && course.enrolledGrades.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Select Grade Class / Fee Tier <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedGradeOption}
                    onChange={(e) => {
                      setSelectedGradeOption(e.target.value);
                      setSelectedBatch(`${e.target.value} - Regular Session`);
                    }}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-semibold text-xs sm:text-sm cursor-pointer"
                  >
                    {course.enrolledGrades.map((g) => {
                      const gFee = (g.fee !== undefined && g.fee !== null && Number(g.fee) >= 0) ? Number(g.fee) : (course.price || 2500);
                      return (
                        <option key={g.gradeNumber} value={g.gradeNumber}>
                          {g.title || g.gradeNumber} ({g.gradeNumber}) — Fee: LKR {gFee.toLocaleString()}
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Enrollment Date & Batch (2-Column Grid) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Enrollment Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={enrollmentDate}
                    onChange={(e) => setEnrollmentDate(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-medium text-xs sm:text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Class Session / Batch
                  </label>
                  <input
                    type="text"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-medium text-xs sm:text-sm"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Select Payment Method <span className="text-red-500">*</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

                  {/* Option A: Card IPG (ACTIVE & SELECTABLE) */}
                  <div
                    onClick={() => setPaymentMethodType('CARD')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethodType === 'CARD'
                        ? 'border-purple-600 bg-purple-50/90 dark:bg-purple-950/60 shadow-sm ring-2 ring-purple-200 dark:ring-purple-900'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1">
                        💳 Online Card Payment
                      </span>
                      {paymentMethodType === 'CARD' ? (
                        <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold">
                          ✓ Selected
                        </span>
                      ) : (
                        <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                          Instant Access
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-tight">
                      Instant clearance via Visa / Mastercard & 2FA OTP verification.
                    </p>
                  </div>

                  {/* Option B: Bank Slip (ACTIVE & SELECTABLE) */}
                  <div
                    onClick={() => setPaymentMethodType('BANK_SLIP')}
                    className={`p-3 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      paymentMethodType === 'BANK_SLIP'
                        ? 'border-purple-600 bg-purple-50/90 dark:bg-purple-950/60 shadow-sm ring-2 ring-purple-200 dark:ring-purple-900'
                        : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1">
                        🏦 Direct Bank Deposit
                      </span>
                      {paymentMethodType === 'BANK_SLIP' ? (
                        <span className="text-[10px] text-purple-700 dark:text-purple-400 font-bold">
                          ✓ Selected
                        </span>
                      ) : (
                        <span className="text-[9px] bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 font-bold px-1.5 py-0.5 rounded">
                          Manual Slip
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-600 dark:text-gray-300 leading-tight">
                      Deposit course fee at bank & upload slip for Admin approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* CARD PAYMENT INFO CARD */}
              {paymentMethodType === 'CARD' && (
                <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/60 to-indigo-50/90 dark:from-slate-800 dark:via-purple-950/30 dark:to-slate-800 p-4 rounded-xl sm:rounded-2xl border border-indigo-200 dark:border-slate-700 space-y-3 shadow-xs animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-indigo-100 dark:border-slate-700 pb-2.5">
                    <div>
                      <h4 className="font-extrabold text-indigo-950 dark:text-indigo-200 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <span>💳</span> Instant Online Card Checkout
                      </h4>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                        Visa, Mastercard & American Express supported with 3D-Secure 2FA OTP.
                      </p>
                    </div>
                    <span className="text-xl">🔒</span>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-indigo-100 dark:border-slate-700 text-xs space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">Payment Amount:</span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm">LKR {courseFee.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">Processing Flow:</span>
                      <span className="font-bold text-gray-800 dark:text-white">Encrypted Card Entry ➔ SMS / Portal OTP ➔ Complete</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-gray-500 dark:text-gray-400 font-semibold">Class Workspace:</span>
                      <span className="font-bold text-purple-700 dark:text-purple-300">Instant Unlocking without Waiting</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BANK DETAILS & SLIP UPLOAD */}
              {paymentMethodType === 'BANK_SLIP' && (
                <div className="bg-gradient-to-br from-purple-50/90 to-indigo-50/60 dark:from-slate-800 dark:to-indigo-950/40 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-200 dark:border-slate-700 space-y-3 shadow-xs animate-fadeIn">
                  <div className="border-b border-purple-200/60 dark:border-slate-700 pb-2">
                    <h4 className="font-extrabold text-purple-950 dark:text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏦</span> Institute Bank Account Details
                    </h4>
                    <p className="text-[11px] text-purple-700 dark:text-purple-400 mt-0.5">
                      Transfer <strong className="font-extrabold">LKR {courseFee.toLocaleString()}</strong> to the account below and upload your receipt.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-purple-100 dark:border-slate-700 shadow-xs">
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Bank Name</span>
                      <span className="font-bold text-gray-800 dark:text-white text-xs">{courseBankDetails.bankName || 'Sampath Bank PLC'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Account Holder</span>
                      <span className="font-bold text-gray-800 dark:text-white text-xs">{courseBankDetails.accountName || 'M.G.S.C.K.Herath'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Account Number</span>
                      <span className="font-bold text-gray-800 dark:text-white text-xs">{courseBankDetails.accountNumber || '1184 5213 3874'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-bold text-gray-400 block">Branch</span>
                      <span className="font-bold text-gray-800 dark:text-white text-xs">{courseBankDetails.branchName || 'Menikhinna'}</span>
                    </div>
                  </div>

                  {courseBankDetails.paymentInstructions && (
                    <div className="bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 p-2 rounded-lg text-amber-900 dark:text-amber-200 text-[10px]">
                      <strong>Instructions:</strong> {courseBankDetails.paymentInstructions}
                    </div>
                  )}

                  {slipError && (
                    <div className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs p-2 rounded-lg border border-red-200 dark:border-red-800 font-medium">
                      ⚠️ {slipError}
                    </div>
                  )}

                  {/* Upload Slip & Details Form */}
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-1">
                        Upload Deposit Slip Photo / PDF <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileUpload}
                        className="w-full bg-white dark:bg-slate-800 text-slate-800 dark:text-white p-1.5 border border-purple-200 dark:border-slate-700 rounded-lg text-xs outline-none cursor-pointer file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200"
                        required
                      />
                      {slipFile && (
                        <div className="mt-2 text-center bg-white dark:bg-slate-900 p-2 rounded-lg border border-purple-200 dark:border-slate-700">
                          {slipPreview ? (
                            <img src={slipPreview} alt="Deposit Slip Preview" className="max-h-24 mx-auto rounded border border-purple-300 object-contain" />
                          ) : (
                            <div className="py-2 text-purple-700 dark:text-purple-300 font-semibold text-xs flex items-center justify-center gap-1.5">
                              📄 <span>{slipFile.name} ({(slipFile.size / 1024).toFixed(0)} KB)</span>
                            </div>
                          )}
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">✓ File Attached: {slipFile.name}</span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-0.5">
                          Depositor Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Name on bank slip"
                          value={depositorName}
                          onChange={(e) => setDepositorName(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-0.5">
                          Deposit Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={depositDate}
                          onChange={(e) => setDepositDate(e.target.value)}
                          className="w-full p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-lg text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-extrabold uppercase tracking-wider text-purple-900 dark:text-purple-300 mb-0.5">
                        Bank Reference / Receipt No (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. REF98765432"
                        value={slipReference}
                        onChange={(e) => setSlipReference(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-white border border-purple-200 dark:border-slate-700 rounded-lg text-xs font-mono font-semibold outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Online Payment Gateway (Card Details) */}
          {step === 2 && (
            <form onSubmit={handleProceedToOTP} className="space-y-4" autoComplete="off">
              <div className="flex justify-between items-center bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 dark:from-slate-800 dark:via-purple-950/40 dark:to-slate-800 border border-indigo-100 dark:border-slate-700 p-3 rounded-xl shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-200">Payment Gateway</span>
                  <span className="text-[10px] bg-indigo-200/70 dark:bg-indigo-950/80 text-indigo-900 dark:text-indigo-300 px-2 py-0.5 rounded-full font-bold border border-indigo-300/40 dark:border-indigo-800">
                    Partner IPG
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {cardType === 'visa' ? (
                    <span className="inline-flex items-center gap-1.5 bg-blue-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs animate-fadeIn">
                      <span>VISA</span>
                      <span className="text-[10px] font-bold opacity-90">Debit/Credit</span>
                    </span>
                  ) : cardType === 'mastercard' ? (
                    <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs animate-fadeIn">
                      <span className="flex -space-x-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-300 inline-block"></span>
                      </span>
                      <span>Mastercard</span>
                    </span>
                  ) : cardType === 'amex' ? (
                    <span className="inline-flex items-center gap-1 bg-cyan-600 text-white font-black text-xs px-2.5 py-0.5 rounded-md shadow-xs animate-fadeIn">
                      <span>AMEX</span>
                    </span>
                  ) : (
                    <span className="font-bold text-xs text-gray-500 dark:text-gray-400">
                      Visa / Mastercard
                    </span>
                  )}
                </div>
              </div>

              {cardError && (
                <div className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs p-2.5 rounded-xl border border-red-200 dark:border-red-800 font-medium">
                  ⚠️ {cardError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  name="mock_c_holder"
                  autoComplete="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="e.g. A.B. PERERA"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-semibold text-xs uppercase placeholder:text-gray-400/30 dark:placeholder:text-slate-500/35 placeholder:font-normal"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Card Number (16 Digits)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    name="mock_c_num"
                    id="mock_c_num"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="4000 0000 0000 0000"
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    className="w-full pl-3 pr-24 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-mono font-bold text-xs placeholder:text-gray-400/30 dark:placeholder:text-slate-500/35 placeholder:font-normal tracking-wider"
                    maxLength={19}
                    required
                  />
                  <div className="absolute right-2.5 flex items-center pointer-events-none select-none">
                    {cardType === 'visa' && (
                      <span className="bg-blue-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-xs tracking-wider animate-fadeIn">
                        VISA
                      </span>
                    )}
                    {cardType === 'mastercard' && (
                      <span className="bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-xs flex items-center gap-1 animate-fadeIn">
                        <span className="w-2 h-2 rounded-full bg-red-400 inline-block -mr-1"></span>
                        <span className="w-2 h-2 rounded-full bg-amber-300 inline-block"></span>
                        <span>MC</span>
                      </span>
                    )}
                    {cardType === 'amex' && (
                      <span className="bg-cyan-600 text-white font-black text-[10px] px-2 py-0.5 rounded shadow-xs animate-fadeIn">
                        AMEX
                      </span>
                    )}
                    {cardType === 'none' && (
                      <span className="text-[10px] text-gray-400/60 dark:text-gray-500/60 font-bold tracking-wider">
                        VISA/MC
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Expiry (MM/YY)
                  </label>
                  <input
                    type="text"
                    name="mock_c_exp"
                    autoComplete="off"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="MM/YY"
                    value={expiry}
                    onChange={handleExpiryChange}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-mono font-bold text-xs placeholder:text-gray-400/30 dark:placeholder:text-slate-500/35 placeholder:font-normal"
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
                    name="mock_c_cvv"
                    autoComplete="new-password"
                    spellCheck="false"
                    data-lpignore="true"
                    data-form-type="other"
                    placeholder="123"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-mono font-bold text-xs placeholder:text-gray-400/30 dark:placeholder:text-slate-500/35 placeholder:font-normal"
                    maxLength={4}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>📱 SMS OTP Delivery Number</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold normal-case">Direct text.lk SMS gateway</span>
                </label>
                <input
                  type="tel"
                  name="mock_c_phone"
                  autoComplete="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                  placeholder="e.g. 0771234567"
                  value={smsPhone}
                  onChange={(e) => setSmsPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-gray-800 dark:text-white font-mono font-bold text-xs placeholder:text-gray-400/30 dark:placeholder:text-slate-500/35 placeholder:font-normal"
                  required
                />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 block">
                  A 6-digit 2FA security OTP will be dispatched via SMS to this mobile number for authorization.
                </span>
              </div>
            </form>
          )}

          {/* STEP 3: OTP Verification - Preserved */}
          {step === 3 && (
            <form onSubmit={handleCompletePayment} className="space-y-4 text-center">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 rounded-full flex items-center justify-center text-xl mx-auto font-bold shadow-inner">
                🔐
              </div>
              <div>
                <h4 className="text-base font-bold text-gray-800 dark:text-white">Two-Factor Payment Authentication</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                  Enter the 6-digit OTP code sent to your registered mobile number{' '}
                  <span className="font-bold text-gray-800 dark:text-white">{phoneMasked || student?.parentsPhoneNumber || 'your mobile'}</span>.
                </p>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl p-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-medium flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>SMS OTP dispatched to <strong>{phoneMasked || student?.parentsPhoneNumber || 'your mobile'}</strong></span>
              </div>

              {otpError && (
                <div className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-xs p-2.5 rounded-xl border border-red-200 dark:border-red-800 font-medium">
                  ⚠️ {otpError}
                </div>
              )}

              <div>
                <input
                  type="text"
                  placeholder="000000"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-44 mx-auto px-3 py-2 bg-gray-50 dark:bg-slate-800 border-2 border-purple-500 rounded-xl text-center text-xl font-mono font-bold tracking-[0.4em] focus:ring-2 focus:ring-purple-200 outline-none text-purple-950 dark:text-purple-300 shadow-inner placeholder:text-gray-400/30 dark:placeholder:text-slate-500/35 placeholder:font-normal"
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
                    {sendingOtp ? 'Sending code...' : 'Resend OTP 🔄'}
                  </button>
                ) : (
                  <span className="text-gray-400 dark:text-gray-500">
                    Resend code in <strong className="text-gray-700 dark:text-gray-300 font-mono">{resendTimer}s</strong>
                  </span>
                )}
              </div>
            </form>
          )}

        </div>

        {/* Modal Sticky Footer (Always visible at bottom) */}
        <div className="flex-shrink-0 bg-gray-900 dark:bg-slate-950 px-4 py-3 sm:px-5 sm:py-3.5 border-t border-gray-800 flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider">Total Course Fee</span>
            <span className="text-lg sm:text-xl font-extrabold text-amber-400">LKR {courseFee.toLocaleString()}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-gray-800 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition flex items-center gap-1 cursor-pointer border border-gray-700 hover:border-red-600"
            >
              <span className="text-xs font-black">✕</span> Cancel
            </button>

            {step === 1 && paymentMethodType === 'BANK_SLIP' && (
              <button
                type="button"
                onClick={handleBankSlipSubmit}
                disabled={submittingSlip}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer"
              >
                {submittingSlip ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Submitting Slip...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Bank Slip for Approval</span>
                    <span className="font-black">➔</span>
                  </>
                )}
              </button>
            )}

            {step === 1 && paymentMethodType === 'CARD' && (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer active:scale-95"
              >
                <span>Proceed to Card Payment</span>
                <span className="font-black">➔</span>
              </button>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border border-gray-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleProceedToOTP}
                  disabled={sendingOtp}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {sendingOtp ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending OTP...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay LKR {courseFee.toLocaleString()}</span>
                      <span className="font-black">➔</span>
                    </>
                  )}
                </button>
              </>
            )}

            {step === 3 && (
              <>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition cursor-pointer border border-gray-700"
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={handleCompletePayment}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition text-xs sm:text-sm flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify & Complete</span>
                      <span className="font-black">✓</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default CourseEnrollmentModal;
