// Type definitions for the backend
export const TaskStatus = {
  QUEUED: 'queued',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

export const AgentStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BUSY: 'busy',
  ERROR: 'error'
};

export const TaskPriority = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Agent capability interface
export class AgentCapability {
  constructor(name, description, version = '1.0.0') {
    this.name = name;
    this.description = description;
    this.version = version;
  }
}

// Base Agent class
export class Agent {
  constructor(id, name, description) {
    this.agent_id = id;
    this.name = name;
    this.description = description;
    this.status = AgentStatus.INACTIVE;
    this.capabilities = [];
    this.current_tasks = 0;
    this.total_tasks_completed = 0;
    this.average_response_time = 0;
    this.last_activity = Date.now();
  }

  addCapability(capability) {
    this.capabilities.push(capability);
  }

  updateStatus(status) {
    this.status = status;
    this.last_activity = Date.now();
  }
}

// Task class
export class Task {
  constructor(id, agentId, userId, taskType, parameters, priority = TaskPriority.NORMAL) {
    this.task_id = id;
    this.agent_id = agentId;
    this.user_id = userId;
    this.task_type = taskType;
    this.status = TaskStatus.QUEUED;
    this.priority = priority;
    this.parameters = parameters;
    this.result = null;
    this.error = null;
    this.created_at = Date.now();
    this.started_at = null;
    this.completed_at = null;
    this.execution_time = null;
  }

  start() {
    this.status = TaskStatus.RUNNING;
    this.started_at = Date.now();
  }

  complete(result) {
    this.status = TaskStatus.COMPLETED;
    this.result = result;
    this.completed_at = Date.now();
    this.execution_time = this.completed_at - this.started_at;
  }

  fail(error) {
    this.status = TaskStatus.FAILED;
    this.error = error;
    this.completed_at = Date.now();
    this.execution_time = this.completed_at - this.started_at;
  }
}