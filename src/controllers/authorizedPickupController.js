const AuthorizedPickupService = require('../services/authorizedPickupService');
const AuthorizedPickupPerson = require('../models/AuthorizedPickupPerson');
const { ApiResponse } = require('../utils/response');
const logger = require('../utils/logger');

class AuthorizedPickupController {
  constructor() {
    this.logger = logger;
  }

  // Verify pickup person (Admin only)
  async verifyPickupPerson(req, res) {
    try {
      const { pickupId } = req.params;
      const { verification_status } = req.body;
      const adminId = req.user.id;

      if (!pickupId || isNaN(parseInt(pickupId))) {
        return ApiResponse.error(res, 'Valid pickup person ID is required', 400);
      }

      if (!verification_status || !['verified', 'rejected'].includes(verification_status)) {
        return ApiResponse.error(res, 'Valid verification status is required (verified or rejected)', 400);
      }

      const result = await AuthorizedPickupService.updatePickupVerificationStatus(
        parseInt(pickupId),
        verification_status,
        adminId
      );

      logger.info('Pickup person verification status updated', {
        pickupId,
        status: verification_status,
        adminId,
        ip: req.ip
      });

      return ApiResponse.success(res, result.data, result.message);
    } catch (error) {
      logger.error('Failed to update pickup person verification status', {
        pickupId: req.params.pickupId,
        adminId: req.user?.id,
        error: error.message
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }

  // Get rejected pickup persons for current client
  async getRejectedPickupPersons(req, res) {
    try {
      const clientId = req.user.id;

      logger.info('Getting rejected pickup persons', {
        clientId
      });

      const pickupPersons = await AuthorizedPickupPerson.getRejectedByClientId(clientId);

      logger.info('Rejected pickup persons retrieved', {
        clientId,
        count: pickupPersons.length
      });

      return ApiResponse.success(res, pickupPersons, 'Rejected pickup persons retrieved successfully');
    } catch (error) {
      logger.error('Failed to get rejected pickup persons', {
        clientId: req.user?.id,
        error: error.message,
        stack: error.stack
      });

      return ApiResponse.error(res, error.message, 500);
    }
  }
}

module.exports = new AuthorizedPickupController();
