const { executeQuery } = require('../config/database');
const path = require('path');
const fs = require('fs');

class AuthorizationDocument {
  constructor(data) {
    this.id = data.id;
    this.authorized_pickup_person_id = data.authorized_pickup_person_id;
    this.document_type = data.document_type;
    this.document_name = data.document_name;
    this.file_path = data.file_path;
    this.file_size = data.file_size;
    this.mime_type = data.mime_type;
    this.is_verified = data.is_verified;
    this.verification_status = data.verification_status;
    this.verified_by = data.verified_by;
    this.verified_at = data.verified_at;
    this.account_id = data.account_id;
    this.created_at = data.created_at;
  }

  // Create new authorization document
  static async create(documentData) {
    const {
      authorized_pickup_person_id,
      document_type,
      document_name,
      file_path,
      file_size,
      mime_type,
      account_id
    } = documentData;

    const query = `
      INSERT INTO authorization_documents (
        authorized_pickup_person_id, document_type, document_name, 
        file_path, file_size, mime_type, account_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      authorized_pickup_person_id,
      document_type,
      document_name,
      file_path,
      file_size,
      mime_type,
      account_id
    ];

    try {
      const result = await executeQuery(query, params);
      return await AuthorizationDocument.findById(result.insertId);
    } catch (error) {
      console.error('Error creating authorization document:', error);
      throw error;
    }
  }

  // Find by ID
  static async findById(id) {
    const query = 'SELECT * FROM authorization_documents WHERE id = ?';
    const results = await executeQuery(query, [id]);
    
    if (results.length === 0) {
      return null;
    }
    
    return new AuthorizationDocument(results[0]);
  }

  // Get all documents for a pickup person
  static async getByPickupPersonId(pickupPersonId) {
    const query = `
      SELECT * FROM authorization_documents
      WHERE authorized_pickup_person_id = ?
      ORDER BY created_at ASC
    `;
    
    const results = await executeQuery(query, [pickupPersonId]);
    return results.map(row => new AuthorizationDocument(row));
  }

  // Get documents by account_id (for rejected documents)
  static async getByAccountId(accountId) {
    const query = `
      SELECT ad.* FROM authorization_documents ad
      WHERE ad.account_id = ?
      ORDER BY ad.created_at DESC
    `;
    
    const results = await executeQuery(query, [accountId]);
    return results.map(row => new AuthorizationDocument(row));
  }

  // Get rejected documents for client
  static async getRejectedByAccountId(accountId) {
    const query = `
      SELECT ad.*, app.first_name, app.last_name, dr.request_number
      FROM authorization_documents ad
      LEFT JOIN authorized_pickup_persons app ON ad.authorized_pickup_person_id = app.id
      LEFT JOIN document_requests dr ON app.request_id = dr.id
      WHERE ad.account_id = ? AND ad.verification_status = 'rejected'
      ORDER BY ad.created_at DESC
    `;
    
    const results = await executeQuery(query, [accountId]);
    
    // Handle null or undefined results
    if (!results) {
      console.warn('Query returned null/undefined results for accountId:', accountId);
      return [];
    }
    
    // Convert to plain objects to ensure JSON serialization
    return Array.isArray(results) ? results.map(row => ({ ...row })) : [];
  }

  // Update verification status (approve/reject workflow)
  async updateVerificationStatus(status, verifiedBy) {
    const query = `
      UPDATE authorization_documents 
      SET verification_status = ?, verified_by = ?, verified_at = NOW(), is_verified = ?
      WHERE id = ?
    `;
    
    const isVerified = status === 'approved';
    const params = [status, verifiedBy, isVerified, this.id];
    await executeQuery(query, params);
    
    this.verification_status = status;
    this.verified_by = verifiedBy;
    this.verified_at = new Date();
    this.is_verified = isVerified;
    
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
      const query = 'DELETE FROM authorization_documents WHERE id = ?';
      await executeQuery(query, [this.id]);
      
      return true;
    } catch (error) {
      console.error('Error deleting authorization document:', error);
      throw error;
    }
  }
}

module.exports = AuthorizationDocument;
