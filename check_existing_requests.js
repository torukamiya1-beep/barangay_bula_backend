const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkExistingRequests() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barangay_management_system',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 CHECKING EXISTING CEDULA REQUESTS FOR BUG');
    console.log('=' .repeat(50));

    // Check for requests with the buggy amount (₱2,640)
    console.log('\n❌ REQUESTS WITH BUGGY AMOUNT (₱2,640):');
    const [buggyRequests] = await connection.execute(`
      SELECT 
        dr.id,
        dr.request_number,
        dr.total_document_fee,
        dr.created_at,
        ca.annual_income,
        ca.property_assessed_value,
        ca.personal_property_value,
        ca.business_gross_receipts,
        ca.computed_tax
      FROM document_requests dr
      JOIN cedula_applications ca ON dr.id = ca.request_id
      WHERE dr.document_type_id = 1 
        AND ABS(dr.total_document_fee - 2640.00) < 0.01
      ORDER BY dr.created_at DESC
      LIMIT 5
    `);

    if (buggyRequests.length > 0) {
      console.log(`Found ${buggyRequests.length} requests with buggy amount:`);
      console.table(buggyRequests.map(req => ({
        ID: req.id,
        Request_Number: req.request_number,
        Total_Fee: `₱${parseFloat(req.total_document_fee).toFixed(2)}`,
        Annual_Income: `₱${parseFloat(req.annual_income || 0).toLocaleString()}`,
        Property_Value: `₱${parseFloat(req.property_assessed_value || 0).toLocaleString()}`,
        Personal_Property: `₱${parseFloat(req.personal_property_value || 0).toLocaleString()}`,
        Business_Receipts: `₱${parseFloat(req.business_gross_receipts || 0).toLocaleString()}`,
        Created_At: req.created_at
      })));
      
      // Check if any of these match the user's test case
      const userTestCase = buggyRequests.find(req => 
        parseFloat(req.annual_income) === 30000 &&
        parseFloat(req.property_assessed_value) === 1000000 &&
        parseFloat(req.personal_property_value) === 1500000 &&
        parseFloat(req.business_gross_receipts) === 100000
      );
      
      if (userTestCase) {
        console.log('\n🎯 FOUND USER\'S TEST CASE WITH BUG:');
        console.log(`Request ID: ${userTestCase.id}`);
        console.log(`Request Number: ${userTestCase.request_number}`);
        console.log(`Stored Fee: ₱${parseFloat(userTestCase.total_document_fee).toFixed(2)}`);
        console.log(`Created: ${userTestCase.created_at}`);
        console.log('\n💡 This is likely an old request created before the fix.');
        console.log('   Try submitting a new request to see the fix in action.');
      }
    } else {
      console.log('✅ No requests found with buggy amount (₱2,640)');
    }

    // Check for requests with the correct amount (₱6,040)
    console.log('\n✅ REQUESTS WITH CORRECT AMOUNT (₱6,040):');
    const [correctRequests] = await connection.execute(`
      SELECT 
        dr.id,
        dr.request_number,
        dr.total_document_fee,
        dr.created_at,
        ca.annual_income,
        ca.property_assessed_value,
        ca.personal_property_value,
        ca.business_gross_receipts
      FROM document_requests dr
      JOIN cedula_applications ca ON dr.id = ca.request_id
      WHERE dr.document_type_id = 1 
        AND ABS(dr.total_document_fee - 6040.00) < 0.01
      ORDER BY dr.created_at DESC
      LIMIT 5
    `);

    if (correctRequests.length > 0) {
      console.log(`Found ${correctRequests.length} requests with correct amount:`);
      console.table(correctRequests.map(req => ({
        ID: req.id,
        Request_Number: req.request_number,
        Total_Fee: `₱${parseFloat(req.total_document_fee).toFixed(2)}`,
        Annual_Income: `₱${parseFloat(req.annual_income || 0).toLocaleString()}`,
        Property_Value: `₱${parseFloat(req.property_assessed_value || 0).toLocaleString()}`,
        Personal_Property: `₱${parseFloat(req.personal_property_value || 0).toLocaleString()}`,
        Business_Receipts: `₱${parseFloat(req.business_gross_receipts || 0).toLocaleString()}`,
        Created_At: req.created_at
      })));
    } else {
      console.log('❌ No requests found with correct amount (₱6,040)');
    }

    // Check all recent cedula requests
    console.log('\n📊 ALL RECENT CEDULA REQUESTS:');
    const [allRequests] = await connection.execute(`
      SELECT 
        dr.id,
        dr.request_number,
        dr.total_document_fee,
        dr.created_at,
        ca.annual_income,
        ca.property_assessed_value,
        ca.personal_property_value,
        ca.business_gross_receipts
      FROM document_requests dr
      JOIN cedula_applications ca ON dr.id = ca.request_id
      WHERE dr.document_type_id = 1
      ORDER BY dr.created_at DESC
      LIMIT 10
    `);

    if (allRequests.length > 0) {
      console.log(`Found ${allRequests.length} recent cedula requests:`);
      console.table(allRequests.map(req => ({
        ID: req.id,
        Request_Number: req.request_number,
        Total_Fee: `₱${parseFloat(req.total_document_fee).toFixed(2)}`,
        Has_Property_Values: (
          parseFloat(req.property_assessed_value || 0) > 0 ||
          parseFloat(req.personal_property_value || 0) > 0 ||
          parseFloat(req.business_gross_receipts || 0) > 0
        ) ? '✅ YES' : '❌ NO',
        Created_At: req.created_at.toISOString().split('T')[0]
      })));
    }

    // Summary
    console.log('\n🎯 SUMMARY:');
    console.log('=' .repeat(20));
    console.log(`Requests with buggy amount (₱2,640): ${buggyRequests.length}`);
    console.log(`Requests with correct amount (₱6,040): ${correctRequests.length}`);
    console.log(`Total recent cedula requests: ${allRequests.length}`);

    if (buggyRequests.length > 0 && correctRequests.length === 0) {
      console.log('\n⚠️  RECOMMENDATION:');
      console.log('All existing requests have the buggy amount.');
      console.log('This suggests you may be looking at old requests created before the fix.');
      console.log('Please try submitting a NEW cedula request to verify the fix.');
    } else if (correctRequests.length > 0) {
      console.log('\n✅ GOOD NEWS:');
      console.log('Recent requests show the correct amount, indicating the fix is working.');
    }

  } catch (error) {
    console.error('❌ Error checking existing requests:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

checkExistingRequests();
