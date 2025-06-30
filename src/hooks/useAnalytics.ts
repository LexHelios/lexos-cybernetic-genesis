
import { useState, useEffect } from 'react';
import { apiClient } from '../services/api';

export const useAnalytics = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.request('/analytics/dashboard', { method: 'GET' });
      setData(response.data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return { 
    data, 
    loading, 
    error, 
    refetch: fetchAnalytics 
  };
};
