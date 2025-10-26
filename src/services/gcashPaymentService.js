const { executeQuery } = require('../config/database');
const Receipt = require('../models/Receipt');
const notificationService = require('./notificationService');
const emailService = require('./emailService');
const smsService = require('./smsService');
const { deleteGCashProof } = require('../middleware/gcashProofUpload');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * GCash Payment Service
 * Handles GCash manual payment proof uploads and verification
 */
class GCashPaymentService {
  /**
   * Upload payment proof for a request
   * @param {number} requestId - Document request ID
   * @param {Object} file - Uploaded file object from multer
   * @param {number} clientId - Client ID for verification
   * @param {string} referenceNumber - Optional GCash reference number
   * @returns {Promise<Object>} Upload result
   */
  async uploadPaymentProof(requestId, file, clientId, referenceNumber = null) {
    try {
      // Verify request exists and belongs to client
      const request = await this.getRequestById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.client_id !== clientId) {
        throw new Error('Unauthorized: Request does not belong to this client');
      }

      // Verify payment method is GCash Manual
      if (request.payment_method_code !== 'GCASH_MANUAL') {
        throw new Error('Invalid payment method. This request does not use GCash Manual payment.');
      }

      // Check if already paid
      if (request.payment_status === 'paid') {
        throw new Error('Payment already completed for this request');
      }

      // Delete old proof if exists
      if (request.gcash_proof_name) {
        deleteGCashProof(request.gcash_proof_name);
      }

      // Update request with payment proof
      const updateQuery = `
        UPDATE document_requests 
        SET 
          gcash_proof_path = ?,
          gcash_proof_name = ?,
          gcash_proof_uploaded_at = CURRENT_TIMESTAMP,
          gcash_verification_status = 'pending',
          gcash_reference_number = ?,
          gcash_rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      // Store relative path in database
      const relativePath = `uploads/gcash_proofs/${file.filename}`;
      
      await executeQuery(updateQuery, [
        relativePath,
        file.filename,
        referenceNumber,
        requestId
      ]);

      logger.info('GCash payment proof uploaded', {
        requestId,
        clientId,
        filename: file.filename,
        referenceNumber
      });

      // Notify all admins about new payment proof
      await this.notifyAdminsNewProof(request, file.filename);

      return {
        success: true,
        message: 'Payment proof uploaded successfully. Awaiting admin verification.',
        data: {
          requestId,
          filename: file.filename,
          uploadedAt: new Date(),
          verificationStatus: 'pending'
        }
      };
    } catch (error) {
      logger.error('Error uploading GCash payment proof:', error);
      throw error;
    }
  }

  /**
   * Verify (approve) payment proof
   * @param {number} requestId - Document request ID
   * @param {number} adminId - Admin ID performing verification
   * @returns {Promise<Object>} Verification result
   */
  async verifyPaymentProof(requestId, adminId) {
    try {
      // Get request details
      const request = await this.getRequestById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      // Verify proof has been uploaded
      if (!request.gcash_proof_name) {
        throw new Error('No payment proof uploaded');
      }

      // Check if proof file exists
      const fs = require('fs');
      const path = require('path');
      const gcashProofsDir = path.join(__dirname, '../../uploads/gcash_proofs');
      const filePath = path.join(gcashProofsDir, request.gcash_proof_name);

      if (!fs.existsSync(filePath)) {
        logger.error(`GCash proof file missing: ${filePath}`);
        throw new Error('Payment proof file not found. Please contact support.');
      }

      // Verify status is pending
      if (request.gcash_verification_status !== 'pending') {
        throw new Error(`Cannot verify payment with status: ${request.gcash_verification_status}`);
      }

      // Get the status_id for 'payment_confirmed'
      const statusQuery = `SELECT id FROM request_status WHERE status_name = 'payment_confirmed' LIMIT 1`;
      const statusResult = await executeQuery(statusQuery);
      
      if (!statusResult || statusResult.length === 0) {
        throw new Error('Payment confirmed status not found in database');
      }
      
      const paymentConfirmedStatusId = statusResult[0].id;

      // Update verification status and payment status
      const updateQuery = `
        UPDATE document_requests 
        SET 
          gcash_verification_status = 'verified',
          gcash_verified_by = ?,
          gcash_verified_at = CURRENT_TIMESTAMP,
          payment_status = 'paid',
          status_id = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [adminId, paymentConfirmedStatusId, requestId]);

      // Generate receipt
      const receipt = await this.generateReceipt(requestId);

      logger.info('GCash payment proof verified', {
        requestId,
        adminId,
        receiptId: receipt.id
      });

      // Notify client about approval via SMS, Email, and System Notification
      await this.notifyClientApproved(request, receipt, adminId);

      return {
        success: true,
        message: 'Payment verified successfully',
        data: {
          requestId,
          verificationStatus: 'verified',
          verifiedBy: adminId,
          verifiedAt: new Date(),
          receipt
        }
      };
    } catch (error) {
      logger.error('Error verifying GCash payment proof:', error);
      throw error;
    }
  }

  /**
   * Reject payment proof - UPDATED: No reason required
   * @param {number} requestId - Document request ID
   * @param {number} adminId - Admin ID performing rejection
   * @returns {Promise<Object>} Rejection result
   */
  async rejectPaymentProof(requestId, adminId) {
    try {
      // Get request details
      const request = await this.getRequestById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      // Verify proof has been uploaded
      if (!request.gcash_proof_name) {
        throw new Error('No payment proof uploaded');
      }

      // Verify status is pending or rejected (allow updating rejection)
      if (!['pending', 'rejected'].includes(request.gcash_verification_status)) {
        throw new Error(`Cannot reject payment with status: ${request.gcash_verification_status}. Only pending or rejected payments can be rejected.`);
      }

      // Check if already rejected
      const isAlreadyRejected = request.gcash_verification_status === 'rejected';
      if (isAlreadyRejected) {
        logger.info('Updating already rejected payment status', {
          requestId,
          adminId,
          currentStatus: request.gcash_verification_status
        });
      }

      // Update verification status (no rejection reason required)
      const updateQuery = `
        UPDATE document_requests
        SET
          gcash_verification_status = 'rejected',
          gcash_verified_by = ?,
          gcash_verified_at = CURRENT_TIMESTAMP,
          gcash_rejection_reason = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [adminId, requestId]);

      logger.info('GCash payment proof rejected', {
        requestId,
        adminId,
        isUpdate: isAlreadyRejected
      });

      // Notify client about rejection (no reason provided)
      await this.notifyClientRejected(request);

      return {
        success: true,
        message: isAlreadyRejected ? 'Payment rejection updated' : 'Payment proof rejected',
        data: {
          requestId,
          verificationStatus: 'rejected',
          rejectedBy: adminId,
          rejectedAt: new Date(),
          isUpdate: isAlreadyRejected
        }
      };
    } catch (error) {
      logger.error('Error rejecting GCash payment proof:', error);
      throw error;
    }
  }

  /**
   * Reupload payment proof after rejection
   * @param {number} requestId - Document request ID
   * @param {Object} file - New uploaded file object from multer
   * @param {number} clientId - Client ID for verification
   * @param {string} referenceNumber - Optional GCash reference number
   * @returns {Promise<Object>} Reupload result
   */
  async reuploadPaymentProof(requestId, file, clientId, referenceNumber = null) {
    try {
      // Verify request exists and belongs to client
      const request = await this.getRequestById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      if (request.client_id !== clientId) {
        throw new Error('Unauthorized: Request does not belong to this client');
      }

      // Verify previous proof was rejected
      if (request.gcash_verification_status !== 'rejected') {
        throw new Error('Can only reupload after rejection');
      }

      // Delete old proof file
      if (request.gcash_proof_name) {
        deleteGCashProof(request.gcash_proof_name);
      }

      // Update request with new payment proof
      const updateQuery = `
        UPDATE document_requests 
        SET 
          gcash_proof_path = ?,
          gcash_proof_name = ?,
          gcash_proof_uploaded_at = CURRENT_TIMESTAMP,
          gcash_verification_status = 'pending',
          gcash_reference_number = ?,
          gcash_rejection_reason = NULL,
          gcash_verified_by = NULL,
          gcash_verified_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      const relativePath = `uploads/gcash_proofs/${file.filename}`;
      
      await executeQuery(updateQuery, [
        relativePath,
        file.filename,
        referenceNumber,
        requestId
      ]);

      logger.info('GCash payment proof reuploaded', {
        requestId,
        clientId,
        filename: file.filename
      });

      // Notify all admins about reuploaded proof via SMS, Email, and System Notification
      await this.notifyAdminsReupload(request, file.filename);

      return {
        success: true,
        message: 'Payment proof reuploaded successfully. Awaiting admin verification.',
        data: {
          requestId,
          filename: file.filename,
          uploadedAt: new Date(),
          verificationStatus: 'pending'
        }
      };
    } catch (error) {
      logger.error('Error reuploading GCash payment proof:', error);
      throw error;
    }
  }

  /**
   * Get payment proof image
   * @param {number} requestId - Document request ID
   * @param {number} userId - User ID (client or admin)
   * @param {string} userType - 'client' or 'admin'
   * @returns {Promise<Object>} Image file data
   */
  async getPaymentProofImage(requestId, userId, userType) {
    try {
      const request = await this.getRequestById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      logger.info(`Getting payment proof for request ${requestId}:`, {
        gcash_proof_name: request.gcash_proof_name,
        gcash_proof_path: request.gcash_proof_path,
        userType,
        userId
      });

      // Verify authorization
      if (userType === 'client' && request.client_id !== userId) {
        throw new Error('Unauthorized access');
      }

      // Check both gcash_proof_name and gcash_proof_path
      if (!request.gcash_proof_name && !request.gcash_proof_path) {
        throw new Error('No payment proof uploaded');
      }

      // Construct file path - use gcash_proof_name if available, otherwise extract from path
      const filename = request.gcash_proof_name || 
                      (request.gcash_proof_path ? path.basename(request.gcash_proof_path) : null);
      
      if (!filename) {
        throw new Error('Payment proof filename not found');
      }

      const gcashProofsDir = path.join(__dirname, '../../uploads/gcash_proofs');
      const filePath = path.join(gcashProofsDir, filename);

      logger.info(`Checking file existence at: ${filePath}`);

      if (!fs.existsSync(filePath)) {
        logger.error(`File not found at path: ${filePath}`);
        throw new Error(`Payment proof file not found at: ${filePath}`);
      }

      return {
        success: true,
        filePath,
        filename: filename,
        mimeType: this.getMimeType(filename)
      };
    } catch (error) {
      logger.error('Error retrieving GCash payment proof image:', error);
      throw error;
    }
  }

  /**
   * Get pending payment proofs for admin
   * @returns {Promise<Array>} List of pending proofs
   */
  async getPendingProofs() {
    try {
      const query = `
        SELECT 
          dr.id,
          dr.request_number,
          dr.client_id,
          dr.document_type_id,
          dr.gcash_proof_name,
          dr.gcash_proof_uploaded_at,
          dr.gcash_reference_number,
          dr.total_document_fee,
          ca.first_name,
          ca.last_name,
          ca.email,
          ca.phone_number,
          dt.type_name as document_type
        FROM document_requests dr
        JOIN client_accounts ca ON dr.client_id = ca.id
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.gcash_verification_status = 'pending'
          AND dr.gcash_proof_name IS NOT NULL
        ORDER BY dr.gcash_proof_uploaded_at ASC
      `;

      const results = await executeQuery(query);
      return results;
    } catch (error) {
      logger.error('Error fetching pending GCash proofs:', error);
      throw error;
    }
  }

  // Helper methods

  async getRequestById(requestId) {
    const query = `
      SELECT
        dr.id,
        dr.request_number,
        dr.client_id,
        dr.document_type_id,
        dr.purpose_category_id,
        dr.purpose_details,
        dr.status_id,
        dr.priority,
        dr.processed_by,
        dr.approved_by,
        dr.processed_at,
        dr.approved_at,
        dr.payment_method_id,
        dr.payment_status,
        dr.payment_reference,
        dr.payment_provider_reference,
        dr.paid_at,
        dr.delivery_method,
        dr.delivery_address,
        dr.requested_at,
        dr.target_completion_date,
        dr.completed_at,
        dr.created_at,
        dr.updated_at,
        dr.gcash_proof_path,
        dr.gcash_proof_name,
        dr.gcash_proof_uploaded_at,
        dr.gcash_verification_status,
        dr.gcash_verified_by,
        dr.gcash_verified_at,
        dr.gcash_reference_number,
        dr.total_document_fee,
        cp.first_name,
        cp.last_name,
        cp.email,
        cp.phone_number,
        dt.type_name as document_type,
        pm.method_name as payment_method,
        pm.method_code as payment_method_code
      FROM document_requests dr
      JOIN client_accounts ca ON dr.client_id = ca.id
      LEFT JOIN client_profiles cp ON ca.id = cp.account_id
      JOIN document_types dt ON dr.document_type_id = dt.id
      LEFT JOIN payment_methods pm ON dr.payment_method_id = pm.id
      WHERE dr.id = ?
    `;

    const results = await executeQuery(query, [requestId]);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Generate receipt for verified payment
   */
  async generateReceipt(requestId) {
    try {
      const request = await this.getRequestById(requestId);
      if (!request) {
        throw new Error('Request not found');
      }

      // Check if receipt already exists
      const existingReceiptQuery = 'SELECT * FROM receipts WHERE request_id = ?';
      const existingReceipts = await executeQuery(existingReceiptQuery, [requestId]);
      
      if (existingReceipts.length > 0) {
        logger.info('Receipt already exists for request', { requestId });
        return existingReceipts[0];
      }

      // Create transaction record for GCash payment
      const transactionQuery = `
        INSERT INTO payment_transactions (
          request_id, payment_method_id, amount, status,
          initiated_at, completed_at
        ) VALUES (?, ?, ?, 'completed', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;

      const transactionResult = await executeQuery(transactionQuery, [
        requestId,
        request.payment_method_id,
        request.total_document_fee || request.total_amount || 0
      ]);

      const transactionId = transactionResult.insertId;

      // Generate receipt number
      const receiptNumber = Receipt.generateReceiptNumber(transactionId);

      // Create receipt
      const receiptData = {
        transaction_id: transactionId,
        client_id: request.client_id,
        request_id: requestId,
        receipt_number: receiptNumber,
        client_name: `${request.first_name} ${request.last_name}`,
        client_email: request.email,
        client_phone: request.phone_number,
        request_number: request.request_number,
        document_type: request.document_type,
        payment_method: 'GCash Manual Upload',
        payment_method_code: 'GCASH_MANUAL',
        amount: request.total_document_fee || request.total_amount || 0,
        processing_fee: 0,
        net_amount: request.total_document_fee || request.total_amount || 0,
        currency: 'PHP',
        external_transaction_id: request.gcash_reference_number || null,
        paymongo_payment_intent_id: null,
        payment_status: 'succeeded',
        receipt_date: new Date(),
        payment_date: new Date(),
        description: `GCash manual payment for ${request.document_type}`,
        notes: 'Payment verified by admin'
      };

      const receipt = await Receipt.create(receiptData);

      logger.info('Receipt generated for GCash payment', {
        requestId,
        receiptId: receipt.id,
        receiptNumber
      });

      return receipt;
    } catch (error) {
      logger.error('Error generating receipt for GCash payment:', error);
      throw error;
    }
  }

  /**
   * Notify all admins about new payment proof upload
   */
  async notifyAdminsNewProof(request, filename, isReupload = false) {
    try {
      // Get all active admins with contact info
      const adminsQuery = `
        SELECT 
          a.id, 
          a.username, 
          p.email, 
          p.phone_number 
        FROM admin_employee_accounts a
        LEFT JOIN admin_employee_profiles p ON a.id = p.account_id
        WHERE a.status = 'active'
      `;
      const admins = await executeQuery(adminsQuery);

      const notificationType = isReupload ? 'gcash_proof_reuploaded' : 'gcash_proof_uploaded';
      const title = isReupload ? 'GCash Payment Proof Reuploaded' : 'New GCash Payment Proof';
      const message = `${request.first_name} ${request.last_name} ${isReupload ? 'reuploaded' : 'uploaded'} payment proof for request #${request.request_number}`;

      for (const admin of admins) {
        const notification = await notificationService.createNotification({
          recipient_id: admin.id,
          recipient_type: 'admin',
          type: notificationType,
          title,
          message,
          data: JSON.stringify({
            request_id: request.id,
            request_number: request.request_number,
            client_name: `${request.first_name} ${request.last_name}`,
            document_type: request.document_type,
            filename
          })
        });

        // Send real-time notification
        notificationService.sendToUser(admin.id, notification);
      }

      // Also send to admin connections for backward compatibility
      if (admins.length > 0) {
        notificationService.sendToAdmins({
          type: notificationType,
          title,
          message,
          data: {
            request_id: request.id,
            request_number: request.request_number
          }
        });
      }

      logger.info('Notified admins about GCash payment proof', {
        requestId: request.id,
        adminCount: admins.length,
        isReupload
      });
    } catch (error) {
      logger.error('Error notifying admins about payment proof:', error);
      // Don't throw - notification failure shouldn't stop the upload
    }
  }

  /**
   * Notify all admins about reuploaded payment proof (with SMS and Email)
   */
  async notifyAdminsReupload(request, filename) {
    try {
      // Get all active admins with contact info
      const adminsQuery = `
        SELECT 
          a.id, 
          a.username, 
          p.email, 
          p.phone_number 
        FROM admin_employee_accounts a
        LEFT JOIN admin_employee_profiles p ON a.id = p.account_id
        WHERE a.status = 'active'
      `;
      const admins = await executeQuery(adminsQuery);

      const clientName = `${request.first_name} ${request.last_name}`;
      const title = 'GCash Payment Proof Reuploaded';
      const message = `${clientName} reuploaded payment proof for ${request.document_type} request #${request.request_number}. Please review.`;

      for (const admin of admins) {
        // Create in-app notification
        const notification = await notificationService.createNotification({
          recipient_id: admin.id,
          recipient_type: 'admin',
          type: 'gcash_proof_reuploaded',
          title,
          message,
          data: JSON.stringify({
            request_id: request.id,
            request_number: request.request_number,
            client_name: clientName,
            document_type: request.document_type,
            filename
          })
        });

        // Send real-time notification
        notificationService.sendToUser(admin.id, notification);

        // Send email notification
        if (admin.email) {
          const emailSubject = 'GCash Payment Proof Reuploaded - Review Required';
          const emailContent = this.generateReuploadEmailTemplate(request, admin.username);
          await emailService.sendEmail(admin.email, emailSubject, emailContent);
        }

        // Send SMS notification
        if (admin.phone_number) {
          await smsService.sendSMS(
            admin.phone_number,
            `Admin Alert: ${clientName} reuploaded GCash payment proof for ${request.document_type} (Req #${request.request_number}). Please review in the system.`
          );
        }
      }

      // Also send to admin connections for backward compatibility
      if (admins.length > 0) {
        notificationService.sendToAdmins({
          type: 'gcash_proof_reuploaded',
          title,
          message,
          data: {
            request_id: request.id,
            request_number: request.request_number
          }
        });
      }

      logger.info('Notified admins about GCash payment proof reupload', {
        requestId: request.id,
        adminCount: admins.length
      });
    } catch (error) {
      logger.error('Error notifying admins about payment proof reupload:', error);
      // Don't throw - notification failure shouldn't stop the reupload
    }
  }

  /**
   * Notify client about approved payment
   */
  async notifyClientApproved(request, receipt) {
    try {
      const clientId = request.client_id;
      const clientName = `${request.first_name} ${request.last_name}`;

      // Create in-app notification
      const notification = await notificationService.createNotification({
        recipient_id: clientId,
        recipient_type: 'client',
        type: 'gcash_payment_approved',
        title: 'Payment Approved',
        message: `Your GCash payment for request #${request.request_number} has been verified and approved.`,
        data: JSON.stringify({
          request_id: request.id,
          request_number: request.request_number,
          receipt_number: receipt.receipt_number,
          amount: request.total_amount
        })
      });

      // Send real-time notification
      notificationService.sendToUser(clientId, notification);

      // Send email notification
      const emailSubject = 'Payment Approved - Barangay Document Request';
      const emailContent = this.generateApprovalEmailTemplate(request, receipt);
      await emailService.sendEmail(request.email, emailSubject, emailContent);

      // Send SMS notification
      await smsService.sendSMS(
        request.phone_number,
        `Good news ${clientName}! Your GCash payment for ${request.document_type} (Req #${request.request_number}) has been approved. Receipt #${receipt.receipt_number}. Thank you!`
      );

      logger.info('Notified client about payment approval', {
        clientId,
        requestId: request.id,
        receiptNumber: receipt.receipt_number
      });
    } catch (error) {
      logger.error('Error notifying client about payment approval:', error);
      // Don't throw - notification failure shouldn't stop the verification
    }
  }

  /**
   * Notify client about rejected payment - UPDATED: No reason required
   */
  async notifyClientRejected(request) {
    try {
      const clientId = request.client_id;
      const clientName = `${request.first_name} ${request.last_name}`;

      // Create in-app notification
      const notification = await notificationService.createNotification({
        recipient_id: clientId,
        recipient_type: 'client',
        type: 'gcash_payment_rejected',
        title: 'Payment Proof Rejected',
        message: `Your GCash payment proof for request #${request.request_number} was rejected. Please reupload a valid payment proof.`,
        data: JSON.stringify({
          request_id: request.id,
          request_number: request.request_number
        })
      });

      // Send real-time notification
      notificationService.sendToUser(clientId, notification);

      // Send email notification
      const emailSubject = 'Payment Proof Rejected - Action Required';
      const emailContent = this.generateRejectionEmailTemplate(request);
      await emailService.sendEmail(request.email, emailSubject, emailContent);

      // Send SMS notification
      await smsService.sendSMS(
        request.phone_number,
        `Hello ${clientName}, your GCash payment proof for ${request.document_type} (Req #${request.request_number}) was rejected. Please reupload a valid proof. Thank you.`
      );

      logger.info('Notified client about payment rejection', {
        clientId,
        requestId: request.id
      });
    } catch (error) {
      logger.error('Error notifying client about payment rejection:', error);
      // Don't throw - notification failure shouldn't stop the rejection
    }
  }

  /**
   * Generate approval email template
   */
  generateApprovalEmailTemplate(request, receipt) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .receipt-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; background-color: #28a745; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✓ Payment Approved!</h1>
          </div>
          <div class="content">
            <p>Dear ${request.first_name} ${request.last_name},</p>
            <p>Great news! Your GCash payment has been verified and approved.</p>
            
            <div class="receipt-box">
              <h3>Payment Details</h3>
              <p><strong>Receipt Number:</strong> ${receipt.receipt_number}</p>
              <p><strong>Request Number:</strong> ${request.request_number}</p>
              <p><strong>Document Type:</strong> ${request.document_type}</p>
              <p><strong>Amount Paid:</strong> ₱${parseFloat(request.total_document_fee || request.total_amount || 0).toFixed(2)}</p>
              <p><strong>Payment Method:</strong> GCash Manual Upload</p>
              <p><strong>Payment Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <p>Your document request is now being processed. You will receive another notification once your document is ready for pickup/delivery.</p>
            
            <p>You can view and download your receipt from your transaction history.</p>
            
            <p>Thank you for using our service!</p>
          </div>
          <div class="footer">
            <p>Barangay Bula Document Management System</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate rejection email template - UPDATED: No reason required
   */
  generateRejectionEmailTemplate(request) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; background-color: #007bff; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Proof Requires Attention</h1>
          </div>
          <div class="content">
            <p>Dear ${request.first_name} ${request.last_name},</p>
            <p>We reviewed your GCash payment proof for request <strong>#${request.request_number}</strong>, but unfortunately it could not be verified.</p>

            <p><strong>What to do next:</strong></p>
            <ul>
              <li>Ensure your payment proof screenshot clearly shows:
                <ul>
                  <li>Transaction details</li>
                  <li>Amount paid</li>
                  <li>Date and time</li>
                  <li>Recipient information</li>
                </ul>
              </li>
              <li>Upload a new, clearer payment proof through your account</li>
            </ul>

            <p>Please reupload your payment proof as soon as possible to avoid delays in processing your request.</p>

            <p>If you need assistance, please contact our office.</p>
          </div>
          <div class="footer">
            <p>Barangay Bula Document Management System</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate reupload email template for admins
   */
  generateReuploadEmailTemplate(request, adminUsername) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #17a2b8; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; }
          .info-box { background-color: white; border: 1px solid #ddd; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; background-color: #17a2b8; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔄 GCash Payment Proof Reuploaded</h1>
          </div>
          <div class="content">
            <p>Hello ${adminUsername},</p>
            <p>A client has reuploaded their GCash payment proof and it requires your review.</p>
            
            <div class="info-box">
              <h3>Request Details</h3>
              <p><strong>Client Name:</strong> ${request.first_name} ${request.last_name}</p>
              <p><strong>Request Number:</strong> ${request.request_number}</p>
              <p><strong>Document Type:</strong> ${request.document_type}</p>
              <p><strong>Amount:</strong> ₱${parseFloat(request.total_amount).toFixed(2)}</p>
              <p><strong>Reuploaded:</strong> ${new Date().toLocaleString()}</p>
            </div>
            
            <p>Please log in to the admin panel to review and verify the payment proof.</p>
            
            <p><strong>Action Required:</strong> Approve or reject the payment proof based on its validity.</p>
          </div>
          <div class="footer">
            <p>Barangay Bula Document Management System - Admin Notification</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Get MIME type from filename
   */
  getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}

module.exports = new GCashPaymentService();
