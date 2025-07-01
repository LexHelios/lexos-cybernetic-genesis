
import { useState, useEffect } from 'react';
import { SystemStatus } from '../types/api';
import { apiClient } from '../services/api';
import { websocketService } from '../services/websocket';
import { formatBytes } from '../utils/formatters';

export const useSystemMonitor = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Format hardware data with proper units
  const formatHardwareData = (hardware: any) => {
    if (!hardware) return hardware;
    
    const formatted = { ...hardware };
    
    // Format disk storage
    if (formatted.disk) {
      if (typeof formatted.disk.total === 'number') {
        formatted.disk.total = formatBytes(formatted.disk.total);
      }
      if (typeof formatted.disk.used === 'number') {
        formatted.disk.used = formatBytes(formatted.disk.used);
      }
      if (typeof formatted.disk.available === 'number') {
        formatted.disk.available = formatBytes(formatted.disk.available);
      }
    }
    
    // Format memory
    if (formatted.memory) {
      if (typeof formatted.memory.total === 'number') {
        formatted.memory.total = formatBytes(formatted.memory.total);
      }
      if (typeof formatted.memory.used === 'number') {
        formatted.memory.used = formatBytes(formatted.memory.used);
      }
      if (typeof formatted.memory.available === 'number') {
        formatted.memory.available = formatBytes(formatted.memory.available);
      }
    }
    
    // Format GPU memory
    if (formatted.gpu) {
      if (typeof formatted.gpu.memory_total === 'number') {
        formatted.gpu.memory_total = formatBytes(formatted.gpu.memory_total);
      }
      if (typeof formatted.gpu.memory_used === 'number') {
        formatted.gpu.memory_used = formatBytes(formatted.gpu.memory_used);
      }
    }
    
    return formatted;
  };

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        setIsLoading(true);
        const status = await apiClient.getSystemStatus();
        // Format the hardware data
        if (status && status.hardware) {
          status.hardware = formatHardwareData(status.hardware);
        }
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
        hardware: formatHardwareData(data),
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
