// Load environment variables first
require('dotenv').config();

// Import startup validation (ES modules)
import('./startup/startupManager.js').then(async ({ default: startupManager }) => {
  // Run startup validation before starting the server
  const isValid = await startupManager.validateStartup();
  if (!isValid) {
    // startupManager handles exit on validation failure
    return;
  }
  
  // If validation passes, start the server
  startServer();
}).catch((error) => {
  console.error('Failed to import startup validation:', error);
  process.exit(1);
});

function startServer() {
  const express = require('express');
  const cors = require('cors');
  const path = require('path');

  const app = express();
  const PORT = process.env.PORT || 9000;

  // CORS configuration
  const corsOptions = {
    origin: [
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  };

  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(express.static('public'));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '2.1.0',
      uptime: process.uptime()
    });
  });

  // API routes
  app.get('/api/system/status', (req, res) => {
    res.json({
      status: 'operational',
      timestamp: new Date().toISOString(),
      services: {
        backend: 'healthy',
        database: 'healthy'
      },
      version: process.env.APP_VERSION || '2.1.0'
    });
  });

  app.get('/api/agents', (req, res) => {
    res.json({
      agents: [],
      count: 0,
      status: 'operational'
    });
  });

  app.get('/api/chat/auto/stats', (req, res) => {
    res.json({
      totalChats: 0,
      activeAgents: 0,
      status: 'operational'
    });
  });

  // Catch-all for unhandled routes
  app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  // Start server
  const server = app.listen(PORT, '0.0.0.0', async () => {
    console.log(`🚀 Backend server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 CORS enabled for: ${corsOptions.origin.join(', ')}`);
    
    // Store server reference for graceful shutdown
    global.server = server;
    
    // Log successful startup
    try {
      const { default: startupManager } = await import('./startup/startupManager.js');
      await startupManager.logSuccessfulStartup(PORT);
    } catch (error) {
      console.warn('Could not log startup success:', error.message);
    }
  });

  // Handle server errors
  server.on('error', async (error) => {
    try {
      const { default: startupManager } = await import('./startup/startupManager.js');
      await startupManager.logFatalError('Server failed to start', error);
    } catch (logError) {
      console.error('Server error:', error);
    }
    process.exit(1);
  });
}