import geminiService from './geminiService.js';
import anthropicService from './anthropicService.js';
import openAIService from './openaiService.js';
import grokService from './grokService.js';
import confidenceService from './confidenceService.js';
import budgetManager from './budgetManager.js';
import { config } from 'dotenv';

config();

class MultiModelCodingService {
  constructor() {
    this.models = {
      'gemini-2.5': {
        service: geminiService,
        priority: 1, // Highest priority for coding
        cost: 'medium',
        strengths: ['code-generation', 'debugging', 'optimization'],
        enabled: !!process.env.GEMINI_API_KEY
      },
      'grok': {
        service: grokService,
        priority: 2,
        cost: 'medium',
        strengths: ['vision-tasks', 'creative-coding', 'problem-solving', 'ui-analysis'],
        enabled: !!process.env.GROK_API_KEY
      },
      'claude-opus': {
        service: anthropicService,
        priority: 3,
        cost: 'high',
        strengths: ['code-review', 'refactoring', 'architecture'],
        enabled: !!process.env.ANTHROPIC_API_KEY
      },
      'gpt-4': {
        service: openAIService,
        priority: 4,
        cost: 'high',
        strengths: ['general-coding', 'documentation', 'testing'],
        enabled: !!process.env.OPENAI_API_KEY
      }
    };

    this.initializeGrok();
  }

  async initializeGrok() {
    // Placeholder for Grok API integration
    // When Grok API becomes available, implement here
    if (process.env.GROK_API_KEY) {
      console.log('Grok API integration placeholder - implement when API is available');
      // this.models.grok.service = new GrokService();
    }
  }

  // Intelligent model selection based on task type and complexity
  selectBestModel(task, code = '', options = {}) {
    const taskType = this.classifyTask(task, code);
    const complexity = this.assessComplexity(task, code);
    
    // Get available models sorted by priority
    const availableModels = Object.entries(this.models)
      .filter(([_, model]) => model.enabled && model.service)
      .sort((a, b) => a[1].priority - b[1].priority);

    // For high complexity tasks, prefer higher-tier models
    if (complexity === 'high') {
      const highTierModels = availableModels.filter(([name, _]) => 
        ['gemini-2.5', 'claude-opus'].includes(name)
      );
      if (highTierModels.length > 0) {
        return highTierModels[0][0];
      }
    }

    // For specific task types, prefer specialized models
    const specializationMap = {
      'debugging': ['gemini-2.5', 'grok'],
      'code-review': ['claude-opus', 'gemini-2.5'],
      'optimization': ['gemini-2.5', 'claude-opus'],
      'testing': ['gpt-4', 'gemini-2.5'],
      'refactoring': ['claude-opus', 'gemini-2.5'],
      'explanation': ['grok', 'gpt-4'],
      'creative': ['grok', 'gemini-2.5']
    };

    if (specializationMap[taskType]) {
      for (const preferredModel of specializationMap[taskType]) {
        const found = availableModels.find(([name, _]) => name === preferredModel);
        if (found) {
          return found[0];
        }
      }
    }

    // Default to highest priority available model
    return availableModels[0][0];
  }

  classifyTask(task, code) {
    const taskLower = task.toLowerCase();
    
    if (taskLower.includes('debug') || taskLower.includes('error') || taskLower.includes('fix')) {
      return 'debugging';
    }
    if (taskLower.includes('review') || taskLower.includes('analyze')) {
      return 'code-review';
    }
    if (taskLower.includes('optimize') || taskLower.includes('performance') || taskLower.includes('speed')) {
      return 'optimization';
    }
    if (taskLower.includes('test') || taskLower.includes('unit test') || taskLower.includes('jest')) {
      return 'testing';
    }
    if (taskLower.includes('refactor') || taskLower.includes('clean up') || taskLower.includes('restructure')) {
      return 'refactoring';
    }
    if (taskLower.includes('explain') || taskLower.includes('understand') || taskLower.includes('how does')) {
      return 'explanation';
    }
    if (taskLower.includes('creative') || taskLower.includes('innovative') || taskLower.includes('unique')) {
      return 'creative';
    }
    
    return 'general';
  }

  assessComplexity(task, code) {
    let complexity = 0;
    
    // Task complexity indicators
    const highComplexityKeywords = [
      'algorithm', 'optimization', 'performance', 'scalability', 'architecture',
      'distributed', 'concurrent', 'parallel', 'async', 'database', 'security'
    ];
    
    const mediumComplexityKeywords = [
      'api', 'framework', 'library', 'integration', 'testing', 'validation'
    ];

    highComplexityKeywords.forEach(keyword => {
      if (task.toLowerCase().includes(keyword)) complexity += 3;
    });

    mediumComplexityKeywords.forEach(keyword => {
      if (task.toLowerCase().includes(keyword)) complexity += 1;
    });

    // Code complexity indicators
    if (code) {
      if (code.length > 1000) complexity += 2;
      if (code.includes('class ') || code.includes('interface ')) complexity += 2;
      if (code.includes('async ') || code.includes('await ')) complexity += 1;
      if (code.includes('Promise') || code.includes('callback')) complexity += 1;
    }

    if (complexity >= 6) return 'high';
    if (complexity >= 3) return 'medium';
    return 'low';
  }

  // Multi-model approach: try primary model, escalate if confidence is low
  async solveCodingTask(task, code = '', options = {}) {
    const primaryModel = this.selectBestModel(task, code, options);
    const startTime = Date.now();
    
    console.log(`[MultiModel] Selected ${primaryModel} for task: "${task.substring(0, 50)}..."`);

    try {
      // Try primary model
      const primaryResult = await this.executeWithModel(primaryModel, task, code, options);
      const confidence = confidenceService.evaluateCodingConfidence(primaryResult, task, code);
      
      confidenceService.logConfidenceDecision(task, confidence, false);

      // If confidence is high enough, return result
      if (confidence.score >= 90) {
        return {
          ...primaryResult,
          model: primaryModel,
          confidence: confidence.score,
          executionTime: Date.now() - startTime,
          escalated: false
        };
      }

      // Low confidence - try ensemble approach
      console.log(`[MultiModel] Low confidence (${confidence.score}%), trying ensemble approach`);
      
      return await this.ensembleApproach(task, code, options, primaryResult, primaryModel);

    } catch (error) {
      console.error(`[MultiModel] Primary model ${primaryModel} failed:`, error.message);
      
      // Fallback to next available model
      return await this.fallbackToNextModel(task, code, options, primaryModel);
    }
  }

  async executeWithModel(modelName, task, code, options) {
    const model = this.models[modelName];
    
    if (!model || !model.service) {
      throw new Error(`Model ${modelName} not available`);
    }

    if (modelName === 'gemini-2.5') {
      return await model.service.codingTask(task, code, options);
    } else if (modelName === 'claude-opus') {
      return await model.service.codingTask(task, code, options);
    } else if (modelName === 'gpt-4') {
      const messages = [
        {
          role: 'system',
          content: 'You are an expert programmer. Provide clean, efficient, and well-commented code.'
        },
        {
          role: 'user',
          content: task + (code ? '\n\nCurrent code:\n```\n' + code + '\n```' : '')
        }
      ];
      return await model.service.chat(messages, { ...options, temperature: 0.3 });
    } else if (modelName === 'grok') {
      // Placeholder for Grok implementation
      throw new Error('Grok API not yet implemented');
    }
    
    throw new Error(`Unknown model: ${modelName}`);
  }

  // Ensemble approach: combine multiple models for better results
  async ensembleApproach(task, code, options, primaryResult, primaryModel) {
    const startTime = Date.now();
    const results = [{ model: primaryModel, result: primaryResult }];
    
    // Get secondary model (different from primary)
    const availableModels = Object.keys(this.models)
      .filter(name => name !== primaryModel && this.models[name].enabled && this.models[name].service);
    
    if (availableModels.length === 0) {
      console.log('[MultiModel] No secondary models available, returning primary result');
      return {
        ...primaryResult,
        model: primaryModel,
        confidence: confidenceService.evaluateCodingConfidence(primaryResult, task, code).score,
        executionTime: Date.now() - startTime,
        escalated: false
      };
    }

    const secondaryModel = availableModels[0];
    console.log(`[MultiModel] Using secondary model: ${secondaryModel}`);

    try {
      const secondaryResult = await this.executeWithModel(secondaryModel, task, code, options);
      results.push({ model: secondaryModel, result: secondaryResult });

      // Evaluate both results and pick the best one
      const bestResult = this.selectBestResult(results, task, code);
      
      return {
        ...bestResult.result,
        model: bestResult.model,
        confidence: confidenceService.evaluateCodingConfidence(bestResult.result, task, code).score,
        executionTime: Date.now() - startTime,
        escalated: true,
        alternatives: results.filter(r => r.model !== bestResult.model).map(r => ({
          model: r.model,
          preview: r.result.content?.substring(0, 200) + '...'
        }))
      };

    } catch (error) {
      console.error(`[MultiModel] Secondary model ${secondaryModel} failed:`, error.message);
      
      // Return primary result even with low confidence
      return {
        ...primaryResult,
        model: primaryModel,
        confidence: confidenceService.evaluateCodingConfidence(primaryResult, task, code).score,
        executionTime: Date.now() - startTime,
        escalated: false,
        fallbackUsed: true
      };
    }
  }

  selectBestResult(results, task, code) {
    let bestResult = results[0];
    let bestScore = 0;

    for (const result of results) {
      const confidence = confidenceService.evaluateCodingConfidence(result.result, task, code);
      const modelBonus = this.models[result.model].priority <= 2 ? 5 : 0; // Bonus for higher-tier models
      const totalScore = confidence.score + modelBonus;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestResult = result;
      }
    }

    return bestResult;
  }

  async fallbackToNextModel(task, code, options, failedModel) {
    const availableModels = Object.keys(this.models)
      .filter(name => name !== failedModel && this.models[name].enabled && this.models[name].service)
      .sort((a, b) => this.models[a].priority - this.models[b].priority);

    if (availableModels.length === 0) {
      throw new Error('No fallback models available');
    }

    const fallbackModel = availableModels[0];
    console.log(`[MultiModel] Falling back to ${fallbackModel}`);

    try {
      const result = await this.executeWithModel(fallbackModel, task, code, options);
      return {
        ...result,
        model: fallbackModel,
        confidence: confidenceService.evaluateCodingConfidence(result, task, code).score,
        fallbackUsed: true
      };
    } catch (error) {
      throw new Error(`All models failed. Last error: ${error.message}`);
    }
  }

  // Get available models and their status
  getModelStatus() {
    return Object.entries(this.models).map(([name, model]) => ({
      name,
      enabled: model.enabled,
      available: !!model.service,
      priority: model.priority,
      cost: model.cost,
      strengths: model.strengths
    }));
  }

  // Specialized methods that use the best model for each task type
  async reviewCode(code, language = 'javascript', options = {}) {
    const task = `Review this ${language} code for bugs, performance issues, security vulnerabilities, and best practices`;
    return await this.solveCodingTask(task, code, options);
  }

  async debugCode(code, error, options = {}) {
    const task = `Debug this code that produces the error: ${error}. Identify the root cause and provide a fix.`;
    return await this.solveCodingTask(task, code, options);
  }

  async optimizeCode(code, targetMetric = 'performance', options = {}) {
    const task = `Optimize this code for ${targetMetric}. Provide the optimized version with explanations.`;
    return await this.solveCodingTask(task, code, options);
  }

  async generateTests(code, framework = 'jest', options = {}) {
    const task = `Generate comprehensive unit tests for this code using ${framework}. Include edge cases and error scenarios.`;
    return await this.solveCodingTask(task, code, options);
  }

  async explainCode(code, options = {}) {
    const task = 'Explain this code in detail, including how it works and any important concepts.';
    return await this.solveCodingTask(task, code, options);
  }

  async convertCode(code, fromLang, toLang, options = {}) {
    const task = `Convert this ${fromLang} code to ${toLang}. Maintain functionality and follow ${toLang} best practices.`;
    return await this.solveCodingTask(task, code, options);
  }
}

// Create singleton instance
const multiModelCodingService = new MultiModelCodingService();

export default multiModelCodingService;