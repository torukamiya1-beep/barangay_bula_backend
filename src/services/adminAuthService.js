const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const AdminEmployeeAccount = require('../models/AdminEmployeeAccount');
const AdminEmployeeProfile = require('../models/AdminEmployeeProfile');
const otpService = require('./otpService');
const emailService = require('./emailService');
const logger = require('../utils/logger');
const ComprehensiveActivityLogService = require('./comprehensiveActivityLogService');

class AdminAuthService {
  // Generate JWT token for admin
  static generateToken(adminId, username, role) {
    return jwt.sign(
      { 
        id: adminId,
        username,
        role,
        type: 'admin' // Distinguish from client tokens
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '30d'
      }
    );
  }

  // Register admin account (Step 1)
  static async registerAccount(accountData) {
    try {
      const { username, email, role, password } = accountData;

      // Check if username already exists
      const existingUsername = await AdminEmployeeAccount.findByUsername(username);
      if (existingUsername) {
        throw new Error('Username already exists');
      }

      // Check if email already exists
      const existingEmail = await AdminEmployeeAccount.findByEmail(email);
      if (existingEmail) {
        throw new Error('Email already exists');
      }

      // Hash password
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create admin account
      const accountId = await AdminEmployeeAccount.create({
        username,
        password_hash: passwordHash,
        role,
        status: 'inactive' // Account starts as inactive, requires email verification
      });

      logger.info('Admin account created', {
        accountId,
        username,
        role
      });

      // Log audit activity for admin account creation
      try {
        await ComprehensiveActivityLogService.logActivity({
          userId: null, // System action, no specific user
          userType: 'admin',
          action: 'admin_account_creation',
          tableName: 'admin_employee_accounts',
          recordId: accountId,
          newValues: {
            creation_timestamp: new Date().toISOString(),
            username: username,
            role: role,
            email: email,
            status: 'inactive'
          }
        });
      } catch (auditError) {
        logger.error('Failed to log admin account creation audit', {
          accountId,
          username,
          error: auditError.message
        });
      }

      return {
        success: true,
        data: { accountId, email },
        message: 'Admin account created successfully. Please complete your profile.'
      };
    } catch (error) {
      logger.error('Admin account registration failed', {
        username: accountData.username,
        error: error.message
      });
      throw error;
    }
  }

  // Complete registration with profile (Step 2)
  static async completeRegistration(accountId, profileData) {
    try {
      // Check if account exists
      const account = await AdminEmployeeAccount.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Check if profile already exists
      const existingProfile = await AdminEmployeeProfile.findByAccountId(accountId);

      // Check if employee_id is unique (if provided)
      if (profileData.employee_id) {
        const existingEmployeeId = await AdminEmployeeProfile.findByEmployeeId(profileData.employee_id);
        if (existingEmployeeId && existingEmployeeId.account_id !== parseInt(accountId)) {
          throw new Error('Employee ID already exists');
        }
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
          await otpService.generateAndSendOTP(profile.email, 'registration', profileData.first_name);
        } catch (otpError) {
          logger.warn('Failed to send OTP', {
            accountId,
            email: profile.email,
            error: otpError.message
          });
          // Don't fail the registration if OTP sending fails
        }
      }

      logger.info('Admin registration completed', {
        accountId,
        email: profile?.email
      });

      return {
        success: true,
        data: { accountId },
        message: 'Profile completed successfully. Please verify your email.'
      };
    } catch (error) {
      logger.error('Admin registration completion failed', {
        accountId,
        error: error.message
      });
      throw error;
    }
  }

  // Verify email with OTP
  static async verifyEmail(email, otp) {
    try {
      // Verify OTP
      await otpService.verifyOTP(email, otp, 'registration');

      // Find profile by email
      const profile = await AdminEmployeeProfile.findByEmail(email);
      if (!profile) {
        throw new Error('Account not found');
      }

      // Activate account
      await AdminEmployeeAccount.updateStatus(profile.account_id, 'active');

      logger.info('Admin email verified and account activated', {
        accountId: profile.account_id,
        email
      });

      return {
        success: true,
        message: 'Email verified successfully. Account activated.'
      };
    } catch (error) {
      logger.error('Admin email verification failed', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  // Resend verification email
  static async resendVerificationEmail(email) {
    try {
      // Find profile by email
      const profile = await AdminEmployeeProfile.findByEmail(email);
      if (!profile) {
        throw new Error('Account not found');
      }

      // Check if account is already active
      const account = await AdminEmployeeAccount.findById(profile.account_id);
      if (account && account.status === 'active') {
        throw new Error('Account is already verified');
      }

      // Send OTP
      await otpService.generateAndSendOTP(email, 'registration', profile.first_name);

      logger.info('Admin verification email resent', {
        accountId: profile.account_id,
        email
      });

      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      logger.error('Failed to resend admin verification email', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  // Admin login
  static async login(credentials) {
    try {
      const { username, password } = credentials;

      // Find account by username
      const account = await AdminEmployeeAccount.findByUsername(username);
      if (!account) {
        throw new Error('Invalid username or password');
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, account.password_hash);
      if (!isPasswordValid) {
        throw new Error('Invalid username or password');
      }

      // Check account status
      if (account.status !== 'active') {
        let message = 'Account is not active';
        if (account.status === 'inactive') {
          message = 'Account is inactive. Please verify your email address.';
        } else if (account.status === 'suspended') {
          message = 'Account is suspended. Please contact the administrator.';
        }
        throw new Error(message);
      }

      // Get profile information
      const profile = await AdminEmployeeProfile.findByAccountId(account.id);

      // Generate JWT token
      const token = this.generateToken(account.id, account.username, account.role);

      // Update last login
      await AdminEmployeeAccount.updateLastLogin(account.id);

      logger.info('Admin login successful', {
        accountId: account.id,
        username: account.username,
        role: account.role
      });

      return {
        success: true,
        data: {
          user: {
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
          },
          token
        },
        message: 'Login successful'
      };
    } catch (error) {
      logger.error('Admin login failed', {
        username: credentials.username,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = AdminAuthService;
