#!/bin/bash

# LexOS Frontend Startup Script
# Enhanced with build verification and optimization

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEXOS_HOME="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$LEXOS_HOME/logs"
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] Frontend: $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] Frontend Error: $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] Frontend: $1${NC}"
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

# Check if backend is running
log "Checking backend availability..."
if ! curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    log_error "Backend is not running on port $BACKEND_PORT"
    log "Frontend requires backend to be running. Please start backend first."
    exit 1
fi

# Check if port is already in use
if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null ; then
    log_error "Port $FRONTEND_PORT is already in use"
    log "Checking if it's our frontend..."
    if curl -sf http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        log_success "Frontend is already running"
        exit 0
    else
        log_error "Another service is using port $FRONTEND_PORT"
        exit 1
    fi
fi

# Check if build exists
if [[ ! -d "$LEXOS_HOME/dist" ]]; then
    log "Production build not found, building frontend..."
    cd "$LEXOS_HOME"
    
    # Install dependencies if needed
    if [[ ! -d "$LEXOS_HOME/node_modules" ]]; then
        log "Installing frontend dependencies..."
        npm install --production
        if [[ $? -ne 0 ]]; then
            log_error "Failed to install dependencies"
            exit 1
        fi
    fi
    
    # Build frontend
    npm run build
    if [[ $? -ne 0 ]]; then
        log_error "Frontend build failed"
        exit 1
    fi
    log_success "Frontend built successfully"
else
    # Check if build is recent
    BUILD_AGE=$(find "$LEXOS_HOME/dist" -type f -name "*.js" -mmin +1440 | wc -l)
    if [[ $BUILD_AGE -gt 0 ]]; then
        log "Build is more than 24 hours old, consider rebuilding"
    fi
fi

# Install serve if not present
if ! command -v serve &> /dev/null; then
    log "Installing serve..."
    npm install -g serve
    if [[ $? -ne 0 ]]; then
        log_error "Failed to install serve"
        exit 1
    fi
fi

# Start frontend
log "Starting LexOS frontend..."
cd "$LEXOS_HOME"

# Start serve with proper configuration
serve -s dist -l $FRONTEND_PORT \
    --no-clipboard \
    --no-port-switching \
    --cors \
    >> "$LOG_DIR/frontend.log" 2>> "$LOG_DIR/frontend-error.log" &
FRONTEND_PID=$!

# Wait for frontend to start
log "Waiting for frontend to initialize..."
for i in {1..15}; do
    if curl -sf http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        log_success "Frontend started successfully (PID: $FRONTEND_PID)"
        log_success "Frontend is running at http://localhost:$FRONTEND_PORT"
        
        # Save PID for management
        echo $FRONTEND_PID > "$LOG_DIR/frontend.pid"
        
        # Open in browser if available
        if command -v xdg-open &> /dev/null; then
            log "Opening frontend in browser..."
            xdg-open http://localhost:$FRONTEND_PORT 2>/dev/null &
        fi
        
        exit 0
    fi
    sleep 1
done

log_error "Frontend failed to start within 15 seconds"
log "Check logs at: $LOG_DIR/frontend-error.log"
kill $FRONTEND_PID 2>/dev/null
exit 1