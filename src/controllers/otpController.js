const otpService = require('../services/otpService');
const emailService = require('../services/emailService');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { body, validationResult } = require('express-validator');

class OTPController {
  constructor() {
    this.logger = logger;
  }

  // Validation rules for sending OTP
  static sendOTPValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      body('purpose')
        .optional()
        .isIn(['registration', 'admin_registration', 'password_reset', 'email_verification', 'login'])
        .withMessage('Invalid OTP purpose'),
      body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1 and 100 characters')
    ];
  }

  // Validation rules for verifying OTP
  static verifyOTPValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      body('otp')
        .isLength({ min: 4, max: 10 })
        .isNumeric()
        .withMessage('OTP must be a numeric code between 4 and 10 digits'),
      body('purpose')
        .optional()
        .isIn(['registration', 'admin_registration', 'password_reset', 'email_verification', 'login'])
        .withMessage('Invalid OTP purpose')
    ];
  }

  // Validation rules for sending SMS OTP
  static sendSMSOTPValidation() {
    return [
      body('phoneNumber')
        .matches(/^09\d{9}$/)
        .withMessage('Please provide a valid Philippine phone number (09XXXXXXXXX - 11 digits starting with 09)'),
      body('purpose')
        .optional()
        .isIn(['registration', 'admin_registration', 'password_reset', 'email_verification', 'login'])
        .withMessage('Invalid OTP purpose'),
      body('firstName')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1 and 100 characters')
    ];
  }

  // Validation rules for verifying SMS OTP
  static verifySMSOTPValidation() {
    return [
      body('phoneNumber')
        .matches(/^09\d{9}$/)
        .withMessage('Please provide a valid Philippine phone number (09XXXXXXXXX - 11 digits starting with 09)'),
      body('otp')
        .isLength({ min: 4, max: 10 })
        .isNumeric()
        .withMessage('OTP must be a numeric code between 4 and 10 digits'),
      body('purpose')
        .optional()
        .isIn(['registration', 'admin_registration', 'password_reset', 'email_verification', 'login'])
        .withMessage('Invalid OTP purpose')
    ];
  }

  // Send OTP
  async sendOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { email, purpose = 'registration', firstName = '' } = req.body;

      // Verify email service configuration before sending
      try {
        await emailService.verifyConnection();
      } catch (error) {
        this.logger.error('Email service verification failed:', { error: error.message });
        return ApiResponse.error(res, 'Email service is currently unavailable', 503);
      }

      // Generate and send OTP
      const result = await otpService.generateAndSendOTP(email, purpose, firstName);

      this.logger.info('OTP sent successfully', {
        email,
        purpose,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        email,
        purpose,
        expiresAt: result.expiresAt
      }, 'OTP sent successfully to your email address');

    } catch (error) {
      this.logger.error('Failed to send OTP:', {
        email: req.body.email,
        purpose: req.body.purpose,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('wait')) {
        return ApiResponse.error(res, error.message, 429);
      }

      return ApiResponse.error(res, 'Failed to send OTP. Please try again later.', 500);
    }
  }

  // Verify OTP
  async verifyOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { email, otp, purpose = 'registration' } = req.body;

      // Verify OTP
      const result = await otpService.verifyOTP(email, otp, purpose);

      // If this is email verification for client registration, also update client account status
      if (purpose === 'email_verification') {
        try {
          const ClientProfile = require('../models/ClientProfile');
          const ClientAccount = require('../models/ClientAccount');

          // Find profile by email
          const clientProfile = await ClientProfile.findByEmail(email);
          if (clientProfile) {
            // Update account email verification status and activate account
            const clientAccount = await ClientAccount.findById(clientProfile.account_id);
            if (clientAccount) {
              await clientAccount.updateEmailVerification(true);
              await clientAccount.updateStatus('active');

              this.logger.info('Client account activated via email OTP verification', {
                accountId: clientAccount.id,
                email,
                purpose
              });
            }
          }
        } catch (accountUpdateError) {
          this.logger.warn('Failed to update client account status after email OTP verification', {
            email,
            purpose,
            error: accountUpdateError.message
          });
          // Don't fail the OTP verification if account update fails
        }
      }

      this.logger.info('OTP verified successfully', {
        email,
        purpose,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        email,
        purpose,
        verified: true
      }, 'OTP verified successfully');

    } catch (error) {
      this.logger.error('OTP verification failed:', {
        email: req.body.email,
        purpose: req.body.purpose,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return ApiResponse.error(res, error.message, 400);
      }

      if (error.message.includes('Too many')) {
        return ApiResponse.error(res, error.message, 429);
      }

      return ApiResponse.error(res, 'OTP verification failed. Please try again.', 500);
    }
  }

  // Resend OTP
  async resendOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { email, purpose = 'registration', firstName = '' } = req.body;

      // Verify email service configuration
      try {
        await emailService.verifyConnection();
      } catch (error) {
        this.logger.error('Email service verification failed:', { error: error.message });
        return ApiResponse.error(res, 'Email service is currently unavailable', 503);
      }

      // Resend OTP
      const result = await otpService.resendOTP(email, purpose, firstName);

      this.logger.info('OTP resent successfully', {
        email,
        purpose,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        email,
        purpose,
        expiresAt: result.expiresAt
      }, 'New OTP sent successfully to your email address');

    } catch (error) {
      this.logger.error('Failed to resend OTP:', {
        email: req.body.email,
        purpose: req.body.purpose,
        error: error.message,
        ip: req.ip
      });

      return ApiResponse.error(res, 'Failed to resend OTP. Please try again later.', 500);
    }
  }

  // Get OTP statistics (admin only)
  async getOTPStats(req, res) {
    try {
      const stats = await otpService.getOTPStats();

      return ApiResponse.success(res, stats, 'OTP statistics retrieved successfully');

    } catch (error) {
      this.logger.error('Failed to get OTP stats:', {
        error: error.message,
        ip: req.ip
      });

      return ApiResponse.error(res, 'Failed to retrieve OTP statistics', 500);
    }
  }

  // Cleanup expired OTPs (admin only)
  async cleanupExpiredOTPs(req, res) {
    try {
      const deletedCount = await otpService.cleanupAllExpiredOTPs();

      this.logger.info('Expired OTPs cleaned up', {
        deletedCount,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        deletedCount
      }, `Successfully cleaned up ${deletedCount} expired OTPs`);

    } catch (error) {
      this.logger.error('Failed to cleanup expired OTPs:', {
        error: error.message,
        ip: req.ip
      });

      return ApiResponse.error(res, 'Failed to cleanup expired OTPs', 500);
    }
  }

  // Test email configuration (admin only)
  async testEmailConfig(req, res) {
    try {
      const { testEmail } = req.body;

      if (!testEmail) {
        return ApiResponse.error(res, 'Test email address is required', 400);
      }

      // Verify email service configuration
      await emailService.verifyConnection();

      // Send test email
      await emailService.sendEmail(
        testEmail,
        'Email Configuration Test - Barangay Management System',
        '<h2>Email Configuration Test</h2><p>If you receive this email, your email configuration is working correctly!</p>',
        'Email Configuration Test - If you receive this email, your email configuration is working correctly!'
      );

      this.logger.info('Test email sent successfully', {
        testEmail,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        testEmail
      }, 'Test email sent successfully');

    } catch (error) {
      this.logger.error('Email configuration test failed:', {
        testEmail: req.body.testEmail,
        error: error.message,
        ip: req.ip
      });

      return ApiResponse.error(res, `Email configuration test failed: ${error.message}`, 500);
    }
  }

  // Send SMS OTP
  async sendSMSOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { phoneNumber, purpose = 'registration', firstName = '' } = req.body;

      // Generate and send SMS OTP
      const result = await otpService.generateAndSendSMSOTP(phoneNumber, purpose, firstName);

      this.logger.info('SMS OTP sent successfully', {
        phoneNumber,
        purpose,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        phoneNumber,
        purpose,
        expiresAt: result.expiresAt
      }, 'SMS OTP sent successfully to your phone number');

    } catch (error) {
      this.logger.error('Failed to send SMS OTP:', {
        phoneNumber: req.body.phoneNumber,
        purpose: req.body.purpose,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('wait')) {
        return ApiResponse.error(res, error.message, 429);
      }

      return ApiResponse.error(res, 'Failed to send SMS OTP. Please try again later.', 500);
    }
  }

  // Verify SMS OTP
  async verifySMSOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { phoneNumber, otp, purpose = 'registration' } = req.body;

      // Verify SMS OTP
      const result = await otpService.verifySMSOTP(phoneNumber, otp, purpose);

      // If this is email verification for client registration, also update client account status
      if (purpose === 'email_verification') {
        try {
          const ClientProfile = require('../models/ClientProfile');
          const ClientAccount = require('../models/ClientAccount');

          // Find profile by phone number
          const clientProfile = await ClientProfile.findByPhoneNumber(phoneNumber);
          if (clientProfile) {
            // Update account email verification status and activate account
            const clientAccount = await ClientAccount.findById(clientProfile.account_id);
            if (clientAccount) {
              await clientAccount.updateEmailVerification(true);
              await clientAccount.updateStatus('active');

              this.logger.info('Client account activated via SMS OTP verification', {
                accountId: clientAccount.id,
                phoneNumber,
                purpose
              });
            }
          }
        } catch (accountUpdateError) {
          this.logger.warn('Failed to update client account status after SMS OTP verification', {
            phoneNumber,
            purpose,
            error: accountUpdateError.message
          });
          // Don't fail the OTP verification if account update fails
        }
      }

      this.logger.info('OTP verified successfully', {
        phoneNumber,
        purpose,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        phoneNumber,
        purpose,
        verified: true
      }, 'OTP verified successfully');

    } catch (error) {
      this.logger.error('Failed to verify SMS OTP:', {
        phoneNumber: req.body.phoneNumber,
        purpose: req.body.purpose,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('Invalid or expired')) {
        return ApiResponse.error(res, 'Invalid or expired OTP code', 400);
      }

      return ApiResponse.error(res, 'Failed to verify SMS OTP. Please try again.', 500);
    }
  }

  // Resend SMS OTP
  async resendSMSOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { phoneNumber, purpose = 'registration', firstName = '' } = req.body;

      // Resend SMS OTP
      const result = await otpService.resendSMSOTP(phoneNumber, purpose, firstName);

      this.logger.info('SMS OTP resent successfully', {
        phoneNumber,
        purpose,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        phoneNumber,
        purpose,
        expiresAt: result.expiresAt
      }, 'SMS OTP resent successfully');

    } catch (error) {
      this.logger.error('Failed to resend SMS OTP:', {
        phoneNumber: req.body.phoneNumber,
        purpose: req.body.purpose,
        error: error.message,
        ip: req.ip
      });

      if (error.message.includes('wait')) {
        return ApiResponse.error(res, error.message, 429);
      }

      return ApiResponse.error(res, 'Failed to resend SMS OTP. Please try again later.', 500);
    }
  }

  // Send unified OTP (same code via both email and SMS)
  async sendUnifiedOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { email, phoneNumber, purpose = 'registration', firstName = '' } = req.body;

      // Generate and send unified OTP
      const result = await otpService.generateAndSendUnifiedOTP(email, phoneNumber, purpose, firstName);

      this.logger.info('Unified OTP sent', {
        email,
        phoneNumber,
        purpose,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        email,
        phoneNumber,
        purpose,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        expiresAt: result.expiresAt
      }, result.message);

    } catch (error) {
      this.logger.error('Failed to send unified OTP:', {
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        purpose: req.body.purpose,
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.error(res, 'Failed to send verification codes. Please try again.', 500);
    }
  }

  // Validation rules for sending unified OTP
  static sendUnifiedOTPValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      body('phoneNumber')
        .optional()
        .matches(/^09\d{9}$/)
        .withMessage('Please provide a valid Philippine phone number (09XXXXXXXXX - 11 digits starting with 09)'),
      body('purpose')
        .optional()
        .isIn(['registration', 'admin_registration', 'password_reset', 'email_verification', 'login'])
        .withMessage('Invalid OTP purpose'),
      body('firstName')
        .optional()
        .isLength({ min: 1, max: 50 })
        .withMessage('First name must be between 1 and 50 characters')
    ];
  }

  // Resend unified OTP (same code via both email and SMS)
  async resendUnifiedOTP(req, res) {
    try {
      // Check validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return ApiResponse.error(res, 'Validation failed', 400, errors.array());
      }

      const { email, phoneNumber, purpose = 'registration', firstName = '' } = req.body;

      // Resend unified OTP
      const result = await otpService.resendUnifiedOTP(email, phoneNumber, purpose, firstName);

      this.logger.info('Unified OTP resent', {
        email,
        phoneNumber,
        purpose,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.success(res, {
        email,
        phoneNumber,
        purpose,
        emailSent: result.emailSent,
        smsSent: result.smsSent,
        expiresAt: result.expiresAt
      }, result.message);

    } catch (error) {
      this.logger.error('Failed to resend unified OTP:', {
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        purpose: req.body.purpose,
        error: error.message,
        stack: error.stack,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });

      return ApiResponse.error(res, 'Failed to resend verification codes. Please try again.', 500);
    }
  }
}

module.exports = new OTPController();
