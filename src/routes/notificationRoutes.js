const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');

const notificationController = require('../controllers/notificationController');
const { authenticateClient } = require('../middleware/auth');
const { protect, authorize } = require('../middleware/auth');

// Validation middleware
const validateNotificationId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Notification ID must be a positive integer')
];

const validateTestNotification = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be less than 255 characters'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message is required and must be less than 1000 characters'),
  // Support both new and old field names for backward compatibility
  body('recipient_type')
    .optional()
    .isIn(['admin', 'client'])
    .withMessage('Recipient type must be either admin or client'),
  body('user_type')
    .optional()
    .isIn(['admin', 'client'])
    .withMessage('User type must be either admin or client'),
  body('recipient_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Recipient ID must be a positive integer'),
  body('user_id')
    .optional()
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  body('type')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Type must be less than 50 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, normal, high, urgent'),
  // Custom validation to ensure at least one type field is provided
  body().custom((value, { req }) => {
    if (!req.body.recipient_type && !req.body.user_type) {
      throw new Error('Either recipient_type or user_type must be provided');
    }
    return true;
  })
];

const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('unread_only')
    .optional()
    .isBoolean()
    .withMessage('Unread only must be a boolean')
];

const validateCleanup = [
  query('days')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365')
];

// Routes accessible by both admin and client users

/**
 * @route   GET /api/notifications/stream
 * @desc    Establish SSE connection for real-time notifications
 * @access  Private (Admin & Client)
 */
router.get('/stream', protect, notificationController.connect);

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications with pagination
 * @access  Private (Admin & Client)
 */
router.get('/', protect, validatePagination, notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private (Admin & Client)
 */
router.get('/unread-count', protect, notificationController.getUnreadCount);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private (Admin & Client)
 */
router.put('/:id/read', protect, validateNotificationId, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Private (Admin & Client)
 */
router.put('/mark-all-read', protect, notificationController.markAllAsRead);

// Admin-only routes

/**
 * @route   POST /api/notifications/test
 * @desc    Send test notification (admin only)
 * @access  Private (Admin only)
 */
router.post('/test', protect, authorize('admin'), validateTestNotification, notificationController.sendTestNotification);

/**
 * @route   GET /api/notifications/statistics
 * @desc    Get notification statistics (admin only)
 * @access  Private (Admin only)
 */
router.get('/statistics', protect, authorize('admin'), notificationController.getStatistics);

/**
 * @route   DELETE /api/notifications/cleanup
 * @desc    Delete old notifications (admin only)
 * @access  Private (Admin only)
 */
router.delete('/cleanup', protect, authorize('admin'), validateCleanup, notificationController.cleanupOldNotifications);

// Note: Client-specific routes removed - using unified endpoints with protect middleware
// The protect middleware in auth.js already handles both admin and client authentication

module.exports = router;
