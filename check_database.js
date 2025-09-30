const mysql = require('mysql2/promise');

const config = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function checkDatabase() {
  try {
    const connection = await mysql.createConnection(config);
    
    console.log('🔍 Checking audit_logs table structure and data...');
    
    // Check if audit_logs table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "audit_logs"');
    if (tables.length === 0) {
      console.log('❌ audit_logs table does not exist!');
      await connection.end();
      return;
    }
    
    // Get table structure
    const [structure] = await connection.execute('DESCRIBE audit_logs');
    console.log('✅ audit_logs table structure:');
    structure.forEach(col => {
      console.log(`  ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Default ? 'DEFAULT ' + col.Default : ''}`);
    });
    
    // Count records
    const [countResult] = await connection.execute('SELECT COUNT(*) as count FROM audit_logs');
    console.log(`📊 audit_logs records: ${countResult[0].count}`);
    
    // Show recent records if any
    if (countResult[0].count > 0) {
      const [recent] = await connection.execute('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5');
      console.log('📋 Recent audit_logs entries:');
      recent.forEach((record, i) => {
        console.log(`  ${i+1}. ${record.created_at} - ${record.user_type} user ${record.user_id} - ${record.action}`);
      });
    }
    
    console.log('\n🔍 Checking request_status_history table...');
    
    // Check request_status_history
    const [historyTables] = await connection.execute('SHOW TABLES LIKE "request_status_history"');
    if (historyTables.length > 0) {
      const [historyCount] = await connection.execute('SELECT COUNT(*) as count FROM request_status_history');
      console.log(`📊 request_status_history records: ${historyCount[0].count}`);
      
      if (historyCount[0].count > 0) {
        const [historyRecent] = await connection.execute('SELECT * FROM request_status_history ORDER BY changed_at DESC LIMIT 3');
        console.log('📋 Recent request_status_history entries:');
        historyRecent.forEach((record, i) => {
          console.log(`  ${i+1}. ${record.changed_at} - ${record.changed_by_name} - ${record.old_status} → ${record.new_status}`);
        });
      }
    }
    
    console.log('\n🔍 Checking admin accounts...');

    // Check admin accounts
    const [adminTables] = await connection.execute('SHOW TABLES LIKE "admin_employee_accounts"');
    if (adminTables.length > 0) {
      // First check the table structure
      const [adminStructure] = await connection.execute('DESCRIBE admin_employee_accounts');
      console.log('📋 Admin accounts table structure:');
      adminStructure.forEach(col => {
        console.log(`  ${col.Field}: ${col.Type}`);
      });

      // Then get the accounts
      const [adminAccounts] = await connection.execute('SELECT * FROM admin_employee_accounts LIMIT 3');
      console.log('📋 Admin accounts:');
      adminAccounts.forEach((account, i) => {
        console.log(`  ${i+1}. ID: ${account.id}, Username: ${account.username}, Role: ${account.role || 'N/A'}`);
      });
    }

    await connection.end();
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
  }
}

checkDatabase();
