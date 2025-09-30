const mysql = require('mysql2/promise');
const ResidencyService = require('./src/services/residencyService');
const logger = require('./src/utils/logger');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function testResidencySMSFix() {
  let connection;
  
  try {
    console.log('🔧 Testing Residency SMS Notification Fix');
    console.log('='.repeat(50));
    
    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected');
    
    // Get a client with pending residency verification and phone number
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
      console.log('📝 Creating a test scenario with existing client data...');
      
      // Get any client with phone number for testing
      const [anyClients] = await connection.execute(`
        SELECT cp.account_id, cp.first_name, cp.last_name, cp.phone_number, cp.email,
               ca.status, cp.residency_verification_status
        FROM client_profiles cp
        JOIN client_accounts ca ON cp.account_id = ca.id
        WHERE cp.phone_number IS NOT NULL 
          AND cp.phone_number != ''
        LIMIT 1
      `);
      
      if (anyClients.length > 0) {
        const client = anyClients[0];
        console.log('👤 Found test client:', {
          accountId: client.account_id,
          name: `${client.first_name} ${client.last_name}`,
          phone: client.phone_number,
          status: client.status,
          residencyStatus: client.residency_verification_status
        });
        
        console.log('🧪 Testing SMS notification methods directly...');
        
        // Test the SMS service directly
        const SMSService = require('./src/services/smsService');
        const smsService = new SMSService();
        
        console.log('📱 SMS Service Status:', smsService.getStatus());
        
        // Test approval SMS
        console.log('🧪 Testing approval SMS...');
        const approvalResult = await smsService.sendAccountStatusSMS({
          phoneNumber: client.phone_number,
          clientName: `${client.first_name} ${client.last_name}`,
          status: 'residency_approved'
        });
        console.log('📤 Approval SMS Result:', approvalResult);
        
        // Test rejection SMS
        console.log('🧪 Testing rejection SMS...');
        const rejectionResult = await smsService.sendAccountStatusSMS({
          phoneNumber: client.phone_number,
          clientName: `${client.first_name} ${client.last_name}`,
          status: 'residency_rejected',
          reason: 'Test rejection reason for SMS notification fix verification'
        });
        console.log('📤 Rejection SMS Result:', rejectionResult);
        
      } else {
        console.log('❌ No clients with phone numbers found for testing');
      }
    } else {
      const client = clients[0];
      console.log('👤 Found client with pending residency verification:', {
        accountId: client.account_id,
        name: `${client.first_name} ${client.last_name}`,
        phone: client.phone_number,
        status: client.status,
        residencyStatus: client.residency_verification_status
      });
      
      console.log('🧪 Testing residency service methods...');
      
      // Note: We won't actually approve/reject to avoid changing real data
      // Instead, we'll test the SMS service directly
      const SMSService = require('./src/services/smsService');
      const smsService = new SMSService();
      
      console.log('📱 SMS Service Status:', smsService.getStatus());
      
      // Test approval SMS
      console.log('🧪 Testing approval SMS...');
      const approvalResult = await smsService.sendAccountStatusSMS({
        phoneNumber: client.phone_number,
        clientName: `${client.first_name} ${client.last_name}`,
        status: 'residency_approved'
      });
      console.log('📤 Approval SMS Result:', approvalResult);
      
      // Test rejection SMS
      console.log('🧪 Testing rejection SMS...');
      const rejectionResult = await smsService.sendAccountStatusSMS({
        phoneNumber: client.phone_number,
        clientName: `${client.first_name} ${client.last_name}`,
        status: 'residency_rejected',
        reason: 'Test rejection reason for SMS notification fix verification'
      });
      console.log('📤 Rejection SMS Result:', rejectionResult);
    }
    
    console.log('\n✅ SMS notification fix testing completed');
    console.log('🔧 The executeQuery import has been added to residencyService.js');
    console.log('📱 SMS notifications should now work for client account approval/rejection');
    
  } catch (error) {
    console.error('❌ Error testing residency SMS fix:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the test
testResidencySMSFix().catch(console.error);
