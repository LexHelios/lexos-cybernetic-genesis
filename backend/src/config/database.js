import pg from 'pg';
import Redis from 'ioredis';
import { promisify } from 'util';

const { Pool } = pg;

// Database configuration
const dbConfig = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  database: process.env.DATABASE_NAME || 'lexos_genesis',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
  
  // Connection pool settings
  max: parseInt(process.env.DATABASE_POOL_SIZE || '20'),
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '2000'),
  
  // Statement timeout to prevent long-running queries
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000'),
  
  // Application name for monitoring
  application_name: 'lexos-genesis'
};

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  keyPrefix: 'lexos:',
  
  // Connection settings
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Enable offline queue
  enableOfflineQueue: true,
  
  // Connection timeout
  connectTimeout: 10000,
  
  // Keep alive
  keepAlive: 30000
};

/**
 * Database connection pool
 */
class DatabasePool {
  constructor() {
    this.pool = null;
    this.redis = null;
    this.connected = false;
  }

  /**
   * Initialize database connections
   */
  async initialize() {
    try {
      // Initialize PostgreSQL connection pool
      this.pool = new Pool(dbConfig);
      
      // Test connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      console.log('PostgreSQL connection pool initialized');
      
      // Initialize Redis connection
      this.redis = new Redis(redisConfig);
      
      // Handle Redis events
      this.redis.on('connect', () => {
        console.log('Redis connected');
      });
      
      this.redis.on('error', (err) => {
        console.error('Redis error:', err);
      });
      
      // Test Redis connection
      await this.redis.ping();
      console.log('Redis connection initialized');
      
      this.connected = true;
      
      // Setup connection monitoring
      this.setupMonitoring();
      
    } catch (error) {
      console.error('Failed to initialize database connections:', error);
      throw error;
    }
  }

  /**
   * Setup connection monitoring
   */
  setupMonitoring() {
    // Monitor PostgreSQL pool
    this.pool.on('error', (err, client) => {
      console.error('Unexpected PostgreSQL error on idle client', err);
    });
    
    this.pool.on('connect', (client) => {
      console.log('New PostgreSQL client connected');
    });
    
    this.pool.on('acquire', (client) => {
      console.debug('PostgreSQL client acquired');
    });
    
    this.pool.on('remove', (client) => {
      console.log('PostgreSQL client removed');
    });
    
    // Log pool stats every minute in development
    if (process.env.NODE_ENV === 'development') {
      setInterval(() => {
        console.log('Pool stats:', {
          total: this.pool.totalCount,
          idle: this.pool.idleCount,
          waiting: this.pool.waitingCount
        });
      }, 60000);
    }
  }

  /**
   * Execute a query with automatic retries
   */
  async query(text, params, options = {}) {
    const maxRetries = options.maxRetries || 3;
    const retryDelay = options.retryDelay || 1000;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const start = Date.now();
        const result = await this.pool.query(text, params);
        const duration = Date.now() - start;
        
        // Log slow queries
        if (duration > 1000) {
          console.warn('Slow query detected:', {
            query: text.substring(0, 100),
            duration: `${duration}ms`,
            rows: result.rowCount
          });
        }
        
        return result;
      } catch (error) {
        console.error(`Query attempt ${attempt} failed:`, error.message);
        
        // Don't retry on certain errors
        if (error.code === '23505' || // unique violation
            error.code === '23503' || // foreign key violation
            error.code === '22P02') { // invalid text representation
          throw error;
        }
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }
  }

  /**
   * Execute a transaction
   */
  async transaction(callback) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get a client for manual transaction management
   */
  async getClient() {
    return this.pool.connect();
  }

  /**
   * Cache operations
   */
  async cacheGet(key) {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async cacheSet(key, value, ttl = 3600) {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async cacheDel(key) {
    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async cacheFlush(pattern = '*') {
    try {
      const keys = await this.redis.keys(`lexos:${pattern}`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache flush error:', error);
      return false;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    const health = {
      postgres: false,
      redis: false,
      poolStats: null
    };
    
    try {
      // Check PostgreSQL
      const pgResult = await this.pool.query('SELECT 1');
      health.postgres = pgResult.rows.length === 1;
      health.poolStats = {
        total: this.pool.totalCount,
        idle: this.pool.idleCount,
        waiting: this.pool.waitingCount
      };
    } catch (error) {
      console.error('PostgreSQL health check failed:', error);
    }
    
    try {
      // Check Redis
      const pong = await this.redis.ping();
      health.redis = pong === 'PONG';
    } catch (error) {
      console.error('Redis health check failed:', error);
    }
    
    return health;
  }

  /**
   * Close all connections
   */
  async close() {
    try {
      if (this.pool) {
        await this.pool.end();
        console.log('PostgreSQL pool closed');
      }
      
      if (this.redis) {
        this.redis.disconnect();
        console.log('Redis connection closed');
      }
      
      this.connected = false;
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
}

// Export singleton instance
const db = new DatabasePool();

export default db;

// Export query builder helpers
export const sql = {
  /**
   * Build INSERT query with returning
   */
  insert: (table, data, returning = '*') => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    return {
      text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING ${returning}`,
      values
    };
  },

  /**
   * Build UPDATE query with returning
   */
  update: (table, data, where, returning = '*') => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');
    
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map((key, i) => `${key} = $${values.length + i + 1}`).join(' AND ');
    
    return {
      text: `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING ${returning}`,
      values: [...values, ...whereValues]
    };
  },

  /**
   * Build DELETE query
   */
  delete: (table, where) => {
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ');
    
    return {
      text: `DELETE FROM ${table} WHERE ${whereClause}`,
      values: whereValues
    };
  },

  /**
   * Build SELECT query with pagination
   */
  select: (table, where = {}, options = {}) => {
    const { columns = '*', orderBy = 'id', order = 'ASC', limit = 100, offset = 0 } = options;
    
    const whereKeys = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereKeys.length > 0
      ? 'WHERE ' + whereKeys.map((key, i) => `${key} = $${i + 1}`).join(' AND ')
      : '';
    
    const paramOffset = whereValues.length;
    
    return {
      text: `SELECT ${columns} FROM ${table} ${whereClause} ORDER BY ${orderBy} ${order} LIMIT $${paramOffset + 1} OFFSET $${paramOffset + 2}`,
      values: [...whereValues, limit, offset]
    };
  }
};