const SupportingDocument = require('../models/SupportingDocument');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const smsService = require('./smsService');
const emailService = require('./emailService');
const notificationService = require('./notificationService');

class SupportingDocumentService {
  // Format document type for display
  static formatDocumentType(documentType) {
    const typeMap = {
      'government_id': 'Government ID',
      'proof_of_residency': 'Proof of Residency',
      'cedula': 'Community Tax Certificate (Cedula)'
    };
    return typeMap[documentType] || documentType;
  }

  // Update document verification status (approve/reject)
  static async updateDocumentVerificationStatus(documentId, status, adminId) {
    try {
      const document = await SupportingDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      const accountId = document.account_id;

      // Update document status
      await document.updateVerificationStatus(status, adminId, null);

      logger.info('Supporting document verification status updated', {
        documentId,
        accountId,
        status,
        adminId
      });

      // Send notifications for both approval and rejection
      if (status === 'approved' || status === 'rejected') {
        logger.info(`🔔 Preparing to send ${status} notifications`, {
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
          
          logger.info('Client information retrieved', {
            found: clientResult.length > 0,
            hasEmail: clientResult[0]?.email ? 'yes' : 'no',
            hasPhone: clientResult[0]?.phone_number ? 'yes' : 'no'
          });

          if (clientResult.length > 0) {
            const client = clientResult[0];
            const clientName = `${client.first_name} ${client.last_name}`;
            const documentTypeName = this.formatDocumentType(document.document_type);

            if (status === 'approved') {
              logger.info('📧 Sending approval notifications', {
                documentId,
                accountId,
                documentType: document.document_type
              });
              
              // Send in-app notification for approval
              logger.info('Creating in-app notification for approval');
              
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'supporting_document_approved'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `Your ${documentTypeName} has been approved.`
              ]);

              if (duplicateCheck.length === 0) {
                await notificationService.createNotification({
                  recipient_id: accountId,
                  recipient_type: 'client',
                  type: 'supporting_document_approved',
                  title: 'Document Approved',
                  message: `Your ${documentTypeName} has been approved.`,
                  data: {
                    document_id: documentId,
                    document_type: document.document_type,
                    approved_by: adminId,
                    approved_at: new Date().toISOString()
                  },
                  priority: 'medium'
                });
                logger.info('✅ In-app notification created for approval');
              } else {
                logger.info('Duplicate notification prevented (approved)', { documentId, accountId });
              }

              // Send real-time notification
              notificationService.sendToUser(accountId, {
                type: 'supporting_document_approved',
                title: 'Document Approved',
                message: `Your ${documentTypeName} has been approved.`,
                data: {
                  document_id: documentId,
                  document_type: document.document_type
                }
              });

              // Send SMS notification for approval
              if (client.phone_number) {
                try {
                  const smsResult = await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, your ${documentTypeName} has been approved! Thank you for your submission.`
                  });
                  
                  if (smsResult.success) {
                    logger.info('Document approval SMS sent', {
                      documentId,
                      accountId,
                      phoneNumber: client.phone_number
                    });
                  } else {
                    logger.error('Failed to send document approval SMS', {
                      documentId,
                      accountId,
                      error: smsResult.error || smsResult.message
                    });
                  }
                } catch (smsError) {
                  logger.error('Failed to send document approval SMS', {
                    documentId,
                    accountId,
                    error: smsError.message
                  });
                }
              }

              // Send email notification for approval
              if (client.email) {
                try {
                  await emailService.sendEmail(
                    client.email,
                    'Document Approved',
                    `
                      <h2>Document Approved</h2>
                      <p>Dear ${clientName},</p>
                      <p>Great news! Your ${documentTypeName} has been approved.</p>
                      <p>You can now proceed with your document requests.</p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Document approval email sent', {
                    documentId,
                    accountId,
                    email: client.email
                  });
                } catch (emailError) {
                  logger.error('Failed to send document approval email', {
                    documentId,
                    accountId,
                    error: emailError.message
                  });
                }
              }
            } else if (status === 'rejected') {
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'supporting_document_rejected'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `Your ${documentTypeName} was rejected. Please reupload in your account.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification for rejection
                await notificationService.createNotification({
                  recipient_id: accountId,
                  recipient_type: 'client',
                  type: 'supporting_document_rejected',
                  title: 'Document Rejected',
                  message: `Your ${documentTypeName} was rejected. Please reupload in your account.`,
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
                type: 'supporting_document_rejected',
                title: 'Document Rejected',
                message: `Your ${documentTypeName} was rejected. Please reupload in your account.`,
                data: {
                  document_id: documentId,
                  document_type: document.document_type
                }
              });

              // Send SMS notification for rejection
              if (client.phone_number) {
                try {
                  const smsResult = await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, your ${documentTypeName} was rejected. Please reupload in your account.`
                  });
                  
                  if (smsResult.success) {
                    logger.info('Document rejection SMS sent', {
                      documentId,
                      accountId,
                      phoneNumber: client.phone_number
                    });
                  } else {
                    logger.error('Failed to send document rejection SMS', {
                      documentId,
                      accountId,
                      phoneNumber: client.phone_number,
                      error: smsResult.error || smsResult.message
                    });
                  }
                } catch (smsError) {
                  logger.error('Failed to send document rejection SMS', {
                    documentId,
                    accountId,
                    error: smsError.message
                  });
                }
              }

              // Send email notification for rejection
              if (client.email) {
                try {
                  await emailService.sendEmail(
                    client.email,
                    'Document Rejected - Action Required',
                    `
                      <h2>Document Rejected</h2>
                      <p>Dear ${clientName},</p>
                      <p>Your ${documentTypeName} was rejected.</p>
                      <p>Please log in to your account and reupload the document.</p>
                      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/client/rejected-documents">Click here to reupload</a></p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Document rejection email sent', {
                    documentId,
                    accountId,
                    email: client.email
                  });
                } catch (emailError) {
                  logger.error('Failed to send document rejection email', {
                    documentId,
                    accountId,
                    error: emailError.message
                  });
                }
              }
            }
          }
        } catch (notificationError) {
          logger.error('Failed to send document status notifications', {
            documentId,
            accountId,
            status,
            error: notificationError.message
          });
        }
      }

      return {
        success: true,
        message: `Document ${status} successfully`,
        data: document
      };
    } catch (error) {
      logger.error('Error updating document verification status', {
        documentId,
        error: error.message
      });
      throw error;
    }
  }

  // Get rejected documents for client
  static async getRejectedDocumentsForClient(clientId) {
    try {
      const query = `
        SELECT sd.*, dr.request_number, dt.type_name as document_request_type
        FROM supporting_documents sd
        LEFT JOIN document_requests dr ON sd.request_id = dr.id
        LEFT JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE sd.account_id = ? AND sd.verification_status = 'rejected'
        ORDER BY sd.created_at DESC
      `;
      
      const results = await executeQuery(query, [clientId]);
      
      logger.info('Rejected supporting documents retrieved', {
        clientId,
        documentsCount: results ? results.length : 0,
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
      logger.error('Error getting rejected supporting documents', {
        clientId,
        error: error.message
      });
      throw error;
    }
  }

  // Reupload a rejected supporting document
  static async reuploadDocument(documentId, file, clientId) {
    try {
      const document = await SupportingDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      console.log('🔍 Reupload authorization check:');
      console.log('   Document ID:', documentId);
      console.log('   Document account_id:', document.account_id, `(${typeof document.account_id})`);
      console.log('   Client ID:', clientId, `(${typeof clientId})`);
      console.log('   Strict equal (===):', document.account_id === clientId);
      console.log('   Loose equal (==):', document.account_id == clientId);
      console.log('   Full document object:', document);

      logger.info('Reupload authorization check', {
        documentId,
        documentAccountId: document.account_id,
        documentAccountIdType: typeof document.account_id,
        clientId,
        clientIdType: typeof clientId,
        areEqual: document.account_id === clientId,
        looseEqual: document.account_id == clientId
      });

      // Verify the document belongs to the client (use loose equality to handle type mismatch)
      if (document.account_id != clientId) {
        console.log('❌ Authorization FAILED - account_id does not match clientId');
        throw new Error('Unauthorized: This document does not belong to you');
      }
      
      console.log('✅ Authorization passed');

      // Verify the document is rejected
      console.log('🔍 Supporting document verification status:', {
        documentId,
        verification_status: document.verification_status,
        expected: 'rejected'
      });
      
      if (document.verification_status !== 'rejected') {
        throw new Error(`Only rejected documents can be reuploaded. Current status: ${document.verification_status || 'null'}`);
      }

      // Convert absolute path to relative path
      const path = require('path');
      console.log('📁 File path conversion:');
      console.log('   Original file.path:', file.path);
      console.log('   Original file.filename:', file.filename);
      
      const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
      const finalPath = relativePath ? `uploads/${relativePath}` : file.path;
      
      console.log('   Relative path:', relativePath);
      console.log('   Final path to store:', finalPath);

      // Update the document with new file info
      const updateQuery = `
        UPDATE supporting_documents
        SET file_path = ?,
            document_name = ?,
            file_size = ?,
            mime_type = ?,
            verification_status = 'pending',
            verified_by = NULL,
            verified_at = NULL
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        finalPath,
        file.originalname,
        file.size,
        file.mimetype,
        documentId
      ]);
      
      console.log('✅ Database updated with new file path:', finalPath);

      logger.info('Supporting document reuploaded successfully', {
        documentId,
        clientId,
        filename: file.filename
      });

      // Get updated document and client info
      const updatedDocument = await SupportingDocument.findById(documentId);
      
      // Get client name for notification
      const clientQuery = `
        SELECT CONCAT(cp.first_name, ' ', cp.last_name) as client_name
        FROM client_accounts ca
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE ca.id = ?
      `;
      const clientResult = await executeQuery(clientQuery, [clientId]);
      const clientName = clientResult[0]?.client_name || 'A client';
      
      // Get document type display name
      const documentTypeMap = {
        'government_id': 'Government ID',
        'proof_of_residency': 'Proof of Residency',
        'cedula': 'Community Tax Certificate (Cedula)'
      };
      const documentTypeName = documentTypeMap[document.document_type] || document.document_type;

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
            'Document Reuploaded',
            `${clientName} has reuploaded a ${documentTypeName}. Please review.`
          ]);
        }
        
        logger.info('Notifications sent to admins for supporting document reupload', {
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
      logger.error('Error reuploading supporting document', {
        documentId,
        clientId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = SupportingDocumentService;
