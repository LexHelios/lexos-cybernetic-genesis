#!/bin/bash

# LexOS Monitoring Agent Startup Script
# Enhanced with dependency checks and auto-recovery

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITORING_DIR="$(dirname "$SCRIPT_DIR")/monitoring-agent"
LOG_DIR="$(dirname "$SCRIPT_DIR")/logs"
MONITORING_PORT=4000
BACKEND_PORT=3001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] Monitoring: $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] Monitoring Error: $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] Monitoring: $1${NC}"
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
if [[ ! -f "$MONITORING_DIR/.env" ]]; then
    log_error ".env file not found in $MONITORING_DIR"
    log "Creating default configuration..."
    cat > "$MONITORING_DIR/.env" << EOF
NODE_ENV=production
PORT=$MONITORING_PORT
BACKEND_URL=http://localhost:$BACKEND_PORT
LOG_LEVEL=info
ENABLE_ALERTS=true
CHECK_INTERVAL=30000
EOF
fi

# Check if backend is running
log "Checking backend availability..."
if ! curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    log_error "Backend is not running on port $BACKEND_PORT"
    log "Attempting to start backend..."
    "$SCRIPT_DIR/start-backend.sh"
    sleep 5
    if ! curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        log_error "Failed to start backend. Monitoring agent requires backend to be running."
        exit 1
    fi
fi

# Check if port is already in use
if lsof -Pi :$MONITORING_PORT -sTCP:LISTEN -t >/dev/null ; then
    log_error "Port $MONITORING_PORT is already in use"
    log "Checking if it's our monitoring agent..."
    if curl -sf http://localhost:$MONITORING_PORT/health > /dev/null 2>&1; then
        log_success "Monitoring agent is already running and healthy"
        exit 0
    else
        log_error "Another service is using port $MONITORING_PORT"
        exit 1
    fi
fi

# Install dependencies if needed
if [[ ! -d "$MONITORING_DIR/node_modules" ]]; then
    log "Installing monitoring agent dependencies..."
    cd "$MONITORING_DIR"
    npm install --production
    if [[ $? -ne 0 ]]; then
        log_error "Failed to install dependencies"
        exit 1
    fi
fi

# Start monitoring agent
log "Starting LexOS monitoring agent..."
cd "$MONITORING_DIR"

# Export environment
export NODE_ENV=production
export PORT=$MONITORING_PORT

# Start with proper error handling
node src/index.js >> "$LOG_DIR/monitoring.log" 2>> "$LOG_DIR/monitoring-error.log" &
MONITORING_PID=$!

# Wait for monitoring to start
log "Waiting for monitoring agent to initialize..."
for i in {1..20}; do
    if curl -sf http://localhost:$MONITORING_PORT/health > /dev/null 2>&1; then
        log_success "Monitoring agent started successfully (PID: $MONITORING_PID)"
        log_success "Monitoring dashboard available at http://localhost:$MONITORING_PORT"
        
        # Save PID for management
        echo $MONITORING_PID > "$LOG_DIR/monitoring.pid"
        
        # Show initial metrics
        log "Initial system metrics:"
        curl -s http://localhost:$MONITORING_PORT/api/metrics/summary | jq '.' 2>/dev/null || true
        
        exit 0
    fi
    sleep 1
done

log_error "Monitoring agent failed to start within 20 seconds"
log "Check logs at: $LOG_DIR/monitoring-error.log"
kill $MONITORING_PID 2>/dev/null
exit 1