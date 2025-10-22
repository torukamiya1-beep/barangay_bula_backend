const mysql = require('mysql2/promise');

async function runRailwayMigration() {
  let connection;
  
  try {
    console.log('🚂 Connecting to Railway MySQL database...\n');
    
    connection = await mysql.createConnection({
      host: 'hopper.proxy.rlwy.net',
      port: 26646,
      user: 'root',
      password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
      database: 'railway'
    });
    
    console.log('✅ Connected to Railway database\n');
    console.log('🚀 Starting database migration...\n');
    
    // 1. Modify supporting_documents table
    console.log('📝 [1/3] Modifying supporting_documents table...');
    try {
      await connection.query(`
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
      await connection.query(`
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
      await connection.query(`ALTER TABLE supporting_documents ADD INDEX idx_verification_status (verification_status)`);
      console.log('✅ Added idx_verification_status index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_verification_status index already exists');
      } else throw e;
    }
    
    try {
      await connection.query(`ALTER TABLE supporting_documents ADD INDEX idx_account_id (account_id)`);
      console.log('✅ Added idx_account_id index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_account_id index already exists');
      } else throw e;
    }
    
    // Populate account_id
    const [sdUpdate] = await connection.query(`
      UPDATE supporting_documents sd
      JOIN document_requests dr ON sd.request_id = dr.id
      SET sd.account_id = dr.client_id
      WHERE sd.account_id IS NULL
    `);
    console.log(`✅ Updated ${sdUpdate.affectedRows} supporting_documents records\n`);
    
    // 2. Modify authorization_documents table
    console.log('📝 [2/3] Modifying authorization_documents table...');
    try {
      await connection.query(`
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
      await connection.query(`
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
      await connection.query(`ALTER TABLE authorization_documents ADD INDEX idx_verification_status (verification_status)`);
      console.log('✅ Added idx_verification_status index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_verification_status index already exists');
      } else throw e;
    }
    
    try {
      await connection.query(`ALTER TABLE authorization_documents ADD INDEX idx_account_id (account_id)`);
      console.log('✅ Added idx_account_id index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_account_id index already exists');
      } else throw e;
    }
    
    // Populate account_id
    const [adUpdate] = await connection.query(`
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
      await connection.query(`
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
      await connection.query(`ALTER TABLE document_beneficiaries ADD INDEX idx_account_id (account_id)`);
      console.log('✅ Added idx_account_id index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_account_id index already exists');
      } else throw e;
    }
    
    try {
      await connection.query(`ALTER TABLE document_beneficiaries ADD INDEX idx_verification_status (verification_status)`);
      console.log('✅ Added idx_verification_status index');
    } catch (e) {
      if (e.message.includes('Duplicate key')) {
        console.log('⚠️  idx_verification_status index already exists');
      } else throw e;
    }
    
    // Populate account_id
    const [dbUpdate] = await connection.query(`
      UPDATE document_beneficiaries db
      JOIN document_requests dr ON db.request_id = dr.id
      SET db.account_id = dr.client_id
      WHERE db.account_id IS NULL
    `);
    console.log(`✅ Updated ${dbUpdate.affectedRows} document_beneficiaries records\n`);
    
    // Verify
    console.log('📊 Verifying migration...\n');
    const [sd] = await connection.query('DESCRIBE supporting_documents');
    const hasSDVerification = sd.some(c => c.Field === 'verification_status');
    const hasSDAccount = sd.some(c => c.Field === 'account_id');
    console.log(`supporting_documents: verification_status=${hasSDVerification}, account_id=${hasSDAccount}`);
    
    const [ad] = await connection.query('DESCRIBE authorization_documents');
    const hasADVerification = ad.some(c => c.Field === 'verification_status');
    const hasADAccount = ad.some(c => c.Field === 'account_id');
    console.log(`authorization_documents: verification_status=${hasADVerification}, account_id=${hasADAccount}`);
    
    const [db] = await connection.query('DESCRIBE document_beneficiaries');
    const hasDBAccount = db.some(c => c.Field === 'account_id');
    const hasDBVerification = db.some(c => c.Field === 'verification_status');
    console.log(`document_beneficiaries: verification_status=${hasDBVerification}, account_id=${hasDBAccount}`);
    
    console.log('\n🎉 RAILWAY DATABASE MIGRATION COMPLETED SUCCESSFULLY!\n');
    
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Railway migration failed:', error.message);
    console.error(error);
    if (connection) await connection.end();
    process.exit(1);
  }
}

runRailwayMigration();
