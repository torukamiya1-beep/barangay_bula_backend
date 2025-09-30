const mysql = require('mysql2/promise');

async function checkTableStructure() {
  const connection = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'barangay_management_system'
  });
  
  try {
    console.log('🔍 Checking table structures...');
    
    console.log('\nAdmin employee accounts structure:');
    const [adminCols] = await connection.execute('DESCRIBE admin_employee_accounts');
    adminCols.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    
    console.log('\nAdmin employee profiles structure:');
    const [profileCols] = await connection.execute('DESCRIBE admin_employee_profiles');
    profileCols.forEach(col => console.log(`  ${col.Field}: ${col.Type}`));
    
    console.log('\nSample admin data:');
    const [admins] = await connection.execute(`
      SELECT aea.id, aea.username, aea.status, aep.first_name, aep.last_name
      FROM admin_employee_accounts aea
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      LIMIT 5
    `);
    
    admins.forEach(admin => {
      console.log(`  ID: ${admin.id}, Username: ${admin.username}, Status: ${admin.status}, Name: ${admin.first_name} ${admin.last_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkTableStructure();
