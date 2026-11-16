/**
 * @file settingRoutes.js
 * @description System Settings Routes. Allows administrators to configure institute profile info, announcements, and Text.lk SMS gateway credentials and balance checks.
 */

const express = require('express');
const router = express.Router();
const SystemSetting = require('../models/SystemSetting');
const { protect } = require('../middleware/authMiddleware');
const {
  getTextLkBalance,
  getTextLkProfile,
  sendSMS,
  formatTextLkPhone,
  formatSriLankaPhone,
  maskPhoneNumber,
  isSmsServiceEnabled
} = require('../services/smsService');

// Middleware to ensure Admin role
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Access denied. Administrators only.' });
};

// ==========================================
// 1. GET SMS SETTINGS & TEXT.LK STATUS
// ==========================================
router.get('/sms', protect, adminOnly, async (req, res) => {
  try {
    let setting = await SystemSetting.findOne({ key: 'sms_settings' }).populate('updatedBy', 'name email');
    if (!setting) {
      setting = await SystemSetting.create({
        key: 'sms_settings',
        smsEnabled: true
      });
    }

    const isConfigured = Boolean(process.env.TEXTLK_API_TOKEN && process.env.TEXTLK_API_TOKEN.trim());
    const senderId = process.env.TEXTLK_SENDER_ID || 'Kirula Edu';

    // Fetch live Text.lk balance & profile if token is configured
    let balanceInfo = null;
    let profileInfo = null;

    if (isConfigured) {
      try {
        const [balanceRes, profileRes] = await Promise.allSettled([
          getTextLkBalance(),
          getTextLkProfile()
        ]);

        if (balanceRes.status === 'fulfilled' && balanceRes.value.success) {
          balanceInfo = balanceRes.value.data;
        }
        if (profileRes.status === 'fulfilled' && profileRes.value.success) {
          profileInfo = profileRes.value.data;
        }
      } catch (fetchErr) {
        console.warn('Could not fetch Text.lk account details:', fetchErr.message);
      }
    }

    res.json({
      success: true,
      smsEnabled: setting.smsEnabled !== false,
      isConfigured,
      senderId,
      gateway: isConfigured ? 'text.lk' : 'simulator',
      lastUpdated: setting.updatedAt,
      updatedBy: setting.updatedBy ? { name: setting.updatedBy.name, email: setting.updatedBy.email } : null,
      balance: balanceInfo,
      profile: profileInfo,
      dashboardUrl: 'https://app.text.lk/dashboard'
    });
  } catch (err) {
    console.error('Fetch SMS settings error:', err);
    res.status(500).json({ error: 'Failed to retrieve SMS settings: ' + err.message });
  }
});

// ==========================================
// 2. UPDATE SMS TOGGLE (ON / OFF)
// ==========================================
router.put('/sms', protect, adminOnly, async (req, res) => {
  try {
    const { smsEnabled } = req.body;

    if (typeof smsEnabled !== 'boolean') {
      return res.status(400).json({ error: 'smsEnabled must be a boolean value.' });
    }

    let setting = await SystemSetting.findOne({ key: 'sms_settings' });
    if (!setting) {
      setting = new SystemSetting({ key: 'sms_settings' });
    }

    setting.smsEnabled = smsEnabled;
    setting.updatedBy = req.user._id;
    await setting.save();

    res.json({
      success: true,
      message: `SMS notification service successfully turned ${smsEnabled ? 'ON' : 'OFF'}.`,
      smsEnabled: setting.smsEnabled
    });
  } catch (err) {
    console.error('Update SMS settings error:', err);
    res.status(500).json({ error: 'Failed to update SMS settings: ' + err.message });
  }
});

// ==========================================
// 3. SEND TEST SMS (ADMIN TESTING TOOL)
// ==========================================
router.post('/sms/test', protect, adminOnly, async (req, res) => {
  try {
    const { phone, message } = req.body;

    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and test message are required.' });
    }

    const testMessage = `[LuminaLearn Test] ${message.trim()}`;
    const result = await sendSMS({
      phone,
      message: testMessage,
      studentName: 'Admin Test Recipient',
      bypassMasterSwitch: true // Allow admin test even if master switch is off
    });

    if (result.success) {
      res.json({
        success: true,
        message: `Test SMS dispatched successfully to ${formatSriLankaPhone(phone)}.`,
        mode: result.mode,
        details: result.data || null
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error || result.reason || 'Failed to dispatch test SMS via gateway.'
      });
    }
  } catch (err) {
    console.error('Test SMS error:', err);
    res.status(500).json({ error: 'Failed to send test SMS: ' + err.message });
  }
});

// ==========================================
// 4. GET SMS SERVICE STATUS (TEACHERS & BROADCAST)
// ==========================================
router.get('/sms-status', protect, async (req, res) => {
  try {
    const isEnabled = await isSmsServiceEnabled();
    res.json({
      success: true,
      smsEnabled: isEnabled
    });
  } catch (err) {
    console.error('SMS status check error:', err);
    res.status(500).json({ error: 'Failed to check SMS status.' });
  }
});

module.exports = router;
