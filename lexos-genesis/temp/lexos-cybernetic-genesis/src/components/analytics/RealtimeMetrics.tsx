import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Zap, 
  Users, 
  Clock,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';

interface Metric {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  max?: number;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  icon: React.ReactNode;
  color: string;
}

interface RealtimeMetricsProps {
  metrics: Metric[];
  refreshInterval?: number;
  onRefresh?: () => void;
}

const RealtimeMetrics: React.FC<RealtimeMetricsProps> = ({
  metrics,
  refreshInterval = 5000,
  onRefresh
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (onRefresh && refreshInterval > 0) {
      const interval = setInterval(() => {
        setIsRefreshing(true);
        onRefresh();
        setTimeout(() => setIsRefreshing(false), 500);
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [onRefresh, refreshInterval]);

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
      default:
        return null;
    }
  };

  const formatValue = (value: number | string, unit?: string) => {
    if (typeof value === 'number') {
      if (unit === '%') {
        return `${value.toFixed(1)}%`;
      }
      if (unit === 'ms') {
        return `${value}ms`;
      }
      if (unit === 'MB') {
        return `${value.toFixed(0)}MB`;
      }
      if (unit === 'GB') {
        return `${value.toFixed(1)}GB`;
      }
      return value.toLocaleString();
    }
    return value;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card 
          key={metric.id} 
          className={`bg-black/40 border-${metric.color}/30 backdrop-blur-sm transition-all duration-300 ${
            isRefreshing ? 'scale-[0.99]' : ''
          }`}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-lg bg-${metric.color}/10 text-${metric.color}`}>
                  {metric.icon}
                </div>
                <CardTitle className="text-sm font-medium text-gray-400">
                  {metric.label}
                </CardTitle>
              </div>
              {metric.trend && (
                <div className="flex items-center space-x-1">
                  {getTrendIcon(metric.trend)}
                  {metric.trendValue && (
                    <span className="text-xs text-muted-foreground">
                      {metric.trendValue}
                    </span>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className={`text-2xl font-orbitron font-bold text-${metric.color}`}>
                {formatValue(metric.value, metric.unit)}
              </div>
              {metric.max && typeof metric.value === 'number' && (
                <Progress 
                  value={(metric.value / metric.max) * 100} 
                  className="h-2"
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Example metrics data structure
export const exampleMetrics: Metric[] = [
  {
    id: 'cpu',
    label: 'CPU Usage',
    value: 45.2,
    unit: '%',
    max: 100,
    trend: 'up',
    trendValue: '+5.2%',
    icon: <Cpu className="w-5 h-5" />,
    color: 'electric-blue'
  },
  {
    id: 'memory',
    label: 'Memory Usage',
    value: 3.2,
    unit: 'GB',
    max: 8,
    trend: 'stable',
    icon: <HardDrive className="w-5 h-5" />,
    color: 'cyber-green'
  },
  {
    id: 'tasks',
    label: 'Active Tasks',
    value: 156,
    trend: 'up',
    trendValue: '+12',
    icon: <Activity className="w-5 h-5" />,
    color: 'neural-purple'
  },
  {
    id: 'response_time',
    label: 'Avg Response Time',
    value: 243,
    unit: 'ms',
    trend: 'down',
    trendValue: '-15ms',
    icon: <Clock className="w-5 h-5" />,
    color: 'matrix-green'
  },
  {
    id: 'agents',
    label: 'Active Agents',
    value: 5,
    max: 8,
    trend: 'stable',
    icon: <Zap className="w-5 h-5" />,
    color: 'quantum-blue'
  },
  {
    id: 'users',
    label: 'Online Users',
    value: 847,
    trend: 'up',
    trendValue: '+124',
    icon: <Users className="w-5 h-5" />,
    color: 'electric-blue'
  }
];

export default RealtimeMetrics;