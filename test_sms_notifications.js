const mysql = require('mysql2/promise');
const SMSService = require('./src/services/smsService');
const logger = require('./src/utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function testSMSNotifications() {
  let connection;
  
  try {
    console.log('🔧 Testing SMS Notifications for Client Account Approval/Rejection');
    console.log('='.repeat(70));
    
    // Initialize SMS service
    const smsService = new SMSService();
    console.log('📱 SMS Service Status:', smsService.getStatus());
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Get a sample client with phone number
    const [clients] = await connection.execute(`
      SELECT cp.account_id, cp.first_name, cp.last_name, cp.phone_number, cp.email,
             ca.status, cp.residency_verification_status
      FROM client_profiles cp
      JOIN client_accounts ca ON cp.account_id = ca.id
      WHERE cp.phone_number IS NOT NULL 
        AND cp.phone_number != ''
        AND cp.residency_verification_status = 'pending'
      LIMIT 1
    `);
    
    if (clients.length === 0) {
      console.log('⚠️  No clients with phone numbers and pending residency verification found');
      
      // Create a test client for demonstration
      console.log('📝 Creating test client data...');
      const testClient = {
        first_name: 'Test',
        last_name: 'Client',
        phone_number: '+639123456789', // Test phone number
        email: 'test@example.com'
      };
      
      console.log('🧪 Testing SMS approval notification...');
      const approvalResult = await smsService.sendAccountStatusSMS({
        phoneNumber: testClient.phone_number,
        clientName: `${testClient.first_name} ${testClient.last_name}`,
        status: 'residency_approved'
      });
      
      console.log('📤 Approval SMS Result:', approvalResult);
      
      console.log('🧪 Testing SMS rejection notification...');
      const rejectionResult = await smsService.sendAccountStatusSMS({
        phoneNumber: testClient.phone_number,
        clientName: `${testClient.first_name} ${testClient.last_name}`,
        status: 'residency_rejected',
        reason: 'Documents are not clear enough. Please resubmit with better quality images.'
      });
      
      console.log('📤 Rejection SMS Result:', rejectionResult);
      
    } else {
      const client = clients[0];
      const clientName = `${client.first_name} ${client.last_name}`;
      
      console.log('👤 Found test client:', {
        accountId: client.account_id,
        name: clientName,
        phone: client.phone_number,
        status: client.status,
        residencyStatus: client.residency_verification_status
      });
      
      console.log('🧪 Testing SMS approval notification...');
      const approvalResult = await smsService.sendAccountStatusSMS({
        phoneNumber: client.phone_number,
        clientName,
        status: 'residency_approved'
      });
      
      console.log('📤 Approval SMS Result:', approvalResult);
      
      console.log('🧪 Testing SMS rejection notification...');
      const rejectionResult = await smsService.sendAccountStatusSMS({
        phoneNumber: client.phone_number,
        clientName,
        status: 'residency_rejected',
        reason: 'Test rejection reason for SMS notification testing'
      });
      
      console.log('📤 Rejection SMS Result:', rejectionResult);
    }
    
    // Test basic SMS functionality
    console.log('\n🧪 Testing basic SMS functionality...');
    const basicTestResult = await smsService.testSMS('+639123456789');
    console.log('📤 Basic SMS Test Result:', basicTestResult);
    
    console.log('\n✅ SMS notification testing completed');
    
  } catch (error) {
    console.error('❌ Error testing SMS notifications:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
testSMSNotifications().catch(console.error);
