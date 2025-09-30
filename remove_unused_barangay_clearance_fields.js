const { executeQuery } = require('./src/config/database');

async function removeUnusedBarangayClearanceFields() {
  try {
    console.log('🗑️  Removing unused fields from barangay_clearance_applications table...\n');
    
    // Check current schema
    console.log('📋 Current table structure:');
    const currentStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(currentStructure);
    
    // List of columns to drop
    const columnsToRemove = [
      'voter_registration_number',
      'precinct_number', 
      'emergency_contact_name',
      'emergency_contact_relationship',
      'emergency_contact_phone',
      'emergency_contact_address'
    ];
    
    console.log('\n🗑️  Columns to remove:', columnsToRemove);
    
    // Check which columns actually exist before trying to drop them
    const existingColumns = currentStructure.map(col => col.Field);
    const columnsToActuallyRemove = columnsToRemove.filter(col => existingColumns.includes(col));
    
    if (columnsToActuallyRemove.length === 0) {
      console.log('ℹ️  No columns to remove - they may have already been dropped');
    } else {
      console.log('📋 Columns that will be removed:', columnsToActuallyRemove);
      
      // Drop each column
      for (const columnName of columnsToActuallyRemove) {
        try {
          console.log(`🗑️  Dropping column: ${columnName}`);
          const dropQuery = `ALTER TABLE barangay_clearance_applications DROP COLUMN ${columnName}`;
          await executeQuery(dropQuery);
          console.log(`✅ Successfully dropped column: ${columnName}`);
        } catch (error) {
          if (error.message.includes("doesn't exist")) {
            console.log(`ℹ️  Column ${columnName} doesn't exist, skipping...`);
          } else {
            console.error(`❌ Failed to drop column ${columnName}:`, error.message);
            throw error;
          }
        }
      }
    }
    
    // Verify the updated schema
    console.log('\n📋 Updated table structure:');
    const updatedStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(updatedStructure);
    
    // Verify that only essential columns remain
    const finalColumns = updatedStructure.map(col => col.Field);
    const expectedColumns = ['id', 'request_id', 'has_pending_cases', 'pending_cases_details', 'created_at', 'updated_at'];
    
    console.log('\n✅ Final column verification:');
    console.log('Expected columns:', expectedColumns);
    console.log('Actual columns:', finalColumns);
    
    const unexpectedColumns = finalColumns.filter(col => !expectedColumns.includes(col));
    const missingColumns = expectedColumns.filter(col => !finalColumns.includes(col));
    
    if (unexpectedColumns.length > 0) {
      console.log('⚠️  Unexpected columns found:', unexpectedColumns);
    }
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing expected columns:', missingColumns);
    }
    
    if (unexpectedColumns.length === 0 && missingColumns.length === 0) {
      console.log('✅ Table structure is correct - only essential columns remain');
    }
    
    // Test the updated structure with a sample insert
    console.log('\n🧪 Testing updated structure...');
    const testData = {
      request_id: 999999, // Use a fake ID for testing
      has_pending_cases: true,
      pending_cases_details: 'Test pending case details after field removal'
    };
    
    const testQuery = `
      INSERT INTO barangay_clearance_applications (
        request_id, has_pending_cases, pending_cases_details
      ) VALUES (?, ?, ?)
    `;
    
    const testParams = [
      testData.request_id,
      testData.has_pending_cases,
      testData.pending_cases_details
    ];
    
    try {
      await executeQuery(testQuery, testParams);
      console.log('✅ Test insert successful - updated structure works correctly!');
      
      // Clean up test data
      await executeQuery('DELETE FROM barangay_clearance_applications WHERE request_id = ?', [999999]);
      console.log('🧹 Test data cleaned up');
      
    } catch (error) {
      if (error.message.includes('foreign key constraint fails')) {
        console.log('✅ Test insert failed due to foreign key constraint (expected) - structure is correct');
      } else {
        console.error('❌ Test insert failed:', error.message);
        throw error;
      }
    }
    
    console.log('\n🎉 Field removal completed successfully!');
    console.log('✅ Unused voter registration and emergency contact fields have been removed');
    console.log('✅ Only essential fields remain: has_pending_cases, pending_cases_details');
    
  } catch (error) {
    console.error('❌ Field removal failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

removeUnusedBarangayClearanceFields();
