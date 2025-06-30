
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const port = 9000;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication endpoints that match the frontend expectations
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  const { username, password } = req.body;
  
  // Simple mock authentication
  if (username && password) {
    res.json({
      success: true,
      token: 'mock-jwt-token-12345',
      user: { 
        id: '1',
        user_id: '1',
        username: username,
        email: `${username}@example.com`,
        role: 'admin',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        total_tasks: 0,
        workspace_size: '0 MB'
      },
      expires_at: Date.now() + 24 * 60 * 60 * 1000
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.json({ 
      valid: true, 
      user: {
        id: '1',
        user_id: '1',
        username: 'admin',
        email: 'admin@example.com',
        role: 'admin'
      }
    });
  } else {
    res.status(401).json({ valid: false, error: 'No valid token' });
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    res.json({
      id: '1',
      user_id: '1',
      username: 'admin',
      email: 'admin@example.com',
      role: 'admin',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      total_tasks: 42,
      workspace_size: '15.2 MB'
    });
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Agent endpoints
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      {
        id: 'lex-alpha-001',
        name: 'LEX-Alpha-001',
        type: 'General Purpose AI',
        status: 'active',
        performance: 95,
        tasksCompleted: 1247,
        uptime: '7d 14h',
        model: 'llama3.2',
        capabilities: ['reasoning', 'analysis', 'generation'],
        last_activity: new Date().toISOString()
      },
      {
        id: 'research-agent',
        name: 'Research Agent',
        type: 'Research & Analysis',
        status: 'active',
        performance: 92,
        tasksCompleted: 834,
        uptime: '5d 8h',
        model: 'gemma2',
        capabilities: ['research', 'analysis', 'summarization'],
        last_activity: new Date().toISOString()
      }
    ],
    total_agents: 2,
    active_agents: 2
  });
});

app.get('/api/agents/:agentId', (req, res) => {
  const agent = {
    id: req.params.agentId,
    name: 'LEX-Alpha-001',
    type: 'General Purpose AI',
    status: 'active',
    performance: 95,
    tasksCompleted: 1247,
    uptime: '7d 14h',
    model: 'llama3.2',
    capabilities: ['reasoning', 'analysis', 'generation'],
    last_activity: new Date().toISOString()
  };
  res.json(agent);
});

// System status endpoint
app.get('/api/system/status', (req, res) => {
  res.json({
    system: {
      status: 'online',
      uptime: Math.floor(process.uptime()),
      version: '1.0.0',
      environment: 'development'
    },
    orchestrator: {
      status: 'active',
      active_agents: 2,
      total_tasks: 2081,
      active_tasks: 3,
      queued_tasks: 1,
      completed_tasks: 2074,
      failed_tasks: 3,
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
        load_average: [1.2, 1.1, 0.9]
      },
      memory: {
        total: 34359738368, // 32GB in bytes
        used: 13303014195,  // ~12.4GB
        available: 21056724173,
        usage_percent: 38.75
      },
      disk: {
        total: 107374182400, // 100GB
        used: 48954982400,   // ~45.6GB
        available: 58419200000,
        usage_percent: 45.6
      }
    },
    security: {
      active_sessions: 1,
      failed_login_attempts: 0,
      content_filter_blocks: 2,
      access_control_denials: 0
    },
    timestamp: Math.floor(Date.now() / 1000)
  });
});

// Task endpoints
app.post('/api/agents/:agentId/tasks', (req, res) => {
  const taskId = `task_${Date.now()}`;
  res.json({
    success: true,
    task_id: taskId,
    agent_id: req.params.agentId,
    status: 'queued',
    created_at: new Date().toISOString(),
    estimated_completion: new Date(Date.now() + 30000).toISOString()
  });
});

app.get('/api/tasks/:taskId', (req, res) => {
  res.json({
    id: req.params.taskId,
    agent_id: 'lex-alpha-001',
    status: 'completed',
    type: 'analysis',
    parameters: { query: 'sample task' },
    result: 'Task completed successfully',
    created_at: new Date(Date.now() - 60000).toISOString(),
    completed_at: new Date().toISOString()
  });
});

// Catch-all for undefined routes
app.use('*', (req, res) => {
  console.log('Unhandled request:', req.method, req.originalUrl);
  res.status(404).json({ error: 'Endpoint not found', path: req.originalUrl });
});

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws/monitoring' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  // Send initial connection message
  ws.send(JSON.stringify({
    type: 'connection',
    data: { message: 'Connected to LexOS Genesis' },
    timestamp: Date.now()
  }));
  
  // Send periodic updates
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'metrics',
        data: {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          gpu: Math.random() * 100,
          timestamp: Date.now()
        }
      }));
    }
  }, 2000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log('WebSocket message received:', data);
      
      // Echo back the message
      ws.send(JSON.stringify({
        type: 'response',
        data: { received: data },
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(interval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 LexOS Genesis Mock Backend running on http://localhost:${port}`);
  console.log(`📡 WebSocket server available on ws://localhost:${port}/ws/monitoring`);
  console.log(`🔗 CORS enabled for all origins`);
  console.log(`📋 Available endpoints:`);
  console.log(`   POST /api/auth/login`);
  console.log(`   GET  /api/auth/verify`);
  console.log(`   GET  /api/auth/me`);
  console.log(`   GET  /api/agents`);
  console.log(`   GET  /api/system/status`);
  console.log(`   GET  /health`);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
