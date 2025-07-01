import { websocketService } from './websocket';

class HealthMonitor {
  private intervalId: NodeJS.Timeout | null = null;
  private readonly checkInterval = 30000; // 30 seconds
  private readonly maxRetries = 3;
  private retryCount = 0;
  private isMonitoring = false;

  private getBackendUrl() {
    // Always use localhost:9000 for development
    return 'http://localhost:9000';
  }

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
      const backendUrl = this.getBackendUrl();
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        },
        // Add timeout to prevent hanging
        signal: AbortSignal.timeout(10000)
      });

      if (response.ok) {
        const health = await response.json();
        console.log('✅ Backend healthy:', health.status);
        return health.status === 'operational';
      }
      
      console.warn('⚠️ Backend unhealthy - status:', response.status);
      return false;
    } catch (error) {
      console.error('❌ Backend health check failed:', error);
      return false;
    }
  }

  private handleUnhealthySystem() {
    this.retryCount++;
    console.warn(`⚠️ System unhealthy - retry ${this.retryCount}/${this.maxRetries}`);
    
    this.updateConnectionStatus(false);
    
    // Don't attempt automatic recovery - just notify
    if (this.retryCount >= this.maxRetries) {
      console.error('🚨 System recovery needed - max retries reached');
      this.showRecoveryNotification();
      this.retryCount = 0; // Reset for next cycle
    }
  }

  private updateConnectionStatus(isHealthy: boolean) {
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
          <span>Backend connection issues detected. Check backend status.</span>
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
