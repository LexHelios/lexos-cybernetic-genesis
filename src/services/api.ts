import { AuthResponse, SystemStatus, Agent, Task, TaskSubmission, TaskResponse, User } from '../types/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Use environment variable or default to current location for production
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
    console.log('ApiClient: Initialized with baseURL:', this.baseURL);
  }

  setToken(token: string) {
    this.token = token;
    console.log('ApiClient: Token set');
  }

  clearToken() {
    this.token = null;
    console.log('ApiClient: Token cleared');
  }

  // Make request method public so it can be used by other services
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('ApiClient: Making request to:', url);
    console.log('ApiClient: Request options:', options);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      console.log('ApiClient: Sending fetch request...');
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('ApiClient: Response received:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ApiClient: Request failed with status:', response.status, 'Error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('ApiClient: Parsed response data:', data);
      return data;
    } catch (error) {
      console.error('ApiClient: Request error:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.error('ApiClient: Network error - backend might be down or CORS issue');
        throw new Error('Network error: Unable to connect to the server. Please check if the backend is running.');
      }
      throw error;
    }
  }

  // Authentication
  async login(credentials: { username: string; password: string }): Promise<AuthResponse> {
    console.log('ApiClient: Login attempt for username:', credentials.username);
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: Omit<User, 'user_id' | 'created_at' | 'last_login' | 'total_tasks' | 'workspace_size'>): Promise<AuthResponse> {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<void> {
    console.log('ApiClient: Logout request');
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    return this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  async getCurrentUser(): Promise<User> {
    return this.request('/auth/me');
  }

  async enable2FA(): Promise<{ qr_code: string; secret: string }> {
    return this.request('/auth/2fa/enable', {
      method: 'POST',
    });
  }

  async verify2FA(token: string): Promise<{ success: boolean }> {
    return this.request('/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async generateApiKey(): Promise<{ api_key: string }> {
    return this.request('/auth/api-key', {
      method: 'POST',
    });
  }

  async revokeApiKey(keyId: string): Promise<ApiResponse<null>> {
    return this.request(`/auth/api-key/${keyId}`, {
      method: 'DELETE',
    });
  }

  // User Management
  async getUser(userId: string): Promise<User> {
    return this.request(`/users/${userId}`);
  }

  async updateUser(userId: string, userData: Partial<User>): Promise<User> {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId: string): Promise<ApiResponse<null>> {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  // Agent Management
  async getAgents(): Promise<{ agents: Agent[]; total_agents: number; active_agents: number }> {
    console.log('ApiClient: Getting agents...');
    return this.request<{ agents: Agent[]; total_agents: number; active_agents: number }>('/agents');
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.request(`/agents/${agentId}`);
  }

  async getAgentMetrics(): Promise<Record<string, any>> {
    return this.request('/agents/metrics');
  }

  // Task Management
  async submitTask(agentId: string, taskData: TaskSubmission): Promise<TaskResponse> {
    return this.request(`/agents/${agentId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  }

  async getTask(taskId: string): Promise<Task> {
    return this.request(`/tasks/${taskId}`);
  }

  async getTasks(filters?: {
    agent_id?: string;
    user_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    tasks: Task[];
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  }> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          params.append(key, value.toString());
        }
      });
    }
    
    const query = params.toString();
    return this.request(`/tasks${query ? `?${query}` : ''}`);
  }

  async cancelTask(taskId: string): Promise<{ success: boolean; task_id: string; status: string }> {
    return this.request(`/tasks/${taskId}/cancel`, {
      method: 'POST',
    });
  }

  // Knowledge Graph
  async getKnowledgeGraph(): Promise<any> {
    return this.request('/knowledge/graph');
  }

  async getNodeSubgraph(nodeId: string): Promise<any> {
    return this.request(`/knowledge/nodes/${nodeId}/subgraph`);
  }

  async searchKnowledgeGraph(query: string): Promise<any> {
    return this.request(`/knowledge/search?q=${encodeURIComponent(query)}`);
  }

  // System Status
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request('/system/status');
  }

  // Chat endpoints
  async chat(messages: any[], model: string, options?: any): Promise<any> {
    return this.request('/chat', {
      method: 'POST',
      body: JSON.stringify({
        messages,
        model,
        ...options
      }),
    });
  }

  async chatAuto(
    message: string, 
    messages: any[], 
    performanceMode: 'fast' | 'balanced' | 'quality' = 'balanced',
    options?: any
  ): Promise<{
    response: string;
    model_used: string;
    routing_reason: string;
    confidence: number;
    response_time: number;
    session_id?: string;
  }> {
    return this.request('/chat/auto', {
      method: 'POST',
      body: JSON.stringify({
        message,
        messages,
        performance_mode: performanceMode,
        options
      }),
    });
  }

  async getChatAutoStats(): Promise<{
    routing_cache_size: number;
    model_usage: Record<string, number>;
    average_response_times: Record<string, number>;
    total_requests: number;
  }> {
    return this.request('/chat/auto/stats');
  }
}

export const apiClient = new ApiClient();
