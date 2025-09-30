const express = require('express');
const rateLimit = require('express-rate-limit');
const adminDocumentController = require('../controllers/adminDocumentController');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiting for admin operations (TEMPORARILY DISABLED FOR TESTING)
const adminRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased limit for testing
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});

// Apply rate limiting to all admin routes (TEMPORARILY DISABLED)
// router.use(adminRateLimit);

// Apply authentication middleware to all routes
router.use(auth.protect);

// Apply admin/employee authorization to all routes
router.use(auth.authorize('admin', 'employee'));

/**
 * @route   GET /api/admin/documents/test
 * @desc    Test endpoint to verify admin document routes are working
 * @access  Private (Admin/Employee only)
 */
router.get('/test', (req, res) => {
  // Test the status transition logic
  const adminDocumentService = require('../services/adminDocumentService');

  let transitionTest = 'UNKNOWN';
  try {
    adminDocumentService.validateStatusTransition(1, 4);
    transitionTest = 'ALLOWED (1→4)';
  } catch (error) {
    transitionTest = `BLOCKED: ${error.message}`;
  }

  res.json({
    success: true,
    message: 'Admin document routes are working!',
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role
    },
    timestamp: new Date().toISOString(),
    statusTransitionTest: transitionTest,
    serverReloadTime: new Date().toISOString(),
    endpoints: [
      'GET /requests - Get all document requests with filtering',
      'GET /requests/:id - Get specific request details',
      'PUT /requests/:id/status - Update request status',
      'GET /requests/:id/history - Get request status history',
      'GET /dashboard/stats - Get dashboard statistics',
      'GET /dashboard/recent - Get recent activity',
      'POST /requests/:id/approve - Approve request',
      'POST /requests/:id/reject - Reject request',
      'POST /requests/:id/process - Mark as processing',
      'POST /requests/:id/complete - Mark as completed',
      'GET /requests/export - Export requests data'
      // Removed: POST /requests/:id/require-info - additional_info_required status no longer used
    ]
  });
});

/**
 * @route   GET /api/admin/documents/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin/Employee only)
 */
router.get('/dashboard/stats', adminDocumentController.getDashboardStats);

/**
 * @route   GET /api/admin/documents/dashboard/recent
 * @desc    Get recent activity for dashboard
 * @access  Private (Admin/Employee only)
 */
router.get('/dashboard/recent', adminDocumentController.getRecentActivity);

/**
 * @route   GET /api/admin/documents/requests
 * @desc    Get all document requests with filtering and pagination
 * @access  Private (Admin/Employee only)
 * @query   { page?, limit?, status?, document_type?, priority?, search?, date_from?, date_to? }
 */
router.get('/requests', adminDocumentController.getAllRequests);

/**
 * @route   GET /api/admin/documents/requests/export
 * @desc    Export requests data as CSV
 * @access  Private (Admin/Employee only)
 * @query   { status?, document_type?, date_from?, date_to? }
 */
router.get('/requests/export',
  auth.protect,
  auth.authorize('admin', 'employee'),
  adminDocumentController.exportRequests
);

/**
 * @route   GET /api/admin/documents/requests/:id
 * @desc    Get specific document request details
 * @access  Private (Admin/Employee only)
 */
router.get('/requests/:id', adminDocumentController.getRequestDetails);

/**
 * @route   GET /api/admin/documents/requests/:id/history
 * @desc    Get request status history
 * @access  Private (Admin/Employee only)
 */
router.get('/requests/:id/history', adminDocumentController.getRequestHistory);

/**
 * @route   PUT /api/admin/documents/requests/:id/status
 * @desc    Update request status with reason
 * @access  Private (Admin/Employee only)
 * @body    { status_id, reason? }
 */
router.put('/requests/:id/status',
  adminDocumentController.constructor.updateStatusValidation(),
  adminDocumentController.updateRequestStatus
);

/**
 * @route   POST /api/admin/documents/requests/:id/approve
 * @desc    Approve document request
 * @access  Private (Admin/Employee only)
 * @body    { reason? }
 */
router.post('/requests/:id/approve', adminDocumentController.approveRequest);

/**
 * @route   POST /api/admin/documents/requests/:id/reject
 * @desc    Reject document request
 * @access  Private (Admin/Employee only)
 * @body    { reason }
 */
router.post('/requests/:id/reject',
  adminDocumentController.constructor.rejectRequestValidation(),
  adminDocumentController.rejectRequest
);

/**
 * @route   POST /api/admin/documents/requests/:id/process
 * @desc    Mark request as processing
 * @access  Private (Admin/Employee only)
 * @body    { reason? }
 */
router.post('/requests/:id/process', adminDocumentController.processRequest);

/**
 * @route   POST /api/admin/documents/requests/:id/complete
 * @desc    Mark request as completed
 * @access  Private (Admin/Employee only)
 * @body    { reason? }
 */
router.post('/requests/:id/complete', adminDocumentController.completeRequest);

/**
 * @route   POST /api/admin/documents/requests/:id/ready-pickup
 * @desc    Mark request as ready for pickup
 * @access  Private (Admin/Employee only)
 * @body    { reason? }
 */
router.post('/requests/:id/ready-pickup', adminDocumentController.markReadyForPickup);

// Removed require-info route - additional_info_required status is no longer used

/**
 * @route   POST /api/admin/documents/requests/:id/verify-payment
 * @desc    Verify in-person payment
 * @access  Private (Admin/Employee only)
 * @body    { amount_received, payment_method_id, receipt_number?, notes?, proof_image_path? }
 */
router.post('/requests/:id/verify-payment',
  adminDocumentController.constructor.verifyPaymentValidation(),
  adminDocumentController.verifyInPersonPayment
);

/**
 * @route   POST /api/admin/documents/requests/:id/schedule-pickup
 * @desc    Schedule pickup appointment
 * @access  Private (Admin/Employee only)
 * @body    { scheduled_date, scheduled_time_start, scheduled_time_end, pickup_notes? }
 */
router.post('/requests/:id/schedule-pickup',
  adminDocumentController.constructor.schedulePickupValidation(),
  adminDocumentController.schedulePickup
);

/**
 * @route   POST /api/admin/documents/requests/:id/confirm-pickup
 * @desc    Confirm document pickup
 * @access  Private (Admin/Employee only)
 * @body    { picked_up_by_name, picked_up_by_id_type?, picked_up_by_id_number? }
 */
router.post('/requests/:id/confirm-pickup',
  adminDocumentController.constructor.confirmPickupValidation(),
  adminDocumentController.confirmPickup
);

/**
 * @route   GET /api/admin/documents/payment-verification-queue
 * @desc    Get requests pending in-person payment verification
 * @access  Private (Admin/Employee only)
 */
router.get('/payment-verification-queue', adminDocumentController.getPaymentVerificationQueue);

/**
 * @route   GET /api/admin/documents/status-options
 * @desc    Get all available status options
 * @access  Private (Admin/Employee only)
 */
router.get('/status-options', adminDocumentController.getStatusOptions);

/**
 * @route   GET /api/admin/documents/document-types
 * @desc    Get all available document types
 * @access  Private (Admin/Employee only)
 */
router.get('/document-types', adminDocumentController.getDocumentTypes);

/**
 * @route   POST /api/admin/documents/requests/bulk-update
 * @desc    Bulk update multiple requests
 * @access  Private (Admin only)
 * @body    { request_ids: [], status_id, reason? }
 */
router.post('/requests/bulk-update',
  auth.authorize('admin'), // Only admins can do bulk operations
  adminDocumentController.constructor.bulkUpdateValidation(),
  adminDocumentController.bulkUpdateRequests
);

/**
 * @route   GET /api/admin/documents/analytics
 * @desc    Get analytics data for reporting
 * @access  Private (Admin/Employee)
 * @query   { period: 'day'|'week'|'month' }
 */
router.get('/analytics', adminDocumentController.getAnalyticsData);

/**
 * @route   GET /api/admin/documents/reports/:reportType
 * @desc    Generate comprehensive report
 * @access  Private (Admin/Employee)
 * @params  { reportType: 'daily'|'weekly'|'monthly'|'custom' }
 * @query   { date_from?, date_to?, format: 'csv'|'json' }
 */
router.get('/reports/:reportType', adminDocumentController.generateReport);

module.exports = router;
