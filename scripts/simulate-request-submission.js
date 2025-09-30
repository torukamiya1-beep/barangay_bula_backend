const DocumentRequestService = require('../src/services/documentRequestService');
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function simulateRequestSubmission() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Step 1: Check if we have required data (client, document types, etc.)
    console.log('\n🔄 Step 1: Checking required data...');
    
    // Check for clients
    const [clients] = await connection.execute('SELECT * FROM client_profiles LIMIT 1');
    if (clients.length === 0) {
      console.log('❌ No clients found. Creating a test client...');
      
      // Create a test client account first
      const [accountResult] = await connection.execute(`
        INSERT INTO client_accounts (username, email, password_hash, is_active, created_at)
        VALUES ('testclient', 'test@example.com', '$2b$12$dummy.hash', 1, NOW())
      `);
      
      // Create client profile
      await connection.execute(`
        INSERT INTO client_profiles (
          account_id, first_name, last_name, middle_name, suffix, 
          birth_date, birth_place, gender, civil_status, nationality,
          phone_number, email, current_address, permanent_address, created_at
        ) VALUES (?, 'Test', 'Client', 'Middle', NULL, '1990-01-01', 'Test City', 
                 'Male', 'Single', 'Filipino', '09123456789', 'test@example.com',
                 'Test Address', 'Test Address', NOW())
      `, [accountResult.insertId]);
      
      console.log(`✅ Test client created with account ID: ${accountResult.insertId}`);
    } else {
      console.log(`✅ Found client: ${clients[0].first_name} ${clients[0].last_name}`);
    }

    // Check for document types
    const [docTypes] = await connection.execute('SELECT * FROM document_types WHERE is_active = 1 LIMIT 2');
    if (docTypes.length === 0) {
      console.log('❌ No document types found');
      return;
    }
    console.log(`✅ Found ${docTypes.length} document types`);

    // Check for purpose categories
    const [purposes] = await connection.execute('SELECT * FROM purpose_categories WHERE is_active = 1 LIMIT 1');
    if (purposes.length === 0) {
      console.log('❌ No purpose categories found');
      return;
    }
    console.log(`✅ Found ${purposes.length} purpose categories`);

    // Step 2: Get the latest client
    const [latestClients] = await connection.execute('SELECT * FROM client_profiles ORDER BY created_at DESC LIMIT 1');
    const testClient = latestClients[0];

    // Step 3: Simulate a Cedula request submission
    console.log('\n🔄 Step 2: Simulating Cedula request submission...');
    
    const requestData = {
      document_type_id: docTypes.find(dt => dt.type_name === 'Cedula')?.id || docTypes[0].id,
      purpose_category_id: purposes[0].id,
      purpose_details: 'Test purpose for automated testing',
      payment_method_id: 1, // Assuming cash payment
      delivery_method: 'pickup',
      priority: 'normal',
      // Cedula-specific data
      profession: 'Software Developer',
      employer: 'Test Company',
      employer_address: 'Test Company Address',
      annual_income: 500000,
      height: 170,
      weight: 70,
      tin_number: '123-456-789-000',
      previous_ctc_number: null,
      previous_ctc_date_issued: null,
      previous_ctc_place_issued: null
    };

    console.log('📋 Request data:', requestData);

    // Step 4: Check notifications before submission
    const [beforeNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`📊 Notifications before submission: ${beforeNotifications[0].count}`);

    // Step 5: Submit the request
    console.log('\n🔄 Step 3: Submitting request...');
    
    try {
      const result = await DocumentRequestService.submitRequest(requestData, testClient.account_id);
      console.log('✅ Request submitted successfully!');
      console.log(`📋 Request ID: ${result.data.id}`);
      console.log(`📋 Request Number: ${result.data.request_number}`);
    } catch (submitError) {
      console.error('❌ Request submission failed:', submitError.message);
      console.error('Stack trace:', submitError.stack);
      return;
    }

    // Step 6: Check notifications after submission
    console.log('\n🔄 Step 4: Checking notifications after submission...');
    
    // Wait a moment for async notification to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const [afterNotifications] = await connection.execute(`
      SELECT COUNT(*) as count FROM notifications WHERE type = 'new_request'
    `);
    console.log(`📊 Notifications after submission: ${afterNotifications[0].count}`);

    if (afterNotifications[0].count > beforeNotifications[0].count) {
      console.log('✅ New notification was created!');
      
      // Get the latest notification
      const [latestNotification] = await connection.execute(`
        SELECT * FROM notifications 
        WHERE type = 'new_request' 
        ORDER BY created_at DESC 
        LIMIT 1
      `);
      
      if (latestNotification.length > 0) {
        const notification = latestNotification[0];
        console.log('📋 Latest notification details:');
        console.log(`   ID: ${notification.id}`);
        console.log(`   Title: ${notification.title}`);
        console.log(`   Message: ${notification.message}`);
        console.log(`   Recipient Type: ${notification.recipient_type}`);
        console.log(`   Recipient ID: ${notification.recipient_id}`);
        console.log(`   Priority: ${notification.priority}`);
        console.log(`   Data: ${notification.data}`);
        console.log(`   Created: ${notification.created_at}`);
      }
    } else {
      console.log('❌ No new notification was created');
    }

    // Step 7: Check the document request was created
    const [newRequests] = await connection.execute(`
      SELECT dr.*, dt.type_name, cp.first_name, cp.last_name
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      ORDER BY dr.created_at DESC
      LIMIT 1
    `);

    if (newRequests.length > 0) {
      const request = newRequests[0];
      console.log('\n✅ Document request created successfully:');
      console.log(`   ID: ${request.id}`);
      console.log(`   Number: ${request.request_number}`);
      console.log(`   Type: ${request.type_name}`);
      console.log(`   Client: ${request.first_name} ${request.last_name}`);
      console.log(`   Status ID: ${request.status_id}`);
      console.log(`   Created: ${request.created_at}`);
    }

    console.log('\n🎉 Simulation completed successfully!');
    
  } catch (error) {
    console.error('❌ Simulation failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run simulation
if (require.main === module) {
  simulateRequestSubmission()
    .then(() => {
      console.log('🎉 Simulation script completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Simulation script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { simulateRequestSubmission };
