const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

// New Railway MySQL Database Credentials
const dbConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function checkRailwayAdminPasswords() {
  let connection;
  
  try {
    console.log('🔍 Checking Railway admin passwords...');
    console.log('');

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Railway database');

    // Get all admin accounts
    console.log('\n📋 Admin accounts in Railway database:');
    const [adminAccounts] = await connection.execute(`
      SELECT aea.id, aea.username, aea.password_hash, aea.status, aea.created_at,
             aep.first_name, aep.last_name
      FROM admin_employee_accounts aea
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      ORDER BY aea.id
    `);

    adminAccounts.forEach((admin, index) => {
      console.log(`\n  ${index + 1}. Admin Account:`);
      console.log(`     ID: ${admin.id}`);
      console.log(`     Username: ${admin.username}`);
      console.log(`     Name: ${admin.first_name} ${admin.last_name}`);
      console.log(`     Status: ${admin.status}`);
      console.log(`     Password hash: ${admin.password_hash.substring(0, 30)}...`);
      console.log(`     Created: ${admin.created_at}`);
    });

    // Test password verification for each admin
    console.log('\n🔐 Testing password verification...');
    
    const testPasswords = ['admin123', 'admin12345', 'password', '123456'];
    
    for (const admin of adminAccounts) {
      console.log(`\n  Testing passwords for ${admin.username}:`);
      
      for (const testPassword of testPasswords) {
        try {
          const isValid = await bcrypt.compare(testPassword, admin.password_hash);
          if (isValid) {
            console.log(`    ✅ Password "${testPassword}" works for ${admin.username}`);
          } else {
            console.log(`    ❌ Password "${testPassword}" doesn't work for ${admin.username}`);
          }
        } catch (error) {
          console.log(`    ⚠️ Error testing password "${testPassword}": ${error.message}`);
        }
      }
    }

    // Reset admin12345 password to ensure it works
    console.log('\n🔧 Resetting admin12345 password...');
    try {
      const newPassword = 'admin123';
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      const [updateResult] = await connection.execute(
        'UPDATE admin_employee_accounts SET password_hash = ?, password_changed_at = NOW() WHERE username = ?',
        [hashedPassword, 'admin12345']
      );

      if (updateResult.affectedRows > 0) {
        console.log('✅ Password reset successful for admin12345');
        
        // Verify the new password
        const [updatedAdmin] = await connection.execute(
          'SELECT password_hash FROM admin_employee_accounts WHERE username = ?',
          ['admin12345']
        );
        
        if (updatedAdmin.length > 0) {
          const isValid = await bcrypt.compare(newPassword, updatedAdmin[0].password_hash);
          console.log(`✅ New password verification: ${isValid ? 'VALID' : 'INVALID'}`);
        }
      } else {
        console.log('❌ No admin account found with username admin12345');
      }
    } catch (error) {
      console.log('❌ Password reset failed:', error.message);
    }

    // Also check if there are any other admin accounts we can use
    console.log('\n📋 Active admin accounts summary:');
    const activeAdmins = adminAccounts.filter(admin => admin.status === 'active');
    
    if (activeAdmins.length > 0) {
      console.log(`Found ${activeAdmins.length} active admin accounts:`);
      activeAdmins.forEach((admin, index) => {
        console.log(`  ${index + 1}. ${admin.username} (${admin.first_name} ${admin.last_name})`);
      });
    } else {
      console.log('❌ No active admin accounts found!');
    }

    console.log('\n🎉 Admin password check completed!');
    
  } catch (error) {
    console.error('❌ Admin password check failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the check
if (require.main === module) {
  checkRailwayAdminPasswords()
    .then(() => {
      console.log('🎊 Admin password check completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Admin password check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkRailwayAdminPasswords };
