const mysql = require('mysql2/promise');
const DocumentRequestService = require('../src/services/documentRequestService');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4'
};

async function testNotificationFix() {
  let connection;
  
  try {
    console.log('🔄 Testing notification fix...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Check current notifications count
    const [beforeNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`📊 Notifications before test: ${beforeNotifications[0].count}`);

    // Get a test client
    const [clients] = await connection.execute(`
      SELECT cp.*, ca.id as account_id
      FROM client_profiles cp
      JOIN client_accounts ca ON cp.account_id = ca.id
      WHERE ca.status = 'active'
      LIMIT 1
    `);

    if (clients.length === 0) {
      console.log('❌ No active clients found');
      return;
    }

    const testClient = clients[0];
    console.log(`✅ Using client: ${testClient.first_name} ${testClient.last_name} (ID: ${testClient.account_id})`);

    // Test Cedula request (document_type_id = 1)
    console.log('\n🧪 Testing Cedula request notification...');
    const cedulaRequestData = {
      document_type_id: 1, // Cedula
      purpose_category_id: 1,
      purpose_details: 'Test Cedula Request for notification fix verification',
      payment_method_id: 1,
      delivery_method: 'pickup',
      priority: 'normal',
      // Cedula specific data
      annual_income: 50000,
      income_source: 'Employment',
      has_real_property: false,
      property_value: 0,
      has_personal_property: false,
      personal_property_value: 0,
      has_business: false,
      business_gross_receipts: 0
    };

    const cedulaResult = await DocumentRequestService.submitRequest(cedulaRequestData, testClient.account_id);
    console.log('✅ Cedula request submitted successfully!');
    console.log(`📋 Request ID: ${cedulaResult.data.id}`);
    console.log(`📋 Request Number: ${cedulaResult.data.request_number}`);

    // Wait for notification processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check notifications after Cedula request
    const [afterCedulaNotifications] = await connection.execute(`
      SELECT * FROM notifications 
      WHERE type = 'new_request' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('\n📋 Recent notifications after Cedula request:');
    afterCedulaNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.message}`);
      console.log(`   Data: ${notification.data}`);
      console.log(`   Created: ${notification.created_at}`);
    });

    // Test Barangay Clearance request (document_type_id = 2)
    console.log('\n🧪 Testing Barangay Clearance request notification...');
    const barangayClearanceRequestData = {
      document_type_id: 2, // Barangay Clearance
      purpose_category_id: 1,
      purpose_details: 'Test Barangay Clearance Request for notification fix verification',
      payment_method_id: 1,
      delivery_method: 'pickup',
      priority: 'normal',
      // Barangay Clearance specific data
      has_pending_cases: false,
      pending_cases_details: null
    };

    const barangayResult = await DocumentRequestService.submitRequest(barangayClearanceRequestData, testClient.account_id);
    console.log('✅ Barangay Clearance request submitted successfully!');
    console.log(`📋 Request ID: ${barangayResult.data.id}`);
    console.log(`📋 Request Number: ${barangayResult.data.request_number}`);

    // Wait for notification processing
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check notifications after Barangay Clearance request
    const [afterBarangayNotifications] = await connection.execute(`
      SELECT * FROM notifications 
      WHERE type = 'new_request' 
      ORDER BY created_at DESC 
      LIMIT 5
    `);

    console.log('\n📋 Recent notifications after Barangay Clearance request:');
    afterBarangayNotifications.forEach((notification, index) => {
      console.log(`${index + 1}. ${notification.message}`);
      console.log(`   Data: ${notification.data}`);
      console.log(`   Created: ${notification.created_at}`);
    });

    // Verify document types in database
    console.log('\n📊 Document types in database:');
    const [docTypes] = await connection.execute('SELECT * FROM document_types');
    docTypes.forEach(docType => {
      console.log(`ID: ${docType.id}, Name: "${docType.type_name}", Description: "${docType.description}"`);
    });

    // Final count
    const [finalNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`\n📊 Final notifications count: ${finalNotifications[0].count}`);
    console.log(`📊 New notifications created: ${finalNotifications[0].count - beforeNotifications[0].count}`);

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
testNotificationFix().catch(console.error);
