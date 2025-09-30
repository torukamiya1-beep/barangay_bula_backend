const UserService = require('../services/userServiceNew');

class UserController {
  // @desc    Get all users
  // @route   GET /api/users
  // @access  Private/Admin
  static async getAllUsers(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const role = req.query.role;
      const search = req.query.search;
      const is_active = req.query.is_active;

      const filters = {};
      if (role) filters.role = role;
      if (search) filters.search = search;
      if (is_active !== undefined) filters.is_active = is_active === 'true';

      const result = await UserService.getAllUsers(page, limit, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Get single user
  // @route   GET /api/users/:id
  // @access  Private/Admin
  static async getUser(req, res, next) {
    try {
      console.log('🔍 getUser controller called');
      console.log('🔍 Request path:', req.path);
      console.log('🔍 Request params:', req.params);
      console.log('🔍 User ID:', req.params.id);

      const userId = req.params.id;
      const result = await UserService.getUserById(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Check if user exists
  // @route   GET /api/users/:id/exists
  // @access  Private/Admin
  static async checkUserExists(req, res, next) {
    try {
      const userId = req.params.id;
      const exists = await UserService.checkUserExists(userId);
      res.status(200).json({
        success: true,
        exists: exists,
        message: exists ? 'User exists' : 'User not found'
      });
    } catch (error) {
      next(error);
    }
  }

  // @desc    Get archived (soft-deleted) users
  // @route   GET /api/users/archive-list
  // @access  Private/Admin
  static async getArchivedUsers(req, res, next) {
    try {
      console.log('🔍 getArchivedUsers controller called');
      console.log('🔍 Request path:', req.path);
      console.log('🔍 Request params:', req.params);
      console.log('🔍 Request query:', req.query);

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search;

      const filters = { archived: true };
      if (search) filters.search = search;

      const result = await UserService.getArchivedUsers(page, limit, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Restore archived user
  // @route   PATCH /api/users/:id/restore
  // @access  Private/Admin
  static async restoreUser(req, res, next) {
    try {
      const userId = req.params.id;
      const result = await UserService.restoreUser(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Create new user
  // @route   POST /api/users
  // @access  Private/Admin
  static async createUser(req, res, next) {
    try {
      console.log('🔍 Create user request body:', JSON.stringify(req.body, null, 2));
      const result = await UserService.createUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('❌ Create user error:', error.message);
      next(error);
    }
  }

  // @desc    Update user
  // @route   PUT /api/users/:id
  // @access  Private/Admin
  static async updateUser(req, res, next) {
    try {
      const userId = req.params.id;
      const result = await UserService.updateUser(userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Delete user
  // @route   DELETE /api/users/:id
  // @access  Private/Admin
  static async deleteUser(req, res, next) {
    try {
      const userId = req.params.id;
      const result = await UserService.deleteUser(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Toggle user status
  // @route   PATCH /api/users/:id/toggle-status
  // @access  Private/Admin
  static async toggleUserStatus(req, res, next) {
    try {
      const userId = req.params.id;
      const result = await UserService.toggleUserStatus(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Create user
  // @route   POST /api/users
  // @access  Private/Admin
  static async createUser(req, res, next) {
    try {
      const result = await UserService.createUser(req.body);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Update user
  // @route   PUT /api/users/:id
  // @access  Private/Admin
  static async updateUser(req, res, next) {
    try {
      const userId = req.params.id;
      const result = await UserService.updateUser(userId, req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Delete user
  // @route   DELETE /api/users/:id
  // @access  Private/Admin
  static async deleteUser(req, res, next) {
    try {
      const userId = req.params.id;

      // Parse composite ID to check if admin is trying to delete themselves
      const { type, id } = UserService.parseCompositeId ?
        UserService.parseCompositeId(userId) :
        { type: 'admin', id: parseInt(userId) };

      // Prevent admin from deleting themselves
      // Compare actual ID with current user's ID
      if (type === 'admin' && id == req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot delete your own account'
        });
      }

      const result = await UserService.deleteUser(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Toggle user status
  // @route   PATCH /api/users/:id/toggle-status
  // @access  Private/Admin
  static async toggleUserStatus(req, res, next) {
    try {
      const userId = req.params.id;
      
      // Prevent admin from deactivating themselves
      if (userId == req.user.id) {
        return res.status(400).json({
          success: false,
          error: 'You cannot deactivate your own account'
        });
      }

      const result = await UserService.toggleUserStatus(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Get users by role
  // @route   GET /api/users/role/:role
  // @access  Private/Admin
  static async getUsersByRole(req, res, next) {
    try {
      const role = req.params.role;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await UserService.getUsersByRole(role, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Search users
  // @route   GET /api/users/search
  // @access  Private/Admin
  static async searchUsers(req, res, next) {
    try {
      const searchTerm = req.query.q;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          error: 'Search term is required'
        });
      }

      const result = await UserService.searchUsers(searchTerm, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Get user statistics
  // @route   GET /api/users/stats
  // @access  Private/Admin
  static async getUserStats(req, res, next) {
    try {
      const result = await UserService.getUserStats();
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Search users
  // @route   GET /api/users/search
  // @access  Private/Admin
  static async searchUsers(req, res, next) {
    try {
      const searchTerm = req.query.q || '';
      const limit = parseInt(req.query.limit) || 10;
      const result = await UserService.searchUsers(searchTerm, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // @desc    Get users by role
  // @route   GET /api/users/role/:role
  // @access  Private/Admin
  static async getUsersByRole(req, res, next) {
    try {
      const role = req.params.role;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const result = await UserService.getUsersByRole(role, page, limit);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UserController;
