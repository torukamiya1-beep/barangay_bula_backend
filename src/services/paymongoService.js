const axios = require('axios');
const crypto = require('crypto');
const logger = require('../utils/logger');

class PayMongoService {
  constructor() {
    this.baseURL = process.env.PAYMONGO_BASE_URL || 'https://api.paymongo.com/v1';
    this.secretKey = process.env.PAYMONGO_SECRET_KEY;
    this.publicKey = process.env.PAYMONGO_PUBLIC_KEY;
    this.webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;

    if (!this.secretKey) {
      logger.warn('⚠️  PayMongo secret key not configured. Payment service will not work.');
      this.secretKey = null;
      this.api = null;
      return;
    }

    // Create axios instance with default config
    this.api = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(this.secretKey + ':').toString('base64')}`
      }
    });
  }

  /**
   * Create a PayMongo Link (Hosted Payment Page)
   * @param {Object} linkData - Link information
   * @param {number} linkData.amount - Amount in centavos (e.g., 10000 = ₱100.00)
   * @param {string} linkData.description - Payment description
   * @param {string} linkData.remarks - Additional remarks
   * @param {Object} linkData.metadata - Additional metadata
   * @returns {Promise<Object>} PayMongo link response
   */
  async createPaymentLink(linkData) {
    if (!this.api) {
      throw new Error('PayMongo service not configured. Please set PAYMONGO_SECRET_KEY environment variable.');
    }

    try {
      const {
        amount,
        description,
        remarks = '',
        metadata = {}
      } = linkData;

      // Validate amount (must be in centavos)
      if (!amount || amount < 100) {
        throw new Error('Amount must be at least 100 centavos (₱1.00)');
      }

      const payload = {
        data: {
          attributes: {
            amount: parseInt(amount),
            description
            // Note: PayMongo Links API only supports amount and description
            // remarks and metadata are not supported for Links API
          }
        }
      };

      // Log the exact payload being sent
      console.log('=== PAYMONGO PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));
      console.log('=== END PAYLOAD ===');

      const response = await this.api.post('/links', payload);

      logger.info('PayMongo payment link created successfully', {
        link_id: response.data.data.id,
        checkout_url: response.data.data.attributes.checkout_url,
        amount,
        status: response.data.data.attributes.status
      });

      return response.data;
    } catch (error) {
      console.log('=== PAYMONGO ERROR ===');
      console.log('Status:', error.response?.status);
      console.log('Status Text:', error.response?.statusText);
      console.log('Error Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Request Amount:', linkData.amount);
      console.log('Request Description:', linkData.description);
      console.log('=== END ERROR ===');
      throw new Error(`PayMongo payment link creation failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a PayMongo Link
   * @param {string} linkId - PayMongo link ID
   * @returns {Promise<Object>} PayMongo link data
   */
  async retrievePaymentLink(linkId) {
    try {
      logger.info('Retrieving PayMongo payment link', { linkId });

      const response = await this.api.get(`/links/${linkId}`);

      logger.info('PayMongo payment link retrieved successfully', {
        link_id: linkId,
        status: response.data.data.attributes.status
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to retrieve PayMongo payment link', {
        error: error.message,
        linkId,
        response: error.response?.data
      });
      throw new Error(`PayMongo payment link retrieval failed: ${error.message}`);
    }
  }

  /**
   * Create a PayMongo Checkout Session (alias for createPaymentLink)
   * @param {Object} sessionData - Session information
   * @param {number} sessionData.amount - Amount in centavos
   * @param {string} sessionData.description - Payment description
   * @param {string} sessionData.success_url - Success URL (not used by Links API)
   * @param {string} sessionData.cancel_url - Cancel URL (not used by Links API)
   * @param {string} sessionData.customer_email - Customer email (not used by Links API)
   * @returns {Promise<Object>} PayMongo link response (formatted as checkout session)
   */
  async createCheckoutSession(sessionData) {
    try {
      // PayMongo doesn't have checkout sessions, so we use Links API instead
      const linkData = {
        amount: sessionData.amount,
        description: sessionData.description
        // Note: PayMongo Links API doesn't support success_url, cancel_url, or customer_email
      };

      const linkResponse = await this.createPaymentLink(linkData);

      // Transform the response to match checkout session format expected by fallback service
      return {
        data: {
          id: linkResponse.data.id,
          attributes: {
            checkout_url: linkResponse.data.attributes.checkout_url,
            status: linkResponse.data.attributes.status,
            created_at: linkResponse.data.attributes.created_at,
            expires_at: linkResponse.data.attributes.archived_at
          }
        }
      };
    } catch (error) {
      logger.error('Failed to create checkout session (using Links API)', {
        error: error.message,
        sessionData
      });
      throw error;
    }
  }

  /**
   * Create a PayMongo Payment Intent
   * @param {Object} paymentData - Payment information
   * @param {number} paymentData.amount - Amount in centavos (e.g., 5000 = ₱50.00)
   * @param {string} paymentData.currency - Currency code (default: PHP)
   * @param {string} paymentData.description - Payment description
   * @param {Object} paymentData.metadata - Additional metadata
   * @returns {Promise<Object>} PayMongo payment intent response
   */
  async createPaymentIntent(paymentData) {
    try {
      const {
        amount,
        currency = 'PHP',
        description,
        metadata = {},
        payment_method_allowed = ['card', 'gcash', 'grab_pay', 'paymaya'],
        capture_type = 'automatic'
      } = paymentData;

      // Validate amount (must be in centavos)
      if (!amount || amount < 100) {
        throw new Error('Amount must be at least 100 centavos (₱1.00)');
      }

      const payload = {
        data: {
          attributes: {
            amount: parseInt(amount),
            currency,
            description,
            payment_method_allowed,
            capture_type,
            metadata
          }
        }
      };

      logger.info('Creating PayMongo payment intent', {
        amount,
        currency,
        description,
        payment_method_allowed
      });

      const response = await this.api.post('/payment_intents', payload);
      
      logger.info('PayMongo payment intent created successfully', {
        payment_intent_id: response.data.data.id,
        amount,
        status: response.data.data.attributes.status
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create PayMongo payment intent', {
        error: error.message,
        response: error.response?.data,
        paymentData
      });
      throw new Error(`PayMongo payment intent creation failed: ${error.message}`);
    }
  }

  /**
   * Retrieve a PayMongo Payment Intent
   * @param {string} paymentIntentId - PayMongo payment intent ID
   * @returns {Promise<Object>} PayMongo payment intent data
   */
  async retrievePaymentIntent(paymentIntentId) {
    try {
      logger.info('Retrieving PayMongo payment intent', { paymentIntentId });

      const response = await this.api.get(`/payment_intents/${paymentIntentId}`);
      
      logger.info('PayMongo payment intent retrieved successfully', {
        payment_intent_id: paymentIntentId,
        status: response.data.data.attributes.status
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to retrieve PayMongo payment intent', {
        error: error.message,
        paymentIntentId,
        response: error.response?.data
      });
      throw new Error(`PayMongo payment intent retrieval failed: ${error.message}`);
    }
  }

  /**
   * Create a PayMongo Payment Method
   * @param {Object} paymentMethodData - Payment method information
   * @param {string} paymentMethodData.type - Payment method type (card, gcash, etc.)
   * @param {Object} paymentMethodData.details - Payment method specific details
   * @returns {Promise<Object>} PayMongo payment method response
   */
  async createPaymentMethod(paymentMethodData) {
    try {
      const { type, details, billing = null } = paymentMethodData;

      const payload = {
        data: {
          attributes: {
            type,
            details,
            billing
          }
        }
      };

      logger.info('Creating PayMongo payment method', { type });

      const response = await this.api.post('/payment_methods', payload);
      
      logger.info('PayMongo payment method created successfully', {
        payment_method_id: response.data.data.id,
        type
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to create PayMongo payment method', {
        error: error.message,
        response: error.response?.data,
        paymentMethodData
      });
      throw new Error(`PayMongo payment method creation failed: ${error.message}`);
    }
  }

  /**
   * Attach Payment Method to Payment Intent
   * @param {string} paymentIntentId - PayMongo payment intent ID
   * @param {string} paymentMethodId - PayMongo payment method ID
   * @param {string} returnUrl - URL to redirect after payment
   * @returns {Promise<Object>} PayMongo attach response
   */
  async attachPaymentMethod(paymentIntentId, paymentMethodId, returnUrl) {
    try {
      const payload = {
        data: {
          attributes: {
            payment_method: paymentMethodId,
            return_url: returnUrl
          }
        }
      };

      logger.info('Attaching payment method to payment intent', {
        paymentIntentId,
        paymentMethodId,
        returnUrl
      });

      const response = await this.api.post(`/payment_intents/${paymentIntentId}/attach`, payload);
      
      logger.info('Payment method attached successfully', {
        payment_intent_id: paymentIntentId,
        status: response.data.data.attributes.status,
        next_action: response.data.data.attributes.next_action
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to attach payment method', {
        error: error.message,
        response: error.response?.data,
        paymentIntentId,
        paymentMethodId
      });
      throw new Error(`PayMongo payment method attachment failed: ${error.message}`);
    }
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw webhook payload
   * @param {string} signature - PayMongo signature header
   * @returns {boolean} True if signature is valid
   */
  verifyWebhookSignature(payload, signature) {
    try {
      // For development/testing, always allow webhooks
      if (process.env.NODE_ENV === 'development' || !this.webhookSecret) {
        logger.warn('Development mode: skipping webhook signature verification');
        return true;
      }

      // PayMongo uses HMAC SHA256 for webhook signatures
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload, 'utf8')
        .digest('hex');

      // PayMongo signature format: "t=timestamp,v1=signature"
      const signatureElements = signature.split(',');
      const versionedSignature = signatureElements.find(element => element.startsWith('v1='));
      
      if (!versionedSignature) {
        logger.error('Invalid webhook signature format', { signature });
        return false;
      }

      const receivedSignature = versionedSignature.split('=')[1];
      const isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(receivedSignature, 'hex')
      );

      logger.info('Webhook signature verification', {
        isValid,
        hasWebhookSecret: !!this.webhookSecret
      });

      return isValid;
    } catch (error) {
      logger.error('Webhook signature verification failed', {
        error: error.message,
        signature
      });
      return false;
    }
  }

  /**
   * Process webhook event
   * @param {Object} webhookData - Webhook event data
   * @returns {Object} Processed webhook information
   */
  processWebhookEvent(webhookData) {
    try {
      const { data } = webhookData;
      const eventType = data.attributes.type;
      const eventData = data.attributes.data;

      logger.info('Processing PayMongo webhook event', {
        eventType,
        eventId: data.id,
        resourceType: eventData.type,
        resourceId: eventData.id
      });

      return {
        eventId: data.id,
        eventType,
        resourceType: eventData.type,
        resourceId: eventData.id,
        resourceData: eventData.attributes,
        createdAt: data.attributes.created_at,
        livemode: data.attributes.livemode
      };
    } catch (error) {
      logger.error('Failed to process webhook event', {
        error: error.message,
        webhookData
      });
      throw new Error(`Webhook event processing failed: ${error.message}`);
    }
  }

  /**
   * Get payment method configuration for frontend
   * @returns {Object} Payment method configuration
   */
  getPaymentMethodConfig() {
    return {
      publicKey: this.publicKey,
      allowedMethods: ['card', 'gcash', 'grab_pay', 'paymaya'],
      currency: 'PHP',
      baseURL: this.baseURL
    };
  }

  /**
   * Convert amount from PHP to centavos
   * @param {number} amount - Amount in PHP
   * @returns {number} Amount in centavos
   */
  static convertToCentavos(amount) {
    return Math.round(parseFloat(amount) * 100);
  }

  /**
   * Convert amount from centavos to PHP
   * @param {number} centavos - Amount in centavos
   * @returns {number} Amount in PHP
   */
  static convertToPhp(centavos) {
    return parseFloat(centavos) / 100;
  }
}

module.exports = PayMongoService;
