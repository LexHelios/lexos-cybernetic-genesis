const EventEmitter = require('events');
const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ServiceMonitor extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.services = config.get('services') || {};
    this.intervals = {};
    this.status = {};
    this.failureCounts = {};
  }

  async start() {
    this.logger.info('Starting service monitor...');
    
    for (const [name, service] of Object.entries(this.services)) {
      this.startMonitoring(name, service);
    }
  }

  async stop() {
    this.logger.info('Stopping service monitor...');
    
    for (const interval of Object.values(this.intervals)) {
      clearInterval(interval);
    }
    
    this.intervals = {};
  }

  startMonitoring(name, service) {
    // Initial check
    this.checkService(name, service);
    
    // Schedule periodic checks
    this.intervals[name] = setInterval(() => {
      this.checkService(name, service);
    }, service.checkInterval || 30000);
  }

  async checkService(name, service) {
    try {
      const startTime = Date.now();
      
      // Check HTTP health endpoint
      const healthCheck = await this.checkHealthEndpoint(service);
      
      // Check process
      const processCheck = await this.checkProcess(service);
      
      // Check WebSocket if applicable
      const wsCheck = service.websocket ? await this.checkWebSocket(service) : { success: true };
      
      const responseTime = Date.now() - startTime;
      
      const isHealthy = healthCheck.success && processCheck.success && wsCheck.success;
      const status = isHealthy ? 'healthy' : 'unhealthy';
      
      // Update status
      const previousStatus = this.status[name]?.status;
      
      this.status[name] = {
        name,
        status,
        healthCheck,
        processCheck,
        wsCheck,
        responseTime,
        lastCheck: new Date().toISOString(),
        uptime: this.calculateUptime(name, isHealthy)
      };
      
      // Reset failure count on success
      if (isHealthy) {
        this.failureCounts[name] = 0;
      } else {
        this.failureCounts[name] = (this.failureCounts[name] || 0) + 1;
      }
      
      // Emit status change event
      if (status !== previousStatus || !isHealthy) {
        this.emit('statusChange', {
          name,
          status,
          previousStatus,
          details: this.status[name],
          failureCount: this.failureCounts[name]
        });
      }
      
    } catch (error) {
      this.logger.error(`Error checking service ${name}:`, error);
      
      this.status[name] = {
        name,
        status: 'error',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
      
      this.emit('statusChange', {
        name,
        status: 'error',
        error: error.message
      });
    }
  }

  async checkHealthEndpoint(service) {
    if (!service.healthEndpoint) {
      return { success: true, message: 'No health endpoint configured' };
    }
    
    try {
      const url = `${service.url}${service.healthEndpoint}`;
      const response = await axios.get(url, {
        timeout: service.timeout || 5000,
        validateStatus: () => true
      });
      
      const success = response.status >= 200 && response.status < 300;
      
      return {
        success,
        statusCode: response.status,
        responseTime: response.headers['x-response-time'],
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  async checkProcess(service) {
    if (!service.processName) {
      return { success: true, message: 'No process monitoring configured' };
    }
    
    try {
      const { stdout } = await execAsync(`pgrep -f "${service.processName}"`);
      const pids = stdout.trim().split('\n').filter(Boolean);
      
      if (pids.length === 0) {
        return {
          success: false,
          message: 'Process not found'
        };
      }
      
      // Get process info
      const processInfo = await this.getProcessInfo(pids[0]);
      
      return {
        success: true,
        pids,
        count: pids.length,
        ...processInfo
      };
    } catch (error) {
      if (error.code === 1) {
        // pgrep returns 1 when no processes found
        return {
          success: false,
          message: 'Process not found'
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getProcessInfo(pid) {
    try {
      const { stdout } = await execAsync(`ps -p ${pid} -o %cpu,%mem,etime,rss`);
      const lines = stdout.trim().split('\n');
      
      if (lines.length > 1) {
        const [cpu, mem, elapsed, rss] = lines[1].trim().split(/\s+/);
        
        return {
          cpu: parseFloat(cpu),
          memory: parseFloat(mem),
          elapsed,
          rss: parseInt(rss)
        };
      }
      
      return {};
    } catch (error) {
      this.logger.error('Error getting process info:', error);
      return {};
    }
  }

  async checkWebSocket(service) {
    // WebSocket checking logic would go here
    // For now, return success
    return { success: true };
  }

  calculateUptime(name, isHealthy) {
    if (!this.status[name]) {
      return isHealthy ? 100 : 0;
    }
    
    // Simple uptime calculation
    // In production, you'd want to track this more accurately
    const currentUptime = this.status[name].uptime || 100;
    
    if (isHealthy) {
      return Math.min(100, currentUptime + 0.1);
    } else {
      return Math.max(0, currentUptime - 10);
    }
  }

  getStatus() {
    return this.status;
  }

  getServiceStatus(name) {
    return this.status[name];
  }
}

module.exports = ServiceMonitor;