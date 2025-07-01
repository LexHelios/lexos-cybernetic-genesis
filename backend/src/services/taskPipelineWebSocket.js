import taskQueue from './taskQueue.js';
import workflowEngine from './workflowEngine.js';

class TaskPipelineWebSocket {
  constructor() {
    this.connections = new Map(); // ws -> { userId, subscriptions }
    this.userConnections = new Map(); // userId -> Set of ws
    
    // Subscribe to task queue events
    taskQueue.on('task:enqueued', this.handleTaskEnqueued.bind(this));
    taskQueue.on('task:started', this.handleTaskStarted.bind(this));
    taskQueue.on('task:completed', this.handleTaskCompleted.bind(this));
    taskQueue.on('task:failed', this.handleTaskFailed.bind(this));
    taskQueue.on('task:retrying', this.handleTaskRetrying.bind(this));
    taskQueue.on('task:cancelled', this.handleTaskCancelled.bind(this));
    taskQueue.on('queue:paused', this.handleQueuePaused.bind(this));
    taskQueue.on('queue:resumed', this.handleQueueResumed.bind(this));
    
    // Subscribe to workflow engine events
    workflowEngine.on('workflow:created', this.handleWorkflowCreated.bind(this));
    workflowEngine.on('workflow:started', this.handleWorkflowStarted.bind(this));
    workflowEngine.on('workflow:completed', this.handleWorkflowCompleted.bind(this));
    workflowEngine.on('workflow:failed', this.handleWorkflowFailed.bind(this));
    workflowEngine.on('workflow:cancelled', this.handleWorkflowCancelled.bind(this));
    workflowEngine.on('node:started', this.handleNodeStarted.bind(this));
    workflowEngine.on('node:completed', this.handleNodeCompleted.bind(this));
    workflowEngine.on('node:failed', this.handleNodeFailed.bind(this));
  }

  addConnection(ws, userId) {
    this.connections.set(ws, {
      userId,
      subscriptions: new Set(['all']) // Default subscription
    });
    
    // Track user connections
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(ws);
    
    // Send initial state
    this.sendInitialState(ws);
  }

  removeConnection(ws) {
    const connection = this.connections.get(ws);
    if (connection) {
      const userSockets = this.userConnections.get(connection.userId);
      if (userSockets) {
        userSockets.delete(ws);
        if (userSockets.size === 0) {
          this.userConnections.delete(connection.userId);
        }
      }
    }
    this.connections.delete(ws);
  }

  subscribe(ws, topics) {
    const connection = this.connections.get(ws);
    if (connection) {
      topics.forEach(topic => connection.subscriptions.add(topic));
    }
  }

  unsubscribe(ws, topics) {
    const connection = this.connections.get(ws);
    if (connection) {
      topics.forEach(topic => connection.subscriptions.delete(topic));
    }
  }

  sendInitialState(ws) {
    const stats = taskQueue.getAllStats();
    const workflowStats = workflowEngine.getStats();
    
    this.sendToConnection(ws, {
      type: 'initial_state',
      data: {
        queues: stats,
        workflows: workflowStats,
        timestamp: new Date().toISOString()
      }
    });
  }

  broadcast(message, filter = null) {
    this.connections.forEach((connection, ws) => {
      if (ws.readyState === ws.OPEN) {
        // Apply subscription filter
        if (filter && !connection.subscriptions.has('all') && 
            !connection.subscriptions.has(filter)) {
          return;
        }
        
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('Error sending WebSocket message:', error);
        }
      }
    });
  }

  sendToUser(userId, message) {
    const userSockets = this.userConnections.get(userId);
    if (userSockets) {
      userSockets.forEach(ws => {
        if (ws.readyState === ws.OPEN) {
          try {
            ws.send(JSON.stringify(message));
          } catch (error) {
            console.error('Error sending WebSocket message to user:', error);
          }
        }
      });
    }
  }

  sendToConnection(ws, message) {
    if (ws.readyState === ws.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
      }
    }
  }

  // Task Queue Event Handlers
  handleTaskEnqueued(task) {
    this.broadcast({
      type: 'task:enqueued',
      data: {
        task: this.sanitizeTask(task),
        queueStats: taskQueue.getQueueStats(task.queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${task.queueName}`);
  }

  handleTaskStarted(task) {
    this.broadcast({
      type: 'task:started',
      data: {
        task: this.sanitizeTask(task),
        queueStats: taskQueue.getQueueStats(task.queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${task.queueName}`);
  }

  handleTaskCompleted(task) {
    this.broadcast({
      type: 'task:completed',
      data: {
        task: this.sanitizeTask(task),
        queueStats: taskQueue.getQueueStats(task.queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${task.queueName}`);
  }

  handleTaskFailed(task) {
    this.broadcast({
      type: 'task:failed',
      data: {
        task: this.sanitizeTask(task),
        queueStats: taskQueue.getQueueStats(task.queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${task.queueName}`);
  }

  handleTaskRetrying(task) {
    this.broadcast({
      type: 'task:retrying',
      data: {
        task: this.sanitizeTask(task),
        queueStats: taskQueue.getQueueStats(task.queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${task.queueName}`);
  }

  handleTaskCancelled(task) {
    this.broadcast({
      type: 'task:cancelled',
      data: {
        task: this.sanitizeTask(task),
        queueStats: taskQueue.getQueueStats(task.queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${task.queueName}`);
  }

  handleQueuePaused(queueName) {
    this.broadcast({
      type: 'queue:paused',
      data: {
        queueName,
        queueStats: taskQueue.getQueueStats(queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${queueName}`);
  }

  handleQueueResumed(queueName) {
    this.broadcast({
      type: 'queue:resumed',
      data: {
        queueName,
        queueStats: taskQueue.getQueueStats(queueName),
        timestamp: new Date().toISOString()
      }
    }, `queue:${queueName}`);
  }

  // Workflow Engine Event Handlers
  handleWorkflowCreated(workflow) {
    this.broadcast({
      type: 'workflow:created',
      data: {
        workflow: this.sanitizeWorkflow(workflow),
        timestamp: new Date().toISOString()
      }
    }, 'workflows');
  }

  handleWorkflowStarted(instance) {
    this.broadcast({
      type: 'workflow:started',
      data: {
        instance: this.sanitizeWorkflowInstance(instance),
        timestamp: new Date().toISOString()
      }
    }, `workflow:${instance.workflowId}`);
  }

  handleWorkflowCompleted(instance) {
    this.broadcast({
      type: 'workflow:completed',
      data: {
        instance: this.sanitizeWorkflowInstance(instance),
        timestamp: new Date().toISOString()
      }
    }, `workflow:${instance.workflowId}`);
  }

  handleWorkflowFailed(instance) {
    this.broadcast({
      type: 'workflow:failed',
      data: {
        instance: this.sanitizeWorkflowInstance(instance),
        timestamp: new Date().toISOString()
      }
    }, `workflow:${instance.workflowId}`);
  }

  handleWorkflowCancelled(instance) {
    this.broadcast({
      type: 'workflow:cancelled',
      data: {
        instance: this.sanitizeWorkflowInstance(instance),
        timestamp: new Date().toISOString()
      }
    }, `workflow:${instance.workflowId}`);
  }

  handleNodeStarted({ instanceId, nodeId, node }) {
    const instance = workflowEngine.getWorkflowInstance(instanceId);
    this.broadcast({
      type: 'node:started',
      data: {
        instanceId,
        nodeId,
        node: this.sanitizeNode(node),
        nodeState: instance.nodeStates.get(nodeId),
        timestamp: new Date().toISOString()
      }
    }, `workflow:${instance.workflowId}`);
  }

  handleNodeCompleted({ instanceId, nodeId, result }) {
    const instance = workflowEngine.getWorkflowInstance(instanceId);
    this.broadcast({
      type: 'node:completed',
      data: {
        instanceId,
        nodeId,
        nodeState: instance.nodeStates.get(nodeId),
        result: this.sanitizeResult(result),
        timestamp: new Date().toISOString()
      }
    }, `workflow:${instance.workflowId}`);
  }

  handleNodeFailed({ instanceId, nodeId, error }) {
    const instance = workflowEngine.getWorkflowInstance(instanceId);
    this.broadcast({
      type: 'node:failed',
      data: {
        instanceId,
        nodeId,
        nodeState: instance.nodeStates.get(nodeId),
        error: error,
        timestamp: new Date().toISOString()
      }
    }, `workflow:${instance.workflowId}`);
  }

  // Sanitization methods to avoid sending sensitive data
  sanitizeTask(task) {
    return {
      id: task.id,
      queueName: task.queueName,
      priority: task.priority,
      status: task.status,
      retries: task.retries,
      maxRetries: task.maxRetries,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      failedAt: task.failedAt,
      duration: task.duration,
      metadata: task.metadata,
      data: {
        type: task.data.type,
        // Exclude sensitive config data
      }
    };
  }

  sanitizeWorkflow(workflow) {
    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodeCount: workflow.nodes.size,
      edgeCount: workflow.edges.length,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt
    };
  }

  sanitizeWorkflowInstance(instance) {
    const nodeStatesArray = Array.from(instance.nodeStates.entries()).map(([id, state]) => ({
      id,
      status: state.status,
      startedAt: state.startedAt,
      completedAt: state.completedAt
    }));

    return {
      id: instance.id,
      workflowId: instance.workflowId,
      status: instance.status,
      startedAt: instance.startedAt,
      completedAt: instance.completedAt,
      duration: instance.duration,
      nodeStates: nodeStatesArray,
      executionPath: instance.executionPath,
      currentNodes: instance.currentNodes
    };
  }

  sanitizeNode(node) {
    return {
      id: node.id,
      type: node.type,
      name: node.name,
      position: node.position
    };
  }

  sanitizeResult(result) {
    // Remove any potentially sensitive data from results
    if (typeof result === 'object' && result !== null) {
      const sanitized = {};
      for (const [key, value] of Object.entries(result)) {
        if (!['password', 'token', 'secret', 'key'].some(sensitive => 
          key.toLowerCase().includes(sensitive))) {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    return result;
  }

  // Get real-time stats
  getRealtimeStats() {
    return {
      connections: this.connections.size,
      users: this.userConnections.size,
      queues: taskQueue.getAllStats(),
      workflows: workflowEngine.getStats()
    };
  }
}

export default new TaskPipelineWebSocket();