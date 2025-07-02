#!/bin/bash

# LexOS Genesis Health Check Script
# Comprehensive health monitoring for all services

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LEXOS_HOME="$(dirname "$SCRIPT_DIR")"

# Service endpoints
BACKEND_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:3000"
MONITORING_URL="http://localhost:4000"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Health status
OVERALL_HEALTH="HEALTHY"
declare -A HEALTH_CHECKS

# Functions
check_endpoint() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}
    
    echo -ne "Checking $name... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [[ "$response" == "$expected_code" ]]; then
        echo -e "${GREEN}✓ OK${NC}"
        HEALTH_CHECKS["$name"]="OK"
        return 0
    else
        echo -e "${RED}✗ FAILED (HTTP $response)${NC}"
        HEALTH_CHECKS["$name"]="FAILED"
        OVERALL_HEALTH="UNHEALTHY"
        return 1
    fi
}

check_service_health() {
    local name=$1
    local health_url=$2
    
    echo -ne "Checking $name health... "
    
    health_response=$(curl -sf "$health_url" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        # Try to parse JSON response
        if command -v jq &> /dev/null && [[ ! -z "$health_response" ]]; then
            status=$(echo "$health_response" | jq -r '.status // .health // "unknown"' 2>/dev/null)
            if [[ "$status" == "ok" ]] || [[ "$status" == "healthy" ]] || [[ "$status" == "OK" ]]; then
                echo -e "${GREEN}✓ HEALTHY${NC}"
                HEALTH_CHECKS["${name}_health"]="HEALTHY"
                return 0
            else
                echo -e "${YELLOW}⚠ $status${NC}"
                HEALTH_CHECKS["${name}_health"]="WARNING"
                return 1
            fi
        else
            echo -e "${GREEN}✓ RESPONDING${NC}"
            HEALTH_CHECKS["${name}_health"]="OK"
            return 0
        fi
    else
        echo -e "${RED}✗ UNREACHABLE${NC}"
        HEALTH_CHECKS["${name}_health"]="FAILED"
        OVERALL_HEALTH="UNHEALTHY"
        return 1
    fi
}

check_process() {
    local name=$1
    local process_pattern=$2
    
    echo -ne "Checking $name process... "
    
    if pgrep -f "$process_pattern" > /dev/null; then
        pid=$(pgrep -f "$process_pattern" | head -1)
        echo -e "${GREEN}✓ RUNNING (PID: $pid)${NC}"
        HEALTH_CHECKS["${name}_process"]="RUNNING"
        return 0
    else
        echo -e "${RED}✗ NOT RUNNING${NC}"
        HEALTH_CHECKS["${name}_process"]="STOPPED"
        OVERALL_HEALTH="UNHEALTHY"
        return 1
    fi
}

check_port_listening() {
    local name=$1
    local port=$2
    
    echo -ne "Checking $name port $port... "
    
    if netstat -tuln 2>/dev/null | grep -q ":$port "; then
        echo -e "${GREEN}✓ LISTENING${NC}"
        HEALTH_CHECKS["${name}_port"]="OPEN"
        return 0
    else
        echo -e "${RED}✗ CLOSED${NC}"
        HEALTH_CHECKS["${name}_port"]="CLOSED"
        OVERALL_HEALTH="UNHEALTHY"
        return 1
    fi
}

check_database() {
    echo -ne "Checking database... "
    
    if [[ -f "$LEXOS_HOME/backend/data/lexos.db" ]]; then
        size=$(du -h "$LEXOS_HOME/backend/data/lexos.db" | cut -f1)
        echo -e "${GREEN}✓ SQLite OK (${size})${NC}"
        HEALTH_CHECKS["database"]="OK"
        return 0
    else
        echo -e "${RED}✗ NOT FOUND${NC}"
        HEALTH_CHECKS["database"]="MISSING"
        OVERALL_HEALTH="UNHEALTHY"
        return 1
    fi
}

check_disk_space() {
    echo -ne "Checking disk space... "
    
    available=$(df -BG "$LEXOS_HOME" | awk 'NR==2 {print $4}' | sed 's/G//')
    used_percent=$(df "$LEXOS_HOME" | awk 'NR==2 {print $5}' | sed 's/%//')
    
    if [[ $available -lt 1 ]]; then
        echo -e "${RED}✗ CRITICAL (${available}GB free)${NC}"
        HEALTH_CHECKS["disk_space"]="CRITICAL"
        OVERALL_HEALTH="UNHEALTHY"
        return 1
    elif [[ $used_percent -gt 90 ]]; then
        echo -e "${YELLOW}⚠ WARNING (${available}GB free, ${used_percent}% used)${NC}"
        HEALTH_CHECKS["disk_space"]="WARNING"
        return 1
    else
        echo -e "${GREEN}✓ OK (${available}GB free, ${used_percent}% used)${NC}"
        HEALTH_CHECKS["disk_space"]="OK"
        return 0
    fi
}

check_memory() {
    echo -ne "Checking memory... "
    
    mem_available=$(free -m | awk 'NR==2{print $7}')
    mem_total=$(free -m | awk 'NR==2{print $2}')
    mem_percent=$((100 - (mem_available * 100 / mem_total)))
    
    if [[ $mem_percent -gt 90 ]]; then
        echo -e "${RED}✗ CRITICAL (${mem_percent}% used)${NC}"
        HEALTH_CHECKS["memory"]="CRITICAL"
        OVERALL_HEALTH="UNHEALTHY"
        return 1
    elif [[ $mem_percent -gt 80 ]]; then
        echo -e "${YELLOW}⚠ WARNING (${mem_percent}% used)${NC}"
        HEALTH_CHECKS["memory"]="WARNING"
        return 1
    else
        echo -e "${GREEN}✓ OK (${mem_percent}% used)${NC}"
        HEALTH_CHECKS["memory"]="OK"
        return 0
    fi
}

perform_api_test() {
    echo -ne "Testing API authentication... "
    
    # Try to get auth status
    auth_test=$(curl -sf "$BACKEND_URL/api/auth/status" 2>/dev/null)
    
    if [[ $? -eq 0 ]]; then
        echo -e "${GREEN}✓ WORKING${NC}"
        HEALTH_CHECKS["api_auth"]="OK"
        return 0
    else
        echo -e "${YELLOW}⚠ NEEDS AUTH${NC}"
        HEALTH_CHECKS["api_auth"]="AUTH_REQUIRED"
        return 1
    fi
}

# Main health check
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              LexOS Genesis Health Check                       ║${NC}"
echo -e "${CYAN}║                 $(date +'%Y-%m-%d %H:%M:%S')                        ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
echo

# System checks
echo -e "${BLUE}System Health:${NC}"
check_disk_space
check_memory
echo

# Service checks
echo -e "${BLUE}Service Status:${NC}"
check_port_listening "Backend" 3001
check_port_listening "Frontend" 3000
check_port_listening "Monitoring" 4000
echo

# Process checks
echo -e "${BLUE}Process Status:${NC}"
check_process "Backend" "node.*backend.*index.js"
check_process "Frontend" "serve.*dist"
check_process "Monitoring" "node.*monitoring.*index.js"
echo

# Endpoint checks
echo -e "${BLUE}Endpoint Availability:${NC}"
check_endpoint "Frontend" "$FRONTEND_URL"
check_endpoint "Backend API" "$BACKEND_URL/api"
check_endpoint "Monitoring" "$MONITORING_URL"
echo

# Health endpoint checks
echo -e "${BLUE}Service Health:${NC}"
check_service_health "Backend" "$BACKEND_URL/health"
check_service_health "Monitoring" "$MONITORING_URL/health"
echo

# Additional checks
echo -e "${BLUE}Additional Checks:${NC}"
check_database
perform_api_test
echo

# Summary
echo -e "${CYAN}═══════════════════════════════════════════════════════════════${NC}"
if [[ "$OVERALL_HEALTH" == "HEALTHY" ]]; then
    echo -e "${GREEN}Overall Status: ✓ HEALTHY${NC}"
    echo -e "${GREEN}All systems operational!${NC}"
    exit 0
else
    echo -e "${RED}Overall Status: ✗ UNHEALTHY${NC}"
    echo -e "${RED}Some systems need attention!${NC}"
    
    # Show failed checks
    echo
    echo -e "${YELLOW}Failed checks:${NC}"
    for check in "${!HEALTH_CHECKS[@]}"; do
        if [[ "${HEALTH_CHECKS[$check]}" == "FAILED" ]] || [[ "${HEALTH_CHECKS[$check]}" == "CRITICAL" ]] || [[ "${HEALTH_CHECKS[$check]}" == "STOPPED" ]] || [[ "${HEALTH_CHECKS[$check]}" == "MISSING" ]] || [[ "${HEALTH_CHECKS[$check]}" == "CLOSED" ]]; then
            echo -e "  - ${RED}$check: ${HEALTH_CHECKS[$check]}${NC}"
        fi
    done
    
    echo
    echo -e "${YELLOW}Recommended actions:${NC}"
    echo "  1. Check service logs: tail -f $LEXOS_HOME/logs/*.log"
    echo "  2. Run status dashboard: $LEXOS_HOME/scripts/status.sh"
    echo "  3. Restart failed services: sudo systemctl restart lexos-*"
    
    exit 1
fi