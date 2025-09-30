const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const AdminEmployeeAccount = require('../models/AdminEmployeeAccount');
const AdminEmployeeProfile = require('../models/AdminEmployeeProfile');
const OTPService = require('../services/otpService');
const EmailService = require('../services/emailService');
const AdminAuthService = require('../services/adminAuthService');
const { successResponse, errorResponse } = require('../utils/response');
const { logAuthActivity, ACTIVITY_TYPES } = require('../middleware/activityLogger');
const {
  enhancedActivityLogger,
  ACTIVITY_TYPES: ENHANCED_ACTIVITY_TYPES,
  logSuccessfulLogin,
  logFailedLogin,
  logLogout
} = require('../middleware/enhancedActivityLogger');

class AdminAuthController {
  // Validation rules for account registration
  static accountRegistrationValidation() {
    return [
      body('username')
        .trim()
        .isLength({ min: 3, max: 50 })
        .withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
      
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
      
      body('role')
        .isIn(['admin', 'employee'])
        .withMessage('Role must be either admin or employee'),
      
      body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
      
      body('confirmPassword')
        .custom((value, { req }) => {
          if (value !== req.body.password) {
            throw new Error('Password confirmation does not match password');
          }
          return true;
        })
    ];
  }

  // Validation rules for profile registration
  static profileRegistrationValidation() {
    return [
      body('first_name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name is required and must be less than 100 characters'),
      
      body('last_name')
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name is required and must be less than 100 characters'),
      
      body('middle_name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Middle name must be less than 100 characters'),
      
      body('suffix')
        .optional()
        .trim()
        .isLength({ max: 10 })
        .withMessage('Suffix must be less than 10 characters'),
      
      body('employee_id')
        .optional()
        .trim()
        .isLength({ max: 20 })
        .withMessage('Employee ID must be less than 20 characters'),
      
      body('phone_number')
        .matches(/^09\d{9}$/)
        .withMessage('Please provide a valid Philippine phone number (09XXXXXXXXX - 11 digits starting with 09)'),
      
      body('position')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Position must be less than 100 characters'),
      
      body('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department must be less than 100 characters'),
      
      body('hire_date')
        .optional()
        .isISO8601()
        .withMessage('Please provide a valid hire date')
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
        .isLength({ min: 6, max: 6 })
        .isNumeric()
        .withMessage('OTP must be a 6-digit number')
    ];
  }

  // Validation rules for resend verification
  static resendVerificationValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
    ];
  }

  // Validation rules for forgot password
  static forgotPasswordValidation() {
    return [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address')
    ];
  }

  // Validation rules for reset password
  static resetPasswordValidation() {
    return [
      body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
      
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
    ];
  }

  // Validation rules for profile update
  static updateProfileValidation() {
    return [
      body('first_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('First name must be between 1 and 100 characters'),
      
      body('last_name')
        .optional()
        .trim()
        .isLength({ min: 1, max: 100 })
        .withMessage('Last name must be between 1 and 100 characters'),
      
      body('middle_name')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Middle name must be less than 100 characters'),
      
      body('suffix')
        .optional()
        .trim()
        .isLength({ max: 10 })
        .withMessage('Suffix must be less than 10 characters'),
      
      body('phone_number')
        .optional()
        .matches(/^09\d{9}$/)
        .withMessage('Please provide a valid Philippine phone number (09XXXXXXXXX - 11 digits starting with 09)'),
      
      body('position')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Position must be less than 100 characters'),
      
      body('department')
        .optional()
        .trim()
        .isLength({ max: 100 })
        .withMessage('Department must be less than 100 characters')
    ];
  }

  // Validation rules for change password
  static changePasswordValidation() {
    return [
      body('currentPassword')
        .notEmpty()
        .withMessage('Current password is required'),
      
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
      
      body('confirmPassword')
        .custom((value, { req }) => {
          if (value !== req.body.newPassword) {
            throw new Error('Password confirmation does not match new password');
          }
          return true;
        })
    ];
  }

  // Register admin account (Step 1)
  async registerAccount(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { username, email, role, password } = req.body;

      // Check if username already exists
      const existingUsername = await AdminEmployeeAccount.findByUsername(username);
      if (existingUsername) {
        return errorResponse(res, 'Username already exists', 400);
      }

      // Check if email already exists
      const existingEmail = await AdminEmployeeAccount.findByEmail(email);
      if (existingEmail) {
        return errorResponse(res, 'Email already exists', 400);
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create admin account
      const accountData = {
        username,
        password_hash: passwordHash,
        role,
        status: 'inactive' // Account starts as inactive, requires email verification
      };

      const accountId = await AdminEmployeeAccount.create(accountData);

      // Don't create profile yet - it will be created in step 2 with required fields
      // Store email temporarily in a way that can be retrieved later
      // For now, we'll create a minimal profile with just account_id and email
      // but we need to handle the NOT NULL constraint for first_name

      // Actually, let's not create profile here at all since first_name is required
      // The profile will be created in completeRegistration step

      // Try to send welcome email, but don't fail if it doesn't work
      try {
        if (EmailService && typeof EmailService.sendWelcomeEmail === 'function') {
          await EmailService.sendWelcomeEmail(email, '', '');
          console.log('Welcome email sent successfully');
        }
      } catch (emailError) {
        console.warn('Failed to send welcome email (this is optional):', emailError.message);
        // Continue without failing - email is optional
      }

      return successResponse(res, 'Admin account created successfully. Please complete your profile.', { accountId, email }, 201);

    } catch (error) {
      console.error('Register account error:', {
        message: error.message,
        stack: error.stack,
        code: error.code,
        errno: error.errno,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState,
        sql: error.sql
      });

      // Return more specific error messages
      if (error.code === 'ER_DUP_ENTRY') {
        if (error.sqlMessage.includes('username')) {
          return errorResponse(res, 'Username already exists', 400);
        } else if (error.sqlMessage.includes('email')) {
          return errorResponse(res, 'Email already exists', 400);
        }
      }

      return errorResponse(res, `Failed to create admin account: ${error.message}`, 500);
    }
  }

  // Complete registration with profile (Step 2)
  async completeRegistration(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { accountId } = req.params;
      const profileData = req.body;

      // Check if account exists
      const account = await AdminEmployeeAccount.findById(accountId);
      if (!account) {
        return errorResponse(res, 'Account not found', 404);
      }

      // Check if profile already exists
      const existingProfile = await AdminEmployeeProfile.findByAccountId(accountId);

      // Check if employee_id is unique (if provided)
      if (profileData.employee_id) {
        const existingEmployeeId = await AdminEmployeeProfile.findByEmployeeId(profileData.employee_id);
        if (existingEmployeeId && existingEmployeeId.account_id !== parseInt(accountId)) {
          return errorResponse(res, 'Employee ID already exists', 400);
        }
      }

      // Get the email from account since we need it for the profile
      // For now, we'll require email to be passed in profileData
      if (!profileData.email) {
        return errorResponse(res, 'Email is required for profile creation', 400);
      }

      if (existingProfile) {
        // Update existing profile
        await AdminEmployeeProfile.updateByAccountId(accountId, profileData);
      } else {
        // Create new profile with account_id
        const newProfileData = {
          ...profileData,
          account_id: accountId
        };
        await AdminEmployeeProfile.create(newProfileData);
      }

      // Send OTP for email verification
      const profile = await AdminEmployeeProfile.findByAccountId(accountId);
      if (profile && profile.email) {
        try {
          await OTPService.generateAndSendOTP(profile.email, 'registration', profileData.first_name);
        } catch (otpError) {
          console.error('Failed to send OTP:', otpError);
          // Don't fail the registration if OTP sending fails
        }
      }

      return successResponse(res, 'Profile completed successfully. Please verify your email.', { accountId });

    } catch (error) {
      console.error('Complete registration error:', error);
      return errorResponse(res, 'Failed to complete registration', 500);
    }
  }

  // Verify email with OTP
  async verifyEmail(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { email, otp } = req.body;

      // Use the admin auth service for verification
      const result = await AdminAuthService.verifyEmail(email, otp);

      return successResponse(res, result.message);

    } catch (error) {
      console.error('Verify email error:', error);

      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return errorResponse(res, error.message, 400);
      }

      return errorResponse(res, 'Failed to verify email', 500);
    }
  }

  // Resend verification email
  async resendVerification(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { email } = req.body;

      // Use the admin auth service for resending verification
      const result = await AdminAuthService.resendVerificationEmail(email);

      return successResponse(res, result.message);

    } catch (error) {
      console.error('Resend verification error:', error);

      if (error.message.includes('not found') || error.message.includes('already verified')) {
        return errorResponse(res, error.message, 400);
      }

      return errorResponse(res, 'Failed to resend verification email', 500);
    }
  }

  // Admin login
  async login(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { username, password } = req.body;

      // Find account by username
      const account = await AdminEmployeeAccount.findByUsername(username);
      if (!account) {
        // Log failed login attempt - account not found
        await logFailedLogin(req, username, 'admin', 'Account not found');
        return errorResponse(res, 'Invalid username or password', 401);
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, account.password_hash);
      if (!isPasswordValid) {
        // Log failed login attempt - invalid password
        await logFailedLogin(req, username, 'admin', 'Invalid password');
        return errorResponse(res, 'Invalid username or password', 401);
      }

      // Check account status
      if (account.status !== 'active') {
        let message = 'Account is not active';
        let reason = 'Account not active';
        if (account.status === 'inactive') {
          message = 'Account is inactive. Please verify your email address.';
          reason = 'Account inactive - email not verified';
        } else if (account.status === 'suspended') {
          message = 'Account is suspended. Please contact the administrator.';
          reason = 'Account suspended';
        }
        // Log failed login attempt - account status issue
        await logFailedLogin(req, username, 'admin', reason, { account_status: account.status });
        return errorResponse(res, message, 403);
      }

      // Get profile information
      const profile = await AdminEmployeeProfile.findByAccountId(account.id);

      // Generate JWT token
      const token = jwt.sign(
        {
          id: account.id,
          username: account.username,
          role: account.role,
          type: 'admin' // Distinguish from client tokens
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      // Update last login
      await AdminEmployeeAccount.updateLastLogin(account.id);

      // Log successful login activity (both old and new systems)
      await logAuthActivity(req, account.id, 'admin', ACTIVITY_TYPES.ADMIN_LOGIN, {
        username: account.username,
        role: account.role,
        login_time: new Date().toISOString()
      });

      // Enhanced activity logging
      await logSuccessfulLogin(req, account.id, 'admin', account.username, {
        role: account.role,
        department: profile?.department,
        position: profile?.position
      });

      // Prepare admin data for response
      const adminData = {
        id: account.id,
        username: account.username,
        role: account.role,
        status: account.status,
        first_name: profile?.first_name,
        last_name: profile?.last_name,
        email: profile?.email,
        profile_picture: profile?.profile_picture,
        position: profile?.position,
        department: profile?.department
      };

      return successResponse(res, 'Login successful', {
        token,
        admin: adminData
      });

    } catch (error) {
      console.error('Login error:', error);

      // Log failed login attempt
      try {
        await logAuthActivity(req, null, 'admin', ACTIVITY_TYPES.LOGIN_FAILED, {
          attempted_username: req.body.username,
          error_message: error.message,
          attempt_time: new Date().toISOString()
        });
      } catch (logError) {
        console.error('Failed to log failed login attempt:', logError);
      }

      return errorResponse(res, 'Login failed', 500);
    }
  }

  // Forgot password
  async forgotPassword(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { email } = req.body;

      // Find profile by email
      const profile = await AdminEmployeeProfile.findByEmail(email);
      if (!profile) {
        // Don't reveal if email exists or not for security
        return successResponse(res, 'If the email exists, a password reset link has been sent');
      }

      // Generate reset token
      const resetToken = jwt.sign(
        { accountId: profile.account_id, email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Send password reset email
      try {
        await EmailService.sendPasswordResetEmail(email, resetToken, profile.first_name);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        return errorResponse(res, 'Failed to send password reset email', 500);
      }

      return successResponse(res, 'If the email exists, a password reset link has been sent');

    } catch (error) {
      console.error('Forgot password error:', error);
      return errorResponse(res, 'Failed to process password reset request', 500);
    }
  }

  // Reset password with token
  async resetPassword(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { token, newPassword } = req.body;

      // Verify reset token
      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (jwtError) {
        return errorResponse(res, 'Invalid or expired reset token', 400);
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await AdminEmployeeAccount.updatePassword(decoded.accountId, passwordHash);

      return successResponse(res, 'Password reset successfully');

    } catch (error) {
      console.error('Reset password error:', error);
      return errorResponse(res, 'Failed to reset password', 500);
    }
  }

  // Get admin profile
  async getProfile(req, res) {
    try {
      const accountId = req.user.id;

      // Get account and profile information
      const account = await AdminEmployeeAccount.findById(accountId);
      const profile = await AdminEmployeeProfile.findByAccountId(accountId);

      if (!account) {
        return errorResponse(res, 'Account not found', 404);
      }

      // Prepare admin data for response
      const adminData = {
        id: account.id,
        username: account.username,
        role: account.role,
        status: account.status,
        last_login: account.last_login,
        created_at: account.created_at,
        employee_id: profile?.employee_id,
        first_name: profile?.first_name,
        middle_name: profile?.middle_name,
        last_name: profile?.last_name,
        suffix: profile?.suffix,
        phone_number: profile?.phone_number,
        email: profile?.email,
        profile_picture: profile?.profile_picture,
        position: profile?.position,
        department: profile?.department,
        hire_date: profile?.hire_date
      };

      return successResponse(res, 'Profile retrieved successfully', adminData);

    } catch (error) {
      console.error('Get profile error:', error);
      return errorResponse(res, 'Failed to retrieve profile', 500);
    }
  }

  // Update admin profile
  async updateProfile(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const accountId = req.user.id;
      const updateData = req.body;

      // Check if employee_id is unique (if being updated)
      if (updateData.employee_id) {
        const existingEmployeeId = await AdminEmployeeProfile.findByEmployeeId(updateData.employee_id);
        if (existingEmployeeId && existingEmployeeId.account_id !== accountId) {
          return errorResponse(res, 'Employee ID already exists', 400);
        }
      }

      // Update profile
      await AdminEmployeeProfile.updateByAccountId(accountId, updateData);

      // Get updated profile
      const updatedProfile = await AdminEmployeeProfile.findByAccountId(accountId);
      const account = await AdminEmployeeAccount.findById(accountId);

      // Prepare updated admin data for response
      const adminData = {
        id: account.id,
        username: account.username,
        role: account.role,
        status: account.status,
        employee_id: updatedProfile?.employee_id,
        first_name: updatedProfile?.first_name,
        middle_name: updatedProfile?.middle_name,
        last_name: updatedProfile?.last_name,
        suffix: updatedProfile?.suffix,
        phone_number: updatedProfile?.phone_number,
        email: updatedProfile?.email,
        profile_picture: updatedProfile?.profile_picture,
        position: updatedProfile?.position,
        department: updatedProfile?.department,
        hire_date: updatedProfile?.hire_date
      };

      return successResponse(res, 'Profile updated successfully', adminData);

    } catch (error) {
      console.error('Update profile error:', error);
      return errorResponse(res, 'Failed to update profile', 500);
    }
  }

  // Change password
  async changePassword(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const accountId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      // Get current account
      const account = await AdminEmployeeAccount.findById(accountId);
      if (!account) {
        return errorResponse(res, 'Account not found', 404);
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, account.password_hash);
      if (!isCurrentPasswordValid) {
        return errorResponse(res, 'Current password is incorrect', 400);
      }

      // Hash new password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await AdminEmployeeAccount.updatePassword(accountId, passwordHash);

      return successResponse(res, 'Password changed successfully');

    } catch (error) {
      console.error('Change password error:', error);
      return errorResponse(res, 'Failed to change password', 500);
    }
  }

  // Logout
  async logout(req, res) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // But we can log the logout event or invalidate tokens if using a blacklist

      // Log logout activity (both old and new systems)
      if (req.user && req.user.id) {
        await logAuthActivity(req, req.user.id, 'admin', ACTIVITY_TYPES.ADMIN_LOGOUT, {
          username: req.user.username,
          logout_time: new Date().toISOString()
        });

        // Enhanced activity logging
        await logLogout(req, req.user.id, 'admin', req.user.username, {
          role: req.user.role
        });
      }

      return successResponse(res, 'Logged out successfully');

    } catch (error) {
      console.error('Logout error:', error);
      return errorResponse(res, 'Logout failed', 500);
    }
  }

  // Get dashboard statistics
  async getDashboardStats(req, res) {
    try {
      // This would typically query various tables to get statistics
      // For now, returning mock data - implement actual queries based on your database schema

      const stats = {
        totalUsers: 0,
        activeRequests: 0,
        completedToday: 0,
        pendingApproval: 0
      };

      // TODO: Implement actual database queries
      // Example:
      // stats.totalUsers = await ClientAccount.count();
      // stats.activeRequests = await DocumentRequest.countByStatus('pending');
      // stats.completedToday = await DocumentRequest.countCompletedToday();
      // stats.pendingApproval = await DocumentRequest.countByStatus('pending_approval');

      return successResponse(res, 'Dashboard statistics retrieved successfully', stats);

    } catch (error) {
      console.error('Get dashboard stats error:', error);
      return errorResponse(res, 'Failed to retrieve dashboard statistics', 500);
    }
  }

  // Get recent activity
  async getRecentActivity(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 10;

      // This would typically query an activity/audit log table
      // For now, returning mock data - implement actual queries based on your database schema

      const activities = [];

      // TODO: Implement actual database queries
      // Example:
      // const activities = await ActivityLog.findRecent(limit);

      return successResponse(res, 'Recent activity retrieved successfully', activities);

    } catch (error) {
      console.error('Get recent activity error:', error);
      return errorResponse(res, 'Failed to retrieve recent activity', 500);
    }
  }

  // Get notifications
  async getNotifications(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 20;
      const offset = parseInt(req.query.offset) || 0;
      const unreadOnly = req.query.unread === 'true';

      // This would typically query a notifications table
      // For now, returning mock data - implement actual queries based on your database schema

      const notifications = [];

      // TODO: Implement actual database queries
      // Example:
      // const notifications = await Notification.findByUserId(req.user.id, { limit, offset, unreadOnly });

      return successResponse(res, 'Notifications retrieved successfully', notifications);

    } catch (error) {
      console.error('Get notifications error:', error);
      return errorResponse(res, 'Failed to retrieve notifications', 500);
    }
  }

  // Mark notification as read
  async markNotificationAsRead(req, res) {
    try {
      const notificationId = req.params.id;
      const userId = req.user.id;

      // TODO: Implement actual database queries
      // Example:
      // await Notification.markAsRead(notificationId, userId);

      return successResponse(res, 'Notification marked as read');

    } catch (error) {
      console.error('Mark notification as read error:', error);
      return errorResponse(res, 'Failed to mark notification as read', 500);
    }
  }

  // Mark all notifications as read
  async markAllNotificationsAsRead(req, res) {
    try {
      const userId = req.user.id;

      // TODO: Implement actual database queries
      // Example:
      // await Notification.markAllAsRead(userId);

      return successResponse(res, 'All notifications marked as read');

    } catch (error) {
      console.error('Mark all notifications as read error:', error);
      return errorResponse(res, 'Failed to mark all notifications as read', 500);
    }
  }
}

module.exports = new AdminAuthController();
