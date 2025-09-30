const axios = require('axios');
const logger = require('../utils/logger');
const { executeQuery } = require('../config/database');

class PaymentFetchService {
  constructor() {
    this.apiKey = process.env.PAYMONGO_SECRET_KEY;
    this.baseUrl = 'https://api.paymongo.com/v1';
    
    if (!this.apiKey) {
      throw new Error('PAYMONGO_SECRET_KEY not found in environment variables');
    }
  }

  /**
   * Get authorization header for PayMongo API
   */
  getAuthHeader() {
    return {
      'Authorization': `Basic ${Buffer.from(this.apiKey + ':').toString('base64')}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Fetch all payments from PayMongo
   * Equivalent to fetchPaymentsFromPayMongo() in PHP
   */
  async fetchAllPayments(limit = 100, before = null, after = null) {
    try {
      logger.info('🔍 Fetching payments from PayMongo', { limit, before, after });

      const params = new URLSearchParams();
      if (limit) params.append('limit', limit);
      if (before) params.append('before', before);
      if (after) params.append('after', after);

      const url = `${this.baseUrl}/payments?${params.toString()}`;
      
      const response = await axios.get(url, {
        headers: this.getAuthHeader()
      });

      logger.info('✅ Successfully fetched payments', {
        count: response.data.data.length,
        hasMore: response.data.has_more
      });

      return response.data;
    } catch (error) {
      logger.error('❌ Failed to fetch payments from PayMongo', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Fetch specific payment details from PayMongo
   * Equivalent to fetchPaymentDetailsFromPayMongo() in PHP
   */
  async fetchPaymentDetails(paymentId) {
    try {
      logger.info('🔍 Fetching payment details', { paymentId });

      const url = `${this.baseUrl}/payments/${paymentId}`;
      
      const response = await axios.get(url, {
        headers: this.getAuthHeader()
      });

      logger.info('✅ Successfully fetched payment details', { paymentId });

      return response.data;
    } catch (error) {
      logger.error('❌ Failed to fetch payment details', {
        paymentId,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Fetch payment method details from PayMongo
   * Equivalent to fetchPaymentMethodFromPayMongo() in PHP
   */
  async fetchPaymentMethod(paymentMethodId) {
    try {
      logger.info('🔍 Fetching payment method details', { paymentMethodId });

      const url = `${this.baseUrl}/payment_methods/${paymentMethodId}`;
      
      const response = await axios.get(url, {
        headers: this.getAuthHeader()
      });

      logger.info('✅ Successfully fetched payment method details', { paymentMethodId });

      return response.data;
    } catch (error) {
      logger.error('❌ Failed to fetch payment method details', {
        paymentMethodId,
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      throw error;
    }
  }

  /**
   * Sync payments from PayMongo to local database
   * This will fetch recent payments and update local records
   */
  async syncPaymentsToDatabase(hoursBack = 24) {
    try {
      logger.info('🔄 Starting payment sync from PayMongo', { hoursBack });

      // Calculate the date range
      const since = new Date();
      since.setHours(since.getHours() - hoursBack);

      // Fetch payments from PayMongo
      const paymentsResponse = await this.fetchAllPayments(100);
      const payments = paymentsResponse.data;

      let syncedCount = 0;
      let updatedCount = 0;

      for (const payment of payments) {
        try {
          // Check if payment exists in our database
          const existingPayment = await executeQuery(
            'SELECT * FROM payment_transactions WHERE external_transaction_id = ?',
            [payment.id]
          );

          if (existingPayment.length > 0) {
            // Update existing payment
            await executeQuery(
              `UPDATE payment_transactions 
               SET status = ?, updated_at = NOW() 
               WHERE external_transaction_id = ?`,
              [payment.attributes.status, payment.id]
            );
            updatedCount++;
          } else {
            // This is a new payment not in our system
            // Log it for manual review
            logger.warn('🔍 Found payment not in local database', {
              paymentId: payment.id,
              amount: payment.attributes.amount,
              status: payment.attributes.status,
              createdAt: payment.attributes.created_at
            });
          }

          syncedCount++;
        } catch (paymentError) {
          logger.error('❌ Failed to sync individual payment', {
            paymentId: payment.id,
            error: paymentError.message
          });
        }
      }

      logger.info('✅ Payment sync completed', {
        totalProcessed: syncedCount,
        updated: updatedCount,
        hoursBack
      });

      return {
        totalProcessed: syncedCount,
        updated: updatedCount,
        payments: payments
      };

    } catch (error) {
      logger.error('❌ Payment sync failed', {
        error: error.message,
        hoursBack
      });
      throw error;
    }
  }

  /**
   * Get payment status for a specific request
   */
  async getPaymentStatusForRequest(requestId) {
    try {
      // Get payment transaction from database
      const paymentTransaction = await executeQuery(
        `SELECT * FROM payment_transactions 
         WHERE request_id = ? 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [requestId]
      );

      if (paymentTransaction.length === 0) {
        return { status: 'no_payment', message: 'No payment found for this request' };
      }

      const transaction = paymentTransaction[0];

      // If we have an external transaction ID, fetch latest status from PayMongo
      if (transaction.external_transaction_id) {
        try {
          const paymentDetails = await this.fetchPaymentDetails(transaction.external_transaction_id);
          
          // Update local database with latest status
          if (paymentDetails.data.attributes.status !== transaction.status) {
            await executeQuery(
              'UPDATE payment_transactions SET status = ?, updated_at = NOW() WHERE id = ?',
              [paymentDetails.data.attributes.status, transaction.id]
            );
          }

          return {
            status: paymentDetails.data.attributes.status,
            amount: paymentDetails.data.attributes.amount,
            paymentMethod: paymentDetails.data.attributes.source?.type,
            paidAt: paymentDetails.data.attributes.paid_at,
            localTransaction: transaction,
            paymongoData: paymentDetails.data
          };
        } catch (fetchError) {
          logger.warn('Failed to fetch latest payment status from PayMongo, using local data', {
            requestId,
            error: fetchError.message
          });
        }
      }

      // Return local data if PayMongo fetch fails
      return {
        status: transaction.status,
        amount: transaction.amount,
        localTransaction: transaction
      };

    } catch (error) {
      logger.error('Failed to get payment status for request', {
        requestId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new PaymentFetchService();
