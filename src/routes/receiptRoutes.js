const express = require('express');
const receiptController = require('../controllers/receiptController');
const { protect, authorize } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiting for receipt endpoints
const receiptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many receipt requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to all routes
router.use(receiptRateLimit);

// Client receipt routes
/**
 * @route   GET /api/client/receipts
 * @desc    Get client receipts with pagination and filtering
 * @access  Private (Client only)
 * @query   page?, limit?, status?, startDate?, endDate?, sortBy?, sortOrder?
 */
router.get('/',
  protect,
  authorize('client'),
  receiptController.constructor.receiptQueryValidation(),
  receiptController.getClientReceipts
);

/**
 * @route   GET /api/client/receipts/statistics
 * @desc    Get client receipt statistics
 * @access  Private (Client only)
 */
router.get('/statistics',
  protect,
  authorize('client'),
  receiptController.getClientStatistics
);

/**
 * @route   GET /api/client/receipts/number/:receiptNumber
 * @desc    Get receipt by receipt number
 * @access  Private (Client only - own receipts)
 * @params  receiptNumber
 */
router.get('/number/:receiptNumber',
  protect,
  authorize('client'),
  receiptController.getReceiptByNumber
);

/**
 * @route   GET /api/client/receipts/:id
 * @desc    Get specific receipt details
 * @access  Private (Client only - own receipts)
 * @params  id
 */
router.get('/:id',
  protect,
  authorize('client'),
  receiptController.constructor.receiptIdValidation(),
  receiptController.getReceiptDetails
);

/**
 * @route   GET /api/client/receipts/:id/download
 * @desc    Download receipt as PDF
 * @access  Private (Client only - own receipts)
 * @params  id
 */
router.get('/:id/download',
  protect,
  authorize('client'),
  receiptController.constructor.receiptIdValidation(),
  receiptController.downloadReceipt
);

module.exports = router;
