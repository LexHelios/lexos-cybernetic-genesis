
import { SystemMonitor } from '../services/systemMonitor.js';
import database from '../services/database.js';

class HealthCheckService {
  constructor() {
    this.checks = new Map();
    this.systemMonitor = new SystemMonitor();
    this.registerDefaultChecks();
  }

  registerDefaultChecks() {
    // Database health check
    this.registerCheck('database', async () => {
      try {
        await database.db.get('SELECT 1');
        return { status: 'healthy', message: 'Database connection OK' };
      } catch (error) {
        return { status: 'unhealthy', message: `Database error: ${error.message}` };
      }
    });

    // Memory health check
    this.registerCheck('memory', async () => {
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      
      if (memUsagePercent > 90) {
        return { status: 'critical', message: `High memory usage: ${memUsagePercent.toFixed(2)}%` };
      } else if (memUsagePercent > 75) {
        return { status: 'warning', message: `Elevated memory usage: ${memUsagePercent.toFixed(2)}%` };
      }
      
      return { status: 'healthy', message: `Memory usage: ${memUsagePercent.toFixed(2)}%` };
    });

    // Disk space health check
    this.registerCheck('disk', async () => {
      try {
        const systemInfo = await this.systemMonitor.getSystemInfo();
        const diskUsage = systemInfo.resources.storage.usage_percent;
        
        if (diskUsage > 95) {
          return { status: 'critical', message: `Critical disk usage: ${diskUsage}%` };
        } else if (diskUsage > 85) {
          return { status: 'warning', message: `High disk usage: ${diskUsage}%` };
        }
        
        return { status: 'healthy', message: `Disk usage: ${diskUsage}%` };
      } catch (error) {
        return { status: 'unhealthy', message: `Disk check failed: ${error.message}` };
      }
    });

    // Process health check
    this.registerCheck('process', async () => {
      const uptime = process.uptime();
      const memUsage = process.memoryUsage();
      
      return {
        status: 'healthy',
        message: `Process running for ${Math.floor(uptime)}s`,
        details: {
          uptime,
          pid: process.pid,
          memory: memUsage
        }
      };
    });

    // GPU health check (if available)
    this.registerCheck('gpu', async () => {
      try {
        const gpuStatus = await this.systemMonitor.getGPUStatus();
        if (!gpuStatus) {
          return { status: 'info', message: 'GPU monitoring not available' };
        }

        if (gpuStatus.temperature > 85) {
          return { status: 'warning', message: `High GPU temperature: ${gpuStatus.temperature}°C` };
        }

        if (gpuStatus.utilization > 95) {
          return { status: 'warning', message: `High GPU utilization: ${gpuStatus.utilization}%` };
        }

        return {
          status: 'healthy',
          message: `GPU OK - ${gpuStatus.utilization}% util, ${gpuStatus.temperature}°C`,
          details: gpuStatus
        };
      } catch (error) {
        return { status: 'info', message: 'GPU status unavailable' };
      }
    });
  }

  registerCheck(name, checkFunction) {
    this.checks.set(name, checkFunction);
  }

  async runCheck(name) {
    const checkFunction = this.checks.get(name);
    if (!checkFunction) {
      return { status: 'unknown', message: `Check '${name}' not found` };
    }

    try {
      const result = await Promise.race([
        checkFunction(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      
      return {
        ...result,
        timestamp: new Date().toISOString(),
        duration: Date.now() - Date.now() // This would be calculated properly in real implementation
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Check failed: ${error.message}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  async runAllChecks() {
    const results = {};
    const promises = Array.from(this.checks.keys()).map(async (name) => {
      results[name] = await this.runCheck(name);
    });

    await Promise.all(promises);

    // Determine overall health
    const statuses = Object.values(results).map(r => r.status);
    let overallStatus = 'healthy';
    
    if (statuses.includes('critical')) {
      overallStatus = 'critical';
    } else if (statuses.includes('unhealthy')) {
      overallStatus = 'unhealthy';
    } else if (statuses.includes('warning')) {
      overallStatus = 'warning';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: results
    };
  }

  // Express middleware for health check endpoint
  middleware() {
    return async (req, res) => {
      const checkName = req.query.check;
      
      try {
        if (checkName) {
          const result = await this.runCheck(checkName);
          const statusCode = result.status === 'healthy' ? 200 : 
                           result.status === 'warning' ? 200 : 503;
          res.status(statusCode).json(result);
        } else {
          const results = await this.runAllChecks();
          const statusCode = results.status === 'healthy' || results.status === 'warning' ? 200 : 503;
          res.status(statusCode).json(results);
        }
      } catch (error) {
        res.status(500).json({
          status: 'error',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    };
  }
}

export const healthCheck = new HealthCheckService();
export default healthCheck;
