const PayMongoService = require('../services/paymongoService');
const { executeQuery } = require('../config/database');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const notificationService = require('../services/notificationService');
const paymentFetchService = require('../services/paymentFetchService');
const {
  ACTIVITY_TYPES,
  logPaymentActivity
} = require('../middleware/enhancedActivityLogger');

class PaymentController {
  constructor() {
    try {
      this.paymongoService = new PayMongoService();
      logger.info('PaymentController initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize PaymentController', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Initiate payment process using PayMongo Links
   * @route POST /api/payments/initiate
   * @access Private
   */
  async initiatePayment(req, res) {
    try {
      logger.info('Payment initiation started', {
        body: req.body,
        userId: req.user?.id
      });

      // Check if PayMongo service is available
      if (!this.paymongoService) {
        logger.error('PayMongo service not initialized');
        return ApiResponse.serverError(res, 'Payment service not available');
      }

      const {
        request_id,
        payment_method_id,
        customer_email
      } = req.body;

      // Validate required fields
      if (!request_id || !payment_method_id) {
        logger.error('Missing required fields', { request_id, payment_method_id });
        return ApiResponse.badRequest(res, 'Request ID and payment method ID are required');
      }

      // Get document request details
      const requestQuery = `
        SELECT dr.*, dt.type_name as document_name, pm.method_name, pm.processing_fee_percentage,
               pm.processing_fee_fixed, pm.is_online, rs.status_name,
               dr.total_document_fee as total_request_fee
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN payment_methods pm ON dr.payment_method_id = pm.id
        JOIN request_status rs ON dr.status_id = rs.id
        WHERE dr.id = ? AND dr.client_id = ?
      `;

      logger.info('Executing document request query', {
        query: requestQuery,
        params: [request_id, req.user.id]
      });

      const requestResults = await executeQuery(requestQuery, [request_id, req.user.id]);

      logger.info('Document request query results', {
        resultsCount: requestResults.length,
        results: requestResults
      });

      if (requestResults.length === 0) {
        logger.error('Document request not found', { request_id, client_id: req.user.id });
        return ApiResponse.notFound(res, 'Document request not found');
      }

      const documentRequest = requestResults[0];

      logger.info('Document request details', {
        documentRequest: {
          id: documentRequest.id,
          status_id: documentRequest.status_id,
          is_online: documentRequest.is_online,
          total_document_fee: documentRequest.total_document_fee,
          document_name: documentRequest.document_name,
          method_name: documentRequest.method_name,
          processing_fee_fixed: documentRequest.processing_fee_fixed,
          processing_fee_percentage: documentRequest.processing_fee_percentage
        }
      });

      // Check if request is approved before allowing payment
      if (documentRequest.status_id !== 4) {
        logger.error('Request not approved for payment', {
          status_id: documentRequest.status_id,
          required_status: 4
        });
        return ApiResponse.badRequest(res, 'Request must be approved before payment can be initiated');
      }

      // Check if payment method is online
      if (!documentRequest.is_online) {
        logger.error('Payment method not online', {
          is_online: documentRequest.is_online,
          method_name: documentRequest.method_name
        });
        return ApiResponse.badRequest(res, 'Selected payment method does not support online payments');
      }

      // Use the exact total_document_fee from database - this is the authoritative amount
      let actualRequestFee = parseFloat(documentRequest.total_request_fee || 0);

      // REAL-TIME FIX: For Cedula requests, recalculate if fee seems incorrect
      if (documentRequest.document_name === 'Cedula' && actualRequestFee < 3000) {
        console.log('🔧 Detected potentially incorrect Cedula fee, recalculating...');

        // Get cedula application data
        const cedulaQuery = `
          SELECT annual_income, property_assessed_value, personal_property_value, business_gross_receipts
          FROM cedula_applications
          WHERE request_id = ?
        `;
        const cedulaResults = await executeQuery(cedulaQuery, [request_id]);

        if (cedulaResults.length > 0) {
          const cedulaData = cedulaResults[0];
          const CedulaApplication = require('../models/CedulaApplication');

          // Recalculate using codebase logic
          const taxCalculation = CedulaApplication.calculateTax(
            parseFloat(cedulaData.annual_income || 0),
            parseFloat(cedulaData.property_assessed_value || 0),
            parseFloat(cedulaData.personal_property_value || 0),
            parseFloat(cedulaData.business_gross_receipts || 0)
          );

          const finalFee = CedulaApplication.calculateFinalFee(taxCalculation.total_tax, 5.00);
          const recalculatedFee = finalFee.total_document_fee;

          console.log(`🔄 Fee recalculation: ₱${actualRequestFee} → ₱${recalculatedFee}`);

          // Update database with correct amount
          const updateQuery = `
            UPDATE document_requests
            SET total_document_fee = ?, updated_at = NOW()
            WHERE id = ?
          `;
          await executeQuery(updateQuery, [recalculatedFee, request_id]);

          actualRequestFee = recalculatedFee;
          console.log('✅ Database updated with correct fee');
        }
      }

      // Customer pays exactly the total_document_fee - no additional fees
      const totalAmount = actualRequestFee;
      const paymentMethodFee = 0; // No additional payment method fees

      console.log('=== AMOUNT CALCULATION ===');
      console.log('Total Document Fee (exact amount):', actualRequestFee);
      console.log('PayMongo Fee: REMOVED - Customer pays only exact document fee');
      console.log('Total Amount:', totalAmount);
      console.log('=== END CALCULATION ===');

      // Handle PayMongo minimum amount requirement
      let finalAmount = totalAmount;
      let convenienceFee = 0;

      // PayMongo requires minimum ₱100.00 (10000 centavos) - Confirmed by API Testing
      const PAYMONGO_MINIMUM_PHP = 100.00;

      console.log('=== PAYMONGO MINIMUM CHECK ===');
      console.log('Total Amount:', totalAmount);
      console.log('PayMongo Minimum:', PAYMONGO_MINIMUM_PHP);
      console.log('Needs Convenience Fee:', totalAmount < PAYMONGO_MINIMUM_PHP);

      if (totalAmount < PAYMONGO_MINIMUM_PHP) {
        convenienceFee = PAYMONGO_MINIMUM_PHP - totalAmount;
        finalAmount = PAYMONGO_MINIMUM_PHP;

        console.log('✅ ADDING CONVENIENCE FEE');
        console.log('Convenience Fee:', convenienceFee);
        console.log('Final Amount:', finalAmount);

        logger.warn('Adding PayMongo convenience fee to meet minimum', {
          originalAmount: totalAmount,
          convenienceFee: convenienceFee,
          finalAmount: finalAmount,
          minimumRequired: PAYMONGO_MINIMUM_PHP
        });
      } else {
        console.log('❌ NO CONVENIENCE FEE NEEDED');
      }
      console.log('=== END MINIMUM CHECK ===');

      // Convert to centavos for PayMongo
      const amountInCentavos = PayMongoService.convertToCentavos(finalAmount);

      // Generate unique transaction ID
      const transactionId = `TXN_${Date.now()}_${uuidv4().substring(0, 8)}`;

      // Create PayMongo payment link
      const linkData = {
        amount: amountInCentavos,
        description: `BOSFDR - ${documentRequest.document_name} Request #${request_id}${convenienceFee > 0 ? ' (incl. convenience fee)' : ''}`,
        // Note: PayMongo Links API only supports amount and description
        // remarks and metadata are not supported for Links API
      };

      logger.info('Creating PayMongo payment link', {
        linkData,
        amountInCentavos,
        totalAmount,
        documentRequest: {
          id: documentRequest.id,
          document_name: documentRequest.document_name,
          status_id: documentRequest.status_id,
          is_online: documentRequest.is_online
        }
      });

      const paymentLink = await this.paymongoService.createPaymentLink(linkData);

      // Store payment transaction in database
      const insertTransactionQuery = `
        INSERT INTO payment_transactions (
          request_id, payment_method_id, transaction_id,
          paymongo_payment_intent_id, amount, processing_fee,
          net_amount, currency, status, payment_description,
          customer_email, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      await executeQuery(insertTransactionQuery, [
        request_id,
        payment_method_id,
        transactionId,
        paymentLink.data.id, // Using link ID instead of payment intent ID
        finalAmount, // Use final amount (includes convenience fee if added)
        convenienceFee, // Only convenience fee if PayMongo minimum is applied
        actualRequestFee, // Net amount is the original request fee
        'PHP',
        'pending',
        linkData.description,
        customer_email || req.user.email
      ]);

      // Update document request status
      const updateRequestQuery = `
        UPDATE document_requests
        SET payment_status = 'pending', payment_provider_reference = ?, updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(updateRequestQuery, [paymentLink.data.id, request_id]);

      // Log payment submission activity
      await logPaymentActivity(req, req.user.id, 'client', ACTIVITY_TYPES.PAYMENT_SUBMIT,
        transactionId, finalAmount, documentRequest.method_name, {
          request_id: request_id,
          request_number: documentRequest.request_number,
          document_type: documentRequest.document_name,
          payment_provider: 'PayMongo',
          link_id: paymentLink.data.id,
          reference_number: paymentLink.data.attributes.reference_number,
          convenience_fee: convenienceFee,
          net_amount: actualRequestFee
        }
      );

      logger.info('Payment link created successfully', {
        transactionId,
        linkId: paymentLink.data.id,
        checkoutUrl: paymentLink.data.attributes.checkout_url,
        requestId: request_id,
        amount: totalAmount,
        clientId: req.user.id
      });

      return ApiResponse.success(res, {
        transaction_id: transactionId,
        link_id: paymentLink.data.id,
        checkout_url: paymentLink.data.attributes.checkout_url,
        reference_number: paymentLink.data.attributes.reference_number,
        amount: finalAmount, // Show final amount charged
        base_amount: actualRequestFee, // Exact total_document_fee amount
        processing_fee: 0, // No additional processing fees
        convenience_fee: convenienceFee, // Show convenience fee separately (only if PayMongo minimum applied)
        original_amount: totalAmount, // Show original calculated amount
        currency: 'PHP',
        status: paymentLink.data.attributes.status,
        expires_at: paymentLink.data.attributes.archived_at
      }, 'Payment link created successfully');

    } catch (error) {
      logger.error('Payment link creation failed', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        userId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  /**
   * Handle PayMongo webhooks
   * @route POST /api/payments/webhook
   * @access Public (but verified)
   */
  async handleWebhook(req, res) {
    try {
      console.log('🔔 PayMongo webhook received:', {
        headers: req.headers,
        body: req.body,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
      });

      const signature = req.headers['paymongo-signature'];
      const payload = JSON.stringify(req.body);

      // Enhanced logging for debugging
      console.log('🔍 Webhook Debug Info:', {
        hasSignature: !!signature,
        hasWebhookSecret: !!process.env.PAYMONGO_WEBHOOK_SECRET,
        payloadLength: payload.length,
        nodeEnv: process.env.NODE_ENV
      });

      // Verify webhook signature
      if (!this.paymongoService.verifyWebhookSignature(payload, signature)) {
        logger.warn('Invalid webhook signature', {
          signature: signature ? signature.substring(0, 20) + '...' : 'none',
          payloadLength: payload.length
        });
        return ApiResponse.unauthorized(res, 'Invalid webhook signature');
      }

      // Process webhook event
      const webhookEvent = this.paymongoService.processWebhookEvent(req.body);

      console.log('📋 Processed webhook event:', webhookEvent);

      // Store webhook event
      const insertWebhookQuery = `
        INSERT INTO payment_webhooks (
          webhook_id, event_type, payload, processed, created_at
        ) VALUES (?, ?, ?, 0, NOW())
      `;

      await executeQuery(insertWebhookQuery, [
        webhookEvent.eventId,
        webhookEvent.eventType,
        payload
      ]);

      // Handle different event types
      console.log('🔄 Handling webhook event type:', webhookEvent.eventType);
      switch (webhookEvent.eventType) {
        case 'payment_intent.succeeded':
        case 'payment.paid':
          await this.handlePaymentSuccess(webhookEvent);
          break;
        case 'payment_intent.payment_failed':
        case 'payment.failed':
          await this.handlePaymentFailure(webhookEvent);
          break;
        case 'link.payment.paid':
          await this.handleLinkPaymentSuccess(webhookEvent);
          break;
        case 'link.payment.failed':
          await this.handleLinkPaymentFailure(webhookEvent);
          break;
        default:
          logger.info('Unhandled webhook event type', { eventType: webhookEvent.eventType });
          console.log('❓ Unhandled webhook event type:', webhookEvent.eventType);
      }

      // Mark webhook as processed
      const updateWebhookQuery = `
        UPDATE payment_webhooks 
        SET processed = 1, processed_at = NOW() 
        WHERE webhook_id = ?
      `;
      
      await executeQuery(updateWebhookQuery, [webhookEvent.eventId]);

      logger.info('Webhook processed successfully', {
        eventId: webhookEvent.eventId,
        eventType: webhookEvent.eventType,
        resourceId: webhookEvent.resourceId
      });

      return res.status(200).json({ received: true });

    } catch (error) {
      logger.error('Webhook processing failed', {
        error: error.message,
        stack: error.stack,
        body: req.body,
        headers: req.headers,
        timestamp: new Date().toISOString()
      });

      console.log('❌ Webhook processing error:', error.message);

      // Always return 200 to prevent PayMongo from retrying
      // Log the error but acknowledge receipt
      return res.status(200).json({
        received: true,
        error: 'Processing failed but acknowledged',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(webhookEvent) {
    try {
      const paymentIntentId = webhookEvent.resourceId;
      const metadata = webhookEvent.resourceData.metadata || {};

      // Update payment transaction status
      const updateTransactionQuery = `
        UPDATE payment_transactions 
        SET status = 'succeeded', external_transaction_id = ?, updated_at = NOW()
        WHERE paymongo_payment_intent_id = ?
      `;

      await executeQuery(updateTransactionQuery, [
        webhookEvent.resourceData.payments?.[0]?.id || null,
        paymentIntentId
      ]);

      // Get request ID from payment transaction if not in metadata
      let requestId = metadata.request_id;
      if (!requestId) {
        const getRequestQuery = `
          SELECT request_id FROM payment_transactions
          WHERE paymongo_payment_intent_id = ?
        `;
        const requestResult = await executeQuery(getRequestQuery, [paymentIntentId]);
        if (requestResult.length > 0) {
          requestId = requestResult[0].request_id;
          logger.info('📋 Found request ID from payment transaction', { requestId, paymentIntentId });
        }
      }

      // Update document request status
      if (requestId) {
        const updateRequestQuery = `
          UPDATE document_requests
          SET payment_status = 'paid', paid_at = NOW(), status_id = 11, updated_at = NOW()
          WHERE id = ?
        `;

        await executeQuery(updateRequestQuery, [requestId]);

        // Send notification to admins about payment confirmation
        try {
          logger.info('🔔 Sending payment confirmation notification to admins', { requestId, paymentIntentId });
          await this.notifyAdminsPaymentConfirmed(requestId, webhookEvent.resourceData);
          logger.info('✅ Payment confirmation notification sent successfully');
        } catch (notificationError) {
          logger.error('❌ Failed to send payment confirmation notification', {
            error: notificationError.message,
            requestId,
            paymentIntentId
          });
          // Don't fail the payment processing if notification fails
        }

        logger.info('Payment success processed', {
          paymentIntentId,
          requestId,
          transactionId: metadata.transaction_id
        });
      } else {
        logger.warn('⚠️ No request ID found for payment confirmation', { paymentIntentId, metadata });
      }

    } catch (error) {
      logger.error('Failed to handle payment success', {
        error: error.message,
        webhookEvent
      });
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(webhookEvent) {
    try {
      const paymentIntentId = webhookEvent.resourceId;
      const metadata = webhookEvent.resourceData.metadata || {};

      // Update payment transaction status
      const updateTransactionQuery = `
        UPDATE payment_transactions
        SET status = 'failed', failure_reason = ?, updated_at = NOW()
        WHERE paymongo_payment_intent_id = ?
      `;

      await executeQuery(updateTransactionQuery, [
        webhookEvent.resourceData.last_payment_error?.message || 'Payment failed',
        paymentIntentId
      ]);

      // Update document request status
      if (metadata.request_id) {
        const updateRequestQuery = `
          UPDATE document_requests
          SET payment_status = 'failed', updated_at = NOW()
          WHERE id = ?
        `;

        await executeQuery(updateRequestQuery, [metadata.request_id]);

        logger.info('Payment failure processed', {
          paymentIntentId,
          requestId: metadata.request_id,
          transactionId: metadata.transaction_id
        });
      }

    } catch (error) {
      logger.error('Failed to handle payment failure', {
        error: error.message,
        webhookEvent
      });
      throw error;
    }
  }

  /**
   * Handle successful PayMongo Link payment
   */
  async handleLinkPaymentSuccess(webhookEvent) {
    try {
      const linkId = webhookEvent.resourceId;
      const linkData = webhookEvent.resourceData;
      const metadata = linkData.metadata || {};

      logger.info('🔔 Processing PayMongo Link payment success', {
        linkId,
        linkData,
        metadata,
        webhookEvent
      });

      // Update payment transaction status
      const updateTransactionQuery = `
        UPDATE payment_transactions
        SET status = 'succeeded', external_transaction_id = ?, updated_at = NOW()
        WHERE paymongo_payment_intent_id = ?
      `;

      await executeQuery(updateTransactionQuery, [
        linkData.payments?.[0]?.id || linkId,
        linkId
      ]);

      // Get request ID from payment transaction if not in metadata
      let requestId = metadata.request_id;
      if (!requestId) {
        const getRequestQuery = `
          SELECT request_id FROM payment_transactions
          WHERE paymongo_payment_intent_id = ?
        `;
        const requestResult = await executeQuery(getRequestQuery, [linkId]);
        if (requestResult.length > 0) {
          requestId = requestResult[0].request_id;
          logger.info('📋 Found request ID from payment transaction', { requestId, linkId });
        }
      }

      if (requestId) {
        // Update document request status to payment_confirmed (status_id = 11)
        const updateRequestQuery = `
          UPDATE document_requests
          SET payment_status = 'paid', paid_at = NOW(), status_id = 11, updated_at = NOW()
          WHERE id = ?
        `;

        await executeQuery(updateRequestQuery, [requestId]);

        // Send notification to admins about payment confirmation
        try {
          logger.info('🔔 Sending payment confirmation notification to admins', { requestId, linkId });
          await this.notifyAdminsPaymentConfirmed(requestId, linkData);
          logger.info('✅ Payment confirmation notification sent successfully');
        } catch (notificationError) {
          logger.error('❌ Failed to send payment confirmation notification', {
            error: notificationError.message,
            requestId,
            linkId
          });
          // Don't fail the payment processing if notification fails
        }

        logger.info('Link payment success processed', {
          linkId,
          requestId,
          transactionId: metadata.transaction_id,
          amount: linkData.amount
        });
      } else {
        logger.warn('⚠️ No request ID found for payment confirmation', { linkId, metadata });
      }

    } catch (error) {
      logger.error('Failed to handle link payment success', {
        error: error.message,
        webhookEvent
      });
      throw error;
    }
  }

  /**
   * Handle failed PayMongo Link payment
   */
  async handleLinkPaymentFailure(webhookEvent) {
    try {
      const linkId = webhookEvent.resourceId;
      const linkData = webhookEvent.resourceData;
      const metadata = linkData.metadata || {};

      // Update payment transaction status
      const updateTransactionQuery = `
        UPDATE payment_transactions
        SET status = 'failed', failure_reason = ?, updated_at = NOW()
        WHERE paymongo_payment_intent_id = ?
      `;

      await executeQuery(updateTransactionQuery, [
        'Link payment failed',
        linkId
      ]);

      // Update document request status
      if (metadata.request_id) {
        const updateRequestQuery = `
          UPDATE document_requests
          SET payment_status = 'failed', updated_at = NOW()
          WHERE id = ?
        `;

        await executeQuery(updateRequestQuery, [metadata.request_id]);

        logger.info('Link payment failure processed', {
          linkId,
          requestId: metadata.request_id,
          transactionId: metadata.transaction_id
        });
      }

    } catch (error) {
      logger.error('Failed to handle link payment failure', {
        error: error.message,
        webhookEvent
      });
      throw error;
    }
  }

  /**
   * Get payment status
   * @route GET /api/payments/status/:transactionId
   * @access Private
   */
  async getPaymentStatus(req, res) {
    try {
      const { transactionId } = req.params;

      const query = `
        SELECT pt.*, dr.status as request_status, pm.method_name
        FROM payment_transactions pt
        JOIN document_requests dr ON pt.request_id = dr.id
        JOIN payment_methods pm ON pt.payment_method_id = pm.id
        WHERE pt.transaction_id = ? AND dr.client_id = ?
      `;

      const results = await executeQuery(query, [transactionId, req.user.id]);

      if (results.length === 0) {
        return ApiResponse.notFound(res, 'Payment transaction not found');
      }

      const transaction = results[0];

      return ApiResponse.success(res, {
        transaction_id: transaction.transaction_id,
        status: transaction.status,
        amount: parseFloat(transaction.amount),
        processing_fee: parseFloat(transaction.processing_fee),
        payment_method: transaction.method_name,
        request_status: transaction.request_status,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at
      }, 'Payment status retrieved successfully');

    } catch (error) {
      logger.error('Failed to get payment status', {
        error: error.message,
        transactionId: req.params.transactionId,
        userId: req.user?.id
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  /**
   * Get PayMongo configuration for frontend
   * @route GET /api/payments/config
   * @access Private
   */
  async getPaymentConfig(req, res) {
    try {
      const config = this.paymongoService.getPaymentMethodConfig();

      return ApiResponse.success(res, config, 'Payment configuration retrieved successfully');
    } catch (error) {
      logger.error('Failed to get payment config', {
        error: error.message
      });
      return ApiResponse.serverError(res, error.message);
    }
  }

  /**
   * Notify admins about payment confirmation
   */
  async notifyAdminsPaymentConfirmed(requestId, paymentData) {
    try {
      // Get request details with client information
      const requestQuery = `
        SELECT dr.*, c.first_name, c.last_name, c.email,
               dt.type_name, rs.status_name
        FROM document_requests dr
        JOIN client_profiles c ON dr.client_id = c.account_id
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN request_status rs ON dr.status_id = rs.id
        WHERE dr.id = ?
      `;

      const requestResult = await executeQuery(requestQuery, [requestId]);

      if (requestResult.length === 0) {
        logger.warn('Request not found for payment notification', { requestId });
        return;
      }

      const request = requestResult[0];
      const clientName = `${request.first_name} ${request.last_name}`;
      const paymentAmount = PayMongoService.convertToPhp(paymentData.amount || 0);

      // Get all active admins
      const adminQuery = `
        SELECT id, username, role
        FROM admin_employee_accounts
        WHERE status = 'active' AND role IN ('admin', 'employee')
      `;

      const adminResult = await executeQuery(adminQuery);

      if (adminResult.length === 0) {
        logger.warn('No active admins found for payment notification', { requestId });
        return;
      }

      logger.info('Creating payment confirmation notifications for admins', {
        requestId,
        clientName,
        documentType: request.type_name,
        requestNumber: request.request_number,
        paymentAmount,
        adminCount: adminResult.length
      });

      // Create individual notification for each admin
      const notifications = [];
      for (const admin of adminResult) {
        try {
          const notification = await notificationService.createNotification({
            recipient_id: admin.id,
            recipient_type: 'admin',
            type: 'payment_confirmed',
            title: 'Payment Confirmed',
            message: `${clientName} completed payment of ₱${paymentAmount.toFixed(2)} for ${request.type_name} request (${request.request_number})`,
            data: {
              request_id: requestId,
              request_number: request.request_number,
              document_type: request.type_name,
              client_id: request.client_id,
              client_name: clientName,
              payment_amount: paymentAmount,
              payment_status: 'paid',
              new_status: request.status_name,
              confirmed_at: new Date().toISOString(),
              admin_id: admin.id,
              admin_username: admin.username
            },
            priority: 'high'
          });

          logger.info(`Payment confirmation notification created for admin ${admin.id}:`, notification);
          notifications.push(notification);

          // Send real-time notification to this specific admin
          notificationService.sendToUser(admin.id, notification);
        } catch (notificationError) {
          logger.error(`Failed to create payment notification for admin ${admin.id}:`, notificationError);
        }
      }

      // Also send to admin connections (for backward compatibility)
      if (notifications.length > 0) {
        notificationService.sendToAdmins(notifications[0]);
      }

      logger.info(`Payment confirmation notifications sent for request ${requestId}`);
    } catch (error) {
      logger.error('Failed to notify admins about payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Fetch all payments from PayMongo
   * @route GET /api/payments/fetch-all
   * @access Private (Admin only)
   */
  async fetchAllPayments(req, res) {
    try {
      const { limit = 50, before, after } = req.query;

      logger.info('Admin fetching all payments from PayMongo', {
        adminId: req.user.id,
        limit,
        before,
        after
      });

      const payments = await paymentFetchService.fetchAllPayments(
        parseInt(limit),
        before,
        after
      );

      return ApiResponse.success(res, payments, 'Payments fetched successfully');
    } catch (error) {
      logger.error('Failed to fetch payments', {
        error: error.message,
        adminId: req.user?.id
      });
      return ApiResponse.serverError(res, 'Failed to fetch payments');
    }
  }

  /**
   * Fetch specific payment details
   * @route GET /api/payments/details/:paymentId
   * @access Private (Admin only)
   */
  async fetchPaymentDetails(req, res) {
    try {
      const { paymentId } = req.params;

      logger.info('Admin fetching payment details', {
        adminId: req.user.id,
        paymentId
      });

      const paymentDetails = await paymentFetchService.fetchPaymentDetails(paymentId);

      return ApiResponse.success(res, paymentDetails, 'Payment details fetched successfully');
    } catch (error) {
      logger.error('Failed to fetch payment details', {
        error: error.message,
        paymentId: req.params.paymentId,
        adminId: req.user?.id
      });
      return ApiResponse.serverError(res, 'Failed to fetch payment details');
    }
  }

  /**
   * Sync payments from PayMongo to local database
   * @route POST /api/payments/sync
   * @access Private (Admin only)
   */
  async syncPayments(req, res) {
    try {
      const { hoursBack = 24 } = req.body;

      logger.info('Admin initiating payment sync', {
        adminId: req.user.id,
        hoursBack
      });

      const syncResult = await paymentFetchService.syncPaymentsToDatabase(hoursBack);

      return ApiResponse.success(res, syncResult, 'Payment sync completed successfully');
    } catch (error) {
      logger.error('Failed to sync payments', {
        error: error.message,
        adminId: req.user?.id
      });
      return ApiResponse.serverError(res, 'Failed to sync payments');
    }
  }

  /**
   * Get payment status for a specific request
   * @route GET /api/payments/request/:requestId/status
   * @access Private
   */
  async getRequestPaymentStatus(req, res) {
    try {
      const { requestId } = req.params;

      logger.info('Fetching payment status for request', {
        userId: req.user.id,
        requestId
      });

      const paymentStatus = await paymentFetchService.getPaymentStatusForRequest(requestId);

      return ApiResponse.success(res, paymentStatus, 'Payment status retrieved successfully');
    } catch (error) {
      logger.error('Failed to get payment status for request', {
        error: error.message,
        requestId: req.params.requestId,
        userId: req.user?.id
      });
      return ApiResponse.serverError(res, 'Failed to get payment status');
    }
  }
}

module.exports = new PaymentController();
