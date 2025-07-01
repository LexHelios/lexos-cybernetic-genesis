#!/bin/bash

echo "🚀 STARTING LEXOS BACKEND - FULL POWER MODE"

# Kill EVERYTHING
echo "🔪 Killing any existing backends..."
pkill -f "node.*backend" 2>/dev/null
pkill -f "node.*3001" 2>/dev/null
pkill -f "node.*9000" 2>/dev/null
sleep 2

# Setup
echo "📁 Creating directories..."
mkdir -p data logs public
chmod -R 755 data logs public

# Create fresh databases
echo "💾 Setting up databases..."
rm -f data/*.db-journal data/*.db-wal data/*.db-shm 2>/dev/null
touch data/lexos.db data/analytics.db
chmod 666 data/*.db

# Create .env if missing
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
PORT=3001
NODE_ENV=production
APP_VERSION=2.1.0
FRONTEND_URL=http://localhost:5173
DATABASE_PATH=./data/lexos.db
ANALYTICS_DB_PATH=./data/analytics.db
JWT_SECRET=demo-secret-change-in-production
LOG_LEVEL=info
LOG_DIR=./logs
EOF
fi

# Clear old logs
echo "🧹 Clearing old logs..."
> logs/backend.log
> logs/backend-error.log

# Start backend
echo "🎯 Starting backend on port 3001..."
nohup node src/index.js > logs/backend.log 2> logs/backend-error.log &
BACKEND_PID=$!

echo "⏳ Waiting for backend to start..."
sleep 3

# Check if it's running
if kill -0 $BACKEND_PID 2>/dev/null; then
    echo "✅ Backend is running! (PID: $BACKEND_PID)"
    echo ""
    echo "🔗 Access points:"
    echo "   Health: http://localhost:3001/health"
    echo "   Status: http://localhost:3001/api/system/status"
    echo "   Agents: http://localhost:3001/api/agents"
    echo ""
    echo "📊 Testing health endpoint..."
    curl -s http://localhost:3001/health || echo "⚠️  Health check pending..."
    echo ""
    echo "✨ Backend is ready for your demo!"
    echo "📝 Logs: tail -f logs/backend.log"
else
    echo "❌ Backend failed to start!"
    echo "🔍 Last errors:"
    tail -20 logs/backend-error.log
    exit 1
fi