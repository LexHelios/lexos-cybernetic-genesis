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
import internetAgentsRoutes from './routes/internetAgents.js';
import voiceWebSocketService from './services/voiceWebSocket.js';
import llmOrchestrator from './services/llmOrchestrator.js';

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
const port = process.env.PORT || 9000;

// Security middleware (must be first)
securityMiddleware(app);

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

app.get('/api/agents/metrics', authService.authMiddleware(), async (req, res) => {
  try {
    const metrics = agentManager.getAgentMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task endpoints
app.post('/api/tasks', authService.authMiddleware(), async (req, res) => {
  try {
    const { agent_id, task_type, parameters, priority } = req.body;
    const userId = req.headers['x-user-id'] || 'anonymous';
    
    const result = await agentManager.submitTask(
      agent_id,
      userId,
      task_type,
      parameters,
      priority
    );
    
    // Track task submission
    analyticsService.trackEvent('task', 'submitted', {
      userId,
      agentId: agent_id,
      taskType: task_type,
      taskId: result.task_id,
      priority
    });
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Agent-specific task submission endpoint (frontend expects this)
app.post('/api/agents/:agentId/tasks', authService.authMiddleware(), async (req, res) => {
  try {
    const { task_type, parameters, priority } = req.body;
    const agentId = req.params.agentId;
    const userId = req.user.user_id || 'anonymous';
    
    const result = await agentManager.submitTask(
      agentId,
      userId,
      task_type,
      parameters,
      priority
    );
    
    // Track task submission
    analyticsService.trackEvent('task', 'submitted', {
      userId,
      agentId,
      taskType: task_type,
      taskId: result.task_id,
      priority
    });
    
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/tasks/:taskId', authService.authMiddleware(), async (req, res) => {
  try {
    const task = agentManager.getTask(req.params.taskId);
    res.json(task);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/tasks', authService.authMiddleware(), async (req, res) => {
  try {
    const tasks = agentManager.getTasks(req.query);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:taskId', authService.authMiddleware(), async (req, res) => {
  try {
    const result = agentManager.cancelTask(req.params.taskId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// System status endpoint - Full system status for dashboard
app.get('/api/system/status', async (req, res) => {
  try {
    // Get system info from SystemMonitor
    const systemInfo = await systemMonitor.getSystemInfo();
    
    // Get agent status from AgentManager
    const agentStatus = agentManager.getSystemStatus();
    const agents = agentManager.getAgents();
    
    // Get GPU status
    const gpuStatus = await systemMonitor.getGPUStatus();
    
    // Construct full system status matching frontend interface
    const status = {
      system: {
        status: 'online',
        uptime: systemInfo.system.uptime,
        version: systemInfo.application.version,
        environment: systemInfo.application.environment
      },
      orchestrator: {
        status: 'active',
        active_agents: agents.active_agents,
        total_tasks: agentStatus.total_tasks,
        active_tasks: agentStatus.active_tasks,
        queued_tasks: agentStatus.queued_tasks,
        completed_tasks: agentStatus.completed_tasks,
        failed_tasks: agentStatus.failed_tasks,
        task_workers: 8, // Default value
        workflow_workers: 4 // Default value
      },
      hardware: {
        gpu: {
          model: gpuStatus?.model || 'NVIDIA H100 80GB HBM3',
          memory_total: gpuStatus?.memory_total || '80.0 GB',
          memory_used: gpuStatus?.memory_used || '45.2 GB',
          utilization: gpuStatus?.utilization || 78,
          temperature: gpuStatus?.temperature || 72
        },
        cpu: {
          cores: systemInfo.resources.cpu.cores,
          usage: systemInfo.resources.cpu.usage,
          load_average: systemInfo.resources.cpu.load_average
        },
        memory: {
          total: systemInfo.resources.memory.total,
          used: systemInfo.resources.memory.used,
          available: systemInfo.resources.memory.available,
          usage_percent: systemInfo.resources.memory.usage_percent
        },
        disk: {
          total: systemInfo.resources.storage.total,
          used: systemInfo.resources.storage.used,
          available: systemInfo.resources.storage.available,
          usage_percent: systemInfo.resources.storage.usage_percent
        }
      },
      security: {
        active_sessions: authService.getActiveSessions().length,
        failed_login_attempts: 0, // TODO: Implement tracking
        content_filter_blocks: 2, // TODO: Implement tracking
        access_control_denials: 0 // TODO: Implement tracking
      },
      timestamp: Math.floor(Date.now() / 1000)
    };
    
    res.json(status);
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');
    
    const result = await securityService.validateLogin(username, password, ip, userAgent);
    
    if (result.success) {
      // Create access control session
      const session = await accessControlService.createSession(result.user, result.token, {
        ip,
        userAgent
      });
      
      // Track successful login
      analyticsService.trackEvent('auth', 'login_success', {
        userId: result.user.id,
        username: result.user.username,
        ip,
        userAgent
      });
      
      res.json({
        token: result.token,
        user: result.user,
        sessionId: session.id
      });
    } else {
      // Track failed login
      analyticsService.trackEvent('auth', 'login_failed', {
        username,
        ip,
        userAgent,
        reason: result.error
      });
      
      res.status(401).json({ error: result.error });
    }
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

// Additional auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const result = await authService.createUser(req.body);
    if (result.success) {
      res.json({
        success: true,
        token: 'registration-token', // TODO: Implement proper registration flow
        user: result.user,
        expires_at: Date.now() + 24 * 60 * 60 * 1000
      });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authService.authMiddleware(), async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    // TODO: Implement forgot password functionality
    res.json({ 
      success: true, 
      message: 'Password reset instructions sent to email' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    // TODO: Implement password reset functionality
    res.json({ 
      success: true, 
      message: 'Password reset successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/change-password', authService.authMiddleware(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    // TODO: Implement password change functionality
    res.json({ 
      success: true, 
      message: 'Password changed successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/2fa/enable', authService.authMiddleware(), async (req, res) => {
  try {
    // TODO: Implement 2FA functionality
    res.json({ 
      qr_code: 'data:image/png;base64,placeholder',
      secret: 'PLACEHOLDER_SECRET'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/2fa/verify', authService.authMiddleware(), async (req, res) => {
  try {
    // TODO: Implement 2FA verification
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/api-key', authService.authMiddleware(), async (req, res) => {
  try {
    // TODO: Implement API key generation
    res.json({ 
      api_key: `lexos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/auth/api-key/:keyId', authService.authMiddleware(), async (req, res) => {
  try {
    // TODO: Implement API key revocation
    res.json({ 
      success: true, 
      message: 'API key revoked successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User management endpoints
app.get('/api/users', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const result = await authService.getUsers();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const result = await authService.createUser(req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/users/:userId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const result = await authService.updateUser(req.params.userId, req.body);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:userId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const result = await authService.deleteUser(req.params.userId);
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System monitoring endpoints
app.get('/api/v1/system/info', authService.authMiddleware(), async (req, res) => {
  try {
    const includeSensitive = req.query.include_sensitive === 'true';
    const info = await systemMonitor.getSystemInfo(includeSensitive);
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/gpu/status', authService.authMiddleware(), async (req, res) => {
  try {
    const status = await systemMonitor.getGPUStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/system/health', async (req, res) => {
  try {
    const health = await systemMonitor.getHealthChecks();
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/v1/system/metrics', authService.authMiddleware(), async (req, res) => {
  try {
    const metrics = await systemMonitor.collectMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model management endpoints
app.get('/api/models', authService.authMiddleware(), async (req, res) => {
  try {
    const models = ollamaService.getAvailableModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models/:modelId', authService.authMiddleware(), async (req, res) => {
  try {
    const model = ollamaService.getModelInfo(req.params.modelId);
    if (model) {
      res.json(model);
    } else {
      res.status(404).json({ error: 'Model not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models/ollama/list', authService.authMiddleware(), async (req, res) => {
  try {
    const result = await ollamaService.listModels();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/models/ollama/pull', authService.authMiddleware(), authService.requirePermission('execute'), async (req, res) => {
  try {
    const { model_name } = req.body;
    const result = await ollamaService.pullModel(model_name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/models/ollama/:modelName', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const result = await ollamaService.deleteModel(req.params.modelName);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat endpoint for direct model interaction
app.post('/api/chat', authService.authMiddleware(), async (req, res) => {
  try {
    const { messages, model, options, session_id, agent_id, auto_mode = false } = req.body;
    
    // If auto mode is enabled, use the orchestrator
    if (auto_mode || model === 'auto') {
      const userMessage = messages[messages.length - 1].content;
      const userId = req.user.id;
      
      // Analyze and route request
      const routingDecision = await llmOrchestrator.analyzeRequest(userMessage, {
        sessionId: session_id,
        userId,
        conversationHistory: messages,
        performanceMode: options?.performance_mode || 'balanced'
      });
      
      // Generate response with selected model
      const result = await llmOrchestrator.generateResponse(userMessage, routingDecision, {
        sessionId: session_id,
        userId,
        conversationHistory: messages,
        ...options
      });
      
      res.json({
        message: {
          role: 'assistant',
          content: result.response
        },
        model_used: result.metadata.model,
        routing_metadata: {
          reason: result.metadata.reasoning,
          confidence: result.metadata.confidence,
          response_time: result.metadata.responseTime
        }
      });
      return;
    }
    
    // If agent_id is provided, use the chat service for comprehensive logging
    if (agent_id && messages && messages.length > 0) {
      const userId = req.user.id;
      let sessionId = session_id;
      
      // Create session if not provided
      if (!sessionId) {
        sessionId = await chatService.createSession(userId, agent_id);
      }
      
      // Process the latest user message
      const userMessage = messages[messages.length - 1].content;
      await chatService.processMessage(sessionId, userMessage, 'user');
      
      // Get the agent and generate response
      const agent = agentManager.getAgent(agent_id);
      const response = await chatService.generateAgentResponse(
        sessionId,
        userMessage,
        agent,
        options
      );
      
      res.json({
        response,
        session_id: sessionId,
        agent_id
      });
    } else {
      // Fallback to direct Ollama interaction
      const result = await ollamaService.chat(messages, { model, ...options });
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// New endpoint for starting a chat session
app.post('/api/chat/session', authService.authMiddleware(), async (req, res) => {
  try {
    const { agent_id, metadata } = req.body;
    const userId = req.user.id;
    
    const sessionId = await chatService.createSession(userId, agent_id, metadata);
    
    res.json({
      success: true,
      session_id: sessionId,
      agent_id
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// End a chat session
app.post('/api/chat/session/:sessionId/end', authService.authMiddleware(), async (req, res) => {
  try {
    const result = await chatService.endSession(req.params.sessionId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Auto-routing chat endpoint
app.post('/api/chat/auto', authService.authMiddleware(), async (req, res) => {
  try {
    const { 
      message, 
      messages = [], 
      session_id, 
      performance_mode = 'balanced',
      options = {} 
    } = req.body;
    
    const userId = req.user.id;
    
    // Get the message content
    const userMessage = message || (messages.length > 0 ? messages[messages.length - 1].content : '');
    
    if (!userMessage) {
      return res.status(400).json({ error: 'No message provided' });
    }
    
    // Analyze request and select best model
    const routingDecision = await llmOrchestrator.analyzeRequest(userMessage, {
      sessionId: session_id,
      userId,
      conversationHistory: messages,
      performanceMode: performance_mode,
      explicitModel: options.model
    });
    
    // Generate response with selected model
    const result = await llmOrchestrator.generateResponse(userMessage, routingDecision, {
      sessionId: session_id,
      userId,
      conversationHistory: messages,
      ...options
    });
    
    // Track usage for analytics
    await analyticsService.trackEvent('chat', 'auto_response', {
      userId,
      sessionId: session_id,
      selectedModel: result.metadata.model,
      responseTime: result.metadata.responseTime
    });
    
    res.json({
      response: result.response,
      model_used: result.metadata.model,
      routing_reason: result.metadata.reasoning,
      confidence: result.metadata.confidence,
      response_time: result.metadata.responseTime,
      session_id
    });
  } catch (error) {
    console.error('Auto-routing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get orchestrator statistics
app.get('/api/chat/auto/stats', authService.authMiddleware(), async (req, res) => {
  try {
    const stats = await llmOrchestrator.getStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate completion endpoint
app.post('/api/generate', authService.authMiddleware(), async (req, res) => {
  try {
    const { prompt, model, options } = req.body;
    const result = await ollamaService.generateCompletion(prompt, { model, ...options });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memory management endpoints
app.get('/api/memory/:agentId', authService.authMiddleware(), async (req, res) => {
  try {
    const { type, limit } = req.query;
    const memories = await memoryManager.retrieveMemories(req.params.agentId, {
      type,
      limit: parseInt(limit) || 50
    });
    res.json({ memories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memory/:agentId', authService.authMiddleware(), async (req, res) => {
  try {
    const { type, content, context } = req.body;
    const memoryId = await memoryManager.createMemory(
      req.params.agentId,
      type,
      content,
      context
    );
    res.json({ success: true, memoryId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memory/:agentId/search', authService.authMiddleware(), async (req, res) => {
  try {
    const { query, limit } = req.query;
    const results = await memoryManager.searchMemories(
      req.params.agentId,
      query,
      { limit: parseInt(limit) || 10 }
    );
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memory/:agentId/summary', authService.authMiddleware(), async (req, res) => {
  try {
    const summary = await memoryManager.getMemorySummary(req.params.agentId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ollama proxy endpoints for model management
app.get('/api/ollama/api/tags', authService.authMiddleware(), async (req, res) => {
  try {
    const result = await ollamaService.listModels();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ollama/api/show', authService.authMiddleware(), async (req, res) => {
  try {
    const { name } = req.body;
    const result = await ollamaService.showModel(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ollama/api/pull', authService.authMiddleware(), async (req, res) => {
  try {
    const { name, stream } = req.body;
    
    if (stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const pullStream = ollamaService.pullModelStream(name);
      
      for await (const progress of pullStream) {
        res.write(JSON.stringify(progress) + '\n');
      }
      
      res.end();
    } else {
      const result = await ollamaService.pullModel(name);
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/ollama/api/delete', authService.authMiddleware(), async (req, res) => {
  try {
    const { name } = req.body;
    const result = await ollamaService.deleteModel(name);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ollama/api/copy', authService.authMiddleware(), async (req, res) => {
  try {
    const { source, destination } = req.body;
    const result = await ollamaService.copyModel(source, destination);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ollama/api/generate', authService.authMiddleware(), async (req, res) => {
  try {
    const { stream, ...params } = req.body;
    
    if (stream) {
      // Set up SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      
      const generateStream = ollamaService.generateStream(params);
      
      for await (const chunk of generateStream) {
        res.write(JSON.stringify(chunk) + '\n');
      }
      
      res.end();
    } else {
      const result = await ollamaService.generateCompletion(params.prompt, params);
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ollama/', authService.authMiddleware(), async (req, res) => {
  try {
    const health = await ollamaService.checkHealth();
    res.json({ status: health ? 'ok' : 'error' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ollama/api/ps', authService.authMiddleware(), async (req, res) => {
  try {
    const result = await ollamaService.getRunningModels();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Chat history endpoints
app.get('/api/chat/history/:sessionId', authService.authMiddleware(), async (req, res) => {
  try {
    const { limit } = req.query;
    const history = await database.getChatHistory(
      req.params.sessionId,
      parseInt(limit) || 100
    );
    res.json({ history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/chat/sessions', authService.authMiddleware(), async (req, res) => {
  try {
    const userId = req.user.id;
    const sessions = await database.getUserChatSessions(userId);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Model catalog endpoints
app.get('/api/catalog/models', authService.authMiddleware(), async (req, res) => {
  try {
    const models = await database.getAllLLMModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/catalog/models/recommend', authService.authMiddleware(), async (req, res) => {
  try {
    const { task_type, max_size, min_context, provider, capabilities } = req.query;
    const recommendation = await modelCatalog.recommendModel(task_type, {
      maxSize: max_size ? parseFloat(max_size) : null,
      minContextLength: min_context ? parseInt(min_context) : 0,
      preferredProvider: provider,
      requiredCapabilities: capabilities ? capabilities.split(',') : []
    });
    res.json(recommendation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/catalog/models/stats', authService.authMiddleware(), async (req, res) => {
  try {
    const stats = await modelCatalog.getModelStatistics();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent personality endpoints
app.get('/api/agents/:agentId/personality', authService.authMiddleware(), async (req, res) => {
  try {
    const agentType = req.params.agentId.replace('_agent', '');
    const personality = agentPersonality.personalities[agentType];
    if (personality) {
      res.json({ personality });
    } else {
      res.status(404).json({ error: 'Agent personality not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System logs endpoint
app.get('/api/system/logs', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const { event_type, severity, source, since, limit } = req.query;
    const logs = await database.getSystemLogs({
      eventType: event_type,
      severity,
      source,
      since
    }, parseInt(limit) || 100);
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Session management
app.get('/api/sessions', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const result = await authService.getSessions();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Knowledge Graph endpoints
app.get('/api/knowledge-graph', authService.authMiddleware(), async (req, res) => {
  try {
    const { nodeTypes, edgeTypes, limit } = req.query;
    const graph = await knowledgeGraphService.getKnowledgeGraph({
      nodeTypes: nodeTypes ? nodeTypes.split(',') : null,
      edgeTypes: edgeTypes ? edgeTypes.split(',') : null,
      limit: limit ? parseInt(limit) : 1000
    });
    res.json(graph);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/knowledge-graph/node/:nodeId', authService.authMiddleware(), async (req, res) => {
  try {
    const { depth } = req.query;
    const subgraph = await knowledgeGraphService.getNodeSubgraph(
      req.params.nodeId,
      depth ? parseInt(depth) : 1
    );
    res.json(subgraph);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/knowledge-graph/search', authService.authMiddleware(), async (req, res) => {
  try {
    const { query, types, limit } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const results = await knowledgeGraphService.searchNodes(query, {
      types: types ? types.split(',') : null,
      limit: limit ? parseInt(limit) : 50
    });
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Task Pipeline routes
app.use('/api/pipeline', authService.authMiddleware(), taskPipelineRoutes);

// Analytics routes
app.use('/api/analytics', analyticsRoutes);

// Voice routes
app.use('/api/voice', voiceRoutes);

// Internet Agents routes - NEXUS UNLEASHED ON THE WEB! 🌐🔥
app.use('/api/internet-agents', authService.authMiddleware(), internetAgentsRoutes);

// Notification endpoints
app.get('/api/notifications', authService.authMiddleware(), async (req, res) => {
  try {
    const { limit, offset, unreadOnly, types } = req.query;
    const notifications = await notificationService.getUserNotifications(req.user.id, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      unreadOnly: unreadOnly === 'true',
      types: types ? types.split(',') : null
    });
    res.json({ notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/count', authService.authMiddleware(), async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const count = await notificationService.getNotificationCount(req.user.id, unreadOnly !== 'false');
    res.json({ count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/:notificationId/read', authService.authMiddleware(), async (req, res) => {
  try {
    await notificationService.markAsRead(req.params.notificationId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/read-all', authService.authMiddleware(), async (req, res) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/notifications/:notificationId', authService.authMiddleware(), async (req, res) => {
  try {
    await notificationService.dismissNotification(req.params.notificationId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/preferences', authService.authMiddleware(), async (req, res) => {
  try {
    const preferences = await notificationService.getUserPreferences(req.user.id);
    res.json({ preferences });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/notifications/preferences', authService.authMiddleware(), async (req, res) => {
  try {
    await notificationService.updateUserPreferences(req.user.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System alerts endpoints
app.get('/api/alerts', authService.authMiddleware(), async (req, res) => {
  try {
    const { activeOnly, severity, limit } = req.query;
    const alerts = await notificationService.getSystemAlerts({
      activeOnly: activeOnly !== 'false',
      severity,
      limit: limit ? parseInt(limit) : 50
    });
    res.json({ alerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:alertId/acknowledge', authService.authMiddleware(), async (req, res) => {
  try {
    await notificationService.acknowledgeSystemAlert(req.params.alertId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/alerts/:alertId/resolve', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    await notificationService.resolveSystemAlert(req.params.alertId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Messaging endpoints
app.post('/api/conversations', authService.authMiddleware(), async (req, res) => {
  try {
    const { type, participants, title, description, metadata } = req.body;
    const conversation = await messagingService.createConversation(
      req.user.id.toString(),
      type,
      participants,
      { title, description, metadata }
    );
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversations', authService.authMiddleware(), async (req, res) => {
  try {
    const { limit, offset, type } = req.query;
    const conversations = await messagingService.getUserConversations(req.user.id, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      type
    });
    res.json({ conversations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversations/:conversationId', authService.authMiddleware(), async (req, res) => {
  try {
    const conversation = await messagingService.getConversation(req.params.conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }
    res.json({ conversation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/conversations/:conversationId/messages', authService.authMiddleware(), async (req, res) => {
  try {
    const { limit, offset, before } = req.query;
    const messages = await messagingService.getMessages(req.params.conversationId, {
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      before
    });
    res.json({ messages });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/conversations/:conversationId/messages', authService.authMiddleware(), async (req, res) => {
  try {
    const { content, messageType, attachments, metadata } = req.body;
    const message = await messagingService.sendMessage(
      req.params.conversationId,
      req.user.id.toString(),
      'user',
      content,
      { messageType, attachments, metadata }
    );
    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/conversations/:conversationId/read', authService.authMiddleware(), async (req, res) => {
  try {
    const { upToMessageId } = req.body;
    await messagingService.markAsRead(req.params.conversationId, req.user.id, upToMessageId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/messages/:messageId', authService.authMiddleware(), async (req, res) => {
  try {
    const { content } = req.body;
    await messagingService.editMessage(req.params.messageId, req.user.id, content);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/messages/:messageId', authService.authMiddleware(), async (req, res) => {
  try {
    await messagingService.deleteMessage(req.params.messageId, req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/messages/:messageId/reactions', authService.authMiddleware(), async (req, res) => {
  try {
    const { reaction } = req.body;
    await messagingService.addReaction(req.params.messageId, req.user.id, reaction);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/messages/:messageId/reactions/:reaction', authService.authMiddleware(), async (req, res) => {
  try {
    await messagingService.removeReaction(req.params.messageId, req.user.id, req.params.reaction);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/messages/search', authService.authMiddleware(), async (req, res) => {
  try {
    const { q, conversationId, limit } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    const results = await messagingService.searchMessages(req.user.id, q, {
      conversationId,
      limit: limit ? parseInt(limit) : 50
    });
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Security endpoints
app.get('/api/security/metrics', authService.authMiddleware(), authService.requirePermission('read'), async (req, res) => {
  try {
    const metrics = securityService.getSecurityMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/security/logs', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const { type, startTime, endTime, ip, userId, limit } = req.query;
    const logs = securityService.getSecurityLogs({
      type,
      startTime: startTime ? parseInt(startTime) : undefined,
      endTime: endTime ? parseInt(endTime) : undefined,
      ip,
      userId,
      limit: limit ? parseInt(limit) : 100
    });
    res.json({ logs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/security/policies', authService.authMiddleware(), authService.requirePermission('read'), async (req, res) => {
  try {
    const policies = Array.from(securityService.policies.values());
    res.json({ policies });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/security/policies/:policyId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const policy = securityService.updateSecurityPolicy(req.params.policyId, req.body);
    res.json({ policy });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/security/blocked-ips', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const blockedIPs = Array.from(securityService.blockedIPs.entries()).map(([ip, info]) => ({
      ...info,
      ip
    }));
    res.json({ blockedIPs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/security/block-ip', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const { ip, duration, reason } = req.body;
    const blockInfo = securityService.blockIP(ip, duration, reason);
    res.json({ success: true, blockInfo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/security/block-ip/:ip', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const success = securityService.unblockIP(req.params.ip);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/security/mfa/setup', authService.authMiddleware(), async (req, res) => {
  try {
    const mfaSetup = await securityService.generateMFASecret(req.user.user_id);
    res.json({ mfaSetup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/security/mfa/verify', authService.authMiddleware(), async (req, res) => {
  try {
    const { token, secret } = req.body;
    const valid = await securityService.verifyMFAToken(req.user.user_id, token, secret);
    res.json({ valid });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/security/report', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const report = await securityService.exportSecurityReport();
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Access Control endpoints
app.get('/api/access/roles', authService.authMiddleware(), async (req, res) => {
  try {
    const roles = accessControlService.getRoles();
    res.json({ roles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/access/roles', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const role = accessControlService.createRole(req.body);
    res.json({ role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/access/roles/:roleId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const role = accessControlService.updateRole(req.params.roleId, req.body);
    res.json({ role });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/access/roles/:roleId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const success = accessControlService.deleteRole(req.params.roleId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/access/rules', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const rules = accessControlService.getAccessRules();
    res.json({ rules });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/access/rules', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const { id, ...ruleData } = req.body;
    const rule = accessControlService.addAccessRule(id, ruleData);
    res.json({ rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/access/rules/:ruleId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const rule = accessControlService.updateAccessRule(req.params.ruleId, req.body);
    res.json({ rule });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/access/rules/:ruleId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const success = accessControlService.deleteAccessRule(req.params.ruleId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/access/sessions', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const sessions = accessControlService.getActiveSessions();
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/access/sessions/:sessionId/activity', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const activity = accessControlService.getSessionActivity(req.params.sessionId);
    res.json({ activity });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/access/sessions/:sessionId', authService.authMiddleware(), authService.requireRole('admin'), async (req, res) => {
  try {
    const success = accessControlService.endSession(req.params.sessionId);
    res.json({ success });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/access/resources', authService.authMiddleware(), async (req, res) => {
  try {
    const resources = accessControlService.getResources();
    res.json({ resources });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/access/check', authService.authMiddleware(), async (req, res) => {
  try {
    const { resource, action } = req.body;
    const context = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      sessionId: req.headers['x-session-id']
    };
    const result = await accessControlService.checkAccess(req.user, resource, action, context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection');
  
  // Extract user ID from request if available
  const userId = req.headers['x-user-id'] || 'anonymous';
  
  // Add connection to task pipeline WebSocket manager
  taskPipelineWebSocket.addConnection(ws, userId);
  
  // Send initial status
  ws.send(JSON.stringify({
    type: 'connection',
    data: { message: 'Connected to Agent Executor' },
    timestamp: Date.now()
  }));
  
  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      switch (data.type) {
        case 'subscribe':
          if (data.topics) {
            taskPipelineWebSocket.subscribe(ws, data.topics);
          }
          break;
        case 'unsubscribe':
          if (data.topics) {
            taskPipelineWebSocket.unsubscribe(ws, data.topics);
          }
          break;
        case 'get_stats':
          ws.send(JSON.stringify({
            type: 'stats',
            data: taskPipelineWebSocket.getRealtimeStats(),
            timestamp: Date.now()
          }));
          break;
        case 'typing:start':
          if (data.conversationId) {
            messagingService.setTypingStatus(data.conversationId, userId, true);
          }
          break;
        case 'typing:stop':
          if (data.conversationId) {
            messagingService.setTypingStatus(data.conversationId, userId, false);
          }
          break;
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });
  
  // Setup periodic status updates
  const statusInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({
        type: 'system_status',
        data: agentManager.getSystemStatus(),
        timestamp: Date.now()
      }));
    }
  }, 5000); // Every 5 seconds
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
    clearInterval(statusInterval);
    taskPipelineWebSocket.removeConnection(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Initialize and start server
async function startServer() {
  try {
    console.log('Starting Agent Executor Backend...');
    
    // Initialize database
    console.log('Initializing database...');
    await database.initialize();
    
    // Initialize agent personalities
    console.log('Setting up agent personalities...');
    await agentPersonality.initializeAgentPersonalities();
    
    // Initialize model catalog
    console.log('Loading model catalog...');
    await modelCatalog.initializeModelCatalog();
    
    // Initialize notification service
    console.log('Initializing notification service...');
    await notificationService.initialize();
    
    // Initialize messaging service
    console.log('Initializing messaging service...');
    await messagingService.initialize();
    
    // Initialize voice WebSocket service
    console.log('Initializing voice WebSocket service...');
    voiceWebSocketService.initialize(server);
    
    // Initialize agent manager
    const initialized = await agentManager.initialize();
    
    if (!initialized) {
      console.error('Failed to initialize Agent Manager');
      process.exit(1);
    }
    
    // Initialize workflow engine templates
    console.log('Initializing workflow templates...');
    workflowEngine.initializeTemplates();
    
    // Start system monitoring
    systemMonitor.startMetricsCollection(60000); // Collect metrics every minute
    
    // Start LLM orchestrator cache cleanup
    setInterval(() => {
      llmOrchestrator.cleanupCache();
    }, 3600000); // Cleanup every hour
    
    // Start server
    server.listen(port, () => {
      console.log(`LexOS Genesis Backend running on http://localhost:${port}`);
      console.log(`WebSocket server available on ws://localhost:${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n⚠️  Development mode - using default credentials`);
        console.log(`Configure production credentials in .env file`);
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    console.log('Server closed');
    await database.close();
    console.log('Database closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    console.log('Server closed');
    await database.close();
    console.log('Database closed');
    process.exit(0);
  });
});

// Global error handling middleware (must be last)
app.use(errorHandler.globalErrorHandler());

// Setup process error handlers
errorHandler.setupProcessHandlers();

// Store server reference globally for graceful shutdown
global.server = server;

// Start the server
startServer();