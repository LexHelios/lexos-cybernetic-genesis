#!/bin/bash

# LexOS Genesis Comprehensive Deployment Script
# Version: 3.0.0
# Production-ready deployment with full system checks and monitoring

set -euo pipefail

# Script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEXOS_HOME="${SCRIPT_DIR}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="${LEXOS_HOME}/deployment_${TIMESTAMP}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Service ports
BACKEND_PORT=3001
AUTH_PORT=9000
MONITORING_PORT=4000
FRONTEND_PORT=3000

# Required software versions
REQUIRED_NODE_VERSION="18.0.0"
REQUIRED_NPM_VERSION="8.0.0"
REQUIRED_POSTGRES_VERSION="12.0"
REQUIRED_REDIS_VERSION="6.0"

# Deployment status tracking
DEPLOYMENT_STATUS="INITIALIZING"
declare -A SERVICE_STATUS

# Logging functions
log() {
    echo -e "${2:-$BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    log "✅ $1" "$GREEN"
}

log_error() {
    log "❌ $1" "$RED"
}

log_warning() {
    log "⚠️  $1" "$YELLOW"
}

log_info() {
    log "ℹ️  $1" "$CYAN"
}

# Error handler
error_exit() {
    log_error "$1"
    DEPLOYMENT_STATUS="FAILED"
    generate_status_report
    exit 1
}

# Trap errors
trap 'error_exit "Deployment failed at line $LINENO"' ERR

# Header
clear
echo -e "${MAGENTA}"
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║            LexOS Genesis Deployment System v3.0               ║"
echo "║                  Production Deployment                        ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

log_info "Starting deployment process..."
log_info "Log file: $LOG_FILE"

# Check if running as root
check_user() {
    log_info "Checking user permissions..."
    if [[ $EUID -eq 0 ]]; then
        error_exit "This script should not be run as root for security reasons"
    fi
    log_success "User check passed"
}

# System requirements check
check_system_requirements() {
    log_info "Checking system requirements..."
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        error_exit "This script requires Linux. Detected: $OSTYPE"
    fi
    
    # Check CPU cores
    CPU_CORES=$(nproc)
    if [[ $CPU_CORES -lt 4 ]]; then
        log_warning "System has only $CPU_CORES CPU cores. Recommended: 4 or more"
    else
        log_success "CPU cores: $CPU_CORES"
    fi
    
    # Check RAM
    TOTAL_RAM=$(free -g | awk '/^Mem:/{print $2}')
    if [[ $TOTAL_RAM -lt 8 ]]; then
        log_warning "System has only ${TOTAL_RAM}GB RAM. Recommended: 8GB or more"
    else
        log_success "RAM: ${TOTAL_RAM}GB"
    fi
    
    # Check disk space
    AVAILABLE_SPACE=$(df -BG "$LEXOS_HOME" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [[ $AVAILABLE_SPACE -lt 10 ]]; then
        error_exit "Insufficient disk space: ${AVAILABLE_SPACE}GB available. Required: 10GB minimum"
    else
        log_success "Available disk space: ${AVAILABLE_SPACE}GB"
    fi
}

# Version comparison function
version_compare() {
    if [[ $1 == $2 ]]; then
        return 0
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    for ((i=0; i<${#ver1[@]}; i++)); do
        if [[ -z ${ver2[i]} ]]; then
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            return 1
        fi
        if ((10#${ver1[i]} < 10#${ver2[i]})); then
            return 2
        fi
    done
    return 0
}

# Check and install dependencies
check_dependencies() {
    log_info "Checking dependencies..."
    
    # Node.js
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version | cut -d'v' -f2)
        version_compare "$REQUIRED_NODE_VERSION" "$NODE_VERSION"
        if [[ $? -eq 1 ]]; then
            error_exit "Node.js version $NODE_VERSION is too old. Required: $REQUIRED_NODE_VERSION or newer"
        fi
        log_success "Node.js version: $NODE_VERSION"
    else
        log_error "Node.js is not installed"
        log_info "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # npm
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        log_success "npm version: $NPM_VERSION"
    else
        error_exit "npm is not installed"
    fi
    
    # PostgreSQL
    if command -v psql &> /dev/null; then
        POSTGRES_VERSION=$(psql --version | awk '{print $3}' | sed 's/\..*$//')
        log_success "PostgreSQL version: $POSTGRES_VERSION"
        SERVICE_STATUS["postgresql"]="installed"
    else
        log_warning "PostgreSQL is not installed"
        read -p "Install PostgreSQL? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo apt-get update
            sudo apt-get install -y postgresql postgresql-contrib
            SERVICE_STATUS["postgresql"]="installed"
        else
            log_warning "PostgreSQL installation skipped - SQLite will be used"
            SERVICE_STATUS["postgresql"]="skipped"
        fi
    fi
    
    # Redis
    if command -v redis-server &> /dev/null; then
        REDIS_VERSION=$(redis-server --version | awk '{print $3}' | cut -d'=' -f2)
        log_success "Redis version: $REDIS_VERSION"
        SERVICE_STATUS["redis"]="installed"
    else
        log_warning "Redis is not installed"
        read -p "Install Redis? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo apt-get update
            sudo apt-get install -y redis-server
            SERVICE_STATUS["redis"]="installed"
        else
            log_warning "Redis installation skipped"
            SERVICE_STATUS["redis"]="skipped"
        fi
    fi
    
    # Nginx
    if command -v nginx &> /dev/null; then
        NGINX_VERSION=$(nginx -v 2>&1 | awk '{print $3}' | cut -d'/' -f2)
        log_success "Nginx version: $NGINX_VERSION"
        SERVICE_STATUS["nginx"]="installed"
    else
        log_warning "Nginx is not installed"
        read -p "Install Nginx? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            sudo apt-get update
            sudo apt-get install -y nginx
            SERVICE_STATUS["nginx"]="installed"
        fi
    fi
    
    # Other utilities
    local utils=("git" "curl" "wget" "jq" "htop" "netstat")
    for util in "${utils[@]}"; do
        if ! command -v "$util" &> /dev/null; then
            log_warning "$util is not installed"
            sudo apt-get install -y "$util"
        fi
    done
    
    # Python (for some scripts)
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version | awk '{print $2}')
        log_success "Python version: $PYTHON_VERSION"
    fi
}

# Setup environment variables
setup_environment() {
    log_info "Setting up environment variables..."
    
    # Create data directories
    mkdir -p "$LEXOS_HOME/data"
    mkdir -p "$LEXOS_HOME/logs"
    mkdir -p "$LEXOS_HOME/backups"
    mkdir -p "$LEXOS_HOME/ssl"
    
    # Backend .env
    if [[ ! -f "$LEXOS_HOME/backend/.env" ]]; then
        log_info "Creating backend .env file..."
        cp "$LEXOS_HOME/backend/.env.example" "$LEXOS_HOME/backend/.env"
        
        # Generate secure secrets
        JWT_SECRET=$(openssl rand -base64 32)
        ADMIN_PASSWORD=$(openssl rand -base64 16)
        OPERATOR_PASSWORD=$(openssl rand -base64 16)
        
        # Update .env with secure values
        sed -i "s/NEXUS_GENESIS_SECURE_KEY_CHANGE_IMMEDIATELY_IN_PRODUCTION_ENV/$JWT_SECRET/g" "$LEXOS_HOME/backend/.env"
        sed -i "s/NEXUS_ADMIN_CHANGE_IMMEDIATELY/$ADMIN_PASSWORD/g" "$LEXOS_HOME/backend/.env"
        sed -i "s/NEXUS_OPERATOR_CHANGE_IMMEDIATELY/$OPERATOR_PASSWORD/g" "$LEXOS_HOME/backend/.env"
        
        log_success "Backend environment configured"
        log_warning "IMPORTANT: Save these credentials securely!"
        echo -e "${YELLOW}Admin Password: $ADMIN_PASSWORD${NC}"
        echo -e "${YELLOW}Operator Password: $OPERATOR_PASSWORD${NC}"
        
        # Save credentials to secure file
        echo "Generated on: $(date)" > "$LEXOS_HOME/credentials_${TIMESTAMP}.txt"
        echo "Admin Password: $ADMIN_PASSWORD" >> "$LEXOS_HOME/credentials_${TIMESTAMP}.txt"
        echo "Operator Password: $OPERATOR_PASSWORD" >> "$LEXOS_HOME/credentials_${TIMESTAMP}.txt"
        chmod 600 "$LEXOS_HOME/credentials_${TIMESTAMP}.txt"
    else
        log_success "Backend .env already exists"
    fi
    
    # Monitoring agent .env
    if [[ ! -f "$LEXOS_HOME/monitoring-agent/.env" ]]; then
        log_info "Creating monitoring agent .env file..."
        cat > "$LEXOS_HOME/monitoring-agent/.env" << EOF
NODE_ENV=production
PORT=$MONITORING_PORT
BACKEND_URL=http://localhost:$BACKEND_PORT
AUTH_URL=http://localhost:$AUTH_PORT
LOG_LEVEL=info
ENABLE_ALERTS=true
ALERT_EMAIL=admin@lexcommand.ai
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EOF
        log_success "Monitoring agent environment configured"
    fi
}

# Install NPM dependencies
install_dependencies() {
    log_info "Installing NPM dependencies..."
    
    # Frontend dependencies
    log_info "Installing frontend dependencies..."
    cd "$LEXOS_HOME"
    npm ci --production || npm install --production
    log_success "Frontend dependencies installed"
    
    # Backend dependencies
    log_info "Installing backend dependencies..."
    cd "$LEXOS_HOME/backend"
    npm ci --production || npm install --production
    log_success "Backend dependencies installed"
    
    # Monitoring agent dependencies
    log_info "Installing monitoring agent dependencies..."
    cd "$LEXOS_HOME/monitoring-agent"
    npm ci --production || npm install --production
    log_success "Monitoring agent dependencies installed"
    
    cd "$LEXOS_HOME"
}

# Initialize database
initialize_database() {
    log_info "Initializing database..."
    
    if [[ "${SERVICE_STATUS[postgresql]}" == "installed" ]]; then
        # PostgreSQL setup
        log_info "Setting up PostgreSQL database..."
        sudo -u postgres psql << EOF
CREATE DATABASE lexos_genesis;
CREATE USER lexos_user WITH ENCRYPTED PASSWORD 'lexos_secure_password';
GRANT ALL PRIVILEGES ON DATABASE lexos_genesis TO lexos_user;
EOF
        log_success "PostgreSQL database created"
    fi
    
    # SQLite initialization (always do this as fallback)
    cd "$LEXOS_HOME/backend"
    node src/scripts/initDatabase.js
    log_success "SQLite database initialized"
    
    cd "$LEXOS_HOME"
}

# Build frontend
build_frontend() {
    log_info "Building frontend for production..."
    cd "$LEXOS_HOME"
    
    # Check if build script exists
    if npm run build 2>/dev/null; then
        log_success "Frontend built successfully"
    else
        log_error "Frontend build failed"
        return 1
    fi
}

# Start services
start_services() {
    log_info "Starting services..."
    
    # Start PostgreSQL if installed
    if [[ "${SERVICE_STATUS[postgresql]}" == "installed" ]]; then
        if sudo systemctl is-active --quiet postgresql; then
            log_success "PostgreSQL is already running"
        else
            sudo systemctl start postgresql
            sudo systemctl enable postgresql
            log_success "PostgreSQL started"
        fi
    fi
    
    # Start Redis if installed
    if [[ "${SERVICE_STATUS[redis]}" == "installed" ]]; then
        if sudo systemctl is-active --quiet redis-server; then
            log_success "Redis is already running"
        else
            sudo systemctl start redis-server
            sudo systemctl enable redis-server
            log_success "Redis started"
        fi
    fi
    
    # Create systemd services
    create_systemd_services
    
    # Start LexOS services
    sudo systemctl daemon-reload
    
    # Backend service
    sudo systemctl start lexos-backend
    sudo systemctl enable lexos-backend
    SERVICE_STATUS["backend"]="running"
    log_success "Backend service started"
    
    # Auth service (using same backend for now)
    SERVICE_STATUS["auth"]="running"
    
    # Monitoring agent
    sudo systemctl start lexos-monitoring
    sudo systemctl enable lexos-monitoring
    SERVICE_STATUS["monitoring"]="running"
    log_success "Monitoring service started"
    
    # Frontend service
    sudo systemctl start lexos-frontend
    sudo systemctl enable lexos-frontend
    SERVICE_STATUS["frontend"]="running"
    log_success "Frontend service started"
}

# Create systemd services
create_systemd_services() {
    log_info "Creating systemd service files..."
    
    # Backend service
    sudo tee /etc/systemd/system/lexos-backend.service > /dev/null << EOF
[Unit]
Description=LexOS Genesis Backend Service
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$LEXOS_HOME/backend
Environment="NODE_ENV=production"
Environment="PATH=/usr/bin:/usr/local/bin"
ExecStartPre=/usr/bin/npm run init-db
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=append:$LEXOS_HOME/logs/backend.log
StandardError=append:$LEXOS_HOME/logs/backend-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LEXOS_HOME

[Install]
WantedBy=multi-user.target
EOF

    # Monitoring agent service
    sudo tee /etc/systemd/system/lexos-monitoring.service > /dev/null << EOF
[Unit]
Description=LexOS Genesis Monitoring Agent
After=network.target lexos-backend.service
Wants=lexos-backend.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$LEXOS_HOME/monitoring-agent
Environment="NODE_ENV=production"
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
StandardOutput=append:$LEXOS_HOME/logs/monitoring.log
StandardError=append:$LEXOS_HOME/logs/monitoring-error.log

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$LEXOS_HOME

[Install]
WantedBy=multi-user.target
EOF

    # Frontend service
    sudo tee /etc/systemd/system/lexos-frontend.service > /dev/null << EOF
[Unit]
Description=LexOS Genesis Frontend Service
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$LEXOS_HOME
ExecStart=/usr/bin/npx serve -s dist -l $FRONTEND_PORT
Restart=always
RestartSec=10
StandardOutput=append:$LEXOS_HOME/logs/frontend.log
StandardError=append:$LEXOS_HOME/logs/frontend-error.log

[Install]
WantedBy=multi-user.target
EOF

    log_success "Systemd services created"
}

# Setup Nginx
setup_nginx() {
    log_info "Setting up Nginx configuration..."
    
    if [[ "${SERVICE_STATUS[nginx]}" != "installed" ]]; then
        log_warning "Nginx not installed, skipping configuration"
        return
    fi
    
    # Create Nginx config
    sudo tee /etc/nginx/sites-available/lexcommand.ai > /dev/null << 'EOF'
# Rate limiting
limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;

# Upstream definitions
upstream lexos_backend {
    server localhost:3001;
    keepalive 32;
}

upstream lexos_monitoring {
    server localhost:4000;
    keepalive 16;
}

upstream lexos_frontend {
    server localhost:3000;
    keepalive 16;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    listen [::]:80;
    server_name lexcommand.ai www.lexcommand.ai;
    return 301 https://$server_name$request_uri;
}

# Main HTTPS server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name lexcommand.ai www.lexcommand.ai;

    # SSL configuration (update paths as needed)
    ssl_certificate /etc/letsencrypt/live/lexcommand.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/lexcommand.ai/privkey.pem;
    
    # SSL security settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;
    
    # Logging
    access_log /var/log/nginx/lexcommand.access.log;
    error_log /var/log/nginx/lexcommand.error.log;
    
    # Rate limiting
    limit_req zone=general burst=20 nodelay;
    
    # Frontend
    location / {
        proxy_pass http://lexos_frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Backend API
    location /api {
        limit_req zone=api burst=50 nodelay;
        
        proxy_pass http://lexos_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts for long-running operations
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
    
    # WebSocket endpoints
    location ~ ^/(ws|socket\.io) {
        proxy_pass http://lexos_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket timeouts
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
    
    # Monitoring dashboard
    location /monitoring {
        proxy_pass http://lexos_monitoring;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "OK\n";
        add_header Content-Type text/plain;
    }
    
    # Static file caching
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|pdf|doc|docx)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Deny access to hidden files
    location ~ /\. {
        deny all;
        return 404;
    }
}
EOF

    # Enable the site
    sudo ln -sf /etc/nginx/sites-available/lexcommand.ai /etc/nginx/sites-enabled/
    
    # Test configuration
    if sudo nginx -t; then
        sudo systemctl reload nginx
        log_success "Nginx configured successfully"
    else
        log_error "Nginx configuration test failed"
    fi
}

# Setup Cloudflare tunnel
setup_cloudflare_tunnel() {
    log_info "Setting up Cloudflare tunnel..."
    
    # Check if cloudflared exists
    if [[ ! -f "$LEXOS_HOME/cloudflared" ]]; then
        log_warning "cloudflared binary not found"
        read -p "Download and install cloudflared? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
            mv cloudflared-linux-amd64 "$LEXOS_HOME/cloudflared"
            chmod +x "$LEXOS_HOME/cloudflared"
            log_success "cloudflared downloaded"
        else
            log_warning "Cloudflare tunnel setup skipped"
            return
        fi
    fi
    
    # Create cloudflared service
    sudo tee /etc/systemd/system/cloudflared.service > /dev/null << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=$LEXOS_HOME/cloudflared tunnel run
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    log_info "Cloudflare tunnel service created"
    log_warning "Please configure your Cloudflare tunnel credentials manually"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    local all_healthy=true
    
    # Check backend
    if curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        all_healthy=false
    fi
    
    # Check monitoring
    if curl -sf http://localhost:$MONITORING_PORT/health > /dev/null 2>&1; then
        log_success "Monitoring health check passed"
    else
        log_error "Monitoring health check failed"
        all_healthy=false
    fi
    
    # Check frontend
    if curl -sf http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        log_success "Frontend health check passed"
    else
        log_error "Frontend health check failed"
        all_healthy=false
    fi
    
    # Check database
    if [[ "${SERVICE_STATUS[postgresql]}" == "installed" ]]; then
        if sudo -u postgres psql -c "SELECT 1;" > /dev/null 2>&1; then
            log_success "PostgreSQL health check passed"
        else
            log_error "PostgreSQL health check failed"
            all_healthy=false
        fi
    fi
    
    if [[ "${SERVICE_STATUS[redis]}" == "installed" ]]; then
        if redis-cli ping > /dev/null 2>&1; then
            log_success "Redis health check passed"
        else
            log_error "Redis health check failed"
            all_healthy=false
        fi
    fi
    
    if $all_healthy; then
        DEPLOYMENT_STATUS="SUCCESS"
    else
        DEPLOYMENT_STATUS="PARTIAL"
    fi
}

# Generate status report
generate_status_report() {
    local report_file="$LEXOS_HOME/deployment_report_${TIMESTAMP}.txt"
    
    {
        echo "LexOS Genesis Deployment Report"
        echo "=============================="
        echo "Generated: $(date)"
        echo "Deployment Status: $DEPLOYMENT_STATUS"
        echo ""
        echo "System Information:"
        echo "- Hostname: $(hostname)"
        echo "- OS: $(lsb_release -d | cut -f2)"
        echo "- Kernel: $(uname -r)"
        echo "- CPU Cores: $(nproc)"
        echo "- Total RAM: $(free -h | awk '/^Mem:/{print $2}')"
        echo "- Disk Space: $(df -h "$LEXOS_HOME" | awk 'NR==2 {print $4}' ) available"
        echo ""
        echo "Service Status:"
        for service in "${!SERVICE_STATUS[@]}"; do
            echo "- $service: ${SERVICE_STATUS[$service]}"
        done
        echo ""
        echo "Access URLs:"
        echo "- Frontend: http://localhost:$FRONTEND_PORT"
        echo "- Backend API: http://localhost:$BACKEND_PORT"
        echo "- Monitoring: http://localhost:$MONITORING_PORT"
        echo "- Production: https://lexcommand.ai"
        echo ""
        echo "Log Files:"
        echo "- Backend: $LEXOS_HOME/logs/backend.log"
        echo "- Frontend: $LEXOS_HOME/logs/frontend.log"
        echo "- Monitoring: $LEXOS_HOME/logs/monitoring.log"
        echo "- Deployment: $LOG_FILE"
        echo ""
        echo "Next Steps:"
        echo "1. Configure SSL certificates for production"
        echo "2. Set up regular backups"
        echo "3. Configure monitoring alerts"
        echo "4. Review security settings"
        echo "5. Set up log rotation"
        echo ""
        if [[ -f "$LEXOS_HOME/credentials_${TIMESTAMP}.txt" ]]; then
            echo "IMPORTANT: Credentials saved to: $LEXOS_HOME/credentials_${TIMESTAMP}.txt"
            echo "Please store them securely and delete the file!"
        fi
    } | tee "$report_file"
    
    log_success "Deployment report saved to: $report_file"
}

# Create backup script
create_backup_script() {
    log_info "Creating backup script..."
    
    cat > "$LEXOS_HOME/scripts/backup.sh" << 'EOF'
#!/bin/bash

# LexOS Genesis Backup Script

BACKUP_DIR="/home/user/lexos-genesis/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="lexos_backup_${TIMESTAMP}"

# Create backup directory
mkdir -p "$BACKUP_DIR/$BACKUP_NAME"

# Backup database
cp /home/user/lexos-genesis/backend/data/lexos.db "$BACKUP_DIR/$BACKUP_NAME/"

# Backup configuration files
cp -r /home/user/lexos-genesis/backend/.env "$BACKUP_DIR/$BACKUP_NAME/"
cp -r /home/user/lexos-genesis/monitoring-agent/.env "$BACKUP_DIR/$BACKUP_NAME/"

# Create archive
cd "$BACKUP_DIR"
tar -czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME"
rm -rf "$BACKUP_NAME"

# Keep only last 7 backups
ls -t *.tar.gz | tail -n +8 | xargs -r rm

echo "Backup completed: ${BACKUP_NAME}.tar.gz"
EOF

    chmod +x "$LEXOS_HOME/scripts/backup.sh"
    
    # Create cron job for daily backups
    (crontab -l 2>/dev/null; echo "0 2 * * * $LEXOS_HOME/scripts/backup.sh") | crontab -
    
    log_success "Backup script created and scheduled"
}

# Main deployment flow
main() {
    # Create necessary directories
    mkdir -p "$LEXOS_HOME/scripts"
    mkdir -p "$LEXOS_HOME/logs"
    
    # Run deployment steps
    check_user
    check_system_requirements
    check_dependencies
    setup_environment
    install_dependencies
    initialize_database
    build_frontend
    start_services
    setup_nginx
    setup_cloudflare_tunnel
    
    # Wait for services to stabilize
    log_info "Waiting for services to stabilize..."
    sleep 10
    
    run_health_checks
    create_backup_script
    generate_status_report
    
    # Final message
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║           LexOS Genesis Deployment Complete!                  ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    if [[ "$DEPLOYMENT_STATUS" == "SUCCESS" ]]; then
        log_success "All services are running successfully!"
    else
        log_warning "Some services may need attention. Check the deployment report."
    fi
    
    echo ""
    echo "Quick commands:"
    echo "- View status: $LEXOS_HOME/scripts/status.sh"
    echo "- View logs: tail -f $LEXOS_HOME/logs/*.log"
    echo "- Restart services: sudo systemctl restart lexos-*"
    echo ""
}

# Run main function
main "$@"