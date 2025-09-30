const bcrypt = require('bcryptjs');
const { executeQuery } = require('../config/database');

class ClientAccount {
  constructor(data) {
    this.id = data.id;
    this.username = data.username;
    this.password_hash = data.password_hash;
    this.status = data.status;
    this.email_verified = data.email_verified;
    this.phone_verified = data.phone_verified;
    this.last_login = data.last_login;
    this.password_changed_at = data.password_changed_at;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create client accounts table
  static async createTable() {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS client_accounts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        status ENUM('active', 'inactive', 'suspended', 'pending_verification', 'pending_residency_verification', 'residency_rejected') DEFAULT 'pending_verification',
        email_verified BOOLEAN DEFAULT FALSE,
        phone_verified BOOLEAN DEFAULT FALSE,
        last_login TIMESTAMP NULL,
        password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        INDEX idx_username (username),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    await executeQuery(createTableQuery);
  }

  // Find client by ID
  static async findById(id) {
    const query = 'SELECT * FROM client_accounts WHERE id = ?';
    const results = await executeQuery(query, [id]);
    return results.length > 0 ? new ClientAccount(results[0]) : null;
  }

  // Find client by username
  static async findByUsername(username) {
    const query = 'SELECT * FROM client_accounts WHERE username = ?';
    const results = await executeQuery(query, [username]);
    return results.length > 0 ? new ClientAccount(results[0]) : null;
  }

  // Create new client account
  static async create(accountData) {
    const { username, password } = accountData;
    
    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO client_accounts (username, password_hash)
      VALUES (?, ?)
    `;
    
    try {
      const result = await executeQuery(query, [username, hashedPassword]);
      return await ClientAccount.findById(result.insertId);
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  // Verify password
  async verifyPassword(password) {
    return await bcrypt.compare(password, this.password_hash);
  }

  // Update account status
  async updateStatus(status) {
    const query = `
      UPDATE client_accounts 
      SET status = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await executeQuery(query, [status, this.id]);
    this.status = status;
    return this;
  }

  // Update email verification status
  async updateEmailVerification(verified = true) {
    const query = `
      UPDATE client_accounts 
      SET email_verified = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await executeQuery(query, [verified, this.id]);
    this.email_verified = verified;
    return this;
  }

  // Update phone verification status
  async updatePhoneVerification(verified = true) {
    const query = `
      UPDATE client_accounts 
      SET phone_verified = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await executeQuery(query, [verified, this.id]);
    this.phone_verified = verified;
    return this;
  }

  // Update last login
  async updateLastLogin() {
    const query = `
      UPDATE client_accounts 
      SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    await executeQuery(query, [this.id]);
    this.last_login = new Date();
    return this;
  }

  // Get account with profile
  async getWithProfile() {
    const query = `
      SELECT
        ca.*,
        cp.first_name,
        cp.middle_name,
        cp.last_name,
        cp.suffix,
        cp.birth_date,
        cp.gender,
        cp.civil_status_id,
        cp.nationality,
        cp.phone_number,
        cp.email,
        cp.house_number,
        cp.street,
        cp.subdivision,
        cp.barangay,
        cp.city_municipality,
        cp.province,
        cp.postal_code,
        cp.years_of_residency,
        cp.months_of_residency,
        cp.is_verified as profile_verified,
        cp.verified_by,
        cp.verified_at,
        cp.created_at as profile_created_at,
        cp.updated_at as profile_updated_at
      FROM client_accounts ca
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      WHERE ca.id = ?
    `;

    const results = await executeQuery(query, [this.id]);
    return results.length > 0 ? results[0] : null;
  }

  // Convert to JSON (exclude sensitive data)
  toJSON() {
    const { password_hash, ...accountData } = this;
    return accountData;
  }

  // Get all clients with pagination
  static async getAll(page = 1, limit = 10, status = null) {
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        ca.*,
        cp.first_name,
        cp.middle_name,
        cp.last_name,
        cp.email,
        cp.phone_number
      FROM client_accounts ca
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
    `;
    
    const params = [];
    
    if (status) {
      query += ' WHERE ca.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY ca.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const results = await executeQuery(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM client_accounts';
    const countParams = [];
    
    if (status) {
      countQuery += ' WHERE status = ?';
      countParams.push(status);
    }
    
    const countResult = await executeQuery(countQuery, countParams);
    const total = countResult[0].total;
    
    return {
      clients: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Delete account (soft delete by setting status to inactive)
  async delete() {
    return await this.updateStatus('inactive');
  }
}

module.exports = ClientAccount;
