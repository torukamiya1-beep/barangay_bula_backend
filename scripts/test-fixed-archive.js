const UserService = require('../src/services/userServiceNew');

async function testFixedArchive() {
  try {
    console.log('🧪 Testing Fixed Archive Query');
    
    const result = await UserService.getArchivedUsers(1, 10, {});
    console.log('Archive query result:', result);
    
    if (result.success) {
      console.log(`✅ Found ${result.data.length} archived users`);
      result.data.forEach(user => {
        console.log(`   - ${user.full_name} (@${user.username}) - ${user.type}`);
      });
      
      console.log('\n📊 Pagination info:');
      console.log(`   Page: ${result.pagination.page}`);
      console.log(`   Total: ${result.pagination.total}`);
      console.log(`   Total Pages: ${result.pagination.totalPages}`);
      
    } else {
      console.log('❌ Archive query failed:', result.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFixedArchive();
