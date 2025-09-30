const DocumentRequestService = require('../src/services/documentRequestService');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function testBarangayClearanceNotification() {
  let connection;
  
  try {
    console.log('🔄 Testing Barangay Clearance Request Notification...\n');

    connection = await mysql.createConnection(dbConfig);

    // Get current notification count
    const [beforeNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`📊 Current notifications: ${beforeNotifications[0].count}`);

    // Get test client
    const [clients] = await connection.execute(`
      SELECT ca.*, cp.first_name, cp.last_name 
      FROM client_accounts ca 
      JOIN client_profiles cp ON ca.id = cp.account_id 
      LIMIT 1
    `);

    if (clients.length === 0) {
      console.log('❌ No clients found');
      return;
    }

    const testClient = clients[0];
    console.log(`✅ Using client: ${testClient.first_name} ${testClient.last_name} (ID: ${testClient.id})`);

    // Test data similar to what BarangayClearanceRequest.vue would send
    const barangayClearanceRequestData = {
      document_type_id: 2, // Barangay Clearance
      purpose_category_id: 1,
      purpose_details: 'Frontend Test - Barangay Clearance Request',
      payment_method_id: 1,
      delivery_method: 'pickup',
      priority: 'normal',
      // Barangay Clearance specific data
      has_pending_cases: false,
      pending_cases_details: null
    };

    console.log('📋 Submitting Barangay Clearance request...');

    // Submit the request
    const result = await DocumentRequestService.submitRequest(barangayClearanceRequestData, testClient.id);
    
    console.log('✅ Barangay Clearance request submitted successfully!');
    console.log(`📋 Request ID: ${result.data.id}`);
    console.log(`📋 Request Number: ${result.data.request_number}`);

    // Wait for notification processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check notifications after
    const [afterNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);

    const newNotificationCount = afterNotifications[0].count - beforeNotifications[0].count;
    console.log(`📊 New notifications created: ${newNotificationCount}`);

    if (newNotificationCount > 0) {
      console.log('✅ SUCCESS: Admin notification created for Barangay Clearance request!');
      
      // Get the latest notification
      const [latestNotification] = await connection.execute(`
        SELECT 
          n.*,
          aea.username as admin_username
        FROM notifications n
        LEFT JOIN admin_employee_accounts aea ON n.recipient_id = aea.id
        WHERE n.type = 'new_request'
        ORDER BY n.created_at DESC
        LIMIT 1
      `);

      if (latestNotification.length > 0) {
        const notif = latestNotification[0];
        const data = JSON.parse(notif.data);
        
        console.log('\n📋 Notification Details:');
        console.log(`   ID: ${notif.id}`);
        console.log(`   Admin: ${notif.admin_username} (ID: ${notif.recipient_id})`);
        console.log(`   Title: ${notif.title}`);
        console.log(`   Message: ${notif.message}`);
        console.log(`   Document Type: ${data.document_type}`);
        console.log(`   Request Number: ${data.request_number}`);
        console.log(`   Client Name: ${data.client_name}`);
        console.log(`   Created: ${notif.created_at}`);
      }
    } else {
      console.log('❌ FAILED: No notification created for Barangay Clearance request');
    }

    console.log('\n🎉 Barangay Clearance notification test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run test
if (require.main === module) {
  testBarangayClearanceNotification()
    .then(() => {
      console.log('🎉 Test completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testBarangayClearanceNotification };
