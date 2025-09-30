const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../src/config/database');

async function runMigration() {
  try {
    console.log('🔄 Connecting to database...');
    
    console.log('📖 Reading migration file...');
    const migrationPath = path.join(__dirname, '../src/migrations/create_notifications_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...');
    
    // Split SQL by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 50)}...`);
        await executeQuery(statement);
      }
    }

    console.log('✅ Migration completed successfully!');

    // Verify table was created
    const tables = await executeQuery("SHOW TABLES LIKE 'notifications'");
    if (tables.length > 0) {
      console.log('✅ Notifications table created successfully');

      // Show table structure
      const columns = await executeQuery("DESCRIBE notifications");
      console.log('📋 Table structure:');
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'}`);
      });
    } else {
      console.log('❌ Notifications table was not created');
    }
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigration();
