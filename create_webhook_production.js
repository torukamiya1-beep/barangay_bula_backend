/**
 * Create PayMongo Webhook for Production
 * 
 * This script creates a webhook for your Railway production backend
 */

const axios = require('axios');

// Configuration
const PAYMONGO_SECRET_KEY = 'sk_test_wi8qaYjt74YtvpUEeFKpZsg1';
const WEBHOOK_URL = 'https://brgybulabackend-production.up.railway.app/api/webhooks/paymongo';
const BASE_URL = 'https://api.paymongo.com/v1';

// Events to listen to
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
    console.log('📋 Webhook Details:');
    console.log(`  ID: ${webhook.id}`);
    console.log(`  URL: ${webhook.attributes.url}`);
    console.log(`  Status: ${webhook.attributes.status}`);
    console.log(`  Events: ${webhook.attributes.events.join(', ')}`);
    console.log('');
    console.log('🔑 IMPORTANT - Webhook Secret:');
    console.log('─'.repeat(80));
    console.log(webhook.attributes.secret_key);
    console.log('─'.repeat(80));
    console.log('');
    console.log('📝 Next Steps:');
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

    return webhook;
  } catch (error) {
    console.error('❌ Error creating webhook:');
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
      
      // Check if webhook already exists
      if (error.response.data.errors) {
        const urlError = error.response.data.errors.find(e => 
          e.detail && e.detail.includes('already been taken')
        );
        
        if (urlError) {
          console.log('');
          console.log('ℹ️  A webhook for this URL already exists.');
          console.log('');
          console.log('Options:');
          console.log('1. List existing webhooks: node create_webhook_production.js list');
          console.log('2. Delete existing webhook: node create_webhook_production.js delete <webhook_id>');
          console.log('3. Use the existing webhook secret from PayMongo dashboard');
          console.log('');
        }
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
      return;
    }

    console.log(`Found ${webhooks.length} webhook(s):\n`);

    webhooks.forEach((webhook, index) => {
      console.log(`${index + 1}. Webhook ID: ${webhook.id}`);
      console.log(`   URL: ${webhook.attributes.url}`);
      console.log(`   Status: ${webhook.attributes.status}`);
      console.log(`   Events: ${webhook.attributes.events.join(', ')}`);
      console.log(`   Created: ${new Date(webhook.attributes.created_at * 1000).toLocaleString()}`);
      console.log('');
    });

    console.log('To delete a webhook: node create_webhook_production.js delete <webhook_id>');
    console.log('');
  } catch (error) {
    console.error('❌ Error listing webhooks:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Delete a webhook
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
    console.log('You can now create a new webhook:');
    console.log('node create_webhook_production.js create');
    console.log('');
  } catch (error) {
    console.error('❌ Error deleting webhook:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

/**
 * Main function
 */
async function main() {
  const command = process.argv[2] || 'create';
  const arg = process.argv[3];

  console.log('═'.repeat(80));
  console.log('  PayMongo Webhook Manager - Production');
  console.log('═'.repeat(80));

  switch (command.toLowerCase()) {
    case 'create':
      await createWebhook();
      break;
    
    case 'list':
      await listWebhooks();
      break;
    
    case 'delete':
      if (!arg) {
        console.error('\n❌ Error: Webhook ID required');
        console.log('Usage: node create_webhook_production.js delete <webhook_id>');
        console.log('');
        process.exit(1);
      }
      await deleteWebhook(arg);
      break;
    
    default:
      console.log('\nUsage:');
      console.log('  node create_webhook_production.js create  - Create new webhook');
      console.log('  node create_webhook_production.js list    - List all webhooks');
      console.log('  node create_webhook_production.js delete <id> - Delete webhook');
      console.log('');
      break;
  }
}

// Run
main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

