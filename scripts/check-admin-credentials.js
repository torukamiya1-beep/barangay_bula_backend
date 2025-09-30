const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function checkAdminCredentials() {
  const connection = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'barangay_management_system'
  });
  
  try {
    console.log('🔍 Checking admin accounts...');
    
    const [admins] = await connection.execute(`
      SELECT aea.id, aea.username, aea.password_hash, aea.status, aep.first_name, aep.last_name
      FROM admin_employee_accounts aea
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      ORDER BY aea.id
    `);
    
    console.log(`Found ${admins.length} admin accounts:`);
    
    for (const admin of admins) {
      console.log(`\nID: ${admin.id}`);
      console.log(`Username: ${admin.username}`);
      console.log(`Status: ${admin.status}`);
      console.log(`Name: ${admin.first_name} ${admin.last_name}`);
      console.log(`Password hash: ${admin.password_hash ? admin.password_hash.substring(0, 20) + '...' : 'NULL'}`);

      // Test password verification
      if (admin.password_hash) {
        const testPasswords = ['admin123', 'password', '123456', 'admin'];
        for (const testPass of testPasswords) {
          const isValid = await bcrypt.compare(testPass, admin.password_hash);
          if (isValid) {
            console.log(`✅ Password '${testPass}' is valid for ${admin.username}`);
            break;
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAdminCredentials();
