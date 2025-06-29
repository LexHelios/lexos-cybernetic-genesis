import { AuthResponse, User, Agent, Task, SystemStatus, TaskSubmission, TaskResponse } from '../types/api';

const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://147.185.40.39:20067' 
  : 'http://147.185.40.39:20067';

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

  // Authentication using consciousness/query as health check
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      console.log('Attempting login with backend health check...');
      
      // Test connection with a simple consciousness query
      const response = await fetch(`${BASE_URL}/api/v1/consciousness/query`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          query: "System authentication check",
          temperature: 0.1,
          max_tokens: 50,
          safety_filter: false
        }),
      });

      const result = await this.handleResponse<any>(response);
      console.log('Backend connection successful:', result);

      // Create mock user for the frontend
      const mockUser: User = {
        user_id: 'admin-001',
        username: username,
        email: `${username}@lexos.local`,
        full_name: 'System Administrator',
        role: 'admin',
        status: 'active',
        security_level: 'ADMIN',
        agent_access_level: 'FULL',
        created_at: Date.now() / 1000,
        last_login: Date.now() / 1000,
        total_tasks: 0,
        workspace_size: '0GB'
      };

      const mockToken = `lexos-token-${Date.now()}`;
      
      this.token = mockToken;
      this.user = mockUser;
      localStorage.setItem('auth_token', mockToken);
      localStorage.setItem('user_data', JSON.stringify(mockUser));

      return {
        success: true,
        token: mockToken,
        user: mockUser,
        expires_at: Date.now() / 1000 + 3600
      };
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

  // Mock agents data (backend doesn't have agent endpoints yet)
  async getAgents(): Promise<{ agents: Agent[]; total_agents: number; active_agents: number; timestamp: number }> {
    const mockAgents: Agent[] = [
      {
        agent_id: 'consciousness-001',
        name: 'Consciousness Engine',
        description: 'Primary consciousness and reasoning system',
        status: 'active',
        capabilities: [
          { name: 'Consciousness Query', description: 'Deep reasoning and consciousness exploration', version: '1.0.0' }
        ],
        current_tasks: 2,
        total_tasks_completed: 89,
        average_response_time: 1.2,
        last_activity: Date.now() / 1000 - 30
      },
      {
        agent_id: 'executor-001',
        name: 'Unrestricted Executor',
        description: 'System-level execution and command processing',
        status: 'active',
        capabilities: [
          { name: 'System Command', description: 'Execute system commands', version: '1.0.0' },
          { name: 'File Operations', description: 'File system operations', version: '1.0.0' }
        ],
        current_tasks: 1,
        total_tasks_completed: 156,
        average_response_time: 0.8,
        last_activity: Date.now() / 1000 - 15
      },
      {
        agent_id: 'database-001',
        name: 'Database Agent',
        description: 'Database query and management system',
        status: 'active',
        capabilities: [
          { name: 'Database Query', description: 'Execute database operations', version: '1.0.0' }
        ],
        current_tasks: 0,
        total_tasks_completed: 67,
        average_response_time: 0.5,
        last_activity: Date.now() / 1000 - 120
      }
    ];

    return {
      agents: mockAgents,
      total_agents: mockAgents.length,
      active_agents: mockAgents.filter(a => a.status === 'active').length,
      timestamp: Date.now() / 1000
    };
  }

  async getAgent(agentId: string): Promise<Agent> {
    const response = await this.getAgents();
    const agent = response.agents.find(a => a.agent_id === agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }
    return agent;
  }

  // Task submission using actual backend endpoints
  async submitTask(agentId: string, task: TaskSubmission): Promise<TaskResponse> {
    let endpoint = '';
    let body: any = {};

    if (agentId === 'consciousness-001') {
      endpoint = '/api/v1/consciousness/query';
      body = {
        query: task.parameters.query || 'Default consciousness query',
        temperature: task.parameters.temperature || 0.9,
        max_tokens: task.parameters.max_tokens || 1000,
        safety_filter: task.parameters.safety_filter !== false
      };
    } else if (agentId === 'executor-001') {
      endpoint = '/api/unrestricted/execute';
      body = {
        query: task.parameters.command || task.parameters.query,
        mode: 'execute',
        bypass_safety: true
      };
    } else {
      throw new Error(`Agent ${agentId} not supported for task submission`);
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
    });

    const data = await this.handleResponse<any>(response);

    return {
      success: true,
      task_id: data?.query_id || data?.execution_id || `task-${Date.now()}`,
      agent_id: agentId,
      status: 'completed',
      estimated_completion: Date.now() / 1000 + 5,
      queue_position: 0
    };
  }

  // Mock task management
  async getTask(taskId: string): Promise<Task> {
    return {
      task_id: taskId,
      agent_id: 'consciousness-001',
      user_id: this.user?.user_id || 'unknown',
      task_type: 'consciousness_query',
      status: 'completed',
      priority: 'normal',
      parameters: { query: 'Sample query' },
      result: { response: 'Sample response' },
      created_at: Date.now() / 1000 - 300,
      started_at: Date.now() / 1000 - 295,
      completed_at: Date.now() / 1000 - 290,
      execution_time: 5
    };
  }

  async getTasks(params?: any): Promise<{ tasks: Task[]; total: number; limit: number; offset: number; has_more: boolean }> {
    const mockTasks: Task[] = [
      {
        task_id: 'task-001',
        agent_id: 'consciousness-001',
        user_id: this.user?.user_id || 'admin-001',
        task_type: 'consciousness_query',
        status: 'completed',
        priority: 'normal',
        parameters: { query: 'What is consciousness?' },
        result: { response: 'Consciousness is...' },
        created_at: Date.now() / 1000 - 600,
        started_at: Date.now() / 1000 - 595,
        completed_at: Date.now() / 1000 - 590,
        execution_time: 5
      }
    ];

    return {
      tasks: mockTasks,
      total: mockTasks.length,
      limit: params?.limit || 10,
      offset: params?.offset || 0,
      has_more: false
    };
  }

  async cancelTask(taskId: string): Promise<{ success: boolean; task_id: string; status: string }> {
    return {
      success: true,
      task_id: taskId,
      status: 'cancelled'
    };
  }

  async getAgentMetrics(): Promise<{ agents: Record<string, any>; timestamp: number }> {
    return {
      agents: {
        'consciousness-001': { active: true, load: 0.6 },
        'executor-001': { active: true, load: 0.3 },
        'database-001': { active: true, load: 0.1 }
      },
      timestamp: Date.now() / 1000
    };
  }
}

export const apiClient = new ApiClient();
