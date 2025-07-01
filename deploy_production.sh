#!/bin/bash

echo "🚀 Deploying LexOS to Production..."

# Stop existing services
echo "Stopping existing services..."
sudo systemctl stop lexos-backend lexos-frontend 2>/dev/null || true
pkill -f "python3.*api_server" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true

# Copy service files
echo "Installing systemd services..."
sudo cp /home/user/lexos-backend.service /etc/systemd/system/
sudo cp /home/user/lexos-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start services
echo "Starting services..."
sudo systemctl enable lexos-backend lexos-frontend
sudo systemctl start lexos-backend
sleep 5
sudo systemctl start lexos-frontend

# Check status
echo "Checking service status..."
sudo systemctl status lexos-backend --no-pager
sudo systemctl status lexos-frontend --no-pager

echo ""
echo "✅ Production deployment complete!"
echo ""
echo "🌐 Frontend: http://147.185.40.39:20065"
echo "🔧 Backend:  http://147.185.40.39:20061"
echo "📚 API Docs: http://147.185.40.39:20061/api/docs"
echo ""
echo "Logs:"
echo "  sudo journalctl -u lexos-backend -f"
echo "  sudo journalctl -u lexos-frontend -f"