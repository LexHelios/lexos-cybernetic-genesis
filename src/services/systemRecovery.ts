
class SystemRecoveryService {
  private readonly maxRetries = 5;
  private readonly retryDelay = 5000; // 5 seconds
  private recoveryAttempts = new Map<string, number>();

  async recoverService(serviceName: string, recoveryMethod: 'restart' | 'reconnect' | 'reload' = 'restart') {
    const attempts = this.recoveryAttempts.get(serviceName) || 0;
    
    if (attempts >= this.maxRetries) {
      console.error(`🚨 Max recovery attempts reached for ${serviceName}`);
      throw new Error(`Recovery failed for ${serviceName} after ${this.maxRetries} attempts`);
    }

    this.recoveryAttempts.set(serviceName, attempts + 1);
    
    console.log(`🔄 Attempting recovery for ${serviceName} (attempt ${attempts + 1}/${this.maxRetries})`);
    
    try {
      switch (recoveryMethod) {
        case 'restart':
          await this.restartService(serviceName);
          break;
        case 'reconnect':
          await this.reconnectService(serviceName);
          break;
        case 'reload':
          await this.reloadApplication();
          break;
      }
      
      // Reset attempts on success
      this.recoveryAttempts.delete(serviceName);
      console.log(`✅ Successfully recovered ${serviceName}`);
      
    } catch (error) {
      console.error(`❌ Recovery attempt failed for ${serviceName}:`, error);
      
      // Wait before next attempt
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      // Try next recovery method
      const nextMethod = this.getNextRecoveryMethod(recoveryMethod);
      if (nextMethod) {
        return this.recoverService(serviceName, nextMethod);
      }
      
      throw error;
    }
  }

  private async restartService(serviceName: string) {
    const response = await fetch(`/api/system/restart/${serviceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to restart ${serviceName}: ${response.statusText}`);
    }

    // Wait for service to stabilize
    await new Promise(resolve => setTimeout(resolve, 10000));
  }

  private async reconnectService(serviceName: string) {
    if (serviceName === 'websocket') {
      websocketService.disconnect();
      await new Promise(resolve => setTimeout(resolve, 2000));
      websocketService.connect();
    }
  }

  private async reloadApplication() {
    console.log('🔄 Reloading application...');
    window.location.reload();
  }

  private getNextRecoveryMethod(currentMethod: string): string | null {
    const methods = ['restart', 'reconnect', 'reload'];
    const currentIndex = methods.indexOf(currentMethod);
    
    if (currentIndex < methods.length - 1) {
      return methods[currentIndex + 1];
    }
    
    return null;
  }

  resetRecoveryAttempts(serviceName?: string) {
    if (serviceName) {
      this.recoveryAttempts.delete(serviceName);
    } else {
      this.recoveryAttempts.clear();
    }
  }
}

export const systemRecovery = new SystemRecoveryService();
