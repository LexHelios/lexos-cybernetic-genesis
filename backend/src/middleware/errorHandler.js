
import fs from 'fs/promises';
import path from 'path';

class ErrorHandler {
  constructor() {
    this.logPath = path.join(process.cwd(), 'logs');
    this.initializeLogs();
  }

  async initializeLogs() {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  async logError(error, req = null, additionalInfo = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      },
      request: req ? {
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        ip: req.ip
      } : null,
      additionalInfo,
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime()
    };

    try {
      const logFile = path.join(this.logPath, `error-${new Date().toISOString().split('T')[0]}.log`);
      await fs.appendFile(logFile, JSON.stringify(logEntry) + '\n');
    } catch (logError) {
      console.error('Failed to write error log:', logError);
    }

    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('Error logged:', logEntry);
    }
  }

  // Global error handler middleware
  globalErrorHandler() {
    return async (error, req, res, next) => {
      await this.logError(error, req);

      // Don't leak error details in production
      const isDevelopment = process.env.NODE_ENV !== 'production';
      
      let statusCode = 500;
      let message = 'Internal server error';
      
      // Handle specific error types
      if (error.name === 'ValidationError') {
        statusCode = 400;
        message = 'Validation failed';
      } else if (error.name === 'UnauthorizedError') {
        statusCode = 401;
        message = 'Unauthorized';
      } else if (error.name === 'ForbiddenError') {
        statusCode = 403;
        message = 'Forbidden';
      } else if (error.name === 'NotFoundError') {
        statusCode = 404;
        message = 'Resource not found';
      } else if (error.code === 'ECONNREFUSED') {
        statusCode = 503;
        message = 'Service unavailable';
      }

      const response = {
        error: message,
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'] || 'unknown'
      };

      if (isDevelopment) {
        response.details = error.message;
        response.stack = error.stack;
      }

      res.status(statusCode).json(response);
    };
  }

  // Async error wrapper
  asyncHandler(fn) {
    return (req, res, next) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }

  // Process error handlers
  setupProcessHandlers() {
    process.on('uncaughtException', async (error) => {
      await this.logError(error, null, { type: 'uncaughtException' });
      console.error('Uncaught Exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      await this.logError(error, null, { 
        type: 'unhandledRejection',
        promise: promise.toString()
      });
      console.error('Unhandled Rejection:', reason);
    });

    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      await this.gracefulShutdown();
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down gracefully');
      await this.gracefulShutdown();
    });
  }

  async gracefulShutdown() {
    // Give ongoing requests time to complete
    setTimeout(() => {
      console.log('Forcing shutdown');
      process.exit(0);
    }, 10000);

    // Close server gracefully
    if (global.server) {
      global.server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  }
}

export const errorHandler = new ErrorHandler();
export default errorHandler;
