const mysql = require('mysql2/promise');

const railwayConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway',
  connectTimeout: 60000
};

async function checkMissingTables() {
  let connection;
  
  try {
    console.log('🔗 Connecting to Railway database...');
    connection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected successfully!');

    // Check for pickup_schedules table
    console.log('\n🔍 Checking for pickup_schedules table...');
    try {
      const [result] = await connection.execute("SHOW TABLES LIKE 'pickup_schedules'");
      if (result.length > 0) {
        console.log('✅ pickup_schedules table EXISTS');
        
        // Check its structure
        const [columns] = await connection.execute('DESCRIBE pickup_schedules');
        console.log(`   Columns (${columns.length}):`);
        columns.forEach(col => {
          console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        // Check data count
        const [count] = await connection.execute('SELECT COUNT(*) as count FROM pickup_schedules');
        console.log(`   📊 Data count: ${count[0].count} rows`);
        
      } else {
        console.log('❌ pickup_schedules table MISSING');
      }
    } catch (error) {
      console.log('❌ pickup_schedules table MISSING or inaccessible:', error.message);
    }

    // Check what pending_residency_verifications actually is
    console.log('\n🔍 Checking pending_residency_verifications...');
    try {
      const [result] = await connection.execute("SHOW CREATE TABLE pending_residency_verifications");
      console.log('📋 pending_residency_verifications definition:');
      console.log(result[0]['Create Table']);
    } catch (error) {
      console.log('❌ Could not get pending_residency_verifications definition:', error.message);
    }

    // List all tables to see what we have
    console.log('\n📋 All tables in Railway database:');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`${index + 1}. ${tableName}`);
    });

    // Check for views
    console.log('\n🔍 Checking for views...');
    const [views] = await connection.execute("SHOW FULL TABLES WHERE Table_type = 'VIEW'");
    if (views.length > 0) {
      console.log('📋 Views found:');
      views.forEach(view => {
        console.log(`   - ${Object.values(view)[0]}`);
      });
    } else {
      console.log('ℹ️  No views found');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Connection closed');
    }
  }
}

checkMissingTables().catch(console.error);
