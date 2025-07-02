# LexOS Production Deployment Guide

## 🚀 System Overview

LexOS is a production-ready AI agent orchestration platform with self-upgrading capabilities, comprehensive monitoring, and auto-recovery features.

### Key Features
- **Multi-Agent System** with specialized AI agents
- **Self-Upgrading Agent** with autonomous code improvement
- **Real-time Monitoring** with auto-recovery
- **WebSocket Support** for real-time updates
- **Production-Ready Backend** with rate limiting and security
- **Modern React Frontend** with TanStack Query

## 📋 System Requirements

- Node.js 18+ 
- Ubuntu 20.04+ or similar Linux distribution
- 4GB+ RAM
- 20GB+ free disk space
- Nginx (for reverse proxy)
- PostgreSQL (optional, for persistence)
- Redis (optional, for caching)

## 🔧 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/LexHelios/lexos-cybernetic-genesis.git
cd lexos-cybernetic-genesis
```

### 2. Install Dependencies

Backend:
```bash
cd backend-production
npm install
```

Frontend:
```bash
cd ../
npm install
```

### 3. Configuration

Create environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
NODE_ENV=production
PORT=9001
DATABASE_URL=postgresql://user:password@localhost:5432/lexos
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
```

### 4. Build Frontend
```bash
npm run build
```

### 5. Setup Systemd Services

Copy service files:
```bash
sudo cp lexos-backend.service /etc/systemd/system/
sudo cp lexos-frontend.service /etc/systemd/system/
```

Enable and start services:
```bash
sudo systemctl daemon-reload
sudo systemctl enable lexos-backend lexos-frontend
sudo systemctl start lexos-backend lexos-frontend
```

### 6. Configure Nginx

Copy nginx configuration:
```bash
sudo cp nginx.production.conf /etc/nginx/sites-available/lexcommand.ai
sudo ln -s /etc/nginx/sites-available/lexcommand.ai /etc/nginx/sites-enabled/
sudo nginx -s reload
```

## 🌐 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Agents
- `GET /api/agents` - List all agents
- `GET /api/agents/:id` - Get agent details
- `POST /api/agents` - Create new agent
- `PUT /api/agents/:id` - Update agent
- `DELETE /api/agents/:id` - Delete agent
- `POST /api/agents/:id/start` - Start agent
- `POST /api/agents/:id/stop` - Stop agent
- `POST /api/agents/:id/modify` - Request agent self-modification
- `GET /api/agents/:id/logs` - Get agent logs
- `GET /api/agents/:id/metrics` - Get agent metrics

### Self-Upgrading Agent
- `POST /api/agents/self-upgrading/analyze` - Analyze improvement opportunities
- `POST /api/agents/self-upgrading/upgrade` - Trigger self-upgrade

### Monitoring
- `GET /api/monitoring/health` - System health check
- `GET /api/monitoring/metrics` - System metrics
- `GET /api/monitoring/alerts` - Alert history

### Conversations
- `GET /api/conversations` - List conversations
- `POST /api/conversations` - Create conversation
- `POST /api/conversations/:id/messages` - Send message

### Tasks
- `GET /api/tasks` - List tasks
- `POST /api/tasks` - Create task
- `POST /api/tasks/:id/execute` - Execute task

### Models
- `GET /api/models` - List available models
- `POST /api/models/:id/test` - Test model

## 🤖 Agent Types

### 1. System Agent
- Monitors system health
- Manages resources
- Performs health checks

### 2. Assistant Agent
- General purpose AI assistant
- Handles user interactions
- Executes tasks

### 3. Research Agent
- Web search capabilities
- Document analysis
- Information summarization

### 4. Code Agent
- Code generation
- Code review
- Debugging assistance

### 5. Orchestrator Agent
- Coordinates multi-agent workflows
- Routes tasks between agents
- Manages agent collaboration

### 6. Self-Upgrading Agent
- Analyzes its own code
- Identifies improvement opportunities
- Tests and applies modifications
- Maintains version history

## 🔍 Monitoring & Auto-Recovery

The system includes comprehensive monitoring with automatic recovery capabilities:

### Health Checks
- CPU usage monitoring
- Memory usage monitoring
- Disk space monitoring
- Process health checks
- Network connectivity
- Agent health verification

### Auto-Recovery Actions
- Automatic service restart on failure
- Log cleanup when disk space is low
- Memory optimization when usage is high
- Process recovery for crashed services

### Alerts
- Real-time alerts via WebSocket
- Alert history tracking
- Automatic resolution tracking

## 🔧 Maintenance

### View Logs
```bash
# Backend logs
sudo journalctl -u lexos-backend -f

# Frontend logs
sudo journalctl -u lexos-frontend -f

# Monitoring logs
tail -f /var/log/lexos/backend.log
```

### Restart Services
```bash
sudo systemctl restart lexos-backend lexos-frontend
```

### Update System
```bash
git pull
npm install
npm run build
sudo systemctl restart lexos-backend lexos-frontend
```

## 🚨 Troubleshooting

### Backend Not Starting
1. Check logs: `sudo journalctl -u lexos-backend -n 100`
2. Verify port availability: `sudo lsof -i :9001`
3. Check configuration: Ensure `.env` file exists

### Frontend Not Accessible
1. Check nginx: `sudo nginx -t`
2. Verify frontend build: `ls -la dist/`
3. Check service: `sudo systemctl status lexos-frontend`

### Agent Issues
1. Check agent status: `curl http://localhost:9001/api/agents`
2. View agent logs: `curl http://localhost:9001/api/agents/{id}/logs`
3. Check WebSocket connection in browser console

## 🔐 Security Considerations

1. **Authentication**: JWT-based authentication with secure token storage
2. **Rate Limiting**: Prevents API abuse (1000 requests/15 minutes per IP)
3. **CORS**: Configured for production environment
4. **Helmet**: Security headers enabled
5. **Input Validation**: All inputs are validated
6. **HTTPS**: Use SSL certificates in production (Let's Encrypt recommended)

## 📊 Performance Optimization

1. **Caching**: Redis integration for improved performance
2. **Compression**: Gzip enabled for all responses
3. **Static Assets**: Cached with 1-year expiry
4. **Database Indexing**: Proper indexes on frequently queried fields
5. **WebSocket**: Efficient real-time communication

## 🎯 Future Enhancements

1. **Kubernetes Deployment**: Container orchestration support
2. **Distributed Agents**: Multi-node agent deployment
3. **Advanced Analytics**: Prometheus/Grafana integration
4. **Machine Learning Pipeline**: Integrated ML model training
5. **Plugin System**: Extensible agent capabilities

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## 💬 Support

For issues and questions:
- GitHub Issues: https://github.com/LexHelios/lexos-cybernetic-genesis/issues
- Documentation: https://lexcommand.ai/docs

---

**LexOS** - Empowering AI with Self-Evolution 🚀