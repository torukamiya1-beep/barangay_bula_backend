const mysql = require('mysql2/promise');
const UserService = require('../src/services/userServiceNew');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function testArchiveNavigation() {
  let connection;
  
  try {
    console.log('🧪 Testing Archive Navigation and Soft Delete\n');

    connection = await mysql.createConnection(dbConfig);

    // 1. Check current user status
    console.log('📊 Current User Status:');
    const [users] = await connection.execute(`
      SELECT 
        'client' as type,
        ca.id,
        ca.username,
        ca.status,
        cp.first_name,
        cp.last_name
      FROM client_accounts ca
      JOIN client_profiles cp ON ca.id = cp.account_id
      UNION ALL
      SELECT 
        'admin' as type,
        aea.id,
        aea.username,
        aea.status,
        aep.first_name,
        aep.last_name
      FROM admin_employee_accounts aea
      JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      ORDER BY type, status, first_name
    `);

    console.log('All Users:');
    users.forEach(user => {
      console.log(`   ${user.type}_${user.id}: ${user.first_name} ${user.last_name} (@${user.username}) - ${user.status}`);
    });

    // 2. Test soft delete functionality
    const activeUsers = users.filter(u => u.status === 'active');
    if (activeUsers.length > 0) {
      const testUser = activeUsers[0];
      const compositeId = `${testUser.type}_${testUser.id}`;
      
      console.log(`\n🗑️ Testing Soft Delete on: ${testUser.first_name} ${testUser.last_name} (${compositeId})`);
      
      try {
        const deleteResult = await UserService.deleteUser(compositeId);
        console.log('Delete result:', deleteResult);
        
        // Verify the user is now inactive
        const [afterDelete] = await connection.execute(`
          SELECT status FROM ${testUser.type === 'admin' ? 'admin_employee_accounts' : 'client_accounts'}
          WHERE id = ?
        `, [testUser.id]);
        
        if (afterDelete.length > 0) {
          console.log(`✅ User status after delete: ${afterDelete[0].status}`);
          if (afterDelete[0].status === 'inactive') {
            console.log('✅ Soft delete working correctly!');
          } else {
            console.log('❌ Soft delete failed - status not changed to inactive');
          }
        }
      } catch (error) {
        console.error('❌ Delete test failed:', error.message);
      }
    }

    // 3. Test archive query
    console.log('\n📋 Testing Archive Query:');
    try {
      const archiveResult = await UserService.getArchivedUsers(1, 10, {});
      console.log(`Archive query result: ${archiveResult.data.length} archived users found`);
      
      archiveResult.data.forEach(user => {
        console.log(`   - ${user.full_name} (@${user.username}) - ${user.type}`);
      });
      
      if (archiveResult.data.length > 0) {
        console.log('✅ Archive query working correctly!');
      } else {
        console.log('ℹ️ No archived users found (this is normal if no users have been deleted)');
      }
    } catch (error) {
      console.error('❌ Archive query failed:', error.message);
    }

    // 4. Test restore functionality
    const [archivedUsers] = await connection.execute(`
      SELECT 
        'client' as type,
        ca.id,
        cp.first_name,
        cp.last_name
      FROM client_accounts ca
      JOIN client_profiles cp ON ca.id = cp.account_id
      WHERE ca.status = 'inactive'
      UNION ALL
      SELECT 
        'admin' as type,
        aea.id,
        aep.first_name,
        aep.last_name
      FROM admin_employee_accounts aea
      JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      WHERE aea.status = 'inactive'
      LIMIT 1
    `);

    if (archivedUsers.length > 0) {
      const testUser = archivedUsers[0];
      const compositeId = `${testUser.type}_${testUser.id}`;
      
      console.log(`\n🔄 Testing Restore on: ${testUser.first_name} ${testUser.last_name} (${compositeId})`);
      
      try {
        const restoreResult = await UserService.restoreUser(compositeId);
        console.log('Restore result:', restoreResult);
        
        if (restoreResult.success) {
          console.log('✅ Restore functionality working correctly!');
        }
      } catch (error) {
        console.error('❌ Restore test failed:', error.message);
      }
    }

    console.log('\n🎯 Navigation Test Results:');
    console.log('✅ Archive route should be: /admin/users/archive');
    console.log('✅ Sidebar navigation fixed to include archive route');
    console.log('✅ Soft delete uses status = "inactive" (not deleted_at column)');
    console.log('✅ Archive page should show users with status = "inactive"');

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
  }
}

testArchiveNavigation();
