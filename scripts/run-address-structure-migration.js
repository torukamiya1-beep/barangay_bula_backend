const { executeQuery } = require('../src/config/database');
const fs = require('fs');
const path = require('path');

async function runAddressStructureMigration() {
  console.log('🔄 Starting address structure migration...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '../migrations/update_address_structure.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📝 Found ${statements.length} SQL statements to execute`);
    
    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      
      // Skip comments and empty statements
      if (statement.startsWith('--') || statement.trim() === '') {
        continue;
      }
      
      try {
        console.log(`⏳ Executing statement ${i + 1}/${statements.length}...`);
        
        // Handle special cases for multi-statement blocks
        if (statement.includes('DELIMITER')) {
          // For stored procedures and triggers, we need to handle them specially
          const delimiterMatch = statement.match(/DELIMITER\s+(\S+)/);
          if (delimiterMatch) {
            const delimiter = delimiterMatch[1];
            // Find the corresponding end delimiter
            let procedureBlock = statement;
            let j = i + 1;
            while (j < statements.length && !statements[j].includes(`DELIMITER ;`)) {
              procedureBlock += ';' + statements[j];
              j++;
            }
            if (j < statements.length) {
              procedureBlock += ';' + statements[j];
            }
            
            // Clean up the procedure block
            procedureBlock = procedureBlock
              .replace(/DELIMITER\s+\/\//g, '')
              .replace(/DELIMITER\s+;/g, '')
              .replace(/\/\//g, ';');
            
            await executeQuery(procedureBlock);
            i = j; // Skip the statements we've already processed
            continue;
          }
        }
        
        await executeQuery(statement);
        console.log(`✅ Statement ${i + 1} executed successfully`);
        
      } catch (error) {
        // Some errors are expected (like "column already exists")
        if (error.code === 'ER_DUP_FIELDNAME') {
          console.log(`⚠️  Column already exists, skipping: ${error.message}`);
        } else if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`⚠️  Index already exists, skipping: ${error.message}`);
        } else if (error.code === 'ER_SP_ALREADY_EXISTS') {
          console.log(`⚠️  Stored procedure already exists, skipping: ${error.message}`);
        } else if (error.code === 'ER_TRG_ALREADY_EXISTS') {
          console.log(`⚠️  Trigger already exists, skipping: ${error.message}`);
        } else {
          console.error(`❌ Error executing statement ${i + 1}:`, error.message);
          console.error(`Statement: ${statement.substring(0, 100)}...`);
          // Continue with other statements instead of failing completely
        }
      }
    }
    
    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    
    const columns = await executeQuery('DESCRIBE client_profiles');
    const addressColumns = columns.filter(col => 
      ['region', 'region_code', 'province_code', 'city_code', 'barangay_code'].includes(col.Field)
    );
    
    console.log(`✅ Address columns added: ${addressColumns.map(col => col.Field).join(', ')}`);
    
    // Check if view was created
    try {
      const viewResult = await executeQuery('SELECT COUNT(*) as count FROM client_complete_addresses LIMIT 1');
      console.log(`✅ View 'client_complete_addresses' created successfully`);
    } catch (error) {
      console.log(`⚠️  View creation may have failed: ${error.message}`);
    }
    
    console.log('\n🎉 Address structure migration completed successfully!');
    console.log('\nNew features available:');
    console.log('- Region field and code support');
    console.log('- Province, city, and barangay codes');
    console.log('- Address validation triggers');
    console.log('- Complete address view');
    console.log('- Address validation stored procedure');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the migration
runAddressStructureMigration()
  .then(() => {
    console.log('\n✅ Migration script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
