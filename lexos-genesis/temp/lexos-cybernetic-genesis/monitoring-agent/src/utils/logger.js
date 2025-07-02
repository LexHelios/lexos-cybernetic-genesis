const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

class Logger {
  constructor() {
    const logDir = path.join(__dirname, '../../logs');
    
    // Create custom formats
    const logFormat = winston.format.combine(
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    );
    
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
      }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    );
    
    // Create transports
    const transports = [
      // Console transport
      new winston.transports.Console({
        format: consoleFormat,
        level: process.env.LOG_LEVEL || 'info'
      }),
      
      // File transport for all logs
      new DailyRotateFile({
        filename: path.join(logDir, 'monitoring-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
        level: 'info'
      }),
      
      // File transport for errors only
      new DailyRotateFile({
        filename: path.join(logDir, 'error-%DATE%.log'),
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '20m',
        maxFiles: '30d',
        format: logFormat,
        level: 'error'
      })
    ];
    
    // Create logger instance
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false
    });
    
    // Add stream for Morgan HTTP logging
    this.logger.stream = {
      write: (message) => {
        this.logger.info(message.trim());
      }
    };
  }
  
  // Proxy methods to winston logger
  info(...args) {
    this.logger.info(...args);
  }
  
  warn(...args) {
    this.logger.warn(...args);
  }
  
  error(...args) {
    this.logger.error(...args);
  }
  
  debug(...args) {
    this.logger.debug(...args);
  }
  
  verbose(...args) {
    this.logger.verbose(...args);
  }
  
  silly(...args) {
    this.logger.silly(...args);
  }
  
  // Custom log methods
  logMetric(metric, value, tags = {}) {
    this.logger.info('metric', {
      metric,
      value,
      tags,
      timestamp: new Date().toISOString()
    });
  }
  
  logAlert(alert) {
    this.logger.warn('alert', {
      ...alert,
      timestamp: new Date().toISOString()
    });
  }
  
  logRecovery(action) {
    this.logger.info('recovery', {
      ...action,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = Logger;