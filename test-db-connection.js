// Test database connection directly
const path = require('path');
const dotenv = require('dotenv');

console.log('🔍 Loading environment from .env.production...');
const envPath = path.join(__dirname, '.env.production');
console.log('📁 Env file path:', envPath);

const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('❌ Error loading .env.production:', result.error);
} else {
  console.log('✅ Environment loaded successfully');
}

const mysql = require('mysql2/promise');

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...');
  console.log('📋 Environment Variables:');
  console.log('   DB_HOST:', process.env.DB_HOST);
  console.log('   DB_USER:', process.env.DB_USER);
  console.log('   DB_NAME:', process.env.DB_NAME);
  console.log('   DB_PORT:', process.env.DB_PORT);
  console.log('   DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET');
  
  try {
    // Create connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT),
      connectTimeout: 10000,
      acquireTimeout: 10000,
      timeout: 10000
    });
    
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tables found:', tables.map(t => Object.values(t)[0]));
    
    // Test document_requests table
    if (tables.some(t => Object.values(t)[0] === 'document_requests')) {
      const [structure] = await connection.execute('DESCRIBE document_requests');
      console.log('📋 document_requests columns:', structure.map(c => c.Field));
      
      const [count] = await connection.execute('SELECT COUNT(*) as count FROM document_requests');
      console.log('📊 document_requests count:', count[0].count);
    } else {
      console.log('❌ document_requests table not found!');
    }
    
    // Test notifications table
    if (tables.some(t => Object.values(t)[0] === 'notifications')) {
      const [notifStructure] = await connection.execute('DESCRIBE notifications');
      console.log('📋 notifications columns:', notifStructure.map(c => c.Field));
    } else {
      console.log('❌ notifications table not found!');
    }
    
    await connection.end();
    console.log('✅ Database test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('   Error code:', error.code);
    console.error('   Error message:', error.message);
    console.error('   SQL State:', error.sqlState);
    console.error('   Full error:', error);
  }
}

testDatabaseConnection();
