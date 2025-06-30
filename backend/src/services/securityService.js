import { EventEmitter } from 'events';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class SecurityService extends EventEmitter {
  constructor(authService, database) {
    super();
    this.authService = authService;
    this.database = database;
    
    // Security configuration
    this.config = {
      maxLoginAttempts: 5,
      lockoutDuration: 15 * 60 * 1000, // 15 minutes
      sessionTimeout: 30 * 60 * 1000, // 30 minutes
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      passwordRequireNumbers: true,
      passwordRequireUppercase: true,
      enableMFA: true,
      enableIPWhitelisting: false,
      enableRateLimit: true,
      rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 100
      }
    };
    
    // Security state
    this.loginAttempts = new Map();
    this.blockedIPs = new Map();
    this.securityLogs = [];
    this.threatMetrics = {
      blockedAttempts: 0,
      suspiciousActivities: 0,
      securityIncidents: 0,
      totalScans: 0
    };
    
    // Security policies
    this.policies = new Map([
      ['password_policy', {
        id: 'password_policy',
        name: 'Password Policy',
        enabled: true,
        rules: {
          minLength: 8,
          requireSpecialChars: true,
          requireNumbers: true,
          requireUppercase: true,
          maxAge: 90, // days
          preventReuse: 5 // last 5 passwords
        }
      }],
      ['access_control', {
        id: 'access_control',
        name: 'Access Control Policy',
        enabled: true,
        rules: {
          enforceRBAC: true,
          requireMFA: ['admin', 'operator'],
          sessionTimeout: 30, // minutes
          concurrentSessions: 3
        }
      }],
      ['network_security', {
        id: 'network_security',
        name: 'Network Security Policy',
        enabled: true,
        rules: {
          enableFirewall: true,
          allowedPorts: [3000, 3001, 11434],
          enableDDoSProtection: true,
          enableIPWhitelisting: false
        }
      }]
    ]);
    
    // Access control lists
    this.accessControlLists = new Map();
    this.initializeACLs();
    
    // Start security monitoring
    this.startSecurityMonitoring();
  }
  
  initializeACLs() {
    // Define resource-based access controls
    this.accessControlLists.set('system', {
      admin: ['read', 'write', 'execute', 'delete'],
      operator: ['read', 'execute'],
      user: ['read']
    });
    
    this.accessControlLists.set('agents', {
      admin: ['create', 'read', 'update', 'delete', 'execute'],
      operator: ['read', 'execute'],
      user: ['read']
    });
    
    this.accessControlLists.set('models', {
      admin: ['create', 'read', 'update', 'delete', 'pull'],
      operator: ['read', 'pull'],
      user: ['read']
    });
    
    this.accessControlLists.set('security', {
      admin: ['read', 'write', 'configure'],
      operator: ['read'],
      user: []
    });
  }
  
  startSecurityMonitoring() {
    // Monitor for security events
    setInterval(() => {
      this.performSecurityScan();
      this.cleanupExpiredData();
    }, 60000); // Run every minute
  }
  
  async performSecurityScan() {
    this.threatMetrics.totalScans++;
    
    // Check for suspicious activities
    const suspiciousActivities = this.detectSuspiciousActivities();
    if (suspiciousActivities.length > 0) {
      this.threatMetrics.suspiciousActivities += suspiciousActivities.length;
      suspiciousActivities.forEach(activity => {
        this.logSecurityEvent('suspicious_activity', activity);
      });
    }
    
    // Check system integrity
    const integrityCheck = await this.checkSystemIntegrity();
    if (!integrityCheck.passed) {
      this.logSecurityEvent('integrity_violation', integrityCheck);
      this.threatMetrics.securityIncidents++;
    }
    
    this.emit('security_scan_complete', {
      timestamp: Date.now(),
      metrics: this.threatMetrics,
      threats: suspiciousActivities
    });
  }
  
  detectSuspiciousActivities() {
    const suspicious = [];
    const now = Date.now();
    
    // Check for brute force attempts
    for (const [ip, attempts] of this.loginAttempts.entries()) {
      if (attempts.count > this.config.maxLoginAttempts) {
        suspicious.push({
          type: 'brute_force',
          ip: ip,
          attempts: attempts.count,
          timestamp: now
        });
      }
    }
    
    // Check for unusual access patterns
    const recentLogs = this.securityLogs.filter(log => 
      now - log.timestamp < 300000 // Last 5 minutes
    );
    
    const accessByIP = {};
    recentLogs.forEach(log => {
      if (log.type === 'access_attempt') {
        accessByIP[log.ip] = (accessByIP[log.ip] || 0) + 1;
      }
    });
    
    Object.entries(accessByIP).forEach(([ip, count]) => {
      if (count > 50) { // More than 50 requests in 5 minutes
        suspicious.push({
          type: 'unusual_access_pattern',
          ip: ip,
          requests: count,
          timestamp: now
        });
      }
    });
    
    return suspicious;
  }
  
  async checkSystemIntegrity() {
    const checks = {
      passed: true,
      timestamp: Date.now(),
      violations: []
    };
    
    // Check critical files integrity
    // In a real system, this would verify file hashes
    
    // Check for unauthorized processes
    // In a real system, this would check running processes
    
    // Check for unusual network connections
    // In a real system, this would monitor network traffic
    
    return checks;
  }
  
  async validateLogin(username, password, ip, userAgent) {
    const attemptId = `${username}:${ip}`;
    
    // Check if IP is blocked
    if (this.isIPBlocked(ip)) {
      this.logSecurityEvent('blocked_login_attempt', {
        username,
        ip,
        reason: 'blocked_ip'
      });
      this.threatMetrics.blockedAttempts++;
      throw new Error('Access denied');
    }
    
    // Check login attempts
    const attempts = this.loginAttempts.get(attemptId) || { count: 0, lastAttempt: 0 };
    
    if (attempts.count >= this.config.maxLoginAttempts) {
      const lockoutRemaining = (attempts.lastAttempt + this.config.lockoutDuration) - Date.now();
      if (lockoutRemaining > 0) {
        this.logSecurityEvent('account_locked', {
          username,
          ip,
          lockoutRemaining
        });
        throw new Error(`Account locked. Try again in ${Math.ceil(lockoutRemaining / 60000)} minutes`);
      } else {
        // Reset attempts after lockout period
        attempts.count = 0;
      }
    }
    
    // Validate password complexity
    if (!this.validatePasswordComplexity(password)) {
      attempts.count++;
      attempts.lastAttempt = Date.now();
      this.loginAttempts.set(attemptId, attempts);
      throw new Error('Invalid password complexity');
    }
    
    // Attempt login through auth service
    const loginResult = await this.authService.login(username, password);
    
    if (loginResult.success) {
      // Reset login attempts on success
      this.loginAttempts.delete(attemptId);
      
      // Log successful login
      this.logSecurityEvent('successful_login', {
        username,
        ip,
        userAgent,
        userId: loginResult.user.user_id
      });
      
      // Update session with security info
      loginResult.securityContext = {
        ip,
        userAgent,
        loginTime: Date.now(),
        mfaEnabled: this.config.enableMFA && 
                   this.policies.get('access_control').rules.requireMFA.includes(loginResult.user.role)
      };
      
      return loginResult;
    } else {
      // Increment failed attempts
      attempts.count++;
      attempts.lastAttempt = Date.now();
      this.loginAttempts.set(attemptId, attempts);
      
      this.logSecurityEvent('failed_login', {
        username,
        ip,
        userAgent,
        attemptCount: attempts.count
      });
      
      throw new Error('Invalid credentials');
    }
  }
  
  validatePasswordComplexity(password) {
    const policy = this.policies.get('password_policy');
    if (!policy.enabled) return true;
    
    const rules = policy.rules;
    
    if (password.length < rules.minLength) return false;
    if (rules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
    if (rules.requireNumbers && !/\d/.test(password)) return false;
    if (rules.requireUppercase && !/[A-Z]/.test(password)) return false;
    
    return true;
  }
  
  isIPBlocked(ip) {
    const blockInfo = this.blockedIPs.get(ip);
    if (!blockInfo) return false;
    
    if (blockInfo.permanent) return true;
    
    const now = Date.now();
    if (blockInfo.until > now) return true;
    
    // Remove expired block
    this.blockedIPs.delete(ip);
    return false;
  }
  
  blockIP(ip, duration = null, reason = 'suspicious_activity') {
    const blockInfo = {
      ip,
      reason,
      timestamp: Date.now(),
      permanent: duration === null,
      until: duration ? Date.now() + duration : null
    };
    
    this.blockedIPs.set(ip, blockInfo);
    this.logSecurityEvent('ip_blocked', blockInfo);
    
    return blockInfo;
  }
  
  unblockIP(ip) {
    if (this.blockedIPs.delete(ip)) {
      this.logSecurityEvent('ip_unblocked', { ip, timestamp: Date.now() });
      return true;
    }
    return false;
  }
  
  async checkPermission(user, resource, action) {
    if (!user || !resource || !action) return false;
    
    // Admin has all permissions
    if (user.role === 'admin') return true;
    
    // Check ACL
    const acl = this.accessControlLists.get(resource);
    if (!acl) return false;
    
    const rolePermissions = acl[user.role] || [];
    return rolePermissions.includes(action) || rolePermissions.includes('all');
  }
  
  async generateMFASecret(userId) {
    const secret = crypto.randomBytes(32).toString('base64');
    const qrCode = await this.generateQRCode(userId, secret);
    
    return {
      secret,
      qrCode,
      backupCodes: this.generateBackupCodes()
    };
  }
  
  generateBackupCodes(count = 10) {
    const codes = [];
    for (let i = 0; i < count; i++) {
      codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return codes;
  }
  
  async generateQRCode(userId, secret) {
    // In a real implementation, this would generate a QR code
    // for authenticator apps
    return `otpauth://totp/LexosGenesis:${userId}?secret=${secret}&issuer=LexosGenesis`;
  }
  
  async verifyMFAToken(userId, token, secret) {
    // TODO: Implement proper TOTP verification
    // This is a critical security feature that must be implemented before production
    // For development only - NEVER use in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MFA verification not implemented for production');
    }
    console.warn('WARNING: Using mock MFA validation - implement proper TOTP before production');
    return token === '123456'; // Development only
  }
  
  logSecurityEvent(type, data) {
    const event = {
      id: uuidv4(),
      type,
      timestamp: Date.now(),
      ...data
    };
    
    this.securityLogs.push(event);
    
    // Keep only last 10000 events
    if (this.securityLogs.length > 10000) {
      this.securityLogs = this.securityLogs.slice(-10000);
    }
    
    // Emit event for real-time monitoring
    this.emit('security_event', event);
    
    // Log critical events
    if (['security_incident', 'integrity_violation', 'brute_force'].includes(type)) {
      console.error('[SECURITY ALERT]', type, data);
    }
    
    return event;
  }
  
  getSecurityLogs(filters = {}) {
    let logs = [...this.securityLogs];
    
    if (filters.type) {
      logs = logs.filter(log => log.type === filters.type);
    }
    
    if (filters.startTime) {
      logs = logs.filter(log => log.timestamp >= filters.startTime);
    }
    
    if (filters.endTime) {
      logs = logs.filter(log => log.timestamp <= filters.endTime);
    }
    
    if (filters.ip) {
      logs = logs.filter(log => log.ip === filters.ip);
    }
    
    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp - a.timestamp);
    
    if (filters.limit) {
      logs = logs.slice(0, filters.limit);
    }
    
    return logs;
  }
  
  getSecurityMetrics() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);
    
    const logs24h = this.securityLogs.filter(log => log.timestamp >= last24h);
    const logs7d = this.securityLogs.filter(log => log.timestamp >= last7d);
    
    const metrics = {
      overall: {
        blockedAttempts: this.threatMetrics.blockedAttempts,
        suspiciousActivities: this.threatMetrics.suspiciousActivities,
        securityIncidents: this.threatMetrics.securityIncidents,
        totalScans: this.threatMetrics.totalScans,
        blockedIPs: this.blockedIPs.size,
        activeSessions: this.authService.sessions.size
      },
      last24Hours: {
        totalEvents: logs24h.length,
        failedLogins: logs24h.filter(log => log.type === 'failed_login').length,
        successfulLogins: logs24h.filter(log => log.type === 'successful_login').length,
        blockedAttempts: logs24h.filter(log => log.type === 'blocked_login_attempt').length,
        suspiciousActivities: logs24h.filter(log => log.type === 'suspicious_activity').length
      },
      last7Days: {
        totalEvents: logs7d.length,
        failedLogins: logs7d.filter(log => log.type === 'failed_login').length,
        successfulLogins: logs7d.filter(log => log.type === 'successful_login').length,
        blockedAttempts: logs7d.filter(log => log.type === 'blocked_login_attempt').length,
        suspiciousActivities: logs7d.filter(log => log.type === 'suspicious_activity').length
      },
      threatLevel: this.calculateThreatLevel(),
      securityScore: this.calculateSecurityScore()
    };
    
    return metrics;
  }
  
  calculateThreatLevel() {
    const recentEvents = this.securityLogs.filter(log => 
      Date.now() - log.timestamp < 3600000 // Last hour
    );
    
    const suspiciousCount = recentEvents.filter(log => 
      ['suspicious_activity', 'brute_force', 'integrity_violation'].includes(log.type)
    ).length;
    
    if (suspiciousCount > 10) return 'CRITICAL';
    if (suspiciousCount > 5) return 'HIGH';
    if (suspiciousCount > 2) return 'MEDIUM';
    if (suspiciousCount > 0) return 'LOW';
    return 'MINIMAL';
  }
  
  calculateSecurityScore() {
    let score = 100;
    
    // Deduct points for security issues
    const recentEvents = this.securityLogs.filter(log => 
      Date.now() - log.timestamp < 86400000 // Last 24 hours
    );
    
    // Failed logins
    const failedLogins = recentEvents.filter(log => log.type === 'failed_login').length;
    score -= Math.min(failedLogins * 0.5, 10);
    
    // Suspicious activities
    const suspicious = recentEvents.filter(log => log.type === 'suspicious_activity').length;
    score -= Math.min(suspicious * 2, 20);
    
    // Security incidents
    const incidents = recentEvents.filter(log => log.type === 'security_incident').length;
    score -= Math.min(incidents * 5, 30);
    
    // Blocked IPs (indicates active threats)
    score -= Math.min(this.blockedIPs.size * 1, 10);
    
    // Add points for security features
    if (this.config.enableMFA) score += 5;
    if (this.config.enableRateLimit) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }
  
  updateSecurityPolicy(policyId, updates) {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error('Policy not found');
    }
    
    // Update policy
    Object.assign(policy, updates);
    this.policies.set(policyId, policy);
    
    // Log policy change
    this.logSecurityEvent('policy_updated', {
      policyId,
      updates,
      timestamp: Date.now()
    });
    
    return policy;
  }
  
  cleanupExpiredData() {
    const now = Date.now();
    
    // Clean up old login attempts
    for (const [key, attempts] of this.loginAttempts.entries()) {
      if (now - attempts.lastAttempt > this.config.lockoutDuration) {
        this.loginAttempts.delete(key);
      }
    }
    
    // Clean up expired IP blocks
    for (const [ip, blockInfo] of this.blockedIPs.entries()) {
      if (!blockInfo.permanent && blockInfo.until < now) {
        this.blockedIPs.delete(ip);
      }
    }
    
    // Clean up old security logs (keep last 7 days)
    const cutoff = now - (7 * 24 * 60 * 60 * 1000);
    this.securityLogs = this.securityLogs.filter(log => log.timestamp >= cutoff);
  }
  
  async exportSecurityReport() {
    const metrics = this.getSecurityMetrics();
    const policies = Array.from(this.policies.values());
    const recentLogs = this.getSecurityLogs({ limit: 1000 });
    
    return {
      generatedAt: Date.now(),
      systemInfo: {
        name: 'Lexos Genesis Security System',
        version: '1.0.0'
      },
      metrics,
      policies,
      recentEvents: recentLogs,
      recommendations: this.generateSecurityRecommendations()
    };
  }
  
  generateSecurityRecommendations() {
    const recommendations = [];
    const metrics = this.getSecurityMetrics();
    
    if (metrics.last24Hours.failedLogins > 100) {
      recommendations.push({
        severity: 'high',
        category: 'authentication',
        message: 'High number of failed login attempts detected',
        action: 'Review login logs and consider implementing stricter rate limiting'
      });
    }
    
    if (!this.config.enableMFA) {
      recommendations.push({
        severity: 'medium',
        category: 'authentication',
        message: 'Multi-factor authentication is disabled',
        action: 'Enable MFA for enhanced security, especially for admin accounts'
      });
    }
    
    if (this.blockedIPs.size > 10) {
      recommendations.push({
        severity: 'high',
        category: 'network',
        message: 'Multiple IPs have been blocked',
        action: 'Investigate the source of attacks and consider implementing IP whitelisting'
      });
    }
    
    return recommendations;
  }
}