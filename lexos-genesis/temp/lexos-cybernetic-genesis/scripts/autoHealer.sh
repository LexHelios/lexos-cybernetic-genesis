
#!/bin/bash

# LexOS Auto-Healing Script
# Monitors and automatically restarts services when they fail

LOG_FILE="/var/log/lexos-autohealer.log"
PID_FILE="/var/run/lexos-autohealer.pid"
BACKEND_PORT=9000
FRONTEND_PORT=5173
MAX_RESTARTS=3
RESTART_WINDOW=300  # 5 minutes

# Create log file if it doesn't exist
touch "$LOG_FILE"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check if a service is running on a port
check_service() {
    local port=$1
    local service_name=$2
    
    if netstat -tuln | grep -q ":$port "; then
        return 0  # Service is running
    else
        log_message "WARNING: $service_name not responding on port $port"
        return 1  # Service is not running
    fi
}

# Function to check backend health endpoint
check_backend_health() {
    local health_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$BACKEND_PORT/health" 2>/dev/null)
    
    if [ "$health_response" = "200" ]; then
        return 0
    else
        log_message "WARNING: Backend health check failed (HTTP $health_response)"
        return 1
    fi
}

# Function to restart backend service
restart_backend() {
    log_message "Attempting to restart LexOS backend..."
    
    # Kill existing processes
    pkill -f "node.*src/index.js" || true
    pkill -f "lexos.*backend" || true
    
    # Wait a moment
    sleep 2
    
    # Start backend
    cd /home/ubuntu/lexos-cybernetic-genesis/backend
    nohup npm run prod > /var/log/lexos-backend.log 2>&1 &
    
    # Wait for startup
    sleep 5
    
    if check_service $BACKEND_PORT "Backend"; then
        log_message "SUCCESS: Backend restarted successfully"
        return 0
    else
        log_message "ERROR: Failed to restart backend"
        return 1
    fi
}

# Function to restart frontend service
restart_frontend() {
    log_message "Attempting to restart LexOS frontend..."
    
    # Kill existing processes
    pkill -f "vite.*preview" || true
    pkill -f "lexos.*frontend" || true
    
    # Wait a moment
    sleep 2
    
    # Start frontend
    cd /home/ubuntu/lexos-cybernetic-genesis
    nohup npm run preview > /var/log/lexos-frontend.log 2>&1 &
    
    # Wait for startup
    sleep 5
    
    if check_service $FRONTEND_PORT "Frontend"; then
        log_message "SUCCESS: Frontend restarted successfully"
        return 0
    else
        log_message "ERROR: Failed to restart frontend"
        return 1
    fi
}

# Function to check system resources
check_system_resources() {
    # Check memory usage
    local mem_usage=$(free | grep Mem | awk '{printf "%.0f", $3/$2 * 100.0}')
    if [ "$mem_usage" -gt 90 ]; then
        log_message "WARNING: High memory usage: ${mem_usage}%"
    fi
    
    # Check disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        log_message "WARNING: High disk usage: ${disk_usage}%"
    fi
    
    # Check load average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | sed 's/,//')
    local cpu_cores=$(nproc)
    local load_threshold=$((cpu_cores * 2))
    
    if (( $(echo "$load_avg > $load_threshold" | bc -l) )); then
        log_message "WARNING: High load average: $load_avg (threshold: $load_threshold)"
    fi
}

# Function to cleanup old logs
cleanup_logs() {
    # Keep only last 7 days of logs
    find /var/log -name "lexos-*.log" -mtime +7 -delete 2>/dev/null || true
    
    # Rotate current log if it's too large (>100MB)
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0) -gt 104857600 ]; then
        mv "$LOG_FILE" "${LOG_FILE}.old"
        touch "$LOG_FILE"
        log_message "Log file rotated due to size"
    fi
}

# Main monitoring loop
main_loop() {
    local backend_restart_count=0
    local frontend_restart_count=0
    local last_restart_time=0
    
    log_message "LexOS Auto-Healer started (PID: $$)"
    
    while true; do
        current_time=$(date +%s)
        
        # Reset restart counters if enough time has passed
        if [ $((current_time - last_restart_time)) -gt $RESTART_WINDOW ]; then
            backend_restart_count=0
            frontend_restart_count=0
        fi
        
        # Check backend
        if ! check_backend_health; then
            if [ $backend_restart_count -lt $MAX_RESTARTS ]; then
                restart_backend
                backend_restart_count=$((backend_restart_count + 1))
                last_restart_time=$current_time
            else
                log_message "ERROR: Backend restart limit reached ($MAX_RESTARTS). Manual intervention required."
            fi
        fi
        
        # Check frontend
        if ! check_service $FRONTEND_PORT "Frontend"; then
            if [ $frontend_restart_count -lt $MAX_RESTARTS ]; then
                restart_frontend
                frontend_restart_count=$((frontend_restart_count + 1))
                last_restart_time=$current_time
            else
                log_message "ERROR: Frontend restart limit reached ($MAX_RESTARTS). Manual intervention required."
            fi
        fi
        
        # Check system resources
        check_system_resources
        
        # Cleanup old logs (once per hour)
        if [ $((current_time % 3600)) -eq 0 ]; then
            cleanup_logs
        fi
        
        # Wait before next check
        sleep 30
    done
}

# Signal handlers
cleanup() {
    log_message "Auto-healer shutting down..."
    rm -f "$PID_FILE"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Check if already running
if [ -f "$PID_FILE" ]; then
    old_pid=$(cat "$PID_FILE")
    if kill -0 "$old_pid" 2>/dev/null; then
        echo "Auto-healer already running (PID: $old_pid)"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

# Save PID
echo $$ > "$PID_FILE"

# Start main loop
main_loop
