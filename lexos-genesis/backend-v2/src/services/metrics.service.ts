import { register, collectDefaultMetrics, Counter, Histogram, Gauge } from 'prom-client';
import express from 'express';
import { createServer } from 'http';
import { config } from '@/config';
import { logger } from '@/utils/logger';

export class MetricsService {
  private static instance: MetricsService;
  private server?: ReturnType<typeof createServer>;
  private logger = logger.child({ context: 'MetricsService' });

  // Metrics
  private httpRequestDuration: Histogram<string>;
  private httpRequestTotal: Counter<string>;
  private activeConnections: Gauge<string>;
  private agentOperations: Counter<string>;
  private taskExecutions: Counter<string>;
  private cacheHits: Counter<string>;
  private cacheMisses: Counter<string>;
  private wsConnections: Gauge<string>;
  private errorTotal: Counter<string>;

  private constructor() {
    // Collect default metrics
    collectDefaultMetrics({ prefix: 'lexos_' });

    // Initialize custom metrics
    this.httpRequestDuration = new Histogram({
      name: 'lexos_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestTotal = new Counter({
      name: 'lexos_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status'],
    });

    this.activeConnections = new Gauge({
      name: 'lexos_active_connections',
      help: 'Number of active connections',
      labelNames: ['type'],
    });

    this.agentOperations = new Counter({
      name: 'lexos_agent_operations_total',
      help: 'Total number of agent operations',
      labelNames: ['operation', 'agent_type', 'status'],
    });

    this.taskExecutions = new Counter({
      name: 'lexos_task_executions_total',
      help: 'Total number of task executions',
      labelNames: ['type', 'status'],
    });

    this.cacheHits = new Counter({
      name: 'lexos_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['cache_type'],
    });

    this.cacheMisses = new Counter({
      name: 'lexos_cache_misses_total',
      help: 'Total number of cache misses',
      labelNames: ['cache_type'],
    });

    this.wsConnections = new Gauge({
      name: 'lexos_websocket_connections',
      help: 'Number of active WebSocket connections',
      labelNames: ['namespace'],
    });

    this.errorTotal = new Counter({
      name: 'lexos_errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'component'],
    });
  }

  static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  async startServer(): Promise<void> {
    if (!config.metrics.enabled) {
      this.logger.info('Metrics server is disabled');
      return;
    }

    const app = express();

    // Metrics endpoint
    app.get('/metrics', (req, res) => {
      res.set('Content-Type', register.contentType);
      register.metrics().then(metrics => {
        res.end(metrics);
      }).catch(err => {
        res.status(500).end(err);
      });
    });

    // Health check for metrics server
    app.get('/health', (req, res) => {
      res.json({ status: 'healthy' });
    });

    this.server = createServer(app);
    
    this.server.listen(config.metrics.port, () => {
      this.logger.info(`Metrics server listening on port ${config.metrics.port}`);
    });
  }

  async stopServer(): Promise<void> {
    if (this.server) {
      await new Promise<void>((resolve) => {
        this.server!.close(() => {
          this.logger.info('Metrics server stopped');
          resolve();
        });
      });
    }
  }

  // Metric recording methods
  recordHttpRequest(method: string, route: string, status: number, duration: number): void {
    this.httpRequestDuration.observe(
      { method, route, status: status.toString() },
      duration / 1000 // Convert to seconds
    );
    this.httpRequestTotal.inc({ method, route, status: status.toString() });
  }

  recordAgentOperation(operation: string, agentType: string, status: 'success' | 'failure'): void {
    this.agentOperations.inc({ operation, agent_type: agentType, status });
  }

  recordTaskExecution(type: string, status: 'success' | 'failure'): void {
    this.taskExecutions.inc({ type, status });
  }

  recordCacheHit(cacheType: string): void {
    this.cacheHits.inc({ cache_type: cacheType });
  }

  recordCacheMiss(cacheType: string): void {
    this.cacheMisses.inc({ cache_type: cacheType });
  }

  recordError(type: string, component: string): void {
    this.errorTotal.inc({ type, component });
  }

  setActiveConnections(type: string, count: number): void {
    this.activeConnections.set({ type }, count);
  }

  setWebSocketConnections(namespace: string, count: number): void {
    this.wsConnections.set({ namespace }, count);
  }

  // Middleware for Express
  middleware() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route?.path || req.path || 'unknown';
        this.recordHttpRequest(req.method, route, res.statusCode, duration);
      });

      next();
    };
  }
}