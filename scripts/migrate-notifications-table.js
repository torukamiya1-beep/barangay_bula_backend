const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function migrateNotificationsTable() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Start transaction
    await connection.beginTransaction();
    console.log('🔄 Starting migration transaction...');

    // Step 1: Check current table structure
    console.log('\n🔄 Checking current table structure...');
    const [columns] = await connection.execute("DESCRIBE notifications");
    
    console.log('📋 Current table structure:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    // Step 2: Backup existing data if any
    console.log('\n🔄 Checking for existing data...');
    const [existingData] = await connection.execute("SELECT COUNT(*) as count FROM notifications");
    const hasData = existingData[0].count > 0;
    
    if (hasData) {
      console.log(`📊 Found ${existingData[0].count} existing notifications`);
      console.log('🔄 Creating backup table...');
      
      await connection.execute(`
        CREATE TABLE notifications_backup AS 
        SELECT * FROM notifications
      `);
      console.log('✅ Backup table created');
    }

    // Step 3: Drop existing indexes
    console.log('\n🔄 Dropping existing indexes...');
    const dropIndexes = [
      'DROP INDEX idx_user_notifications ON notifications',
      'DROP INDEX idx_unread_notifications ON notifications', 
      'DROP INDEX idx_notification_type ON notifications',
      'DROP INDEX idx_priority ON notifications',
      'DROP INDEX idx_notifications_user_unread ON notifications',
      'DROP INDEX idx_notifications_broadcast ON notifications'
    ];

    for (const dropIndex of dropIndexes) {
      try {
        await connection.execute(dropIndex);
        console.log(`✅ Dropped index: ${dropIndex.split(' ')[2]}`);
      } catch (error) {
        console.log(`⚠️  Index may not exist: ${dropIndex.split(' ')[2]}`);
      }
    }

    // Step 4: Add new columns if they don't exist
    console.log('\n🔄 Adding new columns...');
    
    // Check if recipient_type exists
    const hasRecipientType = columns.some(col => col.Field === 'recipient_type');
    if (!hasRecipientType) {
      await connection.execute(`
        ALTER TABLE notifications 
        ADD COLUMN recipient_type ENUM('admin', 'client') NOT NULL DEFAULT 'admin' AFTER id
      `);
      console.log('✅ Added recipient_type column');
    }

    // Check if recipient_id exists
    const hasRecipientId = columns.some(col => col.Field === 'recipient_id');
    if (!hasRecipientId) {
      await connection.execute(`
        ALTER TABLE notifications 
        ADD COLUMN recipient_id INT(11) NOT NULL DEFAULT 0 AFTER recipient_type
      `);
      console.log('✅ Added recipient_id column');
    }

    // Step 5: Migrate data from old columns to new columns
    if (hasData) {
      console.log('\n🔄 Migrating existing data...');
      
      // Update recipient_type and recipient_id based on existing data
      await connection.execute(`
        UPDATE notifications 
        SET 
          recipient_type = user_type,
          recipient_id = COALESCE(user_id, admin_id, 0)
        WHERE recipient_id = 0
      `);
      console.log('✅ Data migrated to new columns');
    }

    // Step 6: Drop old columns
    console.log('\n🔄 Dropping old columns...');
    const hasUserId = columns.some(col => col.Field === 'user_id');
    const hasAdminId = columns.some(col => col.Field === 'admin_id');
    const hasUserType = columns.some(col => col.Field === 'user_type');

    if (hasUserId) {
      await connection.execute('ALTER TABLE notifications DROP COLUMN user_id');
      console.log('✅ Dropped user_id column');
    }
    
    if (hasAdminId) {
      await connection.execute('ALTER TABLE notifications DROP COLUMN admin_id');
      console.log('✅ Dropped admin_id column');
    }
    
    if (hasUserType) {
      await connection.execute('ALTER TABLE notifications DROP COLUMN user_type');
      console.log('✅ Dropped user_type column');
    }

    // Step 7: Update column types and constraints
    console.log('\n🔄 Updating column types and constraints...');
    
    await connection.execute(`
      ALTER TABLE notifications 
      MODIFY COLUMN data LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
    `);
    console.log('✅ Updated data column type');

    await connection.execute(`
      ALTER TABLE notifications 
      MODIFY COLUMN priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal'
    `);
    console.log('✅ Updated priority column');

    // Step 8: Create new indexes as specified
    console.log('\n🔄 Creating new indexes...');
    const newIndexes = [
      'CREATE INDEX idx_recipient_type ON notifications (recipient_type)',
      'CREATE INDEX idx_recipient_id ON notifications (recipient_id)',
      'CREATE INDEX idx_type ON notifications (type)',
      'CREATE INDEX idx_priority ON notifications (priority)',
      'CREATE INDEX idx_is_read ON notifications (is_read)',
      'CREATE INDEX idx_created_at ON notifications (created_at)'
    ];

    for (const createIndex of newIndexes) {
      try {
        await connection.execute(createIndex);
        console.log(`✅ Created index: ${createIndex.split(' ')[2]}`);
      } catch (error) {
        console.log(`⚠️  Index creation failed: ${createIndex.split(' ')[2]} - ${error.message}`);
      }
    }

    // Step 9: Verify final table structure
    console.log('\n🔄 Verifying final table structure...');
    const [finalColumns] = await connection.execute("DESCRIBE notifications");
    
    console.log('📋 Final table structure:');
    finalColumns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
    });

    // Commit transaction
    await connection.commit();
    console.log('\n✅ Migration completed successfully!');
    
    if (hasData) {
      console.log('\n📋 Note: Backup table "notifications_backup" was created with your original data');
      console.log('You can drop it after verifying the migration: DROP TABLE notifications_backup;');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (connection) {
      try {
        await connection.rollback();
        console.log('🔄 Transaction rolled back');
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError.message);
      }
    }
    
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
  migrateNotificationsTable()
    .then(() => {
      console.log('🎉 Migration script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { migrateNotificationsTable };
