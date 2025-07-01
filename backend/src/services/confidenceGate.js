import { EventEmitter } from 'events';

/**
 * Confidence-Gated Escalation System
 * Monitors agent response confidence and automatically escalates to fallback APIs
 * when confidence falls below configured thresholds
 */
class ConfidenceGate extends EventEmitter {
  constructor() {
    super();
    this.escalationHistory = new Map();
    this.metrics = {
      totalRequests: 0,
      escalations: 0,
      apiCalls: 0,
      costSavings: 0
    };
  }

  /**
   * Evaluate response confidence and determine if escalation is needed
   * @param {Object} response - Agent response with metadata
   * @param {Object} config - Agent configuration with thresholds
   * @returns {Object} - Escalation decision and metadata
   */
  evaluateConfidence(response, config) {
    this.metrics.totalRequests++;
    
    const confidence = this.calculateConfidence(response);
    const threshold = config.confidence_threshold || 0.85;
    const shouldEscalate = confidence < threshold;
    
    const evaluation = {
      confidence,
      threshold,
      shouldEscalate,
      agent: config.id,
      timestamp: new Date().toISOString(),
      response_length: response.response?.length || 0,
      execution_time: response.executionTime || 0
    };

    if (shouldEscalate) {
      this.metrics.escalations++;
      this.logEscalation(evaluation);
      this.emit('escalation_triggered', evaluation);
    }

    return evaluation;
  }

  /**
   * Calculate confidence score from response metadata
   * Uses multiple signals: log probabilities, response length, execution time, etc.
   */
  calculateConfidence(response) {
    let confidence = 0.5; // Base confidence
    
    // Factor 1: Log probabilities (if available)
    if (response.logprobs && response.logprobs.length > 0) {
      const avgLogProb = response.logprobs.reduce((sum, prob) => sum + prob, 0) / response.logprobs.length;
      confidence += Math.exp(avgLogProb) * 0.4; // Convert log prob to confidence
    }
    
    // Factor 2: Response completeness
    if (response.response && response.response.length > 50) {
      confidence += 0.2;
    }
    
    // Factor 3: No error indicators
    if (!response.error && !response.response?.includes('I don\'t know') && 
        !response.response?.includes('I\'m not sure')) {
      confidence += 0.2;
    }
    
    // Factor 4: Execution time (reasonable response time indicates confidence)
    if (response.executionTime && response.executionTime < 5000) {
      confidence += 0.1;
    }
    
    // Factor 5: Model-specific confidence signals
    if (response.model?.includes('deepseek-r1') && response.response?.includes('<think>')) {
      confidence += 0.1; // R1 models with thinking show higher confidence
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Execute fallback API call when local model confidence is low
   */
  async executeEscalation(originalRequest, config, evaluation) {
    this.metrics.apiCalls++;
    
    const fallbackAPI = config.fallback_api;
    if (!fallbackAPI) {
      throw new Error(`No fallback API configured for agent ${config.id}`);
    }

    console.log(`🚨 Escalating to ${fallbackAPI} - Confidence: ${evaluation.confidence.toFixed(3)} < ${evaluation.threshold}`);

    try {
      const startTime = Date.now();
      let escalatedResponse;

      // Route to appropriate API
      switch (fallbackAPI) {
        case 'gpt-4o':
        case 'gpt-4.1':
          escalatedResponse = await this.callOpenAI(originalRequest, fallbackAPI);
          break;
        case 'claude-opus-4':
          escalatedResponse = await this.callAnthropic(originalRequest, fallbackAPI);
          break;
        case 'gemini-2.5-pro':
          escalatedResponse = await this.callGemini(originalRequest, fallbackAPI);
          break;
        default:
          throw new Error(`Unsupported fallback API: ${fallbackAPI}`);
      }

      const escalationTime = Date.now() - startTime;
      
      const result = {
        ...escalatedResponse,
        escalated: true,
        fallback_api: fallbackAPI,
        original_confidence: evaluation.confidence,
        escalation_time: escalationTime,
        cost_estimate: this.estimateAPICost(fallbackAPI, originalRequest.message)
      };

      this.emit('escalation_completed', {
        agent: config.id,
        fallback_api: fallbackAPI,
        execution_time: escalationTime,
        success: true
      });

      return result;

    } catch (error) {
      console.error(`Escalation to ${fallbackAPI} failed:`, error);
      this.emit('escalation_failed', {
        agent: config.id,
        fallback_api: fallbackAPI,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Call OpenAI API (GPT-4o, GPT-4.1)
   */
  async callOpenAI(request, model) {
    // This would integrate with actual OpenAI API
    // For now, return a mock response indicating escalation
    return {
      response: `[ESCALATED TO ${model.toUpperCase()}] ${request.message} - This response was generated by the fallback API due to low confidence from the local model.`,
      model: model,
      executionTime: 1500,
      confidence: 0.95
    };
  }

  /**
   * Call Anthropic API (Claude Opus 4)
   */
  async callAnthropic(request, model) {
    return {
      response: `[ESCALATED TO ${model.toUpperCase()}] ${request.message} - High-quality response from Claude with superior reasoning capabilities.`,
      model: model,
      executionTime: 2000,
      confidence: 0.97
    };
  }

  /**
   * Call Google Gemini API
   */
  async callGemini(request, model) {
    return {
      response: `[ESCALATED TO ${model.toUpperCase()}] ${request.message} - Advanced multimodal response from Gemini.`,
      model: model,
      executionTime: 1800,
      confidence: 0.94
    };
  }

  /**
   * Estimate API cost for budget tracking
   */
  estimateAPICost(api, message) {
    const tokenEstimate = message.length / 4; // Rough token estimation
    
    const costs = {
      'gpt-4o': tokenEstimate * 0.00003, // $30/1M tokens
      'gpt-4.1': tokenEstimate * 0.00006, // $60/1M tokens  
      'claude-opus-4': tokenEstimate * 0.000075, // $75/1M tokens
      'gemini-2.5-pro': tokenEstimate * 0.00001 // $10/1M tokens
    };

    return costs[api] || 0;
  }

  /**
   * Log escalation for monitoring and analysis
   */
  logEscalation(evaluation) {
    const escalationData = {
      timestamp: evaluation.timestamp,
      agent: evaluation.agent,
      confidence: evaluation.confidence,
      threshold: evaluation.threshold,
      response_length: evaluation.response_length,
      execution_time: evaluation.execution_time
    };

    this.escalationHistory.set(
      `${evaluation.agent}_${Date.now()}`, 
      escalationData
    );

    // Keep only last 1000 escalations in memory
    if (this.escalationHistory.size > 1000) {
      const firstKey = this.escalationHistory.keys().next().value;
      this.escalationHistory.delete(firstKey);
    }

    console.log(`📊 Escalation logged:`, escalationData);
  }

  /**
   * Get escalation metrics and analytics
   */
  getMetrics() {
    const escalationRate = this.metrics.totalRequests > 0 
      ? (this.metrics.escalations / this.metrics.totalRequests * 100).toFixed(2)
      : 0;

    return {
      ...this.metrics,
      escalation_rate: `${escalationRate}%`,
      recent_escalations: Array.from(this.escalationHistory.values()).slice(-10)
    };
  }

  /**
   * Reset metrics (useful for monitoring periods)
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      escalations: 0,
      apiCalls: 0,
      costSavings: 0
    };
    this.escalationHistory.clear();
  }
}

export default new ConfidenceGate();