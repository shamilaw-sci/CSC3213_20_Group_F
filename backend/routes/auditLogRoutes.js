/**
 * @file auditLogRoutes.js
 * @description Audit Log Routes. Exposes protected administrative endpoints to query, filter, search, and paginate system audit log events.
 */

const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { protect, isAdmin } = require('../middleware/authMiddleware');

/**
 * @route   GET /api/audit-logs/stats
 * @desc    Get summary statistics and action breakdowns for Audit Dashboard
 * @access  Private (Admin only)
 */
router.get('/stats', protect, isAdmin, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalLogs, todayLogsCount, weekLogsCount, entityBreakdown, actionBreakdown] = await Promise.all([
      AuditLog.countDocuments(),
      AuditLog.countDocuments({ createdAt: { $gte: startOfToday } }),
      AuditLog.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
      AuditLog.aggregate([
        { $group: { _id: '$entity', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuditLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      success: true,
      data: {
        totalLogs,
        todayLogsCount,
        weekLogsCount,
        entityBreakdown,
        actionBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit stats.' });
  }
});

/**
 * @route   GET /api/audit-logs
 * @desc    Query and filter audit logs with pagination
 * @access  Private (Admin only)
 */
router.get('/', protect, isAdmin, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      entity,
      action,
      role,
      status,
      startDate,
      endDate
    } = req.query;

    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (parsedPage - 1) * parsedLimit;

    const query = {};

    // Filter by entity
    if (entity && entity !== 'ALL') {
      query.entity = entity;
    }

    // Filter by action
    if (action && action !== 'ALL') {
      query.action = action;
    }

    // Filter by actor role
    if (role && role !== 'ALL') {
      query['actor.role'] = role;
    }

    // Filter by status
    if (status && status !== 'ALL') {
      query.status = status;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        // Set to end of the day if date string only
        const end = new Date(endDate);
        if (!endDate.includes('T')) {
          end.setHours(23, 59, 59, 999);
        }
        query.createdAt.$lte = end;
      }
    }

    // Search keyword across summary, actor name, email, or entityId
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query.$or = [
        { summary: searchRegex },
        { 'actor.name': searchRegex },
        { 'actor.email': searchRegex },
        { entityId: searchRegex }
      ];
    }

    const [total, logs] = await Promise.all([
      AuditLog.countDocuments(query),
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .lean()
    ]);

    const totalPages = Math.ceil(total / parsedLimit);

    res.json({
      success: true,
      logs,
      pagination: {
        page: parsedPage,
        limit: parsedLimit,
        total,
        totalPages,
        hasNextPage: parsedPage < totalPages,
        hasPrevPage: parsedPage > 1
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
});

/**
 * @route   GET /api/audit-logs/:id
 * @desc    Get complete audit log details including diff
 * @access  Private (Admin only)
 */
router.get('/:id', protect, isAdmin, async (req, res) => {
  try {
    const log = await AuditLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log entry not found.' });
    }
    res.json({ success: true, log });
  } catch (error) {
    console.error('Error fetching audit log detail:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve audit log details.' });
  }
});

module.exports = router;
