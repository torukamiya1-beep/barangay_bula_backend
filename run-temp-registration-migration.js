/**
 * Migration Runner for Temp Registration Data Table
 * Run this script to create the temp_registration_data table
 * Usage: node run-temp-registration-migration.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

// Database configurations
const LOCAL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

const RAILWAY_CONFIG = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function runMigration(config, dbName) {
  let connection;
  
  try {
    console.log(`\n🔌 Connecting to ${dbName} database...`);
    connection = await mysql.createConnection(config);
    console.log(`✅ Connected to ${dbName}\n`);
    
    // Load migration
    const migration = require('./migrations/20250124_create_temp_registration_data');
    
    // Run migration
    console.log(`📦 Running migration on ${dbName}...`);
    await migration.up(connection);
    
    // Verify table was created
    const [tables] = await connection.query(
      "SHOW TABLES LIKE 'temp_registration_data'"
    );
    
    if (tables.length > 0) {
      console.log(`✅ Table verified in ${dbName}\n`);
      
      // Show table structure
      const [columns] = await connection.query(
        "DESCRIBE temp_registration_data"
      );
      console.log(`📋 Table structure in ${dbName}:`);
      columns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
    } else {
      console.log(`❌ Table not found in ${dbName}`);
    }
    
  } catch (error) {
    console.error(`❌ Error in ${dbName}:`, error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log(`🔌 Disconnected from ${dbName}\n`);
    }
  }
}

async function main() {
  console.log('🚀 Starting Temp Registration Data Migration\n');
  console.log('=' .repeat(60));
  
  try {
    // Run on local database
    await runMigration(LOCAL_CONFIG, 'LOCAL (barangay_management_system)');
    
    console.log('=' .repeat(60));
    
    // Run on Railway database
    await runMigration(RAILWAY_CONFIG, 'RAILWAY');
    
    console.log('=' .repeat(60));
    console.log('\n🎉 Migration completed successfully on both databases!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
main();
