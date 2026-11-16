/**
 * @file auditLogger.js
 * @description Audit Logging Service. Sanitizes sensitive payload fields (passwords, tokens, OTPs) and writes structured, immutable audit log records to MongoDB for administrative and security tracking.
 */

const AuditLog = require('../models/AuditLog');

/**
 * Strips out sensitive fields such as passwords, tokens, secrets before logging diffs.
 */
function sanitizePayload(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Clone object
  const clean = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitiveKeys = ['password', 'token', 'refreshToken', 'activeSessionId', 'otp', 'verificationCode'];

  for (const key of Object.keys(clean)) {
    if (sensitiveKeys.includes(key)) {
      clean[key] = '[REDACTED]';
    } else if (clean[key] && typeof clean[key] === 'object') {
      clean[key] = sanitizePayload(clean[key]);
    }
  }
  return clean;
}

/**
 * Extracts the client's IP address cleanly from request headers or socket.
 */
function getClientIp(req) {
  if (!req) return '';
  const forwarded = req.headers ? req.headers['x-forwarded-for'] : null;
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '';
}

/**
 * Main non-blocking audit logging method.
 *
 * @param {Object} params
 * @param {Object} [params.req] - Express request object (used to extract actor, IP, User-Agent)
 * @param {Object} [params.actor] - Optional custom actor override { userId, name, email, role }
 * @param {String} params.action - Action identifier, e.g. 'USER_CREATE', 'PAYMENT_APPROVE'
 * @param {String} params.entity - Entity name: 'User', 'Payment', 'Course', 'Attendance', etc.
 * @param {String|Number} [params.entityId] - The ID of the affected document
 * @param {String} params.summary - Human-readable summary of the action
 * @param {Object} [params.diff] - { before, after } state changes
 * @param {String} [params.status='SUCCESS'] - 'SUCCESS' | 'FAILURE'
 */
async function logAudit({
  req,
  actor,
  action,
  entity,
  entityId,
  summary,
  diff = null,
  status = 'SUCCESS'
}) {
  try {
    // Determine actor details
    let resolvedActor = {
      userId: null,
      name: 'System',
      email: '',
      role: 'system'
    };

    if (actor) {
      resolvedActor = {
        userId: actor.userId || actor._id || null,
        name: actor.name || 'System',
        email: actor.email || '',
        role: actor.role || 'system'
      };
    } else if (req && req.user) {
      resolvedActor = {
        userId: req.user._id || req.user.id || null,
        name: req.user.name || 'Unknown User',
        email: req.user.email || '',
        role: req.user.role || 'user'
      };
    }

    // Clean diff if provided
    let cleanDiff = null;
    if (diff) {
      cleanDiff = {
        before: diff.before ? sanitizePayload(diff.before) : null,
        after: diff.after ? sanitizePayload(diff.after) : null
      };
    }

    const ipAddress = getClientIp(req);
    const userAgent = req?.headers ? (req.headers['user-agent'] || '') : '';

    await AuditLog.create({
      actor: resolvedActor,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      summary,
      diff: cleanDiff,
      ipAddress,
      userAgent,
      status
    });
  } catch (error) {
    // Non-blocking catch to ensure core transactions are NEVER interrupted by logging
    console.error('AuditLogger error (non-fatal):', error.message);
  }
}

module.exports = {
  logAudit,
  sanitizePayload
};
