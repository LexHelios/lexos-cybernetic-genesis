import { BaseAgent } from './base.agent';
import { prisma } from '@/utils/database';
import { redis } from '@/utils/redis';
import { config } from '@/config';
import * as os from 'os';

export class SystemAgent extends BaseAgent {
  private metricsInterval?: NodeJS.Timeout;

  protected async onInitialize(): Promise<void> {
    // Add system capabilities
    this.addCapability('system-monitoring');
    this.addCapability('health-check');
    this.addCapability('log-analysis');
    this.addCapability('resource-management');

    // Register system tools
    this.registerSystemTools();

    // Start metrics collection
    this.startMetricsCollection();
  }

  protected async onShutdown(): Promise<void> {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }

  async process(input: any): Promise<any> {
    const { type, payload } = input;

    switch (type) {
      case 'health_check':
        return await this.performHealthCheck();
      
      case 'system_metrics':
        return await this.getSystemMetrics();
      
      case 'analyze_logs':
        return await this.analyzeLogs(payload);
      
      case 'optimize_resources':
        return await this.optimizeResources();
      
      case 'execute_tool':
        return await this.executeTool(payload.tool, payload.params);
      
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }

  private registerSystemTools(): void {
    // Database health check
    this.registerTool({
      name: 'database_health',
      description: 'Check database connectivity and performance',
      schema: {},
      handler: async () => {
        const start = Date.now();
        await prisma.$queryRaw`SELECT 1`;
        const latency = Date.now() - start;

        const stats = await prisma.$queryRaw`
          SELECT 
            pg_database_size(current_database()) as size,
            (SELECT count(*) FROM pg_stat_activity) as connections
        `;

        return {
          status: 'healthy',
          latency: `${latency}ms`,
          stats: stats[0],
        };
      },
    });

    // Redis health check
    this.registerTool({
      name: 'redis_health',
      description: 'Check Redis connectivity and stats',
      schema: {},
      handler: async () => {
        const start = Date.now();
        await redis.ping();
        const latency = Date.now() - start;

        const info = await redis.info();
        const stats = this.parseRedisInfo(info);

        return {
          status: 'healthy',
          latency: `${latency}ms`,
          stats: {
            used_memory: stats.used_memory_human,
            connected_clients: stats.connected_clients,
            uptime_in_days: stats.uptime_in_days,
          },
        };
      },
    });

    // System cleanup
    this.registerTool({
      name: 'system_cleanup',
      description: 'Clean up old logs, sessions, and temporary data',
      schema: {
        daysToKeep: { type: 'number', default: 30 },
      },
      handler: async (params) => {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - (params.daysToKeep || 30));

        // Clean old sessions
        const deletedSessions = await prisma.session.deleteMany({
          where: { expiresAt: { lt: cutoffDate } },
        });

        // Clean old logs
        const deletedLogs = await prisma.systemLog.deleteMany({
          where: { timestamp: { lt: cutoffDate } },
        });

        return {
          deletedSessions: deletedSessions.count,
          deletedLogs: deletedLogs.count,
          freedSpace: 'estimated',
        };
      },
    });
  }

  private async performHealthCheck(): Promise<any> {
    const checks = await Promise.allSettled([
      this.executeTool('database_health', {}),
      this.executeTool('redis_health', {}),
      this.checkDiskSpace(),
      this.checkMemoryUsage(),
    ]);

    const results = checks.map((check, index) => {
      const services = ['database', 'redis', 'disk', 'memory'];
      if (check.status === 'fulfilled') {
        return { service: services[index], ...check.value };
      } else {
        return { service: services[index], status: 'unhealthy', error: check.reason };
      }
    });

    const overallStatus = results.every(r => r.status === 'healthy') ? 'healthy' : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: results,
    };
  }

  private async getSystemMetrics(): Promise<any> {
    const cpuUsage = os.loadavg();
    const memoryUsage = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percentage: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
    };

    const uptime = {
      system: os.uptime(),
      process: process.uptime(),
    };

    // Get application metrics from Redis
    const appMetrics = await redis.hgetall('app:metrics');

    return {
      cpu: {
        loadAverage: cpuUsage,
        cores: os.cpus().length,
      },
      memory: memoryUsage,
      uptime,
      platform: {
        type: os.type(),
        release: os.release(),
        hostname: os.hostname(),
      },
      application: appMetrics,
    };
  }

  private async analyzeLogs(params: any): Promise<any> {
    const { level, limit = 100, startDate, endDate } = params;

    const where: any = {};
    if (level) where.level = level;
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate);
      if (endDate) where.timestamp.lte = new Date(endDate);
    }

    const logs = await prisma.systemLog.findMany({
      where,
      take: limit,
      orderBy: { timestamp: 'desc' },
    });

    // Analyze patterns
    const errorPatterns = logs
      .filter(log => log.level === 'error')
      .reduce((acc, log) => {
        const key = log.context || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalLogs: logs.length,
      levels: logs.reduce((acc, log) => {
        acc[log.level] = (acc[log.level] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      errorPatterns,
      recentLogs: logs.slice(0, 10),
    };
  }

  private async optimizeResources(): Promise<any> {
    const actions = [];

    // Check and optimize database connections
    const dbConnections = await prisma.$queryRaw`
      SELECT count(*) as count FROM pg_stat_activity
    `;
    if (dbConnections[0].count > 50) {
      actions.push('Recommended: Reduce database connection pool size');
    }

    // Check Redis memory usage
    const redisInfo = await redis.info('memory');
    const memoryUsed = this.parseRedisInfo(redisInfo).used_memory;
    if (memoryUsed > 1024 * 1024 * 1024) { // 1GB
      actions.push('Recommended: Clear Redis cache or increase memory limit');
    }

    // Run cleanup if needed
    if (actions.length > 0) {
      await this.executeTool('system_cleanup', { daysToKeep: 7 });
      actions.push('Executed: System cleanup for data older than 7 days');
    }

    return {
      recommendations: actions,
      executed: actions.filter(a => a.startsWith('Executed:')),
    };
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.getSystemMetrics();
        
        // Store in Redis for monitoring
        await redis.hset('app:metrics', {
          ...metrics,
          timestamp: new Date().toISOString(),
        });

        // Store time series data
        const key = `metrics:${new Date().toISOString().split('T')[0]}`;
        await redis.zadd(key, Date.now(), JSON.stringify(metrics));
        await redis.expire(key, 86400 * 7); // Keep for 7 days
      } catch (error) {
        this.logger.error('Error collecting metrics:', error);
      }
    }, 60000); // Every minute
  }

  private async checkDiskSpace(): Promise<any> {
    // This is a simplified version - actual implementation would use proper disk checking
    const stats = await import('fs').then(fs => fs.promises.statfs('/'));
    return {
      status: 'healthy',
      available: stats.bavail * stats.bsize,
      total: stats.blocks * stats.bsize,
      percentage: ((stats.blocks - stats.bavail) / stats.blocks * 100).toFixed(2),
    };
  }

  private async checkMemoryUsage(): Promise<any> {
    const usage = process.memoryUsage();
    const limit = 1024 * 1024 * 1024; // 1GB limit

    return {
      status: usage.heapUsed < limit * 0.8 ? 'healthy' : 'warning',
      usage: {
        rss: usage.rss,
        heapTotal: usage.heapTotal,
        heapUsed: usage.heapUsed,
        external: usage.external,
      },
    };
  }

  private parseRedisInfo(info: string): any {
    const lines = info.split('\r\n');
    const data: any = {};
    
    lines.forEach(line => {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          data[key] = value;
        }
      }
    });
    
    return data;
  }
}