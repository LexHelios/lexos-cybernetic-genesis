import { api } from './api';

export interface Agent {
  id: string;
  name: string;
  status: 'ready' | 'busy' | 'paused' | 'initializing' | 'error';
  currentModel: string;
  purpose: string;
  capabilities: string[];
  metrics: {
    tasksCompleted: number;
    tasksFailed: number;
    averageExecutionTime: number;
    successRate?: number;
  };
}

export interface AgentTask {
  type: string;
  message?: string;
  description?: string;
  context?: any;
  options?: any;
}

export interface TaskResult {
  success: boolean;
  response?: string;
  result?: any;
  agentId?: string;
  executionTime?: number;
  error?: string;
}

class AgentService {
  private ws: WebSocket | null = null;
  private messageHandlers: Map<string, (data: any) => void> = new Map();
  private reconnectInterval: number = 5000;
  private reconnectTimer: NodeJS.Timeout | null = null;

  // Connect to WebSocket for real-time updates
  connectWebSocket() {
    const wsUrl = window.location.protocol === 'https:' 
      ? `wss://${window.location.host}/ws`
      : `ws://${window.location.hostname}:3001`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('Connected to agent WebSocket');
        // Subscribe to all agents
        this.send({ type: 'subscribe_all_agents' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleWebSocketMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket connection closed');
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  // Connect to orchestration WebSocket for streaming
  connectOrchestrationWebSocket(onChunk: (chunk: string) => void): () => void {
    const wsUrl = window.location.protocol === 'https:' 
      ? `wss://${window.location.host}/api/enhanced-agents/orchestrate/ws`
      : `ws://${window.location.hostname}:3001/api/enhanced-agents/orchestrate/ws`;

    const orchestrationWs = new WebSocket(wsUrl);
    
    orchestrationWs.onopen = () => {
      console.log('Connected to orchestration WebSocket');
      orchestrationWs.send(JSON.stringify({ 
        type: 'connection', 
        data: { client: 'chat-interface' } 
      }));
    };

    orchestrationWs.onmessage = (event) => {
      const data = event.data;
      if (typeof data === 'string') {
        try {
          const json = JSON.parse(data);
          if (json.type === 'chunk') {
            onChunk(json.text);
          } else if (json.type === 'complete') {
            console.log('Message complete');
          } else if (json.type === 'error') {
            console.error('Orchestrator error:', json.error);
            onChunk(`\n\n[Error: ${json.error}]`);
          }
        } catch {
          // Plain text message - treat as chunk
          onChunk(data);
        }
      }
    };

    orchestrationWs.onerror = (error) => {
      console.error('Orchestration WebSocket error:', error);
    };

    // Return disconnect function
    return () => {
      if (orchestrationWs.readyState === WebSocket.OPEN) {
        orchestrationWs.close();
      }
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connectWebSocket();
    }, this.reconnectInterval);
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private handleWebSocketMessage(data: any) {
    const handler = this.messageHandlers.get(data.type);
    if (handler) {
      handler(data);
    }
  }

  // Register a handler for WebSocket messages
  onMessage(type: string, handler: (data: any) => void) {
    this.messageHandlers.set(type, handler);
  }

  // Remove a message handler
  offMessage(type: string) {
    this.messageHandlers.delete(type);
  }

  // Get all agents
  async getAllAgents(): Promise<Agent[]> {
    const response = await api.get('/api/enhanced-agents/list/all');
    return response.data.agents;
  }

  // Get agent status
  async getAgentStatus(agentId: string): Promise<Agent> {
    const response = await api.get(`/api/enhanced-agents/${agentId}`);
    return response.data.agent;
  }

  // Get system status
  async getSystemStatus() {
    const response = await api.get('/api/enhanced-agents/status');
    return response.data;
  }

  // Execute task on specific agent
  async executeTask(agentId: string, task: AgentTask): Promise<TaskResult> {
    const response = await api.post(`/api/enhanced-agents/${agentId}/execute`, task);
    return response.data;
  }

  // Route task automatically
  async routeTask(message: string, context?: any): Promise<TaskResult> {
    const response = await api.post('/api/enhanced-agents/route', {
      message,
      context
    });
    return response.data;
  }

  // Chat with AI
  async chat(message: string, sessionId?: string): Promise<TaskResult> {
    const response = await api.post('/api/enhanced-agents/chat', {
      message,
      sessionId
    });
    return response.data;
  }

  // Orchestrate complex task
  async orchestrate(task: string, description: string, requirements?: string[]): Promise<any> {
    const response = await api.post('/api/enhanced-agents/orchestrate', {
      task,
      description,
      requirements
    });
    return response.data;
  }

  // Orchestrate with streaming response
  orchestrateStream(message: string, context?: any, onChunk?: (chunk: string) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = window.location.protocol === 'https:' 
        ? `wss://${window.location.host}/api/enhanced-agents/orchestrate/ws`
        : `ws://${window.location.hostname}:3001/api/enhanced-agents/orchestrate/ws`;

      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('Connected to orchestration stream');
        ws.send(JSON.stringify({ 
          type: 'orchestrate',
          message,
          context: context || {},
          timestamp: new Date().toISOString()
        }));
      };

      ws.onmessage = (event) => {
        const data = event.data;
        if (typeof data === 'string') {
          try {
            const json = JSON.parse(data);
            if (json.type === 'chunk' && onChunk) {
              onChunk(json.text);
            } else if (json.type === 'complete') {
              ws.close();
              resolve();
            } else if (json.type === 'error') {
              ws.close();
              reject(new Error(json.error));
            }
          } catch {
            // Plain text message - treat as chunk
            if (onChunk) onChunk(data);
          }
        }
      };

      ws.onerror = (error) => {
        console.error('Orchestration stream error:', error);
        reject(error);
      };

      ws.onclose = () => {
        resolve();
      };
    });
  }

  // Control agent (pause/resume/restart)
  async controlAgent(agentId: string, action: 'pause' | 'resume' | 'restart') {
    const response = await api.post(`/api/enhanced-agents/${agentId}/control`, {
      action
    });
    return response.data;
  }

  // Switch agent model
  async switchModel(agentId: string, model: string) {
    const response = await api.post(`/api/enhanced-agents/${agentId}/model`, {
      model
    });
    return response.data;
  }

  // Get agent metrics
  async getAgentMetrics(agentId: string) {
    const response = await api.get(`/api/enhanced-agents/${agentId}/metrics`);
    return response.data.metrics;
  }

  // Code generation
  async generateCode(description: string, language?: string, framework?: string) {
    const response = await api.post('/api/enhanced-agents/code/generate', {
      description,
      language,
      framework
    });
    return response.data;
  }

  // Reasoning task
  async reason(query: string, context?: any) {
    const response = await api.post('/api/enhanced-agents/reason', {
      query,
      context
    });
    return response.data;
  }

  // Creative writing
  async creativeWrite(type: string, params: any) {
    const response = await api.post('/api/enhanced-agents/creative/write', {
      type,
      ...params
    });
    return response.data;
  }

  // Subscribe to agent updates
  subscribeToAgent(agentId: string) {
    this.send({ type: 'subscribe_agent', agentId });
  }

  // Unsubscribe from agent updates
  unsubscribeFromAgent(agentId: string) {
    this.send({ type: 'unsubscribe_agent', agentId });
  }

  // Disconnect WebSocket
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const agentService = new AgentService();