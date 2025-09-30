const UserService = require('../src/services/userServiceNew');
const mysql = require('mysql2/promise');

async function testRestore() {
  let connection;
  
  try {
    console.log('🧪 Testing Restore Functionality');
    
    connection = await mysql.createConnection({
      host: 'localhost', 
      user: 'root', 
      password: '', 
      database: 'barangay_management_system'
    });
    
    // Check current status
    const [beforeRestore] = await connection.execute(`
      SELECT ca.id, ca.username, ca.status, cp.first_name, cp.last_name
      FROM client_accounts ca
      JOIN client_profiles cp ON ca.id = cp.account_id
      WHERE ca.id = 12
    `);
    
    if (beforeRestore.length > 0) {
      const user = beforeRestore[0];
      console.log(`Before restore: ${user.first_name} ${user.last_name} - ${user.status}`);
      
      if (user.status === 'inactive') {
        // Test restoring the archived user
        console.log('Attempting to restore user...');
        const result = await UserService.restoreUser('client_12');
        console.log('Restore result:', result);
        
        // Verify the user is now active
        const [afterRestore] = await connection.execute(`
          SELECT ca.id, ca.username, ca.status, cp.first_name, cp.last_name
          FROM client_accounts ca
          JOIN client_profiles cp ON ca.id = cp.account_id
          WHERE ca.id = 12
        `);
        
        if (afterRestore.length > 0) {
          const restoredUser = afterRestore[0];
          console.log(`After restore: ${restoredUser.first_name} ${restoredUser.last_name} - ${restoredUser.status}`);
          
          if (restoredUser.status === 'active') {
            console.log('✅ Restore functionality working correctly!');
          } else {
            console.log('❌ Restore failed - status not changed');
          }
        }
      } else {
        console.log('User is already active, no need to restore');
      }
    } else {
      console.log('User not found');
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
  }
}

testRestore();
