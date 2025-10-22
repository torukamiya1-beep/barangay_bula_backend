/**
 * Document Fee Routes
 * API endpoints for managing document fees
 */

const express = require('express');
const router = express.Router();
const documentFeeController = require('../controllers/documentFeeController');
const { protect, authorize } = require('../middleware/auth');

// Public routes (for fetching current fees)
router.get('/', documentFeeController.getAllDocumentFees);
router.get('/statistics', documentFeeController.getFeeStatistics);
router.get('/:documentTypeId/current', documentFeeController.getCurrentFee);
router.get('/:documentTypeId/history', documentFeeController.getFeeHistory);

// Protected routes (for updating fees - admin only)
router.put('/:documentTypeId', protect, authorize('admin', 'employee'), documentFeeController.updateDocumentFee);

module.exports = router;
