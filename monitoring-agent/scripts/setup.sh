#!/bin/bash

# LexOS Monitoring Agent Setup Script

set -e

echo "🚀 LexOS Monitoring Agent Setup"
echo "================================"

# Check if running as root for systemd setup
if [ "$EUID" -eq 0 ]; then 
   echo "✓ Running as root, systemd service will be installed"
   INSTALL_SYSTEMD=true
else
   echo "⚠️  Not running as root, skipping systemd service installation"
   echo "   Run with sudo to install systemd service"
   INSTALL_SYSTEMD=false
fi

# Install Node.js dependencies
echo ""
echo "📦 Installing Node.js dependencies..."
npm install

# Create required directories
echo ""
echo "📁 Creating directories..."
mkdir -p logs metrics

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo ""
    echo "🔧 Creating .env file..."
    cat > .env << EOL
# LexOS Monitoring Agent Environment Variables

# Agent Configuration
MONITORING_PORT=4000
MONITORING_HOST=0.0.0.0
MONITORING_USERNAME=admin
MONITORING_PASSWORD=changeme

# Email Configuration (optional)
SMTP_USER=
SMTP_PASS=

# Database Credentials
DB_USER=postgres
DB_PASSWORD=postgres

# Log Level
LOG_LEVEL=info
EOL
    echo "✓ Created .env file - Please update with your settings"
fi

# Install systemd service if running as root
if [ "$INSTALL_SYSTEMD" = true ]; then
    echo ""
    echo "🔧 Installing systemd service..."
    
    # Copy service file
    cp lexos-monitoring.service /etc/systemd/system/
    
    # Reload systemd
    systemctl daemon-reload
    
    # Enable service
    systemctl enable lexos-monitoring.service
    
    echo "✓ Systemd service installed"
    echo ""
    echo "📝 Service commands:"
    echo "   Start:   sudo systemctl start lexos-monitoring"
    echo "   Stop:    sudo systemctl stop lexos-monitoring"
    echo "   Status:  sudo systemctl status lexos-monitoring"
    echo "   Logs:    sudo journalctl -u lexos-monitoring -f"
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Update the configuration in config/default.yaml"
echo "2. Update environment variables in .env"
echo "3. Start the monitoring agent:"
if [ "$INSTALL_SYSTEMD" = true ]; then
    echo "   sudo systemctl start lexos-monitoring"
else
    echo "   npm start"
fi
echo "4. Access the dashboard at http://localhost:4000/dashboard"
echo ""
echo "Default credentials: admin / changeme"