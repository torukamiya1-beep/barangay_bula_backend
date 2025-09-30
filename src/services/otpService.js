const crypto = require('crypto');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');

class OTPService {
  constructor() {
    this.logger = logger;
  }

  // Generate random OTP
  generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  // Create OTP table if it doesn't exist and migrate if needed
  async createOTPTable() {
    try {
      // First, create the table with the original schema if it doesn't exist
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS otps (
          id INT AUTO_INCREMENT PRIMARY KEY,
          email VARCHAR(255) NOT NULL,
          otp_code VARCHAR(10) NOT NULL,
          purpose ENUM('registration', 'password_reset', 'email_verification', 'login') DEFAULT 'registration',
          expires_at DATETIME NOT NULL,
          is_used BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_email_purpose (email, purpose),
          INDEX idx_otp_code (otp_code),
          INDEX idx_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      await executeQuery(createTableQuery);
      this.logger.info('OTP table created or already exists');

      // Now check if we need to migrate the table to support SMS
      await this.migrateOTPTableForSMS();

    } catch (error) {
      this.logger.error('Failed to create OTP table:', { error: error.message });
      throw error;
    }
  }

  // Migrate OTP table to support SMS
  async migrateOTPTableForSMS() {
    try {
      // Check if phone_number column exists
      const checkColumnQuery = `
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'otps'
        AND COLUMN_NAME = 'phone_number'
      `;

      const columnExists = await executeQuery(checkColumnQuery);

      if (columnExists.length === 0) {
        this.logger.info('Migrating OTP table to support SMS...');

        // Add new columns
        const alterQueries = [
          'ALTER TABLE otps ADD COLUMN phone_number VARCHAR(20) NULL AFTER email',
          'ALTER TABLE otps ADD COLUMN delivery_method ENUM("email", "sms") DEFAULT "email" AFTER otp_code',
          'ALTER TABLE otps MODIFY COLUMN email VARCHAR(255) NULL',
          'ALTER TABLE otps ADD INDEX idx_phone_purpose (phone_number, purpose)'
        ];

        for (const query of alterQueries) {
          try {
            await executeQuery(query);
          } catch (alterError) {
            // Ignore errors for columns that might already exist
            if (!alterError.message.includes('Duplicate column name') &&
                !alterError.message.includes('Duplicate key name')) {
              throw alterError;
            }
          }
        }

        this.logger.info('OTP table migration completed successfully');
      } else {
        this.logger.info('OTP table already supports SMS');
      }
    } catch (error) {
      this.logger.error('Failed to migrate OTP table:', { error: error.message });
      throw error;
    }
  }

  // Generate and send OTP
  async generateAndSendOTP(email, purpose = 'registration', firstName = '') {
    try {
      // Ensure OTP table exists
      await this.createOTPTable();

      // Clean up expired OTPs for this email and purpose
      await this.cleanupExpiredOTPs(email, purpose);

      // Check if there's a recent valid OTP (rate limiting) - DISABLED
      // const recentOTP = await this.getRecentOTP(email, purpose);
      // if (recentOTP) {
      //   const timeLeft = Math.ceil((new Date(recentOTP.expires_at) - new Date()) / 1000 / 60);
      //   throw new Error(`Please wait ${timeLeft} minutes before requesting a new OTP`);
      // }

      // Generate new OTP
      const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
      const otp = this.generateOTP(otpLength);
      
      // Calculate expiry time
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Save OTP to database
      const insertQuery = `
        INSERT INTO otps (email, otp_code, delivery_method, purpose, expires_at)
        VALUES (?, ?, 'email', ?, ?)
      `;

      await executeQuery(insertQuery, [email, otp, purpose, expiresAt]);

      // Send OTP email
      await this.sendEmailOTP(email, otp, purpose, firstName, expiryMinutes);

      this.logger.info('OTP generated and sent successfully', {
        email,
        purpose,
        expiresAt
      });

      return {
        success: true,
        message: 'OTP sent successfully',
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to generate and send OTP:', {
        email,
        purpose,
        error: error.message
      });
      throw error;
    }
  }

  // Generate and send SMS OTP
  async generateAndSendSMSOTP(phoneNumber, purpose = 'registration', firstName = '') {
    try {
      // Ensure OTP table exists
      await this.createOTPTable();

      // Clean up expired OTPs for this phone number and purpose
      await this.cleanupExpiredSMSOTPs(phoneNumber, purpose);

      // Generate new OTP
      const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
      const otp = this.generateOTP(otpLength);

      // Calculate expiry time
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Save OTP to database
      const insertQuery = `
        INSERT INTO otps (phone_number, otp_code, delivery_method, purpose, expires_at)
        VALUES (?, ?, 'sms', ?, ?)
      `;

      await executeQuery(insertQuery, [phoneNumber, otp, purpose, expiresAt]);

      // Send OTP SMS
      const smsService = require('./smsService');
      const message = `Barangay Bula Document Hub: Your verification code is ${otp}. It expires in ${expiryMinutes} minutes. Do not share this code.`;
      await smsService.sendSMS(phoneNumber, message);

      this.logger.info('SMS OTP generated and sent successfully', {
        phoneNumber,
        purpose,
        expiresAt
      });

      return {
        success: true,
        message: 'SMS OTP sent successfully',
        expiresAt: expiresAt.toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to generate and send SMS OTP:', {
        phoneNumber,
        purpose,
        error: error.message
      });
      throw error;
    }
  }

  // Verify OTP
  async verifyOTP(identifier, otpCode, purpose = 'registration', deliveryMethod = 'email') {
    try {
      let findQuery, queryParams;

      if (deliveryMethod === 'sms') {
        // Find valid SMS OTP
        findQuery = `
          SELECT * FROM otps
          WHERE phone_number = ? AND otp_code = ? AND purpose = ? AND delivery_method = 'sms'
          AND expires_at > NOW() AND is_used = FALSE
          ORDER BY created_at DESC
          LIMIT 1
        `;
        queryParams = [identifier, otpCode, purpose];
      } else {
        // Find valid email OTP
        findQuery = `
          SELECT * FROM otps
          WHERE email = ? AND otp_code = ? AND purpose = ? AND delivery_method = 'email'
          AND expires_at > NOW() AND is_used = FALSE
          ORDER BY created_at DESC
          LIMIT 1
        `;
        queryParams = [identifier, otpCode, purpose];
      }

      const otpRecords = await executeQuery(findQuery, queryParams);

      if (otpRecords.length === 0) {
        throw new Error('Invalid or expired OTP');
      }

      const otpRecord = otpRecords[0];

      // Mark OTP as used
      const updateQuery = `
        UPDATE otps
        SET is_used = TRUE, updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [otpRecord.id]);

      this.logger.info('OTP verified successfully', {
        identifier,
        deliveryMethod,
        purpose,
        otpId: otpRecord.id
      });

      return {
        success: true,
        message: 'OTP verified successfully'
      };
    } catch (error) {
      this.logger.error('OTP verification failed:', {
        identifier,
        deliveryMethod,
        purpose,
        error: error.message
      });
      throw error;
    }
  }

  // Verify SMS OTP (convenience method)
  async verifySMSOTP(phoneNumber, otpCode, purpose = 'registration') {
    return await this.verifyOTP(phoneNumber, otpCode, purpose, 'sms');
  }

  // Get recent OTP (for rate limiting)
  async getRecentOTP(email, purpose) {
    const query = `
      SELECT * FROM otps 
      WHERE email = ? AND purpose = ? 
      AND expires_at > NOW() AND is_used = FALSE
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const results = await executeQuery(query, [email, purpose]);
    return results.length > 0 ? results[0] : null;
  }



  // Clean up expired OTPs
  async cleanupExpiredOTPs(email = null, purpose = null) {
    let query = 'DELETE FROM otps WHERE expires_at <= NOW()';
    const params = [];

    if (email && purpose) {
      query += ' AND email = ? AND purpose = ?';
      params.push(email, purpose);
    }

    try {
      const result = await executeQuery(query, params);
      this.logger.info('Expired OTPs cleaned up', {
        deletedCount: result.affectedRows,
        email,
        purpose
      });
    } catch (error) {
      this.logger.error('Failed to cleanup expired OTPs:', { error: error.message });
    }
  }

  // Clean up expired SMS OTPs
  async cleanupExpiredSMSOTPs(phoneNumber, purpose) {
    try {
      const deleteQuery = `
        DELETE FROM otps
        WHERE phone_number = ? AND purpose = ? AND (expires_at <= NOW() OR is_used = TRUE)
      `;

      const result = await executeQuery(deleteQuery, [phoneNumber, purpose]);
      this.logger.info('Expired SMS OTPs cleaned up', {
        phoneNumber,
        purpose,
        deletedCount: result.affectedRows
      });
    } catch (error) {
      this.logger.error('Failed to cleanup expired SMS OTPs:', { phoneNumber, purpose, error: error.message });
    }
  }

  // Clean up all expired OTPs (can be called periodically)
  async cleanupAllExpiredOTPs() {
    try {
      const result = await executeQuery('DELETE FROM otps WHERE expires_at <= NOW()');
      this.logger.info('All expired OTPs cleaned up', {
        deletedCount: result.affectedRows
      });
      return result.affectedRows;
    } catch (error) {
      this.logger.error('Failed to cleanup all expired OTPs:', { error: error.message });
      throw error;
    }
  }

  // Get OTP statistics
  async getOTPStats() {
    try {
      const statsQuery = `
        SELECT 
          purpose,
          COUNT(*) as total,
          SUM(CASE WHEN is_used = TRUE THEN 1 ELSE 0 END) as used,
          SUM(CASE WHEN expires_at > NOW() AND is_used = FALSE THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN expires_at <= NOW() AND is_used = FALSE THEN 1 ELSE 0 END) as expired
        FROM otps 
        GROUP BY purpose
      `;
      
      const stats = await executeQuery(statsQuery);
      return stats;
    } catch (error) {
      this.logger.error('Failed to get OTP stats:', { error: error.message });
      throw error;
    }
  }

  // Resend OTP (invalidate old one and send new)
  async resendOTP(email, purpose = 'registration', firstName = '') {
    try {
      // Invalidate any existing OTPs for this email and purpose
      const invalidateQuery = `
        UPDATE otps
        SET is_used = TRUE, updated_at = NOW()
        WHERE email = ? AND purpose = ? AND is_used = FALSE
      `;

      await executeQuery(invalidateQuery, [email, purpose]);

      // Generate and send new OTP
      return await this.generateAndSendOTP(email, purpose, firstName);
    } catch (error) {
      this.logger.error('Failed to resend OTP:', {
        email,
        purpose,
        error: error.message
      });
      throw error;
    }
  }

  // Resend SMS OTP (invalidate old one and send new)
  async resendSMSOTP(phoneNumber, purpose = 'registration', firstName = '') {
    try {
      // Invalidate any existing SMS OTPs for this phone number and purpose
      const invalidateQuery = `
        UPDATE otps
        SET is_used = TRUE, updated_at = NOW()
        WHERE phone_number = ? AND purpose = ? AND is_used = FALSE
      `;

      await executeQuery(invalidateQuery, [phoneNumber, purpose]);

      // Generate and send new SMS OTP
      return await this.generateAndSendSMSOTP(phoneNumber, purpose, firstName);
    } catch (error) {
      this.logger.error('Failed to resend SMS OTP:', {
        phoneNumber,
        purpose,
        error: error.message
      });
      throw error;
    }
  }

  // Generate and send unified OTP (same code via both email and SMS)
  async generateAndSendUnifiedOTP(email, phoneNumber, purpose = 'registration', firstName = '') {
    try {
      // Ensure OTP table exists
      await this.createOTPTable();

      // Clean up expired OTPs for both email and phone number with this purpose
      await this.cleanupExpiredOTPs(email, purpose);
      if (phoneNumber) {
        await this.cleanupExpiredSMSOTPs(phoneNumber, purpose);
      }

      // Generate single OTP
      const otpLength = parseInt(process.env.OTP_LENGTH) || 6;
      const otp = this.generateOTP(otpLength);

      // Calculate expiry time
      const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES) || 10;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

      // Save OTP to database for both email and SMS delivery methods
      const insertEmailQuery = `
        INSERT INTO otps (email, otp_code, delivery_method, purpose, expires_at)
        VALUES (?, ?, 'email', ?, ?)
      `;

      await executeQuery(insertEmailQuery, [email, otp, purpose, expiresAt]);

      if (phoneNumber) {
        const insertSMSQuery = `
          INSERT INTO otps (phone_number, otp_code, delivery_method, purpose, expires_at)
          VALUES (?, ?, 'sms', ?, ?)
        `;

        await executeQuery(insertSMSQuery, [phoneNumber, otp, purpose, expiresAt]);
      }

      // Send OTP via both channels simultaneously
      const promises = [];
      const results = [];

      // Send email OTP
      promises.push(
        this.sendEmailOTP(email, otp, purpose, firstName, expiryMinutes)
          .then(() => ({ type: 'email', success: true }))
          .catch(error => ({ type: 'email', success: false, error }))
      );

      // Send SMS OTP (only if phone number is provided)
      if (phoneNumber) {
        const smsService = require('./smsService');
        const message = `Barangay Bula Document Hub: Your verification code is ${otp}. It expires in ${expiryMinutes} minutes. Do not share this code.`;

        promises.push(
          smsService.sendSMS(phoneNumber, message)
            .then(() => ({ type: 'sms', success: true }))
            .catch(error => ({ type: 'sms', success: false, error }))
        );
      }

      // Wait for both to complete
      const allResults = await Promise.all(promises);

      const emailResult = allResults.find(r => r.type === 'email');
      const smsResult = allResults.find(r => r.type === 'sms');

      let successMessages = [];
      let errorMessages = [];

      if (emailResult?.success) {
        successMessages.push('Email OTP sent successfully');
      } else if (emailResult) {
        errorMessages.push('Failed to send email OTP');
        this.logger.error('Email OTP sending failed:', emailResult.error);
      }

      if (smsResult?.success) {
        successMessages.push('SMS OTP sent successfully');
      } else if (smsResult) {
        errorMessages.push('Failed to send SMS OTP');
        this.logger.error('SMS OTP sending failed:', smsResult.error);
      }

      this.logger.info('Unified OTP generated and sent', {
        email,
        phoneNumber,
        purpose,
        emailSuccess: emailResult?.success || false,
        smsSuccess: smsResult?.success || false,
        expiresAt
      });

      return {
        success: successMessages.length > 0,
        message: successMessages.length > 0 ? successMessages.join(' and ') : errorMessages.join(' and '),
        emailSent: emailResult?.success || false,
        smsSent: smsResult?.success || false,
        expiresAt: expiresAt.toISOString()
      };

    } catch (error) {
      this.logger.error('Failed to generate and send unified OTP:', {
        email,
        phoneNumber,
        purpose,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Helper method to send email OTP (extracted from generateAndSendOTP)
  async sendEmailOTP(email, otp, purpose, firstName, expiryMinutes) {
    const emailService = require('./emailService');

    let subject, htmlContent;

    if (purpose === 'registration' || purpose === 'email_verification') {
      subject = 'Verify Your Account - Barangay Bula Document Hub';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #007bff; margin: 0;">Barangay Bula Document Hub</h1>
              <p style="color: #6c757d; margin: 5px 0 0 0;">Official Document Management System</p>
            </div>

            <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Account Verification</h2>

            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Hello ${firstName || 'User'},
            </p>

            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              Thank you for registering with Barangay Bula Document Hub. To complete your account setup, please verify your email address using the verification code below:
            </p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
              <p style="color: #6c757d; margin: 0 0 10px 0; font-size: 14px;">Your Verification Code:</p>
              <h1 style="color: #007bff; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 0; font-family: 'Courier New', monospace;">${otp}</h1>
            </div>

            <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                <strong>⚠️ Important:</strong> This verification code will expire in <strong>${expiryMinutes} minutes</strong>.
                Please do not share this code with anyone for security reasons.
              </p>
            </div>

            <p style="color: #333; font-size: 16px; line-height: 1.6;">
              If you didn't request this verification, please ignore this email or contact our support team.
            </p>

            <div style="border-top: 1px solid #dee2e6; margin-top: 30px; padding-top: 20px; text-align: center;">
              <p style="color: #6c757d; font-size: 12px; margin: 0;">
                This is an automated message from Barangay Bula Document Hub.<br>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `;
    } else {
      subject = 'Your Verification Code - Barangay Bula Document Hub';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Verification Code</h2>
          <p>Your verification code is: <strong style="font-size: 24px; color: #007bff;">${otp}</strong></p>
          <p>This code will expire in ${expiryMinutes} minutes.</p>
          <p style="color: #666; font-size: 12px;">This is an automated message. Please do not reply.</p>
        </div>
      `;
    }

    return await emailService.sendEmail(email, subject, htmlContent);
  }

  // Resend unified OTP (invalidate old ones and send new unified OTP)
  async resendUnifiedOTP(email, phoneNumber, purpose = 'registration', firstName = '') {
    try {
      // Invalidate any existing OTPs for both email and phone number with this purpose
      const invalidateEmailQuery = `
        UPDATE otps
        SET is_used = TRUE, updated_at = NOW()
        WHERE email = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW()
      `;

      await executeQuery(invalidateEmailQuery, [email, purpose]);

      if (phoneNumber) {
        const invalidateSMSQuery = `
          UPDATE otps
          SET is_used = TRUE, updated_at = NOW()
          WHERE phone_number = ? AND purpose = ? AND is_used = FALSE AND expires_at > NOW()
        `;

        await executeQuery(invalidateSMSQuery, [phoneNumber, purpose]);
      }

      // Generate and send new unified OTP
      return await this.generateAndSendUnifiedOTP(email, phoneNumber, purpose, firstName);
    } catch (error) {
      this.logger.error('Failed to resend unified OTP:', {
        email,
        phoneNumber,
        purpose,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

module.exports = new OTPService();
