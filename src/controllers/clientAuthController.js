const clientAuthService = require('../services/clientAuthService');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');
const {
  ACTIVITY_TYPES,
  logSuccessfulLogin,
  logFailedLogin,
  logLogout
} = require('../middleware/enhancedActivityLogger');

class ClientAuthController {
  constructor() {
    this.logger = logger;
  }

  // Validation rules for account registration
  static accountRegistrationValidation() {
    return [
      body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
      body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, and number'),
      body('confirmPassword')
        .custom((value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
          }
          return true;
        }),
      body('email')
        .optional()
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
    ];
  }

  // Validation rules for profile completion
  static profileCompletionValidation() {
    return [
      body('first_name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name is required and must be 1-100 characters'),
      body('last_name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name is required and must be 1-100 characters'),
      body('middle_name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Middle name must be maximum 100 characters'),
      body('suffix')
        .optional()
        .trim()
        .isLength({ max: 10 })
        .withMessage('Suffix must be maximum 10 characters'),
      body('birth_date')
        .isISO8601()
        .toDate()
        .withMessage('Please provide a valid birth date'),
      body('gender')
        .isIn(['male', 'female'])
        .withMessage('Gender must be either male or female'),
      body('civil_status_id')
        .isInt({ min: 1 })
        .withMessage('Please select a valid civil status'),
      body('nationality')
        .optional()
        .trim()
        .isLength({ max: 50 })
        .withMessage('Nationality must be maximum 50 characters'),
      body('phone_number')
        .trim()
        .matches(/^09\d{9}$/)
        .withMessage('Please provide a valid Philippine phone number (09XXXXXXXXX - 11 digits starting with 09)'),
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      body('barangay')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Barangay is required and must be 1-100 characters'),
      body('city_municipality')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('City/Municipality is required and must be 1-100 characters'),
      body('province')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Province is required and must be 1-100 characters'),
      body('house_number')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('House number must be maximum 20 characters'),
      body('street')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Street must be maximum 100 characters'),
      body('subdivision')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Subdivision must be maximum 100 characters'),
      body('postal_code')
        .optional()
        .trim()
        .isLength({ max: 10 })
        .withMessage('Postal code must be maximum 10 characters'),
      body('years_of_residency')
        .optional()
        .isInt({ min: 0, max: 100 })
        .withMessage('Years of residency must be between 0 and 100'),
      body('months_of_residency')
        .optional()
        .isInt({ min: 0, max: 11 })
        .withMessage('Months of residency must be between 0 and 11')
    ];
  }

  // Validation rules for login
  static loginValidation() {
    return [
      body('username')
        .trim()
        .notEmpty()
        .withMessage('Username is required'),
      body('password')
        .notEmpty()
        .withMessage('Password is required')
    ];
  }

  // Validation rules for email verification
  static emailVerificationValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      body('otp')
        .isLength({ min: 4, max: 10 })
        .isNumeric()
        .withMessage('OTP must be a numeric code between 4 and 10 digits')
    ];
  }

  // Register client account (Step 1)
  async registerAccount(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { username, password, email } = req.body;

      const result = await clientAuthService.registerAccount({
        username,
        password,
        email
      });

      // Log client registration activity (don't let logging failures break registration)
      try {
        await req.logRegistrationActivity(
          result.data.accountId,
          'client',
          ACTIVITY_TYPES.CLIENT_REGISTRATION_SUCCESS,
          {
            username,
            email,
            account_id: result.data.accountId,
            registration_step: 'account_created'
          }
        );
      } catch (loggingError) {
        this.logger.warn('Failed to log registration activity', {
          username,
          error: loggingError.message,
          ip: req.ip
        });
      }

      this.logger.info('Client account registration initiated', {
        username,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.created(res, result.data, result.message);

    } catch (error) {
      this.logger.error('Client account registration failed', {
        username: req.body.username,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('already exists') || error.message.includes('already registered')) {
        return ApiResponse.error(res, error.message, 409);
      }

      return ApiResponse.error(res, 'Registration failed. Please try again.', 500);
    }
  }

  // Complete client registration (Step 2)
  async completeRegistration(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { accountId } = req.params;
      const profileData = req.body;

      const result = await clientAuthService.completeRegistration(accountId, profileData);

      this.logger.info('Client registration completed', {
        accountId,
        email: profileData.email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.created(res, result.data, result.message);

    } catch (error) {
      this.logger.error('Client registration completion failed', {
        accountId: req.params.accountId,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('not found') || error.message.includes('already exists')) {
        return ApiResponse.error(res, error.message, 400);
      }

      return ApiResponse.error(res, 'Registration completion failed. Please try again.', 500);
    }
  }

  // Verify email with OTP
  async verifyEmail(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { email, otp } = req.body;

      const result = await clientAuthService.verifyEmail(email, otp);

      this.logger.info('Client email verified', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, null, result.message);

    } catch (error) {
      this.logger.error('Client email verification failed', {
        email: req.body.email,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return ApiResponse.error(res, error.message, 400);
      }

      return ApiResponse.error(res, 'Email verification failed. Please try again.', 500);
    }
  }

  // Client login
  async login(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { username, password } = req.body;

      const result = await clientAuthService.login({ username, password });

      // Log successful client login activity
      await logSuccessfulLogin(req, result.data.client.id, 'client', username, {
        client_id: result.data.client.id,
        account_status: result.data.client.status
      });

      this.logger.info('Client login successful', {
        username,
        clientId: result.data.client.id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, result.data, result.message);

    } catch (error) {
      // Log failed client login activity
      await logFailedLogin(req, req.body.username, 'client', error.message);

      this.logger.error('Client login failed', {
        username: req.body.username,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('Invalid') ||
          error.message.includes('suspended') ||
          error.message.includes('inactive') ||
          error.message.includes('pending')) {
        return ApiResponse.error(res, error.message, 401);
      }

      return ApiResponse.error(res, 'Login failed. Please try again.', 500);
    }
  }

  // Get client profile
  async getProfile(req, res) {
    try {
      const clientId = req.user.id;

      const result = await clientAuthService.getProfile(clientId);

      return ApiResponse.success(res, result.data, 'Profile retrieved successfully');

    } catch (error) {
      this.logger.error('Failed to get client profile', {
        clientId: req.user?.id,
        error: error.message,
        ip: req.ip
      });

      return ApiResponse.error(res, 'Failed to retrieve profile', 500);
    }
  }

  // Resend verification email
  async resendVerificationEmail(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return ApiResponse.error(res, 'Email is required', 400);
      }

      const result = await clientAuthService.resendVerificationEmail(email);

      this.logger.info('Verification email resent', {
        email,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, null, result.message);

    } catch (error) {
      this.logger.error('Failed to resend verification email', {
        email: req.body.email,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('not found') || error.message.includes('already verified')) {
        return ApiResponse.error(res, error.message, 400);
      }

      return ApiResponse.error(res, 'Failed to resend verification email', 500);
    }
  }
}

module.exports = new ClientAuthController();
