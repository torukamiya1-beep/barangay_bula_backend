const DocumentBeneficiary = require('../models/DocumentBeneficiary');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const smsService = require('./smsService');
const emailService = require('./emailService');
const notificationService = require('./notificationService');

class BeneficiaryVerificationService {
  // Format relationship for display
  static formatRelationship(relationship) {
    const relationshipMap = {
      'spouse': 'Spouse',
      'child': 'Child',
      'parent': 'Parent',
      'sibling': 'Sibling'
    };
    return relationshipMap[relationship] || relationship;
  }

  // Get verification document name based on relationship
  static getVerificationDocumentName(relationship) {
    if (relationship === 'spouse') {
      return 'Marriage Certificate';
    }
    return 'PSA Birth Certificate';
  }

  // Update beneficiary verification status (approve/reject)
  static async updateVerificationStatus(beneficiaryId, status, adminId) {
    try {
      const beneficiary = await DocumentBeneficiary.findById(beneficiaryId);
      if (!beneficiary) {
        throw new Error('Beneficiary not found');
      }

      // Get account_id - fallback to document_requests if not in beneficiary
      let accountId = beneficiary.account_id;
      
      if (!accountId) {
        logger.warn('Beneficiary account_id is null, fetching from document_requests', {
          beneficiaryId,
          requestId: beneficiary.request_id
        });
        
        const requestQuery = `SELECT client_id FROM document_requests WHERE id = ?`;
        const requestResult = await executeQuery(requestQuery, [beneficiary.request_id]);
        
        if (requestResult.length === 0) {
          throw new Error('Document request not found');
        }
        
        accountId = requestResult[0].client_id;
        
        if (!accountId) {
          throw new Error('Client ID not found in document request');
        }
      }

      // Update verification status
      await beneficiary.updateVerificationStatus(status, adminId, null);

      logger.info('Beneficiary verification status updated', {
        beneficiaryId,
        accountId,
        status,
        adminId
      });

      logger.info('About to send notifications', {
        beneficiaryId,
        accountId,
        status,
        hasAccountId: !!accountId
      });

      // Send notifications - wrapped in try-catch to prevent breaking the response
      try {
        if (status === 'approved' || status === 'rejected') {
          logger.info(`🔔 Preparing to send ${status} notifications for beneficiary verification`, {
            beneficiaryId,
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

          logger.info('Client query result', {
            beneficiaryId,
            accountId,
            clientFound: clientResult.length > 0,
            clientData: clientResult[0] ? {
              hasEmail: !!clientResult[0].email,
              hasPhone: !!clientResult[0].phone_number,
              hasName: !!(clientResult[0].first_name && clientResult[0].last_name)
            } : null
          });

          if (clientResult.length > 0) {
            const client = clientResult[0];
            const clientName = `${client.first_name || ''} ${client.last_name || ''}`.trim();
            
            // Safe way to get beneficiary name
            const beneficiaryName = beneficiary.getFullName ? 
              beneficiary.getFullName() : 
              `${beneficiary.first_name || ''} ${beneficiary.last_name || ''}`.trim();
            
            const relationshipName = this.formatRelationship(beneficiary.relationship_to_requestor);
            const documentName = this.getVerificationDocumentName(beneficiary.relationship_to_requestor);

            logger.info('Notification data prepared', {
              beneficiaryId,
              clientName,
              beneficiaryName,
              relationshipName,
              documentName
            });

            if (status === 'approved') {
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'beneficiary_verification_approved'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `The ${documentName} for ${beneficiaryName} (${relationshipName}) has been approved.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification
                await notificationService.createNotification({
                  recipient_id: accountId,
                  recipient_type: 'client',
                  type: 'beneficiary_verification_approved',
                  title: 'Beneficiary Verification Approved',
                  message: `The ${documentName} for ${beneficiaryName} (${relationshipName}) has been approved.`,
                  data: {
                    beneficiary_id: beneficiaryId,
                    request_id: beneficiary.request_id,
                    beneficiary_name: beneficiaryName,
                    relationship: relationshipName,
                    document_name: documentName
                  },
                  priority: 'medium'
                });
              } else {
                logger.info('Duplicate notification prevented (approved)', { beneficiaryId, accountId });
              }

              // Send real-time notification
              notificationService.sendToUser(accountId, {
                type: 'beneficiary_verification_approved',
                title: 'Beneficiary Verification Approved',
                message: `The ${documentName} for ${beneficiaryName} has been approved.`
              });

              // Send SMS
              if (client.phone_number) {
                try {
                  const smsResult = await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, the ${documentName} for ${beneficiaryName} has been approved!`
                  });
                  
                  if (smsResult.success) {
                    logger.info('Beneficiary verification approval SMS sent', {
                      beneficiaryId,
                      accountId,
                      phoneNumber: client.phone_number
                    });
                  } else {
                    logger.error('Failed to send beneficiary verification approval SMS', {
                      beneficiaryId,
                      accountId,
                      error: smsResult.error || smsResult.message
                    });
                  }
                } catch (smsError) {
                  logger.error('Failed to send beneficiary verification approval SMS', {
                    beneficiaryId,
                    accountId,
                    error: smsError.message
                  });
                }
              }

              // Send email
              if (client.email) {
                try {
                  await emailService.sendEmail(
                    client.email,
                    'Beneficiary Verification Approved',
                    `
                      <h2>Beneficiary Verification Approved</h2>
                      <p>Dear ${clientName},</p>
                      <p>Great news! The ${documentName} for <strong>${beneficiaryName}</strong> (${relationshipName}) has been approved.</p>
                      <p>You can now proceed with your document request.</p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Beneficiary verification approval email sent', {
                    beneficiaryId,
                    accountId
                  });
                } catch (emailError) {
                  logger.error('Failed to send beneficiary verification approval email', {
                    beneficiaryId,
                    error: emailError.message
                  });
                }
              }
            } else if (status === 'rejected') {
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'beneficiary_verification_rejected'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `The ${documentName} for ${beneficiaryName} (${relationshipName}) was rejected. Please reupload.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification
                await notificationService.createNotification({
                  recipient_id: accountId,
                  recipient_type: 'client',
                  type: 'beneficiary_verification_rejected',
                  title: 'Beneficiary Verification Rejected',
                  message: `The ${documentName} for ${beneficiaryName} (${relationshipName}) was rejected. Please reupload.`,
                  data: {
                    beneficiary_id: beneficiaryId,
                    beneficiary_name: beneficiaryName,
                    relationship: beneficiary.relationship_to_requestor,
                    rejected_by: adminId,
                    rejected_at: new Date().toISOString()
                  },
                  priority: 'high'
                });
              } else {
                logger.info('Duplicate notification prevented (rejected)', { beneficiaryId, accountId });
              }

              // Send real-time notification
              notificationService.sendToUser(accountId, {
                type: 'beneficiary_verification_rejected',
                title: 'Beneficiary Verification Rejected',
                message: `The ${documentName} for ${beneficiaryName} was rejected. Please reupload.`
              });

              // Send SMS
              if (client.phone_number) {
                try {
                  const smsResult = await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, the ${documentName} for ${beneficiaryName} was rejected. Please reupload in your account.`
                  });
                  
                  if (smsResult.success) {
                    logger.info('Beneficiary verification rejection SMS sent', {
                      beneficiaryId,
                      accountId,
                      phoneNumber: client.phone_number
                    });
                  } else {
                    logger.error('Failed to send beneficiary verification rejection SMS', {
                      beneficiaryId,
                      accountId,
                      phoneNumber: client.phone_number,
                      error: smsResult.error || smsResult.message
                    });
                  }
                } catch (smsError) {
                  logger.error('Failed to send beneficiary verification rejection SMS', {
                    beneficiaryId,
                    accountId,
                    error: smsError.message
                  });
                }
              }

              // Send email
              if (client.email) {
                try {
                  await emailService.sendEmail(
                    client.email,
                    'Beneficiary Verification Rejected - Action Required',
                    `
                      <h2>Beneficiary Verification Rejected</h2>
                      <p>Dear ${clientName},</p>
                      <p>The ${documentName} for <strong>${beneficiaryName}</strong> (${relationshipName}) was rejected.</p>
                      <p>Please log in to your account and reupload the verification document.</p>
                      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/client/rejected-documents">Click here to reupload</a></p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Beneficiary verification rejection email sent', {
                    beneficiaryId,
                    accountId
                  });
                } catch (emailError) {
                  logger.error('Failed to send beneficiary verification rejection email', {
                    beneficiaryId,
                    error: emailError.message
                  });
                }
              }
            }
          }
          } catch (notificationError) {
            logger.error('Failed to send beneficiary verification notifications (inner)', {
              beneficiaryId,
              accountId,
              status,
              error: notificationError.message,
              stack: notificationError.stack
            });
            // Don't throw - notifications are non-critical
          }
        }
      } catch (outerNotificationError) {
        logger.error('Failed to send beneficiary verification notifications (outer)', {
          beneficiaryId,
          accountId,
          status,
          error: outerNotificationError.message,
          stack: outerNotificationError.stack
        });
        // Don't throw - notifications are non-critical, continue with response
      }

      logger.info('Beneficiary verification process completed successfully', {
        beneficiaryId,
        status
      });

      // Return simple data to avoid serialization issues
      return {
        success: true,
        message: `Beneficiary verification ${status} successfully`,
        data: {
          beneficiary_id: beneficiaryId,
          verification_status: status,
          updated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error updating beneficiary verification status', {
        beneficiaryId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  // Get rejected beneficiary verifications for client
  static async getRejectedBeneficiaryVerifications(clientId) {
    try {
      const query = `
        SELECT db.*, dr.request_number, dr.client_id, dt.type_name as document_request_type
        FROM document_beneficiaries db
        INNER JOIN document_requests dr ON db.request_id = dr.id
        LEFT JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.client_id = ? AND db.verification_status = 'rejected'
        ORDER BY db.created_at DESC
      `;
      
      const results = await executeQuery(query, [clientId]);
      
      logger.info('Rejected beneficiary verifications retrieved', {
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
      logger.error('Error getting rejected beneficiary verifications', {
        clientId,
        error: error.message
      });
      throw error;
    }
  }

  // Reupload a rejected beneficiary verification document
  static async reuploadDocument(beneficiaryId, file, clientId) {
    try {
      const beneficiary = await DocumentBeneficiary.findById(beneficiaryId);
      if (!beneficiary) {
        throw new Error('Beneficiary verification not found');
      }

      // Verify the beneficiary belongs to the client
      const verifyQuery = `
        SELECT dr.client_id 
        FROM document_beneficiaries db
        JOIN document_requests dr ON db.request_id = dr.id
        WHERE db.id = ?
      `;
      const verifyResult = await executeQuery(verifyQuery, [beneficiaryId]);
      
      if (verifyResult.length === 0 || verifyResult[0].client_id !== clientId) {
        throw new Error('Unauthorized: This document does not belong to you');
      }

      // Verify the document is rejected
      console.log('🔍 Beneficiary verification status:', {
        beneficiaryId,
        verification_status: beneficiary.verification_status,
        expected: 'rejected'
      });
      
      if (beneficiary.verification_status !== 'rejected') {
        throw new Error(`Only rejected documents can be reuploaded. Current status: ${beneficiary.verification_status || 'null'}`);
      }

      // Convert absolute path to relative path
      const path = require('path');
      const relativePath = file.path.replace(/\\/g, '/').split('/uploads/')[1];
      const finalPath = relativePath ? `uploads/${relativePath}` : file.path;

      // Update the beneficiary with new file info
      const updateQuery = `
        UPDATE document_beneficiaries
        SET verification_image_path = ?,
            verification_image_name = ?,
            verification_image_size = ?,
            verification_image_mime_type = ?,
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
        beneficiaryId
      ]);

      logger.info('Beneficiary verification document reuploaded successfully', {
        beneficiaryId,
        clientId,
        filename: file.filename
      });

      // Get updated beneficiary and client info
      const updatedBeneficiary = await DocumentBeneficiary.findById(beneficiaryId);
      
      // Get client name and beneficiary name for notification
      const infoQuery = `
        SELECT 
          CONCAT(cp.first_name, ' ', cp.last_name) as client_name,
          CONCAT(db.first_name, ' ', db.last_name) as beneficiary_name
        FROM document_beneficiaries db
        JOIN document_requests dr ON db.request_id = dr.id
        JOIN client_accounts ca ON dr.client_id = ca.id
        JOIN client_profiles cp ON ca.id = cp.account_id
        WHERE db.id = ?
      `;
      const infoResult = await executeQuery(infoQuery, [beneficiaryId]);
      const clientName = infoResult[0]?.client_name || 'A client';
      const beneficiaryName = infoResult[0]?.beneficiary_name || 'beneficiary';

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
            'Beneficiary Document Reuploaded',
            `${clientName} has reuploaded verification document for ${beneficiaryName}. Please review.`
          ]);
        }
        
        logger.info('Notifications sent to admins for beneficiary document reupload', {
          beneficiaryId,
          clientId,
          adminCount: admins.length
        });
      } catch (notifError) {
        logger.error('Failed to send notifications to admins', {
          error: notifError.message,
          beneficiaryId,
          clientId
        });
        // Don't throw - notification failure shouldn't block the reupload
      }

      return {
        success: true,
        message: 'Document reuploaded successfully. It will be reviewed by admin.',
        data: updatedBeneficiary
      };
    } catch (error) {
      logger.error('Error reuploading beneficiary verification document', {
        beneficiaryId,
        clientId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = BeneficiaryVerificationService;
