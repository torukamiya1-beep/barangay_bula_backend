const AuthService = require('../services/authService');
const ComprehensiveActivityLogService = require('../services/comprehensiveActivityLogService');

class AuthController {
  // @desc    Register user
  // @route   POST /api/auth/register
  // @access  Public
  static async register(req, res, next) {
    try {
      const { email, password, first_name, last_name, role } = req.body;

      const result = await AuthService.register({
        email,
        password,
        first_name,
        last_name,
        role
      });

      // Log client registration audit activity
      if (result.success && result.data && result.data.user) {
        try {
          await ComprehensiveActivityLogService.logRegistrationActivity(
            result.data.user.id,
            'client',
            'client_registration_success',
            req.clientIP || req.ip || 'unknown',
            req.get('User-Agent') || 'unknown',
            {
              email: email,
              first_name: first_name,
              last_name: last_name,
              role: role || 'client'
            }
          );
        } catch (auditError) {
          console.error('Failed to log client registration audit:', auditError.message);
          // Don't fail the registration if audit logging fails
        }
      }

      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Login user
  // @route   POST /api/auth/login
  // @access  Public
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      const result = await AuthService.login(email, password);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Get current user
  // @route   GET /api/auth/me
  // @access  Private
  static async getMe(req, res, next) {
    try {
      const result = await AuthService.getProfile(req.user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Update user profile
  // @route   PUT /api/auth/profile
  // @access  Private
  static async updateProfile(req, res, next) {
    try {
      const { first_name, last_name, email } = req.body;

      const result = await AuthService.updateProfile(req.user.id, {
        first_name,
        last_name,
        email
      });

      // Log client profile update audit activity
      if (result.success && req.user) {
        try {
          await ComprehensiveActivityLogService.logActivity({
            userId: req.user.id,
            userType: req.user.type || 'client',
            action: 'client_profile_update',
            tableName: 'client_profiles',
            recordId: req.user.id,
            newValues: {
              first_name,
              last_name,
              email,
              update_timestamp: new Date().toISOString()
            },
            ipAddress: req.clientIP || req.ip || 'unknown',
            userAgent: req.get('User-Agent') || 'unknown'
          });
        } catch (auditError) {
          console.error('Failed to log client profile update audit:', auditError.message);
          // Don't fail the update if audit logging fails
        }
      }

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Change password
  // @route   PUT /api/auth/change-password
  // @access  Private
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const result = await AuthService.changePassword(
        req.user.id,
        currentPassword,
        newPassword
      );

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Logout user
  // @route   POST /api/auth/logout
  // @access  Private
  static async logout(req, res, next) {
    try {
      // In a stateless JWT system, logout is handled client-side
      // by removing the token from storage
      res.status(200).json({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;
