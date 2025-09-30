const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function testResidencyFiltering() {
  let connection;
  
  try {
    console.log('🔍 Testing Residency Status Filtering\n');

    connection = await mysql.createConnection(dbConfig);

    // 1. Check current residency documents and their statuses
    console.log('📋 Current Residency Documents Status:');
    const [residencyDocs] = await connection.execute(`
      SELECT 
        rd.account_id,
        ca.username,
        cp.first_name,
        cp.last_name,
        rd.verification_status,
        COUNT(*) as doc_count
      FROM residency_documents rd
      JOIN client_accounts ca ON rd.account_id = ca.id
      JOIN client_profiles cp ON ca.id = cp.account_id
      GROUP BY rd.account_id, ca.username, cp.first_name, cp.last_name, rd.verification_status
      ORDER BY rd.account_id, rd.verification_status
    `);

    if (residencyDocs.length === 0) {
      console.log('❌ No residency documents found');
      
      // Create some test data
      console.log('\n🧪 Creating test residency documents...');
      
      // Get a test client
      const [clients] = await connection.execute(`
        SELECT ca.id, ca.username, cp.first_name, cp.last_name
        FROM client_accounts ca
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE ca.status = 'active'
        LIMIT 3
      `);

      if (clients.length > 0) {
        // Create test documents with different statuses
        for (let i = 0; i < Math.min(3, clients.length); i++) {
          const client = clients[i];
          const statuses = ['pending', 'approved', 'rejected'];
          const status = statuses[i];
          
          await connection.execute(`
            INSERT INTO residency_documents (
              account_id, document_type, document_name, file_path, 
              file_size, mime_type, verification_status
            ) VALUES (?, 'utility_bill', ?, '/test/path.pdf', 1024, 'application/pdf', ?)
          `, [
            client.id,
            `Test Document - ${client.first_name} ${client.last_name}`,
            status
          ]);
          
          console.log(`✅ Created ${status} document for ${client.first_name} ${client.last_name}`);
        }
        
        // Re-fetch the data
        const [newDocs] = await connection.execute(`
          SELECT 
            rd.account_id,
            ca.username,
            cp.first_name,
            cp.last_name,
            rd.verification_status,
            COUNT(*) as doc_count
          FROM residency_documents rd
          JOIN client_accounts ca ON rd.account_id = ca.id
          JOIN client_profiles cp ON ca.id = cp.account_id
          GROUP BY rd.account_id, ca.username, cp.first_name, cp.last_name, rd.verification_status
          ORDER BY rd.account_id, rd.verification_status
        `);
        
        residencyDocs.push(...newDocs);
      }
    }

    console.log(`Found ${residencyDocs.length} residency document groups:`);
    residencyDocs.forEach((doc, index) => {
      console.log(`${index + 1}. ${doc.first_name} ${doc.last_name} (@${doc.username})`);
      console.log(`   Account ID: ${doc.account_id}`);
      console.log(`   Verification Status: ${doc.verification_status}`);
      console.log(`   Document Count: ${doc.doc_count}`);
      console.log('');
    });

    // 2. Test the backend query that should be used for filtering
    console.log('🧪 Testing Backend Query (simulating userServiceNew.js):');
    const [backendResults] = await connection.execute(`
      SELECT
        CONCAT(u.user_type, '_', u.id) as id,
        u.original_id,
        u.username,
        u.first_name,
        u.last_name,
        u.status,
        u.user_type as type,
        u.residency_verification_status,
        u.residency_document_count
      FROM (
        -- Client users with residency verification status
        SELECT
          ca.id,
          ca.id as original_id,
          ca.username,
          cp.first_name,
          cp.last_name,
          ca.status,
          'client' as user_type,
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
        WHERE ca.status != 'inactive'
        GROUP BY ca.id, ca.username, cp.first_name, cp.last_name, ca.status
      ) u
      ORDER BY u.first_name, u.last_name
    `);

    console.log(`Found ${backendResults.length} client users:`);
    backendResults.forEach((user, index) => {
      console.log(`${index + 1}. ${user.first_name} ${user.last_name} (@${user.username})`);
      console.log(`   Account Status: ${user.status}`);
      console.log(`   Residency Verification Status: ${user.residency_verification_status || 'None'}`);
      console.log(`   Document Count: ${user.residency_document_count}`);
      
      // Simulate the getDisplayStatus logic
      let displayStatus = user.status;
      if (user.residency_verification_status) {
        switch (user.residency_verification_status) {
          case 'pending':
            displayStatus = 'pending_residency_verification';
            break;
          case 'approved':
            displayStatus = 'active';
            break;
          case 'rejected':
            displayStatus = 'residency_rejected';
            break;
        }
      }
      console.log(`   Display Status: ${displayStatus}`);
      console.log('');
    });

    // 3. Test filtering scenarios
    console.log('🎯 Filter Test Results:');
    
    const pendingUsers = backendResults.filter(user => {
      return user.residency_verification_status === 'pending';
    });
    console.log(`📌 "Pending Residency Verification" filter should show: ${pendingUsers.length} users`);
    pendingUsers.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name}`);
    });
    
    const rejectedUsers = backendResults.filter(user => {
      return user.residency_verification_status === 'rejected';
    });
    console.log(`📌 "Residency Rejected" filter should show: ${rejectedUsers.length} users`);
    rejectedUsers.forEach(user => {
      console.log(`   - ${user.first_name} ${user.last_name}`);
    });

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
  }
}

testResidencyFiltering();
