/**
 * GCash Payment Migration Script
 * Runs database migration for LOCAL and RAILWAY databases
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m'
};

// Database configurations
const databases = {
  local: {
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: '', // Will be prompted
    database: 'barangay_management_system',
    name: 'LOCAL'
  },
  railway: {
    host: 'hopper.proxy.rlwy.net',
    port: 26646,
    user: 'root',
    password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
    database: 'railway',
    name: 'RAILWAY'
  }
};

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Promisify question
const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Read SQL file
function readSQLFile(filename) {
  const filePath = path.join(__dirname, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`SQL file not found: ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

// Execute SQL statements
async function executeSQLStatements(connection, sql) {
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  const results = [];
  for (const statement of statements) {
    try {
      const [result] = await connection.execute(statement);
      results.push({ success: true, statement: statement.substring(0, 50) + '...', result });
    } catch (error) {
      results.push({ success: false, statement: statement.substring(0, 50) + '...', error: error.message });
    }
  }
  return results;
}

// Verify migration
async function verifyMigration(connection) {
  console.log(`\n${colors.yellow}Verifying migration...${colors.reset}`);
  
  try {
    // Check if columns exist
    const [columns] = await connection.execute(
      "SHOW COLUMNS FROM document_requests LIKE 'gcash%'"
    );
    
    console.log(`${colors.green}✓ Found ${columns.length} GCash columns${colors.reset}`);
    columns.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    // Check if payment method exists
    const [methods] = await connection.execute(
      "SELECT * FROM payment_methods WHERE method_code = 'GCASH_MANUAL'"
    );
    
    if (methods.length > 0) {
      console.log(`${colors.green}✓ GCash Manual payment method added${colors.reset}`);
      console.log(`  - ID: ${methods[0].id}`);
      console.log(`  - Name: ${methods[0].method_name}`);
    } else {
      console.log(`${colors.red}✗ GCash Manual payment method NOT found${colors.reset}`);
    }
    
    return columns.length > 0 && methods.length > 0;
  } catch (error) {
    console.log(`${colors.red}✗ Verification failed: ${error.message}${colors.reset}`);
    return false;
  }
}

// Run migration for a specific database
async function runMigration(dbConfig) {
  console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}Migrating ${dbConfig.name} Database${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
  console.log(`${colors.yellow}Host:${colors.reset} ${dbConfig.host}:${dbConfig.port}`);
  console.log(`${colors.yellow}Database:${colors.reset} ${dbConfig.database}`);
  console.log(`${colors.yellow}User:${colors.reset} ${dbConfig.user}`);
  
  let connection;
  try {
    // Connect to database
    console.log(`\n${colors.yellow}Connecting to database...${colors.reset}`);
    connection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
      multipleStatements: true
    });
    console.log(`${colors.green}✓ Connected successfully${colors.reset}`);
    
    // Read SQL file
    console.log(`\n${colors.yellow}Reading migration SQL...${colors.reset}`);
    const sql = readSQLFile('add_gcash_payment_proof_fields.sql');
    console.log(`${colors.green}✓ SQL file loaded${colors.reset}`);
    
    // Execute migration
    console.log(`\n${colors.yellow}Executing migration...${colors.reset}`);
    const results = await executeSQLStatements(connection, sql);
    
    // Show results
    let successCount = 0;
    let failCount = 0;
    results.forEach(result => {
      if (result.success) {
        successCount++;
        console.log(`${colors.green}✓${colors.reset} ${result.statement}`);
      } else {
        failCount++;
        console.log(`${colors.red}✗${colors.reset} ${result.statement}`);
        console.log(`  Error: ${result.error}`);
      }
    });
    
    console.log(`\n${colors.bright}Summary:${colors.reset}`);
    console.log(`${colors.green}Success: ${successCount}${colors.reset}`);
    console.log(`${colors.red}Failed: ${failCount}${colors.reset}`);
    
    // Verify migration
    const verified = await verifyMigration(connection);
    
    if (verified) {
      console.log(`\n${colors.bright}${colors.green}✓ Migration completed successfully for ${dbConfig.name}!${colors.reset}`);
      return true;
    } else {
      console.log(`\n${colors.bright}${colors.red}✗ Migration verification failed for ${dbConfig.name}${colors.reset}`);
      return false;
    }
    
  } catch (error) {
    console.log(`\n${colors.red}✗ Migration failed: ${error.message}${colors.reset}`);
    console.error(error);
    return false;
  } finally {
    if (connection) {
      await connection.end();
      console.log(`${colors.yellow}Connection closed${colors.reset}`);
    }
  }
}

// Main function
async function main() {
  console.log(`\n${colors.bright}${colors.blue}╔════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║   GCash Payment Migration Script              ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}║   Barangay Bula Document Management System    ║${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}╚════════════════════════════════════════════════╝${colors.reset}\n`);
  
  try {
    // Ask which database to migrate
    console.log(`${colors.cyan}Select database to migrate:${colors.reset}`);
    console.log(`1. LOCAL database (barangay_management_system)`);
    console.log(`2. RAILWAY database (production)`);
    console.log(`3. BOTH databases`);
    console.log(`4. Exit\n`);
    
    const choice = await question('Enter your choice (1-4): ');
    
    if (choice === '4') {
      console.log(`\n${colors.yellow}Migration cancelled.${colors.reset}`);
      rl.close();
      return;
    }
    
    let migrateLocal = false;
    let migrateRailway = false;
    
    switch (choice) {
      case '1':
        migrateLocal = true;
        break;
      case '2':
        migrateRailway = true;
        break;
      case '3':
        migrateLocal = true;
        migrateRailway = true;
        break;
      default:
        console.log(`\n${colors.red}Invalid choice. Exiting.${colors.reset}`);
        rl.close();
        return;
    }
    
    // Get LOCAL database password if needed
    if (migrateLocal) {
      const password = await question('\nEnter LOCAL MySQL root password: ');
      databases.local.password = password;
    }
    
    // Confirm before proceeding
    console.log(`\n${colors.yellow}⚠️  WARNING: This will modify the database schema!${colors.reset}`);
    const confirm = await question('Are you sure you want to proceed? (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log(`\n${colors.yellow}Migration cancelled.${colors.reset}`);
      rl.close();
      return;
    }
    
    // Run migrations
    const results = [];
    
    if (migrateLocal) {
      const success = await runMigration(databases.local);
      results.push({ database: 'LOCAL', success });
    }
    
    if (migrateRailway) {
      const success = await runMigration(databases.railway);
      results.push({ database: 'RAILWAY', success });
    }
    
    // Final summary
    console.log(`\n${colors.bright}${colors.cyan}========================================${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}Migration Summary${colors.reset}`);
    console.log(`${colors.bright}${colors.cyan}========================================${colors.reset}`);
    
    results.forEach(result => {
      const status = result.success 
        ? `${colors.green}✓ SUCCESS${colors.reset}` 
        : `${colors.red}✗ FAILED${colors.reset}`;
      console.log(`${result.database}: ${status}`);
    });
    
    const allSuccess = results.every(r => r.success);
    if (allSuccess) {
      console.log(`\n${colors.bright}${colors.green}🎉 All migrations completed successfully!${colors.reset}`);
      console.log(`\n${colors.cyan}Next steps:${colors.reset}`);
      console.log(`1. Test the backend locally`);
      console.log(`2. Deploy backend to Railway`);
      console.log(`3. Deploy frontend`);
      console.log(`4. Test the complete GCash payment flow\n`);
    } else {
      console.log(`\n${colors.bright}${colors.red}⚠️  Some migrations failed. Please check the errors above.${colors.reset}\n`);
    }
    
  } catch (error) {
    console.error(`\n${colors.red}Error: ${error.message}${colors.reset}`);
    console.error(error);
  } finally {
    rl.close();
  }
}

// Run the script
main().catch(error => {
  console.error(`\n${colors.red}Fatal error: ${error.message}${colors.reset}`);
  console.error(error);
  process.exit(1);
});
