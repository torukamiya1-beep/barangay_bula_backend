const { executeQuery } = require('./src/config/database');

async function checkActivityData() {
  try {
    console.log('🔍 Checking activity logging data...');
    
    // Check request_status_history table
    const historyQuery = `
      SELECT 
        rsh.id,
        rsh.request_id,
        rsh.old_status_id,
        rsh.new_status_id,
        rsh.changed_by,
        rsh.changed_at,
        rsh.change_reason,
        old_rs.status_name as old_status,
        new_rs.status_name as new_status,
        dr.request_number,
        dt.type_name as document_type,
        CONCAT(aep.first_name, ' ', aep.last_name) as changed_by_name
      FROM request_status_history rsh
      LEFT JOIN request_status old_rs ON rsh.old_status_id = old_rs.id
      JOIN request_status new_rs ON rsh.new_status_id = new_rs.id
      JOIN document_requests dr ON rsh.request_id = dr.id
      JOIN document_types dt ON dr.document_type_id = dt.id
      LEFT JOIN admin_employee_accounts aea ON rsh.changed_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      ORDER BY rsh.changed_at DESC
      LIMIT 10
    `;
    
    const results = await executeQuery(historyQuery);
    console.log('📊 Request Status History Data:');
    console.log(JSON.stringify(results, null, 2));
    
    // Check admin accounts
    const adminQuery = `
      SELECT 
        aea.id,
        aea.username,
        aea.role,
        CONCAT(aep.first_name, ' ', aep.last_name) as full_name
      FROM admin_employee_accounts aea
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
    `;
    
    const admins = await executeQuery(adminQuery);
    console.log('👥 Admin Accounts:');
    console.log(JSON.stringify(admins, null, 2));
    
    // Test the activity log controller query
    console.log('🧪 Testing Activity Log Controller Query...');
    const controllerQuery = `
      SELECT 
        rsh.id,
        rsh.changed_at as timestamp,
        COALESCE(
          CONCAT(aep.first_name, ' ', aep.last_name),
          'System'
        ) as user_name,
        CASE 
          WHEN aep.id IS NOT NULL THEN 'Administrator'
          ELSE 'System'
        END as user_role,
        CASE 
          WHEN aep.id IS NOT NULL THEN 'admin'
          ELSE 'system'
        END as user_type,
        CONCAT(
          COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System'),
          ' changed status from "',
          COALESCE(old_rs.status_name, 'None'),
          '" to "',
          new_rs.status_name,
          '" for ',
          dt.type_name,
          ' request ',
          dr.request_number
        ) as activity,
        'status_change' as type,
        dt.type_name as document_type,
        new_rs.status_name as status_change,
        'N/A' as ip_address,
        CONCAT(
          'Request: ', dr.request_number, '\\n',
          'Document Type: ', dt.type_name, '\\n',
          'Client: ', COALESCE(CONCAT(cp.first_name, ' ', cp.last_name), 'Unknown'), '\\n',
          CASE 
            WHEN old_rs.status_name IS NOT NULL THEN 
              CONCAT('Status Changed: ', old_rs.status_name, ' → ', new_rs.status_name, '\\n')
            ELSE 
              CONCAT('Status Set: ', new_rs.status_name, '\\n')
          END,
          CASE 
            WHEN rsh.change_reason IS NOT NULL THEN 
              CONCAT('Reason: ', rsh.change_reason, '\\n')
            ELSE ''
          END,
          'Changed At: ', DATE_FORMAT(rsh.changed_at, '%Y-%m-%d %H:%i:%s'), '\\n',
          'Changed By: ', COALESCE(CONCAT(aep.first_name, ' ', aep.last_name), 'System')
        ) as details
      FROM request_status_history rsh
      JOIN document_requests dr ON rsh.request_id = dr.id
      JOIN document_types dt ON dr.document_type_id = dt.id
      LEFT JOIN request_status old_rs ON rsh.old_status_id = old_rs.id
      JOIN request_status new_rs ON rsh.new_status_id = new_rs.id
      LEFT JOIN admin_employee_accounts aea ON rsh.changed_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      LEFT JOIN client_accounts ca ON dr.client_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      ORDER BY rsh.changed_at DESC
      LIMIT 5
    `;
    
    const controllerResults = await executeQuery(controllerQuery);
    console.log('🎯 Activity Log Controller Results:');
    console.log(JSON.stringify(controllerResults, null, 2));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkActivityData();
