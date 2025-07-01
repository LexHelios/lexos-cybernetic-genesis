import express from 'express';
import taskQueue from '../services/taskQueue.js';
import workflowEngine from '../services/workflowEngine.js';
import taskExecutor from '../services/taskExecutor.js';

const router = express.Router();

// Task Queue endpoints
router.get('/queues', async (req, res) => {
  try {
    const stats = taskQueue.getAllStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/queues/:queueName', async (req, res) => {
  try {
    const stats = taskQueue.getQueueStats(req.params.queueName);
    if (!stats) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/queues', async (req, res) => {
  try {
    const { name, options } = req.body;
    const queue = taskQueue.createQueue(name, options);
    res.json({ success: true, queue: { name: queue.name, priority: queue.priority } });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/queues/:queueName/pause', async (req, res) => {
  try {
    taskQueue.pauseQueue(req.params.queueName);
    res.json({ success: true, message: 'Queue paused' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/queues/:queueName/resume', async (req, res) => {
  try {
    taskQueue.resumeQueue(req.params.queueName);
    res.json({ success: true, message: 'Queue resumed' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/queues/:queueName/clear', async (req, res) => {
  try {
    taskQueue.clearQueue(req.params.queueName);
    res.json({ success: true, message: 'Queue cleared' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Task endpoints
router.post('/tasks', async (req, res) => {
  try {
    const { queueName = 'default', data, options } = req.body;
    const task = taskQueue.enqueue(queueName, data, options);
    res.json({ 
      success: true, 
      task: {
        id: task.id,
        queueName: task.queueName,
        status: task.status,
        priority: task.priority,
        createdAt: task.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/tasks/:taskId', async (req, res) => {
  try {
    const task = taskQueue.getTask(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/tasks/:taskId/cancel', async (req, res) => {
  try {
    const success = taskQueue.cancelTask(req.params.taskId);
    if (!success) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ success: true, message: 'Task cancelled' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Workflow endpoints
router.get('/workflows', async (req, res) => {
  try {
    const workflows = Array.from(workflowEngine.workflows.values()).map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      nodeCount: w.nodes.size,
      edgeCount: w.edges.length,
      createdAt: w.createdAt
    }));
    res.json({ workflows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows', async (req, res) => {
  try {
    const workflow = workflowEngine.createWorkflow(req.body);
    res.json({ 
      success: true, 
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodeCount: workflow.nodes.size,
        edgeCount: workflow.edges.length,
        createdAt: workflow.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/workflows/:workflowId', async (req, res) => {
  try {
    const workflow = workflowEngine.workflows.get(req.params.workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Convert Map to array for JSON serialization
    const nodes = Array.from(workflow.nodes.values());
    
    res.json({
      ...workflow,
      nodes
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/:workflowId/execute', async (req, res) => {
  try {
    const { input } = req.body;
    const instance = await workflowEngine.executeWorkflow(req.params.workflowId, input);
    res.json({ 
      success: true, 
      instance: {
        id: instance.id,
        workflowId: instance.workflowId,
        status: instance.status,
        startedAt: instance.startedAt
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.get('/workflows/:workflowId/instances', async (req, res) => {
  try {
    const instances = workflowEngine.getWorkflowInstances(req.params.workflowId);
    res.json({ 
      instances: instances.map(i => ({
        id: i.id,
        status: i.status,
        startedAt: i.startedAt,
        completedAt: i.completedAt,
        duration: i.duration
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Workflow templates
router.get('/templates', async (req, res) => {
  try {
    const templates = Array.from(workflowEngine.templates.entries()).map(([name, template]) => ({
      name,
      description: template.description,
      nodeCount: template.nodes ? template.nodes.length : 0,
      edgeCount: template.edges ? template.edges.length : 0
    }));
    res.json({ templates });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/workflows/from-template', async (req, res) => {
  try {
    const { templateName, overrides } = req.body;
    const workflow = workflowEngine.createWorkflowFromTemplate(templateName, overrides);
    res.json({ 
      success: true, 
      workflow: {
        id: workflow.id,
        name: workflow.name,
        description: workflow.description,
        nodeCount: workflow.nodes.size,
        edgeCount: workflow.edges.length,
        createdAt: workflow.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Workflow instance endpoints
router.get('/instances/:instanceId', async (req, res) => {
  try {
    const instance = workflowEngine.getWorkflowInstance(req.params.instanceId);
    if (!instance) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }
    
    // Convert Maps to arrays for JSON serialization
    const nodeStates = Array.from(instance.nodeStates.entries()).map(([id, state]) => ({
      id,
      ...state
    }));
    
    res.json({
      ...instance,
      nodeStates
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/instances/:instanceId/cancel', async (req, res) => {
  try {
    const success = workflowEngine.cancelWorkflowInstance(req.params.instanceId);
    if (!success) {
      return res.status(404).json({ error: 'Workflow instance not found' });
    }
    res.json({ success: true, message: 'Workflow instance cancelled' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Task executor endpoints
router.get('/executors', async (req, res) => {
  try {
    const executors = Array.from(taskExecutor.executors.keys());
    res.json({ executors });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/executors/test', async (req, res) => {
  try {
    const { type, config } = req.body;
    const result = await taskExecutor.execute({
      data: { type, config },
      id: `test-${Date.now()}`
    });
    res.json({ success: true, result });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const queueStats = taskQueue.getAllStats();
    const workflowStats = workflowEngine.getStats();
    
    res.json({
      queues: queueStats,
      workflows: workflowStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;