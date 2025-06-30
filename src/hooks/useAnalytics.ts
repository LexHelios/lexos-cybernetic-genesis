
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

interface AnalyticsData {
  performance: {
    response_time: number;
    throughput: number;
    error_rate: number;
    uptime: number;
  };
  usage: {
    active_users: number;
    total_requests: number;
    data_processed: number;
  };
  system: {
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_io: number;
  };
}

export const useAnalytics = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.request<AnalyticsData>('/analytics/dashboard');
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
      console.error('Analytics fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchAnalytics
  };
};
