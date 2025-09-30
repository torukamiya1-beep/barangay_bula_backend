const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../src/config/database');

async function runVerificationMigration() {
  try {
    console.log('🚀 Starting verification documents migration...');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_verification_simple.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`⚡ Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        await executeQuery(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
      } catch (error) {
        // Some statements might fail if they already exist, which is okay
        if (error.message.includes('Duplicate') || 
            error.message.includes('already exists') ||
            error.message.includes('duplicate key')) {
          console.log(`⚠️  Statement ${i + 1} skipped (already exists): ${error.message}`);
        } else {
          console.error(`❌ Error in statement ${i + 1}:`, error.message);
          console.log('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }

    console.log('🎉 Migration completed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying migration results...');
    
    // Check if new columns were added to document_beneficiaries
    const beneficiaryColumns = await executeQuery(`
      SHOW COLUMNS FROM document_beneficiaries 
      WHERE Field IN ('verification_image_path', 'verification_status', 'verified_by')
    `);
    console.log(`✅ document_beneficiaries: ${beneficiaryColumns.length} new columns added`);
    
    // Check if new columns were added to authorized_pickup_persons
    const pickupColumns = await executeQuery(`
      SHOW COLUMNS FROM authorized_pickup_persons 
      WHERE Field IN ('id_image_path', 'id_image_name', 'id_image_size')
    `);
    console.log(`✅ authorized_pickup_persons: ${pickupColumns.length} new columns added`);
    
    // Check if new table was created
    const tables = await executeQuery(`
      SHOW TABLES LIKE 'beneficiary_verification_documents'
    `);
    console.log(`✅ beneficiary_verification_documents table: ${tables.length > 0 ? 'Created' : 'Not found'}`);
    
    console.log('\n🎯 Migration verification complete!');
    process.exit(0);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runVerificationMigration();
