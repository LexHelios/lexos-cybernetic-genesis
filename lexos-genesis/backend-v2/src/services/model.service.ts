import { config } from '@/config';
import { prisma } from '@/utils/database';
import { logger } from '@/utils/logger';
import { ExternalServiceError } from '@/utils/errors';
import axios from 'axios';

interface ChatCompletionRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

interface CompletionRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

interface ModelResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  confidence?: number;
}

export class ModelService {
  private logger = logger.child({ context: 'ModelService' });
  private defaultModel?: any;

  constructor() {
    this.loadDefaultModel();
  }

  private async loadDefaultModel() {
    this.defaultModel = await prisma.model.findFirst({
      where: { isDefault: true, isActive: true },
    });
  }

  async generateChatCompletion(request: ChatCompletionRequest): Promise<ModelResponse> {
    const model = await this.getModel(request.model);
    
    switch (model.provider) {
      case 'openai':
        return await this.openaiChatCompletion(request, model);
      case 'anthropic':
        return await this.anthropicChatCompletion(request, model);
      case 'ollama':
        return await this.ollamaChatCompletion(request, model);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  async generateCompletion(request: CompletionRequest): Promise<ModelResponse> {
    const model = await this.getModel(request.model);
    
    switch (model.provider) {
      case 'openai':
        return await this.openaiCompletion(request, model);
      case 'anthropic':
        return await this.anthropicCompletion(request, model);
      case 'ollama':
        return await this.ollamaCompletion(request, model);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  async generateEmbedding(text: string, modelName?: string): Promise<number[]> {
    const model = await this.getModel(modelName, 'EMBEDDING');
    
    switch (model.provider) {
      case 'openai':
        return await this.openaiEmbedding(text, model);
      case 'ollama':
        return await this.ollamaEmbedding(text, model);
      default:
        throw new Error(`Unsupported embedding provider: ${model.provider}`);
    }
  }

  // OpenAI implementations
  private async openaiChatCompletion(request: ChatCompletionRequest, model: any): Promise<ModelResponse> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: model.config.modelName || 'gpt-3.5-turbo',
          messages: request.messages,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.services.openai.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: response.data.choices[0].message.content,
        model: model.name,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      };
    } catch (error) {
      this.logger.error('OpenAI chat completion error:', error);
      throw new ExternalServiceError('OpenAI', error);
    }
  }

  private async openaiCompletion(request: CompletionRequest, model: any): Promise<ModelResponse> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/completions',
        {
          model: model.config.modelName || 'text-davinci-003',
          prompt: request.prompt,
          temperature: request.temperature || 0.7,
          max_tokens: request.maxTokens || 1000,
          stop: request.stopSequences,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.services.openai.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: response.data.choices[0].text.trim(),
        model: model.name,
        usage: {
          promptTokens: response.data.usage.prompt_tokens,
          completionTokens: response.data.usage.completion_tokens,
          totalTokens: response.data.usage.total_tokens,
        },
      };
    } catch (error) {
      this.logger.error('OpenAI completion error:', error);
      throw new ExternalServiceError('OpenAI', error);
    }
  }

  private async openaiEmbedding(text: string, model: any): Promise<number[]> {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: model.config.modelName || 'text-embedding-ada-002',
          input: text,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.services.openai.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      this.logger.error('OpenAI embedding error:', error);
      throw new ExternalServiceError('OpenAI', error);
    }
  }

  // Anthropic implementations
  private async anthropicChatCompletion(request: ChatCompletionRequest, model: any): Promise<ModelResponse> {
    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: model.config.modelName || 'claude-3-opus-20240229',
          messages: request.messages,
          max_tokens: request.maxTokens || 1000,
          temperature: request.temperature || 0.7,
        },
        {
          headers: {
            'x-api-key': config.services.anthropic.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        content: response.data.content[0].text,
        model: model.name,
        usage: {
          promptTokens: response.data.usage.input_tokens,
          completionTokens: response.data.usage.output_tokens,
          totalTokens: response.data.usage.input_tokens + response.data.usage.output_tokens,
        },
      };
    } catch (error) {
      this.logger.error('Anthropic chat completion error:', error);
      throw new ExternalServiceError('Anthropic', error);
    }
  }

  private async anthropicCompletion(request: CompletionRequest, model: any): Promise<ModelResponse> {
    // Convert to chat format for Anthropic
    return this.anthropicChatCompletion({
      messages: [{ role: 'user', content: request.prompt }],
      model: request.model,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    }, model);
  }

  // Ollama implementations
  private async ollamaChatCompletion(request: ChatCompletionRequest, model: any): Promise<ModelResponse> {
    try {
      const response = await axios.post(
        `${config.services.ollama.apiUrl}/api/chat`,
        {
          model: model.config.modelName || 'llama2',
          messages: request.messages,
          options: {
            temperature: request.temperature || 0.7,
            num_predict: request.maxTokens || 1000,
          },
          stream: false,
        }
      );

      return {
        content: response.data.message.content,
        model: model.name,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        },
      };
    } catch (error) {
      this.logger.error('Ollama chat completion error:', error);
      throw new ExternalServiceError('Ollama', error);
    }
  }

  private async ollamaCompletion(request: CompletionRequest, model: any): Promise<ModelResponse> {
    try {
      const response = await axios.post(
        `${config.services.ollama.apiUrl}/api/generate`,
        {
          model: model.config.modelName || 'llama2',
          prompt: request.prompt,
          options: {
            temperature: request.temperature || 0.7,
            num_predict: request.maxTokens || 1000,
            stop: request.stopSequences,
          },
          stream: false,
        }
      );

      return {
        content: response.data.response,
        model: model.name,
        usage: {
          promptTokens: response.data.prompt_eval_count || 0,
          completionTokens: response.data.eval_count || 0,
          totalTokens: (response.data.prompt_eval_count || 0) + (response.data.eval_count || 0),
        },
      };
    } catch (error) {
      this.logger.error('Ollama completion error:', error);
      throw new ExternalServiceError('Ollama', error);
    }
  }

  private async ollamaEmbedding(text: string, model: any): Promise<number[]> {
    try {
      const response = await axios.post(
        `${config.services.ollama.apiUrl}/api/embeddings`,
        {
          model: model.config.modelName || 'nomic-embed-text',
          prompt: text,
        }
      );

      return response.data.embedding;
    } catch (error) {
      this.logger.error('Ollama embedding error:', error);
      throw new ExternalServiceError('Ollama', error);
    }
  }

  // Helper methods
  private async getModel(modelName?: string, type: string = 'CHAT'): Promise<any> {
    if (modelName) {
      const model = await prisma.model.findFirst({
        where: { name: modelName, type, isActive: true },
      });
      
      if (!model) {
        throw new Error(`Model ${modelName} not found or inactive`);
      }
      
      return model;
    }

    // Use default model
    if (this.defaultModel && this.defaultModel.type === type) {
      return this.defaultModel;
    }

    // Find any active model of the requested type
    const model = await prisma.model.findFirst({
      where: { type, isActive: true },
    });

    if (!model) {
      throw new Error(`No active ${type} model found`);
    }

    return model;
  }

  // Public methods for model management
  async listModels(type?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (type) where.type = type;

    return await prisma.model.findMany({ where });
  }

  async testModel(modelId: string, testPrompt?: string): Promise<any> {
    const model = await prisma.model.findUnique({
      where: { id: modelId },
    });

    if (!model) {
      throw new Error('Model not found');
    }

    const prompt = testPrompt || 'Hello, this is a test. Please respond briefly.';

    try {
      const response = await this.generateCompletion({
        prompt,
        model: model.name,
        maxTokens: 100,
      });

      return {
        success: true,
        response: response.content,
        responseTime: Date.now(),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}