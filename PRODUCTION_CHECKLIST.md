# LexOS Production Deployment Checklist

## Pre-Deployment Requirements

### System Requirements
- [ ] **Operating System**: Ubuntu 20.04+ / Debian 11+ / CentOS 8+
- [ ] **Node.js**: v16.0.0 or higher
- [ ] **Python**: 3.8 or higher
- [ ] **RAM**: Minimum 2GB (4GB recommended)
- [ ] **Storage**: Minimum 10GB free space
- [ ] **Network**: Stable internet connection

### Software Dependencies
- [ ] Node.js and npm installed
- [ ] Python 3 and pip3 installed
- [ ] Git installed
- [ ] Modern web browser (Chrome, Firefox, Safari, Edge)

## Security Checklist

### Application Security
- [ ] Change default JWT secret key in `backend/config.py`
- [ ] Enable HTTPS for production deployment
- [ ] Configure CORS settings for your domain
- [ ] Set secure session cookies
- [ ] Enable rate limiting on API endpoints
- [ ] Implement proper input validation
- [ ] Set up Content Security Policy (CSP) headers

### System Security
- [ ] Create dedicated user for running LexOS (non-root)
- [ ] Configure firewall rules (allow only necessary ports)
- [ ] Set up SSL certificates (Let's Encrypt recommended)
- [ ] Enable automatic security updates
- [ ] Configure fail2ban for SSH protection
- [ ] Disable root SSH access
- [ ] Set up regular backups

## Performance Optimization

### Backend Optimization
- [ ] Enable production mode in Flask
- [ ] Configure proper worker processes
- [ ] Set up database connection pooling
- [ ] Enable response caching where appropriate
- [ ] Configure gzip compression
- [ ] Optimize database queries
- [ ] Set up CDN for static assets

### Frontend Optimization
- [ ] Build frontend in production mode
- [ ] Enable code splitting and lazy loading
- [ ] Minimize and compress assets
- [ ] Configure browser caching
- [ ] Optimize images and media files
- [ ] Enable service workers for offline support
- [ ] Set up performance monitoring

## Deployment Steps

### 1. Initial Setup
```bash
# Clone the repository
git clone https://github.com/yourusername/lexos-genesis.git
cd lexos-genesis

# Create necessary directories
mkdir -p logs pids data/uploads

# Set proper permissions
chmod +x start-lexos.sh stop-lexos.sh
chmod +x services/auto-recovery.sh
```

### 2. Configuration
- [ ] Copy `.env.example` to `.env` and configure:
  - Database connection strings
  - API keys and secrets
  - Email configuration
  - Storage paths
  - Domain settings

### 3. Database Setup
- [ ] Set up PostgreSQL/MySQL database
- [ ] Run database migrations
- [ ] Create initial admin user
- [ ] Set up database backups

### 4. Reverse Proxy Setup (Nginx)
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 5. Process Management (systemd)
Create `/etc/systemd/system/lexos.service`:
```ini
[Unit]
Description=LexOS Cloud Desktop
After=network.target

[Service]
Type=forking
User=lexos
WorkingDirectory=/home/lexos/lexos-genesis
ExecStart=/home/lexos/lexos-genesis/start-lexos.sh
ExecStop=/home/lexos/lexos-genesis/stop-lexos.sh
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable lexos
sudo systemctl start lexos
```

## Monitoring Setup

### Application Monitoring
- [ ] Set up application performance monitoring (APM)
- [ ] Configure error tracking (Sentry, Rollbar)
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation
- [ ] Set up custom metrics and dashboards

### System Monitoring
- [ ] Install monitoring agent (Prometheus, Datadog, New Relic)
- [ ] Set up CPU, memory, and disk usage alerts
- [ ] Configure network monitoring
- [ ] Set up log rotation and retention policies
- [ ] Create automated health check scripts

## Backup and Recovery

### Backup Strategy
- [ ] Daily database backups
- [ ] Weekly full system backups
- [ ] Off-site backup storage
- [ ] Test restore procedures monthly
- [ ] Document recovery procedures

### Disaster Recovery
- [ ] Create disaster recovery plan
- [ ] Set up failover mechanisms
- [ ] Configure data replication
- [ ] Test recovery time objectives (RTO)
- [ ] Document rollback procedures

## Post-Deployment

### Testing
- [ ] Run full test suite
- [ ] Perform load testing
- [ ] Test all critical user flows
- [ ] Verify backup and restore
- [ ] Test auto-recovery mechanisms
- [ ] Check security headers

### Documentation
- [ ] Update README with production URLs
- [ ] Document all configuration changes
- [ ] Create operations runbook
- [ ] Update API documentation
- [ ] Create user guides

### Maintenance
- [ ] Set up automated updates
- [ ] Schedule regular security audits
- [ ] Plan for capacity scaling
- [ ] Monitor resource usage trends
- [ ] Review and update dependencies

## Launch Checklist

### Final Checks
- [ ] All services are running
- [ ] SSL certificates are valid
- [ ] Monitoring is active
- [ ] Backups are configured
- [ ] Auto-recovery is enabled
- [ ] Documentation is complete
- [ ] Support channels are ready

### Go-Live
- [ ] Announce maintenance window
- [ ] Deploy to production
- [ ] Verify all services
- [ ] Monitor for issues
- [ ] Update DNS records
- [ ] Send launch announcement

## Support Information

### Useful Commands
```bash
# Start LexOS
./start-lexos.sh

# Stop LexOS
./stop-lexos.sh

# Check service status
systemctl status lexos

# View logs
tail -f logs/backend.log
tail -f logs/frontend.log
tail -f logs/auto-recovery.log

# Manual health check
curl http://localhost:5000/api/health
```

### Troubleshooting
1. **Service won't start**: Check logs in `/home/user/lexos-genesis/logs/`
2. **Port already in use**: Run `lsof -i:3000` or `lsof -i:5000` to find conflicting processes
3. **Permission errors**: Ensure proper ownership with `chown -R lexos:lexos /path/to/lexos-genesis`
4. **Database connection issues**: Verify credentials and network connectivity

### Contact
- GitHub Issues: https://github.com/yourusername/lexos-genesis/issues
- Email: support@lexos.example.com
- Documentation: https://docs.lexos.example.com