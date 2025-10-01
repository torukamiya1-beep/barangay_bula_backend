const mysql = require('mysql2/promise');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4',
  // Remove deprecated options that cause warnings in MySQL2
  // acquireTimeout, timeout, and reconnect are not valid for mysql2
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test database connection
const connectDatabase = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    console.log(`📊 Connected to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('📋 Connection details:', {
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      database: dbConfig.database,
      password: dbConfig.password ? '***SET***' : '***NOT SET***'
    });
    console.error('🔍 Full error:', error);
    console.error('💡 Error code:', error.code);
    console.error('💡 Error message:', error.message);
    throw error;
  }
};

// Execute query with error handling
const executeQuery = async (query, params = []) => {
  try {
    const [results] = await pool.execute(query, params);
    return results;
  } catch (error) {
    console.error('❌ Database query error:');
    console.error('📝 Query:', query.substring(0, 200) + (query.length > 200 ? '...' : ''));
    console.error('📋 Params:', params);
    console.error('🔍 Error code:', error.code);
    console.error('🔍 Error message:', error.message);
    console.error('🔍 SQL State:', error.sqlState);
    console.error('🔍 SQL Message:', error.sqlMessage);
    console.error('🔍 Full error:', error);
    throw error;
  }
};

// Execute transaction
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const results = [];
    for (const { query, params } of queries) {
      const [result] = await connection.execute(query, params || []);
      results.push(result);
    }

    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Execute transaction with callback
const executeTransactionCallback = async (callback) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const result = await callback(connection);

    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Close database connection
const closeDatabase = async () => {
  try {
    await pool.end();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error.message);
  }
};

module.exports = {
  pool,
  connectDatabase,
  executeQuery,
  executeTransaction,
  executeTransactionCallback,
  closeDatabase
};
