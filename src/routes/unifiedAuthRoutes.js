const express = require('express');
const unifiedAuthController = require('../controllers/unifiedAuthController');

const router = express.Router();

// Test endpoint to verify unified auth routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Unified auth routes are working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /login - Unified login for both admin and client accounts'
    ]
  });
});

/**
 * @route   POST /api/auth/unified/login
 * @desc    Unified login for both admin and client accounts
 * @access  Public
 * @body    { username, password }
 */
router.post('/login',
  unifiedAuthController.constructor.unifiedLoginValidation(),
  unifiedAuthController.unifiedLogin.bind(unifiedAuthController)
);

module.exports = router;
