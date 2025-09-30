/**
 * Ensure Upload Directories Script
 * 
 * This script ensures that all required upload directories exist.
 * It should be run on application startup, especially in production environments
 * like Railway where the filesystem might be ephemeral.
 * 
 * Usage: node scripts/ensure-upload-directories.js
 * Or: require('./scripts/ensure-upload-directories') in server.js
 */

const fs = require('fs');
const path = require('path');

// Define all required upload directories
const UPLOAD_DIRECTORIES = [
  'uploads',
  'uploads/documents',
  'uploads/residency',
  'uploads/verification',
  'uploads/temp'
];

/**
 * Create a directory if it doesn't exist
 * @param {string} dirPath - Path to the directory
 */
function ensureDirectoryExists(dirPath) {
  const fullPath = path.join(process.cwd(), dirPath);
  
  if (!fs.existsSync(fullPath)) {
    try {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`✅ Created directory: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Failed to create directory ${dirPath}:`, error.message);
      throw error;
    }
  } else {
    console.log(`✓ Directory exists: ${dirPath}`);
  }
}

/**
 * Create .gitkeep file in a directory
 * @param {string} dirPath - Path to the directory
 */
function createGitkeep(dirPath) {
  const fullPath = path.join(process.cwd(), dirPath, '.gitkeep');
  
  if (!fs.existsSync(fullPath)) {
    try {
      fs.writeFileSync(fullPath, '');
      console.log(`✅ Created .gitkeep in: ${dirPath}`);
    } catch (error) {
      console.error(`❌ Failed to create .gitkeep in ${dirPath}:`, error.message);
    }
  }
}

/**
 * Verify directory is writable
 * @param {string} dirPath - Path to the directory
 */
function verifyWritable(dirPath) {
  const fullPath = path.join(process.cwd(), dirPath);
  const testFile = path.join(fullPath, '.write-test');
  
  try {
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    console.log(`✓ Directory is writable: ${dirPath}`);
    return true;
  } catch (error) {
    console.error(`❌ Directory is NOT writable: ${dirPath}`, error.message);
    return false;
  }
}

/**
 * Main function to ensure all upload directories
 */
function ensureUploadDirectories() {
  console.log('\n🔧 Ensuring upload directories exist...\n');
  
  let allSuccess = true;
  
  UPLOAD_DIRECTORIES.forEach(dir => {
    try {
      ensureDirectoryExists(dir);
      createGitkeep(dir);
      
      if (!verifyWritable(dir)) {
        allSuccess = false;
      }
    } catch (error) {
      console.error(`❌ Error processing directory ${dir}:`, error.message);
      allSuccess = false;
    }
  });
  
  console.log('\n' + '='.repeat(50));
  
  if (allSuccess) {
    console.log('✅ All upload directories are ready!');
    console.log('='.repeat(50) + '\n');
    return true;
  } else {
    console.error('❌ Some directories failed verification!');
    console.log('='.repeat(50) + '\n');
    return false;
  }
}

/**
 * Get upload directory statistics
 */
function getUploadStats() {
  console.log('\n📊 Upload Directory Statistics:\n');
  
  UPLOAD_DIRECTORIES.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    
    if (fs.existsSync(fullPath)) {
      try {
        const files = fs.readdirSync(fullPath);
        const fileCount = files.filter(f => f !== '.gitkeep').length;
        const totalSize = files
          .filter(f => f !== '.gitkeep')
          .reduce((acc, file) => {
            try {
              const stats = fs.statSync(path.join(fullPath, file));
              return acc + stats.size;
            } catch {
              return acc;
            }
          }, 0);
        
        const sizeInMB = (totalSize / (1024 * 1024)).toFixed(2);
        console.log(`  ${dir}:`);
        console.log(`    Files: ${fileCount}`);
        console.log(`    Size: ${sizeInMB} MB`);
      } catch (error) {
        console.log(`  ${dir}: Error reading directory`);
      }
    } else {
      console.log(`  ${dir}: Does not exist`);
    }
  });
  
  console.log('');
}

// Run if executed directly
if (require.main === module) {
  const success = ensureUploadDirectories();
  getUploadStats();
  
  process.exit(success ? 0 : 1);
}

// Export for use in other modules
module.exports = {
  ensureUploadDirectories,
  ensureDirectoryExists,
  getUploadStats,
  UPLOAD_DIRECTORIES
};

