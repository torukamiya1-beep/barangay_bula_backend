const { executeQuery } = require('../config/database');

class AdminEmployeeProfile {
  // Create a new admin/employee profile
  static async create(profileData) {
    const query = `
      INSERT INTO admin_employee_profiles (
        account_id, employee_id, first_name, middle_name, last_name, 
        suffix, phone_number, email, profile_picture, position, 
        department, hire_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const values = [
      profileData.account_id,
      profileData.employee_id || null,
      profileData.first_name || null,
      profileData.middle_name || null,
      profileData.last_name || null,
      profileData.suffix || null,
      profileData.phone_number || null,
      profileData.email || null,
      profileData.profile_picture || null,
      profileData.position || null,
      profileData.department || null,
      profileData.hire_date || null
    ];
    
    const result = await executeQuery(query, values);
    return result.insertId;
  }

  // Find profile by ID
  static async findById(id) {
    const query = `
      SELECT id, account_id, employee_id, first_name, middle_name, last_name, 
             suffix, phone_number, email, profile_picture, position, 
             department, hire_date, created_at, updated_at
      FROM admin_employee_profiles 
      WHERE id = ?
    `;
    
    const results = await executeQuery(query, [id]);
    return results[0] || null;
  }

  // Find profile by account ID
  static async findByAccountId(accountId) {
    const query = `
      SELECT id, account_id, employee_id, first_name, middle_name, last_name, 
             suffix, phone_number, email, profile_picture, position, 
             department, hire_date, created_at, updated_at
      FROM admin_employee_profiles 
      WHERE account_id = ?
    `;
    
    const results = await executeQuery(query, [accountId]);
    return results[0] || null;
  }

  // Find profile by email
  static async findByEmail(email) {
    const query = `
      SELECT id, account_id, employee_id, first_name, middle_name, last_name, 
             suffix, phone_number, email, profile_picture, position, 
             department, hire_date, created_at, updated_at
      FROM admin_employee_profiles 
      WHERE email = ?
    `;
    
    const results = await executeQuery(query, [email]);
    return results[0] || null;
  }

  // Find profile by employee ID
  static async findByEmployeeId(employeeId) {
    const query = `
      SELECT id, account_id, employee_id, first_name, middle_name, last_name, 
             suffix, phone_number, email, profile_picture, position, 
             department, hire_date, created_at, updated_at
      FROM admin_employee_profiles 
      WHERE employee_id = ?
    `;
    
    const results = await executeQuery(query, [employeeId]);
    return results[0] || null;
  }

  // Update profile by account ID
  static async updateByAccountId(accountId, updateData) {
    const fields = [];
    const values = [];
    
    // Build dynamic update query based on provided fields
    const allowedFields = [
      'employee_id', 'first_name', 'middle_name', 'last_name', 'suffix',
      'phone_number', 'email', 'profile_picture', 'position', 'department', 'hire_date'
    ];
    
    allowedFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    fields.push('updated_at = NOW()');
    values.push(accountId);
    
    const query = `
      UPDATE admin_employee_profiles 
      SET ${fields.join(', ')}
      WHERE account_id = ?
    `;
    
    await executeQuery(query, values);
    return true;
  }

  // Update profile by ID
  static async updateById(id, updateData) {
    const fields = [];
    const values = [];
    
    // Build dynamic update query based on provided fields
    const allowedFields = [
      'employee_id', 'first_name', 'middle_name', 'last_name', 'suffix',
      'phone_number', 'email', 'profile_picture', 'position', 'department', 'hire_date'
    ];
    
    allowedFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        fields.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });
    
    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }
    
    fields.push('updated_at = NOW()');
    values.push(id);
    
    const query = `
      UPDATE admin_employee_profiles 
      SET ${fields.join(', ')}
      WHERE id = ?
    `;
    
    await executeQuery(query, values);
    return true;
  }

  // Get all profiles with pagination
  static async findAll(options = {}) {
    const { limit = 50, offset = 0, department = null, position = null } = options;
    
    let query = `
      SELECT p.id, p.account_id, p.employee_id, p.first_name, p.middle_name, 
             p.last_name, p.suffix, p.phone_number, p.email, p.profile_picture, 
             p.position, p.department, p.hire_date, p.created_at, p.updated_at,
             a.username, a.role, a.status, a.last_login
      FROM admin_employee_profiles p
      INNER JOIN admin_employee_accounts a ON p.account_id = a.id
      WHERE 1=1
    `;
    
    const values = [];
    
    if (department) {
      query += ' AND p.department = ?';
      values.push(department);
    }
    
    if (position) {
      query += ' AND p.position = ?';
      values.push(position);
    }
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    values.push(limit, offset);
    
    const results = await executeQuery(query, values);
    return results;
  }

  // Search profiles by name, email, employee ID, or department
  static async search(searchTerm, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT p.id, p.account_id, p.employee_id, p.first_name, p.middle_name, 
             p.last_name, p.suffix, p.phone_number, p.email, p.profile_picture, 
             p.position, p.department, p.hire_date, p.created_at, p.updated_at,
             a.username, a.role, a.status, a.last_login
      FROM admin_employee_profiles p
      INNER JOIN admin_employee_accounts a ON p.account_id = a.id
      WHERE (
        p.first_name LIKE ? OR
        p.last_name LIKE ? OR
        p.email LIKE ? OR
        p.employee_id LIKE ? OR
        p.department LIKE ? OR
        p.position LIKE ?
      )
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const values = [
      searchPattern, searchPattern, searchPattern, 
      searchPattern, searchPattern, searchPattern,
      limit, offset
    ];
    
    const results = await executeQuery(query, values);
    return results;
  }

  // Get profiles by department
  static async findByDepartment(department, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT p.id, p.account_id, p.employee_id, p.first_name, p.middle_name, 
             p.last_name, p.suffix, p.phone_number, p.email, p.profile_picture, 
             p.position, p.department, p.hire_date, p.created_at, p.updated_at,
             a.username, a.role, a.status, a.last_login
      FROM admin_employee_profiles p
      INNER JOIN admin_employee_accounts a ON p.account_id = a.id
      WHERE p.department = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const results = await executeQuery(query, [department, limit, offset]);
    return results;
  }

  // Get profiles by position
  static async findByPosition(position, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    const query = `
      SELECT p.id, p.account_id, p.employee_id, p.first_name, p.middle_name, 
             p.last_name, p.suffix, p.phone_number, p.email, p.profile_picture, 
             p.position, p.department, p.hire_date, p.created_at, p.updated_at,
             a.username, a.role, a.status, a.last_login
      FROM admin_employee_profiles p
      INNER JOIN admin_employee_accounts a ON p.account_id = a.id
      WHERE p.position = ?
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const results = await executeQuery(query, [position, limit, offset]);
    return results;
  }

  // Delete profile
  static async delete(id) {
    const query = `DELETE FROM admin_employee_profiles WHERE id = ?`;
    await executeQuery(query, [id]);
    return true;
  }

  // Delete profile by account ID
  static async deleteByAccountId(accountId) {
    const query = `DELETE FROM admin_employee_profiles WHERE account_id = ?`;
    await executeQuery(query, [accountId]);
    return true;
  }

  // Check if email exists
  static async emailExists(email, excludeAccountId = null) {
    let query = `SELECT account_id FROM admin_employee_profiles WHERE email = ?`;
    const values = [email];
    
    if (excludeAccountId) {
      query += ' AND account_id != ?';
      values.push(excludeAccountId);
    }
    
    const results = await executeQuery(query, values);
    return results.length > 0;
  }

  // Check if employee ID exists
  static async employeeIdExists(employeeId, excludeAccountId = null) {
    let query = `SELECT account_id FROM admin_employee_profiles WHERE employee_id = ?`;
    const values = [employeeId];
    
    if (excludeAccountId) {
      query += ' AND account_id != ?';
      values.push(excludeAccountId);
    }
    
    const results = await executeQuery(query, values);
    return results.length > 0;
  }

  // Get unique departments
  static async getUniqueDepartments() {
    const query = `
      SELECT DISTINCT department 
      FROM admin_employee_profiles 
      WHERE department IS NOT NULL AND department != ''
      ORDER BY department
    `;
    
    const results = await executeQuery(query);
    return results.map(row => row.department);
  }

  // Get unique positions
  static async getUniquePositions() {
    const query = `
      SELECT DISTINCT position 
      FROM admin_employee_profiles 
      WHERE position IS NOT NULL AND position != ''
      ORDER BY position
    `;
    
    const results = await executeQuery(query);
    return results.map(row => row.position);
  }

  // Count profiles
  static async count(options = {}) {
    const { department = null, position = null } = options;
    
    let query = `
      SELECT COUNT(*) as total
      FROM admin_employee_profiles
      WHERE 1=1
    `;
    
    const values = [];
    
    if (department) {
      query += ' AND department = ?';
      values.push(department);
    }
    
    if (position) {
      query += ' AND position = ?';
      values.push(position);
    }
    
    const results = await executeQuery(query, values);
    return results[0].total;
  }
}

module.exports = AdminEmployeeProfile;
