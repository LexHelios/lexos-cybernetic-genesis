#!/bin/bash

# LexOS Genesis Status Dashboard
# Real-time monitoring of all services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# Service ports
BACKEND_PORT=3001
AUTH_PORT=9000
MONITORING_PORT=4000
FRONTEND_PORT=3000

# Clear screen for dashboard
clear

show_header() {
    echo -e "${MAGENTA}"
    echo "╔═══════════════════════════════════════════════════════════════╗"
    echo "║              LexOS Genesis Status Dashboard                   ║"
    echo "║                    $(date +'%Y-%m-%d %H:%M:%S')                      ║"
    echo "╚═══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

check_service_systemd() {
    local service_name=$1
    if systemctl is-active --quiet "$service_name"; then
        echo -e "${GREEN}● Running${NC}"
    else
        echo -e "${RED}● Stopped${NC}"
    fi
}

check_port() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}● Open${NC}"
    else
        echo -e "${RED}● Closed${NC}"
    fi
}

get_service_uptime() {
    local service_name=$1
    if systemctl is-active --quiet "$service_name"; then
        systemctl show "$service_name" --property=ActiveEnterTimestamp | cut -d'=' -f2
    else
        echo "N/A"
    fi
}

get_service_memory() {
    local service_name=$1
    if systemctl is-active --quiet "$service_name"; then
        local pid=$(systemctl show -p MainPID --value "$service_name")
        if [[ $pid -ne 0 ]]; then
            ps -p "$pid" -o rss= | awk '{printf "%.1f MB", $1/1024}'
        else
            echo "N/A"
        fi
    else
        echo "N/A"
    fi
}

check_database() {
    if command -v psql &> /dev/null && sudo -u postgres psql -c "SELECT 1;" &> /dev/null; then
        echo -e "${GREEN}● PostgreSQL${NC}"
    elif [[ -f /home/user/lexos-genesis/backend/data/lexos.db ]]; then
        echo -e "${GREEN}● SQLite${NC}"
    else
        echo -e "${RED}● Not found${NC}"
    fi
}

check_redis() {
    if command -v redis-cli &> /dev/null && redis-cli ping &> /dev/null; then
        echo -e "${GREEN}● Connected${NC}"
    else
        echo -e "${YELLOW}● Not available${NC}"
    fi
}

show_system_resources() {
    echo -e "${CYAN}═══ System Resources ═══════════════════════════════════════════${NC}"
    
    # CPU Usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    echo -e "CPU Usage:        ${cpu_usage}%"
    
    # Memory Usage
    local mem_info=$(free -m | awk 'NR==2{printf "%.1f", $3*100/$2}')
    local mem_total=$(free -h | awk 'NR==2{print $2}')
    local mem_used=$(free -h | awk 'NR==2{print $3}')
    echo -e "Memory Usage:     ${mem_info}% (${mem_used}/${mem_total})"
    
    # Disk Usage
    local disk_usage=$(df -h /home/user/lexos-genesis | awk 'NR==2{print $5}')
    local disk_avail=$(df -h /home/user/lexos-genesis | awk 'NR==2{print $4}')
    echo -e "Disk Usage:       ${disk_usage} (${disk_avail} available)"
    
    # Load Average
    local load_avg=$(uptime | awk -F'load average:' '{print $2}')
    echo -e "Load Average:    ${load_avg}"
}

show_services() {
    echo -e "${CYAN}═══ Service Status ═════════════════════════════════════════════${NC}"
    
    # Backend
    echo -ne "Backend API:      "
    check_service_systemd "lexos-backend"
    echo -ne "  Port $BACKEND_PORT:      "
    check_port $BACKEND_PORT
    echo -e "  Memory:         $(get_service_memory lexos-backend)"
    
    # Frontend
    echo -ne "Frontend:         "
    check_service_systemd "lexos-frontend"
    echo -ne "  Port $FRONTEND_PORT:     "
    check_port $FRONTEND_PORT
    echo -e "  Memory:         $(get_service_memory lexos-frontend)"
    
    # Monitoring
    echo -ne "Monitoring:       "
    check_service_systemd "lexos-monitoring"
    echo -ne "  Port $MONITORING_PORT:     "
    check_port $MONITORING_PORT
    echo -e "  Memory:         $(get_service_memory lexos-monitoring)"
    
    # Database
    echo -ne "Database:         "
    check_database
    
    # Redis
    echo -ne "Redis Cache:      "
    check_redis
    
    # Nginx
    echo -ne "Nginx:            "
    check_service_systemd "nginx"
}

show_endpoints() {
    echo -e "${CYAN}═══ Service Endpoints ══════════════════════════════════════════${NC}"
    echo "Frontend:         http://localhost:$FRONTEND_PORT"
    echo "Backend API:      http://localhost:$BACKEND_PORT/api"
    echo "Monitoring:       http://localhost:$MONITORING_PORT"
    echo "WebSocket:        ws://localhost:$BACKEND_PORT/ws"
}

show_recent_logs() {
    echo -e "${CYAN}═══ Recent Log Activity ════════════════════════════════════════${NC}"
    
    # Check for errors in last 10 lines of each log
    for log_file in /home/user/lexos-genesis/logs/*.log; do
        if [[ -f "$log_file" ]]; then
            local log_name=$(basename "$log_file")
            local error_count=$(tail -n 50 "$log_file" 2>/dev/null | grep -i error | wc -l)
            if [[ $error_count -gt 0 ]]; then
                echo -e "${RED}● $log_name: $error_count errors in last 50 lines${NC}"
            else
                echo -e "${GREEN}● $log_name: No recent errors${NC}"
            fi
        fi
    done
}

show_health_checks() {
    echo -e "${CYAN}═══ Health Checks ══════════════════════════════════════════════${NC}"
    
    # Backend health
    echo -ne "Backend Health:   "
    if curl -sf http://localhost:$BACKEND_PORT/health &> /dev/null; then
        echo -e "${GREEN}● Healthy${NC}"
    else
        echo -e "${RED}● Unhealthy${NC}"
    fi
    
    # Frontend health
    echo -ne "Frontend Health:  "
    if curl -sf http://localhost:$FRONTEND_PORT &> /dev/null; then
        echo -e "${GREEN}● Healthy${NC}"
    else
        echo -e "${RED}● Unhealthy${NC}"
    fi
    
    # Monitoring health
    echo -ne "Monitoring Health: "
    if curl -sf http://localhost:$MONITORING_PORT/health &> /dev/null; then
        echo -e "${GREEN}● Healthy${NC}"
    else
        echo -e "${RED}● Unhealthy${NC}"
    fi
}

show_quick_actions() {
    echo -e "${CYAN}═══ Quick Actions ══════════════════════════════════════════════${NC}"
    echo "1. Restart all services:    sudo systemctl restart lexos-*"
    echo "2. View backend logs:       tail -f /home/user/lexos-genesis/logs/backend.log"
    echo "3. View frontend logs:      tail -f /home/user/lexos-genesis/logs/frontend.log"
    echo "4. View monitoring logs:    tail -f /home/user/lexos-genesis/logs/monitoring.log"
    echo "5. Run deployment:          /home/user/lexos-genesis/deploy-lexos.sh"
    echo "6. Create backup:           /home/user/lexos-genesis/scripts/backup.sh"
}

# Main dashboard loop
while true; do
    show_header
    show_system_resources
    echo
    show_services
    echo
    show_endpoints
    echo
    show_health_checks
    echo
    show_recent_logs
    echo
    show_quick_actions
    echo
    echo -e "${YELLOW}Press 'q' to quit, any other key to refresh...${NC}"
    
    # Read user input with timeout
    read -t 5 -n 1 key
    if [[ $key == "q" ]]; then
        echo -e "${GREEN}Exiting status dashboard...${NC}"
        exit 0
    fi
    
    clear
done