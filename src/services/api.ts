class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Simplified URL configuration - always use localhost:9000 for development
    this.baseURL = 'http://localhost:9000';
    this.token = localStorage.getItem('auth_token');
    
    console.log('ApiClient: Initialized with baseURL:', this.baseURL);
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

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    console.log('ApiClient: Making request to:', url);
    console.log('ApiClient: Request options:', options);

    try {
      console.log('ApiClient: Sending fetch request...');
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      console.log('ApiClient: Response status:', response.status);
      console.log('ApiClient: Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('ApiClient: Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const data = await response.json();
      console.log('ApiClient: Response data:', data);
      return data;
    } catch (error) {
      console.error('ApiClient: Request failed:', error);
      throw error;
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Authentication endpoints
  async login(credentials: { username: string; password: string }) {
    const response = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.token) {
      this.setToken(response.token);
    }
    
    return response;
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' });
    this.setToken(null);
  }

  async verifyToken() {
    return this.request<{ valid: boolean; user?: any }>('/api/auth/verify');
  }

  async getCurrentUser() {
    return this.request<any>('/api/auth/me');
  }

  async getProfile() {
    return this.request<any>('/api/auth/me');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<any>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // 2FA endpoints
  async enable2FA() {
    return this.request<{ qr_code: string; secret: string }>('/api/auth/2fa/enable', {
      method: 'POST',
    });
  }

  async verify2FA(code: string) {
    return this.request<{ success: boolean }>('/api/auth/2fa/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  }

  // System endpoints
  async getSystemStatus() {
    return this.request<any>('/api/system/status');
  }

  async getAgents() {
    return this.request<any>('/api/agents');
  }

  // Task endpoints
  async submitTask(agentId: string, task: any) {
    return this.request<{ success: boolean; queue_position: number }>(`/api/agents/${agentId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(task),
    });
  }

  // Knowledge Graph endpoints
  async getKnowledgeGraph() {
    return this.request<any>('/api/knowledge/graph');
  }

  async getNodeSubgraph(nodeId: string) {
    return this.request<any>(`/api/knowledge/nodes/${nodeId}/subgraph`);
  }

  async searchKnowledgeGraph(query: string) {
    return this.request<any>(`/api/knowledge/search?q=${encodeURIComponent(query)}`);
  }

  // Chat auto-routing endpoints
  async getChatAutoStats() {
    return this.request<any>('/api/chat/auto/stats');
  }

  // API Key endpoints
  async revokeApiKey(keyId: string) {
    return this.request<any>(`/api/keys/${keyId}`, {
      method: 'DELETE',
    });
  }

  // Health check
  async checkHealth() {
    return this.request<any>('/health');
  }
}

export const apiClient = new ApiClient();
