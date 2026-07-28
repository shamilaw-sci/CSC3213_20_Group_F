/**
 * Format Sri Lanka Phone Numbers to International +94 Standard
 * Examples: '0719673030' -> '+94719673030', '719673030' -> '+94719673030'
 */
const formatSriLankaPhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('94')) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
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
  console.log('📱 [SMS SIMULATOR] Real OTP Code Dispatch');
  console.log(`Recipient: ${studentName} (${formattedPhone})`);
  console.log(`Message  : "${message}"`);
  console.log(`OTP Code : [ ${otpCode} ] (Valid for 5 Minutes)`);
  console.log('====================================================\n');

  return { success: true, mode: 'simulator' };
};

module.exports = {
  formatSriLankaPhone,
  maskPhoneNumber,
  sendSMS
};
