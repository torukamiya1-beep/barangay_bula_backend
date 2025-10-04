const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

async function testPassword() {
  console.log('🔐 TESTING PASSWORD COMPARISON');
  console.log('='.repeat(60));

  const connection = await mysql.createConnection({
    host: 'hopper.proxy.rlwy.net',
    port: 26646,
    user: 'root',
    password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
    database: 'railway'
  });

  try {
    // Get the password hash from Railway database
    const [adminAccounts] = await connection.execute(
      'SELECT username, password_hash FROM admin_employee_accounts WHERE username = ?',
      ['admin12345']
    );

    if (adminAccounts.length === 0) {
      console.log('❌ Admin account not found');
      return;
    }

    const admin = adminAccounts[0];
    console.log(`✅ Found admin: ${admin.username}`);
    console.log(`📝 Password hash: ${admin.password_hash}`);

    // Test different possible passwords
    const possiblePasswords = [
      'admin12345',
      'Admin12345',
      'ADMIN12345',
      'admin123',
      'password',
      'admin',
      '12345'
    ];

    console.log('\n🧪 Testing possible passwords:');
    
    for (const password of possiblePasswords) {
      try {
        const isValid = await bcrypt.compare(password, admin.password_hash);
        console.log(`   ${password}: ${isValid ? '✅ MATCH' : '❌ No match'}`);
        
        if (isValid) {
          console.log(`\n🎉 FOUND CORRECT PASSWORD: "${password}"`);
          break;
        }
      } catch (error) {
        console.log(`   ${password}: ❌ Error - ${error.message}`);
      }
    }

    // Also test the hash from the local SQL file
    console.log('\n🔍 Testing with local SQL hash:');
    const localHash = '$2a$12$kCOtZxNsQcSEXo1RnIEN/O5owaxnATpggrNE4gJViPQw9cafFiK6y';
    console.log(`Local hash: ${localHash}`);
    console.log(`Railway hash: ${admin.password_hash}`);
    console.log(`Hashes match: ${localHash === admin.password_hash ? '✅ Yes' : '❌ No'}`);

    if (localHash !== admin.password_hash) {
      console.log('\n🚨 PASSWORD HASHES ARE DIFFERENT!');
      console.log('This explains why login is failing.');
      
      // Test if admin12345 works with the local hash
      const localHashWorks = await bcrypt.compare('admin12345', localHash);
      console.log(`admin12345 works with local hash: ${localHashWorks ? '✅ Yes' : '❌ No'}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

// Run the test
testPassword().catch(console.error);
