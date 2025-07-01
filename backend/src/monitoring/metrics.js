
import { cacheManager } from '../utils/cache.js';

class MetricsService {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    this.activeConnections = 0;
  }

  // Increment request counter
  incrementRequests() {
    this.requestCount++;
  }

  // Increment error counter
  incrementErrors() {
    this.errorCount++;
  }

  // Record response time
  recordResponseTime(time) {
    this.responseTimeSum += time;
  }

  // Set active connections
  setActiveConnections(count) {
    this.activeConnections = count;
  }

  // Get basic metrics
  getBasicMetrics() {
    const uptime = Date.now() - this.startTime;
    const avgResponseTime = this.requestCount > 0 ? this.responseTimeSum / this.requestCount : 0;

    return {
      uptime_seconds: Math.floor(uptime / 1000),
      requests_total: this.requestCount,
      errors_total: this.errorCount,
      response_time_avg_ms: Math.round(avgResponseTime),
      active_connections: this.activeConnections,
      cache_stats: cacheManager.getStats(),
      memory_usage: process.memoryUsage(),
      timestamp: Date.now()
    };
  }

  // Generate Prometheus format metrics
  getPrometheusMetrics() {
    const metrics = this.getBasicMetrics();
    const lines = [];

    // Help and type declarations
    lines.push('# HELP lexos_uptime_seconds Total uptime in seconds');
    lines.push('# TYPE lexos_uptime_seconds counter');
    lines.push(`lexos_uptime_seconds ${metrics.uptime_seconds}`);
    lines.push('');

    lines.push('# HELP lexos_requests_total Total number of requests');
    lines.push('# TYPE lexos_requests_total counter');
    lines.push(`lexos_requests_total ${metrics.requests_total}`);
    lines.push('');

    lines.push('# HELP lexos_errors_total Total number of errors');
    lines.push('# TYPE lexos_errors_total counter');
    lines.push(`lexos_errors_total ${metrics.errors_total}`);
    lines.push('');

    lines.push('# HELP lexos_response_time_avg_ms Average response time in milliseconds');
    lines.push('# TYPE lexos_response_time_avg_ms gauge');
    lines.push(`lexos_response_time_avg_ms ${metrics.response_time_avg_ms}`);
    lines.push('');

    lines.push('# HELP lexos_active_connections Current active connections');
    lines.push('# TYPE lexos_active_connections gauge');
    lines.push(`lexos_active_connections ${metrics.active_connections}`);
    lines.push('');

    // Memory metrics
    lines.push('# HELP lexos_memory_heap_used_bytes Memory heap used in bytes');
    lines.push('# TYPE lexos_memory_heap_used_bytes gauge');
    lines.push(`lexos_memory_heap_used_bytes ${metrics.memory_usage.heapUsed}`);
    lines.push('');

    lines.push('# HELP lexos_memory_heap_total_bytes Memory heap total in bytes');
    lines.push('# TYPE lexos_memory_heap_total_bytes gauge');
    lines.push(`lexos_memory_heap_total_bytes ${metrics.memory_usage.heapTotal}`);
    lines.push('');

    lines.push('# HELP lexos_memory_external_bytes Memory external in bytes');
    lines.push('# TYPE lexos_memory_external_bytes gauge');
    lines.push(`lexos_memory_external_bytes ${metrics.memory_usage.external}`);
    lines.push('');

    // Cache metrics
    Object.entries(metrics.cache_stats).forEach(([cacheType, stats]) => {
      lines.push(`# HELP lexos_cache_size_${cacheType} Cache size for ${cacheType}`);
      lines.push(`# TYPE lexos_cache_size_${cacheType} gauge`);
      lines.push(`lexos_cache_size_${cacheType} ${stats.size}`);
      lines.push('');
    });

    return lines.join('\n');
  }

  // Middleware to track request metrics
  requestMetricsMiddleware() {
    return (req, res, next) => {
      const startTime = Date.now();
      
      // Increment request counter
      this.incrementRequests();
      
      // Track response
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(responseTime);
        
        // Track errors (4xx and 5xx status codes)
        if (res.statusCode >= 400) {
          this.incrementErrors();
        }
      });
      
      next();
    };
  }

  // Express endpoint for metrics
  metricsEndpoint() {
    return (req, res) => {
      const format = req.query.format || 'json';
      
      if (format === 'prometheus') {
        res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
        res.send(this.getPrometheusMetrics());
      } else {
        res.json(this.getBasicMetrics());
      }
    };
  }

  // Custom metric recording
  recordCustomMetric(name, value, labels = {}) {
    const key = `${name}_${JSON.stringify(labels)}`;
    this.metrics.set(key, {
      name,
      value,
      labels,
      timestamp: Date.now()
    });
  }

  // Get custom metrics
  getCustomMetrics() {
    const result = {};
    this.metrics.forEach((metric, key) => {
      result[key] = metric;
    });
    return result;
  }

  // Reset metrics (useful for testing)
  reset() {
    this.requestCount = 0;
    this.errorCount = 0;
    this.responseTimeSum = 0;
    this.activeConnections = 0;
    this.metrics.clear();
    this.startTime = Date.now();
  }
}

export const metricsService = new MetricsService();
export default metricsService;
