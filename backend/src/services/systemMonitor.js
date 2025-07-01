import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import axios from 'axios';

const execAsync = promisify(exec);

export class SystemMonitor {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5000; // 5 seconds cache
  }

  async getSystemInfo(includeSensitive = false) {
    const cacheKey = `system_info_${includeSensitive}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const info = {
        system: {
          status: 'online',
          uptime: os.uptime(),
          hostname: os.hostname(),
          platform: os.platform(),
          arch: os.arch(),
          release: os.release()
        },
        application: {
          version: process.env.APP_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          node_version: process.version,
          pid: process.pid,
          uptime: process.uptime()
        },
        resources: {
          cpu: await this.getCPUInfo(),
          memory: this.getMemoryInfo(),
          storage: await this.getStorageInfo(),
          network: await this.getNetworkInfo()
        },
        timestamp: Date.now()
      };

      if (includeSensitive) {
        info.environment = process.env;
      }

      this.setCache(cacheKey, info);
      return info;
    } catch (error) {
      console.error('Error getting system info:', error);
      return {
        system: { status: 'error', error: error.message },
        timestamp: Date.now()
      };
    }
  }

  async getCPUInfo() {
    const cpus = os.cpus();
    const loadAverage = os.loadavg();
    
    // Calculate CPU usage
    const startUsage = process.cpuUsage();
    await new Promise(resolve => setTimeout(resolve, 100));
    const endUsage = process.cpuUsage(startUsage);
    
    const totalUsage = (endUsage.user + endUsage.system) / 1000; // microseconds to milliseconds
    const usagePercent = (totalUsage / 100) * 100; // rough estimate

    return {
      model: cpus[0]?.model || 'Unknown',
      cores: cpus.length,
      speed: cpus[0]?.speed || 0,
      usage_percent: Math.min(usagePercent, 100),
      load_average: loadAverage,
      times: cpus.reduce((acc, cpu) => {
        Object.keys(cpu.times).forEach(type => {
          acc[type] = (acc[type] || 0) + cpu.times[type];
        });
        return acc;
      }, {})
    };
  }

  getMemoryInfo() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;

    return {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      available: freeMem,
      usage_percent: (usedMem / totalMem) * 100,
      swap: {
        total: 0, // Would need platform-specific implementation
        used: 0,
        free: 0
      }
    };
  }

  async getStorageInfo() {
    try {
      // Platform-specific disk usage check
      const platform = os.platform();
      let diskInfo = {};

      if (platform === 'linux' || platform === 'darwin') {
        const { stdout } = await execAsync('df -k /');
        const lines = stdout.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          if (parts.length >= 4) {
            const total = parseInt(parts[1]) * 1024; // KB to bytes
            const used = parseInt(parts[2]) * 1024;
            const available = parseInt(parts[3]) * 1024;
            
            diskInfo = {
              total,
              used,
              available,
              usage_percent: (used / total) * 100
            };
          }
        }
      } else {
        // Fallback for Windows or other platforms
        diskInfo = {
          total: 1000000000000, // 1TB dummy
          used: 400000000000,   // 400GB dummy
          available: 600000000000, // 600GB dummy
          usage_percent: 40
        };
      }

      return diskInfo;
    } catch (error) {
      console.error('Error getting storage info:', error);
      return {
        total: 0,
        used: 0,
        available: 0,
        usage_percent: 0
      };
    }
  }

  async getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const networkInfo = [];

    for (const [name, addresses] of Object.entries(interfaces)) {
      if (!addresses) continue;
      
      for (const addr of addresses) {
        if (addr.internal) continue;
        
        networkInfo.push({
          interface: name,
          address: addr.address,
          family: addr.family,
          mac: addr.mac,
          netmask: addr.netmask
        });
      }
    }

    return networkInfo;
  }

  async getGPUStatus() {
    const cacheKey = 'gpu_status';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Try to get NVIDIA GPU info using nvidia-smi
      const { stdout } = await execAsync('nvidia-smi --query-gpu=name,memory.total,memory.used,memory.free,utilization.gpu,temperature.gpu --format=csv,noheader,nounits');
      
      const lines = stdout.trim().split('\n');
      const devices = lines.map((line, index) => {
        const [name, memTotal, memUsed, memFree, utilization, temperature] = line.split(',').map(s => s.trim());
        
        return {
          index,
          name,
          memory: {
            total: parseInt(memTotal) * 1024 * 1024, // MB to bytes
            used: parseInt(memUsed) * 1024 * 1024,
            free: parseInt(memFree) * 1024 * 1024,
            usage_percent: (parseInt(memUsed) / parseInt(memTotal)) * 100
          },
          utilization: {
            gpu: parseInt(utilization) || 0,
            memory: (parseInt(memUsed) / parseInt(memTotal)) * 100
          },
          temperature: {
            gpu: parseInt(temperature) || 0,
            memory: null // Not available via basic query
          },
          power: {
            draw: null, // Would need extended query
            limit: null
          }
        };
      });

      const status = {
        driver_version: await this.getNvidiaDriverVersion(),
        cuda_version: await this.getCudaVersion(),
        devices,
        timestamp: Date.now()
      };

      this.setCache(cacheKey, status);
      return status;
    } catch (error) {
      // If nvidia-smi fails, return mock data or empty
      console.log('GPU monitoring not available:', error.message);
      
      // Return mock data for development/demo
      const mockStatus = {
        driver_version: '535.129.03',
        cuda_version: '12.2',
        devices: [{
          index: 0,
          name: 'NVIDIA H100',
          memory: {
            total: 85899345920, // 80GB
            used: 25769803776,  // 24GB
            free: 60129542144,  // 56GB
            usage_percent: 30
          },
          utilization: {
            gpu: 65,
            memory: 30
          },
          temperature: {
            gpu: 72,
            memory: 75
          },
          power: {
            draw: 350,
            limit: 700
          }
        }],
        timestamp: Date.now()
      };

      this.setCache(cacheKey, mockStatus);
      return mockStatus;
    }
  }

  async getNvidiaDriverVersion() {
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=driver_version --format=csv,noheader');
      return stdout.trim();
    } catch {
      return 'N/A';
    }
  }

  async getCudaVersion() {
    try {
      const { stdout } = await execAsync('nvcc --version | grep "release" | awk \'{print $5}\' | sed \'s/,//\'');
      return stdout.trim();
    } catch {
      return 'N/A';
    }
  }

  async getProcessInfo() {
    return {
      pid: process.pid,
      ppid: process.ppid,
      title: process.title,
      version: process.version,
      versions: process.versions,
      arch: process.arch,
      platform: process.platform,
      memory_usage: process.memoryUsage(),
      cpu_usage: process.cpuUsage(),
      uptime: process.uptime(),
      exec_path: process.execPath,
      exec_argv: process.execArgv,
      env_count: Object.keys(process.env).length
    };
  }

  async getContainerInfo() {
    try {
      // Check if running in Docker
      const isDocker = await fs.access('/.dockerenv').then(() => true).catch(() => false);
      
      if (isDocker) {
        // Try to get container info
        const hostname = os.hostname();
        return {
          is_container: true,
          type: 'docker',
          hostname,
          container_id: hostname // In Docker, hostname is often the container ID
        };
      }

      // Check for Kubernetes
      const isK8s = process.env.KUBERNETES_SERVICE_HOST ? true : false;
      if (isK8s) {
        return {
          is_container: true,
          type: 'kubernetes',
          pod_name: process.env.HOSTNAME,
          namespace: process.env.POD_NAMESPACE,
          service_account: process.env.SERVICE_ACCOUNT
        };
      }

      return { is_container: false };
    } catch (error) {
      return { is_container: false, error: error.message };
    }
  }

  async getHealthChecks() {
    const checks = {
      system: true,
      database: await this.checkDatabase(),
      ollama: await this.checkOllama(),
      storage: await this.checkStorage(),
      memory: this.checkMemory()
    };

    const allHealthy = Object.values(checks).every(check => check === true);

    return {
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: Date.now()
    };
  }

  async checkDatabase() {
    // Placeholder for database health check
    return true;
  }

  async checkOllama() {
    try {
      const response = await axios.get('http://localhost:11434/api/tags', { timeout: 5000 });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  async checkStorage() {
    const storage = await this.getStorageInfo();
    return storage.usage_percent < 90; // Healthy if less than 90% used
  }

  checkMemory() {
    const memory = this.getMemoryInfo();
    return memory.usage_percent < 90; // Healthy if less than 90% used
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // System metrics collection for time series data
  async collectMetrics() {
    const metrics = {
      timestamp: Date.now(),
      cpu: await this.getCPUInfo(),
      memory: this.getMemoryInfo(),
      storage: await this.getStorageInfo(),
      gpu: await this.getGPUStatus(),
      process: await this.getProcessInfo()
    };

    return metrics;
  }

  // Start periodic metrics collection
  startMetricsCollection(interval = 60000) { // Default 1 minute
    this.metricsInterval = setInterval(async () => {
      try {
        const metrics = await this.collectMetrics();
        
        // Import analytics service dynamically to avoid circular dependencies
        const { analyticsService } = await import('./analyticsService.js');
        
        // Track system health metrics
        await analyticsService.trackSystemHealth({
          cpuUsage: metrics.cpu.usage_percent,
          memoryUsage: metrics.memory.usage_percent,
          diskUsage: metrics.storage.usage_percent,
          gpuUsage: metrics.gpu.devices[0]?.utilization.gpu || 0,
          networkIO: {
            interfaces: metrics.network?.length || 0
          },
          activeConnections: 0, // Would need to track this separately
          errorRate: 0, // Would need to track this separately
          responseTimeAvg: null // Would need to track this separately
        });
        
        console.log('Metrics collected and tracked:', new Date().toISOString());
      } catch (error) {
        console.error('Error collecting metrics:', error);
      }
    }, interval);
  }

  stopMetricsCollection() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = null;
    }
  }
}