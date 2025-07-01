# LexOS Genesis Open Source Production Setup

## Overview
This guide configures LexOS Genesis using only open-source technologies, eliminating the need for proprietary API keys.

## Open Source Stack

### 1. **AI/LLM Models** (Replace OpenAI/Anthropic)
- **Ollama**: Local LLM hosting (already configured in your project)
  - Models: Llama 3, Mistral, Mixtral, CodeLlama, etc.
  - Install: https://ollama.ai
  
- **LocalAI**: OpenAI-compatible API for local models
  - Supports: LLMs, Whisper, Stable Diffusion
  - Install: https://localai.io

- **Whisper.cpp**: Open source voice transcription (replaces OpenAI Whisper)
  - Fast, local speech-to-text
  - Install: https://github.com/ggerganov/whisper.cpp

### 2. **Required Infrastructure** (All Open Source)

#### Databases:
- **PostgreSQL 15+**: Main database (open source)
- **Redis 7+**: Caching and sessions (open source)

#### Vector Database:
- **Qdrant**: Open source vector database (replaces Pinecone)
  - Self-hosted: https://qdrant.tech
  - Docker: `docker run -p 6333:6333 qdrant/qdrant`

- **ChromaDB**: Alternative vector database
  - Install: `pip install chromadb`

#### Monitoring:
- **Grafana**: Dashboards (already in stack)
- **Prometheus**: Metrics (already in stack)
- **Jaeger**: Tracing (already in stack)
- **Plausible Analytics**: Open source analytics (replaces Google Analytics)

#### Email:
- **Postal**: Open source email server (replaces SendGrid)
  - Self-hosted: https://postal.atech.media

## Environment Configuration

Create `.env.production` with open source services only:

```bash
# LexOS Genesis Open Source Production Configuration

# Node Environment
NODE_ENV=production
PORT=9000
FRONTEND_URL=https://your-domain.com

# Database Configuration (PostgreSQL)
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=lexos_genesis
DATABASE_USER=lexos_user
DATABASE_PASSWORD=<your-secure-database-password>
DATABASE_SSL=true

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<your-secure-redis-password>

# Security Configuration
JWT_SECRET=<generate-secure-64-character-random-string>
SESSION_SECRET=<generate-another-secure-64-character-random-string>
ENCRYPTION_KEY=<generate-32-byte-encryption-key>

# Ollama Configuration (Local LLM)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3:latest

# LocalAI Configuration (OpenAI Compatible)
LOCALAI_HOST=http://localhost:8080
LOCALAI_API_KEY=not-needed-but-required

# Whisper.cpp Configuration (Voice)
WHISPER_MODEL_PATH=/opt/whisper/models/ggml-base.bin
WHISPER_LANGUAGE=en

# Vector Database (Qdrant)
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=lexos_memories

# Open Source Monitoring
GRAFANA_HOST=localhost:3000
PROMETHEUS_HOST=localhost:9090
JAEGER_HOST=localhost:16686

# Email (Postal)
SMTP_HOST=localhost
SMTP_PORT=25
SMTP_USER=lexos
SMTP_PASSWORD=<postal-password>
EMAIL_FROM=noreply@your-domain.com

# Disable Proprietary Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
COHERE_API_KEY=
PINECONE_API_KEY=
SENTRY_DSN=

# Feature Flags
ENABLE_LOCAL_MODELS=true
ENABLE_OLLAMA=true
ENABLE_LOCALAI=true
USE_OPENSOURCE_ONLY=true
```

## Installation Steps

### 1. Install Ollama
```bash
# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Pull models
ollama pull llama3
ollama pull codellama
ollama pull mistral
```

### 2. Install LocalAI (OpenAI Compatible)
```bash
# Docker method
docker run -p 8080:8080 -v $PWD/models:/models localai/localai:latest

# Or binary installation
wget https://github.com/mudler/LocalAI/releases/latest/download/local-ai-Linux-x86_64
chmod +x local-ai-Linux-x86_64
./local-ai-Linux-x86_64
```

### 3. Install Whisper.cpp
```bash
# Clone and build
git clone https://github.com/ggerganov/whisper.cpp
cd whisper.cpp
make

# Download model
bash ./models/download-ggml-model.sh base

# Create service wrapper
cat > /usr/local/bin/whisper-server << 'EOF'
#!/bin/bash
cd /opt/whisper.cpp
./server -m models/ggml-base.bin
EOF
chmod +x /usr/local/bin/whisper-server
```

### 4. Install Qdrant Vector Database
```bash
# Docker
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant

# Or native installation
wget https://github.com/qdrant/qdrant/releases/latest/download/qdrant
chmod +x qdrant
./qdrant
```

### 5. Update Application Code

Create `/home/user/lexos-genesis/backend/src/services/opensource-ai.js`:

```javascript
// Wrapper for open source AI services
const axios = require('axios');

class OpenSourceAI {
  constructor() {
    this.ollamaHost = process.env.OLLAMA_HOST || 'http://localhost:11434';
    this.localAIHost = process.env.LOCALAI_HOST || 'http://localhost:8080';
  }

  // Text generation using Ollama
  async generateText(prompt, model = 'llama3') {
    const response = await axios.post(`${this.ollamaHost}/api/generate`, {
      model,
      prompt,
      stream: false
    });
    return response.data.response;
  }

  // Chat completion using LocalAI (OpenAI compatible)
  async chatCompletion(messages) {
    const response = await axios.post(`${this.localAIHost}/v1/chat/completions`, {
      model: 'llama3',
      messages,
      temperature: 0.7
    });
    return response.data.choices[0].message;
  }

  // Speech to text using Whisper.cpp
  async transcribeAudio(audioBuffer) {
    // Implementation for whisper.cpp server
    const formData = new FormData();
    formData.append('file', audioBuffer);
    
    const response = await axios.post('http://localhost:5000/transcribe', formData);
    return response.data.text;
  }
}

module.exports = OpenSourceAI;
```

## Docker Compose for Open Source Stack

Create `docker-compose.opensource.yml`:

```yaml
version: '3.8'

services:
  # Main application
  backend:
    build: ./backend
    environment:
      - USE_OPENSOURCE_ONLY=true
      - OLLAMA_HOST=http://ollama:11434
      - LOCALAI_HOST=http://localai:8080
      - QDRANT_HOST=qdrant
    depends_on:
      - postgres
      - redis
      - ollama
      - localai
      - qdrant

  # Databases
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: lexos_genesis
      POSTGRES_USER: lexos_user
      POSTGRES_PASSWORD: ${DATABASE_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data

  # AI Services
  ollama:
    image: ollama/ollama:latest
    volumes:
      - ollama_models:/root/.ollama
    ports:
      - "11434:11434"

  localai:
    image: localai/localai:latest
    volumes:
      - ./models:/models
    ports:
      - "8080:8080"

  # Vector Database
  qdrant:
    image: qdrant/qdrant:latest
    volumes:
      - qdrant_data:/qdrant/storage
    ports:
      - "6333:6333"

  # Monitoring
  prometheus:
    image: prom/prometheus:latest
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  redis_data:
  ollama_models:
  qdrant_data:
  prometheus_data:
  grafana_data:
```

## Model Configuration

Update `/home/user/lexos-genesis/backend/config/models.json`:

```json
{
  "providers": {
    "ollama": {
      "enabled": true,
      "host": "http://localhost:11434",
      "models": [
        "llama3:latest",
        "mistral:latest",
        "codellama:latest",
        "mixtral:latest"
      ]
    },
    "localai": {
      "enabled": true,
      "host": "http://localhost:8080",
      "models": [
        "ggml-gpt4all-j",
        "ggml-whisper"
      ]
    }
  },
  "defaultProvider": "ollama",
  "defaultModel": "llama3:latest"
}
```

## Deployment

```bash
# 1. Clone and setup
cd /home/user/lexos-genesis

# 2. Install open source services
./scripts/install-opensource-stack.sh

# 3. Configure environment
cp .env.opensource .env.production
# Edit .env.production with your values

# 4. Start services
docker-compose -f docker-compose.opensource.yml up -d

# 5. Initialize models
ollama pull llama3
ollama pull codellama
```

## Advantages of Open Source Stack

1. **No API Costs**: All models run locally
2. **Data Privacy**: Your data never leaves your infrastructure
3. **Full Control**: Customize models and parameters
4. **Offline Capable**: Works without internet
5. **Unlimited Usage**: No rate limits or quotas

## Performance Considerations

- **GPU Recommended**: For optimal LLM performance
- **RAM**: Minimum 16GB, recommended 32GB+
- **Storage**: 50GB+ for models
- **CPU**: Modern multi-core processor

## Support

The open source stack is fully supported by the community:
- Ollama: https://github.com/ollama/ollama
- LocalAI: https://github.com/mudler/LocalAI
- Qdrant: https://github.com/qdrant/qdrant
- Whisper.cpp: https://github.com/ggerganov/whisper.cpp