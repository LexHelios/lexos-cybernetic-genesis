import database from './database.js';

class ModelCatalogService {
  constructor() {
    this.modelCategories = {
      GENERAL: 'general',
      CODING: 'coding',
      RESEARCH: 'research',
      CREATIVE: 'creative',
      REASONING: 'reasoning',
      SPECIALIZED: 'specialized'
    };

    // Comprehensive catalog of available models
    this.modelCatalog = [
      // Llama Models
      {
        model_id: 'llama3.2:latest',
        name: 'Llama 3.2',
        provider: 'Meta',
        category: this.modelCategories.GENERAL,
        capabilities: ['general_conversation', 'reasoning', 'coding', 'creative_writing'],
        parameters: { size: '3B', quantization: 'Q4_K_M' },
        context_length: 128000,
        usage_notes: 'Excellent general-purpose model with strong reasoning capabilities',
        metadata: {
          release_date: '2024-09',
          architecture: 'transformer',
          training_data: 'diverse web content',
          strengths: ['reasoning', 'instruction_following'],
          ideal_for: ['general_tasks', 'conversation', 'analysis']
        }
      },
      {
        model_id: 'llama3.2:1b',
        name: 'Llama 3.2 1B',
        provider: 'Meta',
        category: this.modelCategories.GENERAL,
        capabilities: ['lightweight_tasks', 'basic_conversation', 'simple_reasoning'],
        parameters: { size: '1B', quantization: 'Q4_K_M' },
        context_length: 128000,
        usage_notes: 'Lightweight model for resource-constrained environments',
        metadata: {
          release_date: '2024-09',
          architecture: 'transformer',
          ideal_for: ['quick_responses', 'edge_deployment']
        }
      },
      {
        model_id: 'llama3.1:latest',
        name: 'Llama 3.1',
        provider: 'Meta',
        category: this.modelCategories.GENERAL,
        capabilities: ['general_conversation', 'reasoning', 'multilingual'],
        parameters: { size: '8B', quantization: 'Q4_K_M' },
        context_length: 128000,
        usage_notes: 'Previous generation with proven stability',
        metadata: {
          release_date: '2024-07',
          architecture: 'transformer',
          ideal_for: ['stable_deployments', 'production_use']
        }
      },

      // Qwen Models
      {
        model_id: 'qwen2.5-coder:7b-instruct',
        name: 'Qwen 2.5 Coder 7B',
        provider: 'Alibaba',
        category: this.modelCategories.CODING,
        capabilities: ['code_generation', 'debugging', 'code_explanation', 'refactoring'],
        parameters: { size: '7B', variant: 'instruct' },
        context_length: 32768,
        usage_notes: 'Specialized for coding tasks with excellent language understanding',
        metadata: {
          release_date: '2024-11',
          architecture: 'transformer',
          training_focus: 'code_and_technical',
          languages_supported: ['python', 'javascript', 'java', 'c++', 'go', 'rust'],
          ideal_for: ['code_generation', 'debugging', 'technical_documentation']
        }
      },
      {
        model_id: 'qwen2.5:latest',
        name: 'Qwen 2.5',
        provider: 'Alibaba',
        category: this.modelCategories.GENERAL,
        capabilities: ['multilingual', 'reasoning', 'conversation'],
        parameters: { size: '7B', quantization: 'Q4_K_M' },
        context_length: 32768,
        usage_notes: 'Strong multilingual capabilities with good reasoning',
        metadata: {
          release_date: '2024-11',
          languages: ['english', 'chinese', 'spanish', 'french', 'german'],
          ideal_for: ['multilingual_tasks', 'translation', 'cultural_awareness']
        }
      },

      // DeepSeek Models
      {
        model_id: 'deepseek-r1:7b',
        name: 'DeepSeek R1 7B',
        provider: 'DeepSeek',
        category: this.modelCategories.REASONING,
        capabilities: ['advanced_reasoning', 'mathematical_thinking', 'logical_analysis', 'research'],
        parameters: { size: '7B', variant: 'reasoning' },
        context_length: 32768,
        usage_notes: 'Specialized reasoning model with chain-of-thought capabilities',
        metadata: {
          release_date: '2024-12',
          architecture: 'transformer_with_reasoning',
          training_focus: 'reasoning_and_analysis',
          strengths: ['complex_problem_solving', 'mathematical_proofs', 'logical_deduction'],
          ideal_for: ['research', 'analysis', 'complex_reasoning']
        }
      },
      {
        model_id: 'deepseek-r1:8b',
        name: 'DeepSeek R1 8B',
        provider: 'DeepSeek',
        category: this.modelCategories.REASONING,
        capabilities: ['advanced_reasoning', 'research', 'analysis'],
        parameters: { size: '8B', variant: 'reasoning' },
        context_length: 32768,
        usage_notes: 'Larger reasoning model for more complex tasks',
        metadata: {
          release_date: '2024-12',
          ideal_for: ['deep_analysis', 'research_tasks', 'complex_reasoning']
        }
      },

      // Gemma Models
      {
        model_id: 'gemma2:2b',
        name: 'Gemma 2 2B',
        provider: 'Google',
        category: this.modelCategories.GENERAL,
        capabilities: ['efficient_processing', 'basic_tasks', 'conversation'],
        parameters: { size: '2B', quantization: 'Q4_K_M' },
        context_length: 8192,
        usage_notes: 'Efficient small model from Google with good performance',
        metadata: {
          release_date: '2024-06',
          architecture: 'gemma_architecture',
          ideal_for: ['lightweight_tasks', 'mobile_deployment', 'quick_responses']
        }
      },
      {
        model_id: 'gemma2:latest',
        name: 'Gemma 2',
        provider: 'Google',
        category: this.modelCategories.GENERAL,
        capabilities: ['general_tasks', 'conversation', 'analysis'],
        parameters: { size: '9B', quantization: 'Q4_K_M' },
        context_length: 8192,
        usage_notes: 'Google\'s efficient model with good general capabilities',
        metadata: {
          release_date: '2024-06',
          ideal_for: ['general_conversation', 'content_generation']
        }
      },

      // Phi Models
      {
        model_id: 'phi3.5:latest',
        name: 'Phi 3.5',
        provider: 'Microsoft',
        category: this.modelCategories.GENERAL,
        capabilities: ['reasoning', 'conversation', 'efficiency'],
        parameters: { size: '3.8B', architecture: 'phi' },
        context_length: 128000,
        usage_notes: 'Microsoft\'s efficient small language model',
        metadata: {
          release_date: '2024-08',
          architecture: 'phi_architecture',
          training_approach: 'textbook_quality_data',
          ideal_for: ['reasoning_tasks', 'educational_content']
        }
      },

      // Mistral Models
      {
        model_id: 'mistral:latest',
        name: 'Mistral 7B',
        provider: 'Mistral AI',
        category: this.modelCategories.GENERAL,
        capabilities: ['general_conversation', 'instruction_following', 'creative_tasks'],
        parameters: { size: '7B', quantization: 'Q4_K_M' },
        context_length: 32768,
        usage_notes: 'Well-balanced model with good performance across tasks',
        metadata: {
          release_date: '2023-09',
          architecture: 'mistral_architecture',
          ideal_for: ['general_tasks', 'creative_writing', 'conversation']
        }
      },

      // Specialized Models
      {
        model_id: 'codellama:latest',
        name: 'Code Llama',
        provider: 'Meta',
        category: this.modelCategories.CODING,
        capabilities: ['code_generation', 'code_completion', 'debugging'],
        parameters: { size: '7B', variant: 'code' },
        context_length: 100000,
        usage_notes: 'Specialized for coding tasks based on Llama architecture',
        metadata: {
          release_date: '2023-08',
          languages_supported: ['python', 'javascript', 'java', 'c++', 'typescript'],
          ideal_for: ['code_generation', 'code_review', 'debugging']
        }
      },
      {
        model_id: 'starcoder2:latest',
        name: 'StarCoder 2',
        provider: 'HuggingFace',
        category: this.modelCategories.CODING,
        capabilities: ['code_generation', 'multi_language_coding', 'code_understanding'],
        parameters: { size: '7B', variant: 'code' },
        context_length: 16384,
        usage_notes: 'Advanced coding model trained on diverse code repositories',
        metadata: {
          release_date: '2024-02',
          training_data: 'the_stack_v2',
          languages_supported: ['600+_programming_languages'],
          ideal_for: ['polyglot_coding', 'code_translation']
        }
      },

      // Creative Models
      {
        model_id: 'llama3-groq-tool-use:latest',
        name: 'Llama 3 Tool Use',
        provider: 'Groq/Meta',
        category: this.modelCategories.SPECIALIZED,
        capabilities: ['tool_use', 'function_calling', 'api_integration'],
        parameters: { size: '8B', variant: 'tool_use' },
        context_length: 32768,
        usage_notes: 'Optimized for tool use and function calling',
        metadata: {
          release_date: '2024-10',
          specialized_for: 'tool_and_api_usage',
          ideal_for: ['agent_systems', 'api_integration', 'tool_orchestration']
        }
      }
    ];

    // Performance benchmarks (simulated)
    this.performanceBenchmarks = {
      'llama3.2:latest': {
        reasoning_score: 0.92,
        coding_score: 0.88,
        creative_score: 0.90,
        speed_score: 0.85,
        efficiency_score: 0.87
      },
      'qwen2.5-coder:7b-instruct': {
        reasoning_score: 0.85,
        coding_score: 0.95,
        creative_score: 0.78,
        speed_score: 0.83,
        efficiency_score: 0.84
      },
      'deepseek-r1:7b': {
        reasoning_score: 0.96,
        coding_score: 0.82,
        creative_score: 0.75,
        speed_score: 0.78,
        efficiency_score: 0.80
      },
      'gemma2:2b': {
        reasoning_score: 0.78,
        coding_score: 0.72,
        creative_score: 0.80,
        speed_score: 0.95,
        efficiency_score: 0.96
      }
    };
  }

  // Initialize model catalog in database
  async initializeModelCatalog() {
    for (const model of this.modelCatalog) {
      const existing = await database.getLLMModel(model.model_id);
      if (!existing) {
        // Add performance metrics if available
        if (this.performanceBenchmarks[model.model_id]) {
          model.performance_metrics = JSON.stringify(this.performanceBenchmarks[model.model_id]);
        }

        await database.addLLMModel(model);
      }
    }

    await database.logSystemEvent(
      'system',
      'info',
      'ModelCatalogService',
      `Model catalog initialized with ${this.modelCatalog.length} models`
    );
  }

  // Get models by category
  async getModelsByCategory(category) {
    const allModels = await database.getAllLLMModels();
    return allModels.filter(model => model.category === category);
  }

  // Get models by capability
  async getModelsByCapability(capability) {
    const allModels = await database.getAllLLMModels();
    return allModels.filter(model => 
      model.capabilities && model.capabilities.includes(capability)
    );
  }

  // Recommend model for task
  async recommendModel(taskType, requirements = {}) {
    const {
      maxSize = null,
      minContextLength = 0,
      preferredProvider = null,
      requiredCapabilities = []
    } = requirements;

    let models = await database.getAllLLMModels();

    // Filter by task type
    const taskToCategory = {
      'coding': this.modelCategories.CODING,
      'research': this.modelCategories.RESEARCH,
      'creative': this.modelCategories.CREATIVE,
      'reasoning': this.modelCategories.REASONING,
      'general': this.modelCategories.GENERAL
    };

    if (taskToCategory[taskType]) {
      models = models.filter(m => m.category === taskToCategory[taskType]);
    }

    // Apply filters
    if (maxSize) {
      models = models.filter(m => {
        const size = parseFloat(m.parameters.size);
        return size <= maxSize;
      });
    }

    if (minContextLength > 0) {
      models = models.filter(m => m.context_length >= minContextLength);
    }

    if (preferredProvider) {
      models = models.filter(m => m.provider === preferredProvider);
    }

    if (requiredCapabilities.length > 0) {
      models = models.filter(m => 
        requiredCapabilities.every(cap => m.capabilities.includes(cap))
      );
    }

    // Score and rank models
    const scoredModels = models.map(model => {
      let score = 0;
      
      // Base score from performance metrics
      if (model.performance_metrics) {
        const metrics = JSON.parse(model.performance_metrics);
        const taskScoreMap = {
          'coding': metrics.coding_score,
          'research': metrics.reasoning_score,
          'creative': metrics.creative_score,
          'reasoning': metrics.reasoning_score,
          'general': (metrics.reasoning_score + metrics.creative_score) / 2
        };
        score += (taskScoreMap[taskType] || 0.5) * 0.5;
      }

      // Context length bonus
      if (model.context_length > 32768) {
        score += 0.1;
      }

      // Efficiency bonus for smaller models
      const size = parseFloat(model.parameters.size);
      if (size < 4) {
        score += 0.15;
      }

      // Recency bonus
      if (model.metadata && model.metadata.release_date) {
        const releaseDate = new Date(model.metadata.release_date);
        const monthsOld = (Date.now() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
        if (monthsOld < 6) {
          score += 0.1;
        }
      }

      return { ...model, score };
    });

    // Sort by score
    scoredModels.sort((a, b) => b.score - a.score);

    return {
      recommended: scoredModels[0],
      alternatives: scoredModels.slice(1, 4),
      reasoning: this.generateRecommendationReasoning(scoredModels[0], taskType, requirements)
    };
  }

  // Generate reasoning for recommendation
  generateRecommendationReasoning(model, taskType, requirements) {
    const reasons = [];

    if (model.category === this.modelCategories[taskType.toUpperCase()]) {
      reasons.push(`Specialized for ${taskType} tasks`);
    }

    if (model.performance_metrics) {
      const metrics = JSON.parse(model.performance_metrics);
      const relevantScore = metrics[`${taskType}_score`] || metrics.reasoning_score;
      if (relevantScore > 0.9) {
        reasons.push(`Excellent performance in ${taskType} (${(relevantScore * 100).toFixed(0)}%)`);
      }
    }

    if (model.context_length > 32768) {
      reasons.push(`Large context window (${model.context_length.toLocaleString()} tokens)`);
    }

    const size = parseFloat(model.parameters.size);
    if (size < 4) {
      reasons.push('Efficient resource usage');
    }

    if (requirements.requiredCapabilities?.length > 0) {
      reasons.push(`Supports all required capabilities`);
    }

    return reasons.join('; ');
  }

  // Update model availability
  async updateModelAvailability(modelId, isAvailable) {
    await database.db.run(
      'UPDATE llm_models SET is_available = ? WHERE model_id = ?',
      [isAvailable ? 1 : 0, modelId]
    );

    await database.logSystemEvent(
      'model',
      'info',
      'ModelCatalogService',
      `Model ${modelId} availability updated to ${isAvailable}`
    );
  }

  // Get model statistics
  async getModelStatistics() {
    const models = await database.getAllLLMModels();
    
    const stats = {
      total_models: models.length,
      by_category: {},
      by_provider: {},
      average_context_length: 0,
      size_distribution: {
        small: 0,  // < 3B
        medium: 0, // 3B - 7B
        large: 0   // > 7B
      }
    };

    models.forEach(model => {
      // Category stats
      stats.by_category[model.category] = (stats.by_category[model.category] || 0) + 1;
      
      // Provider stats
      stats.by_provider[model.provider] = (stats.by_provider[model.provider] || 0) + 1;
      
      // Context length
      stats.average_context_length += model.context_length;
      
      // Size distribution
      const size = parseFloat(model.parameters.size);
      if (size < 3) stats.size_distribution.small++;
      else if (size <= 7) stats.size_distribution.medium++;
      else stats.size_distribution.large++;
    });

    stats.average_context_length = Math.round(stats.average_context_length / models.length);

    return stats;
  }
}

export default new ModelCatalogService();