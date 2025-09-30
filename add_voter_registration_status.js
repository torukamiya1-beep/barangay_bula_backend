const { executeQuery } = require('./src/config/database');

async function addVoterRegistrationStatus() {
  try {
    console.log('🗳️  Adding voter registration status field to Barangay Clearance system...\n');
    
    // 1. Check current table structure
    console.log('📋 1. CURRENT TABLE STRUCTURE:');
    const currentStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(currentStructure);
    
    // 2. Check if voter_registration_status column already exists
    const hasVoterStatus = currentStructure.some(col => col.Field === 'voter_registration_status');
    
    if (hasVoterStatus) {
      console.log('✅ voter_registration_status column already exists');
    } else {
      console.log('➕ Adding voter_registration_status column...');
      
      // Add the column
      await executeQuery(`
        ALTER TABLE barangay_clearance_applications 
        ADD COLUMN voter_registration_status TINYINT(1) DEFAULT NULL 
        COMMENT 'Voter registration status: 1=registered, 0=not registered, NULL=not specified'
        AFTER pending_cases_details
      `);
      
      console.log('✅ voter_registration_status column added successfully');
    }
    
    // 3. Verify the updated structure
    console.log('\n📋 3. UPDATED TABLE STRUCTURE:');
    const updatedStructure = await executeQuery('DESCRIBE barangay_clearance_applications');
    console.table(updatedStructure);
    
    // 4. Test insert with new field
    console.log('\n🧪 4. TESTING INSERT WITH NEW FIELD:');
    
    // Get a test request ID (use a high number to avoid conflicts)
    const testRequestId = 9999;
    
    try {
      await executeQuery(`
        INSERT INTO barangay_clearance_applications (
          request_id, has_pending_cases, pending_cases_details, voter_registration_status
        ) VALUES (?, ?, ?, ?)
      `, [testRequestId, true, 'Test with voter status', true]);
      
      console.log('✅ Test insert successful');
      
      // Verify the test record
      const testRecord = await executeQuery(`
        SELECT * FROM barangay_clearance_applications WHERE request_id = ?
      `, [testRequestId]);
      
      console.log('📋 Test record:');
      console.table(testRecord);
      
      // Clean up test record
      await executeQuery('DELETE FROM barangay_clearance_applications WHERE request_id = ?', [testRequestId]);
      console.log('🧹 Test record cleaned up');
      
    } catch (insertError) {
      if (insertError.message.includes('foreign key constraint fails')) {
        console.log('✅ Insert structure correct (foreign key constraint expected)');
      } else {
        console.log('❌ Insert error:', insertError.message);
      }
    }
    
    console.log('\n🎉 Voter registration status field added successfully!');
    console.log('📋 Updated schema includes:');
    console.log('  - has_pending_cases (TINYINT(1))');
    console.log('  - pending_cases_details (TEXT)');
    console.log('  - voter_registration_status (TINYINT(1)) - NEW');
    
  } catch (error) {
    console.error('❌ Error adding voter registration status:', error.message);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

addVoterRegistrationStatus();
