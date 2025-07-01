#!/bin/bash

echo "🚀 Starting LexOS Backend Server..."
echo ""

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Start the server
echo "🔧 Starting Express server on port 9000..."
echo "📡 API endpoints will be available at http://localhost:9000"
echo ""

# Run the server with npm start
npm start