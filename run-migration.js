const fs = require('fs');
const path = require('path');
const { executeQuery } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('📦 Reading migration file...');
    const migrationPath = path.join(__dirname, 'migrations', 'add_document_verification_status.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by semicolon and filter out empty statements and comments
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip pure comment lines
      if (statement.startsWith('--') || statement.match(/^\/\*/)) {
        continue;
      }
      
      console.log(`\n[${i + 1}/${statements.length}] Executing statement...`);
      console.log(`Statement preview: ${statement.substring(0, 100)}...`);
      
      try {
        const result = await executeQuery(statement);
        
        // If it's a SELECT statement, show results
        if (statement.trim().toUpperCase().startsWith('SELECT')) {
          console.log('✅ Result:', result);
        } else {
          console.log('✅ Success');
        }
      } catch (error) {
        // Some errors are okay (like "column already exists")
        if (error.message.includes('Duplicate column') || 
            error.message.includes('Duplicate key') ||
            error.message.includes('already exists')) {
          console.log('⚠️  Column/Index already exists (skipping)');
        } else {
          console.error('❌ Error:', error.message);
          throw error;
        }
      }
    }
    
    console.log('\n\n🎉 Migration completed successfully!');
    console.log('\n📊 Verifying tables...');
    
    // Verify supporting_documents
    const sd = await executeQuery('DESCRIBE supporting_documents');
    console.log('\n✅ supporting_documents columns:', sd.map(c => c.Field).join(', '));
    
    // Verify authorization_documents
    const ad = await executeQuery('DESCRIBE authorization_documents');
    console.log('✅ authorization_documents columns:', ad.map(c => c.Field).join(', '));
    
    // Verify document_beneficiaries
    const db = await executeQuery('DESCRIBE document_beneficiaries');
    console.log('✅ document_beneficiaries columns:', db.map(c => c.Field).join(', '));
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }
}

// Connect to database and run migration
const { connectDatabase } = require('./src/config/database');

connectDatabase()
  .then(() => {
    console.log('✅ Connected to database\n');
    return runMigration();
  })
  .catch(error => {
    console.error('❌ Failed to connect to database:', error);
    process.exit(1);
  });
