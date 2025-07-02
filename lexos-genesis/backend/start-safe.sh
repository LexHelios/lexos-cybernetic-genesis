#!/bin/bash

# Safe Backend Startup Script with Recovery Mode

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR"
LOG_DIR="$BACKEND_DIR/logs"
DATA_DIR="$BACKEND_DIR/data"
PORT=${PORT:-3001}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

# Create necessary directories
log "Creating necessary directories..."
mkdir -p "$LOG_DIR" "$DATA_DIR" "$BACKEND_DIR/public"

# Check if port is in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    log_warning "Port $PORT is already in use"
    
    # Try to check if it's our backend
    if curl -sf http://localhost:$PORT/health >/dev/null 2>&1; then
        log_success "Backend is already running on port $PORT"
        exit 0
    else
        log_error "Another service is using port $PORT"
        log "Attempting to find an alternative port..."
        
        # Find next available port
        for alt_port in 3002 3003 3004 8000 8001 9000 9001; do
            if ! lsof -Pi :$alt_port -sTCP:LISTEN -t >/dev/null 2>&1; then
                PORT=$alt_port
                log_success "Using alternative port: $PORT"
                break
            fi
        done
    fi
fi

# Check Node.js installation
if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed"
    exit 1
fi

NODE_VERSION=$(node -v)
log "Node.js version: $NODE_VERSION"

# Check package.json exists
if [ ! -f "$BACKEND_DIR/package.json" ]; then
    log_error "package.json not found"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    log "Installing dependencies..."
    cd "$BACKEND_DIR"
    npm install --production
    if [ $? -ne 0 ]; then
        log_error "Failed to install dependencies"
        exit 1
    fi
fi

# Create .env file if it doesn't exist
if [ ! -f "$BACKEND_DIR/.env" ]; then
    log_warning ".env file not found, creating default configuration..."
    cat > "$BACKEND_DIR/.env" << EOF
# Auto-generated environment configuration
PORT=$PORT
NODE_ENV=production
APP_VERSION=2.1.0
FRONTEND_URL=http://localhost:5173
DATABASE_PATH=./data/lexos.db
ANALYTICS_DB_PATH=./data/analytics.db
JWT_SECRET=change-this-in-production-$(date +%s)
LOG_LEVEL=info
LOG_DIR=./logs
EOF
    log_success "Created .env file"
fi

# Fix database permissions if they exist
if [ -f "$DATA_DIR/lexos.db" ]; then
    chmod 664 "$DATA_DIR/lexos.db" 2>/dev/null || log_warning "Could not update database permissions"
fi
if [ -f "$DATA_DIR/analytics.db" ]; then
    chmod 664 "$DATA_DIR/analytics.db" 2>/dev/null || log_warning "Could not update analytics database permissions"
fi

# Determine which backend to start
cd "$BACKEND_DIR"

if [ -f "src/index.js" ] && [ -s "src/index.js" ]; then
    BACKEND_FILE="src/index.js"
    log "Starting main backend..."
elif [ -f "recovery-backend.js" ]; then
    BACKEND_FILE="recovery-backend.js"
    log_warning "Main backend not available, starting recovery backend..."
else
    log_error "No backend file found to start"
    exit 1
fi

# Export environment variables
export PORT=$PORT
export NODE_ENV=${NODE_ENV:-production}

# Start the backend
log "Starting backend on port $PORT..."
node "$BACKEND_FILE" >> "$LOG_DIR/backend.log" 2>> "$LOG_DIR/backend-error.log" &
BACKEND_PID=$!

# Save PID for management
echo $BACKEND_PID > "$LOG_DIR/backend.pid"

# Wait for backend to start
log "Waiting for backend to initialize..."
RETRIES=30
while [ $RETRIES -gt 0 ]; do
    if curl -sf http://localhost:$PORT/health >/dev/null 2>&1; then
        log_success "Backend started successfully (PID: $BACKEND_PID)"
        log_success "Backend is running at http://localhost:$PORT"
        
        # Show backend status
        echo -e "\n${GREEN}Backend Status:${NC}"
        curl -s http://localhost:$PORT/api/system/status 2>/dev/null | jq '.' 2>/dev/null || echo "Status endpoint not available"
        
        echo -e "\n${BLUE}Logs:${NC}"
        echo "  Main log: $LOG_DIR/backend.log"
        echo "  Error log: $LOG_DIR/backend-error.log"
        echo -e "\n${YELLOW}To stop the backend:${NC} kill $BACKEND_PID\n"
        
        exit 0
    fi
    
    # Check if process is still running
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        log_error "Backend process died unexpectedly"
        echo -e "\n${RED}Last 10 lines of error log:${NC}"
        tail -n 10 "$LOG_DIR/backend-error.log" 2>/dev/null || echo "No error log available"
        exit 1
    fi
    
    sleep 1
    RETRIES=$((RETRIES - 1))
done

log_error "Backend failed to start within 30 seconds"
echo -e "\n${RED}Last 10 lines of error log:${NC}"
tail -n 10 "$LOG_DIR/backend-error.log" 2>/dev/null || echo "No error log available"

# Kill the process if it's still running
kill $BACKEND_PID 2>/dev/null
exit 1