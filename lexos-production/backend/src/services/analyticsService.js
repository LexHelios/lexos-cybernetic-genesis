import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import Database from 'better-sqlite3';

export class AnalyticsService extends EventEmitter {
  constructor() {
    super();
    this.db = null;
    this.metricsBuffer = [];
    this.flushInterval = null;
    this.aggregationInterval = null;
    this.init();
  }

  async init() {
    try {
      // Initialize analytics database
      const dbPath = path.join(process.cwd(), 'data', 'analytics.db');
      await fs.mkdir(path.dirname(dbPath), { recursive: true });
      
      this.db = new Database(dbPath);
      this.setupDatabase();
      
      // Start background processes
      this.startFlushInterval();
      this.startAggregationInterval();
      
      console.log('Analytics service initialized');
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
    }
  }

  setupDatabase() {
    // Create tables for analytics data
    this.db.exec(`
      -- Raw metrics table
      CREATE TABLE IF NOT EXISTS metrics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        category TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        value REAL NOT NULL,
        metadata TEXT
      );

      -- Aggregated metrics table
      CREATE TABLE IF NOT EXISTS metrics_aggregated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        interval TEXT NOT NULL, -- 'minute', 'hour', 'day'
        category TEXT NOT NULL,
        metric_name TEXT NOT NULL,
        count INTEGER NOT NULL,
        sum REAL NOT NULL,
        avg REAL NOT NULL,
        min REAL NOT NULL,
        max REAL NOT NULL,
        UNIQUE(timestamp, interval, category, metric_name)
      );

      -- Events table
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        event_name TEXT NOT NULL,
        user_id TEXT,
        session_id TEXT,
        properties TEXT
      );

      -- Agent performance table
      CREATE TABLE IF NOT EXISTS agent_performance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        agent_id TEXT NOT NULL,
        agent_type TEXT NOT NULL,
        task_id TEXT,
        execution_time INTEGER,
        success BOOLEAN,
        error_message TEXT,
        resource_usage TEXT,
        
        
      );

      -- Task analytics table
      CREATE TABLE IF NOT EXISTS task_analytics (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        task_id TEXT NOT NULL,
        task_type TEXT NOT NULL,
        status TEXT NOT NULL,
        duration INTEGER,
        queue_time INTEGER,
        execution_time INTEGER,
        retry_count INTEGER DEFAULT 0,
        error_count INTEGER DEFAULT 0,
        metadata TEXT,
        
        
      );

      -- System health snapshots
      CREATE TABLE IF NOT EXISTS system_health (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp INTEGER NOT NULL,
        cpu_usage REAL,
        memory_usage REAL,
        disk_usage REAL,
        gpu_usage REAL,
        network_io TEXT,
        active_connections INTEGER,
        error_rate REAL,
        response_time_avg REAL,
        
      );
    `);
  }

  // Track a metric
  trackMetric(category, metricName, value, metadata = null) {
    this.metricsBuffer.push({
      timestamp: Date.now(),
      category,
      metric_name: metricName,
      value,
      metadata: metadata ? JSON.stringify(metadata) : null
    });

    // Emit real-time event
    this.emit('metric', {
      category,
      metricName,
      value,
      metadata,
      timestamp: Date.now()
    });
  }

  // Track an event
  trackEvent(eventType, eventName, properties = {}) {
    const event = {
      timestamp: Date.now(),
      event_type: eventType,
      event_name: eventName,
      user_id: properties.userId || null,
      session_id: properties.sessionId || null,
      properties: JSON.stringify(properties)
    };

    // Insert immediately for events
    const stmt = this.db.prepare(`
      INSERT INTO events (timestamp, event_type, event_name, user_id, session_id, properties)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.timestamp,
      event.event_type,
      event.event_name,
      event.user_id,
      event.session_id,
      event.properties
    );

    // Emit real-time event
    this.emit('event', event);
  }

  // Track agent performance
  trackAgentPerformance(agentId, agentType, performance) {
    const stmt = this.db.prepare(`
      INSERT INTO agent_performance 
      (timestamp, agent_id, agent_type, task_id, execution_time, success, error_message, resource_usage)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      Date.now(),
      agentId,
      agentType,
      performance.taskId || null,
      performance.executionTime || null,
      performance.success ? 1 : 0,
      performance.errorMessage || null,
      JSON.stringify(performance.resourceUsage || {})
    );

    // Update real-time stats
    this.emit('agentPerformance', {
      agentId,
      agentType,
      performance,
      timestamp: Date.now()
    });
  }

  // Track task analytics
  trackTask(taskId, taskType, analytics) {
    const stmt = this.db.prepare(`
      INSERT INTO task_analytics 
      (timestamp, task_id, task_type, status, duration, queue_time, execution_time, retry_count, error_count, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      Date.now(),
      taskId,
      taskType,
      analytics.status,
      analytics.duration || null,
      analytics.queueTime || null,
      analytics.executionTime || null,
      analytics.retryCount || 0,
      analytics.errorCount || 0,
      JSON.stringify(analytics.metadata || {})
    );

    // Update task metrics
    this.trackMetric('tasks', `${taskType}_${analytics.status}`, 1);
    if (analytics.duration) {
      this.trackMetric('tasks', `${taskType}_duration`, analytics.duration);
    }
  }

  // Track system health
  async trackSystemHealth(health) {
    const stmt = this.db.prepare(`
      INSERT INTO system_health 
      (timestamp, cpu_usage, memory_usage, disk_usage, gpu_usage, network_io, 
       active_connections, error_rate, response_time_avg)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      Date.now(),
      health.cpuUsage || null,
      health.memoryUsage || null,
      health.diskUsage || null,
      health.gpuUsage || null,
      JSON.stringify(health.networkIO || {}),
      health.activeConnections || 0,
      health.errorRate || 0,
      health.responseTimeAvg || null
    );

    // Track individual health metrics
    if (health.cpuUsage !== undefined) {
      this.trackMetric('system', 'cpu_usage', health.cpuUsage);
    }
    if (health.memoryUsage !== undefined) {
      this.trackMetric('system', 'memory_usage', health.memoryUsage);
    }
  }

  // Flush metrics buffer to database
  async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    const stmt = this.db.prepare(`
      INSERT INTO metrics (timestamp, category, metric_name, value, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = this.db.transaction((metrics) => {
      for (const metric of metrics) {
        stmt.run(
          metric.timestamp,
          metric.category,
          metric.metric_name,
          metric.value,
          metric.metadata
        );
      }
    });

    try {
      insertMany(metrics);
    } catch (error) {
      console.error('Error flushing metrics:', error);
      // Re-add metrics to buffer on error
      this.metricsBuffer.unshift(...metrics);
    }
  }

  // Aggregate metrics
  async aggregateMetrics() {
    const now = Date.now();
    const intervals = [
      { name: 'minute', duration: 60000, cutoff: now - 3600000 }, // Keep 1 hour of minute data
      { name: 'hour', duration: 3600000, cutoff: now - 86400000 * 7 }, // Keep 7 days of hourly data
      { name: 'day', duration: 86400000, cutoff: now - 86400000 * 90 } // Keep 90 days of daily data
    ];

    for (const interval of intervals) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO metrics_aggregated 
        (timestamp, interval, category, metric_name, count, sum, avg, min, max)
        SELECT 
          (timestamp / ?) * ? as interval_timestamp,
          ? as interval_name,
          category,
          metric_name,
          COUNT(*) as count,
          SUM(value) as sum,
          AVG(value) as avg,
          MIN(value) as min,
          MAX(value) as max
        FROM metrics
        WHERE timestamp >= ?
          AND timestamp < ?
        GROUP BY interval_timestamp, category, metric_name
      `);

      stmt.run(
        interval.duration,
        interval.duration,
        interval.name,
        interval.cutoff,
        now
      );
    }

    // Clean up old raw metrics
    this.db.prepare('DELETE FROM metrics WHERE timestamp < ?').run(now - 3600000); // Keep 1 hour of raw data
  }

  // Query methods
  async getMetrics(category, metricName, startTime, endTime, interval = 'raw') {
    if (interval === 'raw') {
      const stmt = this.db.prepare(`
        SELECT timestamp, value, metadata
        FROM metrics
        WHERE category = ? AND metric_name = ?
          AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
      `);
      
      return stmt.all(category, metricName, startTime, endTime);
    } else {
      const stmt = this.db.prepare(`
        SELECT timestamp, count, sum, avg, min, max
        FROM metrics_aggregated
        WHERE category = ? AND metric_name = ? AND interval = ?
          AND timestamp >= ? AND timestamp <= ?
        ORDER BY timestamp ASC
      `);
      
      return stmt.all(category, metricName, interval, startTime, endTime);
    }
  }

  async getEvents(eventType, startTime, endTime, limit = 1000) {
    const stmt = this.db.prepare(`
      SELECT *
      FROM events
      WHERE event_type = ?
        AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(eventType, startTime, endTime, limit);
  }

  async getAgentPerformanceStats(agentId, startTime, endTime) {
    const stmt = this.db.prepare(`
      SELECT 
        agent_type,
        COUNT(*) as total_tasks,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tasks,
        AVG(execution_time) as avg_execution_time,
        MIN(execution_time) as min_execution_time,
        MAX(execution_time) as max_execution_time
      FROM agent_performance
      WHERE agent_id = ?
        AND timestamp >= ? AND timestamp <= ?
      GROUP BY agent_type
    `);
    
    return stmt.all(agentId, startTime, endTime);
  }

  async getTaskAnalytics(startTime, endTime) {
    const stmt = this.db.prepare(`
      SELECT 
        task_type,
        status,
        COUNT(*) as count,
        AVG(duration) as avg_duration,
        AVG(queue_time) as avg_queue_time,
        AVG(execution_time) as avg_execution_time,
        SUM(retry_count) as total_retries,
        SUM(error_count) as total_errors
      FROM task_analytics
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY task_type, status
    `);
    
    return stmt.all(startTime, endTime);
  }

  async getSystemHealthHistory(startTime, endTime, limit = 1000) {
    const stmt = this.db.prepare(`
      SELECT *
      FROM system_health
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    
    return stmt.all(startTime, endTime, limit);
  }

  // Real-time dashboard data
  async getDashboardStats() {
    const now = Date.now();
    const hourAgo = now - 3600000;
    const dayAgo = now - 86400000;

    // Get current system health
    const healthStmt = this.db.prepare(`
      SELECT *
      FROM system_health
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    const currentHealth = healthStmt.get();

    // Get task stats for last hour
    const taskStatsStmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_tasks,
        AVG(CASE WHEN status = 'completed' THEN duration END) as avg_duration
      FROM task_analytics
      WHERE timestamp >= ?
    `);
    const taskStats = taskStatsStmt.get(hourAgo);

    // Get agent performance stats
    const agentStatsStmt = this.db.prepare(`
      SELECT 
        agent_type,
        COUNT(*) as task_count,
        AVG(execution_time) as avg_execution_time,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) * 100.0 / COUNT(*) as success_rate
      FROM agent_performance
      WHERE timestamp >= ?
      GROUP BY agent_type
    `);
    const agentStats = agentStatsStmt.all(hourAgo);

    // Get event counts
    const eventStatsStmt = this.db.prepare(`
      SELECT 
        event_type,
        COUNT(*) as count
      FROM events
      WHERE timestamp >= ?
      GROUP BY event_type
    `);
    const eventStats = eventStatsStmt.all(hourAgo);

    return {
      timestamp: now,
      system: currentHealth,
      tasks: taskStats,
      agents: agentStats,
      events: eventStats
    };
  }

  // Background processes
  startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 5000); // Flush every 5 seconds
  }

  startAggregationInterval() {
    this.aggregationInterval = setInterval(() => {
      this.aggregateMetrics();
    }, 60000); // Aggregate every minute
  }

  // Cleanup
  async close() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    
    // Final flush
    await this.flushMetrics();
    
    if (this.db) {
      this.db.close();
    }
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();