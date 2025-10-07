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
}

module.exports = ResidencyService;
