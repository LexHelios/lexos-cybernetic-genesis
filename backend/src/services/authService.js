import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  constructor() {
    this.JWT_SECRET = process.env.JWT_SECRET || 'lexos-genesis-secret-key-change-in-production';
    this.JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';
    this.users = new Map(); // In-memory user storage for demo
    this.sessions = new Map();
    
    // Initialize with default admin user
    this.initializeDefaultUsers();
  }

  async initializeDefaultUsers() {
    // Create default admin user
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    this.users.set('admin', {
      user_id: 'user-admin-001',
      username: 'admin',
      password_hash: adminPasswordHash,
      role: 'admin',
      permissions: ['all'],
      created_at: Date.now(),
      last_login: null,
      profile: {
        display_name: 'System Administrator',
        email: 'admin@lexos.ai',
        avatar_url: null
      }
    });

    // Create default operator user
    const operatorPasswordHash = await bcrypt.hash('operator123', 10);
    this.users.set('operator', {
      user_id: 'user-operator-001',
      username: 'operator',
      password_hash: operatorPasswordHash,
      role: 'operator',
      permissions: ['read', 'execute', 'monitor'],
      created_at: Date.now(),
      last_login: null,
      profile: {
        display_name: 'System Operator',
        email: 'operator@lexos.ai',
        avatar_url: null
      }
    });

    console.log('Default users initialized');
  }

  async login(username, password) {
    try {
      const user = this.users.get(username);
      
      if (!user) {
        throw new Error('Invalid username or password');
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        throw new Error('Invalid username or password');
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          user_id: user.user_id,
          username: user.username,
          role: user.role,
          permissions: user.permissions
        },
        this.JWT_SECRET,
        { expiresIn: this.JWT_EXPIRY }
      );

      // Update last login
      user.last_login = Date.now();

      // Create session
      const sessionId = `session-${uuidv4()}`;
      this.sessions.set(sessionId, {
        session_id: sessionId,
        user_id: user.user_id,
        token: token,
        created_at: Date.now(),
        expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        ip_address: null,
        user_agent: null
      });

      // Return user data without sensitive info
      const userData = {
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        profile: user.profile,
        last_login: user.last_login
      };

      return {
        success: true,
        token: token,
        user: userData,
        session_id: sessionId
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async logout(token) {
    try {
      // Find and remove session
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.token === token) {
          this.sessions.delete(sessionId);
          return { success: true, message: 'Logged out successfully' };
        }
      }
      
      return { success: false, error: 'Session not found' };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET);
      
      // Check if session exists
      let sessionExists = false;
      for (const session of this.sessions.values()) {
        if (session.token === token && session.expires_at > Date.now()) {
          sessionExists = true;
          break;
        }
      }

      if (!sessionExists) {
        throw new Error('Session expired or invalid');
      }

      return {
        success: true,
        user: decoded
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async createUser(userData) {
    try {
      const { username, password, role, permissions, profile } = userData;

      if (this.users.has(username)) {
        throw new Error('Username already exists');
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userId = `user-${uuidv4()}`;

      const newUser = {
        user_id: userId,
        username: username,
        password_hash: passwordHash,
        role: role || 'user',
        permissions: permissions || ['read'],
        created_at: Date.now(),
        last_login: null,
        profile: profile || {
          display_name: username,
          email: null,
          avatar_url: null
        }
      };

      this.users.set(username, newUser);

      return {
        success: true,
        user: {
          user_id: newUser.user_id,
          username: newUser.username,
          role: newUser.role,
          permissions: newUser.permissions,
          profile: newUser.profile
        }
      };
    } catch (error) {
      console.error('Create user error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateUser(userId, updates) {
    try {
      let userFound = null;
      let username = null;

      // Find user by ID
      for (const [uname, user] of this.users.entries()) {
        if (user.user_id === userId) {
          userFound = user;
          username = uname;
          break;
        }
      }

      if (!userFound) {
        throw new Error('User not found');
      }

      // Update allowed fields
      if (updates.role) userFound.role = updates.role;
      if (updates.permissions) userFound.permissions = updates.permissions;
      if (updates.profile) {
        userFound.profile = { ...userFound.profile, ...updates.profile };
      }

      // Update password if provided
      if (updates.password) {
        userFound.password_hash = await bcrypt.hash(updates.password, 10);
      }

      return {
        success: true,
        user: {
          user_id: userFound.user_id,
          username: userFound.username,
          role: userFound.role,
          permissions: userFound.permissions,
          profile: userFound.profile
        }
      };
    } catch (error) {
      console.error('Update user error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteUser(userId) {
    try {
      let username = null;

      // Find user by ID
      for (const [uname, user] of this.users.entries()) {
        if (user.user_id === userId) {
          username = uname;
          break;
        }
      }

      if (!username) {
        throw new Error('User not found');
      }

      // Don't allow deletion of admin user
      if (username === 'admin') {
        throw new Error('Cannot delete admin user');
      }

      this.users.delete(username);

      // Remove all sessions for this user
      for (const [sessionId, session] of this.sessions.entries()) {
        if (session.user_id === userId) {
          this.sessions.delete(sessionId);
        }
      }

      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      console.error('Delete user error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getUsers() {
    const users = [];
    
    for (const user of this.users.values()) {
      users.push({
        user_id: user.user_id,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        profile: user.profile,
        created_at: user.created_at,
        last_login: user.last_login
      });
    }

    return {
      success: true,
      users: users,
      total: users.length
    };
  }

  async getSessions() {
    const activeSessions = [];
    const now = Date.now();

    for (const session of this.sessions.values()) {
      if (session.expires_at > now) {
        // Find user info
        let userInfo = null;
        for (const user of this.users.values()) {
          if (user.user_id === session.user_id) {
            userInfo = {
              username: user.username,
              role: user.role
            };
            break;
          }
        }

        activeSessions.push({
          session_id: session.session_id,
          user_id: session.user_id,
          user_info: userInfo,
          created_at: session.created_at,
          expires_at: session.expires_at,
          ip_address: session.ip_address,
          user_agent: session.user_agent
        });
      }
    }

    return {
      success: true,
      sessions: activeSessions,
      total: activeSessions.length
    };
  }

  // Middleware to verify authentication
  authMiddleware() {
    return async (req, res, next) => {
      try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.substring(7);
        const verification = await this.verifyToken(token);

        if (!verification.success) {
          return res.status(401).json({ error: verification.error });
        }

        req.user = verification.user;
        next();
      } catch (error) {
        res.status(401).json({ error: 'Authentication failed' });
      }
    };
  }

  // Middleware to check permissions
  requirePermission(permission) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.permissions.includes('all') || req.user.permissions.includes(permission)) {
        next();
      } else {
        res.status(403).json({ error: 'Insufficient permissions' });
      }
    };
  }

  // Middleware to check role
  requireRole(role) {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      if (req.user.role === 'admin' || req.user.role === role) {
        next();
      } else {
        res.status(403).json({ error: 'Insufficient role privileges' });
      }
    };
  }
}