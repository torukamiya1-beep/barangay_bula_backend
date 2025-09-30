const notificationService = require('../src/services/notificationService');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function debugNotification() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Step 1: Get the latest document request
    console.log('\n🔄 Step 1: Getting latest document request...');
    const [requests] = await connection.execute(`
      SELECT dr.*, dt.type_name, cp.first_name, cp.last_name
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      ORDER BY dr.created_at DESC
      LIMIT 1
    `);

    if (requests.length === 0) {
      console.log('❌ No document requests found');
      return;
    }

    const request = requests[0];
    console.log('✅ Found request:', {
      id: request.id,
      request_number: request.request_number,
      type_name: request.type_name,
      client_name: `${request.first_name} ${request.last_name}`
    });

    // Step 2: Check notifications before
    const [beforeNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`📊 Notifications before: ${beforeNotifications[0].count}`);

    // Step 3: Test the notification service directly
    console.log('\n🔄 Step 2: Testing notification service directly...');
    
    try {
      console.log('🔄 Calling notifyNewRequest...');
      await notificationService.notifyNewRequest(request.id);
      console.log('✅ notifyNewRequest completed without error');
    } catch (notificationError) {
      console.error('❌ notifyNewRequest failed:', notificationError.message);
      console.error('Stack trace:', notificationError.stack);
    }

    // Step 4: Check notifications after
    const [afterNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`📊 Notifications after: ${afterNotifications[0].count}`);

    if (afterNotifications[0].count > beforeNotifications[0].count) {
      console.log('✅ Notification was created!');
      
      // Get the latest notification
      const [latestNotification] = await connection.execute(`
        SELECT * FROM notifications 
        WHERE type = 'new_request' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (latestNotification.length > 0) {
        const notification = latestNotification[0];
        console.log('📋 Latest notification:');
        console.log(`   ID: ${notification.id}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Message: ${notification.message}`);
        console.log(`   Data: ${notification.data}`);
      }
    } else {
      console.log('❌ No notification was created');
      
      // Let's test the createNotification method directly
      console.log('\n🔄 Step 3: Testing createNotification directly...');
      
      try {
        const testNotification = await notificationService.createNotification({
          recipient_id: null,
          recipient_type: 'admin',
          type: 'test_debug',
          title: 'Debug Test Notification',
          message: 'This is a debug test notification',
          data: {
            test: true,
            request_id: request.id
          },
          priority: 'normal'
        });
        
        console.log('✅ createNotification succeeded:', testNotification);
        
        // Verify it was saved
        const [debugNotifications] = await connection.execute(`
          SELECT * FROM notifications WHERE type = 'test_debug' ORDER BY created_at DESC LIMIT 1
        `);
        
        if (debugNotifications.length > 0) {
          console.log('✅ Debug notification found in database');
          
          // Clean up
          await connection.execute(`DELETE FROM notifications WHERE id = ?`, [debugNotifications[0].id]);
          console.log('🧹 Debug notification cleaned up');
        } else {
          console.log('❌ Debug notification not found in database');
        }
        
      } catch (createError) {
        console.error('❌ createNotification failed:', createError.message);
        console.error('Stack trace:', createError.stack);
      }
    }

    // Step 5: Test the query used in notifyNewRequest
    console.log('\n🔄 Step 4: Testing the request query...');
    
    const requestQuery = `
      SELECT dr.*, c.first_name, c.last_name, dt.type_name
      FROM document_requests dr
      JOIN client_profiles c ON dr.client_id = c.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      WHERE dr.id = ?
    `;
    
    const [queryResult] = await connection.execute(requestQuery, [request.id]);
    
    if (queryResult.length > 0) {
      console.log('✅ Request query successful:', {
        id: queryResult[0].id,
        request_number: queryResult[0].request_number,
        client_name: `${queryResult[0].first_name} ${queryResult[0].last_name}`,
        type_name: queryResult[0].type_name
      });
    } else {
      console.log('❌ Request query returned no results');
    }

    console.log('\n🎉 Debug completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run debug
if (require.main === module) {
  debugNotification()
    .then(() => {
      console.log('🎉 Debug script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { debugNotification };
