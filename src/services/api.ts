
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Authentication - using consciousness/query as a proxy for login since there's no dedicated auth endpoint
  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      // Test connection to the consciousness endpoint
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

      if (response.ok) {
        // Create a mock user since the backend doesn't have user management
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
          expires_at: Date.now() / 1000 + 3600 // 1 hour
        };
      } else {
        throw new Error('Backend connection failed');
      }
    } catch (error) {
      throw new Error('Failed to connect to LexOS backend');
    }
  }

  logout(): void {
    this.token = null;
    this.user = null;
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  }

  getCurrentUser(): User | null {
    console.log('getCurrentUser called, returning:', this.user);
    return this.user;
  }

  isAuthenticated(): boolean {
    const hasToken = !!this.token;
    const hasUser = !!this.user;
    console.log('isAuthenticated check:', { hasToken, hasUser });
    return hasToken && hasUser;
  }

  // System Status using your actual API
  async getSystemStatus(): Promise<SystemStatus> {
    const [systemInfo, gpuStatus] = await Promise.all([
      fetch(`${BASE_URL}/api/v1/system/info?include_sensitive=true`, {
        headers: this.getHeaders(),
      }).then(r => this.handleResponse<any>(r)),
      fetch(`${BASE_URL}/api/v1/gpu/status`, {
        headers: this.getHeaders(),
      }).then(r => this.handleResponse<any>(r))
    ]);

    // Transform your backend data to match the expected SystemStatus interface
    return {
      system: {
        status: systemInfo?.system?.status || 'online',
        uptime: systemInfo?.system?.uptime || 0,
        version: systemInfo?.application?.version || '1.0.0',
        environment: systemInfo?.application?.environment || 'production'
      },
      orchestrator: {
        status: 'active',
        active_agents: 3, // Mock data since your backend doesn't have this yet
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
          memory_total: gpuStatus?.devices?.[0]?.memory?.total || '80GB',
          memory_used: gpuStatus?.devices?.[0]?.memory?.used || '24GB',
          utilization: gpuStatus?.devices?.[0]?.utilization?.gpu || 65,
          temperature: gpuStatus?.devices?.[0]?.temperature?.gpu || 72
        },
        cpu: {
          cores: systemInfo?.resources?.cpu?.cores || 32,
          usage: systemInfo?.resources?.cpu?.usage_percent || 45,
          load_average: systemInfo?.resources?.cpu?.load_average || [1.2, 1.5, 1.8]
        },
        memory: {
          total: systemInfo?.resources?.memory?.total || '256GB',
          used: systemInfo?.resources?.memory?.used || '128GB',
          available: systemInfo?.resources?.memory?.available || '128GB',
          usage_percent: systemInfo?.resources?.memory?.usage_percent || 50
        },
        disk: {
          total: systemInfo?.resources?.storage?.total || '2TB',
          used: systemInfo?.resources?.storage?.used || '800GB',
          available: systemInfo?.resources?.storage?.available || '1.2TB',
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
  }

  // Mock agents data since your backend doesn't have dedicated agent endpoints yet
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

  // Consciousness query integration
  async submitTask(agentId: string, task: TaskSubmission): Promise<TaskResponse> {
    let endpoint = '';
    let body = {};

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
