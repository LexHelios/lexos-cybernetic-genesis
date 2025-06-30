#!/bin/bash

# LexOS Auto-Recovery Service
# Monitors and automatically recovers failed services

set -e

# Configuration
LEXOS_HOME="/home/user/lexos-genesis"
LOG_DIR="$LEXOS_HOME/logs"
PID_DIR="$LEXOS_HOME/pids"
RECOVERY_LOG="$LOG_DIR/auto-recovery.log"
CHECK_INTERVAL=30
MAX_LOG_SIZE=10485760  # 10MB
MAX_RESTART_ATTEMPTS=3
ALERT_EMAIL=""  # Set this to receive email alerts

# Service URLs
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:5000"

# Create log directory if needed
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$RECOVERY_LOG"
}

# Rotate logs if they get too large
rotate_logs() {
    for logfile in "$LOG_DIR"/*.log; do
        if [ -f "$logfile" ] && [ $(stat -f%z "$logfile" 2>/dev/null || stat -c%s "$logfile" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
            mv "$logfile" "${logfile}.old"
            touch "$logfile"
            log "Rotated log file: $logfile"
        fi
    done
}

# Send alert (placeholder for email/webhook notifications)
send_alert() {
    local service=$1
    local message=$2
    
    log "ALERT: $service - $message"
    
    # Email alert (requires mail command)
    if [ -n "$ALERT_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$message" | mail -s "LexOS Alert: $service" "$ALERT_EMAIL"
    fi
    
    # You can add webhook notifications here
    # Example: curl -X POST -H "Content-Type: application/json" -d "{\"text\":\"$message\"}" "$WEBHOOK_URL"
}

# Check if a service is running
is_service_running() {
    local pid_file=$1
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        fi
    fi
    return 1
}

# Check service health via HTTP
check_http_health() {
    local url=$1
    local timeout=5
    
    if curl -s --max-time $timeout "$url" > /dev/null 2>&1; then
        return 0
    fi
    return 1
}

# Restart backend service
restart_backend() {
    log "Attempting to restart backend service..."
    
    # Kill existing process
    if [ -f "$PID_DIR/backend.pid" ]; then
        local old_pid=$(cat "$PID_DIR/backend.pid")
        kill -TERM "$old_pid" 2>/dev/null || true
        sleep 2
        kill -KILL "$old_pid" 2>/dev/null || true
        rm -f "$PID_DIR/backend.pid"
    fi
    
    # Kill any process on port 5000
    lsof -ti:5000 | xargs kill -9 2>/dev/null || true
    
    # Start backend
    cd "$LEXOS_HOME/backend"
    nohup python3 app.py > "$LOG_DIR/backend.log" 2>&1 &
    local new_pid=$!
    echo $new_pid > "$PID_DIR/backend.pid"
    
    # Wait for backend to be ready
    sleep 5
    if check_http_health "$BACKEND_URL/api/health"; then
        log "Backend service restarted successfully (PID: $new_pid)"
        return 0
    else
        log "Backend service failed to restart"
        return 1
    fi
}

# Restart frontend service
restart_frontend() {
    log "Attempting to restart frontend service..."
    
    # Kill existing process
    if [ -f "$PID_DIR/frontend.pid" ]; then
        local old_pid=$(cat "$PID_DIR/frontend.pid")
        kill -TERM "$old_pid" 2>/dev/null || true
        sleep 2
        kill -KILL "$old_pid" 2>/dev/null || true
        rm -f "$PID_DIR/frontend.pid"
    fi
    
    # Kill any process on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Start frontend
    cd "$LEXOS_HOME/frontend"
    nohup npm start > "$LOG_DIR/frontend.log" 2>&1 &
    local new_pid=$!
    echo $new_pid > "$PID_DIR/frontend.pid"
    
    # Wait for frontend to be ready
    sleep 10
    if check_http_health "$FRONTEND_URL"; then
        log "Frontend service restarted successfully (PID: $new_pid)"
        return 0
    else
        log "Frontend service failed to restart"
        return 1
    fi
}

# Monitor services
monitor_services() {
    local backend_failures=0
    local frontend_failures=0
    
    # Check backend
    if ! is_service_running "$PID_DIR/backend.pid" || ! check_http_health "$BACKEND_URL/api/health"; then
        backend_failures=$((backend_failures + 1))
        log "Backend service is down (failure count: $backend_failures)"
        
        if [ $backend_failures -le $MAX_RESTART_ATTEMPTS ]; then
            if restart_backend; then
                backend_failures=0
                send_alert "Backend" "Service was down but has been successfully restarted"
            else
                send_alert "Backend" "Service is down and restart attempt failed"
            fi
        else
            send_alert "Backend" "CRITICAL: Service has failed $MAX_RESTART_ATTEMPTS times and will not be restarted automatically"
        fi
    else
        backend_failures=0
    fi
    
    # Check frontend
    if ! is_service_running "$PID_DIR/frontend.pid" || ! check_http_health "$FRONTEND_URL"; then
        frontend_failures=$((frontend_failures + 1))
        log "Frontend service is down (failure count: $frontend_failures)"
        
        if [ $frontend_failures -le $MAX_RESTART_ATTEMPTS ]; then
            if restart_frontend; then
                frontend_failures=0
                send_alert "Frontend" "Service was down but has been successfully restarted"
            else
                send_alert "Frontend" "Service is down and restart attempt failed"
            fi
        else
            send_alert "Frontend" "CRITICAL: Service has failed $MAX_RESTART_ATTEMPTS times and will not be restarted automatically"
        fi
    else
        frontend_failures=0
    fi
}

# Clean up stuck processes
cleanup_stuck_processes() {
    # Find and kill zombie processes
    ps aux | grep -E "(python3|node)" | grep -E "(defunct|<defunct>)" | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    
    # Clean up orphaned node processes
    local node_pids=$(pgrep -f "node.*lexos-genesis" | grep -v "$$" || true)
    for pid in $node_pids; do
        if ! grep -q "$pid" "$PID_DIR"/*.pid 2>/dev/null; then
            log "Killing orphaned node process: $pid"
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
    
    # Clean up orphaned python processes
    local python_pids=$(pgrep -f "python3.*lexos-genesis" | grep -v "$$" || true)
    for pid in $python_pids; do
        if ! grep -q "$pid" "$PID_DIR"/*.pid 2>/dev/null; then
            log "Killing orphaned python process: $pid"
            kill -9 "$pid" 2>/dev/null || true
        fi
    done
}

# Main monitoring loop
main() {
    log "Auto-recovery service started"
    
    # Trap signals for clean shutdown
    trap 'log "Auto-recovery service stopped"; exit 0' INT TERM
    
    while true; do
        # Monitor services
        monitor_services
        
        # Rotate logs every hour
        if [ $(($(date +%M) % 60)) -eq 0 ]; then
            rotate_logs
        fi
        
        # Clean up stuck processes every 5 minutes
        if [ $(($(date +%M) % 5)) -eq 0 ]; then
            cleanup_stuck_processes
        fi
        
        # Sleep before next check
        sleep $CHECK_INTERVAL
    done
}

# Start monitoring
main