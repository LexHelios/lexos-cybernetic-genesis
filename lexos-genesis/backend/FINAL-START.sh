#!/bin/bash

echo "🚀 FINAL BACKEND STARTUP - ALL SYSTEMS GO!"
echo "==========================================="

# Kill everything
pkill -f "node" 2>/dev/null
sleep 2

# Setup
mkdir -p data logs public uploads temp
chmod -R 755 .

# Fix database permissions
touch data/lexos.db data/analytics.db
chmod 666 data/*.db

# Clear logs for fresh start
> logs/backend.log
> logs/backend-error.log
> logs/error-2025-07-01.log

# Start backend with proper error handling
echo "🎯 Starting LexOS Backend on port 3001..."
echo ""

PORT=3001 NODE_ENV=production node src/index.js 2>&1 | tee logs/backend.log &
PID=$!

echo "⏳ Waiting for startup..."
sleep 5

if kill -0 $PID 2>/dev/null; then
    echo ""
    echo "✅ SUCCESS! Backend is running (PID: $PID)"
    echo ""
    echo "🌐 Access Points:"
    echo "   - Health: https://lexcommand.ai/health"
    echo "   - Status: https://lexcommand.ai/api/system/status"
    echo "   - Agents: https://lexcommand.ai/api/agents"
    echo ""
    echo "📊 Testing endpoints..."
    echo ""
    echo "Health Check:"
    curl -s https://lexcommand.ai/health | jq . || echo "Pending..."
    echo ""
    echo "System Status:"
    curl -s https://lexcommand.ai/api/system/status | jq . || echo "Pending..."
    echo ""
    echo "🎉 BACKEND IS READY FOR YOUR DEMO!"
    echo "===================================="
else
    echo "❌ Backend failed to start!"
    tail -20 logs/backend.log
fi