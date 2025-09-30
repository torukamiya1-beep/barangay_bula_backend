const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function testRequestNotification() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Test 1: Check current notifications count
    console.log('\n🔄 Test 1: Checking current notifications...');
    const [beforeNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications 
      WHERE type = 'new_request'
    `);
    console.log(`📊 Current new_request notifications: ${beforeNotifications[0].count}`);

    // Test 2: Check if we have any document requests
    console.log('\n🔄 Test 2: Checking recent document requests...');
    const [recentRequests] = await connection.execute(`
      SELECT dr.id, dr.request_number, dr.created_at, dt.type_name,
             cp.first_name, cp.last_name
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      ORDER BY dr.created_at DESC
      LIMIT 5
    `);
    
    console.log(`📋 Recent document requests: ${recentRequests.length}`);
    recentRequests.forEach(req => {
      console.log(`  - [${req.id}] ${req.request_number} - ${req.type_name} by ${req.first_name} ${req.last_name} (${req.created_at})`);
    });

    // Test 3: Check if notifications exist for recent requests
    if (recentRequests.length > 0) {
      console.log('\n🔄 Test 3: Checking notifications for recent requests...');
      
      for (const request of recentRequests) {
        const [notifications] = await connection.execute(`
          SELECT * FROM notifications 
          WHERE type = 'new_request' 
          AND JSON_EXTRACT(data, '$.request_id') = ?
        `, [request.id]);
        
        if (notifications.length > 0) {
          console.log(`✅ Found notification for request ${request.id} (${request.request_number})`);
          console.log(`   Title: ${notifications[0].title}`);
          console.log(`   Message: ${notifications[0].message}`);
          console.log(`   Created: ${notifications[0].created_at}`);
        } else {
          console.log(`❌ No notification found for request ${request.id} (${request.request_number})`);
        }
      }
    }

    // Test 4: Check notification structure
    console.log('\n🔄 Test 4: Checking notification table structure...');
    const [columns] = await connection.execute("DESCRIBE notifications");
    
    const requiredColumns = ['id', 'recipient_type', 'recipient_id', 'type', 'title', 'message', 'data'];
    const missingColumns = requiredColumns.filter(col => 
      !columns.some(dbCol => dbCol.Field === col)
    );
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns exist in notifications table');
    } else {
      console.log(`❌ Missing columns: ${missingColumns.join(', ')}`);
    }

    // Test 5: Manually test notification creation
    console.log('\n🔄 Test 5: Testing manual notification creation...');
    
    const testNotification = {
      recipient_type: 'admin',
      recipient_id: null,
      type: 'test_new_request',
      title: 'Test New Request Notification',
      message: 'This is a test notification for a new document request',
      data: JSON.stringify({
        request_id: 999,
        request_number: 'TEST-001',
        document_type: 'Test Document',
        client_name: 'Test Client',
        priority: 'normal'
      }),
      priority: 'normal'
    };

    const insertResult = await connection.execute(`
      INSERT INTO notifications (
        recipient_type, recipient_id, type, title, message, data, priority, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      testNotification.recipient_type,
      testNotification.recipient_id,
      testNotification.type,
      testNotification.title,
      testNotification.message,
      testNotification.data,
      testNotification.priority
    ]);

    console.log(`✅ Test notification created with ID: ${insertResult[0].insertId}`);

    // Test 6: Verify the test notification was created correctly
    const [testNotificationResult] = await connection.execute(`
      SELECT * FROM notifications WHERE id = ?
    `, [insertResult[0].insertId]);

    if (testNotificationResult.length > 0) {
      const notification = testNotificationResult[0];
      console.log('✅ Test notification verified:');
      console.log(`   ID: ${notification.id}`);
      console.log(`   Type: ${notification.type}`);
      console.log(`   Recipient Type: ${notification.recipient_type}`);
      console.log(`   Recipient ID: ${notification.recipient_id}`);
      console.log(`   Title: ${notification.title}`);
      console.log(`   Priority: ${notification.priority}`);
      console.log(`   Data: ${notification.data}`);
    }

    // Clean up test notification
    await connection.execute(`DELETE FROM notifications WHERE id = ?`, [insertResult[0].insertId]);
    console.log('🧹 Test notification cleaned up');

    console.log('\n🎉 Request notification test completed!');
    
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

// Run test
if (require.main === module) {
  testRequestNotification()
    .then(() => {
      console.log('🎉 Test script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testRequestNotification };
