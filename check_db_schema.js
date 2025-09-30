const mysql = require('mysql2/promise');

async function checkSchema() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'barangay_management_system'
    });
    
    console.log('Client Profiles table structure:');
    const [profileCols] = await connection.execute('DESCRIBE client_profiles');
    profileCols.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });
    
    console.log('\nClient Accounts table structure:');
    const [accountCols] = await connection.execute('DESCRIBE client_accounts');
    accountCols.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });
    
    console.log('\nResidency Documents table structure:');
    const [docCols] = await connection.execute('DESCRIBE residency_documents');
    docCols.forEach(col => {
      console.log(`  ${col.Field} - ${col.Type}`);
    });
    
    // Check for clients with phone numbers
    console.log('\nClients with phone numbers:');
    const [clients] = await connection.execute(`
      SELECT cp.account_id, cp.first_name, cp.last_name, cp.phone_number, ca.status
      FROM client_profiles cp
      JOIN client_accounts ca ON cp.account_id = ca.id
      WHERE cp.phone_number IS NOT NULL AND cp.phone_number != ''
      LIMIT 3
    `);
    
    clients.forEach(client => {
      console.log(`  ID: ${client.account_id}, Name: ${client.first_name} ${client.last_name}, Phone: ${client.phone_number}, Status: ${client.status}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkSchema();
