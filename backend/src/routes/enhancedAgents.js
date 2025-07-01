import express from 'express';
import enhancedAgentManager from '../services/enhancedAgentManager.js';
import healthMonitor from '../services/healthMonitor.js';
import confidenceGate from '../services/confidenceGate.js';
import vectorMemory from '../services/vectorMemory.js';

const router = express.Router();

// Initialize agent manager
(async () => {
  try {
    await enhancedAgentManager.initialize();
  } catch (error) {
    console.error('Failed to initialize enhanced agent manager:', error);
  }
})();

// Get all agents status
router.get('/status', async (req, res) => {
  try {
    const status = enhancedAgentManager.getSystemStatus();
    res.json({
      success: true,
      ...status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get specific agent details
router.get('/:agentId', async (req, res) => {
  try {
    const agent = enhancedAgentManager.getAgent(req.params.agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    res.json({
      success: true,
      agent: agent.getStatus()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Route task automatically
router.post('/route', async (req, res) => {
  try {
    const { message, context, options } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const result = await enhancedAgentManager.routeTask({
      message,
      context,
      options,
      type: 'generate'
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Routing error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute task on specific agent
router.post('/:agentId/execute', async (req, res) => {
  try {
    const { agentId } = req.params;
    const task = req.body;
    
    const result = await enhancedAgentManager.executeOnAgent(agentId, task);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Execution error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Chat with chat agent
router.post('/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        error: 'Message is required'
      });
    }
    
    const result = await enhancedAgentManager.executeOnAgent('chat', {
      type: 'chat',
      message,
      sessionId
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Code generation
router.post('/code/generate', async (req, res) => {
  try {
    const { description, language, framework, requirements } = req.body;
    
    if (!description) {
      return res.status(400).json({
        success: false,
        error: 'Description is required'
      });
    }
    
    const result = await enhancedAgentManager.executeOnAgent('code', {
      type: 'generate_code',
      description,
      language,
      framework,
      requirements
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reasoning task
router.post('/reason', async (req, res) => {
  try {
    const { query, context, type = 'deep_analysis' } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    const result = await enhancedAgentManager.executeOnAgent('reasoning', {
      type,
      query,
      context
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Creative writing
router.post('/creative/write', async (req, res) => {
  try {
    const { type = 'write_story', ...params } = req.body;
    
    const result = await enhancedAgentManager.executeOnAgent('creative_writing', {
      type,
      ...params
    });
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Switch agent model
router.post('/:agentId/model', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { model } = req.body;
    
    if (!model) {
      return res.status(400).json({
        success: false,
        error: 'Model name is required'
      });
    }
    
    const success = await enhancedAgentManager.switchAgentModel(agentId, model);
    
    res.json({
      success,
      message: success ? 'Model switched successfully' : 'Failed to switch model'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get agent metrics
router.get('/:agentId/metrics', async (req, res) => {
  try {
    const metrics = await enhancedAgentManager.getAgentMetrics(req.params.agentId);
    
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Pause/resume agent
router.post('/:agentId/control', async (req, res) => {
  try {
    const { agentId } = req.params;
    const { action } = req.body;
    
    if (!['pause', 'resume', 'restart'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be pause, resume, or restart'
      });
    }
    
    const agent = enhancedAgentManager.getAgent(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        error: 'Agent not found'
      });
    }
    
    let result;
    switch (action) {
      case 'pause':
        agent.status = 'paused';
        result = { status: 'paused', message: 'Agent paused successfully' };
        break;
      case 'resume':
        agent.status = 'ready';
        result = { status: 'ready', message: 'Agent resumed successfully' };
        break;
      case 'restart':
        agent.status = 'initializing';
        setTimeout(() => { agent.status = 'ready'; }, 2000);
        result = { status: 'restarting', message: 'Agent restarting...' };
        break;
    }
    
    res.json({
      success: true,
      ...result,
      agentId
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all agents for display
router.get('/list/all', async (req, res) => {
  try {
    const agents = enhancedAgentManager.getAllAgents();
    const agentList = agents.map(agent => ({
      id: agent.id,
      name: agent.name,
      status: agent.status,
      currentModel: agent.currentModel,
      purpose: agent.purpose,
      capabilities: agent.capabilities,
      metrics: agent.getMetrics ? agent.getMetrics() : agent.metrics
    }));
    
    res.json({
      success: true,
      agents: agentList
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Orchestrate complex task across multiple agents
router.post('/orchestrate', async (req, res) => {
  try {
    const { task, description, requirements = [] } = req.body;
    
    if (!task || !description) {
      return res.status(400).json({
        success: false,
        error: 'Task and description are required'
      });
    }
    
    // Analyze task and determine which agents to involve
    const analysis = await enhancedAgentManager.executeOnAgent('orchestrator', {
      type: 'analyze_task',
      task,
      description,
      requirements
    });
    
    res.json({
      success: true,
      orchestration: {
        task,
        analysis: analysis.response,
        suggestedAgents: analysis.suggestedAgents || ['reasoning', 'code'],
        estimatedTime: '2-5 minutes'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health monitoring endpoints
router.get('/health', async (req, res) => {
  try {
    const healthReport = healthMonitor.getHealthReport();
    res.json({
      success: true,
      ...healthReport
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Confidence metrics endpoint
router.get('/confidence/metrics', async (req, res) => {
  try {
    const confidenceMetrics = confidenceGate.getMetrics();
    res.json({
      success: true,
      ...confidenceMetrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reset monitoring metrics (useful for testing)
router.post('/monitoring/reset', async (req, res) => {
  try {
    confidenceGate.resetMetrics();
    res.json({
      success: true,
      message: 'Monitoring metrics reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Vector memory endpoints
router.get('/memory/stats', async (req, res) => {
  try {
    const stats = vectorMemory.getStats();
    res.json({
      success: true,
      ...stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/memory/store', async (req, res) => {
  try {
    const { agentId, content, context, metadata } = req.body;
    
    if (!agentId || !content) {
      return res.status(400).json({
        success: false,
        error: 'agentId and content are required'
      });
    }
    
    const memoryId = await vectorMemory.storeMemory(agentId, content, context, metadata);
    
    res.json({
      success: true,
      memoryId,
      message: 'Memory stored successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

router.post('/memory/retrieve', async (req, res) => {
  try {
    const { agentId, query, limit = 5 } = req.body;
    
    if (!agentId || !query) {
      return res.status(400).json({
        success: false,
        error: 'agentId and query are required'
      });
    }
    
    const memories = await vectorMemory.retrieveMemories(agentId, query, limit);
    
    res.json({
      success: true,
      memories,
      count: memories.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;