const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const http = require('http');

async function comprehensiveResidencyFix() {
  let connection;
  
  try {
    console.log('🚀 STARTING COMPREHENSIVE RESIDENCY FIX');
    
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'barangay_management_system'
    });

    console.log('✅ Database connected');

    // Step 1: Verify file paths in database
    console.log('\n📋 STEP 1: Verifying database file paths');
    const [documents] = await connection.execute(
      'SELECT id, account_id, file_path FROM residency_documents ORDER BY id'
    );
    
    console.log(`Found ${documents.length} documents in database`);
    
    let pathsFixed = 0;
    const uploadsDir = path.join(process.cwd(), 'uploads', 'residency');
    
    for (const doc of documents) {
      const currentPath = doc.file_path;
      const filename = path.basename(currentPath);
      const fullPath = path.join(uploadsDir, filename);
      
      if (fs.existsSync(fullPath)) {
        if (currentPath !== filename) {
          // Update database to store only filename
          await connection.execute(
            'UPDATE residency_documents SET file_path = ? WHERE id = ?',
            [filename, doc.id]
          );
          console.log(`✅ Updated path for document ${doc.id}: ${filename}`);
          pathsFixed++;
        } else {
          console.log(`✅ Document ${doc.id} path already correct: ${filename}`);
        }
      } else {
        console.log(`❌ File missing for document ${doc.id}: ${fullPath}`);
      }
    }
    
    console.log(`📊 Paths fixed: ${pathsFixed}`);

    // Step 2: Test backend API
    console.log('\n🔧 STEP 2: Testing backend API');
    
    // Get admin user for testing
    const [adminRows] = await connection.execute(
      'SELECT id FROM admin_employee_accounts WHERE role = "admin" LIMIT 1'
    );
    
    const adminId = adminRows.length > 0 ? adminRows[0].id : 1;
    
    // Create JWT token
    const token = jwt.sign(
      { id: adminId, type: 'admin' }, 
      'your_super_secret_jwt_key_here_make_it_long_and_complex',
      { expiresIn: '1h' }
    );
    
    // Test API endpoint
    const testDocumentId = documents.length > 0 ? documents[0].id : 1;
    
    await new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 7000,
        path: `/api/residency/documents/${testDocumentId}/file`,
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        timeout: 5000
      };

      const req = http.request(options, (res) => {
        console.log(`📡 API Test - Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          console.log('✅ Backend API working correctly!');
        } else {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            console.log('❌ API Error:', data);
          });
        }
        resolve();
      });

      req.on('error', (e) => {
        console.log('❌ API Request failed:', e.message);
        resolve();
      });

      req.on('timeout', () => {
        console.log('❌ API Request timed out');
        req.destroy();
        resolve();
      });

      req.end();
    });

    // Step 3: Verify file system
    console.log('\n📁 STEP 3: Verifying file system');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory');
    }
    
    const files = fs.readdirSync(uploadsDir);
    console.log(`📊 Files in uploads directory: ${files.length}`);
    
    // Step 4: Database integrity check
    console.log('\n🔍 STEP 4: Database integrity check');
    
    const [orphanedFiles] = await connection.execute(`
      SELECT file_path FROM residency_documents 
      WHERE account_id NOT IN (SELECT id FROM client_accounts)
    `);
    
    if (orphanedFiles.length > 0) {
      console.log(`⚠️  Found ${orphanedFiles.length} documents with invalid account_id`);
    } else {
      console.log('✅ All documents have valid account references');
    }

    // Step 5: Generate summary report
    console.log('\n📊 COMPREHENSIVE FIX SUMMARY');
    console.log('================================');
    console.log(`Total documents: ${documents.length}`);
    console.log(`Paths fixed: ${pathsFixed}`);
    console.log(`Files in directory: ${files.length}`);
    console.log(`Orphaned documents: ${orphanedFiles.length}`);
    
    // Step 6: Test specific user documents
    console.log('\n👤 STEP 6: Testing user 32 documents');
    const [userDocs] = await connection.execute(
      'SELECT id, file_path FROM residency_documents WHERE account_id = 32'
    );
    
    console.log(`User 32 has ${userDocs.length} documents:`);
    userDocs.forEach((doc, index) => {
      const fullPath = path.join(uploadsDir, doc.file_path);
      const exists = fs.existsSync(fullPath);
      console.log(`  ${index + 1}. Document ${doc.id}: ${doc.file_path} - ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
    });

    console.log('\n🎉 COMPREHENSIVE FIX COMPLETED!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error(error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the comprehensive fix
comprehensiveResidencyFix();
