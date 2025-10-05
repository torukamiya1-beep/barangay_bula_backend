const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.logger = logger;
    this.initializeTransporter();
  }

  // Initialize Gmail SMTP transporter
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        },
        tls: {
          rejectUnauthorized: false
        },
        // Add connection timeout to prevent hanging
        connectionTimeout: 10000, // 10 seconds
        greetingTimeout: 10000, // 10 seconds
        socketTimeout: 15000 // 15 seconds
      });

      this.logger.info('Email transporter initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize email transporter:', { error: error.message });
      throw error;
    }
  }

  // Verify email configuration
  async verifyConnection() {
    try {
      await this.transporter.verify();
      this.logger.info('Email connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('Email connection verification failed:', { error: error.message });
      throw new Error('Email service configuration is invalid');
    }
  }

  // Send email
  async sendEmail(to, subject, htmlContent, textContent = null) {
    try {
      const mailOptions = {
        from: {
          name: process.env.EMAIL_FROM_NAME || 'Barangay Management System',
          address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
        },
        to: to,
        subject: subject,
        html: htmlContent,
        text: textContent || this.stripHtml(htmlContent)
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      this.logger.info('Email sent successfully', {
        to: to,
        subject: subject,
        messageId: result.messageId
      });

      return {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully'
      };
    } catch (error) {
      this.logger.error('Failed to send email:', {
        to: to,
        subject: subject,
        error: error.message
      });
      throw error;
    }
  }

  // Send OTP email
  async sendOTPEmail(email, otp, firstName = '') {
    try {
      const subject = 'Your OTP Code - Barangay Management System';
      
      const htmlContent = this.generateOTPEmailTemplate(otp, firstName);
      
      return await this.sendEmail(email, subject, htmlContent);
    } catch (error) {
      this.logger.error('Failed to send OTP email:', { email, error: error.message });
      throw error;
    }
  }

  // Send welcome email
  async sendWelcomeEmail(email, firstName, lastName) {
    try {
      const subject = 'Welcome to Barangay Management System';
      
      const htmlContent = this.generateWelcomeEmailTemplate(firstName, lastName);
      
      return await this.sendEmail(email, subject, htmlContent);
    } catch (error) {
      this.logger.error('Failed to send welcome email:', { email, error: error.message });
      throw error;
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email, resetToken, firstName = '') {
    try {
      const subject = 'Password Reset Request - Barangay Management System';

      const htmlContent = this.generatePasswordResetEmailTemplate(resetToken, firstName);

      return await this.sendEmail(email, subject, htmlContent);
    } catch (error) {
      this.logger.error('Failed to send password reset email:', { email, error: error.message });
      throw error;
    }
  }

  // Send account approval email
  async sendAccountApprovalEmail(email, firstName, lastName) {
    try {
      const subject = 'Account Approved - Barangay Management System';

      const htmlContent = this.generateAccountApprovalEmailTemplate(firstName, lastName);

      return await this.sendEmail(email, subject, htmlContent);
    } catch (error) {
      this.logger.error('Failed to send account approval email:', { email, error: error.message });
      throw error;
    }
  }

  // Send account rejection email
  async sendAccountRejectionEmail(email, firstName, lastName, rejectionReason) {
    try {
      const subject = 'Account Application Update - Barangay Management System';

      const htmlContent = this.generateAccountRejectionEmailTemplate(firstName, lastName, rejectionReason);

      return await this.sendEmail(email, subject, htmlContent);
    } catch (error) {
      this.logger.error('Failed to send account rejection email:', { email, error: error.message });
      throw error;
    }
  }

  // Generate OTP email template
  generateOTPEmailTemplate(otp, firstName) {
    const expiryMinutes = process.env.OTP_EXPIRY_MINUTES || 10;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f8f9fa; }
          .otp-code { font-size: 32px; font-weight: bold; color: #007bff; text-align: center; 
                     background-color: #e9ecef; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .warning { color: #dc3545; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Barangay Management System</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName ? firstName : 'User'}!</h2>
            <p>You have requested an OTP code for verification. Please use the code below:</p>
            
            <div class="otp-code">${otp}</div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This code will expire in <strong>${expiryMinutes} minutes</strong></li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this code, please ignore this email</li>
            </ul>
            
            <p class="warning">For security reasons, never share your OTP with anyone.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from Barangay Management System.</p>
            <p>If you have any questions, please contact your barangay administrator.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate welcome email template
  generateWelcomeEmailTemplate(firstName, lastName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f8f9fa; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Barangay Management System!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName} ${lastName}!</h2>
            <p>Welcome to our Barangay Management System. Your account has been successfully created.</p>
            
            <p>You can now:</p>
            <ul>
              <li>Access barangay services online</li>
              <li>Submit requests and applications</li>
              <li>Track your document status</li>
              <li>Receive important announcements</li>
            </ul>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
          </div>
          <div class="footer">
            <p>Thank you for joining our community!</p>
            <p>Barangay Management System</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate password reset email template
  generatePasswordResetEmailTemplate(resetToken, firstName) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background-color: #f8f9fa; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; 
                   color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName ? firstName : 'User'}!</h2>
            <p>You have requested to reset your password. Click the button below to proceed:</p>
            
            <a href="${resetUrl}" class="button">Reset Password</a>
            
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password will remain unchanged until you create a new one</li>
            </ul>
          </div>
          <div class="footer">
            <p>This is an automated message from Barangay Management System.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate account approval email template
  generateAccountApprovalEmailTemplate(firstName, lastName) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Approved</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px 0; }
          .content h2 { color: #28a745; margin-bottom: 20px; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
          .success-icon { font-size: 48px; color: #28a745; text-align: center; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Approved!</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2>Congratulations ${firstName} ${lastName}!</h2>
            <p>Your barangay account has been approved and is now active. You can now access all services and request documents through our system.</p>

            <p><strong>What you can do now:</strong></p>
            <ul>
              <li>Request barangay certificates and documents</li>
              <li>Track your document requests</li>
              <li>Update your profile information</li>
              <li>Access online services</li>
            </ul>

            <p>Thank you for choosing our barangay services. We're here to serve you!</p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/client/login" class="button">Login to Your Account</a>
          </div>
          <div class="footer">
            <p>This is an automated message from Barangay Management System.</p>
            <p>If you have any questions, please contact our office.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate account rejection email template
  generateAccountRejectionEmailTemplate(firstName, lastName, rejectionReason) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Application Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 20px 0; }
          .content h2 { color: #dc3545; margin-bottom: 20px; }
          .reason-box { background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Account Application Update</h1>
          </div>
          <div class="content">
            <h2>Dear ${firstName} ${lastName},</h2>
            <p>We have reviewed your barangay account application. Unfortunately, we need to request additional information or documentation before we can approve your account.</p>

            <div class="reason-box">
              <strong>Reason for additional review:</strong><br>
              ${rejectionReason}
            </div>

            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Please review the reason provided above</li>
              <li>Prepare the required documents or information</li>
              <li>Contact our office for assistance if needed</li>
              <li>Resubmit your application when ready</li>
            </ul>

            <p>We appreciate your understanding and look forward to serving you once your application is complete.</p>

            <a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/client/login" class="button">Visit Our Portal</a>
          </div>
          <div class="footer">
            <p>This is an automated message from Barangay Management System.</p>
            <p>For assistance, please visit our office or contact us during business hours.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Utility function to strip HTML tags
  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }
}

module.exports = new EmailService();
