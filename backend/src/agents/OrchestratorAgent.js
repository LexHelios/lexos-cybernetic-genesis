import { EnhancedBaseAgent } from './EnhancedBaseAgent.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OrchestratorAgent extends EnhancedBaseAgent {
  constructor(config) {
    super(config);
    this.agentRegistry = new Map();
    this.routingRules = {};
    this.loadRoutingRules();
  }
  
  async loadRoutingRules() {
    try {
      const configPath = path.join(__dirname, '../../config/agentConfig.json');
      const configData = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(configData);
      this.routingRules = config.routing_rules;
    } catch (error) {
      console.error('Failed to load routing rules:', error);
    }
  }
  
  registerAgent(agent) {
    this.agentRegistry.set(agent.id, agent);
  }
  
  async handleCustomTask(task) {
    if (task.type === 'route') {
      return this.routeTask(task);
    } else if (task.type === 'classify') {
      return this.classifyTask(task);
    }
    return super.handleCustomTask(task);
  }
  
  async routeTask(task) {
    const { message, context } = task;
    
    // Analyze the message to determine best agent
    const classification = await this.classifyTask({ message });
    
    // Find best agent based on classification
    const bestAgent = this.selectBestAgent(classification);
    
    if (!bestAgent) {
      return {
        error: 'No suitable agent found for this task',
        classification
      };
    }
    
    // Route to selected agent
    const targetAgent = this.agentRegistry.get(bestAgent.id);
    if (targetAgent && targetAgent.status === 'ready') {
      return {
        routedTo: bestAgent.id,
        agentName: bestAgent.name,
        confidence: classification.confidence,
        reason: classification.reason
      };
    }
    
    return {
      error: 'Selected agent is not available',
      suggested: bestAgent.id
    };
  }
  
  async classifyTask(task) {
    const { message } = task;
    
    // Use LLM to classify the task
    const classificationPrompt = `
Analyze this message and classify it into one of these categories:
- reasoning: Deep analysis, logic, problem-solving
- code: Programming, debugging, code generation
- creative: Writing, storytelling, poetry
- chat: General conversation, dialogue
- web_scraping: Data extraction, web parsing
- web_design: UI/UX, HTML/CSS generation
- network: Network configuration, optimization
- adult: Adult content (if explicitly requested)
- orchestration: System management, deployment
- full_stack: App development, scaffolding

Message: "${message}"

Respond with:
1. Category (one of the above)
2. Confidence (0-1)
3. Reason for classification
4. Key indicators found

Format as JSON.`;

    const response = await this.generate(classificationPrompt, {
      temperature: 0.3,
      max_tokens: 200
    });
    
    try {
      const parsed = JSON.parse(response);
      return {
        category: parsed.category || 'chat',
        confidence: parsed.confidence || 0.5,
        reason: parsed.reason || 'Default classification',
        indicators: parsed.indicators || []
      };
    } catch (error) {
      // Fallback pattern matching
      return this.patternBasedClassification(message);
    }
  }
  
  patternBasedClassification(message) {
    const lowerMessage = message.toLowerCase();
    
    for (const [category, patterns] of Object.entries(this.routingRules.task_patterns)) {
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern)) {
          return {
            category,
            confidence: 0.7,
            reason: `Pattern match: "${pattern}"`,
            indicators: [pattern]
          };
        }
      }
    }
    
    return {
      category: 'chat',
      confidence: 0.5,
      reason: 'No specific patterns found, defaulting to chat',
      indicators: []
    };
  }
  
  selectBestAgent(classification) {
    const { category } = classification;
    
    // Map categories to agent IDs
    const categoryToAgent = {
      reasoning: 'reasoning',
      code: 'code',
      creative: 'creative_writing',
      chat: 'chat',
      web_scraping: 'web_scraper',
      web_design: 'web_design',
      network: 'network_opt',
      adult: 'adult_content',
      orchestration: 'orchestration',
      full_stack: 'full_stack_builder'
    };
    
    const agentId = categoryToAgent[category] || 'chat';
    const agent = this.agentRegistry.get(agentId);
    
    if (agent && agent.status === 'ready') {
      return agent;
    }
    
    // Fallback to chat agent
    return this.agentRegistry.get('chat');
  }
  
  async delegateTask(task, targetAgentId) {
    const targetAgent = this.agentRegistry.get(targetAgentId);
    
    if (!targetAgent) {
      throw new Error(`Agent ${targetAgentId} not found`);
    }
    
    if (targetAgent.status !== 'ready') {
      throw new Error(`Agent ${targetAgentId} is not ready`);
    }
    
    // Log delegation
    await database.logSystemEvent(
      'orchestrator',
      'info',
      this.name,
      `Delegating task to ${targetAgent.name}`,
      { 
        taskId: task.id,
        targetAgent: targetAgentId,
        taskType: task.type
      }
    );
    
    // Execute task on target agent
    return targetAgent.executeTask(task);
  }
  
  getSystemStatus() {
    const agents = [];
    for (const [id, agent] of this.agentRegistry) {
      agents.push({
        id: agent.id,
        name: agent.name,
        status: agent.status,
        currentModel: agent.currentModel,
        metrics: agent.metrics
      });
    }
    
    return {
      orchestrator: this.getStatus(),
      registeredAgents: agents,
      totalAgents: agents.length,
      readyAgents: agents.filter(a => a.status === 'ready').length
    };
  }
}