const express = require('express');
const rateLimit = require('express-rate-limit');
const otpController = require('../controllers/otpController');
const auth = require('../middleware/auth');

const router = express.Router();

// Rate limiting for OTP endpoints - DISABLED
// const otpRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 OTP requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many OTP requests from this IP, please try again later.',
//     timestamp: new Date().toISOString()
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const verifyRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 10, // limit each IP to 10 verification attempts per windowMs
//   message: {
//     success: false,
//     message: 'Too many verification attempts from this IP, please try again later.',
//     timestamp: new Date().toISOString()
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// Admin rate limiting (more lenient) - DISABLED
// const adminRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 50, // limit each IP to 50 admin requests per windowMs
//   message: {
//     success: false,
//     message: 'Too many admin requests from this IP, please try again later.',
//     timestamp: new Date().toISOString()
//   },
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * @route   POST /api/otp/send
 * @desc    Send OTP to email
 * @access  Public
 * @body    { email, purpose?, firstName? }
 */
router.post('/send',
  // otpRateLimit, // Rate limiting disabled
  otpController.constructor.sendOTPValidation(),
  otpController.sendOTP.bind(otpController)
);

/**
 * @route   POST /api/otp/verify
 * @desc    Verify OTP
 * @access  Public
 * @body    { email, otp, purpose? }
 */
router.post('/verify',
  // verifyRateLimit, // Rate limiting disabled
  otpController.constructor.verifyOTPValidation(),
  otpController.verifyOTP.bind(otpController)
);

/**
 * @route   POST /api/otp/resend
 * @desc    Resend OTP
 * @access  Public
 * @body    { email, purpose?, firstName? }
 */
router.post('/resend',
  // otpRateLimit, // Rate limiting disabled
  otpController.constructor.sendOTPValidation(),
  otpController.resendOTP.bind(otpController)
);

/**
 * @route   POST /api/otp/send-sms
 * @desc    Send SMS OTP to phone number
 * @access  Public
 * @body    { phoneNumber, purpose?, firstName? }
 */
router.post('/send-sms',
  // otpRateLimit, // Rate limiting disabled
  otpController.constructor.sendSMSOTPValidation(),
  otpController.sendSMSOTP.bind(otpController)
);

/**
 * @route   POST /api/otp/verify-sms
 * @desc    Verify SMS OTP
 * @access  Public
 * @body    { phoneNumber, otp, purpose? }
 */
router.post('/verify-sms',
  // verifyRateLimit, // Rate limiting disabled
  otpController.constructor.verifySMSOTPValidation(),
  otpController.verifySMSOTP.bind(otpController)
);

/**
 * @route   POST /api/otp/resend-sms
 * @desc    Resend SMS OTP
 * @access  Public
 * @body    { phoneNumber, purpose?, firstName? }
 */
router.post('/resend-sms',
  // otpRateLimit, // Rate limiting disabled
  otpController.constructor.sendSMSOTPValidation(),
  otpController.resendSMSOTP.bind(otpController)
);

/**
 * @route   POST /api/otp/send-unified
 * @desc    Send unified OTP (same code via both email and SMS)
 * @access  Public
 * @body    { email, phoneNumber?, purpose?, firstName? }
 */
router.post('/send-unified',
  // otpRateLimit, // Rate limiting disabled
  otpController.constructor.sendUnifiedOTPValidation(),
  otpController.sendUnifiedOTP.bind(otpController)
);

/**
 * @route   POST /api/otp/resend-unified
 * @desc    Resend unified OTP (same code via both email and SMS)
 * @access  Public
 * @body    { email, phoneNumber?, purpose?, firstName? }
 */
router.post('/resend-unified',
  // otpRateLimit, // Rate limiting disabled
  otpController.constructor.sendUnifiedOTPValidation(),
  otpController.resendUnifiedOTP.bind(otpController)
);

/**
 * @route   GET /api/otp/stats
 * @desc    Get OTP statistics
 * @access  Private (Admin only)
 */
router.get('/stats',
  // adminRateLimit, // Rate limiting disabled
  auth.protect,
  auth.authorize('admin'),
  otpController.getOTPStats.bind(otpController)
);

/**
 * @route   DELETE /api/otp/cleanup
 * @desc    Cleanup expired OTPs
 * @access  Private (Admin only)
 */
router.delete('/cleanup',
  // adminRateLimit, // Rate limiting disabled
  auth.protect,
  auth.authorize('admin'),
  otpController.cleanupExpiredOTPs.bind(otpController)
);

/**
 * @route   POST /api/otp/test-email
 * @desc    Test email configuration
 * @access  Private (Admin only)
 * @body    { testEmail }
 */
router.post('/test-email',
  // adminRateLimit, // Rate limiting disabled
  auth.protect,
  auth.authorize('admin'),
  otpController.testEmailConfig.bind(otpController)
);

module.exports = router;
