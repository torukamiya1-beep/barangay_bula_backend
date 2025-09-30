#!/usr/bin/env node

/**
 * Simple Migration Script: Add total_document_fee column
 */

const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function runSimpleMigration() {
  let connection;
  
  try {
    console.log('🔄 Starting simple migration...');
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Step 1: Check current structure
    console.log('\n📋 Current table structure:');
    const [columns] = await connection.execute('DESCRIBE document_requests');
    const feeColumnExists = columns.some(col => col.Field === 'total_document_fee');
    
    if (feeColumnExists) {
      console.log('⚠️  total_document_fee column already exists!');
    } else {
      console.log('➕ Adding total_document_fee column...');
      
      // Step 2: Add the column
      await connection.execute(`
        ALTER TABLE document_requests 
        ADD COLUMN total_document_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00 
        AFTER delivery_fee
      `);
      console.log('✅ Column added successfully');
    }
    
    // Step 3: Migrate data
    console.log('📊 Migrating existing data...');
    const [updateResult] = await connection.execute(`
      UPDATE document_requests 
      SET total_document_fee = COALESCE(base_fee, 0) + COALESCE(additional_fees, 0) + COALESCE(processing_fee, 0) + COALESCE(delivery_fee, 0)
      WHERE total_document_fee = 0
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} records`);
    
    // Step 4: Verify migration
    console.log('\n🔍 Verifying migration...');
    const [verifyData] = await connection.execute(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN total_document_fee > 0 THEN 1 END) as records_with_fee,
        MIN(total_document_fee) as min_fee,
        MAX(total_document_fee) as max_fee,
        ROUND(AVG(total_document_fee), 2) as avg_fee
      FROM document_requests
    `);
    
    console.log('📈 Migration Statistics:');
    console.table(verifyData);
    
    // Step 5: Show sample data
    console.log('\n📊 Sample migrated data:');
    const [sampleData] = await connection.execute(`
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
    
    console.table(sampleData);
    
    // Step 6: Add index
    try {
      await connection.execute('CREATE INDEX idx_total_document_fee ON document_requests(total_document_fee)');
      console.log('✅ Index created');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Index already exists');
      } else {
        throw error;
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('📝 Next steps:');
    console.log('   1. Update backend models and controllers');
    console.log('   2. Update frontend components');
    console.log('   3. Test PayMongo integration');
    
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
  runSimpleMigration()
    .then(() => {
      console.log('✅ Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = { runSimpleMigration };
