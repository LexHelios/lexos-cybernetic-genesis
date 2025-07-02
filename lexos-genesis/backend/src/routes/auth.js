import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import databaseService from '../services/database.js';

const router = express.Router();

// Mock JWT secret (in production, use environment variable)
const JWT_SECRET = process.env.JWT_SECRET || 'lexos-secret-key';

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // For demo purposes, accept any username/password
    // In production, validate against database
    if (username && password) {
      // Create JWT token
      const token = jwt.sign(
        { username, role: username === 'admin' ? 'admin' : 'user' },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      // Log the login
      await databaseService.logSystemEvent(
        'auth',
        'info',
        'AuthService',
        `User ${username} logged in`
      );

      res.json({
        success: true,
        token,
        user: {
          username,
          role: username === 'admin' ? 'admin' : 'user'
        }
      });
    } else {
      res.status(400).json({ error: 'Username and password required' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify token middleware
export const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Logout endpoint (optional - client can just remove token)
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;