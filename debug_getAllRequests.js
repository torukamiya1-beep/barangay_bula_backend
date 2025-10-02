const mysql = require('mysql2/promise');

// New Railway MySQL Database Credentials
const dbConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function debugGetAllRequests() {
  let connection;
  
  try {
    console.log('🔍 Debugging getAllRequests query...');
    console.log('');

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Railway database');

    // Test the exact query from adminDocumentService.js getAllRequests method
    console.log('\n📋 Testing the main getAllRequests query...');
    
    const query = `
      SELECT
        dr.id,
        dr.request_number,
        dr.client_id,
        dr.is_third_party_request,
        CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
        cp.email as client_email,
        cp.phone_number as client_phone,
        cp.birth_date as client_birth_date,
        cp.gender as client_gender,
        cp.civil_status_id as client_civil_status_id,
        cs.status_name as client_civil_status,
        cp.nationality as client_nationality,
        cp.years_of_residency as client_years_of_residency,
        cp.months_of_residency as client_months_of_residency,
        dt.type_name as document_type,
        pc.category_name as purpose_category,
        dr.purpose_details,
        rs.status_name,
        rs.description as status_description,
        dr.priority,
        dr.total_document_fee,
        dr.total_document_fee as total_fee,
        dr.payment_status,
        pm.method_name as payment_method,
        dr.delivery_method,
        dr.created_at as requested_at,
        dr.processed_at,
        dr.approved_at,
        CONCAT(processed_aep.first_name, ' ', processed_aep.last_name) as processed_by_name,
        CONCAT(approved_aep.first_name, ' ', approved_aep.last_name) as approved_by_name,
        -- Beneficiary information
        CASE
          WHEN db.id IS NOT NULL THEN
            CONCAT(db.first_name, ' ',
                   COALESCE(CONCAT(db.middle_name, ' '), ''),
                   db.last_name,
                   COALESCE(CONCAT(' ', db.suffix), ''))
          ELSE NULL
        END as beneficiary_name,
        db.relationship_to_requestor as beneficiary_relationship,
        db.birth_date as beneficiary_birth_date,
        db.gender as beneficiary_gender,
        db.civil_status_id as beneficiary_civil_status_id,
        db.nationality as beneficiary_nationality,
        db.verification_image_path as beneficiary_verification_image,
        -- Authorized pickup information
        CASE
          WHEN app.id IS NOT NULL THEN
            CONCAT(app.first_name, ' ',
                   COALESCE(CONCAT(app.middle_name, ' '), ''),
                   app.last_name,
                   COALESCE(CONCAT(' ', app.suffix), ''))
          ELSE NULL
        END as pickup_person_name,
        app.relationship_to_beneficiary as pickup_relationship,
        app.is_verified as pickup_verified,
        app.id_image_path as pickup_id_image,
        app.authorization_letter_path as pickup_authorization_letter
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
      JOIN request_status rs ON dr.status_id = rs.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      LEFT JOIN client_accounts ca ON dr.client_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      LEFT JOIN civil_status cs ON cp.civil_status_id = cs.id
      LEFT JOIN admin_employee_accounts processed_aea ON dr.processed_by = processed_aea.id
      LEFT JOIN admin_employee_profiles processed_aep ON processed_aea.id = processed_aep.account_id
      LEFT JOIN admin_employee_accounts approved_aea ON dr.approved_by = approved_aea.id
      LEFT JOIN admin_employee_profiles approved_aep ON approved_aea.id = approved_aep.account_id
      LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
      LEFT JOIN authorized_pickup_persons app ON dr.id = app.request_id
      ORDER BY dr.created_at DESC
      LIMIT 20 OFFSET 0
    `;

    try {
      const [results] = await connection.execute(query);
      console.log(`✅ Main query executed successfully! Found ${results.length} records`);
      
      if (results.length > 0) {
        console.log('\n📄 Sample record:');
        const sample = results[0];
        console.log(`  Request ID: ${sample.id}`);
        console.log(`  Request Number: ${sample.request_number}`);
        console.log(`  Client Name: ${sample.client_name}`);
        console.log(`  Document Type: ${sample.document_type}`);
        console.log(`  Status: ${sample.status_name}`);
      }
    } catch (error) {
      console.log('❌ Main query failed:', error.message);
      console.log('');
      
      // Let's test each table individually to find the issue
      console.log('🔍 Testing individual tables...');
      
      const tables = [
        'document_requests',
        'document_types', 
        'purpose_categories',
        'request_status',
        'payment_methods',
        'client_accounts',
        'client_profiles',
        'civil_status',
        'admin_employee_accounts',
        'admin_employee_profiles',
        'document_beneficiaries',
        'authorized_pickup_persons'
      ];
      
      for (const table of tables) {
        try {
          const [result] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`);
          console.log(`✅ ${table}: ${result[0].count} records`);
        } catch (tableError) {
          console.log(`❌ ${table}: ${tableError.message}`);
        }
      }
      
      // Test the JOINs step by step
      console.log('\n🔍 Testing JOINs step by step...');
      
      try {
        const [result1] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
        `);
        console.log(`✅ document_requests + document_types: ${result1[0].count} records`);
      } catch (e) {
        console.log(`❌ document_requests + document_types: ${e.message}`);
      }
      
      try {
        const [result2] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
        `);
        console.log(`✅ + purpose_categories: ${result2[0].count} records`);
      } catch (e) {
        console.log(`❌ + purpose_categories: ${e.message}`);
      }
      
      try {
        const [result3] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
          JOIN request_status rs ON dr.status_id = rs.id
        `);
        console.log(`✅ + request_status: ${result3[0].count} records`);
      } catch (e) {
        console.log(`❌ + request_status: ${e.message}`);
      }
      
      try {
        const [result4] = await connection.execute(`
          SELECT COUNT(*) as count 
          FROM document_requests dr
          JOIN document_types dt ON dr.document_type_id = dt.id
          JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
          JOIN request_status rs ON dr.status_id = rs.id
          LEFT JOIN client_accounts ca ON dr.client_id = ca.id
          LEFT JOIN client_profiles cp ON ca.id = cp.account_id
        `);
        console.log(`✅ + client tables: ${result4[0].count} records`);
      } catch (e) {
        console.log(`❌ + client tables: ${e.message}`);
      }
    }

    // Test the count query too
    console.log('\n🔍 Testing count query...');
    const countQuery = `
      SELECT COUNT(DISTINCT dr.id) as total
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN purpose_categories pc ON dr.purpose_category_id = pc.id
      JOIN request_status rs ON dr.status_id = rs.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      LEFT JOIN client_accounts ca ON dr.client_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      LEFT JOIN civil_status cs ON cp.civil_status_id = cs.id
      LEFT JOIN document_beneficiaries db ON dr.id = db.request_id
      LEFT JOIN authorized_pickup_persons app ON dr.id = app.request_id
    `;
    
    try {
      const [countResult] = await connection.execute(countQuery);
      console.log(`✅ Count query executed successfully! Total: ${countResult[0].total}`);
    } catch (error) {
      console.log('❌ Count query failed:', error.message);
    }

    console.log('\n🎉 Debugging completed!');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the debug
if (require.main === module) {
  debugGetAllRequests()
    .then(() => {
      console.log('🎊 Debug completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Debug failed:', error.message);
      process.exit(1);
    });
}

module.exports = { debugGetAllRequests };
