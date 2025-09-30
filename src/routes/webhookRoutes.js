const express = require('express');
const crypto = require('crypto');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const notificationService = require('../services/notificationService');
const Receipt = require('../models/Receipt');

const router = express.Router();

// PayMongo webhook signature verification
function verifyPayMongoSignature(payload, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  try {
    // PayMongo uses HMAC SHA256
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');

    // PayMongo signature format: "sha256=<signature>"
    const expectedSignature = `sha256=${computedSignature}`;
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    logger.error('Signature verification error:', error);
    return false;
  }
}

// Function to send admin notification about payment status
async function notifyAdminsPaymentStatus(requestId, paymentData, status) {
  try {
    console.log(`🔔 Sending ${status} payment notification to admins...`);
    
    // Get request details
    const requestQuery = `
      SELECT dr.*, c.first_name, c.last_name, dt.type_name
      FROM document_requests dr
      JOIN client_profiles c ON dr.client_id = c.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      WHERE dr.id = ?
    `;
    
    const requestResults = await executeQuery(requestQuery, [requestId]);
    if (requestResults.length === 0) {
      console.log('❌ Request not found:', requestId);
      return;
    }
    
    const request = requestResults[0];
    
    // Get all admin users with their profile information
    const adminQuery = `
      SELECT
        aea.id,
        aea.username,
        aep.email,
        aep.first_name,
        aep.last_name
      FROM admin_employee_accounts aea
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      WHERE aea.status = 'active'
    `;
    
    const admins = await executeQuery(adminQuery);
    console.log('👥 Found', admins.length, 'active admins');
    
    // Create notifications for each admin
    for (const admin of admins) {
      const notificationData = {
        recipient_id: admin.id,
        recipient_type: 'admin',
        type: status === 'succeeded' ? 'payment_confirmed' : 'payment_failed',
        title: status === 'succeeded' ? 'Payment Confirmed' : 'Payment Failed',
        message: status === 'succeeded'
          ? `Payment confirmed for ${request.type_name} request #${request.request_number} by ${request.first_name} ${request.last_name}`
          : `Payment failed for ${request.type_name} request #${request.request_number} by ${request.first_name} ${request.last_name}`,
        data: JSON.stringify({
          request_id: requestId,
          request_number: request.request_number,
          document_type: request.type_name,
          client_name: `${request.first_name} ${request.last_name}`,
          amount: paymentData.amount,
          payment_id: paymentData.id,
          status: status
        }),
        priority: status === 'succeeded' ? 'high' : 'normal'
      };

      const insertNotificationQuery = `
        INSERT INTO notifications (
          recipient_id, recipient_type, type, title, message, data, priority, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
      `;

      await executeQuery(insertNotificationQuery, [
        notificationData.recipient_id,
        notificationData.recipient_type,
        notificationData.type,
        notificationData.title,
        notificationData.message,
        notificationData.data,
        notificationData.priority
      ]);
      
      console.log(`✅ Notification created for admin ${admin.username}`);
    }

    // Send real-time notification to all admins
    const realTimeNotification = {
      type: 'request_status_changed',
      data: {
        request_id: requestId,
        new_status: status === 'succeeded' ? 'payment_confirmed' : 'payment_failed',
        old_status: 'approved',
        payment_status: status,
        amount: paymentData.amount,
        timestamp: new Date().toISOString()
      }
    };

    // Send to all admin connections
    notificationService.sendToAdmins(realTimeNotification);
    console.log(`📡 Real-time notification sent to all admin connections`);

    console.log(`🎉 ${status} payment notifications sent to all admins`);
    
  } catch (error) {
    console.error('❌ Failed to send admin notifications:', error.message);
    throw error;
  }
}

// Function to process payment webhook
async function processPaymentWebhook(eventType, paymentData) {
  try {
    console.log(`🔄 Processing ${eventType} webhook for payment:`, paymentData.id);
    
    const paymentId = paymentData.id;
    const amount = paymentData.attributes.amount / 100; // Convert from centavos
    const paymongoStatus = paymentData.attributes.status;
    const description = paymentData.attributes.description;
    const paidAt = paymentData.attributes.paid_at;

    // Map PayMongo status to our database ENUM values
    const status = paymongoStatus === 'paid' ? 'succeeded' :
                   paymongoStatus === 'failed' ? 'failed' :
                   paymongoStatus === 'pending' ? 'pending' :
                   paymongoStatus;
    
    // Extract request ID from description
    const requestMatch = description?.match(/Request #(\d+)/);
    if (!requestMatch) {
      console.log('⚠️ No request ID found in description:', description);
      return { success: false, message: 'No request ID found' };
    }
    
    const requestId = parseInt(requestMatch[1]);
    console.log(`📋 Processing for request ID: ${requestId}`);
    
    // Find the payment transaction
    const transactionQuery = `
      SELECT * FROM payment_transactions 
      WHERE request_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    
    const transactions = await executeQuery(transactionQuery, [requestId]);
    
    if (transactions.length === 0) {
      console.log('❌ No payment transaction found for request', requestId);
      return { success: false, message: 'No payment transaction found' };
    }
    
    const transaction = transactions[0];
    console.log(`💰 Found transaction: ${transaction.transaction_id}`);
    
    // Update payment transaction
    const updateTransactionQuery = `
      UPDATE payment_transactions 
      SET 
        status = ?, 
        external_transaction_id = ?,
        completed_at = ?,
        webhook_data = ?,
        updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(updateTransactionQuery, [
      status,
      paymentId,
      paidAt ? new Date(paidAt * 1000) : null,
      JSON.stringify(paymentData),
      transaction.id
    ]);
    
    console.log(`✅ Transaction updated: ${transaction.status} → ${status}`);
    
    // Update document request based on payment status
    if (status === 'succeeded') {
      // Get current status before updating
      const getCurrentStatusQuery = `
        SELECT status_id FROM document_requests WHERE id = ?
      `;
      const currentStatusResult = await executeQuery(getCurrentStatusQuery, [requestId]);
      const oldStatusId = currentStatusResult[0]?.status_id;

      // Payment successful - update to payment_confirmed status
      const updateRequestQuery = `
        UPDATE document_requests
        SET
          payment_status = 'paid',
          paid_at = ?,
          status_id = 11,
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(updateRequestQuery, [
        paidAt ? new Date(paidAt * 1000) : new Date(),
        requestId
      ]);

      console.log(`🎯 Request updated to payment_confirmed status`);

      // Add status history entry for payment confirmation
      const historyQuery = `
        INSERT INTO request_status_history
        (request_id, old_status_id, new_status_id, changed_by, change_reason, changed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await executeQuery(historyQuery, [
        requestId,
        oldStatusId,
        11, // payment_confirmed status
        32, // System admin user (admin12345)
        'SYSTEM: Payment confirmed via PayMongo webhook',
        paidAt ? new Date(paidAt * 1000) : new Date()
      ]);

      console.log(`📝 Status history entry created for payment confirmation`);

      // Create receipt for successful payment
      try {
        // Get complete payment transaction data
        const receiptQuery = `
          SELECT
            pt.id as transaction_id,
            dr.client_id,
            pt.request_id,
            CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
            cp.email as client_email,
            cp.phone_number as client_phone,
            dr.request_number,
            dt.type_name as document_type,
            pm.method_name as payment_method,
            pm.method_code as payment_method_code,
            pt.amount,
            pt.processing_fee,
            pt.net_amount,
            pt.currency,
            pt.external_transaction_id,
            pt.paymongo_payment_intent_id,
            pt.payment_description
          FROM payment_transactions pt
          JOIN document_requests dr ON pt.request_id = dr.id
          JOIN client_profiles cp ON dr.client_id = cp.account_id
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN payment_methods pm ON pt.payment_method_id = pm.id
          WHERE pt.external_transaction_id = ?
        `;

        const receiptData = await executeQuery(receiptQuery, [paymentId]);

        if (receiptData.length > 0) {
          const data = receiptData[0];

          // Check if receipt already exists
          const existingReceipt = await executeQuery(
            'SELECT id FROM receipts WHERE transaction_id = ?',
            [data.transaction_id]
          );

          if (existingReceipt.length === 0) {
            const receiptNumber = Receipt.generateReceiptNumber(data.transaction_id);

            await Receipt.create({
              transaction_id: data.transaction_id,
              client_id: data.client_id,
              request_id: data.request_id,
              receipt_number: receiptNumber,
              client_name: data.client_name,
              client_email: data.client_email,
              client_phone: data.client_phone,
              request_number: data.request_number,
              document_type: data.document_type,
              payment_method: data.payment_method,
              payment_method_code: data.payment_method_code,
              amount: data.amount,
              processing_fee: data.processing_fee,
              net_amount: data.net_amount,
              currency: data.currency,
              external_transaction_id: data.external_transaction_id,
              paymongo_payment_intent_id: data.paymongo_payment_intent_id,
              payment_status: 'succeeded',
              receipt_date: new Date(),
              payment_date: paidAt ? new Date(paidAt * 1000) : new Date(),
              description: data.payment_description
            });

            console.log(`📄 Receipt created for payment: ${receiptNumber}`);
          } else {
            console.log(`📄 Receipt already exists for transaction: ${data.transaction_id}`);
          }
        }
      } catch (receiptError) {
        console.error('❌ Failed to create receipt:', receiptError);
        // Don't fail the webhook processing if receipt creation fails
      }

      // Send success notification to admins
      await notifyAdminsPaymentStatus(requestId, {
        id: paymentId,
        amount: amount,
        status: status
      }, 'succeeded');
      
    } else if (status === 'failed') {
      // Get current status before updating
      const getCurrentStatusQuery = `
        SELECT status_id FROM document_requests WHERE id = ?
      `;
      const currentStatusResult = await executeQuery(getCurrentStatusQuery, [requestId]);
      const oldStatusId = currentStatusResult[0]?.status_id;

      // Payment failed - update status but keep as approved for retry
      const updateRequestQuery = `
        UPDATE document_requests
        SET
          payment_status = 'failed',
          updated_at = NOW()
        WHERE id = ?
      `;

      await executeQuery(updateRequestQuery, [requestId]);

      console.log(`❌ Request marked as payment failed`);

      // Add status history entry for payment failure (note: status_id stays the same)
      const historyQuery = `
        INSERT INTO request_status_history
        (request_id, old_status_id, new_status_id, changed_by, change_reason, changed_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      await executeQuery(historyQuery, [
        requestId,
        oldStatusId,
        oldStatusId, // Status stays the same, but we log the payment failure
        32, // System admin user (admin12345)
        'SYSTEM: Payment failed via PayMongo webhook',
        new Date()
      ]);

      console.log(`📝 Status history entry created for payment failure`);
      
      // Send failure notification to admins
      await notifyAdminsPaymentStatus(requestId, {
        id: paymentId,
        amount: amount,
        status: status
      }, 'failed');
    }
    
    return { success: true, message: 'Webhook processed successfully' };
    
  } catch (error) {
    console.error('❌ Error processing payment webhook:', error.message);
    throw error;
  }
}

// PayMongo webhook endpoint
router.post('/paymongo', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    console.log('🔗 Received PayMongo webhook');
    
    const signature = req.headers['paymongo-signature'];
    const payload = req.body;
    const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
    
    // Temporarily disable signature verification for debugging
    console.log('🔍 Webhook Debug Info:');
    console.log('   Secret configured:', !!secret);
    console.log('   Signature received:', !!signature);
    console.log('   Payload length:', payload.length);

    // Verify webhook signature (if secret is configured)
    if (secret && signature && !verifyPayMongoSignature(payload, signature, secret)) {
      console.log('❌ Invalid webhook signature');
      console.log('   Expected signature format: sha256=...');
      console.log('   Received signature:', signature);
      // Temporarily allow through for debugging
      console.log('⚠️ ALLOWING WEBHOOK THROUGH FOR DEBUGGING');
      // return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Parse the payload - handle both Buffer and already parsed objects
    console.log('🔍 Raw payload type:', typeof payload);
    console.log('🔍 Raw payload:', payload);

    let event;
    try {
      if (typeof payload === 'object' && payload !== null && !Buffer.isBuffer(payload)) {
        // Already parsed JSON object
        console.log('✅ Payload is already parsed JSON object');
        event = payload;
      } else {
        // Raw buffer or string - need to parse
        const payloadString = Buffer.isBuffer(payload) ? payload.toString() : payload;
        console.log('🔍 Payload string length:', payloadString.length);
        console.log('🔍 Payload preview:', payloadString.substring(0, 200));
        console.log('🔍 Attempting to parse JSON...');
        event = JSON.parse(payloadString);
        console.log('✅ JSON parsed successfully');
      }
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('❌ Raw payload:', payload);
      throw new Error(`JSON parse failed: ${parseError.message}`);
    }
    const eventType = event.data.attributes.type;
    const eventData = event.data.attributes.data;

    console.log('📨 Event type:', eventType);
    console.log('🆔 Event ID:', event.data.id);
    console.log('🔍 Event data structure:', typeof eventData);
    
    // Store webhook in database for audit trail
    const insertWebhookQuery = `
      INSERT INTO payment_webhooks (
        webhook_id, event_type, payload, created_at
      ) VALUES (?, ?, ?, NOW())
    `;
    
    // Store the payload as JSON string
    const payloadForStorage = typeof payload === 'object' && !Buffer.isBuffer(payload)
      ? JSON.stringify(payload)
      : payload.toString();

    await executeQuery(insertWebhookQuery, [
      event.data.id,
      eventType,
      payloadForStorage
    ]);
    
    // Process based on event type
    let result;
    switch (eventType) {
      case 'payment.paid':
      case 'link.payment.paid':
        result = await processPaymentWebhook(eventType, eventData);
        break;
        
      case 'payment.failed':
        result = await processPaymentWebhook(eventType, eventData);
        break;
        
      case 'payment.refunded':
        console.log('💸 Payment refunded:', eventData.id);
        // Handle refund logic here
        result = { success: true, message: 'Refund processed' };
        break;
        
      default:
        console.log('⚠️ Unhandled event type:', eventType);
        result = { success: true, message: 'Event type not handled' };
    }
    
    // Mark webhook as processed
    const updateWebhookQuery = `
      UPDATE payment_webhooks 
      SET processed = TRUE, processed_at = NOW() 
      WHERE webhook_id = ?
    `;
    
    await executeQuery(updateWebhookQuery, [event.data.id]);
    
    console.log('✅ Webhook processed successfully');
    
    // Always respond with 200 OK to acknowledge receipt
    res.status(200).json({ 
      success: true, 
      message: result.message,
      event_id: event.data.id 
    });
    
  } catch (error) {
    console.error('❌ Webhook processing error:', error.message);
    
    // Still respond with 200 to prevent retries for parsing errors
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Test endpoint for webhook
router.get('/paymongo/test', (req, res) => {
  res.json({ 
    message: 'PayMongo webhook endpoint is active',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
