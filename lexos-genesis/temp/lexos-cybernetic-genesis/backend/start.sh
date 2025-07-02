#!/bin/bash

echo "🚀 Starting LexOS Genesis Backend Agent Executor..."
echo ""

# Check if Ollama is running
echo "Checking Ollama status..."
if curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "✅ Ollama is running"
    
    # List available models
    echo ""
    echo "Available models:"
    curl -s http://localhost:11434/api/tags | jq -r '.models[].name' 2>/dev/null || echo "Could not list models"
else
    echo "❌ Ollama is not running!"
    echo ""
    echo "Please start Ollama first:"
    echo "  ollama serve"
    echo ""
    echo "Then pull a model (if you haven't already):"
    echo "  ollama pull llama3.2"
    exit 1
fi

echo ""
echo "Installing dependencies..."
npm install

echo ""
echo "Starting backend server..."
echo "Server will be available at: http://localhost:3001"
echo "WebSocket available at: ws://localhost:3001"
echo ""

# Start the server
npm start