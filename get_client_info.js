require('dotenv').config();
const { executeQuery, connectDatabase, closeDatabase } = require('./src/config/database');

async function getClientInfo() {
  try {
    console.log('🔍 Getting client info for receipt testing...\n');
    
    await connectDatabase();
    
    // Get the client who has the receipt
    const clientQuery = `
      SELECT
        ca.id as account_id,
        ca.username,
        cp.email,
        cp.first_name,
        cp.last_name,
        r.id as receipt_id,
        r.receipt_number
      FROM receipts r
      JOIN client_accounts ca ON r.client_id = ca.id
      JOIN client_profiles cp ON ca.id = cp.account_id
      ORDER BY r.created_at DESC
      LIMIT 1
    `;
    
    const clientData = await executeQuery(clientQuery);
    
    if (clientData.length > 0) {
      const client = clientData[0];
      console.log('📋 Client with receipt found:');
      console.log(`   Account ID: ${client.account_id}`);
      console.log(`   Username: ${client.username}`);
      console.log(`   Email: ${client.email}`);
      console.log(`   Name: ${client.first_name} ${client.last_name}`);
      console.log(`   Receipt ID: ${client.receipt_id}`);
      console.log(`   Receipt Number: ${client.receipt_number}`);
    } else {
      console.log('❌ No client with receipt found');
    }
    
    await closeDatabase();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

getClientInfo();
