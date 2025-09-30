const axios = require('axios');
require('dotenv').config();

async function setupPayMongoWebhook() {
  try {
    console.log('🔗 Setting up PayMongo webhook...');
    
    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
    const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-domain.com/api/payments/webhook';
    
    if (!PAYMONGO_SECRET_KEY) {
      throw new Error('PAYMONGO_SECRET_KEY not found in environment variables');
    }
    
    console.log('📡 Webhook URL:', WEBHOOK_URL);
    console.log('🔑 Using API Key:', PAYMONGO_SECRET_KEY.substring(0, 10) + '...');
    
    // Create webhook
    const webhookData = {
      data: {
        attributes: {
          url: WEBHOOK_URL,
          events: [
            'link.payment.paid',
            'link.payment.failed',
            'payment.paid',
            'payment.failed'
          ]
        }
      }
    };
    
    const response = await axios.post(
      'https://api.paymongo.com/v1/webhooks',
      webhookData,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Webhook created successfully!');
    console.log('📋 Webhook Details:');
    console.log('   ID:', response.data.data.id);
    console.log('   URL:', response.data.data.attributes.url);
    console.log('   Events:', response.data.data.attributes.events);
    console.log('   Secret:', response.data.data.attributes.secret_key);
    
    console.log('\n🔧 Add this to your .env file:');
    console.log(`PAYMONGO_WEBHOOK_SECRET=${response.data.data.attributes.secret_key}`);
    console.log(`WEBHOOK_URL=${WEBHOOK_URL}`);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Failed to setup webhook:', error.response?.data || error.message);
    
    if (error.response?.status === 422) {
      console.log('\n💡 This might mean:');
      console.log('   - Webhook URL already exists');
      console.log('   - Invalid URL format');
      console.log('   - URL not accessible from internet');
    }
    
    throw error;
  }
}

// For development, you can use ngrok to expose your local server
async function setupDevelopmentWebhook() {
  console.log('🚀 Development Setup Instructions:');
  console.log('');
  console.log('1. Install ngrok: npm install -g ngrok');
  console.log('2. Expose your local server: ngrok http 7000');
  console.log('3. Copy the HTTPS URL from ngrok');
  console.log('4. Update WEBHOOK_URL in .env file');
  console.log('5. Run this script again');
  console.log('');
  console.log('Example:');
  console.log('   WEBHOOK_URL=https://abc123.ngrok.io/api/payments/webhook');
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--dev-help')) {
    setupDevelopmentWebhook();
  } else {
    setupPayMongoWebhook()
      .then(() => {
        console.log('\n🎉 Webhook setup completed!');
        process.exit(0);
      })
      .catch((error) => {
        console.error('\n💥 Setup failed:', error.message);
        console.log('\n📖 For development setup help, run:');
        console.log('   node setup_paymongo_webhook.js --dev-help');
        process.exit(1);
      });
  }
}

module.exports = { setupPayMongoWebhook };
