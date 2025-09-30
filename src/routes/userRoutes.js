const express = require('express');
const UserController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserUpdate
} = require('../middleware/validation');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Archive routes - MUST be first to avoid conflicts with /:id
router.get('/get-archived-users', UserController.getArchivedUsers);

// User management routes
router.route('/')
  .get(UserController.getAllUsers)
  .post(validateUserRegistration, UserController.createUser);

router.route('/search')
  .get(UserController.searchUsers);

router.route('/stats')
  .get(UserController.getUserStats);

router.route('/role/:role')
  .get(UserController.getUsersByRole);

router.route('/:id')
  .get(UserController.getUser)
  .put(UserController.updateUser)
  .delete(UserController.deleteUser);

router.get('/:id/exists', UserController.checkUserExists);

router.patch('/:id/restore', UserController.restoreUser);

router.patch('/:id/restore', UserController.restoreUser);

router.patch('/:id/toggle-status', UserController.toggleUserStatus);

module.exports = router;
