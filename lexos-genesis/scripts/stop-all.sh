#!/bin/bash

# LexOS Stop All Services Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$(dirname "$SCRIPT_DIR")/logs"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

# Stop systemd services
log "Stopping LexOS services..."

# Stop services via systemd
for service in lexos-frontend lexos-monitoring lexos-backend; do
    if systemctl is-active --quiet $service; then
        log "Stopping $service..."
        sudo systemctl stop $service
        log_success "$service stopped"
    else
        log "$service is not running"
    fi
done

# Stop services via PID files
for pid_file in "$LOG_DIR"/*.pid; do
    if [[ -f "$pid_file" ]]; then
        PID=$(cat "$pid_file")
        SERVICE_NAME=$(basename "$pid_file" .pid)
        if kill -0 $PID 2>/dev/null; then
            log "Stopping $SERVICE_NAME (PID: $PID)..."
            kill $PID
            sleep 2
            if kill -0 $PID 2>/dev/null; then
                log "Force stopping $SERVICE_NAME..."
                kill -9 $PID
            fi
            log_success "$SERVICE_NAME stopped"
        fi
        rm -f "$pid_file"
    fi
done

# Kill any remaining node processes on our ports
PORTS=(3000 3001 4000 9000)
for port in "${PORTS[@]}"; do
    PID=$(lsof -ti:$port)
    if [[ ! -z "$PID" ]]; then
        log "Killing process on port $port (PID: $PID)..."
        kill -9 $PID 2>/dev/null
    fi
done

log_success "All LexOS services stopped"