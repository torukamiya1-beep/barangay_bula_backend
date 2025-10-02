const mysql = require('mysql2/promise');

// New Railway MySQL Database Credentials
const dbConfig = {
  host: 'hopper.proxy.rlwy.net',
  port: 26646,
  user: 'root',
  password: 'dasVQZoBXReQsCsiaEsOQvPfMuyXwjNh',
  database: 'railway'
};

async function checkDocumentBeneficiariesStructure() {
  let connection;
  
  try {
    console.log('🔍 Checking document_beneficiaries table structure...');
    console.log('');

    // Connect to database
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Connected to Railway database');

    // Check table structure
    console.log('\n📋 Table structure for document_beneficiaries:');
    const [columns] = await connection.execute('DESCRIBE document_beneficiaries');
    
    columns.forEach((column, index) => {
      console.log(`  ${index + 1}. ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
    });

    // Check sample data
    console.log('\n📄 Sample data from document_beneficiaries:');
    const [sampleData] = await connection.execute('SELECT * FROM document_beneficiaries LIMIT 3');
    
    if (sampleData.length > 0) {
      console.log('Sample records:');
      sampleData.forEach((record, index) => {
        console.log(`\n  Record ${index + 1}:`);
        Object.keys(record).forEach(key => {
          console.log(`    ${key}: ${record[key]}`);
        });
      });
    } else {
      console.log('No sample data found');
    }

    // Also check authorized_pickup_persons structure
    console.log('\n📋 Table structure for authorized_pickup_persons:');
    const [appColumns] = await connection.execute('DESCRIBE authorized_pickup_persons');
    
    appColumns.forEach((column, index) => {
      console.log(`  ${index + 1}. ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
    });

    // Check sample data for authorized_pickup_persons
    console.log('\n📄 Sample data from authorized_pickup_persons:');
    const [appSampleData] = await connection.execute('SELECT * FROM authorized_pickup_persons LIMIT 3');
    
    if (appSampleData.length > 0) {
      console.log('Sample records:');
      appSampleData.forEach((record, index) => {
        console.log(`\n  Record ${index + 1}:`);
        Object.keys(record).forEach(key => {
          console.log(`    ${key}: ${record[key]}`);
        });
      });
    } else {
      console.log('No sample data found');
    }

    console.log('\n🎉 Structure check completed!');
    
  } catch (error) {
    console.error('❌ Structure check failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run the check
if (require.main === module) {
  checkDocumentBeneficiariesStructure()
    .then(() => {
      console.log('🎊 Structure check completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Structure check failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkDocumentBeneficiariesStructure };
