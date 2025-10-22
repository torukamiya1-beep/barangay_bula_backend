const { executeQuery, connectDatabase } = require('./src/config/database');

async function runMigration() {
  try {
    console.log('🚀 Starting database migration...\n');
    
    // 1. Modify supporting_documents table
    console.log('📝 [1/3] Modifying supporting_documents table...');
    try {
      await executeQuery(`
        ALTER TABLE supporting_documents
        ADD COLUMN verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER is_verified
      `);
      console.log('✅ Added verification_status column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('⚠️  verification_status column already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`
        ALTER TABLE supporting_documents
        ADD COLUMN account_id INT AFTER request_id
      `);
      console.log('✅ Added account_id column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('⚠️  account_id column already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`ALTER TABLE supporting_documents ADD INDEX idx_verification_status (verification_status)`);
      console.log('✅ Added idx_verification_status index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_verification_status index already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`ALTER TABLE supporting_documents ADD INDEX idx_account_id (account_id)`);
      console.log('✅ Added idx_account_id index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_account_id index already exists');
      } else throw e;
    }
    
    // Populate account_id
    const sdUpdate = await executeQuery(`
      UPDATE supporting_documents sd
      JOIN document_requests dr ON sd.request_id = dr.id
      SET sd.account_id = dr.client_id
      WHERE sd.account_id IS NULL
    `);
    console.log(`✅ Updated ${sdUpdate.affectedRows} supporting_documents records\n`);
    
    // 2. Modify authorization_documents table
    console.log('📝 [2/3] Modifying authorization_documents table...');
    try {
      await executeQuery(`
        ALTER TABLE authorization_documents
        ADD COLUMN verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' AFTER is_verified
      `);
      console.log('✅ Added verification_status column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('⚠️  verification_status column already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`
        ALTER TABLE authorization_documents
        ADD COLUMN account_id INT AFTER authorized_pickup_person_id
      `);
      console.log('✅ Added account_id column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('⚠️  account_id column already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`ALTER TABLE authorization_documents ADD INDEX idx_verification_status (verification_status)`);
      console.log('✅ Added idx_verification_status index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_verification_status index already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`ALTER TABLE authorization_documents ADD INDEX idx_account_id (account_id)`);
      console.log('✅ Added idx_account_id index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_account_id index already exists');
      } else throw e;
    }
    
    // Populate account_id
    const adUpdate = await executeQuery(`
      UPDATE authorization_documents ad
      JOIN authorized_pickup_persons app ON ad.authorized_pickup_person_id = app.id
      JOIN document_requests dr ON app.request_id = dr.id
      SET ad.account_id = dr.client_id
      WHERE ad.account_id IS NULL
    `);
    console.log(`✅ Updated ${adUpdate.affectedRows} authorization_documents records\n`);
    
    // 3. Modify document_beneficiaries table
    console.log('📝 [3/3] Modifying document_beneficiaries table...');
    try {
      await executeQuery(`
        ALTER TABLE document_beneficiaries
        ADD COLUMN account_id INT AFTER request_id
      `);
      console.log('✅ Added account_id column');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('⚠️  account_id column already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`ALTER TABLE document_beneficiaries ADD INDEX idx_account_id (account_id)`);
      console.log('✅ Added idx_account_id index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_account_id index already exists');
      } else throw e;
    }
    
    try {
      await executeQuery(`ALTER TABLE document_beneficiaries ADD INDEX idx_verification_status (verification_status)`);
      console.log('✅ Added idx_verification_status index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_verification_status index already exists');
      } else throw e;
    }
    
    // Populate account_id
    const dbUpdate = await executeQuery(`
      UPDATE document_beneficiaries db
      JOIN document_requests dr ON db.request_id = dr.id
      SET db.account_id = dr.client_id
      WHERE db.account_id IS NULL
    `);
    console.log(`✅ Updated ${dbUpdate.affectedRows} document_beneficiaries records\n`);
    
    // Verify
    console.log('📊 Verifying migration...\n');
    const sd = await executeQuery('DESCRIBE supporting_documents');
    const hasSDVerification = sd.some(c => c.Field === 'verification_status');
    const hasSDAccount = sd.some(c => c.Field === 'account_id');
    console.log(`supporting_documents: verification_status=${hasSDVerification}, account_id=${hasSDAccount}`);
    
    const ad = await executeQuery('DESCRIBE authorization_documents');
    const hasADVerification = ad.some(c => c.Field === 'verification_status');
    const hasADAccount = ad.some(c => c.Field === 'account_id');
    console.log(`authorization_documents: verification_status=${hasADVerification}, account_id=${hasADAccount}`);
    
    const db = await executeQuery('DESCRIBE document_beneficiaries');
    const hasDBAccount = db.some(c => c.Field === 'account_id');
    const hasDBVerification = db.some(c => c.Field === 'verification_status');
    console.log(`document_beneficiaries: verification_status=${hasDBVerification}, account_id=${hasDBAccount}`);
    
    console.log('\n🎉 LOCAL DATABASE MIGRATION COMPLETED SUCCESSFULLY!\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

connectDatabase()
  .then(() => {
    console.log('✅ Connected to LOCAL database\n');
    return runMigration();
  })
  .catch(error => {
    console.error('❌ Failed to connect:', error);
    process.exit(1);
  });
