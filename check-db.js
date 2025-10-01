const mysql = require('mysql2/promise');
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root', 
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function checkTables() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Check if notifications table exists
    const [tables] = await connection.execute('SHOW TABLES LIKE "notifications"');
    console.log('Notifications table exists:', tables.length > 0);
    
    if (tables.length > 0) {
      const [columns] = await connection.execute('DESCRIBE notifications');
      console.log('Notifications table structure:');
      columns.forEach(col => console.log('  -', col.Field, col.Type));
    }
    
    // Check document_requests table
    const [docTables] = await connection.execute('SHOW TABLES LIKE "document_requests"');
    console.log('Document_requests table exists:', docTables.length > 0);
    
    // Check admin_employee_accounts table  
    const [adminTables] = await connection.execute('SHOW TABLES LIKE "admin_employee_accounts"');
    console.log('Admin_employee_accounts table exists:', adminTables.length > 0);
    
    // Check client_accounts table
    const [clientTables] = await connection.execute('SHOW TABLES LIKE "client_accounts"');
    console.log('Client_accounts table exists:', clientTables.length > 0);
    
    // Show all tables
    const [allTables] = await connection.execute('SHOW TABLES');
    console.log('\nAll tables in database:');
    allTables.forEach(table => console.log('  -', Object.values(table)[0]));
    
    await connection.end();
  } catch (error) {
    console.error('Database error:', error.message);
    console.error('Error code:', error.code);
  }
}

checkTables();
