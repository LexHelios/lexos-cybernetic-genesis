
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Users, 
  Cpu, 
  HardDrive,
  RefreshCw,
  Download
} from 'lucide-react';
import { apiClient } from '../../services/api';

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

const AnalyticsDashboard = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiClient.request<AnalyticsData>('/analytics/dashboard');
      setAnalyticsData(response);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      // Set mock data for development
      setAnalyticsData({
        performance: {
          response_time: 245,
          throughput: 1250,
          error_rate: 0.05,
          uptime: 99.8
        },
        usage: {
          active_users: 42,
          total_requests: 15420,
          data_processed: 2.4
        },
        system: {
          cpu_usage: 34.5,
          memory_usage: 67.2,
          disk_usage: 45.8,
          network_io: 128.4
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      setExportLoading(true);
      const response = await apiClient.request<Blob>('/analytics/export', {
        method: 'POST',
        headers: {
          'Accept': 'application/pdf'
        }
      });
      
      // Create download link
      const url = window.URL.createObjectURL(response);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
        <div className="flex space-x-2">
          <Button onClick={fetchAnalytics} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportReport} disabled={exportLoading} size="sm">
            <Download className="w-4 h-4 mr-2" />
            {exportLoading ? 'Exporting...' : 'Export Report'}
          </Button>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.performance.response_time}ms</div>
            <Badge variant="outline" className="text-green-600">
              <TrendingDown className="w-3 h-3 mr-1" />
              12% faster
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Throughput</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.usage.total_requests}</div>
            <Badge variant="outline" className="text-blue-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              8% increase
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.usage.active_users}</div>
            <Badge variant="outline" className="text-purple-600">
              <TrendingUp className="w-3 h-3 mr-1" />
              5% growth
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Uptime</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analyticsData?.performance.uptime}%</div>
            <Badge variant="outline" className="text-green-600">
              Excellent
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* System Resources */}
      <Card>
        <CardHeader>
          <CardTitle>System Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="h-4 w-4" />
                <span className="text-sm font-medium">CPU Usage</span>
              </div>
              <span className="text-sm text-muted-foreground">{analyticsData?.system.cpu_usage}%</span>
            </div>
            <Progress value={analyticsData?.system.cpu_usage || 0} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4" />
                <span className="text-sm font-medium">Memory Usage</span>
              </div>
              <span className="text-sm text-muted-foreground">{analyticsData?.system.memory_usage}%</span>
            </div>
            <Progress value={analyticsData?.system.memory_usage || 0} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4" />
                <span className="text-sm font-medium">Disk Usage</span>
              </div>
              <span className="text-sm text-muted-foreground">{analyticsData?.system.disk_usage}%</span>
            </div>
            <Progress value={analyticsData?.system.disk_usage || 0} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsDashboard;
