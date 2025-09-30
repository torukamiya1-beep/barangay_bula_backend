const { executeQuery } = require('../config/database');

class DatabaseUtils {
  // Check if database tables exist
  static async checkTables() {
    try {
      console.log('🔄 Checking database tables...');

      // Check if our main tables exist
      const tables = [
        'civil_status',
        'document_types',
        'request_status',
        'purpose_categories',
        'admin_employee_accounts',
        'admin_employee_profiles',
        'client_accounts',
        'client_profiles',
        'document_requests'
      ];

      const tableChecks = [];
      for (const table of tables) {
        try {
          const query = `SELECT COUNT(*) as count FROM ${table} LIMIT 1`;
          const result = await executeQuery(query);
          tableChecks.push({ table, exists: true, count: result[0].count });
        } catch (error) {
          tableChecks.push({ table, exists: false, error: error.message });
        }
      }

      console.log('✅ Database table check completed');
      return tableChecks;
    } catch (error) {
      console.error('❌ Error checking database tables:', error);
      throw error;
    }
  }

  // Initialize database (this assumes tables are already created via SQL import)
  static async initializeTables() {
    try {
      console.log('🔄 Verifying database structure...');

      const tableStatus = await this.checkTables();
      const missingTables = tableStatus.filter(t => !t.exists);

      if (missingTables.length > 0) {
        console.log('⚠️  Missing tables detected:');
        missingTables.forEach(t => console.log(`   - ${t.table}`));
        console.log('📝 Please import the barangay_database_complete.sql file first');
        return false;
      }

      console.log('✅ All required tables are present');
      return true;
    } catch (error) {
      console.error('❌ Error initializing database tables:', error);
      throw error;
    }
  }

  // Check if default admin exists
  static async checkDefaultAdmin() {
    try {
      const adminQuery = 'SELECT COUNT(*) as count FROM admin_employee_accounts WHERE role = "admin"';
      const result = await executeQuery(adminQuery);

      if (result[0].count === 0) {
        console.log('⚠️  No admin accounts found');
        console.log('📝 Default admin should be created via SQL import');
        console.log('🔑 Default login: username=admin, password=admin123');
        return false;
      } else {
        console.log('✅ Admin accounts found');
        console.log('� Default login: username=admin, password=admin123');
        return true;
      }
    } catch (error) {
      console.error('❌ Error checking admin accounts:', error);
      throw error;
    }
  }

  // Setup database with tables and default data
  static async setupDatabase() {
    try {
      const tablesOk = await this.initializeTables();
      if (tablesOk) {
        await this.checkDefaultAdmin();
        console.log('🎉 Database setup completed successfully');
      } else {
        console.log('⚠️  Database setup incomplete - please import SQL file first');
      }
    } catch (error) {
      console.error('❌ Database setup failed:', error);
      throw error;
    }
  }

  // Check database health
  static async checkHealth() {
    try {
      await executeQuery('SELECT 1');
      return { status: 'healthy', message: 'Database connection is working' };
    } catch (error) {
      return { status: 'unhealthy', message: error.message };
    }
  }

  // Get database statistics
  static async getStats() {
    try {
      // Get statistics from our barangay management system tables
      const queries = {
        total_clients: 'SELECT COUNT(*) as count FROM client_accounts',
        active_clients: 'SELECT COUNT(*) as count FROM client_accounts WHERE status = "active"',
        total_employees: 'SELECT COUNT(*) as count FROM admin_employee_accounts',
        admin_count: 'SELECT COUNT(*) as count FROM admin_employee_accounts WHERE role = "admin"',
        total_requests: 'SELECT COUNT(*) as count FROM document_requests',
        pending_requests: 'SELECT COUNT(*) as count FROM document_requests dr JOIN request_status rs ON dr.status_id = rs.id WHERE rs.status_name = "pending"',
        completed_requests: 'SELECT COUNT(*) as count FROM document_requests dr JOIN request_status rs ON dr.status_id = rs.id WHERE rs.status_name = "completed"'
      };

      const results = {};
      for (const [key, query] of Object.entries(queries)) {
        try {
          const result = await executeQuery(query);
          results[key] = result[0].count;
        } catch (error) {
          results[key] = 0; // Default to 0 if table doesn't exist yet
        }
      }

      return results;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DatabaseUtils;
