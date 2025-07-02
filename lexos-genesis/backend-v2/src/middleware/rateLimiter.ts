import rateLimit from 'express-rate-limit';
import { config } from '@/config';
import { redis } from '@/utils/redis';
import { Request, Response } from 'express';

// Redis store for rate limiting
class RedisStore {
  constructor(private client: typeof redis) {}

  async increment(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const multi = this.client.multi();
    const keyExpiry = Math.ceil(config.rateLimit.windowMs / 1000);
    
    multi.incr(key);
    multi.expire(key, keyExpiry);
    
    const results = await multi.exec();
    const totalHits = results?.[0]?.[1] as number || 1;
    
    return { totalHits };
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(key);
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(key);
  }
}

// Create rate limiter
export const rateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore(redis) as any,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise use IP
    const userId = (req as any).user?.id;
    return userId ? `rate_limit:user:${userId}` : `rate_limit:ip:${req.ip}`;
  },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: req.rateLimit?.resetTime,
      },
    });
  },
});

// Create custom rate limiters for specific endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  skipSuccessfulRequests: true,
  store: new RedisStore(redis) as any,
  keyGenerator: (req: Request) => `auth_limit:${req.ip}`,
});

export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  store: new RedisStore(redis) as any,
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.id;
    return userId ? `api_limit:user:${userId}` : `api_limit:ip:${req.ip}`;
  },
});