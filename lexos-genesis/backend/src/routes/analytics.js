import express from 'express';
import { analyticsService } from '../services/analyticsService.js';
import { AuthService } from '../services/authService.js';

const authService = new AuthService();
const authenticate = authService.authMiddleware();

const router = express.Router();

// Middleware to check analytics permissions
const checkAnalyticsAccess = (req, res, next) => {
  // For now, all authenticated users can view analytics
  // In production, you might want role-based access
  next();
};

// Track custom metric
router.post('/metrics', authenticate, async (req, res) => {
  try {
    const { category, metricName, value, metadata } = req.body;
    
    if (!category || !metricName || value === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: category, metricName, value' 
      });
    }

    analyticsService.trackMetric(category, metricName, value, metadata);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking metric:', error);
    res.status(500).json({ error: 'Failed to track metric' });
  }
});

// Track custom event
router.post('/events', authenticate, async (req, res) => {
  try {
    const { eventType, eventName, properties } = req.body;
    
    if (!eventType || !eventName) {
      return res.status(400).json({ 
        error: 'Missing required fields: eventType, eventName' 
      });
    }

    analyticsService.trackEvent(eventType, eventName, {
      ...properties,
      userId: req.user.id
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking event:', error);
    res.status(500).json({ error: 'Failed to track event' });
  }
});

// Get metrics data
router.get('/metrics/:category/:metricName', authenticate, checkAnalyticsAccess, async (req, res) => {
  try {
    const { category, metricName } = req.params;
    const { startTime, endTime, interval = 'raw' } = req.query;
    
    const start = startTime ? parseInt(startTime) : Date.now() - 3600000; // Default 1 hour
    const end = endTime ? parseInt(endTime) : Date.now();
    
    const metrics = await analyticsService.getMetrics(
      category, 
      metricName, 
      start, 
      end, 
      interval
    );
    
    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Get events data
router.get('/events/:eventType', authenticate, checkAnalyticsAccess, async (req, res) => {
  try {
    const { eventType } = req.params;
    const { startTime, endTime, limit = 1000 } = req.query;
    
    const start = startTime ? parseInt(startTime) : Date.now() - 3600000;
    const end = endTime ? parseInt(endTime) : Date.now();
    
    const events = await analyticsService.getEvents(
      eventType,
      start,
      end,
      parseInt(limit)
    );
    
    res.json({ events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get agent performance stats
router.get('/agents/:agentId/performance', authenticate, checkAnalyticsAccess, async (req, res) => {
  try {
    const { agentId } = req.params;
    const { startTime, endTime } = req.query;
    
    const start = startTime ? parseInt(startTime) : Date.now() - 86400000; // Default 24 hours
    const end = endTime ? parseInt(endTime) : Date.now();
    
    const stats = await analyticsService.getAgentPerformanceStats(
      agentId,
      start,
      end
    );
    
    res.json({ stats });
  } catch (error) {
    console.error('Error fetching agent performance:', error);
    res.status(500).json({ error: 'Failed to fetch agent performance' });
  }
});

// Get task analytics
router.get('/tasks', authenticate, checkAnalyticsAccess, async (req, res) => {
  try {
    const { startTime, endTime } = req.query;
    
    const start = startTime ? parseInt(startTime) : Date.now() - 86400000;
    const end = endTime ? parseInt(endTime) : Date.now();
    
    const analytics = await analyticsService.getTaskAnalytics(start, end);
    
    res.json({ analytics });
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    res.status(500).json({ error: 'Failed to fetch task analytics' });
  }
});

// Get system health history
router.get('/system/health', authenticate, checkAnalyticsAccess, async (req, res) => {
  try {
    const { startTime, endTime, limit = 1000 } = req.query;
    
    const start = startTime ? parseInt(startTime) : Date.now() - 3600000;
    const end = endTime ? parseInt(endTime) : Date.now();
    
    const health = await analyticsService.getSystemHealthHistory(
      start,
      end,
      parseInt(limit)
    );
    
    res.json({ health });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({ error: 'Failed to fetch system health' });
  }
});

// Get dashboard stats (aggregated data for dashboard)
router.get('/dashboard', authenticate, checkAnalyticsAccess, async (req, res) => {
  try {
    const stats = await analyticsService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Real-time metrics stream (Server-Sent Events)
router.get('/stream', authenticate, checkAnalyticsAccess, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  // Send initial data
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  // Listen to real-time events
  const onMetric = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'metric', ...data })}\n\n`);
  };

  const onEvent = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'event', ...data })}\n\n`);
  };

  const onAgentPerformance = (data) => {
    res.write(`data: ${JSON.stringify({ type: 'agentPerformance', ...data })}\n\n`);
  };

  analyticsService.on('metric', onMetric);
  analyticsService.on('event', onEvent);
  analyticsService.on('agentPerformance', onAgentPerformance);

  // Cleanup on disconnect
  req.on('close', () => {
    analyticsService.off('metric', onMetric);
    analyticsService.off('event', onEvent);
    analyticsService.off('agentPerformance', onAgentPerformance);
  });
});

export default router;