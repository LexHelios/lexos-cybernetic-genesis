// Ollama API Service for managing local LLM models
import { apiClient } from './api';

export interface OllamaModel {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface ModelInfo {
  modelfile: string;
  parameters: string;
  template: string;
  system?: string;
  details: {
    parent_model: string;
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  messages?: any[];
}

export interface PullProgress {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
}

export interface GenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: string;
  images?: string[];
  options?: {
    num_keep?: number;
    seed?: number;
    num_predict?: number;
    top_k?: number;
    top_p?: number;
    tfs_z?: number;
    typical_p?: number;
    repeat_last_n?: number;
    temperature?: number;
    repeat_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    penalize_newline?: boolean;
    stop?: string[];
    numa?: boolean;
    num_ctx?: number;
    num_batch?: number;
    num_gpu?: number;
    main_gpu?: number;
    low_vram?: boolean;
    f16_kv?: boolean;
    vocab_only?: boolean;
    use_mmap?: boolean;
    use_mlock?: boolean;
    num_thread?: number;
  };
}

export interface GenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface ModelStatus {
  name: string;
  status: 'running' | 'stopped' | 'loading';
  size_vram?: number;
  size?: number;
  digest?: string;
}

class OllamaService {
  private baseUrl: string;

  constructor() {
    // Use the backend server as a proxy to Ollama
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? '/api/ollama' 
      : 'http://localhost:3001/api/ollama';
  }

  private async request<T>(
    endpoint: string, 
    options?: RequestInit
  ): Promise<T> {
    const headers = {
      'Content-Type': 'application/json',
      ...(options?.headers || {})
    };

    // Add auth token if available
    const authToken = localStorage.getItem('auth_token');
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error: ${errorText || response.statusText}`);
    }

    // Handle streaming responses
    if (options?.headers?.['Accept'] === 'text/event-stream') {
      return response as unknown as T;
    }

    return response.json();
  }

  // List all available models
  async listModels(): Promise<{ models: OllamaModel[] }> {
    return this.request<{ models: OllamaModel[] }>('/api/tags');
  }

  // Get detailed information about a model
  async showModel(name: string): Promise<ModelInfo> {
    return this.request<ModelInfo>('/api/show', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
  }

  // Pull a model from the Ollama library
  async pullModel(
    name: string, 
    onProgress?: (progress: PullProgress) => void
  ): Promise<void> {
    const response = await this.request<Response>('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name, stream: true }),
      headers: {
        'Accept': 'text/event-stream'
      }
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const progress = JSON.parse(line) as PullProgress;
            if (onProgress) {
              onProgress(progress);
            }
          } catch (e) {
            console.error('Error parsing progress:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Delete a model
  async deleteModel(name: string): Promise<void> {
    await this.request('/api/delete', {
      method: 'DELETE',
      body: JSON.stringify({ name })
    });
  }

  // Copy a model
  async copyModel(source: string, destination: string): Promise<void> {
    await this.request('/api/copy', {
      method: 'POST',
      body: JSON.stringify({ source, destination })
    });
  }

  // Generate a completion
  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    return this.request<GenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(request)
    });
  }

  // Stream generate a completion
  async *generateStream(
    request: GenerateRequest
  ): AsyncGenerator<GenerateResponse> {
    const response = await this.request<Response>('/api/generate', {
      method: 'POST',
      body: JSON.stringify({ ...request, stream: true }),
      headers: {
        'Accept': 'text/event-stream'
      }
    });

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value);
        const lines = text.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line) as GenerateResponse;
            yield data;
          } catch (e) {
            console.error('Error parsing stream data:', e);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // Check if Ollama is running
  async checkHealth(): Promise<boolean> {
    try {
      await this.request('/');
      return true;
    } catch {
      return false;
    }
  }

  // Get running models
  async getRunningModels(): Promise<ModelStatus[]> {
    try {
      const response = await this.request<{ models: ModelStatus[] }>('/api/ps');
      return response.models || [];
    } catch {
      return [];
    }
  }

  // Format model size for display
  formatSize(bytes: number): string {
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) {
      return `${gb.toFixed(1)} GB`;
    }
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(0)} MB`;
  }

  // Extract model info from name
  parseModelName(name: string): {
    model: string;
    tag: string;
    size?: string;
    quantization?: string;
  } {
    const parts = name.split(':');
    const model = parts[0];
    const tag = parts[1] || 'latest';
    
    // Extract size from tag (e.g., "7b", "13b", "70b")
    const sizeMatch = tag.match(/(\d+)b/i);
    const size = sizeMatch ? sizeMatch[1] + 'B' : undefined;
    
    // Extract quantization (e.g., "q4_0", "q8_0")
    const quantMatch = tag.match(/q\d+_\d+/i);
    const quantization = quantMatch ? quantMatch[0].toUpperCase() : undefined;
    
    return { model, tag, size, quantization };
  }
}

export const ollamaService = new OllamaService();