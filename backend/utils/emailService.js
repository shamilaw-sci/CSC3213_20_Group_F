const nodemailer = require('nodemailer');

// Create reusable transporter object using Gmail SMTP service
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Sends a password reset email to the specified user email.
 */
const sendResetPasswordEmail = async (toEmail, token, userName) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetLink = `${frontendUrl}/reset-password/${token}`;

  const mailOptions = {
    from: `"LuminaLearn Support" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: 'LuminaLearn - Reset Your Password',
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 40px 20px; text-align: center;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); overflow: hidden; text-align: left;">
          <div style="background: linear-gradient(135deg, #3a1c8a, #5d31b4); padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Password Reset Request</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">LuminaLearn Smart Learning Platform</p>
          </div>
          <div style="padding: 40px 35px; color: #333333;">
            <h2 style="margin-top: 0; font-size: 18px; font-weight: 600; color: #1e1e38;">Hi ${userName},</h2>
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
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
  }
};

/**
 * Sends detailed Payment Receipt HTML Email
 */
const sendPaymentReceiptEmail = async (toEmail, userName, { transactionId, courseTitle, amount, date, paymentMethod = 'Card' }) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
    console.warn('⚠️ SMTP Credentials missing in .env. Skipping email dispatch.');
    return;
  }

  const formattedDate = date ? new Date(date).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString();

  const mailOptions = {
    from: `"LuminaLearn Finance" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: `LuminaLearn - Official Payment Receipt (${transactionId})`,
    html: `
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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Payment receipt email sent to ${toEmail}. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send payment receipt email:', error.message);
  }
};

/**
 * Sends Course/Lesson Content Update Email to Enrolled Student
 */
const sendCourseUpdateEmail = async (toEmail, userName, courseTitle, updateTitle, updateDetails) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return;

  const mailOptions = {
    from: `"LuminaLearn Academics" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: `LuminaLearn Update: New Content in ${courseTitle}`,
    html: `
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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Course update email sent to ${toEmail}. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send course update email:', error.message);
  }
};

/**
 * Sends Student Registration Welcome Email
 */
const sendRegistrationWelcomeEmail = async (toEmail, userName, registrationNumber) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return;

  const mailOptions = {
    from: `"LuminaLearn Welcome" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: `Welcome to LuminaLearn, ${userName}!`,
    html: `
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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${toEmail}. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error.message);
  }
};

/**
 * Sends Class Announcement / Postponement Email
 */
const sendClassAnnouncementEmail = async (recipients = [], subject, messageText, classTitle = '') => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD || recipients.length === 0) return;

  const mailOptions = {
    from: `"LuminaLearn Announcements" <${process.env.SMTP_EMAIL}>`,
    bcc: recipients, // send using bcc for privacy across recipients
    subject: subject || `Important Announcement: ${classTitle}`,
    html: `
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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Class announcement email sent to ${recipients.length} recipients. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send announcement email:', error.message);
  }
};

/**
 * Sends Direct Message Email Notification to Recipient
 * Note: Per security & requirements, message content is NOT included in the email.
 */
const sendMessageNotificationEmail = async (toEmail, recipientName, senderName) => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) return;

  const mailOptions = {
    from: `"LuminaLearn Messages" <${process.env.SMTP_EMAIL}>`,
    to: toEmail,
    subject: `New Message from ${senderName} on LuminaLearn`,
    html: `
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
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 26px; font-size: 14px; font-weight: 600; border-radius: 8px; display: inline-block;">
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
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Message notification email sent to ${toEmail}. ID: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error('❌ Failed to send message notification email:', error.message);
  }
};

module.exports = {
  transporter,
  sendResetPasswordEmail,
  sendPaymentReceiptEmail,
  sendCourseUpdateEmail,
  sendRegistrationWelcomeEmail,
  sendClassAnnouncementEmail,
  sendMessageNotificationEmail
};

