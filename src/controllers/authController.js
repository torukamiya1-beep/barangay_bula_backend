const AuthService = require('../services/authService');

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
