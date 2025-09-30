const { executeQuery } = require('../src/config/database');

async function checkAdminAccounts() {
  try {
    console.log('🔄 Checking admin accounts...');
    
    const accounts = await executeQuery('SELECT username, role, status FROM admin_employee_accounts');
    
    console.log('📊 Admin accounts found:');
    accounts.forEach((account, index) => {
      console.log(`  ${index + 1}. Username: ${account.username}, Role: ${account.role}, Status: ${account.status}`);
    });
    
    console.log('\n✅ Check completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error checking admin accounts:', error);
    process.exit(1);
  }
}

checkAdminAccounts();
