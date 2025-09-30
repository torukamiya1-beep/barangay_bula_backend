const express = require('express');
const UserController = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Archive routes
router.get('/users', UserController.getArchivedUsers);
router.patch('/users/:id/restore', UserController.restoreUser);

module.exports = router;
