const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// New Railway MySQL Database Credentials
const dbConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway',
  multipleStatements: true,
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
};

const sqlFilePath = '../DB_oct2_fromsept30_brgy_docu_hub.sql';

async function importDatabaseToRailway() {
  let connection;
  
  try {
    console.log('========================================');
    console.log('  IMPORTING DATABASE TO RAILWAY MYSQL');
    console.log('========================================');
    console.log('');
    
    console.log('Database Host:', dbConfig.host);
    console.log('Database Port:', dbConfig.port);
    console.log('Database User:', dbConfig.user);
    console.log('Database Name:', dbConfig.database);
    console.log('SQL File:', sqlFilePath);
    console.log('');

    // Check if SQL file exists
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found at ${sqlFilePath}`);
    }

    const stats = fs.statSync(sqlFilePath);
    console.log(`SQL file found: ${sqlFilePath}`);
    console.log(`File size: ${stats.size} bytes`);
    console.log('');

    console.log('========================================');
    console.log('  STEP 1: TESTING CONNECTION');
    console.log('========================================');
    console.log('Testing connection to Railway MySQL database...');
    console.log('');

    // Test connection
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connection successful!');
    console.log('');

    console.log('========================================');
    console.log('  STEP 2: READING SQL FILE');
    console.log('========================================');
    console.log('Reading SQL file...');
    
    let sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`✅ SQL file read successfully (${sqlContent.length} characters)`);
    console.log('');

    console.log('========================================');
    console.log('  STEP 3: PREPARING SQL FOR RAILWAY');
    console.log('========================================');
    console.log('Modifying SQL for Railway compatibility...');
    
    // Remove problematic statements for Railway
    sqlContent = sqlContent.replace(/CREATE DEFINER=.*?FUNCTION/g, 'CREATE FUNCTION');
    sqlContent = sqlContent.replace(/CREATE DEFINER=.*?PROCEDURE/g, 'CREATE PROCEDURE');
    sqlContent = sqlContent.replace(/DEFINER=`[^`]+`@`[^`]+`/g, '');
    
    // Remove database creation and use statements
    sqlContent = sqlContent.replace(/CREATE DATABASE.*?;/gi, '');
    sqlContent = sqlContent.replace(/USE `.*?`;/gi, '');
    sqlContent = sqlContent.replace(/USE .*?;/gi, '');
    
    console.log('✅ SQL prepared for Railway');
    console.log('');

    console.log('========================================');
    console.log('  STEP 4: IMPORTING DATABASE');
    console.log('========================================');
    console.log('Importing database to Railway MySQL...');
    console.log('This may take several minutes...');
    console.log('');

    // Split SQL into smaller chunks to avoid timeout
    const statements = sqlContent.split(';').filter(stmt => stmt.trim().length > 0);
    console.log(`Processing ${statements.length} SQL statements...`);
    
    let processedCount = 0;
    const batchSize = 50;
    
    for (let i = 0; i < statements.length; i += batchSize) {
      const batch = statements.slice(i, i + batchSize);
      const batchSQL = batch.join(';') + ';';
      
      try {
        await connection.execute(batchSQL);
        processedCount += batch.length;
        
        if (processedCount % 100 === 0 || processedCount === statements.length) {
          console.log(`✅ Processed ${processedCount}/${statements.length} statements`);
        }
      } catch (error) {
        console.log(`⚠️ Warning in batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
        // Continue with individual statements in this batch
        for (const stmt of batch) {
          try {
            if (stmt.trim()) {
              await connection.execute(stmt + ';');
              processedCount++;
            }
          } catch (stmtError) {
            console.log(`⚠️ Skipped statement: ${stmtError.message.substring(0, 100)}...`);
          }
        }
      }
    }

    console.log('');
    console.log('✅ DATABASE IMPORT COMPLETED!');
    console.log('');

    console.log('========================================');
    console.log('  STEP 5: VERIFYING IMPORT');
    console.log('========================================');
    console.log('Verifying the imported data...');
    console.log('');

    // Check tables
    console.log('Checking imported tables:');
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`✅ Found ${tables.length} tables`);
    
    // Show first 10 tables
    tables.slice(0, 10).forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`  ${index + 1}. ${tableName}`);
    });
    
    if (tables.length > 10) {
      console.log(`  ... and ${tables.length - 10} more tables`);
    }
    console.log('');

    // Check key data
    console.log('Checking key data:');
    try {
      const [adminCount] = await connection.execute('SELECT COUNT(*) as count FROM admin_employee_accounts');
      console.log(`✅ Admin accounts: ${adminCount[0].count}`);
    } catch (e) {
      console.log('⚠️ Could not count admin accounts');
    }

    try {
      const [clientCount] = await connection.execute('SELECT COUNT(*) as count FROM client_accounts');
      console.log(`✅ Client accounts: ${clientCount[0].count}`);
    } catch (e) {
      console.log('⚠️ Could not count client accounts');
    }

    try {
      const [requestCount] = await connection.execute('SELECT COUNT(*) as count FROM document_requests');
      console.log(`✅ Document requests: ${requestCount[0].count}`);
    } catch (e) {
      console.log('⚠️ Could not count document requests');
    }

    try {
      const [notificationCount] = await connection.execute('SELECT COUNT(*) as count FROM notifications');
      console.log(`✅ Notifications: ${notificationCount[0].count}`);
    } catch (e) {
      console.log('⚠️ Could not count notifications');
    }

    console.log('');
    console.log('========================================');
    console.log('  🎉 IMPORT COMPLETED SUCCESSFULLY!');
    console.log('========================================');
    console.log('');
    console.log('Your database has been imported to Railway MySQL!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Update your Railway backend environment variables');
    console.log('2. Wait 2-3 minutes for Railway to redeploy your backend');
    console.log('3. Test your application: https://barangay-bula-docu-hub.vercel.app');
    console.log('');
    
  } catch (error) {
    console.error('❌ Import failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the import
if (require.main === module) {
  importDatabaseToRailway()
    .then(() => {
      console.log('🎊 Database import completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database import failed:', error.message);
      process.exit(1);
    });
}

module.exports = { importDatabaseToRailway };
