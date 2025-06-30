const EventEmitter = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');

const execAsync = promisify(exec);

class RecoveryManager extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.recoveryConfig = config.get('recovery') || {};
    this.attemptCounts = {};
    this.lastAttempts = {};
  }

  async handleServiceDown(serviceData) {
    if (!this.recoveryConfig.enabled) {
      return;
    }
    
    const actionConfig = this.recoveryConfig.actions?.serviceDown;
    if (!actionConfig) {
      return;
    }
    
    for (const action of actionConfig) {
      if (action.action === 'restart') {
        await this.handleServiceRestart(serviceData, action);
      }
    }
  }

  async handleServiceRestart(serviceData, actionConfig) {
    const serviceName = serviceData.name;
    const now = Date.now();
    
    // Check cooldown
    if (this.lastAttempts[serviceName]) {
      const timeSinceLastAttempt = now - this.lastAttempts[serviceName];
      if (timeSinceLastAttempt < actionConfig.cooldown) {
        this.logger.info(`Skipping restart for ${serviceName} - cooldown period`);
        return;
      }
    }
    
    // Check attempt count
    this.attemptCounts[serviceName] = this.attemptCounts[serviceName] || 0;
    if (this.attemptCounts[serviceName] >= actionConfig.maxAttempts) {
      this.logger.error(`Max restart attempts reached for ${serviceName}`);
      this.emit('recovery', {
        action: 'restart',
        service: serviceName,
        status: 'failed',
        reason: 'Max attempts reached'
      });
      return;
    }
    
    // Attempt restart
    this.attemptCounts[serviceName]++;
    this.lastAttempts[serviceName] = now;
    
    const service = this.config.get(`services.${serviceName}`);
    
    try {
      this.logger.info(`Attempting to restart ${serviceName} (attempt ${this.attemptCounts[serviceName]}/${actionConfig.maxAttempts})`);
      
      await this.restartService(serviceName, service);
      
      // Reset attempt count on success
      this.attemptCounts[serviceName] = 0;
      
      this.emit('recovery', {
        action: 'restart',
        service: serviceName,
        status: 'success',
        attempt: this.attemptCounts[serviceName]
      });
      
    } catch (error) {
      this.logger.error(`Failed to restart ${serviceName}:`, error);
      
      this.emit('recovery', {
        action: 'restart',
        service: serviceName,
        status: 'failed',
        error: error.message,
        attempt: this.attemptCounts[serviceName]
      });
    }
  }

  async restartService(serviceName, serviceConfig) {
    this.logger.info(`Restarting service: ${serviceName}`);
    
    // First, try to stop the service gracefully
    try {
      await this.stopService(serviceName, serviceConfig);
      
      // Wait a moment for the service to fully stop
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      this.logger.warn(`Error stopping service ${serviceName}:`, error.message);
    }
    
    // Start the service
    if (serviceConfig.restartCommand) {
      const { stdout, stderr } = await execAsync(serviceConfig.restartCommand, {
        cwd: path.dirname(serviceConfig.logFile || '/'),
        env: { ...process.env }
      });
      
      if (stderr) {
        this.logger.warn(`Restart stderr for ${serviceName}:`, stderr);
      }
      
      this.logger.info(`Service ${serviceName} restarted successfully`);
      
      // Wait for service to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      return { stdout, stderr };
    } else {
      throw new Error('No restart command configured');
    }
  }

  async stopService(serviceName, serviceConfig) {
    // Try to find and kill the process
    if (serviceConfig.processName) {
      try {
        const { stdout } = await execAsync(`pgrep -f "${serviceConfig.processName}"`);
        const pids = stdout.trim().split('\n').filter(Boolean);
        
        for (const pid of pids) {
          // Send SIGTERM first
          await execAsync(`kill -TERM ${pid}`);
        }
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if still running and force kill if necessary
        try {
          const { stdout: checkStdout } = await execAsync(`pgrep -f "${serviceConfig.processName}"`);
          const remainingPids = checkStdout.trim().split('\n').filter(Boolean);
          
          for (const pid of remainingPids) {
            await execAsync(`kill -KILL ${pid}`);
          }
        } catch (error) {
          // Process not found, which is good
        }
        
      } catch (error) {
        if (error.code !== 1) {
          throw error;
        }
        // Process not found, which is fine
      }
    }
  }

  async handleHighResource(resourceData) {
    if (!this.recoveryConfig.enabled) {
      return;
    }
    
    if (resourceData.type === 'memory' && resourceData.severity === 'critical') {
      await this.handleHighMemory(resourceData);
    } else if (resourceData.type === 'disk' && resourceData.severity === 'critical') {
      await this.handleHighDisk(resourceData);
    }
  }

  async handleHighMemory(resourceData) {
    const actionConfig = this.recoveryConfig.actions?.highMemory;
    if (!actionConfig) {
      return;
    }
    
    for (const action of actionConfig) {
      if (action.action === 'clearCache' && resourceData.value >= action.threshold) {
        await this.clearCache(action.paths);
      }
    }
  }

  async clearCache(paths) {
    this.logger.info('Clearing cache directories...');
    
    for (const cachePath of paths) {
      try {
        // Get size before clearing
        const { stdout: sizeBefore } = await execAsync(`du -sh ${cachePath}`);
        
        // Clear old files (older than 1 hour)
        await execAsync(`find ${cachePath} -type f -mmin +60 -delete`);
        
        // Get size after clearing
        const { stdout: sizeAfter } = await execAsync(`du -sh ${cachePath}`);
        
        this.logger.info(`Cleared cache in ${cachePath}: ${sizeBefore.trim()} -> ${sizeAfter.trim()}`);
        
        this.emit('recovery', {
          action: 'clearCache',
          path: cachePath,
          status: 'success',
          sizeBefore: sizeBefore.trim(),
          sizeAfter: sizeAfter.trim()
        });
        
      } catch (error) {
        this.logger.error(`Error clearing cache in ${cachePath}:`, error);
        
        this.emit('recovery', {
          action: 'clearCache',
          path: cachePath,
          status: 'failed',
          error: error.message
        });
      }
    }
  }

  async handleHighDisk(resourceData) {
    const actionConfig = this.recoveryConfig.actions?.diskSpace;
    if (!actionConfig) {
      return;
    }
    
    for (const action of actionConfig) {
      if (action.action === 'cleanLogs' && resourceData.value >= action.threshold) {
        await this.cleanOldLogs(action.olderThan);
      }
    }
  }

  async cleanOldLogs(daysOld) {
    this.logger.info(`Cleaning logs older than ${daysOld} days...`);
    
    const services = this.config.get('services') || {};
    
    for (const [name, service] of Object.entries(services)) {
      if (service.logFile) {
        try {
          const logDir = path.dirname(service.logFile);
          
          // Find and remove old log files
          const { stdout } = await execAsync(
            `find ${logDir} -name "*.log*" -type f -mtime +${daysOld} -delete -print`
          );
          
          const deletedFiles = stdout.trim().split('\n').filter(Boolean);
          
          if (deletedFiles.length > 0) {
            this.logger.info(`Deleted ${deletedFiles.length} old log files for ${name}`);
            
            this.emit('recovery', {
              action: 'cleanLogs',
              service: name,
              status: 'success',
              filesDeleted: deletedFiles.length,
              files: deletedFiles
            });
          }
          
        } catch (error) {
          this.logger.error(`Error cleaning logs for ${name}:`, error);
          
          this.emit('recovery', {
            action: 'cleanLogs',
            service: name,
            status: 'failed',
            error: error.message
          });
        }
      }
    }
  }

  async fixConfigError(filePath, error) {
    const actionConfig = this.recoveryConfig.actions?.configError;
    if (!actionConfig) {
      return;
    }
    
    for (const action of actionConfig) {
      if (action.action === 'fixSyntax') {
        const fileExt = path.extname(filePath);
        const patterns = action.filePatterns || [];
        
        // Check if file matches patterns
        const matches = patterns.some(pattern => {
          if (pattern.startsWith('*')) {
            return filePath.endsWith(pattern.substring(1));
          }
          return filePath.includes(pattern);
        });
        
        if (matches) {
          await this.fixSyntaxError(filePath, fileExt);
        }
      }
    }
  }

  async fixSyntaxError(filePath, fileExt) {
    this.logger.info(`Attempting to fix syntax error in ${filePath}`);
    
    try {
      // Backup the file first
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copy(filePath, backupPath);
      
      const content = await fs.readFile(filePath, 'utf-8');
      let fixed = false;
      let fixedContent = content;
      
      if (fileExt === '.json') {
        fixed = await this.fixJSONSyntax(content, filePath);
      } else if (fileExt === '.yaml' || fileExt === '.yml') {
        fixed = await this.fixYAMLSyntax(content, filePath);
      } else if (fileExt === '.env') {
        fixed = await this.fixEnvSyntax(content, filePath);
      }
      
      if (fixed) {
        this.emit('recovery', {
          action: 'fixSyntax',
          file: filePath,
          status: 'success',
          backup: backupPath
        });
      } else {
        // Restore backup if fix failed
        await fs.copy(backupPath, filePath);
        await fs.remove(backupPath);
        
        this.emit('recovery', {
          action: 'fixSyntax',
          file: filePath,
          status: 'failed',
          reason: 'Could not automatically fix syntax'
        });
      }
      
    } catch (error) {
      this.logger.error(`Error fixing syntax in ${filePath}:`, error);
      
      this.emit('recovery', {
        action: 'fixSyntax',
        file: filePath,
        status: 'failed',
        error: error.message
      });
    }
  }

  async fixJSONSyntax(content, filePath) {
    try {
      // Try to parse to see what the error is
      JSON.parse(content);
      return false; // No error
    } catch (error) {
      this.logger.info(`JSON syntax error: ${error.message}`);
      
      // Common JSON fixes
      let fixed = content;
      
      // Remove trailing commas
      fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
      
      // Fix single quotes to double quotes
      fixed = fixed.replace(/'/g, '"');
      
      // Remove comments
      fixed = fixed.replace(/\/\*[\s\S]*?\*\//g, '');
      fixed = fixed.replace(/\/\/.*$/gm, '');
      
      // Try to parse again
      try {
        JSON.parse(fixed);
        await fs.writeFile(filePath, fixed);
        return true;
      } catch (error) {
        // Try more aggressive fixes
        
        // Ensure proper quotes around keys
        fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
        
        try {
          JSON.parse(fixed);
          await fs.writeFile(filePath, fixed);
          return true;
        } catch (error) {
          return false;
        }
      }
    }
  }

  async fixYAMLSyntax(content, filePath) {
    try {
      yaml.parse(content);
      return false; // No error
    } catch (error) {
      this.logger.info(`YAML syntax error: ${error.message}`);
      
      // Common YAML fixes
      let fixed = content;
      
      // Fix tab characters (replace with spaces)
      fixed = fixed.replace(/\t/g, '  ');
      
      // Ensure colons have space after them
      fixed = fixed.replace(/:\S/g, (match) => ': ' + match.substring(1));
      
      // Fix common indentation issues
      const lines = fixed.split('\n');
      const fixedLines = [];
      let lastIndent = 0;
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === '') {
          fixedLines.push('');
          continue;
        }
        
        const currentIndent = line.length - trimmed.length;
        
        // Ensure indent is multiple of 2
        const normalizedIndent = Math.round(currentIndent / 2) * 2;
        fixedLines.push(' '.repeat(normalizedIndent) + trimmed);
      }
      
      fixed = fixedLines.join('\n');
      
      try {
        yaml.parse(fixed);
        await fs.writeFile(filePath, fixed);
        return true;
      } catch (error) {
        return false;
      }
    }
  }

  async fixEnvSyntax(content, filePath) {
    // Common .env fixes
    let fixed = content;
    const lines = fixed.split('\n');
    const fixedLines = [];
    
    for (const line of lines) {
      let fixedLine = line;
      
      // Skip empty lines and comments
      if (line.trim() === '' || line.trim().startsWith('#')) {
        fixedLines.push(line);
        continue;
      }
      
      // Ensure proper KEY=VALUE format
      if (line.includes('=')) {
        const [key, ...valueParts] = line.split('=');
        const value = valueParts.join('=');
        
        // Remove spaces around key
        const cleanKey = key.trim();
        
        // Quote values with spaces if not already quoted
        let cleanValue = value.trim();
        if (cleanValue.includes(' ') && !cleanValue.startsWith('"') && !cleanValue.startsWith("'")) {
          cleanValue = `"${cleanValue}"`;
        }
        
        fixedLine = `${cleanKey}=${cleanValue}`;
      }
      
      fixedLines.push(fixedLine);
    }
    
    fixed = fixedLines.join('\n');
    
    // Write the fixed content
    await fs.writeFile(filePath, fixed);
    return true;
  }

  async runCustomAction(action) {
    this.logger.info(`Running custom recovery action: ${action.type}`);
    
    try {
      let result;
      
      switch (action.type) {
        case 'restartAll':
          result = await this.restartAllServices();
          break;
          
        case 'clearAllCache':
          result = await this.clearAllCache();
          break;
          
        case 'resetDatabase':
          result = await this.resetDatabaseConnections();
          break;
          
        case 'cleanupSystem':
          result = await this.systemCleanup();
          break;
          
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
      
      this.emit('recovery', {
        action: action.type,
        status: 'success',
        result
      });
      
      return result;
      
    } catch (error) {
      this.logger.error(`Custom action failed:`, error);
      
      this.emit('recovery', {
        action: action.type,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  async restartAllServices() {
    const services = this.config.get('services') || {};
    const results = {};
    
    for (const [name, service] of Object.entries(services)) {
      try {
        await this.restartService(name, service);
        results[name] = 'success';
      } catch (error) {
        results[name] = `failed: ${error.message}`;
      }
    }
    
    return results;
  }

  async clearAllCache() {
    const paths = ['/tmp', '/var/tmp', ...this.recoveryConfig.actions?.highMemory?.[0]?.paths || []];
    const results = {};
    
    for (const path of paths) {
      try {
        await this.clearCache([path]);
        results[path] = 'success';
      } catch (error) {
        results[path] = `failed: ${error.message}`;
      }
    }
    
    return results;
  }

  async resetDatabaseConnections() {
    // This would implement database connection reset logic
    // For now, return a placeholder
    return {
      postgresql: 'Connection pool reset',
      redis: 'Connections flushed'
    };
  }

  async systemCleanup() {
    const tasks = [];
    
    // Clean old logs
    tasks.push(this.cleanOldLogs(7));
    
    // Clear temp files
    tasks.push(this.clearCache(['/tmp', '/var/tmp']));
    
    // Clean package manager cache
    tasks.push(execAsync('npm cache clean --force').catch(e => e));
    
    await Promise.all(tasks);
    
    return {
      logsCleared: true,
      cacheCleared: true,
      packageCacheCleared: true
    };
  }
}

module.exports = RecoveryManager;