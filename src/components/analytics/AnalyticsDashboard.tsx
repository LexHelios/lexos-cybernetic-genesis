import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { format } from 'date-fns';
import { CalendarIcon, Download, RefreshCw, Settings } from 'lucide-react';
import AnalyticsChart from './AnalyticsChart';
import RealtimeMetrics from './RealtimeMetrics';
import PerformanceHeatmap from './PerformanceHeatmap';
import { apiClient } from '../../services/api';

const AnalyticsDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(Date.now() - 24 * 60 * 60 * 1000),
    to: new Date()
  });
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any[]>([]);
  const [taskAnalytics, setTaskAnalytics] = useState<any>(null);
  const [agentPerformance, setAgentPerformance] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load dashboard stats
      const dashboardResponse = await api.get('/analytics/dashboard');
      setDashboardData(dashboardResponse.data);

      // Load system health metrics
      const healthResponse = await api.get('/analytics/system/health', {
        params: {
          startTime: dateRange.from.getTime(),
          endTime: dateRange.to.getTime(),
          limit: 100
        }
      });

      // Transform system health data for charts
      const healthData = healthResponse.data.health;
      setSystemMetrics([
        {
          id: 'cpu',
          label: 'CPU Usage',
          value: healthData[0]?.cpu_usage || 0,
          unit: '%',
          max: 100,
          trend: 'stable',
          icon: '💻',
          color: 'electric-blue'
        },
        {
          id: 'memory',
          label: 'Memory Usage',
          value: healthData[0]?.memory_usage || 0,
          unit: '%',
          max: 100,
          trend: 'up',
          icon: '🧠',
          color: 'neural-purple'
        },
        {
          id: 'disk',
          label: 'Disk Usage',
          value: healthData[0]?.disk_usage || 0,
          unit: '%',
          max: 100,
          trend: 'stable',
          icon: '💾',
          color: 'cyber-green'
        },
        {
          id: 'gpu',
          label: 'GPU Usage',
          value: healthData[0]?.gpu_usage || 0,
          unit: '%',
          max: 100,
          trend: 'down',
          icon: '🎮',
          color: 'matrix-green'
        }
      ]);

      // Load task analytics
      const taskResponse = await api.get('/analytics/tasks', {
        params: {
          startTime: dateRange.from.getTime(),
          endTime: dateRange.to.getTime()
        }
      });
      setTaskAnalytics(taskResponse.data.analytics);

      // Load agent performance for all agents
      const agentTypes = ['consciousness', 'executor', 'research', 'r1_unrestricted', 'gemma3n'];
      const performanceData = await Promise.all(
        agentTypes.map(async (agentType) => {
          const response = await api.get(`/analytics/agents/${agentType}_agent/performance`, {
            params: {
              startTime: dateRange.from.getTime(),
              endTime: dateRange.to.getTime()
            }
          });
          return { agentType, data: response.data.stats };
        })
      );
      setAgentPerformance(performanceData);

    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      timeRange,
      dashboard: dashboardData,
      systemMetrics,
      taskAnalytics,
      agentPerformance
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepare chart data
  const taskStatusChartData = {
    labels: ['Completed', 'Failed', 'In Progress', 'Queued'],
    datasets: [{
      label: 'Task Status Distribution',
      data: [
        dashboardData?.tasks?.completed_tasks || 0,
        dashboardData?.tasks?.failed_tasks || 0,
        dashboardData?.tasks?.total_tasks - (dashboardData?.tasks?.completed_tasks + dashboardData?.tasks?.failed_tasks) || 0,
        0
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(156, 163, 175, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(239, 68, 68)',
        'rgb(59, 130, 246)',
        'rgb(156, 163, 175)'
      ],
      borderWidth: 1
    }]
  };

  const systemHealthChartData = {
    labels: dashboardData?.system ? ['CPU', 'Memory', 'Disk', 'GPU'] : [],
    datasets: [{
      label: 'System Resources',
      data: dashboardData?.system ? [
        dashboardData.system.cpu_usage || 0,
        dashboardData.system.memory_usage || 0,
        dashboardData.system.disk_usage || 0,
        dashboardData.system.gpu_usage || 0
      ] : [],
      backgroundColor: 'rgba(0, 240, 255, 0.2)',
      borderColor: 'rgb(0, 240, 255)',
      borderWidth: 2,
      tension: 0.4
    }]
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last Hour</SelectItem>
              <SelectItem value="6h">Last 6 Hours</SelectItem>
              <SelectItem value="24h">Last 24 Hours</SelectItem>
              <SelectItem value="7d">Last 7 Days</SelectItem>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {timeRange === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-64 justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(dateRange.from, 'PPP')} - {format(dateRange.to, 'PPP')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range: any) => range && setDateRange(range)}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboardData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Real-time Metrics */}
      <RealtimeMetrics 
        metrics={systemMetrics}
        refreshInterval={10000}
        onRefresh={loadDashboardData}
      />

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnalyticsChart
              title="Task Status Distribution"
              description="Current task status breakdown"
              type="doughnut"
              data={taskStatusChartData}
              height={300}
            />

            <AnalyticsChart
              title="System Resource Usage"
              description="Current system resource utilization"
              type="bar"
              data={systemHealthChartData}
              height={300}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="bg-black/40 border-electric-blue/30">
              <CardHeader>
                <CardTitle className="text-electric-blue">Total Tasks</CardTitle>
                <CardDescription>Processed in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-orbitron font-bold text-electric-blue">
                  {dashboardData?.tasks?.total_tasks || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Success Rate: {dashboardData?.tasks?.total_tasks > 0 
                    ? ((dashboardData.tasks.completed_tasks / dashboardData.tasks.total_tasks) * 100).toFixed(1)
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-neural-purple/30">
              <CardHeader>
                <CardTitle className="text-neural-purple">Active Agents</CardTitle>
                <CardDescription>Currently processing tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-orbitron font-bold text-neural-purple">
                  {dashboardData?.agents?.length || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Avg Response Time: {dashboardData?.tasks?.avg_duration?.toFixed(0) || 0}ms
                </p>
              </CardContent>
            </Card>

            <Card className="bg-black/40 border-cyber-green/30">
              <CardHeader>
                <CardTitle className="text-cyber-green">System Events</CardTitle>
                <CardDescription>Logged in selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-orbitron font-bold text-cyber-green">
                  {dashboardData?.events?.reduce((sum: number, e: any) => sum + e.count, 0) || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Error Rate: {dashboardData?.system?.error_rate?.toFixed(2) || 0}%
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceHeatmap />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          {/* Task analytics content */}
          <Card>
            <CardHeader>
              <CardTitle>Task Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Task execution metrics and insights</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agents" className="space-y-4">
          {/* Agent performance content */}
          <Card>
            <CardHeader>
              <CardTitle>Agent Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Individual agent metrics and performance data</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AnalyticsDashboard;