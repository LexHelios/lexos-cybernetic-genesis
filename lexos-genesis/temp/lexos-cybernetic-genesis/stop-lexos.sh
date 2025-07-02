#!/bin/bash

# LexOS Stop Script
# Gracefully stops all LexOS services

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
LEXOS_HOME="/home/user/lexos-genesis"
PID_DIR="$LEXOS_HOME/pids"

echo -e "${YELLOW}Stopping LexOS services...${NC}"

# Stop auto-recovery service
if [ -f "$PID_DIR/auto-recovery.pid" ]; then
    pid=$(cat "$PID_DIR/auto-recovery.pid")
    if ps -p "$pid" > /dev/null 2>&1; then
        kill -TERM "$pid" 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Auto-recovery service stopped"
    fi
    rm -f "$PID_DIR/auto-recovery.pid"
fi

# Stop frontend
if [ -f "$PID_DIR/frontend.pid" ]; then
    pid=$(cat "$PID_DIR/frontend.pid")
    if ps -p "$pid" > /dev/null 2>&1; then
        kill -TERM "$pid" 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Frontend service stopped"
    fi
    rm -f "$PID_DIR/frontend.pid"
fi

# Stop backend
if [ -f "$PID_DIR/backend.pid" ]; then
    pid=$(cat "$PID_DIR/backend.pid")
    if ps -p "$pid" > /dev/null 2>&1; then
        kill -TERM "$pid" 2>/dev/null || true
        echo -e "${GREEN}✓${NC} Backend service stopped"
    fi
    rm -f "$PID_DIR/backend.pid"
fi

# Clean up any remaining processes on ports
lsof -ti:5000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

echo -e "${GREEN}✅ LexOS stopped successfully${NC}"