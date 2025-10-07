#!/usr/bin/env node

const mysql = require('mysql2/promise');

const railwayConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function createMissingReceipts() {
  let connection;
  try {
    console.log('========================================');
    console.log('  CREATING MISSING RECEIPTS');
    console.log('========================================\n');
    
    console.log('🔄 Connecting to Railway MySQL...');
    connection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected successfully!\n');
    
    // Find all succeeded payments without receipts
    console.log('🔄 Finding payments without receipts...');
    const [payments] = await connection.query(`
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
        pt.payment_description,
        pt.completed_at,
        pt.created_at
      FROM payment_transactions pt
      JOIN document_requests dr ON pt.request_id = dr.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN payment_methods pm ON pt.payment_method_id = pm.id
      WHERE pt.status = 'succeeded'
        AND NOT EXISTS (SELECT 1 FROM receipts WHERE transaction_id = pt.id)
    `);
    
    if (payments.length === 0) {
      console.log('✅ No missing receipts found!\n');
      return;
    }
    
    console.log(`   Found ${payments.length} payment(s) without receipts:\n`);
    
    // Create receipts for each payment
    for (const payment of payments) {
      const receiptNumber = `RCP-${payment.transaction_id.toString().padStart(8, '0')}`;
      
      console.log(`🔄 Creating receipt for transaction ${payment.transaction_id}...`);
      console.log(`   Request: ${payment.request_number}`);
      console.log(`   Client: ${payment.client_name}`);
      console.log(`   Amount: ₱${payment.amount}`);
      console.log(`   Receipt Number: ${receiptNumber}`);
      
      try {
        await connection.query(`
          INSERT INTO receipts (
            transaction_id,
            client_id,
            request_id,
            receipt_number,
            client_name,
            client_email,
            client_phone,
            request_number,
            document_type,
            payment_method,
            payment_method_code,
            amount,
            processing_fee,
            net_amount,
            currency,
            external_transaction_id,
            paymongo_payment_intent_id,
            payment_status,
            receipt_date,
            payment_date,
            description
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          payment.transaction_id,
          payment.client_id,
          payment.request_id,
          receiptNumber,
          payment.client_name,
          payment.client_email,
          payment.client_phone,
          payment.request_number,
          payment.document_type,
          payment.payment_method,
          payment.payment_method_code,
          payment.amount,
          payment.processing_fee || 0,
          payment.net_amount || payment.amount,
          payment.currency || 'PHP',
          payment.external_transaction_id,
          payment.paymongo_payment_intent_id,
          'succeeded',
          payment.completed_at || payment.created_at,
          payment.completed_at,
          payment.payment_description || 'Payment for document request'
        ]);
        
        console.log(`   ✅ Receipt created: ${receiptNumber}\n`);
      } catch (error) {
        console.error(`   ❌ Failed to create receipt: ${error.message}\n`);
      }
    }
    
    // Verify all receipts were created
    console.log('🔄 Verifying receipts...');
    const [remainingPayments] = await connection.query(`
      SELECT COUNT(*) as count
      FROM payment_transactions pt
      WHERE pt.status = 'succeeded'
        AND NOT EXISTS (SELECT 1 FROM receipts WHERE transaction_id = pt.id)
    `);
    
    if (remainingPayments[0].count === 0) {
      console.log('✅ All succeeded payments now have receipts!\n');
    } else {
      console.log(`⚠️  ${remainingPayments[0].count} payment(s) still missing receipts.\n`);
    }
    
    // Show summary of created receipts
    console.log('🔄 Fetching created receipts...');
    const [receipts] = await connection.query(`
      SELECT 
        r.receipt_number,
        r.client_name,
        r.request_number,
        r.amount,
        r.payment_status,
        r.receipt_date
      FROM receipts r
      ORDER BY r.id DESC
      LIMIT 5
    `);
    
    console.log('   Recent receipts:');
    console.table(receipts);
    
    console.log('\n========================================');
    console.log('  RECEIPTS CREATED SUCCESSFULLY!');
    console.log('========================================\n');
    console.log('✅ Missing receipts have been created!');
    console.log('✅ Clients can now view their receipts!\n');
    
  } catch (error) {
    console.error('\n========================================');
    console.error('  FAILED TO CREATE RECEIPTS!');
    console.error('========================================\n');
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    console.error('\nTroubleshooting:');
    console.error('1. Verify Railway credentials');
    console.error('2. Check network connection');
    console.error('3. Ensure receipts table exists');
    console.error('4. Check foreign key constraints\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed.\n');
    }
  }
}

createMissingReceipts();

