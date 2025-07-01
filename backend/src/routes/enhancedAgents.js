import express from 'express';
import enhancedAgentManager from '../services/enhancedAgentManager.js';

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

export default router;