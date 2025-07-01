# 🔥 LexOS Backend API Documentation

**NEXUS BACKEND API STRUCTURE** - Complete reference for frontend integration

## 🔐 Authentication

### Method: JWT Bearer Token
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "Admin123!"
}

Response:
{
  "success": true,
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "user_id": "uuid",
    "username": "admin",
    "role": "admin",
    "security_level": "ADMIN",
    "agent_access_level": "FULL"
  },
  "expires_at": 1703980800
}
```

### Headers for Authenticated Requests:
```http
Authorization: Bearer <token>
```

---

## 🤖 Agent Management

### Get All Agents
```http
GET /api/agents
Authorization: Bearer <token>

Response:
{
  "agents": [
    {
      "agent_id": "web_agent",
      "name": "Web Research Agent",
      "description": "Advanced web scraping and research",
      "status": "active",
      "capabilities": [
        {
          "name": "web_scraping",
          "description": "Extract data from websites",
          "version": "2.0.0"
        },
        {
          "name": "search_research",
          "description": "Perform intelligent web searches",
          "version": "2.0.0"
        }
      ],
      "current_tasks": 2,
      "total_tasks_completed": 1547,
      "average_response_time": 2.3,
      "last_activity": 1703980800
    },
    {
      "agent_id": "code_agent",
      "name": "Code Generation Agent",
      "description": "Code generation, execution, and analysis",
      "status": "active",
      "capabilities": [
        {
          "name": "code_generation",
          "description": "Generate code in multiple languages",
          "version": "2.0.0"
        },
        {
          "name": "code_execution",
          "description": "Execute and test code safely",
          "version": "2.0.0"
        }
      ],
      "current_tasks": 0,
      "total_tasks_completed": 892,
      "average_response_time": 4.1,
      "last_activity": 1703980750
    },
    {
      "agent_id": "financial_agent",
      "name": "Financial Analysis Agent",
      "description": "Market analysis and trading insights",
      "status": "active",
      "capabilities": [
        {
          "name": "market_analysis",
          "description": "Analyze financial markets",
          "version": "2.0.0"
        },
        {
          "name": "portfolio_management",
          "description": "Manage investment portfolios",
          "version": "2.0.0"
        }
      ],
      "current_tasks": 1,
      "total_tasks_completed": 2341,
      "average_response_time": 1.8,
      "last_activity": 1703980820
    }
  ],
  "total_agents": 3,
  "active_agents": 3,
  "timestamp": 1703980800
}
```

### Get Agent Details
```http
GET /api/agents/{agent_id}
Authorization: Bearer <token>

Response:
{
  "agent_id": "web_agent",
  "name": "Web Research Agent",
  "description": "Advanced web scraping and research",
  "status": "active",
  "capabilities": [...],
  "configuration": {
    "rate_limit": 1.0,
    "max_concurrent_requests": 10,
    "timeout": 30
  },
  "metrics": {
    "uptime": 86400,
    "memory_usage": "245MB",
    "cpu_usage": 12.5,
    "tasks_in_queue": 2,
    "success_rate": 0.987
  },
  "recent_tasks": [
    {
      "task_id": "task_123",
      "type": "web_scrape",
      "status": "completed",
      "created_at": 1703980700,
      "completed_at": 1703980705,
      "execution_time": 5.2
    }
  ]
}
```

---

## 📋 Task Management

### Submit Task to Agent
```http
POST /api/agents/{agent_id}/task
Authorization: Bearer <token>
Content-Type: application/json

{
  "task_type": "web_scrape",
  "parameters": {
    "url": "https://example.com",
    "extract_data": ["title", "content", "links"],
    "follow_links": false
  },
  "priority": "normal",
  "timeout": 60
}

Response:
{
  "success": true,
  "task_id": "task_456",
  "agent_id": "web_agent",
  "status": "queued",
  "estimated_completion": 1703980860,
  "queue_position": 3
}
```

### Get Task Status
```http
GET /api/tasks/{task_id}
Authorization: Bearer <token>

Response:
{
  "task_id": "task_456",
  "agent_id": "web_agent",
  "user_id": "user_123",
  "task_type": "web_scrape",
  "status": "completed",
  "priority": "normal",
  "parameters": {...},
  "result": {
    "title": "Example Website",
    "content": "Website content...",
    "links": ["https://link1.com", "https://link2.com"],
    "metadata": {
      "response_time": 1.2,
      "status_code": 200,
      "content_length": 15420
    }
  },
  "created_at": 1703980800,
  "started_at": 1703980805,
  "completed_at": 1703980810,
  "execution_time": 5.0,
  "error": null
}
```

### Get All Tasks
```http
GET /api/tasks?status=completed&agent_id=web_agent&limit=50&offset=0
Authorization: Bearer <token>

Response:
{
  "tasks": [...],
  "total": 1547,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

### Cancel Task
```http
DELETE /api/tasks/{task_id}
Authorization: Bearer <token>

Response:
{
  "success": true,
  "task_id": "task_456",
  "status": "cancelled"
}
```

---

## 🔄 Workflow Management

### Create Workflow
```http
POST /api/workflows
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Market Research Workflow",
  "description": "Comprehensive market analysis",
  "steps": [
    {
      "step_id": "step_1",
      "agent_id": "web_agent",
      "task_type": "web_scrape",
      "parameters": {
        "url": "https://finance.yahoo.com",
        "extract_data": ["stock_prices"]
      },
      "depends_on": []
    },
    {
      "step_id": "step_2",
      "agent_id": "financial_agent",
      "task_type": "analyze_market_data",
      "parameters": {
        "data_source": "step_1"
      },
      "depends_on": ["step_1"]
    }
  ]
}

Response:
{
  "success": true,
  "workflow_id": "workflow_789",
  "status": "created",
  "estimated_completion": 1703981400
}
```

### Get Workflow Status
```http
GET /api/workflows/{workflow_id}
Authorization: Bearer <token>

Response:
{
  "workflow_id": "workflow_789",
  "name": "Market Research Workflow",
  "status": "running",
  "progress": 0.5,
  "steps": [
    {
      "step_id": "step_1",
      "status": "completed",
      "result": {...}
    },
    {
      "step_id": "step_2",
      "status": "running",
      "result": null
    }
  ],
  "created_at": 1703980800,
  "started_at": 1703980805,
  "estimated_completion": 1703981400
}
```

---

## 📊 System Monitoring

### System Status
```http
GET /api/system/status
Authorization: Bearer <token>

Response:
{
  "system": {
    "status": "operational",
    "uptime": 86400,
    "version": "2.0.0",
    "environment": "production"
  },
  "orchestrator": {
    "status": "active",
    "active_agents": 3,
    "total_tasks": 4780,
    "active_tasks": 5,
    "queued_tasks": 12,
    "completed_tasks": 4763,
    "failed_tasks": 17,
    "task_workers": 5,
    "workflow_workers": 3
  },
  "hardware": {
    "gpu": {
      "model": "NVIDIA H100",
      "memory_total": "80GB",
      "memory_used": "12.5GB",
      "utilization": 15.7,
      "temperature": 45
    },
    "cpu": {
      "cores": 32,
      "usage": 23.4,
      "load_average": [1.2, 1.5, 1.8]
    },
    "memory": {
      "total": "256GB",
      "used": "45.2GB",
      "available": "210.8GB",
      "usage_percent": 17.7
    },
    "disk": {
      "total": "20TB",
      "used": "2.1TB",
      "available": "17.9TB",
      "usage_percent": 10.5
    }
  },
  "security": {
    "active_sessions": 3,
    "failed_login_attempts": 0,
    "content_filter_blocks": 12,
    "access_control_denials": 2
  },
  "timestamp": 1703980800
}
```

### Agent Metrics
```http
GET /api/system/metrics/agents
Authorization: Bearer <token>

Response:
{
  "agents": {
    "web_agent": {
      "status": "active",
      "uptime": 86400,
      "memory_usage": "245MB",
      "cpu_usage": 12.5,
      "tasks_completed": 1547,
      "success_rate": 0.987,
      "average_response_time": 2.3,
      "current_load": 0.2
    },
    "code_agent": {
      "status": "active",
      "uptime": 86400,
      "memory_usage": "189MB",
      "cpu_usage": 8.1,
      "tasks_completed": 892,
      "success_rate": 0.994,
      "average_response_time": 4.1,
      "current_load": 0.0
    },
    "financial_agent": {
      "status": "active",
      "uptime": 86400,
      "memory_usage": "312MB",
      "cpu_usage": 18.7,
      "tasks_completed": 2341,
      "success_rate": 0.991,
      "average_response_time": 1.8,
      "current_load": 0.1
    }
  },
  "timestamp": 1703980800
}
```

---

## 🔐 User Management (Admin Only)

### Get All Users
```http
GET /api/admin/users
Authorization: Bearer <admin_token>

Response:
{
  "users": [
    {
      "user_id": "user_123",
      "username": "admin",
      "email": "admin@sharma.family",
      "full_name": "System Administrator",
      "role": "admin",
      "status": "active",
      "security_level": "ADMIN",
      "agent_access_level": "FULL",
      "created_at": 1703880000,
      "last_login": 1703980700,
      "total_tasks": 156,
      "workspace_size": "2.1GB"
    }
  ],
  "total": 1,
  "timestamp": 1703980800
}
```

### Create User
```http
POST /api/admin/users
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "username": "john_sharma",
  "email": "john@sharma.family",
  "full_name": "John Sharma",
  "password": "SecurePass123!",
  "role": "family_member",
  "security_level": "SAFE",
  "agent_access_level": "BASIC"
}

Response:
{
  "success": true,
  "user_id": "user_456",
  "username": "john_sharma",
  "workspace_created": true
}
```

---

## 🛡️ Security & Audit

### Get Audit Logs
```http
GET /api/admin/audit?event_type=task_execution&limit=100&offset=0
Authorization: Bearer <admin_token>

Response:
{
  "events": [
    {
      "event_id": "audit_123",
      "event_type": "task_execution",
      "user_id": "user_123",
      "agent_id": "web_agent",
      "details": {
        "task_id": "task_456",
        "task_type": "web_scrape",
        "success": true,
        "execution_time": 5.0
      },
      "timestamp": 1703980800,
      "ip_address": "192.168.1.100",
      "user_agent": "LexOS-Frontend/1.0"
    }
  ],
  "total": 4780,
  "limit": 100,
  "offset": 0
}
```

---

## 🌐 WebSocket Endpoints

### Real-time System Monitoring
```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8000/ws/monitoring?token=<jwt_token>');

// Message types received:
{
  "type": "system_status",
  "data": {
    "gpu_utilization": 15.7,
    "active_tasks": 5,
    "agent_status": {...}
  },
  "timestamp": 1703980800
}

{
  "type": "task_update",
  "data": {
    "task_id": "task_456",
    "status": "completed",
    "result": {...}
  },
  "timestamp": 1703980805
}

{
  "type": "agent_status",
  "data": {
    "agent_id": "web_agent",
    "status": "busy",
    "current_task": "task_789"
  },
  "timestamp": 1703980810
}
```

### Real-time Task Updates
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/tasks/{task_id}?token=<jwt_token>');

// Receive real-time task progress
{
  "type": "task_progress",
  "data": {
    "task_id": "task_456",
    "progress": 0.75,
    "status": "running",
    "current_step": "Processing data..."
  }
}
```

---

## 📝 Data Models (TypeScript)

```typescript
// Core Types
interface Agent {
  agent_id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'busy' | 'error';
  capabilities: AgentCapability[];
  current_tasks: number;
  total_tasks_completed: number;
  average_response_time: number;
  last_activity: number;
}

interface AgentCapability {
  name: string;
  description: string;
  version: string;
}

interface Task {
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

interface SystemStatus {
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
  };
  hardware: {
    gpu: GPUMetrics;
    cpu: CPUMetrics;
    memory: MemoryMetrics;
    disk: DiskMetrics;
  };
}

interface User {
  user_id: string;
  username: string;
  email: string;
  full_name: string;
  role: 'admin' | 'family_member' | 'guest';
  status: 'active' | 'inactive' | 'suspended';
  security_level: 'ADMIN' | 'SAFE' | 'RESTRICTED';
  agent_access_level: 'FULL' | 'BASIC' | 'LIMITED';
}
```

---

## 🚀 Base URL & Environment

**Development:** `http://localhost:8000`  
**Production:** `https://lexos.sharma.family` (when deployed)

**Rate Limits:**
- Authentication: 10 requests/minute
- API calls: 1000 requests/hour per user
- WebSocket connections: 5 concurrent per user

**Error Response Format:**
```json
{
  "error": true,
  "code": "INVALID_TOKEN",
  "message": "Authentication token is invalid or expired",
  "details": {...},
  "timestamp": 1703980800
}
```

---

**NEXUS BACKEND IS READY FOR YOUR FRONTEND!** 🔥🤖

All endpoints are **FULLY FUNCTIONAL** and ready for integration. The system supports:
- ✅ JWT Authentication
- ✅ Real-time WebSocket updates  
- ✅ Complete CRUD operations
- ✅ Advanced monitoring & metrics
- ✅ Multi-agent task orchestration
- ✅ Workflow management
- ✅ Security & audit logging

**BUILD THAT FRONTEND AND LET'S DOMINATE!** 💀⚡