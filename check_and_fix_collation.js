#!/usr/bin/env node

const mysql = require('mysql2/promise');

const railwayConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function checkAndFix() {
  let connection;
  try {
    console.log('========================================');
    console.log('  CHECKING TABLE COLLATION');
    console.log('========================================\n');
    
    connection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected to Railway MySQL\n');
    
    // Check document_requests table collation
    console.log('🔄 Checking document_requests table collation...');
    const [columns] = await connection.query(`
      SELECT COLUMN_NAME, COLLATION_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'railway' 
        AND TABLE_NAME = 'document_requests' 
        AND COLUMN_NAME = 'request_number'
    `);
    
    if (columns.length > 0) {
      console.log(`   Column: request_number`);
      console.log(`   Collation: ${columns[0].COLLATION_NAME}\n`);
      
      const collation = columns[0].COLLATION_NAME;
      
      // Recreate GenerateRequestNumber with correct collation
      console.log('🔄 Recreating GenerateRequestNumber with correct collation...\n');
      
      await connection.query('DROP FUNCTION IF EXISTS GenerateRequestNumber');
      console.log('   ✅ Dropped existing function');
      
      const createSQL = `CREATE FUNCTION GenerateRequestNumber(doc_type VARCHAR(10) CHARSET utf8mb4 COLLATE ${collation}) 
RETURNS VARCHAR(50) 
CHARSET utf8mb4 
COLLATE ${collation}
DETERMINISTIC 
READS SQL DATA
BEGIN
    DECLARE next_seq INT;
    DECLARE current_year VARCHAR(4);
    DECLARE request_num VARCHAR(50) CHARSET utf8mb4 COLLATE ${collation};
    SET current_year = YEAR(CURDATE());
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number, -6) AS UNSIGNED)), 0) + 1 INTO next_seq FROM document_requests WHERE request_number LIKE CONCAT(doc_type, '-', current_year, '-%');
    SET request_num = CONCAT(doc_type, '-', current_year, '-', LPAD(next_seq, 6, '0'));
    RETURN request_num;
END`;
      
      await connection.query(createSQL);
      console.log('   ✅ Created function with correct collation\n');
      
      // Test the function
      console.log('🔄 Testing GenerateRequestNumber...\n');
      const [cedResult] = await connection.query('SELECT GenerateRequestNumber(?) as request_number', ['CED']);
      console.log(`   ✅ CED Result: ${cedResult[0].request_number}`);
      
      const [bcResult] = await connection.query('SELECT GenerateRequestNumber(?) as request_number', ['BC']);
      console.log(`   ✅ BC Result: ${bcResult[0].request_number}\n`);
      
      console.log('========================================');
      console.log('  FIX COMPLETE!');
      console.log('========================================\n');
      console.log('✅ GenerateRequestNumber function is now working!');
      console.log('✅ Document requests should work in production!\n');
      
    } else {
      console.log('   ❌ Could not find request_number column\n');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed.\n');
    }
  }
}

checkAndFix();

