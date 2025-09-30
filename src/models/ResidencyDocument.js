const { executeQuery } = require('../config/database');

class ResidencyDocument {
  constructor(data) {
    this.id = data.id;
    this.account_id = data.account_id;
    this.document_type = data.document_type;
    this.document_name = data.document_name;
    this.file_path = data.file_path;
    this.file_size = data.file_size;
    this.mime_type = data.mime_type;
    this.verification_status = data.verification_status;
    this.verified_by = data.verified_by;
    this.verified_at = data.verified_at;
    this.rejection_reason = data.rejection_reason;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Create residency documents table
  static async createTable() {
    // Table should already exist from migration - skip creation
    return;
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS residency_documents (
        id INT PRIMARY KEY AUTO_INCREMENT,
        account_id INT NOT NULL,
        document_type ENUM('utility_bill', 'barangay_certificate', 'valid_id', 'lease_contract', 'other') NOT NULL,
        document_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        file_size INT,
        mime_type VARCHAR(100),
        
        verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        verified_by INT NULL,
        verified_at TIMESTAMP NULL,
        rejection_reason TEXT NULL,
        
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (account_id) REFERENCES client_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES admin_employee_accounts(id),
        
        INDEX idx_account_id (account_id),
        INDEX idx_verification_status (verification_status),
        INDEX idx_document_type (document_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
  }

  // Create new residency document
  static async create(documentData) {
    const {
      account_id,
      document_type,
      document_name,
      file_path,
      file_size,
      mime_type
    } = documentData;

    const query = `
      INSERT INTO residency_documents (
        account_id, document_type, document_name, file_path, file_size, mime_type
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    try {
      const result = await executeQuery(query, [
        account_id, document_type, document_name, file_path, file_size, mime_type
      ]);
      return await ResidencyDocument.findById(result.insertId);
    } catch (error) {
      throw error;
    }
  }

  // Find document by ID
  static async findById(id) {
    const query = 'SELECT * FROM residency_documents WHERE id = ?';
    const results = await executeQuery(query, [id]);
    return results.length > 0 ? new ResidencyDocument(results[0]) : null;
  }

  // Find documents by account ID
  static async findByAccountId(accountId) {
    const query = 'SELECT * FROM residency_documents WHERE account_id = ? ORDER BY created_at DESC';
    const results = await executeQuery(query, [accountId]);
    return results.map(doc => new ResidencyDocument(doc));
  }

  // Get pending documents for admin review
  static async getPendingDocuments(page = 1, limit = 10) {
    const offset = (page - 1) * limit;
    
    const query = `
      SELECT 
        rd.*,
        ca.username,
        cp.first_name,
        cp.middle_name,
        cp.last_name,
        cp.email,
        cp.phone_number,
        cp.barangay,
        cp.city_municipality,
        cp.province
      FROM residency_documents rd
      JOIN client_accounts ca ON rd.account_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      WHERE rd.verification_status = 'pending'
      ORDER BY rd.created_at ASC
      LIMIT ? OFFSET ?
    `;
    
    const results = await executeQuery(query, [limit, offset]);
    
    // Get total count
    const countQuery = 'SELECT COUNT(*) as total FROM residency_documents WHERE verification_status = ?';
    const countResult = await executeQuery(countQuery, ['pending']);
    const total = countResult[0].total;
    
    return {
      documents: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // Update verification status
  async updateVerificationStatus(status, verifiedBy = null, rejectionReason = null) {
    const query = `
      UPDATE residency_documents 
      SET verification_status = ?, verified_by = ?, verified_at = ?, rejection_reason = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `;
    
    const verifiedAt = status === 'approved' || status === 'rejected' ? new Date() : null;
    
    await executeQuery(query, [status, verifiedBy, verifiedAt, rejectionReason, this.id]);
    
    this.verification_status = status;
    this.verified_by = verifiedBy;
    this.verified_at = verifiedAt;
    this.rejection_reason = rejectionReason;
    
    return this;
  }

  // Delete document
  async delete() {
    const query = 'DELETE FROM residency_documents WHERE id = ?';
    await executeQuery(query, [this.id]);
    return true;
  }

  // Convert to JSON (exclude sensitive file paths for security)
  toJSON() {
    const { file_path, ...documentData } = this;
    return {
      ...documentData,
      has_file: !!file_path
    };
  }
}

module.exports = ResidencyDocument;
