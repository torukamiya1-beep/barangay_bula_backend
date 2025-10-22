/**
 * Document Fee Service
 * Handles dynamic pricing for document types
 */

const db = require('../config/database');

class DocumentFeeService {
  /**
   * Get all document types with their current active fees
   */
  async getAllDocumentFeesWithTypes() {
    try {
      const query = `
        SELECT 
          dt.id as document_type_id,
          dt.type_name,
          dt.description,
          dt.is_active as type_is_active,
          df.id as fee_id,
          df.fee_amount,
          df.effective_date,
          df.is_active as fee_is_active,
          df.created_at as fee_created_at
        FROM document_types dt
        LEFT JOIN document_fees df ON dt.id = df.document_type_id AND df.is_active = 1
        WHERE dt.is_active = 1
        ORDER BY dt.id
      `;
      
      const [rows] = await db.query(query);
      return rows;
    } catch (error) {
      console.error('Error fetching document fees:', error);
      throw new Error('Failed to fetch document fees');
    }
  }

  /**
   * Get current active fee for a specific document type
   */
  async getCurrentFee(documentTypeId) {
    try {
      const query = `
        SELECT 
          df.id,
          df.document_type_id,
          df.fee_amount,
          df.effective_date,
          df.is_active,
          dt.type_name,
          dt.description
        FROM document_fees df
        JOIN document_types dt ON df.document_type_id = dt.id
        WHERE df.document_type_id = ? 
          AND df.is_active = 1
          AND dt.is_active = 1
        LIMIT 1
      `;
      
      const [rows] = await db.query(query, [documentTypeId]);
      return rows[0] || null;
    } catch (error) {
      console.error('Error fetching current fee:', error);
      throw new Error('Failed to fetch current fee');
    }
  }

  /**
   * Get fee history for a specific document type
   */
  async getFeeHistory(documentTypeId) {
    try {
      const query = `
        SELECT 
          df.id,
          df.document_type_id,
          df.fee_amount,
          df.effective_date,
          df.is_active,
          df.created_at,
          dt.type_name
        FROM document_fees df
        JOIN document_types dt ON df.document_type_id = dt.id
        WHERE df.document_type_id = ?
        ORDER BY df.effective_date DESC, df.created_at DESC
      `;
      
      const [rows] = await db.query(query, [documentTypeId]);
      return rows;
    } catch (error) {
      console.error('Error fetching fee history:', error);
      throw new Error('Failed to fetch fee history');
    }
  }

  /**
   * Update fee for a document type
   * This deactivates the old fee and creates a new active fee
   */
  async updateDocumentFee(documentTypeId, newFeeAmount, adminId = null) {
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // Validate document type exists
      const [docTypes] = await connection.query(
        'SELECT id, type_name FROM document_types WHERE id = ? AND is_active = 1',
        [documentTypeId]
      );

      if (docTypes.length === 0) {
        throw new Error('Document type not found or inactive');
      }

      // Validate fee amount
      if (isNaN(newFeeAmount) || newFeeAmount < 0) {
        throw new Error('Invalid fee amount');
      }

      // Check if there's a current active fee
      const [currentFees] = await connection.query(
        'SELECT id, fee_amount FROM document_fees WHERE document_type_id = ? AND is_active = 1',
        [documentTypeId]
      );

      // If the fee is the same, no need to update
      if (currentFees.length > 0 && parseFloat(currentFees[0].fee_amount) === parseFloat(newFeeAmount)) {
        await connection.rollback();
        return {
          success: false,
          message: 'Fee amount is the same as current fee',
          currentFee: currentFees[0]
        };
      }

      // Deactivate all previous fees for this document type
      await connection.query(
        'UPDATE document_fees SET is_active = 0 WHERE document_type_id = ?',
        [documentTypeId]
      );

      // Insert new active fee
      const [result] = await connection.query(
        `INSERT INTO document_fees 
         (document_type_id, fee_amount, effective_date, is_active, created_by) 
         VALUES (?, ?, NOW(), 1, ?)`,
        [documentTypeId, newFeeAmount, adminId]
      );

      await connection.commit();

      // Fetch the newly created fee
      const [newFee] = await connection.query(
        `SELECT 
          df.id,
          df.document_type_id,
          df.fee_amount,
          df.effective_date,
          df.is_active,
          dt.type_name
         FROM document_fees df
         JOIN document_types dt ON df.document_type_id = dt.id
         WHERE df.id = ?`,
        [result.insertId]
      );

      return {
        success: true,
        message: 'Fee updated successfully',
        fee: newFee[0],
        previousFee: currentFees[0] || null
      };

    } catch (error) {
      await connection.rollback();
      console.error('Error updating document fee:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get fee statistics
   */
  async getFeeStatistics() {
    try {
      const query = `
        SELECT 
          COUNT(DISTINCT document_type_id) as total_document_types,
          COUNT(*) as total_fee_changes,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_fees,
          MIN(fee_amount) as lowest_fee,
          MAX(fee_amount) as highest_fee,
          AVG(fee_amount) as average_fee
        FROM document_fees
      `;
      
      const [rows] = await db.query(query);
      return rows[0];
    } catch (error) {
      console.error('Error fetching fee statistics:', error);
      throw new Error('Failed to fetch fee statistics');
    }
  }
}

module.exports = new DocumentFeeService();
