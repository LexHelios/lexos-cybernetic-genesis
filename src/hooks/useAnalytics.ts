import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

interface AnalyticsData {
  dashboard: any;
  metrics: any[];
  events: any[];
  systemHealth: any[];
  taskAnalytics: any[];
  agentPerformance: any[];
}

interface UseAnalyticsOptions {
  refreshInterval?: number;
  autoRefresh?: boolean;
  timeRange?: string;
}

export const useAnalytics = (options: UseAnalyticsOptions = {}) => {
  const { 
    refreshInterval = 30000, 
    autoRefresh = true,
    timeRange = '24h'
  } = options;

  const [data, setData] = useState<AnalyticsData>({
    dashboard: null,
    metrics: [],
    events: [],
    systemHealth: [],
    taskAnalytics: [],
    agentPerformance: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getTimeRange = useCallback(() => {
    const now = Date.now();
    switch (timeRange) {
      case '1h':
        return { start: now - 3600000, end: now };
      case '6h':
        return { start: now - 21600000, end: now };
      case '24h':
        return { start: now - 86400000, end: now };
      case '7d':
        return { start: now - 604800000, end: now };
      case '30d':
        return { start: now - 2592000000, end: now };
      default:
        return { start: now - 86400000, end: now };
    }
  }, [timeRange]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { start, end } = getTimeRange();

      // Fetch dashboard overview
      const dashboardResponse = await api.get('/analytics/dashboard');
      
      // Fetch system health metrics
      const healthResponse = await api.get('/analytics/system/health', {
        params: { startTime: start, endTime: end, limit: 100 }
      });

      // Fetch recent events
      const eventsResponse = await api.get('/analytics/events/system', {
        params: { startTime: start, endTime: end, limit: 50 }
      });

      // Fetch task analytics
      const taskResponse = await api.get('/analytics/tasks', {
        params: { startTime: start, endTime: end }
      });

      setData({
        dashboard: dashboardResponse.data,
        metrics: dashboardResponse.data.metrics || [],
        events: eventsResponse.data.events || [],
        systemHealth: healthResponse.data.health || [],
        taskAnalytics: taskResponse.data.analytics || [],
        agentPerformance: dashboardResponse.data.agents || []
      });
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [getTimeRange]);

  const trackEvent = useCallback(async (eventType: string, eventName: string, properties?: any) => {
    try {
      await api.post('/analytics/events', {
        eventType,
        eventName,
        properties
      });
    } catch (err) {
      console.error('Error tracking event:', err);
    }
  }, []);

  const trackMetric = useCallback(async (category: string, metricName: string, value: number, metadata?: any) => {
    try {
      await api.post('/analytics/metrics', {
        category,
        metricName,
        value,
        metadata
      });
    } catch (err) {
      console.error('Error tracking metric:', err);
    }
  }, []);

  const subscribeToRealtime = useCallback(() => {
    const eventSource = new EventSource('/api/analytics/stream', {
      withCredentials: true
    });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different types of real-time updates
        switch (data.type) {
          case 'metric':
            // Update metrics in real-time
            setData(prev => ({
              ...prev,
              metrics: [...prev.metrics, data]
            }));
            break;
          case 'event':
            // Update events in real-time
            setData(prev => ({
              ...prev,
              events: [data, ...prev.events].slice(0, 50)
            }));
            break;
          case 'agentPerformance':
            // Update agent performance data
            setData(prev => ({
              ...prev,
              agentPerformance: prev.agentPerformance.map(agent => 
                agent.agentId === data.agentId 
                  ? { ...agent, ...data.performance }
                  : agent
              )
            }));
            break;
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    fetchDashboardData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchDashboardData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchDashboardData, autoRefresh, refreshInterval]);

  useEffect(() => {
    const cleanup = subscribeToRealtime();
    return cleanup;
  }, [subscribeToRealtime]);

  return {
    data,
    loading,
    error,
    refresh: fetchDashboardData,
    trackEvent,
    trackMetric
  };
};

// Hook for specific metric queries
export const useMetric = (category: string, metricName: string, options: UseAnalyticsOptions = {}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetric = useCallback(async () => {
    try {
      setLoading(true);
      const { timeRange = '1h' } = options;
      const now = Date.now();
      let startTime = now - 3600000; // Default 1 hour

      switch (timeRange) {
        case '6h':
          startTime = now - 21600000;
          break;
        case '24h':
          startTime = now - 86400000;
          break;
        case '7d':
          startTime = now - 604800000;
          break;
      }

      const response = await api.get(`/analytics/metrics/${category}/${metricName}`, {
        params: {
          startTime,
          endTime: now,
          interval: timeRange === '7d' ? 'hour' : timeRange === '24h' ? 'minute' : 'raw'
        }
      });

      setData(response.data.metrics || []);
    } catch (err) {
      console.error('Error fetching metric:', err);
      setError('Failed to load metric data');
    } finally {
      setLoading(false);
    }
  }, [category, metricName, options]);

  useEffect(() => {
    fetchMetric();
  }, [fetchMetric]);

  return { data, loading, error, refresh: fetchMetric };
};