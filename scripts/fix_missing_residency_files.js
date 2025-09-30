const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function fixMissingResidencyFiles() {
  let connection;
  
  try {
    // Connect to database
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'barangay_management_system'
    });

    console.log('=== FIXING MISSING RESIDENCY FILES ===');
    
    // Get all residency documents
    const [documents] = await connection.execute(
      'SELECT * FROM residency_documents ORDER BY id'
    );
    
    console.log(`Found ${documents.length} residency documents in database`);
    
    const uploadsDir = path.join(__dirname, '../uploads/residency');
    
    // Ensure uploads directory exists
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('Created uploads/residency directory');
    }
    
    let fixedCount = 0;
    let deletedCount = 0;
    
    for (const doc of documents) {
      console.log(`\nProcessing document ${doc.id}:`);
      console.log(`  - Type: ${doc.document_type}`);
      console.log(`  - Name: ${doc.document_name}`);
      console.log(`  - Stored Path: ${doc.file_path}`);
      
      // Check if file exists at stored path
      let fileExists = false;
      let actualPath = null;
      
      // Try different possible paths
      const possiblePaths = [
        doc.file_path, // Original path
        path.join(uploadsDir, path.basename(doc.file_path)), // Just filename in uploads dir
        path.join(uploadsDir, doc.file_path) // Relative to uploads dir
      ];
      
      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          fileExists = true;
          actualPath = possiblePath;
          console.log(`  ✅ File found at: ${actualPath}`);
          break;
        }
      }
      
      if (!fileExists) {
        console.log(`  ❌ File not found in any location`);
        
        // Option 1: Create a placeholder file (for demo/testing purposes)
        const placeholderPath = path.join(uploadsDir, path.basename(doc.file_path));
        
        try {
          // Create a simple placeholder image (1x1 pixel PNG)
          const placeholderData = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x57, 0x63, 0xF8, 0x0F, 0x00, 0x00,
            0x01, 0x00, 0x01, 0x5C, 0xC2, 0x8A, 0xB8, 0x00, 0x00, 0x00, 0x00, 0x49,
            0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
          ]);
          
          fs.writeFileSync(placeholderPath, placeholderData);
          
          // Update database with correct path
          await connection.execute(
            'UPDATE residency_documents SET file_path = ? WHERE id = ?',
            [path.basename(doc.file_path), doc.id]
          );
          
          console.log(`  🔧 Created placeholder file and updated database path`);
          fixedCount++;
          
        } catch (error) {
          console.log(`  ❌ Failed to create placeholder: ${error.message}`);
          
          // Option 2: Delete the database entry if we can't fix it
          console.log(`  🗑️  Deleting database entry for missing file`);
          await connection.execute(
            'DELETE FROM residency_documents WHERE id = ?',
            [doc.id]
          );
          deletedCount++;
        }
      } else {
        // File exists, but check if path in database needs updating
        const correctPath = path.basename(actualPath);
        if (doc.file_path !== correctPath && path.isAbsolute(doc.file_path)) {
          await connection.execute(
            'UPDATE residency_documents SET file_path = ? WHERE id = ?',
            [correctPath, doc.id]
          );
          console.log(`  🔧 Updated database path to: ${correctPath}`);
          fixedCount++;
        }
      }
    }
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total documents processed: ${documents.length}`);
    console.log(`Files fixed/created: ${fixedCount}`);
    console.log(`Database entries deleted: ${deletedCount}`);
    console.log('✅ Fix completed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing residency files:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run the fix
fixMissingResidencyFiles();
