import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/utils/database';
import { redis } from '@/utils/redis';
import { config } from '@/config';
import { AuthRequest } from '@/middleware/auth';
import { AgentOrchestrator } from '@/agents/orchestrator';
import * as os from 'os';

export class SystemController {
  private orchestrator = AgentOrchestrator.getInstance();

  async getSystemStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const [dbStatus, redisStatus, agentStatus, taskStatus] = await Promise.all([
        this.checkDatabaseStatus(),
        this.checkRedisStatus(),
        this.getAgentStatus(),
        this.getTaskStatus(),
      ]);

      res.json({
        success: true,
        data: {
          status: 'operational',
          timestamp: new Date().toISOString(),
          services: {
            database: dbStatus,
            redis: redisStatus,
            agents: agentStatus,
            tasks: taskStatus,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getHealthCheck(req: Request, res: Response, next: NextFunction) {
    try {
      const checks = await Promise.allSettled([
        prisma.$queryRaw`SELECT 1`,
        redis.ping(),
      ]);

      const allHealthy = checks.every(check => check.status === 'fulfilled');

      res.status(allHealthy ? 200 : 503).json({
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: checks[0].status === 'fulfilled',
          redis: checks[1].status === 'fulfilled',
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
      });
    }
  }

  async getVersion(req: Request, res: Response, next: NextFunction) {
    try {
      const packageJson = await import('../../package.json');

      res.json({
        success: true,
        data: {
          name: packageJson.name,
          version: packageJson.version,
          environment: config.env,
          apiVersion: config.apiVersion,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = {
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          cpu: process.cpuUsage(),
          loadAverage: os.loadavg(),
        },
        application: await this.getApplicationMetrics(),
      };

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSystemLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { level, limit = 100, startDate, endDate } = req.query;

      const where: any = {};
      if (level) where.level = level;
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate as string);
        if (endDate) where.timestamp.lte = new Date(endDate as string);
      }

      const logs = await prisma.systemLog.findMany({
        where,
        take: Number(limit),
        orderBy: { timestamp: 'desc' },
      });

      res.json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  async getSystemConfig(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      // Return safe configuration (no secrets)
      const safeConfig = {
        app: {
          name: config.appName,
          version: config.apiVersion,
          environment: config.env,
        },
        features: {
          metricsEnabled: config.metrics.enabled,
          corsOrigins: config.cors.origin,
        },
        limits: {
          rateLimit: {
            windowMs: config.rateLimit.windowMs,
            max: config.rateLimit.max,
          },
          upload: {
            maxSize: config.upload.maxSize,
          },
        },
        services: {
          ollama: {
            url: config.services.ollama.apiUrl,
          },
          openai: {
            configured: !!config.services.openai.apiKey,
          },
          anthropic: {
            configured: !!config.services.anthropic.apiKey,
          },
        },
      };

      res.json({
        success: true,
        data: safeConfig,
      });
    } catch (error) {
      next(error);
    }
  }

  async toggleMaintenanceMode(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { enabled, message } = req.body;

      // Store maintenance mode in Redis
      if (enabled) {
        await redis.set('system:maintenance', JSON.stringify({
          enabled: true,
          message: message || 'System is under maintenance',
          enabledBy: req.user!.id,
          enabledAt: new Date().toISOString(),
        }));
      } else {
        await redis.del('system:maintenance');
      }

      // Broadcast maintenance mode change
      await redis.publish('system:notification', JSON.stringify({
        type: 'maintenance',
        enabled,
        message,
        broadcast: true,
      }));

      res.json({
        success: true,
        message: `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`,
      });
    } catch (error) {
      next(error);
    }
  }

  // Private helper methods
  private async checkDatabaseStatus() {
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency: `${latency}ms`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async checkRedisStatus() {
    try {
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency: `${latency}ms`,
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
      };
    }
  }

  private async getAgentStatus() {
    const [total, active, error] = await Promise.all([
      prisma.agent.count(),
      prisma.agent.count({ where: { status: 'ACTIVE' } }),
      prisma.agent.count({ where: { status: 'ERROR' } }),
    ]);

    const running = this.orchestrator.getRunningAgents().length;

    return {
      total,
      active,
      running,
      error,
    };
  }

  private async getTaskStatus() {
    const [total, pending, running, completed, failed] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'PENDING' } }),
      prisma.task.count({ where: { status: 'RUNNING' } }),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: 'FAILED' } }),
    ]);

    return {
      total,
      pending,
      running,
      completed,
      failed,
    };
  }

  private async getApplicationMetrics() {
    const [userCount, conversationCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.conversation.count(),
      prisma.message.count(),
    ]);

    // Get from Redis cache if available
    const cachedMetrics = await redis.hgetall('app:metrics');

    return {
      users: userCount,
      conversations: conversationCount,
      messages: messageCount,
      ...cachedMetrics,
    };
  }
}