# LexOS Genesis - Production Deployment Guide

## Executive Summary

This guide provides step-by-step instructions for deploying LexOS Genesis to a production environment. The refactored system includes enterprise-grade security, PostgreSQL database, Redis caching, comprehensive monitoring, and auto-scaling capabilities.

## Prerequisites

- Docker 20.10+ and Docker Compose 2.0+
- Kubernetes 1.24+ (for K8s deployment)
- PostgreSQL 15+
- Redis 7+
- SSL certificates for HTTPS
- Domain name configured
- AWS/GCP/Azure account for cloud deployment

## Critical Changes from Development

### 1. Database Migration
- **From**: SQLite (single file)
- **To**: PostgreSQL (clustered database)
- **Migration Required**: Yes

### 2. Security Enhancements
- Removed hardcoded "Overlord" references
- Implemented role-based access control (RBAC)
- Added JWT authentication with refresh tokens
- Configured rate limiting and CORS

### 3. Infrastructure
- Added Redis for caching and sessions
- Implemented connection pooling
- Added monitoring stack (Prometheus, Grafana, Jaeger)
- Configured auto-scaling and load balancing

## Deployment Steps

### Step 1: Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/LexHelios/lexos-cybernetic-genesis.git
cd lexos-cybernetic-genesis
```

2. Create production environment file:
```bash
cp .env.production.example .env.production
# Edit .env.production with your values
```

3. Generate secure secrets:
```bash
# Generate JWT secret
openssl rand -base64 64

# Generate session secret
openssl rand -base64 64

# Generate encryption key
openssl rand -base64 32
```

### Step 2: Database Setup

1. Start PostgreSQL:
```bash
docker-compose -f docker-compose.production.yml up -d postgres
```

2. Create database schema:
```bash
# Wait for PostgreSQL to be ready
sleep 10

# Run migrations
docker-compose -f docker-compose.production.yml exec postgres psql -U lexos_user -d lexos_genesis -f /docker-entrypoint-initdb.d/init.sql
```

3. Migrate data from SQLite (if upgrading):
```bash
# Export from SQLite
sqlite3 backend/data/lexos.db .dump > lexos_dump.sql

# Import to PostgreSQL (requires data transformation)
python scripts/migrate_sqlite_to_postgres.py lexos_dump.sql
```

### Step 3: Build and Deploy

#### Option A: Docker Compose Deployment

1. Build images:
```bash
docker-compose -f docker-compose.production.yml build
```

2. Start all services:
```bash
docker-compose -f docker-compose.production.yml up -d
```

3. Check service health:
```bash
docker-compose -f docker-compose.production.yml ps
docker-compose -f docker-compose.production.yml logs -f backend
```

#### Option B: Kubernetes Deployment

1. Create namespace:
```bash
kubectl create namespace lexos-production
```

2. Create secrets:
```bash
kubectl create secret generic lexos-secrets \
  --from-env-file=.env.production \
  -n lexos-production
```

3. Apply configurations:
```bash
kubectl apply -f k8s/production/ -n lexos-production
```

4. Check deployment:
```bash
kubectl get pods -n lexos-production
kubectl get svc -n lexos-production
```

### Step 4: SSL Configuration

1. Install certificates:
```bash
# Using Let's Encrypt
sudo certbot --nginx -d app.lexos.ai -d api.lexos.ai
```

2. Update nginx configuration:
```bash
cp nginx/nginx.ssl.conf nginx/nginx.conf
# Edit nginx.conf with your domain
```

3. Restart nginx:
```bash
docker-compose -f docker-compose.production.yml restart nginx
```

### Step 5: Monitoring Setup

1. Access monitoring dashboards:
- Prometheus: http://your-domain:9090
- Grafana: http://your-domain:3000 (admin/admin)
- Jaeger: http://your-domain:16686

2. Import Grafana dashboards:
```bash
# Dashboards are auto-provisioned from monitoring/grafana/provisioning/
```

3. Configure alerts:
```bash
# Edit monitoring/prometheus/alerts.yml
docker-compose -f docker-compose.production.yml restart prometheus
```

### Step 6: Verify Deployment

1. Health checks:
```bash
# Backend health
curl https://api.lexos.ai/health

# Frontend health
curl https://app.lexos.ai/

# Database health
docker-compose -f docker-compose.production.yml exec postgres pg_isready

# Redis health
docker-compose -f docker-compose.production.yml exec redis redis-cli ping
```

2. Run smoke tests:
```bash
npm run test:smoke
```

3. Check logs:
```bash
# All services
docker-compose -f docker-compose.production.yml logs

# Specific service
docker-compose -f docker-compose.production.yml logs -f backend
```

## Post-Deployment Tasks

### 1. Create Admin User
```bash
# Connect to backend container
docker-compose -f docker-compose.production.yml exec backend sh

# Create admin user
npm run create-admin -- --username admin --email admin@lexos.ai --password "SecurePassword123!"
```

### 2. Configure Backups
```bash
# Enable automated backups
docker-compose -f docker-compose.production.yml up -d backup

# Test backup
docker-compose -f docker-compose.production.yml exec backup /backup.sh
```

### 3. Set Up Monitoring Alerts
1. Configure Slack/PagerDuty webhooks in `.env.production`
2. Restart monitoring services
3. Test alerts with: `curl -X POST http://localhost:9090/-/reload`

### 4. Performance Tuning
```bash
# Adjust PostgreSQL settings
docker-compose -f docker-compose.production.yml exec postgres psql -U lexos_user -c "ALTER SYSTEM SET shared_buffers = '256MB';"

# Restart database
docker-compose -f docker-compose.production.yml restart postgres
```

## Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose -f docker-compose.production.yml logs [service-name]

# Check environment variables
docker-compose -f docker-compose.production.yml config

# Rebuild service
docker-compose -f docker-compose.production.yml build --no-cache [service-name]
```

### Database Connection Issues
```bash
# Test connection
docker-compose -f docker-compose.production.yml exec backend npm run test:db

# Check PostgreSQL logs
docker-compose -f docker-compose.production.yml logs postgres

# Verify credentials
docker-compose -f docker-compose.production.yml exec postgres psql -U lexos_user -d lexos_genesis
```

### High Memory Usage
```bash
# Check container stats
docker stats

# Adjust memory limits in docker-compose.production.yml
# Restart affected services
```

### SSL Certificate Issues
```bash
# Renew certificates
sudo certbot renew

# Test SSL
openssl s_client -connect app.lexos.ai:443
```

## Maintenance

### Daily Tasks
- Check monitoring dashboards
- Review error logs
- Verify backup completion

### Weekly Tasks
- Review security alerts
- Update dependencies
- Performance analysis

### Monthly Tasks
- Security patches
- Database maintenance (VACUUM, ANALYZE)
- Certificate renewal check

## Rollback Procedure

1. Stop current deployment:
```bash
docker-compose -f docker-compose.production.yml down
```

2. Restore database:
```bash
# From backup
docker-compose -f docker-compose.production.yml exec postgres pg_restore -U lexos_user -d lexos_genesis /backups/lexos_backup_[date].sql
```

3. Deploy previous version:
```bash
git checkout [previous-tag]
docker-compose -f docker-compose.production.yml up -d
```

## Security Checklist

- [ ] All secrets are unique and secure
- [ ] SSL certificates are valid
- [ ] Firewall rules configured
- [ ] Rate limiting enabled
- [ ] CORS configured properly
- [ ] Database encrypted at rest
- [ ] Backups encrypted
- [ ] Monitoring alerts configured
- [ ] Audit logging enabled
- [ ] Vulnerability scanning scheduled

## Performance Benchmarks

Expected performance metrics:
- API Response Time: < 100ms (p95)
- Database Query Time: < 50ms (p95)
- Cache Hit Rate: > 90%
- Uptime: > 99.9%
- Concurrent Users: 1000+
- Requests/Second: 500+

## Support

- Documentation: /docs
- Issues: https://github.com/LexHelios/lexos-cybernetic-genesis/issues
- Monitoring: https://monitoring.lexos.ai
- Status Page: https://status.lexos.ai

---

**Version**: 2.0.0-production
**Last Updated**: 2025-07-01
**Maintained By**: LexOS DevOps Team