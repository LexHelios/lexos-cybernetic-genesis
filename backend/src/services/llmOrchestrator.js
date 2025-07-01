import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import database from './database.js';
import { OllamaService } from './ollamaService.js';

const ollamaService = new OllamaService();
import { analyticsService } from './analyticsService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class LLMOrchestrator {
  constructor() {
    this.modelCapabilities = null;
    this.routingCache = new Map();
    this.performanceMetrics = new Map();
    this.routingModel = 'phi3:mini';
    this.conversationContext = new Map();
    this.loadCapabilities();
  }

  async loadCapabilities() {
    try {
      const configPath = path.join(__dirname, '../../config/modelCapabilities.json');
      const data = await fs.readFile(configPath, 'utf-8');
      this.modelCapabilities = JSON.parse(data);
      
      await database.logSystemEvent(
        'orchestrator',
        'info',
        'LLMOrchestrator',
        'Model capabilities loaded successfully'
      );
    } catch (error) {
      console.error('Failed to load model capabilities:', error);
      await database.logSystemEvent(
        'orchestrator',
        'error',
        'LLMOrchestrator',
        `Failed to load model capabilities: ${error.message}`
      );
    }
  }

  // Analyze request to determine best model
  async analyzeRequest(message, options = {}) {
    const {
      sessionId,
      userId,
      conversationHistory = [],
      performanceMode = 'balanced',
      explicitModel = null
    } = options;

    // If user explicitly selected a model, respect that choice
    if (explicitModel && explicitModel !== 'auto') {
      return {
        selectedModel: explicitModel,
        reasoning: 'User explicitly selected this model',
        confidence: 1.0
      };
    }

    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(message, performanceMode);
      if (this.routingCache.has(cacheKey)) {
        const cached = this.routingCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) { // 5 minute cache
          return cached.result;
        }
      }

      // Analyze message characteristics
      const analysis = await this.performAnalysis(message, conversationHistory);
      
      // Use routing model for decision
      const routingDecision = await this.makeRoutingDecision(analysis, performanceMode);
      
      // Cache the result
      this.routingCache.set(cacheKey, {
        result: routingDecision,
        timestamp: Date.now()
      });

      // Track routing metrics
      await this.trackRoutingMetrics(routingDecision, sessionId, userId);

      return routingDecision;
    } catch (error) {
      console.error('Error in request analysis:', error);
      
      // Fallback to default model
      return {
        selectedModel: 'mistral:7b',
        reasoning: 'Fallback due to routing error',
        confidence: 0.5,
        error: error.message
      };
    }
  }

  async performAnalysis(message, conversationHistory) {
    const analysis = {
      messageLength: message.length,
      wordCount: message.split(/\s+/).length,
      hasCode: /```|function|class|def|const|let|var|import|export/.test(message),
      hasQuestion: /\?|how|what|why|when|where|who|which/.test(message.toLowerCase()),
      hasMath: /\d+[\+\-\*\/\^]\d+|equation|calculate|solve/.test(message),
      isCreative: /write|story|poem|imagine|create|design/.test(message.toLowerCase()),
      isResearch: /research|analyze|study|data|evidence/.test(message.toLowerCase()),
      complexity: this.assessComplexity(message),
      taskType: this.identifyTaskType(message),
      contextLength: this.calculateContextLength(message, conversationHistory)
    };

    return analysis;
  }

  assessComplexity(message) {
    const factors = {
      length: message.length > 500 ? 3 : message.length > 200 ? 2 : 1,
      sentences: (message.match(/[.!?]+/g) || []).length > 3 ? 2 : 1,
      technicalTerms: (message.match(/\b(algorithm|implementation|architecture|framework|optimization)\b/gi) || []).length,
      nestedConcepts: (message.match(/\b(because|therefore|however|although|furthermore)\b/gi) || []).length
    };

    const score = Object.values(factors).reduce((a, b) => a + b, 0);
    
    if (score > 8) return 'complex';
    if (score > 4) return 'moderate';
    return 'simple';
  }

  identifyTaskType(message) {
    const { task_patterns } = this.modelCapabilities.routing_rules;
    
    for (const [taskType, config] of Object.entries(task_patterns)) {
      const patterns = config.patterns;
      const matchCount = patterns.filter(pattern => 
        new RegExp(`\\b${pattern}\\b`, 'i').test(message)
      ).length;
      
      if (matchCount > 0) {
        return { type: taskType, confidence: Math.min(matchCount / 3, 1) };
      }
    }
    
    return { type: 'general', confidence: 0.5 };
  }

  calculateContextLength(message, history) {
    const totalTokens = message.length / 4; // Rough token estimate
    const historyTokens = history.reduce((sum, msg) => sum + (msg.content?.length || 0) / 4, 0);
    return totalTokens + historyTokens;
  }

  async makeRoutingDecision(analysis, performanceMode) {
    const { models, routing_rules } = this.modelCapabilities;
    
    // Build routing prompt for phi3:mini
    const routingPrompt = this.buildRoutingPrompt(analysis);
    
    try {
      // Use phi3:mini for quick routing decision
      const routingResponse = await ollamaService.generateCompletion(routingPrompt, {
        model: this.routingModel,
        temperature: 0.3,
        max_tokens: 100
      });

      // Parse routing response
      const decision = this.parseRoutingResponse(routingResponse.response);
      
      // Validate and enhance decision
      const validatedDecision = this.validateRoutingDecision(decision, analysis, performanceMode);
      
      return validatedDecision;
    } catch (error) {
      // Fallback to rule-based routing
      return this.ruleBasedRouting(analysis, performanceMode);
    }
  }

  buildRoutingPrompt(analysis) {
    return `As an AI routing system, analyze this request and select the best model.

Request Analysis:
- Task Type: ${analysis.taskType.type} (confidence: ${analysis.taskType.confidence})
- Complexity: ${analysis.complexity}
- Has Code: ${analysis.hasCode}
- Is Creative: ${analysis.isCreative}
- Is Research: ${analysis.isResearch}
- Context Length: ${analysis.contextLength} tokens

Available Models:
- phi3:mini - Fast routing and simple queries
- deepseek-r1:7b - Complex reasoning and analysis
- qwen2.5-coder:7b - Code generation and technical tasks
- llama3.3:70b - Creative writing and long content
- mistral:7b - General purpose, balanced
- mixtral:8x7b - Multi-domain expertise
- gemma2:9b - Research and data analysis

Select ONE model and explain why in 2-3 words. Format: MODEL: <model_name> REASON: <brief_reason>`;
  }

  parseRoutingResponse(response) {
    const modelMatch = response.match(/MODEL:\s*([^\s]+)/i);
    const reasonMatch = response.match(/REASON:\s*(.+)/i);
    
    return {
      model: modelMatch ? modelMatch[1].trim() : 'mistral:7b',
      reason: reasonMatch ? reasonMatch[1].trim() : 'Default selection'
    };
  }

  validateRoutingDecision(decision, analysis, performanceMode) {
    const { models, routing_rules } = this.modelCapabilities;
    
    // Check if model exists
    if (!models[decision.model]) {
      decision.model = 'mistral:7b';
      decision.reason = 'Invalid model selection, using default';
    }

    // Apply performance mode constraints
    if (performanceMode === 'fast') {
      const fastModels = ['phi3:mini', 'mistral:7b', 'gemma2:9b'];
      if (!fastModels.includes(decision.model)) {
        decision.model = 'mistral:7b';
        decision.reason += ' (adjusted for fast mode)';
      }
    } else if (performanceMode === 'quality') {
      const qualityModels = ['deepseek-r1:7b', 'llama3.3:70b', 'mixtral:8x7b'];
      if (analysis.complexity === 'complex' && !qualityModels.includes(decision.model)) {
        decision.model = 'deepseek-r1:7b';
        decision.reason += ' (upgraded for quality mode)';
      }
    }

    // Calculate confidence score
    const modelCaps = models[decision.model].capabilities;
    const taskTypeScore = modelCaps[analysis.taskType.type] || 0.5;
    const complexityFit = this.assessComplexityFit(decision.model, analysis.complexity);
    const confidence = (taskTypeScore + complexityFit) / 2;

    return {
      selectedModel: decision.model,
      reasoning: decision.reason,
      confidence: confidence,
      analysis: {
        taskType: analysis.taskType.type,
        complexity: analysis.complexity,
        performanceMode: performanceMode
      }
    };
  }

  assessComplexityFit(model, complexity) {
    const { models } = this.modelCapabilities;
    const modelData = models[model];
    
    const complexityScores = {
      simple: { low: 1.0, medium: 0.7, high: 0.5, very_high: 0.3 },
      moderate: { low: 0.6, medium: 1.0, high: 0.8, very_high: 0.6 },
      complex: { low: 0.3, medium: 0.6, high: 1.0, very_high: 1.0 }
    };
    
    const resourceLevel = modelData.resource_requirements.compute;
    return complexityScores[complexity][resourceLevel] || 0.5;
  }

  ruleBasedRouting(analysis, performanceMode) {
    const { routing_rules } = this.modelCapabilities;
    const { task_patterns, complexity_thresholds } = routing_rules;
    
    // Match task type
    const taskConfig = task_patterns[analysis.taskType.type] || task_patterns.general;
    const preferredModels = taskConfig.preferred_models;
    
    // Filter by complexity
    const complexityConfig = complexity_thresholds[analysis.complexity];
    const complexityModels = complexityConfig.models;
    
    // Find intersection
    const suitableModels = preferredModels.filter(model => 
      complexityModels.includes(model)
    );
    
    const selectedModel = suitableModels[0] || taskConfig.fallback || 'mistral:7b';
    
    return {
      selectedModel,
      reasoning: `Rule-based selection for ${analysis.taskType.type} ${analysis.complexity} task`,
      confidence: 0.75,
      analysis: {
        taskType: analysis.taskType.type,
        complexity: analysis.complexity,
        performanceMode
      }
    };
  }

  // Generate response with selected model and consistent personality
  async generateResponse(message, routingDecision, options = {}) {
    const { selectedModel, reasoning, confidence } = routingDecision;
    const { sessionId, userId, conversationHistory = [] } = options;

    try {
      // Get personality prompt for the model
      const personalityPrompt = this.getPersonalityPrompt(selectedModel);
      
      // Build conversation context
      const messages = this.buildConversationContext(
        message,
        conversationHistory,
        personalityPrompt
      );

      // Track start time for performance metrics
      const startTime = Date.now();

      // Generate response using selected model
      const response = await ollamaService.chat(messages, {
        model: selectedModel,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000
      });

      // Track performance
      const responseTime = Date.now() - startTime;
      await this.trackPerformance(selectedModel, responseTime, sessionId);

      // Format response with metadata
      return {
        response: response.message.content,
        metadata: {
          model: selectedModel,
          reasoning,
          confidence,
          responseTime,
          tokensGenerated: response.eval_count || 0
        }
      };
    } catch (error) {
      console.error(`Error generating response with ${selectedModel}:`, error);
      
      // Try fallback model
      if (selectedModel !== 'mistral:7b') {
        return this.generateResponse(message, {
          selectedModel: 'mistral:7b',
          reasoning: 'Fallback due to primary model error',
          confidence: 0.5
        }, options);
      }
      
      throw error;
    }
  }

  getPersonalityPrompt(model) {
    const { personality_prompts } = this.modelCapabilities;
    const basePrompt = personality_prompts.base;
    const modelSpecific = personality_prompts.model_specific[model] || '';
    
    return `${basePrompt}\n\n${modelSpecific}`;
  }

  buildConversationContext(message, history, personalityPrompt) {
    const messages = [
      {
        role: 'system',
        content: personalityPrompt
      }
    ];

    // Add conversation history (limit to recent messages for context window)
    const recentHistory = history.slice(-10);
    messages.push(...recentHistory);

    // Add current message
    messages.push({
      role: 'user',
      content: message
    });

    return messages;
  }

  async trackRoutingMetrics(decision, sessionId, userId) {
    try {
      await analyticsService.trackEvent('orchestrator', 'model_routed', {
        model: decision.selectedModel,
        reasoning: decision.reasoning,
        confidence: decision.confidence,
        taskType: decision.analysis?.taskType,
        complexity: decision.analysis?.complexity,
        sessionId,
        userId
      });

      // Update model usage stats
      const currentCount = this.performanceMetrics.get(decision.selectedModel) || 0;
      this.performanceMetrics.set(decision.selectedModel, currentCount + 1);
    } catch (error) {
      console.error('Error tracking routing metrics:', error);
    }
  }

  async trackPerformance(model, responseTime, sessionId) {
    try {
      await analyticsService.trackMetric('orchestrator', 'response_time', responseTime, {
        model,
        sessionId
      });

      // Update performance cache
      const key = `${model}_avg_response`;
      const current = this.performanceMetrics.get(key) || { sum: 0, count: 0 };
      current.sum += responseTime;
      current.count += 1;
      this.performanceMetrics.set(key, current);
    } catch (error) {
      console.error('Error tracking performance:', error);
    }
  }

  generateCacheKey(message, performanceMode) {
    // Simple hash for cache key
    const hash = message.substring(0, 100).split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return `${hash}_${performanceMode}`;
  }

  // Get orchestrator statistics
  async getStatistics() {
    const stats = {
      routing_cache_size: this.routingCache.size,
      model_usage: {},
      average_response_times: {},
      total_requests: 0
    };

    // Calculate model usage
    for (const [key, value] of this.performanceMetrics.entries()) {
      if (!key.includes('_avg_response')) {
        stats.model_usage[key] = value;
        stats.total_requests += value;
      } else {
        const model = key.replace('_avg_response', '');
        stats.average_response_times[model] = value.count > 0
          ? Math.round(value.sum / value.count)
          : 0;
      }
    }

    return stats;
  }

  // Clear old cache entries
  async cleanupCache() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    for (const [key, value] of this.routingCache.entries()) {
      if (now - value.timestamp > maxAge) {
        this.routingCache.delete(key);
      }
    }
  }
}

export default new LLMOrchestrator();