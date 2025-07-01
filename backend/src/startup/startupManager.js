/**
 * Startup Manager Module
 * Orchestrates environment validation and pre-startup health checks
 */

import fs from 'fs/promises';
import path from 'path';
import environmentValidator from './environmentValidator.js';
import preStartupHealthCheck from './preStartupHealthCheck.js';

class StartupManager {
  constructor() {
    this.logPath = path.join(process.cwd(), 'logs');
    this.errorLogFile = path.join(this.logPath, 'backend-error.log');
  }

  /**
   * Initialize logs directory
   */
  async initializeLogs() {
    try {
      await fs.mkdir(this.logPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
      throw error;
    }
  }

  /**
   * Log fatal error to file
   */
  async logFatalError(message, error = null) {
    try {
      await this.initializeLogs();
      
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'FATAL',
        message,
        error: error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : null,
        pid: process.pid,
        nodeVersion: process.version,
        platform: process.platform,
        memory: process.memoryUsage(),
        environment: {
          NODE_ENV: process.env.NODE_ENV,
          PORT: process.env.PORT
        }
      };
      
      // Write to error log file
      await fs.appendFile(this.errorLogFile, JSON.stringify(logEntry) + '\n');
      
      // Also log to console for immediate visibility
      console.error('\n' + message);
      if (error) {
        console.error('Error details:', error.message);
      }
      console.error(`\n📝 Error logged to: ${this.errorLogFile}`);
      
    } catch (logError) {
      console.error('Failed to write to error log file:', logError);
      console.error('Original error:', message);
      if (error) {
        console.error('Original error details:', error);
      }
    }
  }

  /**
   * Validate environment variables
   */
  async validateEnvironment() {
    console.log('🔧 Validating environment variables...');
    
    try {
      const result = environmentValidator.logResults();
      
      if (!result.isValid) {
        const errorMessage = environmentValidator.getFormattedErrorMessage();
        await this.logFatalError(errorMessage);
        return false;
      }
      
      return true;
    } catch (error) {
      await this.logFatalError('Environment validation failed due to unexpected error', error);
      return false;
    }
  }

  /**
   * Run pre-startup health checks
   */
  async runHealthChecks() {
    console.log('🏥 Running pre-startup health checks...');
    
    try {
      const result = await preStartupHealthCheck.logResults();
      
      if (!result.isHealthy) {
        const errorMessage = preStartupHealthCheck.getFormattedErrorMessage();
        await this.logFatalError(errorMessage);
        return false;
      }
      
      return true;
    } catch (error) {
      await this.logFatalError('Pre-startup health checks failed due to unexpected error', error);
      return false;
    }
  }

  /**
   * Setup process error handlers
   */
  setupProcessHandlers() {
    process.on('uncaughtException', async (error) => {
      await this.logFatalError('Uncaught Exception - Backend crashing', error);
      console.error('\n💥 FATAL: Uncaught exception occurred. Backend will exit.');
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, promise) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      await this.logFatalError('Unhandled Promise Rejection', error);
      console.error('\n💥 WARNING: Unhandled promise rejection. This may cause instability.');
    });

    process.on('SIGTERM', async () => {
      console.log('\n🛑 SIGTERM received - shutting down gracefully...');
      await this.gracefulShutdown();
    });

    process.on('SIGINT', async () => {
      console.log('\n🛑 SIGINT received - shutting down gracefully...');
      await this.gracefulShutdown();
    });
  }

  /**
   * Graceful shutdown handler
   */
  async gracefulShutdown() {
    console.log('🔄 Initiating graceful shutdown...');
    
    // Give ongoing requests time to complete
    const shutdownTimeout = setTimeout(() => {
      console.log('⏰ Shutdown timeout reached - forcing exit');
      process.exit(0);
    }, 10000); // 10 seconds

    try {
      // Close server if it exists
      if (global.server) {
        await new Promise((resolve) => {
          global.server.close(() => {
            console.log('🌐 HTTP server closed');
            resolve();
          });
        });
      }
      
      // Close database connections
      try {
        const { default: database } = await import('../services/database.js');
        if (database && database.close) {
          await database.close();
          console.log('🗄️  Database connections closed');
        }
      } catch (dbError) {
        console.warn('Warning: Could not close database connections:', dbError.message);
      }
      
      clearTimeout(shutdownTimeout);
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
      
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }

  /**
   * Run complete startup validation
   */
  async validateStartup() {
    console.log('\n🚀 LexOS Genesis Backend - Starting up...\n');
    
    try {
      // Setup error handlers first
      this.setupProcessHandlers();
      
      // Step 1: Validate environment variables
      const envValid = await this.validateEnvironment();
      if (!envValid) {
        await this.exitWithError('Environment validation failed. Please fix the configuration errors above.');
        return false;
      }
      
      // Step 2: Run pre-startup health checks
      const healthChecksPass = await this.runHealthChecks();
      if (!healthChecksPass) {
        await this.exitWithError('Pre-startup health checks failed. Please fix the connectivity issues above.');
        return false;
      }
      
      console.log('✅ All startup validations passed');
      console.log('🎯 Backend is ready to start serving requests\n');
      
      return true;
      
    } catch (error) {
      await this.logFatalError('Startup validation failed due to unexpected error', error);
      await this.exitWithError('Startup validation encountered an unexpected error. Check the error log for details.');
      return false;
    }
  }

  /**
   * Exit with error message and code
   */
  async exitWithError(message) {
    console.error(`\n💥 FATAL ERROR: ${message}`);
    console.error('🔧 Backend startup aborted to prevent running in an unhealthy state.');
    console.error(`📝 Check the error log for details: ${this.errorLogFile}`);
    console.error('\n💡 Common solutions:');
    console.error('   • Ensure all required environment variables are set');
    console.error('   • Check database connectivity and credentials');
    console.error('   • Verify sufficient disk space and directory permissions');
    console.error('   • Review the error log for specific issues\n');
    
    process.exit(1);
  }

  /**
   * Log successful startup
   */
  async logSuccessfulStartup(port) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'Backend started successfully',
      port,
      pid: process.pid,
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'development'
    };
    
    try {
      await this.initializeLogs();
      const successLogFile = path.join(this.logPath, 'backend.log');
      await fs.appendFile(successLogFile, JSON.stringify(logEntry) + '\n');
    } catch (error) {
      console.warn('Could not write startup log:', error.message);
    }
  }
}

// Export singleton instance
export const startupManager = new StartupManager();
export default startupManager;