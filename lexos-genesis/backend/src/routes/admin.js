import express from 'express';
import databaseService from '../services/database.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// Mock user data for demo
const mockUsers = [
  {
    id: 1,
    username: 'vince.sharma',
    email: 'vince@lexos.tech',
    role: 'admin',
    isActive: true,
    rating: 5,
    permissions: {
      canChat: true,
      canViewDashboard: true,
      canManageAgents: true,
      canAccessAdmin: true
    },
    lastActive: new Date().toISOString()
  },
  {
    id: 2,
    username: 'john.doe',
    email: 'john@example.com',
    role: 'user',
    isActive: true,
    rating: 4,
    permissions: {
      canChat: true,
      canViewDashboard: true,
      canManageAgents: false,
      canAccessAdmin: false
    },
    lastActive: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 3,
    username: 'jane.smith',
    email: 'jane@example.com',
    role: 'user',
    isActive: false,
    rating: 3,
    permissions: {
      canChat: true,
      canViewDashboard: false,
      canManageAgents: false,
      canAccessAdmin: false
    },
    lastActive: new Date(Date.now() - 172800000).toISOString()
  }
];

// Get all users
router.get('/users', verifyToken, async (req, res) => {
  try {
    // In production, fetch from database
    res.json(mockUsers);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Update user permissions
router.patch('/users/:userId/permissions', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const permissions = req.body;

    // Find and update user
    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      Object.assign(user.permissions, permissions);
      
      await databaseService.logSystemEvent(
        'admin',
        'info',
        'AdminService',
        `Permissions updated for user ${user.username}`
      );

      res.json({ success: true, user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Failed to update permissions:', error);
    res.status(500).json({ error: 'Failed to update permissions' });
  }
});

// Update user rating
router.patch('/users/:userId/rating', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { rating } = req.body;

    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      user.rating = rating;
      
      await databaseService.logSystemEvent(
        'admin',
        'info',
        'AdminService',
        `Rating updated for user ${user.username}: ${rating} stars`
      );

      res.json({ success: true, user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Failed to update rating:', error);
    res.status(500).json({ error: 'Failed to update rating' });
  }
});

// Toggle user status
router.patch('/users/:userId/status', verifyToken, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { isActive } = req.body;

    const user = mockUsers.find(u => u.id === userId);
    if (user) {
      user.isActive = isActive;
      
      await databaseService.logSystemEvent(
        'admin',
        'info',
        'AdminService',
        `User ${user.username} ${isActive ? 'activated' : 'deactivated'}`
      );

      res.json({ success: true, user });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    console.error('Failed to update status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;