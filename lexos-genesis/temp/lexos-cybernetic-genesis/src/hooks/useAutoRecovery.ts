
import { useEffect, useCallback } from 'react';
import { healthMonitor } from '../services/healthMonitor';
import { websocketService } from '../services/websocket';

export const useAutoRecovery = () => {
  const startMonitoring = useCallback(() => {
    // Start health monitoring
    healthMonitor.start();
    
    // Ensure WebSocket connection
    if (!websocketService.isConnected()) {
      websocketService.connect();
    }
    
    console.log('🚀 Auto-recovery system started');
  }, []);

  const stopMonitoring = useCallback(() => {
    healthMonitor.stop();
    console.log('⏹️ Auto-recovery system stopped');
  }, []);

  useEffect(() => {
    // Start monitoring when component mounts
    startMonitoring();
    
    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 Page became visible - checking system health');
        startMonitoring();
      }
    };

    // Handle online/offline events
    const handleOnline = () => {
      console.log('🌐 Network came back online');
      startMonitoring();
    };

    const handleOffline = () => {
      console.log('📵 Network went offline');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup on unmount
    return () => {
      stopMonitoring();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [startMonitoring, stopMonitoring]);

  return {
    startMonitoring,
    stopMonitoring
  };
};
