const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function checkAdminTableStructure() {
  console.log('🔍 CHECKING ADMIN TABLE STRUCTURE');
  console.log('='.repeat(50));
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    
    // Check table structure
    const [columns] = await connection.execute('DESCRIBE admin_employee_accounts');
    
    console.log('📊 admin_employee_accounts table structure:');
    columns.forEach((col, i) => {
      console.log(`${i+1}. ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} - Default: ${col.Default || 'None'}`);
    });
    
    // Get sample data
    const [admins] = await connection.execute('SELECT * FROM admin_employee_accounts LIMIT 3');
    
    console.log('\n📋 Sample admin records:');
    admins.forEach((admin, i) => {
      console.log(`${i+1}. ID: ${admin.id}, Username: ${admin.username}, Status: ${admin.status}`);
      console.log(`   Available fields: ${Object.keys(admin).join(', ')}`);
    });
    
    await connection.end();
    
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
  }
}

checkAdminTableStructure();
