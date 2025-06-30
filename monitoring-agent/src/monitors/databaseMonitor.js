const EventEmitter = require('events');
const { Client } = require('pg');
const redis = require('redis');

class DatabaseMonitor extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.dbConfig = config.get('database') || {};
    this.intervals = {};
    this.clients = {};
    this.status = {};
  }

  async start() {
    this.logger.info('Starting database monitor...');
    
    // PostgreSQL monitoring
    if (this.dbConfig.postgresql?.enabled) {
      await this.initPostgreSQL();
      this.intervals.postgresql = setInterval(() => {
        this.checkPostgreSQL();
      }, this.dbConfig.postgresql.checkInterval || 60000);
    }
    
    // Redis monitoring
    if (this.dbConfig.redis?.enabled) {
      await this.initRedis();
      this.intervals.redis = setInterval(() => {
        this.checkRedis();
      }, this.dbConfig.redis.checkInterval || 30000);
    }
    
    // Initial checks
    await this.checkAll();
  }

  async stop() {
    this.logger.info('Stopping database monitor...');
    
    // Clear intervals
    for (const interval of Object.values(this.intervals)) {
      clearInterval(interval);
    }
    
    // Close connections
    if (this.clients.postgresql) {
      await this.clients.postgresql.end();
    }
    
    if (this.clients.redis) {
      await this.clients.redis.quit();
    }
    
    this.intervals = {};
    this.clients = {};
  }

  async initPostgreSQL() {
    try {
      const config = this.dbConfig.postgresql;
      
      this.clients.postgresql = new Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        connectionTimeoutMillis: config.connectionTimeout || 5000
      });
      
      await this.clients.postgresql.connect();
      this.logger.info('PostgreSQL monitor connected');
      
    } catch (error) {
      this.logger.error('Failed to initialize PostgreSQL monitor:', error);
      this.emit('connectionError', {
        type: 'postgresql',
        error: error.message
      });
    }
  }

  async initRedis() {
    try {
      const config = this.dbConfig.redis;
      
      this.clients.redis = redis.createClient({
        host: config.host,
        port: config.port,
        connect_timeout: config.connectionTimeout || 3000
      });
      
      this.clients.redis.on('error', (error) => {
        this.logger.error('Redis error:', error);
        this.emit('connectionError', {
          type: 'redis',
          error: error.message
        });
      });
      
      await this.clients.redis.connect();
      this.logger.info('Redis monitor connected');
      
    } catch (error) {
      this.logger.error('Failed to initialize Redis monitor:', error);
      this.emit('connectionError', {
        type: 'redis',
        error: error.message
      });
    }
  }

  async checkAll() {
    if (this.dbConfig.postgresql?.enabled) {
      await this.checkPostgreSQL();
    }
    
    if (this.dbConfig.redis?.enabled) {
      await this.checkRedis();
    }
  }

  async checkPostgreSQL() {
    try {
      const startTime = Date.now();
      
      // Basic connectivity check
      const result = await this.clients.postgresql.query('SELECT 1');
      const responseTime = Date.now() - startTime;
      
      // Get connection stats
      const statsResult = await this.clients.postgresql.query(`
        SELECT 
          (SELECT count(*) FROM pg_stat_activity) as total_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle') as idle_connections,
          (SELECT count(*) FROM pg_stat_activity WHERE wait_event_type IS NOT NULL) as waiting_connections,
          pg_database_size(current_database()) as database_size
      `);
      
      const stats = statsResult.rows[0];
      
      // Get slow queries
      const slowQueriesResult = await this.clients.postgresql.query(`
        SELECT 
          query,
          state,
          wait_event_type,
          wait_event,
          EXTRACT(EPOCH FROM (now() - query_start)) as duration
        FROM pg_stat_activity
        WHERE state = 'active' 
          AND query NOT LIKE '%pg_stat_activity%'
          AND EXTRACT(EPOCH FROM (now() - query_start)) > 5
        ORDER BY duration DESC
        LIMIT 5
      `);
      
      const slowQueries = slowQueriesResult.rows;
      
      // Get replication status (if applicable)
      let replicationStatus = null;
      try {
        const replResult = await this.clients.postgresql.query(`
          SELECT 
            state,
            sent_lsn,
            write_lsn,
            flush_lsn,
            replay_lsn,
            write_lag,
            flush_lag,
            replay_lag
          FROM pg_stat_replication
        `);
        
        if (replResult.rows.length > 0) {
          replicationStatus = replResult.rows;
        }
      } catch (error) {
        // Replication might not be configured
      }
      
      // Update status
      this.status.postgresql = {
        status: 'healthy',
        responseTime,
        connections: {
          total: parseInt(stats.total_connections),
          active: parseInt(stats.active_connections),
          idle: parseInt(stats.idle_connections),
          waiting: parseInt(stats.waiting_connections)
        },
        databaseSize: parseInt(stats.database_size),
        slowQueries: slowQueries.length,
        replication: replicationStatus,
        lastCheck: new Date().toISOString()
      };
      
      // Check connection limits
      const config = this.dbConfig.postgresql;
      const connectionRatio = (stats.total_connections / config.maxConnections) * 100;
      
      if (connectionRatio >= config.warningConnections) {
        this.emit('threshold', {
          type: 'postgresql-connections',
          severity: connectionRatio >= 90 ? 'critical' : 'warning',
          value: stats.total_connections,
          threshold: config.maxConnections,
          percentage: connectionRatio
        });
      }
      
      // Check for slow queries
      if (slowQueries.length > 0) {
        this.emit('slowQueries', {
          type: 'postgresql',
          count: slowQueries.length,
          queries: slowQueries.map(q => ({
            query: q.query.substring(0, 100) + '...',
            duration: parseFloat(q.duration).toFixed(2),
            state: q.state,
            waitEvent: q.wait_event_type
          }))
        });
      }
      
      this.emit('status', {
        type: 'postgresql',
        ...this.status.postgresql
      });
      
    } catch (error) {
      this.logger.error('PostgreSQL check failed:', error);
      
      this.status.postgresql = {
        status: 'error',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
      
      this.emit('connectionError', {
        type: 'postgresql',
        error: error.message
      });
      
      // Try to reconnect
      try {
        await this.clients.postgresql.end();
        await this.initPostgreSQL();
      } catch (reconnectError) {
        this.logger.error('PostgreSQL reconnection failed:', reconnectError);
      }
    }
  }

  async checkRedis() {
    try {
      const startTime = Date.now();
      
      // Basic connectivity check
      await this.clients.redis.ping();
      const responseTime = Date.now() - startTime;
      
      // Get info
      const info = await this.clients.redis.info();
      const stats = this.parseRedisInfo(info);
      
      // Get memory info
      const memoryInfo = await this.clients.redis.info('memory');
      const memoryStats = this.parseRedisInfo(memoryInfo);
      
      // Get connected clients
      const clients = await this.clients.redis.clientList();
      
      // Update status
      this.status.redis = {
        status: 'healthy',
        responseTime,
        version: stats.redis_version,
        uptime: parseInt(stats.uptime_in_seconds),
        connectedClients: parseInt(stats.connected_clients),
        usedMemory: parseInt(memoryStats.used_memory),
        usedMemoryPeak: parseInt(memoryStats.used_memory_peak),
        memoryFragmentation: parseFloat(memoryStats.mem_fragmentation_ratio),
        totalCommandsProcessed: parseInt(stats.total_commands_processed),
        instantaneousOps: parseInt(stats.instantaneous_ops_per_sec),
        keyspaceHits: parseInt(stats.keyspace_hits || 0),
        keyspaceMisses: parseInt(stats.keyspace_misses || 0),
        lastCheck: new Date().toISOString()
      };
      
      // Calculate hit rate
      const hits = this.status.redis.keyspaceHits;
      const misses = this.status.redis.keyspaceMisses;
      if (hits + misses > 0) {
        this.status.redis.hitRate = (hits / (hits + misses)) * 100;
      }
      
      // Check memory fragmentation
      if (memoryStats.mem_fragmentation_ratio > 1.5) {
        this.emit('threshold', {
          type: 'redis-fragmentation',
          severity: 'warning',
          value: memoryStats.mem_fragmentation_ratio,
          message: 'High Redis memory fragmentation detected'
        });
      }
      
      this.emit('status', {
        type: 'redis',
        ...this.status.redis
      });
      
    } catch (error) {
      this.logger.error('Redis check failed:', error);
      
      this.status.redis = {
        status: 'error',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
      
      this.emit('connectionError', {
        type: 'redis',
        error: error.message
      });
      
      // Try to reconnect
      try {
        await this.clients.redis.quit();
        await this.initRedis();
      } catch (reconnectError) {
        this.logger.error('Redis reconnection failed:', reconnectError);
      }
    }
  }

  parseRedisInfo(info) {
    const stats = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    }
    
    return stats;
  }

  getStatus() {
    return this.status;
  }

  async runQuery(database, query) {
    if (database === 'postgresql' && this.clients.postgresql) {
      return await this.clients.postgresql.query(query);
    } else if (database === 'redis' && this.clients.redis) {
      // Parse and execute Redis command
      const parts = query.split(' ');
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);
      
      return await this.clients.redis[command](...args);
    }
    
    throw new Error(`Database ${database} not available`);
  }
}

module.exports = DatabaseMonitor;