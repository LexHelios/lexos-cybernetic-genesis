
// Core API Types for NEXUS Backend Integration
export interface Agent {
  agent_id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'busy' | 'error';
  capabilities: AgentCapability[];
  current_tasks: number;
  total_tasks_completed: number;
  average_response_time: number;
  last_activity: number;
  configuration?: {
    rate_limit: number;
    max_concurrent_requests: number;
    timeout: number;
  };
  metrics?: {
    uptime: number;
    memory_usage: string;
    cpu_usage: number;
    tasks_in_queue: number;
    success_rate: number;
  };
}

export interface AgentCapability {
  name: string;
  description: string;
  version: string;
}

export interface Task {
  task_id: string;
  agent_id: string;
  user_id: string;
  task_type: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  parameters: Record<string, any>;
  result?: Record<string, any>;
  created_at: number;
  started_at?: number;
  completed_at?: number;
  execution_time?: number;
  error?: string;
}

export interface SystemStatus {
  system: {
    status: string;
    uptime: number;
    version: string;
    environment: string;
  };
  orchestrator: {
    status: string;
    active_agents: number;
    total_tasks: number;
    active_tasks: number;
    queued_tasks: number;
    completed_tasks: number;
    failed_tasks: number;
    task_workers: number;
    workflow_workers: number;
  };
  hardware: {
    gpu: GPUMetrics;
    cpu: CPUMetrics;
    memory: MemoryMetrics;
    disk: DiskMetrics;
  };
  security: {
    active_sessions: number;
    failed_login_attempts: number;
    content_filter_blocks: number;
    access_control_denials: number;
  };
  timestamp: number;
}

export interface GPUMetrics {
  model: string;
  memory_total: string;
  memory_used: string;
  utilization: number;
  temperature: number;
}

export interface CPUMetrics {
  cores: number;
  usage: number;
  load_average: number[];
}

export interface MemoryMetrics {
  total: string;
  used: string;
  available: string;
  usage_percent: number;
}

export interface DiskMetrics {
  total: string;
  used: string;
  available: string;
  usage_percent: number;
}

export interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'family_member' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  security_level: 'ADMIN' | 'SAFE' | 'RESTRICTED';
  agent_access_level: 'FULL' | 'BASIC' | 'LIMITED';
  created_at?: number;
  last_login?: number;
  total_tasks?: number;
  workspace_size?: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: User;
  expires_at: number;
}

export interface ApiResponse<T> {
  success?: boolean;
  data?: T;
  error?: boolean;
  code?: string;
  message?: string;
  timestamp?: number;
}

export interface WebSocketMessage {
  type: 'system_status' | 'task_update' | 'agent_status';
  data: any;
  timestamp: number;
}

export interface TaskSubmission {
  task_type: string;
  parameters: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeout?: number;
}

export interface TaskResponse {
  success: boolean;
  task_id: string;
  agent_id: string;
  status: string;
  estimated_completion: number;
  queue_position: number;
}
