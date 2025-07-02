const EventEmitter = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');
const axios = require('axios');
const dns = require('dns').promises;

const execAsync = promisify(exec);

class NetworkMonitor extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.networkConfig = config.get('network.connectivity') || {};
    this.interval = null;
    this.status = {
      endpoints: {},
      lastCheck: null
    };
  }

  async start() {
    if (!this.networkConfig.enabled) {
      this.logger.info('Network monitor disabled');
      return;
    }
    
    this.logger.info('Starting network monitor...');
    
    // Initial check
    await this.checkConnectivity();
    
    // Schedule periodic checks
    this.interval = setInterval(() => {
      this.checkConnectivity();
    }, this.networkConfig.checkInterval || 60000);
  }

  async stop() {
    this.logger.info('Stopping network monitor...');
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  async checkConnectivity() {
    const endpoints = this.networkConfig.endpoints || [];
    const results = {
      timestamp: new Date().toISOString(),
      endpoints: {},
      failures: [],
      summary: {
        total: endpoints.length,
        successful: 0,
        failed: 0
      }
    };
    
    // Check each endpoint
    const checks = endpoints.map(endpoint => this.checkEndpoint(endpoint));
    const checkResults = await Promise.allSettled(checks);
    
    // Process results
    checkResults.forEach((result, index) => {
      const endpoint = endpoints[index];
      
      if (result.status === 'fulfilled' && result.value.success) {
        results.endpoints[endpoint.name] = {
          status: 'online',
          responseTime: result.value.responseTime
        };
        results.summary.successful++;
      } else {
        const error = result.status === 'rejected' ? 
          result.reason.message : result.value.error;
          
        results.endpoints[endpoint.name] = {
          status: 'offline',
          error: error
        };
        results.failures.push({
          name: endpoint.name,
          type: endpoint.type,
          target: endpoint.host || endpoint.url,
          error: error
        });
        results.summary.failed++;
      }
    });
    
    // Update status
    this.status = results;
    
    // Emit connectivity event
    this.emit('connectivity', results);
    
    // Check for network issues
    if (results.summary.failed > 0) {
      const failureRate = (results.summary.failed / results.summary.total) * 100;
      
      if (failureRate >= 50) {
        this.emit('networkDown', {
          message: 'Major network connectivity issues detected',
          failureRate,
          failures: results.failures
        });
      }
    }
  }

  async checkEndpoint(endpoint) {
    const startTime = Date.now();
    
    try {
      let result;
      
      switch (endpoint.type) {
        case 'ping':
          result = await this.pingHost(endpoint.host);
          break;
          
        case 'http':
          result = await this.checkHttp(endpoint.url);
          break;
          
        case 'dns':
          result = await this.checkDns(endpoint.host);
          break;
          
        default:
          throw new Error(`Unknown endpoint type: ${endpoint.type}`);
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        success: result.success,
        responseTime,
        ...result
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        responseTime: Date.now() - startTime
      };
    }
  }

  async pingHost(host) {
    try {
      // Use ping command based on OS
      const isWindows = process.platform === 'win32';
      const pingCmd = isWindows ? 
        `ping -n 1 -w ${this.networkConfig.timeout || 5000} ${host}` :
        `ping -c 1 -W ${Math.floor((this.networkConfig.timeout || 5000) / 1000)} ${host}`;
      
      const { stdout, stderr } = await execAsync(pingCmd);
      
      if (stderr) {
        throw new Error(stderr);
      }
      
      // Parse ping output for response time
      let responseTime = null;
      
      if (isWindows) {
        const match = stdout.match(/Average = (\d+)ms/);
        if (match) {
          responseTime = parseInt(match[1]);
        }
      } else {
        const match = stdout.match(/time=(\d+\.?\d*) ms/);
        if (match) {
          responseTime = parseFloat(match[1]);
        }
      }
      
      return {
        success: true,
        pingTime: responseTime
      };
      
    } catch (error) {
      // Check if it's just a non-zero exit code (host unreachable)
      if (error.code === 1 || error.code === 2) {
        return {
          success: false,
          error: 'Host unreachable'
        };
      }
      
      throw error;
    }
  }

  async checkHttp(url) {
    try {
      const response = await axios.get(url, {
        timeout: this.networkConfig.timeout || 5000,
        validateStatus: () => true,
        maxRedirects: 5
      });
      
      return {
        success: response.status >= 200 && response.status < 400,
        statusCode: response.status,
        statusText: response.statusText
      };
      
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return {
          success: false,
          error: 'Connection refused'
        };
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        return {
          success: false,
          error: 'Connection timeout'
        };
      } else if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'Host not found'
        };
      }
      
      throw error;
    }
  }

  async checkDns(hostname) {
    try {
      const addresses = await dns.resolve4(hostname);
      
      return {
        success: true,
        addresses,
        count: addresses.length
      };
      
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        return {
          success: false,
          error: 'DNS resolution failed'
        };
      } else if (error.code === 'ETIMEOUT') {
        return {
          success: false,
          error: 'DNS timeout'
        };
      }
      
      throw error;
    }
  }

  async checkBandwidth() {
    // This would implement bandwidth testing
    // For now, return placeholder data
    return {
      download: 100, // Mbps
      upload: 50,    // Mbps
      latency: 10    // ms
    };
  }

  async checkPortOpen(host, port) {
    const net = require('net');
    
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let connected = false;
      
      socket.setTimeout(this.networkConfig.timeout || 5000);
      
      socket.on('connect', () => {
        connected = true;
        socket.destroy();
        resolve({ success: true, open: true });
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve({ success: false, error: 'Connection timeout' });
      });
      
      socket.on('error', (error) => {
        if (!connected) {
          resolve({ success: false, error: error.message });
        }
      });
      
      socket.connect(port, host);
    });
  }

  getStatus() {
    return this.status;
  }

  async runDiagnostics() {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      connectivity: await this.checkConnectivity(),
      dns: {},
      routing: {},
      ports: {}
    };
    
    // DNS diagnostics
    try {
      const dnsServers = await dns.getServers();
      diagnostics.dns.servers = dnsServers;
      
      // Test DNS resolution
      const testHosts = ['google.com', 'cloudflare.com', 'github.com'];
      diagnostics.dns.resolutions = {};
      
      for (const host of testHosts) {
        try {
          const addresses = await dns.resolve4(host);
          diagnostics.dns.resolutions[host] = {
            success: true,
            addresses
          };
        } catch (error) {
          diagnostics.dns.resolutions[host] = {
            success: false,
            error: error.message
          };
        }
      }
    } catch (error) {
      diagnostics.dns.error = error.message;
    }
    
    // Routing diagnostics (traceroute)
    try {
      const target = '8.8.8.8';
      const traceCmd = process.platform === 'win32' ? 
        `tracert -h 10 ${target}` : 
        `traceroute -m 10 ${target}`;
        
      const { stdout } = await execAsync(traceCmd, { timeout: 30000 });
      diagnostics.routing.traceroute = stdout;
    } catch (error) {
      diagnostics.routing.error = error.message;
    }
    
    // Port diagnostics
    const commonPorts = [
      { host: 'localhost', port: 80, name: 'HTTP' },
      { host: 'localhost', port: 443, name: 'HTTPS' },
      { host: 'localhost', port: 3000, name: 'Frontend' },
      { host: 'localhost', port: 3001, name: 'Backend' },
      { host: 'localhost', port: 5432, name: 'PostgreSQL' },
      { host: 'localhost', port: 6379, name: 'Redis' }
    ];
    
    for (const portInfo of commonPorts) {
      const result = await this.checkPortOpen(portInfo.host, portInfo.port);
      diagnostics.ports[portInfo.name] = {
        ...portInfo,
        ...result
      };
    }
    
    return diagnostics;
  }
}

module.exports = NetworkMonitor;