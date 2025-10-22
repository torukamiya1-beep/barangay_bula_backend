/**
 * Test Railway document_fees table
 */

const mysql = require('mysql2/promise');

const RAILWAY_CONFIG = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function testRailwayFees() {
  let connection;
  
  try {
    console.log('\n🔍 Connecting to Railway database...');
    connection = await mysql.createConnection(RAILWAY_CONFIG);
    console.log('✅ Connected!\n');
    
    // Check if table exists
    console.log('1️⃣ Checking if document_fees table exists...');
    const [tables] = await connection.query(`
      SELECT TABLE_NAME 
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = 'railway' 
      AND TABLE_NAME = 'document_fees'
    `);
    
    if (tables.length === 0) {
      console.log('❌ document_fees table DOES NOT EXIST\n');
      
      // Show existing tables
      console.log('📋 Existing tables:');
      const [allTables] = await connection.query(`
        SELECT TABLE_NAME 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = 'railway'
        ORDER BY TABLE_NAME
      `);
      allTables.forEach(t => console.log(`   - ${t.TABLE_NAME}`));
      
    } else {
      console.log('✅ document_fees table EXISTS!\n');
      
      // Show table structure
      console.log('2️⃣ Table structure:');
      const [columns] = await connection.query(`
        DESCRIBE document_fees
      `);
      console.table(columns);
      
      // Show data
      console.log('\n3️⃣ Current data in document_fees:');
      const [fees] = await connection.query(`
        SELECT * FROM document_fees ORDER BY document_type_id, created_at
      `);
      
      if (fees.length === 0) {
        console.log('⚠️  Table is EMPTY - no fee records found\n');
      } else {
        console.table(fees);
      }
      
      // Test the query used by the service
      console.log('\n4️⃣ Testing service query:');
      const [serviceResult] = await connection.query(`
        SELECT 
          dt.id as document_type_id,
          dt.type_name,
          dt.description,
          dt.is_active as type_is_active,
          df.id as fee_id,
          df.fee_amount,
          df.effective_date,
          df.is_active as fee_is_active,
          df.created_at as fee_created_at
        FROM document_types dt
        LEFT JOIN document_fees df ON dt.id = df.document_type_id AND df.is_active = 1
        WHERE dt.is_active = 1
        ORDER BY dt.id
      `);
      console.table(serviceResult);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Full error:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Disconnected from Railway');
    }
  }
}

testRailwayFees();
