const express = require('express');
const receiptController = require('../controllers/receiptController');
const { protect, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for admin receipt endpoints
const adminReceiptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs (higher for admins)
  message: {
    success: false,
    message: 'Too many receipt requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
router.use(adminReceiptRateLimit);

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

/**
 * @route   GET /api/admin/receipts
 * @desc    Get all receipts with pagination and filtering
 * @access  Private (Admin only)
 * @query   page?, limit?, clientId?, status?, startDate?, endDate?, sortBy?, sortOrder?
 */
router.get('/',
  receiptController.getAllReceipts
);

/**
 * @route   GET /api/admin/receipts/:requestId
 * @desc    Get receipt by request ID
 * @access  Private (Admin only)
 * @params  requestId
 */
router.get('/:requestId',
  receiptController.getReceiptByRequestId
);

module.exports = router;
