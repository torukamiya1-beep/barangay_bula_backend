require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');

async function fixTransactionStatusCorrect() {
  try {
    console.log('🔧 Fixing transaction status to "succeeded"...\n');
    
    await connectDatabase();
    
    // Update the specific transaction with ID 86 to 'succeeded' (correct ENUM value)
    const result = await executeQuery(`
      UPDATE payment_transactions 
      SET status = 'succeeded', completed_at = NOW()
      WHERE id = 86
    `);
    
    console.log(`✅ Updated ${result.affectedRows} transaction(s) to "succeeded" status`);
    
    // Verify the update
    const updatedTransaction = await executeQuery(`
      SELECT id, request_id, status, external_transaction_id, completed_at
      FROM payment_transactions 
      WHERE id = 86
    `);
    
    console.log('\n📋 Updated transaction:');
    console.table(updatedTransaction);
    
    await closeDatabase();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

fixTransactionStatusCorrect();
