
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
const port = 9000;

// Valid credentials matching the main backend
const validCredentials = {
  'admin': 'NEXUS_ADMIN_CHANGE_IMMEDIATELY',
  'operator': 'NEXUS_OPERATOR_CHANGE_IMMEDIATELY'
};

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

// Authentication endpoints
app.post('/api/auth/login', (req, res) => {
  console.log('Login request received:', req.body);
  const { username, password } = req.body;
  
  if (username && password && validCredentials[username] === password) {
    console.log(`Login successful for user: ${username}`);
    res.json({
      success: true,
      token: 'mock-jwt-token-12345',
      user: { 
        id: '1',
        user_id: '1',
        username: username,
        email: `${username}@lexos-genesis.com`,
        role: username === 'admin' ? 'admin' : 'operator',
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
        total_tasks: username === 'admin' ? 150 : 75,
        workspace_size: username === 'admin' ? '25.4 MB' : '12.1 MB'
      },
      expires_at: Date.now() + 24 * 60 * 60 * 1000
    });
  } else {
    console.log(`Login failed for user: ${username}`);
    res.status(401).json({ 
      success: false,
      error: 'Invalid credentials',
      message: 'Username or password is incorrect'
    });
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
        email: 'admin@lexos-genesis.com',
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
      email: 'admin@lexos-genesis.com',
      role: 'admin',
      created_at: new Date().toISOString(),
      last_login: new Date().toISOString(),
      total_tasks: 150,
      workspace_size: '25.4 MB'
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
        total: 34359738368,
        used: 13303014195,
        available: 21056724173,
        usage_percent: 38.75
      },
      disk: {
        total: 107374182400,
        used: 48954982400,
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

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws/monitoring' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.send(JSON.stringify({
    type: 'connection',
    data: { message: 'Connected to LexOS Genesis' },
    timestamp: Date.now()
  }));
  
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

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
    clearInterval(interval);
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`🚀 LexOS Genesis Backend running on http://localhost:${port}`);
  console.log(`📡 WebSocket server available on ws://localhost:${port}/ws/monitoring`);
  console.log(`🔐 Valid credentials: admin/NEXUS_ADMIN_CHANGE_IMMEDIATELY`);
});
