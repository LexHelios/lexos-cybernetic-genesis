import { Agent, AgentStatus, TaskStatus } from '../types/index.js';
import { OllamaService } from '../services/ollamaService.js';

export class BaseAgent extends Agent {
  constructor(id, name, description, model = 'llama3.2') {
    super(id, name, description);
    this.model = model;
    this.ollamaService = new OllamaService();
    this.taskQueue = [];
    this.isProcessing = false;
  }

  async initialize() {
    try {
      // Check if Ollama is available
      const isHealthy = await this.ollamaService.checkHealth();
      if (isHealthy) {
        this.updateStatus(AgentStatus.ACTIVE);
        console.log(`Agent ${this.name} initialized successfully`);
        // Start processing queue
        this.startProcessing();
        return true;
      } else {
        this.updateStatus(AgentStatus.ERROR);
        console.error(`Agent ${this.name} failed to initialize: Ollama not available`);
        return false;
      }
    } catch (error) {
      this.updateStatus(AgentStatus.ERROR);
      console.error(`Agent ${this.name} initialization error:`, error);
      return false;
    }
  }

  async addTask(task) {
    this.taskQueue.push(task);
    console.log(`Task ${task.task_id} added to ${this.name} queue`);
    
    // If not already processing, start
    if (!this.isProcessing && this.status === AgentStatus.ACTIVE) {
      this.startProcessing();
    }
  }

  async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    
    while (this.taskQueue.length > 0 && this.status === AgentStatus.ACTIVE) {
      const task = this.taskQueue.shift();
      this.current_tasks++;
      this.updateStatus(AgentStatus.BUSY);
      
      try {
        task.start();
        const result = await this.processTask(task);
        task.complete(result);
        this.total_tasks_completed++;
        
        // Update average response time
        const responseTime = task.execution_time / 1000; // Convert to seconds
        this.average_response_time = 
          (this.average_response_time * (this.total_tasks_completed - 1) + responseTime) / 
          this.total_tasks_completed;
        
        console.log(`Task ${task.task_id} completed successfully`);
      } catch (error) {
        task.fail(error.message);
        console.error(`Task ${task.task_id} failed:`, error);
      } finally {
        this.current_tasks--;
      }
    }
    
    this.isProcessing = false;
    this.updateStatus(AgentStatus.ACTIVE);
  }

  // To be overridden by specific agent implementations
  async processTask(task) {
    throw new Error('processTask must be implemented by subclass');
  }

  // Generate completion using Ollama
  async generateCompletion(prompt, options = {}) {
    return await this.ollamaService.generateCompletion(prompt, {
      model: this.model,
      ...options
    });
  }

  // Chat with Ollama
  async chat(messages, options = {}) {
    return await this.ollamaService.chat(messages, {
      model: this.model,
      ...options
    });
  }

  getStatus() {
    return {
      agent_id: this.agent_id,
      name: this.name,
      description: this.description,
      status: this.status,
      capabilities: this.capabilities,
      current_tasks: this.current_tasks,
      total_tasks_completed: this.total_tasks_completed,
      average_response_time: this.average_response_time,
      last_activity: this.last_activity,
      queue_length: this.taskQueue.length
    };
  }
}