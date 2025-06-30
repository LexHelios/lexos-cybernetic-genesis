import { AuthResponse, SystemStatus, Agent, Task, TaskSubmission, TaskResponse, User } from '../types/api';

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = '/api';
  }

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }

  // Authentication
  async login(credentials: { username: string; password: string }): Promise<AuthResponse> {
    return this.request('/auth/login', {
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

  async logout(): Promise<ApiResponse<null>> {
    return this.request('/auth/logout', {
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
  async getAgents(): Promise<{ agents: Agent[], total_agents: number, active_agents: number }> {
    return this.request('/agents');
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

  // System Status
  async getSystemStatus(): Promise<SystemStatus> {
    return this.request('/system/status');
  }
}

export const apiClient = new ApiClient();
