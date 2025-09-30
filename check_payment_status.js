const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkPaymentStatus() {
  let connection;
  
  try {
    // Create database connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT
    });

    console.log('🔍 Checking Payment Status Updates...\n');

    // Check recent payment transactions
    console.log('📊 Recent Payment Transactions:');
    const [transactions] = await connection.execute(`
      SELECT 
        pt.id,
        pt.request_id,
        pt.transaction_id,
        pt.amount,
        pt.status as payment_status,
        pt.created_at,
        pt.updated_at,
        dr.request_number,
        dr.payment_status as request_payment_status,
        rs.status_name as request_status
      FROM payment_transactions pt
      JOIN document_requests dr ON pt.request_id = dr.id
      JOIN request_status rs ON dr.status_id = rs.id
      ORDER BY pt.created_at DESC
      LIMIT 10
    `);

    if (transactions.length === 0) {
      console.log('   No payment transactions found.');
    } else {
      transactions.forEach(tx => {
        console.log(`   📄 Request #${tx.request_number} (ID: ${tx.request_id})`);
        console.log(`      💰 Amount: ₱${tx.amount}`);
        console.log(`      💳 Payment Status: ${tx.payment_status}`);
        console.log(`      📋 Request Status: ${tx.request_status}`);
        console.log(`      🕐 Created: ${tx.created_at}`);
        console.log(`      🕐 Updated: ${tx.updated_at}`);
        console.log('');
      });
    }

    // Check recent webhooks
    console.log('🔔 Recent PayMongo Webhooks:');
    const [webhooks] = await connection.execute(`
      SELECT 
        webhook_id,
        event_type,
        processed,
        created_at,
        processed_at
      FROM payment_webhooks
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (webhooks.length === 0) {
      console.log('   No webhooks found.');
    } else {
      webhooks.forEach(webhook => {
        console.log(`   🔔 Event: ${webhook.event_type}`);
        console.log(`      ✅ Processed: ${webhook.processed ? 'Yes' : 'No'}`);
        console.log(`      🕐 Received: ${webhook.created_at}`);
        if (webhook.processed_at) {
          console.log(`      🕐 Processed: ${webhook.processed_at}`);
        }
        console.log('');
      });
    }

    // Check requests with payment_pending status
    console.log('⏳ Requests Waiting for Payment:');
    const [pendingPayments] = await connection.execute(`
      SELECT
        dr.id,
        dr.request_number,
        dr.payment_status,
        rs.status_name,
        COALESCE(dr.base_fee + dr.additional_fees + dr.processing_fee, 0) as total_amount,
        dr.created_at
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      WHERE dr.status_id = 10 OR dr.payment_status = 'pending'
      ORDER BY dr.created_at DESC
      LIMIT 5
    `);

    if (pendingPayments.length === 0) {
      console.log('   No requests waiting for payment.');
    } else {
      pendingPayments.forEach(req => {
        console.log(`   📄 Request #${req.request_number} (ID: ${req.id})`);
        console.log(`      💰 Amount: ₱${req.total_amount}`);
        console.log(`      📋 Status: ${req.status_name}`);
        console.log(`      💳 Payment Status: ${req.payment_status}`);
        console.log(`      🕐 Created: ${req.created_at}`);
        console.log('');
      });
    }

    // Check requests with payment_confirmed status
    console.log('✅ Recently Confirmed Payments:');
    const [confirmedPayments] = await connection.execute(`
      SELECT
        dr.id,
        dr.request_number,
        dr.payment_status,
        rs.status_name,
        COALESCE(dr.base_fee + dr.additional_fees + dr.processing_fee, 0) as total_amount,
        dr.paid_at,
        dr.updated_at
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      WHERE dr.status_id = 11 AND dr.payment_status = 'paid'
      ORDER BY dr.paid_at DESC
      LIMIT 5
    `);

    if (confirmedPayments.length === 0) {
      console.log('   No confirmed payments found.');
    } else {
      confirmedPayments.forEach(req => {
        console.log(`   📄 Request #${req.request_number} (ID: ${req.id})`);
        console.log(`      💰 Amount: ₱${req.total_amount}`);
        console.log(`      📋 Status: ${req.status_name}`);
        console.log(`      💳 Payment Status: ${req.payment_status}`);
        console.log(`      🕐 Paid At: ${req.paid_at}`);
        console.log('');
      });
    }

  } catch (error) {
    console.error('❌ Error checking payment status:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkPaymentStatus();
