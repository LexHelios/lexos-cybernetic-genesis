import express from 'express';
import os from 'os';

const router = express.Router();

// Get system stats
router.get('/', async (req, res) => {
  try {
    // Calculate system load percentage
    const cpus = os.cpus();
    const avgLoad = os.loadavg()[0];
    const systemLoad = Math.round((avgLoad / cpus.length) * 100);

    res.json({
      activeUsers: 3,
      totalChats: 47,
      activeAgents: 16,
      systemLoad: Math.min(systemLoad, 100)
    });
  } catch (error) {
    console.error('Failed to fetch stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;