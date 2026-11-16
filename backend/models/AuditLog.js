/**
 * @file AuditLog.js
 * @description Audit Log Model Schema. Maintains an immutable log of critical system operations and administrative actions (logins, user creations, course modifications, settings updates) with IP address, user agent, and timestamp.
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  actor: {
    userId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: 'User',
      required: false // May be null if triggered by system / guest registration
    },
    name: { 
      type: String, 
      required: true,
      default: 'System'
    },
    email: { 
      type: String,
      default: ''
    },
    role: { 
      type: String, 
      required: true,
      default: 'system'
    }
  },
  action: {
    type: String,
    required: true,
    index: true
  },
  entity: {
    type: String,
    enum: [
      'User', 
      'Course', 
      'Payment', 
      'Attendance', 
      'Enrollment', 
      'SystemSetting', 
      'Lesson',
      'Quiz',
      'Assignment',
      'System'
    ],
    required: true,
    index: true
  },
  entityId: { 
    type: String,
    default: null,
    index: true
  },
  summary: { 
    type: String, 
    required: true 
  },
  diff: {
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null }
  },
  ipAddress: { 
    type: String, 
    default: '' 
  },
  userAgent: { 
    type: String, 
    default: '' 
  },
  status: { 
    type: String, 
    enum: ['SUCCESS', 'FAILURE'], 
    default: 'SUCCESS' 
  }
}, {
  timestamps: { createdAt: true, updatedAt: false } // Immutable - records are never modified
});

// Compound indexes for performant querying in Audit Log Viewer
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ entity: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ 'actor.userId': 1, createdAt: -1 });
auditLogSchema.index({ 'actor.role': 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
