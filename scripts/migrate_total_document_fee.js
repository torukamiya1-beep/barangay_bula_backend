#!/usr/bin/env node

/**
 * Migration Script: Add total_document_fee column
 * 
 * This script migrates the chaotic fee system to a single total_document_fee column
 * for accurate PayMongo payments.
 */

const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306,
  multipleStatements: true
};

async function runMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting total_document_fee migration...');
    
    // Connect to database
    console.log('🔌 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Check if migration already ran
    console.log('🔍 Checking if total_document_fee column already exists...');
    const [columns] = await connection.execute('DESCRIBE document_requests');
    const feeColumnExists = columns.some(col => col.Field === 'total_document_fee');
    
    if (feeColumnExists) {
      console.log('⚠️  total_document_fee column already exists. Skipping migration.');
      
      // Show current data
      console.log('\n📊 Current fee data sample:');
      const [sampleData] = await connection.execute(`
        SELECT id, request_number, total_document_fee, 
               (base_fee + additional_fees + processing_fee + delivery_fee) as old_total
        FROM document_requests 
        ORDER BY id DESC 
        LIMIT 5
      `);
      console.table(sampleData);
      
      return;
    }
    
    // Create backup
    console.log('💾 Creating backup of current data...');
    const [backupData] = await connection.execute(`
      SELECT id, request_number, base_fee, additional_fees, processing_fee, delivery_fee,
             (base_fee + additional_fees + processing_fee + delivery_fee) as calculated_total
      FROM document_requests
    `);
    
    const backupFile = path.join(__dirname, '..', 'backups', `document_requests_backup_${Date.now()}.json`);
    await fs.mkdir(path.dirname(backupFile), { recursive: true });
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
    console.log(`✅ Backup created: ${backupFile}`);
    
    // Read and execute migration SQL
    console.log('📜 Reading migration SQL...');
    const migrationSQL = await fs.readFile(
      path.join(__dirname, '..', 'migrations', 'add_total_document_fee.sql'), 
      'utf8'
    );
    
    console.log('🚀 Executing migration...');
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`   Executing: ${statement.substring(0, 50)}...`);
        await connection.execute(statement);
      }
    }
    
    console.log('✅ Migration completed successfully!');
    
    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const [verifyData] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN total_document_fee > 0 THEN 1 END) as records_with_fee,
        MIN(total_document_fee) as min_fee,
        MAX(total_document_fee) as max_fee,
        AVG(total_document_fee) as avg_fee
      FROM document_requests
    `);
    
    console.log('📈 Migration Statistics:');
    console.table(verifyData);
    
    // Show sample migrated data
    console.log('\n📊 Sample migrated data:');
    const [sampleMigrated] = await connection.execute(`
      SELECT 
        id,
        request_number,
        base_fee,
        additional_fees,
        processing_fee,
        delivery_fee,
        total_document_fee,
        (base_fee + additional_fees + processing_fee + delivery_fee) AS old_calculated,
        CASE 
          WHEN total_document_fee = (base_fee + additional_fees + processing_fee + delivery_fee) 
          THEN '✅ MATCH' 
          ELSE '❌ MISMATCH' 
        END AS status
      FROM document_requests 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.table(sampleMigrated);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Update backend models and controllers');
    console.log('   2. Update frontend components');
    console.log('   3. Test PayMongo integration');
    console.log('   4. After testing, remove old fee columns');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };
