/**
 * Pre-startup Health Check Module
 * Validates database and external service connectivity before backend startup
 */

import path from 'path';
import fs from 'fs/promises';

class PreStartupHealthCheck {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Run all pre-startup health checks
   */
  async runAllChecks() {
    this.errors = [];
    this.warnings = [];

    console.log('🔍 Running pre-startup health checks...');

    // Run database connectivity check
    await this.checkDatabaseConnectivity();
    
    // Run Redis connectivity check (if configured)
    await this.checkRedisConnectivity();
    
    // Check critical directories
    await this.checkCriticalDirectories();
    
    // Check disk space
    await this.checkDiskSpace();

    return {
      isHealthy: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Check database connectivity
   */
  async checkDatabaseConnectivity() {
    const databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      // Check SQLite database (default)
      await this.checkSQLiteDatabase();
    } else {
      // Check external database (PostgreSQL, MySQL, etc.)
      await this.checkExternalDatabase(databaseUrl);
    }
  }

  /**
   * Check SQLite database connectivity
   */
  async checkSQLiteDatabase() {
    try {
      // Import database service
      const { default: database } = await import('../services/database.js');
      
      // Initialize database if not already done
      if (!database.db) {
        await database.initialize();
      }
      
      // Test connection
      const result = database.db.prepare('SELECT 1 as test').get();
      if (result && result.test === 1) {
        console.log('✅ SQLite database connectivity: OK');
      } else {
        this.errors.push('SQLite database test query failed');
      }
    } catch (error) {
      this.errors.push(`SQLite database connectivity failed: ${error.message}`);
      console.error('❌ SQLite database connectivity failed:', error.message);
    }
  }

  /**
   * Check external database connectivity (PostgreSQL, MySQL, etc.)
   */
  async checkExternalDatabase(databaseUrl) {
    try {
      // Parse database URL
      const url = new URL(databaseUrl);
      const protocol = url.protocol.replace(':', '');
      
      if (protocol === 'postgresql' || protocol === 'postgres') {
        await this.checkPostgreSQLConnectivity(databaseUrl);
      } else if (protocol === 'mysql') {
        await this.checkMySQLConnectivity(databaseUrl);
      } else {
        this.warnings.push(`Unsupported database protocol: ${protocol}. Skipping connectivity check.`);
      }
    } catch (error) {
      this.errors.push(`Database URL parsing failed: ${error.message}`);
    }
  }

  /**
   * Check PostgreSQL connectivity
   */
  async checkPostgreSQLConnectivity(databaseUrl) {
    try {
      // Try to import pg module
      let pg;
      try {
        pg = await import('pg');
      } catch (importError) {
        this.errors.push('PostgreSQL driver (pg) not installed. Run: npm install pg');
        return;
      }

      const { Pool } = pg.default || pg;
      const pool = new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 1000,
        max: 1 // Only need one connection for testing
      });

      // Test connection
      const client = await pool.connect();
      const result = await client.query('SELECT 1 as test');
      client.release();
      await pool.end();

      if (result.rows[0].test === 1) {
        console.log('✅ PostgreSQL database connectivity: OK');
      } else {
        this.errors.push('PostgreSQL database test query failed');
      }
    } catch (error) {
      this.errors.push(`PostgreSQL connectivity failed: ${error.message}`);
      console.error('❌ PostgreSQL connectivity failed:', error.message);
    }
  }

  /**
   * Check MySQL connectivity
   */
  async checkMySQLConnectivity(databaseUrl) {
    try {
      // Try to import mysql2 module
      let mysql;
      try {
        mysql = await import('mysql2/promise');
      } catch (importError) {
        this.errors.push('MySQL driver (mysql2) not installed. Run: npm install mysql2');
        return;
      }

      const connection = await mysql.default.createConnection({
        uri: databaseUrl,
        connectTimeout: 5000
      });

      const [rows] = await connection.execute('SELECT 1 as test');
      await connection.end();

      if (rows[0].test === 1) {
        console.log('✅ MySQL database connectivity: OK');
      } else {
        this.errors.push('MySQL database test query failed');
      }
    } catch (error) {
      this.errors.push(`MySQL connectivity failed: ${error.message}`);
      console.error('❌ MySQL connectivity failed:', error.message);
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedisConnectivity() {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      console.log('ℹ️  Redis not configured, skipping connectivity check');
      return;
    }

    try {
      // Try to import ioredis module
      let Redis;
      try {
        Redis = await import('ioredis');
        Redis = Redis.default || Redis;
      } catch (importError) {
        this.errors.push('Redis driver (ioredis) not installed. Run: npm install ioredis');
        return;
      }

      const redis = new Redis(redisUrl, {
        connectTimeout: 5000,
        lazyConnect: true,
        maxRetriesPerRequest: 1
      });

      await redis.connect();
      const pong = await redis.ping();
      redis.disconnect();

      if (pong === 'PONG') {
        console.log('✅ Redis connectivity: OK');
      } else {
        this.errors.push('Redis ping test failed');
      }
    } catch (error) {
      this.errors.push(`Redis connectivity failed: ${error.message}`);
      console.error('❌ Redis connectivity failed:', error.message);
    }
  }

  /**
   * Check critical directories exist and are writable
   */
  async checkCriticalDirectories() {
    const criticalDirs = [
      path.join(process.cwd(), 'logs'),
      path.join(process.cwd(), 'data'),
      path.join(process.cwd(), 'backend/data')
    ];

    for (const dir of criticalDirs) {
      try {
        await fs.mkdir(dir, { recursive: true });
        
        // Test write access
        const testFile = path.join(dir, '.write-test');
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        
        console.log(`✅ Directory accessible: ${dir}`);
      } catch (error) {
        this.errors.push(`Critical directory not accessible: ${dir} - ${error.message}`);
        console.error(`❌ Directory check failed for ${dir}:`, error.message);
      }
    }
  }

  /**
   * Check available disk space
   */
  async checkDiskSpace() {
    try {
      const { execSync } = await import('child_process');
      
      // Check disk space on Unix-like systems
      let diskUsage;
      try {
        const output = execSync('df -h /', { encoding: 'utf8' });
        const lines = output.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].split(/\s+/);
          const usagePercent = parseInt(parts[4].replace('%', ''));
          diskUsage = usagePercent;
        }
      } catch (dfError) {
        // Fallback: check if we can write a test file
        const testDir = path.join(process.cwd(), 'logs');
        const testFile = path.join(testDir, '.disk-test');
        await fs.writeFile(testFile, 'x'.repeat(1024)); // 1KB test
        await fs.unlink(testFile);
        console.log('✅ Disk space: Sufficient (write test passed)');
        return;
      }

      if (diskUsage > 95) {
        this.errors.push(`Critical disk space: ${diskUsage}% used. At least 5% free space required.`);
      } else if (diskUsage > 85) {
        this.warnings.push(`High disk usage: ${diskUsage}% used. Consider freeing up space.`);
      } else {
        console.log(`✅ Disk space: ${100 - diskUsage}% available`);
      }
    } catch (error) {
      this.warnings.push(`Could not check disk space: ${error.message}`);
    }
  }

  /**
   * Get formatted error message for logging
   */
  getFormattedErrorMessage() {
    if (this.errors.length === 0) {
      return null;
    }

    let message = '❌ Backend startup failed due to pre-startup health check failures:\n\n';
    
    this.errors.forEach((error, index) => {
      message += `${index + 1}. ${error}\n`;
    });
    
    message += '\n💡 To fix these issues:\n';
    message += '   • Ensure database server is running and accessible\n';
    message += '   • Check network connectivity to external services\n';
    message += '   • Verify database credentials and permissions\n';
    message += '   • Ensure sufficient disk space is available\n';
    message += '   • Check that required directories can be created and written to\n';
    
    if (this.warnings.length > 0) {
      message += '\n⚠️  Warnings:\n';
      this.warnings.forEach((warning, index) => {
        message += `${index + 1}. ${warning}\n`;
      });
    }
    
    return message;
  }

  /**
   * Log health check results
   */
  async logResults() {
    const result = await this.runAllChecks();
    
    if (result.isHealthy) {
      console.log('✅ Pre-startup health checks passed');
      if (result.warnings.length > 0) {
        console.log('⚠️  Warnings:');
        result.warnings.forEach(warning => console.log(`   • ${warning}`));
      }
    } else {
      console.error(this.getFormattedErrorMessage());
    }
    
    return result;
  }
}

// Export singleton instance
export const preStartupHealthCheck = new PreStartupHealthCheck();
export default preStartupHealthCheck;