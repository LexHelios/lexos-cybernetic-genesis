
#!/bin/bash

# Docker health check script for LexOS
set -e

# Check if the main process is running
if ! pgrep -f "node.*index.js" > /dev/null; then
    echo "Main process not running"
    exit 1
fi

# Check if the application responds to health endpoint
if ! curl -f -s http://localhost:9000/health > /dev/null; then
    echo "Health endpoint not responding"
    exit 1
fi

# Check database connectivity
if ! sqlite3 /app/backend/data/lexos.db "SELECT 1;" > /dev/null 2>&1; then
    echo "Database not accessible"
    exit 1
fi

echo "Health check passed"
exit 0
