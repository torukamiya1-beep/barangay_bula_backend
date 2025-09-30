const { executeQuery, executeTransaction } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  constructor(data) {
    this.id = data.id;
    this.email = data.email;
    this.password = data.password;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.role = data.role || 'user';
    this.is_active = data.is_active !== undefined ? data.is_active : true;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create users table if not exists
  static async createTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role ENUM('admin', 'user', 'moderator') DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role),
        INDEX idx_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    try {
      await executeQuery(query);
      console.log('Users table created or already exists');
    } catch (error) {
      console.error('Error creating users table:', error);
      throw error;
    }
  }

  // Create a new user
  static async create(userData) {
    const { email, password, first_name, last_name, role = 'user' } = userData;
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (email, password, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    try {
      const result = await executeQuery(query, [email, hashedPassword, first_name, last_name, role]);
      return await User.findById(result.insertId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT * FROM users WHERE id = ?';
    const users = await executeQuery(query, [id]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Find user by email
  static async findByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = ?';
    const users = await executeQuery(query, [email]);
    return users.length > 0 ? new User(users[0]) : null;
  }

  // Get all users with pagination
  static async findAll(page = 1, limit = 10, filters = {}) {
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];

    // Apply filters
    if (filters.role) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(filters.role);
    }

    if (filters.is_active !== undefined) {
      query += ' AND is_active = ?';
      countQuery += ' AND is_active = ?';
      params.push(filters.is_active);
    }

    if (filters.search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      countQuery += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Add ordering and pagination
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    
    const [users, totalResult] = await Promise.all([
      executeQuery(query, [...params, limit, offset]),
      executeQuery(countQuery, params)
    ]);

    return {
      users: users.map(user => new User(user)),
      total: totalResult[0].total,
      page,
      limit,
      totalPages: Math.ceil(totalResult[0].total / limit)
    };
  }

  // Update user
  async update(updateData) {
    const allowedFields = ['email', 'first_name', 'last_name', 'role', 'is_active'];
    const updates = [];
    const params = [];

    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key) && updateData[key] !== undefined) {
        updates.push(`${key} = ?`);
        params.push(updateData[key]);
      }
    });

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    params.push(this.id);
    const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
    
    await executeQuery(query, params);
    return await User.findById(this.id);
  }

  // Change password
  async changePassword(newPassword) {
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    const query = 'UPDATE users SET password = ? WHERE id = ?';
    await executeQuery(query, [hashedPassword, this.id]);
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password);
  }

  // Delete user (soft delete)
  async delete() {
    const query = 'UPDATE users SET is_active = FALSE WHERE id = ?';
    await executeQuery(query, [this.id]);
  }

  // Hard delete user
  async hardDelete() {
    const query = 'DELETE FROM users WHERE id = ?';
    await executeQuery(query, [this.id]);
  }

  // Get user without password
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

module.exports = User;
