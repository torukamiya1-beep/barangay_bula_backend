const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');
const ApiResponse = require('../utils/response');

const router = express.Router();

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponse.badRequest(res, 'Validation failed', errors.array());
  }
  next();
};

// Validation rules
const validatePaymentInitiation = [
  body('request_id')
    .isInt({ min: 1 })
    .withMessage('Valid request ID is required'),
  body('payment_method_id')
    .isInt({ min: 1 })
    .withMessage('Valid payment method ID is required'),
  body('return_url')
    .optional()
    .isURL()
    .withMessage('Return URL must be a valid URL'),
  body('customer_email')
    .optional()
    .isEmail()
    .withMessage('Customer email must be valid')
];

const validateTransactionId = [
  param('transactionId')
    .notEmpty()
    .withMessage('Transaction ID is required')
    .matches(/^TXN_\d+_[a-zA-Z0-9]{8}$/)
    .withMessage('Invalid transaction ID format')
];

/**
 * @route   POST /api/payments/initiate
 * @desc    Initiate payment process
 * @access  Private
 * @body    { request_id, payment_method_id, return_url?, customer_email? }
 */
router.post('/initiate',
  protect,
  validatePaymentInitiation,
  handleValidationErrors,
  (req, res) => paymentController.initiatePayment(req, res)
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle PayMongo webhooks
 * @access  Public (verified by signature)
 * @body    PayMongo webhook payload
 */
router.post('/webhook',
  // No auth middleware - webhooks come from PayMongo
  // Signature verification is done in the controller
  (req, res) => paymentController.handleWebhook(req, res)
);

/**
 * @route   GET /api/payments/status/:transactionId
 * @desc    Get payment status
 * @access  Private
 * @params  transactionId - Transaction ID
 */
router.get('/status/:transactionId',
  protect,
  validateTransactionId,
  handleValidationErrors,
  (req, res) => paymentController.getPaymentStatus(req, res)
);

/**
 * @route   GET /api/payments/config
 * @desc    Get PayMongo configuration for frontend
 * @access  Private
 */
router.get('/config',
  protect,
  (req, res) => paymentController.getPaymentConfig(req, res)
);

/**
 * @route   GET /api/payments/fetch-all
 * @desc    Fetch all payments from PayMongo (Admin only)
 * @access  Private (Admin)
 */
router.get('/fetch-all',
  protect,
  // adminOnly, // Uncomment when adminOnly middleware is available
  (req, res) => paymentController.fetchAllPayments(req, res)
);

/**
 * @route   GET /api/payments/details/:paymentId
 * @desc    Fetch specific payment details from PayMongo (Admin only)
 * @access  Private (Admin)
 */
router.get('/details/:paymentId',
  protect,
  // adminOnly, // Uncomment when adminOnly middleware is available
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  handleValidationErrors,
  (req, res) => paymentController.fetchPaymentDetails(req, res)
);

/**
 * @route   POST /api/payments/sync
 * @desc    Sync payments from PayMongo to local database (Admin only)
 * @access  Private (Admin)
 */
router.post('/sync',
  protect,
  // adminOnly, // Uncomment when adminOnly middleware is available
  body('hoursBack').optional().isInt({ min: 1, max: 168 }).withMessage('Hours back must be between 1 and 168'),
  handleValidationErrors,
  (req, res) => paymentController.syncPayments(req, res)
);

/**
 * @route   GET /api/payments/request/:requestId/status
 * @desc    Get payment status for a specific request
 * @access  Private
 */
router.get('/request/:requestId/status',
  protect,
  param('requestId').isInt({ min: 1 }).withMessage('Valid request ID is required'),
  handleValidationErrors,
  (req, res) => paymentController.getRequestPaymentStatus(req, res)
);

/**
 * @route   GET /payment/intent
 * @desc    Handle payment intent redirect (should redirect to PayMongo)
 * @access  Public
 * @deprecated This route should not be used - payments should go directly to PayMongo
 */
router.get('/intent', (req, res) => {
  // This route should not be used - log the attempt and redirect to error page
  console.error('❌ Deprecated /payment/intent route accessed:', {
    query: req.query,
    headers: req.headers,
    ip: req.ip
  });

  return res.status(400).json({
    success: false,
    error: 'This payment method is no longer supported. Please use the Pay Now button to proceed with PayMongo checkout.',
    message: 'Payment should be processed through PayMongo Links API'
  });
});

module.exports = router;
