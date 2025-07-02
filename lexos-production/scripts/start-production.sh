
#!/bin/bash

# LexOS Production Startup Script
# Starts all services in production mode with monitoring

set -e

LOG_DIR="/var/log/lexos"
PID_DIR="/var/run/lexos"
LEXOS_DIR="/home/ubuntu/lexos-cybernetic-genesis"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

# Create necessary directories
create_directories() {
    log "Creating necessary directories..."
    sudo mkdir -p "$LOG_DIR" "$PID_DIR"
    sudo chown -R $USER:$USER "$LOG_DIR" "$PID_DIR"
    mkdir -p "$LEXOS_DIR/backups"
    mkdir -p "$LEXOS_DIR/backend/data"
    mkdir -p "$LEXOS_DIR/logs"
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    # Check Node.js version
    if ! command -v node &> /dev/null; then
        error "Node.js is not installed"
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 18 ]; then
        error "Node.js version 18 or higher is required"
        exit 1
    fi
    
    # Check available memory
    local available_mem=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    if [ "$available_mem" -lt 1000 ]; then
        warn "Low available memory: ${available_mem}MB. Recommended: 2GB+"
    fi
    
    # Check disk space
    local available_disk=$(df / | tail -1 | awk '{print $4}')
    if [ "$available_disk" -lt 5000000 ]; then
        warn "Low disk space. Recommended: 10GB+ free space"
    fi
    
    log "System requirements check completed"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    cd "$LEXOS_DIR"
    
    # Copy production environment if it doesn't exist
    if [ ! -f ".env" ]; then
        if [ -f ".env.production" ]; then
            cp .env.production .env
            warn "Copied .env.production to .env. Please update with your values!"
        else
            error "No .env file found. Please create one based on .env.example"
            exit 1
        fi
    fi
    
    # Validate critical environment variables
    source .env
    
    if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "CHANGE_THIS_TO_SECURE_RANDOM_STRING_MIN_32_CHARS_PRODUCTION" ]; then
        error "JWT_SECRET must be set to a secure value in .env"
        exit 1
    fi
    
    if [ -z "$SESSION_SECRET" ] || [ "$SESSION_SECRET" = "CHANGE_THIS_TO_SECURE_SESSION_SECRET_MIN_32_CHARS_PRODUCTION" ]; then
        error "SESSION_SECRET must be set to a secure value in .env"
        exit 1
    fi
    
    log "Environment setup completed"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    cd "$LEXOS_DIR"
    
    # Install frontend dependencies
    if [ ! -d "node_modules" ]; then
        npm ci --only=production
    fi
    
    # Install backend dependencies
    cd backend
    if [ ! -d "node_modules" ]; then
        npm ci --only=production
    fi
    
    cd "$LEXOS_DIR"
    log "Dependencies installed"
}

# Build application
build_application() {
    log "Building application..."
    
    cd "$LEXOS_DIR"
    
    # Build frontend
    npm run build
    
    log "Application built successfully"
}

# Initialize database
initialize_database() {
    log "Initializing database..."
    
    cd "$LEXOS_DIR/backend"
    
    # Run database initialization
    npm run init-db
    
    log "Database initialized"
}

# Start services
start_services() {
    log "Starting LexOS services..."
    
    cd "$LEXOS_DIR"
    
    # Start backend with PM2
    cd backend
    pm2 start src/index.js --name "lexos-backend" \
        --log "$LOG_DIR/lexos-backend.log" \
        --error "$LOG_DIR/lexos-backend-error.log" \
        --pid "$PID_DIR/lexos-backend.pid" \
        --env production \
        --max-memory-restart 2G \
        --restart-delay 5000
    
    # Start frontend with PM2
    cd "$LEXOS_DIR"
    pm2 start npm --name "lexos-frontend" \
        --log "$LOG_DIR/lexos-frontend.log" \
        --error "$LOG_DIR/lexos-frontend-error.log" \
        --pid "$PID_DIR/lexos-frontend.pid" \
        -- run preview
    
    # Start auto-healer
    nohup "$LEXOS_DIR/scripts/autoHealer.sh" > "$LOG_DIR/auto-healer.log" 2>&1 &
    echo $! > "$PID_DIR/auto-healer.pid"
    
    # Setup backup cron job
    setup_backup_cron
    
    log "Services started successfully"
}

# Setup backup cron job
setup_backup_cron() {
    log "Setting up backup cron job..."
    
    # Add backup job to crontab (every 6 hours)
    (crontab -l 2>/dev/null; echo "0 */6 * * * $LEXOS_DIR/scripts/backup_db.sh") | crontab -
    
    log "Backup cron job configured"
}

# Check service status
check_services() {
    log "Checking service status..."
    
    # Check PM2 processes
    pm2 list
    
    # Check if services are responding
    sleep 5
    
    if curl -f -s http://localhost:9000/health > /dev/null; then
        log "✅ Backend is responding"
    else
        error "❌ Backend is not responding"
    fi
    
    if curl -f -s http://localhost:5173 > /dev/null; then
        log "✅ Frontend is responding"
    else
        warn "⚠️ Frontend may still be starting up"
    fi
}

# Display startup information
display_info() {
    log "🚀 LexOS Genesis started successfully!"
    echo ""
    echo "📊 Service URLs:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend:  http://localhost:9000"
    echo "   Health:   http://localhost:9000/health"
    echo ""
    echo "📁 Log files:"
    echo "   Backend:     $LOG_DIR/lexos-backend.log"
    echo "   Frontend:    $LOG_DIR/lexos-frontend.log"
    echo "   Auto-healer: $LOG_DIR/auto-healer.log"
    echo ""
    echo "🔧 Management commands:"
    echo "   View logs:    pm2 logs"
    echo "   Stop all:     pm2 stop all"
    echo "   Restart all:  pm2 restart all"
    echo "   Monitor:      pm2 monit"
    echo ""
    echo "⚠️  Remember to:"
    echo "   1. Configure your .env file with production values"
    echo "   2. Set up SSL certificates for HTTPS"
    echo "   3. Configure firewall rules"
    echo "   4. Set up monitoring and alerting"
}

# Main execution
main() {
    log "Starting LexOS Genesis in production mode..."
    
    create_directories
    check_requirements
    setup_environment
    install_dependencies
    build_application
    initialize_database
    start_services
    check_services
    display_info
    
    log "Production startup completed!"
}

# Handle script arguments
case "${1:-}" in
    "stop")
        log "Stopping LexOS services..."
        pm2 stop all
        pkill -f autoHealer.sh || true
        log "Services stopped"
        ;;
    "restart")
        log "Restarting LexOS services..."
        pm2 restart all
        log "Services restarted"
        ;;
    "status")
        pm2 list
        ;;
    "logs")
        pm2 logs
        ;;
    *)
        main
        ;;
esac
