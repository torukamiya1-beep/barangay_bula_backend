const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function comprehensiveDatabaseAnalysis() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barangay_management_system',
      port: process.env.DB_PORT || 3306
    });

    console.log('🔍 COMPREHENSIVE DATABASE ANALYSIS FOR DOCUMENT REQUEST SYSTEM');
    console.log('=' .repeat(80));
    
    // ========== DATABASE OVERVIEW ==========
    console.log('\n📊 DATABASE OVERVIEW');
    console.log('=' .repeat(40));
    
    // List key tables with row counts (avoiding problematic views)
    const keyTableNames = [
      'document_requests', 'cedula_applications', 'barangay_clearance_applications',
      'payment_methods', 'request_status', 'client_accounts', 'admin_accounts',
      'document_types', 'purpose_categories', 'payment_transactions'
    ];

    console.log('\n📋 Key Tables with Row Counts:');
    const tableStats = [];

    for (const tableName of keyTableNames) {
      try {
        const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
        tableStats.push({
          table_name: tableName,
          row_count: countResult[0].count
        });
      } catch (error) {
        tableStats.push({
          table_name: tableName,
          row_count: 'ERROR: ' + error.message.substring(0, 50)
        });
      }
    }
    console.table(tableStats);

    // ========== KEY TABLES SCHEMA ANALYSIS ==========
    console.log('\n🏗️  KEY TABLES SCHEMA ANALYSIS');
    console.log('=' .repeat(50));
    
    const keyTables = [
      'document_requests',
      'cedula_applications', 
      'barangay_clearance_applications',
      'payment_methods',
      'request_status'
    ];
    
    for (const tableName of keyTables) {
      console.log(`\n📋 ${tableName.toUpperCase()} TABLE SCHEMA:`);
      try {
        const [schema] = await connection.execute(`DESCRIBE ${tableName}`);
        console.table(schema);
      } catch (error) {
        console.log(`❌ Table ${tableName} does not exist or cannot be accessed`);
      }
    }

    // ========== SAMPLE DATA ANALYSIS ==========
    console.log('\n📊 SAMPLE DATA ANALYSIS');
    console.log('=' .repeat(40));
    
    // Document requests sample
    console.log('\n📋 DOCUMENT REQUESTS (Latest 3):');
    const [docRequests] = await connection.execute(`
      SELECT dr.id, dr.request_number, dr.document_type_id, dr.status_id, 
             rs.status_name, pm.method_name as payment_method, dr.total_document_fee
      FROM document_requests dr
      LEFT JOIN request_status rs ON dr.status_id = rs.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      ORDER BY dr.id DESC LIMIT 3
    `);
    console.table(docRequests);
    
    // Cedula applications sample
    console.log('\n📋 CEDULA APPLICATIONS (Latest 3):');
    const [cedulaApps] = await connection.execute(`
      SELECT ca.id, ca.request_id, ca.annual_income, ca.property_assessed_value, 
             ca.personal_property_value, ca.business_gross_receipts, ca.computed_tax
      FROM cedula_applications ca
      ORDER BY ca.id DESC LIMIT 3
    `);
    console.table(cedulaApps);
    
    // Barangay clearance applications sample
    console.log('\n📋 BARANGAY CLEARANCE APPLICATIONS (Latest 3):');
    const [bcApps] = await connection.execute(`
      SELECT bca.id, bca.request_id, bca.has_pending_cases, bca.pending_cases_details,
             bca.voter_registration_number, bca.precinct_number, bca.emergency_contact_name
      FROM barangay_clearance_applications bca
      ORDER BY bca.id DESC LIMIT 3
    `);
    console.table(bcApps);

    // ========== STATUS AND PAYMENT METHOD ANALYSIS ==========
    console.log('\n🔄 STATUS AND PAYMENT METHOD ANALYSIS');
    console.log('=' .repeat(50));
    
    // All request statuses
    console.log('\n📊 ALL REQUEST STATUSES:');
    const [statuses] = await connection.execute('SELECT * FROM request_status ORDER BY id');
    console.table(statuses);
    
    // All payment methods
    console.log('\n💳 ALL PAYMENT METHODS:');
    const [paymentMethods] = await connection.execute('SELECT * FROM payment_methods ORDER BY id');
    console.table(paymentMethods);

    // ========== FOREIGN KEY RELATIONSHIPS ==========
    console.log('\n🔗 FOREIGN KEY RELATIONSHIPS');
    console.log('=' .repeat(40));
    
    const [foreignKeys] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_SCHEMA = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY TABLE_NAME, COLUMN_NAME
    `, [process.env.DB_NAME || 'barangay_management_system']);
    
    console.table(foreignKeys);

    // ========== DATA INTEGRITY CHECKS ==========
    console.log('\n✅ DATA INTEGRITY CHECKS');
    console.log('=' .repeat(40));
    
    // Check for orphaned records
    console.log('\n🔍 Checking for orphaned records...');
    
    // Cedula applications without document requests
    const [orphanedCedula] = await connection.execute(`
      SELECT COUNT(*) as count FROM cedula_applications ca
      LEFT JOIN document_requests dr ON ca.request_id = dr.id
      WHERE dr.id IS NULL
    `);
    console.log(`Orphaned cedula applications: ${orphanedCedula[0].count}`);
    
    // Barangay clearance applications without document requests
    const [orphanedBC] = await connection.execute(`
      SELECT COUNT(*) as count FROM barangay_clearance_applications bca
      LEFT JOIN document_requests dr ON bca.request_id = dr.id
      WHERE dr.id IS NULL
    `);
    console.log(`Orphaned barangay clearance applications: ${orphanedBC[0].count}`);
    
    // Document requests with invalid status IDs
    const [invalidStatus] = await connection.execute(`
      SELECT COUNT(*) as count FROM document_requests dr
      LEFT JOIN request_status rs ON dr.status_id = rs.id
      WHERE rs.id IS NULL
    `);
    console.log(`Document requests with invalid status: ${invalidStatus[0].count}`);
    
    // Document requests with invalid payment method IDs
    const [invalidPayment] = await connection.execute(`
      SELECT COUNT(*) as count FROM document_requests dr
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      WHERE pm.id IS NULL
    `);
    console.log(`Document requests with invalid payment method: ${invalidPayment[0].count}`);

    console.log('\n✅ Database analysis completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during database analysis:', error.message);
  } finally {
    if (connection) await connection.end();
  }
}

comprehensiveDatabaseAnalysis();
