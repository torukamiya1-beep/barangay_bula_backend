const ResidencyDocument = require('../models/ResidencyDocument');
const ClientAccount = require('../models/ClientAccount');
const ClientProfile = require('../models/ClientProfile');
const { cleanupUploadedFiles } = require('../middleware/residencyUpload');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const ComprehensiveActivityLogService = require('./comprehensiveActivityLogService');
const notificationService = require('./notificationService');
const smsService = require('./smsService');
const emailService = require('./emailService');
const fs = require('fs');
const path = require('path');

class ResidencyService {
  // Upload residency documents for an account
  static async uploadResidencyDocuments(accountId, files, documentTypes) {
    try {
      // Validate account exists
      const account = await ClientAccount.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Check if account is in the right status for document upload
      if (!['pending_verification', 'pending_residency_verification', 'residency_rejected'].includes(account.status)) {
        throw new Error('Account is not eligible for residency document upload');
      }

      const uploadedDocuments = [];
      const errors = [];

      // Process each uploaded file
      for (const [fieldName, fileArray] of Object.entries(files)) {
        for (const file of fileArray) {
          try {
            const documentData = {
              account_id: accountId,
              document_type: fieldName,
              document_name: file.originalname,
              file_path: path.basename(file.path), // Store only filename, not full path
              file_size: file.size,
              mime_type: file.mimetype
            };

            const document = await ResidencyDocument.create(documentData);
            uploadedDocuments.push(document);

            logger.info('Residency document uploaded', {
              accountId,
              documentId: document.id,
              documentType: fieldName,
              fileName: file.originalname
            });
          } catch (error) {
            errors.push(`Failed to save ${file.originalname}: ${error.message}`);
            
            // Clean up the file if database save failed
            if (fs.existsSync(file.path)) {
              try {
                fs.unlinkSync(file.path);
              } catch (cleanupError) {
                logger.error('Failed to cleanup file after database error', {
                  filePath: file.path,
                  error: cleanupError.message
                });
              }
            }
          }
        }
      }

      // Note: We don't update client_accounts.status when documents are uploaded
      // Account status remains 'active' to allow login
      // Residency verification status is tracked via residency_documents.verification_status
      if (uploadedDocuments.length > 0) {
        logger.info('Residency documents uploaded successfully', {
          accountId,
          documentsUploaded: uploadedDocuments.length
        });
      }

      return {
        success: true,
        data: {
          uploadedDocuments: uploadedDocuments.map(doc => doc.toJSON()),
          errors: errors.length > 0 ? errors : null
        },
        message: `Successfully uploaded ${uploadedDocuments.length} residency document(s)`
      };
    } catch (error) {
      // Clean up any uploaded files if there was an error
      if (files) {
        cleanupUploadedFiles(files);
      }
      
      logger.error('Failed to upload residency documents', {
        accountId,
        error: error.message
      });
      throw error;
    }
  }

  // Get residency documents for an account
  static async getAccountResidencyDocuments(accountId) {
    try {
      const documents = await ResidencyDocument.findByAccountId(accountId);
      
      return {
        success: true,
        data: documents.map(doc => doc.toJSON()),
        message: 'Residency documents retrieved successfully'
      };
    } catch (error) {
      logger.error('Failed to get residency documents', {
        accountId,
        error: error.message
      });
      throw error;
    }
  }

  // Get pending residency verifications for admin
  static async getPendingVerifications(page = 1, limit = 10) {
    try {
      const result = await ResidencyDocument.getPendingDocuments(page, limit);
      
      return {
        success: true,
        data: result.documents,
        pagination: result.pagination,
        message: 'Pending residency verifications retrieved successfully'
      };
    } catch (error) {
      logger.error('Failed to get pending residency verifications', {
        error: error.message
      });
      throw error;
    }
  }

  // Approve residency verification
  static async approveResidencyVerification(accountId, adminId, documentIds = []) {
    try {
      const account = await ClientAccount.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      const profile = await ClientProfile.findByAccountId(accountId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      // Update document verification status
      const documents = await ResidencyDocument.findByAccountId(accountId);
      for (const document of documents) {
        if (documentIds.length === 0 || documentIds.includes(document.id)) {
          await document.updateVerificationStatus('approved', adminId);
        }
      }

      // Update profile residency verification
      await profile.updateResidencyVerification(true, adminId);

      // Note: We don't update client_accounts.status here anymore
      // Account status should already be 'active' after OTP verification
      // Residency verification is now managed separately via residency_documents.verification_status

      logger.info('Residency verification approved', {
        accountId,
        adminId,
        approvedDocuments: documentIds.length || documents.length
      });

      // Log audit activity for residency approval
      try {
        await ComprehensiveActivityLogService.logActivity({
          userId: adminId,
          userType: 'admin',
          action: 'residency_approval',
          tableName: 'client_accounts',
          recordId: accountId,
          newValues: {
            approval_timestamp: new Date().toISOString(),
            approved_documents: documentIds.length || documents.length,
            admin_id: adminId
          }
        });
      } catch (auditError) {
        logger.error('Failed to log residency approval audit', {
          accountId,
          adminId,
          error: auditError.message
        });
      }

      // Send notification to client
      try {
        // Check for duplicate notification in last 10 seconds
        const checkDuplicateQuery = `
          SELECT id FROM notifications 
          WHERE recipient_id = ? 
            AND type = 'residency_approved'
            AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
          LIMIT 1
        `;
        const duplicateCheck = await executeQuery(checkDuplicateQuery, [accountId]);

        if (duplicateCheck.length === 0) {
          await notificationService.createNotification({
            recipient_id: accountId,
            recipient_type: 'client',
            type: 'residency_approved',
            title: 'Residency Verification Approved',
            message: 'Your residency verification has been approved. You can now request documents.',
            data: {
              account_id: accountId,
              approved_by: adminId,
              approved_at: new Date().toISOString()
            },
            priority: 'high'
          });
        } else {
          logger.info('Duplicate residency approval notification prevented', { accountId });
        }

        // Send real-time notification
        notificationService.sendToUser(accountId, {
          type: 'residency_approved',
          title: 'Residency Verification Approved',
          message: 'Your residency verification has been approved. You can now request documents.',
          data: {
            account_id: accountId,
            approved_by: adminId,
            approved_at: new Date().toISOString()
          }
        });

        // Send email and SMS notifications
        try {
          const clientQuery = `
            SELECT first_name, last_name, phone_number, email
            FROM client_profiles cp
            JOIN client_accounts ca ON cp.account_id = ca.id
            WHERE cp.account_id = ?
          `;
          const clientResult = await executeQuery(clientQuery, [accountId]);

          if (clientResult.length > 0) {
            const client = clientResult[0];
            const clientName = `${client.first_name} ${client.last_name}`;

            // Send email notification
            try {
              if (client.email) {
                await emailService.sendAccountApprovalEmail(
                  client.email,
                  client.first_name,
                  client.last_name
                );
                logger.info('Residency approval email sent', {
                  accountId,
                  email: client.email
                });
              }
            } catch (emailError) {
              logger.error('Failed to send residency approval email', {
                accountId,
                error: emailError.message
              });
            }

            // Send SMS notification
            try {
              if (client.phone_number) {
                await smsService.sendAccountStatusSMS({
                  phoneNumber: client.phone_number,
                  clientName,
                  status: 'residency_approved'
                });
                logger.info('Residency approval SMS sent', {
                  accountId,
                  phoneNumber: client.phone_number
                });
              }
            } catch (smsError) {
              logger.error('Failed to send residency approval SMS', {
                accountId,
                error: smsError.message
              });
            }
          }
        } catch (notificationError) {
          logger.error('Failed to retrieve client data for approval notification', {
            accountId,
            error: notificationError.message
          });
        }
      } catch (notificationError) {
        logger.error('Failed to send approval notification', {
          accountId,
          error: notificationError.message
        });
      }

      return {
        success: true,
        data: {
          accountId,
          status: 'approved',
          approvedAt: new Date()
        },
        message: 'Residency verification approved successfully'
      };
    } catch (error) {
      logger.error('Failed to approve residency verification', {
        accountId,
        adminId,
        error: error.message
      });
      throw error;
    }
  }

  // Reject residency verification
  static async rejectResidencyVerification(accountId, adminId, rejectionReason, documentIds = []) {
    try {
      const account = await ClientAccount.findById(accountId);
      if (!account) {
        throw new Error('Account not found');
      }

      // Update document verification status
      const documents = await ResidencyDocument.findByAccountId(accountId);
      for (const document of documents) {
        if (documentIds.length === 0 || documentIds.includes(document.id)) {
          await document.updateVerificationStatus('rejected', adminId, rejectionReason);
        }
      }

      // Note: We don't update client_accounts.status here anymore
      // Account status remains 'active' to allow login
      // Residency verification rejection is now managed via residency_documents.verification_status

      logger.info('Residency verification rejected', {
        accountId,
        adminId,
        rejectionReason,
        rejectedDocuments: documentIds.length || documents.length
      });

      // Log audit activity for residency rejection
      try {
        await ComprehensiveActivityLogService.logActivity({
          userId: adminId,
          userType: 'admin',
          action: 'residency_rejection',
          tableName: 'client_accounts',
          recordId: accountId,
          newValues: {
            rejection_timestamp: new Date().toISOString(),
            rejection_reason: rejectionReason,
            rejected_documents: documentIds.length || documents.length,
            admin_id: adminId
          }
        });
      } catch (auditError) {
        logger.error('Failed to log residency rejection audit', {
          accountId,
          adminId,
          error: auditError.message
        });
      }

      // Send notification to client
      try {
        // Check for duplicate notification in last 10 seconds
        const checkDuplicateQuery = `
          SELECT id FROM notifications 
          WHERE recipient_id = ? 
            AND type = 'residency_rejected'
            AND message = ?
            AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
          LIMIT 1
        `;
        const duplicateCheck = await executeQuery(checkDuplicateQuery, [
          accountId,
          `Your residency verification was rejected. Reason: ${rejectionReason}`
        ]);

        if (duplicateCheck.length === 0) {
          await notificationService.createNotification({
            recipient_id: accountId,
            recipient_type: 'client',
            type: 'residency_rejected',
            title: 'Residency Verification Rejected',
            message: `Your residency verification was rejected. Reason: ${rejectionReason}`,
            data: {
              account_id: accountId,
              rejected_by: adminId,
              rejection_reason: rejectionReason,
              rejected_at: new Date().toISOString()
            },
            priority: 'high'
          });
        } else {
          logger.info('Duplicate residency rejection notification prevented', { accountId });
        }

        // Send real-time notification
        notificationService.sendToUser(accountId, {
          type: 'residency_rejected',
          title: 'Residency Verification Rejected',
          message: `Your residency verification was rejected. Reason: ${rejectionReason}`,
          data: {
            account_id: accountId,
            rejected_by: adminId,
            rejection_reason: rejectionReason,
            rejected_at: new Date().toISOString()
          }
        });

        // Send email and SMS notifications
        try {
          const clientQuery = `
            SELECT first_name, last_name, phone_number, email
            FROM client_profiles cp
            JOIN client_accounts ca ON cp.account_id = ca.id
            WHERE cp.account_id = ?
          `;
          const clientResult = await executeQuery(clientQuery, [accountId]);

          if (clientResult.length > 0) {
            const client = clientResult[0];
            const clientName = `${client.first_name} ${client.last_name}`;

            // Send email notification
            try {
              if (client.email) {
                await emailService.sendAccountRejectionEmail(
                  client.email,
                  client.first_name,
                  client.last_name,
                  rejectionReason
                );
                logger.info('Residency rejection email sent', {
                  accountId,
                  email: client.email
                });
              }
            } catch (emailError) {
              logger.error('Failed to send residency rejection email', {
                accountId,
                error: emailError.message
              });
            }

            // Send SMS notification
            try {
              if (client.phone_number) {
                await smsService.sendAccountStatusSMS({
                  phoneNumber: client.phone_number,
                  clientName,
                  status: 'residency_rejected',
                  reason: rejectionReason
                });
                logger.info('Residency rejection SMS sent', {
                  accountId,
                  phoneNumber: client.phone_number
                });
              }
            } catch (smsError) {
              logger.error('Failed to send residency rejection SMS', {
                accountId,
                error: smsError.message
              });
            }
          }
        } catch (notificationError) {
          logger.error('Failed to retrieve client data for rejection notification', {
            accountId,
            error: notificationError.message
          });
        }
      } catch (notificationError) {
        logger.error('Failed to send rejection notification', {
          accountId,
          error: notificationError.message
        });
      }

      return {
        success: true,
        data: {
          accountId,
          status: 'rejected',
          rejectionReason,
          rejectedAt: new Date()
        },
        message: 'Residency verification rejected'
      };
    } catch (error) {
      logger.error('Failed to reject residency verification', {
        accountId,
        adminId,
        error: error.message
      });
      throw error;
    }
  }

  // Delete residency document
  static async deleteResidencyDocument(documentId, accountId) {
    try {
      const document = await ResidencyDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Verify ownership
      if (document.account_id !== accountId) {
        throw new Error('Unauthorized to delete this document');
      }

      // Delete file from filesystem
      if (document.file_path && fs.existsSync(document.file_path)) {
        try {
          fs.unlinkSync(document.file_path);
        } catch (fileError) {
          logger.warn('Failed to delete file from filesystem', {
            filePath: document.file_path,
            error: fileError.message
          });
        }
      }

      // Delete from database
      await document.delete();

      logger.info('Residency document deleted', {
        documentId,
        accountId
      });

      return {
        success: true,
        message: 'Residency document deleted successfully'
      };
    } catch (error) {
      logger.error('Failed to delete residency document', {
        documentId,
        accountId,
        error: error.message
      });
      throw error;
    }
  }

  // Get document file for viewing/downloading
  static async getDocumentFile(documentId, requestingUser) {
    try {
      const document = await ResidencyDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Access control: clients can only view their own documents, admins can view any
      if (requestingUser.type === 'client' && requestingUser.id !== document.account_id) {
        throw new Error('Access denied. You can only view your own documents.');
      }

      // Check if file exists
      const fs = require('fs');
      const path = require('path');

      // Handle both full paths and filenames
      let actualFilePath;
      let possiblePaths = [];

      if (path.isAbsolute(document.file_path)) {
        // Try the original absolute path first
        possiblePaths.push(document.file_path);

        // If it's an absolute path, extract just the filename and try in uploads directory
        const filename = path.basename(document.file_path);
        possiblePaths.push(path.join(process.cwd(), 'uploads', 'residency', filename));
        possiblePaths.push(path.join(__dirname, '../../uploads/residency', filename));
      } else {
        // If it's already a relative path or filename, try multiple locations
        possiblePaths.push(path.join(process.cwd(), 'uploads', 'residency', document.file_path));
        possiblePaths.push(path.join(process.cwd(), 'uploads', 'residency', path.basename(document.file_path)));
        possiblePaths.push(path.join(__dirname, '../../uploads/residency', document.file_path));
        possiblePaths.push(path.join(__dirname, '../../uploads/residency', path.basename(document.file_path)));
      }

      // Try each possible path with detailed logging
      logger.info('Searching for document file', {
        documentId,
        storedPath: document.file_path,
        possiblePaths: possiblePaths
      });

      for (const possiblePath of possiblePaths) {
        logger.info(`Checking path: ${possiblePath}`, { documentId });
        if (fs.existsSync(possiblePath)) {
          actualFilePath = possiblePath;
          logger.info(`✅ File found at: ${actualFilePath}`, { documentId });
          break;
        } else {
          logger.info(`❌ File not found at: ${possiblePath}`, { documentId });
        }
      }

      if (!actualFilePath) {
        logger.error('Document file not found in any expected location', {
          documentId,
          storedPath: document.file_path,
          triedPaths: possiblePaths,
          exists: false,
          currentWorkingDirectory: process.cwd(),
          serviceDirectory: __dirname
        });
        throw new Error('Document file not found on server. The file may have been moved or deleted.');
      }

      return {
        filePath: path.resolve(actualFilePath),
        fileName: document.document_name,
        mimeType: document.mime_type
      };
    } catch (error) {
      logger.error('Failed to get document file', {
        documentId,
        requestingUserId: requestingUser?.id,
        error: error.message
      });
      throw error;
    }
  }

  // Get residency verification status for a client
  static async getResidencyVerificationStatus(clientId) {
    try {
      logger.info('Getting residency verification status', { clientId });

      // Get client account
      const account = await ClientAccount.findById(clientId);
      if (!account) {
        throw new Error('Client account not found');
      }

      // Get all residency documents for this client
      const documents = await ResidencyDocument.findByAccountId(clientId);

      if (documents.length === 0) {
        return {
          success: true,
          data: {
            status: 'no_documents',
            canRequestDocuments: false,
            message: 'Please upload residency documents for verification',
            documents: []
          },
          message: 'No residency documents found'
        };
      }

      // Analyze document verification statuses
      const approvedDocs = documents.filter(doc => doc.verification_status === 'approved');
      const rejectedDocs = documents.filter(doc => doc.verification_status === 'rejected');
      const pendingDocs = documents.filter(doc => doc.verification_status === 'pending');

      let overallStatus = 'pending';
      let canRequestDocuments = false;
      let message = '';

      if (approvedDocs.length > 0 && rejectedDocs.length === 0 && pendingDocs.length === 0) {
        // All documents approved
        overallStatus = 'approved';
        canRequestDocuments = true;
        message = 'Your residency has been verified. You can now request documents.';

        logger.info('Residency verification approved', {
          clientId,
          approvedCount: approvedDocs.length,
          rejectedCount: rejectedDocs.length,
          pendingCount: pendingDocs.length,
          canRequestDocuments: true
        });
      } else if (rejectedDocs.length > 0) {
        // Some documents rejected
        overallStatus = 'rejected';
        canRequestDocuments = false;
        message = 'Your residency document rejected.';

        logger.info('Residency verification rejected', {
          clientId,
          approvedCount: approvedDocs.length,
          rejectedCount: rejectedDocs.length,
          pendingCount: pendingDocs.length,
          canRequestDocuments: false
        });
      } else {
        // Documents pending review
        overallStatus = 'pending';
        canRequestDocuments = false;
        message = 'Your residency document is pending review. Please wait for admin approval.';

        logger.info('Residency verification pending', {
          clientId,
          approvedCount: approvedDocs.length,
          rejectedCount: rejectedDocs.length,
          pendingCount: pendingDocs.length,
          canRequestDocuments: false
        });
      }

      return {
        success: true,
        data: {
          status: overallStatus,
          canRequestDocuments,
          message,
          documents: documents.map(doc => ({
            id: doc.id,
            type: doc.document_type,
            name: doc.document_name,
            status: doc.verification_status,
            uploadedAt: doc.created_at,
            verifiedAt: doc.verified_at,
            rejectionReason: doc.rejection_reason
          }))
        },
        message: 'Residency verification status retrieved successfully'
      };

    } catch (error) {
      logger.error('Failed to get residency verification status', {
        clientId,
        error: error.message
      });
      throw error;
    }
  }

  // Update individual document verification status
  static async updateDocumentVerificationStatus(documentId, status, adminId) {
    try {
      const document = await ResidencyDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      const accountId = document.account_id;

      // Update document status
      await document.updateVerificationStatus(status, adminId, null);

      logger.info('Document verification status updated', {
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
                  AND type = 'document_approved'
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
                  type: 'document_approved',
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
                type: 'document_approved',
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
                  await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, your ${documentTypeName} has been approved! Thank you for your submission.`
                  });
                  logger.info('Document approval SMS sent', {
                    documentId,
                    accountId,
                    phoneNumber: client.phone_number
                  });
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
                  AND type = 'document_rejected'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `Your ${documentTypeName} was rejected. Please reupload in your account.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification for rejection (NO rejection reason per requirements)
                await notificationService.createNotification({
                  recipient_id: accountId,
                  recipient_type: 'client',
                  type: 'document_rejected',
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
                type: 'document_rejected',
                title: 'Document Rejected',
                message: `Your ${documentTypeName} was rejected. Please reupload in your account.`,
                data: {
                  document_id: documentId,
                  document_type: document.document_type
                }
              });

              // Send SMS notification for rejection (NO rejection reason per requirements)
              if (client.phone_number) {
                try {
                  await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, your ${documentTypeName} was rejected. Please reupload in your account.`
                  });
                  logger.info('Document rejection SMS sent', {
                    documentId,
                    accountId,
                    phoneNumber: client.phone_number
                  });
                } catch (smsError) {
                  logger.error('Failed to send document rejection SMS', {
                    documentId,
                    accountId,
                    error: smsError.message
                  });
                }
              }

              // Send email notification for rejection (NO rejection reason per requirements)
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
        data: {
          documentId,
          status,
          updatedAt: new Date()
        },
        message: `Document ${status} successfully`
      };
    } catch (error) {
      logger.error('Failed to update document verification status', {
        documentId,
        status,
        adminId,
        error: error.message
      });
      throw error;
    }
  }

  // Get rejected documents for a client
  static async getRejectedDocumentsForClient(clientId) {
    try {
      const documents = await ResidencyDocument.findByAccountId(clientId);
      const rejectedDocuments = documents.filter(doc => doc.verification_status === 'rejected');

      return {
        success: true,
        data: rejectedDocuments.map(doc => doc.toJSON()),
        message: 'Rejected documents retrieved successfully'
      };
    } catch (error) {
      logger.error('Failed to get rejected documents', {
        clientId,
        error: error.message
      });
      throw error;
    }
  }

  // Reupload a rejected document
  static async reuploadRejectedDocument(documentId, clientId, file) {
    try {
      const document = await ResidencyDocument.findById(documentId);
      if (!document) {
        throw new Error('Document not found');
      }

      // Verify ownership
      if (document.account_id !== clientId) {
        throw new Error('Unauthorized to reupload this document');
      }

      // Verify document is rejected
      if (document.verification_status !== 'rejected') {
        throw new Error('Only rejected documents can be reuploaded');
      }

      // Delete old file from filesystem
      if (document.file_path) {
        const oldFilePath = path.join(process.cwd(), 'uploads', 'residency', path.basename(document.file_path));
        if (fs.existsSync(oldFilePath)) {
          try {
            fs.unlinkSync(oldFilePath);
            logger.info('Old file deleted', { filePath: oldFilePath });
          } catch (fileError) {
            logger.warn('Failed to delete old file', {
              filePath: oldFilePath,
              error: fileError.message
            });
          }
        }
      }

      // Update document with new file information and reset status to pending
      const updateQuery = `
        UPDATE residency_documents 
        SET document_name = ?, 
            file_path = ?, 
            file_size = ?, 
            mime_type = ?,
            verification_status = 'pending',
            verified_by = NULL,
            verified_at = NULL,
            rejection_reason = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;

      await executeQuery(updateQuery, [
        file.originalname,
        path.basename(file.path),
        file.size,
        file.mimetype,
        documentId
      ]);

      logger.info('Document reuploaded successfully', {
        documentId,
        clientId,
        fileName: file.originalname
      });

      // Get updated document
      const updatedDocument = await ResidencyDocument.findById(documentId);

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
            'Residency Document Reuploaded',
            `${clientName} has reuploaded a residency verification document. Please review.`
          ]);
        }
        
        logger.info('Notifications sent to admins for residency document reupload', {
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
        data: updatedDocument.toJSON(),
        message: 'Document reuploaded successfully. It will be reviewed by admin.'
      };
    } catch (error) {
      // Clean up uploaded file if there was an error
      if (file && file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          logger.error('Failed to cleanup file after error', {
            filePath: file.path,
            error: cleanupError.message
          });
        }
      }

      logger.error('Failed to reupload document', {
        documentId,
        clientId,
        error: error.message
      });
      throw error;
    }
  }

  // Helper method to format document type
  static formatDocumentType(type) {
    const typeLabels = {
      'utility_bill': 'Utility Bill',
      'barangay_certificate': 'Barangay Certificate',
      'valid_id': 'Valid ID',
      'lease_contract': 'Lease Contract',
      'other': 'Other Document'
    };
    return typeLabels[type] || type;
  }
}

module.exports = ResidencyService;
