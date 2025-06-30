#!/bin/bash

# LexOS Master Startup Script
# One-click solution to start the entire LexOS system

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
LEXOS_HOME="/home/user/lexos-genesis"
LOG_DIR="$LEXOS_HOME/logs"
PID_DIR="$LEXOS_HOME/pids"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000"
MAX_WAIT_TIME=60

# Create necessary directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# ASCII Art Logo
print_logo() {
    echo -e "${CYAN}"
    cat << 'EOF'
    __                  ____  _____
   / /   ___  _  __   / __ \/ ___/
  / /   / _ \| |/_/  / / / /\__ \ 
 / /___/  __/>  <   / /_/ /___/ / 
/_____/\___/_/|_|   \____//____/  
                                  
EOF
    echo -e "${NC}"
    echo -e "${PURPLE}Welcome to LexOS - The Next-Generation Cloud Desktop${NC}"
    echo -e "${BLUE}Version 1.0.0 - Production Ready${NC}"
    echo ""
}

# Progress bar function
progress_bar() {
    local duration=$1
    local steps=$2
    local message=$3
    
    echo -ne "${message} ["
    
    for ((i=0; i<=steps; i++)); do
        echo -ne "#"
        sleep $((duration/steps))
    done
    
    echo -e "] ${GREEN}✓${NC}"
}

# Check system requirements
check_requirements() {
    echo -e "${YELLOW}🔍 Checking system requirements...${NC}"
    
    local requirements_met=true
    
    # Check Node.js
    if command -v node &> /dev/null; then
        local node_version=$(node -v | cut -d'v' -f2)
        echo -e "  ${GREEN}✓${NC} Node.js $node_version found"
    else
        echo -e "  ${RED}✗${NC} Node.js not found"
        requirements_met=false
    fi
    
    # Check npm
    if command -v npm &> /dev/null; then
        local npm_version=$(npm -v)
        echo -e "  ${GREEN}✓${NC} npm $npm_version found"
    else
        echo -e "  ${RED}✗${NC} npm not found"
        requirements_met=false
    fi
    
    # Check Python
    if command -v python3 &> /dev/null; then
        local python_version=$(python3 --version | cut -d' ' -f2)
        echo -e "  ${GREEN}✓${NC} Python $python_version found"
    else
        echo -e "  ${RED}✗${NC} Python 3 not found"
        requirements_met=false
    fi
    
    # Check pip
    if command -v pip3 &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} pip3 found"
    else
        echo -e "  ${RED}✗${NC} pip3 not found"
        requirements_met=false
    fi
    
    # Check disk space
    local available_space=$(df -BG "$LEXOS_HOME" | awk 'NR==2 {print $4}' | sed 's/G//')
    if [ "$available_space" -gt 1 ]; then
        echo -e "  ${GREEN}✓${NC} Sufficient disk space (${available_space}GB available)"
    else
        echo -e "  ${RED}✗${NC} Insufficient disk space (${available_space}GB available)"
        requirements_met=false
    fi
    
    # Check memory
    local available_mem=$(free -m | awk 'NR==2 {print $7}')
    if [ "$available_mem" -gt 512 ]; then
        echo -e "  ${GREEN}✓${NC} Sufficient memory (${available_mem}MB available)"
    else
        echo -e "  ${YELLOW}⚠${NC} Low memory (${available_mem}MB available)"
    fi
    
    if [ "$requirements_met" = false ]; then
        echo -e "\n${RED}Error: System requirements not met. Please install missing dependencies.${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✓ All requirements met${NC}\n"
}

# Install dependencies
install_dependencies() {
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    
    # Backend dependencies
    if [ -f "$LEXOS_HOME/backend/requirements.txt" ]; then
        echo -e "  Installing Python dependencies..."
        cd "$LEXOS_HOME/backend"
        pip3 install -r requirements.txt --quiet > "$LOG_DIR/pip_install.log" 2>&1 || {
            echo -e "  ${RED}✗${NC} Failed to install Python dependencies"
            cat "$LOG_DIR/pip_install.log"
            exit 1
        }
        echo -e "  ${GREEN}✓${NC} Python dependencies installed"
    fi
    
    # Frontend dependencies
    if [ -f "$LEXOS_HOME/frontend/package.json" ]; then
        echo -e "  Installing Node.js dependencies..."
        cd "$LEXOS_HOME/frontend"
        npm install --silent > "$LOG_DIR/npm_install.log" 2>&1 || {
            echo -e "  ${RED}✗${NC} Failed to install Node.js dependencies"
            cat "$LOG_DIR/npm_install.log"
            exit 1
        }
        echo -e "  ${GREEN}✓${NC} Node.js dependencies installed"
    fi
    
    echo -e "${GREEN}✓ All dependencies installed${NC}\n"
}

# Clean up old processes
cleanup_processes() {
    echo -e "${YELLOW}🧹 Cleaning up old processes...${NC}"
    
    # Kill old backend processes
    if [ -f "$PID_DIR/backend.pid" ]; then
        local old_pid=$(cat "$PID_DIR/backend.pid")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            kill -TERM "$old_pid" 2>/dev/null || true
            sleep 2
            kill -KILL "$old_pid" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/backend.pid"
    fi
    
    # Kill old frontend processes
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local old_pid=$(cat "$PID_DIR/frontend.pid")
        if ps -p "$old_pid" > /dev/null 2>&1; then
            kill -TERM "$old_pid" 2>/dev/null || true
            sleep 2
            kill -KILL "$old_pid" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/frontend.pid"
    fi
    
    # Kill processes on ports
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✓ Cleanup complete${NC}\n"
}

# Start backend service
start_backend() {
    echo -e "${YELLOW}🚀 Starting backend service...${NC}"
    
    cd "$LEXOS_HOME/backend"
    
    # Check if Python backend exists, otherwise use Node.js backend
    if [ -f "app.py" ]; then
        # Start Python backend
        nohup python3 app.py > "$LOG_DIR/backend.log" 2>&1 &
        local backend_pid=$!
        echo $backend_pid > "$PID_DIR/backend.pid"
    elif [ -f "src/index.js" ]; then
        # Start Node.js backend
        nohup node src/index.js > "$LOG_DIR/backend.log" 2>&1 &
        local backend_pid=$!
        echo $backend_pid > "$PID_DIR/backend.pid"
    else
        echo -e "${RED}✗ No backend found${NC}"
        return 1
    fi
    
    # Wait for backend to be ready
    local count=0
    while [ $count -lt $MAX_WAIT_TIME ]; do
        if curl -s "$BACKEND_URL/api/health" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Backend service started (PID: $backend_pid)${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -ne "\r  Waiting for backend to start... ($count/$MAX_WAIT_TIME)"
    done
    
    echo -e "\n${RED}✗ Backend failed to start${NC}"
    cat "$LOG_DIR/backend.log"
    return 1
}

# Start frontend service
start_frontend() {
    echo -e "${YELLOW}🎨 Starting frontend service...${NC}"
    
    cd "$LEXOS_HOME/frontend"
    
    # Build frontend in production mode
    echo -e "  Building frontend..."
    npm run build > "$LOG_DIR/frontend_build.log" 2>&1 || {
        echo -e "  ${RED}✗${NC} Frontend build failed"
        cat "$LOG_DIR/frontend_build.log"
        return 1
    }
    
    # Start the frontend
    nohup npm start > "$LOG_DIR/frontend.log" 2>&1 &
    local frontend_pid=$!
    echo $frontend_pid > "$PID_DIR/frontend.pid"
    
    # Wait for frontend to be ready
    local count=0
    while [ $count -lt $MAX_WAIT_TIME ]; do
        if curl -s "$FRONTEND_URL" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ Frontend service started (PID: $frontend_pid)${NC}"
            return 0
        fi
        sleep 1
        count=$((count + 1))
        echo -ne "\r  Waiting for frontend to start... ($count/$MAX_WAIT_TIME)"
    done
    
    echo -e "\n${RED}✗ Frontend failed to start${NC}"
    cat "$LOG_DIR/frontend.log"
    return 1
}

# Start auto-recovery service
start_auto_recovery() {
    echo -e "${YELLOW}🛡️  Starting auto-recovery service...${NC}"
    
    if [ -f "$LEXOS_HOME/services/auto-recovery.sh" ]; then
        chmod +x "$LEXOS_HOME/services/auto-recovery.sh"
        nohup "$LEXOS_HOME/services/auto-recovery.sh" > "$LOG_DIR/auto-recovery.log" 2>&1 &
        local recovery_pid=$!
        echo $recovery_pid > "$PID_DIR/auto-recovery.pid"
        echo -e "${GREEN}✓ Auto-recovery service started (PID: $recovery_pid)${NC}"
    else
        echo -e "${YELLOW}⚠ Auto-recovery service not found${NC}"
    fi
}

# Play startup sound
play_startup_sound() {
    # Check if audio is available
    if command -v paplay &> /dev/null && [ -f "/usr/share/sounds/freedesktop/stereo/complete.oga" ]; then
        paplay /usr/share/sounds/freedesktop/stereo/complete.oga 2>/dev/null &
    elif command -v afplay &> /dev/null && [ -f "/System/Library/Sounds/Glass.aiff" ]; then
        afplay /System/Library/Sounds/Glass.aiff 2>/dev/null &
    fi
}

# Open browser
open_browser() {
    echo -e "${YELLOW}🌐 Opening LexOS in browser...${NC}"
    
    # Wait a moment for everything to stabilize
    sleep 2
    
    # Try different methods to open browser
    if command -v xdg-open &> /dev/null; then
        xdg-open "$FRONTEND_URL" 2>/dev/null &
    elif command -v gnome-open &> /dev/null; then
        gnome-open "$FRONTEND_URL" 2>/dev/null &
    elif command -v open &> /dev/null; then
        open "$FRONTEND_URL" 2>/dev/null &
    else
        echo -e "${YELLOW}Please open your browser and navigate to: ${CYAN}$FRONTEND_URL${NC}"
    fi
}

# Show system status
show_status() {
    echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ LexOS is running!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "Frontend: ${CYAN}$FRONTEND_URL${NC}"
    echo -e "Backend:  ${CYAN}$BACKEND_URL${NC}"
    echo -e "API Docs: ${CYAN}$BACKEND_URL/docs${NC}"
    echo -e "\nLogs:"
    echo -e "  Backend:  $LOG_DIR/backend.log"
    echo -e "  Frontend: $LOG_DIR/frontend.log"
    echo -e "  Recovery: $LOG_DIR/auto-recovery.log"
    echo -e "\nTo stop LexOS, run: ${YELLOW}./stop-lexos.sh${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Main execution
main() {
    clear
    print_logo
    
    # Change to LexOS directory
    cd "$LEXOS_HOME"
    
    # Run all startup steps
    check_requirements
    cleanup_processes
    install_dependencies
    
    # Start services
    if ! start_backend; then
        echo -e "${RED}Failed to start backend service${NC}"
        exit 1
    fi
    
    if ! start_frontend; then
        echo -e "${RED}Failed to start frontend service${NC}"
        exit 1
    fi
    
    start_auto_recovery
    
    # Final steps
    echo -e "\n${YELLOW}🎉 Finalizing startup...${NC}"
    progress_bar 3 30 "  Initializing system"
    
    play_startup_sound
    open_browser
    show_status
    
    # Keep script running
    echo -e "\n${YELLOW}Press Ctrl+C to stop LexOS${NC}"
    
    # Trap cleanup on exit
    trap 'echo -e "\n${YELLOW}Shutting down LexOS...${NC}"; "$LEXOS_HOME/stop-lexos.sh"; exit 0' INT TERM
    
    # Keep running
    while true; do
        sleep 1
    done
}

# Run main function
main