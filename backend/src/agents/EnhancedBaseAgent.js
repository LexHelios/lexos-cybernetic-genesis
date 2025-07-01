import { OllamaService } from '../services/ollamaService.js';
import database from '../services/database.js';
import memoryManager from '../services/memoryManager.js';

export class EnhancedBaseAgent {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.purpose = config.purpose;
    this.primaryModel = config.primary_model;
    this.secondaryModel = config.secondary_model;
    this.fallbackApi = config.fallback_api;
    this.framework = config.framework;
    this.capabilities = config.capabilities || [];
    this.priority = config.priority || 50;
    this.restricted = config.restricted || false;
    this.requiresExternal = config.requires_external || false;
    
    this.ollamaService = new OllamaService();
    this.status = 'initializing';
    this.currentModel = this.primaryModel;
    this.taskQueue = [];
    this.activeTask = null;
    this.metrics = {
      tasksCompleted: 0,
      tasksFailed: 0,
      totalExecutionTime: 0,
      averageExecutionTime: 0,
      modelUsage: {}
    };
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Check if primary model is available
      if (!this.requiresExternal) {
        const modelAvailable = await this.checkModelAvailability(this.primaryModel);
        if (!modelAvailable && this.secondaryModel) {
          console.log(`Primary model ${this.primaryModel} not available, switching to ${this.secondaryModel}`);
          this.currentModel = this.secondaryModel;
        }
      }
      
      this.status = 'ready';
      
      await database.logSystemEvent(
        'agent',
        'info',
        this.name,
        `Agent initialized successfully with model: ${this.currentModel}`
      );
      
      // Memory creation disabled for now - foreign key constraint issue
      // TODO: Fix memory manager integration
    } catch (error) {
      this.status = 'error';
      console.error(`Failed to initialize agent ${this.name}:`, error);
    }
  }
  
  async checkModelAvailability(modelName) {
    if (modelName.startsWith('external:')) {
      return false; // External models handled separately
    }
    
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      const data = await response.json();
      return data.models.some(model => model.name === modelName);
    } catch (error) {
      console.error('Failed to check model availability:', error);
      return false;
    }
  }
  
  async executeTask(task) {
    const startTime = Date.now();
    this.activeTask = task;
    
    try {
      // Log task start
      await database.logSystemEvent(
        'agent',
        'info',
        this.name,
        `Starting task: ${task.type || 'general'}`,
        { taskId: task.id, model: this.currentModel }
      );
      
      // Process based on task type
      let result;
      switch (task.type) {
        case 'generate':
          result = await this.generate(task.prompt, task.options);
          break;
        case 'analyze':
          result = await this.analyze(task.data, task.options);
          break;
        case 'process':
          result = await this.process(task.input, task.options);
          break;
        default:
          result = await this.handleCustomTask(task);
      }
      
      // Update metrics
      const executionTime = Date.now() - startTime;
      this.updateMetrics(true, executionTime);
      
      // Memory creation disabled for now - foreign key constraint issue
      // TODO: Fix memory manager integration
      
      this.activeTask = null;
      return {
        success: true,
        result,
        executionTime,
        model: this.currentModel,
        agent: this.name
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(false, executionTime);
      
      // Try fallback model
      if (this.secondaryModel && this.currentModel !== this.secondaryModel) {
        console.log(`Primary model failed, trying secondary: ${this.secondaryModel}`);
        this.currentModel = this.secondaryModel;
        return this.executeTask(task); // Retry with secondary
      }
      
      // Log failure
      await database.logSystemEvent(
        'agent',
        'error',
        this.name,
        `Task failed: ${error.message}`,
        { taskId: task.id, error: error.stack }
      );
      
      this.activeTask = null;
      return {
        success: false,
        error: error.message,
        executionTime,
        agent: this.name
      };
    }
  }
  
  async generate(prompt, options = {}) {
    const result = await this.ollamaService.generateCompletion(prompt, {
      model: this.currentModel,
      ...options
    });
    return result.response;
  }
  
  async analyze(data, options = {}) {
    const prompt = this.buildAnalysisPrompt(data, options);
    return this.generate(prompt, options);
  }
  
  async process(input, options = {}) {
    const prompt = this.buildProcessingPrompt(input, options);
    return this.generate(prompt, options);
  }
  
  buildAnalysisPrompt(data, options) {
    return `As ${this.name}, analyze the following data:\n\n${JSON.stringify(data, null, 2)}\n\nProvide a detailed analysis focusing on: ${options.focus || 'key insights and patterns'}`;
  }
  
  buildProcessingPrompt(input, options) {
    return `As ${this.name}, process the following input:\n\n${input}\n\nProcess this according to: ${options.instructions || 'best practices for ' + this.purpose}`;
  }
  
  async handleCustomTask(task) {
    // Override in child classes for specific task types
    return this.generate(task.prompt || JSON.stringify(task), task.options);
  }
  
  updateMetrics(success, executionTime) {
    if (success) {
      this.metrics.tasksCompleted++;
    } else {
      this.metrics.tasksFailed++;
    }
    
    this.metrics.totalExecutionTime += executionTime;
    this.metrics.averageExecutionTime = 
      this.metrics.totalExecutionTime / (this.metrics.tasksCompleted + this.metrics.tasksFailed);
    
    if (!this.metrics.modelUsage[this.currentModel]) {
      this.metrics.modelUsage[this.currentModel] = 0;
    }
    this.metrics.modelUsage[this.currentModel]++;
  }
  
  summarizeResult(result) {
    if (typeof result === 'string') {
      return result.substring(0, 100) + (result.length > 100 ? '...' : '');
    }
    return JSON.stringify(result).substring(0, 100) + '...';
  }
  
  getStatus() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      purpose: this.purpose,
      currentModel: this.currentModel,
      capabilities: this.capabilities,
      metrics: this.metrics,
      activeTask: this.activeTask ? {
        id: this.activeTask.id,
        type: this.activeTask.type,
        startTime: this.activeTask.startTime
      } : null
    };
  }
  
  async switchModel(modelName) {
    const available = await this.checkModelAvailability(modelName);
    if (available) {
      this.currentModel = modelName;
      await database.logSystemEvent(
        'agent',
        'info',
        this.name,
        `Switched to model: ${modelName}`
      );
      return true;
    }
    return false;
  }
}