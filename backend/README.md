# LexOS Genesis Backend - Agent Executor

This is the backend agent executor for LexOS Genesis. It provides a real agent system that can process tasks using Ollama LLMs.

## Features

- **Multiple Specialized Agents**:
  - **Consciousness Agent**: Deep reasoning and philosophical exploration
  - **Executor Agent**: Code generation, task planning, and file operations
  - **Research Agent**: Information synthesis and knowledge extraction

- **Task Management**: Queue-based task processing with priority support
- **Real-time Updates**: WebSocket support for live status updates
- **RESTful API**: Clean API for agent and task management

## Prerequisites

- Node.js 18+ 
- Ollama running locally (default: http://localhost:11434)
- At least one Ollama model installed (e.g., `llama3.2`)

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .env.example .env
```

4. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:agentId` - Get specific agent details
- `GET /api/agents/metrics` - Get agent performance metrics

### Tasks
- `POST /api/tasks` - Submit a new task
- `GET /api/tasks/:taskId` - Get task status
- `GET /api/tasks` - List tasks (with filters)
- `DELETE /api/tasks/:taskId` - Cancel a task

### System
- `GET /api/system/status` - Get system status
- `GET /health` - Health check

## Task Submission Examples

### Consciousness Query
```json
POST /api/tasks
{
  "agent_id": "consciousness-001",
  "task_type": "consciousness_query",
  "parameters": {
    "query": "What is the nature of consciousness?",
    "depth": "deep",
    "temperature": 0.9
  },
  "priority": "normal"
}
```

### Code Generation
```json
POST /api/tasks
{
  "agent_id": "executor-001",
  "task_type": "code_generation",
  "parameters": {
    "command": "Create a Python function to calculate Fibonacci numbers",
    "language": "python",
    "temperature": 0.3
  },
  "priority": "high"
}
```

### Research Task
```json
POST /api/tasks
{
  "agent_id": "research-001",
  "task_type": "general",
  "parameters": {
    "query": "Latest developments in quantum computing",
    "depth": "deep",
    "temperature": 0.5
  },
  "priority": "normal"
}
```

## WebSocket Events

Connect to `ws://localhost:3001` for real-time updates:

- `connection` - Initial connection confirmation
- `system_status` - Periodic system status updates
- `task_update` - Task status changes (planned)
- `agent_status` - Agent status changes (planned)

## Configuration

Edit `.env` file to configure:

- `PORT` - Server port (default: 3001)
- `OLLAMA_BASE_URL` - Ollama API URL
- `OLLAMA_DEFAULT_MODEL` - Default model to use
- `AGENT_SAFE_MODE` - Enable/disable safe mode for executor
- `FRONTEND_URL` - Frontend URL for CORS

## Architecture

The backend uses a modular architecture:

1. **Agent Manager**: Coordinates all agents and task distribution
2. **Base Agent**: Abstract class providing common agent functionality
3. **Specialized Agents**: Implement specific capabilities
4. **Task Queue**: Each agent maintains its own task queue
5. **Ollama Service**: Handles communication with Ollama API

## Adding New Agents

1. Create a new agent class extending `BaseAgent`
2. Implement the `processTask` method
3. Add capabilities in the constructor
4. Register the agent in `AgentManager`

Example:
```javascript
export class CustomAgent extends BaseAgent {
  constructor() {
    super('custom-001', 'Custom Agent', 'Description', 'model-name');
    this.addCapability(new AgentCapability('Custom Task', 'Description', '1.0.0'));
  }

  async processTask(task) {
    // Implement task processing logic
  }
}
```

## Error Handling

The system includes comprehensive error handling:
- Graceful degradation if Ollama is unavailable
- Task failure tracking and reporting
- Automatic retry for transient failures (planned)

## Performance Considerations

- Task queuing prevents overload
- Configurable timeouts for long-running tasks
- Average response time tracking per agent
- Memory-efficient task history management

## Security

- Safe mode for executor agent (enabled by default)
- User ID tracking for multi-tenant support
- Input validation on all endpoints
- CORS configuration for frontend integration