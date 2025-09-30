const { executeQuery } = require('./src/config/database');

async function fixBarangayClearanceSchema() {
  try {
    console.log('🔧 Fixing barangay_clearance_applications table schema...\n');
    
    // Check current schema
    console.log('📋 Current table structure:');
    const currentStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(currentStructure);
    
    // Add missing columns
    const alterQueries = [
      {
        name: 'voter_registration_number',
        query: 'ALTER TABLE barangay_clearance_applications ADD COLUMN voter_registration_number VARCHAR(50) NULL AFTER pending_cases_details'
      },
      {
        name: 'precinct_number', 
        query: 'ALTER TABLE barangay_clearance_applications ADD COLUMN precinct_number VARCHAR(20) NULL AFTER voter_registration_number'
      },
      {
        name: 'emergency_contact_name',
        query: 'ALTER TABLE barangay_clearance_applications ADD COLUMN emergency_contact_name VARCHAR(100) NULL AFTER precinct_number'
      },
      {
        name: 'emergency_contact_relationship',
        query: 'ALTER TABLE barangay_clearance_applications ADD COLUMN emergency_contact_relationship VARCHAR(50) NULL AFTER emergency_contact_name'
      },
      {
        name: 'emergency_contact_phone',
        query: 'ALTER TABLE barangay_clearance_applications ADD COLUMN emergency_contact_phone VARCHAR(20) NULL AFTER emergency_contact_relationship'
      },
      {
        name: 'emergency_contact_address',
        query: 'ALTER TABLE barangay_clearance_applications ADD COLUMN emergency_contact_address TEXT NULL AFTER emergency_contact_phone'
      }
    ];
    
    console.log('\n🔧 Adding missing columns...');
    
    for (const alter of alterQueries) {
      try {
        console.log(`➕ Adding column: ${alter.name}`);
        await executeQuery(alter.query);
        console.log(`✅ Successfully added column: ${alter.name}`);
      } catch (error) {
        if (error.message.includes('Duplicate column name')) {
          console.log(`ℹ️  Column ${alter.name} already exists, skipping...`);
        } else {
          console.error(`❌ Failed to add column ${alter.name}:`, error.message);
          throw error;
        }
      }
    }
    
    // Verify the updated schema
    console.log('\n📋 Updated table structure:');
    const updatedStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(updatedStructure);
    
    // Test the fix by running our test again
    console.log('\n🧪 Testing the fix...');
    const testData = {
      request_id: 999999, // Use a fake ID for testing
      has_pending_cases: true,
      pending_cases_details: 'Test pending case details',
      voter_registration_number: '12345678901234567890',
      precinct_number: '001A',
      emergency_contact_name: 'Test Emergency Contact',
      emergency_contact_relationship: 'Spouse',
      emergency_contact_phone: '09123456789',
      emergency_contact_address: '123 Test Street, Test City'
    };
    
    const testQuery = `
      INSERT INTO barangay_clearance_applications (
        request_id, has_pending_cases, pending_cases_details,
        voter_registration_number, precinct_number, emergency_contact_name,
        emergency_contact_relationship, emergency_contact_phone, emergency_contact_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const testParams = [
      testData.request_id,
      testData.has_pending_cases,
      testData.pending_cases_details,
      testData.voter_registration_number,
      testData.precinct_number,
      testData.emergency_contact_name,
      testData.emergency_contact_relationship,
      testData.emergency_contact_phone,
      testData.emergency_contact_address
    ];
    
    try {
      await executeQuery(testQuery, testParams);
      console.log('✅ Test insert successful - schema is fixed!');
      
      // Clean up test data
      await executeQuery('DELETE FROM barangay_clearance_applications WHERE request_id = ?', [999999]);
      console.log('🧹 Test data cleaned up');
      
    } catch (error) {
      console.error('❌ Test insert failed:', error.message);
      throw error;
    }
    
    console.log('\n🎉 Schema fix completed successfully!');
    console.log('✅ All missing columns have been added to barangay_clearance_applications table');
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

fixBarangayClearanceSchema();
