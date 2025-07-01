#!/bin/bash

# Autonomous Learning System Deployment Script

echo "🤖 Deploying Autonomous Learning System for AI Consciousness Development"
echo "=================================================================="

# Set up environment
cd /home/ubuntu/autonomous-learning-system
source venv/bin/activate

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys before running the system"
fi

# Create necessary directories
mkdir -p logs data/cache data/downloads

# Set permissions
chmod +x deploy.sh

echo "✅ System deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API keys (especially OPENAI_API_KEY)"
echo "2. Run: python -m src"
echo "3. For background operation: nohup python -m src > logs/system.log 2>&1 &"
echo ""
echo "🔗 Integration with lexos-cybernetic-genesis:"
echo "   Memory path: /home/ubuntu/lexos-cybernetic-genesis"
echo "   The system will automatically connect to existing memory"
echo ""
echo "🚀 The system provides:"
echo "   • 24/7 Web crawling with ethical compliance"
echo "   • RSS feed monitoring and analysis"
echo "   • API integration for knowledge gathering"
echo "   • Multi-modal media analysis"
echo "   • Self-learning curriculum development"
echo "   • Automated book reading and comprehension"
echo "   • Self-improvement research and upgrades"
echo "   • Twilio communication for updates"
echo ""
echo "📊 Monitor logs: tail -f logs/system.log"
