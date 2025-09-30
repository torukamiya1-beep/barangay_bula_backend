const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function testArchiveFunctionality() {
  let connection;
  
  try {
    console.log('🗄️ Testing Archive Functionality\n');

    connection = await mysql.createConnection(dbConfig);

    // 1. Check current user statuses
    console.log('📊 Current User Status Distribution:');
    
    const [adminStatuses] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM admin_employee_accounts 
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('Admin Accounts:');
    adminStatuses.forEach(s => console.log(`   - ${s.status}: ${s.count} users`));
    
    const [clientStatuses] = await connection.execute(`
      SELECT status, COUNT(*) as count 
      FROM client_accounts 
      GROUP BY status
      ORDER BY status
    `);
    
    console.log('Client Accounts:');
    clientStatuses.forEach(s => console.log(`   - ${s.status}: ${s.count} users`));

    // 2. Create some test archived users if none exist
    const [archivedCount] = await connection.execute(`
      SELECT 
        (SELECT COUNT(*) FROM admin_employee_accounts WHERE status = 'inactive') +
        (SELECT COUNT(*) FROM client_accounts WHERE status = 'inactive') as total_archived
    `);

    if (archivedCount[0].total_archived === 0) {
      console.log('\n🧪 Creating test archived users...');
      
      // Archive one client for testing
      const [activeClients] = await connection.execute(`
        SELECT ca.id, cp.first_name, cp.last_name 
        FROM client_accounts ca
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE ca.status = 'active'
        LIMIT 1
      `);

      if (activeClients.length > 0) {
        const client = activeClients[0];
        await connection.execute(`
          UPDATE client_accounts 
          SET status = 'inactive', updated_at = NOW() 
          WHERE id = ?
        `, [client.id]);
        
        console.log(`✅ Archived client: ${client.first_name} ${client.last_name} (ID: ${client.id})`);
      }
    }

    // 3. Test the archive query (simulating the backend service)
    console.log('\n🔍 Testing Archive Query:');
    
    const archiveQuery = `
      SELECT
        CONCAT(u.user_type, '_', u.id) as id,
        u.original_id,
        u.username,
        u.first_name,
        u.last_name,
        u.email,
        u.status,
        u.user_type as type,
        u.created_at,
        u.updated_at,
        u.residency_verification_status,
        u.residency_document_count
      FROM (
        -- Admin users (archived)
        SELECT
          aea.id,
          aea.id as original_id,
          aea.username,
          aep.first_name,
          aep.last_name,
          aep.email,
          aea.status,
          'admin' as user_type,
          aea.created_at,
          aea.updated_at,
          NULL as residency_verification_status,
          0 as residency_document_count
        FROM admin_employee_accounts aea
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        WHERE aea.status = 'inactive'

        UNION ALL

        -- Client users (archived)
        SELECT
          ca.id,
          ca.id as original_id,
          ca.username,
          cp.first_name,
          cp.last_name,
          cp.email,
          ca.status,
          'client' as user_type,
          ca.created_at,
          ca.updated_at,
          CASE
            WHEN COUNT(rd.id) = 0 THEN NULL
            WHEN COUNT(CASE WHEN rd.verification_status = 'approved' THEN 1 END) > 0 THEN 'approved'
            WHEN COUNT(CASE WHEN rd.verification_status = 'rejected' THEN 1 END) > 0 THEN 'rejected'
            ELSE 'pending'
          END as residency_verification_status,
          COUNT(rd.id) as residency_document_count
        FROM client_accounts ca
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        LEFT JOIN residency_documents rd ON ca.id = rd.account_id
        WHERE ca.status = 'inactive'
        GROUP BY ca.id, ca.username, cp.first_name, cp.last_name, cp.email, ca.status, ca.created_at, ca.updated_at
      ) u
      ORDER BY u.updated_at DESC
    `;

    const [archivedUsers] = await connection.execute(archiveQuery);
    
    console.log(`Found ${archivedUsers.length} archived users:`);
    archivedUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name} (@${user.username})`);
      console.log(`   Type: ${user.type}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Archived: ${user.updated_at}`);
      console.log('');
    });

    // 4. Test search functionality
    if (archivedUsers.length > 0) {
      console.log('🔍 Testing Search Functionality:');
      
      const searchTerm = archivedUsers[0].first_name.substring(0, 3);
      console.log(`Searching for: "${searchTerm}"`);
      
      const searchQuery = `
        ${archiveQuery.replace('ORDER BY u.updated_at DESC', `
        WHERE (
          u.first_name LIKE ? OR 
          u.last_name LIKE ? OR 
          u.username LIKE ? OR 
          u.email LIKE ?
        )
        ORDER BY u.updated_at DESC
        `)}
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const [searchResults] = await connection.execute(searchQuery, [
        searchPattern, searchPattern, searchPattern, searchPattern
      ]);
      
      console.log(`Search results: ${searchResults.length} users found`);
      searchResults.forEach(user => {
        console.log(`   - ${user.first_name} ${user.last_name}`);
      });
    }

    // 5. Test pagination
    console.log('\n📄 Testing Pagination:');
    const limit = 2;
    const offset = 0;
    
    const paginatedQuery = `${archiveQuery} LIMIT ? OFFSET ?`;
    const [paginatedResults] = await connection.execute(paginatedQuery, [limit, offset]);
    
    console.log(`Page 1 (limit ${limit}): ${paginatedResults.length} users`);
    paginatedResults.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name}`);
    });

    console.log('\n✅ Archive functionality test completed successfully!');
    console.log('\n🎯 Expected Frontend Behavior:');
    console.log('1. Archive button appears in sidebar');
    console.log('2. Clicking Archive navigates to /admin/users/archive');
    console.log('3. Archive page shows only inactive users');
    console.log('4. Search and pagination work correctly');
    console.log('5. View and restore buttons are available');

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
  }
}

testArchiveFunctionality();
