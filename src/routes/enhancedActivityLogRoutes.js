const express = require('express');
const enhancedActivityLogController = require('../controllers/enhancedActivityLogController');
const auth = require('../middleware/auth');
const { enhancedActivityLogger } = require('../middleware/enhancedActivityLogger');

const router = express.Router();

// Apply enhanced activity logging middleware to all routes
router.use(enhancedActivityLogger);

/**
 * @route   GET /api/admin/enhanced-activity-logs/test
 * @desc    Test endpoint to verify enhanced activity log routes are working
 * @access  Public (for testing)
 */
router.get('/test', enhancedActivityLogController.test);

/**
 * @route   GET /api/admin/enhanced-activity-logs
 * @desc    Get comprehensive activity logs with filtering and pagination
 * @access  Private (Admin/Employee only)
 * @query   { page?, limit?, dateFrom?, dateTo?, type?, userType?, documentType?, statusChange?, user?, ipAddress?, action? }
 */
router.get('/',
  auth.protect,
  auth.authorize('admin', 'employee'),
  enhancedActivityLogController.getActivityLogs
);

/**
 * @route   GET /api/admin/enhanced-activity-logs/export
 * @desc    Export activity logs as CSV
 * @access  Private (Admin only)
 * @query   { dateFrom?, dateTo?, type?, userType?, documentType?, statusChange?, user?, ipAddress? }
 */
router.get('/export',
  auth.protect,
  auth.authorize('admin'),
  enhancedActivityLogController.exportActivityLogs
);

/**
 * @route   GET /api/admin/enhanced-activity-logs/stats
 * @desc    Get activity statistics
 * @access  Private (Admin/Employee only)
 * @query   { period? } - 'day', 'week', 'month'
 */
router.get('/stats',
  auth.protect,
  auth.authorize('admin', 'employee'),
  enhancedActivityLogController.getActivityStats
);

/**
 * @route   GET /api/admin/enhanced-activity-logs/:id
 * @desc    Get specific activity log details
 * @access  Private (Admin/Employee only)
 * @params  id - Activity log ID
 */
router.get('/:id',
  auth.protect,
  auth.authorize('admin', 'employee'),
  enhancedActivityLogController.getActivityLogDetails
);

module.exports = router;
