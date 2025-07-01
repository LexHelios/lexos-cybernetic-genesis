import axios from 'axios';
import { BaseAgent } from './BaseAgent.js';

/**
 * NEXUS API MONITORING AGENT - INTERNET API SURVEILLANCE
 * This agent monitors APIs, tests endpoints, and gathers intelligence from web services
 */
export class APIMonitorAgent extends BaseAgent {
  constructor() {
    super('api-monitor', 'API Intelligence Agent');
    this.monitoredAPIs = new Map();
    this.alertThresholds = {
      responseTime: 5000, // 5 seconds
      errorRate: 0.1, // 10%
      uptime: 0.95 // 95%
    };
    this.capabilities = [
      'api_monitoring',
      'endpoint_testing',
      'performance_analysis',
      'uptime_tracking',
      'security_scanning',
      'rate_limit_testing',
      'webhook_monitoring'
    ];
  }

  async initialize() {
    console.log('🔍 API Monitor Agent initialized - WATCHING THE WEB!');
    return true;
  }

  async executeTask(task) {
    const { action } = task;

    switch (action) {
      case 'monitor_api':
        return await this.monitorAPI(task.config);
      case 'test_endpoint':
        return await this.testEndpoint(task.endpoint, task.options);
      case 'scan_security':
        return await this.scanSecurity(task.baseUrl, task.options);
      case 'test_rate_limits':
        return await this.testRateLimits(task.endpoint, task.options);
      case 'monitor_webhooks':
        return await this.monitorWebhooks(task.webhooks);
      case 'api_discovery':
        return await this.discoverAPIs(task.domain, task.options);
      case 'performance_test':
        return await this.performanceTest(task.endpoint, task.options);
      default:
        throw new Error(`Unknown API monitoring action: ${action}`);
    }
  }

  async monitorAPI(config) {
    const { name, baseUrl, endpoints, interval = 60000 } = config;
    
    if (this.monitoredAPIs.has(name)) {
      clearInterval(this.monitoredAPIs.get(name).intervalId);
    }

    const monitorData = {
      name,
      baseUrl,
      endpoints,
      stats: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 100,
        lastCheck: null,
        errors: []
      },
      intervalId: null
    };

    const monitor = async () => {
      const results = [];
      
      for (const endpoint of endpoints) {
        const result = await this.testEndpoint(`${baseUrl}${endpoint.path}`, {
          method: endpoint.method || 'GET',
          headers: endpoint.headers,
          data: endpoint.data,
          timeout: endpoint.timeout || 10000
        });
        
        results.push({
          endpoint: endpoint.path,
          ...result
        });

        // Update stats
        monitorData.stats.totalRequests++;
        if (result.success) {
          monitorData.stats.successfulRequests++;
        } else {
          monitorData.stats.failedRequests++;
          monitorData.stats.errors.push({
            endpoint: endpoint.path,
            error: result.error,
            timestamp: new Date().toISOString()
          });
        }
      }

      // Calculate metrics
      const successRate = monitorData.stats.successfulRequests / monitorData.stats.totalRequests;
      monitorData.stats.uptime = successRate * 100;
      monitorData.stats.lastCheck = new Date().toISOString();

      // Check for alerts
      if (successRate < this.alertThresholds.uptime) {
        console.warn(`🚨 API ALERT: ${name} uptime below threshold: ${(successRate * 100).toFixed(2)}%`);
      }

      return {
        api: name,
        timestamp: new Date().toISOString(),
        results,
        stats: monitorData.stats
      };
    };

    // Run initial check
    const initialResult = await monitor();
    
    // Set up interval monitoring
    monitorData.intervalId = setInterval(monitor, interval);
    this.monitoredAPIs.set(name, monitorData);

    return {
      success: true,
      message: `API monitoring started for ${name}`,
      initialResult
    };
  }

  async testEndpoint(url, options = {}) {
    const startTime = Date.now();
    
    try {
      const config = {
        method: options.method || 'GET',
        url,
        timeout: options.timeout || 10000,
        headers: {
          'User-Agent': 'LexOS-API-Monitor/1.0',
          ...options.headers
        },
        validateStatus: () => true // Don't throw on HTTP error codes
      };

      if (options.data) {
        config.data = options.data;
      }

      const response = await axios(config);
      const responseTime = Date.now() - startTime;

      return {
        success: response.status >= 200 && response.status < 400,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: response.headers,
        data: response.data,
        size: JSON.stringify(response.data).length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        error: error.message,
        responseTime,
        timestamp: new Date().toISOString()
      };
    }
  }

  async scanSecurity(baseUrl, options = {}) {
    const securityTests = [
      // Test for common vulnerabilities
      { path: '/admin', description: 'Admin panel exposure' },
      { path: '/.env', description: 'Environment file exposure' },
      { path: '/config', description: 'Config file exposure' },
      { path: '/api/v1', description: 'API version discovery' },
      { path: '/swagger', description: 'Swagger documentation' },
      { path: '/docs', description: 'API documentation' },
      { path: '/health', description: 'Health check endpoint' },
      { path: '/status', description: 'Status endpoint' },
      { path: '/metrics', description: 'Metrics endpoint' }
    ];

    const results = [];

    for (const test of securityTests) {
      const result = await this.testEndpoint(`${baseUrl}${test.path}`, {
        timeout: 5000
      });

      results.push({
        test: test.description,
        path: test.path,
        accessible: result.success,
        status: result.status,
        responseTime: result.responseTime,
        risk: result.success ? 'HIGH' : 'LOW'
      });
    }

    // Test for common HTTP security headers
    const headerTest = await this.testEndpoint(baseUrl);
    const securityHeaders = {
      'x-frame-options': 'Clickjacking protection',
      'x-content-type-options': 'MIME type sniffing protection',
      'x-xss-protection': 'XSS protection',
      'strict-transport-security': 'HTTPS enforcement',
      'content-security-policy': 'Content Security Policy'
    };

    const headerResults = [];
    for (const [header, description] of Object.entries(securityHeaders)) {
      headerResults.push({
        header,
        description,
        present: !!headerTest.headers[header],
        value: headerTest.headers[header] || null
      });
    }

    return {
      success: true,
      baseUrl,
      endpointTests: results,
      securityHeaders: headerResults,
      summary: {
        exposedEndpoints: results.filter(r => r.accessible).length,
        missingHeaders: headerResults.filter(h => !h.present).length,
        overallRisk: results.some(r => r.accessible && r.risk === 'HIGH') ? 'HIGH' : 'MEDIUM'
      },
      timestamp: new Date().toISOString()
    };
  }

  async testRateLimits(endpoint, options = {}) {
    const requests = options.requests || 100;
    const concurrency = options.concurrency || 10;
    const delay = options.delay || 0;

    const results = [];
    let rateLimitHit = false;
    let rateLimitStatus = null;

    console.log(`🔥 RATE LIMIT TESTING: Sending ${requests} requests to ${endpoint}`);

    // Send requests in batches
    for (let i = 0; i < requests; i += concurrency) {
      const batch = [];
      
      for (let j = 0; j < concurrency && (i + j) < requests; j++) {
        batch.push(this.testEndpoint(endpoint, options));
      }

      const batchResults = await Promise.allSettled(batch);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          const response = result.value;
          results.push(response);

          // Check for rate limiting
          if (response.status === 429 || response.status === 503) {
            rateLimitHit = true;
            rateLimitStatus = response.status;
            console.log(`⚠️ Rate limit hit at request ${results.length}: ${response.status}`);
          }
        }
      }

      if (rateLimitHit) break;
      if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay));
    }

    const successfulRequests = results.filter(r => r.success).length;
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    return {
      success: true,
      endpoint,
      totalRequests: results.length,
      successfulRequests,
      failedRequests: results.length - successfulRequests,
      rateLimitHit,
      rateLimitStatus,
      averageResponseTime: Math.round(averageResponseTime),
      requestsPerSecond: results.length / (results[results.length - 1]?.responseTime - results[0]?.responseTime) * 1000,
      timestamp: new Date().toISOString()
    };
  }

  async discoverAPIs(domain, options = {}) {
    const commonPaths = [
      '/api',
      '/api/v1',
      '/api/v2',
      '/v1',
      '/v2',
      '/rest',
      '/graphql',
      '/webhook',
      '/webhooks',
      '/callback',
      '/oauth',
      '/auth',
      '/login',
      '/users',
      '/user',
      '/admin',
      '/dashboard'
    ];

    const discoveredAPIs = [];

    for (const path of commonPaths) {
      const url = `https://${domain}${path}`;
      const result = await this.testEndpoint(url, { timeout: 5000 });

      if (result.success) {
        discoveredAPIs.push({
          path,
          url,
          status: result.status,
          responseTime: result.responseTime,
          contentType: result.headers['content-type'],
          size: result.size
        });
      }
    }

    return {
      success: true,
      domain,
      discoveredAPIs,
      totalFound: discoveredAPIs.length,
      timestamp: new Date().toISOString()
    };
  }

  async performanceTest(endpoint, options = {}) {
    const duration = options.duration || 60000; // 1 minute
    const concurrency = options.concurrency || 5;
    const startTime = Date.now();
    const results = [];

    console.log(`⚡ PERFORMANCE TEST: Testing ${endpoint} for ${duration}ms with ${concurrency} concurrent requests`);

    while (Date.now() - startTime < duration) {
      const batch = [];
      
      for (let i = 0; i < concurrency; i++) {
        batch.push(this.testEndpoint(endpoint, options));
      }

      const batchResults = await Promise.allSettled(batch);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      }
    }

    const successfulRequests = results.filter(r => r.success);
    const responseTimes = successfulRequests.map(r => r.responseTime);
    
    return {
      success: true,
      endpoint,
      duration: Date.now() - startTime,
      totalRequests: results.length,
      successfulRequests: successfulRequests.length,
      failedRequests: results.length - successfulRequests.length,
      requestsPerSecond: Math.round(results.length / ((Date.now() - startTime) / 1000)),
      averageResponseTime: Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length),
      minResponseTime: Math.min(...responseTimes),
      maxResponseTime: Math.max(...responseTimes),
      timestamp: new Date().toISOString()
    };
  }

  getMonitoredAPIs() {
    const apis = [];
    
    for (const [name, data] of this.monitoredAPIs) {
      apis.push({
        name,
        baseUrl: data.baseUrl,
        stats: data.stats,
        isActive: !!data.intervalId
      });
    }

    return apis;
  }

  stopMonitoring(apiName) {
    if (this.monitoredAPIs.has(apiName)) {
      const data = this.monitoredAPIs.get(apiName);
      if (data.intervalId) {
        clearInterval(data.intervalId);
      }
      this.monitoredAPIs.delete(apiName);
      return true;
    }
    return false;
  }

  async cleanup() {
    for (const [name, data] of this.monitoredAPIs) {
      if (data.intervalId) {
        clearInterval(data.intervalId);
      }
    }
    this.monitoredAPIs.clear();
  }

  getStatus() {
    return {
      id: this.id,
      name: this.name,
      type: 'api-monitor',
      status: 'active',
      capabilities: this.capabilities,
      monitoredAPIs: this.monitoredAPIs.size,
      activeMonitors: Array.from(this.monitoredAPIs.values()).filter(d => d.intervalId).length
    };
  }
}