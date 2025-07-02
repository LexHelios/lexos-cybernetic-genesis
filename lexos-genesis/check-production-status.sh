#!/bin/bash

echo "🔍 LexOS Genesis Production Status Check"
echo "========================================"
echo ""

# Get IPs
EXTERNAL_IP=$(curl -s ifconfig.me)
INTERNAL_IP=$(hostname -I | awk '{print $1}')

echo "📡 Access Points:"
echo "  External: http://$EXTERNAL_IP"
echo "  Internal: http://$INTERNAL_IP"
echo ""

echo "🔧 Service Status:"
pm2 status

echo ""
echo "🌐 Nginx Status:"
sudo systemctl status nginx --no-pager | head -10

echo ""
echo "🤖 Agent Status:"
curl -s http://localhost:3001/api/enhanced-agents/status | jq '.totalAgents, .readyAgents'

echo ""
echo "📊 Port Status:"
sudo netstat -tlnp | grep -E ':(80|443|3001|8080|11434) '
