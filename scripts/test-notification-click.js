const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'barangay_management_system'
};

async function testNotificationClick() {
  let connection;
  
  try {
    console.log('🔔 Testing Notification Click Handling\n');

    connection = await mysql.createConnection(dbConfig);

    // 1. Check if we have any new_client_registration notifications
    console.log('📋 Checking for new_client_registration notifications:');
    const [notifications] = await connection.execute(`
      SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.created_at,
        n.is_read
      FROM notifications n
      WHERE n.type = 'new_client_registration' AND n.recipient_type = 'admin'
      ORDER BY n.created_at DESC
      LIMIT 5
    `);

    if (notifications.length === 0) {
      console.log('❌ No new_client_registration notifications found');
      console.log('Creating a test notification...\n');
      
      // Create a test notification
      const testClientId = 33; // Using our test client
      const [clientData] = await connection.execute(`
        SELECT ca.id, ca.username, cp.first_name, cp.last_name, cp.email
        FROM client_accounts ca
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE ca.id = ?
      `, [testClientId]);

      if (clientData.length === 0) {
        console.log('❌ Test client not found');
        return;
      }

      const client = clientData[0];
      const clientName = `${client.first_name} ${client.last_name}`;

      await connection.execute(`
        INSERT INTO notifications (
          recipient_id, recipient_type, type, title, message, data, priority, created_at
        ) VALUES (
          NULL, 'admin', 'new_client_registration', 'New Client Registration',
          ?, ?, 'normal', NOW()
        )
      `, [
        `${clientName} (${client.email}) has registered and needs residency verification.`,
        JSON.stringify({
          client_id: client.id,
          client_name: clientName,
          client_email: client.email,
          client_username: client.username,
          registration_date: new Date().toISOString()
        })
      ]);

      console.log('✅ Test notification created');
      
      // Fetch the created notification
      const [newNotifications] = await connection.execute(`
        SELECT 
          n.id,
          n.type,
          n.title,
          n.message,
          n.data,
          n.created_at,
          n.is_read
        FROM notifications n
        WHERE n.type = 'new_client_registration' AND n.recipient_type = 'admin'
        ORDER BY n.created_at DESC
        LIMIT 1
      `);
      
      notifications.push(...newNotifications);
    }

    console.log(`Found ${notifications.length} new_client_registration notifications:`);
    notifications.forEach((notif, index) => {
      const data = JSON.parse(notif.data || '{}');
      console.log(`${index + 1}. ID: ${notif.id}`);
      console.log(`   Title: ${notif.title}`);
      console.log(`   Client ID: ${data.client_id}`);
      console.log(`   Client Name: ${data.client_name}`);
      console.log(`   Created: ${notif.created_at}`);
      console.log(`   Read: ${notif.is_read ? 'Yes' : 'No'}`);
      console.log('');
    });

    // 2. Test the notification click flow
    if (notifications.length > 0) {
      const testNotification = notifications[0];
      const data = JSON.parse(testNotification.data || '{}');
      
      console.log('🧪 Testing notification click flow:');
      console.log(`- Notification Type: ${testNotification.type}`);
      console.log(`- Should handle as: user_registration/new_user/new_client_registration`);
      console.log(`- Client ID from data: ${data.client_id}`);
      console.log(`- Expected navigation: Open user modal for client ID ${data.client_id}`);
      console.log('');

      // 3. Verify the client exists
      const [clientCheck] = await connection.execute(`
        SELECT ca.id, ca.username, ca.status, cp.first_name, cp.last_name
        FROM client_accounts ca
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE ca.id = ?
      `, [data.client_id]);

      if (clientCheck.length > 0) {
        const client = clientCheck[0];
        console.log('✅ Client exists and can be opened in modal:');
        console.log(`   - ID: ${client.id}`);
        console.log(`   - Username: ${client.username}`);
        console.log(`   - Name: ${client.first_name} ${client.last_name}`);
        console.log(`   - Status: ${client.status}`);
      } else {
        console.log('❌ Client not found - notification click would fail');
      }
    }

    console.log('\n🎯 Expected Behavior:');
    console.log('1. Admin clicks on new_client_registration notification');
    console.log('2. AdminNotifications.handleNotificationClick() is called');
    console.log('3. navigateToRelevantPage() determines type is new_client_registration');
    console.log('4. handleUserNavigation() is called with client_id');
    console.log('5. openUserDetailsModal() emits open-user-modal event');
    console.log('6. AdminHeader.handleOpenUserModal() forwards to AdminUsers');
    console.log('7. AdminUsers.handleOpenUserModal() opens user details modal');
    console.log('8. User details modal shows client information');

    await connection.end();

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (connection) await connection.end();
  }
}

testNotificationClick();
