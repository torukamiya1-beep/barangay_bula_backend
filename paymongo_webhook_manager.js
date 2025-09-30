const axios = require('axios');
require('dotenv').config();

// PayMongo API configuration
// IMPORTANT: Replace these with your actual values before using
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY || 'your_paymongo_secret_key_here';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-railway-app.up.railway.app/api/webhooks/paymongo';
const BASE_URL = 'https://api.paymongo.com/v1';

// Create authorization header
function getAuthHeader() {
  return {
    'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  };
}

// 1. CREATE WEBHOOK
async function createWebhook() {
  try {
    console.log('🔗 Creating PayMongo webhook...');
    console.log('📡 Webhook URL:', WEBHOOK_URL);
    
    const webhookData = {
      data: {
        attributes: {
          url: WEBHOOK_URL,
          events: [
            'payment.paid',           // When payment is successful
            'payment.failed',         // When payment fails
            'link.payment.paid'       // When payment link is paid (MAIN ONE)
          ]
        }
      }
    };

    const response = await axios.post(`${BASE_URL}/webhooks`, webhookData, {
      headers: getAuthHeader()
    });

    console.log('✅ Webhook created successfully!');
    console.log('📋 Webhook Details:');
    console.log('   ID:', response.data.data.id);
    console.log('   URL:', response.data.data.attributes.url);
    console.log('   Events:', response.data.data.attributes.events);
    console.log('   Secret:', response.data.data.attributes.secret_key);
    console.log('   Status:', response.data.data.attributes.status);
    
    console.log('\n🔧 IMPORTANT: Add this to your .env file:');
    console.log(`PAYMONGO_WEBHOOK_SECRET=${response.data.data.attributes.secret_key}`);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Failed to create webhook:');
    if (error.response?.data) {
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return null;
  }
}

// 2. LIST ALL WEBHOOKS
async function listWebhooks() {
  try {
    console.log('📋 Listing all PayMongo webhooks...');
    
    const response = await axios.get(`${BASE_URL}/webhooks`, {
      headers: getAuthHeader()
    });

    console.log('✅ Webhooks retrieved successfully!');
    console.log(`📊 Found ${response.data.data.length} webhook(s):`);
    
    response.data.data.forEach((webhook, index) => {
      console.log(`\n   Webhook #${index + 1}:`);
      console.log(`   ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.attributes.url}`);
      console.log(`   Events: ${webhook.attributes.events.join(', ')}`);
      console.log(`   Status: ${webhook.attributes.status}`);
      console.log(`   Created: ${webhook.attributes.created_at}`);
    });
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Failed to list webhooks:');
    if (error.response?.data) {
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return null;
  }
}

// 3. RETRIEVE SPECIFIC WEBHOOK
async function retrieveWebhook(webhookId) {
  try {
    console.log(`🔍 Retrieving webhook: ${webhookId}`);
    
    const response = await axios.get(`${BASE_URL}/webhooks/${webhookId}`, {
      headers: getAuthHeader()
    });

    console.log('✅ Webhook retrieved successfully!');
    console.log('📋 Webhook Details:');
    console.log('   ID:', response.data.data.id);
    console.log('   URL:', response.data.data.attributes.url);
    console.log('   Events:', response.data.data.attributes.events);
    console.log('   Status:', response.data.data.attributes.status);
    console.log('   Secret:', response.data.data.attributes.secret_key);
    console.log('   Created:', response.data.data.attributes.created_at);
    console.log('   Updated:', response.data.data.attributes.updated_at);
    
    return response.data.data;
    
  } catch (error) {
    console.error('❌ Failed to retrieve webhook:');
    if (error.response?.data) {
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return null;
  }
}

// 4. DELETE WEBHOOK (bonus function)
async function deleteWebhook(webhookId) {
  try {
    console.log(`🗑️ Deleting webhook: ${webhookId}`);
    
    await axios.delete(`${BASE_URL}/webhooks/${webhookId}`, {
      headers: getAuthHeader()
    });

    console.log('✅ Webhook deleted successfully!');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to delete webhook:');
    if (error.response?.data) {
      console.error('   Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('   Error:', error.message);
    }
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  console.log('🚀 PayMongo Webhook Manager');
  console.log('==================================================');
  console.log('🔑 Using API Key:', PAYMONGO_SECRET_KEY.substring(0, 10) + '...');
  console.log('🌐 Webhook URL:', WEBHOOK_URL);
  console.log('==================================================\n');
  
  switch (command) {
    case 'create':
      await createWebhook();
      break;
      
    case 'list':
      await listWebhooks();
      break;
      
    case 'retrieve':
      const webhookId = args[1];
      if (!webhookId) {
        console.error('❌ Please provide webhook ID: node paymongo_webhook_manager.js retrieve <webhook_id>');
        return;
      }
      await retrieveWebhook(webhookId);
      break;
      
    case 'delete':
      const deleteId = args[1];
      if (!deleteId) {
        console.error('❌ Please provide webhook ID: node paymongo_webhook_manager.js delete <webhook_id>');
        return;
      }
      await deleteWebhook(deleteId);
      break;
      
    default:
      console.log('📖 Usage:');
      console.log('   node paymongo_webhook_manager.js create     - Create new webhook');
      console.log('   node paymongo_webhook_manager.js list       - List all webhooks');
      console.log('   node paymongo_webhook_manager.js retrieve <id> - Retrieve specific webhook');
      console.log('   node paymongo_webhook_manager.js delete <id>   - Delete specific webhook');
      console.log('\n🎯 Quick start: node paymongo_webhook_manager.js create');
  }
}

// Run the script
main().catch(console.error);
