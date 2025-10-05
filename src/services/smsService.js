const axios = require('axios');
const logger = require('../utils/logger');

/**
 * SMS Service using TextBee API
 * Handles sending SMS notifications for document status changes and account events
 */
class SMSService {
  constructor() {
    this.baseURL = 'https://api.textbee.dev/api/v1';

    // Not final api but working
    // this.apiKey = '8b8f9e20-0f2b-4949-b8a6-877f56e0b399';
    // this.deviceId = '68c85987c27bd0d0b9608142';

    // Rhai
    this.apiKey = 'f307cb44-b5e2-4733-b484-975613392987';
    this.deviceId = '68c9071fc27bd0d0b9674cac';
    this.enabled = process.env.SMS_ENABLED !== 'false'; // Enable by default

    // Log SMS service initialization
    logger.info('SMS Service initialized', {
      enabled: this.enabled,
      baseURL: this.baseURL,
      deviceId: this.deviceId
    });
  }

  /**
   * Send SMS message
   * @param {string|string[]} recipients - Phone number(s) to send SMS to
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} SMS sending result
   */
  async sendSMS(recipients, message) {
    try {
      if (!this.enabled) {
        logger.info('SMS service disabled, skipping SMS send', { recipients, message });
        return { success: true, message: 'SMS service disabled' };
      }

      // Ensure recipients is an array
      const recipientArray = Array.isArray(recipients) ? recipients : [recipients];
      
      // Validate and format phone numbers
      const formattedRecipients = recipientArray.map(phone => this.formatPhoneNumber(phone));
      
      // Filter out invalid phone numbers
      const validRecipients = formattedRecipients.filter(phone => phone !== null);
      
      if (validRecipients.length === 0) {
        logger.warn('No valid phone numbers found', { originalRecipients: recipients });
        return { success: false, message: 'No valid phone numbers' };
      }

      // Truncate message if too long (SMS limit is typically 160 characters)
      const truncatedMessage = message.length > 160 ? message.substring(0, 157) + '...' : message;

      logger.info('Sending SMS via TextBee API', {
        recipients: validRecipients,
        messageLength: truncatedMessage.length,
        deviceId: this.deviceId
      });

      const response = await axios.post(
        `${this.baseURL}/gateway/devices/${this.deviceId}/send-sms`,
        {
          recipients: validRecipients,
          message: truncatedMessage
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      logger.info('SMS sent successfully via TextBee', {
        recipients: validRecipients,
        response: response.data
      });

      return {
        success: true,
        data: response.data,
        message: 'SMS sent successfully'
      };

    } catch (error) {
      logger.error('Failed to send SMS via TextBee', {
        recipients,
        message,
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });

      return {
        success: false,
        error: error.message,
        message: 'Failed to send SMS'
      };
    }
  }

  /**
   * Format and validate phone number
   * @param {string} phoneNumber - Raw phone number
   * @returns {string|null} Formatted phone number or null if invalid
   */
  formatPhoneNumber(phoneNumber) {
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return null;
    }

    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    // Handle Philippine phone numbers
    if (cleaned.startsWith('63')) {
      // Already has country code
      return '+' + cleaned;
    } else if (cleaned.startsWith('09')) {
      // Mobile number starting with 09, add PH country code
      return '+63' + cleaned.substring(1);
    } else if (cleaned.length === 10 && cleaned.startsWith('9')) {
      // Mobile number without leading 0, add PH country code
      return '+63' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('09')) {
      // Standard PH mobile format
      return '+63' + cleaned.substring(1);
    }

    // If we can't determine the format, return null
    logger.warn('Unable to format phone number', { originalNumber: phoneNumber, cleaned });
    return null;
  }

  /**
   * Generate SMS message for document status change
   * @param {Object} requestData - Document request data
   * @returns {string} SMS message
   */
  generateStatusChangeMessage(requestData) {
    const { clientName, documentType, requestNumber, newStatus } = requestData;
    
    // Old message
    // const statusMessages = {
    //   'pending': `Hi ${clientName}, your ${documentType} request #${requestNumber} is pending review.`,
    //   'under_review': `Hi ${clientName}, your ${documentType} request #${requestNumber} is under review.`,
    //   'approved': `Hi ${clientName}, your ${documentType} request #${requestNumber} has been approved!`,
    //   'rejected': `Hi ${clientName}, your ${documentType} request #${requestNumber} was rejected. Check your account for details.`,
    //   'processing': `Hi ${clientName}, your ${documentType} request #${requestNumber} is being processed.`,
    //   'ready_for_pickup': `Hi ${clientName}, your ${documentType} request #${requestNumber} is ready for pickup!`,
    //   'completed': `Hi ${clientName}, your ${documentType} request #${requestNumber} has been completed.`,
    //   'cancelled': `Hi ${clientName}, your ${documentType} request #${requestNumber} has been cancelled.`,
    //   'payment_confirmed': `Hi ${clientName}, payment confirmed for ${documentType} request #${requestNumber}.`,
    //   'payment_failed': `Hi ${clientName}, payment failed for ${documentType} request #${requestNumber}. Please try again.`
    // };
    
    const statusMessages = {
      'pending': `Barangay Bula Document Hub: Dear ${clientName}, your ${documentType} request #${requestNumber} is pending review. We'll notify you soon.`,
      'under_review': `Barangay Bula Document Hub: Dear ${clientName}, your ${documentType} request #${requestNumber} is under review. Expect an update shortly.`,
      'approved': `Barangay Bula Document Hub: Great news, ${clientName}! Your ${documentType} request #${requestNumber} is approved! Watch for our next update.`,
      'rejected': `Barangay Bula Document Hub: Dear ${clientName}, your ${documentType} request #${requestNumber} was rejected. Contact barangaybula45@gmail.com.`,
      'processing': `Barangay Bula Document Hub: Dear ${clientName}, your ${documentType} request #${requestNumber} is being processed. Stay tuned!`,
      'ready_for_pickup': `Barangay Bula Document Hub: Good news, ${clientName}! Your ${documentType} request #${requestNumber} is ready for pickup.`,
      'completed': `Barangay Bula Document Hub: Congrats, ${clientName}! Your ${documentType} request #${requestNumber} is completed. Thank you!`,
      'cancelled': `Barangay Bula Document Hub: Dear ${clientName}, your ${documentType} request #${requestNumber} was cancelled. Contact barangaybula45@gmail.com for help.`,
      'payment_confirmed': `Barangay Bula Document Hub: Success, ${clientName}! Payment for ${documentType} request #${requestNumber} is confirmed.`,
      'payment_failed': `Barangay Bula Document Hub: Dear ${clientName}, payment for ${documentType} #${requestNumber} failed. Retry or contact barangaybula45@gmail.com.`
    };

    return statusMessages[newStatus.toLowerCase()] || 
           `Hi ${clientName}, your ${documentType} request #${requestNumber} status: ${newStatus}. Check your account for details.`;
  }

  /**
   * Generate SMS message for account status change
   * @param {Object} accountData - Account data
   * @returns {string} SMS message
   */
  generateAccountStatusMessage(accountData) {
    const { clientName, status, reason } = accountData;
    
    const statusMessages = {
      'approved': `Hi ${clientName}, your barangay account has been approved! You can now request documents.`,
      'rejected': `Hi ${clientName}, your barangay account was rejected. ${reason ? reason : 'Please contact the barangay office.'}`,
      'suspended': `Hi ${clientName}, your barangay account has been suspended. Please contact the barangay office.`,
      'active': `Hi ${clientName}, your barangay account is now active. You can request documents.`,
      'residency_approved': `Hi ${clientName}, your residency verification has been approved! You can now request documents.`,
      'residency_rejected': `Hi ${clientName}, your residency verification was rejected. Please resubmit required documents.`
    };

    return statusMessages[status.toLowerCase()] || 
           `Hi ${clientName}, your account status has been updated to: ${status}. Check your account for details.`;
  }

  /**
   * Send document status change SMS
   * @param {Object} requestData - Document request data with client info
   * @returns {Promise<Object>} SMS sending result
   */
  async sendStatusChangeSMS(requestData) {
    try {
      const { phoneNumber, clientName, documentType, requestNumber, newStatus } = requestData;
      
      if (!phoneNumber) {
        logger.warn('No phone number provided for status change SMS', { requestData });
        return { success: false, message: 'No phone number provided' };
      }

      const message = this.generateStatusChangeMessage({
        clientName,
        documentType,
        requestNumber,
        newStatus
      });

      return await this.sendSMS(phoneNumber, message);
    } catch (error) {
      logger.error('Failed to send status change SMS', { requestData, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send account status change SMS
   * @param {Object} accountData - Account data with client info
   * @returns {Promise<Object>} SMS sending result
   */
  async sendAccountStatusSMS(accountData) {
    try {
      const { phoneNumber, clientName, status, reason } = accountData;
      
      if (!phoneNumber) {
        logger.warn('No phone number provided for account status SMS', { accountData });
        return { success: false, message: 'No phone number provided' };
      }

      const message = this.generateAccountStatusMessage({
        clientName,
        status,
        reason
      });

      return await this.sendSMS(phoneNumber, message);
    } catch (error) {
      logger.error('Failed to send account status SMS', { accountData, error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Test SMS functionality
   * @param {string} phoneNumber - Test phone number
   * @returns {Promise<Object>} Test result
   */
  async testSMS(phoneNumber) {
    const testMessage = 'Test message from Barangay Document Management System. SMS notifications are working!';
    return await this.sendSMS(phoneNumber, testMessage);
  }

  /**
   * Get SMS service status
   * @returns {Object} Service status
   */
  getStatus() {
    return {
      enabled: this.enabled,
      apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : 'Not configured',
      deviceId: this.deviceId,
      baseURL: this.baseURL
    };
  }
}

module.exports = new SMSService();
