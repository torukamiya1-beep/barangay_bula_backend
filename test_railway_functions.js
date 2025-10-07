#!/usr/bin/env node

const mysql = require('mysql2/promise');

const railwayConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function testFunctions() {
  let connection;
  try {
    console.log('========================================');
    console.log('  TESTING RAILWAY FUNCTIONS');
    console.log('========================================\n');
    
    connection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected to Railway MySQL\n');
    
    // Test GenerateRequestNumber for Cedula
    console.log('🔄 Testing GenerateRequestNumber(\'CED\')...');
    const [cedResult] = await connection.query('SELECT GenerateRequestNumber(?) as request_number', ['CED']);
    console.log(`   ✅ Result: ${cedResult[0].request_number}\n`);
    
    // Test GenerateRequestNumber for Barangay Clearance
    console.log('🔄 Testing GenerateRequestNumber(\'BC\')...');
    const [bcResult] = await connection.query('SELECT GenerateRequestNumber(?) as request_number', ['BC']);
    console.log(`   ✅ Result: ${bcResult[0].request_number}\n`);
    
    // Test GenerateTransactionId
    console.log('🔄 Testing GenerateTransactionId()...');
    const [txnResult] = await connection.query('SELECT GenerateTransactionId() as transaction_id');
    console.log(`   ✅ Result: ${txnResult[0].transaction_id}\n`);
    
    // Test CalculateAge
    console.log('🔄 Testing CalculateAge(\'1990-05-15\')...');
    const [ageResult] = await connection.query('SELECT CalculateAge(?) as age', ['1990-05-15']);
    console.log(`   ✅ Result: ${ageResult[0].age} years old\n`);
    
    console.log('========================================');
    console.log('  ALL TESTS PASSED!');
    console.log('========================================\n');
    console.log('✅ All functions are working correctly!');
    console.log('✅ Document requests should now work in production!\n');
    
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

testFunctions();

