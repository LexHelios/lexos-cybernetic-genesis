import axios from 'axios';

export class OllamaService {
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.defaultModel = 'r1-unrestricted';
    this.availableModels = {
      'r1-unrestricted': {
        name: 'R1 Unrestricted',
        description: 'Advanced reasoning model with unrestricted capabilities',
        context_window: 128000,
        capabilities: ['reasoning', 'analysis', 'code_generation', 'creative_writing']
      },
      'gemma3n-unrestricted': {
        name: 'Gemma 3N Unrestricted',
        description: 'High-performance model optimized for technical tasks',
        context_window: 32000,
        capabilities: ['technical_analysis', 'problem_solving', 'mathematics', 'scientific_reasoning']
      }
    };
  }

  async generateCompletion(prompt, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: options.model || this.defaultModel,
        prompt: prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          top_p: options.top_p || 0.9,
          ...options.additionalOptions
        }
      });

      return {
        success: true,
        response: response.data.response,
        model: response.data.model,
        created_at: response.data.created_at,
        done: response.data.done,
        context: response.data.context,
        total_duration: response.data.total_duration,
        load_duration: response.data.load_duration,
        prompt_eval_duration: response.data.prompt_eval_duration,
        eval_duration: response.data.eval_duration,
        eval_count: response.data.eval_count
      };
    } catch (error) {
      console.error('Ollama generation error:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Unknown error'
      };
    }
  }

  async chat(messages, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/chat`, {
        model: options.model || this.defaultModel,
        messages: messages,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          ...options.additionalOptions
        }
      });

      return {
        success: true,
        message: response.data.message,
        model: response.data.model,
        created_at: response.data.created_at,
        done: response.data.done,
        total_duration: response.data.total_duration,
        load_duration: response.data.load_duration,
        prompt_eval_duration: response.data.prompt_eval_duration,
        eval_duration: response.data.eval_duration,
        eval_count: response.data.eval_count
      };
    } catch (error) {
      console.error('Ollama chat error:', error);
      return {
        success: false,
        error: error.message,
        details: error.response?.data || 'Unknown error'
      };
    }
  }

  async listModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      return {
        success: true,
        models: response.data.models
      };
    } catch (error) {
      console.error('Ollama list models error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkHealth() {
    try {
      await axios.get(`${this.baseUrl}/api/tags`);
      return true;
    } catch (error) {
      return false;
    }
  }

  async embeddings(prompt, options = {}) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/embeddings`, {
        model: options.model || 'nomic-embed-text',
        prompt: prompt
      });

      return {
        success: true,
        embedding: response.data.embedding
      };
    } catch (error) {
      console.error('Ollama embeddings error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getModelInfo(modelId) {
    return this.availableModels[modelId] || null;
  }

  getAvailableModels() {
    return Object.entries(this.availableModels).map(([id, info]) => ({
      id,
      ...info
    }));
  }

  async pullModel(modelName) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName,
        stream: false
      });

      return {
        success: true,
        status: response.data.status
      };
    } catch (error) {
      console.error('Ollama pull model error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteModel(modelName) {
    try {
      const response = await axios.delete(`${this.baseUrl}/api/delete`, {
        data: { name: modelName }
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Ollama delete model error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async showModel(modelName) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/show`, {
        name: modelName
      });

      return response.data;
    } catch (error) {
      console.error('Ollama show model error:', error);
      throw new Error(error.message);
    }
  }

  async copyModel(source, destination) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/copy`, {
        source,
        destination
      });

      return {
        success: true
      };
    } catch (error) {
      console.error('Ollama copy model error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getRunningModels() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/ps`);
      return response.data;
    } catch (error) {
      console.error('Ollama get running models error:', error);
      return { models: [] };
    }
  }

  async *pullModelStream(modelName) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/pull`, {
        name: modelName,
        stream: true
      }, {
        responseType: 'stream'
      });

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const progress = JSON.parse(line);
              yield progress;
            } catch (e) {
              console.error('Error parsing progress:', e);
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer);
        } catch (e) {
          console.error('Error parsing final buffer:', e);
        }
      }
    } catch (error) {
      console.error('Ollama pull model stream error:', error);
      throw error;
    }
  }

  async *generateStream(params) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        ...params,
        stream: true
      }, {
        responseType: 'stream'
      });

      const stream = response.data;
      let buffer = '';

      for await (const chunk of stream) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              yield data;
            } catch (e) {
              console.error('Error parsing generate stream:', e);
            }
          }
        }
      }

      if (buffer.trim()) {
        try {
          yield JSON.parse(buffer);
        } catch (e) {
          console.error('Error parsing final buffer:', e);
        }
      }
    } catch (error) {
      console.error('Ollama generate stream error:', error);
      throw error;
    }
  }
}