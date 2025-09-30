const PayMongoService = require('./paymongoService');
const logger = require('../utils/logger');

/**
 * Payment Fallback Service
 * Handles PayMongo service issues with multiple fallback strategies
 */
class PaymentFallbackService {
  constructor() {
    this.paymongoService = new PayMongoService();
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
  }

  /**
   * Create payment with fallback strategies
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment result
   */
  async createPaymentWithFallback(paymentData) {
    const strategies = [
      { name: 'Checkout Session', method: 'createCheckoutSession' },
      { name: 'Payment Intent', method: 'createPaymentIntent' },
      { name: 'Retry Checkout Session', method: 'createCheckoutSessionWithRetry' }
    ];

    let lastError = null;

    for (const strategy of strategies) {
      try {
        logger.info(`Attempting payment creation with strategy: ${strategy.name}`);
        
        const result = await this[strategy.method](paymentData);
        
        logger.info(`Payment creation successful with strategy: ${strategy.name}`, {
          strategy: strategy.name,
          paymentId: result.data.id
        });

        return {
          success: true,
          strategy: strategy.name,
          data: result,
          message: `Payment created successfully using ${strategy.name}`
        };

      } catch (error) {
        logger.warn(`Payment strategy failed: ${strategy.name}`, {
          strategy: strategy.name,
          error: error.message,
          status: error.response?.status
        });

        lastError = error;

        // If it's a 500 error, try next strategy immediately
        if (error.response?.status === 500) {
          continue;
        }

        // For other errors, wait before trying next strategy
        await this.delay(1000);
      }
    }

    // All strategies failed
    throw new Error(`All payment strategies failed. Last error: ${lastError.message}`);
  }

  /**
   * Create checkout session (primary strategy)
   */
  async createCheckoutSession(paymentData) {
    const sessionData = {
      amount: paymentData.amount,
      description: paymentData.description,
      success_url: paymentData.success_url,
      cancel_url: paymentData.cancel_url,
      customer_email: paymentData.customer_email
    };

    return await this.paymongoService.createCheckoutSession(sessionData);
  }

  /**
   * Create payment intent (fallback strategy)
   */
  async createPaymentIntent(paymentData) {
    const intentData = {
      amount: paymentData.amount,
      description: paymentData.description,
      customer_email: paymentData.customer_email,
      metadata: paymentData.metadata || {}
    };

    const result = await this.paymongoService.createPaymentIntent(intentData);

    // Transform Payment Intent response to match Checkout Session format
    return {
      data: {
        id: result.data.id,
        attributes: {
          checkout_url: this.generatePaymentIntentUrl(result.data.id, result.data.attributes.client_secret),
          status: result.data.attributes.status,
          created_at: result.data.attributes.created_at,
          expires_at: null // Payment Intents don't expire like checkout sessions
        }
      }
    };
  }

  /**
   * Create checkout session with retry logic
   */
  async createCheckoutSessionWithRetry(paymentData) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        logger.info(`Checkout session retry attempt ${attempt}/${this.maxRetries}`);
        
        const result = await this.createCheckoutSession(paymentData);
        
        logger.info(`Checkout session created successfully on attempt ${attempt}`);
        return result;

      } catch (error) {
        lastError = error;
        
        if (attempt < this.maxRetries) {
          logger.warn(`Checkout session attempt ${attempt} failed, retrying...`, {
            attempt,
            error: error.message,
            nextRetryIn: this.retryDelay
          });
          
          await this.delay(this.retryDelay);
          // Increase delay for next retry
          this.retryDelay *= 1.5;
        }
      }
    }

    throw lastError;
  }

  /**
   * Validate checkout session health
   * @param {string} sessionId - Checkout session ID
   * @returns {Promise<boolean>} True if session is healthy
   */
  async validateCheckoutSession(sessionId) {
    try {
      const api = this.paymongoService.api;
      const response = await api.get(`/checkout_sessions/${sessionId}`);
      
      const status = response.data.data.attributes.status;
      return status === 'active' || status === 'paid';
      
    } catch (error) {
      logger.warn('Checkout session validation failed', {
        sessionId,
        error: error.message,
        status: error.response?.status
      });
      
      return false;
    }
  }

  /**
   * Get payment status with fallback
   * @param {string} paymentId - Payment ID (session or intent)
   * @param {string} type - 'session' or 'intent'
   * @returns {Promise<Object>} Payment status
   */
  async getPaymentStatus(paymentId, type = 'session') {
    try {
      const api = this.paymongoService.api;
      const endpoint = type === 'session' ? `/checkout_sessions/${paymentId}` : `/payment_intents/${paymentId}`;
      
      const response = await api.get(endpoint);
      
      return {
        success: true,
        status: response.data.data.attributes.status,
        data: response.data.data
      };
      
    } catch (error) {
      logger.error('Payment status check failed', {
        paymentId,
        type,
        error: error.message
      });
      
      return {
        success: false,
        error: error.message,
        status: 'unknown'
      };
    }
  }

  /**
   * Generate payment intent URL (DEPRECATED - should use PayMongo Links instead)
   * @param {string} intentId - Payment intent ID
   * @param {string} clientSecret - Client secret
   * @returns {string} Payment intent URL
   * @deprecated This method creates localhost URLs instead of proper PayMongo checkout URLs
   */
  
  // generatePaymentIntentUrl(intentId, clientSecret) {
  //   // This method was creating localhost URLs which is incorrect
  //   // PayMongo payment intents don't have direct checkout URLs like Links do
  //   // This is why the system should use PayMongo Links API instead

  //   console.warn('⚠️ generatePaymentIntentUrl called - this creates incorrect localhost URLs');
  //   console.warn('⚠️ Use PayMongo Links API instead for proper checkout URLs');

  //   // Return a localhost URL that will be caught by the route handler and show an error
  //   return `http://localhost:8081/payment/intent?intent_id=${intentId}&client_secret=${clientSecret}`;
  // }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Test checkout session creation
   * @returns {Promise<Object>} Test result
   */
  async testCheckoutSessionCreation() {
    const testData = {
      amount: 10000, // ₱100.00 in centavos
      description: 'Test checkout session creation',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
      customer_email: 'test@example.com'
    };

    return await this.paymongoService.createCheckoutSession(testData);
  }

  /**
   * Test payment intent creation
   * @returns {Promise<Object>} Test result
   */
  async testPaymentIntentCreation() {
    const testData = {
      amount: 10000, // ₱100.00 in centavos
      description: 'Test payment intent creation',
      customer_email: 'test@example.com'
    };

    return await this.paymongoService.createPaymentIntent(testData);
  }

  /**
   * Check PayMongo service health
   * @returns {Promise<Object>} Service health status
   */
  async checkServiceHealth() {
    const healthChecks = [
      { name: 'Checkout Sessions', test: () => this.testCheckoutSessionCreation() },
      { name: 'Payment Intents', test: () => this.testPaymentIntentCreation() }
    ];

    const results = {};

    for (const check of healthChecks) {
      try {
        await check.test();
        results[check.name] = { status: 'healthy', error: null };
      } catch (error) {
        results[check.name] = {
          status: 'unhealthy',
          error: error.message,
          statusCode: error.response?.status
        };
      }
    }

    return results;
  }
}

module.exports = PaymentFallbackService;
