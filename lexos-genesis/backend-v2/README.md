# LexOS Backend v2

A comprehensive production-ready Node.js backend for the LexOS Cybernetic Genesis project.

## Features

- **Express.js with TypeScript** - Type-safe, modern backend framework
- **Modular Architecture** - Clean separation of concerns with controllers, services, and middleware
- **Authentication & Authorization** - JWT-based auth with role-based access control
- **Real-time Communication** - WebSocket support via Socket.io
- **Database Integration** - PostgreSQL with Prisma ORM
- **Caching & Pub/Sub** - Redis for caching and real-time messaging
- **Task Queue** - Bull queue for background job processing
- **Agent System** - Comprehensive AI agent orchestration with:
  - Base agent class with lifecycle management
  - Multi-agent coordination
  - Memory and tool management
  - Self-modification capabilities
- **Model Management** - Support for multiple AI providers (OpenAI, Anthropic, Ollama)
- **File Management** - Secure file upload and storage
- **Monitoring & Metrics** - Prometheus metrics and health checks
- **Comprehensive Logging** - Winston logger with daily rotation
- **Rate Limiting** - Protection against abuse
- **Security** - Helmet, CORS, input validation

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- Redis 7+
- Docker & Docker Compose (optional)

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Update `.env` with your configuration

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

## Development

Start the development server:
```bash
npm run dev
```

## Production

### Using Docker

1. Build and start services:
   ```bash
   docker-compose up -d
   ```

### Manual Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```

3. Start the server:
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/logout` - User logout
- `POST /api/v1/auth/refresh` - Refresh token
- `GET /api/v1/auth/me` - Get current user

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update profile
- `GET /api/v1/users` - List all users (admin)
- `PUT /api/v1/users/:id/status` - Update user status (admin)

### Agents
- `GET /api/v1/agents` - List agents
- `POST /api/v1/agents` - Create agent
- `GET /api/v1/agents/:id` - Get agent details
- `PUT /api/v1/agents/:id` - Update agent
- `DELETE /api/v1/agents/:id` - Delete agent
- `POST /api/v1/agents/:id/start` - Start agent
- `POST /api/v1/agents/:id/stop` - Stop agent
- `GET /api/v1/agents/:id/memory` - Get agent memory
- `GET /api/v1/agents/:id/tools` - Get agent tools

### Conversations
- `GET /api/v1/conversations` - List conversations
- `POST /api/v1/conversations` - Create conversation
- `GET /api/v1/conversations/:id` - Get conversation
- `POST /api/v1/conversations/:id/messages` - Send message
- `POST /api/v1/conversations/:id/agents/:agentId` - Add agent to conversation

### Tasks
- `GET /api/v1/tasks` - List tasks
- `POST /api/v1/tasks` - Create task
- `GET /api/v1/tasks/:id` - Get task details
- `POST /api/v1/tasks/:id/cancel` - Cancel task
- `POST /api/v1/tasks/:id/retry` - Retry failed task

### Models
- `GET /api/v1/models` - List AI models
- `POST /api/v1/models` - Add model (admin)
- `POST /api/v1/models/:id/test` - Test model
- `POST /api/v1/models/:id/set-default` - Set default model

### Files
- `GET /api/v1/files` - List files
- `POST /api/v1/files/upload` - Upload file
- `GET /api/v1/files/:id/download` - Download file
- `GET /api/v1/files/:id/preview` - Preview file

### System
- `GET /api/v1/system/status` - System status
- `GET /api/v1/system/health` - Health check
- `GET /api/v1/system/metrics` - System metrics
- `POST /api/v1/system/maintenance` - Toggle maintenance mode (admin)

## WebSocket Events

### Main Namespace (`/`)
- `system:status` - Get system status
- `notifications:subscribe` - Subscribe to notifications
- `tasks:subscribe` - Subscribe to task updates

### Agent Namespace (`/agents`)
- `subscribe:agent` - Subscribe to agent updates
- `agent:command` - Send command to agent

### Conversation Namespace (`/conversations`)
- `join:conversation` - Join conversation room
- `typing:start/stop` - Typing indicators

## Agent System

The agent system provides a flexible framework for creating AI agents:

1. **Base Agent** - Abstract class providing core functionality
2. **System Agent** - Monitors system health and resources
3. **Assistant Agent** - Handles conversations and tasks
4. **Coordinator Agent** - Manages multi-agent workflows

### Creating Custom Agents

```typescript
import { BaseAgent } from '@/agents/base.agent';

export class CustomAgent extends BaseAgent {
  protected async onInitialize(): Promise<void> {
    // Initialize agent resources
    this.addCapability('custom-capability');
    this.registerTool({
      name: 'custom_tool',
      description: 'Custom tool description',
      schema: {},
      handler: async (params) => {
        // Tool implementation
      },
    });
  }

  protected async onShutdown(): Promise<void> {
    // Cleanup resources
  }

  async process(input: any): Promise<any> {
    // Process agent requests
  }
}
```

## Security

- JWT-based authentication
- Role-based access control (USER, ADMIN, SYSTEM)
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- SQL injection protection via Prisma
- XSS protection via Helmet
- CORS configuration

## Monitoring

- Health endpoints at `/health` and `/ready`
- Prometheus metrics at port 9090
- Structured logging with Winston
- Real-time metrics via WebSocket

## License

MIT