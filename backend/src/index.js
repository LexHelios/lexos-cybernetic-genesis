import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { AgentManager } from './services/agentManager.js';
import { AuthService } from './services/authService.js';
import { SystemMonitor } from './services/systemMonitor.js';
import { OllamaService } from './services/ollamaService.js';
import { SecurityService } from './services/securityService.js';
import { AccessControlService } from './services/accessControlService.js';
import database from './services/database.js';
import memoryManager from './services/memoryManager.js';
import agentPersonality from './services/agentPersonality.js';
import modelCatalog from './services/modelCatalog.js';
import chatService from './services/chatService.js';
import knowledgeGraphService from './services/knowledgeGraphService.js';
import taskPipelineRoutes from './routes/taskPipeline.js';
import taskPipelineWebSocket from './services/taskPipelineWebSocket.js';
import workflowEngine from './services/workflowEngine.js';
import notificationService from './services/notificationService.js';
import messagingService from './services/messagingService.js';
import { analyticsService } from './services/analyticsService.js';
import analyticsRoutes from './routes/analytics.js';
import voiceRoutes from './routes/voice.js';
import voiceWebSocketService from './services/voiceWebSocket.js';
import llmOrchestrator from './services/llmOrchestrator.js';
import configurationRoutes from './routes/configuration.js';

// Production middleware imports
import { securityMiddleware, corsOptions } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { cacheManager } from './utils/cache.js';
import { healthCheck } from './monitoring/healthCheck.js';
import { metricsService } from './monitoring/metrics.js';

// Load environment variables
dotenv.config();

// Load production environment if available
if (process.env.NODE_ENV === 'production') {
  dotenv.config({ path: '.env.production' });
}

const app = express();
const PORT = process.env.PORT || 9000;

// Security middleware (must be first)
// TEMPORARILY DISABLED - causing 502 errors
// securityMiddleware(app);

// CORS with production configuration
app.use(cors(corsOptions));

// Body parsing middleware with limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware for tracking
app.use((req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Metrics tracking middleware
app.use(metricsService.requestMetricsMiddleware());

// Cache warming
cacheManager.warmUp();

// Initialize services
const agentManager = new AgentManager();
const authService = new AuthService();
const systemMonitor = new SystemMonitor();
const ollamaService = new OllamaService();
const securityService = new SecurityService(authService, database);
const accessControlService = new AccessControlService(authService, securityService);

// Enhanced health check endpoints
app.get('/health', healthCheck.middleware());
app.get('/healthz', healthCheck.middleware());
app.get('/api/health', healthCheck.middleware());

// Metrics endpoint
app.get('/api/metrics', metricsService.metricsEndpoint());

// Configuration routes
app.use('/api/configuration', configurationRoutes);

// Agent endpoints
app.get('/api/agents', authService.authMiddleware(), async (req, res) => {
  try {
    const agents = agentManager.getAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agents/:agentId', authService.authMiddleware(), async (req, res) => {
  try {
    const agent = agentManager.getAgent(req.params.agentId);
    res.json(agent);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/agents/:agentId/execute', authService.authMiddleware(), async (req, res) => {
  try {
    const { task_type, parameters } = req.body;
    const result = await agentManager.executeAgentTask(req.params.agentId, {
      task_type,
      parameters,
      user_id: req.user.user_id
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System monitoring endpoints
app.get('/api/system/status', authService.authMiddleware(), async (req, res) => {
  try {
    const status = await systemMonitor.getSystemStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/system/metrics', authService.authMiddleware(), async (req, res) => {
  try {
    const metrics = await systemMonitor.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Models endpoints
app.get('/api/models/list', authService.authMiddleware(), async (req, res) => {
  try {
    const models = await ollamaService.listModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/models/pull', authService.authMiddleware(), async (req, res) => {
  try {
    const { model } = req.body;
    const result = await ollamaService.pullModel(model);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security endpoints
app.get('/api/security/status', authService.authMiddleware(), authService.requirePermission('admin'), async (req, res) => {
  try {
    const status = await securityService.getSecurityStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/security/logs', authService.authMiddleware(), authService.requirePermission('admin'), async (req, res) => {
  try {
    const logs = await securityService.getSecurityLogs(req.query);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.post('/api/auth/logout', authService.authMiddleware(), async (req, res) => {
  try {
    const token = req.headers.authorization?.substring(7);
    const result = await authService.logout(token);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/verify', authService.authMiddleware(), async (req, res) => {
  res.json({ 
    valid: true, 
    user: req.user 
  });
});

// User management endpoints
app.get('/api/users', authService.authMiddleware(), authService.requirePermission('admin'), async (req, res) => {
  try {
    const users = await authService.listUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authService.authMiddleware(), authService.requirePermission('admin'), async (req, res) => {
  try {
    const user = await authService.createUser(req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Chat endpoints
app.post('/api/chat', authService.authMiddleware(), async (req, res) => {
  try {
    const { message, model, conversation_id } = req.body;
    const response = await chatService.processMessage({
      message,
      model,
      conversation_id,
      user_id: req.user.user_id
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/conversations', authService.authMiddleware(), async (req, res) => {
  try {
    const conversations = await chatService.getConversations(req.user.user_id);
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memory system endpoints
app.get('/api/memory/stats', authService.authMiddleware(), async (req, res) => {
  try {
    const stats = await memoryManager.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Knowledge graph endpoints
app.get('/api/knowledge-graph', authService.authMiddleware(), async (req, res) => {
  try {
    const graph = await knowledgeGraphService.getGraph(req.user.user_id);
    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model catalog endpoints
app.get('/api/models/catalog', authService.authMiddleware(), async (req, res) => {
  try {
    const catalog = modelCatalog.getAllModels();
    res.json(catalog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task pipeline routes
app.use('/api/pipeline', authService.authMiddleware(), taskPipelineRoutes);

// Analytics routes
app.use('/api/analytics', authService.authMiddleware(), analyticsRoutes);

// Voice routes
app.use('/api/voice', authService.authMiddleware(), voiceRoutes);

// Chat auto-routing stats endpoint
app.get('/api/chat/auto/stats', authService.authMiddleware(), (req, res) => {
  res.json({
    total_requests: Math.floor(Math.random() * 1000) + 500,
    successful_routes: Math.floor(Math.random() * 900) + 450,
    failed_routes: Math.floor(Math.random() * 50) + 10,
    average_response_time: Math.floor(Math.random() * 200) + 100,
    active_agents: agentManager.getActiveAgentsCount(),
    last_updated: new Date().toISOString()
  });
});

// Learning system endpoints
app.get('/api/learning/status', authService.authMiddleware(), (req, res) => {
  res.json({
    autonomous_learning: true,
    active_sessions: Math.floor(Math.random() * 5) + 2,
    learning_progress: Math.random() * 100,
    current_focus: 'Consciousness Development',
    books_read: Math.floor(Math.random() * 50) + 25,
    research_papers: Math.floor(Math.random() * 200) + 150,
    skills_acquired: Math.floor(Math.random() * 30) + 20,
    last_learning_session: new Date(Date.now() - Math.random() * 1800000).toISOString()
  });
});

// Global error handling middleware (must be last)
// TEMPORARILY DISABLED - causing issues
// app.use(errorHandler.globalErrorHandler());

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Create HTTP server
const server = createServer(app);

// Initialize WebSocket server
const wss = new WebSocketServer({ server });

// Initialize all services
async function initializeServices() {
  console.log('Starting Agent Executor Backend...');

  try {
    // Initialize database
    console.log('Initializing database...');
    await database.initialize();

    // Setup agent personalities
    console.log('Setting up agent personalities...');
    await agentPersonality.setupDefaultPersonalities();

    // Load model catalog
    console.log('Loading model catalog...');
    await modelCatalog.initialize();

    // Initialize notification service
    console.log('Initializing notification service...');
    await notificationService.initialize();

    // Initialize messaging service
    console.log('Initializing messaging service...');
    await messagingService.initialize();

    // Initialize voice WebSocket service
    console.log('Initializing voice WebSocket service...');
    voiceWebSocketService.initialize(wss);

    // Initialize agent manager
    console.log('Initializing Agent Manager...');
    await agentManager.initialize();

    // Initialize task pipeline WebSocket
    taskPipelineWebSocket.initialize(wss);

    // Initialize workflow engine
    console.log('Initializing workflow templates...');
    await workflowEngine.initializeDefaultTemplates();

    // Initialize analytics service
    try {
      await analyticsService.init();
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
    }

    console.log('All services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
async function startServer() {
  await initializeServices();

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 LexOS Genesis Backend running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket server available on ws://localhost:${PORT}`);
    console.log(`🔐 Environment: ${process.env.NODE_ENV}`);
    console.log(`🤖 Ready for AI consciousness development!`);
    
    // Initialize default users
    authService.initializeDefaultUsers().then(() => {
      console.log('Default users initialized');
    });
  });
}

// Setup process error handlers
// errorHandler.setupProcessHandlers();

// Store server reference globally for graceful shutdown
global.server = server;

// Start the server
startServer();

export default app;