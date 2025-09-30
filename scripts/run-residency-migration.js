const { executeQuery } = require('../src/config/database');

async function runResidencyMigration() {
  console.log('Starting residency verification migration...');
  
  try {
    // 1. Update client_accounts table to include new residency verification statuses
    console.log('1. Updating client_accounts status enum...');
    await executeQuery(`
      ALTER TABLE client_accounts 
      MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'pending_verification', 'pending_residency_verification', 'residency_rejected') DEFAULT 'pending_verification'
    `);
    console.log('✅ client_accounts status updated');

    // 2. Create residency_documents table
    console.log('2. Creating residency_documents table...');
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS residency_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_id INT NOT NULL,
        document_type ENUM('utility_bill', 'barangay_certificate', 'valid_id', 'lease_contract', 'other') NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT,
        mime_type VARCHAR(100),
        
        verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        verified_by INT NULL,
        verified_at TIMESTAMP NULL,
        rejection_reason TEXT NULL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES admin_employee_accounts(id),
        
        INDEX idx_account_id (account_id),
        INDEX idx_verification_status (verification_status),
        INDEX idx_document_type (document_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ residency_documents table created');

    // 3. Add residency verification fields to client_profiles table
    console.log('3. Adding residency verification fields to client_profiles...');
    
    // Check if columns already exist
    const checkColumns = await executeQuery(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'client_profiles' 
      AND COLUMN_NAME IN ('residency_verified', 'residency_verified_by', 'residency_verified_at')
    `);
    
    if (checkColumns.length === 0) {
      await executeQuery(`
        ALTER TABLE client_profiles 
        ADD COLUMN residency_verified BOOLEAN DEFAULT FALSE AFTER is_verified,
        ADD COLUMN residency_verified_by INT NULL AFTER residency_verified,
        ADD COLUMN residency_verified_at TIMESTAMP NULL AFTER residency_verified_by
      `);
      
      await executeQuery(`
        ALTER TABLE client_profiles 
        ADD FOREIGN KEY (residency_verified_by) REFERENCES admin_employee_accounts(id)
      `);
      
      console.log('✅ residency verification fields added to client_profiles');
    } else {
      console.log('⚠️ residency verification fields already exist in client_profiles');
    }

    // 4. Create indexes for better performance
    console.log('4. Creating performance indexes...');
    try {
      await executeQuery(`CREATE INDEX idx_residency_verified ON client_profiles(residency_verified)`);
      console.log('✅ Performance indexes created');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('⚠️ Performance indexes already exist');
      } else {
        throw error;
      }
    }

    // 5. Update existing accounts that are already active to have residency verified
    console.log('5. Grandfathering existing active accounts...');
    const updateResult = await executeQuery(`
      UPDATE client_profiles cp
      JOIN client_accounts ca ON cp.account_id = ca.id
      SET cp.residency_verified = TRUE, cp.residency_verified_at = NOW()
      WHERE ca.status = 'active' AND cp.residency_verified = FALSE
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} existing active accounts`);

    // 6. Create a view for easy admin access to pending residency verifications
    console.log('6. Creating pending_residency_verifications view...');
    await executeQuery(`DROP VIEW IF EXISTS pending_residency_verifications`);
    await executeQuery(`
      CREATE VIEW pending_residency_verifications AS
      SELECT 
        ca.id as account_id,
        ca.username,
        ca.status as account_status,
        ca.created_at as registration_date,
        cp.first_name,
        cp.middle_name,
        cp.last_name,
        cp.email,
        cp.phone_number,
        cp.barangay,
        cp.city_municipality,
        cp.province,
        cp.years_of_residency,
        cp.months_of_residency,
        COUNT(rd.id) as document_count,
        MAX(rd.created_at) as latest_document_upload
      FROM client_accounts ca
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      LEFT JOIN residency_documents rd ON ca.id = rd.account_id
      WHERE ca.status IN ('pending_residency_verification', 'residency_rejected')
      GROUP BY ca.id, ca.username, ca.status, ca.created_at, cp.first_name, cp.middle_name, 
               cp.last_name, cp.email, cp.phone_number, cp.barangay, cp.city_municipality, 
               cp.province, cp.years_of_residency, cp.months_of_residency
      ORDER BY ca.created_at ASC
    `);
    console.log('✅ pending_residency_verifications view created');

    console.log('\n🎉 Residency verification migration completed successfully!');
    console.log('\nNew features available:');
    console.log('- Residency document upload during registration');
    console.log('- Admin residency verification interface');
    console.log('- Enhanced login validation for residency status');
    console.log('- Philippine address dropdown selectors');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run the migration
runResidencyMigration()
  .then(() => {
    console.log('\nMigration script completed. You can now start the server.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
