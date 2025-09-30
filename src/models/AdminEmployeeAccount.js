const { executeQuery } = require('../config/database');

class AdminEmployeeAccount {
  // Create a new admin/employee account
  static async create(accountData) {
    const query = `
      INSERT INTO admin_employee_accounts (
        username, password_hash, role, status, password_changed_at
      ) VALUES (?, ?, ?, ?, NOW())
    `;
    
    const values = [
      accountData.username,
      accountData.password_hash,
      accountData.role,
      accountData.status || 'inactive'
    ];
    
    const result = await executeQuery(query, values);
    return result.insertId;
  }

  // Find account by ID
  static async findById(id) {
    const query = `
      SELECT id, username, password_hash, role, status, last_login, 
             password_changed_at, created_at, updated_at
      FROM admin_employee_accounts 
      WHERE id = ?
    `;
    
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  }

  // Find account by username
  static async findByUsername(username) {
    const query = `
      SELECT id, username, password_hash, role, status, last_login, 
             password_changed_at, created_at, updated_at
      FROM admin_employee_accounts 
      WHERE username = ?
    `;
    
    const results = await executeQuery(query, [username]);
    return results[0] || null;
  }

  // Find account by email (through profile)
  static async findByEmail(email) {
    const query = `
      SELECT a.id, a.username, a.password_hash, a.role, a.status, 
             a.last_login, a.password_changed_at, a.created_at, a.updated_at
      FROM admin_employee_accounts a
      INNER JOIN admin_employee_profiles p ON a.id = p.account_id
      WHERE p.email = ?
    `;
    
    const results = await executeQuery(query, [email]);
    return results[0] || null;
  }

  // Update account status
  static async updateStatus(id, status) {
    const query = `
      UPDATE admin_employee_accounts 
      SET status = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(query, [status, id]);
    return true;
  }

  // Update password
  static async updatePassword(id, passwordHash) {
    const query = `
      UPDATE admin_employee_accounts 
      SET password_hash = ?, password_changed_at = NOW(), updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(query, [passwordHash, id]);
    return true;
  }

  // Update last login timestamp
  static async updateLastLogin(id) {
    const query = `
      UPDATE admin_employee_accounts 
      SET last_login = NOW(), updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(query, [id]);
    return true;
  }

  // Get all accounts with pagination
  static async findAll(options = {}) {
    const { limit = 50, offset = 0, role = null, status = null } = options;
    
    let query = `
      SELECT a.id, a.username, a.role, a.status, a.last_login, 
             a.created_at, a.updated_at,
             p.first_name, p.last_name, p.email, p.employee_id, 
             p.position, p.department
      FROM admin_employee_accounts a
      LEFT JOIN admin_employee_profiles p ON a.id = p.account_id
      WHERE 1=1
    `;
    
    const values = [];
    
    if (role) {
      query += ' AND a.role = ?';
      values.push(role);
    }
    
    if (status) {
      query += ' AND a.status = ?';
      values.push(status);
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);
    
    const results = await executeQuery(query, values);
    return results;
  }

  // Count total accounts
  static async count(options = {}) {
    const { role = null, status = null } = options;
    
    let query = `
      SELECT COUNT(*) as total
      FROM admin_employee_accounts
      WHERE 1=1
    `;
    
    const values = [];
    
    if (role) {
      query += ' AND role = ?';
      values.push(role);
    }
    
    if (status) {
      query += ' AND status = ?';
      values.push(status);
    }
    
    const results = await executeQuery(query, values);
    return results[0].total;
  }

  // Search accounts by username, email, or name
  static async search(searchTerm, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT a.id, a.username, a.role, a.status, a.last_login, 
             a.created_at, a.updated_at,
             p.first_name, p.last_name, p.email, p.employee_id, 
             p.position, p.department
      FROM admin_employee_accounts a
      LEFT JOIN admin_employee_profiles p ON a.id = p.account_id
      WHERE (
        a.username LIKE ? OR
        p.email LIKE ? OR
        p.first_name LIKE ? OR
        p.last_name LIKE ? OR
        p.employee_id LIKE ?
      )
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const values = [
      searchPattern, searchPattern, searchPattern, 
      searchPattern, searchPattern, limit, offset
    ];
    
    const results = await executeQuery(query, values);
    return results;
  }

  // Delete account (soft delete by setting status to 'deleted')
  static async softDelete(id) {
    const query = `
      UPDATE admin_employee_accounts 
      SET status = 'deleted', updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(query, [id]);
    return true;
  }

  // Hard delete account (permanent deletion)
  static async delete(id) {
    const query = `DELETE FROM admin_employee_accounts WHERE id = ?`;
    await executeQuery(query, [id]);
    return true;
  }

  // Get accounts by role
  static async findByRole(role, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT a.id, a.username, a.role, a.status, a.last_login, 
             a.created_at, a.updated_at,
             p.first_name, p.last_name, p.email, p.employee_id, 
             p.position, p.department
      FROM admin_employee_accounts a
      LEFT JOIN admin_employee_profiles p ON a.id = p.account_id
      WHERE a.role = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const results = await executeQuery(query, [role, limit, offset]);
    return results;
  }

  // Get accounts by status
  static async findByStatus(status, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT a.id, a.username, a.role, a.status, a.last_login, 
             a.created_at, a.updated_at,
             p.first_name, p.last_name, p.email, p.employee_id, 
             p.position, p.department
      FROM admin_employee_accounts a
      LEFT JOIN admin_employee_profiles p ON a.id = p.account_id
      WHERE a.status = ?
      ORDER BY a.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const results = await executeQuery(query, [status, limit, offset]);
    return results;
  }

  // Update account role
  static async updateRole(id, role) {
    const query = `
      UPDATE admin_employee_accounts 
      SET role = ?, updated_at = NOW()
      WHERE id = ?
    `;
    
    await executeQuery(query, [role, id]);
    return true;
  }

  // Check if username exists
  static async usernameExists(username, excludeId = null) {
    let query = `SELECT id FROM admin_employee_accounts WHERE username = ?`;
    const values = [username];
    
    if (excludeId) {
      query += ' AND id != ?';
      values.push(excludeId);
    }
    
    const results = await executeQuery(query, values);
    return results.length > 0;
  }
}

module.exports = AdminEmployeeAccount;
