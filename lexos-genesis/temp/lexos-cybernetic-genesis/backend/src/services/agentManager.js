import { v4 as uuidv4 } from 'uuid';
import { Task } from '../types/index.js';
import { ConsciousnessAgent } from '../agents/ConsciousnessAgent.js';
import { ExecutorAgent } from '../agents/ExecutorAgent.js';
import { ResearchAgent } from '../agents/ResearchAgent.js';
import { R1UnrestrictedAgent } from '../agents/R1UnrestrictedAgent.js';
import { Gemma3NAgent } from '../agents/Gemma3NAgent.js';
import { analyticsService } from './analyticsService.js';

export class AgentManager {
  constructor() {
    this.agents = new Map();
    this.tasks = new Map();
    this.taskHistory = [];
    this.initialized = false;
  }

  async initialize() {
    console.log('Initializing Agent Manager...');
    
    // Create and initialize agents
    const consciousnessAgent = new ConsciousnessAgent();
    const executorAgent = new ExecutorAgent();
    const researchAgent = new ResearchAgent();
    const r1UnrestrictedAgent = new R1UnrestrictedAgent();
    const gemma3NAgent = new Gemma3NAgent();
    
    // Add agents to manager
    this.agents.set(consciousnessAgent.agent_id, consciousnessAgent);
    this.agents.set(executorAgent.agent_id, executorAgent);
    this.agents.set(researchAgent.agent_id, researchAgent);
    this.agents.set(r1UnrestrictedAgent.agent_id, r1UnrestrictedAgent);
    this.agents.set(gemma3NAgent.agent_id, gemma3NAgent);
    
    // Initialize all agents
    const initPromises = Array.from(this.agents.values()).map(agent => agent.initialize());
    const results = await Promise.allSettled(initPromises);
    
    // Check initialization results
    let successCount = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        successCount++;
      } else {
        const agent = Array.from(this.agents.values())[index];
        console.error(`Failed to initialize agent ${agent.name}`);
      }
    });
    
    this.initialized = successCount > 0;
    console.log(`Agent Manager initialized. ${successCount}/${this.agents.size} agents active.`);
    
    // Start task monitoring
    this.startTaskMonitoring();
    
    return this.initialized;
  }

  async submitTask(agentId, userId, taskType, parameters, priority = 'normal') {
    if (!this.initialized) {
      throw new Error('Agent Manager not initialized');
    }
    
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (agent.status === 'error' || agent.status === 'inactive') {
      throw new Error(`Agent ${agentId} is not available`);
    }
    
    // Create new task
    const taskId = `task-${uuidv4()}`;
    const task = new Task(taskId, agentId, userId, taskType, parameters, priority);
    
    // Store task
    this.tasks.set(taskId, task);
    
    // Submit to agent
    await agent.addTask(task);
    
    return {
      success: true,
      task_id: taskId,
      agent_id: agentId,
      status: task.status,
      estimated_completion: Date.now() + (agent.average_response_time * 1000),
      queue_position: agent.taskQueue.length
    };
  }

  getTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      // Check history
      const historicalTask = this.taskHistory.find(t => t.task_id === taskId);
      if (historicalTask) {
        return historicalTask;
      }
      throw new Error(`Task ${taskId} not found`);
    }
    return task;
  }

  getTasks(filters = {}) {
    const { agent_id, user_id, status, limit = 10, offset = 0 } = filters;
    
    let tasks = Array.from(this.tasks.values());
    
    // Apply filters
    if (agent_id) {
      tasks = tasks.filter(t => t.agent_id === agent_id);
    }
    if (user_id) {
      tasks = tasks.filter(t => t.user_id === user_id);
    }
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    
    // Sort by creation time (newest first)
    tasks.sort((a, b) => b.created_at - a.created_at);
    
    // Apply pagination
    const total = tasks.length;
    tasks = tasks.slice(offset, offset + limit);
    
    return {
      tasks: tasks,
      total: total,
      limit: limit,
      offset: offset,
      has_more: offset + limit < total
    };
  }

  cancelTask(taskId) {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }
    
    if (task.status === 'completed' || task.status === 'failed') {
      throw new Error(`Cannot cancel task in ${task.status} state`);
    }
    
    task.status = 'cancelled';
    task.completed_at = Date.now();
    
    return {
      success: true,
      task_id: taskId,
      status: 'cancelled'
    };
  }

  getAgents() {
    const agents = Array.from(this.agents.values()).map(agent => agent.getStatus());
    
    return {
      agents: agents,
      total_agents: agents.length,
      active_agents: agents.filter(a => a.status === 'active' || a.status === 'busy').length,
      timestamp: Date.now()
    };
  }

  getAgent(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent.getStatus();
  }

  getAgentMetrics() {
    const metrics = {};
    
    this.agents.forEach((agent, id) => {
      metrics[id] = {
        active: agent.status === 'active' || agent.status === 'busy',
        status: agent.status,
        load: agent.current_tasks / Math.max(1, agent.capabilities.length),
        queue_length: agent.taskQueue.length,
        average_response_time: agent.average_response_time,
        total_completed: agent.total_tasks_completed
      };
    });
    
    return {
      agents: metrics,
      timestamp: Date.now()
    };
  }

  getSystemStatus() {
    const totalTasks = this.tasks.size + this.taskHistory.length;
    const activeTasks = Array.from(this.tasks.values()).filter(t => t.status === 'running').length;
    const queuedTasks = Array.from(this.tasks.values()).filter(t => t.status === 'queued').length;
    const completedTasks = this.taskHistory.filter(t => t.status === 'completed').length;
    const failedTasks = this.taskHistory.filter(t => t.status === 'failed').length;
    
    return {
      total_tasks: totalTasks,
      active_tasks: activeTasks,
      queued_tasks: queuedTasks,
      completed_tasks: completedTasks,
      failed_tasks: failedTasks,
      agents_online: this.getAgents().active_agents,
      agents_total: this.agents.size,
      uptime: process.uptime(),
      timestamp: Date.now()
    };
  }

  startTaskMonitoring() {
    // Clean up completed tasks every minute
    setInterval(() => {
      const completedTasks = [];
      
      this.tasks.forEach((task, id) => {
        if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
          completedTasks.push(task);
          this.tasks.delete(id);
        }
      });
      
      // Add to history
      this.taskHistory.push(...completedTasks);
      
      // Keep only last 1000 tasks in history
      if (this.taskHistory.length > 1000) {
        this.taskHistory = this.taskHistory.slice(-1000);
      }
    }, 60000); // Every minute
  }
}