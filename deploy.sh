#!/bin/bash

# LexOS Genesis Production Deployment Script
# Nexus v2.0.0

set -e

echo "🚀 LexOS Genesis Production Deployment"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root${NC}"
   exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2)
REQUIRED_VERSION="18.0.0"

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Pre-deployment Checks${NC}"
echo "Node.js version: $NODE_VERSION"

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo -e "${YELLOW}⚠️  Creating .env from template${NC}"
    cp backend/.env.example backend/.env
    echo -e "${RED}❌ Please configure backend/.env before continuing${NC}"
    exit 1
fi

# Check for critical environment variables
echo -e "${BLUE}🔐 Checking security configuration${NC}"
if grep -q "NEXUS_ADMIN_CHANGE_IMMEDIATELY" backend/.env; then
    echo -e "${RED}❌ Default admin password detected! Please change ADMIN_PASSWORD in backend/.env${NC}"
    exit 1
fi

if grep -q "NEXUS_GENESIS_SECURE_KEY_CHANGE_IMMEDIATELY" backend/.env; then
    echo -e "${RED}❌ Default JWT secret detected! Please change JWT_SECRET in backend/.env${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Security configuration looks good${NC}"

# Install dependencies
echo -e "${BLUE}📦 Installing dependencies${NC}"
npm ci --production

echo -e "${BLUE}📦 Installing backend dependencies${NC}"
cd backend
npm ci --production
cd ..

# Build frontend
echo -e "${BLUE}🏗️  Building frontend for production${NC}"
npm run build:prod

# Initialize database
echo -e "${BLUE}🗄️  Initializing database${NC}"
cd backend
npm run init-db
cd ..

# Create systemd service files
echo -e "${BLUE}⚙️  Creating systemd service files${NC}"

# Backend service
sudo tee /etc/systemd/system/lexos-backend.service > /dev/null <<EOF
[Unit]
Description=LexOS Genesis Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)/backend
Environment=NODE_ENV=production
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Frontend service (using serve)
sudo tee /etc/systemd/system/lexos-frontend.service > /dev/null <<EOF
[Unit]
Description=LexOS Genesis Frontend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npx serve -s dist -l 3000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Install serve globally if not present
if ! command -v serve &> /dev/null; then
    echo -e "${BLUE}📦 Installing serve globally${NC}"
    sudo npm install -g serve
fi

# Reload systemd and enable services
sudo systemctl daemon-reload
sudo systemctl enable lexos-backend
sudo systemctl enable lexos-frontend

# Start services
echo -e "${BLUE}🚀 Starting services${NC}"
sudo systemctl start lexos-backend
sudo systemctl start lexos-frontend

# Check service status
sleep 3
if systemctl is-active --quiet lexos-backend; then
    echo -e "${GREEN}✅ Backend service is running${NC}"
else
    echo -e "${RED}❌ Backend service failed to start${NC}"
    sudo systemctl status lexos-backend
    exit 1
fi

if systemctl is-active --quiet lexos-frontend; then
    echo -e "${GREEN}✅ Frontend service is running${NC}"
else
    echo -e "${RED}❌ Frontend service failed to start${NC}"
    sudo systemctl status lexos-frontend
    exit 1
fi

# Create nginx configuration
echo -e "${BLUE}🌐 Creating nginx configuration${NC}"
sudo tee /etc/nginx/sites-available/lexos-genesis > /dev/null <<EOF
server {
    listen 80;
    server_name localhost;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable nginx site
if [ -f /etc/nginx/sites-available/lexos-genesis ]; then
    sudo ln -sf /etc/nginx/sites-available/lexos-genesis /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx
    echo -e "${GREEN}✅ Nginx configuration updated${NC}"
fi

echo ""
echo -e "${GREEN}🎉 LexOS Genesis deployed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo "Nginx:    http://localhost"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo "sudo systemctl status lexos-backend"
echo "sudo systemctl status lexos-frontend"
echo "sudo systemctl restart lexos-backend"
echo "sudo systemctl restart lexos-frontend"
echo ""
echo -e "${YELLOW}⚠️  Remember to:${NC}"
echo "1. Configure firewall rules"
echo "2. Set up SSL certificates"
echo "3. Configure monitoring"
echo "4. Set up backups"
echo ""
echo -e "${GREEN}🚀 LexOS Genesis is now live!${NC}"