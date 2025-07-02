const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const EventEmitter = require('events');

class SystemMonitor extends EventEmitter {
  constructor(config = {}) {
    super();
    this.config = {
      checkInterval: config.checkInterval || 30000, // 30 seconds
      thresholds: {
        cpu: config.cpuThreshold || 80, // 80%
        memory: config.memoryThreshold || 85, // 85%
        disk: config.diskThreshold || 90, // 90%
        responseTime: config.responseTimeThreshold || 5000, // 5 seconds
        errorRate: config.errorRateThreshold || 0.05 // 5%
      },
      ...config
    };
    
    this.metrics = {
      cpu: [],
      memory: [],
      disk: [],
      responseTime: [],
      errors: [],
      uptime: process.uptime()
    };
    
    this.alerts = [];
    this.isMonitoring = false;
  }

  /**
   * Start monitoring
   */
  start() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('System monitoring started');
    
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
    
    // Initial check
    this.performHealthCheck();
  }

  /**
   * Stop monitoring
   */
  stop() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    clearInterval(this.monitoringInterval);
    console.log('System monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      const checks = await Promise.all([
        this.checkCPU(),
        this.checkMemory(),
        this.checkDisk(),
        this.checkProcesses(),
        this.checkNetworkConnectivity(),
        this.checkAgentHealth()
      ]);

      const health = {
        timestamp: new Date().toISOString(),
        status: this.determineOverallStatus(checks),
        checks: checks.reduce((acc, check) => {
          acc[check.name] = check;
          return acc;
        }, {}),
        alerts: this.alerts
      };

      this.emit('health-check', health);

      // Check for critical issues
      const criticalIssues = checks.filter(c => c.status === 'critical');
      if (criticalIssues.length > 0) {
        this.handleCriticalIssues(criticalIssues);
      }

      return health;
    } catch (error) {
      console.error('Health check failed:', error);
      this.emit('error', error);
    }
  }

  /**
   * Check CPU usage
   */
  async checkCPU() {
    const cpus = os.cpus();
    const totalIdle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
    const totalTick = cpus.reduce((acc, cpu) => 
      acc + cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq, 0
    );
    
    const usage = 100 - ~~(100 * totalIdle / totalTick);
    
    this.metrics.cpu.push({ timestamp: Date.now(), value: usage });
    if (this.metrics.cpu.length > 100) this.metrics.cpu.shift();
    
    const status = usage > this.config.thresholds.cpu ? 'warning' : 'healthy';
    
    return {
      name: 'cpu',
      status,
      value: usage,
      threshold: this.config.thresholds.cpu,
      message: `CPU usage: ${usage}%`
    };
  }

  /**
   * Check memory usage
   */
  async checkMemory() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const usage = (usedMem / totalMem) * 100;
    
    this.metrics.memory.push({ timestamp: Date.now(), value: usage });
    if (this.metrics.memory.length > 100) this.metrics.memory.shift();
    
    const status = usage > this.config.thresholds.memory ? 'warning' : 'healthy';
    
    return {
      name: 'memory',
      status,
      value: usage,
      threshold: this.config.thresholds.memory,
      message: `Memory usage: ${usage.toFixed(2)}%`,
      details: {
        total: totalMem,
        used: usedMem,
        free: freeMem
      }
    };
  }

  /**
   * Check disk usage
   */
  async checkDisk() {
    try {
      const { stdout } = await execAsync("df -h / | awk 'NR==2 {print $5}' | sed 's/%//'");
      const usage = parseInt(stdout.trim());
      
      this.metrics.disk.push({ timestamp: Date.now(), value: usage });
      if (this.metrics.disk.length > 100) this.metrics.disk.shift();
      
      const status = usage > this.config.thresholds.disk ? 'critical' : 'healthy';
      
      return {
        name: 'disk',
        status,
        value: usage,
        threshold: this.config.thresholds.disk,
        message: `Disk usage: ${usage}%`
      };
    } catch (error) {
      return {
        name: 'disk',
        status: 'error',
        message: `Failed to check disk: ${error.message}`
      };
    }
  }

  /**
   * Check running processes
   */
  async checkProcesses() {
    try {
      const processes = [
        { name: 'nginx', command: 'pgrep nginx' },
        { name: 'node', command: 'pgrep node' },
        { name: 'ollama', command: 'pgrep ollama' }
      ];

      const results = await Promise.all(
        processes.map(async (proc) => {
          try {
            const { stdout } = await execAsync(proc.command);
            return { ...proc, running: stdout.trim().length > 0 };
          } catch {
            return { ...proc, running: false };
          }
        })
      );

      const allRunning = results.every(r => r.running);
      
      return {
        name: 'processes',
        status: allRunning ? 'healthy' : 'warning',
        message: `Processes: ${results.filter(r => r.running).length}/${results.length} running`,
        details: results
      };
    } catch (error) {
      return {
        name: 'processes',
        status: 'error',
        message: `Failed to check processes: ${error.message}`
      };
    }
  }

  /**
   * Check network connectivity
   */
  async checkNetworkConnectivity() {
    try {
      const { stdout } = await execAsync('ping -c 1 -W 2 8.8.8.8');
      return {
        name: 'network',
        status: 'healthy',
        message: 'Network connectivity OK'
      };
    } catch {
      return {
        name: 'network',
        status: 'warning',
        message: 'Network connectivity issues detected'
      };
    }
  }

  /**
   * Check agent health
   */
  async checkAgentHealth() {
    try {
      // This would check actual agent endpoints in production
      const agentEndpoints = [
        'http://localhost:9001/health',
        'http://localhost:9001/api/agents'
      ];

      const results = await Promise.all(
        agentEndpoints.map(async (endpoint) => {
          try {
            const start = Date.now();
            const response = await fetch(endpoint);
            const responseTime = Date.now() - start;
            
            return {
              endpoint,
              status: response.ok ? 'healthy' : 'error',
              responseTime
            };
          } catch (error) {
            return {
              endpoint,
              status: 'error',
              error: error.message
            };
          }
        })
      );

      const allHealthy = results.every(r => r.status === 'healthy');
      const avgResponseTime = results
        .filter(r => r.responseTime)
        .reduce((sum, r) => sum + r.responseTime, 0) / results.length;

      return {
        name: 'agents',
        status: allHealthy ? 'healthy' : 'critical',
        message: `Agent health: ${results.filter(r => r.status === 'healthy').length}/${results.length} healthy`,
        avgResponseTime,
        details: results
      };
    } catch (error) {
      return {
        name: 'agents',
        status: 'error',
        message: `Failed to check agents: ${error.message}`
      };
    }
  }

  /**
   * Determine overall system status
   */
  determineOverallStatus(checks) {
    if (checks.some(c => c.status === 'critical')) return 'critical';
    if (checks.some(c => c.status === 'error')) return 'error';
    if (checks.some(c => c.status === 'warning')) return 'warning';
    return 'healthy';
  }

  /**
   * Handle critical issues with auto-recovery
   */
  async handleCriticalIssues(issues) {
    console.log('Critical issues detected:', issues.map(i => i.name));
    
    for (const issue of issues) {
      const alert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'critical',
        source: issue.name,
        message: issue.message,
        timestamp: new Date().toISOString(),
        resolved: false
      };
      
      this.alerts.push(alert);
      this.emit('alert', alert);

      // Attempt auto-recovery
      try {
        await this.attemptRecovery(issue);
        alert.resolved = true;
        alert.resolvedAt = new Date().toISOString();
      } catch (error) {
        console.error(`Failed to recover from ${issue.name}:`, error);
        alert.recoveryError = error.message;
      }
    }

    // Clean up old alerts
    this.alerts = this.alerts.filter(a => 
      new Date() - new Date(a.timestamp) < 24 * 60 * 60 * 1000 // Keep for 24 hours
    );
  }

  /**
   * Attempt automatic recovery
   */
  async attemptRecovery(issue) {
    console.log(`Attempting recovery for: ${issue.name}`);
    
    const recoveryActions = {
      disk: async () => {
        // Clean up logs and temp files
        await execAsync('find /var/log -type f -name "*.log" -mtime +7 -delete');
        await execAsync('rm -rf /tmp/*');
      },
      memory: async () => {
        // Restart services with high memory usage
        await execAsync('sudo systemctl restart lexos-backend');
        await execAsync('sudo systemctl restart lexos-frontend');
      },
      agents: async () => {
        // Restart agent services
        await execAsync('sudo systemctl restart lexos-backend');
      },
      processes: async () => {
        // Restart missing processes
        for (const proc of issue.details.filter(p => !p.running)) {
          if (proc.name === 'nginx') {
            await execAsync('sudo systemctl restart nginx');
          } else if (proc.name === 'node') {
            await execAsync('sudo systemctl restart lexos-backend lexos-frontend');
          }
        }
      }
    };

    const recoveryAction = recoveryActions[issue.name];
    if (recoveryAction) {
      await recoveryAction();
      console.log(`Recovery completed for: ${issue.name}`);
    } else {
      throw new Error(`No recovery action available for: ${issue.name}`);
    }
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      cpu: this.calculateAverage(this.metrics.cpu),
      memory: this.calculateAverage(this.metrics.memory),
      disk: this.calculateAverage(this.metrics.disk),
      uptime: process.uptime(),
      alerts: this.alerts.filter(a => !a.resolved).length
    };
  }

  /**
   * Calculate average from metric array
   */
  calculateAverage(metrics) {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  /**
   * Get alert history
   */
  getAlertHistory() {
    return this.alerts;
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts() {
    this.alerts = this.alerts.filter(a => !a.resolved);
  }
}

module.exports = SystemMonitor;