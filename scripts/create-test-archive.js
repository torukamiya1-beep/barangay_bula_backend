const UserService = require('../src/services/userServiceNew');

async function createTestArchive() {
  try {
    console.log('🧪 Creating Test Archived User');
    
    // Delete a client user for testing
    const result = await UserService.deleteUser('client_12');
    console.log('Delete result:', result);
    
    // Test archive query again
    const archiveResult = await UserService.getArchivedUsers(1, 10, {});
    console.log(`Archive now has ${archiveResult.data.length} users`);
    
    if (archiveResult.data.length > 0) {
      console.log('Archived users:');
      archiveResult.data.forEach(user => {
        console.log(`   - ${user.full_name} (@${user.username}) - ${user.type}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createTestArchive();
