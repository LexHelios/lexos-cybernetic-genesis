import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export class AccessControlService extends EventEmitter {
  constructor(authService, securityService) {
    super();
    this.authService = authService;
    this.securityService = securityService;
    
    // Role-based permissions
    this.roles = new Map([
      ['admin', {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access',
        permissions: ['*'],
        inherits: []
      }],
      ['operator', {
        id: 'operator',
        name: 'System Operator',
        description: 'Operational access',
        permissions: [
          'system.view',
          'system.monitor',
          'agents.view',
          'agents.execute',
          'models.view',
          'models.pull',
          'tasks.create',
          'tasks.view',
          'tasks.execute'
        ],
        inherits: ['user']
      }],
      ['user', {
        id: 'user',
        name: 'Standard User',
        description: 'Basic access',
        permissions: [
          'system.view',
          'agents.view',
          'models.view',
          'tasks.view',
          'profile.view',
          'profile.update'
        ],
        inherits: []
      }],
      ['guest', {
        id: 'guest',
        name: 'Guest',
        description: 'Limited read-only access',
        permissions: [
          'system.view',
          'models.view'
        ],
        inherits: []
      }]
    ]);
    
    // Resource definitions
    this.resources = new Map([
      ['system', {
        id: 'system',
        name: 'System',
        actions: ['view', 'configure', 'monitor', 'restart', 'shutdown']
      }],
      ['agents', {
        id: 'agents',
        name: 'Agents',
        actions: ['create', 'view', 'update', 'delete', 'execute', 'configure']
      }],
      ['models', {
        id: 'models',
        name: 'Models',
        actions: ['view', 'pull', 'delete', 'configure']
      }],
      ['tasks', {
        id: 'tasks',
        name: 'Tasks',
        actions: ['create', 'view', 'execute', 'cancel', 'delete']
      }],
      ['security', {
        id: 'security',
        name: 'Security',
        actions: ['view', 'configure', 'audit', 'manage_users', 'manage_roles']
      }],
      ['profile', {
        id: 'profile',
        name: 'User Profile',
        actions: ['view', 'update']
      }]
    ]);
    
    // Access rules
    this.accessRules = new Map();
    this.initializeAccessRules();
    
    // Session tracking
    this.activeSessions = new Map();
    this.sessionActivity = new Map();
    
    // Start session monitoring
    this.startSessionMonitoring();
  }
  
  initializeAccessRules() {
    // Define specific access rules
    this.addAccessRule('allow_admin_all', {
      name: 'Allow Admin All Access',
      effect: 'allow',
      roles: ['admin'],
      resources: ['*'],
      actions: ['*'],
      conditions: []
    });
    
    this.addAccessRule('deny_guest_sensitive', {
      name: 'Deny Guest Sensitive Access',
      effect: 'deny',
      roles: ['guest'],
      resources: ['security', 'agents', 'tasks'],
      actions: ['*'],
      conditions: []
    });
    
    this.addAccessRule('allow_operator_monitoring', {
      name: 'Allow Operator Monitoring',
      effect: 'allow',
      roles: ['operator'],
      resources: ['system', 'agents', 'tasks'],
      actions: ['view', 'monitor'],
      conditions: []
    });
    
    this.addAccessRule('time_based_access', {
      name: 'Time-based Access Control',
      effect: 'allow',
      roles: ['operator'],
      resources: ['system'],
      actions: ['configure'],
      conditions: [
        {
          type: 'time_range',
          start: '09:00',
          end: '17:00',
          timezone: 'UTC'
        }
      ]
    });
  }
  
  startSessionMonitoring() {
    setInterval(() => {
      this.checkSessionTimeouts();
      this.trackSessionActivity();
    }, 30000); // Check every 30 seconds
  }
  
  async createSession(user, token, context) {
    const sessionId = uuidv4();
    const session = {
      id: sessionId,
      userId: user.user_id,
      username: user.username,
      role: user.role,
      token,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000), // 30 minutes
      ip: context.ip,
      userAgent: context.userAgent,
      permissions: await this.getUserPermissions(user),
      active: true
    };
    
    this.activeSessions.set(sessionId, session);
    this.sessionActivity.set(sessionId, []);
    
    this.emit('session_created', {
      sessionId,
      userId: user.user_id,
      role: user.role
    });
    
    return session;
  }
  
  async getUserPermissions(user) {
    const permissions = new Set();
    
    // Get role permissions
    const role = this.roles.get(user.role);
    if (role) {
      // Add direct permissions
      role.permissions.forEach(p => permissions.add(p));
      
      // Add inherited permissions
      for (const inheritedRole of role.inherits) {
        const inherited = this.roles.get(inheritedRole);
        if (inherited) {
          inherited.permissions.forEach(p => permissions.add(p));
        }
      }
    }
    
    // Add any user-specific permissions
    if (user.permissions) {
      user.permissions.forEach(p => permissions.add(p));
    }
    
    return Array.from(permissions);
  }
  
  async checkAccess(user, resource, action, context = {}) {
    // Log access attempt
    const accessLog = {
      userId: user.user_id,
      username: user.username,
      role: user.role,
      resource,
      action,
      timestamp: Date.now(),
      context
    };
    
    try {
      // Check if user has wildcard permission
      const permissions = await this.getUserPermissions(user);
      if (permissions.includes('*')) {
        accessLog.result = 'allowed';
        accessLog.reason = 'wildcard_permission';
        this.logAccessAttempt(accessLog);
        return { allowed: true, reason: 'wildcard_permission' };
      }
      
      // Check specific permission
      const permissionKey = `${resource}.${action}`;
      if (permissions.includes(permissionKey)) {
        accessLog.result = 'allowed';
        accessLog.reason = 'direct_permission';
        this.logAccessAttempt(accessLog);
        return { allowed: true, reason: 'direct_permission' };
      }
      
      // Check access rules
      for (const [ruleId, rule] of this.accessRules) {
        if (this.evaluateAccessRule(rule, user, resource, action, context)) {
          if (rule.effect === 'allow') {
            accessLog.result = 'allowed';
            accessLog.reason = `rule:${ruleId}`;
            this.logAccessAttempt(accessLog);
            return { allowed: true, reason: `rule:${ruleId}` };
          } else if (rule.effect === 'deny') {
            accessLog.result = 'denied';
            accessLog.reason = `rule:${ruleId}`;
            this.logAccessAttempt(accessLog);
            return { allowed: false, reason: `rule:${ruleId}` };
          }
        }
      }
      
      // Default deny
      accessLog.result = 'denied';
      accessLog.reason = 'no_matching_permission';
      this.logAccessAttempt(accessLog);
      return { allowed: false, reason: 'no_matching_permission' };
      
    } catch (error) {
      accessLog.result = 'error';
      accessLog.error = error.message;
      this.logAccessAttempt(accessLog);
      return { allowed: false, reason: 'error', error: error.message };
    }
  }
  
  evaluateAccessRule(rule, user, resource, action, context) {
    // Check role match
    if (!rule.roles.includes('*') && !rule.roles.includes(user.role)) {
      return false;
    }
    
    // Check resource match
    if (!rule.resources.includes('*') && !rule.resources.includes(resource)) {
      return false;
    }
    
    // Check action match
    if (!rule.actions.includes('*') && !rule.actions.includes(action)) {
      return false;
    }
    
    // Evaluate conditions
    for (const condition of rule.conditions) {
      if (!this.evaluateCondition(condition, user, context)) {
        return false;
      }
    }
    
    return true;
  }
  
  evaluateCondition(condition, user, context) {
    switch (condition.type) {
      case 'time_range':
        return this.evaluateTimeRangeCondition(condition);
      
      case 'ip_whitelist':
        return condition.allowed_ips.includes(context.ip);
      
      case 'mfa_required':
        return context.mfaVerified === true;
      
      case 'session_age':
        const sessionAge = Date.now() - context.sessionCreatedAt;
        return sessionAge <= condition.maxAge;
      
      default:
        return true;
    }
  }
  
  evaluateTimeRangeCondition(condition) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = condition.start.split(':').map(Number);
    const [endHour, endMin] = condition.end.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Handle overnight ranges
      return currentTime >= startTime || currentTime <= endTime;
    }
  }
  
  addAccessRule(id, rule) {
    rule.id = id;
    rule.createdAt = Date.now();
    this.accessRules.set(id, rule);
    
    this.emit('access_rule_added', { id, rule });
    return rule;
  }
  
  updateAccessRule(id, updates) {
    const rule = this.accessRules.get(id);
    if (!rule) {
      throw new Error('Access rule not found');
    }
    
    Object.assign(rule, updates);
    rule.updatedAt = Date.now();
    
    this.emit('access_rule_updated', { id, rule });
    return rule;
  }
  
  deleteAccessRule(id) {
    const rule = this.accessRules.get(id);
    if (!rule) {
      throw new Error('Access rule not found');
    }
    
    this.accessRules.delete(id);
    this.emit('access_rule_deleted', { id, rule });
    return true;
  }
  
  createRole(roleData) {
    const { id, name, description, permissions, inherits } = roleData;
    
    if (this.roles.has(id)) {
      throw new Error('Role already exists');
    }
    
    const role = {
      id,
      name,
      description,
      permissions: permissions || [],
      inherits: inherits || [],
      createdAt: Date.now()
    };
    
    this.roles.set(id, role);
    this.emit('role_created', { role });
    return role;
  }
  
  updateRole(roleId, updates) {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }
    
    // Don't allow updating system roles
    if (['admin', 'operator', 'user', 'guest'].includes(roleId)) {
      throw new Error('Cannot modify system roles');
    }
    
    Object.assign(role, updates);
    role.updatedAt = Date.now();
    
    this.emit('role_updated', { roleId, role });
    return role;
  }
  
  deleteRole(roleId) {
    const role = this.roles.get(roleId);
    if (!role) {
      throw new Error('Role not found');
    }
    
    // Don't allow deleting system roles
    if (['admin', 'operator', 'user', 'guest'].includes(roleId)) {
      throw new Error('Cannot delete system roles');
    }
    
    this.roles.delete(roleId);
    this.emit('role_deleted', { roleId, role });
    return true;
  }
  
  updateSession(sessionId, activity) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    session.lastActivity = Date.now();
    
    // Track activity
    const activities = this.sessionActivity.get(sessionId) || [];
    activities.push({
      timestamp: Date.now(),
      ...activity
    });
    
    // Keep only last 100 activities
    if (activities.length > 100) {
      activities.splice(0, activities.length - 100);
    }
    
    this.sessionActivity.set(sessionId, activities);
    return true;
  }
  
  endSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) return false;
    
    session.active = false;
    session.endedAt = Date.now();
    
    this.emit('session_ended', {
      sessionId,
      userId: session.userId,
      duration: session.endedAt - session.createdAt
    });
    
    // Remove from active sessions
    this.activeSessions.delete(sessionId);
    this.sessionActivity.delete(sessionId);
    
    return true;
  }
  
  checkSessionTimeouts() {
    const now = Date.now();
    
    for (const [sessionId, session] of this.activeSessions) {
      if (session.expiresAt < now || 
          (now - session.lastActivity) > this.securityService.config.sessionTimeout) {
        this.endSession(sessionId);
        
        this.securityService.logSecurityEvent('session_timeout', {
          sessionId,
          userId: session.userId,
          reason: session.expiresAt < now ? 'expired' : 'inactive'
        });
      }
    }
  }
  
  trackSessionActivity() {
    for (const [sessionId, session] of this.activeSessions) {
      const activities = this.sessionActivity.get(sessionId) || [];
      
      // Check for suspicious patterns
      const recentActivities = activities.filter(a => 
        Date.now() - a.timestamp < 300000 // Last 5 minutes
      );
      
      if (recentActivities.length > 100) {
        this.securityService.logSecurityEvent('suspicious_session_activity', {
          sessionId,
          userId: session.userId,
          activityCount: recentActivities.length
        });
      }
    }
  }
  
  logAccessAttempt(accessLog) {
    // Log to security service
    this.securityService.logSecurityEvent('access_attempt', accessLog);
    
    // Update session activity if available
    if (accessLog.context && accessLog.context.sessionId) {
      this.updateSession(accessLog.context.sessionId, {
        type: 'access_attempt',
        resource: accessLog.resource,
        action: accessLog.action,
        result: accessLog.result
      });
    }
    
    // Emit event for real-time monitoring
    this.emit('access_attempt', accessLog);
  }
  
  getActiveSessions() {
    const sessions = [];
    
    for (const [sessionId, session] of this.activeSessions) {
      sessions.push({
        id: sessionId,
        userId: session.userId,
        username: session.username,
        role: session.role,
        ip: session.ip,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        expiresAt: session.expiresAt
      });
    }
    
    return sessions;
  }
  
  getSessionActivity(sessionId) {
    return this.sessionActivity.get(sessionId) || [];
  }
  
  getRoles() {
    return Array.from(this.roles.values());
  }
  
  getAccessRules() {
    return Array.from(this.accessRules.values());
  }
  
  getResources() {
    return Array.from(this.resources.values());
  }
  
  async validateResourceAccess(req, res, next) {
    try {
      const user = req.user;
      if (!user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }
      
      // Extract resource and action from request
      const pathParts = req.path.split('/').filter(p => p);
      const resource = pathParts[0] || 'system';
      const action = this.mapHttpMethodToAction(req.method);
      
      const context = {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        sessionId: req.sessionId,
        sessionCreatedAt: req.session?.createdAt,
        mfaVerified: req.session?.mfaVerified
      };
      
      const accessResult = await this.checkAccess(user, resource, action, context);
      
      if (!accessResult.allowed) {
        return res.status(403).json({
          error: 'Access denied',
          reason: accessResult.reason
        });
      }
      
      // Add access info to request
      req.accessInfo = accessResult;
      next();
      
    } catch (error) {
      console.error('Access control error:', error);
      res.status(500).json({ error: 'Access control error' });
    }
  }
  
  mapHttpMethodToAction(method) {
    const mapping = {
      'GET': 'view',
      'POST': 'create',
      'PUT': 'update',
      'PATCH': 'update',
      'DELETE': 'delete'
    };
    return mapping[method] || 'view';
  }
}