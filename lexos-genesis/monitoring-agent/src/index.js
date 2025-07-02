#!/usr/bin/env node

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import custom modules
const Logger = require('./utils/logger');
const ConfigManager = require('./utils/configManager');
const MonitoringCore = require('./core/monitoringCore');
const DashboardRouter = require('./routes/dashboard');
const ApiRouter = require('./routes/api');
const AuthMiddleware = require('./middleware/auth');

// Initialize logger
const logger = new Logger();

// Initialize configuration
const config = new ConfigManager();

// Create Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Apply middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files for dashboard
app.use('/public', express.static(path.join(__dirname, '../public')));

// Store config in app locals for middleware access
app.locals.config = config;

// Apply authentication if enabled
if (config.get('agent.authentication.enabled')) {
  app.use(AuthMiddleware);
}

// Initialize monitoring core
const monitoringCore = new MonitoringCore(config, logger, io);

// Routes
app.use('/api', ApiRouter(monitoringCore));
app.use('/dashboard', DashboardRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: require('../package.json').version
  });
});

// Root redirect to dashboard
app.get('/', (req, res) => {
  res.redirect('/dashboard');
});

// WebSocket connections
io.on('connection', (socket) => {
  logger.info('New WebSocket connection established');
  
  // Send initial status
  socket.emit('status', monitoringCore.getStatus());
  
  // Subscribe to monitoring events
  monitoringCore.on('statusUpdate', (data) => {
    socket.emit('statusUpdate', data);
  });
  
  monitoringCore.on('alert', (alert) => {
    socket.emit('alert', alert);
  });
  
  monitoringCore.on('metrics', (metrics) => {
    socket.emit('metrics', metrics);
  });
  
  socket.on('disconnect', () => {
    logger.info('WebSocket connection closed');
  });
  
  // Handle control commands from dashboard
  socket.on('restartService', async (serviceName) => {
    try {
      const result = await monitoringCore.restartService(serviceName);
      socket.emit('commandResult', { success: true, result });
    } catch (error) {
      socket.emit('commandResult', { success: false, error: error.message });
    }
  });
  
  socket.on('runRecovery', async (action) => {
    try {
      const result = await monitoringCore.runRecoveryAction(action);
      socket.emit('commandResult', { success: true, result });
    } catch (error) {
      socket.emit('commandResult', { success: false, error: error.message });
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Express error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  logger.info('Shutdown signal received, cleaning up...');
  
  try {
    await monitoringCore.stop();
    server.close(() => {
      logger.info('Server closed');
      process.exit(0);
    });
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

// Start server
const PORT = config.get('agent.port') || 4000;
const HOST = config.get('agent.host') || '0.0.0.0';

server.listen(PORT, HOST, () => {
  logger.info(`LexOS Monitoring Agent started on ${HOST}:${PORT}`);
  logger.info(`Dashboard available at http://${HOST}:${PORT}/dashboard`);
  
  // Start monitoring
  monitoringCore.start();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection at:', promise, 'reason:', reason);
});