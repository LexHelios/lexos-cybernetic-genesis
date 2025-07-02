import { PrismaClient } from '@prisma/client';
import { logger } from '@/utils/logger';

const log = logger.child({ context: 'Database' });

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'info' },
    { emit: 'event', level: 'warn' },
  ],
});

// Log database events
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    log.debug('Query:', { query: e.query, params: e.params, duration: e.duration });
  }
});

prisma.$on('error', (e) => {
  log.error('Database error:', e);
});

prisma.$on('info', (e) => {
  log.info('Database info:', e);
});

prisma.$on('warn', (e) => {
  log.warn('Database warning:', e);
});

export async function initializeDatabase() {
  try {
    await prisma.$connect();
    log.info('✅ Database connected successfully');
  } catch (error) {
    log.error('❌ Database connection failed:', error);
    throw error;
  }
}

export async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    log.info('Database disconnected');
  } catch (error) {
    log.error('Error disconnecting database:', error);
  }
}