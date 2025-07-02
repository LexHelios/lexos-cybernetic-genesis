#!/bin/bash

# LexOS Auth Service Startup Script
# Note: Currently auth is integrated into the main backend
# This script is a placeholder for future auth service separation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT=3001
AUTH_PORT=9000

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] Auth: $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] Auth: $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] Auth: $1${NC}"
}

# Currently, authentication is handled by the main backend service
log "Authentication service is integrated into the main backend"
log "Backend provides auth endpoints at: http://localhost:$BACKEND_PORT/api/auth"

# Check if backend is running
if curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
    log_success "Backend with auth service is running"
    
    # Test auth endpoint
    if curl -sf http://localhost:$BACKEND_PORT/api/auth/status > /dev/null 2>&1; then
        log_success "Auth endpoints are accessible"
    else
        log_warning "Auth endpoints may not be properly configured"
    fi
else
    log_warning "Backend is not running. Starting backend service..."
    "$SCRIPT_DIR/start-backend.sh"
fi

log "Auth service endpoints:"
log "  Login:    POST http://localhost:$BACKEND_PORT/api/auth/login"
log "  Logout:   POST http://localhost:$BACKEND_PORT/api/auth/logout"
log "  Verify:   GET  http://localhost:$BACKEND_PORT/api/auth/verify"
log "  Refresh:  POST http://localhost:$BACKEND_PORT/api/auth/refresh"

# Future: When auth is separated into its own service
# This script will start a dedicated auth service on port 9000