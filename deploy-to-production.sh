#!/bin/bash

# LexOS Genesis Production Deployment Script
# Deploys the complete system with all enhanced agents

set -e

echo "🚀 LexOS Genesis Production Deployment"
echo "====================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DEPLOY_DIR="/home/user/lexos-genesis"
PM2_NAME_BACKEND="lexos-backend-prod"
PM2_NAME_FRONTEND="lexos-frontend-prod"
BACKEND_PORT=3001
FRONTEND_PORT=8080

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    error "Must run from lexos-genesis directory"
fi

# Step 1: Stop existing services
log "Stopping existing services..."
pm2 delete $PM2_NAME_BACKEND 2>/dev/null || true
pm2 delete $PM2_NAME_FRONTEND 2>/dev/null || true
pm2 delete lexos-backend 2>/dev/null || true
pm2 delete lexos-frontend 2>/dev/null || true

# Step 2: Build frontend
log "Building frontend for production..."
if [ ! -d "dist" ]; then
    npm run build || error "Frontend build failed"
fi
success "Frontend built successfully"

# Step 3: Install backend dependencies
log "Installing backend dependencies..."
cd backend
npm install --production
cd ..
success "Backend dependencies installed"

# Step 4: Copy production environment
log "Setting up production environment..."
cp .env.production backend/.env
cp .env.production .env

# Step 5: Create PM2 ecosystem file
log "Creating PM2 ecosystem configuration..."
cat > ecosystem.config.cjs << EOF
module.exports = {
  apps: [
    {
      name: '${PM2_NAME_BACKEND}',
      script: './backend/src/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: ${BACKEND_PORT}
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: ${BACKEND_PORT}
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend-combined.log',
      time: true,
      max_memory_restart: '2G'
    },
    {
      name: '${PM2_NAME_FRONTEND}',
      script: './node_modules/.bin/serve',
      args: '-s dist -l ${FRONTEND_PORT}',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_file: './logs/frontend-combined.log',
      time: true
    }
  ]
}
EOF

# Step 6: Install serve locally if not installed
if [ ! -f "node_modules/.bin/serve" ]; then
    log "Installing serve locally..."
    npm install serve --save-dev
fi

# Step 7: Create logs directory
mkdir -p logs

# Step 8: Start services with PM2
log "Starting production services..."
pm2 start ecosystem.config.cjs --env production

# Step 9: Save PM2 configuration
pm2 save

# Step 10: Configure PM2 startup
log "Configuring PM2 startup..."
pm2 startup systemd -u $USER --hp $HOME || true

# Step 11: Setup nginx configuration
log "Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/lexos-prod > /dev/null << EOF
server {
    listen 80;
    server_name _;

    # Frontend
    location / {
        proxy_pass http://localhost:${FRONTEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # Health check
    location /health {
        proxy_pass http://localhost:${BACKEND_PORT};
        proxy_http_version 1.1;
    }

    client_max_body_size 100M;
}
EOF

# Step 12: Enable nginx site
log "Enabling nginx configuration..."
sudo ln -sf /etc/nginx/sites-available/lexos-prod /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Step 13: Check services
sleep 5
log "Checking service status..."
pm2 status

# Step 14: Test endpoints
log "Testing endpoints..."
sleep 3

# Test backend health
if curl -s http://localhost:${BACKEND_PORT}/health | grep -q "operational"; then
    success "Backend is healthy"
else
    error "Backend health check failed"
fi

# Test enhanced agents
if curl -s http://localhost:${BACKEND_PORT}/api/enhanced-agents/status | grep -q "success"; then
    success "Enhanced agents are ready"
else
    error "Enhanced agents check failed"
fi

# Step 15: Display summary
echo ""
echo "=========================================="
echo -e "${GREEN}🎉 LexOS Genesis Deployed Successfully!${NC}"
echo "=========================================="
echo ""
echo "📡 Access Points:"
echo "  - Web UI: http://$(hostname -I | awk '{print $1}')"
echo "  - API: http://$(hostname -I | awk '{print $1}')/api"
echo "  - Health: http://$(hostname -I | awk '{print $1}')/health"
echo ""
echo "🤖 Enhanced Agents Available:"
echo "  - Orchestrator Agent (Task Routing)"
echo "  - Reasoning Agent (Deep Analysis)"
echo "  - Code Agent (Code Generation)"
echo "  - Chat Agent (Conversations)"
echo "  - Creative Writing Agent (Stories/Poetry)"
echo "  - Web Scraper Agent (Data Extraction)"
echo "  - And 10 more specialized agents!"
echo ""
echo "📊 Monitoring:"
echo "  - View logs: pm2 logs"
echo "  - View status: pm2 status"
echo "  - View metrics: pm2 monit"
echo ""
echo "🔐 Security:"
echo "  - Remember to update passwords in .env.production"
echo "  - Consider enabling HTTPS with Let's Encrypt"
echo ""
echo "✅ Deployment complete!"