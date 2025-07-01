#!/bin/bash

# Kill any existing processes on our ports
pkill -f "node.*3001" 2>/dev/null
pkill -f "node.*9000" 2>/dev/null

# Wait a moment
sleep 1

# Create necessary directories
mkdir -p data logs public

# Fix permissions
chmod 755 data logs
touch data/lexos.db data/analytics.db
chmod 666 data/*.db

# Start the backend
echo "Starting LexOS Backend..."
PORT=3001 node src/index.js