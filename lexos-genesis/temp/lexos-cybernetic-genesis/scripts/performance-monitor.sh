
#!/bin/bash

# LexOS Performance Monitoring Script
# Monitors system performance and generates alerts

LOG_FILE="/var/log/lexos-performance.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90
ALERT_THRESHOLD_GPU=90

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to check CPU usage
check_cpu() {
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
    cpu_usage=${cpu_usage%.*}  # Remove decimal part
    
    if [ "$cpu_usage" -gt "$ALERT_THRESHOLD_CPU" ]; then
        log_message "ALERT: High CPU usage: ${cpu_usage}%"
        return 1
    else
        log_message "CPU usage: ${cpu_usage}%"
        return 0
    fi
}

# Function to check memory usage
check_memory() {
    local mem_info=$(free | grep Mem)
    local total=$(echo $mem_info | awk '{print $2}')
    local used=$(echo $mem_info | awk '{print $3}')
    local mem_usage=$((used * 100 / total))
    
    if [ "$mem_usage" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
        log_message "ALERT: High memory usage: ${mem_usage}%"
        return 1
    else
        log_message "Memory usage: ${mem_usage}%"
        return 0
    fi
}

# Function to check disk usage
check_disk() {
    local disk_usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$disk_usage" -gt "$ALERT_THRESHOLD_DISK" ]; then
        log_message "ALERT: High disk usage: ${disk_usage}%"
        return 1
    else
        log_message "Disk usage: ${disk_usage}%"
        return 0
    fi
}

# Function to check GPU usage (if nvidia-smi is available)
check_gpu() {
    if command -v nvidia-smi &> /dev/null; then
        local gpu_usage=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits | head -1)
        
        if [ "$gpu_usage" -gt "$ALERT_THRESHOLD_GPU" ]; then
            log_message "ALERT: High GPU usage: ${gpu_usage}%"
            return 1
        else
            log_message "GPU usage: ${gpu_usage}%"
            return 0
        fi
    else
        log_message "GPU monitoring not available (nvidia-smi not found)"
        return 0
    fi
}

# Function to check LexOS processes
check_lexos_processes() {
    local backend_pid=$(pgrep -f "lexos-backend" | head -1)
    local frontend_pid=$(pgrep -f "lexos-frontend" | head -1)
    
    if [ -z "$backend_pid" ]; then
        log_message "ALERT: LexOS backend process not running"
        return 1
    else
        log_message "LexOS backend running (PID: $backend_pid)"
    fi
    
    if [ -z "$frontend_pid" ]; then
        log_message "WARNING: LexOS frontend process not running"
    else
        log_message "LexOS frontend running (PID: $frontend_pid)"
    fi
    
    return 0
}

# Function to check network connectivity
check_network() {
    if curl -f -s http://localhost:9000/health > /dev/null; then
        log_message "Backend health check: OK"
        return 0
    else
        log_message "ALERT: Backend health check failed"
        return 1
    fi
}

# Function to generate performance report
generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="/var/log/lexos-performance-report-$(date +%Y%m%d).log"
    
    {
        echo "=== LexOS Performance Report - $timestamp ==="
        echo ""
        
        # System info
        echo "System Information:"
        echo "  Uptime: $(uptime -p)"
        echo "  Load Average: $(uptime | awk -F'load average:' '{print $2}')"
        echo ""
        
        # CPU info
        echo "CPU Information:"
        echo "  Cores: $(nproc)"
        echo "  Usage: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
        echo ""
        
        # Memory info
        echo "Memory Information:"
        free -h
        echo ""
        
        # Disk info
        echo "Disk Information:"
        df -h /
        echo ""
        
        # GPU info (if available)
        if command -v nvidia-smi &> /dev/null; then
            echo "GPU Information:"
            nvidia-smi --query-gpu=name,memory.total,memory.used,utilization.gpu,temperature.gpu --format=csv
            echo ""
        fi
        
        # Process info
        echo "LexOS Processes:"
        ps aux | grep -E "(lexos|node)" | grep -v grep
        echo ""
        
        # Network info
        echo "Network Status:"
        netstat -tuln | grep -E ":(9000|5173|11434)"
        echo ""
        
        echo "=== End Report ==="
        echo ""
    } >> "$report_file"
    
    log_message "Performance report generated: $report_file"
}

# Function to optimize system performance
optimize_performance() {
    log_message "Running performance optimizations..."
    
    # Clear system caches
    sync
    echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || sudo sysctl vm.drop_caches=3
    
    # Optimize TCP settings for better network performance
    echo 'net.core.rmem_max = 16777216' | sudo tee -a /etc/sysctl.conf > /dev/null
    echo 'net.core.wmem_max = 16777216' | sudo tee -a /etc/sysctl.conf > /dev/null
    echo 'net.ipv4.tcp_rmem = 4096 87380 16777216' | sudo tee -a /etc/sysctl.conf > /dev/null
    echo 'net.ipv4.tcp_wmem = 4096 65536 16777216' | sudo tee -a /etc/sysctl.conf > /dev/null
    
    # Apply sysctl settings
    sudo sysctl -p > /dev/null 2>&1
    
    log_message "Performance optimizations applied"
}

# Main monitoring loop
main_monitor() {
    log_message "Starting LexOS performance monitoring..."
    
    while true; do
        local alerts=0
        
        # Run all checks
        check_cpu || ((alerts++))
        check_memory || ((alerts++))
        check_disk || ((alerts++))
        check_gpu || ((alerts++))
        check_lexos_processes || ((alerts++))
        check_network || ((alerts++))
        
        # If there are alerts, run optimizations
        if [ "$alerts" -gt 0 ]; then
            log_message "Detected $alerts performance issues, running optimizations..."
            optimize_performance
        fi
        
        # Generate hourly reports
        local current_minute=$(date +%M)
        if [ "$current_minute" = "00" ]; then
            generate_report
        fi
        
        # Wait before next check
        sleep 60
    done
}

# Handle command line arguments
case "${1:-}" in
    "report")
        generate_report
        ;;
    "optimize")
        optimize_performance
        ;;
    "check")
        check_cpu
        check_memory
        check_disk
        check_gpu
        check_lexos_processes
        check_network
        ;;
    *)
        main_monitor
        ;;
esac
