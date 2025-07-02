import { Server } from 'http';
import { logger } from '@/utils/logger';
import { disconnectDatabase } from '@/utils/database';
import { disconnectRedis } from '@/utils/redis';
import { disconnectQueues } from '@/utils/queue';
import { AgentOrchestrator } from '@/agents/orchestrator';

const log = logger.child({ context: 'Shutdown' });

let isShuttingDown = false;

export async function gracefulShutdown(server: Server) {
  if (isShuttingDown) {
    log.info('Shutdown already in progress');
    return;
  }

  isShuttingDown = true;
  log.info('⚠️  Received shutdown signal, starting graceful shutdown...');

  // Stop accepting new connections
  server.close(() => {
    log.info('HTTP server closed');
  });

  try {
    // Give ongoing requests 30 seconds to complete
    const shutdownTimeout = setTimeout(() => {
      log.error('Graceful shutdown timeout, forcing exit');
      process.exit(1);
    }, 30000);

    // Shutdown agent orchestrator
    log.info('Shutting down agent orchestrator...');
    const orchestrator = AgentOrchestrator.getInstance();
    await orchestrator.shutdown();

    // Disconnect from services
    log.info('Disconnecting from services...');
    await Promise.all([
      disconnectDatabase(),
      disconnectRedis(),
      disconnectQueues(),
    ]);

    clearTimeout(shutdownTimeout);
    log.info('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    log.error('Error during graceful shutdown:', error);
    process.exit(1);
  }
}