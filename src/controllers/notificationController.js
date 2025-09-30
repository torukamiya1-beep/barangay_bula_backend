const { validationResult } = require('express-validator');
const notificationService = require('../services/notificationService');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class NotificationController {
  /**
   * Establish SSE connection for real-time notifications
   */
  async connect(req, res) {
    try {
      // Handle preflight OPTIONS request
      if (req.method === 'OPTIONS') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': req.headers.origin || '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Allow-Credentials': 'true'
        });
        res.end();
        return;
      }

      const userId = req.user.id;
      const userType = req.user.type || (req.user.role ? 'admin' : 'client');

      logger.info(`SSE connection request from ${userType} user ${userId}`);

      // Set PROPER SSE headers (Google/Mozilla standard)
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': req.headers.origin || '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
        'Transfer-Encoding': 'chunked'
      });

      // Send PROPER SSE connection confirmation (CRITICAL: Must flush immediately)
      res.write(`retry: 3000\n`); // Reconnect after 3 seconds if connection drops
      res.write(`id: ${Date.now()}\n`); // Unique event ID
      res.write(`event: connected\n`); // Event type
      res.write(`data: ${JSON.stringify({
        type: 'connection',
        message: 'Connected to notification stream',
        timestamp: new Date().toISOString(),
        userId: userId,
        userType: userType
      })}\n\n`);

      // CRITICAL FIX: Force immediate flush to prevent client_aborted
      res.flushHeaders(); // Flush headers first
      if (res.flush) res.flush(); // Then flush data

      // Additional fix: Disable Nagle's algorithm for immediate sending
      if (res.socket) {
        res.socket.setNoDelay(true);
      }

      // CRITICAL: Set connection timeout to prevent premature closure
      req.setTimeout(0); // Disable request timeout
      res.setTimeout(0); // Disable response timeout

      // Set socket options to prevent connection drops
      if (req.socket) {
        req.socket.setKeepAlive(true, 30000); // Keep alive with 30s interval
        req.socket.setNoDelay(true); // Disable Nagle's algorithm
        req.socket.setTimeout(0); // Disable socket timeout
      }

      // Add connection to notification service
      const { connectionId, state } = notificationService.addConnection(userId, userType, res);

      // Send PROPER heartbeat every 15 seconds with FORCED FLUSH
      const heartbeat = setInterval(() => {
        try {
          // Check if connection is still alive
          if (res.destroyed || res.finished) {
            clearInterval(heartbeat);
            return;
          }

          // Send proper SSE heartbeat
          res.write(`id: ${Date.now()}\n`);
          res.write(`event: heartbeat\n`);
          res.write(`data: ${JSON.stringify({
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
            server: 'alive'
          })}\n\n`);

          // CRITICAL: Force immediate flush (prevents client_aborted)
          if (res.flush) res.flush();

          // Additional: Keep socket alive
          if (res.socket) {
            res.socket.setKeepAlive(true);
          }
        } catch (error) {
          logger.error('Heartbeat error:', error);
          clearInterval(heartbeat);
        }
      }, 15000); // 15 seconds - industry standard

      // Single cleanup function to prevent duplicate removals
      const cleanup = (reason) => {
        clearInterval(heartbeat);
        const removed = notificationService.removeConnection(userId, userType, connectionId, state);
        if (removed) {
          logger.info(`SSE connection closed for ${userType} user ${userId} - Reason: ${reason}`);
        }
      };

      // Clean up on connection close or abort (only one will trigger due to state tracking)
      req.on('close', () => cleanup('client_closed'));
      req.on('aborted', () => cleanup('client_aborted'));

      // Also handle response close
      res.on('close', () => cleanup('response_closed'));
      res.on('finish', () => cleanup('response_finished'));

    } catch (error) {
      logger.error('SSE connection error:', error);
      res.status(500).json({ error: 'Failed to establish SSE connection' });
    }
  }

  /**
   * Get user notifications with pagination
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.type || (req.user.role ? 'admin' : 'client');
      const { page = 1, limit = 20, unread_only = false } = req.query;

      // Security validation: Ensure user type is valid
      if (!['admin', 'client'].includes(userType)) {
        logger.warn('Invalid user type in notification request', { userId, userType });
        return errorResponse(res, 'Invalid user type', 400);
      }

      // Security validation: Ensure user ID exists
      if (!userId) {
        logger.warn('Missing user ID in notification request', { userType });
        return errorResponse(res, 'User ID required', 400);
      }

      logger.info('🔍 NotificationController: getNotifications called', {
        userId,
        userType,
        page,
        limit,
        unread_only
      });

      const result = await notificationService.getUserNotifications(
        userId,
        userType,
        parseInt(page),
        parseInt(limit),
        unread_only === 'true'
      );

      logger.info('✅ NotificationController: notifications retrieved', {
        userId,
        userType,
        count: result.notifications?.length || 0,
        pagination: result.pagination
      });

      return successResponse(res, 'Notifications retrieved successfully', result);
    } catch (error) {
      logger.error('❌ NotificationController: Get notifications error:', error);
      return errorResponse(res, 'Failed to retrieve notifications', 500);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.type || (req.user.role ? 'admin' : 'client');

      // Security validation: Ensure user type is valid
      if (!['admin', 'client'].includes(userType)) {
        logger.warn('Invalid user type in unread count request', { userId, userType });
        return errorResponse(res, 'Invalid user type', 400);
      }

      // Security validation: Ensure user ID exists
      if (!userId) {
        logger.warn('Missing user ID in unread count request', { userType });
        return errorResponse(res, 'User ID required', 400);
      }

      logger.info('🔍 NotificationController: getUnreadCount called', {
        userId,
        userType
      });

      const count = await notificationService.getUnreadCount(userId, userType);

      logger.info('✅ NotificationController: unread count retrieved', {
        userId,
        userType,
        count
      });

      return successResponse(res, 'Unread count retrieved successfully', { count });
    } catch (error) {
      logger.error('❌ NotificationController: Get unread count error:', error);
      return errorResponse(res, 'Failed to retrieve unread count', 500);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const { id } = req.params;
      const userId = req.user.id;
      const userType = req.user.type || (req.user.role ? 'admin' : 'client');

      await notificationService.markAsRead(parseInt(id), userId, userType);

      return successResponse(res, 'Notification marked as read');
    } catch (error) {
      logger.error('Mark as read error:', error);
      return errorResponse(res, 'Failed to mark notification as read', 500);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      const userType = req.user.type || (req.user.role ? 'admin' : 'client');

      const count = await notificationService.markAllAsRead(userId, userType);

      return successResponse(res, 'All notifications marked as read', { count });
    } catch (error) {
      logger.error('Mark all as read error:', error);
      return errorResponse(res, 'Failed to mark all notifications as read', 500);
    }
  }

  /**
   * Send test notification (admin only)
   */
  async sendTestNotification(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 400, errors.array());
      }

      const {
        recipient_id,
        recipient_type,
        user_id, // For backward compatibility
        user_type, // For backward compatibility
        title,
        message,
        type = 'test',
        priority = 'normal'
      } = req.body;

      // Handle backward compatibility
      const finalRecipientId = recipient_id || user_id;
      const finalRecipientType = recipient_type || user_type;

      const notification = await notificationService.createNotification({
        recipient_id: finalRecipientId || null,
        recipient_type: finalRecipientType,
        type,
        title,
        message,
        priority
      });

      // Send real-time notification
      if (finalRecipientId) {
        notificationService.sendToUser(finalRecipientId, notification);
      } else if (finalRecipientType === 'admin') {
        notificationService.sendToAdmins(notification);
      } else {
        notificationService.broadcast(notification);
      }

      return successResponse(res, 'Test notification sent successfully', notification);
    } catch (error) {
      logger.error('Send test notification error:', error);
      return errorResponse(res, 'Failed to send test notification', 500);
    }
  }

  /**
   * Get notification statistics (admin only)
   */
  async getStatistics(req, res) {
    try {
      const { executeQuery } = require('../utils/database');
      
      // Get notification statistics
      const statsQuery = `
        SELECT
          recipient_type,
          type,
          priority,
          is_read,
          COUNT(*) as count
        FROM notifications
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY recipient_type, type, priority, is_read
        ORDER BY recipient_type, type, priority
      `;

      const stats = await executeQuery(statsQuery);

      // Get recent activity
      const recentQuery = `
        SELECT
          type,
          title,
          recipient_type,
          priority,
          created_at,
          COUNT(*) as count
        FROM notifications
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY type, title, recipient_type, priority, DATE(created_at)
        ORDER BY created_at DESC
        LIMIT 50
      `;

      const recentActivity = await executeQuery(recentQuery);

      return successResponse(res, 'Notification statistics retrieved successfully', {
        statistics: stats,
        recent_activity: recentActivity
      });
    } catch (error) {
      logger.error('Get notification statistics error:', error);
      return errorResponse(res, 'Failed to retrieve notification statistics', 500);
    }
  }

  /**
   * Delete old notifications (admin only)
   */
  async cleanupOldNotifications(req, res) {
    try {
      const { days = 90 } = req.query;
      const { executeQuery } = require('../utils/database');

      const deleteQuery = `
        DELETE FROM notifications
        WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
        AND is_read = TRUE
      `;

      const result = await executeQuery(deleteQuery, [parseInt(days)]);

      return successResponse(res, 'Old notifications cleaned up successfully', {
        deleted_count: result.affectedRows
      });
    } catch (error) {
      logger.error('Cleanup old notifications error:', error);
      return errorResponse(res, 'Failed to cleanup old notifications', 500);
    }
  }
}

module.exports = new NotificationController();
