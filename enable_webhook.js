const axios = require('axios');
require('dotenv').config();

// PayMongo API configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || 'your_paymongo_secret_key_here';
const BASE_URL = 'https://api.paymongo.com/v1';

// Create authorization header
function getAuthHeader() {
  return {
    'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  };
}

// Enable webhook
async function enableWebhook(webhookId) {
  try {
    console.log('🔧 Enabling PayMongo webhook...');
    console.log('📋 Webhook ID:', webhookId);
    
    const response = await axios.patch(`${BASE_URL}/webhooks/${webhookId}`, {
      data: {
        attributes: {
          status: 'enabled'
        }
      }
    }, {
      headers: getAuthHeader()
    });

    console.log('✅ Webhook enabled successfully!');
    console.log('📋 Webhook Details:');
    console.log('   ID:', response.data.data.id);
    console.log('   URL:', response.data.data.attributes.url);
    console.log('   Events:', response.data.data.attributes.events);
    console.log('   Status:', response.data.data.attributes.status);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Failed to enable webhook:');
    if (error.response?.data) {
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return null;
  }
}

// Main execution
async function main() {
  console.log('🚀 PayMongo Webhook Enabler');
  console.log('==================================================');
  console.log('🔑 Using API Key:', PAYMONGO_SECRET_KEY.substring(0, 10) + '...');
  console.log('==================================================\n');
  
  const webhookId = 'hook_3GoBojUFKyeY6VggKWrGc32B';
  await enableWebhook(webhookId);
}

// Run the script
main().catch(console.error);
