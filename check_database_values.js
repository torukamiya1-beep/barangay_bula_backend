// Check Database Values for Request ID 162
const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseValues() {
  console.log('🔍 CHECKING DATABASE VALUES FOR REQUEST ID 162');
  console.log('=' .repeat(60));
  
  try {
    // Create database connection
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'rhai_db'
    });

    console.log('✅ Database connected successfully');

    // Check the specific request that's failing
    console.log('\n1️⃣ CHECKING REQUEST ID 162 (FAILING CEDULA REQUEST)');
    console.log('-'.repeat(50));
    
    const requestQuery = `
      SELECT
        dr.id,
        dr.document_type_id,
        dt.type_name,
        dr.total_document_fee,
        dr.created_at,
        dr.client_id
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      WHERE dr.id = 162
    `;
    
    const [requestResults] = await connection.execute(requestQuery);
    
    if (requestResults.length === 0) {
      console.log('❌ Request ID 162 not found in database');
    } else {
      const request = requestResults[0];
      console.log('📋 Request Details:');
      console.log(`  ID: ${request.id}`);
      console.log(`  Document Type: ${request.type_name}`);
      console.log(`  Total Document Fee: ₱${parseFloat(request.total_document_fee).toFixed(2)}`);
      console.log(`  Created: ${request.created_at}`);
      console.log(`  Client ID: ${request.client_id}`);

      // For Cedula, the correct fee should be ₱30.00 for ₱20K income
      const correctDocumentFee = 30.00; // ₱5 basic + ₱20 additional + ₱5 processing
      
      // PayMongo minimum calculation
      const paymongoMinimum = 100.00;
      const convenienceFee = Math.max(0, paymongoMinimum - correctDocumentFee);
      const finalPaymentAmount = correctDocumentFee + convenienceFee;
      
      console.log('\n📊 CORRECT CALCULATION:');
      console.log(`  Document Fee: ₱${correctDocumentFee.toFixed(2)} (₱5 basic + ₱20 additional + ₱5 processing)`);
      console.log(`  Convenience Fee: ₱${convenienceFee.toFixed(2)} (PayMongo minimum)`);
      console.log(`  Final Payment: ₱${finalPaymentAmount.toFixed(2)}`);
      
      console.log('\n🔍 COMPARISON:');
      console.log(`  Database has: ₱${parseFloat(request.total_document_fee).toFixed(2)}`);
      console.log(`  Should be: ₱${correctDocumentFee.toFixed(2)} (document fee)`);
      console.log(`  PayMongo needs: ₱${finalPaymentAmount.toFixed(2)} (with convenience fee)`);
      
      if (parseFloat(request.total_document_fee) !== correctDocumentFee) {
        console.log('❌ DATABASE VALUE IS INCORRECT!');
        console.log('   The database contains the wrong fee amount.');
      } else {
        console.log('✅ Database document fee is correct');
        console.log('   The issue is in the payment controller logic.');
      }
    }

    // Check all recent Cedula requests
    console.log('\n2️⃣ CHECKING ALL RECENT CEDULA REQUESTS');
    console.log('-'.repeat(50));
    
    const allCedulaQuery = `
      SELECT
        dr.id,
        dr.total_document_fee,
        dr.created_at
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      WHERE dt.type_name = 'Cedula'
      ORDER BY dr.created_at DESC
      LIMIT 5
    `;
    
    const [cedulaResults] = await connection.execute(allCedulaQuery);
    
    console.log('Recent Cedula Requests:');
    cedulaResults.forEach(req => {
      console.log(`  ID ${req.id}: ₱${parseFloat(req.total_document_fee).toFixed(2)} (created: ${req.created_at})`);
    });

    await connection.end();
    console.log('\n✅ Database connection closed');
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
  }
}

// Run the check
checkDatabaseValues().catch(console.error);
