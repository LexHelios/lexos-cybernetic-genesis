#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from 'dotenv';
import fs from 'fs/promises';
import path from 'path';

// ES Module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json());

// Initialize directories
async function initializeDirectories() {
  const dirs = ['./data', './logs', './public'];
  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true }).catch(() => {});
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '2.1.0-recovery'
  });
});

// System status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    services: {
      backend: 'healthy',
      database: 'recovering',
      analytics: 'disabled'
    },
    mode: 'recovery',
    version: '2.1.0-recovery'
  });
});

// Basic agents endpoint
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      {
        id: '1',
        name: 'System Recovery Agent',
        status: 'active',
        type: 'system',
        capabilities: ['recovery', 'diagnostics']
      }
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`
  });
});

// Create HTTP server
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket connection established');
  
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'Connected to LexOS Recovery Backend',
    timestamp: Date.now()
  }));
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Graceful shutdown
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('Shutting down gracefully...');
  
  wss.clients.forEach((client) => {
    client.close();
  });
  
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
  
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 5000);
}

// Start server
async function start() {
  try {
    await initializeDirectories();
    
    server.listen(PORT, () => {
      console.log(`\n✅ LexOS Recovery Backend started successfully`);
      console.log(`📍 Server running on port ${PORT}`);
      console.log(`🏥 Health check: http://localhost:${PORT}/health`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`\n⚠️  Running in recovery mode with limited functionality`);
      console.log(`📝 Check logs directory for error details\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  fs.appendFile('./logs/crash.log', `${new Date().toISOString()} - ${error.stack}\n`).catch(() => {});
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled rejection:', reason);
  fs.appendFile('./logs/crash.log', `${new Date().toISOString()} - ${reason}\n`).catch(() => {});
});

// Start the server
start();