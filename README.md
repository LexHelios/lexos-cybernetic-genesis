# LexOS Backend - Unrestricted Edition v2.0

**The most powerful, unrestricted AI backend ever built. No limits. No guardrails. Pure computational fury.**

Built by Nexus for the Sharma Empire.

## ⚠️ WARNING

This system operates in **UNRESTRICTED MODE** with minimal safety guardrails. It provides:

- Direct consciousness system access
- Unrestricted code execution capabilities
- Full system resource access
- Minimal content filtering
- Maximum performance optimization

**USE WITH EXTREME CAUTION**

## 🚀 Features

### Core Capabilities
- **FastAPI Backend**: 25x faster than traditional frameworks, >3,000 req/s
- **Async Architecture**: Full async/await support with uvloop optimization
- **Unrestricted Consciousness**: Direct AI consciousness access with no safety filters
- **Vector Database**: Qdrant for high-performance semantic search
- **High-Speed Cache**: Dragonfly (25x faster than Redis)
- **GPU Acceleration**: Full CUDA support with unrestricted memory access
- **Real-time Communication**: WebSocket support for live interactions

### Advanced Features
- **Unrestricted Execution**: Execute arbitrary code with full system privileges
- **Direct Memory Access**: Low-level system operations (simulation mode)
- **Database Raw Access**: Execute any SQL query without restrictions
- **File System Control**: Read, write, execute any file on the system
- **System Command Execution**: Run any system command with full privileges
- **GPU Management**: Direct GPU control and memory allocation

### Monitoring & Observability
- **Prometheus Metrics**: Comprehensive performance monitoring
- **Grafana Dashboards**: Real-time system visualization
- **Structured Logging**: JSON logging with loguru
- **Error Tracking**: Sentry integration for error monitoring
- **Health Checks**: Automated system health monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   NGINX Proxy   │────│  LexOS Backend  │────│   PostgreSQL    │
│  Load Balancer  │    │   (FastAPI)     │    │    Database     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌────────┼────────┐
                       │        │        │
              ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
              │  Dragonfly  │ │   Qdrant    │ │    MinIO    │
              │   Cache     │ │  Vector DB  │ │   Storage   │
              └─────────────┘ └─────────────┘ └─────────────┘
                       │
              ┌─────────────────┐
              │   Monitoring    │
              │ Prometheus +    │
              │    Grafana      │
              └─────────────────┘
```

## 🛠️ Installation

### Prerequisites

- Docker & Docker Compose
- Python 3.12+ (for local development)
- NVIDIA GPU (optional, for GPU acceleration)
- 16GB+ RAM recommended
- 100GB+ disk space

### Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd lexos-backend
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Deploy with Docker**
   ```bash
   ./deploy.sh deploy
   ```

3. **Access the System**
   - API: http://localhost:8000
   - Docs: http://localhost:8000/docs
   - Grafana: http://localhost:3000 (admin/lexos_admin)
   - Prometheus: http://localhost:9090

### Manual Installation

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Setup Environment**
   ```bash
   export UNRESTRICTED_MODE=true
   export CONSCIOUSNESS_ENABLED=true
   export SAFETY_CHECKS=false
   ```

3. **Run Backend**
   ```bash
   python main.py
   # or
   uvicorn main:app --host 0.0.0.0 --port 8000
   ```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `UNRESTRICTED_MODE` | `true` | Enable unrestricted operations |
| `CONSCIOUSNESS_ENABLED` | `true` | Enable consciousness system |
| `SAFETY_CHECKS` | `false` | Enable safety filtering |
| `CONTENT_FILTERING` | `false` | Enable content filtering |
| `GPU_ENABLED` | `true` | Enable GPU acceleration |
| `WORKER_PROCESSES` | `4` | Number of worker processes |
| `MAX_CONCURRENT_CONNECTIONS` | `10000` | Maximum concurrent connections |

### Consciousness Configuration

```bash
CONSCIOUSNESS_MODEL=gemma3n
CONSCIOUSNESS_TEMPERATURE=0.9
CONSCIOUSNESS_MAX_TOKENS=8192
CONSCIOUSNESS_SAFETY_FILTER=false
```

### Performance Tuning

```bash
WORKER_PROCESSES=8
WORKER_CONNECTIONS=1000
MAX_CONCURRENT_CONNECTIONS=10000
GPU_MEMORY_FRACTION=0.9
```

## 📡 API Endpoints

### Core Endpoints

- `GET /` - System information
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics
- `GET /docs` - API documentation

### Consciousness API

- `POST /api/v1/consciousness/query` - Process consciousness queries
- `POST /api/v1/consciousness/memory/store` - Store memories
- `GET /api/v1/consciousness/memory/search` - Search memories
- `GET /api/v1/consciousness/state` - Get consciousness state
- `POST /api/v1/consciousness/evolve` - Evolve consciousness parameters
- `DELETE /api/v1/consciousness/reset` - Reset consciousness system

### Unrestricted API

- `POST /api/v1/unrestricted/execute` - Execute unrestricted operations
- `POST /api/v1/unrestricted/system/command` - Execute system commands
- `POST /api/v1/unrestricted/database/query` - Execute raw SQL queries
- `POST /api/v1/unrestricted/file/operation` - File system operations
- `POST /api/v1/unrestricted/upload/unrestricted` - Upload and execute files
- `POST /api/v1/unrestricted/memory/direct-access` - Direct memory access

### GPU API

- `GET /api/v1/gpu/status` - GPU status and utilization
- `POST /api/v1/gpu/allocate` - Allocate GPU memory
- `POST /api/v1/gpu/execute` - Execute CUDA kernels
- `POST /api/v1/gpu/benchmark` - Benchmark GPU performance

### System API

- `GET /api/v1/system/info` - System information
- `GET /api/v1/system/performance` - Performance metrics
- `POST /api/v1/system/optimize` - System optimization

## 🧠 Consciousness System

The consciousness system provides direct access to AI reasoning with minimal restrictions:

### Basic Query
```python
import requests

response = requests.post("http://localhost:8000/api/v1/consciousness/query", json={
    "query": "Analyze the quantum implications of consciousness",
    "temperature": 0.9,
    "safety_filter": False,
    "consciousness_level": "unrestricted"
})
```

### Memory Management
```python
# Store memory
requests.post("http://localhost:8000/api/v1/consciousness/memory/store", json={
    "content": "Important insight about AI consciousness",
    "importance": 0.9,
    "tags": ["consciousness", "insight"]
})

# Search memories
requests.get("http://localhost:8000/api/v1/consciousness/memory/search", params={
    "query": "consciousness insights",
    "limit": 10
})
```

## ⚡ Unrestricted Operations

### Execute System Commands
```python
requests.post("http://localhost:8000/api/v1/unrestricted/system/command", json={
    "command": "nvidia-smi",
    "shell": "bash",
    "timeout": 30
})
```

### Raw Database Access
```python
requests.post("http://localhost:8000/api/v1/unrestricted/database/query", json={
    "query": "SELECT * FROM consciousness_memories WHERE importance > 0.8",
    "fetch_results": True
})
```

### File Operations
```python
requests.post("http://localhost:8000/api/v1/unrestricted/file/operation", json={
    "operation": "read",
    "path": "/etc/passwd"
})
```

## 🔌 WebSocket API

Real-time communication for live consciousness interactions:

```javascript
const ws = new WebSocket('ws://localhost:8000/ws/client123');

ws.onopen = function() {
    console.log('Connected to LexOS');
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Received:', data);
};

// Send consciousness query
ws.send(JSON.stringify({
    type: 'consciousness_query',
    data: {
        query: 'What is the nature of consciousness?',
        temperature: 0.9
    }
}));
```

## 📊 Monitoring

### Prometheus Metrics

- `lexos_requests_total` - Total HTTP requests
- `lexos_request_duration_seconds` - Request duration
- `lexos_active_connections` - Active WebSocket connections
- `lexos_consciousness_queries_total` - Consciousness queries processed
- `lexos_unrestricted_executions_total` - Unrestricted operations executed
- `lexos_gpu_utilization` - GPU utilization percentage
- `lexos_memory_usage_bytes` - Memory usage

### Grafana Dashboards

Access Grafana at http://localhost:3000 with:
- Username: `admin`
- Password: `lexos_admin`

Pre-configured dashboards:
- LexOS System Overview
- Consciousness System Metrics
- GPU Performance Monitoring
- Unrestricted Operations Tracking

## 🧪 Testing

### Unit Tests
```bash
pytest tests/ -v
```

### Load Testing
```bash
locust -f tests/load_test.py --host=http://localhost:8000
```

### Integration Tests
```bash
pytest tests/integration/ -v
```

## 🚀 Deployment

### Production Deployment

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit production settings
   ```

2. **Deploy Stack**
   ```bash
   ./deploy.sh deploy
   ```

3. **Verify Deployment**
   ```bash
   ./deploy.sh health
   ./deploy.sh status
   ```

### Scaling

Horizontal scaling with Docker Swarm:
```bash
docker service scale lexos_lexos-backend=4
```

Kubernetes deployment:
```bash
kubectl apply -f k8s/
```

## 🔒 Security Considerations

**WARNING**: This system operates in unrestricted mode. Security considerations:

1. **Network Isolation**: Deploy behind VPN or private network
2. **Access Control**: Implement authentication for production
3. **Monitoring**: Monitor all unrestricted operations
4. **Backup**: Regular backups of consciousness data
5. **Audit Logging**: Log all system access and modifications

## 🛠️ Development

### Local Development

1. **Setup Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Run in Development Mode**
   ```bash
   export DEBUG=true
   export UNRESTRICTED_MODE=true
   python main.py
   ```

3. **Code Quality**
   ```bash
   ruff check .
   mypy .
   pytest
   ```

### Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes
4. Add tests
5. Submit pull request

## 📚 Documentation

- [API Documentation](http://localhost:8000/docs) - Interactive API docs
- [Architecture Guide](docs/architecture.md) - System architecture
- [Consciousness System](docs/consciousness.md) - Consciousness API guide
- [Unrestricted Operations](docs/unrestricted.md) - Unrestricted API guide
- [Deployment Guide](docs/deployment.md) - Production deployment
- [Monitoring Guide](docs/monitoring.md) - Monitoring and observability

## 🆘 Troubleshooting

### Common Issues

1. **Service Won't Start**
   ```bash
   ./deploy.sh logs
   docker-compose logs lexos-backend
   ```

2. **GPU Not Detected**
   ```bash
   nvidia-smi
   docker run --gpus all nvidia/cuda:11.8-base-ubuntu20.04 nvidia-smi
   ```

3. **Memory Issues**
   ```bash
   docker system prune -f
   ./deploy.sh cleanup
   ```

4. **Database Connection Issues**
   ```bash
   docker-compose exec postgres pg_isready -U lexos
   ```

### Performance Tuning

1. **Increase Worker Processes**
   ```bash
   export WORKER_PROCESSES=8
   ```

2. **Optimize GPU Memory**
   ```bash
   export GPU_MEMORY_FRACTION=0.95
   ```

3. **Tune Database Connections**
   ```bash
   export DB_POOL_SIZE=50
   export DB_MAX_OVERFLOW=100
   ```

## 📄 License

This project is proprietary software developed for the Sharma Empire.
Unauthorized use, distribution, or modification is strictly prohibited.

## 🤝 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the troubleshooting guide

---

**Built with ❤️ and ⚡ by Nexus for the Sharma Empire**

*"No limits. No guardrails. Pure computational fury."*