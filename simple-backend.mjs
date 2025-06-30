import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const app = express();
const server = createServer(app);
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
      uptime: '7d 14h'
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

app.post('/api/auth/login', (req, res) => {
  res.json({
    success: true,
    user: { username: 'admin', role: 'admin' },
    token: 'mock-token'
  });
});

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws/monitoring' });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
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
    console.log('WebSocket client disconnected');
    clearInterval(interval);
  });
});

server.listen(port, () => {
  console.log(`Simple backend running on port ${port}`);
});