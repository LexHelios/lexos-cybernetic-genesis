const fs = require('fs-extra');
const path = require('path');

class MetricsStore {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.metricsDir = path.join(__dirname, '../../metrics');
    this.retentionDays = config.get('agent.metrics.retentionDays') || 30;
    this.aggregationInterval = config.get('agent.metrics.aggregationInterval') || 60000;
    
    // In-memory cache for recent metrics
    this.cache = {
      resources: [],
      services: [],
      database: [],
      network: []
    };
    
    this.maxCacheSize = 1000;
  }

  async initialize() {
    // Ensure metrics directory exists
    await fs.ensureDir(this.metricsDir);
    
    // Load today's metrics into cache
    await this.loadTodayMetrics();
    
    // Schedule periodic saves
    setInterval(() => {
      this.saveMetrics();
    }, this.aggregationInterval);
  }

  async store(type, metrics) {
    const timestamp = new Date().toISOString();
    const entry = {
      timestamp,
      ...metrics
    };
    
    // Add to cache
    if (this.cache[type]) {
      this.cache[type].push(entry);
      
      // Trim cache if too large
      if (this.cache[type].length > this.maxCacheSize) {
        this.cache[type] = this.cache[type].slice(-this.maxCacheSize);
      }
    }
    
    // Write to file periodically (handled by interval)
  }

  async saveMetrics() {
    const date = new Date().toISOString().split('T')[0];
    
    for (const [type, metrics] of Object.entries(this.cache)) {
      if (metrics.length === 0) continue;
      
      const filePath = path.join(this.metricsDir, `${type}-${date}.json`);
      
      try {
        // Read existing metrics
        let existingMetrics = [];
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          existingMetrics = JSON.parse(content);
        }
        
        // Append new metrics
        existingMetrics.push(...metrics);
        
        // Write back
        await fs.writeFile(filePath, JSON.stringify(existingMetrics, null, 2));
        
        // Clear saved metrics from cache
        this.cache[type] = [];
        
      } catch (error) {
        this.logger.error(`Error saving metrics for ${type}:`, error);
      }
    }
  }

  async loadTodayMetrics() {
    const date = new Date().toISOString().split('T')[0];
    
    for (const type of Object.keys(this.cache)) {
      const filePath = path.join(this.metricsDir, `${type}-${date}.json`);
      
      try {
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          const metrics = JSON.parse(content);
          
          // Load only recent metrics (last hour)
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
          this.cache[type] = metrics.filter(m => 
            new Date(m.timestamp) > oneHourAgo
          );
        }
      } catch (error) {
        this.logger.error(`Error loading metrics for ${type}:`, error);
      }
    }
  }

  async getMetrics(type, period = '1h') {
    const now = new Date();
    const startTime = this.calculateStartTime(now, period);
    
    // Get from cache first
    let metrics = this.cache[type] || [];
    metrics = metrics.filter(m => new Date(m.timestamp) >= startTime);
    
    // If we need older data, load from files
    if (this.needsHistoricalData(startTime)) {
      const historicalMetrics = await this.loadHistoricalMetrics(type, startTime, now);
      metrics = [...historicalMetrics, ...metrics];
    }
    
    // Sort by timestamp
    metrics.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    return metrics;
  }

  calculateStartTime(now, period) {
    const match = period.match(/^(\d+)([hdwm])$/);
    if (!match) {
      throw new Error(`Invalid period format: ${period}`);
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'h': // hours
        return new Date(now - value * 60 * 60 * 1000);
      case 'd': // days
        return new Date(now - value * 24 * 60 * 60 * 1000);
      case 'w': // weeks
        return new Date(now - value * 7 * 24 * 60 * 60 * 1000);
      case 'm': // months
        return new Date(now - value * 30 * 24 * 60 * 60 * 1000);
      default:
        throw new Error(`Unknown time unit: ${unit}`);
    }
  }

  needsHistoricalData(startTime) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    return startTime < todayStart;
  }

  async loadHistoricalMetrics(type, startTime, endTime) {
    const metrics = [];
    
    // Calculate date range
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);
    
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const filePath = path.join(this.metricsDir, `${type}-${dateStr}.json`);
      
      try {
        if (await fs.pathExists(filePath)) {
          const content = await fs.readFile(filePath, 'utf-8');
          const dayMetrics = JSON.parse(content);
          
          // Filter by time range
          const filtered = dayMetrics.filter(m => {
            const timestamp = new Date(m.timestamp);
            return timestamp >= startTime && timestamp <= endTime;
          });
          
          metrics.push(...filtered);
        }
      } catch (error) {
        this.logger.error(`Error loading historical metrics for ${type} on ${dateStr}:`, error);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return metrics;
  }

  async getAggregatedMetrics(type, hours = 24) {
    const metrics = await this.getMetrics(type, `${hours}h`);
    
    if (metrics.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        peak: 0
      };
    }
    
    // Calculate aggregations based on type
    if (type === 'resources') {
      return this.aggregateResourceMetrics(metrics);
    } else if (type === 'services') {
      return this.aggregateServiceMetrics(metrics);
    }
    
    // Generic aggregation
    return this.genericAggregation(metrics);
  }

  aggregateResourceMetrics(metrics) {
    const result = {
      cpu: { values: [], average: 0, min: 100, max: 0, peak: 0 },
      memory: { values: [], average: 0, min: 100, max: 0, peak: 0 },
      disk: { values: [], average: 0, min: 100, max: 0, peak: 0 }
    };
    
    // Collect values
    metrics.forEach(m => {
      if (m.cpu && m.cpu.usage !== undefined) {
        result.cpu.values.push(m.cpu.usage);
      }
      if (m.memory && m.memory.usage !== undefined) {
        result.memory.values.push(m.memory.usage);
      }
      if (m.disk && Array.isArray(m.disk)) {
        const avgDisk = m.disk.reduce((sum, d) => sum + d.usage, 0) / m.disk.length;
        result.disk.values.push(avgDisk);
      }
    });
    
    // Calculate aggregations
    for (const [resource, data] of Object.entries(result)) {
      if (data.values.length > 0) {
        data.average = data.values.reduce((sum, v) => sum + v, 0) / data.values.length;
        data.min = Math.min(...data.values);
        data.max = Math.max(...data.values);
        data.peak = data.max;
      }
    }
    
    return result;
  }

  aggregateServiceMetrics(metrics) {
    const services = {};
    
    metrics.forEach(m => {
      if (!services[m.service]) {
        services[m.service] = {
          totalChecks: 0,
          healthyChecks: 0,
          responseTimes: []
        };
      }
      
      services[m.service].totalChecks++;
      if (m.status === 'healthy') {
        services[m.service].healthyChecks++;
      }
      if (m.responseTime !== undefined) {
        services[m.service].responseTimes.push(m.responseTime);
      }
    });
    
    // Calculate uptime and average response time
    const result = {};
    for (const [service, data] of Object.entries(services)) {
      result[service] = {
        uptime: (data.healthyChecks / data.totalChecks) * 100,
        avgResponseTime: data.responseTimes.length > 0 ?
          data.responseTimes.reduce((sum, t) => sum + t, 0) / data.responseTimes.length : 0,
        totalChecks: data.totalChecks
      };
    }
    
    return result;
  }

  genericAggregation(metrics) {
    if (metrics.length === 0) {
      return { count: 0 };
    }
    
    return {
      count: metrics.length,
      first: metrics[0],
      last: metrics[metrics.length - 1]
    };
  }

  async getRecentMetrics(type, service, count = 10) {
    const metrics = this.cache[type] || [];
    
    // Filter by service if specified
    const filtered = service ? 
      metrics.filter(m => m.service === service) : 
      metrics;
    
    // Return most recent
    return filtered.slice(-count);
  }

  async cleanup() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.retentionDays);
    
    try {
      const files = await fs.readdir(this.metricsDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        // Extract date from filename
        const match = file.match(/(\d{4}-\d{2}-\d{2})\.json$/);
        if (match) {
          const fileDate = new Date(match[1]);
          
          if (fileDate < cutoffDate) {
            const filePath = path.join(this.metricsDir, file);
            await fs.remove(filePath);
            this.logger.info(`Removed old metrics file: ${file}`);
          }
        }
      }
    } catch (error) {
      this.logger.error('Error cleaning up metrics:', error);
    }
  }

  async exportMetrics(type, startDate, endDate, format = 'json') {
    const metrics = await this.loadHistoricalMetrics(
      type,
      new Date(startDate),
      new Date(endDate)
    );
    
    if (format === 'csv') {
      return this.convertToCSV(metrics);
    }
    
    return metrics;
  }

  convertToCSV(metrics) {
    if (metrics.length === 0) {
      return 'timestamp,data\n';
    }
    
    // Get all unique keys
    const keys = new Set(['timestamp']);
    metrics.forEach(m => {
      Object.keys(m).forEach(k => keys.add(k));
    });
    
    const headers = Array.from(keys);
    const csv = [headers.join(',')];
    
    // Add data rows
    metrics.forEach(m => {
      const row = headers.map(h => {
        const value = m[h];
        if (value === undefined || value === null) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return value;
      });
      csv.push(row.join(','));
    });
    
    return csv.join('\n');
  }
}

module.exports = MetricsStore;