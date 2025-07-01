#!/bin/bash

# Lovable Deployment Setup Script
# Run this script after external access is working

set -e

echo "🚀 Setting up Lovable deployment configuration..."

# Configuration
LOVABLE_DOMAIN="your-lovable-domain.com"  # Replace with actual domain
LOVABLE_PORT="3000"

echo "📝 Please enter your Lovable domain name:"
read -p "Domain (e.g., myapp.lovable.dev): " LOVABLE_DOMAIN

if [ -z "$LOVABLE_DOMAIN" ]; then
    echo "❌ Domain name is required!"
    exit 1
fi

echo "🔧 Setting up nginx configuration for $LOVABLE_DOMAIN..."

# Create nginx site configuration
sudo tee /etc/nginx/sites-available/lovable > /dev/null <<EOF
server {
    listen 80;
    server_name $LOVABLE_DOMAIN;
    
    location / {
        proxy_pass http://127.0.0.1:$LOVABLE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Development-friendly timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:$LOVABLE_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    access_log /var/log/nginx/lovable.access.log;
    error_log /var/log/nginx/lovable.error.log;
}
EOF

# Enable the site
echo "🔗 Enabling Lovable site..."
sudo ln -sf /etc/nginx/sites-available/lovable /etc/nginx/sites-enabled/

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "✅ Nginx configuration is valid"
    
    # Reload nginx
    echo "🔄 Reloading nginx..."
    sudo systemctl reload nginx
    
    echo "🎉 Lovable site configuration completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Make sure your Lovable app is running on port $LOVABLE_PORT"
    echo "2. Point your domain $LOVABLE_DOMAIN to this server (147.185.40.39)"
    echo "3. Test access: http://$LOVABLE_DOMAIN"
    echo "4. Set up SSL: sudo certbot --nginx -d $LOVABLE_DOMAIN"
    echo ""
    echo "🔍 Useful commands:"
    echo "- Check nginx status: sudo systemctl status nginx"
    echo "- View logs: sudo tail -f /var/log/nginx/lovable.error.log"
    echo "- Test config: sudo nginx -t"
    
else
    echo "❌ Nginx configuration test failed!"
    exit 1
fi
EOF

# Make script executable
chmod +x /tmp/setup_lovable.sh

echo "✅ Lovable setup script created at /tmp/setup_lovable.sh"
