const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const SelfUpgradingAgent = require('./agents/self-upgrading-agent');
const SystemMonitor = require('./monitoring/system-monitor');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const PORT = process.env.PORT || 9001;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// In-memory storage (replace with database in production)
const storage = {
  agents: new Map(),
  conversations: new Map(),
  tasks: new Map(),
  users: new Map(),
  sessions: new Map(),
  models: new Map(),
  memories: new Map()
};

// WebSocket connection handling
const wsClients = new Map();

wss.on('connection', (ws, req) => {
  const clientId = uuidv4();
  wsClients.set(clientId, ws);
  
  console.log(`WebSocket client connected: ${clientId}`);
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleWebSocketMessage(clientId, data);
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  ws.on('close', () => {
    wsClients.delete(clientId);
    console.log(`WebSocket client disconnected: ${clientId}`);
  });
  
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
  
  // Send initial connection success
  ws.send(JSON.stringify({
    type: 'connection',
    status: 'connected',
    clientId
  }));
});

function handleWebSocketMessage(clientId, data) {
  const ws = wsClients.get(clientId);
  if (!ws) return;
  
  switch (data.type) {
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
      break;
      
    case 'subscribe':
      // Handle subscription to specific events
      break;
      
    case 'agent:command':
      // Handle agent commands
      handleAgentCommand(clientId, data);
      break;
      
    default:
      ws.send(JSON.stringify({
        type: 'error',
        message: `Unknown message type: ${data.type}`
      }));
  }
}

function broadcast(type, data) {
  const message = JSON.stringify({ type, data, timestamp: Date.now() });
  wsClients.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(message);
    }
  });
}

// Initialize default agents
function initializeAgents() {
  const defaultAgents = [
    {
      id: 'system-agent',
      name: 'System Agent',
      type: 'system',
      status: 'running',
      description: 'Core system management and monitoring agent',
      capabilities: ['system-monitor', 'resource-management', 'health-check'],
      memory: {},
      tools: ['systemInfo', 'processManager', 'logAnalyzer'],
      metrics: {
        tasksCompleted: 0,
        avgResponseTime: 0,
        uptime: Date.now()
      }
    },
    {
      id: 'assistant-agent',
      name: 'Assistant Agent',
      type: 'assistant',
      status: 'running',
      description: 'General purpose AI assistant for user interactions',
      capabilities: ['chat', 'task-execution', 'code-generation'],
      memory: {},
      tools: ['chatGPT', 'codeInterpreter', 'webSearch'],
      metrics: {
        tasksCompleted: 0,
        avgResponseTime: 0,
        uptime: Date.now()
      }
    },
    {
      id: 'research-agent',
      name: 'Research Agent',
      type: 'research',
      status: 'idle',
      description: 'Specialized agent for research and information gathering',
      capabilities: ['web-search', 'document-analysis', 'summarization'],
      memory: {},
      tools: ['webCrawler', 'pdfParser', 'summarizer'],
      metrics: {
        tasksCompleted: 0,
        avgResponseTime: 0,
        uptime: Date.now()
      }
    },
    {
      id: 'code-agent',
      name: 'Code Agent',
      type: 'developer',
      status: 'idle',
      description: 'Expert coding agent with self-modification capabilities',
      capabilities: ['code-generation', 'code-review', 'self-modification', 'debugging'],
      memory: {},
      tools: ['codeAnalyzer', 'astParser', 'testRunner', 'gitIntegration'],
      metrics: {
        tasksCompleted: 0,
        avgResponseTime: 0,
        uptime: Date.now()
      }
    },
    {
      id: 'orchestrator-agent',
      name: 'Orchestrator Agent',
      type: 'orchestrator',
      status: 'running',
      description: 'Coordinates multi-agent workflows and task distribution',
      capabilities: ['task-routing', 'agent-coordination', 'workflow-management'],
      memory: {},
      tools: ['taskQueue', 'agentManager', 'workflowEngine'],
      metrics: {
        tasksCompleted: 0,
        avgResponseTime: 0,
        uptime: Date.now()
      }
    },
    {
      id: 'self-upgrading-agent',
      name: 'Self-Upgrading Agent',
      type: 'self-upgrading',
      status: 'running',
      description: 'Autonomous agent with self-modification and improvement capabilities',
      capabilities: ['code-analysis', 'code-generation', 'self-modification', 'performance-monitoring', 'automated-testing'],
      memory: {},
      tools: ['codeAnalyzer', 'astParser', 'testRunner', 'performanceProfiler'],
      metrics: {
        tasksCompleted: 0,
        avgResponseTime: 0,
        uptime: Date.now(),
        version: '1.0.0',
        lastUpgrade: null
      }
    }
  ];
  
  defaultAgents.forEach(agent => {
    storage.agents.set(agent.id, {
      ...agent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

// Initialize default models
function initializeModels() {
  const defaultModels = [
    {
      id: 'ollama-llama3',
      name: 'Llama 3',
      provider: 'ollama',
      type: 'llm',
      status: 'available',
      capabilities: ['text-generation', 'chat', 'code-generation'],
      config: {
        model: 'llama3',
        temperature: 0.7,
        maxTokens: 4096
      }
    },
    {
      id: 'ollama-deepseek',
      name: 'DeepSeek Coder',
      provider: 'ollama',
      type: 'llm',
      status: 'available',
      capabilities: ['code-generation', 'code-completion', 'debugging'],
      config: {
        model: 'deepseek-coder',
        temperature: 0.3,
        maxTokens: 8192
      }
    },
    {
      id: 'openai-gpt4',
      name: 'GPT-4',
      provider: 'openai',
      type: 'llm',
      status: 'configured',
      capabilities: ['text-generation', 'chat', 'reasoning', 'vision'],
      config: {
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 4096
      }
    }
  ];
  
  defaultModels.forEach(model => {
    storage.models.set(model.id, {
      ...model,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  });
}

// Initialize storage
initializeAgents();
initializeModels();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  });
});

// System status endpoint
app.get('/api/system/status', (req, res) => {
  const agents = Array.from(storage.agents.values());
  const runningAgents = agents.filter(a => a.status === 'running').length;
  
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    agents: {
      total: agents.length,
      running: runningAgents,
      idle: agents.filter(a => a.status === 'idle').length,
      error: agents.filter(a => a.status === 'error').length
    },
    resources: {
      memory: process.memoryUsage(),
      uptime: process.uptime()
    },
    websockets: {
      connected: wsClients.size
    }
  });
});

// Authentication endpoints (simplified for demo)
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simplified auth - in production, use proper authentication
  if (email && password) {
    const token = uuidv4();
    const user = {
      id: uuidv4(),
      email,
      name: email.split('@')[0],
      role: 'admin'
    };
    
    storage.sessions.set(token, {
      user,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.json({
      success: true,
      token,
      user
    });
  } else {
    res.status(400).json({
      success: false,
      error: 'Invalid credentials'
    });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    storage.sessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/auth/me', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const session = storage.sessions.get(token);
  
  if (session && session.expiresAt > Date.now()) {
    res.json(session.user);
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Agent endpoints
app.get('/api/agents', (req, res) => {
  const agents = Array.from(storage.agents.values());
  res.json(agents);
});

app.get('/api/agents/:id', (req, res) => {
  const agent = storage.agents.get(req.params.id);
  if (agent) {
    res.json(agent);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.post('/api/agents', (req, res) => {
  const agent = {
    id: uuidv4(),
    ...req.body,
    status: 'idle',
    memory: {},
    metrics: {
      tasksCompleted: 0,
      avgResponseTime: 0,
      uptime: Date.now()
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  storage.agents.set(agent.id, agent);
  broadcast('agent:created', agent);
  
  res.status(201).json(agent);
});

app.put('/api/agents/:id', (req, res) => {
  const agent = storage.agents.get(req.params.id);
  if (agent) {
    const updated = {
      ...agent,
      ...req.body,
      id: agent.id,
      updatedAt: new Date().toISOString()
    };
    storage.agents.set(agent.id, updated);
    broadcast('agent:updated', updated);
    res.json(updated);
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.delete('/api/agents/:id', (req, res) => {
  if (storage.agents.delete(req.params.id)) {
    broadcast('agent:deleted', { id: req.params.id });
    res.status(204).send();
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.post('/api/agents/:id/start', (req, res) => {
  const agent = storage.agents.get(req.params.id);
  if (agent) {
    agent.status = 'running';
    agent.updatedAt = new Date().toISOString();
    storage.agents.set(agent.id, agent);
    broadcast('agent:started', agent);
    res.json({ success: true, agent });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.post('/api/agents/:id/stop', (req, res) => {
  const agent = storage.agents.get(req.params.id);
  if (agent) {
    agent.status = 'stopped';
    agent.updatedAt = new Date().toISOString();
    storage.agents.set(agent.id, agent);
    broadcast('agent:stopped', agent);
    res.json({ success: true, agent });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.post('/api/agents/:id/modify', async (req, res) => {
  const agent = storage.agents.get(req.params.id);
  if (agent) {
    const { modification } = req.body;
    
    // Simulate self-modification process
    const modificationRequest = {
      id: uuidv4(),
      agentId: agent.id,
      type: modification.type,
      code: modification.code,
      description: modification.description,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    
    // In a real implementation, this would go through a review process
    broadcast('agent:modification-requested', {
      agent,
      modification: modificationRequest
    });
    
    res.json({
      success: true,
      modification: modificationRequest,
      message: 'Modification request submitted for review'
    });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

app.get('/api/agents/:id/logs', (req, res) => {
  // Simulate agent logs
  const logs = [
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'info',
      message: 'Agent initialized successfully'
    },
    {
      timestamp: new Date(Date.now() - 30000).toISOString(),
      level: 'info',
      message: 'Processing task: User query analysis'
    },
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Task completed successfully'
    }
  ];
  
  res.json(logs);
});

app.get('/api/agents/:id/metrics', (req, res) => {
  const agent = storage.agents.get(req.params.id);
  if (agent) {
    res.json({
      ...agent.metrics,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 1000000000,
      activeConnections: Math.floor(Math.random() * 10),
      requestsPerMinute: Math.floor(Math.random() * 100)
    });
  } else {
    res.status(404).json({ error: 'Agent not found' });
  }
});

// Model endpoints
app.get('/api/models', (req, res) => {
  const models = Array.from(storage.models.values());
  res.json(models);
});

app.post('/api/models/:id/test', async (req, res) => {
  const model = storage.models.get(req.params.id);
  if (model) {
    // Simulate model test
    res.json({
      success: true,
      model: model.name,
      response: 'Model test successful. The model is responding correctly.',
      latency: Math.floor(Math.random() * 1000) + 100
    });
  } else {
    res.status(404).json({ error: 'Model not found' });
  }
});

// Conversation endpoints
app.get('/api/conversations', (req, res) => {
  const conversations = Array.from(storage.conversations.values());
  res.json(conversations);
});

app.post('/api/conversations', (req, res) => {
  const conversation = {
    id: uuidv4(),
    title: req.body.title || 'New Conversation',
    agentId: req.body.agentId,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  storage.conversations.set(conversation.id, conversation);
  res.status(201).json(conversation);
});

app.post('/api/conversations/:id/messages', async (req, res) => {
  const conversation = storage.conversations.get(req.params.id);
  if (conversation) {
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: req.body.content,
      timestamp: new Date().toISOString()
    };
    
    conversation.messages.push(userMessage);
    
    // Simulate agent response
    setTimeout(() => {
      const agentMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `I received your message: "${req.body.content}". This is a simulated response from the AI agent.`,
        timestamp: new Date().toISOString()
      };
      
      conversation.messages.push(agentMessage);
      conversation.updatedAt = new Date().toISOString();
      
      broadcast('conversation:message', {
        conversationId: conversation.id,
        message: agentMessage
      });
    }, 1000);
    
    res.json(userMessage);
  } else {
    res.status(404).json({ error: 'Conversation not found' });
  }
});

// Task endpoints
app.get('/api/tasks', (req, res) => {
  const tasks = Array.from(storage.tasks.values());
  res.json(tasks);
});

app.post('/api/tasks', (req, res) => {
  const task = {
    id: uuidv4(),
    ...req.body,
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  storage.tasks.set(task.id, task);
  
  // Simulate task execution
  executeTask(task);
  
  res.status(201).json(task);
});

function executeTask(task) {
  setTimeout(() => {
    task.status = 'running';
    task.progress = 25;
    broadcast('task:updated', task);
    
    setTimeout(() => {
      task.progress = 50;
      broadcast('task:updated', task);
      
      setTimeout(() => {
        task.progress = 75;
        broadcast('task:updated', task);
        
        setTimeout(() => {
          task.status = 'completed';
          task.progress = 100;
          task.result = {
            success: true,
            output: 'Task completed successfully'
          };
          task.updatedAt = new Date().toISOString();
          broadcast('task:completed', task);
        }, 2000);
      }, 2000);
    }, 2000);
  }, 1000);
}

// Memory endpoints
app.get('/api/memory/search', (req, res) => {
  const { q } = req.query;
  const memories = Array.from(storage.memories.values());
  
  if (q) {
    const filtered = memories.filter(m => 
      m.content.toLowerCase().includes(q.toLowerCase()) ||
      m.tags?.some(t => t.toLowerCase().includes(q.toLowerCase()))
    );
    res.json(filtered);
  } else {
    res.json(memories);
  }
});

app.post('/api/memory/store', (req, res) => {
  const memory = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  storage.memories.set(memory.id, memory);
  res.status(201).json(memory);
});

// File upload endpoint (simplified)
app.post('/api/files/upload', (req, res) => {
  // In production, implement proper file handling
  res.json({
    id: uuidv4(),
    filename: 'uploaded-file.txt',
    size: 1024,
    mimetype: 'text/plain',
    uploadedAt: new Date().toISOString()
  });
});

// Metrics endpoint
app.get('/api/system/metrics', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    system: {
      cpuUsage: Math.random() * 100,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    },
    application: {
      totalRequests: Math.floor(Math.random() * 10000),
      activeConnections: wsClients.size,
      responseTime: Math.random() * 100
    },
    agents: {
      total: storage.agents.size,
      running: Array.from(storage.agents.values()).filter(a => a.status === 'running').length
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Handle agent commands via WebSocket
function handleAgentCommand(clientId, data) {
  const { agentId, command, params } = data;
  const agent = storage.agents.get(agentId);
  
  if (!agent) {
    const ws = wsClients.get(clientId);
    ws.send(JSON.stringify({
      type: 'error',
      message: 'Agent not found'
    }));
    return;
  }
  
  // Simulate command execution
  switch (command) {
    case 'execute':
      agent.metrics.tasksCompleted++;
      broadcast('agent:task-executed', {
        agentId,
        command,
        params,
        result: 'Task executed successfully'
      });
      break;
      
    default:
      broadcast('agent:command', {
        agentId,
        command,
        params
      });
  }
}

// Initialize self-upgrading agent
const selfUpgradingAgent = new SelfUpgradingAgent('self-upgrading-agent', {
  autoUpgrade: false, // Set to true to enable automatic upgrades
  testBeforeApply: true,
  performanceThreshold: 0.1,
  upgradeInterval: 3600000 // 1 hour
});

// Initialize system monitor
const systemMonitor = new SystemMonitor({
  checkInterval: 30000,
  cpuThreshold: 80,
  memoryThreshold: 85,
  diskThreshold: 90
});

// Start monitoring
systemMonitor.start();

// Handle monitoring events
systemMonitor.on('alert', (alert) => {
  console.log('System alert:', alert);
  broadcast('system:alert', alert);
});

systemMonitor.on('health-check', (health) => {
  // Store health check data
  storage.systemHealth = health;
});

// Add self-upgrade endpoint
app.post('/api/agents/self-upgrading/analyze', async (req, res) => {
  try {
    const analysis = await selfUpgradingAgent.analyzeCode();
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agents/self-upgrading/upgrade', async (req, res) => {
  try {
    const analysis = await selfUpgradingAgent.analyzeCode();
    const proposals = await selfUpgradingAgent.generateImprovementProposal(analysis);
    const bestProposal = selfUpgradingAgent.selectBestProposal(proposals);
    
    if (bestProposal) {
      const result = await selfUpgradingAgent.applyImprovement(bestProposal);
      res.json(result);
    } else {
      res.json({ success: false, message: 'No improvement opportunities found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System monitoring endpoint
app.get('/api/monitoring/health', async (req, res) => {
  const health = await systemMonitor.performHealthCheck();
  res.json(health);
});

app.get('/api/monitoring/metrics', (req, res) => {
  res.json(systemMonitor.getMetrics());
});

app.get('/api/monitoring/alerts', (req, res) => {
  res.json(systemMonitor.getAlertHistory());
});

// Periodic system health broadcast
setInterval(() => {
  broadcast('system:health', {
    timestamp: Date.now(),
    agents: Array.from(storage.agents.values()).map(a => ({
      id: a.id,
      name: a.name,
      status: a.status
    })),
    metrics: systemMonitor.getMetrics(),
    selfUpgradeStatus: selfUpgradingAgent.getStatus()
  });
}, 30000); // Every 30 seconds

// Start server
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║       LexOS Production Backend        ║
║                                       ║
║  Version: 2.0.0                       ║
║  Port: ${PORT}                          ║
║  Environment: ${NODE_ENV}             ║
║  WebSocket: Enabled                   ║
╚═══════════════════════════════════════╝

Ready to accept connections...
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('Server closed');
    
    // Close WebSocket connections
    wsClients.forEach((ws) => {
      ws.close();
    });
    
    process.exit(0);
  });
});

module.exports = { app, server };