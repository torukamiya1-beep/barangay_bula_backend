const mysql = require('mysql2/promise');

async function checkAdminRole() {
  const connection = await mysql.createConnection({
    host: 'localhost', 
    user: 'root', 
    password: '', 
    database: 'barangay_management_system'
  });
  
  try {
    console.log('🔍 Checking admin role...');
    
    const [admins] = await connection.execute(`
      SELECT aea.id, aea.username, aea.role, aea.status
      FROM admin_employee_accounts aea
      WHERE aea.username = 'admin12345'
    `);
    
    if (admins.length > 0) {
      const admin = admins[0];
      console.log(`Admin user: ${admin.username}`);
      console.log(`Role: ${admin.role}`);
      console.log(`Status: ${admin.status}`);
      
      // Check what roles are expected by the authorize middleware
      console.log('\n🔍 Checking user routes authorization...');
      console.log('User routes require authorize("admin") - checking if role matches...');
      
      if (admin.role === 'admin') {
        console.log('✅ Role matches - should be authorized');
      } else {
        console.log(`❌ Role mismatch - expected "admin", got "${admin.role}"`);
      }
    } else {
      console.log('❌ Admin user not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkAdminRole();
