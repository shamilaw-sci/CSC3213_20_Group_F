/**
 * Format Sri Lanka Phone Numbers to International +94 Standard
 * Examples: '0719673030' -> '+94719673030', '719673030' -> '+94719673030'
 */
const formatSriLankaPhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('94')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  // Sri Lankan mobile/landline numbers typically have 9 digits after 0/+94 (e.g. 71XXXXXXX)
  if (cleaned.length < 8 || cleaned.length > 10) {
    return '';
  }
  return `+94${cleaned}`;
};

/**
 * Mask Phone Number for Privacy (e.g., '+94719673030' -> '+94 71 *** *030')
 */
const maskPhoneNumber = (phone) => {
  const formatted = formatSriLankaPhone(phone);
  if (formatted.length < 10) return formatted;
  const prefix = formatted.slice(0, 6); // e.g., '+9471'
  const suffix = formatted.slice(-3);   // e.g., '030'
  return `${prefix.slice(0, 3)} ${prefix.slice(3)} *** *${suffix}`;
};

/**
 * Send SMS via Gateway (Notify.lk / Twilio) or Console Simulator
 */
const sendSMS = async ({ phone, message, otpCode, studentName = 'Student' }) => {
  const formattedPhone = formatSriLankaPhone(phone);

  if (!formattedPhone) {
    console.warn('⚠️ [SMS CANCELLED]: Invalid or missing phone number:', phone);
    return { success: false, reason: 'Invalid phone number' };
  }

  // 1. Notify.lk Sri Lanka Gateway Integration (Using native fetch)
  if (process.env.NOTIFY_USER_ID && process.env.NOTIFY_API_KEY) {
    try {
      const response = await fetch('https://app.notify.lk/api/v1/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: process.env.NOTIFY_USER_ID,
          api_key: process.env.NOTIFY_API_KEY,
          sender_id: process.env.NOTIFY_SENDER_ID || 'NotifyDEMO',
          to: formattedPhone,
          message: message
        })
      });
      const data = await response.json();
      console.log(`✅ [NOTIFY.LK SMS SENT] To: ${formattedPhone}`, data);
      return { success: true, mode: 'notify.lk' };
    } catch (err) {
      console.error('❌ [NOTIFY.LK SMS ERROR]:', err.message);
    }
  }

  // 2. Twilio Gateway Integration
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
      });
      console.log(`✅ [TWILIO SMS SENT] To: ${formattedPhone}`);
      return { success: true, mode: 'twilio' };
    } catch (err) {
      console.error('❌ [TWILIO SMS ERROR]:', err.message);
    }
  }

  // 3. Fallback: Development & Demo Simulator Console Output
  console.log('\n====================================================');
  console.log('📱 [SMS SIMULATOR] Dispatching Short Message');
  console.log(`Recipient: ${studentName} (${formattedPhone})`);
  console.log(`Message  : "${message}"`);
  if (otpCode) console.log(`OTP Code : [ ${otpCode} ]`);
  console.log('====================================================\n');

  return { success: true, mode: 'simulator' };
};

/**
 * Send Attendance Notification SMS to Parent
 */
const sendAttendanceSMS = async ({ parentPhone, studentName, className, date, time, status = 'Present' }) => {
  const formattedDate = date ? new Date(date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const formattedTime = time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const message = `LuminaLearn Alert: Student ${studentName} has been marked '${status}' for class '${className}' on ${formattedDate} at ${formattedTime}.`;
  return await sendSMS({ phone: parentPhone, message, studentName });
};

/**
 * Send Payment Notification SMS to Parent
 */
const sendPaymentSMS = async ({ parentPhone, studentName, courseTitle, amount, date, transactionId }) => {
  const formattedDate = date ? new Date(date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
  const formattedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const message = `LuminaLearn Payment: Student ${studentName} has paid LKR ${amount} for '${courseTitle}' on ${formattedDate} at ${formattedTime}. Ref: ${transactionId}. Thank you!`;
  return await sendSMS({ phone: parentPhone, message, studentName });
};

/**
 * Send Bulk Notification / Class Postponement SMS to multiple recipients in concurrent batches
 */
const sendBulkSMS = async ({ phoneNumbers = [], message, classTitle = '' }) => {
  const fullMessage = classTitle ? `[LuminaLearn - ${classTitle}] ${message}` : `[LuminaLearn Notice] ${message}`;
  const validPhones = [...new Set(phoneNumbers.filter(p => Boolean(p && String(p).trim())))];
  const results = [];
  const chunkSize = 10;

  for (let i = 0; i < validPhones.length; i += chunkSize) {
    const chunk = validPhones.slice(i, i + chunkSize);
    const chunkPromises = chunk.map(phone => sendSMS({ phone, message: fullMessage, studentName: 'Recipient' }));
    const chunkResults = await Promise.allSettled(chunkPromises);
    results.push(...chunkResults.map(r => r.status === 'fulfilled' ? r.value : { success: false, error: r.reason?.message }));
  }

  return results;
};

/**
 * Send Verification OTP SMS (Mocked with clear console logging in development)
 */
const sendVerificationOTP = async ({ phone, otpCode, purpose = 'Verification', studentName = 'Student' }) => {
  const formattedPhone = formatSriLankaPhone(phone);
  const message = `[LuminaLearn] Your ${purpose} OTP code is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;
  
  console.log('\n====================================================');
  console.log(`📱 [SMS OTP MOCK] Dispatched to Phone: ${formattedPhone} (${studentName})`);
  console.log(`🔑 Passcode / OTP : [ ${otpCode} ]`);
  console.log(`📌 Purpose        : ${purpose}`);
  console.log(`💬 Full Message   : "${message}"`);
  console.log('====================================================\n');

  return await sendSMS({ phone, message, otpCode, studentName });
};

module.exports = {
  formatSriLankaPhone,
  maskPhoneNumber,
  sendSMS,
  sendAttendanceSMS,
  sendPaymentSMS,
  sendBulkSMS,
  sendVerificationOTP
};

