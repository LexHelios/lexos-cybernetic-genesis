
#!/bin/bash

# Enhanced System Monitor for LexOS
# Monitors and maintains system health with auto-recovery

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEXOS_HOME="$(dirname "$SCRIPT_DIR")"
LOG_DIR="$LEXOS_HOME/logs"
PID_DIR="$LEXOS_HOME/pids"
MONITOR_LOG="$LOG_DIR/system-monitor.log"
CHECK_INTERVAL=15
HEALTH_CHECK_TIMEOUT=10
MAX_RESTART_ATTEMPTS=3
ALERT_THRESHOLD=5

# Service configuration
SERVICES=(
    "frontend:3000:$LEXOS_HOME:npm start"
    "backend:5000:$LEXOS_HOME/backend:python3 app.py"
)

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR"

# Logging functions
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$MONITOR_LOG"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$MONITOR_LOG"
}

log_success() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" | tee -a "$MONITOR_LOG"
}

# Health check functions
check_service_health() {
    local service_name=$1
    local port=$2
    
    # Check if process is running
    if ! lsof -i:$port > /dev/null 2>&1; then
        return 1
    fi
    
    # Check HTTP health endpoint
    if [[ "$service_name" == "backend" ]]; then
        if ! curl -sf --max-time $HEALTH_CHECK_TIMEOUT "http://localhost:$port/api/health" > /dev/null; then
            return 1
        fi
    elif [[ "$service_name" == "frontend" ]]; then
        if ! curl -sf --max-time $HEALTH_CHECK_TIMEOUT "http://localhost:$port" > /dev/null; then
            return 1
        fi
    fi
    
    return 0
}

# Service management functions
start_service() {
    local service_name=$1
    local port=$2
    local work_dir=$3
    local start_cmd=$4
    
    log "Starting $service_name service..."
    
    # Kill any existing process on the port
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    
    # Start the service
    cd "$work_dir"
    nohup $start_cmd > "$LOG_DIR/$service_name.log" 2>&1 &
    local pid=$!
    echo $pid > "$PID_DIR/$service_name.pid"
    
    # Wait for service to be ready
    local retry_count=0
    while [[ $retry_count -lt 30 ]]; do
        if check_service_health "$service_name" "$port"; then
            log_success "$service_name started successfully (PID: $pid)"
            return 0
        fi
        sleep 2
        retry_count=$((retry_count + 1))
    done
    
    log_error "Failed to start $service_name"
    return 1
}

restart_service() {
    local service_name=$1
    local port=$2
    local work_dir=$3
    local start_cmd=$4
    
    log "Restarting $service_name service..."
    
    # Stop the service gracefully
    if [[ -f "$PID_DIR/$service_name.pid" ]]; then
        local pid=$(cat "$PID_DIR/$service_name.pid")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid" 2>/dev/null || true
            sleep 5
            kill -KILL "$pid" 2>/dev/null || true
        fi
        rm -f "$PID_DIR/$service_name.pid"
    fi
    
    # Force kill any process on the port
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
    
    # Start the service
    start_service "$service_name" "$port" "$work_dir" "$start_cmd"
}

# Auto-recovery function
recover_system() {
    log "Initiating system recovery..."
    
    # Check disk space
    local disk_usage=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
    if [[ $disk_usage -gt 90 ]]; then
        log "Cleaning up disk space (${disk_usage}% used)..."
        find "$LOG_DIR" -name "*.log" -type f -mtime +7 -delete
        find /tmp -type f -mtime +1 -delete 2>/dev/null || true
    fi
    
    # Check memory usage
    local mem_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
    if [[ $mem_usage -gt 90 ]]; then
        log "High memory usage detected (${mem_usage}%), clearing caches..."
        sync && echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
    fi
    
    # Restart all services
    for service in "${SERVICES[@]}"; do
        IFS=':' read -r name port work_dir start_cmd <<< "$service"
        restart_service "$name" "$port" "$work_dir" "$start_cmd"
    done
    
    log_success "System recovery completed"
}

# Main monitoring loop
monitor_system() {
    local restart_attempts=()
    
    log "Starting enhanced system monitoring..."
    
    while true; do
        local unhealthy_services=0
        
        for service in "${SERVICES[@]}"; do
            IFS=':' read -r name port work_dir start_cmd <<< "$service"
            
            if ! check_service_health "$name" "$port"; then
                log_error "$name service is unhealthy"
                unhealthy_services=$((unhealthy_services + 1))
                
                # Track restart attempts
                local current_attempts=${restart_attempts[$name]:-0}
                
                if [[ $current_attempts -lt $MAX_RESTART_ATTEMPTS ]]; then
                    restart_service "$name" "$port" "$work_dir" "$start_cmd"
                    restart_attempts[$name]=$((current_attempts + 1))
                else
                    log_error "$name has exceeded max restart attempts"
                fi
            else
                # Reset restart attempts on success
                restart_attempts[$name]=0
            fi
        done
        
        # Full system recovery if too many services are unhealthy
        if [[ $unhealthy_services -ge $ALERT_THRESHOLD ]]; then
            log_error "Multiple services unhealthy, initiating full recovery..."
            recover_system
            # Clear restart attempts after full recovery
            restart_attempts=()
        fi
        
        # Log system status
        if [[ $unhealthy_services -eq 0 ]]; then
            log "All services healthy"
        fi
        
        sleep $CHECK_INTERVAL
    done
}

# Signal handlers
cleanup() {
    log "System monitor shutting down..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Main execution
case "${1:-monitor}" in
    "monitor")
        monitor_system
        ;;
    "recover")
        recover_system
        ;;
    "start")
        for service in "${SERVICES[@]}"; do
            IFS=':' read -r name port work_dir start_cmd <<< "$service"
            start_service "$name" "$port" "$work_dir" "$start_cmd"
        done
        ;;
    "stop")
        for service in "${SERVICES[@]}"; do
            IFS=':' read -r name port work_dir start_cmd <<< "$service"
            if [[ -f "$PID_DIR/$name.pid" ]]; then
                kill -TERM "$(cat "$PID_DIR/$name.pid")" 2>/dev/null || true
                rm -f "$PID_DIR/$name.pid"
            fi
        done
        ;;
    *)
        echo "Usage: $0 {monitor|recover|start|stop}"
        exit 1
        ;;
esac
