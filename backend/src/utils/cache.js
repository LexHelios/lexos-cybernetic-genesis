
import { LRUCache } from 'lru-cache';

class CacheManager {
  constructor() {
    // Response cache for API calls
    this.responseCache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 5, // 5 minutes
      allowStale: false,
      updateAgeOnGet: false,
      updateAgeOnHas: false
    });

    // Model inference cache
    this.modelCache = new LRUCache({
      max: 500,
      ttl: 1000 * 60 * 15, // 15 minutes
      allowStale: true,
      updateAgeOnGet: true,
      updateAgeOnHas: false
    });

    // System metrics cache
    this.metricsCache = new LRUCache({
      max: 100,
      ttl: 1000 * 30, // 30 seconds
      allowStale: true,
      updateAgeOnGet: false,
      updateAgeOnHas: false
    });

    // User session cache
    this.sessionCache = new LRUCache({
      max: 10000,
      ttl: 1000 * 60 * 60 * 24, // 24 hours
      allowStale: false,
      updateAgeOnGet: true,
      updateAgeOnHas: false
    });
  }

  // Generic cache methods
  get(cacheType, key) {
    const cache = this.getCache(cacheType);
    return cache ? cache.get(key) : null;
  }

  set(cacheType, key, value, ttl = null) {
    const cache = this.getCache(cacheType);
    if (cache) {
      if (ttl) {
        cache.set(key, value, { ttl });
      } else {
        cache.set(key, value);
      }
    }
  }

  delete(cacheType, key) {
    const cache = this.getCache(cacheType);
    if (cache) {
      cache.delete(key);
    }
  }

  clear(cacheType) {
    const cache = this.getCache(cacheType);
    if (cache) {
      cache.clear();
    }
  }

  getCache(type) {
    switch (type) {
      case 'response': return this.responseCache;
      case 'model': return this.modelCache;
      case 'metrics': return this.metricsCache;
      case 'session': return this.sessionCache;
      default: return null;
    }
  }

  // Cache middleware for Express
  cacheMiddleware(cacheType, ttl = null) {
    return (req, res, next) => {
      const key = this.generateKey(req);
      const cached = this.get(cacheType, key);

      if (cached) {
        return res.json(cached);
      }

      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = (data) => {
        this.set(cacheType, key, data, ttl);
        return originalJson.call(res, data);
      };

      next();
    };
  }

  generateKey(req) {
    return `${req.method}:${req.path}:${JSON.stringify(req.query)}:${JSON.stringify(req.body)}`;
  }

  // Model inference caching
  async cacheModelResponse(modelName, prompt, options, responseGenerator) {
    const key = `${modelName}:${this.hashString(prompt)}:${JSON.stringify(options)}`;
    const cached = this.get('model', key);

    if (cached) {
      return { ...cached, fromCache: true };
    }

    const response = await responseGenerator();
    this.set('model', key, response);
    return { ...response, fromCache: false };
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  // Cache statistics
  getStats() {
    return {
      response: {
        size: this.responseCache.size,
        max: this.responseCache.max,
        calculatedSize: this.responseCache.calculatedSize
      },
      model: {
        size: this.modelCache.size,
        max: this.modelCache.max,
        calculatedSize: this.modelCache.calculatedSize
      },
      metrics: {
        size: this.metricsCache.size,
        max: this.metricsCache.max,
        calculatedSize: this.metricsCache.calculatedSize
      },
      session: {
        size: this.sessionCache.size,
        max: this.sessionCache.max,
        calculatedSize: this.sessionCache.calculatedSize
      }
    };
  }

  // Warm up cache with common requests
  async warmUp() {
    console.log('Warming up cache...');
    // Add common cache entries here
    // This could include frequently accessed system info, model lists, etc.
  }
}

export const cacheManager = new CacheManager();
export default cacheManager;
