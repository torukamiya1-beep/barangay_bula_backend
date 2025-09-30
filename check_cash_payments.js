const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkCashPayments() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barangay_management_system',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('🔍 Checking cash payment workflow...');
    
    // Check payment methods
    const [paymentMethods] = await connection.execute(`
      SELECT * FROM payment_methods ORDER BY id
    `);
    console.log('💳 Payment methods:');
    console.table(paymentMethods);
    
    // Check existing cash payment requests
    const [cashRequests] = await connection.execute(`
      SELECT dr.*, rs.status_name, pm.method_name, pm.requires_verification
      FROM document_requests dr
      JOIN request_status rs ON dr.status_id = rs.id
      JOIN payment_methods pm ON dr.payment_method_id = pm.id
      WHERE pm.method_name = 'Cash'
      ORDER BY dr.id DESC
      LIMIT 5
    `);
    
    console.log('💰 Existing cash payment requests:');
    console.table(cashRequests);
    
    // Check status options
    const [statusOptions] = await connection.execute(`
      SELECT * FROM request_status ORDER BY id
    `);
    console.log('📊 Available status options:');
    console.table(statusOptions);

    // Check barangay clearance applications
    console.log('\n🏘️ Barangay clearance applications:');
    const [bcApplications] = await connection.execute(`
      SELECT bca.*, dr.request_number, dr.status_id, rs.status_name
      FROM barangay_clearance_applications bca
      JOIN document_requests dr ON bca.request_id = dr.id
      JOIN request_status rs ON dr.status_id = rs.id
      ORDER BY bca.id DESC
      LIMIT 5
    `);
    console.table(bcApplications);

    // Check barangay clearance table schema
    console.log('\n📋 Barangay clearance applications table schema:');
    const [bcSchema] = await connection.execute(`
      DESCRIBE barangay_clearance_applications
    `);
    console.table(bcSchema);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkCashPayments();
