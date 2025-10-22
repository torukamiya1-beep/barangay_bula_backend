const AuthorizedPickupPerson = require('../models/AuthorizedPickupPerson');
const { executeQuery } = require('../config/database');
const logger = require('../utils/logger');
const smsService = require('./smsService');
const emailService = require('./emailService');
const notificationService = require('./notificationService');

class AuthorizedPickupService {
  // Update pickup person verification status (approve/reject)
  static async updatePickupVerificationStatus(pickupId, status, adminId) {
    try {
      const pickupPerson = await AuthorizedPickupPerson.findById(pickupId);
      if (!pickupPerson) {
        throw new Error('Pickup person not found');
      }

      // Get the document request to find the client_id
      const requestQuery = `
        SELECT dr.client_id, dr.request_number, dt.type_name as document_type
        FROM document_requests dr
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.id = ?
      `;
      const requestResult = await executeQuery(requestQuery, [pickupPerson.request_id]);
      
      if (requestResult.length === 0) {
        throw new Error('Document request not found');
      }

      const accountId = requestResult[0].client_id;
      const requestNumber = requestResult[0].request_number;
      const documentType = requestResult[0].document_type;

      // Update pickup person status
      await pickupPerson.updateVerificationStatus(status, adminId);

      logger.info('Pickup person verification status updated', {
        pickupId,
        accountId,
        status,
        adminId
      });

      // Send notifications
      if (status === 'verified' || status === 'rejected') {
        logger.info(`🔔 Preparing to send ${status} notifications for pickup person`, {
          pickupId,
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
            const pickupPersonName = `${pickupPerson.first_name} ${pickupPerson.last_name}`;

            if (status === 'verified') {
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'pickup_authorization_approved'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `The authorized pickup person (${pickupPersonName}) for your ${documentType} request has been verified.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification for approval
                await notificationService.createNotification({
                recipient_id: accountId,
                recipient_type: 'client',
                type: 'pickup_authorization_approved',
                title: 'Pickup Authorization Approved',
                message: `The authorized pickup person (${pickupPersonName}) for your ${documentType} request has been verified.`,
                data: {
                  pickup_person_id: pickupId,
                  request_number: requestNumber,
                  document_type: documentType,
                  pickup_person_name: pickupPersonName,
                  approved_by: adminId,
                  approved_at: new Date().toISOString()
                },
                priority: 'medium'
              });
              } else {
                logger.info('Duplicate pickup authorization approval notification prevented', { pickupId, accountId });
              }

              // Send real-time notification
              notificationService.sendToUser(accountId, {
                type: 'pickup_authorization_approved',
                title: 'Pickup Authorization Approved',
                message: `The authorized pickup person (${pickupPersonName}) has been verified.`
              });

              // Send SMS
              if (client.phone_number) {
                try {
                  const smsResult = await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, the authorized pickup person (${pickupPersonName}) for your ${documentType} request has been approved!`
                  });
                  
                  if (smsResult.success) {
                    logger.info('Pickup authorization approval SMS sent', {
                      pickupId,
                      accountId,
                      phoneNumber: client.phone_number
                    });
                  } else {
                    logger.error('Failed to send pickup authorization approval SMS', {
                      pickupId,
                      accountId,
                      error: smsResult.error || smsResult.message
                    });
                  }
                } catch (smsError) {
                  logger.error('Failed to send pickup authorization approval SMS', {
                    pickupId,
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
                    'Pickup Authorization Approved',
                    `
                      <h2>Pickup Authorization Approved</h2>
                      <p>Dear ${clientName},</p>
                      <p>Great news! The authorized pickup person for your document request has been verified.</p>
                      <p><strong>Request Details:</strong></p>
                      <ul>
                        <li>Request Number: ${requestNumber}</li>
                        <li>Document Type: ${documentType}</li>
                        <li>Authorized Person: ${pickupPersonName}</li>
                      </ul>
                      <p>Your document can now be released to the authorized person once it's ready.</p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Pickup authorization approval email sent', {
                    pickupId,
                    accountId
                  });
                } catch (emailError) {
                  logger.error('Failed to send pickup authorization approval email', {
                    pickupId,
                    error: emailError.message
                  });
                }
              }
            } else if (status === 'rejected') {
              // Check for duplicate notification in last 10 seconds
              const checkDuplicateQuery = `
                SELECT id FROM notifications 
                WHERE recipient_id = ? 
                  AND type = 'pickup_authorization_rejected'
                  AND message = ?
                  AND created_at > DATE_SUB(NOW(), INTERVAL 10 SECOND)
                LIMIT 1
              `;
              const duplicateCheck = await executeQuery(checkDuplicateQuery, [
                accountId,
                `The authorized pickup person (${pickupPersonName}) for your ${documentType} request was rejected. Please update the authorization documents.`
              ]);

              if (duplicateCheck.length === 0) {
                // Send in-app notification for rejection
                await notificationService.createNotification({
                recipient_id: accountId,
                recipient_type: 'client',
                type: 'pickup_authorization_rejected',
                title: 'Pickup Authorization Rejected',
                message: `The authorized pickup person (${pickupPersonName}) for your ${documentType} request was rejected. Please update the authorization documents.`,
                data: {
                  pickup_person_id: pickupId,
                  request_number: requestNumber,
                  document_type: documentType,
                  pickup_person_name: pickupPersonName,
                  rejected_by: adminId,
                  rejected_at: new Date().toISOString()
                },
                priority: 'high'
              });
              } else {
                logger.info('Duplicate pickup authorization rejection notification prevented', { pickupId, accountId });
              }

              // Send real-time notification
              notificationService.sendToUser(accountId, {
                type: 'pickup_authorization_rejected',
                title: 'Pickup Authorization Rejected',
                message: `The authorized pickup person (${pickupPersonName}) was rejected. Please update the authorization documents.`
              });

              // Send SMS
              if (client.phone_number) {
                try {
                  const smsResult = await smsService.sendSMS({
                    phoneNumber: client.phone_number,
                    message: `Hello ${clientName}, the authorized pickup person (${pickupPersonName}) for your ${documentType} request was rejected. Please update the authorization documents in your account.`
                  });
                  
                  if (smsResult.success) {
                    logger.info('Pickup authorization rejection SMS sent', {
                      pickupId,
                      accountId,
                      phoneNumber: client.phone_number
                    });
                  } else {
                    logger.error('Failed to send pickup authorization rejection SMS', {
                      pickupId,
                      accountId,
                      phoneNumber: client.phone_number,
                      error: smsResult.error || smsResult.message
                    });
                  }
                } catch (smsError) {
                  logger.error('Failed to send pickup authorization rejection SMS', {
                    pickupId,
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
                    'Pickup Authorization Rejected - Action Required',
                    `
                      <h2>Pickup Authorization Rejected</h2>
                      <p>Dear ${clientName},</p>
                      <p>Unfortunately, the authorized pickup person for your document request was rejected.</p>
                      <p><strong>Request Details:</strong></p>
                      <ul>
                        <li>Request Number: ${requestNumber}</li>
                        <li>Document Type: ${documentType}</li>
                        <li>Authorized Person: ${pickupPersonName}</li>
                      </ul>
                      <p>Please log in to your account and update the authorization documents.</p>
                      <p><a href="${process.env.FRONTEND_URL || 'http://localhost:8081'}/client/requests/${pickupPerson.request_id}">Click here to update</a></p>
                      <p>Thank you,<br>Barangay Bula Document Hub</p>
                    `
                  );
                  logger.info('Pickup authorization rejection email sent', {
                    pickupId,
                    accountId
                  });
                } catch (emailError) {
                  logger.error('Failed to send pickup authorization rejection email', {
                    pickupId,
                    error: emailError.message
                  });
                }
              }
            }
          }
        } catch (notificationError) {
          logger.error('Failed to send pickup authorization notifications', {
            pickupId,
            accountId,
            status,
            error: notificationError.message
          });
        }
      }

      return {
        success: true,
        message: `Pickup authorization ${status} successfully`,
        data: pickupPerson
      };
    } catch (error) {
      logger.error('Error updating pickup person verification status', {
        pickupId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = AuthorizedPickupService;
