const axios = require('axios');
require('dotenv').config();

// PayMongo API configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const BASE_URL = 'https://api.paymongo.com/v1';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-domain.com/api/webhooks/paymongo';

function getAuthHeader() {
  return {
    'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  };
}

// Function to create PayMongo webhook
async function createPayMongoWebhook() {
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
            'link.payment.paid',      // When payment link is paid
            'payment.refunded'        // When payment is refunded
          ]
        }
      }
    };

    const response = await axios.post(`${BASE_URL}/webhooks`, webhookData, {
      headers: getAuthHeader()
    });

    console.log('✅ PayMongo webhook created successfully!');
    console.log('🆔 Webhook ID:', response.data.data.id);
    console.log('🎯 Events:', response.data.data.attributes.events);
    console.log('🌐 URL:', response.data.data.attributes.url);
    console.log('📅 Created:', new Date(response.data.data.attributes.created_at * 1000).toLocaleString());

    return response.data.data;

  } catch (error) {
    console.error('❌ Failed to create PayMongo webhook:', error.response?.data || error.message);
    throw error;
  }
}

// Function to list existing webhooks
async function listPayMongoWebhooks() {
  try {
    console.log('📋 Listing existing PayMongo webhooks...');
    
    const response = await axios.get(`${BASE_URL}/webhooks`, {
      headers: getAuthHeader()
    });

    const webhooks = response.data.data;
    console.log(`📊 Found ${webhooks.length} existing webhooks:`);

    if (webhooks.length === 0) {
      console.log('   ❌ No webhooks found');
      return [];
    }

    webhooks.forEach((webhook, index) => {
      console.log(`\n🔗 Webhook #${index + 1}:`);
      console.log(`   🆔 ID: ${webhook.id}`);
      console.log(`   🌐 URL: ${webhook.attributes.url}`);
      console.log(`   🔄 Status: ${webhook.attributes.status}`);
      console.log(`   🎯 Events: ${webhook.attributes.events.join(', ')}`);
      console.log(`   📅 Created: ${new Date(webhook.attributes.created_at * 1000).toLocaleString()}`);
    });

    return webhooks;

  } catch (error) {
    console.error('❌ Failed to list PayMongo webhooks:', error.response?.data || error.message);
    throw error;
  }
}

// Function to delete a webhook
async function deletePayMongoWebhook(webhookId) {
  try {
    console.log(`🗑️ Deleting PayMongo webhook: ${webhookId}`);
    
    await axios.delete(`${BASE_URL}/webhooks/${webhookId}`, {
      headers: getAuthHeader()
    });

    console.log('✅ Webhook deleted successfully!');

  } catch (error) {
    console.error('❌ Failed to delete PayMongo webhook:', error.response?.data || error.message);
    throw error;
  }
}

// Function to update webhook URL
async function updatePayMongoWebhook(webhookId, newUrl) {
  try {
    console.log(`🔄 Updating PayMongo webhook: ${webhookId}`);
    console.log(`🌐 New URL: ${newUrl}`);
    
    const updateData = {
      data: {
        attributes: {
          url: newUrl
        }
      }
    };

    const response = await axios.patch(`${BASE_URL}/webhooks/${webhookId}`, updateData, {
      headers: getAuthHeader()
    });

    console.log('✅ Webhook updated successfully!');
    console.log('🌐 Updated URL:', response.data.data.attributes.url);

    return response.data.data;

  } catch (error) {
    console.error('❌ Failed to update PayMongo webhook:', error.response?.data || error.message);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🚀 PayMongo Webhook Setup Tool');
  console.log('='.repeat(50));
  console.log('🔑 Using API Key:', PAYMONGO_SECRET_KEY ? `${PAYMONGO_SECRET_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('🌐 Webhook URL:', WEBHOOK_URL);
  console.log('='.repeat(50));

  try {
    // List existing webhooks
    const existingWebhooks = await listPayMongoWebhooks();
    
    // Check if webhook already exists for our URL
    const existingWebhook = existingWebhooks.find(webhook => 
      webhook.attributes.url === WEBHOOK_URL
    );

    if (existingWebhook) {
      console.log('\n⚠️ Webhook already exists for this URL!');
      console.log('🆔 Existing webhook ID:', existingWebhook.id);
      console.log('🎯 Events:', existingWebhook.attributes.events.join(', '));
      
      // Ask if user wants to recreate
      console.log('\n🔄 To recreate the webhook, delete the existing one first.');
      console.log(`   Command: node setup_paymongo_webhooks.js delete ${existingWebhook.id}`);
    } else {
      // Create new webhook
      console.log('\n🔗 Creating new webhook...');
      const newWebhook = await createPayMongoWebhook();
      
      console.log('\n🎉 Setup completed successfully!');
      console.log('📝 Next steps:');
      console.log('   1. Implement the webhook endpoint at:', WEBHOOK_URL);
      console.log('   2. Test the webhook with a payment');
      console.log('   3. Monitor webhook delivery logs');
    }

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const command = args[0];
const webhookId = args[1];

if (command === 'list') {
  listPayMongoWebhooks().catch(console.error);
} else if (command === 'delete' && webhookId) {
  deletePayMongoWebhook(webhookId).catch(console.error);
} else if (command === 'update' && webhookId && args[2]) {
  updatePayMongoWebhook(webhookId, args[2]).catch(console.error);
} else if (require.main === module) {
  main();
}

module.exports = {
  createPayMongoWebhook,
  listPayMongoWebhooks,
  deletePayMongoWebhook,
  updatePayMongoWebhook
};
