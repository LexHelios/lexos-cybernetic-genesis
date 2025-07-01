import { EventEmitter } from 'events';
import confidenceGate from './confidenceGate.js';

/**
 * Health Monitoring & Auto-Healing System
 * Monitors agent health, performance metrics, and automatically handles failures
 */
class HealthMonitor extends EventEmitter {
  constructor() {
    super();
    this.agentMetrics = new Map();
    this.systemMetrics = {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      lastHealthCheck: new Date()
    };
    
    this.healthCheckInterval = null;
    this.alertThresholds = {
      errorRate: 0.05, // 5% error rate triggers alert
      responseTime: 10000, // 10 second response time threshold
      memoryUsage: 0.85, // 85% memory usage threshold
      agentFailures: 3 // 3 consecutive failures triggers restart
    };

    this.setupHealthChecks();
  }

  /**
   * Start periodic health checks
   */
  setupHealthChecks() {
    // Run health checks every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Listen to confidence gate events
    confidenceGate.on('escalation_triggered', (data) => {
      this.recordEscalation(data);
    });

    confidenceGate.on('escalation_failed', (data) => {
      this.recordEscalationFailure(data);
    });
  }

  /**
   * Record agent execution metrics
   */
  recordAgentExecution(agentId, executionTime, success, error = null) {
    if (!this.agentMetrics.has(agentId)) {
      this.agentMetrics.set(agentId, {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalExecutionTime: 0,
        avgExecutionTime: 0,
        lastExecution: null,
        consecutiveFailures: 0,
        status: 'healthy',
        errorHistory: []
      });
    }

    const metrics = this.agentMetrics.get(agentId);
    metrics.totalRequests++;
    metrics.totalExecutionTime += executionTime;
    metrics.avgExecutionTime = metrics.totalExecutionTime / metrics.totalRequests;
    metrics.lastExecution = new Date();

    if (success) {
      metrics.successfulRequests++;
      metrics.consecutiveFailures = 0;
      if (metrics.status === 'degraded') {
        metrics.status = 'healthy';
        this.emit('agent_recovered', { agentId, metrics });
      }
    } else {
      metrics.failedRequests++;
      metrics.consecutiveFailures++;
      
      if (error) {
        metrics.errorHistory.push({
          timestamp: new Date(),
          error: error.message || error,
          executionTime
        });
        
        // Keep only last 10 errors
        if (metrics.errorHistory.length > 10) {
          metrics.errorHistory.shift();
        }
      }

      // Check if agent needs intervention
      if (metrics.consecutiveFailures >= this.alertThresholds.agentFailures) {
        metrics.status = 'critical';
        this.handleAgentFailure(agentId, metrics);
      } else if (metrics.consecutiveFailures > 1) {
        metrics.status = 'degraded';
        this.emit('agent_degraded', { agentId, metrics });
      }
    }

    // Update system metrics
    this.systemMetrics.totalRequests++;
    if (!success) {
      this.systemMetrics.totalErrors++;
    }

    this.agentMetrics.set(agentId, metrics);
  }

  /**
   * Handle agent failure with auto-healing
   */
  async handleAgentFailure(agentId, metrics) {
    console.error(`🚨 Agent ${agentId} is critical - ${metrics.consecutiveFailures} consecutive failures`);
    
    this.emit('agent_critical', { 
      agentId, 
      metrics,
      action: 'restart_attempted' 
    });

    try {
      // Attempt to restart the agent
      await this.restartAgent(agentId);
      
      // Reset failure count after successful restart
      metrics.consecutiveFailures = 0;
      metrics.status = 'healthy';
      
      console.log(`✅ Agent ${agentId} restarted successfully`);
      this.emit('agent_restarted', { agentId, success: true });
      
    } catch (restartError) {
      console.error(`❌ Failed to restart agent ${agentId}:`, restartError);
      metrics.status = 'failed';
      
      this.emit('agent_restart_failed', { 
        agentId, 
        error: restartError.message,
        metrics 
      });
    }
  }

  /**
   * Restart a failed agent
   */
  async restartAgent(agentId) {
    // This would integrate with the actual agent manager
    // For now, simulate a restart
    console.log(`🔄 Restarting agent ${agentId}...`);
    
    // Simulate restart delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real implementation, this would:
    // 1. Stop the current agent instance
    // 2. Clear its memory/state
    // 3. Reinitialize with fresh configuration
    // 4. Validate the agent is responsive
    
    return true;
  }

  /**
   * Record escalation metrics
   */
  recordEscalation(escalationData) {
    const agentId = escalationData.agent;
    if (this.agentMetrics.has(agentId)) {
      const metrics = this.agentMetrics.get(agentId);
      metrics.escalations = (metrics.escalations || 0) + 1;
      metrics.lastEscalation = new Date();
    }
  }

  /**
   * Record escalation failure
   */
  recordEscalationFailure(failureData) {
    const agentId = failureData.agent;
    if (this.agentMetrics.has(agentId)) {
      const metrics = this.agentMetrics.get(agentId);
      metrics.escalationFailures = (metrics.escalationFailures || 0) + 1;
      metrics.status = 'degraded';
    }
  }

  /**
   * Perform comprehensive health check
   */
  performHealthCheck() {
    const now = new Date();
    this.systemMetrics.uptime = process.uptime();
    this.systemMetrics.memoryUsage = process.memoryUsage();
    this.systemMetrics.lastHealthCheck = now;

    // Calculate system-wide error rate
    const errorRate = this.systemMetrics.totalRequests > 0 
      ? this.systemMetrics.totalErrors / this.systemMetrics.totalRequests 
      : 0;

    // Check memory usage
    const memoryUsagePercent = this.systemMetrics.memoryUsage.heapUsed / this.systemMetrics.memoryUsage.heapTotal;

    // System-level alerts
    if (errorRate > this.alertThresholds.errorRate) {
      this.emit('system_alert', {
        type: 'high_error_rate',
        value: errorRate,
        threshold: this.alertThresholds.errorRate,
        timestamp: now
      });
    }

    if (memoryUsagePercent > this.alertThresholds.memoryUsage) {
      this.emit('system_alert', {
        type: 'high_memory_usage',
        value: memoryUsagePercent,
        threshold: this.alertThresholds.memoryUsage,
        timestamp: now
      });
    }

    // Check for stale agents (no activity in last 5 minutes)
    const staleThreshold = 5 * 60 * 1000; // 5 minutes
    for (const [agentId, metrics] of this.agentMetrics) {
      if (metrics.lastExecution && (now - metrics.lastExecution) > staleThreshold) {
        this.emit('agent_stale', { agentId, lastActivity: metrics.lastExecution });
      }
    }

    console.log(`🏥 Health check completed - Error rate: ${(errorRate * 100).toFixed(2)}%, Memory: ${(memoryUsagePercent * 100).toFixed(1)}%`);
  }

  /**
   * Get comprehensive health report
   */
  getHealthReport() {
    const agentHealth = {};
    for (const [agentId, metrics] of this.agentMetrics) {
      const errorRate = metrics.totalRequests > 0 
        ? (metrics.failedRequests / metrics.totalRequests * 100).toFixed(2)
        : 0;

      agentHealth[agentId] = {
        status: metrics.status,
        totalRequests: metrics.totalRequests,
        successRate: `${(100 - errorRate)}%`,
        errorRate: `${errorRate}%`,
        avgExecutionTime: `${metrics.avgExecutionTime.toFixed(0)}ms`,
        consecutiveFailures: metrics.consecutiveFailures,
        lastExecution: metrics.lastExecution,
        escalations: metrics.escalations || 0,
        escalationFailures: metrics.escalationFailures || 0
      };
    }

    const systemErrorRate = this.systemMetrics.totalRequests > 0 
      ? (this.systemMetrics.totalErrors / this.systemMetrics.totalRequests * 100).toFixed(2)
      : 0;

    return {
      timestamp: new Date(),
      system: {
        status: systemErrorRate > (this.alertThresholds.errorRate * 100) ? 'degraded' : 'healthy',
        uptime: `${Math.floor(this.systemMetrics.uptime / 3600)}h ${Math.floor((this.systemMetrics.uptime % 3600) / 60)}m`,
        totalRequests: this.systemMetrics.totalRequests,
        errorRate: `${systemErrorRate}%`,
        memoryUsage: {
          used: `${Math.round(this.systemMetrics.memoryUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(this.systemMetrics.memoryUsage.heapTotal / 1024 / 1024)}MB`,
          percentage: `${(this.systemMetrics.memoryUsage.heapUsed / this.systemMetrics.memoryUsage.heapTotal * 100).toFixed(1)}%`
        }
      },
      agents: agentHealth,
      escalationMetrics: confidenceGate.getMetrics()
    };
  }

  /**
   * Cleanup and stop monitoring
   */
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    this.removeAllListeners();
  }
}

export default new HealthMonitor();