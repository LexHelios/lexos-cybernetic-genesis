import EventEmitter from 'events';
import database from './database.js';
import taskPipelineWebSocket from './taskPipelineWebSocket.js';

class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.notifications = new Map(); // notificationId -> notification
    this.userNotifications = new Map(); // userId -> Set of notificationIds
    this.subscriptions = new Map(); // userId -> notification preferences
  }

  async initialize() {
    // Create notifications tables
    await this.createTables();
    console.log('Notification service initialized');
  }

  async createTables() {
    // Notifications table
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        type TEXT NOT NULL,
        priority TEXT DEFAULT 'normal',
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        read BOOLEAN DEFAULT 0,
        dismissed BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        read_at DATETIME,
        dismissed_at DATETIME,
        expires_at DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Notification preferences
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        user_id INTEGER PRIMARY KEY,
        email_enabled BOOLEAN DEFAULT 1,
        push_enabled BOOLEAN DEFAULT 1,
        in_app_enabled BOOLEAN DEFAULT 1,
        notification_types TEXT,
        quiet_hours_start TEXT,
        quiet_hours_end TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // System alerts
    await database.db.exec(`
      CREATE TABLE IF NOT EXISTS system_alerts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        component TEXT,
        data TEXT,
        active BOOLEAN DEFAULT 1,
        acknowledged BOOLEAN DEFAULT 0,
        acknowledged_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        acknowledged_at DATETIME,
        resolved_at DATETIME,
        FOREIGN KEY (acknowledged_by) REFERENCES users(id)
      )
    `);

    // Create indexes
    await database.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_system_alerts_active ON system_alerts(active);
      CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
    `);
  }

  // Create a new notification
  async createNotification(userId, type, title, message, options = {}) {
    const {
      priority = 'normal',
      data = null,
      expiresIn = null
    } = options;

    const expiresAt = expiresIn ? 
      new Date(Date.now() + expiresIn).toISOString() : null;

    const result = await database.db.run(
      `INSERT INTO notifications (user_id, type, priority, title, message, data, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, type, priority, title, message, JSON.stringify(data), expiresAt]
    );

    const notification = {
      id: result.lastID,
      userId,
      type,
      priority,
      title,
      message,
      data,
      read: false,
      dismissed: false,
      createdAt: new Date().toISOString(),
      expiresAt
    };

    // Store in memory for quick access
    this.notifications.set(notification.id, notification);
    
    if (!this.userNotifications.has(userId)) {
      this.userNotifications.set(userId, new Set());
    }
    this.userNotifications.get(userId).add(notification.id);

    // Send real-time notification
    this.sendRealtimeNotification(userId, notification);

    // Emit event
    this.emit('notification:created', notification);

    return notification;
  }

  // Send real-time notification via WebSocket
  sendRealtimeNotification(userId, notification) {
    taskPipelineWebSocket.sendToUser(userId, {
      type: 'notification:new',
      data: notification
    });
  }

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    const {
      limit = 50,
      offset = 0,
      unreadOnly = false,
      types = null
    } = options;

    let query = `
      SELECT * FROM notifications 
      WHERE user_id = ? AND dismissed = 0
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ' AND read = 0';
    }

    if (types && types.length > 0) {
      query += ` AND type IN (${types.map(() => '?').join(',')})`;
      params.push(...types);
    }

    query += ` AND (expires_at IS NULL OR expires_at > datetime('now'))`;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const notifications = await database.db.all(query, params);
    
    return notifications.map(n => ({
      ...n,
      data: JSON.parse(n.data || '{}'),
      read: !!n.read,
      dismissed: !!n.dismissed
    }));
  }

  // Mark notification as read
  async markAsRead(notificationId, userId) {
    await database.db.run(
      `UPDATE notifications 
       SET read = 1, read_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
    }

    // Send real-time update
    taskPipelineWebSocket.sendToUser(userId, {
      type: 'notification:read',
      data: { notificationId }
    });

    this.emit('notification:read', { notificationId, userId });
  }

  // Mark all notifications as read
  async markAllAsRead(userId) {
    await database.db.run(
      `UPDATE notifications 
       SET read = 1, read_at = CURRENT_TIMESTAMP 
       WHERE user_id = ? AND read = 0`,
      [userId]
    );

    // Update in-memory cache
    const userNotifIds = this.userNotifications.get(userId);
    if (userNotifIds) {
      userNotifIds.forEach(id => {
        const notification = this.notifications.get(id);
        if (notification && !notification.read) {
          notification.read = true;
          notification.readAt = new Date().toISOString();
        }
      });
    }

    // Send real-time update
    taskPipelineWebSocket.sendToUser(userId, {
      type: 'notification:all_read',
      data: {}
    });

    this.emit('notification:all_read', { userId });
  }

  // Dismiss notification
  async dismissNotification(notificationId, userId) {
    await database.db.run(
      `UPDATE notifications 
       SET dismissed = 1, dismissed_at = CURRENT_TIMESTAMP 
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.dismissed = true;
      notification.dismissedAt = new Date().toISOString();
    }

    // Send real-time update
    taskPipelineWebSocket.sendToUser(userId, {
      type: 'notification:dismissed',
      data: { notificationId }
    });

    this.emit('notification:dismissed', { notificationId, userId });
  }

  // Get notification count
  async getNotificationCount(userId, unreadOnly = true) {
    const query = unreadOnly ?
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0 AND dismissed = 0' :
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND dismissed = 0';
    
    const result = await database.db.get(query, [userId]);
    return result.count;
  }

  // Create system alert
  async createSystemAlert(alertType, severity, title, message, component = null, data = null) {
    const result = await database.db.run(
      `INSERT INTO system_alerts (alert_type, severity, title, message, component, data)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [alertType, severity, title, message, component, JSON.stringify(data)]
    );

    const alert = {
      id: result.lastID,
      alertType,
      severity,
      title,
      message,
      component,
      data,
      active: true,
      acknowledged: false,
      createdAt: new Date().toISOString()
    };

    // Broadcast to all connected users
    taskPipelineWebSocket.broadcast({
      type: 'system:alert',
      data: alert
    });

    // Create notifications for admins
    const admins = await database.db.all(
      'SELECT id FROM users WHERE role IN (?, ?)',
      ['admin', 'overlord']
    );

    for (const admin of admins) {
      await this.createNotification(
        admin.id,
        'system_alert',
        `System Alert: ${title}`,
        message,
        {
          priority: severity === 'critical' ? 'high' : 'normal',
          data: { alertId: alert.id, alertType, severity, component }
        }
      );
    }

    this.emit('system:alert', alert);
    return alert;
  }

  // Get active system alerts
  async getSystemAlerts(options = {}) {
    const { activeOnly = true, severity = null, limit = 50 } = options;

    let query = 'SELECT * FROM system_alerts WHERE 1=1';
    const params = [];

    if (activeOnly) {
      query += ' AND active = 1';
    }

    if (severity) {
      query += ' AND severity = ?';
      params.push(severity);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const alerts = await database.db.all(query, params);
    
    return alerts.map(alert => ({
      ...alert,
      data: JSON.parse(alert.data || '{}'),
      active: !!alert.active,
      acknowledged: !!alert.acknowledged
    }));
  }

  // Acknowledge system alert
  async acknowledgeSystemAlert(alertId, userId) {
    await database.db.run(
      `UPDATE system_alerts 
       SET acknowledged = 1, acknowledged_by = ?, acknowledged_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [userId, alertId]
    );

    // Broadcast update
    taskPipelineWebSocket.broadcast({
      type: 'system:alert_acknowledged',
      data: { alertId, userId }
    });

    this.emit('system:alert_acknowledged', { alertId, userId });
  }

  // Resolve system alert
  async resolveSystemAlert(alertId) {
    await database.db.run(
      `UPDATE system_alerts 
       SET active = 0, resolved_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [alertId]
    );

    // Broadcast update
    taskPipelineWebSocket.broadcast({
      type: 'system:alert_resolved',
      data: { alertId }
    });

    this.emit('system:alert_resolved', { alertId });
  }

  // Get user notification preferences
  async getUserPreferences(userId) {
    let prefs = await database.db.get(
      'SELECT * FROM notification_preferences WHERE user_id = ?',
      [userId]
    );

    if (!prefs) {
      // Create default preferences
      await database.db.run(
        `INSERT INTO notification_preferences (user_id) VALUES (?)`,
        [userId]
      );
      prefs = await database.db.get(
        'SELECT * FROM notification_preferences WHERE user_id = ?',
        [userId]
      );
    }

    return {
      ...prefs,
      notificationTypes: JSON.parse(prefs.notification_types || '[]'),
      emailEnabled: !!prefs.email_enabled,
      pushEnabled: !!prefs.push_enabled,
      inAppEnabled: !!prefs.in_app_enabled
    };
  }

  // Update user notification preferences
  async updateUserPreferences(userId, preferences) {
    const {
      emailEnabled,
      pushEnabled,
      inAppEnabled,
      notificationTypes,
      quietHoursStart,
      quietHoursEnd
    } = preferences;

    await database.db.run(
      `UPDATE notification_preferences 
       SET email_enabled = ?, push_enabled = ?, in_app_enabled = ?, 
           notification_types = ?, quiet_hours_start = ?, quiet_hours_end = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [
        emailEnabled ? 1 : 0,
        pushEnabled ? 1 : 0,
        inAppEnabled ? 1 : 0,
        JSON.stringify(notificationTypes || []),
        quietHoursStart,
        quietHoursEnd,
        userId
      ]
    );

    this.emit('preferences:updated', { userId, preferences });
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications() {
    const result = await database.db.run(
      `DELETE FROM notifications 
       WHERE expires_at IS NOT NULL AND expires_at < datetime('now')`
    );

    if (result.changes > 0) {
      console.log(`Cleaned up ${result.changes} expired notifications`);
    }
  }

  // Get notification statistics
  async getNotificationStats(userId = null) {
    let query = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN read = 0 THEN 1 ELSE 0 END) as unread,
        SUM(CASE WHEN dismissed = 1 THEN 1 ELSE 0 END) as dismissed,
        type,
        priority
      FROM notifications
    `;

    const params = [];
    if (userId) {
      query += ' WHERE user_id = ?';
      params.push(userId);
    }

    query += ' GROUP BY type, priority';

    const stats = await database.db.all(query, params);
    
    return {
      byType: stats.reduce((acc, stat) => {
        if (!acc[stat.type]) {
          acc[stat.type] = { total: 0, unread: 0, dismissed: 0 };
        }
        acc[stat.type].total += stat.total;
        acc[stat.type].unread += stat.unread;
        acc[stat.type].dismissed += stat.dismissed;
        return acc;
      }, {}),
      byPriority: stats.reduce((acc, stat) => {
        if (!acc[stat.priority]) {
          acc[stat.priority] = { total: 0, unread: 0, dismissed: 0 };
        }
        acc[stat.priority].total += stat.total;
        acc[stat.priority].unread += stat.unread;
        acc[stat.priority].dismissed += stat.dismissed;
        return acc;
      }, {})
    };
  }
}

export default new NotificationService();