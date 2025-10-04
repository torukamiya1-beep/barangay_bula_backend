const mysql = require('mysql2/promise');

async function checkRailwayAdmin() {
  console.log('🔍 CHECKING RAILWAY DATABASE ADMIN ACCOUNTS');
  console.log('='.repeat(60));

  const connection = await mysql.createConnection({
    host: 'hopper.proxy.rlwy.net',
    port: 26646,
    user: 'root',
    password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
    database: 'railway'
  });

  try {
    console.log('✅ Connected to Railway database');

    // Check admin accounts
    console.log('\n📋 Admin Employee Accounts:');
    const [adminAccounts] = await connection.execute(
      'SELECT id, username, role, status, created_at, last_login FROM admin_employee_accounts ORDER BY id'
    );
    
    if (adminAccounts.length === 0) {
      console.log('❌ No admin accounts found!');
    } else {
      console.log(`✅ Found ${adminAccounts.length} admin accounts:`);
      adminAccounts.forEach(account => {
        console.log(`   - ID: ${account.id}, Username: ${account.username}, Role: ${account.role}, Status: ${account.status}`);
      });
    }

    // Check if admin12345 exists specifically
    console.log('\n🔍 Checking admin12345 account:');
    const [specificAdmin] = await connection.execute(
      'SELECT id, username, role, status, password_hash FROM admin_employee_accounts WHERE username = ?',
      ['admin12345']
    );

    if (specificAdmin.length === 0) {
      console.log('❌ admin12345 account not found!');
    } else {
      const admin = specificAdmin[0];
      console.log('✅ admin12345 account found:');
      console.log(`   - ID: ${admin.id}`);
      console.log(`   - Username: ${admin.username}`);
      console.log(`   - Role: ${admin.role}`);
      console.log(`   - Status: ${admin.status}`);
      console.log(`   - Password Hash: ${admin.password_hash.substring(0, 20)}...`);
    }

    // Check admin profiles
    console.log('\n📋 Admin Employee Profiles:');
    const [adminProfiles] = await connection.execute(
      'SELECT account_id, first_name, last_name, email FROM admin_employee_profiles ORDER BY account_id'
    );
    
    if (adminProfiles.length === 0) {
      console.log('❌ No admin profiles found!');
    } else {
      console.log(`✅ Found ${adminProfiles.length} admin profiles:`);
      adminProfiles.forEach(profile => {
        console.log(`   - Account ID: ${profile.account_id}, Name: ${profile.first_name} ${profile.last_name}, Email: ${profile.email}`);
      });
    }

  } catch (error) {
    console.error('❌ Database error:', error.message);
  } finally {
    await connection.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the check
checkRailwayAdmin().catch(console.error);
