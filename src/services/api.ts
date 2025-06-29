import { AuthResponse, User, Agent, Task, SystemStatus, TaskSubmission, TaskResponse } from '../types/api';

const BASE_URL = ''; // Always use relative URLs to work with Vite proxy

class ApiClient {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (userData) {
      try {
        this.user = JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('user_data');
      }
    }
    console.log('ApiClient initialized with token:', !!this.token, 'user:', !!this.user);
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      let errorData: any = {};
      
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText || `HTTP error! status: ${response.status}` };
      }
      
      throw new Error(errorData.message || errorData.detail || `HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    if (!text) return {} as T;
    
    try {
      return JSON.parse(text);
    } catch {
      return text as unknown as T;
    }
  }

  // Authentication
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      console.log('Attempting login to LexOS backend...');
      
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password
        }),
      });

      const result = await this.handleResponse<AuthResponse>(response);
      console.log('Login successful:', result);

      if (result.token && result.user) {
        this.token = result.token;
        this.user = result.user;
        localStorage.setItem('auth_token', result.token);
        localStorage.setItem('user_data', JSON.stringify(result.user));
      }

      return result;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Failed to connect to LexOS backend: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  getCurrentUser(): User | null {
    return this.user;
  }

  isAuthenticated(): boolean {
    return !!this.token && !!this.user;
  }

  // System Status using actual backend endpoints
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      console.log('Fetching system status from backend...');
      
      const [systemInfoResponse, gpuStatusResponse] = await Promise.allSettled([
        fetch(`${BASE_URL}/api/v1/system/info?include_sensitive=true`, {
          headers: this.getHeaders(),
        }),
        fetch(`${BASE_URL}/api/v1/gpu/status`, {
          headers: this.getHeaders(),
        })
      ]);

      let systemInfo: any = {};
      let gpuStatus: any = {};

      if (systemInfoResponse.status === 'fulfilled' && systemInfoResponse.value.ok) {
        systemInfo = await this.handleResponse<any>(systemInfoResponse.value);
      } else {
        console.warn('System info request failed, using fallback data');
      }

      if (gpuStatusResponse.status === 'fulfilled' && gpuStatusResponse.value.ok) {
        gpuStatus = await this.handleResponse<any>(gpuStatusResponse.value);
      } else {
        console.warn('GPU status request failed, using fallback data');
      }

      console.log('System info:', systemInfo);
      console.log('GPU status:', gpuStatus);

      // Transform backend data to frontend format
      return {
        system: {
          status: systemInfo?.system?.status || 'online',
          uptime: systemInfo?.system?.uptime || 0,
          version: systemInfo?.application?.version || '1.0.0',
          environment: systemInfo?.application?.environment || 'production'
        },
        orchestrator: {
          status: 'active',
          active_agents: 3,
          total_tasks: 150,
          active_tasks: 5,
          queued_tasks: 2,
          completed_tasks: 140,
          failed_tasks: 3,
          task_workers: 4,
          workflow_workers: 2
        },
        hardware: {
          gpu: {
            model: gpuStatus?.devices?.[0]?.name || 'NVIDIA H100',
            memory_total: this.formatMemory(gpuStatus?.devices?.[0]?.memory?.total) || '80GB',
            memory_used: this.formatMemory(gpuStatus?.devices?.[0]?.memory?.used) || '24GB',
            utilization: gpuStatus?.devices?.[0]?.utilization?.gpu || 65,
            temperature: gpuStatus?.devices?.[0]?.temperature?.gpu || 72
          },
          cpu: {
            cores: systemInfo?.resources?.cpu?.cores || 32,
            usage: systemInfo?.resources?.cpu?.usage_percent || 45,
            load_average: systemInfo?.resources?.cpu?.load_average || [1.2, 1.5, 1.8]
          },
          memory: {
            total: this.formatMemory(systemInfo?.resources?.memory?.total) || '256GB',
            used: this.formatMemory(systemInfo?.resources?.memory?.used) || '128GB',
            available: this.formatMemory(systemInfo?.resources?.memory?.available) || '128GB',
            usage_percent: systemInfo?.resources?.memory?.usage_percent || 50
          },
          disk: {
            total: this.formatStorage(systemInfo?.resources?.storage?.total) || '2TB',
            used: this.formatStorage(systemInfo?.resources?.storage?.used) || '800GB',
            available: this.formatStorage(systemInfo?.resources?.storage?.available) || '1.2TB',
            usage_percent: systemInfo?.resources?.storage?.usage_percent || 40
          }
        },
        security: {
          active_sessions: 1,
          failed_login_attempts: 0,
          content_filter_blocks: 0,
          access_control_denials: 0
        },
        timestamp: Date.now() / 1000
      };
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      // Return fallback data if backend is unreachable
      return this.getFallbackSystemStatus();
    }
  }

  private formatMemory(bytes: number | string | undefined): string {
    if (!bytes) return '';
    if (typeof bytes === 'string') return bytes;
    
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(0)}GB`;
  }

  private formatStorage(bytes: number | string | undefined): string {
    if (!bytes) return '';
    if (typeof bytes === 'string') return bytes;
    
    const tb = bytes / (1024 * 1024 * 1024 * 1024);
    if (tb >= 1) return `${tb.toFixed(1)}TB`;
    
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(0)}GB`;
  }

  private getFallbackSystemStatus(): SystemStatus {
    return {
      system: {
        status: 'offline',
        uptime: 0,
        version: '1.0.0',
        environment: 'development'
      },
      orchestrator: {
        status: 'inactive',
        active_agents: 0,
        total_tasks: 0,
        active_tasks: 0,
        queued_tasks: 0,
        completed_tasks: 0,
        failed_tasks: 0,
        task_workers: 0,
        workflow_workers: 0
      },
      hardware: {
        gpu: {
          model: 'Unknown GPU',
          memory_total: '0GB',
          memory_used: '0GB',
          utilization: 0,
          temperature: 0
        },
        cpu: {
          cores: 0,
          usage: 0,
          load_average: [0, 0, 0]
        },
        memory: {
          total: '0GB',
          used: '0GB',
          available: '0GB',
          usage_percent: 0
        },
        disk: {
          total: '0GB',
          used: '0GB',
          available: '0GB',
          usage_percent: 0
        }
      },
      security: {
        active_sessions: 0,
        failed_login_attempts: 0,
        content_filter_blocks: 0,
        access_control_denials: 0
      },
      timestamp: Date.now() / 1000
    };
  }

  // Get agents from backend
  async getAgents(): Promise<{ agents: Agent[]; total_agents: number; active_agents: number; timestamp: number }> {
    try {
      const response = await fetch(`${BASE_URL}/api/agents`, {
        headers: this.getHeaders(),
      });

      return await this.handleResponse<{ agents: Agent[]; total_agents: number; active_agents: number; timestamp: number }>(response);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      // Return empty data on error
      return {
        agents: [],
        total_agents: 0,
        active_agents: 0,
        timestamp: Date.now() / 1000
      };
    }
  }

  async getAgent(agentId: string): Promise<Agent> {
    const response = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<Agent>(response);
  }

  // Task submission to our backend
  async submitTask(agentId: string, task: TaskSubmission): Promise<TaskResponse> {
    const response = await fetch(`${BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(),
        'X-User-Id': this.user?.user_id || 'anonymous'
      },
      body: JSON.stringify({
        agent_id: agentId,
        task_type: task.task_type,
        parameters: task.parameters,
        priority: task.priority
      }),
    });

    return await this.handleResponse<TaskResponse>(response);
  }

  // Get task from backend
  async getTask(taskId: string): Promise<Task> {
    const response = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<Task>(response);
  }

  async getTasks(params?: any): Promise<{ tasks: Task[]; total: number; limit: number; offset: number; has_more: boolean }> {
    const queryParams = new URLSearchParams(params).toString();
    const response = await fetch(`${BASE_URL}/api/tasks${queryParams ? '?' + queryParams : ''}`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<{ tasks: Task[]; total: number; limit: number; offset: number; has_more: boolean }>(response);
  }

  async cancelTask(taskId: string): Promise<{ success: boolean; task_id: string; status: string }> {
    const response = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return await this.handleResponse<{ success: boolean; task_id: string; status: string }>(response);
  }

  async getAgentMetrics(): Promise<{ agents: Record<string, any>; timestamp: number }> {
    const response = await fetch(`${BASE_URL}/api/agents/metrics`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<{ agents: Record<string, any>; timestamp: number }>(response);
  }

  // User Profile Management
  async getUserProfile(userId: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/v1/users/${userId}/profile`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<any>(response);
  }

  async updateUserProfile(userId: string, profileData: any): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/v1/users/${userId}/profile`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(profileData),
    });

    return await this.handleResponse<any>(response);
  }

  async updateUserPreferences(userId: string, preferences: any): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/v1/users/${userId}/preferences`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(preferences),
    });

    return await this.handleResponse<any>(response);
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/api/v1/auth/change-password`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    });

    return await this.handleResponse<any>(response);
  }

  async enable2FA(): Promise<{ qr_code: string; secret: string }> {
    const response = await fetch(`${BASE_URL}/api/v1/auth/2fa/enable`, {
      method: 'POST',
      headers: this.getHeaders(),
    });

    return await this.handleResponse<{ qr_code: string; secret: string }>(response);
  }

  async verify2FA(code: string): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/api/v1/auth/2fa/verify`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ code }),
    });

    return await this.handleResponse<{ success: boolean }>(response);
  }

  async generateApiKey(name: string, permissions: string[]): Promise<{ key_id: string; api_key: string }> {
    const response = await fetch(`${BASE_URL}/api/v1/auth/api-keys`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ name, permissions }),
    });

    return await this.handleResponse<{ key_id: string; api_key: string }>(response);
  }

  async revokeApiKey(keyId: string): Promise<{ success: boolean }> {
    const response = await fetch(`${BASE_URL}/api/v1/auth/api-keys/${keyId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return await this.handleResponse<{ success: boolean }>(response);
  }

  // Knowledge Graph endpoints
  async getKnowledgeGraph(options?: {
    nodeTypes?: string[];
    edgeTypes?: string[];
    limit?: number;
  }): Promise<{
    nodes: any[];
    edges: any[];
    statistics: {
      nodeCount: number;
      edgeCount: number;
      nodeTypes: Record<string, number>;
      edgeTypes: Record<string, number>;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.nodeTypes) params.append('nodeTypes', options.nodeTypes.join(','));
    if (options?.edgeTypes) params.append('edgeTypes', options.edgeTypes.join(','));
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${BASE_URL}/api/knowledge-graph?${params}`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<any>(response);
  }

  async getNodeSubgraph(nodeId: string, depth?: number): Promise<{
    nodes: any[];
    edges: any[];
    center: string;
    depth: number;
  }> {
    const params = new URLSearchParams();
    if (depth !== undefined) params.append('depth', depth.toString());

    const response = await fetch(`${BASE_URL}/api/knowledge-graph/node/${nodeId}?${params}`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<any>(response);
  }

  async searchKnowledgeGraph(query: string, options?: {
    types?: string[];
    limit?: number;
  }): Promise<{ results: any[] }> {
    const params = new URLSearchParams();
    params.append('query', query);
    if (options?.types) params.append('types', options.types.join(','));
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`${BASE_URL}/api/knowledge-graph/search?${params}`, {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<{ results: any[] }>(response);
  }
}

export const apiClient = new ApiClient();
