const AuthorizationDocument = require('../models/AuthorizationDocument');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const smsService = require('./smsService');
const emailService = require('./emailService');
const notificationService = require('./notificationService');

class AuthorizationDocumentService {
  // Format document type for display
  static formatDocumentType(documentType) {
    const typeMap = {
      'authorization_letter': 'Authorization Letter',
      'valid_id': 'Valid ID',
      'additional_proof': 'Additional Proof'
    };
    return typeMap[documentType] || documentType;
  }

  // Update authorization document verification status (approve/reject)
  static async updateDocumentVerificationStatus(documentId, status, adminId) {
    try {
      const document = await AuthorizationDocument.findById(documentId);
      if (!document) {
        throw new Error('Authorization document not found');
      }

      const accountId = document.account_id;

      // Update document status
      await document.updateVerificationStatus(status, adminId);

      logger.info('Authorization document verification status updated', {
        documentId,
        accountId,
        status,
        adminId
      });

      // Send notifications
      if (status === 'approved' || status === 'rejected') {
        logger.info(`🔔 Preparing to send ${status} notifications for authorization document`, {
          documentId,
          accountId,
          status
        });
        
        try {
          // Get client information
          const clientQuery = `
            SELECT cp.email, cp.first_name, cp.last_name, cp.phone_number
            FROM client_accounts ca
            LEFT JOIN client_profiles cp ON ca.id = cp.account_id
            WHERE ca.id = ?
          `;
          const clientResult = await executeQuery(clientQuery, [accountId]);

          if (clientResult.length > 0) {
            const client = clientResult[0];
            const clientName = `${client.first_name} ${client.last_name}`;
            const documentTypeName = this.formatDocumentType(document.document_type);

            if (status === 'approved') {
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'authorization_document_approved'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `Your ${documentTypeName} for authorized pickup has been approved.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification
                await notificationService.createNotification({
                  recipient_id: accountId,
                  recipient_type: 'client',
                  type: 'authorization_document_approved',
                  title: 'Authorization Document Approved',
                  message: `Your ${documentTypeName} for authorized pickup has been approved.`,
                  data: {
                    document_id: documentId,
                    document_type: document.document_type,
                    approved_by: adminId,
                    approved_at: new Date().toISOString()
                  },
                  priority: 'medium'
                });
              } else {
                logger.info('Duplicate notification prevented (approved)', { documentId, accountId });
              }

              // Send real-time notification
              notificationService.sendToUser(accountId, {
                type: 'authorization_document_approved',
                title: 'Authorization Document Approved',
                message: `Your ${documentTypeName} has been approved.`
              });

              // Send SMS
              if (client.phone_number) {
                try {
                  await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, your ${documentTypeName} for authorized pickup has been approved!`
                  });
                  logger.info('Authorization document approval SMS sent', {
                    documentId,
                    accountId
                  });
                } catch (smsError) {
                  logger.error('Failed to send authorization document approval SMS', {
                    documentId,
                    error: smsError.message
                  });
                }
              }

              // Send email
              if (client.email) {
                try {
                  await emailService.sendEmail(
                    client.email,
                    'Authorization Document Approved',
                    `
                      <h2>Authorization Document Approved</h2>
                      <p>Dear ${clientName},</p>
                      <p>Great news! Your ${documentTypeName} for authorized pickup has been approved.</p>
                      <p>Your authorized person can now pick up the document on your behalf.</p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Authorization document approval email sent', {
                    documentId,
                    accountId
                  });
                } catch (emailError) {
                  logger.error('Failed to send authorization document approval email', {
                    documentId,
                    error: emailError.message
                  });
                }
              }
            } else if (status === 'rejected') {
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'authorization_document_rejected'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `Your ${documentTypeName} for authorized pickup was rejected. Please reupload.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification
                await notificationService.createNotification({
                  recipient_id: accountId,
                  recipient_type: 'client',
                  type: 'authorization_document_rejected',
                  title: 'Authorization Document Rejected',
                  message: `Your ${documentTypeName} for authorized pickup was rejected. Please reupload.`,
                  data: {
                    document_id: documentId,
                    document_type: document.document_type,
                    rejected_by: adminId,
                    rejected_at: new Date().toISOString()
                  },
                  priority: 'high'
                });
              } else {
                logger.info('Duplicate notification prevented (rejected)', { documentId, accountId });
              }

              // Send real-time notification
              notificationService.sendToUser(accountId, {
                type: 'authorization_document_rejected',
                title: 'Authorization Document Rejected',
                message: `Your ${documentTypeName} was rejected. Please reupload.`
              });

              // Send SMS
              if (client.phone_number) {
                try {
                  await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, your ${documentTypeName} for authorized pickup was rejected. Please reupload in your account.`
                  });
                  logger.info('Authorization document rejection SMS sent', {
                    documentId,
                    accountId
                  });
                } catch (smsError) {
                  logger.error('Failed to send authorization document rejection SMS', {
                    documentId,
                    error: smsError.message
                  });
                }
              }

              // Send email
              if (client.email) {
                try {
                  await emailService.sendEmail(
                    client.email,
                    'Authorization Document Rejected - Action Required',
                    `
                      <h2>Authorization Document Rejected</h2>
                      <p>Dear ${clientName},</p>
                      <p>Your ${documentTypeName} for authorized pickup was rejected.</p>
                      <p>Please log in to your account and reupload the authorization document.</p>
                      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/client/rejected-documents">Click here to reupload</a></p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Authorization document rejection email sent', {
                    documentId,
                    accountId
                  });
                } catch (emailError) {
                  logger.error('Failed to send authorization document rejection email', {
                    documentId,
                    error: emailError.message
                  });
                }
              }
            }
          }
        } catch (notificationError) {
          logger.error('Failed to send authorization document notifications', {
            documentId,
            accountId,
            status,
            error: notificationError.message
          });
        }
      }

      return {
        success: true,
        message: `Authorization document ${status} successfully`,
        data: document
      };
    } catch (error) {
      logger.error('Error updating authorization document verification status', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }

  // Get rejected authorization documents for client
  static async getRejectedAuthorizationDocuments(clientId) {
    try {
      const results = await AuthorizationDocument.getRejectedByAccountId(clientId);
      
      logger.info('Rejected authorization documents retrieved', {
        clientId,
        count: results ? results.length : 0,
        resultsType: typeof results,
        isArray: Array.isArray(results)
      });
      
      // Handle null or undefined results
      if (!results) {
        logger.warn('Query returned null/undefined results', { clientId });
        return [];
      }
      
      // Convert to plain objects to ensure JSON serialization
      return Array.isArray(results) ? results.map(row => ({ ...row })) : [];
    } catch (error) {
      logger.error('Error getting rejected authorization documents', {
        clientId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Get authorization documents by pickup person ID
  static async getByPickupPersonId(pickupPersonId) {
    try {
      const results = await AuthorizationDocument.getByPickupPersonId(pickupPersonId);
      
      logger.info('Authorization documents retrieved by pickup person ID', {
        pickupPersonId,
        count: results.length
      });
      
      return results;
    } catch (error) {
      logger.error('Error getting authorization documents by pickup person ID', {
        pickupPersonId,
        error: error.message
      });
      throw error;
    }
  }

  // Reupload a rejected authorization document
  static async reuploadDocument(documentId, file, clientId) {
    try {
      const document = await AuthorizationDocument.findById(documentId);
      if (!document) {
        throw new Error('Authorization document not found');
      }

      // Verify the document belongs to the client
      if (document.account_id !== clientId) {
        throw new Error('Unauthorized: This document does not belong to you');
      }

      // Verify the document is rejected
      console.log('🔍 Authorization document verification status:', {
        documentId,
        verification_status: document.verification_status,
        expected: 'rejected'
      });
      
      if (document.verification_status !== 'rejected') {
        throw new Error(`Only rejected documents can be reuploaded. Current status: ${document.verification_status || 'null'}`);
      }

      // Convert absolute path to relative path
      const path = require('path');
      const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
      const finalPath = relativePath ? `uploads/${relativePath}` : file.path;

      // Update the document with new file info
      const updateQuery = `
        UPDATE authorization_documents
        SET file_path = ?,
            document_name = ?,
            file_size = ?,
            mime_type = ?,
            verification_status = 'pending',
            verified_by = NULL,
            verified_at = NULL,
            verification_notes = NULL
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        finalPath,
        file.originalname,
        file.size,
        file.mimetype,
        documentId
      ]);

      logger.info('Authorization document reuploaded successfully', {
        documentId,
        clientId,
        filename: file.filename
      });

      // Get updated document and client info
      const updatedDocument = await AuthorizationDocument.findById(documentId);
      
      // Get client name for notification
      const clientQuery = `
        SELECT CONCAT(cp.first_name, ' ', cp.last_name) as client_name
        FROM client_accounts ca
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE ca.id = ?
      `;
      const clientResult = await executeQuery(clientQuery, [clientId]);
      const clientName = clientResult[0]?.client_name || 'A client';

      // Send notification to all admins
      try {
        const adminQuery = `
          SELECT id FROM admin_employee_accounts WHERE status = 'active'
        `;
        const admins = await executeQuery(adminQuery);
        
        for (const admin of admins) {
          const notificationQuery = `
            INSERT INTO notifications (
              recipient_id, recipient_type, type, title, message, 
              data, priority, created_at
            ) VALUES (?, 'admin', 'document_reupload', ?, ?, NULL, 'high', NOW())
          `;
          
          await executeQuery(notificationQuery, [
            admin.id,
            'Authorization Document Reuploaded',
            `${clientName} has reuploaded an authorization document. Please review.`
          ]);
        }
        
        logger.info('Notifications sent to admins for authorization document reupload', {
          documentId,
          clientId,
          adminCount: admins.length
        });
      } catch (notifError) {
        logger.error('Failed to send notifications to admins', {
          error: notifError.message,
          documentId,
          clientId
        });
        // Don't throw - notification failure shouldn't block the reupload
      }

      return {
        success: true,
        message: 'Document reuploaded successfully. It will be reviewed by admin.',
        data: updatedDocument
      };
    } catch (error) {
      logger.error('Error reuploading authorization document', {
        documentId,
        clientId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = AuthorizationDocumentService;
