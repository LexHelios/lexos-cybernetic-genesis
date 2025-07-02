#\!/bin/bash

# LexOS Quick Deploy Script
# This script sets up and deploys LexOS in production mode

set -e

echo "
╔═══════════════════════════════════════╗
║     LexOS Production Deployment       ║
╚═══════════════════════════════════════╝
"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[\!]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root\!"
   exit 1
fi

# Check system requirements
print_status "Checking system requirements..."

# Check Node.js
if \! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+"
    exit 1
fi

NODE_VERSION=$(node -v  < /dev/null |  cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    print_error "Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi
print_status "Node.js $(node -v) found"

# Check npm
if \! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi
print_status "npm $(npm -v) found"

# Create necessary directories
print_status "Creating directories..."
mkdir -p logs
mkdir -p /tmp/lexos
sudo mkdir -p /var/log/lexos
sudo chown $USER:$USER /var/log/lexos

# Install dependencies
print_status "Installing backend dependencies..."
cd backend-production
npm install --production
cd ..

print_status "Installing frontend dependencies..."
npm install

# Build frontend
print_status "Building frontend..."
npm run build

# Setup systemd services
print_status "Setting up systemd services..."
sudo cp lexos-backend.service /etc/systemd/system/
sudo cp lexos-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload

# Start services
print_status "Starting services..."
sudo systemctl enable lexos-backend lexos-frontend
sudo systemctl restart lexos-backend lexos-frontend

# Wait for services to start
sleep 5

# Check service status
if systemctl is-active --quiet lexos-backend; then
    print_status "Backend service is running"
else
    print_error "Backend service failed to start"
    sudo journalctl -u lexos-backend -n 50
fi

if systemctl is-active --quiet lexos-frontend; then
    print_status "Frontend service is running"
else
    print_error "Frontend service failed to start"
    sudo journalctl -u lexos-frontend -n 50
fi

# Display status
echo "
╔═══════════════════════════════════════╗
║        Deployment Complete\! 🎉        ║
╚═══════════════════════════════════════╝

Your LexOS instance is now running\!

🌐 Access Points:
   - Web Interface: http://lexcommand.ai
   - API Endpoint: http://lexcommand.ai/api
   - Health Check: http://lexcommand.ai/health

📊 Monitor Services:
   - Backend logs: sudo journalctl -u lexos-backend -f
   - Frontend logs: sudo journalctl -u lexos-frontend -f

🔧 Useful Commands:
   - Restart: sudo systemctl restart lexos-backend lexos-frontend
   - Stop: sudo systemctl stop lexos-backend lexos-frontend

"

print_status "Deployment completed successfully\!"
