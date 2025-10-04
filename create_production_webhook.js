/**
 * Create PayMongo Webhook for Production
 * 
 * This script creates a webhook for your Railway production backend
 * Run this AFTER deploying to Railway
 */

const axios = require('axios');

// PayMongo Configuration
const PAYMONGO_SECRET_KEY = 'sk_test_wi8qaYjt74YtvpUEeFKpZsg1'; // Your test key
const WEBHOOK_URL = 'https://brgybulabackend-production.up.railway.app/api/webhooks/paymongo';
const BASE_URL = 'https://api.paymongo.com/v1';

// Events to listen for
const EVENTS = [
  'payment.paid',
  'payment.failed',
  'source.chargeable'
];

/**
 * Create webhook
 */
async function createWebhook() {
  console.log('\n🔧 Creating PayMongo Webhook...\n');
  console.log('Configuration:');
  console.log(`  Webhook URL: ${WEBHOOK_URL}`);
  console.log(`  Events: ${EVENTS.join(', ')}`);
  console.log('');

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks`,
      {
        data: {
          attributes: {
            url: WEBHOOK_URL,
            events: EVENTS
          }
        }
      },
      {
        auth: {
          username: PAYMONGO_SECRET_KEY,
          password: ''
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const webhook = response.data.data;
    
    console.log('✅ Webhook created successfully!\n');
    console.log('Webhook Details:');
    console.log(`  ID: ${webhook.id}`);
    console.log(`  URL: ${webhook.attributes.url}`);
    console.log(`  Status: ${webhook.attributes.status}`);
    console.log(`  Events: ${webhook.attributes.events.join(', ')}`);
    console.log('');
    console.log('🔑 WEBHOOK SECRET (IMPORTANT!):');
    console.log('');
    console.log(`  ${webhook.attributes.secret_key}`);
    console.log('');
    console.log('📝 NEXT STEPS:');
    console.log('');
    console.log('1. Copy the webhook secret above (starts with "whsk_")');
    console.log('2. Go to Railway Dashboard');
    console.log('3. Click on your backend service');
    console.log('4. Click "Variables" tab');
    console.log('5. Find PAYMONGO_WEBHOOK_SECRET');
    console.log('6. Replace "whsk_will_update_after_webhook_creation" with the secret above');
    console.log('7. Click "Save"');
    console.log('');
    console.log('✅ Done! Your webhook is now active.');
    console.log('');

    return webhook.attributes.secret_key;

  } catch (error) {
    console.error('❌ Error creating webhook:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.status === 400) {
        console.error('\n💡 Possible reasons:');
        console.error('  - Webhook URL already exists');
        console.error('  - Invalid webhook URL format');
        console.error('  - Backend not accessible from PayMongo');
        console.error('\n🔍 Try listing existing webhooks first:');
        console.error('  node create_production_webhook.js list');
      }
    } else {
      console.error(error.message);
    }
    
    process.exit(1);
  }
}

/**
 * List all webhooks
 */
async function listWebhooks() {
  console.log('\n📋 Listing all webhooks...\n');

  try {
    const response = await axios.get(
      `${BASE_URL}/webhooks`,
      {
        auth: {
          username: PAYMONGO_SECRET_KEY,
          password: ''
        }
      }
    );

    const webhooks = response.data.data;

    if (webhooks.length === 0) {
      console.log('No webhooks found.');
      console.log('\n💡 Run without arguments to create a webhook:');
      console.log('  node create_production_webhook.js');
      return;
    }

    console.log(`Found ${webhooks.length} webhook(s):\n`);

    webhooks.forEach((webhook, index) => {
      console.log(`${index + 1}. Webhook ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.attributes.url}`);
      console.log(`   Status: ${webhook.attributes.status}`);
      console.log(`   Events: ${webhook.attributes.events.join(', ')}`);
      console.log(`   Secret: ${webhook.attributes.secret_key}`);
      console.log('');
    });

    console.log('💡 To delete a webhook:');
    console.log('  node create_production_webhook.js delete <webhook_id>');
    console.log('');

  } catch (error) {
    console.error('❌ Error listing webhooks:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

/**
 * Delete webhook
 */
async function deleteWebhook(webhookId) {
  console.log(`\n🗑️  Deleting webhook: ${webhookId}...\n`);

  try {
    await axios.delete(
      `${BASE_URL}/webhooks/${webhookId}`,
      {
        auth: {
          username: PAYMONGO_SECRET_KEY,
          password: ''
        }
      }
    );

    console.log('✅ Webhook deleted successfully!');
    console.log('');

  } catch (error) {
    console.error('❌ Error deleting webhook:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

/**
 * Enable webhook
 */
async function enableWebhook(webhookId) {
  console.log(`\n✅ Enabling webhook: ${webhookId}...\n`);

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/${webhookId}/enable`,
      {},
      {
        auth: {
          username: PAYMONGO_SECRET_KEY,
          password: ''
        }
      }
    );

    console.log('✅ Webhook enabled successfully!');
    console.log(`Status: ${response.data.data.attributes.status}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error enabling webhook:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

/**
 * Disable webhook
 */
async function disableWebhook(webhookId) {
  console.log(`\n⏸️  Disabling webhook: ${webhookId}...\n`);

  try {
    const response = await axios.post(
      `${BASE_URL}/webhooks/${webhookId}/disable`,
      {},
      {
        auth: {
          username: PAYMONGO_SECRET_KEY,
          password: ''
        }
      }
    );

    console.log('✅ Webhook disabled successfully!');
    console.log(`Status: ${response.data.data.attributes.status}`);
    console.log('');

  } catch (error) {
    console.error('❌ Error disabling webhook:');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

// Main execution
const command = process.argv[2];
const arg = process.argv[3];

console.log('');
console.log('═══════════════════════════════════════════════════════');
console.log('  PayMongo Webhook Manager - Production');
console.log('═══════════════════════════════════════════════════════');

if (command === 'list') {
  listWebhooks();
} else if (command === 'delete' && arg) {
  deleteWebhook(arg);
} else if (command === 'enable' && arg) {
  enableWebhook(arg);
} else if (command === 'disable' && arg) {
  disableWebhook(arg);
} else if (!command) {
  createWebhook();
} else {
  console.log('\n📖 Usage:\n');
  console.log('  Create webhook:');
  console.log('    node create_production_webhook.js\n');
  console.log('  List webhooks:');
  console.log('    node create_production_webhook.js list\n');
  console.log('  Delete webhook:');
  console.log('    node create_production_webhook.js delete <webhook_id>\n');
  console.log('  Enable webhook:');
  console.log('    node create_production_webhook.js enable <webhook_id>\n');
  console.log('  Disable webhook:');
  console.log('    node create_production_webhook.js disable <webhook_id>\n');
  console.log('');
}

