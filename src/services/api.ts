
class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    // Use the actual backend URL from environment or fallback to localhost:9000
    this.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';
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

  // Authentication endpoints
  async login(username: string, password: string) {
    const response = await this.request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
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

  async getProfile() {
    return this.request<any>('/api/auth/me');
  }

  // System endpoints
  async getSystemStatus() {
    return this.request<any>('/api/system/status');
  }

  async getAgents() {
    return this.request<any>('/api/agents');
  }

  // Health check
  async checkHealth() {
    return this.request<any>('/health');
  }
}

export const apiClient = new ApiClient();
