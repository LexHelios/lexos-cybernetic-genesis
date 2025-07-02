#!/bin/bash

# Simple startup script without auto-healer complications

echo "Starting LexOS Genesis (Simple Mode)..."

# Kill any existing processes
pm2 kill 2>/dev/null
pkill -f "node.*index.js" 2>/dev/null
pkill -f "npm.*dev" 2>/dev/null

# Start backend
cd backend
echo "Starting backend..."
NODE_ENV=development PORT=9000 pm2 start src/index.js --name lexos-backend --time

# Start frontend
cd ..
echo "Starting frontend..."
PORT=8080 pm2 start npm --name lexos-frontend -- run dev

# Show status
sleep 5
pm2 status

echo "Services started!"
echo "Backend: http://localhost:9000"
echo "Frontend: http://localhost:8080"