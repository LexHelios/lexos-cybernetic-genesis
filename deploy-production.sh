#!/bin/bash

echo "🚀 LexOS Genesis Production Deployment"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "❌ Do not run this script as root"
   exit 1
fi

# Function to check command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    echo "❌ npm is not installed"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Build frontend
echo "🔨 Building frontend for production..."
cd frontend || cd .
npm install
npm run build

if [ ! -d "dist" ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend build completed"
echo ""

# Prepare backend
echo "🔧 Preparing backend..."
cd ../backend || cd backend

# Install dependencies
npm install --production

# Check production env file
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found!"
    echo "Creating from template..."
    cp .env.production.example .env.production 2>/dev/null || cp .env .env.production
    echo ""
    echo "🔐 IMPORTANT: Edit .env.production and set secure values for:"
    echo "   - JWT_SECRET"
    echo "   - ADMIN_PASSWORD"
    echo "   - OPERATOR_PASSWORD"
    echo "   - FRONTEND_URL"
    echo ""
    read -p "Press Enter after updating .env.production..."
fi

# Create necessary directories
mkdir -p logs data backups

# Set permissions
chmod 755 start-server.sh
chmod 600 .env.production

echo "✅ Backend prepared"
echo ""

# Create systemd service (optional)
echo "📝 Creating systemd service file..."
cat > lexos-backend.service << EOL
[Unit]
Description=LexOS Genesis Backend
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node src/index.js
Restart=on-failure
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOL

echo "✅ Service file created: lexos-backend.service"
echo ""

# Create nginx config
echo "📝 Creating nginx configuration..."
cat > lexos-nginx.conf << EOL
server {
    listen 80;
    server_name your-domain.com;
    
    # Frontend
    location / {
        root $(pwd)/../dist;
        try_files \$uri \$uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
    
    # Health check
    location /health {
        proxy_pass http://localhost:9000/health;
    }
}
EOL

echo "✅ Nginx config created: lexos-nginx.conf"
echo ""

# Summary
echo "🎉 Production deployment prepared!"
echo ""
echo "Next steps:"
echo "1. Update .env.production with secure values"
echo "2. Copy lexos-backend.service to /etc/systemd/system/"
echo "3. Run: sudo systemctl enable lexos-backend"
echo "4. Run: sudo systemctl start lexos-backend"
echo "5. Copy lexos-nginx.conf to /etc/nginx/sites-available/"
echo "6. Enable the site and reload nginx"
echo ""
echo "To start manually:"
echo "  cd backend && NODE_ENV=production npm start"
echo ""
echo "🔒 Security checklist:"
echo "  □ Change all default passwords"
echo "  □ Set secure JWT_SECRET"
echo "  □ Configure firewall"
echo "  □ Enable HTTPS with SSL certificate"
echo "  □ Set up regular backups"
echo "  □ Monitor logs and system health"