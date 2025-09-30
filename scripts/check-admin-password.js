const { executeQuery } = require('../src/config/database');
const bcrypt = require('bcryptjs');

async function checkAdminPassword() {
  try {
    console.log('🔄 Checking admin password...');
    
    const accounts = await executeQuery('SELECT username, password_hash FROM admin_employee_accounts WHERE username = ?', ['admin12345']);
    
    if (accounts.length === 0) {
      console.log('❌ No admin account found with username admin12345');
      return;
    }
    
    const account = accounts[0];
    console.log('📊 Found admin account:', account.username);
    console.log('🔐 Password hash:', account.password_hash);
    
    // Test different password combinations
    const testPasswords = ['12345QWERTqwert', 'admin123', 'admin12345'];
    
    for (const password of testPasswords) {
      const isMatch = await bcrypt.compare(password, account.password_hash);
      console.log(`🔍 Testing password "${password}": ${isMatch ? '✅ MATCH' : '❌ NO MATCH'}`);
    }
    
    console.log('\n✅ Check completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking admin password:', error);
    process.exit(1);
  }
}

checkAdminPassword();
