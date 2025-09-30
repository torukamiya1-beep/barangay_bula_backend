#!/usr/bin/env node

/**
 * Database Structure Checker
 * 
 * This script checks the current database structure and displays all tables and their columns.
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
  port: process.env.DB_PORT || 3306,
};

async function checkDatabaseStructure() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    console.log('Database config:', { ...dbConfig, password: '***' });
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to database');
    
    // Get all tables
    console.log('\n📋 Database Tables:');
    const [tables] = await connection.execute('SHOW TABLES');
    
    if (tables.length === 0) {
      console.log('❌ No tables found in the database');
      return;
    }
    
    for (const table of tables) {
      const tableName = Object.values(table)[0];
      console.log(`\n🔸 Table: ${tableName}`);
      
      // Get table structure
      const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
      console.log('   Columns:');
      columns.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `[${col.Key}]` : ''} ${col.Default !== null ? `DEFAULT: ${col.Default}` : ''}`);
      });
      
      // Get row count
      const [count] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
      console.log(`   📊 Rows: ${count[0].count}`);
      
      // Show sample data for reference tables
      if (['document_types', 'request_status', 'payment_methods'].includes(tableName)) {
        console.log('   📄 Sample Data:');
        const [sampleData] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 5`);
        sampleData.forEach(row => {
          console.log(`   ${JSON.stringify(row)}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the check
checkDatabaseStructure();
