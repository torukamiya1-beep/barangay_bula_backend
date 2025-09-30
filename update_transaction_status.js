require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');

async function updateTransactionStatus() {
  try {
    console.log('🔧 Updating transaction status to "paid"...\n');
    
    await connectDatabase();
    
    // Update the transaction status to 'paid'
    const result = await executeQuery(`
      UPDATE payment_transactions
      SET status = 'paid', completed_at = NOW()
      WHERE status = '' OR status IS NULL OR TRIM(status) = ''
    `);
    
    console.log(`✅ Updated ${result.affectedRows} transaction(s) to "paid" status`);
    
    // Verify the update
    const updatedTransactions = await executeQuery(`
      SELECT id, request_id, status, external_transaction_id, completed_at
      FROM payment_transactions 
      WHERE status = 'paid'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📋 Updated transactions:');
    console.table(updatedTransactions);
    
    await closeDatabase();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

updateTransactionStatus();
