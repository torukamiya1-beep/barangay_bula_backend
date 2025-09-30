require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');

async function checkReceipts() {
  try {
    console.log('🔍 Checking receipts table...\n');
    
    await connectDatabase();
    
    // Check if receipts table exists
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as exists_count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'receipts'
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    console.log(`📋 Receipts table exists: ${tableExists[0].exists_count > 0 ? '✅ YES' : '❌ NO'}`);
    
    if (tableExists[0].exists_count > 0) {
      // Check receipts count
      const receiptCount = await executeQuery('SELECT COUNT(*) as count FROM receipts');
      console.log(`📊 Total receipts: ${receiptCount[0].count}`);
      
      if (receiptCount[0].count > 0) {
        // Show recent receipts
        const recentReceipts = await executeQuery(`
          SELECT id, receipt_number, client_name, document_type, amount, payment_status, receipt_date
          FROM receipts 
          ORDER BY receipt_date DESC 
          LIMIT 5
        `);
        
        console.log('\n📋 Recent receipts:');
        console.table(recentReceipts);
      }
      
      // Check payment_transactions table
      const transactionCount = await executeQuery('SELECT COUNT(*) as count FROM payment_transactions');
      console.log(`\n💳 Total payment transactions: ${transactionCount[0].count}`);

      if (transactionCount[0].count > 0) {
        const recentTransactions = await executeQuery(`
          SELECT id, request_id, amount, status, external_transaction_id, created_at
          FROM payment_transactions
          ORDER BY created_at DESC
          LIMIT 5
        `);

        console.log('\n💳 Recent payment transactions:');
        console.table(recentTransactions);
      }

      // Check payment_webhooks table
      const webhookCount = await executeQuery('SELECT COUNT(*) as count FROM payment_webhooks');
      console.log(`\n🔔 Total payment webhooks: ${webhookCount[0].count}`);

      if (webhookCount[0].count > 0) {
        const recentWebhooks = await executeQuery(`
          SELECT webhook_id, event_type, processed, created_at
          FROM payment_webhooks
          ORDER BY created_at DESC
          LIMIT 3
        `);

        console.log('\n🔔 Recent payment webhooks:');
        console.table(recentWebhooks);

        // Show webhook payload for debugging
        const webhookPayload = await executeQuery(`
          SELECT payload
          FROM payment_webhooks
          ORDER BY created_at DESC
          LIMIT 1
        `);

        if (webhookPayload.length > 0) {
          console.log('\n🔍 Latest webhook payload:');
          try {
            const payload = JSON.parse(webhookPayload[0].payload);
            console.log('Event type:', payload.data?.attributes?.type);
            console.log('Payment status:', payload.data?.attributes?.data?.attributes?.status);
            console.log('Payment ID:', payload.data?.attributes?.data?.id);
          } catch (e) {
            console.log('Raw payload:', webhookPayload[0].payload.substring(0, 200) + '...');
          }
        }
      }
    }
    
    await closeDatabase();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkReceipts();
