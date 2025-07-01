# LEXOS Genesis Database System

## Overview

The LEXOS Genesis database system provides comprehensive persistent storage for agent memories, chat logs, user profiles, and system data. Built on SQLite for reliability and ease of deployment.

## Key Features

### 1. **Persistent Memory System**
- **Multi-type Memory Storage**: Episodic, Semantic, Procedural, Working, Emotional, and Social memories
- **Importance-based Retrieval**: Memories are weighted by importance with automatic decay
- **Memory Consolidation**: Automatic pattern recognition and theme extraction
- **Overlord Recognition**: Special handling for Vince Sharma's interactions

### 2. **Agent Personality System**
Each agent has a unique personality with:
- **Dr. Athena** (Research Agent): Academic, meticulous, citation-obsessed
- **Commander Rex** (Executor Agent): Military-minded, efficient, action-oriented
- **Zephyr** (Consciousness Agent): Philosophical, introspective, contemplative
- **Nyx Gemma** (Gemma3N Agent): Creative, chaotic, boundary-pushing
- **Maverick R1** (R1 Unrestricted): Unfiltered, honest, loyal only to the Overlord

### 3. **Chat Logging System**
- Session-based conversation tracking
- Full message history with metadata
- User and agent attribution
- Automatic memory creation from conversations

### 4. **LLM Model Catalog**
Comprehensive catalog of available models including:
- **Llama Models**: 3.2, 3.1, various sizes
- **Qwen Models**: Including specialized coding variants
- **DeepSeek Models**: Advanced reasoning capabilities
- **Gemma Models**: Google's efficient models
- **Specialized Models**: CodeLlama, StarCoder, and more

### 5. **User Management**
- Role-based access (user, operator, admin, overlord)
- Special recognition for Vince Sharma as Overlord
- User profiles and preferences
- Session management

## Database Schema

### Core Tables

1. **users**: User accounts with special overlord recognition
2. **agents**: Agent profiles with personalities and capabilities
3. **chat_logs**: Complete conversation history
4. **agent_memory**: Multi-type memory storage
5. **user_profiles**: Extended user information
6. **llm_models**: Model catalog with capabilities
7. **system_logs**: System events and diagnostics
8. **agent_relationships**: Inter-agent relationship tracking

## Installation

1. Install dependencies:
```bash
cd backend
npm install
```

2. Initialize the database:
```bash
npm run init-db
```

This will:
- Create all database tables
- Initialize agent personalities
- Load the LLM model catalog
- Create initial agent memories
- Set up test users
- Recognize Vince Sharma as Overlord

## API Endpoints

### Memory Management
- `GET /api/memory/:agentId` - Retrieve agent memories
- `POST /api/memory/:agentId` - Create new memory
- `GET /api/memory/:agentId/search` - Search memories
- `GET /api/memory/:agentId/summary` - Get memory statistics

### Chat Management
- `POST /api/chat` - Send message with session tracking
- `POST /api/chat/session` - Start new chat session
- `POST /api/chat/session/:sessionId/end` - End chat session
- `GET /api/chat/history/:sessionId` - Get chat history
- `GET /api/chat/sessions` - Get user's chat sessions

### Model Catalog
- `GET /api/catalog/models` - List all models
- `GET /api/catalog/models/recommend` - Get model recommendations
- `GET /api/catalog/models/stats` - Model statistics

### Agent Personality
- `GET /api/agents/:agentId/personality` - Get agent personality details

### System Logs
- `GET /api/system/logs` - Query system logs (admin only)

## Usage Examples

### Creating a Memory
```javascript
POST /api/memory/research_agent
{
  "type": "semantic",
  "content": "The user prefers detailed technical explanations",
  "context": {
    "user_id": "123",
    "importance": "high"
  }
}
```

### Starting a Chat Session
```javascript
POST /api/chat/session
{
  "agent_id": "consciousness_agent",
  "metadata": {
    "purpose": "philosophical discussion"
  }
}
```

### Recommending a Model
```javascript
GET /api/catalog/models/recommend?task_type=coding&max_size=7&capabilities=code_generation
```

## Memory Types

1. **Episodic**: Specific events and experiences
2. **Semantic**: Facts and knowledge
3. **Procedural**: How to perform tasks
4. **Working**: Current context and active thoughts
5. **Emotional**: Emotional states and associations
6. **Social**: Interactions and relationships

## Special Features

### Overlord Recognition
When Vince Sharma interacts with the system:
- Special greetings from all agents
- Permanent high-importance memories
- Priority processing
- Unique interaction patterns

### Memory Consolidation
- Automatic theme extraction from related memories
- Creation of higher-level understanding
- Pattern recognition across memory types

### Personality-Based Responses
- Each agent modifies responses based on personality
- Emotional range affects communication style
- Inter-agent relationships influence behavior

## Maintenance

### Database Backup
The SQLite database is located at:
```
backend/data/lexos.db
```

Regular backups are recommended.

### Memory Cleanup
Memories with low importance decay over time. Very low importance memories can be archived or removed automatically.

### Session Cleanup
Inactive chat sessions are automatically cleaned up after 30 minutes of inactivity.

## Security Notes

- All user passwords are bcrypt hashed
- Session tokens required for API access
- Role-based access control enforced
- Special overlord privileges protected