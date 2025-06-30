const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const port = 9000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mock API endpoints
app.get('/api/agents', (req, res) => {
  res.json([
    {
      id: '1',
      name: 'LEX-Alpha-001',
      type: 'General Purpose AI',
      status: 'active',
      performance: 95,
      tasksCompleted: 1247,
      uptime: '7d 14h',
      capabilities: ['NLP', 'Code Generation', 'Analysis']
    },
    {
      id: '2',
      name: 'LEX-Beta-002',
      type: 'Research Assistant',
      status: 'idle',
      performance: 88,
      tasksCompleted: 892,
      uptime: '3d 6h',
      capabilities: ['Research', 'Data Mining', 'Synthesis']
    }
  ]);
});

app.get('/api/system/metrics', (req, res) => {
  res.json({
    cpu: { usage: 45, cores: 32 },
    memory: { used: 12.4, total: 32, percentage: 38.75 },
    gpu: { usage: 78, memory: 85, temperature: 72 },
    network: { in: 125.4, out: 89.2 },
    storage: { used: 45.6, total: 100, percentage: 45.6 }
  });
});

// System Status endpoint - matches the SystemStatus interface
app.get('/api/system/status', (req, res) => {
  res.json({
    system: {
      status: 'online',
      uptime: 86400, // 1 day in seconds
      version: '2.0.0-nexus',
      environment: 'production'
    },
    orchestrator: {
      status: 'active',
      active_agents: 3,
      total_tasks: 1247,
      active_tasks: 5,
      queued_tasks: 12,
      completed_tasks: 1230,
      failed_tasks: 17,
      task_workers: 8,
      workflow_workers: 4
    },
    hardware: {
      gpu: {
        model: 'NVIDIA H100 80GB HBM3',
        memory_total: '80.0 GB',
        memory_used: '45.2 GB',
        utilization: 78,
        temperature: 72
      },
      cpu: {
        cores: 32,
        usage: 45,
        load_average: [2.1, 1.8, 1.5]
      },
      memory: {
        total: '256 GB',
        used: '98.4 GB',
        available: '157.6 GB',
        usage_percent: 38
      },
      disk: {
        total: '20 TB',
        used: '9.1 TB',
        available: '10.9 TB',
        usage_percent: 46
      }
    },
    security: {
      active_sessions: 3,
      failed_login_attempts: 0,
      content_filter_blocks: 2,
      access_control_denials: 0
    },
    timestamp: Math.floor(Date.now() / 1000)
  });
});

// System Status endpoint - matches the SystemStatus interface
app.get('/api/system/status', (req, res) => {
  res.json({
    system: {
      status: 'online',
      uptime: 86400, // 1 day in seconds
      version: '2.0.0-nexus',
      environment: 'production'
    },
    orchestrator: {
      status: 'active',
      active_agents: 3,
      total_tasks: 1247,
      active_tasks: 5,
      queued_tasks: 12,
      completed_tasks: 1230,
      failed_tasks: 17,
      task_workers: 8,
      workflow_workers: 4
    },
    hardware: {
      gpu: {
        model: 'NVIDIA H100 80GB HBM3',
        memory_total: '80.0 GB',
        memory_used: '45.2 GB',
        utilization: 78,
        temperature: 72
      },
      cpu: {
        cores: 32,
        usage: 45,
        load_average: [2.1, 1.8, 1.5]
      },
      memory: {
        total: '256 GB',
        used: '98.4 GB',
        available: '157.6 GB',
        usage_percent: 38
      },
      disk: {
        total: '20 TB',
        used: '9.1 TB',
        available: '10.9 TB',
        usage_percent: 46
      }
    },
    security: {
      active_sessions: 3,
      failed_login_attempts: 0,
      content_filter_blocks: 2,
      access_control_denials: 0
    },
    timestamp: Math.floor(Date.now() / 1000)
  });
});

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    user: { username: 'admin', role: 'admin' },
    token: 'mock-token'
  });
});

app.get('/api/notifications', (req, res) => {
  res.json([]);
});

app.get('/api/notifications/count', (req, res) => {
  res.json({ count: 0 });
});

app.get('/api/notifications/preferences', (req, res) => {
  res.json({
    emailEnabled: true,
    pushEnabled: true,
    inAppEnabled: true,
    notificationTypes: []
  });
});

// WebSocket - main endpoint
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected on /ws');
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected from /ws');
  });
});

// WebSocket - monitoring endpoint
const wssMonitoring = new WebSocketServer({ server, path: '/ws/monitoring' });

wssMonitoring.on('connection', (ws) => {
  console.log('WebSocket client connected on /ws/monitoring');
  
  // Send periodic updates
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'metrics',
        data: {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          timestamp: Date.now()
        }
      }));
    }
  }, 2000);

  ws.on('close', () => {
    console.log('WebSocket client disconnected from /ws/monitoring');
    clearInterval(interval);
  });
});

server.listen(port, () => {
  console.log(`Mock backend running on port ${port}`);
  console.log(`WebSocket endpoints available at ws://localhost:${port}/ws and ws://localhost:${port}/ws/monitoring`);
});