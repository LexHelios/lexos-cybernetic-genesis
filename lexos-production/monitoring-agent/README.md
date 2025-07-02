# LexOS Genesis Monitoring Agent

A comprehensive monitoring and self-healing agent for the LexOS Genesis server infrastructure.

## Features

### 🔍 Monitoring Capabilities
- **Service Health Monitoring**: Tracks all system services (backend, auth-backend, frontend)
- **Resource Monitoring**: CPU, Memory, Disk, and GPU (H100) usage tracking
- **Log Monitoring**: Real-time error detection and pattern matching
- **Database Monitoring**: PostgreSQL and Redis connection health
- **Network Monitoring**: Connectivity checks and latency monitoring
- **SSL Certificate Monitoring**: Expiration tracking and alerts

### 🔧 Self-Healing Actions
- **Automatic Service Restart**: Restarts failed services with configurable retry logic
- **Cache Cleanup**: Automatically clears cache when memory is high
- **Log Rotation**: Removes old logs when disk space is low
- **Config Fix**: Attempts to fix common syntax errors in configuration files
- **Database Connection Reset**: Resets connection pools when issues detected

### 📊 Dashboard
- Real-time system status visualization
- Service health indicators
- Resource usage charts
- Alert history
- Incident tracking
- Quick action buttons

### 🚨 Alerting
- Email notifications
- Webhook support (Slack, Discord, etc.)
- Configurable alert thresholds
- Alert cooldown to prevent spam

## Installation

### Quick Setup
```bash
cd /home/user/lexos-genesis/monitoring-agent
./scripts/setup.sh
```

### Manual Setup
```bash
# Install dependencies
npm install

# Create directories
mkdir -p logs metrics

# Copy and configure environment file
cp .env.example .env
# Edit .env with your settings

# Configure monitoring settings
# Edit config/default.yaml

# Start the agent
npm start
```

### Systemd Service Installation
```bash
# Install as system service (requires root)
sudo cp lexos-monitoring.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable lexos-monitoring
sudo systemctl start lexos-monitoring
```

## Configuration

### Main Configuration (config/default.yaml)

The configuration file contains settings for:
- Service endpoints and health checks
- Resource monitoring thresholds
- Database connections
- SSL certificates to monitor
- Log patterns to detect
- Alert settings
- Recovery actions

### Environment Variables (.env)
```bash
# Agent Configuration
MONITORING_PORT=4000
MONITORING_HOST=0.0.0.0
MONITORING_USERNAME=admin
MONITORING_PASSWORD=changeme

# Email Configuration
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Database Credentials
DB_USER=postgres
DB_PASSWORD=postgres
```

## Usage

### Accessing the Dashboard
Open your browser and navigate to:
```
http://localhost:4000/dashboard
```

Default credentials:
- Username: `admin`
- Password: `changeme`

### API Endpoints

#### Status
```bash
curl -u admin:changeme http://localhost:4000/api/status
```

#### Metrics
```bash
# Get CPU metrics for last hour
curl -u admin:changeme http://localhost:4000/api/metrics/cpu?period=1h
```

#### Service Operations
```bash
# Restart a service
curl -X POST -u admin:changeme http://localhost:4000/api/services/backend/restart
```

#### Recovery Actions
```bash
# Run system cleanup
curl -X POST -u admin:changeme \
  -H "Content-Type: application/json" \
  -d '{"action":{"type":"cleanupSystem"}}' \
  http://localhost:4000/api/recovery/action
```

## Monitoring Rules

### Service Health
- Checks health endpoints every 30 seconds
- Verifies process is running
- Monitors response times
- Tracks uptime percentage

### Resource Thresholds
- **CPU**: Warning at 70%, Critical at 90%
- **Memory**: Warning at 80%, Critical at 95%
- **Disk**: Warning at 80%, Critical at 90%
- **GPU**: Warning at 80%, Critical at 95%

### Auto-Recovery Rules
1. **Service Down**: 
   - Attempts restart up to 3 times
   - 60-second cooldown between attempts

2. **High Memory**:
   - Clears cache directories at 90% usage
   - Removes temporary files

3. **High Disk Usage**:
   - Removes logs older than 7 days
   - Cleans package manager cache

4. **Config Errors**:
   - Fixes common JSON syntax errors
   - Corrects YAML indentation
   - Validates .env format

## Dashboard Features

### System Overview
- Real-time CPU, Memory, Disk, and GPU usage
- Interactive charts with historical data
- Resource usage trends

### Service Status Cards
- Health indicator (green/yellow/red)
- Response time
- Uptime percentage
- Quick restart button
- View logs button

### Alert Panel
- Severity-based color coding
- Timestamp and details
- Grouped by type

### Incident History
- Recovery action logs
- Success/failure status
- Detailed error messages

### Quick Actions
- Restart All Services
- Clear Cache
- System Cleanup
- Export Report

## Troubleshooting

### Agent Won't Start
```bash
# Check logs
tail -f logs/monitoring-*.log

# Verify configuration
node -e "console.log(require('./src/utils/configManager').new().get())"

# Test database connections
psql -h localhost -U postgres -d lexos -c "SELECT 1"
redis-cli ping
```

### High Resource Usage
```bash
# Check which monitor is consuming resources
ps aux | grep node

# Increase check intervals in config/default.yaml
# Reduce retention period for metrics
```

### Alerts Not Sending
```bash
# Test email configuration
node scripts/test-email.js

# Check webhook URL
curl -X POST your-webhook-url -H "Content-Type: application/json" -d '{"test": true}'
```

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Adding New Monitors
1. Create monitor class in `src/monitors/`
2. Extend EventEmitter
3. Implement start() and stop() methods
4. Emit events for status changes
5. Register in MonitoringCore

### Adding Recovery Actions
1. Add action handler in RecoveryManager
2. Define configuration in default.yaml
3. Implement action logic
4. Emit recovery events

## Architecture

```
monitoring-agent/
├── src/
│   ├── index.js              # Entry point
│   ├── core/
│   │   └── monitoringCore.js # Core orchestrator
│   ├── monitors/             # Monitor implementations
│   ├── managers/             # Alert and recovery managers
│   ├── routes/               # API routes
│   ├── middleware/           # Express middleware
│   ├── utils/                # Utilities
│   └── stores/               # Data storage
├── config/
│   └── default.yaml          # Configuration
├── public/                   # Dashboard files
├── logs/                     # Log files
├── metrics/                  # Metrics storage
└── scripts/                  # Utility scripts
```

## Security Considerations

1. **Change default credentials** in production
2. **Use HTTPS** for dashboard access
3. **Restrict network access** to monitoring port
4. **Rotate logs** regularly
5. **Limit database query permissions**
6. **Use strong SMTP passwords**

## Performance Tuning

1. Adjust check intervals based on system load
2. Increase metric aggregation interval for large deployments
3. Configure log rotation to prevent disk fill
4. Use Redis for metric storage in high-volume environments
5. Disable unused monitors to save resources

## Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review configuration in `config/default.yaml`
3. Verify service health endpoints are accessible
4. Ensure proper permissions for log files and system commands