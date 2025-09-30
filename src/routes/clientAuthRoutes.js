const express = require('express');
const rateLimit = require('express-rate-limit');
const clientAuthController = require('../controllers/clientAuthController');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiting for client authentication - DISABLED
// const authRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 auth requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many authentication attempts from this IP, please try again later.',
//     timestamp: new Date().toISOString()
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Registration rate limiting disabled for development
// const registrationRateLimit = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 100, // increased limit to 100 registration attempts per hour
//   message: {
//     success: false,
//     message: 'Too many registration attempts from this IP, please try again later.',
//     timestamp: new Date().toISOString()
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * @route   POST /api/client/auth/register-account
 * @desc    Register client account (Step 1)
 * @access  Public
 * @body    { username, password, confirmPassword, email? }
 */
router.post('/register-account',
  // registrationRateLimit, // Commented out for development
  clientAuthController.constructor.accountRegistrationValidation(),
  clientAuthController.registerAccount.bind(clientAuthController)
);

/**
 * @route   POST /api/client/auth/complete-registration/:accountId
 * @desc    Complete client registration with profile (Step 2)
 * @access  Public
 * @body    { first_name, last_name, birth_date, gender, civil_status_id, phone_number, email, barangay, city_municipality, province, ... }
 */
router.post('/complete-registration/:accountId',
  // registrationRateLimit, // Commented out for development
  clientAuthController.constructor.profileCompletionValidation(),
  clientAuthController.completeRegistration.bind(clientAuthController)
);

/**
 * @route   POST /api/client/auth/verify-email
 * @desc    Verify email with OTP
 * @access  Public
 * @body    { email, otp }
 */
router.post('/verify-email',
  // authRateLimit, // Rate limiting disabled
  clientAuthController.constructor.emailVerificationValidation(),
  clientAuthController.verifyEmail.bind(clientAuthController)
);

/**
 * @route   POST /api/client/auth/resend-verification
 * @desc    Resend email verification
 * @access  Public
 * @body    { email }
 */
router.post('/resend-verification',
  // authRateLimit, // Rate limiting disabled
  clientAuthController.resendVerificationEmail.bind(clientAuthController)
);

/**
 * @route   POST /api/client/auth/login
 * @desc    Client login
 * @access  Public
 * @body    { username, password }
 */
router.post('/login',
  // authRateLimit, // Rate limiting disabled
  clientAuthController.constructor.loginValidation(),
  clientAuthController.login.bind(clientAuthController)
);

/**
 * @route   GET /api/client/auth/profile
 * @desc    Get client profile
 * @access  Private (Client only)
 */
router.get('/profile',
  auth.protect,
  clientAuthController.getProfile.bind(clientAuthController)
);

module.exports = router;
