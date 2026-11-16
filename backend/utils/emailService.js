/**
 * @file emailService.js
 * @description Email Notification Service. Transacts transactional emails (password resets, account verification, welcome emails, notifications) using Brevo (Sendinblue) API with SMTP fallback.
 */

const SibApiV3Sdk = require('sib-api-v3-sdk');

/**
 * Resolve Brevo configuration values with sensible fallbacks
 */
const getApiKey = () => process.env.BREVO_API_KEY || process.env.SIB_API_KEY || process.env.API_V3_KEY;
const getDefaultFromEmail = () => process.env.BREVO_FROM_EMAIL || process.env.FROM_EMAIL || process.env.SMTP_EMAIL || 'mail@luminalearn.edu.lk';
const getDefaultFromName = () => process.env.BREVO_FROM_NAME || process.env.FROM_NAME || 'LuminaLearn';

/**
 * Initializes and returns a Brevo TransactionalEmailsApi instance
 */
const getBrevoApiInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  const defaultClient = SibApiV3Sdk.ApiClient.instance;
  const auth = defaultClient.authentications['api-key'];
  auth.apiKey = apiKey;

  return new SibApiV3Sdk.TransactionalEmailsApi();
};

/**
 * Central helper to send transactional emails via Brevo SDK
 */
const sendBrevoEmail = async ({
  to,
  bcc,
  subject,
  htmlContent,
  textContent,
  senderName,
  senderEmail
}) => {
  const apiKey = getApiKey();
  const fromEmail = senderEmail || getDefaultFromEmail();
  const fromName = senderName || getDefaultFromName();

  if (!apiKey) {
    console.warn('⚠️ Brevo API Key missing in environment (BREVO_API_KEY). Skipping email dispatch.');
    return null;
  }

  const apiInstance = getBrevoApiInstance();
  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

  sendSmtpEmail.sender = {
    email: fromEmail,
    name: fromName
  };
  sendSmtpEmail.subject = subject;
  sendSmtpEmail.htmlContent = htmlContent;

  if (textContent) {
    sendSmtpEmail.textContent = textContent;
  }

  // Format recipient(s)
  if (to) {
    if (Array.isArray(to)) {
      sendSmtpEmail.to = to.map(item => (typeof item === 'string' ? { email: item } : item));
    } else if (typeof to === 'string') {
      sendSmtpEmail.to = [{ email: to }];
    } else {
      sendSmtpEmail.to = [to];
    }
  }

  // Format BCC recipient(s) if provided
  if (bcc && Array.isArray(bcc) && bcc.length > 0) {
    sendSmtpEmail.bcc = bcc.map(item => (typeof item === 'string' ? { email: item } : item));
  }

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    const messageId = data?.messageId || (data?.body && data.body.messageId) || JSON.stringify(data);
    console.log(`✅ [Brevo] Email sent successfully ("${subject}"). Message ID: ${messageId}`);
    return data;
  } catch (error) {
    const errorMsg = error?.response?.body?.message || error?.message || error;
    console.error(`❌ [Brevo] Failed to send email ("${subject}"):`, errorMsg);
    return null;
  }
};

/**
 * Sends a password reset email to the specified user email.
 */
const sendResetPasswordEmail = async (toEmail, token, userName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'https://luminalearn.edu.lk';
  const resetLink = `${frontendUrl}/reset-password/${token}`;

  return await sendBrevoEmail({
    to: [{ email: toEmail, name: userName || 'Student' }],
    senderName: 'LuminaLearn Support',
    subject: 'LuminaLearn - Reset Your Password',
    htmlContent: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; text-align: left;">
          <div style="background: linear-gradient(135deg, #3a1c8a, #5d31b4); padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Password Reset Request</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">LuminaLearn Smart Learning Platform</p>
          </div>
          <div style="padding: 40px 35px; color: #333333;">
            <h2 style="margin-top: 0; font-size: 18px; font-weight: 600; color: #1e1e38;">Hi ${userName || 'User'},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #555555;">
              We received a request to reset the password associated with your LuminaLearn account. 
              If you made this request, please click the button below to set up a new password:
            </p>
            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetLink}" style="background-color: #5d31b4; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 10px rgba(93, 49, 180, 0.3); display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="font-size: 13px; line-height: 1.6; color: #777777; background-color: #fafafa; border-left: 4px solid #5d31b4; padding: 12px 16px; border-radius: 4px;">
              <strong>Note:</strong> This link is valid for <strong>1 hour</strong>.
            </p>
          </div>
          <div style="background-color: #fafafa; padding: 20px 35px; text-align: center; border-top: 1px solid #f0f0f0;">
            <p style="margin: 0; font-size: 12px; color: #999999;">
              © ${new Date().getFullYear()} LuminaLearn Smart Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

/**
 * Sends detailed Payment Receipt HTML Email
 */
const sendPaymentReceiptEmail = async (toEmail, userName, { transactionId, courseTitle, amount, date, paymentMethod = 'Card' }) => {
  const formattedDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString();

  return await sendBrevoEmail({
    to: [{ email: toEmail, name: userName || 'Student' }],
    senderName: 'LuminaLearn Finance',
    subject: `LuminaLearn - Official Payment Receipt (${transactionId})`,
    htmlContent: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">

          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 25px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Payment Successful 🎉</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Official Receipt & Enrollment Confirmation</p>
          </div>

          <div style="padding: 30px; color: #334155;">
            <p style="font-size: 15px; margin-top: 0;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.5;">
              Thank you for your payment! Your enrollment in <strong>${courseTitle}</strong> has been successfully processed. Here is your transaction receipt:
            </p>

            <div style="background-color: #f1f5f9; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Transaction ID:</td>
                  <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${transactionId}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Course:</td>
                  <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${courseTitle}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Date & Time:</td>
                  <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${formattedDate}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b;">Payment Method:</td>
                  <td style="padding: 6px 0; font-weight: 600; text-align: right; color: #0f172a;">${paymentMethod}</td>
                </tr>
                <tr style="border-top: 1px solid #cbd5e1;">
                  <td style="padding: 12px 0 6px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Amount Paid:</td>
                  <td style="padding: 12px 0 6px 0; font-size: 18px; font-weight: 700; text-align: right; color: #4f46e5;">LKR ${amount}</td>
                </tr>
              </table>
            </div>

            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
              You can now access all learning materials and schedules directly from your dashboard.
            </p>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              © ${new Date().getFullYear()} LuminaLearn Smart Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

/**
 * Sends Course/Lesson Content Update Email to Enrolled Student
 */
const sendCourseUpdateEmail = async (toEmail, userName, courseTitle, updateTitle, updateDetails) => {
  return await sendBrevoEmail({
    to: [{ email: toEmail, name: userName || 'Student' }],
    senderName: 'LuminaLearn Academics',
    subject: `LuminaLearn Update: New Content in ${courseTitle}`,
    htmlContent: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #0284c7, #2563eb); padding: 25px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700;">New Content Added 📚</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${courseTitle}</p>
          </div>

          <div style="padding: 25px; color: #334155;">
            <p style="font-size: 15px;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              New learning material or announcements have been added to your course <strong>${courseTitle}</strong>:
            </p>

            <div style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; border-radius: 4px; margin: 15px 0;">
              <h3 style="margin: 0 0 5px 0; font-size: 15px; color: #1e3a8a;">${updateTitle}</h3>
              <p style="margin: 0; font-size: 13px; color: #3b82f6;">${updateDetails || 'Log in to view the latest uploaded files and notes.'}</p>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              © ${new Date().getFullYear()} LuminaLearn Smart Learning Platform.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

/**
 * Sends Student Registration Welcome Email
 */
const sendRegistrationWelcomeEmail = async (toEmail, userName, registrationNumber) => {
  return await sendBrevoEmail({
    to: [{ email: toEmail, name: userName || 'Student' }],
    senderName: 'LuminaLearn Welcome',
    subject: `Welcome to LuminaLearn, ${userName}!`,
    htmlContent: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 25px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">Welcome to LuminaLearn! 🎓</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">Smart Learning Platform</p>
          </div>

          <div style="padding: 25px; color: #334155;">
            <p style="font-size: 15px;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Your student account has been successfully created. We are excited to support your learning journey!
            </p>

            ${registrationNumber ? `
              <div style="background-color: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <p style="margin: 0; font-size: 14px; color: #065f46;"><strong>Your Registration Index:</strong> ${registrationNumber}</p>
              </div>
            ` : ''}

            <p style="font-size: 13px; color: #64748b;">
              You can now log in, view scheduled classes, and enroll in your favorite courses.
            </p>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              © ${new Date().getFullYear()} LuminaLearn Smart Learning Platform.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

/**
 * Sends Class Announcement Email in batches
 */
const sendClassAnnouncementEmail = async (recipients = [], subject, messageText, classTitle = '') => {
  const validRecipients = [...new Set(recipients.filter(e => Boolean(e && String(e).trim())))];
  if (validRecipients.length === 0) return [];

  const batchSize = 40;
  const results = [];

  for (let i = 0; i < validRecipients.length; i += batchSize) {
    const chunk = validRecipients.slice(i, i + batchSize);
    const bccList = chunk.map(email => ({ email }));

    const res = await sendBrevoEmail({
      to: [{ email: getDefaultFromEmail(), name: 'LuminaLearn Students' }],
      bcc: bccList,
      senderName: 'LuminaLearn Announcements',
      subject: subject || `Important Announcement: ${classTitle}`,
      htmlContent: `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
          <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
            <div style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 25px; color: #ffffff; text-align: center;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700;">Class Notice 📢</h1>
              <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">${classTitle || 'LuminaLearn Announcement'}</p>
            </div>

            <div style="padding: 25px; color: #334155;">
              <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 15px; border-radius: 4px; margin: 15px 0;">
                <p style="margin: 0; font-size: 14px; color: #9f1239; line-height: 1.6;">${messageText}</p>
              </div>
              <p style="font-size: 13px; color: #64748b;">
                Please check your student portal for any updated timetable or schedule adjustments.
              </p>
            </div>

            <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} LuminaLearn Smart Learning Platform.
              </p>
            </div>
          </div>
        </div>
      `
    });

    if (res) results.push(res);
  }

  return results;
};

/**
 * Sends Direct Message Email Notification to Recipient
 * Note: Per security & requirements, message content is NOT included in the email.
 */
const sendMessageNotificationEmail = async (toEmail, recipientName, senderName) => {
  return await sendBrevoEmail({
    to: [{ email: toEmail, name: recipientName || 'User' }],
    senderName: 'LuminaLearn Messages',
    subject: `New Message from ${senderName} on LuminaLearn`,
    htmlContent: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 25px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 20px; font-weight: 700;">You Received a New Message 📩</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">LuminaLearn Direct Messaging</p>
          </div>

          <div style="padding: 25px; color: #334155;">
            <p style="font-size: 15px;">Hi <strong>${recipientName}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              You have received a new direct message from <strong>${senderName}</strong> on the LuminaLearn platform.
            </p>

            <div style="background-color: #f1f5f9; border-left: 4px solid #6366f1; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 500;">
                🔒 <em>Message content is protected for privacy. Please log into your account to read and reply to this message.</em>
              </p>
            </div>

            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://luminalearn.edu.lk'}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 26px; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block;">
                Open LuminaLearn Portal
              </a>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              © ${new Date().getFullYear()} LuminaLearn Smart Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

/**
 * Sends a 6-digit verification passcode email (for registration, email linking, or password reset)
 */
const sendPasscodeEmail = async (toEmail, passcode, userName = 'Student', purpose = 'Account Verification') => {
  if (!toEmail) return;
  const apiKey = getApiKey();

  if (!apiKey) {
    console.log(`⚠️ [EMAIL MOCK] Verification passcode for ${toEmail}: [ ${passcode} ] (${purpose})`);
    return null;
  }

  return await sendBrevoEmail({
    to: [{ email: toEmail, name: userName }],
    senderName: 'LuminaLearn Security',
    subject: `LuminaLearn - Your Verification Code is ${passcode}`,
    htmlContent: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; padding: 30px 15px;">
        <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #3a1c8a, #5d31b4); padding: 25px; color: #ffffff; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 700;">${purpose}</h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.9;">LuminaLearn Security Verification</p>
          </div>

          <div style="padding: 30px; color: #334155;">
            <p style="font-size: 15px;">Hi <strong>${userName}</strong>,</p>
            <p style="font-size: 14px; color: #64748b; line-height: 1.6;">
              Please use the verification code below to complete your <strong>${purpose}</strong> request on LuminaLearn.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <div style="display: inline-block; background: #f3f0ff; border: 2px dashed #7c3aed; border-radius: 12px; padding: 15px 35px; letter-spacing: 8px; font-size: 32px; font-weight: 800; color: #4c1d95; font-family: monospace;">
                ${passcode}
              </div>
            </div>

            <div style="background-color: #faf5ff; border-left: 4px solid #7c3aed; padding: 12px 16px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #581c87; font-weight: 500;">
                ⏱️ This code is valid for <strong>10 minutes</strong>. Never share your passcode with anyone.
              </p>
            </div>
          </div>

          <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #f1f5f9;">
            <p style="margin: 0; font-size: 12px; color: #94a3b8;">
              © ${new Date().getFullYear()} LuminaLearn Smart Learning Platform. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    `
  });
};

module.exports = {
  sendBrevoEmail,
  sendResetPasswordEmail,
  sendPaymentReceiptEmail,
  sendCourseUpdateEmail,
  sendRegistrationWelcomeEmail,
  sendClassAnnouncementEmail,
  sendMessageNotificationEmail,
  sendPasscodeEmail
};
