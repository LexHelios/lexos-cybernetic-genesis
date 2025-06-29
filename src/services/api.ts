
import { AuthResponse, User, Agent, Task, SystemStatus, TaskSubmission, TaskResponse } from '../types/api';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://lexos.sharma.family' 
  : 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;
  private user: User | null = null;

  constructor() {
    // Load token from localStorage on initialization
    this.token = localStorage.getItem('auth_token');
    const userData = localStorage.getItem('user_data');
    if (userData) {
      this.user = JSON.parse(userData);
    }
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Authentication
  async login(username: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ username, password }),
    });

    const data = await this.handleResponse<AuthResponse>(response);
    
    if (data.success) {
      this.token = data.token;
      this.user = data.user;
      localStorage.setItem('auth_token', data.token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
    }

    return data;
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
    return !!this.token;
  }

  // Agents
  async getAgents(): Promise<{ agents: Agent[]; total_agents: number; active_agents: number; timestamp: number }> {
    const response = await fetch(`${BASE_URL}/api/agents`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAgent(agentId: string): Promise<Agent> {
    const response = await fetch(`${BASE_URL}/api/agents/${agentId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Tasks
  async submitTask(agentId: string, task: TaskSubmission): Promise<TaskResponse> {
    const response = await fetch(`${BASE_URL}/api/agents/${agentId}/task`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(task),
    });
    return this.handleResponse(response);
  }

  async getTask(taskId: string): Promise<Task> {
    const response = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTasks(params?: {
    status?: string;
    agent_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ tasks: Task[]; total: number; limit: number; offset: number; has_more: boolean }> {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }

    const response = await fetch(`${BASE_URL}/api/tasks?${queryParams}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async cancelTask(taskId: string): Promise<{ success: boolean; task_id: string; status: string }> {
    const response = await fetch(`${BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // System Monitoring
  async getSystemStatus(): Promise<SystemStatus> {
    const response = await fetch(`${BASE_URL}/api/system/status`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAgentMetrics(): Promise<{ agents: Record<string, any>; timestamp: number }> {
    const response = await fetch(`${BASE_URL}/api/system/metrics/agents`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }
}

export const apiClient = new ApiClient();
