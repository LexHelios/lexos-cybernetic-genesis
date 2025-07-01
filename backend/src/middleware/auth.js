import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { RateLimiterMemory } from 'rate-limiter-flexible';

// Role-based access control
export const ROLES = {
  ADMIN: 'admin',
  OPERATOR: 'operator',
  USER: 'user',
  AGENT: 'agent',
  GUEST: 'guest'
};

// Permission levels
export const PERMISSIONS = {
  // System permissions
  SYSTEM_ADMIN: 'system:admin',
  SYSTEM_CONFIG: 'system:config',
  SYSTEM_MONITOR: 'system:monitor',
  
  // User permissions
  USER_CREATE: 'user:create',
  USER_READ: 'user:read',
  USER_UPDATE: 'user:update',
  USER_DELETE: 'user:delete',
  
  // Agent permissions
  AGENT_CREATE: 'agent:create',
  AGENT_READ: 'agent:read',
  AGENT_UPDATE: 'agent:update',
  AGENT_DELETE: 'agent:delete',
  AGENT_EXECUTE: 'agent:execute',
  
  // Memory permissions
  MEMORY_READ_OWN: 'memory:read:own',
  MEMORY_READ_ALL: 'memory:read:all',
  MEMORY_WRITE_OWN: 'memory:write:own',
  MEMORY_WRITE_ALL: 'memory:write:all',
  MEMORY_DELETE_OWN: 'memory:delete:own',
  MEMORY_DELETE_ALL: 'memory:delete:all',
  
  // Analytics permissions
  ANALYTICS_READ: 'analytics:read',
  ANALYTICS_WRITE: 'analytics:write'
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.OPERATOR]: [
    PERMISSIONS.SYSTEM_MONITOR,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.AGENT_CREATE,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_UPDATE,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.MEMORY_READ_ALL,
    PERMISSIONS.MEMORY_WRITE_OWN,
    PERMISSIONS.ANALYTICS_READ
  ],
  [ROLES.USER]: [
    PERMISSIONS.USER_READ,
    PERMISSIONS.AGENT_READ,
    PERMISSIONS.AGENT_EXECUTE,
    PERMISSIONS.MEMORY_READ_OWN,
    PERMISSIONS.MEMORY_WRITE_OWN,
    PERMISSIONS.ANALYTICS_READ
  ],
  [ROLES.AGENT]: [
    PERMISSIONS.MEMORY_READ_OWN,
    PERMISSIONS.MEMORY_WRITE_OWN,
    PERMISSIONS.AGENT_READ
  ],
  [ROLES.GUEST]: [
    PERMISSIONS.AGENT_READ
  ]
};

// Rate limiter for auth attempts
const authRateLimiter = new RateLimiterMemory({
  keyPrefix: 'auth',
  points: 5, // Number of attempts
  duration: 900, // Per 15 minutes
  blockDuration: 900, // Block for 15 minutes
});

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_IN_PRODUCTION';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate JWT tokens
 */
export function generateTokens(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] || []
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'lexos-genesis',
    audience: 'lexos-api'
  });

  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    JWT_SECRET,
    {
      expiresIn: JWT_REFRESH_EXPIRES_IN,
      issuer: 'lexos-genesis'
    }
  );

  return { accessToken, refreshToken };
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: 'lexos-genesis',
      audience: 'lexos-api'
    });
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Hash password securely
 */
export async function hashPassword(password) {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify password
 */
export async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Authentication middleware
 */
export function authenticate(options = {}) {
  return async (req, res, next) => {
    try {
      // Extract token from header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      
      // Verify token
      const decoded = verifyToken(token);
      
      // Check if token type is correct
      if (decoded.type === 'refresh') {
        return res.status(401).json({ error: 'Invalid token type' });
      }
      
      // Attach user to request
      req.user = decoded;
      
      // Check if specific role is required
      if (options.role && req.user.role !== options.role && req.user.role !== ROLES.ADMIN) {
        return res.status(403).json({ error: 'Insufficient role privileges' });
      }
      
      // Check if specific permissions are required
      if (options.permissions) {
        const requiredPermissions = Array.isArray(options.permissions) 
          ? options.permissions 
          : [options.permissions];
          
        const hasPermission = requiredPermissions.every(permission => 
          req.user.permissions.includes(permission)
        );
        
        if (!hasPermission) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
      }
      
      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'Token expired' });
      }
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
}

/**
 * Rate limiting middleware for authentication
 */
export async function rateLimitAuth(req, res, next) {
  try {
    const key = req.ip;
    await authRateLimiter.consume(key);
    next();
  } catch (rejRes) {
    const secs = Math.round(rejRes.msBeforeNext / 1000) || 1;
    res.set('Retry-After', String(secs));
    res.status(429).json({
      error: 'Too many authentication attempts',
      retryAfter: secs
    });
  }
}

/**
 * API Key authentication for agents
 */
export function authenticateApiKey(options = {}) {
  return async (req, res, next) => {
    try {
      const apiKey = req.headers['x-api-key'] || req.query.apiKey;
      
      if (!apiKey) {
        return res.status(401).json({ error: 'No API key provided' });
      }
      
      // Validate API key from database
      const agent = await req.app.locals.database.validateApiKey(apiKey);
      
      if (!agent) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      // Check if agent is active
      if (agent.status !== 'active') {
        return res.status(403).json({ error: 'Agent is not active' });
      }
      
      // Attach agent to request
      req.agent = agent;
      req.user = {
        id: agent.id,
        username: agent.agent_id,
        role: ROLES.AGENT,
        permissions: ROLE_PERMISSIONS[ROLES.AGENT]
      };
      
      next();
    } catch (error) {
      console.error('API key authentication error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  };
}

/**
 * Check if user has permission
 */
export function hasPermission(user, permission) {
  if (!user || !user.permissions) return false;
  return user.permissions.includes(permission) || user.role === ROLES.ADMIN;
}

/**
 * Sanitize user object for response
 */
export function sanitizeUser(user) {
  const { password_hash, ...sanitized } = user;
  return sanitized;
}

export default {
  ROLES,
  PERMISSIONS,
  authenticate,
  authenticateApiKey,
  rateLimitAuth,
  generateTokens,
  verifyToken,
  hashPassword,
  verifyPassword,
  hasPermission,
  sanitizeUser
};