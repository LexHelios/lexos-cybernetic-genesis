#!/bin/bash

# LexOS Backend Startup Script
# Enhanced with health checks and dependency verification

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")/backend"
LOG_DIR="$(dirname "$SCRIPT_DIR")/logs"
BACKEND_PORT=3001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] Backend: $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] Backend Error: $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] Backend: $1${NC}"
}

# Create log directory
mkdir -p "$LOG_DIR"

# Check dependencies
log "Checking dependencies..."

# Check Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

# Check environment file
if [[ ! -f "$BACKEND_DIR/.env" ]]; then
    log_error ".env file not found in $BACKEND_DIR"
    log "Creating from template..."
    if [[ -f "$BACKEND_DIR/.env.example" ]]; then
        cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
        log_error "Please configure $BACKEND_DIR/.env before starting"
        exit 1
    fi
fi

# Check database
log "Checking database..."
if [[ ! -f "$BACKEND_DIR/data/lexos.db" ]]; then
    log "Database not found, initializing..."
    cd "$BACKEND_DIR"
    npm run init-db
    if [[ $? -ne 0 ]]; then
        log_error "Database initialization failed"
        exit 1
    fi
fi

# Check if port is already in use
if lsof -Pi :$BACKEND_PORT -sTCP:LISTEN -t >/dev/null ; then
    log_error "Port $BACKEND_PORT is already in use"
    log "Checking if it's our backend..."
    if curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        log_success "Backend is already running and healthy"
        exit 0
    else
        log_error "Another service is using port $BACKEND_PORT"
        exit 1
    fi
fi

# Check Redis (optional)
if command -v redis-cli &> /dev/null; then
    if redis-cli ping > /dev/null 2>&1; then
        log_success "Redis is available"
    else
        log "Redis is not running, starting it..."
        sudo systemctl start redis-server
        sleep 2
        if redis-cli ping > /dev/null 2>&1; then
            log_success "Redis started successfully"
        else
            log "Redis could not be started (optional dependency)"
        fi
    fi
fi

# Start backend
log "Starting LexOS backend..."
cd "$BACKEND_DIR"

# Export environment
export NODE_ENV=production
export PORT=$BACKEND_PORT

# Start with proper error handling
node src/index.js >> "$LOG_DIR/backend.log" 2>> "$LOG_DIR/backend-error.log" &
BACKEND_PID=$!

# Wait for backend to start
log "Waiting for backend to initialize..."
for i in {1..30}; do
    if curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        log_success "Backend started successfully (PID: $BACKEND_PID)"
        log_success "Backend is running at http://localhost:$BACKEND_PORT"
        
        # Save PID for management
        echo $BACKEND_PID > "$LOG_DIR/backend.pid"
        
        # Show initial status
        curl -s http://localhost:$BACKEND_PORT/api/system/status | jq '.' 2>/dev/null || true
        
        exit 0
    fi
    sleep 1
done

log_error "Backend failed to start within 30 seconds"
log "Check logs at: $LOG_DIR/backend-error.log"
kill $BACKEND_PID 2>/dev/null
exit 1