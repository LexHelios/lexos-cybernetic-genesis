import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import database from './database.js';
import confidenceGate from './confidenceGate.js';
import healthMonitor from './healthMonitor.js';
import vectorMemory from './vectorMemory.js';

// Import all agent types
import { OrchestratorAgent } from '../agents/OrchestratorAgent.js';
import { ReasoningAgent } from '../agents/ReasoningAgent.js';
import { CodeAgent } from '../agents/CodeAgent.js';
import { ChatAgent } from '../agents/ChatAgent.js';
import { CreativeWritingAgent } from '../agents/CreativeWritingAgent.js';
import { WebScraperAgent } from '../agents/WebScraperAgent.js';
import { EnhancedBaseAgent } from '../agents/EnhancedBaseAgent.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedAgentManager {
  constructor() {
    this.agents = new Map();
    this.orchestrator = null;
    this.agentConfig = null;
    this.initialized = false;
  }
  
  async initialize() {
    if (this.initialized) {
      console.log('Enhanced Agent Manager already initialized');
      return;
    }
    
    if (this.initializing) {
      // Wait for ongoing initialization
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }
    
    this.initializing = true;
    
    try {
      // Load agent configuration
      await this.loadAgentConfig();
      
      // Create all agents
      await this.createAgents();
      
      // Register agents with orchestrator
      this.registerAgentsWithOrchestrator();
      
      this.initialized = true;
      this.initializing = false;
      
      // Temporarily disable database logging
      // await database.logSystemEvent(
      //   'agent_manager',
      //   'info',
      //   'EnhancedAgentManager',
      //   `Initialized with ${this.agents.size} agents`
      // );
      
      // Initialize vector memory for RAG capabilities
      await vectorMemory.initialize();
      
      console.log(`Enhanced Agent Manager initialized. ${this.agents.size} agents active.`);
    } catch (error) {
      console.error('Failed to initialize Enhanced Agent Manager:', error);
      this.initializing = false;
      throw error;
    }
  }
  
  async loadAgentConfig() {
    const configPath = path.join(__dirname, '../../config/agentConfig.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    this.agentConfig = JSON.parse(configData);
  }
  
  async createAgents() {
    const agentClasses = {
      orchestrator: OrchestratorAgent,
      reasoning: ReasoningAgent,
      code: CodeAgent,
      chat: ChatAgent,
      creative_writing: CreativeWritingAgent,
      web_scraper: WebScraperAgent,
      // For agents not yet implemented, use base agent
      ocr_cv: EnhancedBaseAgent,
      speech_to_text: EnhancedBaseAgent,
      text_to_speech: EnhancedBaseAgent,
      audio_processing: EnhancedBaseAgent,
      adult_content: EnhancedBaseAgent,
      web_design: EnhancedBaseAgent,
      network_opt: EnhancedBaseAgent,
      agent_creator: EnhancedBaseAgent,
      orchestration: EnhancedBaseAgent,
      full_stack_builder: EnhancedBaseAgent
    };
    
    // Create each agent
    if (!this.agentConfig || !this.agentConfig.agents) {
      throw new Error('Agent configuration not loaded properly');
    }
    
    for (const [agentId, config] of Object.entries(this.agentConfig.agents)) {
      try {
        const AgentClass = agentClasses[agentId] || EnhancedBaseAgent;
        const agent = new AgentClass(config);
        
        this.agents.set(agentId, agent);
        
        // Set orchestrator reference
        if (agentId === 'orchestrator') {
          this.orchestrator = agent;
        }
        
        console.log(`Created agent: ${config.name} (${agentId})`);
      } catch (error) {
        console.error(`Failed to create agent ${agentId}:`, error);
      }
    }
  }
  
  registerAgentsWithOrchestrator() {
    if (!this.orchestrator) {
      console.error('Orchestrator not found!');
      return;
    }
    
    for (const [agentId, agent] of this.agents) {
      if (agentId !== 'orchestrator') {
        this.orchestrator.registerAgent(agent);
      }
    }
  }
  
  async routeTask(task) {
    // Ensure manager is initialized
    if (!this.initialized) {
      await this.initialize();
    }
    if (!this.orchestrator) {
      throw new Error('Orchestrator not available');
    }
    
    // First, classify and route the task
    const routing = await this.orchestrator.executeTask({
      type: 'route',
      message: task.message || task.prompt,
      context: task.context
    });
    
    if (routing.error) {
      throw new Error(routing.error);
    }
    
    // Execute on the selected agent
    const targetAgentId = routing.routedTo || routing.result?.routedTo;
    const targetAgent = this.agents.get(targetAgentId);
    if (!targetAgent) {
      // Log available agents for debugging
      console.log('Available agents:', Array.from(this.agents.keys()));
      console.log('Routing result:', routing);
      throw new Error(`Target agent ${targetAgentId} not found`);
    }
    
    // Execute the task
    const result = await targetAgent.executeTask(task);
    
    return {
      ...result,
      routing: {
        agent: routing.routedTo,
        agentName: routing.agentName,
        confidence: routing.confidence,
        reason: routing.reason
      }
    };
  }
  
  async executeOnAgent(agentId, task) {
    console.log(`executeOnAgent called for ${agentId}`, { initialized: this.initialized, agentsSize: this.agents?.size });
    
    // Ensure manager is initialized
    if (!this.initialized) {
      console.log('Manager not initialized, initializing now...');
      await this.initialize();
    }
    
    const startTime = Date.now();
    let success = false;
    let error = null;
    
    try {
      const agent = this.agents.get(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }
      
      if (agent.status !== 'ready') {
        throw new Error(`Agent ${agentId} is not ready`);
      }
      
      // Retrieve contextual memories to enhance the task
      let enhancedTask = task;
      if (task.message || task.query) {
        const query = task.message || task.query;
        const relevantMemories = await vectorMemory.getContextualMemories(agentId, query, task.context);
        
        if (relevantMemories.length > 0) {
          const memoryContext = relevantMemories.map(m => 
            `Previous context: ${m.content} (relevance: ${m.similarity.toFixed(2)})`
          ).join('\n');
          
          enhancedTask = {
            ...task,
            contextualMemory: memoryContext,
            memoryCount: relevantMemories.length
          };
          
          console.log(`📚 Enhanced ${agentId} with ${relevantMemories.length} contextual memories`);
        }
      }
      
      // Execute task with agent (with enhanced context)
      const response = await agent.executeTask(enhancedTask);
      success = true;
      
      // Store successful interactions in memory for future context
      if (response.response && (task.message || task.query)) {
        await vectorMemory.storeMemory(
          agentId,
          `Query: ${task.message || task.query}\nResponse: ${response.response}`,
          task.context,
          {
            model: response.model,
            executionTime: response.executionTime,
            type: task.type || 'general'
          }
        );
      }
      
      // Get agent configuration for confidence evaluation
      const agentConfig = this.agentConfig.agents[agentId];
      
      // Evaluate confidence and determine if escalation is needed
      if (agentConfig && agentConfig.confidence_threshold) {
        const evaluation = confidenceGate.evaluateConfidence(response, agentConfig);
        
        if (evaluation.shouldEscalate && agentConfig.fallback_api) {
          console.log(`🚨 Low confidence detected for ${agentId}: ${evaluation.confidence.toFixed(3)} < ${evaluation.threshold}`);
          
          try {
            // Execute escalation to fallback API
            const escalatedResponse = await confidenceGate.executeEscalation(task, agentConfig, evaluation);
            
            // Record successful execution with escalation
            const executionTime = Date.now() - startTime;
            healthMonitor.recordAgentExecution(agentId, executionTime, true);
            
            return escalatedResponse;
          } catch (escalationError) {
            console.error(`Escalation failed for ${agentId}:`, escalationError);
            // Return original response with escalation failure note
            const finalResponse = {
              ...response,
              escalation_attempted: true,
              escalation_failed: true,
              escalation_error: escalationError.message,
              original_confidence: evaluation.confidence
            };
            
            // Record execution with escalation failure
            const executionTime = Date.now() - startTime;
            healthMonitor.recordAgentExecution(agentId, executionTime, true);
            
            return finalResponse;
          }
        }
      }
      
      // Record successful execution
      const executionTime = Date.now() - startTime;
      healthMonitor.recordAgentExecution(agentId, executionTime, true);
      
      return response;
      
    } catch (err) {
      error = err;
      success = false;
      
      // Record failed execution
      const executionTime = Date.now() - startTime;
      healthMonitor.recordAgentExecution(agentId, executionTime, false, err);
      
      throw err;
    }
  }
  
  getAgent(agentId) {
    return this.agents.get(agentId);
  }
  
  getAllAgents() {
    const agentList = [];
    for (const [id, agent] of this.agents) {
      agentList.push(agent.getStatus());
    }
    return agentList;
  }
  
  getSystemStatus() {
    if (this.orchestrator) {
      return this.orchestrator.getSystemStatus();
    }
    
    return {
      agents: this.getAllAgents(),
      totalAgents: this.agents.size,
      readyAgents: Array.from(this.agents.values()).filter(a => a.status === 'ready').length
    };
  }
  
  async switchAgentModel(agentId, modelName) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    return agent.switchModel(modelName);
  }
  
  async getAgentMetrics(agentId) {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    return agent.metrics;
  }
}

// Export singleton instance
const enhancedAgentManager = new EnhancedAgentManager();
export default enhancedAgentManager;