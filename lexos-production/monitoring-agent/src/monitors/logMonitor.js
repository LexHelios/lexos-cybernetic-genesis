const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { Tail } = require('tail');
const chokidar = require('chokidar');

class LogMonitor extends EventEmitter {
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.services = config.get('services') || {};
    this.logConfig = config.get('logs') || {};
    this.tails = {};
    this.watchers = {};
    this.errorCounts = {};
  }

  async start() {
    this.logger.info('Starting log monitor...');
    
    for (const [name, service] of Object.entries(this.services)) {
      if (service.logFile) {
        this.watchLogFile(name, service.logFile);
      }
    }
  }

  async stop() {
    this.logger.info('Stopping log monitor...');
    
    // Stop all tail instances
    for (const tail of Object.values(this.tails)) {
      tail.unwatch();
    }
    
    // Close all watchers
    for (const watcher of Object.values(this.watchers)) {
      await watcher.close();
    }
    
    this.tails = {};
    this.watchers = {};
  }

  watchLogFile(serviceName, logFile) {
    try {
      // Check if file exists
      if (!fs.existsSync(logFile)) {
        this.logger.warn(`Log file does not exist: ${logFile}`);
        
        // Watch for file creation
        const dir = path.dirname(logFile);
        const filename = path.basename(logFile);
        
        this.watchers[serviceName] = chokidar.watch(dir, {
          depth: 0,
          ignoreInitial: true
        });
        
        this.watchers[serviceName].on('add', (filePath) => {
          if (path.basename(filePath) === filename) {
            this.logger.info(`Log file created: ${logFile}`);
            this.startTailing(serviceName, logFile);
          }
        });
        
        return;
      }
      
      this.startTailing(serviceName, logFile);
      
    } catch (error) {
      this.logger.error(`Error watching log file ${logFile}:`, error);
    }
  }

  startTailing(serviceName, logFile) {
    try {
      // Initialize error count
      this.errorCounts[serviceName] = 0;
      
      // Create tail instance
      this.tails[serviceName] = new Tail(logFile, {
        follow: true,
        logger: console,
        useWatchFile: true,
        flushAtEOF: true
      });
      
      this.tails[serviceName].on('line', (line) => {
        this.processLogLine(serviceName, line);
      });
      
      this.tails[serviceName].on('error', (error) => {
        this.logger.error(`Tail error for ${serviceName}:`, error);
      });
      
      this.logger.info(`Started tailing log file: ${logFile}`);
      
    } catch (error) {
      this.logger.error(`Error starting tail for ${logFile}:`, error);
    }
  }

  processLogLine(serviceName, line) {
    try {
      const timestamp = new Date().toISOString();
      
      // Check for error patterns
      const errorPatterns = this.logConfig.errorPatterns || [];
      const warningPatterns = this.logConfig.warningPatterns || [];
      
      let severity = null;
      let matchedPattern = null;
      
      // Check error patterns
      for (const pattern of errorPatterns) {
        if (line.includes(pattern) || new RegExp(pattern, 'i').test(line)) {
          severity = 'error';
          matchedPattern = pattern;
          break;
        }
      }
      
      // Check warning patterns if no error found
      if (!severity) {
        for (const pattern of warningPatterns) {
          if (line.includes(pattern) || new RegExp(pattern, 'i').test(line)) {
            severity = 'warning';
            matchedPattern = pattern;
            break;
          }
        }
      }
      
      // If error or warning found, emit event
      if (severity) {
        this.errorCounts[serviceName]++;
        
        const event = {
          service: serviceName,
          severity,
          pattern: matchedPattern,
          message: line.trim(),
          timestamp,
          errorCount: this.errorCounts[serviceName]
        };
        
        // Extract additional context if possible
        const context = this.extractContext(line);
        if (context) {
          event.context = context;
        }
        
        this.emit('error', event);
        
        // Log the finding
        this.logger.warn(`${severity.toUpperCase()} in ${serviceName} logs:`, line.trim());
      }
      
      // Check for specific patterns that might need immediate action
      this.checkCriticalPatterns(serviceName, line);
      
    } catch (error) {
      this.logger.error('Error processing log line:', error);
    }
  }

  extractContext(line) {
    const context = {};
    
    // Try to extract timestamp
    const timestampMatch = line.match(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/);
    if (timestampMatch) {
      context.logTimestamp = timestampMatch[0];
    }
    
    // Try to extract error type
    const errorTypeMatch = line.match(/(\w+Error|Exception\w*)/);
    if (errorTypeMatch) {
      context.errorType = errorTypeMatch[1];
    }
    
    // Try to extract file path
    const fileMatch = line.match(/([\/\w\-\.]+\.(js|ts|jsx|tsx|py|java|cpp|c|go))(?::\d+)?/);
    if (fileMatch) {
      context.file = fileMatch[1];
    }
    
    // Try to extract line number
    const lineNumberMatch = line.match(/:(\d+):?(\d+)?/);
    if (lineNumberMatch) {
      context.line = parseInt(lineNumberMatch[1]);
      if (lineNumberMatch[2]) {
        context.column = parseInt(lineNumberMatch[2]);
      }
    }
    
    // Try to extract status code
    const statusMatch = line.match(/\b([4-5]\d{2})\b/);
    if (statusMatch) {
      context.statusCode = parseInt(statusMatch[1]);
    }
    
    return Object.keys(context).length > 0 ? context : null;
  }

  checkCriticalPatterns(serviceName, line) {
    // Check for out of memory errors
    if (/out of memory|oom|heap out of memory/i.test(line)) {
      this.emit('critical', {
        service: serviceName,
        type: 'memory',
        message: 'Out of memory error detected',
        line: line.trim()
      });
    }
    
    // Check for database connection errors
    if (/connection refused|lost connection|can't connect to/i.test(line)) {
      this.emit('critical', {
        service: serviceName,
        type: 'connection',
        message: 'Connection error detected',
        line: line.trim()
      });
    }
    
    // Check for port binding errors
    if (/address already in use|bind failed|port.*in use/i.test(line)) {
      this.emit('critical', {
        service: serviceName,
        type: 'port',
        message: 'Port binding error detected',
        line: line.trim()
      });
    }
    
    // Check for permission errors
    if (/permission denied|access denied|eacces/i.test(line)) {
      this.emit('critical', {
        service: serviceName,
        type: 'permission',
        message: 'Permission error detected',
        line: line.trim()
      });
    }
  }

  getErrorCounts() {
    return { ...this.errorCounts };
  }

  resetErrorCount(serviceName) {
    this.errorCounts[serviceName] = 0;
  }

  async getRecentErrors(serviceName, lines = 50) {
    const service = this.services[serviceName];
    if (!service || !service.logFile) {
      return [];
    }
    
    try {
      const logContent = await fs.promises.readFile(service.logFile, 'utf-8');
      const logLines = logContent.split('\n');
      const errors = [];
      
      // Search from the end of the file
      for (let i = logLines.length - 1; i >= 0 && errors.length < lines; i--) {
        const line = logLines[i];
        
        for (const pattern of this.logConfig.errorPatterns || []) {
          if (line.includes(pattern) || new RegExp(pattern, 'i').test(line)) {
            errors.push({
              line: line.trim(),
              lineNumber: i + 1,
              pattern
            });
            break;
          }
        }
      }
      
      return errors.reverse();
      
    } catch (error) {
      this.logger.error(`Error reading recent errors from ${service.logFile}:`, error);
      return [];
    }
  }
}

module.exports = LogMonitor;