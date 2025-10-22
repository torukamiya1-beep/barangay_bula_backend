const express = require('express');
const router = express.Router();
const authorizedPickupController = require('../controllers/authorizedPickupController');
const { protect, authorize } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/authorized-pickup/rejected/list
 * @desc    Get rejected pickup persons for current client
 * @access  Private (Client only)
 */
router.get('/rejected/list',
  protect,
  authorize('client'),
  asyncHandler(authorizedPickupController.getRejectedPickupPersons)
);

/**
 * @route   PATCH /api/authorized-pickup/:pickupId/verify
 * @desc    Update pickup person verification status (approve/reject)
 * @access  Private (Admin/Employee only)
 * @params  pickupId
 * @body    { verification_status: 'verified' | 'rejected' }
 */
router.patch('/:pickupId/verify',
  protect,
  authorize('admin', 'employee'),
  asyncHandler(authorizedPickupController.verifyPickupPerson)
);

module.exports = router;
