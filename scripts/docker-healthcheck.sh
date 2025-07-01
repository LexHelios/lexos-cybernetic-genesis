
#!/bin/bash

# Docker health check script for LexOS Genesis
set -e

# Function to check HTTP endpoint
check_endpoint() {
    local url=$1
    local timeout=${2:-10}
    
    if command -v curl >/dev/null 2>&1; then
        curl -f --max-time "$timeout" --silent "$url" >/dev/null
    elif command -v wget >/dev/null 2>&1; then
        wget --timeout="$timeout" --quiet --spider "$url"
    else
        echo "Neither curl nor wget available for health check"
        exit 1
    fi
}

# Determine the correct port based on environment
PORT=${PORT:-3001}
if [ "$NODE_ENV" = "production" ]; then
    PORT=3001
else
    PORT=${PORT:-9000}
fi

# Check if the main process is running
if ! pgrep -f "node.*index.js" > /dev/null; then
    echo "Main process not running"
    exit 1
fi

# Check main health endpoint
echo "Checking health endpoint on port $PORT..."
check_endpoint "http://localhost:$PORT/health" 10

# Check database connectivity (PostgreSQL in production)
if [ "$NODE_ENV" = "production" ] && [ -n "$DATABASE_HOST" ]; then
    echo "Checking PostgreSQL connectivity..."
    # In production, we would check PostgreSQL connection
    # For now, just verify the health endpoint includes DB status
    if ! curl -f -s "http://localhost:$PORT/api/system/status" | grep -q "healthy"; then
        echo "Database health check failed"
        exit 1
    fi
else
    # Development mode - check SQLite
    if [ -f "/app/backend/data/lexos.db" ]; then
        if command -v sqlite3 >/dev/null 2>&1; then
            if ! sqlite3 /app/backend/data/lexos.db "SELECT 1;" > /dev/null 2>&1; then
                echo "SQLite database not accessible"
                exit 1
            fi
        fi
    fi
fi

# Check Redis connectivity (if configured)
if [ -n "$REDIS_HOST" ]; then
    echo "Checking Redis connectivity..."
    # This would require redis-cli in production
    # For now, simplified check
    echo "Redis check skipped (requires redis-cli)"
fi

# Check system resources
echo "Checking system resources..."
# Check available memory (basic check)
if [ -f /proc/meminfo ]; then
    available_mem=$(grep MemAvailable /proc/meminfo | awk '{print $2}' 2>/dev/null || echo "0")
    if [ "$available_mem" -lt 100000 ] && [ "$available_mem" -gt 0 ]; then
        echo "Warning: Low memory available: ${available_mem}KB"
    fi
fi

# Check disk space
if command -v df >/dev/null 2>&1; then
    disk_usage=$(df / 2>/dev/null | tail -1 | awk '{print $5}' | sed 's/%//' || echo "0")
    if [ "$disk_usage" -gt 90 ] && [ "$disk_usage" -gt 0 ]; then
        echo "Warning: High disk usage: ${disk_usage}%"
    fi
fi

echo "Health check passed successfully"
exit 0
