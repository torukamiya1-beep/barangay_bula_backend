const jwt = require('jsonwebtoken');
const { executeQuery } = require('../config/database');
const ClientAccount = require('../models/ClientAccount');
const ClientProfile = require('../models/ClientProfile');
const ResidencyDocument = require('../models/ResidencyDocument');
const TempRegistrationData = require('../models/TempRegistrationData');
const otpService = require('./otpService');
const emailService = require('./emailService');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class ClientAuthService {
  // Generate JWT token for client
  static generateToken(clientId) {
    return jwt.sign(
      { 
        id: clientId,
        type: 'client' // Distinguish from admin tokens
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRE || '30d'
      }
    );
  }

  // Register new client (Step 1: Create account)
  static async registerAccount(accountData) {
    try {
      const { username, password, email } = accountData;

      // Check if username already exists
      const existingAccount = await ClientAccount.findByUsername(username);
      if (existingAccount) {
        throw new Error('Username already exists');
      }

      // Check if email is already used in profiles
      if (email) {
        const existingProfile = await ClientProfile.findByEmail(email);
        if (existingProfile) {
          throw new Error('Email already registered');
        }
      }

      // Create client account
      const clientAccount = await ClientAccount.create({
        username,
        password
      });

      logger.info('Client account created', {
        clientId: clientAccount.id,
        username: clientAccount.username
      });

      return {
        success: true,
        data: {
          accountId: clientAccount.id,
          username: clientAccount.username,
          status: clientAccount.status
        },
        message: 'Account created successfully. Please complete your profile.'
      };
    } catch (error) {
      logger.error('Client account registration failed', {
        username: accountData.username,
        error: error.message
      });
      throw error;
    }
  }

  // Complete client registration (Step 2: Save profile data temporarily)
  static async completeRegistration(accountId, profileData) {
    try {
      // Verify account exists
      const clientAccount = await ClientAccount.findById(accountId);
      if (!clientAccount) {
        throw new Error('Account not found');
      }

      // Check if profile already exists (user already verified)
      const existingProfile = await ClientProfile.findByAccountId(accountId);
      if (existingProfile) {
        // Profile already exists - check if account is already verified
        if (clientAccount.status === 'active' || clientAccount.status === 'verified') {
          throw new Error('Profile already exists for this account. Please log in instead.');
        }
      }

      // Check if account status allows profile creation
      if (clientAccount.status !== 'pending_verification') {
        throw new Error('Account is not in pending verification status');
      }

      // Check if email is already used by another account
      if (profileData.email) {
        const existingEmailProfile = await ClientProfile.findByEmail(profileData.email);
        if (existingEmailProfile && existingEmailProfile.account_id !== parseInt(accountId)) {
          throw new Error('Email already registered with another account');
        }
      }

      // Save profile data TEMPORARILY (not permanently yet)
      // Data will be saved permanently only after OTP verification
      await TempRegistrationData.save(accountId, profileData);

      logger.info('Profile data saved temporarily (awaiting OTP verification)', {
        accountId,
        email: profileData.email
      });

      return {
        success: true,
        data: {
          accountId,
          tempDataSaved: true
        },
        message: 'Profile data saved. Please proceed to upload documents.'
      };
    } catch (error) {
      logger.error('Failed to save temporary profile data', {
        accountId,
        error: error.message
      });
      throw error;
    }
  }

  // Verify email with OTP and create profile permanently
  static async verifyEmail(email, otp) {
    try {
      // Verify OTP first
      await otpService.verifyOTP(email, otp, 'email_verification');

      // Find account ID by email from profile data
      const accountId = await this.getAccountIdByEmail(email);
      
      // Get temporary registration data
      const tempData = await TempRegistrationData.getByAccountId(accountId);
      
      if (!tempData) {
        throw new Error('Registration data not found. Please start registration again.');
      }

      const profileData = tempData.profileData;

      // Check if profile already exists
      let clientProfile = await ClientProfile.findByAccountId(accountId);
      
      if (!clientProfile) {
        // Create profile permanently NOW (after OTP verification)
        clientProfile = await ClientProfile.create({
          account_id: accountId,
          ...profileData
        });

        logger.info('Client profile created permanently after OTP verification', {
          accountId,
          profileId: clientProfile.id,
          email: profileData.email
        });
      }

      // Update account email verification status
      const clientAccount = await ClientAccount.findById(accountId);
      await clientAccount.updateEmailVerification(true);

      // Update account status to active after successful OTP verification
      await clientAccount.updateStatus('active');

      // Delete temporary registration data (no longer needed)
      await TempRegistrationData.delete(accountId);

      // Notify admins about new client registration requiring residency verification
      try {
        const clientName = `${clientProfile.first_name} ${clientProfile.last_name}`.trim();

        await notificationService.createNotification({
          recipient_id: null,
          recipient_type: 'admin',
          type: 'new_client_registration',
          title: 'New Client Registration',
          message: `${clientName} (${clientProfile.email}) has registered and needs residency verification.`,
          data: {
            client_id: clientProfile.account_id,
            client_name: clientName,
            client_email: clientProfile.email,
            client_username: clientAccount.username,
            registration_date: new Date().toISOString()
          },
          priority: 'normal'
        });

        notificationService.sendToAdmins({
          type: 'new_client_registration',
          title: 'New Client Registration',
          message: `${clientName} (${clientProfile.email}) has registered and needs residency verification.`,
          data: {
            client_id: clientProfile.account_id,
            client_name: clientName,
            client_email: clientProfile.email,
            client_username: clientAccount.username,
            registration_date: new Date().toISOString()
          }
        });
      } catch (notificationError) {
        logger.error('Failed to send new client registration notification', {
          accountId: clientProfile.account_id,
          error: notificationError.message
        });
      }

      logger.info('Client email verified and registration completed', {
        accountId: clientProfile.account_id,
        email
      });

      return {
        success: true,
        message: 'Email verified successfully. Your account is now active. Please upload residency documents for verification to access document services.'
      };
    } catch (error) {
      logger.error('Email verification failed', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  // Helper method to get account ID by email
  static async getAccountIdByEmail(email) {
    try {
      // First check if profile exists (for existing users)
      const profile = await ClientProfile.findByEmail(email);
      if (profile) {
        return profile.account_id;
      }

      // If not, search in temp registration data
      // Get all client accounts and check their temp data
      const query = `
        SELECT account_id 
        FROM temp_registration_data 
        WHERE JSON_EXTRACT(profile_data, '$.email') = ? 
        AND expires_at > NOW()
      `;
      const results = await executeQuery(query, [email]);
      
      if (results.length > 0) {
        return results[0].account_id;
      }

      throw new Error('Account not found');
    } catch (error) {
      logger.error('Failed to get account ID by email', {
        email,
        error: error.message
      });
      throw error;
    }
  }

  // Client login
  static async login(credentials) {
    try {
      const { username, password } = credentials;

      // Find client account
      const clientAccount = await ClientAccount.findByUsername(username);
      if (!clientAccount) {
        throw new Error('Invalid username or password');
      }

      // Verify password
      const isPasswordValid = await clientAccount.verifyPassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid username or password');
      }

      // Check account status - only block for specific statuses
      if (clientAccount.status === 'suspended') {
        throw new Error('Account is suspended. Please contact administrator.');
      }

      if (clientAccount.status === 'inactive') {
        throw new Error('Account is inactive. Please contact administrator.');
      }

      if (clientAccount.status === 'pending_verification') {
        throw new Error('Account is pending verification. Please complete your registration.');
      }

      // Allow login for active accounts
      // Residency verification status is managed separately and doesn't block login
      // Users with active accounts can log in but may have restricted access to document services
      // based on their residency verification status in the residency_documents table

      // Update last login
      await clientAccount.updateLastLogin();

      // Get account with profile
      const accountWithProfile = await clientAccount.getWithProfile();

      // Generate token
      const token = this.generateToken(clientAccount.id);

      logger.info('Client login successful', {
        clientId: clientAccount.id,
        username: clientAccount.username
      });

      return {
        success: true,
        data: {
          client: {
            id: clientAccount.id,
            username: clientAccount.username,
            status: clientAccount.status,
            email_verified: clientAccount.email_verified,
            phone_verified: clientAccount.phone_verified,
            profile: accountWithProfile ? {
              first_name: accountWithProfile.first_name,
              last_name: accountWithProfile.last_name,
              email: accountWithProfile.email,
              phone_number: accountWithProfile.phone_number,
              profile_picture: accountWithProfile.profile_picture,
              is_verified: accountWithProfile.profile_verified
            } : null
          },
          token
        },
        message: 'Login successful'
      };
    } catch (error) {
      logger.error('Client login failed', {
        username: credentials.username,
        error: error.message
      });
      throw error;
    }
  }

  // Get client profile
  static async getProfile(clientId) {
    try {
      const clientAccount = await ClientAccount.findById(clientId);
      if (!clientAccount) {
        throw new Error('Account not found');
      }

      const accountWithProfile = await clientAccount.getWithProfile();
      
      return {
        success: true,
        data: accountWithProfile
      };
    } catch (error) {
      logger.error('Failed to get client profile', {
        clientId,
        error: error.message
      });
      throw error;
    }
  }

  // Resend verification email
  static async resendVerificationEmail(email) {
    try {
      const clientProfile = await ClientProfile.findByEmail(email);
      if (!clientProfile) {
        throw new Error('Email not found');
      }

      const clientAccount = await ClientAccount.findById(clientProfile.account_id);
      if (clientAccount.email_verified) {
        throw new Error('Email is already verified');
      }

      await otpService.resendOTP(
        email,
        'email_verification',
        clientProfile.first_name
      );

      return {
        success: true,
        message: 'Verification email sent successfully'
      };
    } catch (error) {
      logger.error('Failed to resend verification email', {
        email,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = ClientAuthService;
