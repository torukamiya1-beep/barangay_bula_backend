require('dotenv').config();
const axios = require('axios');
const nodemailer = require('nodemailer');

console.log('🔍 COMPREHENSIVE NOTIFICATION SYSTEM DIAGNOSTIC');
console.log('='.repeat(80));
console.log('Testing both Email (Gmail) and SMS (TextBee) services\n');

// Test credentials
const TEST_EMAIL = 'p71345453@gmail.com';
const TEST_PHONE = '09955958358';

// Email configuration from .env
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
  fromName: process.env.EMAIL_FROM_NAME || 'Barangay Bula Management System',
  fromAddress: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER
};

// SMS configuration (hardcoded in smsService.js)
const SMS_CONFIG = {
  baseURL: 'https://api.textbee.dev/api/v1',
  apiKey: 'f307cb44-b5e2-4733-b484-975613392987',
  deviceId: '68c9071fc27bd0d0b9674cac',
  enabled: process.env.SMS_ENABLED !== 'false'
};

async function testEmailService() {
  console.log('\n📧 TESTING EMAIL SERVICE (Gmail)');
  console.log('-'.repeat(80));
  
  try {
    // Step 1: Check environment variables
    console.log('\n1️⃣ Checking Email Environment Variables:');
    console.log(`   EMAIL_HOST: ${EMAIL_CONFIG.host}`);
    console.log(`   EMAIL_PORT: ${EMAIL_CONFIG.port}`);
    console.log(`   EMAIL_SECURE: ${EMAIL_CONFIG.secure}`);
    console.log(`   EMAIL_USER: ${EMAIL_CONFIG.user ? '✅ SET' : '❌ NOT SET'}`);
    console.log(`   EMAIL_PASS: ${EMAIL_CONFIG.pass ? '✅ SET (length: ' + EMAIL_CONFIG.pass.length + ')' : '❌ NOT SET'}`);
    console.log(`   EMAIL_FROM_NAME: ${EMAIL_CONFIG.fromName}`);
    console.log(`   EMAIL_FROM_ADDRESS: ${EMAIL_CONFIG.fromAddress}`);
    
    if (!EMAIL_CONFIG.user || !EMAIL_CONFIG.pass) {
      throw new Error('Email credentials not configured in .env file');
    }
    
    // Step 2: Create transporter
    console.log('\n2️⃣ Creating Email Transporter...');
    const transporter = nodemailer.createTransport({
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      auth: {
        user: EMAIL_CONFIG.user,
        pass: EMAIL_CONFIG.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000
    });
    console.log('   ✅ Transporter created');
    
    // Step 3: Verify connection
    console.log('\n3️⃣ Verifying SMTP Connection...');
    await transporter.verify();
    console.log('   ✅ SMTP connection verified successfully!');
    
    // Step 4: Send test email
    console.log(`\n4️⃣ Sending Test Email to ${TEST_EMAIL}...`);
    const mailOptions = {
      from: {
        name: EMAIL_CONFIG.fromName,
        address: EMAIL_CONFIG.fromAddress
      },
      to: TEST_EMAIL,
      subject: 'Test Email - Barangay Bula Notification System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0;">✅ Email System Working!</h1>
          </div>
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #28a745;">Diagnostic Test Successful</h2>
            <p>This is a test email from your Barangay Bula Document Hub notification system.</p>
            <p><strong>Test Details:</strong></p>
            <ul>
              <li>Sent from: ${EMAIL_CONFIG.fromAddress}</li>
              <li>SMTP Host: ${EMAIL_CONFIG.host}</li>
              <li>Port: ${EMAIL_CONFIG.port}</li>
              <li>Timestamp: ${new Date().toLocaleString()}</li>
            </ul>
            <p style="color: #28a745; font-weight: bold;">✅ Your Gmail notification system is working correctly!</p>
          </div>
        </div>
      `,
      text: 'Email System Test - If you receive this, your email notifications are working!'
    };
    
    const result = await transporter.sendMail(mailOptions);
    console.log('   ✅ Email sent successfully!');
    console.log(`   Message ID: ${result.messageId}`);
    console.log(`   Response: ${result.response}`);
    
    return {
      success: true,
      message: 'Email service is working correctly',
      messageId: result.messageId
    };
    
  } catch (error) {
    console.log('   ❌ Email test FAILED!');
    console.log(`   Error: ${error.message}`);
    
    // Detailed error diagnosis
    if (error.code === 'EAUTH') {
      console.log('\n   🔍 DIAGNOSIS: Authentication failed');
      console.log('   Possible causes:');
      console.log('   1. Wrong email or password');
      console.log('   2. App password not generated (Gmail requires app passwords)');
      console.log('   3. 2-factor authentication not enabled on Gmail');
      console.log('\n   📝 Solution:');
      console.log('   1. Go to https://myaccount.google.com/apppasswords');
      console.log('   2. Generate a new app password');
      console.log('   3. Update EMAIL_PASS in .env with the new app password');
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNECTION') {
      console.log('\n   🔍 DIAGNOSIS: Connection timeout');
      console.log('   Possible causes:');
      console.log('   1. Firewall blocking SMTP port 587');
      console.log('   2. Network connectivity issues');
      console.log('   3. Gmail SMTP server temporarily unavailable');
    } else if (error.code === 'EENVELOPE') {
      console.log('\n   🔍 DIAGNOSIS: Invalid email address');
      console.log('   Check EMAIL_USER and EMAIL_FROM_ADDRESS in .env');
    }
    
    return {
      success: false,
      error: error.message,
      code: error.code
    };
  }
}

async function testSMSService() {
  console.log('\n\n📱 TESTING SMS SERVICE (TextBee)');
  console.log('-'.repeat(80));
  
  try {
    // Step 1: Check SMS configuration
    console.log('\n1️⃣ Checking SMS Configuration:');
    console.log(`   Base URL: ${SMS_CONFIG.baseURL}`);
    console.log(`   API Key: ${SMS_CONFIG.apiKey ? '✅ SET (...' + SMS_CONFIG.apiKey.slice(-8) + ')' : '❌ NOT SET'}`);
    console.log(`   Device ID: ${SMS_CONFIG.deviceId}`);
    console.log(`   Enabled: ${SMS_CONFIG.enabled ? '✅ YES' : '❌ NO'}`);
    
    if (!SMS_CONFIG.enabled) {
      throw new Error('SMS service is disabled. Set SMS_ENABLED=true in .env');
    }
    
    if (!SMS_CONFIG.apiKey || !SMS_CONFIG.deviceId) {
      throw new Error('SMS API credentials not configured');
    }
    
    // Step 2: Format phone number
    console.log(`\n2️⃣ Formatting Phone Number: ${TEST_PHONE}`);
    let formattedPhone = TEST_PHONE.replace(/\D/g, '');
    if (formattedPhone.startsWith('09')) {
      formattedPhone = '+63' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('9')) {
      formattedPhone = '+63' + formattedPhone;
    } else if (formattedPhone.startsWith('63')) {
      formattedPhone = '+' + formattedPhone;
    }
    console.log(`   Formatted: ${formattedPhone}`);
    
    // Step 3: Send test SMS
    console.log(`\n3️⃣ Sending Test SMS to ${formattedPhone}...`);
    const message = 'Barangay Bula Document Hub: Test SMS - Your notification system is working! This is a diagnostic test message.';
    
    const response = await axios.post(
      `${SMS_CONFIG.baseURL}/gateway/devices/${SMS_CONFIG.deviceId}/send-sms`,
      {
        recipients: [formattedPhone],
        message: message
      },
      {
        headers: {
          'x-api-key': SMS_CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    console.log('   ✅ SMS sent successfully!');
    console.log(`   Response Status: ${response.status}`);
    console.log(`   Response Data:`, JSON.stringify(response.data, null, 2));
    
    return {
      success: true,
      message: 'SMS service is working correctly',
      response: response.data
    };
    
  } catch (error) {
    console.log('   ❌ SMS test FAILED!');
    
    if (error.response) {
      console.log(`   HTTP Status: ${error.response.status}`);
      console.log(`   Error Data:`, JSON.stringify(error.response.data, null, 2));
      
      // Detailed error diagnosis
      if (error.response.status === 401) {
        console.log('\n   🔍 DIAGNOSIS: Authentication failed');
        console.log('   Possible causes:');
        console.log('   1. Invalid API key');
        console.log('   2. API key expired or revoked');
        console.log('\n   📝 Solution:');
        console.log('   1. Login to TextBee dashboard');
        console.log('   2. Verify or regenerate API key');
        console.log('   3. Update apiKey in smsService.js');
      } else if (error.response.status === 404) {
        console.log('\n   🔍 DIAGNOSIS: Device not found');
        console.log('   Possible causes:');
        console.log('   1. Invalid device ID');
        console.log('   2. Device disconnected from TextBee');
        console.log('\n   📝 Solution:');
        console.log('   1. Check TextBee dashboard for device status');
        console.log('   2. Verify deviceId in smsService.js');
      } else if (error.response.status === 400) {
        console.log('\n   🔍 DIAGNOSIS: Bad request');
        console.log('   Possible causes:');
        console.log('   1. Invalid phone number format');
        console.log('   2. Message too long or contains invalid characters');
      }
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.log('\n   🔍 DIAGNOSIS: Connection timeout');
      console.log('   Possible causes:');
      console.log('   1. Network connectivity issues');
      console.log('   2. TextBee API temporarily unavailable');
      console.log('   3. Firewall blocking outbound HTTPS requests');
    } else {
      console.log(`   Error: ${error.message}`);
    }
    
    return {
      success: false,
      error: error.message,
      response: error.response?.data
    };
  }
}

async function runDiagnostics() {
  console.log(`\n📋 Test Configuration:`);
  console.log(`   Test Email: ${TEST_EMAIL}`);
  console.log(`   Test Phone: ${TEST_PHONE}`);
  console.log(`   Timestamp: ${new Date().toLocaleString()}\n`);
  
  const emailResult = await testEmailService();
  const smsResult = await testSMSService();
  
  // Summary
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));
  
  console.log('\n📧 Email Service:');
  if (emailResult.success) {
    console.log('   ✅ STATUS: WORKING');
    console.log(`   Message ID: ${emailResult.messageId}`);
    console.log(`   Check ${TEST_EMAIL} for the test email`);
  } else {
    console.log('   ❌ STATUS: FAILED');
    console.log(`   Error: ${emailResult.error}`);
  }
  
  console.log('\n📱 SMS Service:');
  if (smsResult.success) {
    console.log('   ✅ STATUS: WORKING');
    console.log(`   Check ${TEST_PHONE} for the test SMS`);
  } else {
    console.log('   ❌ STATUS: FAILED');
    console.log(`   Error: ${smsResult.error}`);
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (emailResult.success && smsResult.success) {
    console.log('✅ ALL SYSTEMS OPERATIONAL!');
    console.log('\nBoth email and SMS notifications are working correctly.');
    console.log('If you\'re not receiving notifications in your app, the issue may be:');
    console.log('1. Notification triggers not being called');
    console.log('2. Database query issues');
    console.log('3. Missing user email/phone data');
  } else {
    console.log('⚠️  ISSUES DETECTED - See details above');
    console.log('\nReview the diagnostic output above for specific fixes.');
  }
  
  console.log('\n' + '='.repeat(80));
}

// Run diagnostics
runDiagnostics().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});
