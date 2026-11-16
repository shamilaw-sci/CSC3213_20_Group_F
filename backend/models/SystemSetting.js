/**
 * @file SystemSetting.js
 * @description System Setting Model Schema. Stores key-value application settings, institution metadata, and external gateway credentials (such as Text.lk SMS API keys and balances).
 */

const mongoose = require('mongoose');

const SystemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    default: 'sms_settings'
  },
  smsEnabled: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

module.exports = mongoose.model('SystemSetting', SystemSettingSchema);
