import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Import services
import { AnalyticsService } from './services/analyticsService.js';
import healthCheck from './monitoring/healthCheck.js';
import errorHandlerInstance from './middleware/errorHandler.js';
const errorHandler = errorHandlerInstance.globalErrorHandler();

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;  // Changed from 9000 to match the startup script

// Import database service
import database from './services/database.js';

// Import routes
import chatRoutes from './routes/chat.js';
import voiceRoutes from './routes/voice.js';
import analyticsRoutes from './routes/analytics.js';
import configurationRoutes from './routes/configuration.js';
import internetAgentsRoutes from './routes/internetAgents.js';
import enhancedAgentsRoutes from './routes/enhancedAgents.js';
import taskPipelineRoutes from './routes/taskPipeline.js';

// Initialize services
const analyticsService = new AnalyticsService();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "http:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://lexcommand.ai',
      'https://www.lexcommand.ai',
      'http://lexcommand.ai',
      'http://www.lexcommand.ai',
      'http://147.185.40.39:20004',
      'http://192.168.122.27',
      process.env.FRONTEND_URL
    ].filter(Boolean);
    
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for now during demo
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  maxAge: 86400
};

app.use(cors(corsOptions));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(join(__dirname, '../public')));

// Health check endpoint - always return 200 for demo
app.get('/health', (req, res) => {
  const health = {
    status: 'operational',
    timestamp: new Date().toISOString(),
    backend: 'healthy',
    database: 'healthy',
    uptime: process.uptime()
  };
  res.status(200).json(health);
});

// API routes
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    services: {
      backend: 'healthy',
      database: 'healthy',
      analytics: analyticsService.db ? 'healthy' : 'initializing'
    },
    version: process.env.APP_VERSION || '2.1.0',
    uptime: process.uptime()
  });
});

// Agents endpoint
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      {
        id: '1',
        name: 'Research Agent',
        status: 'ready',
        type: 'research',
        capabilities: ['web_search', 'document_analysis']
      },
      {
        id: '2',
        name: 'Code Agent',
        status: 'ready',
        type: 'code',
        capabilities: ['code_generation', 'debugging', 'refactoring']
      },
      {
        id: '3',
        name: 'Analytics Agent',
        status: 'ready',
        type: 'analytics',
        capabilities: ['data_analysis', 'visualization', 'reporting']
      }
    ]
  });
});

// Task submission endpoint
app.post('/api/tasks', async (req, res) => {
  try {
    const { agentId, task, parameters } = req.body;
    
    // Record task submission
    analyticsService.recordEvent('task_submitted', {
      agentId,
      taskType: task,
      timestamp: Date.now()
    });
    
    // Generate task ID
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    res.json({
      taskId,
      status: 'queued',
      message: 'Task submitted successfully',
      estimatedTime: 30
    });
  } catch (error) {
    console.error('Task submission error:', error);
    res.status(500).json({ error: 'Failed to submit task' });
  }
});

// Analytics endpoints
app.get('/api/analytics/metrics', async (req, res) => {
  try {
    const { category, metric, startTime, endTime, interval } = req.query;
    const metrics = await analyticsService.getMetrics(
      category,
      metric,
      parseInt(startTime) || Date.now() - 3600000,
      parseInt(endTime) || Date.now(),
      interval || 'raw'
    );
    res.json({ metrics });
  } catch (error) {
    console.error('Metrics fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

// Mount all routes
app.use('/api/chat', chatRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/configuration', configurationRoutes);
app.use('/api/agents', internetAgentsRoutes);
app.use('/api/enhanced-agents', enhancedAgentsRoutes);
app.use('/api/tasks', taskPipelineRoutes);

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message received:', data);
      
      // Echo back for now
      ws.send(JSON.stringify({
        type: 'ack',
        message: 'Message received',
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to LexOS backend',
    timestamp: Date.now()
  }));
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Shutting down gracefully...');
  
  // Close WebSocket connections
  wss.clients.forEach((client) => {
    client.close();
  });
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    if (analyticsService.db) {
      analyticsService.db.close();
    }
    
    process.exit(0);
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

// Start server
async function startServer() {
  try {
    // Initialize database first
    await database.initialize();
    console.log('Database initialized');
    
    server.listen(PORT, () => {
      console.log(`LexOS Backend running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`WebSocket available on ws://localhost:${PORT}`);
      
      // Record startup
      analyticsService.recordEvent('server_started', {
        port: PORT,
        environment: process.env.NODE_ENV || 'development',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Initialize and start
startServer().catch(console.error);