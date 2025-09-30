const { executeQuery } = require('../src/config/database');

async function runVerificationMigration() {
  try {
    console.log('🚀 Starting verification documents migration...');

    // 1. Add columns to document_beneficiaries table
    console.log('📝 Adding columns to document_beneficiaries table...');
    try {
      await executeQuery(`
        ALTER TABLE document_beneficiaries 
        ADD COLUMN verification_image_path VARCHAR(500) NULL,
        ADD COLUMN verification_image_name VARCHAR(200) NULL,
        ADD COLUMN verification_image_size INT NULL,
        ADD COLUMN verification_image_mime_type VARCHAR(100) NULL,
        ADD COLUMN verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        ADD COLUMN verified_by INT NULL,
        ADD COLUMN verified_at TIMESTAMP NULL,
        ADD COLUMN verification_notes TEXT NULL
      `);
      console.log('✅ document_beneficiaries columns added successfully');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('⚠️  document_beneficiaries columns already exist');
      } else {
        console.error('❌ Error adding document_beneficiaries columns:', error.message);
      }
    }

    // 2. Add columns to authorized_pickup_persons table
    console.log('📝 Adding columns to authorized_pickup_persons table...');
    try {
      await executeQuery(`
        ALTER TABLE authorized_pickup_persons 
        ADD COLUMN id_image_path VARCHAR(500) NULL,
        ADD COLUMN id_image_name VARCHAR(200) NULL,
        ADD COLUMN id_image_size INT NULL,
        ADD COLUMN id_image_mime_type VARCHAR(100) NULL
      `);
      console.log('✅ authorized_pickup_persons columns added successfully');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('⚠️  authorized_pickup_persons columns already exist');
      } else {
        console.error('❌ Error adding authorized_pickup_persons columns:', error.message);
      }
    }

    // 3. Create beneficiary verification documents table
    console.log('📝 Creating beneficiary_verification_documents table...');
    try {
      await executeQuery(`
        CREATE TABLE IF NOT EXISTS beneficiary_verification_documents (
          id INT PRIMARY KEY AUTO_INCREMENT,
          beneficiary_id INT NOT NULL,
          document_type VARCHAR(100) NOT NULL,
          document_name VARCHAR(200) NOT NULL,
          file_path VARCHAR(500) NOT NULL,
          file_size INT,
          mime_type VARCHAR(100),
          is_verified BOOLEAN DEFAULT FALSE,
          verified_by INT NULL,
          verified_at TIMESTAMP NULL,
          verification_notes TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log('✅ beneficiary_verification_documents table created successfully');
    } catch (error) {
      console.error('❌ Error creating beneficiary_verification_documents table:', error.message);
    }

    // 4. Add verification_notes column to authorization_documents
    console.log('📝 Adding verification_notes to authorization_documents table...');
    try {
      await executeQuery(`
        ALTER TABLE authorization_documents
        ADD COLUMN verification_notes TEXT
      `);
      console.log('✅ authorization_documents verification_notes column added successfully');
    } catch (error) {
      if (error.message.includes('Duplicate column')) {
        console.log('⚠️  authorization_documents verification_notes column already exists');
      } else {
        console.error('❌ Error adding authorization_documents verification_notes column:', error.message);
      }
    }

    console.log('🎉 Migration completed successfully!');
    
    // Verify the changes
    console.log('\n🔍 Verifying migration results...');
    
    // Check document_beneficiaries columns
    const beneficiaryColumns = await executeQuery(`
      SHOW COLUMNS FROM document_beneficiaries 
      WHERE Field IN ('verification_image_path', 'verification_status', 'verified_by')
    `);
    console.log(`✅ document_beneficiaries: ${beneficiaryColumns.length} verification columns found`);
    
    // Check authorized_pickup_persons columns
    const pickupColumns = await executeQuery(`
      SHOW COLUMNS FROM authorized_pickup_persons 
      WHERE Field IN ('id_image_path', 'id_image_name', 'id_image_size')
    `);
    console.log(`✅ authorized_pickup_persons: ${pickupColumns.length} image columns found`);
    
    // Check beneficiary_verification_documents table
    const tables = await executeQuery(`
      SHOW TABLES LIKE 'beneficiary_verification_documents'
    `);
    console.log(`✅ beneficiary_verification_documents table: ${tables.length > 0 ? 'Found' : 'Not found'}`);

    console.log('\n🎯 Migration verification complete!');
    process.exit(0);

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runVerificationMigration();
