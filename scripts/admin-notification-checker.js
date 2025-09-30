const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'barangay_management_system',
  port: process.env.DB_PORT || 3306
};

async function checkAdminNotifications() {
  let connection;
  
  try {
    console.log('🔔 Admin Notification Checker\n');

    connection = await mysql.createConnection(dbConfig);

    // Get all admin notifications
    console.log('📋 Recent Admin Notifications:');
    const [notifications] = await connection.execute(`
      SELECT 
        n.id,
        n.recipient_id,
        n.title,
        n.message,
        n.created_at,
        n.is_read,
        aea.username as admin_username,
        JSON_EXTRACT(n.data, '$.request_number') as request_number,
        JSON_EXTRACT(n.data, '$.document_type') as document_type,
        JSON_EXTRACT(n.data, '$.client_name') as client_name
      FROM notifications n
      LEFT JOIN admin_employee_accounts aea ON n.recipient_id = aea.id
      WHERE n.recipient_type = 'admin' AND n.type = 'new_request'
      ORDER BY n.created_at DESC
      LIMIT 10
    `);

    if (notifications.length === 0) {
      console.log('📭 No admin notifications found.');
    } else {
      notifications.forEach((notif, index) => {
        const status = notif.is_read ? '✅ Read' : '🔔 Unread';
        console.log(`\n${index + 1}. ${status} - Notification ID: ${notif.id}`);
        console.log(`   👤 Admin: ${notif.admin_username} (ID: ${notif.recipient_id})`);
        console.log(`   📄 Request: ${notif.request_number} (${notif.document_type})`);
        console.log(`   👥 Client: ${notif.client_name}`);
        console.log(`   📅 Created: ${notif.created_at}`);
        console.log(`   💬 Message: ${notif.message}`);
      });
    }

    // Get summary statistics
    console.log('\n📊 Notification Statistics:');
    const [stats] = await connection.execute(`
      SELECT 
        COUNT(*) as total_notifications,
        SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread_count,
        SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count
      FROM notifications 
      WHERE recipient_type = 'admin' AND type = 'new_request'
    `);

    if (stats.length > 0) {
      const stat = stats[0];
      console.log(`   📈 Total Admin Notifications: ${stat.total_notifications}`);
      console.log(`   🔔 Unread: ${stat.unread_count}`);
      console.log(`   ✅ Read: ${stat.read_count}`);
    }

    // Get active admins
    console.log('\n👥 Active Admins:');
    const [admins] = await connection.execute(`
      SELECT id, username, role, status FROM admin_employee_accounts WHERE status = 'active'
    `);

    admins.forEach(admin => {
      console.log(`   - ${admin.username} (ID: ${admin.id}, Role: ${admin.role})`);
    });

    // Get recent document requests
    console.log('\n📄 Recent Document Requests:');
    const [requests] = await connection.execute(`
      SELECT 
        dr.id,
        dr.request_number,
        dt.type_name,
        cp.first_name,
        cp.last_name,
        dr.created_at,
        rs.status_name
      FROM document_requests dr
      JOIN document_types dt ON dr.document_type_id = dt.id
      JOIN client_profiles cp ON dr.client_id = cp.account_id
      JOIN request_status rs ON dr.status_id = rs.id
      ORDER BY dr.created_at DESC
      LIMIT 5
    `);

    requests.forEach((req, index) => {
      console.log(`   ${index + 1}. ${req.request_number} - ${req.type_name}`);
      console.log(`      Client: ${req.first_name} ${req.last_name}`);
      console.log(`      Status: ${req.status_name}`);
      console.log(`      Created: ${req.created_at}`);
    });

    console.log('\n🎉 Admin notification check completed!');

  } catch (error) {
    console.error('❌ Error checking notifications:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run checker
if (require.main === module) {
  checkAdminNotifications()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Checker failed:', error.message);
      process.exit(1);
    });
}

module.exports = { checkAdminNotifications };
