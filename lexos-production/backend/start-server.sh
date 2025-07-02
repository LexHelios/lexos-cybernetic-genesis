#!/bin/bash

echo "🚀 Starting LexOS Backend Server..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "Please install Node.js 18+ and try again"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Create logs directory
mkdir -p logs

# Start the server
echo "🌟 Starting backend on port 9000..."
echo "🔗 Frontend should connect to: http://localhost:9000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

npm start
