const axios = require('axios');
require('dotenv').config();

// PayMongo API configuration
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const BASE_URL = 'https://api.paymongo.com/v1';

// Helper function to create authorization header
function getAuthHeader() {
  return {
    'Authorization': `Basic ${Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64')}`,
    'Content-Type': 'application/json'
  };
}

// Function to fetch payments from PayMongo
async function fetchPayments(limit = 10) {
  try {
    console.log('🔍 Fetching payments from PayMongo...');
    console.log('📡 API URL:', `${BASE_URL}/payments?limit=${limit}`);
    
    const response = await axios.get(`${BASE_URL}/payments?limit=${limit}`, {
      headers: getAuthHeader()
    });

    console.log('\n✅ PayMongo Payments Response:');
    console.log('📊 Status:', response.status);
    console.log('📈 Total payments found:', response.data.data.length);
    console.log('🔄 Has more:', response.data.has_more);
    
    console.log('\n📋 PAYMENTS ARRAY DATA:');
    console.log('='.repeat(80));
    
    if (response.data.data.length === 0) {
      console.log('❌ No payments found');
      return [];
    }

    // Display each payment in detail
    response.data.data.forEach((payment, index) => {
      console.log(`\n💳 Payment #${index + 1}:`);
      console.log('─'.repeat(40));
      console.log('🆔 ID:', payment.id);
      console.log('💰 Amount:', payment.attributes.amount, '(centavos) =', (payment.attributes.amount / 100).toFixed(2), 'PHP');
      console.log('📝 Description:', payment.attributes.description || 'N/A');
      console.log('🔄 Status:', payment.attributes.status);
      console.log('💳 Payment Method:', payment.attributes.source?.type || 'N/A');
      console.log('📅 Created:', new Date(payment.attributes.created_at * 1000).toLocaleString());
      console.log('💸 Paid At:', payment.attributes.paid_at ? new Date(payment.attributes.paid_at * 1000).toLocaleString() : 'Not paid');
      console.log('🏦 Currency:', payment.attributes.currency);
      console.log('📊 Fee:', payment.attributes.fee || 'N/A');
      console.log('💵 Net Amount:', payment.attributes.net_amount || 'N/A');
      
      // Show metadata if available
      if (payment.attributes.metadata && Object.keys(payment.attributes.metadata).length > 0) {
        console.log('📋 Metadata:', JSON.stringify(payment.attributes.metadata, null, 2));
      }
    });

    console.log('\n🔍 RAW JSON RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(response.data, null, 2));

    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching payments:', error.response?.data || error.message);
    return [];
  }
}

// Function to fetch payment links from PayMongo
async function fetchPaymentLinks(limit = 10) {
  try {
    console.log('\n🔗 Fetching payment links from PayMongo...');
    console.log('📡 API URL:', `${BASE_URL}/links?limit=${limit}`);
    
    const response = await axios.get(`${BASE_URL}/links?limit=${limit}`, {
      headers: getAuthHeader()
    });

    console.log('\n✅ PayMongo Payment Links Response:');
    console.log('📊 Status:', response.status);
    console.log('📈 Total links found:', response.data.data.length);
    console.log('🔄 Has more:', response.data.has_more);
    
    console.log('\n🔗 PAYMENT LINKS ARRAY DATA:');
    console.log('='.repeat(80));
    
    if (response.data.data.length === 0) {
      console.log('❌ No payment links found');
      return [];
    }

    // Display each payment link in detail
    response.data.data.forEach((link, index) => {
      console.log(`\n🔗 Payment Link #${index + 1}:`);
      console.log('─'.repeat(40));
      console.log('🆔 ID:', link.id);
      console.log('💰 Amount:', link.attributes.amount, '(centavos) =', (link.attributes.amount / 100).toFixed(2), 'PHP');
      console.log('📝 Description:', link.attributes.description || 'N/A');
      console.log('🔄 Status:', link.attributes.status);
      console.log('🌐 Checkout URL:', link.attributes.checkout_url);
      console.log('📅 Created:', new Date(link.attributes.created_at * 1000).toLocaleString());
      console.log('⏰ Expires At:', link.attributes.expired_at ? new Date(link.attributes.expired_at * 1000).toLocaleString() : 'No expiration');
      console.log('🏦 Currency:', link.attributes.currency);
      
      // Show payments if any
      if (link.attributes.payments && link.attributes.payments.length > 0) {
        console.log('💳 Associated Payments:', link.attributes.payments.length);
        link.attributes.payments.forEach((payment, pIndex) => {
          console.log(`  💳 Payment ${pIndex + 1}:`, payment.id, '-', payment.attributes.status);
        });
      }
      
      // Show metadata if available
      if (link.attributes.metadata && Object.keys(link.attributes.metadata).length > 0) {
        console.log('📋 Metadata:', JSON.stringify(link.attributes.metadata, null, 2));
      }
    });

    console.log('\n🔍 RAW JSON RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(response.data, null, 2));

    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching payment links:', error.response?.data || error.message);
    return [];
  }
}

// Function to fetch webhooks from PayMongo
async function fetchWebhooks() {
  try {
    console.log('\n🔔 Fetching webhooks from PayMongo...');
    console.log('📡 API URL:', `${BASE_URL}/webhooks`);
    
    const response = await axios.get(`${BASE_URL}/webhooks`, {
      headers: getAuthHeader()
    });

    console.log('\n✅ PayMongo Webhooks Response:');
    console.log('📊 Status:', response.status);
    console.log('📈 Total webhooks found:', response.data.data.length);
    
    console.log('\n🔔 WEBHOOKS ARRAY DATA:');
    console.log('='.repeat(80));
    
    if (response.data.data.length === 0) {
      console.log('❌ No webhooks found');
      return [];
    }

    // Display each webhook in detail
    response.data.data.forEach((webhook, index) => {
      console.log(`\n🔔 Webhook #${index + 1}:`);
      console.log('─'.repeat(40));
      console.log('🆔 ID:', webhook.id);
      console.log('🌐 URL:', webhook.attributes.url);
      console.log('🔄 Status:', webhook.attributes.status);
      console.log('📅 Created:', new Date(webhook.attributes.created_at * 1000).toLocaleString());
      console.log('📅 Updated:', new Date(webhook.attributes.updated_at * 1000).toLocaleString());
      console.log('🎯 Events:', webhook.attributes.events.join(', '));
    });

    console.log('\n🔍 RAW JSON RESPONSE:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(response.data, null, 2));

    return response.data.data;
  } catch (error) {
    console.error('❌ Error fetching webhooks:', error.response?.data || error.message);
    return [];
  }
}

// Main function to run all fetches
async function main() {
  console.log('🚀 PayMongo Data Fetcher');
  console.log('='.repeat(80));
  console.log('🔑 Using API Key:', PAYMONGO_SECRET_KEY ? `${PAYMONGO_SECRET_KEY.substring(0, 10)}...` : 'NOT SET');
  console.log('📡 Base URL:', BASE_URL);
  console.log('='.repeat(80));

  try {
    // Fetch payments
    const payments = await fetchPayments(5);
    
    // Fetch payment links
    const paymentLinks = await fetchPaymentLinks(5);
    
    // Fetch webhooks
    const webhooks = await fetchWebhooks();

    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(80));
    console.log('💳 Total Payments:', payments.length);
    console.log('🔗 Total Payment Links:', paymentLinks.length);
    console.log('🔔 Total Webhooks:', webhooks.length);
    
  } catch (error) {
    console.error('❌ Main execution error:', error.message);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  fetchPayments,
  fetchPaymentLinks,
  fetchWebhooks
};
