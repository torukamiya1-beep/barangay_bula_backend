const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function checkAdminPasswords() {
  console.log('🔍 CHECKING ADMIN PASSWORDS');
  console.log('='.repeat(50));
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Get all admin accounts
    const [admins] = await connection.execute('SELECT id, username, password_hash, status FROM admin_employee_accounts WHERE status = "active"');
    
    console.log(`📊 Found ${admins.length} active admin accounts:`);
    
    const commonPasswords = [
      'admin',
      'password', 
      '123456',
      'admin123',
      'admin12345',
      'password123',
      '12345678',
      'qwerty',
      'letmein'
    ];
    
    for (const admin of admins) {
      console.log(`\n👤 Testing admin: ${admin.username} (ID: ${admin.id})`);
      console.log(`   Stored hash: ${admin.password_hash.substring(0, 20)}...`);

      let foundPassword = null;

      for (const testPassword of commonPasswords) {
        try {
          const isMatch = await bcrypt.compare(testPassword, admin.password_hash);
          if (isMatch) {
            foundPassword = testPassword;
            console.log(`   ✅ FOUND PASSWORD: "${testPassword}"`);
            break;
          }
        } catch (error) {
          console.log(`   ❌ Error testing password "${testPassword}": ${error.message}`);
        }
      }
      
      if (!foundPassword) {
        console.log(`   ❌ No common password found for ${admin.username}`);
        
        // Try to create a new password for this admin
        console.log(`   🔧 Creating new password "admin123" for ${admin.username}...`);
        
        try {
          const newPasswordHash = await bcrypt.hash('admin123', 10);
          await connection.execute('UPDATE admin_employee_accounts SET password_hash = ? WHERE id = ?', [newPasswordHash, admin.id]);
          console.log(`   ✅ Password updated! New password: "admin123"`);
          foundPassword = 'admin123';
        } catch (error) {
          console.log(`   ❌ Failed to update password: ${error.message}`);
        }
      }
      
      if (foundPassword) {
        console.log(`   🎯 WORKING CREDENTIALS: ${admin.username} / ${foundPassword}`);
      }
    }
    
    await connection.end();
    
    console.log('\n🎯 SUMMARY:');
    console.log('='.repeat(30));
    console.log('Working admin credentials found above.');
    console.log('Use these credentials to test the frontend authentication.');
    
  } catch (error) {
    console.error('❌ Password check failed:', error.message);
  }
}

checkAdminPasswords();
