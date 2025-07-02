const EventEmitter = require('events');
const schedule = require('node-schedule');
const ServiceMonitor = require('../monitors/serviceMonitor');
const ResourceMonitor = require('../monitors/resourceMonitor');
const LogMonitor = require('../monitors/logMonitor');
const DatabaseMonitor = require('../monitors/databaseMonitor');
const NetworkMonitor = require('../monitors/networkMonitor');
const SSLMonitor = require('../monitors/sslMonitor');
const AlertManager = require('../managers/alertManager');
const RecoveryManager = require('../managers/recoveryManager');
const MetricsStore = require('../stores/metricsStore');

class MonitoringCore extends EventEmitter {
  constructor(config, logger, io) {
    super();
    this.config = config;
    this.logger = logger;
    this.io = io;
    this.monitors = {};
    this.alertManager = null;
    this.recoveryManager = null;
    this.metricsStore = null;
    this.status = {
      services: {},
      resources: {},
      database: {},
      network: {},
      ssl: {},
      alerts: [],
      incidents: []
    };
    this.isRunning = false;
  }

  async start() {
    try {
      this.logger.info('Starting monitoring core...');
      
      // Initialize components
      await this.initializeComponents();
      
      // Start monitors
      await this.startMonitors();
      
      // Schedule periodic tasks
      this.scheduleTasks();
      
      this.isRunning = true;
      this.logger.info('Monitoring core started successfully');
    } catch (error) {
      this.logger.error('Failed to start monitoring core:', error);
      throw error;
    }
  }

  async stop() {
    try {
      this.logger.info('Stopping monitoring core...');
      
      // Stop all monitors
      for (const monitor of Object.values(this.monitors)) {
        await monitor.stop();
      }
      
      // Clear scheduled tasks
      schedule.gracefulShutdown();
      
      this.isRunning = false;
      this.logger.info('Monitoring core stopped');
    } catch (error) {
      this.logger.error('Error stopping monitoring core:', error);
      throw error;
    }
  }

  async initializeComponents() {
    // Initialize metrics store
    this.metricsStore = new MetricsStore(this.config, this.logger);
    await this.metricsStore.initialize();
    
    // Initialize alert manager
    this.alertManager = new AlertManager(this.config, this.logger);
    this.alertManager.on('alert', (alert) => this.handleAlert(alert));
    
    // Initialize recovery manager
    this.recoveryManager = new RecoveryManager(this.config, this.logger);
    this.recoveryManager.on('recovery', (action) => this.handleRecovery(action));
    
    // Initialize monitors
    this.monitors.service = new ServiceMonitor(this.config, this.logger);
    this.monitors.resource = new ResourceMonitor(this.config, this.logger);
    this.monitors.log = new LogMonitor(this.config, this.logger);
    this.monitors.database = new DatabaseMonitor(this.config, this.logger);
    this.monitors.network = new NetworkMonitor(this.config, this.logger);
    this.monitors.ssl = new SSLMonitor(this.config, this.logger);
    
    // Set up monitor event handlers
    this.setupMonitorHandlers();
  }

  setupMonitorHandlers() {
    // Service monitor events
    this.monitors.service.on('statusChange', (data) => {
      this.status.services[data.name] = data;
      this.emitStatusUpdate('services', data);
      
      if (data.status === 'down' || data.status === 'unhealthy') {
        this.alertManager.createAlert({
          type: 'service',
          severity: 'critical',
          service: data.name,
          message: `Service ${data.name} is ${data.status}`,
          data
        });
        
        // Trigger auto-recovery if enabled
        if (this.config.get('recovery.enabled')) {
          this.recoveryManager.handleServiceDown(data);
        }
      }
    });
    
    // Resource monitor events
    this.monitors.resource.on('threshold', (data) => {
      this.status.resources[data.type] = data;
      this.emitStatusUpdate('resources', data);
      
      this.alertManager.createAlert({
        type: 'resource',
        severity: data.severity,
        resource: data.type,
        message: `${data.type} usage is ${data.value}%`,
        data
      });
      
      // Trigger auto-recovery for high resource usage
      if (this.config.get('recovery.enabled')) {
        this.recoveryManager.handleHighResource(data);
      }
    });
    
    this.monitors.resource.on('metrics', (metrics) => {
      this.metricsStore.store('resources', metrics);
      this.emit('metrics', { type: 'resources', data: metrics });
    });
    
    // Log monitor events
    this.monitors.log.on('error', (data) => {
      this.alertManager.createAlert({
        type: 'log',
        severity: data.severity || 'warning',
        service: data.service,
        message: `Error in ${data.service} logs: ${data.message}`,
        data
      });
    });
    
    // Database monitor events
    this.monitors.database.on('connectionError', (data) => {
      this.status.database[data.type] = { ...data, status: 'error' };
      this.emitStatusUpdate('database', data);
      
      this.alertManager.createAlert({
        type: 'database',
        severity: 'critical',
        database: data.type,
        message: `Database ${data.type} connection error`,
        data
      });
    });
    
    this.monitors.database.on('status', (data) => {
      this.status.database[data.type] = data;
      this.emitStatusUpdate('database', data);
    });
    
    // Network monitor events
    this.monitors.network.on('connectivity', (data) => {
      this.status.network = data;
      this.emitStatusUpdate('network', data);
      
      if (data.failures.length > 0) {
        this.alertManager.createAlert({
          type: 'network',
          severity: 'warning',
          message: `Network connectivity issues detected`,
          data
        });
      }
    });
    
    // SSL monitor events
    this.monitors.ssl.on('expiring', (data) => {
      this.status.ssl[data.path] = data;
      this.emitStatusUpdate('ssl', data);
      
      this.alertManager.createAlert({
        type: 'ssl',
        severity: data.severity,
        message: `SSL certificate ${data.path} expires in ${data.daysUntilExpiry} days`,
        data
      });
    });
  }

  async startMonitors() {
    const startPromises = Object.entries(this.monitors).map(async ([name, monitor]) => {
      try {
        await monitor.start();
        this.logger.info(`Started ${name} monitor`);
      } catch (error) {
        this.logger.error(`Failed to start ${name} monitor:`, error);
      }
    });
    
    await Promise.all(startPromises);
  }

  scheduleTasks() {
    // Clean up old metrics
    schedule.scheduleJob('0 0 * * *', () => {
      this.metricsStore.cleanup();
    });
    
    // Generate daily report
    schedule.scheduleJob('0 8 * * *', () => {
      this.generateDailyReport();
    });
    
    // Memory leak detection
    if (this.config.get('memoryLeak.enabled')) {
      const interval = this.config.get('memoryLeak.checkInterval');
      setInterval(() => {
        this.checkMemoryLeaks();
      }, interval);
    }
  }

  emitStatusUpdate(type, data) {
    this.emit('statusUpdate', {
      type,
      data,
      timestamp: new Date().toISOString()
    });
  }

  handleAlert(alert) {
    // Store alert
    this.status.alerts.unshift({
      ...alert,
      id: Date.now(),
      timestamp: new Date().toISOString()
    });
    
    // Keep only recent alerts
    if (this.status.alerts.length > 100) {
      this.status.alerts = this.status.alerts.slice(0, 100);
    }
    
    // Emit to WebSocket clients
    this.emit('alert', alert);
    
    // Log alert
    this.logger.warn('Alert:', alert.message, alert);
  }

  handleRecovery(action) {
    // Log recovery action
    this.logger.info('Recovery action:', action);
    
    // Store as incident
    this.status.incidents.unshift({
      ...action,
      id: Date.now(),
      timestamp: new Date().toISOString()
    });
    
    // Keep only recent incidents
    if (this.status.incidents.length > 100) {
      this.status.incidents = this.status.incidents.slice(0, 100);
    }
    
    // Emit recovery event
    this.emit('recovery', action);
  }

  async checkMemoryLeaks() {
    try {
      const services = this.config.get('services');
      
      for (const [name, service] of Object.entries(services)) {
        const metrics = await this.metricsStore.getRecentMetrics('service', name, 6);
        
        if (metrics.length >= 6) {
          const memoryValues = metrics.map(m => m.memory);
          const growthRate = this.calculateGrowthRate(memoryValues);
          
          if (growthRate > this.config.get('memoryLeak.growthRateThreshold')) {
            this.alertManager.createAlert({
              type: 'memoryLeak',
              severity: 'warning',
              service: name,
              message: `Possible memory leak detected in ${name} (${growthRate}% growth)`,
              data: { growthRate, memoryValues }
            });
          }
        }
      }
    } catch (error) {
      this.logger.error('Error checking memory leaks:', error);
    }
  }

  calculateGrowthRate(values) {
    if (values.length < 2) return 0;
    
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    
    return ((lastValue - firstValue) / firstValue) * 100;
  }

  async generateDailyReport() {
    try {
      const report = {
        date: new Date().toISOString().split('T')[0],
        uptime: this.calculateUptime(),
        incidents: this.status.incidents.filter(i => 
          new Date(i.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ),
        alerts: this.status.alerts.filter(a => 
          new Date(a.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ),
        resourceUsage: await this.metricsStore.getAggregatedMetrics('resources', 24),
        serviceHealth: this.calculateServiceHealth()
      };
      
      // Send report via email if configured
      if (this.config.get('alerts.email.enabled')) {
        await this.alertManager.sendReport(report);
      }
      
      this.logger.info('Daily report generated', report);
    } catch (error) {
      this.logger.error('Error generating daily report:', error);
    }
  }

  calculateUptime() {
    const services = Object.values(this.status.services);
    if (services.length === 0) return 100;
    
    const healthyServices = services.filter(s => s.status === 'healthy').length;
    return (healthyServices / services.length) * 100;
  }

  calculateServiceHealth() {
    const health = {};
    
    for (const [name, status] of Object.entries(this.status.services)) {
      const incidents = this.status.incidents.filter(i => 
        i.service === name && 
        new Date(i.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
      );
      
      health[name] = {
        currentStatus: status.status,
        incidents: incidents.length,
        uptime: status.uptime || 0,
        lastCheck: status.lastCheck
      };
    }
    
    return health;
  }

  // Public API methods
  getStatus() {
    return {
      ...this.status,
      isRunning: this.isRunning,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  async restartService(serviceName) {
    const service = this.config.get(`services.${serviceName}`);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    return await this.recoveryManager.restartService(serviceName, service);
  }

  async runRecoveryAction(action) {
    return await this.recoveryManager.runCustomAction(action);
  }

  async getMetrics(type, period = '1h') {
    return await this.metricsStore.getMetrics(type, period);
  }

  async getIncidents(limit = 50) {
    return this.status.incidents.slice(0, limit);
  }

  async getAlerts(limit = 50) {
    return this.status.alerts.slice(0, limit);
  }
}

module.exports = MonitoringCore;