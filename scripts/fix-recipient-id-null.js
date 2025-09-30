const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function fixRecipientIdColumn() {
  let connection;
  
  try {
    console.log('🔄 Connecting to database...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Database connected successfully');

    // Check current column definition
    console.log('\n🔄 Checking current recipient_id column definition...');
    const [columns] = await connection.execute("DESCRIBE notifications");
    const recipientIdColumn = columns.find(col => col.Field === 'recipient_id');
    
    if (recipientIdColumn) {
      console.log(`📋 Current recipient_id: ${recipientIdColumn.Type} ${recipientIdColumn.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      
      if (recipientIdColumn.Null === 'NO') {
        console.log('🔄 Modifying recipient_id column to allow NULL values...');
        
        await connection.execute(`
          ALTER TABLE notifications 
          MODIFY COLUMN recipient_id INT(11) NULL
        `);
        
        console.log('✅ recipient_id column modified to allow NULL values');
      } else {
        console.log('✅ recipient_id column already allows NULL values');
      }
    } else {
      console.log('❌ recipient_id column not found');
    }

    // Verify the change
    console.log('\n🔄 Verifying column modification...');
    const [updatedColumns] = await connection.execute("DESCRIBE notifications");
    const updatedRecipientIdColumn = updatedColumns.find(col => col.Field === 'recipient_id');
    
    if (updatedRecipientIdColumn) {
      console.log(`📋 Updated recipient_id: ${updatedRecipientIdColumn.Type} ${updatedRecipientIdColumn.Null === 'NO' ? 'NOT NULL' : 'NULL'}`);
      
      if (updatedRecipientIdColumn.Null === 'YES') {
        console.log('✅ Column modification successful');
      } else {
        console.log('❌ Column modification failed');
      }
    }

    console.log('\n🎉 recipient_id column fix completed!');
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Database connection closed');
    }
  }
}

// Run fix
if (require.main === module) {
  fixRecipientIdColumn()
    .then(() => {
      console.log('🎉 Fix script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fix script failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fixRecipientIdColumn };
