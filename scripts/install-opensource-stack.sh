#!/bin/bash

echo "🚀 Installing LexOS Open Source Stack"
echo "===================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# 1. Install Ollama
echo -e "\n${GREEN}Installing Ollama...${NC}"
if ! command_exists ollama; then
    curl -fsSL https://ollama.ai/install.sh | sh
    
    # Start Ollama service
    sudo systemctl enable ollama
    sudo systemctl start ollama
    
    # Pull default models
    echo "Pulling AI models..."
    ollama pull llama3
    ollama pull mistral
    ollama pull codellama
else
    echo "Ollama already installed"
fi

# 2. Install Docker if not present
echo -e "\n${GREEN}Checking Docker...${NC}"
if ! command_exists docker; then
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Please log out and back in for group changes."
fi

# 3. Install PostgreSQL
echo -e "\n${GREEN}Installing PostgreSQL...${NC}"
if ! command_exists psql; then
    sudo apt-get update
    sudo apt-get install -y postgresql postgresql-contrib
    
    # Create database and user
    sudo -u postgres psql << EOF
CREATE DATABASE lexos_genesis;
CREATE USER lexos_user WITH ENCRYPTED PASSWORD 'changeme123';
GRANT ALL PRIVILEGES ON DATABASE lexos_genesis TO lexos_user;
EOF
else
    echo "PostgreSQL already installed"
fi

# 4. Install Redis
echo -e "\n${GREEN}Installing Redis...${NC}"
if ! command_exists redis-server; then
    sudo apt-get install -y redis-server
    
    # Configure Redis password
    sudo sed -i 's/# requirepass foobared/requirepass changeme456/g' /etc/redis/redis.conf
    sudo systemctl restart redis-server
else
    echo "Redis already installed"
fi

# 5. Setup Qdrant Vector Database
echo -e "\n${GREEN}Setting up Qdrant...${NC}"
mkdir -p ~/qdrant_storage
docker run -d \
    --name qdrant \
    --restart unless-stopped \
    -p 6333:6333 \
    -v ~/qdrant_storage:/qdrant/storage \
    qdrant/qdrant

# 6. Setup LocalAI
echo -e "\n${GREEN}Setting up LocalAI...${NC}"
mkdir -p ~/localai-models
docker run -d \
    --name localai \
    --restart unless-stopped \
    -p 8080:8080 \
    -v ~/localai-models:/models \
    -e THREADS=4 \
    localai/localai:latest

# 7. Create directories
echo -e "\n${GREEN}Creating directories...${NC}"
mkdir -p logs data backups uploads

# 8. Set permissions
chmod +x scripts/*.sh

echo -e "\n${GREEN}✅ Open Source Stack Installation Complete!${NC}"
echo ""
echo "Services running:"
echo "- Ollama: http://localhost:11434"
echo "- LocalAI: http://localhost:8080"
echo "- Qdrant: http://localhost:6333"
echo "- PostgreSQL: localhost:5432"
echo "- Redis: localhost:6379"
echo ""
echo "Next steps:"
echo "1. Copy .env.opensource to .env.production"
echo "2. Update passwords in .env.production"
echo "3. Run: npm install && npm run build"
echo "4. Start the application"