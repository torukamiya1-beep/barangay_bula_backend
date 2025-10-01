const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function fixNotificationsSchema() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Check current table structure
    console.log('\n🔄 Checking current notifications table structure...');
    const [columns] = await connection.execute("DESCRIBE notifications");
    
    console.log('📋 Current table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    const hasRecipientType = columns.some(col => col.Field === 'recipient_type');
    const hasRecipientId = columns.some(col => col.Field === 'recipient_id');
    const hasUserType = columns.some(col => col.Field === 'user_type');
    const hasUserId = columns.some(col => col.Field === 'user_id');

    console.log('\n🔍 Schema analysis:');
    console.log(`  - Has recipient_type: ${hasRecipientType}`);
    console.log(`  - Has recipient_id: ${hasRecipientId}`);
    console.log(`  - Has user_type: ${hasUserType}`);
    console.log(`  - Has user_id: ${hasUserId}`);

    // If we have the old schema (recipient_type/recipient_id) but not the new schema (user_type/user_id)
    if (hasRecipientType && hasRecipientId && !hasUserType && !hasUserId) {
      console.log('\n🔄 Adding user_type and user_id columns...');
      
      // Add user_type column
      await connection.execute(`
        ALTER TABLE notifications 
        ADD COLUMN user_type ENUM('admin', 'client') NOT NULL DEFAULT 'admin' AFTER recipient_type
      `);
      console.log('✅ Added user_type column');

      // Add user_id column
      await connection.execute(`
        ALTER TABLE notifications 
        ADD COLUMN user_id INT(11) NULL AFTER user_type
      `);
      console.log('✅ Added user_id column');

      // Copy data from recipient_type to user_type
      await connection.execute(`
        UPDATE notifications 
        SET user_type = recipient_type
      `);
      console.log('✅ Copied recipient_type data to user_type');

      // Copy data from recipient_id to user_id
      await connection.execute(`
        UPDATE notifications 
        SET user_id = recipient_id
      `);
      console.log('✅ Copied recipient_id data to user_id');

      // Add indexes for the new columns
      await connection.execute(`
        CREATE INDEX idx_user_notifications ON notifications (user_id, user_type)
      `);
      console.log('✅ Added index for user_id and user_type');

    } else if (hasUserType && hasUserId) {
      console.log('\n✅ Schema already has user_type and user_id columns');
    } else {
      console.log('\n⚠️  Unexpected schema state - manual intervention may be required');
    }

    // Verify final structure
    console.log('\n🔄 Verifying final table structure...');
    const [finalColumns] = await connection.execute("DESCRIBE notifications");
    
    console.log('📋 Final table structure:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    // Test the queries that were failing
    console.log('\n🔄 Testing notification queries...');
    
    try {
      const [testResult] = await connection.execute(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_type = 'admin' AND (user_id IS NULL OR user_id = ?) AND is_read = FALSE
      `, [1]);
      console.log(`✅ Admin unread count query works: ${testResult.count} notifications`);
    } catch (error) {
      console.log(`❌ Admin unread count query failed: ${error.message}`);
    }

    try {
      const [testResult2] = await connection.execute(`
        SELECT COUNT(*) as count FROM notifications
        WHERE user_type = 'client' AND user_id = ? AND is_read = FALSE
      `, [1]);
      console.log(`✅ Client unread count query works: ${testResult2.count} notifications`);
    } catch (error) {
      console.log(`❌ Client unread count query failed: ${error.message}`);
    }

    console.log('\n🎉 Notifications schema fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing notifications schema:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the migration
if (require.main === module) {
  fixNotificationsSchema();
}

module.exports = fixNotificationsSchema;
