const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkStatusMapping() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barangay_management_system',
      port: process.env.DB_PORT || 3306
    });
    
    console.log('📊 All Status Records:');
    const [statuses] = await connection.execute('SELECT * FROM request_status ORDER BY id');
    console.table(statuses);
    
    console.log('\n🔍 Payment-related statuses:');
    const [payment] = await connection.execute('SELECT * FROM request_status WHERE status_name LIKE "%payment%"');
    console.table(payment);
    
    console.log('\n❌ Missing status IDs that backend expects:');
    const expectedIds = [10, 12]; // payment_pending, payment_failed
    for (const id of expectedIds) {
      const [exists] = await connection.execute('SELECT * FROM request_status WHERE id = ?', [id]);
      if (exists.length === 0) {
        console.log(`   ID ${id}: MISSING`);
      } else {
        console.log(`   ID ${id}: EXISTS - ${exists[0].status_name}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkStatusMapping();
