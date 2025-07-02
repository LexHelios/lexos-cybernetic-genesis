# LexOS Genesis Quick Start Guide

Welcome to LexOS Genesis! This guide will help you get up and running quickly.

## Prerequisites

- Linux-based operating system (Ubuntu 20.04+ recommended)
- Node.js 18+ and npm 8+
- At least 8GB RAM and 10GB free disk space
- Sudo access (for system service installation)

## Quick Installation

### 1. Clone or Download LexOS Genesis

If you haven't already, ensure you have the LexOS Genesis files in `/home/user/lexos-genesis/`.

### 2. Run the Deployment Script

```bash
cd /home/user/lexos-genesis
./deploy-lexos.sh
```

The deployment script will:
- Check system requirements
- Install missing dependencies
- Configure environment variables
- Build the frontend
- Initialize the database
- Start all services
- Set up system services for auto-start

### 3. Save Your Credentials

After deployment, the script generates secure credentials. **Save these immediately!**

The credentials are displayed on screen and saved to: `credentials_[timestamp].txt`

### 4. Access LexOS Genesis

Once deployment is complete, access LexOS at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Monitoring Dashboard**: http://localhost:4000

Default login:
- Username: `admin@sharma-legacy.com`
- Password: (use the generated admin password)

## Quick Commands

### Check Status
```bash
./scripts/status.sh
```

### Start All Services
```bash
# Using systemd (recommended)
sudo systemctl start lexos-backend lexos-monitoring lexos-frontend

# Or using scripts
./scripts/start-backend.sh
./scripts/start-monitoring.sh
./scripts/start-frontend.sh
```

### Stop All Services
```bash
./scripts/stop-all.sh
```

### View Logs
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs
tail -f logs/frontend.log

# Monitoring logs
tail -f logs/monitoring.log

# All logs
tail -f logs/*.log
```

### Restart Services
```bash
sudo systemctl restart lexos-backend
sudo systemctl restart lexos-frontend
sudo systemctl restart lexos-monitoring
```

## Initial Setup

### 1. Configure Ollama

Ensure Ollama is running and accessible:

```bash
# Check Ollama status
curl http://localhost:11434/api/tags

# Pull required models
ollama pull llama2
ollama pull codellama
```

### 2. Configure SSL (Production)

For production deployment:

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d lexcommand.ai -d www.lexcommand.ai
```

### 3. Configure Firewall

```bash
# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow SSH (if needed)
sudo ufw allow 22/tcp

# Enable firewall
sudo ufw enable
```

## Environment Configuration

### Backend Configuration

Edit `/home/user/lexos-genesis/backend/.env`:

```env
# Change these values for production
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://lexcommand.ai

# Ollama settings
OLLAMA_BASE_URL=http://localhost:11434

# Security settings
MAX_LOGIN_ATTEMPTS=5
RATE_LIMIT_MAX_REQUESTS=100
```

### Monitoring Configuration

Edit `/home/user/lexos-genesis/monitoring-agent/.env`:

```env
# Alert configuration
ENABLE_ALERTS=true
ALERT_EMAIL=your-email@domain.com
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
```

## Quick Troubleshooting

### Service Won't Start

1. Check if port is in use:
   ```bash
   sudo lsof -i :3001  # Backend
   sudo lsof -i :3000  # Frontend
   sudo lsof -i :4000  # Monitoring
   ```

2. Check logs:
   ```bash
   tail -n 50 logs/backend-error.log
   ```

3. Verify dependencies:
   ```bash
   node --version  # Should be 18+
   npm --version   # Should be 8+
   ```

### Database Issues

Reset database:
```bash
cd backend
rm -f data/lexos.db
npm run init-db
```

### Frontend Build Issues

Rebuild frontend:
```bash
rm -rf dist
npm run build
```

## Production Checklist

- [ ] Change all default passwords
- [ ] Configure SSL certificates
- [ ] Set up firewall rules
- [ ] Configure email alerts
- [ ] Set up automated backups
- [ ] Configure log rotation
- [ ] Set up monitoring alerts
- [ ] Configure Cloudflare (if using)
- [ ] Test all endpoints
- [ ] Document any custom configurations

## Getting Help

- Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
- View system status: `./scripts/status.sh`
- Check deployment logs: `cat deployment_*.log`
- Monitor services: http://localhost:4000

## Next Steps

1. Explore the web interface at http://localhost:3000
2. Configure your AI models in the Model Arsenal
3. Set up agent workflows in Task Pipeline
4. Configure security policies in Security Hub
5. Monitor system performance in the Monitoring Dashboard

Welcome to LexOS Genesis - Your Sovereign AI Intelligence System!