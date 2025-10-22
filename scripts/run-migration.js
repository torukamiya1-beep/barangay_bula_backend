/**
 * Database Migration Runner
 * Runs SQL migration files for both local and Railway databases
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Database configurations
const LOCAL_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system',
  multipleStatements: true
};

const RAILWAY_CONFIG = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway',
  multipleStatements: true
};

/**
 * Run migration on a specific database
 */
async function runMigration(config, dbName, migrationFile) {
  let connection;
  
  try {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 Running migration on ${dbName}`);
    console.log('='.repeat(70));
    
    // Connect to database
    connection = await mysql.createConnection(config);
    console.log(`✅ Connected to ${dbName} database`);
    
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    console.log(`📄 Loaded migration: ${migrationFile}`);
    
    // Execute migration
    console.log('⚙️  Executing migration...');
    await connection.query(migrationSQL);
    console.log(`✅ Migration completed successfully on ${dbName}`);
    
    // Verify the table was created
    const [tables] = await connection.query(`
      SHOW TABLES LIKE 'document_fees'
    `);
    
    if (tables.length > 0) {
      console.log('✅ Table "document_fees" verified');
      
      // Show initial data
      const [fees] = await connection.query(`
        SELECT * FROM document_fees ORDER BY document_type_id
      `);
      console.log(`📊 Initial fees loaded: ${fees.length} records`);
      console.table(fees);
    }
    
  } catch (error) {
    console.error(`❌ Migration failed on ${dbName}:`, error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log(`🔌 Disconnected from ${dbName}`);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const migrationFile = process.argv[2] || '001_create_document_fees_table.sql';
  
  console.log('\n🚀 DATABASE MIGRATION RUNNER');
  console.log(`📁 Migration file: ${migrationFile}\n`);
  
  try {
    // Run on local database
    await runMigration(LOCAL_CONFIG, 'LOCAL', migrationFile);
    
    // Ask user if they want to run on Railway
    console.log('\n' + '='.repeat(70));
    console.log('⚠️  Ready to run migration on RAILWAY database');
    console.log('='.repeat(70));
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run on Railway database
    await runMigration(RAILWAY_CONFIG, 'RAILWAY', migrationFile);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log('\n📝 Next steps:');
    console.log('   1. Restart your backend server');
    console.log('   2. Test the fee management endpoints');
    console.log('   3. Update frontend to use dynamic fees\n');
    
  } catch (error) {
    console.error('\n❌ Migration process failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runMigration };
