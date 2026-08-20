/**
 * SMS Service - Text.lk Gateway Integration
 * Supports automated phone normalization for Sri Lanka numbers,
 * text.lk REST API v3 dispatch, and development simulation fallback.
 */

/**
 * Extracts clean 9-digit Sri Lankan subscriber number
 * Handles: '0771234567', '+94771234567', '94771234567', '771234567', '077-123 4567'
 * Returns: '771234567' (or '' if invalid)
 */
const normalizeSriLankaPhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');

  if (cleaned.startsWith('94')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Valid Sri Lankan phone subscriber numbers are 9 digits (e.g., 7XXXXXXXX, 11XXXXXXX)
  if (cleaned.length !== 9) {
    return '';
  }

  return cleaned;
};

/**
 * Format phone number specifically for text.lk Gateway ('947XXXXXXXX' - 11 digits, no '+')
 */
const formatTextLkPhone = (phone) => {
  const normalized = normalizeSriLankaPhone(phone);
  if (!normalized) return '';
  return `94${normalized}`;
};

/**
 * Format Sri Lanka Phone Numbers to International +94 Standard ('+947XXXXXXXX')
 */
const formatSriLankaPhone = (phone) => {
  const normalized = normalizeSriLankaPhone(phone);
  if (!normalized) return '';
  return `+94${normalized}`;
};

/**
 * Mask Phone Number for Privacy Display (e.g., '0719673030' -> '+94 71 *** *030')
 */
const maskPhoneNumber = (phone) => {
  const textLkPhone = formatTextLkPhone(phone);
  if (!textLkPhone || textLkPhone.length < 11) {
    return phone ? String(phone) : '';
  }
  const prefix = textLkPhone.slice(2, 4); // e.g. '71'
  const suffix = textLkPhone.slice(-3);   // e.g. '030'
  return `+94 ${prefix} *** *${suffix}`;
};

const SystemSetting = require('../models/SystemSetting');

/**
 * Check if SMS notification service is globally enabled in Admin Settings
 */
const isSmsServiceEnabled = async () => {
  try {
    const setting = await SystemSetting.findOne({ key: 'sms_settings' });
    if (!setting) return true; // Default to true if not yet explicitly saved
    return setting.smsEnabled !== false;
  } catch (err) {
    console.warn('⚠️ Could not check SMS system setting, defaulting to enabled:', err.message);
    return true;
  }
};

/**
 * Fetch live SMS units balance from text.lk Gateway
 */
const getTextLkBalance = async () => {
  const rawToken = process.env.TEXTLK_API_TOKEN;
  if (!rawToken || !rawToken.trim()) {
    return { success: false, error: 'TEXTLK_API_TOKEN is not configured in .env' };
  }
  const cleanToken = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '');

  // Try 1: v3 REST API Balance Endpoint
  try {
    const res = await fetch('https://app.text.lk/api/v3/balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    const data = await res.json();
    if (res.ok && (data.status === 'success' || data.success)) {
      return { success: true, mode: 'v3', data: data.data || data };
    }
  } catch (err) {
    console.warn('Text.lk v3 balance check network error, falling back to HTTP endpoint:', err.message);
  }

  // Try 2: HTTP API Balance Endpoint Fallback
  try {
    const res = await fetch('https://app.text.lk/api/http/balance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ api_token: cleanToken })
    });
    const data = await res.json();
    if (res.ok && (data.status === 'success' || data.success)) {
      return { success: true, mode: 'http', data: data.data || data };
    }
    return { success: false, error: data.message || 'Failed to fetch balance from Text.lk' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Fetch account profile status from text.lk Gateway
 */
const getTextLkProfile = async () => {
  const rawToken = process.env.TEXTLK_API_TOKEN;
  if (!rawToken || !rawToken.trim()) {
    return { success: false, error: 'TEXTLK_API_TOKEN is not configured in .env' };
  }
  const cleanToken = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '');

  // Try 1: v3 REST API Profile Endpoint
  try {
    const res = await fetch('https://app.text.lk/api/v3/me', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cleanToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    const data = await res.json();
    if (res.ok && (data.status === 'success' || data.success)) {
      return { success: true, mode: 'v3', data: data.data || data };
    }
  } catch (err) {
    console.warn('Text.lk v3 profile check error, falling back to HTTP endpoint:', err.message);
  }

  // Try 2: HTTP API Profile Endpoint Fallback
  try {
    const res = await fetch('https://app.text.lk/api/http/me', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ api_token: cleanToken })
    });
    const data = await res.json();
    if (res.ok && (data.status === 'success' || data.success)) {
      return { success: true, mode: 'http', data: data.data || data };
    }
    return { success: false, error: data.message || 'Failed to fetch profile from Text.lk' };
  } catch (err) {
    return { success: false, error: err.message };
  }
};

/**
 * Send SMS via text.lk Gateway (v3 REST API) or Development Simulator
 */
const sendSMS = async ({ phone, message, otpCode, studentName = 'Student', bypassMasterSwitch = false }) => {
  // Check Master SMS Switch (unless explicitly bypassed for test dispatches)
  if (!bypassMasterSwitch) {
    const isEnabled = await isSmsServiceEnabled();
    if (!isEnabled) {
      console.log(`⚠️ [SMS DISABLED IN SETTINGS]: Skipped SMS to ${phone} ("${message.slice(0, 40)}...")`);
      return { 
        success: false, 
        reason: 'SMS notification service is currently turned OFF by the administrator.', 
        disabled: true 
      };
    }
  }

  const recipientPhone = formatTextLkPhone(phone);

  if (!recipientPhone) {
    console.warn('⚠️ [SMS CANCELLED]: Invalid or missing phone number:', phone);
    return { success: false, reason: 'Invalid phone number' };
  }

  // 1. Text.lk SMS Gateway Integration (Supports v3 REST API & HTTP API fallback)
  const rawToken = process.env.TEXTLK_API_TOKEN;
  if (rawToken && rawToken.trim()) {
    const cleanToken = rawToken.trim().replace(/^Bearer\s+/i, '').replace(/^["']|["']$/g, '');
    const senderId = (process.env.TEXTLK_SENDER_ID || 'TextLKDemo').trim().replace(/^["']|["']$/g, '');

    // Payload formatted as per text.lk documentation
    const payload = {
      api_token: cleanToken,
      recipient: recipientPhone,
      sender_id: senderId,
      type: 'plain',
      message: message
    };

    // Try 1: Text.lk v3 REST API
    try {
      const v3Response = await fetch('https://app.text.lk/api/v3/sms/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await v3Response.json();

      if (v3Response.ok && (data.status === 'success' || data.status === 'queued' || data.success)) {
        console.log(`✅ [TEXT.LK SMS SENT (v3)] To: ${recipientPhone} (${studentName}) | Sender: ${senderId}`, data);
        return { success: true, mode: 'text.lk-v3', data };
      }

      // If v3 returns 401 or error, attempt fallback to HTTP API endpoint
      console.warn(`⚠️ [TEXT.LK v3 API ${v3Response.status}]: ${data.message || 'Retrying via HTTP API...'}`);
    } catch (v3Err) {
      console.warn(`⚠️ [TEXT.LK v3 Network Error]: ${v3Err.message}. Retrying via HTTP API...`);
    }

    // Try 2: Text.lk HTTP API Endpoint Fallback
    try {
      const httpResponse = await fetch('https://app.text.lk/api/http/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const httpData = await httpResponse.json();

      if (httpResponse.ok && (httpData.status === 'success' || httpData.status === 'queued' || httpData.success)) {
        console.log(`✅ [TEXT.LK SMS SENT (HTTP)] To: ${recipientPhone} (${studentName}) | Sender: ${senderId}`, httpData);
        return { success: true, mode: 'text.lk-http', data: httpData };
      } else {
        console.error(`❌ [TEXT.LK SMS ERROR] Status ${httpResponse.status}:`, httpData);
        return { success: false, mode: 'text.lk', error: httpData.message || httpData };
      }
    } catch (httpErr) {
      console.error('❌ [TEXT.LK SMS NETWORK ERROR]:', httpErr.message);
      return { success: false, mode: 'text.lk', error: httpErr.message };
    }
  }

  // 2. Fallback: Development & Demo Simulator Console Output (when TEXTLK_API_TOKEN is not configured)
  console.log('\n====================================================');
  console.log('📱 [SMS SIMULATOR] Text.lk Dispatch Simulation');
  console.log(`Recipient: ${studentName} (${recipientPhone} / ${formatSriLankaPhone(phone)})`);
  console.log(`Sender ID: ${process.env.TEXTLK_SENDER_ID || 'TextLKDemo (Default)'}`);
  console.log(`Message  : "${message}"`);
  if (otpCode) console.log(`OTP Code : [ ${otpCode} ]`);
  console.log('💡 Tip: Set TEXTLK_API_TOKEN in backend .env to send real SMS via text.lk');
  console.log('====================================================\n');

  return { success: true, mode: 'simulator', recipient: recipientPhone };
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
  
  // Normalize and deduplicate recipient phone numbers
  const validPhones = [...new Set(
    phoneNumbers
      .map(p => formatTextLkPhone(p))
      .filter(p => Boolean(p))
  )];

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
 * Send Verification OTP SMS
 */
const sendVerificationOTP = async ({ phone, otpCode, purpose = 'Verification', studentName = 'Student' }) => {
  const recipientPhone = formatTextLkPhone(phone);
  const message = `[LuminaLearn] Your ${purpose} OTP code is: ${otpCode}. Valid for 10 minutes. Do not share this code with anyone.`;
  
  return await sendSMS({ phone: recipientPhone, message, otpCode, studentName });
};

/**
 * Send Account Credentials SMS to newly registered user (Admin manual creation)
 */
const sendCredentialSMS = async ({ phone, name, loginIdentifier, password, role = 'student', portalUrl = 'www.luminalearn.edu.lk' }) => {
  const roleDisplay = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
  const message = `LuminaLearn: Welcome ${name}! Your ${roleDisplay} account has been created at ${portalUrl}. Login ID: ${loginIdentifier}, Default Password: ${password}. Please log in and change your password.`;
  
  return await sendSMS({ phone, message, studentName: name });
};

/**
 * Send Parent Account Credentials SMS (Auto-generated or Admin-created parent account)
 */
const sendParentCredentialSMS = async ({ parentPhone, studentName, defaultPassword = 'Parent@123', portalUrl = 'www.luminalearn.edu.lk' }) => {
  const message = `LuminaLearn: Your parent account for student ${studentName} has been created at ${portalUrl}. Username/Phone: ${parentPhone}, Default Password: ${defaultPassword}. Please log in and change your password.`;
  
  return await sendSMS({ phone: parentPhone, message, studentName: `Parent of ${studentName}` });
};

module.exports = {
  normalizeSriLankaPhone,
  formatTextLkPhone,
  formatSriLankaPhone,
  maskPhoneNumber,
  isSmsServiceEnabled,
  getTextLkBalance,
  getTextLkProfile,
  sendSMS,
  sendAttendanceSMS,
  sendPaymentSMS,
  sendBulkSMS,
  sendVerificationOTP,
  sendCredentialSMS,
  sendParentCredentialSMS
};

