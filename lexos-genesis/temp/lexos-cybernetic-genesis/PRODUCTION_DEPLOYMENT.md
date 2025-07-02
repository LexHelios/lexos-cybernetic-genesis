# LexOS Genesis Production Deployment Guide

## Pre-Deployment Checklist

### 1. Security Configuration
- [ ] Create a production `.env` file based on `.env.example`
- [ ] Generate secure JWT secret (minimum 32 characters)
- [ ] Set strong admin and operator passwords
- [ ] Configure proper email addresses
- [ ] Enable MFA in production
- [ ] Review and update CORS settings

### 2. Required Environment Variables
```bash
NODE_ENV=production
JWT_SECRET=<secure-random-string>
ADMIN_PASSWORD=<strong-password>
OPERATOR_PASSWORD=<strong-password>
```

### 3. Database Setup
- [ ] Set up PostgreSQL database
- [ ] Configure `DATABASE_URL` in `.env`
- [ ] Run database migrations (when implemented)

### 4. External Services
- [ ] Ensure Ollama is installed and running
- [ ] Configure GPU monitoring (if applicable)
- [ ] Set up Redis for session management (optional)

## Deployment Steps

### 1. Clone and Configure
```bash
git clone https://github.com/LexHelios/lexos-cybernetic-genesis.git
cd lexos-cybernetic-genesis
cp .env.example .env
# Edit .env with production values
```

### 2. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd backend
npm install
cd ..
```

### 3. Build Frontend
```bash
npm run build
```

### 4. Start Services
```bash
# Start Ollama (if not already running)
ollama serve

# Start backend
cd backend
npm start

# Or use PM2 for process management
pm2 start src/index.js --name lexos-backend
```

### 5. Configure NGINX
```nginx
server {
    listen 80;
    server_name lexcommand.ai www.lexcommand.ai;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name lexcommand.ai www.lexcommand.ai;
    
    ssl_certificate /path/to/ssl/cert.pem;
    ssl_certificate_key /path/to/ssl/key.pem;
    
    # Frontend
    location / {
        root /home/user/lexos-genesis/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://localhost:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Security Hardening

### 1. Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable
```

### 2. SSL/TLS Configuration
- Use Let's Encrypt for free SSL certificates
- Enable HSTS headers
- Configure strong cipher suites

### 3. Application Security
- Enable rate limiting
- Configure CSP headers
- Implement request validation
- Enable audit logging

## Monitoring

### 1. Health Checks
- Monitor `/health` endpoint
- Set up uptime monitoring
- Configure alerting

### 2. Logs
- Backend logs: `backend/logs/`
- NGINX logs: `/var/log/nginx/`
- System logs: `journalctl -u lexos-backend`

### 3. Metrics
- CPU/Memory usage
- GPU utilization
- API response times
- WebSocket connections

## Backup Strategy

1. Database backups (daily)
2. Configuration backups
3. User data backups
4. Model backups

## Troubleshooting

### Common Issues

1. **Backend won't start**
   - Check Ollama is running: `curl http://localhost:11434/api/tags`
   - Verify port 9000 is available
   - Check logs for errors

2. **Authentication failures**
   - Verify JWT_SECRET is set
   - Check password configuration
   - Ensure cookies are enabled

3. **WebSocket connection issues**
   - Verify NGINX WebSocket configuration
   - Check firewall rules
   - Test with: `wscat -c ws://localhost:9000/ws`

## Performance Optimization

1. Enable gzip compression in NGINX
2. Configure CDN for static assets
3. Optimize database queries
4. Enable Redis caching
5. Use PM2 cluster mode for multi-core utilization

## Maintenance

- Regular security updates
- Database maintenance
- Log rotation
- Certificate renewal
- Performance monitoring

## Support

For issues or questions:
- GitHub Issues: https://github.com/LexHelios/lexos-cybernetic-genesis/issues
- Documentation: https://lexcommand.ai/docs