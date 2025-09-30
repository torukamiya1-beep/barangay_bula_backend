const mysql = require('mysql2/promise');
require('dotenv').config({ path: './.env' });

async function checkDatabaseStructure() {
  let connection;

  try {
    console.log('🔄 Connecting to database...');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'barangay_management_system',
      port: process.env.DB_PORT || 3306
    });

    console.log('✅ Connected to database');

    // ========== TASK 1: CEDULA FEE CALCULATION ANALYSIS ==========
    console.log('\n🏷️  TASK 1: CEDULA FEE CALCULATION ANALYSIS');
    console.log('=' .repeat(60));

    // Check current document_requests table structure
    console.log('\n📋 Current document_requests table structure:');
    const [columns] = await connection.execute('DESCRIBE document_requests');

    console.table(columns.map(col => ({
      Field: col.Field,
      Type: col.Type,
      Null: col.Null,
      Key: col.Key,
      Default: col.Default
    })));

    // Check if total_document_fee column already exists
    const feeColumnExists = columns.some(col => col.Field === 'total_document_fee');
    console.log(`\n💰 total_document_fee column exists: ${feeColumnExists ? '✅ YES' : '❌ NO'}`);

    // Check cedula_applications table structure
    console.log('\n📋 Cedula Applications table structure:');
    try {
      const [cedulaColumns] = await connection.execute('DESCRIBE cedula_applications');
      console.table(cedulaColumns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      })));

      // Check for missing property value fields
      const propertyValueExists = cedulaColumns.some(col => col.Field === 'property_value');
      const personalPropertyExists = cedulaColumns.some(col => col.Field === 'personal_property_value');
      const businessReceiptsExists = cedulaColumns.some(col => col.Field === 'business_gross_receipts');

      console.log(`\n🏠 property_value column exists: ${propertyValueExists ? '✅ YES' : '❌ NO'}`);
      console.log(`🏠 personal_property_value column exists: ${personalPropertyExists ? '✅ YES' : '❌ NO'}`);
      console.log(`💼 business_gross_receipts column exists: ${businessReceiptsExists ? '✅ YES' : '❌ NO'}`);

      // Sample cedula data
      console.log('\n📊 Sample cedula applications data:');
      const [cedulaSample] = await connection.execute(`
        SELECT ca.id, ca.request_id, ca.property_assessed_value, ca.personal_property_value,
               ca.business_gross_receipts, ca.computed_tax,
               dr.request_number, dr.total_document_fee
        FROM cedula_applications ca
        JOIN document_requests dr ON ca.request_id = dr.id
        ORDER BY ca.id DESC
        LIMIT 5
      `);
      console.table(cedulaSample);

    } catch (error) {
      console.error('❌ Error checking cedula_applications table:', error.message);
    }

    // ========== TASK 2: CASH PAYMENT STATUS ANALYSIS ==========
    console.log('\n💵 TASK 2: CASH PAYMENT STATUS ANALYSIS');
    console.log('=' .repeat(60));

    // Check payment methods
    console.log('\n💳 Available payment methods:');
    const [paymentMethods] = await connection.execute('SELECT * FROM payment_methods');
    console.table(paymentMethods);

    // Check request status
    console.log('\n📊 Available request statuses:');
    const [requestStatuses] = await connection.execute('SELECT * FROM request_status');
    console.table(requestStatuses);

    // Analyze cash payment requests
    console.log('\n💰 Cash payment requests analysis:');
    const [cashPayments] = await connection.execute(`
      SELECT dr.id, dr.request_number, dr.status_id, rs.status_name,
             pm.method_name as payment_method, dr.payment_status,
             dr.created_at
      FROM document_requests dr
      JOIN payment_methods pm ON dr.payment_method_id = pm.id
      JOIN request_status rs ON dr.status_id = rs.id
      WHERE pm.method_name = 'Cash'
      ORDER BY dr.id DESC
      LIMIT 10
    `);
    console.table(cashPayments);

    // ========== TASK 3: BARANGAY CLEARANCE DATA ANALYSIS ==========
    console.log('\n🏘️  TASK 3: BARANGAY CLEARANCE DATA ANALYSIS');
    console.log('=' .repeat(60));

    // Check barangay_clearance_applications table structure
    console.log('\n📋 Barangay Clearance Applications table structure:');
    try {
      const [bcColumns] = await connection.execute('DESCRIBE barangay_clearance_applications');
      console.table(bcColumns.map(col => ({
        Field: col.Field,
        Type: col.Type,
        Null: col.Null,
        Key: col.Key,
        Default: col.Default
      })));

      // Check for specific fields
      const pendingCasesExists = bcColumns.some(col => col.Field === 'has_pending_cases');
      const pendingDetailsExists = bcColumns.some(col => col.Field === 'pending_cases_details');
      const voterRegExists = bcColumns.some(col => col.Field === 'voter_registration_number');

      console.log(`\n⚖️  has_pending_cases column exists: ${pendingCasesExists ? '✅ YES' : '❌ NO'}`);
      console.log(`📝 pending_cases_details column exists: ${pendingDetailsExists ? '✅ YES' : '❌ NO'}`);
      console.log(`🗳️  voter_registration_number column exists: ${voterRegExists ? '✅ YES' : '❌ NO'}`);

      // Sample barangay clearance data
      console.log('\n📊 Sample barangay clearance applications data:');
      const [bcSample] = await connection.execute(`
        SELECT bca.id, bca.request_id, bca.has_pending_cases, bca.pending_cases_details,
               bca.voter_registration_number, bca.precinct_number,
               dr.request_number
        FROM barangay_clearance_applications bca
        JOIN document_requests dr ON bca.request_id = dr.id
        ORDER BY bca.id DESC
        LIMIT 5
      `);
      console.table(bcSample);

    } catch (error) {
      console.error('❌ Error checking barangay_clearance_applications table:', error.message);
    }

    // Show sample data with current fee structure
    console.log('\n📊 Sample fee data from document_requests:');
    const [sampleData] = await connection.execute(`
      SELECT dr.id, dr.request_number, dr.total_document_fee, dr.payment_status, dr.payment_method_id,
             dt.type_name as document_type
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      ORDER BY dr.id DESC
      LIMIT 5
    `);

    console.table(sampleData);

    // Count total records
    const [countResult] = await connection.execute('SELECT COUNT(*) as total_records FROM document_requests');
    console.log(`\n📈 Total document requests: ${countResult[0].total_records}`);

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

checkDatabaseStructure();
