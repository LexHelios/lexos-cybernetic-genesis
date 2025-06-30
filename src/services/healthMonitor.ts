
import { websocketService } from './websocket';

class HealthMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 30000; // 30 seconds
  private readonly maxRetries = 3;
  private retryCount = 0;
  private isMonitoring = false;

  private endpoints = {
    backend: '/api/health',
    frontend: window.location.origin
  };

  start() {
    if (this.isMonitoring) return;
    
    console.log('🔍 Starting health monitoring...');
    this.isMonitoring = true;
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up periodic monitoring
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isMonitoring = false;
    console.log('⏹️ Health monitoring stopped');
  }

  private async performHealthCheck() {
    try {
      console.log('🔍 Performing health check...');
      
      // Check backend health
      const backendHealthy = await this.checkBackendHealth();
      
      if (backendHealthy) {
        this.retryCount = 0;
        this.updateConnectionStatus(true);
      } else {
        this.handleUnhealthySystem();
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.handleUnhealthySystem();
    }
  }

  private async checkBackendHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.endpoints.backend, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const health = await response.json();
        console.log('✅ Backend healthy:', health.status);
        return health.status === 'healthy';
      }
      
      console.warn('⚠️ Backend unhealthy - status:', response.status);
      return false;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  }

  private async handleUnhealthySystem() {
    this.retryCount++;
    console.warn(`⚠️ System unhealthy - retry ${this.retryCount}/${this.maxRetries}`);
    
    this.updateConnectionStatus(false);
    
    if (this.retryCount >= this.maxRetries) {
      console.error('🚨 System recovery needed - max retries reached');
      await this.attemptSystemRecovery();
      this.retryCount = 0;
    }
  }

  private async attemptSystemRecovery() {
    console.log('🔄 Attempting system recovery...');
    
    try {
      const response = await fetch('/api/system/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          component: 'backend',
          reason: 'health_check_failure'
        })
      });

      if (response.ok) {
        console.log('✅ Backend restart initiated');
        await new Promise(resolve => setTimeout(resolve, 10000));
      } else {
        console.error('❌ Failed to restart backend via API');
        this.fallbackRecovery();
      }
    } catch (error) {
      console.error('❌ Recovery attempt failed:', error);
      this.fallbackRecovery();
    }
  }

  private fallbackRecovery() {
    console.log('🔄 Attempting fallback recovery...');
    
    this.showRecoveryNotification();
    
    // Try to reconnect WebSocket
    if (websocketService && websocketService.isConnected && !websocketService.isConnected()) {
      websocketService.connect();
    }
    
    setTimeout(() => {
      console.log('🔄 Performing page reload for recovery...');
      window.location.reload();
    }, 15000);
  }

  private updateConnectionStatus(isHealthy: boolean) {
    const statusElement = document.getElementById('connection-status');
    if (statusElement) {
      statusElement.className = isHealthy ? 'status-healthy' : 'status-unhealthy';
      statusElement.textContent = isHealthy ? 'Online' : 'Recovering...';
    }
    
    window.dispatchEvent(new CustomEvent('connectionStatusChanged', {
      detail: { isHealthy, timestamp: Date.now() }
    }));
  }

  private showRecoveryNotification() {
    const notification = document.createElement('div');
    notification.className = 'recovery-notification';
    notification.innerHTML = `
      <div class="bg-yellow-500 text-white p-4 rounded-lg shadow-lg fixed top-4 right-4 z-50">
        <div class="flex items-center gap-2">
          <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          <span>System recovery in progress...</span>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }
}

export const healthMonitor = new HealthMonitor();
