import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { config } from '@/config';
import { logger } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { rateLimiter } from '@/middleware/rateLimiter';
import { setupRoutes } from '@/routes';
import { setupWebSocket } from '@/websocket';
import { initializeDatabase } from '@/utils/database';
import { initializeRedis } from '@/utils/redis';
import { initializeQueue } from '@/utils/queue';
import { AgentOrchestrator } from '@/agents/orchestrator';
import { MetricsService } from '@/services/metrics.service';
import { gracefulShutdown } from '@/utils/shutdown';

async function bootstrap() {
  try {
    // Initialize services
    await initializeDatabase();
    await initializeRedis();
    await initializeQueue();

    // Create Express app
    const app = express();
    const server = createServer(app);
    const io = new Server(server, {
      cors: {
        origin: config.ws.corsOrigin,
        credentials: true
      }
    });

    // Global middleware
    app.use(helmet());
    app.use(cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials
    }));
    app.use(compression());
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(morgan('combined', { stream: { write: (message) => logger.info(message.trim()) } }));

    // Rate limiting
    app.use(rateLimiter);

    // Health check endpoints
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    app.get('/ready', async (req, res) => {
      try {
        // Check database connection
        const { prisma } = await import('@/utils/database');
        await prisma.$queryRaw`SELECT 1`;
        
        // Check Redis connection
        const { redis } = await import('@/utils/redis');
        await redis.ping();
        
        res.json({ status: 'ready', timestamp: new Date().toISOString() });
      } catch (error) {
        res.status(503).json({ status: 'not ready', error: error.message });
      }
    });

    // Setup routes
    setupRoutes(app);

    // Setup WebSocket
    setupWebSocket(io);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // Initialize agent orchestrator
    const orchestrator = AgentOrchestrator.getInstance();
    await orchestrator.initialize();

    // Initialize metrics
    if (config.metrics.enabled) {
      const metricsService = MetricsService.getInstance();
      await metricsService.startServer();
    }

    // Start server
    server.listen(config.port, () => {
      logger.info(`🚀 ${config.appName} is running on port ${config.port}`);
      logger.info(`📊 Environment: ${config.env}`);
      logger.info(`🔒 CORS enabled for: ${config.cors.origin}`);
      if (config.metrics.enabled) {
        logger.info(`📈 Metrics available at: http://localhost:${config.metrics.port}/metrics`);
      }
    });

    // Graceful shutdown
    process.on('SIGTERM', () => gracefulShutdown(server));
    process.on('SIGINT', () => gracefulShutdown(server));

  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
bootstrap();