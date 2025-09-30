const express = require('express');
const activityLogController = require('../controllers/activityLogController');
const auth = require('../middleware/auth');

const router = express.Router();

// Test endpoint to verify activity log routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Activity log routes are working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'GET /activity-logs - Get activity logs with filtering and pagination',
      'GET /activity-logs/:id - Get specific activity log details',
      'GET /activity-logs/export - Export activity logs as CSV',
      'GET /activity-logs/stats - Get activity statistics'
    ]
  });
});

/**
 * @route   GET /api/admin/activity-logs/comprehensive
 * @desc    Get comprehensive activity logs from audit_logs table
 * @access  Private (Admin/Employee only)
 * @query   { page?, limit?, dateFrom?, dateTo?, type?, userType?, documentType?, statusChange?, user?, ipAddress? }
 */
router.get('/comprehensive',
  auth.protect,
  auth.authorize('admin', 'employee'),
  activityLogController.getComprehensiveActivityLogs
);

/**
 * @route   GET /api/admin/activity-logs/comprehensive/stats
 * @desc    Get comprehensive activity statistics from audit_logs table
 * @access  Private (Admin/Employee only)
 * @query   { period? } - 'day', 'week', 'month'
 */
router.get('/comprehensive/stats',
  auth.protect,
  auth.authorize('admin', 'employee'),
  activityLogController.getComprehensiveActivityStats
);

/**
 * @route   GET /api/admin/activity-logs
 * @desc    Get activity logs with filtering and pagination (legacy - uses request_status_history)
 * @access  Private (Admin/Employee only)
 * @query   { page?, limit?, dateFrom?, dateTo?, type?, userType?, documentType?, statusChange?, user?, ipAddress? }
 */
router.get('/',
  auth.protect,
  auth.authorize('admin', 'employee'),
  activityLogController.getActivityLogs
);

/**
 * @route   GET /api/admin/activity-logs/export
 * @desc    Export activity logs as CSV
 * @access  Private (Admin only)
 * @query   { dateFrom?, dateTo?, type?, userType?, documentType?, statusChange?, user?, ipAddress? }
 */
router.get('/export',
  auth.protect,
  auth.authorize('admin'),
  activityLogController.exportActivityLogs
);

/**
 * @route   GET /api/admin/activity-logs/stats
 * @desc    Get activity statistics
 * @access  Private (Admin/Employee only)
 * @query   { period? } - 'day', 'week', 'month'
 */
router.get('/stats',
  auth.protect,
  auth.authorize('admin', 'employee'),
  activityLogController.getActivityStats
);

/**
 * @route   GET /api/admin/activity-logs/:id
 * @desc    Get specific activity log details
 * @access  Private (Admin/Employee only)
 * @params  id - Activity log ID
 */
router.get('/:id',
  auth.protect,
  auth.authorize('admin', 'employee'),
  activityLogController.getActivityLogDetails
);

module.exports = router;
