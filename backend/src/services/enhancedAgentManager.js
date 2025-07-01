import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import database from './database.js';

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
    if (this.initialized) return;
    
    try {
      // Load agent configuration
      await this.loadAgentConfig();
      
      // Create all agents
      await this.createAgents();
      
      // Register agents with orchestrator
      this.registerAgentsWithOrchestrator();
      
      this.initialized = true;
      
      await database.logSystemEvent(
        'agent_manager',
        'info',
        'EnhancedAgentManager',
        `Initialized with ${this.agents.size} agents`
      );
      
      console.log(`Enhanced Agent Manager initialized. ${this.agents.size} agents active.`);
    } catch (error) {
      console.error('Failed to initialize Enhanced Agent Manager:', error);
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
    const targetAgent = this.agents.get(routing.routedTo);
    if (!targetAgent) {
      throw new Error(`Target agent ${routing.routedTo} not found`);
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
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    
    if (agent.status !== 'ready') {
      throw new Error(`Agent ${agentId} is not ready`);
    }
    
    return agent.executeTask(task);
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