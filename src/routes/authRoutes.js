const express = require('express');
const AuthController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validatePasswordChange
} = require('../middleware/validation');

const router = express.Router();

// Public routes
router.post('/register', validateUserRegistration, AuthController.register);
router.post('/login', validateUserLogin, AuthController.login);

// Protected routes
router.use(protect); // All routes below this middleware are protected

router.get('/me', AuthController.getMe);
router.put('/profile', validateUserUpdate, AuthController.updateProfile);
router.put('/change-password', validatePasswordChange, AuthController.changePassword);
router.post('/logout', AuthController.logout);

module.exports = router;
