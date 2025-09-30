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

    // Check if notifications table exists
    console.log('\n🔄 Checking if notifications table exists...');
    const [tables] = await connection.execute(
      "SHOW TABLES LIKE 'notifications'"
    );
    
    if (tables.length === 0) {
      console.log('❌ Notifications table does not exist');
      console.log('\n🔄 Creating notifications table...');
      
      const createTableSQL = `
        CREATE TABLE notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          user_type ENUM('admin', 'client') NOT NULL DEFAULT 'admin',
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type ENUM('info', 'success', 'warning', 'error', 'system_alert', 'request_update', 'payment_update') NOT NULL DEFAULT 'info',
          priority ENUM('low', 'normal', 'high', 'urgent') NOT NULL DEFAULT 'normal',
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          data JSON NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_user_notifications (user_id, user_type),
          INDEX idx_unread_notifications (is_read),
          INDEX idx_notification_type (type),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `;
      
      await connection.execute(createTableSQL);
      console.log('✅ Notifications table created successfully');
      
      // Insert some sample notifications
      console.log('\n🔄 Inserting sample notifications...');
      const sampleNotifications = [
        {
          user_id: null, // System-wide notification
          user_type: 'admin',
          title: 'System Initialized',
          message: 'Real-time notification system has been initialized successfully.',
          type: 'system_alert',
          priority: 'normal'
        },
        {
          user_id: null,
          user_type: 'admin', 
          title: 'Welcome to Real-time Features',
          message: 'Your admin dashboard now supports real-time notifications and updates.',
          type: 'info',
          priority: 'normal'
        }
      ];
      
      for (const notification of sampleNotifications) {
        await connection.execute(
          `INSERT INTO notifications (user_id, user_type, title, message, type, priority) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [notification.user_id, notification.user_type, notification.title, 
           notification.message, notification.type, notification.priority]
        );
      }
      
      console.log('✅ Sample notifications inserted');
      
    } else {
      console.log('✅ Notifications table exists');
      
      // Check table structure
      console.log('\n🔄 Checking table structure...');
      const [columns] = await connection.execute(
        "DESCRIBE notifications"
      );
      
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? `(${col.Key})` : ''}`);
      });
      
      // Check existing notifications
      console.log('\n🔄 Checking existing notifications...');
      const [notifications] = await connection.execute(
        "SELECT COUNT(*) as count FROM notifications"
      );
      
      console.log(`📊 Total notifications: ${notifications[0].count}`);
      
      if (notifications[0].count > 0) {
        const [recent] = await connection.execute(
          "SELECT id, title, type, user_type, is_read, created_at FROM notifications ORDER BY created_at DESC LIMIT 5"
        );
        
        console.log('\n📋 Recent notifications:');
        recent.forEach(notif => {
          console.log(`  - [${notif.id}] ${notif.title} (${notif.type}, ${notif.user_type}, ${notif.is_read ? 'read' : 'unread'})`);
        });
      }
    }
    
    console.log('\n🎉 Notifications table check completed successfully!');
    
  } catch (error) {
    console.error('❌ Error checking notifications table:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the check
checkNotificationsTable();
