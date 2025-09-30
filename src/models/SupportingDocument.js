const { executeQuery } = require('../config/database');
const path = require('path');
const fs = require('fs');

class SupportingDocument {
  constructor(data) {
    this.id = data.id;
    this.request_id = data.request_id;
    this.document_name = data.document_name;
    this.document_type = data.document_type;
    this.file_path = data.file_path;
    this.file_size = data.file_size;
    this.mime_type = data.mime_type;
    this.uploaded_by = data.uploaded_by;
    this.is_verified = data.is_verified;
    this.verified_by = data.verified_by;
    this.verified_at = data.verified_at;
    this.created_at = data.created_at;
  }

  // Create new supporting document record
  static async create(documentData) {
    const {
      request_id,
      document_name,
      document_type,
      file_path,
      file_size,
      mime_type,
      uploaded_by
    } = documentData;

    const query = `
      INSERT INTO supporting_documents (
        request_id, document_name, document_type, file_path, 
        file_size, mime_type, uploaded_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      request_id,
      document_name,
      document_type,
      file_path,
      file_size,
      mime_type,
      uploaded_by
    ];

    try {
      const result = await executeQuery(query, params);
      return await SupportingDocument.findById(result.insertId);
    } catch (error) {
      console.error('Error creating supporting document:', error);
      throw error;
    }
  }

  // Find supporting document by ID
  static async findById(id) {
    const query = 'SELECT * FROM supporting_documents WHERE id = ?';
    const results = await executeQuery(query, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new SupportingDocument(results[0]);
  }

  // Get all documents for a request
  static async getByRequestId(requestId) {
    const query = `
      SELECT 
        sd.*,
        CONCAT(aep.first_name, ' ', aep.last_name) as verified_by_name
      FROM supporting_documents sd
      LEFT JOIN admin_employee_accounts aea ON sd.verified_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      WHERE sd.request_id = ?
      ORDER BY sd.created_at ASC
    `;
    
    const results = await executeQuery(query, [requestId]);
    return results.map(row => new SupportingDocument(row));
  }

  // Get documents by type for a request
  static async getByRequestAndType(requestId, documentType) {
    const query = 'SELECT * FROM supporting_documents WHERE request_id = ? AND document_type = ?';
    const results = await executeQuery(query, [requestId, documentType]);
    return results.map(row => new SupportingDocument(row));
  }

  // Update verification status
  async updateVerification(isVerified, verifiedBy, notes = null) {
    const query = `
      UPDATE supporting_documents 
      SET is_verified = ?, verified_by = ?, verified_at = ?, verification_notes = ?
      WHERE id = ?
    `;
    
    const verifiedAt = isVerified ? new Date() : null;
    const params = [isVerified, verifiedBy, verifiedAt, notes, this.id];
    
    await executeQuery(query, params);
    
    this.is_verified = isVerified;
    this.verified_by = verifiedBy;
    this.verified_at = verifiedAt;
    
    return this;
  }

  // Delete document (both record and file)
  async delete() {
    try {
      // Delete file from filesystem
      if (this.file_path && fs.existsSync(this.file_path)) {
        fs.unlinkSync(this.file_path);
      }
      
      // Delete database record
      const query = 'DELETE FROM supporting_documents WHERE id = ?';
      await executeQuery(query, [this.id]);
      
      return true;
    } catch (error) {
      console.error('Error deleting supporting document:', error);
      throw error;
    }
  }

  // Get file stats
  getFileStats() {
    try {
      if (this.file_path && fs.existsSync(this.file_path)) {
        const stats = fs.statSync(this.file_path);
        return {
          exists: true,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      }
      return { exists: false };
    } catch (error) {
      console.error('Error getting file stats:', error);
      return { exists: false, error: error.message };
    }
  }

  // Get download URL
  getDownloadUrl() {
    if (!this.file_path) return null;
    
    // Return relative path for API endpoint
    const relativePath = path.relative(
      path.join(__dirname, '../../uploads'),
      this.file_path
    );
    
    return `/api/documents/download/${this.id}`;
  }

  // Validate document type
  static isValidDocumentType(type) {
    const validTypes = [
      'government_id',
      'proof_of_residency', 
      'cedula',
      'birth_certificate',
      'marriage_certificate',
      'other'
    ];
    
    return validTypes.includes(type);
  }

  // Get document type display name
  static getDocumentTypeDisplayName(type) {
    const displayNames = {
      'government_id': 'Government ID',
      'proof_of_residency': 'Proof of Residency',
      'cedula': 'Community Tax Certificate (Cedula)',
      'birth_certificate': 'Birth Certificate',
      'marriage_certificate': 'Marriage Certificate',
      'other': 'Other Document'
    };
    
    return displayNames[type] || type;
  }

  // Get all documents with verification status
  static async getDocumentsWithStatus(filters = {}) {
    let whereConditions = [];
    let params = [];
    
    if (filters.request_id) {
      whereConditions.push('sd.request_id = ?');
      params.push(filters.request_id);
    }
    
    if (filters.is_verified !== undefined) {
      whereConditions.push('sd.is_verified = ?');
      params.push(filters.is_verified);
    }
    
    if (filters.document_type) {
      whereConditions.push('sd.document_type = ?');
      params.push(filters.document_type);
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';
    
    const query = `
      SELECT 
        sd.*,
        dr.request_number,
        CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
        CONCAT(aep.first_name, ' ', aep.last_name) as verified_by_name
      FROM supporting_documents sd
      JOIN document_requests dr ON sd.request_id = dr.id
      JOIN client_accounts ca ON dr.client_id = ca.id
      JOIN client_profiles cp ON ca.id = cp.account_id
      LEFT JOIN admin_employee_accounts aea ON sd.verified_by = aea.id
      LEFT JOIN admin_employee_profiles aep ON aea.id = aep.account_id
      ${whereClause}
      ORDER BY sd.created_at DESC
    `;
    
    const results = await executeQuery(query, params);
    return results;
  }

  // Convert to JSON (for API responses)
  toJSON() {
    return {
      id: this.id,
      request_id: this.request_id,
      document_name: this.document_name,
      document_type: this.document_type,
      document_type_display: SupportingDocument.getDocumentTypeDisplayName(this.document_type),
      file_size: this.file_size,
      mime_type: this.mime_type,
      uploaded_by: this.uploaded_by,
      is_verified: this.is_verified,
      verified_by: this.verified_by,
      verified_at: this.verified_at,
      created_at: this.created_at,
      download_url: this.getDownloadUrl(),
      file_stats: this.getFileStats()
    };
  }
}

module.exports = SupportingDocument;
