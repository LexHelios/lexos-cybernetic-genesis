const EventEmitter = require('events');
const si = require('systeminformation');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class ResourceMonitor extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.intervals = {};
    this.metrics = {
      cpu: [],
      memory: [],
      disk: [],
      gpu: []
    };
  }

  async start() {
    this.logger.info('Starting resource monitor...');
    
    // CPU monitoring
    const cpuConfig = this.config.get('resources.cpu');
    if (cpuConfig) {
      this.intervals.cpu = setInterval(() => {
        this.checkCPU(cpuConfig);
      }, cpuConfig.checkInterval || 10000);
    }
    
    // Memory monitoring
    const memoryConfig = this.config.get('resources.memory');
    if (memoryConfig) {
      this.intervals.memory = setInterval(() => {
        this.checkMemory(memoryConfig);
      }, memoryConfig.checkInterval || 10000);
    }
    
    // Disk monitoring
    const diskConfig = this.config.get('resources.disk');
    if (diskConfig) {
      this.intervals.disk = setInterval(() => {
        this.checkDisk(diskConfig);
      }, diskConfig.checkInterval || 60000);
    }
    
    // GPU monitoring
    const gpuConfig = this.config.get('resources.gpu');
    if (gpuConfig && gpuConfig.enabled) {
      this.intervals.gpu = setInterval(() => {
        this.checkGPU(gpuConfig);
      }, gpuConfig.checkInterval || 30000);
    }
    
    // Initial checks
    this.checkAll();
  }

  async stop() {
    this.logger.info('Stopping resource monitor...');
    
    for (const interval of Object.values(this.intervals)) {
      clearInterval(interval);
    }
    
    this.intervals = {};
  }

  async checkAll() {
    const cpuConfig = this.config.get('resources.cpu');
    const memoryConfig = this.config.get('resources.memory');
    const diskConfig = this.config.get('resources.disk');
    const gpuConfig = this.config.get('resources.gpu');
    
    if (cpuConfig) await this.checkCPU(cpuConfig);
    if (memoryConfig) await this.checkMemory(memoryConfig);
    if (diskConfig) await this.checkDisk(diskConfig);
    if (gpuConfig && gpuConfig.enabled) await this.checkGPU(gpuConfig);
  }

  async checkCPU(config) {
    try {
      const load = await si.currentLoad();
      const temps = await si.cpuTemperature();
      
      const cpuUsage = load.currentLoad;
      
      // Store metric
      this.storeMetric('cpu', {
        usage: cpuUsage,
        load: load.avgLoad,
        temperature: temps.main,
        cores: load.cpus
      });
      
      // Check thresholds
      if (cpuUsage >= config.criticalThreshold) {
        this.emit('threshold', {
          type: 'cpu',
          severity: 'critical',
          value: cpuUsage.toFixed(2),
          threshold: config.criticalThreshold,
          temperature: temps.main
        });
      } else if (cpuUsage >= config.warningThreshold) {
        this.emit('threshold', {
          type: 'cpu',
          severity: 'warning',
          value: cpuUsage.toFixed(2),
          threshold: config.warningThreshold,
          temperature: temps.main
        });
      }
      
      // Emit metrics
      this.emit('metrics', {
        type: 'cpu',
        data: {
          usage: cpuUsage,
          load: load.avgLoad,
          temperature: temps.main,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error('Error checking CPU:', error);
    }
  }

  async checkMemory(config) {
    try {
      const mem = await si.mem();
      
      const memoryUsage = (mem.used / mem.total) * 100;
      
      // Store metric
      this.storeMetric('memory', {
        usage: memoryUsage,
        total: mem.total,
        used: mem.used,
        free: mem.free,
        active: mem.active,
        available: mem.available,
        swapUsed: mem.swapused,
        swapTotal: mem.swaptotal
      });
      
      // Check thresholds
      if (memoryUsage >= config.criticalThreshold) {
        this.emit('threshold', {
          type: 'memory',
          severity: 'critical',
          value: memoryUsage.toFixed(2),
          threshold: config.criticalThreshold,
          details: {
            used: this.formatBytes(mem.used),
            total: this.formatBytes(mem.total),
            available: this.formatBytes(mem.available)
          }
        });
      } else if (memoryUsage >= config.warningThreshold) {
        this.emit('threshold', {
          type: 'memory',
          severity: 'warning',
          value: memoryUsage.toFixed(2),
          threshold: config.warningThreshold,
          details: {
            used: this.formatBytes(mem.used),
            total: this.formatBytes(mem.total),
            available: this.formatBytes(mem.available)
          }
        });
      }
      
      // Emit metrics
      this.emit('metrics', {
        type: 'memory',
        data: {
          usage: memoryUsage,
          used: mem.used,
          total: mem.total,
          available: mem.available,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      this.logger.error('Error checking memory:', error);
    }
  }

  async checkDisk(config) {
    try {
      const disks = await si.fsSize();
      
      for (const disk of disks) {
        if (config.paths && !config.paths.includes(disk.mount)) {
          continue;
        }
        
        const diskUsage = disk.use;
        
        // Store metric
        this.storeMetric('disk', {
          mount: disk.mount,
          usage: diskUsage,
          size: disk.size,
          used: disk.used,
          available: disk.available,
          type: disk.type
        });
        
        // Check thresholds
        if (diskUsage >= config.criticalThreshold) {
          this.emit('threshold', {
            type: 'disk',
            severity: 'critical',
            value: diskUsage.toFixed(2),
            threshold: config.criticalThreshold,
            mount: disk.mount,
            details: {
              used: this.formatBytes(disk.used),
              total: this.formatBytes(disk.size),
              available: this.formatBytes(disk.available)
            }
          });
        } else if (diskUsage >= config.warningThreshold) {
          this.emit('threshold', {
            type: 'disk',
            severity: 'warning',
            value: diskUsage.toFixed(2),
            threshold: config.warningThreshold,
            mount: disk.mount,
            details: {
              used: this.formatBytes(disk.used),
              total: this.formatBytes(disk.size),
              available: this.formatBytes(disk.available)
            }
          });
        }
      }
      
      // Emit metrics
      this.emit('metrics', {
        type: 'disk',
        data: disks.map(d => ({
          mount: d.mount,
          usage: d.use,
          used: d.used,
          total: d.size,
          available: d.available,
          timestamp: new Date().toISOString()
        }))
      });
      
    } catch (error) {
      this.logger.error('Error checking disk:', error);
    }
  }

  async checkGPU(config) {
    try {
      // Use nvidia-smi to get GPU stats
      const { stdout } = await execAsync(
        'nvidia-smi --query-gpu=index,name,utilization.gpu,utilization.memory,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits'
      );
      
      const lines = stdout.trim().split('\n');
      const gpuData = [];
      
      for (const line of lines) {
        const [index, name, gpuUtil, memUtil, memUsed, memTotal, temp] = line.split(', ');
        
        const gpuUsage = parseFloat(gpuUtil);
        const memoryUsage = parseFloat(memUtil);
        
        gpuData.push({
          index: parseInt(index),
          name: name.trim(),
          utilization: gpuUsage,
          memoryUtilization: memoryUsage,
          memoryUsed: parseInt(memUsed),
          memoryTotal: parseInt(memTotal),
          temperature: parseFloat(temp)
        });
        
        // Check GPU utilization thresholds
        if (gpuUsage >= config.criticalThreshold) {
          this.emit('threshold', {
            type: 'gpu',
            severity: 'critical',
            value: gpuUsage,
            threshold: config.criticalThreshold,
            gpuIndex: index,
            gpuName: name.trim(),
            temperature: temp
          });
        } else if (gpuUsage >= config.warningThreshold) {
          this.emit('threshold', {
            type: 'gpu',
            severity: 'warning',
            value: gpuUsage,
            threshold: config.warningThreshold,
            gpuIndex: index,
            gpuName: name.trim(),
            temperature: temp
          });
        }
        
        // Check GPU memory thresholds
        if (memoryUsage >= config.memoryCriticalThreshold) {
          this.emit('threshold', {
            type: 'gpu-memory',
            severity: 'critical',
            value: memoryUsage,
            threshold: config.memoryCriticalThreshold,
            gpuIndex: index,
            gpuName: name.trim(),
            details: {
              used: `${memUsed} MB`,
              total: `${memTotal} MB`
            }
          });
        } else if (memoryUsage >= config.memoryWarningThreshold) {
          this.emit('threshold', {
            type: 'gpu-memory',
            severity: 'warning',
            value: memoryUsage,
            threshold: config.memoryWarningThreshold,
            gpuIndex: index,
            gpuName: name.trim(),
            details: {
              used: `${memUsed} MB`,
              total: `${memTotal} MB`
            }
          });
        }
      }
      
      // Store metrics
      this.storeMetric('gpu', gpuData);
      
      // Emit metrics
      this.emit('metrics', {
        type: 'gpu',
        data: gpuData.map(gpu => ({
          ...gpu,
          timestamp: new Date().toISOString()
        }))
      });
      
    } catch (error) {
      // nvidia-smi not available or GPU not present
      this.logger.debug('GPU monitoring not available:', error.message);
    }
  }

  storeMetric(type, data) {
    const metric = {
      ...data,
      timestamp: new Date().toISOString()
    };
    
    this.metrics[type].push(metric);
    
    // Keep only last 1000 metrics
    if (this.metrics[type].length > 1000) {
      this.metrics[type] = this.metrics[type].slice(-1000);
    }
  }

  formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    let value = bytes;
    
    while (value >= 1024 && i < units.length - 1) {
      value /= 1024;
      i++;
    }
    
    return `${value.toFixed(2)} ${units[i]}`;
  }

  getMetrics(type) {
    return this.metrics[type] || [];
  }

  getLatestMetrics() {
    const latest = {};
    
    for (const [type, metrics] of Object.entries(this.metrics)) {
      if (metrics.length > 0) {
        latest[type] = metrics[metrics.length - 1];
      }
    }
    
    return latest;
  }
}

module.exports = ResourceMonitor;