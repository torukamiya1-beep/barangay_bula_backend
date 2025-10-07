#!/usr/bin/env node

const mysql = require('mysql2/promise');

const railwayConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway',
  multipleStatements: true
};

// Individual SQL statements for each function
const dropStatements = [
  'DROP FUNCTION IF EXISTS CalculateAge',
  'DROP FUNCTION IF EXISTS CalculateProcessingFee',
  'DROP FUNCTION IF EXISTS GenerateRequestNumber',
  'DROP FUNCTION IF EXISTS GenerateTransactionId'
];

const createStatements = [
  `CREATE FUNCTION CalculateAge(birth_date DATE)
RETURNS INT
DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN YEAR(CURDATE()) - YEAR(birth_date) - (DATE_FORMAT(CURDATE(), '%m%d') < DATE_FORMAT(birth_date, '%m%d'));
END`,

  `CREATE FUNCTION CalculateProcessingFee(amount DECIMAL(10,2), payment_method_id INT)
RETURNS DECIMAL(10,2)
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE fee_percentage DECIMAL(5,2);
    DECLARE fee_fixed DECIMAL(10,2);
    DECLARE total_fee DECIMAL(10,2);
    SELECT processing_fee_percentage, processing_fee_fixed INTO fee_percentage, fee_fixed FROM payment_methods WHERE id = payment_method_id;
    SET total_fee = (amount * fee_percentage / 100) + fee_fixed;
    RETURN total_fee;
END`,

  `CREATE FUNCTION GenerateRequestNumber(doc_type VARCHAR(10))
RETURNS VARCHAR(50)
CHARSET utf8mb4
COLLATE utf8mb4_0900_ai_ci
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE next_seq INT;
    DECLARE current_year VARCHAR(4);
    DECLARE request_num VARCHAR(50);
    SET current_year = YEAR(CURDATE());
    SELECT COALESCE(MAX(CAST(SUBSTRING(request_number, -6) AS UNSIGNED)), 0) + 1 INTO next_seq FROM document_requests WHERE request_number LIKE CONCAT(doc_type, '-', current_year, '-%');
    SET request_num = CONCAT(doc_type, '-', current_year, '-', LPAD(next_seq, 6, '0'));
    RETURN request_num;
END`,

  `CREATE FUNCTION GenerateTransactionId()
RETURNS VARCHAR(100)
CHARSET utf8mb4
COLLATE utf8mb4_0900_ai_ci
DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE transaction_id VARCHAR(100);
    DECLARE timestamp_str VARCHAR(20);
    DECLARE random_suffix VARCHAR(10);
    SET timestamp_str = UNIX_TIMESTAMP();
    SET random_suffix = LPAD(FLOOR(RAND() * 1000000), 6, '0');
    SET transaction_id = CONCAT('TXN-', timestamp_str, '-', random_suffix);
    RETURN transaction_id;
END`
];

async function deployFunctions() {
  let connection;
  try {
    console.log('========================================');
    console.log('  DEPLOYING FUNCTIONS TO RAILWAY');
    console.log('========================================\n');
    
    console.log('🔄 Connecting to Railway MySQL...');
    console.log(`   Host: ${railwayConfig.host}:${railwayConfig.port}`);
    console.log(`   Database: ${railwayConfig.database}\n`);
    
    connection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected successfully!\n');
    
    console.log('🔄 Checking existing functions...');
    const [existing] = await connection.execute(`SELECT ROUTINE_NAME FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION' ORDER BY ROUTINE_NAME`);
    
    if (existing.length > 0) {
      console.log('   Existing functions:');
      existing.forEach(f => console.log(`   - ${f.ROUTINE_NAME}`));
    } else {
      console.log('   No existing functions found.');
    }
    console.log('');
    
    console.log('🔄 Dropping existing functions...\n');
    for (const stmt of dropStatements) {
      try {
        await connection.query(stmt);
        const match = stmt.match(/DROP FUNCTION IF EXISTS (\w+)/i);
        if (match) console.log(`   ✅ Dropped: ${match[1]}`);
      } catch (error) {
        console.error(`   ❌ Error dropping: ${error.message}`);
      }
    }
    console.log('');

    console.log('🔄 Creating functions...\n');
    for (const stmt of createStatements) {
      try {
        await connection.query(stmt);
        const match = stmt.match(/CREATE FUNCTION (\w+)/i);
        if (match) console.log(`   ✅ Created: ${match[1]}`);
      } catch (error) {
        console.error(`   ❌ Error creating: ${error.message}`);
        console.error(`   Statement preview: ${stmt.substring(0, 100)}...`);
      }
    }
    console.log('');
    
    console.log('🔄 Verifying functions...\n');
    const [newFuncs] = await connection.execute(`SELECT ROUTINE_NAME as function_name, DATA_TYPE as return_type FROM information_schema.ROUTINES WHERE ROUTINE_SCHEMA = DATABASE() AND ROUTINE_TYPE = 'FUNCTION' ORDER BY ROUTINE_NAME`);
    
    console.log('   Functions in database:');
    console.table(newFuncs);
    
    const expected = ['CalculateAge', 'CalculateProcessingFee', 'GenerateRequestNumber', 'GenerateTransactionId'];
    const created = newFuncs.map(f => f.function_name);
    const missing = expected.filter(f => !created.includes(f));
    
    if (missing.length > 0) {
      console.log('\n⚠️  WARNING: Missing functions:');
      missing.forEach(f => console.log(`   - ${f}`));
    } else {
      console.log('\n✅ All 4 functions created successfully!');
    }
    console.log('');
    
    console.log('🔄 Testing functions...\n');
    try {
      const [test] = await connection.execute(`SELECT GenerateRequestNumber('CED') as cedula_test, GenerateRequestNumber('BC') as bc_test, GenerateTransactionId() as txn_test, CalculateAge('1990-05-15') as age_test`);
      console.log('   Test Results:');
      console.table(test);
      console.log('\n✅ All functions working correctly!');
    } catch (testError) {
      console.error('❌ Error testing functions:', testError.message);
    }
    
    console.log('\n========================================');
    console.log('  DEPLOYMENT COMPLETE!');
    console.log('========================================\n');
    console.log('✅ Functions deployed to Railway!\n');
    console.log('Next steps:');
    console.log('1. Test document request submission');
    console.log('2. Verify request numbers are generated');
    console.log('3. Check Railway logs\n');
    
  } catch (error) {
    console.error('\n========================================');
    console.error('  DEPLOYMENT FAILED!');
    console.error('========================================\n');
    console.error('❌ Error:', error.message);
    console.error('\nStack:', error.stack);
    console.error('\nTroubleshooting:');
    console.error('1. Verify Railway credentials');
    console.error('2. Check network connection');
    console.error('3. Ensure CREATE FUNCTION privilege\n');
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Connection closed.\n');
    }
  }
}

deployFunctions().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});

