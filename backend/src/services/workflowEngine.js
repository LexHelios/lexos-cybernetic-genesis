import EventEmitter from 'events';
import { v4 as uuidv4 } from 'uuid';
import taskQueue from './taskQueue.js';

class WorkflowEngine extends EventEmitter {
  constructor() {
    super();
    this.workflows = new Map(); // workflow id -> workflow definition
    this.workflowInstances = new Map(); // instance id -> workflow execution state
    this.templates = new Map(); // template name -> workflow template
    
    // Initialize default queues
    taskQueue.createQueue('high-priority', { priority: 100, concurrency: 5 });
    taskQueue.createQueue('default', { priority: 50, concurrency: 10 });
    taskQueue.createQueue('low-priority', { priority: 10, concurrency: 3 });
    
    // Listen to task events
    taskQueue.on('task:completed', this.handleTaskCompleted.bind(this));
    taskQueue.on('task:failed', this.handleTaskFailed.bind(this));
  }

  createWorkflow(definition) {
    const workflow = {
      id: uuidv4(),
      name: definition.name,
      description: definition.description,
      nodes: new Map(),
      edges: [],
      triggers: definition.triggers || [],
      variables: definition.variables || {},
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Add nodes
    if (definition.nodes) {
      for (const node of definition.nodes) {
        workflow.nodes.set(node.id, {
          id: node.id,
          type: node.type,
          name: node.name,
          config: node.config || {},
          position: node.position || { x: 0, y: 0 }
        });
      }
    }

    // Add edges (dependencies)
    if (definition.edges) {
      workflow.edges = definition.edges.map(edge => ({
        id: uuidv4(),
        source: edge.source,
        target: edge.target,
        condition: edge.condition || null
      }));
    }

    this.workflows.set(workflow.id, workflow);
    this.emit('workflow:created', workflow);
    
    return workflow;
  }

  async executeWorkflow(workflowId, input = {}) {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const instance = {
      id: uuidv4(),
      workflowId,
      status: 'running',
      startedAt: new Date(),
      input,
      variables: { ...workflow.variables, ...input },
      nodeStates: new Map(),
      executionPath: [],
      currentNodes: []
    };

    // Initialize node states
    for (const [nodeId, node] of workflow.nodes) {
      instance.nodeStates.set(nodeId, {
        status: 'pending',
        result: null,
        error: null,
        startedAt: null,
        completedAt: null,
        taskId: null
      });
    }

    this.workflowInstances.set(instance.id, instance);
    this.emit('workflow:started', instance);

    // Find start nodes (nodes with no incoming edges)
    const startNodes = this.findStartNodes(workflow);
    
    // Execute start nodes
    for (const nodeId of startNodes) {
      await this.executeNode(instance.id, nodeId);
    }

    return instance;
  }

  findStartNodes(workflow) {
    const hasIncoming = new Set();
    for (const edge of workflow.edges) {
      hasIncoming.add(edge.target);
    }

    const startNodes = [];
    for (const nodeId of workflow.nodes.keys()) {
      if (!hasIncoming.has(nodeId)) {
        startNodes.push(nodeId);
      }
    }

    return startNodes;
  }

  async executeNode(instanceId, nodeId) {
    const instance = this.workflowInstances.get(instanceId);
    const workflow = this.workflows.get(instance.workflowId);
    const node = workflow.nodes.get(nodeId);
    
    if (!instance || !node) return;

    const nodeState = instance.nodeStates.get(nodeId);
    if (nodeState.status !== 'pending') return; // Already processed

    // Check if dependencies are satisfied
    const dependencies = this.getNodeDependencies(workflow, nodeId);
    const dependencyTaskIds = [];
    
    for (const depNodeId of dependencies) {
      const depState = instance.nodeStates.get(depNodeId);
      if (depState.status !== 'completed') {
        return; // Dependencies not ready
      }
      if (depState.taskId) {
        dependencyTaskIds.push(depState.taskId);
      }
    }

    // Mark as running
    nodeState.status = 'running';
    nodeState.startedAt = new Date();
    instance.currentNodes.push(nodeId);
    instance.executionPath.push({ nodeId, timestamp: new Date() });

    // Create task configuration
    const taskConfig = await this.buildTaskConfig(node, instance);
    
    // Determine queue based on node priority
    const queueName = node.config.priority === 'high' ? 'high-priority' : 
                     node.config.priority === 'low' ? 'low-priority' : 'default';

    // Enqueue task
    const task = taskQueue.enqueue(queueName, {
      type: node.type,
      workflowInstanceId: instanceId,
      nodeId,
      config: taskConfig
    }, {
      dependencies: dependencyTaskIds,
      timeout: node.config.timeout || 60000,
      maxRetries: node.config.maxRetries || 3,
      metadata: {
        workflowId: instance.workflowId,
        workflowName: workflow.name,
        nodeName: node.name
      }
    });

    nodeState.taskId = task.id;
    this.emit('node:started', { instanceId, nodeId, node });
  }

  async buildTaskConfig(node, instance) {
    const config = { ...node.config };
    
    // Replace variables in config
    const replaceVariables = (obj) => {
      if (typeof obj === 'string') {
        // Replace {{variable}} patterns
        return obj.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
          return instance.variables[varName] || match;
        });
      } else if (Array.isArray(obj)) {
        return obj.map(replaceVariables);
      } else if (typeof obj === 'object' && obj !== null) {
        const result = {};
        for (const [key, value] of Object.entries(obj)) {
          result[key] = replaceVariables(value);
        }
        return result;
      }
      return obj;
    };

    return replaceVariables(config);
  }

  getNodeDependencies(workflow, nodeId) {
    const dependencies = [];
    for (const edge of workflow.edges) {
      if (edge.target === nodeId) {
        dependencies.push(edge.source);
      }
    }
    return dependencies;
  }

  getNodeDependents(workflow, nodeId) {
    const dependents = [];
    for (const edge of workflow.edges) {
      if (edge.source === nodeId) {
        dependents.push(edge.target);
      }
    }
    return dependents;
  }

  async handleTaskCompleted(task) {
    if (!task.data.workflowInstanceId) return;

    const instance = this.workflowInstances.get(task.data.workflowInstanceId);
    if (!instance) return;

    const nodeState = instance.nodeStates.get(task.data.nodeId);
    if (!nodeState) return;

    // Update node state
    nodeState.status = 'completed';
    nodeState.completedAt = new Date();
    nodeState.result = task.result;
    
    // Update instance variables with task result
    if (task.result && typeof task.result === 'object') {
      Object.assign(instance.variables, task.result);
    }

    // Remove from current nodes
    const index = instance.currentNodes.indexOf(task.data.nodeId);
    if (index > -1) {
      instance.currentNodes.splice(index, 1);
    }

    this.emit('node:completed', { 
      instanceId: task.data.workflowInstanceId, 
      nodeId: task.data.nodeId,
      result: task.result 
    });

    // Execute dependent nodes
    const workflow = this.workflows.get(instance.workflowId);
    const dependents = this.getNodeDependents(workflow, task.data.nodeId);
    
    for (const dependentId of dependents) {
      // Check edge conditions
      const edge = workflow.edges.find(e => 
        e.source === task.data.nodeId && e.target === dependentId
      );
      
      if (edge && edge.condition) {
        if (!this.evaluateCondition(edge.condition, instance)) {
          continue; // Skip this path
        }
      }
      
      await this.executeNode(instance.id, dependentId);
    }

    // Check if workflow is complete
    this.checkWorkflowCompletion(instance.id);
  }

  async handleTaskFailed(task) {
    if (!task.data.workflowInstanceId) return;

    const instance = this.workflowInstances.get(task.data.workflowInstanceId);
    if (!instance) return;

    const nodeState = instance.nodeStates.get(task.data.nodeId);
    if (!nodeState) return;

    // Update node state
    nodeState.status = 'failed';
    nodeState.completedAt = new Date();
    nodeState.error = task.error;

    // Remove from current nodes
    const index = instance.currentNodes.indexOf(task.data.nodeId);
    if (index > -1) {
      instance.currentNodes.splice(index, 1);
    }

    this.emit('node:failed', { 
      instanceId: task.data.workflowInstanceId, 
      nodeId: task.data.nodeId,
      error: task.error 
    });

    // Mark workflow as failed (can be configured to continue on failure)
    instance.status = 'failed';
    instance.completedAt = new Date();
    instance.error = `Node ${task.data.nodeId} failed: ${task.error}`;
    
    this.emit('workflow:failed', instance);
  }

  evaluateCondition(condition, instance) {
    try {
      // Simple condition evaluation
      // Format: "variable operator value"
      const [variable, operator, value] = condition.split(' ');
      const varValue = instance.variables[variable];

      switch (operator) {
        case '==':
          return varValue == value;
        case '!=':
          return varValue != value;
        case '>':
          return Number(varValue) > Number(value);
        case '<':
          return Number(varValue) < Number(value);
        case '>=':
          return Number(varValue) >= Number(value);
        case '<=':
          return Number(varValue) <= Number(value);
        case 'contains':
          return String(varValue).includes(value);
        default:
          return true;
      }
    } catch (error) {
      console.error('Error evaluating condition:', error);
      return true; // Default to true on error
    }
  }

  checkWorkflowCompletion(instanceId) {
    const instance = this.workflowInstances.get(instanceId);
    if (!instance) return;

    // Check if all nodes are completed or failed
    let allCompleted = true;
    let hasFailed = false;
    
    for (const [nodeId, state] of instance.nodeStates) {
      if (state.status === 'pending' || state.status === 'running') {
        allCompleted = false;
        break;
      }
      if (state.status === 'failed') {
        hasFailed = true;
      }
    }

    if (allCompleted) {
      instance.status = hasFailed ? 'completed_with_errors' : 'completed';
      instance.completedAt = new Date();
      instance.duration = instance.completedAt - instance.startedAt;
      
      this.emit('workflow:completed', instance);
    }
  }

  getWorkflowInstance(instanceId) {
    return this.workflowInstances.get(instanceId);
  }

  getWorkflowInstances(workflowId) {
    const instances = [];
    for (const [id, instance] of this.workflowInstances) {
      if (instance.workflowId === workflowId) {
        instances.push(instance);
      }
    }
    return instances;
  }

  cancelWorkflowInstance(instanceId) {
    const instance = this.workflowInstances.get(instanceId);
    if (!instance) return false;

    // Cancel all running tasks
    for (const [nodeId, state] of instance.nodeStates) {
      if (state.status === 'running' && state.taskId) {
        taskQueue.cancelTask(state.taskId);
        state.status = 'cancelled';
      } else if (state.status === 'pending') {
        state.status = 'cancelled';
      }
    }

    instance.status = 'cancelled';
    instance.completedAt = new Date();
    
    this.emit('workflow:cancelled', instance);
    return true;
  }

  // Predefined workflow templates
  createTemplate(name, definition) {
    this.templates.set(name, definition);
  }

  createWorkflowFromTemplate(templateName, overrides = {}) {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    const definition = {
      ...template,
      ...overrides,
      nodes: [...(template.nodes || [])],
      edges: [...(template.edges || [])]
    };

    return this.createWorkflow(definition);
  }

  // Initialize default templates
  initializeTemplates() {
    // Data Processing Pipeline
    this.createTemplate('data-processing', {
      name: 'Data Processing Pipeline',
      description: 'Extract, transform, and load data',
      nodes: [
        { id: 'extract', type: 'data-fetch', name: 'Extract Data', config: { source: '{{dataSource}}' } },
        { id: 'validate', type: 'data-validate', name: 'Validate Data', config: { schema: '{{schema}}' } },
        { id: 'transform', type: 'data-transform', name: 'Transform Data', config: { rules: '{{transformRules}}' } },
        { id: 'load', type: 'data-store', name: 'Load Data', config: { destination: '{{destination}}' } }
      ],
      edges: [
        { source: 'extract', target: 'validate' },
        { source: 'validate', target: 'transform' },
        { source: 'transform', target: 'load' }
      ]
    });

    // ML Training Pipeline
    this.createTemplate('ml-training', {
      name: 'ML Training Pipeline',
      description: 'Train and evaluate machine learning models',
      nodes: [
        { id: 'prepare', type: 'data-prepare', name: 'Prepare Dataset', config: { dataset: '{{dataset}}' } },
        { id: 'split', type: 'data-split', name: 'Split Data', config: { ratio: 0.8 } },
        { id: 'train', type: 'model-train', name: 'Train Model', config: { algorithm: '{{algorithm}}' } },
        { id: 'evaluate', type: 'model-evaluate', name: 'Evaluate Model', config: { metrics: ['accuracy', 'f1'] } },
        { id: 'deploy', type: 'model-deploy', name: 'Deploy Model', config: { environment: '{{environment}}' } }
      ],
      edges: [
        { source: 'prepare', target: 'split' },
        { source: 'split', target: 'train' },
        { source: 'train', target: 'evaluate' },
        { source: 'evaluate', target: 'deploy', condition: 'accuracy > 0.9' }
      ]
    });
  }

  getStats() {
    const stats = {
      workflows: this.workflows.size,
      instances: {
        total: this.workflowInstances.size,
        running: 0,
        completed: 0,
        failed: 0,
        cancelled: 0
      },
      templates: this.templates.size
    };

    for (const instance of this.workflowInstances.values()) {
      if (instance.status === 'running') stats.instances.running++;
      else if (instance.status === 'completed') stats.instances.completed++;
      else if (instance.status === 'failed') stats.instances.failed++;
      else if (instance.status === 'cancelled') stats.instances.cancelled++;
    }

    return stats;
  }
}

export default new WorkflowEngine();