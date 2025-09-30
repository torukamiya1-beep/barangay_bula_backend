const express = require('express');
const rateLimit = require('express-rate-limit');
const adminAuthController = require('../controllers/adminAuthController');
const AdminAuthController = adminAuthController.constructor;
const auth = require('../middleware/auth');

const router = express.Router();

// Test endpoint to verify admin routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin auth routes are working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /register-account',
      'POST /complete-registration/:accountId',
      'POST /verify-email',
      'POST /resend-verification',
      'POST /login',
      'POST /forgot-password',
      'POST /reset-password'
    ]
  });
});

// Rate limiting configurations - DISABLED for development
// const authRateLimit = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 5, // limit each IP to 5 requests per windowMs for auth endpoints
//   message: 'Too many authentication attempts, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const registrationRateLimit = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // limit each IP to 3 registration attempts per hour
//   message: 'Too many registration attempts, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

// const passwordResetRateLimit = rateLimit({
//   windowMs: 60 * 60 * 1000, // 1 hour
//   max: 3, // limit each IP to 3 password reset attempts per hour
//   message: 'Too many password reset attempts, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// });

/**
 * @route   POST /api/admin/auth/register-account
 * @desc    Register admin account (Step 1)
 * @access  Public
 * @body    { username, email, role, password, confirmPassword }
 */
router.post('/register-account',
  // registrationRateLimit, // Rate limiting disabled
  AdminAuthController.accountRegistrationValidation(),
  adminAuthController.registerAccount.bind(adminAuthController)
);

/**
 * @route   POST /api/admin/auth/complete-registration/:accountId
 * @desc    Complete admin registration with profile (Step 2)
 * @access  Public
 * @body    { first_name, middle_name?, last_name, suffix?, employee_id?, phone_number, position?, department?, hire_date? }
 */
router.post('/complete-registration/:accountId',
  AdminAuthController.profileRegistrationValidation(),
  adminAuthController.completeRegistration.bind(adminAuthController)
);

/**
 * @route   POST /api/admin/auth/verify-email
 * @desc    Verify admin email with OTP
 * @access  Public
 * @body    { email, otp }
 */
router.post('/verify-email',
  AdminAuthController.emailVerificationValidation(),
  adminAuthController.verifyEmail.bind(adminAuthController)
);

/**
 * @route   POST /api/admin/auth/resend-verification
 * @desc    Resend email verification OTP
 * @access  Public
 * @body    { email }
 */
router.post('/resend-verification',
  AdminAuthController.resendVerificationValidation(),
  adminAuthController.resendVerification.bind(adminAuthController)
);

/**
 * @route   POST /api/admin/auth/login
 * @desc    Admin login
 * @access  Public
 * @body    { username, password }
 */
router.post('/login',
  // authRateLimit, // Rate limiting disabled
  AdminAuthController.loginValidation(),
  adminAuthController.login.bind(adminAuthController)
);

/**
 * @route   POST /api/admin/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 * @body    { email }
 */
router.post('/forgot-password',
  // passwordResetRateLimit, // Rate limiting disabled
  AdminAuthController.forgotPasswordValidation(),
  adminAuthController.forgotPassword.bind(adminAuthController)
);

/**
 * @route   POST /api/admin/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 * @body    { token, newPassword }
 */
router.post('/reset-password',
  AdminAuthController.resetPasswordValidation(),
  adminAuthController.resetPassword.bind(adminAuthController)
);

// Protected routes (require authentication)
router.use(auth.protect);

/**
 * @route   GET /api/admin/auth/profile
 * @desc    Get admin profile
 * @access  Private (Admin/Employee only)
 */
router.get('/profile',
  auth.authorize('admin', 'employee'),
  adminAuthController.getProfile.bind(adminAuthController)
);

/**
 * @route   PUT /api/admin/auth/profile
 * @desc    Update admin profile
 * @access  Private (Admin/Employee only)
 * @body    { first_name?, middle_name?, last_name?, suffix?, phone_number?, position?, department?, profile_picture? }
 */
router.put('/profile',
  auth.authorize('admin', 'employee'),
  AdminAuthController.updateProfileValidation(),
  adminAuthController.updateProfile.bind(adminAuthController)
);

/**
 * @route   PUT /api/admin/auth/change-password
 * @desc    Change admin password
 * @access  Private (Admin/Employee only)
 * @body    { currentPassword, newPassword, confirmPassword }
 */
router.put('/change-password',
  auth.authorize('admin', 'employee'),
  AdminAuthController.changePasswordValidation(),
  adminAuthController.changePassword.bind(adminAuthController)
);

/**
 * @route   POST /api/admin/auth/logout
 * @desc    Admin logout
 * @access  Private (Admin/Employee only)
 */
router.post('/logout',
  auth.authorize('admin', 'employee'),
  adminAuthController.logout.bind(adminAuthController)
);

/**
 * @route   GET /api/admin/dashboard/stats
 * @desc    Get dashboard statistics
 * @access  Private (Admin/Employee only)
 */
router.get('/dashboard/stats',
  auth.authorize('admin', 'employee'),
  adminAuthController.getDashboardStats.bind(adminAuthController)
);

/**
 * @route   GET /api/admin/dashboard/activity
 * @desc    Get recent activity
 * @access  Private (Admin/Employee only)
 * @query   { limit? }
 */
router.get('/dashboard/activity',
  auth.authorize('admin', 'employee'),
  adminAuthController.getRecentActivity.bind(adminAuthController)
);

/**
 * @route   GET /api/admin/notifications
 * @desc    Get admin notifications
 * @access  Private (Admin/Employee only)
 * @query   { limit?, offset?, unread? }
 */
router.get('/notifications',
  auth.authorize('admin', 'employee'),
  adminAuthController.getNotifications.bind(adminAuthController)
);

/**
 * @route   PUT /api/admin/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Admin/Employee only)
 */
router.put('/notifications/:id/read',
  auth.authorize('admin', 'employee'),
  adminAuthController.markNotificationAsRead.bind(adminAuthController)
);

/**
 * @route   PUT /api/admin/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private (Admin/Employee only)
 */
router.put('/notifications/read-all',
  auth.authorize('admin', 'employee'),
  adminAuthController.markAllNotificationsAsRead.bind(adminAuthController)
);

module.exports = router;
