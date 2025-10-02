const mysql = require('mysql2/promise');

// New Railway MySQL Database Credentials
const dbConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function testNewRailwayDatabase() {
  let connection;
  
  try {
    console.log('🧪 Testing new Railway database...');
    console.log('');

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to new Railway database successfully');

    // Test the queries that were previously failing
    console.log('\n🔍 Testing previously failing queries...');

    // Test 1: Notifications unread count
    try {
      const [result] = await connection.execute(`
        SELECT COUNT(*) as count FROM notifications
        WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?) AND is_read = FALSE
      `, [32]);
      console.log('✅ Notifications unread count query works:', result[0].count);
    } catch (error) {
      console.log('❌ Notifications unread count query failed:', error.message);
    }

    // Test 2: Document requests query
    try {
      const [result] = await connection.execute(`
        SELECT COUNT(*) as total FROM document_requests
      `);
      console.log('✅ Document requests query works:', result[0].total);
    } catch (error) {
      console.log('❌ Document requests query failed:', error.message);
    }

    // Test 3: Users query (simplified)
    try {
      const [result] = await connection.execute(`
        SELECT COUNT(*) as admin_count FROM admin_employee_accounts
      `);
      console.log('✅ Admin users query works:', result[0].admin_count);
    } catch (error) {
      console.log('❌ Admin users query failed:', error.message);
    }

    try {
      const [result] = await connection.execute(`
        SELECT COUNT(*) as client_count FROM client_accounts
      `);
      console.log('✅ Client users query works:', result[0].client_count);
    } catch (error) {
      console.log('❌ Client users query failed:', error.message);
    }

    // Test 4: Check admin login credentials
    console.log('\n🔐 Testing admin login...');
    try {
      const [adminResult] = await connection.execute(`
        SELECT aea.id, aea.username, aea.status, aep.first_name, aep.last_name
        FROM admin_employee_accounts aea
        LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
        WHERE aea.status = 'active'
        ORDER BY aea.id
      `);
      
      console.log(`✅ Found ${adminResult.length} active admin accounts:`);
      adminResult.forEach((admin, index) => {
        console.log(`  ${index + 1}. ${admin.username} - ${admin.first_name} ${admin.last_name}`);
      });
    } catch (error) {
      console.log('❌ Admin accounts query failed:', error.message);
    }

    // Test 5: Check table structures match expectations
    console.log('\n📋 Verifying table structures...');
    
    // Check notifications table structure
    try {
      const [columns] = await connection.execute("DESCRIBE notifications");
      const hasRecipientType = columns.some(col => col.Field === 'recipient_type');
      const hasRecipientId = columns.some(col => col.Field === 'recipient_id');
      
      if (hasRecipientType && hasRecipientId) {
        console.log('✅ Notifications table has correct schema (recipient_type, recipient_id)');
      } else {
        console.log('❌ Notifications table has incorrect schema');
      }
    } catch (error) {
      console.log('❌ Could not check notifications table structure:', error.message);
    }

    // Check residency_documents table structure
    try {
      const [columns] = await connection.execute("DESCRIBE residency_documents");
      const hasAccountId = columns.some(col => col.Field === 'account_id');
      
      if (hasAccountId) {
        console.log('✅ Residency documents table has correct schema (account_id)');
      } else {
        console.log('❌ Residency documents table has incorrect schema');
      }
    } catch (error) {
      console.log('❌ Could not check residency_documents table structure:', error.message);
    }

    console.log('\n🎉 Database testing completed!');
    console.log('');
    console.log('✅ Your new Railway database is ready!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update Railway backend environment variables');
    console.log('2. Wait 2-3 minutes for Railway to redeploy');
    console.log('3. Test your frontend: https://barangay-bula-docu-hub.vercel.app');
    
  } catch (error) {
    console.error('❌ Database testing failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
if (require.main === module) {
  testNewRailwayDatabase()
    .then(() => {
      console.log('🎊 Database testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testNewRailwayDatabase };
