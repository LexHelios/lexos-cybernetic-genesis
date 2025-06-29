
import { useState, useEffect } from 'react';
import { SystemStatus } from '../types/api';
import { apiClient } from '../services/api';
import { websocketService } from '../services/websocket';

export const useSystemMonitor = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setIsLoading(true);
        const status = await apiClient.getSystemStatus();
        setSystemStatus(status);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch system status');
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchSystemStatus();

    // Set up WebSocket for real-time updates
    websocketService.connect();
    
    const unsubscribe = websocketService.subscribe('system_status', (data) => {
      setSystemStatus(prevStatus => ({
        ...prevStatus!,
        hardware: data,
        timestamp: Date.now() / 1000,
      }));
    });

    // Refresh every 30 seconds as backup
    const interval = setInterval(fetchSystemStatus, 30000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);

  return { systemStatus, isLoading, error, refetch: () => {} };
};
