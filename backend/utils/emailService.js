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
 * @param {string} toEmail - The recipient's email address
 * @param {string} token - The reset token
 * @param {string} userName - The recipient's name
 * @returns {Promise<any>} - Nodemailer send result
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
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #3a1c8a, #5d31b4); padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px;">Password Reset Request</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">LuminaLearn Smart Learning Platform</p>
          </div>

          <!-- Body Content -->
          <div style="padding: 40px 35px; color: #333333;">
            <h2 style="margin-top: 0; font-size: 18px; font-weight: 600; color: #1e1e38;">Hi ${userName},</h2>
            <p style="font-size: 15px; line-height: 1.6; color: #555555;">
              We received a request to reset the password associated with your LuminaLearn account. 
              If you made this request, please click the button below to set up a new password:
            </p>

            <div style="text-align: center; margin: 35px 0;">
              <a href="${resetLink}" style="background-color: #5d31b4; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 15px; font-weight: 600; border-radius: 8px; box-shadow: 0 4px 10px rgba(93, 49, 180, 0.3); display: inline-block; transition: background-color 0.2s;">
                Reset Password
              </a>
            </div>

            <p style="font-size: 13px; line-height: 1.6; color: #777777; background-color: #fafafa; border-left: 4px solid #5d31b4; padding: 12px 16px; border-radius: 4px; margin-bottom: 25px;">
              <strong>Note:</strong> This link is valid for <strong>1 hour</strong>. If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.
            </p>

            <hr style="border: 0; border-top: 1px dashed #e5e7eb; margin: 30px 0;" />

            <p style="font-size: 12px; line-height: 1.5; color: #888888; margin-bottom: 0;">
              If you're having trouble clicking the button, copy and paste the URL below into your web browser:
              <br />
              <a href="${resetLink}" style="color: #5d31b4; word-break: break-all;">${resetLink}</a>
            </p>
          </div>

          <!-- Footer -->
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
    console.error('Failed to send password reset email:', error);
    throw error;
  }
};

module.exports = {
  transporter,
  sendResetPasswordEmail,
};
