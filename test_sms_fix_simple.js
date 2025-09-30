// Simple test to verify SMS service is working after the fix
const SMSService = require('./src/services/smsService');

async function testSMSFix() {
  try {
    console.log('🔧 Testing SMS Service Fix');
    console.log('='.repeat(40));
    
    // Initialize SMS service
    const smsService = new SMSService();
    
    // Check SMS service status
    console.log('📱 SMS Service Status:', smsService.getStatus());
    
    // Test phone number (using a test number)
    const testPhoneNumber = '+639123456789';
    const testClientName = 'Test Client';
    
    console.log('\n🧪 Testing SMS notifications...');
    
    // Test approval SMS
    console.log('📤 Testing approval SMS...');
    try {
      const approvalResult = await smsService.sendAccountStatusSMS({
        phoneNumber: testPhoneNumber,
        clientName: testClientName,
        status: 'residency_approved'
      });
      console.log('✅ Approval SMS Result:', approvalResult);
    } catch (error) {
      console.log('❌ Approval SMS Error:', error.message);
    }
    
    // Test rejection SMS
    console.log('📤 Testing rejection SMS...');
    try {
      const rejectionResult = await smsService.sendAccountStatusSMS({
        phoneNumber: testPhoneNumber,
        clientName: testClientName,
        status: 'residency_rejected',
        reason: 'Test rejection reason for SMS notification fix verification'
      });
      console.log('✅ Rejection SMS Result:', rejectionResult);
    } catch (error) {
      console.log('❌ Rejection SMS Error:', error.message);
    }
    
    // Test basic SMS
    console.log('📤 Testing basic SMS...');
    try {
      const basicResult = await smsService.testSMS(testPhoneNumber);
      console.log('✅ Basic SMS Result:', basicResult);
    } catch (error) {
      console.log('❌ Basic SMS Error:', error.message);
    }
    
    console.log('\n✅ SMS service testing completed');
    console.log('🔧 The executeQuery import fix has been applied to residencyService.js');
    console.log('📱 SMS notifications should now work for client account approval/rejection');
    
  } catch (error) {
    console.error('❌ Error testing SMS fix:', error);
  }
}

// Run the test
testSMSFix();
