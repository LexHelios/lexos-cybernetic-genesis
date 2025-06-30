# LexOS Genesis Troubleshooting Guide

This guide helps you diagnose and resolve common issues with LexOS Genesis.

## Table of Contents

1. [Deployment Issues](#deployment-issues)
2. [Service Issues](#service-issues)
3. [Database Problems](#database-problems)
4. [Network and Connectivity](#network-and-connectivity)
5. [Performance Issues](#performance-issues)
6. [Security Problems](#security-problems)
7. [Frontend Issues](#frontend-issues)
8. [Backend API Issues](#backend-api-issues)
9. [Monitoring Agent Issues](#monitoring-agent-issues)
10. [Common Error Messages](#common-error-messages)

## Deployment Issues

### Deployment Script Fails

**Problem**: The `deploy-lexos.sh` script exits with an error.

**Solutions**:

1. Check the deployment log:
   ```bash
   cat deployment_*.log | grep -i error
   ```

2. Verify system requirements:
   ```bash
   # Check Node.js version
   node --version  # Should be 18+
   
   # Check available disk space
   df -h /home/user/lexos-genesis
   
   # Check available memory
   free -h
   ```

3. Run deployment with verbose output:
   ```bash
   bash -x ./deploy-lexos.sh
   ```

### Permission Denied Errors

**Problem**: Getting "Permission denied" during deployment.

**Solutions**:

1. Ensure script is executable:
   ```bash
   chmod +x deploy-lexos.sh
   chmod +x scripts/*.sh
   ```

2. Check file ownership:
   ```bash
   ls -la /home/user/lexos-genesis
   ```

3. Run without sudo (the script will request sudo when needed):
   ```bash
   ./deploy-lexos.sh  # NOT: sudo ./deploy-lexos.sh
   ```

## Service Issues

### Service Won't Start

**Problem**: One or more services fail to start.

**Diagnosis**:
```bash
# Check service status
sudo systemctl status lexos-backend
sudo systemctl status lexos-frontend
sudo systemctl status lexos-monitoring

# Check if ports are in use
sudo lsof -i :3001  # Backend
sudo lsof -i :3000  # Frontend
sudo lsof -i :4000  # Monitoring
```

**Solutions**:

1. Kill conflicting processes:
   ```bash
   # Find and kill process using port
   sudo kill -9 $(sudo lsof -t -i:3001)
   ```

2. Check service logs:
   ```bash
   # Systemd logs
   sudo journalctl -u lexos-backend -n 50
   
   # Application logs
   tail -f logs/backend-error.log
   ```

3. Restart services:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart lexos-backend
   ```

### Service Keeps Crashing

**Problem**: Service starts but crashes repeatedly.

**Solutions**:

1. Check error logs:
   ```bash
   tail -n 100 logs/backend-error.log | grep -i error
   ```

2. Verify environment configuration:
   ```bash
   # Check .env file
   cat backend/.env | grep -v PASSWORD
   ```

3. Check system resources:
   ```bash
   # Memory usage
   free -h
   
   # Disk space
   df -h
   
   # CPU load
   top -bn1 | head -5
   ```

## Database Problems

### Database Connection Failed

**Problem**: "Database connection failed" error.

**Solutions**:

1. For SQLite (default):
   ```bash
   # Check if database file exists
   ls -la backend/data/lexos.db
   
   # Check permissions
   chmod 644 backend/data/lexos.db
   
   # Reinitialize if needed
   cd backend && npm run init-db
   ```

2. For PostgreSQL:
   ```bash
   # Check if PostgreSQL is running
   sudo systemctl status postgresql
   
   # Test connection
   sudo -u postgres psql -c "SELECT 1;"
   
   # Check database exists
   sudo -u postgres psql -l | grep lexos
   ```

### Database Locked Error

**Problem**: "database is locked" error with SQLite.

**Solutions**:

1. Stop all services:
   ```bash
   ./scripts/stop-all.sh
   ```

2. Remove lock file if exists:
   ```bash
   rm -f backend/data/lexos.db-journal
   rm -f backend/data/lexos.db-wal
   ```

3. Restart services:
   ```bash
   sudo systemctl start lexos-backend
   ```

## Network and Connectivity

### Cannot Access Frontend

**Problem**: Cannot access http://localhost:3000.

**Solutions**:

1. Check if frontend is running:
   ```bash
   curl -I http://localhost:3000
   ```

2. Check frontend logs:
   ```bash
   tail -f logs/frontend.log
   ```

3. Rebuild frontend:
   ```bash
   cd /home/user/lexos-genesis
   npm run build
   sudo systemctl restart lexos-frontend
   ```

### API Connection Refused

**Problem**: Frontend cannot connect to backend API.

**Solutions**:

1. Verify backend is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Check CORS configuration:
   ```bash
   grep FRONTEND_URL backend/.env
   ```

3. Test API directly:
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@sharma-legacy.com","password":"your-password"}'
   ```

### WebSocket Connection Failed

**Problem**: Real-time features not working.

**Solutions**:

1. Check WebSocket endpoint:
   ```bash
   # Test WebSocket connection
   wscat -c ws://localhost:3001/ws
   ```

2. Check Nginx configuration (if using):
   ```bash
   sudo nginx -t
   grep -A 10 "location.*ws" /etc/nginx/sites-available/lexcommand.ai
   ```

## Performance Issues

### Slow Response Times

**Problem**: Application responds slowly.

**Diagnosis**:
```bash
# Check system resources
./scripts/status.sh

# Monitor processes
htop

# Check service metrics
curl http://localhost:4000/api/metrics/summary
```

**Solutions**:

1. Increase Node.js memory:
   ```bash
   # Edit systemd service
   sudo systemctl edit lexos-backend
   
   # Add:
   [Service]
   Environment="NODE_OPTIONS=--max-old-space-size=4096"
   ```

2. Enable Redis caching:
   ```bash
   sudo apt install redis-server
   sudo systemctl start redis-server
   ```

3. Optimize database:
   ```bash
   # For SQLite
   cd backend
   sqlite3 data/lexos.db "VACUUM;"
   ```

### High Memory Usage

**Problem**: Services consuming too much memory.

**Solutions**:

1. Check memory usage by service:
   ```bash
   ps aux | grep node | sort -k 4 -nr
   ```

2. Set memory limits in systemd:
   ```bash
   sudo systemctl edit lexos-backend
   
   # Add:
   [Service]
   MemoryLimit=2G
   ```

3. Enable swap if needed:
   ```bash
   sudo fallocate -l 4G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

## Security Problems

### Authentication Failed

**Problem**: Cannot log in with credentials.

**Solutions**:

1. Reset admin password:
   ```bash
   # Generate new password
   NEW_PASS=$(openssl rand -base64 16)
   echo "New password: $NEW_PASS"
   
   # Update in .env file
   sed -i "s/ADMIN_PASSWORD=.*/ADMIN_PASSWORD=$NEW_PASS/" backend/.env
   
   # Restart backend
   sudo systemctl restart lexos-backend
   ```

2. Check login attempts:
   ```bash
   grep "login attempt" logs/backend.log | tail -20
   ```

### SSL Certificate Issues

**Problem**: HTTPS not working properly.

**Solutions**:

1. Check certificate status:
   ```bash
   sudo certbot certificates
   ```

2. Renew certificate:
   ```bash
   sudo certbot renew --nginx
   ```

3. Test SSL configuration:
   ```bash
   openssl s_client -connect lexcommand.ai:443 -servername lexcommand.ai
   ```

## Frontend Issues

### Blank Page or Loading Forever

**Problem**: Frontend shows blank page or infinite loading.

**Solutions**:

1. Check browser console for errors (F12)

2. Clear browser cache:
   - Ctrl+Shift+R (hard refresh)
   - Clear site data in browser settings

3. Check if API is accessible:
   ```bash
   # From browser console:
   fetch('http://localhost:3001/api/health').then(r => r.json()).then(console.log)
   ```

4. Rebuild frontend:
   ```bash
   cd /home/user/lexos-genesis
   rm -rf dist node_modules
   npm install
   npm run build
   ```

### Assets Not Loading

**Problem**: CSS/JS files return 404.

**Solutions**:

1. Check build output:
   ```bash
   ls -la dist/assets/
   ```

2. Verify serve configuration:
   ```bash
   ps aux | grep serve
   ```

3. Check for build errors:
   ```bash
   npm run build 2>&1 | grep -i error
   ```

## Backend API Issues

### Ollama Connection Failed

**Problem**: Cannot connect to Ollama service.

**Solutions**:

1. Check Ollama status:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Start Ollama:
   ```bash
   ollama serve
   ```

3. Verify Ollama URL in config:
   ```bash
   grep OLLAMA_BASE_URL backend/.env
   ```

### Model Not Found

**Problem**: AI model not available.

**Solutions**:

1. List available models:
   ```bash
   ollama list
   ```

2. Pull required model:
   ```bash
   ollama pull llama2
   ollama pull codellama
   ```

## Monitoring Agent Issues

### Monitoring Dashboard Empty

**Problem**: No data in monitoring dashboard.

**Solutions**:

1. Check monitoring service:
   ```bash
   curl http://localhost:4000/api/metrics
   ```

2. Verify backend connection:
   ```bash
   grep BACKEND_URL monitoring-agent/.env
   ```

3. Check monitoring logs:
   ```bash
   tail -f logs/monitoring.log
   ```

## Common Error Messages

### "ECONNREFUSED"

Connection refused to a service.

**Solution**: Start the required service:
```bash
sudo systemctl start lexos-backend
```

### "EADDRINUSE"

Port already in use.

**Solution**: Find and kill the process:
```bash
sudo lsof -i :3001
sudo kill -9 <PID>
```

### "MODULE_NOT_FOUND"

Missing Node.js module.

**Solution**: Reinstall dependencies:
```bash
cd backend && npm install
cd ../monitoring-agent && npm install
cd .. && npm install
```

### "SQLITE_CANTOPEN"

Cannot open database file.

**Solution**: Check permissions and recreate:
```bash
cd backend
mkdir -p data
chmod 755 data
npm run init-db
```

## Getting Additional Help

1. **Check Logs**: Always check the relevant log files first
2. **Run Status Check**: Use `./scripts/status.sh` for overview
3. **Verbose Mode**: Run scripts with `bash -x` for detailed output
4. **System Journal**: Check `sudo journalctl -xe` for system-level issues

## Emergency Recovery

If all else fails, perform a clean restart:

```bash
# Stop everything
./scripts/stop-all.sh
sudo systemctl stop lexos-*

# Clean up
rm -f logs/*.pid
rm -f backend/data/lexos.db-*

# Restart deployment
./deploy-lexos.sh
```

Remember to always backup your data before performing recovery operations!