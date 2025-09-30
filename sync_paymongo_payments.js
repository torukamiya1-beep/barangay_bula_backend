const axios = require('axios');
const { executeQuery } = require('./src/config/database');
const logger = require('./src/utils/logger');
require('dotenv').config();

// PayMongo API configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const BASE_URL = 'https://api.paymongo.com/v1';

function getAuthHeader() {
  return {
    'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  };
}

// Function to send admin notification about payment confirmation
async function notifyAdminsPaymentConfirmed(requestId, paymentData) {
  try {
    console.log('🔔 Sending payment confirmation notification to admins...');
    
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
        type: 'payment_confirmed',
        title: 'Payment Confirmed',
        message: `Payment confirmed for ${request.type_name} request #${request.request_number} by ${request.first_name} ${request.last_name}`,
        data: JSON.stringify({
          request_id: requestId,
          request_number: request.request_number,
          document_type: request.type_name,
          client_name: `${request.first_name} ${request.last_name}`,
          amount: paymentData.amount,
          payment_id: paymentData.id
        }),
        priority: 'high'
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
    
    console.log('🎉 Payment confirmation notifications sent to all admins');
    
  } catch (error) {
    console.error('❌ Failed to send admin notifications:', error.message);
    throw error;
  }
}

// Function to sync payments from PayMongo
async function syncPaymongoPayments() {
  try {
    console.log('🔄 Starting PayMongo payment synchronization...');
    
    // Get all payments from PayMongo
    const response = await axios.get(`${BASE_URL}/payments`, {
      headers: getAuthHeader()
    });
    
    const payments = response.data.data;
    console.log('📊 Found', payments.length, 'payments in PayMongo');
    
    let syncedCount = 0;
    let updatedCount = 0;
    
    for (const payment of payments) {
      try {
        const paymentId = payment.id;
        const amount = payment.attributes.amount / 100; // Convert from centavos
        const status = payment.attributes.status;
        const description = payment.attributes.description;
        const paidAt = payment.attributes.paid_at;
        
        console.log(`\n💳 Processing payment: ${paymentId}`);
        console.log(`   Amount: ₱${amount.toFixed(2)}`);
        console.log(`   Status: ${status}`);
        console.log(`   Description: ${description}`);
        
        // Extract request ID from description
        const requestMatch = description?.match(/Request #(\d+)/);
        if (!requestMatch) {
          console.log('   ⚠️ No request ID found in description, skipping...');
          continue;
        }
        
        const requestId = parseInt(requestMatch[1]);
        console.log(`   📋 Request ID: ${requestId}`);
        
        // Check if we have a payment transaction for this request
        const transactionQuery = `
          SELECT * FROM payment_transactions 
          WHERE request_id = ? 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        const transactions = await executeQuery(transactionQuery, [requestId]);
        
        if (transactions.length === 0) {
          console.log('   ❌ No payment transaction found for request', requestId);
          continue;
        }
        
        const transaction = transactions[0];
        console.log(`   💰 Found transaction: ${transaction.transaction_id} (${transaction.status})`);
        
        // Update transaction if status changed
        if (transaction.status !== status || !transaction.external_transaction_id) {
          const updateTransactionQuery = `
            UPDATE payment_transactions 
            SET 
              status = ?, 
              external_transaction_id = ?,
              completed_at = ?,
              updated_at = NOW()
            WHERE id = ?
          `;
          
          await executeQuery(updateTransactionQuery, [
            status,
            paymentId,
            paidAt ? new Date(paidAt * 1000) : null,
            transaction.id
          ]);
          
          console.log(`   ✅ Transaction updated: ${transaction.status} → ${status}`);
          updatedCount++;
        }
        
        // If payment is successful, update document request
        if (status === 'paid') {
          // Check current document request status
          const requestQuery = `
            SELECT id, status_id, payment_status 
            FROM document_requests 
            WHERE id = ?
          `;
          
          const requests = await executeQuery(requestQuery, [requestId]);
          
          if (requests.length > 0) {
            const request = requests[0];
            console.log(`   📄 Request status: ${request.status_id}, payment: ${request.payment_status}`);
            
            // Update to payment_confirmed status (status_id = 11) if not already
            if (request.payment_status !== 'paid' || request.status_id !== 11) {
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
              
              console.log(`   🎯 Request updated to payment_confirmed status`);
              
              // Send notification to admins
              try {
                await notifyAdminsPaymentConfirmed(requestId, {
                  id: paymentId,
                  amount: amount,
                  status: status
                });
                console.log(`   📧 Admin notifications sent`);
              } catch (notificationError) {
                console.error(`   ❌ Failed to send notifications:`, notificationError.message);
              }
              
              syncedCount++;
            } else {
              console.log(`   ℹ️ Request already marked as paid`);
            }
          }
        }
        
      } catch (paymentError) {
        console.error(`❌ Error processing payment ${payment.id}:`, paymentError.message);
      }
    }
    
    console.log('\n🎉 Synchronization completed!');
    console.log(`📊 Summary:`);
    console.log(`   💳 Total payments processed: ${payments.length}`);
    console.log(`   🔄 Transactions updated: ${updatedCount}`);
    console.log(`   ✅ Requests synced: ${syncedCount}`);
    
    return {
      totalPayments: payments.length,
      transactionsUpdated: updatedCount,
      requestsSynced: syncedCount
    };
    
  } catch (error) {
    console.error('❌ Payment synchronization failed:', error.message);
    throw error;
  }
}

// Function to check current sync status
async function checkSyncStatus() {
  try {
    console.log('🔍 Checking current sync status...');
    
    // Get pending payment transactions
    const pendingQuery = `
      SELECT pt.*, dr.request_number, dr.status_id, dr.payment_status
      FROM payment_transactions pt
      JOIN document_requests dr ON pt.request_id = dr.id
      WHERE pt.status = 'pending'
      ORDER BY pt.created_at DESC
    `;
    
    const pendingTransactions = await executeQuery(pendingQuery);
    
    console.log('📋 Pending payment transactions:');
    if (pendingTransactions.length === 0) {
      console.log('   ✅ No pending transactions found');
    } else {
      console.table(pendingTransactions.map(t => ({
        id: t.id,
        request_id: t.request_id,
        request_number: t.request_number,
        amount: t.amount,
        status: t.status,
        doc_status_id: t.status_id,
        payment_status: t.payment_status,
        created_at: t.created_at
      })));
    }
    
    // Get recent successful payments from PayMongo
    const response = await axios.get(`${BASE_URL}/payments?limit=5`, {
      headers: getAuthHeader()
    });
    
    console.log('\n💳 Recent PayMongo payments:');
    response.data.data.forEach(payment => {
      console.log(`   ${payment.id}: ₱${(payment.attributes.amount / 100).toFixed(2)} - ${payment.attributes.status}`);
      console.log(`      ${payment.attributes.description}`);
    });
    
    return {
      pendingTransactions: pendingTransactions.length,
      recentPayments: response.data.data.length
    };
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🚀 PayMongo Payment Synchronization Tool');
  console.log('='.repeat(50));
  
  try {
    // Check current status
    await checkSyncStatus();
    
    console.log('\n' + '='.repeat(50));
    
    // Perform synchronization
    const result = await syncPaymongoPayments();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Synchronization completed successfully!');
    
  } catch (error) {
    console.error('❌ Synchronization failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  syncPaymongoPayments,
  checkSyncStatus,
  notifyAdminsPaymentConfirmed
};
