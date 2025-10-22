/**
 * Test Gmail SMTP Connection
 * This script tests the Gmail credentials and both port 465 and 587
 */

const nodemailer = require('nodemailer');

const credentials = {
  user: 'torukamiya1@gmail.com',
  pass: 'vhilhuluogotyknn'
};

async function testPort465() {
  console.log('\n🔍 Testing Port 465 (SSL)...');
  console.log('=' .repeat(60));
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
      user: credentials.user,
      pass: credentials.pass
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });

  try {
    console.log('⏳ Verifying connection...');
    await transporter.verify();
    console.log('✅ Port 465 (SSL): CONNECTION SUCCESSFUL!');
    
    // Try sending a test email
    console.log('\n⏳ Sending test email...');
    const info = await transporter.sendMail({
      from: {
        name: 'Barangay Bula Management System',
        address: credentials.user
      },
      to: credentials.user, // Send to self
      subject: 'Test Email - Port 465 SSL',
      html: '<h1>Success!</h1><p>Port 465 with SSL is working correctly.</p>',
      text: 'Success! Port 465 with SSL is working correctly.'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    
    return true;
  } catch (error) {
    console.error('❌ Port 465 (SSL): FAILED');
    console.error('   Error Message:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Command:', error.command);
    console.error('   Full Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return false;
  }
}

async function testPort587() {
  console.log('\n🔍 Testing Port 587 (TLS/STARTTLS)...');
  console.log('='.repeat(60));
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: credentials.user,
      pass: credentials.pass
    },
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000
  });

  try {
    console.log('⏳ Verifying connection...');
    await transporter.verify();
    console.log('✅ Port 587 (TLS): CONNECTION SUCCESSFUL!');
    
    // Try sending a test email
    console.log('\n⏳ Sending test email...');
    const info = await transporter.sendMail({
      from: {
        name: 'Barangay Bula Management System',
        address: credentials.user
      },
      to: credentials.user, // Send to self
      subject: 'Test Email - Port 587 TLS',
      html: '<h1>Success!</h1><p>Port 587 with TLS is working correctly.</p>',
      text: 'Success! Port 587 with TLS is working correctly.'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    
    return true;
  } catch (error) {
    console.error('❌ Port 587 (TLS): FAILED');
    console.error('   Error Message:', error.message);
    console.error('   Error Code:', error.code);
    console.error('   Error Command:', error.command);
    console.error('   Full Error:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    return false;
  }
}

async function main() {
  console.log('\n📧 Gmail SMTP Connection Test');
  console.log('='.repeat(60));
  console.log('Email:', credentials.user);
  console.log('App Password Length:', credentials.pass.length, 'characters');
  console.log('App Password:', credentials.pass);
  console.log('='.repeat(60));

  const port465Works = await testPort465();
  const port587Works = await testPort587();

  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(60));
  console.log('Port 465 (SSL):', port465Works ? '✅ WORKING' : '❌ FAILED');
  console.log('Port 587 (TLS):', port587Works ? '✅ WORKING' : '❌ FAILED');
  console.log('='.repeat(60));

  if (port465Works || port587Works) {
    console.log('\n✅ Gmail credentials are VALID!');
    if (port465Works) {
      console.log('✅ Recommended: Use PORT 465 with secure:true');
    } else if (port587Works) {
      console.log('⚠️  Use PORT 587 with secure:false (STARTTLS)');
    }
  } else {
    console.log('\n❌ Both ports failed. Possible issues:');
    console.log('   1. App Password is incorrect');
    console.log('   2. 2-Step Verification not enabled');
    console.log('   3. Network/Firewall blocking SMTP');
    console.log('   4. Gmail account security settings');
  }

  console.log('\n🔗 Gmail App Password Guide:');
  console.log('   https://myaccount.google.com/apppasswords');
  console.log('\n');
}

main().catch(console.error);
