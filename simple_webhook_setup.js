const axios = require('axios');
require('dotenv').config();

async function setupWebhook() {
  try {
    console.log('🔗 Setting up PayMongo webhook...');
    
    const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
    const WEBHOOK_URL = process.env.WEBHOOK_URL;
    
    console.log('📡 Webhook URL:', WEBHOOK_URL);
    console.log('🔑 Using API Key:', PAYMONGO_SECRET_KEY.substring(0, 10) + '...');
    
    // Create webhook
    const webhookData = {
      data: {
        attributes: {
          url: WEBHOOK_URL,
          events: [
            'payment.paid',
            'payment.failed',
            'link.payment.paid'
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
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Failed to setup webhook:', error.response?.data || error.message);
  }
}

setupWebhook();
