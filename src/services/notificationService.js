const { executeQuery, executeTransaction } = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('./emailService');
const smsService = require('./smsService');

class NotificationService {
  constructor() {
    // Store active SSE connections
    this.connections = new Map(); // userId -> Set of response objects
    this.adminConnections = new Set(); // Set of admin response objects
  }

  /**
   * Add SSE connection for a user
   */
  addConnection(userId, userType, res) {
    const connectionId = `${userType}_${userId}_${Date.now()}`;

    // Track connection state to prevent duplicate removals
    const connectionState = { removed: false };

    if (userType === 'admin') {
      this.adminConnections.add({ id: connectionId, userId, res, state: connectionState });
    } else {
      if (!this.connections.has(userId)) {
        this.connections.set(userId, new Set());
      }
      this.connections.get(userId).add({ id: connectionId, res, state: connectionState });
    }

    logger.info(`SSE connection added: ${connectionId} for ${userType} user ${userId}`);
    return { connectionId, state: connectionState };
  }

  /**
   * Remove SSE connection
   */
  removeConnection(userId, userType, connectionId, connectionState = null) {
    // Prevent duplicate removals
    if (connectionState && connectionState.removed) {
      return false; // Already removed
    }

    let removed = false;

    if (userType === 'admin') {
      this.adminConnections.forEach(conn => {
        if (conn.id === connectionId) {
          this.adminConnections.delete(conn);
          removed = true;
        }
      });
    } else {
      const userConnections = this.connections.get(userId);
      if (userConnections) {
        userConnections.forEach(conn => {
          if (conn.id === connectionId) {
            userConnections.delete(conn);
            removed = true;
          }
        });
        if (userConnections.size === 0) {
          this.connections.delete(userId);
        }
      }
    }

    if (removed) {
      if (connectionState) {
        connectionState.removed = true;
      }
      logger.info(`SSE connection removed: ${connectionId}`);
    }

    return removed;
  }

  /**
   * Send notification to specific user
   */
  sendToUser(userId, notification) {
    const userConnections = this.connections.get(userId);
    if (userConnections) {
      const deadConnections = [];

      userConnections.forEach(conn => {
        // Skip already removed connections
        if (conn.state && conn.state.removed) {
          deadConnections.push(conn);
          return;
        }

        try {
          const data = JSON.stringify(notification);
          conn.res.write(`id: ${Date.now()}\n`);
          conn.res.write(`data: ${data}\n\n`);

          // CRITICAL FIX: Force immediate flush to prevent client_aborted
          if (conn.res.flush) conn.res.flush();
        } catch (error) {
          logger.error(`Failed to send notification to user ${userId}:`, error);
          deadConnections.push(conn);
        }
      });

      // Clean up dead connections
      deadConnections.forEach(conn => {
        userConnections.delete(conn);
      });
    }
  }

  /**
   * Send notification to all admin users
   */
  sendToAdmins(notification) {
    const deadConnections = [];

    this.adminConnections.forEach(conn => {
      // Skip already removed connections
      if (conn.state && conn.state.removed) {
        deadConnections.push(conn);
        return;
      }

      try {
        const data = JSON.stringify(notification);
        conn.res.write(`id: ${Date.now()}\n`);
        conn.res.write(`data: ${data}\n\n`);

        // CRITICAL FIX: Force immediate flush to prevent client_aborted
        if (conn.res.flush) conn.res.flush();
      } catch (error) {
        logger.error(`Failed to send notification to admin ${conn.userId}:`, error);
        deadConnections.push(conn);
      }
    });

    // Clean up dead connections
    deadConnections.forEach(conn => {
      this.adminConnections.delete(conn);
    });
  }

  /**
   * Send notification to all connected users
   */
  broadcast(notification) {
    // Send to all clients
    this.connections.forEach((userConnections, userId) => {
      this.sendToUser(userId, notification);
    });

    // Send to all admins
    this.sendToAdmins(notification);
  }

  /**
   * Create and store notification in database
   */
  async createNotification(data) {
    try {
      logger.info('Creating notification with data:', data);

      const {
        recipient_id,
        recipient_type,
        user_id, // For backward compatibility
        user_type, // For backward compatibility
        type,
        title,
        message,
        data: notificationData = null,
        priority = 'normal'
      } = data;

      // Handle backward compatibility
      const finalRecipientId = recipient_id !== undefined ? recipient_id : (user_id || null);
      const finalRecipientType = recipient_type || user_type;

      logger.info('Final notification parameters:', {
        finalRecipientId,
        finalRecipientType,
        type,
        title,
        message,
        notificationData,
        priority
      });

      const query = `
        INSERT INTO notifications (
          user_id, user_type, type, title, message, data, priority, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
      `;

      const queryParams = [
        finalRecipientId,
        finalRecipientType,
        type,
        title,
        message,
        notificationData ? JSON.stringify(notificationData) : null,
        priority
      ];

      logger.info('Executing notification INSERT query with params:', queryParams);

      const result = await executeQuery(query, queryParams);

      logger.info('Notification INSERT result:', result);

      const notification = {
        id: result.insertId,
        user_id: finalRecipientId,
        user_type: finalRecipientType,
        type,
        title,
        message,
        data: notificationData,
        priority,
        is_read: false,
        created_at: new Date().toISOString()
      };

      logger.info('Notification created successfully:', notification);
      return notification;
    } catch (error) {
      logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  /**
   * Send document request status change notification
   */
  async notifyStatusChange(requestId, oldStatusId, newStatusId, changedBy) {
    try {
      logger.info('🔔 Creating status change notification', {
        requestId,
        oldStatusId,
        newStatusId,
        changedBy
      });
      // Get request details including phone number for SMS
      const requestQuery = `
        SELECT dr.*, c.first_name, c.last_name, c.email, c.phone_number,
               dt.type_name, rs_old.status_name as old_status,
               rs_new.status_name as new_status
        FROM document_requests dr
        JOIN client_profiles c ON dr.client_id = c.account_id
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN request_status rs_old ON ? = rs_old.id
        JOIN request_status rs_new ON ? = rs_new.id
        WHERE dr.id = ?
      `;

      const requestResult = await executeQuery(requestQuery, [oldStatusId, newStatusId, requestId]);
      if (requestResult.length === 0) return;

      const request = requestResult[0];
      const clientName = `${request.first_name} ${request.last_name}`;

      logger.info('✅ Status change notification data retrieved', {
        requestId,
        clientId: request.client_id,
        oldStatus: request.old_status,
        newStatus: request.new_status,
        oldStatusId,
        newStatusId,
        changedBy
      });

      // Notification for client ONLY
      const clientNotification = await this.createNotification({
        recipient_id: request.client_id,
        recipient_type: 'client',
        type: 'status_change',
        title: 'Request Status Updated',
        message: `Your ${request.type_name} request (${request.request_number}) status has been updated to "${request.new_status}"`,
        data: {
          request_id: requestId,
          request_number: request.request_number,
          document_type: request.type_name,
          old_status: request.old_status,
          new_status: request.new_status
        },
        priority: newStatusId === 5 ? 'high' : 'normal' // High priority for rejections
      });

      // Send real-time notification to client
      this.sendToUser(request.client_id, clientNotification);

      // CRITICAL FIX: Do NOT create admin notifications when status is updated
      // Only the client should be notified when their request status changes
      // Admins already know about the change since they made it

      logger.info('Status change notification sent to client only', {
        requestId,
        clientId: request.client_id,
        oldStatus: request.old_status,
        newStatus: request.new_status,
        changedBy
      });

      // Send email notification to client
      try {
        await this.sendStatusChangeEmail(request);
        logger.info(`Email notification sent to ${request.email} for request ${requestId}`);
      } catch (emailError) {
        logger.error('Failed to send email notification:', emailError);
        // Don't fail the notification process if email fails
      }

      // Send SMS notification to client
      try {
        await this.sendStatusChangeSMS(request);
        logger.info(`SMS notification sent to ${request.phone_number} for request ${requestId}`);
      } catch (smsError) {
        logger.error('Failed to send SMS notification:', smsError);
        // Don't fail the notification process if SMS fails
      }

      logger.info(`Status change notifications sent for request ${requestId}`);
    } catch (error) {
      logger.error('Failed to send status change notification:', error);
    }
  }

  /**
   * Send new request notification to admins
   */
  async notifyNewRequest(requestId) {
    try {
      console.log(`🔔 NotificationService.notifyNewRequest called with requestId: ${requestId}`);

      // Get request details
      console.log(`📋 Getting request details for ID: ${requestId}`);
      const requestQuery = `
        SELECT dr.*, c.first_name, c.last_name, dt.type_name
        FROM document_requests dr
        JOIN client_profiles c ON dr.client_id = c.account_id
        JOIN document_types dt ON dr.document_type_id = dt.id
        WHERE dr.id = ?
      `;

      console.log(`📋 Executing request query: ${requestQuery}`);
      const requestResult = await executeQuery(requestQuery, [requestId]);
      console.log(`📋 Request query result:`, requestResult);
      if (requestResult.length === 0) return;

      const request = requestResult[0];
      const clientName = `${request.first_name} ${request.last_name}`;

      // Get all active admins
      const adminQuery = `
        SELECT id, username, role
        FROM admin_employee_accounts
        WHERE status = 'active' AND role IN ('admin', 'employee')
      `;

      const adminResult = await executeQuery(adminQuery);

      if (adminResult.length === 0) {
        logger.warn('No active admins found for new request notification', { requestId });
        return;
      }

      logger.info('Creating new request notifications for individual admins', {
        requestId,
        clientName,
        documentType: request.type_name,
        requestNumber: request.request_number,
        adminCount: adminResult.length
      });

      // Create individual notification for each admin
      const notifications = [];
      for (const admin of adminResult) {
        try {
          logger.info(`Creating notification for admin ${admin.id} (${admin.username})`);

          const notification = await this.createNotification({
            recipient_id: admin.id, // Individual admin ID
            recipient_type: 'admin',
            type: 'new_request',
            title: 'New Document Request',
            message: `${clientName} submitted a new ${request.type_name} request (${request.request_number})`,
            data: {
              request_id: requestId,
              request_number: request.request_number,
              document_type: request.type_name,
              client_name: clientName,
              priority: request.priority,
              admin_id: admin.id,
              admin_username: admin.username
            },
            priority: request.priority === 'urgent' ? 'high' : 'normal'
          });

          logger.info(`Notification created successfully for admin ${admin.id}:`, notification);
          notifications.push(notification);

          // Send real-time notification to this specific admin
          this.sendToUser(admin.id, notification);
        } catch (notificationError) {
          logger.error(`Failed to create notification for admin ${admin.id}:`, notificationError);
        }
      }

      // Also send to admin connections (for backward compatibility)
      if (notifications.length > 0) {
        this.sendToAdmins(notifications[0]);
      }

      // Send email notification to admins (optional - can be configured)
      try {
        await this.sendNewRequestEmailToAdmins(request);
        logger.info(`New request email notifications sent to admins for request ${requestId}`);
      } catch (emailError) {
        logger.error('Failed to send new request email to admins:', emailError);
        // Don't fail the notification process if email fails
      }

      logger.info(`New request notification sent for request ${requestId}`);
    } catch (error) {
      logger.error('Failed to send new request notification:', error);
    }
  }

  /**
   * Send request cancellation notification to admins
   */
  async notifyRequestCancellation(requestId, clientId, oldStatusId, newStatusId, reason = null) {
    try {
      logger.info('🔔 Creating request cancellation notification', {
        requestId,
        clientId,
        oldStatusId,
        newStatusId,
        reason
      });

      // Get request details with client and status information
      const requestQuery = `
        SELECT dr.*, c.first_name, c.last_name, c.email,
               dt.type_name, rs_old.status_name as old_status,
               rs_new.status_name as new_status
        FROM document_requests dr
        JOIN client_profiles c ON dr.client_id = c.account_id
        JOIN document_types dt ON dr.document_type_id = dt.id
        JOIN request_status rs_old ON ? = rs_old.id
        JOIN request_status rs_new ON ? = rs_new.id
        WHERE dr.id = ?
      `;

      const requestResult = await executeQuery(requestQuery, [oldStatusId, newStatusId, requestId]);

      if (requestResult.length === 0) {
        logger.warn('Request not found for cancellation notification', { requestId });
        return;
      }

      const request = requestResult[0];
      const clientName = `${request.first_name} ${request.last_name}`;

      // Get all active admins
      const adminQuery = `
        SELECT id, username, role
        FROM admin_employee_accounts
        WHERE status = 'active' AND role IN ('admin', 'employee')
      `;

      const adminResult = await executeQuery(adminQuery);

      if (adminResult.length === 0) {
        logger.warn('No active admins found for cancellation notification', { requestId });
        return;
      }

      logger.info('Creating cancellation notifications for individual admins', {
        requestId,
        clientName,
        documentType: request.type_name,
        requestNumber: request.request_number,
        reason,
        adminCount: adminResult.length
      });

      // Create individual notification for each admin
      const notifications = [];
      for (const admin of adminResult) {
        try {
          logger.info(`Creating cancellation notification for admin ${admin.id} (${admin.username})`);

          const notification = await this.createNotification({
            recipient_id: admin.id,
            recipient_type: 'admin',
            type: 'request_cancelled',
            title: 'Document Request Cancelled',
            message: `${clientName} cancelled their ${request.type_name} request (${request.request_number})${reason ? ` - Reason: ${reason}` : ''}`,
            data: {
              request_id: requestId,
              request_number: request.request_number,
              document_type: request.type_name,
              client_id: clientId,
              client_name: clientName,
              old_status: request.old_status,
              new_status: request.new_status,
              cancellation_reason: reason,
              cancelled_at: new Date().toISOString(),
              admin_id: admin.id,
              admin_username: admin.username
            },
            priority: 'normal'
          });

          logger.info(`Cancellation notification created successfully for admin ${admin.id}:`, notification);
          notifications.push(notification);

          // Send real-time notification to this specific admin
          this.sendToUser(admin.id, notification);
        } catch (notificationError) {
          logger.error(`Failed to create cancellation notification for admin ${admin.id}:`, notificationError);
        }
      }

      // Also send to admin connections (for backward compatibility)
      if (notifications.length > 0) {
        this.sendToAdmins(notifications[0]);
      }

      // Send email notification to admins (optional)
      try {
        await this.sendCancellationEmailToAdmins(request, reason);
        logger.info(`Cancellation email notifications sent to admins for request ${requestId}`);
      } catch (emailError) {
        logger.error('Failed to send cancellation email to admins:', emailError);
        // Don't fail the notification process if email fails
      }

      logger.info(`Request cancellation notification sent for request ${requestId}`);
    } catch (error) {
      logger.error('Failed to send request cancellation notification:', error);
    }
  }

  /**
   * Get user notifications with pagination - Role-based filtering
   */
  async getUserNotifications(userId, userType, page = 1, limit = 20, unreadOnly = false) {
    try {
      const offset = (page - 1) * limit;
      const unreadFilter = unreadOnly ? 'AND is_read = FALSE' : '';

      let query, countQuery, params, countParams;

      if (userType === 'admin') {
        // Admins see:
        // 1. Global admin notifications (recipient_id IS NULL AND recipient_type = 'admin')
        // 2. Specific admin notifications (recipient_id = adminId AND recipient_type = 'admin')
        query = `
          SELECT * FROM notifications
          WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?)
          ${unreadFilter}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        params = [userId, limit, offset];

        countQuery = `
          SELECT COUNT(*) as total FROM notifications
          WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?)
          ${unreadFilter}
        `;
        countParams = [userId];
      } else {
        // Clients see:
        // 1. Only their specific notifications (recipient_id = clientId AND recipient_type = 'client')
        query = `
          SELECT * FROM notifications
          WHERE recipient_type = 'client' AND recipient_id = ?
          ${unreadFilter}
          ORDER BY created_at DESC
          LIMIT ? OFFSET ?
        `;
        params = [userId, limit, offset];

        countQuery = `
          SELECT COUNT(*) as total FROM notifications
          WHERE recipient_type = 'client' AND recipient_id = ?
          ${unreadFilter}
        `;
        countParams = [userId];
      }

      logger.info('Getting notifications with role-based filtering', {
        userId,
        userType,
        page,
        limit,
        unreadOnly
      });

      const notifications = await executeQuery(query, params);
      const countResult = await executeQuery(countQuery, countParams);
      const total = countResult[0].total;

      logger.info('Retrieved notifications', {
        userId,
        userType,
        count: notifications.length,
        total
      });

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to get user notifications:', error);
      throw error;
    }
  }

  /**
   * Mark notification as read - Role-based security
   */
  async markAsRead(notificationId, userId, userType) {
    try {
      let query, params;

      if (userType === 'admin') {
        // Admins can mark read: global admin notifications + their specific notifications
        query = `
          UPDATE notifications
          SET is_read = TRUE, read_at = NOW()
          WHERE id = ? AND recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?)
        `;
        params = [notificationId, userId];
      } else {
        // Clients can only mark read their own notifications
        query = `
          UPDATE notifications
          SET is_read = TRUE, read_at = NOW()
          WHERE id = ? AND recipient_type = 'client' AND recipient_id = ?
        `;
        params = [notificationId, userId];
      }

      logger.info('Marking notification as read with role-based security', {
        notificationId,
        userId,
        userType
      });

      const result = await executeQuery(query, params);

      if (result.affectedRows > 0) {
        // Send real-time update about read status change
        const updateNotification = {
          type: 'notification_read',
          notification_id: notificationId,
          timestamp: new Date().toISOString()
        };

        if (userType === 'admin') {
          this.sendToUser(userId, updateNotification);
        } else {
          this.sendToUser(userId, updateNotification);
        }
      }

      logger.info(`Notification ${notificationId} marked as read by ${userType} ${userId}`);
    } catch (error) {
      logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read for a user - Role-based security
   */
  async markAllAsRead(userId, userType) {
    try {
      let query, params;

      if (userType === 'admin') {
        // Admins can mark all: global admin notifications + their specific notifications
        query = `
          UPDATE notifications
          SET is_read = TRUE, read_at = NOW()
          WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?) AND is_read = FALSE
        `;
        params = [userId];
      } else {
        // Clients can only mark all their own notifications
        query = `
          UPDATE notifications
          SET is_read = TRUE, read_at = NOW()
          WHERE recipient_type = 'client' AND recipient_id = ? AND is_read = FALSE
        `;
        params = [userId];
      }

      logger.info('Marking all notifications as read with role-based security', {
        userId,
        userType
      });

      const result = await executeQuery(query, params);

      if (result.affectedRows > 0) {
        // Send real-time update about all notifications being read
        const updateNotification = {
          type: 'all_notifications_read',
          count: result.affectedRows,
          timestamp: new Date().toISOString()
        };

        if (userType === 'admin') {
          this.sendToUser(userId, updateNotification);
        } else {
          this.sendToUser(userId, updateNotification);
        }
      }

      logger.info(`${result.affectedRows} notifications marked as read for ${userType} ${userId}`);
      return result.affectedRows;
    } catch (error) {
      logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count - Role-based filtering
   */
  async getUnreadCount(userId, userType) {
    try {
      let query, params;

      if (userType === 'admin') {
        // Admins see global admin notifications + their specific notifications
        query = `
          SELECT COUNT(*) as count FROM notifications
          WHERE recipient_type = 'admin' AND (recipient_id IS NULL OR recipient_id = ?) AND is_read = FALSE
        `;
        params = [userId];
      } else {
        // Clients see only their specific notifications
        query = `
          SELECT COUNT(*) as count FROM notifications
          WHERE recipient_type = 'client' AND recipient_id = ? AND is_read = FALSE
        `;
        params = [userId];
      }

      logger.info('Getting unread count with role-based filtering', {
        userId,
        userType
      });

      const result = await executeQuery(query, params);
      const count = result[0].count;

      logger.info('Retrieved unread count', {
        userId,
        userType,
        count
      });

      return count;
    } catch (error) {
      logger.error('Failed to get unread notification count:', error);
      throw error;
    }
  }

  /**
   * Send email notification for status change
   */
  async sendStatusChangeEmail(request) {
    try {
      if (!request.email) {
        logger.warn('No email address found for client, skipping email notification');
        return;
      }

      const subject = `Document Request Status Update - ${request.type_name}`;
      const clientName = `${request.first_name} ${request.last_name}`;

      const htmlContent = this.generateStatusChangeEmailTemplate(
        clientName,
        request.request_number,
        request.type_name,
        request.old_status,
        request.new_status
      );

      await emailService.sendEmail(request.email, subject, htmlContent);

      logger.info('Status change email sent successfully', {
        email: request.email,
        requestId: request.id,
        requestNumber: request.request_number,
        newStatus: request.new_status
      });

    } catch (error) {
      logger.error('Failed to send status change email:', error);
      throw error;
    }
  }

  /**
   * Send SMS notification for status change
   */
  async sendStatusChangeSMS(request) {
    try {
      if (!request.phone_number) {
        logger.warn('No phone number found for client, skipping SMS notification');
        return;
      }

      const clientName = `${request.first_name} ${request.last_name}`;

      const smsData = {
        phoneNumber: request.phone_number,
        clientName,
        documentType: request.type_name,
        requestNumber: request.request_number,
        newStatus: request.new_status
      };

      const result = await smsService.sendStatusChangeSMS(smsData);

      if (result.success) {
        logger.info('Status change SMS sent successfully', {
          phoneNumber: request.phone_number,
          requestId: request.id,
          requestNumber: request.request_number,
          newStatus: request.new_status
        });
      } else {
        logger.warn('SMS sending failed but continuing', {
          phoneNumber: request.phone_number,
          error: result.error || result.message
        });
      }

    } catch (error) {
      logger.error('Failed to send status change SMS:', error);
      throw error;
    }
  }

  /**
   * Generate email template for status change
   */
  generateStatusChangeEmailTemplate(clientName, requestNumber, documentType, oldStatus, newStatus) {
    const statusColors = {
      'pending': '#ffc107',
      'under_review': '#17a2b8',
      'approved': '#28a745',
      'rejected': '#dc3545',
      'processing': '#007bff',
      'ready_for_pickup': '#28a745',
      'completed': '#6f42c1',
      'cancelled': '#6c757d'
    };

    const statusColor = statusColors[newStatus.toLowerCase()] || '#6c757d';
    const isPositiveStatus = ['approved', 'processing', 'ready_for_pickup', 'completed'].includes(newStatus.toLowerCase());
    const isNegativeStatus = ['rejected', 'cancelled'].includes(newStatus.toLowerCase());

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document Request Status Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; }
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            background-color: ${statusColor};
            color: white;
            border-radius: 20px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
          }
          .request-details {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid ${statusColor};
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .icon { font-size: 24px; margin-bottom: 10px; }
          .positive { color: #28a745; }
          .negative { color: #dc3545; }
          .neutral { color: #6c757d; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="icon">
              ${isPositiveStatus ? '✅' : isNegativeStatus ? '❌' : '📋'}
            </div>
            <h1>Document Request Status Update</h1>
          </div>
          <div class="content">
            <h2>Hello ${clientName}!</h2>
            <p>Your document request status has been updated.</p>

            <div class="request-details">
              <h3>Request Details</h3>
              <p><strong>Request Number:</strong> ${requestNumber}</p>
              <p><strong>Document Type:</strong> ${documentType}</p>
              <p><strong>Previous Status:</strong> ${this.formatStatusForEmail(oldStatus)}</p>
              <p><strong>New Status:</strong> <span class="status-badge">${this.formatStatusForEmail(newStatus)}</span></p>
            </div>

            ${this.getStatusSpecificMessage(newStatus)}

            <p>You can track your request status by logging into your account on our barangay management system.</p>

            <p>If you have any questions or concerns, please don't hesitate to contact our office.</p>
          </div>
          <div class="footer">
            <p>This is an automated message from the Barangay Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Format status for email display
   */
  formatStatusForEmail(status) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get status-specific message for email
   */
  getStatusSpecificMessage(status) {
    const messages = {
      'approved': '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Good news!</strong> Your request has been approved and is now being processed.</div>',
      'rejected': '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Request Rejected:</strong> Unfortunately, your request could not be approved. Please contact our office for more information on how to proceed.</div>',
      'processing': '<div style="background-color: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Processing:</strong> Your approved request is now being processed. We will notify you when it\'s ready for pickup.</div>',
      'ready_for_pickup': '<div style="background-color: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Ready for Pickup!</strong> Your document is ready. Please visit our office during business hours to collect it.</div>',
      'completed': '<div style="background-color: #e2e3e5; border: 1px solid #d6d8db; color: #383d41; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Completed:</strong> Your request has been successfully completed. Thank you for using our services!</div>',
      'cancelled': '<div style="background-color: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Cancelled:</strong> Your request has been cancelled. If this was done in error, please contact our office.</div>'
    };

    return messages[status.toLowerCase()] || '<div style="background-color: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 5px; margin: 15px 0;"><strong>Status Updated:</strong> Your request status has been updated. Please check your account for more details.</div>';
  }

  /**
   * Send email notification to admins for new requests
   */
  async sendNewRequestEmailToAdmins(request) {
    try {
      // Get admin emails from database
      const adminQuery = `
        SELECT aep.email, aep.first_name, aep.last_name
        FROM admin_employee_profiles aep
        JOIN admin_employee_accounts aea ON aep.account_id = aea.id
        WHERE aea.status = 'active' AND aep.email IS NOT NULL AND aep.email != ''
      `;

      const admins = await executeQuery(adminQuery);

      if (admins.length === 0) {
        logger.warn('No admin emails found for new request notification');
        return;
      }

      const clientName = `${request.first_name} ${request.last_name}`;
      const subject = `New Document Request - ${request.type_name}`;

      // Send email to each admin
      const emailPromises = admins.map(admin => {
        const htmlContent = this.generateNewRequestEmailTemplate(
          admin.first_name,
          clientName,
          request.request_number,
          request.type_name,
          request.priority
        );

        return emailService.sendEmail(admin.email, subject, htmlContent);
      });

      await Promise.allSettled(emailPromises);

      logger.info('New request emails sent to admins', {
        requestId: request.id,
        requestNumber: request.request_number,
        adminCount: admins.length
      });

    } catch (error) {
      logger.error('Failed to send new request emails to admins:', error);
      throw error;
    }
  }

  /**
   * Generate email template for new request notification to admins
   */
  generateNewRequestEmailTemplate(adminName, clientName, requestNumber, documentType, priority) {
    const priorityColors = {
      'urgent': '#dc3545',
      'high': '#fd7e14',
      'normal': '#28a745',
      'low': '#6c757d'
    };

    const priorityColor = priorityColors[priority] || '#28a745';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Document Request</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; }
          .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            background-color: ${priorityColor};
            color: white;
            border-radius: 12px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 12px;
          }
          .request-details {
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            border-left: 4px solid #007bff;
          }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .action-button {
            display: inline-block;
            padding: 12px 24px;
            background-color: #007bff;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Document Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${adminName}!</h2>
            <p>A new document request has been submitted and requires your attention.</p>

            <div class="request-details">
              <h3>Request Details</h3>
              <p><strong>Request Number:</strong> ${requestNumber}</p>
              <p><strong>Client Name:</strong> ${clientName}</p>
              <p><strong>Document Type:</strong> ${documentType}</p>
              <p><strong>Priority:</strong> <span class="priority-badge">${priority}</span></p>
              <p><strong>Submitted:</strong> ${new Date().toLocaleString()}</p>
            </div>

            <p>Please log into the admin panel to review and process this request.</p>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/admin/requests" class="action-button">
                View Request
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from the Barangay Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send email notification to admins for request cancellations
   */
  async sendCancellationEmailToAdmins(request, reason = null) {
    try {
      // Get admin emails from database
      const adminQuery = `
        SELECT aep.email, aep.first_name, aep.last_name
        FROM admin_employee_profiles aep
        JOIN admin_employee_accounts aea ON aep.account_id = aea.id
        WHERE aea.status = 'active' AND aep.email IS NOT NULL AND aep.email != ''
      `;

      const admins = await executeQuery(adminQuery);

      if (admins.length === 0) {
        logger.warn('No admin emails found for cancellation notification');
        return;
      }

      const clientName = `${request.first_name} ${request.last_name}`;
      const subject = `Request Cancelled - ${request.type_name} (${request.request_number})`;

      // Send email to each admin
      const emailPromises = admins.map(admin => {
        const htmlContent = this.generateCancellationEmailTemplate(
          admin.first_name,
          clientName,
          request.request_number,
          request.type_name,
          reason
        );

        return emailService.sendEmail(admin.email, subject, htmlContent);
      });

      await Promise.allSettled(emailPromises);

      logger.info('Cancellation emails sent to admins', {
        requestId: request.id,
        requestNumber: request.request_number,
        adminCount: admins.length,
        reason
      });

    } catch (error) {
      logger.error('Failed to send cancellation emails to admins:', error);
      throw error;
    }
  }

  /**
   * Generate email template for request cancellation notification to admins
   */
  generateCancellationEmailTemplate(adminName, clientName, requestNumber, documentType, reason) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Request Cancelled - ${documentType}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
          .header { background: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; margin: -20px -20px 20px -20px; }
          .content { padding: 20px 0; }
          .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #dc3545; }
          .action-button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #666; font-size: 12px; }
          .reason-box { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚫 Request Cancelled</h1>
            <p>A client has cancelled their document request</p>
          </div>
          <div class="content">
            <p>Hello ${adminName},</p>
            <p>A document request has been cancelled by the client. Here are the details:</p>

            <div class="info-box">
              <h3>Request Details</h3>
              <p><strong>Request Number:</strong> ${requestNumber}</p>
              <p><strong>Document Type:</strong> ${documentType}</p>
              <p><strong>Client:</strong> ${clientName}</p>
              <p><strong>Cancelled At:</strong> ${new Date().toLocaleString()}</p>
            </div>

            ${reason ? `
            <div class="reason-box">
              <h4>Cancellation Reason:</h4>
              <p>${reason}</p>
            </div>
            ` : ''}

            <p>Please review this cancellation and take any necessary follow-up actions.</p>

            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL}/admin/requests" class="action-button">
                View All Requests
              </a>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from the Barangay Management System.</p>
            <p>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

module.exports = notificationService;
