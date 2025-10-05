const jwt = require('jsonwebtoken');
const ClientAccount = require('../models/ClientAccount');
const ClientProfile = require('../models/ClientProfile');
const ResidencyDocument = require('../models/ResidencyDocument');
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

  // Complete client registration (Step 2: Create profile)
  static async completeRegistration(accountId, profileData) {
    try {
      // Verify account exists
      const clientAccount = await ClientAccount.findById(accountId);
      if (!clientAccount) {
        throw new Error('Account not found');
      }

      // Check if profile already exists
      const existingProfile = await ClientProfile.findByAccountId(accountId);
      if (existingProfile) {
        // Profile already exists - check if account is already verified
        if (clientAccount.status === 'active' || clientAccount.status === 'verified') {
          throw new Error('Profile already exists for this account. Please log in instead.');
        }

        // If still pending verification, allow resending OTP
        logger.info('Profile already exists, resending OTP', {
          accountId,
          email: profileData.email
        });

        // Resend OTP (ASYNC - don't wait for it to complete)
        let otpSent = false;
        if (profileData.email || existingProfile.email) {
          // Fire and forget - send OTP in background
          otpService.generateAndSendUnifiedOTP(
            profileData.email || existingProfile.email,
            profileData.phone_number || existingProfile.phone_number,
            'email_verification',
            profileData.first_name || existingProfile.first_name
          ).then(() => {
            logger.info('Verification OTP resent successfully', {
              accountId,
              email: profileData.email || existingProfile.email
            });
          }).catch(otpError => {
            logger.warn('Failed to resend verification OTP (non-blocking)', {
              accountId,
              error: otpError.message
            });
          });

          // Assume OTP will be sent (optimistic response)
          otpSent = true;
        }

        return {
          success: true,
          data: {
            accountId,
            profileId: existingProfile.id,
            otpSent
          },
          message: otpSent
            ? 'Verification code resent. Please check your email.'
            : 'Profile already exists. Please verify your email to complete registration.'
        };
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

      // Create client profile
      const clientProfile = await ClientProfile.create({
        account_id: accountId,
        ...profileData
      });

      // Send unified OTP for verification (ASYNC - don't wait for it to complete)
      // This prevents SMS/email timeouts from blocking the registration response
      let otpSent = false;
      if (profileData.email) {
        // Fire and forget - send OTP in background
        otpService.generateAndSendUnifiedOTP(
          profileData.email,
          profileData.phone_number || null,
          'email_verification',
          profileData.first_name
        ).then(() => {
          logger.info('Verification OTP sent successfully', {
            accountId,
            email: profileData.email,
            phoneNumber: profileData.phone_number
          });
        }).catch(otpError => {
          logger.warn('Failed to send verification OTP (non-blocking)', {
            accountId,
            email: profileData.email,
            phoneNumber: profileData.phone_number,
            error: otpError.message
          });
        });

        // Assume OTP will be sent (optimistic response)
        otpSent = true;
      }

      logger.info('Client profile created', {
        accountId,
        profileId: clientProfile.id,
        email: profileData.email,
        otpSentAsync: otpSent
      });

      return {
        success: true,
        data: {
          accountId,
          profileId: clientProfile.id,
          otpSent
        },
        message: otpSent
          ? 'Profile created successfully. Please check your email for verification code.'
          : 'Profile created successfully.'
      };
    } catch (error) {
      logger.error('Client profile creation failed', {
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
      await otpService.verifyOTP(email, otp, 'email_verification');

      // Find profile by email
      const clientProfile = await ClientProfile.findByEmail(email);
      if (!clientProfile) {
        throw new Error('Profile not found');
      }

      // Update account email verification status
      const clientAccount = await ClientAccount.findById(clientProfile.account_id);
      await clientAccount.updateEmailVerification(true);

      // Update account status to active after successful OTP verification
      // This allows the client to log in immediately
      await clientAccount.updateStatus('active');

      // Note: We don't create a placeholder residency document here anymore
      // The client will need to upload actual residency documents
      // The residency verification status will be determined by the presence and status
      // of actual uploaded documents in the residency_documents table

      // Notify admins about new client registration requiring residency verification
      try {
        const clientName = `${clientProfile.first_name} ${clientProfile.last_name}`.trim();

        await notificationService.createNotification({
          recipient_id: null, // Broadcast to all admins
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

        // Send real-time notification to all admins
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

      logger.info('Client email verified', {
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
