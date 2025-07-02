import Redis from 'ioredis';
import { config } from '@/config';
import { logger } from '@/utils/logger';

const log = logger.child({ context: 'Redis' });

// Create Redis client
export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError: (err) => {
    const targetError = 'READONLY';
    if (err.message.includes(targetError)) {
      return true;
    }
    return false;
  },
});

// Create pub/sub clients
export const publisher = redis.duplicate();
export const subscriber = redis.duplicate();

// Redis event handlers
redis.on('connect', () => {
  log.info('✅ Redis connected successfully');
});

redis.on('error', (err) => {
  log.error('Redis error:', err);
});

redis.on('close', () => {
  log.info('Redis connection closed');
});

redis.on('reconnecting', () => {
  log.info('Redis reconnecting...');
});

// Initialize Redis
export async function initializeRedis() {
  try {
    await redis.ping();
    log.info('✅ Redis initialized successfully');
  } catch (error) {
    log.error('❌ Redis initialization failed:', error);
    throw error;
  }
}

// Disconnect Redis
export async function disconnectRedis() {
  try {
    redis.disconnect();
    publisher.disconnect();
    subscriber.disconnect();
    log.info('Redis disconnected');
  } catch (error) {
    log.error('Error disconnecting Redis:', error);
  }
}

// Utility functions
export const redisUtils = {
  // Set with expiration
  async setex(key: string, seconds: number, value: any): Promise<void> {
    await redis.setex(key, seconds, JSON.stringify(value));
  },

  // Get and parse JSON
  async getJson(key: string): Promise<any | null> {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  },

  // Delete keys by pattern
  async deletePattern(pattern: string): Promise<number> {
    const keys = await redis.keys(pattern);
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  },

  // Increment counter
  async incr(key: string): Promise<number> {
    return await redis.incr(key);
  },

  // Add to set
  async sadd(key: string, ...members: string[]): Promise<number> {
    return await redis.sadd(key, ...members);
  },

  // Get set members
  async smembers(key: string): Promise<string[]> {
    return await redis.smembers(key);
  },

  // Publish message
  async publish(channel: string, message: any): Promise<void> {
    await publisher.publish(channel, JSON.stringify(message));
  },

  // Subscribe to channel
  subscribe(channel: string, callback: (message: any) => void): void {
    subscriber.subscribe(channel);
    subscriber.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          callback(JSON.parse(message));
        } catch (error) {
          log.error('Error parsing message:', error);
        }
      }
    });
  },
};