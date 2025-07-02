# LexOS Genesis - Real Agent Executor System

I've successfully created a complete, functional agent executor system that can process tasks using Ollama LLMs. Here's what I've built:

## System Architecture

### Backend Components (Node.js)

1. **Agent Manager** (`backend/src/services/agentManager.js`)
   - Coordinates all agents
   - Manages task queuing and distribution
   - Tracks task history and metrics

2. **Base Agent Framework** (`backend/src/agents/BaseAgent.js`)
   - Abstract base class for all agents
   - Handles task processing queue
   - Integrates with Ollama for LLM capabilities

3. **Specialized Agents**:
   - **Consciousness Agent** (`ConsciousnessAgent.js`): Deep reasoning, self-reflection, philosophical queries
   - **Executor Agent** (`ExecutorAgent.js`): Code generation, task planning, file operations
   - **Research Agent** (`ResearchAgent.js`): Information synthesis, fact-checking, knowledge extraction

4. **Ollama Service** (`backend/src/services/ollamaService.js`)
   - Handles communication with Ollama API
   - Supports text generation, chat, and embeddings

5. **REST API** (`backend/src/index.js`)
   - Express server with endpoints for agents and tasks
   - WebSocket support for real-time updates
   - CORS-enabled for frontend integration

### Frontend Integration

1. **Updated API Client** (`src/services/api.ts`)
   - Connects to the new backend instead of mocks
   - Full support for agent and task operations

2. **Task Submission Dialog** (`src/components/agents/TaskSubmissionDialog.tsx`)
   - Dynamic UI based on agent capabilities
   - Support for different task types and parameters
   - Real-time task submission

## How to Run

### Prerequisites
1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull llama3.2`
3. Ensure Ollama is running: `ollama serve`

### Start the Backend
```bash
cd backend
npm install
npm start
```

Or use the convenience script:
```bash
cd backend
./start.sh
```

The backend will run on http://localhost:3001

### Test the System

Use the included test client:
```bash
cd backend
node test-client.js
```

Or test specific functionality:
```bash
# List agents
node test-client.js agents

# Get system status
node test-client.js status

# Run consciousness query
node test-client.js consciousness "What is the nature of reality?"

# Generate code
node test-client.js code "Create a binary search algorithm"

# Research a topic
node test-client.js research "Quantum computing breakthroughs"
```

## API Examples

### Submit a Consciousness Query
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{
    "agent_id": "consciousness-001",
    "task_type": "consciousness_query",
    "parameters": {
      "query": "What is consciousness?",
      "depth": "deep",
      "temperature": 0.9
    },
    "priority": "normal"
  }'
```

### Generate Code
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{
    "agent_id": "executor-001",
    "task_type": "code_generation",
    "parameters": {
      "command": "Create a React component for a todo list",
      "task_type": "code_generation",
      "language": "javascript",
      "temperature": 0.3
    },
    "priority": "high"
  }'
```

### Research Task
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -H "X-User-Id: test-user" \
  -d '{
    "agent_id": "research-001",
    "task_type": "general",
    "parameters": {
      "query": "Latest AI developments",
      "depth": "deep",
      "temperature": 0.5
    },
    "priority": "normal"
  }'
```

## Features Implemented

1. **Real Task Processing**: All agents actually process tasks using Ollama LLMs
2. **Queue Management**: Each agent has its own task queue with priority support
3. **Performance Tracking**: Average response time, success rate, and task metrics
4. **WebSocket Support**: Real-time updates for system status
5. **Error Handling**: Graceful degradation if Ollama is unavailable
6. **Extensible Architecture**: Easy to add new agents and capabilities

## Frontend Features

- Visual task submission dialog with agent-specific parameters
- Real-time agent status display
- Task history and metrics
- Integration with existing LexOS Genesis UI

## Security Considerations

- Safe mode enabled by default for the Executor agent
- User ID tracking for multi-tenant support
- Input validation on all endpoints
- CORS configuration for frontend security

## Next Steps

To extend the system:

1. **Add More Agents**: Create new agents by extending BaseAgent
2. **Implement Persistence**: Add database support for task history
3. **Enhanced Monitoring**: Add Prometheus metrics
4. **Task Chaining**: Allow agents to submit tasks to other agents
5. **Advanced Scheduling**: Implement priority queues and worker pools

The system is now fully functional and ready for real agent-based task processing!