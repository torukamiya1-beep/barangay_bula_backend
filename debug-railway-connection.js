const mysql = require('mysql2/promise');

// Test both database configurations to see which one Railway is actually using

const config1 = {
  name: 'Config 1 (.env.production)',
  host: 'caboose.proxy.rlwy.net',
  port: 10954,
  user: 'root',
  password: 'ZJkBtQfhQyuHoYnezodhXGCUQZBnYcrN',
  database: 'railway'
};

const config2 = {
  name: 'Config 2 (railway_env_variables_new.txt)',
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function testDatabaseConnection(config) {
  console.log(`\n🔍 Testing ${config.name}:`);
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Database: ${config.database}`);
  
  try {
    const connection = await mysql.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 10000
    });
    
    console.log(`   ✅ Connection successful!`);
    
    // Test basic query
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`   📊 Tables found: ${tables.length}`);
    
    // Test critical tables
    const criticalTables = ['notifications', 'document_requests', 'client_accounts', 'admin_employee_accounts'];
    for (const table of criticalTables) {
      try {
        const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`   ✅ ${table}: ${count[0].count} rows`);
      } catch (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      }
    }
    
    // Test the specific queries that were failing
    console.log(`   🧪 Testing failing queries:`);
    
    try {
      const [result] = await connection.execute(`
        SELECT COUNT(*) as count FROM notifications 
        WHERE recipient_type = 'admin' AND is_read = FALSE
      `);
      console.log(`   ✅ Notifications query: ${result[0].count} unread admin notifications`);
    } catch (error) {
      console.log(`   ❌ Notifications query failed: ${error.message}`);
    }
    
    try {
      const [result] = await connection.execute(`
        SELECT id, request_number, requested_at 
        FROM document_requests 
        ORDER BY requested_at DESC LIMIT 3
      `);
      console.log(`   ✅ Document requests query: ${result.length} requests found`);
    } catch (error) {
      console.log(`   ❌ Document requests query failed: ${error.message}`);
    }
    
    await connection.end();
    return true;
    
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    console.log(`   💡 Error code: ${error.code}`);
    return false;
  }
}

async function debugRailwayConnection() {
  console.log('🚨 DEBUGGING RAILWAY DATABASE CONNECTION MISMATCH');
  console.log('='.repeat(60));
  
  const config1Success = await testDatabaseConnection(config1);
  const config2Success = await testDatabaseConnection(config2);
  
  console.log('\n📊 RESULTS:');
  console.log(`   Config 1 (.env.production): ${config1Success ? '✅ WORKS' : '❌ FAILS'}`);
  console.log(`   Config 2 (railway_env_variables_new.txt): ${config2Success ? '✅ WORKS' : '❌ FAILS'}`);
  
  if (config1Success && config2Success) {
    console.log('\n⚠️  BOTH CONFIGURATIONS WORK - This means you have TWO different databases!');
    console.log('   This could explain why your local fixes work on one but not the other.');
  } else if (config1Success) {
    console.log('\n🎯 SOLUTION: Use Config 1 in Railway environment variables');
  } else if (config2Success) {
    console.log('\n🎯 SOLUTION: Use Config 2 in Railway environment variables');
  } else {
    console.log('\n❌ BOTH CONFIGURATIONS FAIL - There may be a network or credentials issue');
  }
  
  console.log('\n💡 NEXT STEPS:');
  console.log('1. Check which database Railway is actually pointing to in the dashboard');
  console.log('2. Update Railway environment variables to match the working configuration');
  console.log('3. Ensure your application code uses the correct database');
}

debugRailwayConnection().catch(console.error);
