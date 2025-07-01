
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 CORS enabled for: ${corsOptions.origin.join(', ')}`);
});
