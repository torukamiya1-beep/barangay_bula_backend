const mysql = require('mysql2/promise');
const fs = require('fs');

// Railway Database Configuration
const railwayConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway',
  connectTimeout: 60000,
  acquireTimeout: 60000,
  timeout: 60000
};

// Expected tables from local database
const expectedTables = [
  'admin_employee_accounts',
  'admin_employee_profiles', 
  'audit_logs',
  'authorization_documents',
  'authorized_pickup_persons',
  'barangay_clearance_applications',
  'beneficiary_verification_documents',
  'cedula_applications',
  'civil_status',
  'client_accounts',
  'client_profiles',
  'document_beneficiaries',
  'document_requests',
  'document_types',
  'generated_documents',
  'notifications',
  'otps',
  'payment_methods',
  'payment_transactions',
  'payment_verifications',
  'payment_webhooks',
  'pending_residency_verifications',
  'pickup_schedules',
  'purpose_categories',
  'receipts',
  'request_status',
  'request_status_history',
  'residency_documents',
  'supporting_documents',
  'system_settings',
  'v_client_complete',
  'v_document_requests_complete',
  'v_document_requests_with_beneficiary',
  'v_payment_audit_trail',
  'v_payment_transactions_complete',
  'v_payment_verification_queue',
  'v_receipts_complete'
];

async function compareDatabase() {
  let connection;
  
  try {
    console.log('🔗 Connecting to Railway database...');
    connection = await mysql.createConnection(railwayConfig);
    console.log('✅ Connected to Railway database successfully!');

    // Get all tables in Railway database
    console.log('\n📋 Getting Railway database tables...');
    const [railwayTables] = await connection.execute('SHOW TABLES');
    const railwayTableNames = railwayTables.map(row => Object.values(row)[0]);
    
    console.log(`\n📊 Railway Database Analysis:`);
    console.log(`   Total tables found: ${railwayTableNames.length}`);
    console.log(`   Expected tables: ${expectedTables.length}`);

    // Compare tables
    console.log('\n🔍 Table Comparison:');
    const missingTables = expectedTables.filter(table => !railwayTableNames.includes(table));
    const extraTables = railwayTableNames.filter(table => !expectedTables.includes(table));

    if (missingTables.length === 0) {
      console.log('✅ All expected tables are present in Railway database');
    } else {
      console.log(`❌ Missing tables (${missingTables.length}):`);
      missingTables.forEach(table => console.log(`   - ${table}`));
    }

    if (extraTables.length > 0) {
      console.log(`ℹ️  Extra tables in Railway (${extraTables.length}):`);
      extraTables.forEach(table => console.log(`   - ${table}`));
    }

    // Check critical table structures
    console.log('\n🔍 Checking critical table structures...');
    
    // Check notifications table structure
    await checkTableStructure(connection, 'notifications');
    
    // Check document_requests table structure  
    await checkTableStructure(connection, 'document_requests');
    
    // Check client_accounts table structure
    await checkTableStructure(connection, 'client_accounts');
    
    // Check admin_employee_accounts table structure
    await checkTableStructure(connection, 'admin_employee_accounts');

    // Test critical queries that were failing
    console.log('\n🧪 Testing critical queries...');
    await testCriticalQueries(connection);

  } catch (error) {
    console.error('❌ Database comparison failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

async function checkTableStructure(connection, tableName) {
  try {
    console.log(`\n📋 Checking ${tableName} structure:`);
    
    const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
    console.log(`   Columns (${columns.length}):`);
    
    columns.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${col.Key ? `(${col.Key})` : ''} ${col.Default !== null ? `DEFAULT ${col.Default}` : ''}`);
    });

    // Check for specific columns that caused issues
    if (tableName === 'notifications') {
      const hasRecipientType = columns.some(col => col.Field === 'recipient_type');
      const hasRecipientId = columns.some(col => col.Field === 'recipient_id');
      const hasUserType = columns.some(col => col.Field === 'user_type');
      const hasUserId = columns.some(col => col.Field === 'user_id');
      
      console.log(`   ✅ recipient_type column: ${hasRecipientType ? 'EXISTS' : 'MISSING'}`);
      console.log(`   ✅ recipient_id column: ${hasRecipientId ? 'EXISTS' : 'MISSING'}`);
      console.log(`   ❌ user_type column: ${hasUserType ? 'EXISTS (should not)' : 'MISSING (correct)'}`);
      console.log(`   ❌ user_id column: ${hasUserId ? 'EXISTS (should not)' : 'MISSING (correct)'}`);
    }

    if (tableName === 'document_requests') {
      const hasRequestedAt = columns.some(col => col.Field === 'requested_at');
      const hasCreatedAt = columns.some(col => col.Field === 'created_at');
      
      console.log(`   ✅ requested_at column: ${hasRequestedAt ? 'EXISTS' : 'MISSING'}`);
      console.log(`   ✅ created_at column: ${hasCreatedAt ? 'EXISTS' : 'MISSING'}`);
    }

  } catch (error) {
    console.error(`❌ Failed to check ${tableName} structure:`, error.message);
  }
}

async function testCriticalQueries(connection) {
  const queries = [
    {
      name: 'Notifications unread count (admin)',
      query: `SELECT COUNT(*) as count FROM notifications WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = 1) AND is_read = FALSE`
    },
    {
      name: 'Notifications unread count (client)', 
      query: `SELECT COUNT(*) as count FROM notifications WHERE recipient_type = 'client' AND recipient_id = 1 AND is_read = FALSE`
    },
    {
      name: 'Document requests with requested_at',
      query: `SELECT id, request_number, requested_at FROM document_requests ORDER BY requested_at DESC LIMIT 5`
    },
    {
      name: 'Admin employee accounts',
      query: `SELECT id, username, role, status FROM admin_employee_accounts LIMIT 5`
    },
    {
      name: 'Client accounts',
      query: `SELECT id, username, status FROM client_accounts LIMIT 5`
    }
  ];

  for (const queryTest of queries) {
    try {
      console.log(`\n🧪 Testing: ${queryTest.name}`);
      const [results] = await connection.execute(queryTest.query);
      console.log(`   ✅ Success: ${results.length} rows returned`);
      if (results.length > 0) {
        console.log(`   📄 Sample result:`, JSON.stringify(results[0], null, 2));
      }
    } catch (error) {
      console.error(`   ❌ Failed: ${error.message}`);
    }
  }
}

async function detailedTableComparison(connection) {
  console.log('\n🔍 Detailed Table Structure Comparison...');

  // Read local SQL file to extract table structures
  const localSqlPath = '../DB_oct2_fromsept30_brgy_docu_hub.sql';

  try {
    const sqlContent = fs.readFileSync(localSqlPath, 'utf8');

    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE TABLE `([^`]+)` \(([\s\S]*?)\) ENGINE=/g;
    const localTables = {};
    let match;

    while ((match = createTableRegex.exec(sqlContent)) !== null) {
      const tableName = match[1];
      const tableDefinition = match[2];

      // Skip views (they start with v_)
      if (!tableName.startsWith('v_')) {
        localTables[tableName] = parseTableDefinition(tableDefinition);
      }
    }

    console.log(`📋 Found ${Object.keys(localTables).length} table definitions in local SQL`);

    // Compare each table
    for (const tableName of Object.keys(localTables)) {
      if (expectedTables.includes(tableName) && !tableName.startsWith('v_')) {
        await compareTableStructure(connection, tableName, localTables[tableName]);
      }
    }

  } catch (error) {
    console.error('❌ Failed to read local SQL file:', error.message);
  }
}

function parseTableDefinition(definition) {
  const columns = {};
  const lines = definition.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('`') && !trimmed.startsWith('PRIMARY KEY') && !trimmed.startsWith('KEY') && !trimmed.startsWith('UNIQUE KEY')) {
      const columnMatch = trimmed.match(/`([^`]+)`\s+([^,]+)/);
      if (columnMatch) {
        const columnName = columnMatch[1];
        const columnDef = columnMatch[2].trim();
        columns[columnName] = columnDef;
      }
    }
  }

  return columns;
}

async function compareTableStructure(connection, tableName, localColumns) {
  try {
    console.log(`\n🔍 Comparing ${tableName}:`);

    const [railwayColumns] = await connection.execute(`DESCRIBE ${tableName}`);
    const railwayColumnMap = {};

    railwayColumns.forEach(col => {
      railwayColumnMap[col.Field] = {
        type: col.Type,
        null: col.Null,
        key: col.Key,
        default: col.Default,
        extra: col.Extra
      };
    });

    // Check for missing columns
    const missingColumns = Object.keys(localColumns).filter(col => !railwayColumnMap[col]);
    const extraColumns = Object.keys(railwayColumnMap).filter(col => !localColumns[col]);

    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log(`   ✅ Column structure matches (${Object.keys(localColumns).length} columns)`);
    } else {
      if (missingColumns.length > 0) {
        console.log(`   ❌ Missing columns: ${missingColumns.join(', ')}`);
      }
      if (extraColumns.length > 0) {
        console.log(`   ⚠️  Extra columns: ${extraColumns.join(', ')}`);
      }
    }

    // Check data counts
    const [countResult] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    console.log(`   📊 Data count: ${countResult[0].count} rows`);

  } catch (error) {
    console.error(`   ❌ Failed to compare ${tableName}:`, error.message);
  }
}

// Run the comparison
console.log('🚀 Starting Railway vs Local Database Comparison...\n');
compareDatabase()
  .then(() => {
    console.log('\n🔍 Starting detailed comparison...');
    return mysql.createConnection(railwayConfig);
  })
  .then(async (connection) => {
    await detailedTableComparison(connection);
    await connection.end();
  })
  .catch(console.error);
