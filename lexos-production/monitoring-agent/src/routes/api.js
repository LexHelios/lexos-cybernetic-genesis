const express = require('express');

module.exports = (monitoringCore) => {
  const router = express.Router();
  
  // Get current status
  router.get('/status', async (req, res) => {
    try {
      const status = monitoringCore.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get metrics
  router.get('/metrics/:type', async (req, res) => {
    try {
      const { type } = req.params;
      const { period = '1h' } = req.query;
      
      const metrics = await monitoringCore.getMetrics(type, period);
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get incidents
  router.get('/incidents', async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const incidents = await monitoringCore.getIncidents(parseInt(limit));
      res.json(incidents);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get alerts
  router.get('/alerts', async (req, res) => {
    try {
      const { limit = 50 } = req.query;
      const alerts = await monitoringCore.getAlerts(parseInt(limit));
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Service operations
  router.post('/services/:name/restart', async (req, res) => {
    try {
      const { name } = req.params;
      const result = await monitoringCore.restartService(name);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Recovery actions
  router.post('/recovery/action', async (req, res) => {
    try {
      const { action } = req.body;
      const result = await monitoringCore.runRecoveryAction(action);
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  // Export report
  router.get('/report/export', async (req, res) => {
    try {
      const { format = 'json', startDate, endDate } = req.query;
      
      const report = {
        generatedAt: new Date().toISOString(),
        period: {
          start: startDate || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end: endDate || new Date().toISOString()
        },
        status: monitoringCore.getStatus(),
        incidents: await monitoringCore.getIncidents(100),
        alerts: await monitoringCore.getAlerts(100)
      };
      
      if (format === 'json') {
        res.json(report);
      } else {
        // CSV or other formats could be implemented here
        res.status(400).json({ error: 'Unsupported format' });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Health check endpoint for the monitoring agent itself
  router.get('/health', (req, res) => {
    const health = {
      status: 'healthy',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
    
    res.json(health);
  });
  
  // Configuration endpoints
  router.get('/config', (req, res) => {
    // Return non-sensitive configuration
    const config = monitoringCore.config.get();
    const safeConfig = JSON.parse(JSON.stringify(config));
    
    // Remove sensitive data
    if (safeConfig.alerts?.email?.smtp?.auth) {
      safeConfig.alerts.email.smtp.auth = { user: '***', pass: '***' };
    }
    if (safeConfig.agent?.authentication) {
      safeConfig.agent.authentication = { ...safeConfig.agent.authentication, password: '***' };
    }
    
    res.json(safeConfig);
  });
  
  // Diagnostics
  router.get('/diagnostics/network', async (req, res) => {
    try {
      const networkMonitor = monitoringCore.monitors.network;
      const diagnostics = await networkMonitor.runDiagnostics();
      res.json(diagnostics);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // SSL certificate status
  router.get('/ssl/status', (req, res) => {
    try {
      const sslMonitor = monitoringCore.monitors.ssl;
      const status = sslMonitor.getStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // SSL renewal commands
  router.get('/ssl/renewal-commands', async (req, res) => {
    try {
      const sslMonitor = monitoringCore.monitors.ssl;
      const commands = await sslMonitor.generateRenewalCommands();
      res.json(commands);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Service logs
  router.get('/services/:name/logs', async (req, res) => {
    try {
      const { name } = req.params;
      const { lines = 50 } = req.query;
      
      const logMonitor = monitoringCore.monitors.log;
      const recentErrors = await logMonitor.getRecentErrors(name, parseInt(lines));
      
      res.json({
        service: name,
        errors: recentErrors,
        errorCount: logMonitor.getErrorCounts()[name] || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  // Database query endpoint (for diagnostics)
  router.post('/database/query', async (req, res) => {
    try {
      const { database, query } = req.body;
      
      // Only allow SELECT queries for safety
      if (!query.trim().toUpperCase().startsWith('SELECT')) {
        return res.status(400).json({ error: 'Only SELECT queries are allowed' });
      }
      
      const dbMonitor = monitoringCore.monitors.database;
      const result = await dbMonitor.runQuery(database, query);
      
      res.json({ success: true, result });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
};