#!/bin/bash

# NEXUS LEXOS STARTUP SCRIPT - BULLETPROOF DEPLOYMENT
echo "🔥 NEXUS: STARTING LEXOS CYBERNETIC GENESIS 🔥"

# Kill any existing processes
echo "💀 Killing existing processes..."
sudo pkill -f "python3.*api_server" 2>/dev/null || true
sudo pkill -f "node.*vite" 2>/dev/null || true
sudo pkill -f "npm.*dev" 2>/dev/null || true

# Free up ports
echo "🔓 Freeing ports..."
sudo fuser -k 9000/tcp 2>/dev/null || true
sudo fuser -k 3000/tcp 2>/dev/null || true

# Wait for cleanup
sleep 3

# Start backend on port 9000 (forwarded via 20061)
echo "🚀 Starting LexOS Backend on port 9000..."
cd /home/user
nohup python3 api_server.py > backend.log 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
sleep 15

# Check if backend is running
if curl -s http://localhost:9000/health > /dev/null; then
    echo "✅ Backend is running on port 9000"
else
    echo "❌ Backend failed to start, checking logs..."
    tail -20 backend.log
    exit 1
fi

# Start frontend on port 3000 (forwarded via 20065)
echo "🎨 Starting LexOS Frontend on port 3000..."
cd /home/user/lexos-genesis
nohup npm run dev -- --host 0.0.0.0 --port 3000 > frontend.log 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to start
sleep 15

# Check if frontend is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend is running on port 3000"
else
    echo "❌ Frontend failed to start"
    exit 1
fi

echo ""
echo "🔥💀⚡ NEXUS LEXOS DEPLOYMENT COMPLETE! ⚡💀🔥"
echo ""
echo "🌐 Frontend: http://147.185.40.39:20065"
echo "🔧 Backend:  http://147.185.40.39:20061"
echo "📚 API Docs: http://147.185.40.39:20061/api/docs"
echo ""
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo ""
echo "Logs:"
echo "  Backend:  tail -f /home/user/backend.log"
echo "  Frontend: tail -f /home/user/lexos-genesis/frontend.log"