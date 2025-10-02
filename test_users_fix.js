const userServiceNew = require('./src/services/userServiceNew');

async function testUsersFix() {
  try {
    console.log('🧪 Testing users service fix...');
    console.log('');

    // Test 1: Get all users without filters
    console.log('1. Testing getAllUsers without filters...');
    try {
      const result1 = await userServiceNew.getAllUsers(1, 5, {});
      console.log('✅ getAllUsers without filters works!');
      console.log(`   Found ${result1.data.users.length} users`);
      console.log(`   Total: ${result1.data.pagination.total}`);
    } catch (error) {
      console.log('❌ getAllUsers without filters failed:', error.message);
    }

    // Test 2: Get all users with search filter
    console.log('\n2. Testing getAllUsers with search filter...');
    try {
      const result2 = await userServiceNew.getAllUsers(1, 5, { search: 'admin' });
      console.log('✅ getAllUsers with search filter works!');
      console.log(`   Found ${result2.data.users.length} users`);
      console.log(`   Total: ${result2.data.pagination.total}`);
    } catch (error) {
      console.log('❌ getAllUsers with search filter failed:', error.message);
    }

    // Test 3: Get all users with role filter
    console.log('\n3. Testing getAllUsers with role filter...');
    try {
      const result3 = await userServiceNew.getAllUsers(1, 5, { role: 'admin' });
      console.log('✅ getAllUsers with role filter works!');
      console.log(`   Found ${result3.data.users.length} users`);
      console.log(`   Total: ${result3.data.pagination.total}`);
    } catch (error) {
      console.log('❌ getAllUsers with role filter failed:', error.message);
    }

    // Test 4: Get all users with status filter
    console.log('\n4. Testing getAllUsers with status filter...');
    try {
      const result4 = await userServiceNew.getAllUsers(1, 5, { is_active: true });
      console.log('✅ getAllUsers with status filter works!');
      console.log(`   Found ${result4.data.users.length} users`);
      console.log(`   Total: ${result4.data.pagination.total}`);
    } catch (error) {
      console.log('❌ getAllUsers with status filter failed:', error.message);
    }

    // Test 5: Get archived users
    console.log('\n5. Testing getArchivedUsers...');
    try {
      const result5 = await userServiceNew.getArchivedUsers(1, 5, {});
      console.log('✅ getArchivedUsers works!');
      console.log(`   Found ${result5.data.length} archived users`);
      console.log(`   Total: ${result5.pagination.total}`);
    } catch (error) {
      console.log('❌ getArchivedUsers failed:', error.message);
    }

    console.log('\n🎉 Users service testing completed!');
    
  } catch (error) {
    console.error('❌ Users service testing failed:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  }
}

// Run the test
if (require.main === module) {
  testUsersFix()
    .then(() => {
      console.log('🎊 Users service testing completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Users service testing failed:', error.message);
      process.exit(1);
    });
}

module.exports = { testUsersFix };
