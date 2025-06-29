# LexOS Genesis Backend API Documentation

## Overview

The LexOS Genesis Backend provides a comprehensive API for managing AI agents, tasks, authentication, system monitoring, and model management. It integrates with Ollama to provide access to advanced AI models including `r1-unrestricted` and `gemma3n-unrestricted`.

## Base URL

```
http://localhost:3001
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Default Credentials

- **Admin**: username: `admin`, password: `admin123`
- **Operator**: username: `operator`, password: `operator123`

## API Endpoints

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}

Response:
{
  "token": "jwt-token",
  "user": {
    "user_id": "user-admin-001",
    "username": "admin",
    "role": "admin",
    "permissions": ["all"],
    "profile": {...}
  }
}
```

#### Logout
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### Verify Token
```http
GET /api/auth/verify
Authorization: Bearer <token>

Response:
{
  "valid": true,
  "user": {...}
}
```

### User Management

#### List Users (Admin only)
```http
GET /api/users
Authorization: Bearer <token>

Response:
{
  "success": true,
  "users": [...],
  "total": 2
}
```

#### Create User (Admin only)
```http
POST /api/users
Authorization: Bearer <token>
Content-Type: application/json

{
  "username": "newuser",
  "password": "password123",
  "role": "operator",
  "permissions": ["read", "execute"],
  "profile": {
    "display_name": "New User",
    "email": "newuser@lexos.ai"
  }
}
```

### Agent Management

#### List Agents
```http
GET /api/agents
Authorization: Bearer <token>

Response:
{
  "agents": [
    {
      "agent_id": "agent-r1-unrestricted",
      "name": "R1 Unrestricted Agent",
      "description": "Advanced reasoning agent with unrestricted capabilities",
      "status": "active",
      "capabilities": [...],
      "current_tasks": 0,
      "queue_length": 0
    },
    {
      "agent_id": "agent-gemma3n-unrestricted",
      "name": "Gemma 3N Unrestricted Agent",
      "description": "High-performance technical agent",
      "status": "active",
      "capabilities": [...],
      "current_tasks": 0,
      "queue_length": 0
    }
  ],
  "total_agents": 5,
  "active_agents": 5,
  "timestamp": 1751234567890
}
```

#### Get Agent Details
```http
GET /api/agents/:agentId
Authorization: Bearer <token>

Response:
{
  "agent_id": "agent-r1-unrestricted",
  "name": "R1 Unrestricted Agent",
  "status": "active",
  "capabilities": [
    "advanced_reasoning",
    "complex_analysis",
    "code_generation",
    "creative_writing",
    "strategic_planning"
  ],
  ...
}
```

#### Get Agent Metrics
```http
GET /api/agents/metrics
Authorization: Bearer <token>

Response:
{
  "agents": {
    "agent-r1-unrestricted": {
      "active": true,
      "status": "active",
      "load": 0.2,
      "queue_length": 1,
      "average_response_time": 3.5,
      "total_completed": 42
    }
  },
  "timestamp": 1751234567890
}
```

### Task Management

#### Submit Task
```http
POST /api/tasks
Authorization: Bearer <token>
Content-Type: application/json
X-User-Id: user-id (optional)

{
  "agent_id": "agent-r1-unrestricted",
  "task_type": "reasoning",
  "parameters": {
    "query": "Explain quantum entanglement",
    "reasoning_type": "scientific",
    "depth": "comprehensive"
  },
  "priority": "high"
}

Response:
{
  "success": true,
  "task_id": "task-uuid",
  "agent_id": "agent-r1-unrestricted",
  "status": "queued",
  "estimated_completion": 1751234567890,
  "queue_position": 1
}
```

#### Task Types by Agent

**R1 Unrestricted Agent:**
- `reasoning` - Advanced reasoning tasks
- `analysis` - Complex analysis
- `code_generation` - Generate code
- `creative_writing` - Creative content
- `research` - Comprehensive research
- `strategic_planning` - Strategic plans
- `hypothesis_generation` - Generate hypotheses
- `synthesis` - Synthesize information
- `custom` - Custom tasks

**Gemma 3N Agent:**
- `mathematical_computation` - Math problems
- `algorithm_design` - Design algorithms
- `technical_analysis` - Technical analysis
- `optimization` - Optimization problems
- `data_processing` - Process data
- `scientific_analysis` - Scientific analysis
- `system_design` - Design systems
- `simulation` - Run simulations
- `statistical_analysis` - Statistical analysis
- `custom_technical` - Custom technical tasks

#### Get Task Status
```http
GET /api/tasks/:taskId
Authorization: Bearer <token>

Response:
{
  "task_id": "task-uuid",
  "agent_id": "agent-r1-unrestricted",
  "user_id": "user-id",
  "task_type": "reasoning",
  "status": "completed",
  "result": {...},
  "created_at": 1751234567890,
  "completed_at": 1751234567890,
  "execution_time": 3456
}
```

#### List Tasks
```http
GET /api/tasks?agent_id=agent-r1-unrestricted&status=completed&limit=10&offset=0
Authorization: Bearer <token>

Response:
{
  "tasks": [...],
  "total": 150,
  "limit": 10,
  "offset": 0,
  "has_more": true
}
```

#### Cancel Task
```http
DELETE /api/tasks/:taskId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "task_id": "task-uuid",
  "status": "cancelled"
}
```

### Model Management

#### List Available Models
```http
GET /api/models
Authorization: Bearer <token>

Response:
{
  "models": [
    {
      "id": "r1-unrestricted",
      "name": "R1 Unrestricted",
      "description": "Advanced reasoning model with unrestricted capabilities",
      "context_window": 128000,
      "capabilities": ["reasoning", "analysis", "code_generation", "creative_writing"]
    },
    {
      "id": "gemma3n-unrestricted",
      "name": "Gemma 3N Unrestricted",
      "description": "High-performance model optimized for technical tasks",
      "context_window": 32000,
      "capabilities": ["technical_analysis", "problem_solving", "mathematics"]
    }
  ]
}
```

#### Get Model Info
```http
GET /api/models/:modelId
Authorization: Bearer <token>

Response:
{
  "name": "R1 Unrestricted",
  "description": "Advanced reasoning model with unrestricted capabilities",
  "context_window": 128000,
  "capabilities": [...]
}
```

#### List Ollama Models
```http
GET /api/models/ollama/list
Authorization: Bearer <token>

Response:
{
  "success": true,
  "models": [...]
}
```

#### Pull Ollama Model
```http
POST /api/models/ollama/pull
Authorization: Bearer <token>
Content-Type: application/json

{
  "model_name": "llama3.2"
}

Response:
{
  "success": true,
  "status": "success"
}
```

### Direct Model Interaction

#### Chat with Model
```http
POST /api/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello!"}
  ],
  "model": "r1-unrestricted",
  "options": {
    "temperature": 0.7,
    "max_tokens": 1000
  }
}

Response:
{
  "success": true,
  "message": {
    "role": "assistant",
    "content": "Hello! How can I help you today?"
  },
  "model": "r1-unrestricted",
  "total_duration": 1234567890,
  ...
}
```

#### Generate Completion
```http
POST /api/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "prompt": "The meaning of life is",
  "model": "r1-unrestricted",
  "options": {
    "temperature": 0.9,
    "max_tokens": 500
  }
}

Response:
{
  "success": true,
  "response": "...",
  "model": "r1-unrestricted",
  ...
}
```

### System Monitoring

#### System Info
```http
GET /api/v1/system/info?include_sensitive=false
Authorization: Bearer <token>

Response:
{
  "system": {
    "status": "online",
    "uptime": 86400,
    "hostname": "lexos-server",
    "platform": "linux",
    "arch": "x64"
  },
  "application": {
    "version": "1.0.0",
    "environment": "production",
    "node_version": "v20.11.0",
    "uptime": 3600
  },
  "resources": {
    "cpu": {...},
    "memory": {...},
    "storage": {...},
    "network": [...]
  },
  "timestamp": 1751234567890
}
```

#### GPU Status
```http
GET /api/v1/gpu/status
Authorization: Bearer <token>

Response:
{
  "driver_version": "535.129.03",
  "cuda_version": "12.2",
  "devices": [{
    "index": 0,
    "name": "NVIDIA H100",
    "memory": {
      "total": 85899345920,
      "used": 25769803776,
      "free": 60129542144,
      "usage_percent": 30
    },
    "utilization": {
      "gpu": 65,
      "memory": 30
    },
    "temperature": {
      "gpu": 72,
      "memory": 75
    }
  }],
  "timestamp": 1751234567890
}
```

#### Health Check
```http
GET /api/v1/system/health

Response:
{
  "status": "healthy",
  "checks": {
    "system": true,
    "database": true,
    "ollama": true,
    "storage": true,
    "memory": true
  },
  "timestamp": 1751234567890
}
```

#### System Metrics
```http
GET /api/v1/system/metrics
Authorization: Bearer <token>

Response:
{
  "timestamp": 1751234567890,
  "cpu": {...},
  "memory": {...},
  "storage": {...},
  "gpu": {...},
  "process": {...}
}
```

#### System Status
```http
GET /api/system/status
Authorization: Bearer <token>

Response:
{
  "total_tasks": 150,
  "active_tasks": 5,
  "queued_tasks": 2,
  "completed_tasks": 140,
  "failed_tasks": 3,
  "agents_online": 5,
  "agents_total": 5,
  "uptime": 86400,
  "timestamp": 1751234567890
}
```

### Session Management

#### List Active Sessions (Admin only)
```http
GET /api/sessions
Authorization: Bearer <token>

Response:
{
  "success": true,
  "sessions": [
    {
      "session_id": "session-uuid",
      "user_id": "user-admin-001",
      "user_info": {
        "username": "admin",
        "role": "admin"
      },
      "created_at": 1751234567890,
      "expires_at": 1751320967890
    }
  ],
  "total": 1
}
```

## WebSocket Connection

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3001');

ws.on('message', (data) => {
  const message = JSON.parse(data);
  // Handle different message types
  switch(message.type) {
    case 'connection':
      console.log('Connected:', message.data);
      break;
    case 'system_status':
      console.log('System status:', message.data);
      break;
  }
});
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

The API implements rate limiting to prevent abuse:
- Window: 15 minutes
- Max requests: 100 per window
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Security Considerations

1. Always use HTTPS in production
2. Change default JWT secret
3. Implement proper password policies
4. Use environment variables for sensitive configuration
5. Enable CORS only for trusted origins
6. Implement request validation and sanitization
7. Monitor and log API usage
8. Regular security audits

## Example Usage

### Complete Task Submission Flow

```javascript
// 1. Login
const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' })
});
const { token } = await loginResponse.json();

// 2. Submit task
const taskResponse = await fetch('http://localhost:3001/api/tasks', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agent_id: 'agent-r1-unrestricted',
    task_type: 'code_generation',
    parameters: {
      description: 'Create a Python function to calculate fibonacci numbers',
      language: 'python',
      include_tests: true
    },
    priority: 'high'
  })
});
const { task_id } = await taskResponse.json();

// 3. Check task status
const statusResponse = await fetch(`http://localhost:3001/api/tasks/${task_id}`, {
  headers: { 'Authorization': `Bearer ${token}` }
});
const task = await statusResponse.json();
console.log('Task result:', task.result);
```