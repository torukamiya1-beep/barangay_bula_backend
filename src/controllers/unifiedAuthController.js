const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const AdminEmployeeAccount = require('../models/AdminEmployeeAccount');
const AdminEmployeeProfile = require('../models/AdminEmployeeProfile');
const ClientAccount = require('../models/ClientAccount');
const { successResponse, errorResponse } = require('../utils/response');
const {
  ACTIVITY_TYPES,
  logSuccessfulLogin,
  logFailedLogin,
  logLogout
} = require('../middleware/enhancedActivityLogger');

class UnifiedAuthController {
  // Validation rules for unified login
  static unifiedLoginValidation() {
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

  // Unified login method that checks both admin and client accounts
  async unifiedLogin(req, res) {
    try {
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { username, password } = req.body;

      // First, try to find admin account
      let account = await AdminEmployeeAccount.findByUsername(username);
      let userType = 'admin';
      let profile = null;

      if (account) {
        // Check password for admin account
        const isPasswordValid = await bcrypt.compare(password, account.password_hash);
        if (!isPasswordValid) {
          // Log failed login attempt for admin
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
          // Log failed login attempt due to account status
          await logFailedLogin(req, username, 'admin', reason, { account_status: account.status });
          return errorResponse(res, message, 403);
        }

        // Get admin profile
        profile = await AdminEmployeeProfile.findByAccountId(account.id);

        // Update last login
        await AdminEmployeeAccount.updateLastLogin(account.id);

      } else {
        // Try to find client account
        account = await ClientAccount.findByUsername(username);
        userType = 'client';

        if (!account) {
          // Log failed login attempt - no account found (tried both admin and client)
          await logFailedLogin(req, username, 'client', 'Account not found');
          return errorResponse(res, 'Invalid username or password', 401);
        }

        // Check password for client account
        const isPasswordValid = await account.verifyPassword(password);
        if (!isPasswordValid) {
          // Log failed login attempt for client
          await logFailedLogin(req, username, 'client', 'Invalid password');
          return errorResponse(res, 'Invalid username or password', 401);
        }

        // Check account status
        if (account.status !== 'active') {
          let message = 'Account is not active';
          if (account.status === 'pending_verification') {
            message = 'Account is pending verification. Please verify your email address.';
          } else if (account.status === 'suspended') {
            message = 'Account is suspended. Please contact the administrator.';
          } else if (account.status === 'inactive') {
            message = 'Account is inactive. Please contact the administrator.';
          }
          return errorResponse(res, message, 403);
        }

        // Get client profile
        const clientWithProfile = await account.getWithProfile();
        if (clientWithProfile) {
          profile = {
            first_name: clientWithProfile.first_name,
            middle_name: clientWithProfile.middle_name,
            last_name: clientWithProfile.last_name,
            suffix: clientWithProfile.suffix,
            email: clientWithProfile.email,
            phone_number: clientWithProfile.phone_number
          };
        }

        // Update last login
        await account.updateLastLogin();
      }

      // Generate JWT token
      const tokenPayload = {
        id: account.id,
        username: account.username,
        type: userType
      };

      // Add role for admin accounts
      if (userType === 'admin') {
        tokenPayload.role = account.role;
      }

      const token = jwt.sign(
        tokenPayload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '30d' }
      );

      // Prepare user data for response
      const userData = {
        id: account.id,
        username: account.username,
        type: userType,
        status: account.status
      };

      // Add role for admin accounts
      if (userType === 'admin') {
        userData.role = account.role;
      }

      // Add profile data if available
      if (profile) {
        userData.profile = profile;
      }

      // Log successful login activity
      await logSuccessfulLogin(req, account.id, userType, account.username, {
        role: userType === 'admin' ? account.role : undefined,
        account_status: account.status,
        profile_complete: profile ? true : false
      });

      // Determine redirect URL based on user type and role
      let redirectUrl = '/';
      if (userType === 'admin') {
        redirectUrl = '/admin/requests'; // Changed from /admin/dashboard to /admin/requests
      } else if (userType === 'client') {
        redirectUrl = '/client/home'; // Updated to redirect to new client home page
      }

      return successResponse(res, 'Login successful', {
        user: userData,
        token,
        redirectUrl
      });

    } catch (error) {
      console.error('Unified login error:', error);
      return errorResponse(res, 'Login failed', 500);
    }
  }
}

module.exports = new UnifiedAuthController();
