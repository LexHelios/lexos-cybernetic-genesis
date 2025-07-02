# LexOS Genesis Production Setup Guide

## Prerequisites & Required Services

### 1. **API Keys & External Services**
You'll need to obtain the following API keys for full functionality:

- **OpenAI API Key**: For GPT models integration
  - Get from: https://platform.openai.com/api-keys
  
- **Anthropic API Key**: For Claude models integration
  - Get from: https://console.anthropic.com/
  
- **Cohere API Key**: For Cohere models (optional)
  - Get from: https://dashboard.cohere.ai/api-keys

### 2. **Infrastructure Requirements**

#### Database Services:
- **PostgreSQL 15+**: Main database
  - Recommended: AWS RDS, Google Cloud SQL, or DigitalOcean Managed Databases
  - Memory: At least 2GB RAM
  - Storage: Start with 20GB, plan for growth

- **Redis 7+**: Caching and sessions
  - Recommended: Redis Cloud, AWS ElastiCache, or self-hosted
  - Memory: At least 512MB

#### Monitoring Services (Optional but Recommended):
- **Sentry**: For error tracking
  - Sign up at: https://sentry.io
  - Get DSN from project settings

- **SendGrid or SMTP**: For email notifications
  - SendGrid: https://sendgrid.com
  - Alternative: Any SMTP service

#### Vector Database (Optional):
- **Pinecone**: For embedding storage
  - Sign up at: https://www.pinecone.io
  - Create an index named "lexos-memories"

### 3. **Server Requirements**
- **CPU**: Minimum 2 cores, recommended 4+ cores
- **RAM**: Minimum 4GB, recommended 8GB+
- **Storage**: 50GB+ SSD
- **OS**: Ubuntu 20.04/22.04 or similar Linux distribution
- **Node.js**: Version 18+ 
- **Python**: Version 3.8+ (for Python services)

## Environment Configuration

### 1. Create Production Environment File

```bash
cd lexos-genesis
cp .env.production.example .env.production
```

### 2. Required Environment Variables

Edit `.env.production` with your values:

```bash
# CRITICAL - Must be changed
JWT_SECRET=<generate-64-char-random-string>
SESSION_SECRET=<generate-64-char-random-string>
ENCRYPTION_KEY=<generate-32-byte-key>
ADMIN_INITIAL_PASSWORD=<strong-password>

# Database Configuration
DATABASE_HOST=<your-postgres-host>
DATABASE_PASSWORD=<secure-database-password>
REDIS_HOST=<your-redis-host>
REDIS_PASSWORD=<secure-redis-password>

# API Keys
OPENAI_API_KEY=<your-openai-key>
ANTHROPIC_API_KEY=<your-anthropic-key>

# Production URLs
FRONTEND_URL=https://your-domain.com

# Email (if using)
SMTP_PASSWORD=<your-smtp-password>

# Monitoring (if using)
SENTRY_DSN=<your-sentry-dsn>
```

### 3. Generate Secure Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"
```

## Deployment Steps

### Option 1: Docker Deployment (Recommended)

1. **Install Docker and Docker Compose**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

2. **Deploy with Docker Compose**
```bash
cd lexos-genesis
docker-compose -f docker-compose.production.yml up -d
```

### Option 2: Manual Deployment

1. **Install Dependencies**
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL client
sudo apt-get install -y postgresql-client

# Install Redis client
sudo apt-get install -y redis-tools

# Install Nginx
sudo apt-get install -y nginx
```

2. **Build Frontend**
```bash
cd lexos-genesis/frontend
npm install
npm run build
```

3. **Setup Backend**
```bash
cd ../backend
npm install --production
```

4. **Setup Process Manager (PM2)**
```bash
sudo npm install -g pm2

# Start backend
pm2 start ecosystem.config.js --env production

# Save PM2 config
pm2 save
pm2 startup
```

5. **Configure Nginx**
```bash
sudo cp lexos-nginx.conf /etc/nginx/sites-available/lexos
sudo ln -s /etc/nginx/sites-available/lexos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## SSL/HTTPS Setup

### Using Let's Encrypt (Free SSL)
```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Security Checklist

- [ ] Change all default passwords in `.env.production`
- [ ] Generate new secure secrets for JWT and encryption
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Enable HTTPS/SSL certificate
- [ ] Set up regular database backups
- [ ] Configure rate limiting in production
- [ ] Enable audit logging
- [ ] Review and restrict CORS origins
- [ ] Set up monitoring alerts
- [ ] Configure log rotation
- [ ] Implement DDoS protection (Cloudflare recommended)

## Post-Deployment

### 1. Create Admin User
```bash
# Access the application and use the admin credentials from .env.production
# IMMEDIATELY change the password after first login
```

### 2. Health Checks
```bash
# Check backend health
curl http://localhost:9000/health

# Check frontend
curl http://localhost:8080

# Check database connection
docker-compose -f docker-compose.production.yml exec backend npm run db:check
```

### 3. Setup Monitoring
- Configure Grafana dashboards (available at :3000)
- Set up Prometheus alerts
- Configure Sentry for error tracking
- Enable application performance monitoring

### 4. Backup Configuration
```bash
# Create backup script
cat > /opt/lexos/backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/lexos"
mkdir -p $BACKUP_DIR

# Backup database
pg_dump $DATABASE_URL > $BACKUP_DIR/db_$DATE.sql

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/lib/lexos/uploads

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /opt/lexos/backup.sh

# Add to crontab
echo "0 2 * * * /opt/lexos/backup.sh" | crontab -
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify DATABASE_HOST and credentials
   - Ensure PostgreSQL allows connections

2. **Redis Connection Failed**
   - Check Redis is running
   - Verify REDIS_HOST and password
   - Check firewall rules

3. **Frontend Not Loading**
   - Check Nginx configuration
   - Verify frontend build completed
   - Check browser console for errors

4. **API Keys Not Working**
   - Verify keys are correctly set in .env.production
   - Check API key quotas/limits
   - Ensure keys have necessary permissions

### Logs Location
- Backend logs: `lexos-genesis/backend/logs/`
- Nginx logs: `/var/log/nginx/`
- PM2 logs: `pm2 logs`
- Docker logs: `docker-compose logs`

## Support

For issues or questions:
- Check logs first
- Review environment configuration
- Ensure all services are running
- Check system resources (CPU, memory, disk)