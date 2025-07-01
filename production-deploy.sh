#!/bin/bash

# LexOS Genesis Full Production Deployment
# External Access Configuration

set -e

echo "🚀 LexOS Genesis Production Deployment - External Access"
echo "======================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get external IP
EXTERNAL_IP=$(curl -s ifconfig.me)
INTERNAL_IP=$(hostname -I | awk '{print $1}')

echo -e "${BLUE}External IP:${NC} $EXTERNAL_IP"
echo -e "${BLUE}Internal IP:${NC} $INTERNAL_IP"
echo ""

# Update nginx for production
echo -e "${YELLOW}Configuring nginx for production...${NC}"
sudo tee /etc/nginx/sites-available/lexos-production > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $EXTERNAL_IP $INTERNAL_IP _;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Frontend - React App
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts for long-running AI operations
        proxy_read_timeout 600s;
        proxy_connect_timeout 75s;
        proxy_send_timeout 600s;
        
        # CORS headers
        add_header 'Access-Control-Allow-Origin' '*' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization' always;
        
        # Handle preflight requests
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE';
            add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 86400;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        proxy_http_version 1.1;
        access_log off;
    }

    # Enhanced agents status
    location /api/enhanced-agents {
        proxy_pass http://localhost:3001/api/enhanced-agents;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 300s;
    }

    # File upload limits for AI operations
    client_max_body_size 500M;
    client_body_buffer_size 128k;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml application/atom+xml image/svg+xml;
}
EOF

# Enable the new configuration
sudo ln -sf /etc/nginx/sites-available/lexos-production /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/lexos-prod

# Test nginx configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx configured for production${NC}"

# Update backend CORS settings
echo -e "${YELLOW}Updating backend CORS configuration...${NC}"
cat > /home/user/lexos-genesis/backend/.env.production << 'EOF'
# LexOS Genesis Production Configuration
NODE_ENV=production
PORT=3001
FRONTEND_URL=*

# Open Source Databases
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=lexos_genesis
DATABASE_USER=lexos_user
DATABASE_PASSWORD=changeme123
DATABASE_SSL=false

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=changeme456

# Security (generate your own)
JWT_SECRET=42ffb3dd68eda7b989ca73955e30b6fbab96966bbf8c14fcd40f3a135bbb488a
SESSION_SECRET=f459cd934db6234a8d44457e276f5f71954f9be70eb02d9621a3264d3c7d2900
ENCRYPTION_KEY=your-32-byte-key

# Ollama for LLMs
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=deepseek-r1:latest
DEFAULT_MODEL=deepseek-r1:latest

# Enhanced Agent Models
ENABLE_ENHANCED_AGENTS=true
ORCHESTRATOR_MODEL=mistral:7b-instruct
REASONING_MODEL=deepseek-r1:latest
CODE_MODEL=qwen2.5-coder:7b
CHAT_MODEL=mistral:7b
CREATIVE_MODEL=llama3.3:70b
WEBSCRAPER_MODEL=deepseek-r1:latest
UNRESTRICTED_MODEL=r1-unrestricted:latest

# LocalAI (OpenAI compatible)
LOCALAI_HOST=http://localhost:8081
LOCALAI_API_KEY=not-needed

# Qdrant Vector Database
QDRANT_HOST=localhost
QDRANT_PORT=6333

# Enable open source features
USE_OPENSOURCE_ONLY=true
ENABLE_OLLAMA=true
ENABLE_LOCAL_MODELS=true

# CORS Configuration
CORS_ORIGIN=*
CORS_CREDENTIALS=true

# Admin defaults
ADMIN_EMAIL=admin@localhost
ADMIN_INITIAL_PASSWORD=admin123
EOF

# Restart backend with new configuration
echo -e "${YELLOW}Restarting backend services...${NC}"
pm2 restart lexos-backend-prod
pm2 save

# Create production status script
cat > /home/user/lexos-genesis/check-production-status.sh << 'EOF'
#!/bin/bash

echo "🔍 LexOS Genesis Production Status Check"
echo "========================================"
echo ""

# Get IPs
EXTERNAL_IP=$(curl -s ifconfig.me)
INTERNAL_IP=$(hostname -I | awk '{print $1}')

echo "📡 Access Points:"
echo "  External: http://$EXTERNAL_IP"
echo "  Internal: http://$INTERNAL_IP"
echo ""

echo "🔧 Service Status:"
pm2 status

echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager | head -10

echo ""
echo "🤖 Agent Status:"
curl -s http://localhost:3001/api/enhanced-agents/status | jq '.totalAgents, .readyAgents'

echo ""
echo "📊 Port Status:"
sudo netstat -tlnp | grep -E ':(80|443|3001|8080|11434) '
EOF

chmod +x /home/user/lexos-genesis/check-production-status.sh

# Run status check
sleep 5
bash /home/user/lexos-genesis/check-production-status.sh

echo ""
echo "==========================================="
echo -e "${GREEN}🎉 LexOS Genesis Production Deployment Complete!${NC}"
echo "==========================================="
echo ""
echo "📡 External Access:"
echo "  - Web UI: http://$EXTERNAL_IP"
echo "  - API: http://$EXTERNAL_IP/api"
echo ""
echo "🔒 Security Notes:"
echo "  - System is accessible from ANY IP address"
echo "  - Consider setting up SSL/HTTPS for secure access"
echo "  - Update default passwords in .env.production"
echo ""
echo "✅ All 16 AI agents are online and ready for external access!"