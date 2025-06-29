import { agentManager } from './agentManager.js';
import { taskQueue } from './taskQueue.js';
import { workflowEngine } from './workflowEngine.js';

class VoiceCommandService {
  constructor() {
    this.commands = new Map();
    this.initializeCommands();
  }

  initializeCommands() {
    // Agent control commands
    this.registerCommand(['start agent', 'activate agent'], this.startAgent.bind(this));
    this.registerCommand(['stop agent', 'deactivate agent'], this.stopAgent.bind(this));
    this.registerCommand(['list agents', 'show agents'], this.listAgents.bind(this));
    this.registerCommand(['agent status', 'check agent'], this.getAgentStatus.bind(this));
    
    // Task management commands
    this.registerCommand(['create task', 'new task'], this.createTask.bind(this));
    this.registerCommand(['run task', 'execute task'], this.runTask.bind(this));
    this.registerCommand(['task status', 'check task'], this.getTaskStatus.bind(this));
    this.registerCommand(['list tasks', 'show tasks'], this.listTasks.bind(this));
    this.registerCommand(['cancel task', 'stop task'], this.cancelTask.bind(this));
    
    // Workflow commands
    this.registerCommand(['create workflow', 'new workflow'], this.createWorkflow.bind(this));
    this.registerCommand(['run workflow', 'execute workflow'], this.runWorkflow.bind(this));
    this.registerCommand(['list workflows', 'show workflows'], this.listWorkflows.bind(this));
    
    // System commands
    this.registerCommand(['system status', 'check system'], this.getSystemStatus.bind(this));
    this.registerCommand(['help', 'what can you do'], this.getHelp.bind(this));
    this.registerCommand(['clear queue', 'empty queue'], this.clearQueue.bind(this));
    
    // Navigation commands
    this.registerCommand(['go to', 'navigate to', 'open'], this.navigateTo.bind(this));
    this.registerCommand(['go back', 'back'], this.goBack.bind(this));
  }

  registerCommand(triggers, handler) {
    triggers.forEach(trigger => {
      this.commands.set(trigger.toLowerCase(), handler);
    });
  }

  async processCommand(transcript, context = {}) {
    const lowerTranscript = transcript.toLowerCase().trim();
    
    // First, try exact command matching
    for (const [trigger, handler] of this.commands) {
      if (lowerTranscript.startsWith(trigger)) {
        const params = lowerTranscript.substring(trigger.length).trim();
        try {
          const result = await handler(params, context);
          return {
            success: true,
            command: trigger,
            result,
            transcript
          };
        } catch (error) {
          return {
            success: false,
            command: trigger,
            error: error.message,
            transcript
          };
        }
      }
    }

    // If no exact match, try fuzzy matching or natural language processing
    const interpretation = this.interpretNaturalLanguage(lowerTranscript);
    if (interpretation) {
      try {
        const result = await interpretation.handler(interpretation.params, context);
        return {
          success: true,
          command: interpretation.command,
          result,
          transcript,
          interpreted: true
        };
      } catch (error) {
        return {
          success: false,
          command: interpretation.command,
          error: error.message,
          transcript,
          interpreted: true
        };
      }
    }

    // If no command matched, return as regular text for chat processing
    return {
      success: false,
      transcript,
      isChat: true
    };
  }

  interpretNaturalLanguage(transcript) {
    // Agent-related interpretations
    if (transcript.includes('agent') && (transcript.includes('start') || transcript.includes('run'))) {
      const agentMatch = transcript.match(/(\w+)\s+agent/);
      if (agentMatch) {
        return {
          command: 'start agent',
          handler: this.commands.get('start agent'),
          params: agentMatch[1]
        };
      }
    }

    // Task-related interpretations
    if (transcript.includes('task') && transcript.includes('create')) {
      const taskDescription = transcript.replace(/create\s+(?:a\s+)?task\s+(?:to\s+)?/i, '').trim();
      return {
        command: 'create task',
        handler: this.commands.get('create task'),
        params: taskDescription
      };
    }

    // Navigation interpretations
    if (transcript.includes('go to') || transcript.includes('open') || transcript.includes('show')) {
      const pages = ['dashboard', 'agents', 'tasks', 'analytics', 'knowledge graph', 'security', 'settings'];
      for (const page of pages) {
        if (transcript.includes(page)) {
          return {
            command: 'go to',
            handler: this.commands.get('go to'),
            params: page
          };
        }
      }
    }

    return null;
  }

  // Command handlers
  async startAgent(agentName, context) {
    const agent = await agentManager.getAgent(agentName);
    if (!agent) {
      throw new Error(`Agent "${agentName}" not found`);
    }
    
    await agentManager.initializeAgent(agentName);
    return {
      message: `Agent "${agentName}" started successfully`,
      agent: {
        name: agentName,
        status: 'active'
      }
    };
  }

  async stopAgent(agentName, context) {
    // Implementation would go here
    return {
      message: `Agent "${agentName}" stopped`,
      agent: {
        name: agentName,
        status: 'inactive'
      }
    };
  }

  async listAgents(params, context) {
    const agents = await agentManager.listAgents();
    return {
      message: `Found ${agents.length} agents`,
      agents
    };
  }

  async getAgentStatus(agentName, context) {
    const status = await agentManager.getAgentStatus(agentName);
    return {
      message: `Agent "${agentName}" status retrieved`,
      status
    };
  }

  async createTask(description, context) {
    if (!description) {
      throw new Error('Task description is required');
    }

    const task = {
      type: 'voice_command',
      description,
      userId: context.userId,
      priority: 'medium',
      metadata: {
        source: 'voice',
        timestamp: new Date().toISOString()
      }
    };

    const taskId = await taskQueue.addTask(task);
    return {
      message: `Task created successfully`,
      taskId,
      task
    };
  }

  async runTask(taskId, context) {
    // Implementation would go here
    return {
      message: `Task ${taskId} is running`,
      taskId
    };
  }

  async getTaskStatus(taskId, context) {
    const task = await taskQueue.getTask(taskId);
    return {
      message: `Task status retrieved`,
      task
    };
  }

  async listTasks(params, context) {
    const tasks = await taskQueue.getTasks();
    return {
      message: `Found ${tasks.length} tasks`,
      tasks
    };
  }

  async cancelTask(taskId, context) {
    await taskQueue.removeTask(taskId);
    return {
      message: `Task ${taskId} cancelled`,
      taskId
    };
  }

  async createWorkflow(description, context) {
    // Implementation would go here
    return {
      message: 'Workflow creation not yet implemented',
      description
    };
  }

  async runWorkflow(workflowId, context) {
    const result = await workflowEngine.executeWorkflow(workflowId);
    return {
      message: `Workflow ${workflowId} executed`,
      result
    };
  }

  async listWorkflows(params, context) {
    // Implementation would go here
    return {
      message: 'Workflow listing not yet implemented'
    };
  }

  async getSystemStatus(params, context) {
    return {
      message: 'System is operational',
      status: {
        agents: await agentManager.listAgents(),
        tasks: await taskQueue.getQueueStatus(),
        uptime: process.uptime()
      }
    };
  }

  async getHelp(params, context) {
    const commandList = Array.from(new Set(this.commands.keys())).sort();
    return {
      message: 'Available voice commands',
      commands: commandList,
      examples: [
        'Start research agent',
        'Create task to analyze data',
        'Go to dashboard',
        'Check system status',
        'List all agents'
      ]
    };
  }

  async clearQueue(params, context) {
    await taskQueue.clearQueue();
    return {
      message: 'Task queue cleared successfully'
    };
  }

  async navigateTo(page, context) {
    const pageMap = {
      'dashboard': '/',
      'agents': '/agents',
      'agent management': '/agents',
      'tasks': '/pipeline',
      'task pipeline': '/pipeline',
      'analytics': '/analytics',
      'knowledge graph': '/knowledge',
      'security': '/security',
      'settings': '/settings',
      'communications': '/communications',
      'models': '/models',
      'model arsenal': '/models'
    };

    const route = pageMap[page.toLowerCase()];
    if (!route) {
      throw new Error(`Unknown page: ${page}`);
    }

    return {
      message: `Navigating to ${page}`,
      action: 'navigate',
      route
    };
  }

  async goBack(params, context) {
    return {
      message: 'Going back',
      action: 'back'
    };
  }
}

// Export singleton instance
export const voiceCommandService = new VoiceCommandService();
export default voiceCommandService;