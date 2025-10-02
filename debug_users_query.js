const mysql = require('mysql2/promise');

// New Railway MySQL Database Credentials
const dbConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function debugUsersQuery() {
  let connection;
  
  try {
    console.log('🔍 Debugging users query...');
    console.log('');

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Railway database');

    // Test the simplified users query from userServiceNew.js
    console.log('\n📋 Testing users query...');
    
    // First, let's test the basic structure
    const basicQuery = `
      SELECT
        CONCAT('admin_', aea.id) as id,
        aea.id as original_id,
        aea.username,
        aep.first_name,
        aep.middle_name,
        aep.last_name,
        aep.suffix,
        aep.email,
        aep.phone_number,
        aea.status,
        'admin' as user_type,
        aea.created_at,
        aea.last_login,
        NULL as residency_verification_status,
        0 as residency_document_count
      FROM admin_employee_accounts aea
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      
      UNION ALL
      
      SELECT
        CONCAT('client_', ca.id) as id,
        ca.id as original_id,
        ca.username,
        cp.first_name,
        cp.middle_name,
        cp.last_name,
        cp.suffix,
        cp.email,
        cp.phone_number,
        ca.status,
        'client' as user_type,
        ca.created_at,
        ca.last_login,
        NULL as residency_verification_status,
        0 as residency_document_count
      FROM client_accounts ca
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      ORDER BY created_at DESC
      LIMIT 20 OFFSET 0
    `;

    try {
      const [results] = await connection.execute(basicQuery);
      console.log(`✅ Basic users query works! Found ${results.length} users`);
      
      if (results.length > 0) {
        console.log('\n📄 Sample users:');
        results.slice(0, 3).forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.user_type}: ${user.first_name} ${user.last_name} (${user.username})`);
        });
      }
    } catch (error) {
      console.log('❌ Basic users query failed:', error.message);
      return;
    }

    // Now test with parameters (this is likely where the issue is)
    console.log('\n📋 Testing users query with parameters...');
    
    const parameterizedQuery = `
      SELECT
        CONCAT(u.user_type, '_', u.id) as id,
        u.original_id,
        u.username,
        u.first_name,
        u.middle_name,
        u.last_name,
        u.suffix,
        u.email,
        u.phone_number,
        u.status,
        u.user_type as type,
        u.created_at,
        u.last_login,
        u.residency_verification_status,
        u.residency_document_count
      FROM (
        SELECT
          aea.id,
          aea.id as original_id,
          aea.username,
          aep.first_name,
          aep.middle_name,
          aep.last_name,
          aep.suffix,
          aep.email,
          aep.phone_number,
          aea.status,
          'admin' as user_type,
          aea.created_at,
          aea.last_login,
          NULL as residency_verification_status,
          0 as residency_document_count
        FROM admin_employee_accounts aea
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id

        UNION ALL

        SELECT
          ca.id,
          ca.id as original_id,
          ca.username,
          cp.first_name,
          cp.middle_name,
          cp.last_name,
          cp.suffix,
          cp.email,
          cp.phone_number,
          ca.status,
          'client' as user_type,
          ca.created_at,
          ca.last_login,
          NULL as residency_verification_status,
          0 as residency_document_count
        FROM client_accounts ca
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      ) u
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `;

    try {
      const [results] = await connection.execute(parameterizedQuery, [20, 0]);
      console.log(`✅ Parameterized users query works! Found ${results.length} users`);
    } catch (error) {
      console.log('❌ Parameterized users query failed:', error.message);
      
      // Let's try without parameters
      console.log('\n🔍 Testing without parameters...');
      try {
        const queryWithoutParams = parameterizedQuery.replace('LIMIT ? OFFSET ?', 'LIMIT 20 OFFSET 0');
        const [results] = await connection.execute(queryWithoutParams);
        console.log(`✅ Query without parameters works! Found ${results.length} users`);
        console.log('🎯 Issue is with parameter binding!');
      } catch (error2) {
        console.log('❌ Query without parameters also failed:', error2.message);
      }
    }

    // Test the count query too
    console.log('\n📋 Testing count query...');
    const countQuery = `
      SELECT COUNT(*) as total
      FROM (
        SELECT aea.id FROM admin_employee_accounts aea
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id

        UNION ALL

        SELECT ca.id FROM client_accounts ca
        LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        LEFT JOIN residency_documents rd ON ca.id = rd.account_id
        GROUP BY ca.id
      ) u
    `;

    try {
      const [countResult] = await connection.execute(countQuery);
      console.log(`✅ Count query works! Total: ${countResult[0].total}`);
    } catch (error) {
      console.log('❌ Count query failed:', error.message);
    }

    console.log('\n🎉 Users query debugging completed!');
    
  } catch (error) {
    console.error('❌ Users query debugging failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the debug
if (require.main === module) {
  debugUsersQuery()
    .then(() => {
      console.log('🎊 Users query debugging completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Users query debugging failed:', error.message);
      process.exit(1);
    });
}

module.exports = { debugUsersQuery };
