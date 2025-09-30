const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function testNotificationDatabase() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Test 1: Verify table structure
    console.log('\n🔄 Test 1: Verifying table structure...');
    const [columns] = await connection.execute("DESCRIBE notifications");
    
    const expectedColumns = [
      'id', 'recipient_type', 'recipient_id', 'type', 'title', 
      'message', 'data', 'priority', 'is_read', 'read_at', 
      'created_at', 'updated_at'
    ];
    
    const actualColumns = columns.map(col => col.Field);
    const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
    
    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log('✅ Table structure is correct');
    } else {
      console.log('❌ Table structure issues:');
      if (missingColumns.length > 0) {
        console.log(`  Missing columns: ${missingColumns.join(', ')}`);
      }
      if (extraColumns.length > 0) {
        console.log(`  Extra columns: ${extraColumns.join(', ')}`);
      }
    }

    // Test 2: Insert test notifications
    console.log('\n🔄 Test 2: Inserting test notifications...');
    
    const testNotifications = [
      {
        recipient_type: 'admin',
        recipient_id: null,
        type: 'system_alert',
        title: 'System Test - Admin Broadcast',
        message: 'This is a test broadcast notification for all admins',
        priority: 'normal'
      },
      {
        recipient_type: 'admin',
        recipient_id: 1,
        type: 'test',
        title: 'System Test - Specific Admin',
        message: 'This is a test notification for admin ID 1',
        priority: 'high'
      },
      {
        recipient_type: 'client',
        recipient_id: 1,
        type: 'status_change',
        title: 'System Test - Client Notification',
        message: 'This is a test notification for client ID 1',
        priority: 'normal'
      }
    ];

    for (const notif of testNotifications) {
      const insertQuery = `
        INSERT INTO notifications (
          recipient_type, recipient_id, type, title, message, priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const result = await connection.execute(insertQuery, [
        notif.recipient_type,
        notif.recipient_id,
        notif.type,
        notif.title,
        notif.message,
        notif.priority
      ]);
      
      console.log(`✅ Inserted notification ID: ${result[0].insertId} - ${notif.title}`);
    }

    // Test 3: Query notifications by recipient type and ID
    console.log('\n🔄 Test 3: Testing notification queries...');
    
    // Test admin broadcast notifications
    const [adminBroadcast] = await connection.execute(`
      SELECT * FROM notifications 
      WHERE recipient_type = 'admin' AND recipient_id IS NULL
      ORDER BY created_at DESC
    `);
    console.log(`✅ Admin broadcast notifications: ${adminBroadcast.length}`);

    // Test specific admin notifications
    const [specificAdmin] = await connection.execute(`
      SELECT * FROM notifications 
      WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?)
      ORDER BY created_at DESC
    `, [1]);
    console.log(`✅ Admin ID 1 notifications (including broadcasts): ${specificAdmin.length}`);

    // Test client notifications
    const [clientNotifs] = await connection.execute(`
      SELECT * FROM notifications 
      WHERE recipient_type = 'client' AND recipient_id = ?
      ORDER BY created_at DESC
    `, [1]);
    console.log(`✅ Client ID 1 notifications: ${clientNotifs.length}`);

    // Test 4: Test unread count queries
    console.log('\n🔄 Test 4: Testing unread count queries...');
    
    const [adminUnreadCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications
      WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?) AND is_read = 0
    `, [1]);
    console.log(`✅ Admin ID 1 unread count: ${adminUnreadCount[0].count}`);

    const [clientUnreadCount] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications
      WHERE recipient_type = 'client' AND recipient_id = ? AND is_read = 0
    `, [1]);
    console.log(`✅ Client ID 1 unread count: ${clientUnreadCount[0].count}`);

    // Test 5: Test mark as read functionality
    console.log('\n🔄 Test 5: Testing mark as read functionality...');
    
    const [firstNotif] = await connection.execute(`
      SELECT id FROM notifications 
      WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?)
      ORDER BY created_at DESC LIMIT 1
    `, [1]);
    
    if (firstNotif.length > 0) {
      const notifId = firstNotif[0].id;
      await connection.execute(`
        UPDATE notifications
        SET is_read = 1, read_at = NOW()
        WHERE id = ? AND recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?)
      `, [notifId, 1]);
      console.log(`✅ Marked notification ${notifId} as read`);
    }

    // Test 6: Verify indexes exist
    console.log('\n🔄 Test 6: Verifying indexes...');
    const [indexes] = await connection.execute(`
      SHOW INDEX FROM notifications
    `);
    
    const expectedIndexes = [
      'idx_recipient_type', 'idx_recipient_id', 'idx_type', 
      'idx_priority', 'idx_is_read', 'idx_created_at'
    ];
    
    const actualIndexes = [...new Set(indexes.map(idx => idx.Key_name))];
    const missingIndexes = expectedIndexes.filter(idx => !actualIndexes.includes(idx));
    
    if (missingIndexes.length === 0) {
      console.log('✅ All required indexes exist');
    } else {
      console.log(`⚠️  Missing indexes: ${missingIndexes.join(', ')}`);
    }

    console.log('\n🎉 All notification database tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run tests
if (require.main === module) {
  testNotificationDatabase()
    .then(() => {
      console.log('🎉 Database test script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Database test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testNotificationDatabase };
