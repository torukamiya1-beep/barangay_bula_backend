const axios = require('axios');
const mysql = require('mysql2/promise');

const API_BASE_URL = 'http://localhost:3001/api';
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function testFrontendToAdminNotification() {
  let connection;
  
  try {
    console.log('🔄 Testing Frontend to Admin Notification Flow...\n');

    // Step 1: Connect to database
    console.log('🔄 Step 1: Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Step 2: Check current notification count
    console.log('\n🔄 Step 2: Checking current notifications...');
    const [beforeNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`📊 Current notifications: ${beforeNotifications[0].count}`);

    // Step 3: Get active admins
    console.log('\n🔄 Step 3: Checking active admins...');
    const [admins] = await connection.execute(`
      SELECT id, username, role FROM admin_employee_accounts WHERE status = 'active'
    `);
    console.log(`👥 Active admins: ${admins.length}`);
    admins.forEach(admin => {
      console.log(`   - Admin ID: ${admin.id}, Username: ${admin.username}, Role: ${admin.role}`);
    });

    if (admins.length === 0) {
      console.log('❌ No active admins found. Cannot test admin notifications.');
      return;
    }

    // Step 4: Test client login (simulate frontend authentication)
    console.log('\n🔄 Step 4: Testing client authentication...');
    
    // Get a test client
    const [clients] = await connection.execute(`
      SELECT ca.*, cp.first_name, cp.last_name 
      FROM client_accounts ca 
      JOIN client_profiles cp ON ca.id = cp.account_id 
      LIMIT 1
    `);

    if (clients.length === 0) {
      console.log('❌ No clients found. Creating test client...');
      // Create test client logic here if needed
      return;
    }

    const testClient = clients[0];
    console.log(`✅ Found test client: ${testClient.first_name} ${testClient.last_name} (ID: ${testClient.id})`);

    // Step 5: Simulate document request submission (like from Vue components)
    console.log('\n🔄 Step 5: Simulating document request submission...');
    
    // Test data similar to what CedulaRequest.vue would send
    const cedulaRequestData = {
      document_type_id: 1, // Cedula
      purpose_category_id: 1,
      purpose_details: 'Frontend Test - Cedula Request',
      payment_method_id: 1,
      delivery_method: 'pickup',
      priority: 'normal',
      // Cedula-specific data
      profession: 'Frontend Tester',
      employer: 'Test Company Frontend',
      employer_address: 'Frontend Test Address',
      annual_income: 600000,
      height: 175,
      weight: 65,
      tin_number: '999-888-777-000'
    };

    console.log('📋 Submitting Cedula request data:', {
      document_type_id: cedulaRequestData.document_type_id,
      purpose_details: cedulaRequestData.purpose_details,
      profession: cedulaRequestData.profession
    });

    try {
      // Simulate the API call that the frontend makes
      const response = await axios.post(`${API_BASE_URL}/client/document-requests`, cedulaRequestData, {
        headers: {
          'Authorization': `Bearer fake-token-for-client-${testClient.id}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('✅ Document request submitted successfully!');
      console.log(`📋 Request ID: ${response.data.data.id}`);
      console.log(`📋 Request Number: ${response.data.data.request_number}`);

    } catch (apiError) {
      console.log('⚠️  API call failed (expected if server not running), testing direct service call...');
      
      // Fallback: Test the service directly
      const DocumentRequestService = require('../src/services/documentRequestService');
      
      try {
        const result = await DocumentRequestService.submitRequest(cedulaRequestData, testClient.id);
        console.log('✅ Direct service call successful!');
        console.log(`📋 Request ID: ${result.data.id}`);
        console.log(`📋 Request Number: ${result.data.request_number}`);
      } catch (serviceError) {
        console.error('❌ Service call failed:', serviceError.message);
        return;
      }
    }

    // Step 6: Wait for notification processing
    console.log('\n🔄 Step 6: Waiting for notification processing...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    // Step 7: Check if admin notifications were created
    console.log('\n🔄 Step 7: Checking admin notifications...');
    
    const [afterNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    
    const newNotificationCount = afterNotifications[0].count - beforeNotifications[0].count;
    console.log(`📊 New notifications created: ${newNotificationCount}`);

    if (newNotificationCount > 0) {
      console.log('✅ SUCCESS: Admin notifications were created!');
      
      // Get the latest notifications
      const [latestNotifications] = await connection.execute(`
        SELECT n.*, aea.username as admin_username
        FROM notifications n
        LEFT JOIN admin_employee_accounts aea ON n.recipient_id = aea.id
        WHERE n.type = 'new_request'
        ORDER BY n.created_at DESC
        LIMIT ${newNotificationCount}
      `);

      console.log('\n📋 Latest admin notifications:');
      latestNotifications.forEach((notif, index) => {
        console.log(`   ${index + 1}. Notification ID: ${notif.id}`);
        console.log(`      Admin: ${notif.admin_username} (ID: ${notif.recipient_id})`);
        console.log(`      Title: ${notif.title}`);
        console.log(`      Message: ${notif.message}`);
        console.log(`      Created: ${notif.created_at}`);
        console.log(`      Data: ${notif.data}`);
        console.log('');
      });

      // Step 8: Verify notification content
      console.log('🔄 Step 8: Verifying notification content...');
      
      const firstNotification = latestNotifications[0];
      const notificationData = JSON.parse(firstNotification.data);
      
      const expectedFields = ['request_id', 'request_number', 'document_type', 'client_name', 'admin_id'];
      const missingFields = expectedFields.filter(field => !notificationData.hasOwnProperty(field));
      
      if (missingFields.length === 0) {
        console.log('✅ Notification data contains all required fields');
        console.log(`   - Request ID: ${notificationData.request_id}`);
        console.log(`   - Request Number: ${notificationData.request_number}`);
        console.log(`   - Document Type: ${notificationData.document_type}`);
        console.log(`   - Client Name: ${notificationData.client_name}`);
        console.log(`   - Admin ID: ${notificationData.admin_id}`);
      } else {
        console.log(`⚠️  Missing fields in notification data: ${missingFields.join(', ')}`);
      }

    } else {
      console.log('❌ FAILED: No admin notifications were created');
      
      // Debug: Check if the request was actually created
      const [recentRequests] = await connection.execute(`
        SELECT * FROM document_requests ORDER BY created_at DESC LIMIT 1
      `);
      
      if (recentRequests.length > 0) {
        console.log('🔍 Debug: Latest request was created:', {
          id: recentRequests[0].id,
          request_number: recentRequests[0].request_number,
          created_at: recentRequests[0].created_at
        });
        console.log('🔍 This suggests the notification service may have failed');
      } else {
        console.log('🔍 Debug: No recent requests found - request creation may have failed');
      }
    }

    console.log('\n🎉 Frontend to Admin Notification test completed!');

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
  testFrontendToAdminNotification()
    .then(() => {
      console.log('🎉 Test script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testFrontendToAdminNotification };
