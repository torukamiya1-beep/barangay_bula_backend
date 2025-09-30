require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');

async function checkTableStructure() {
  try {
    console.log('🔍 Checking payment_transactions table structure...\n');
    
    await connectDatabase();
    
    // Check table structure
    const structure = await executeQuery('DESCRIBE payment_transactions');
    console.log('📋 Table structure:');
    console.table(structure);
    
    // Check the specific transaction
    const transaction = await executeQuery(`
      SELECT * FROM payment_transactions WHERE id = 86
    `);
    
    console.log('\n📋 Specific transaction data:');
    if (transaction.length > 0) {
      console.log('Raw data:', transaction[0]);
      console.log('Status value:', JSON.stringify(transaction[0].status));
      console.log('Status length:', transaction[0].status ? transaction[0].status.length : 'null/undefined');
    }
    
    await closeDatabase();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

checkTableStructure();
