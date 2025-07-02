import React, { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { BarChart3, LineChart, PieChart, Download, RefreshCw } from 'lucide-react';
import { Chart as ChartJS, registerables } from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';

ChartJS.register(...registerables);

interface AnalyticsChartProps {
  title: string;
  description?: string;
  type: 'line' | 'bar' | 'pie' | 'doughnut';
  data: any;
  options?: any;
  height?: number;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  onRefresh?: () => void;
  loading?: boolean;
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  title,
  description,
  type,
  data,
  options = {},
  height = 300,
  timeRange = '1h',
  onTimeRangeChange,
  onRefresh,
  loading = false
}) => {
  const chartRef = useRef<any>(null);

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgb(156, 163, 175)',
          font: {
            family: 'Orbitron'
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#00F0FF',
        bodyColor: '#ffffff',
        borderColor: '#00F0FF',
        borderWidth: 1,
        titleFont: {
          family: 'Orbitron',
          size: 12
        },
        bodyFont: {
          family: 'Inter',
          size: 11
        }
      }
    },
    scales: type === 'line' || type === 'bar' ? {
      x: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
          borderColor: 'rgba(0, 240, 255, 0.3)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            family: 'Orbitron',
            size: 10
          }
        }
      },
      y: {
        grid: {
          color: 'rgba(0, 240, 255, 0.1)',
          borderColor: 'rgba(0, 240, 255, 0.3)'
        },
        ticks: {
          color: 'rgb(156, 163, 175)',
          font: {
            family: 'Orbitron',
            size: 10
          }
        }
      }
    } : undefined
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line ref={chartRef} data={data} options={mergedOptions} height={height} />;
      case 'bar':
        return <Bar ref={chartRef} data={data} options={mergedOptions} height={height} />;
      case 'pie':
        return <Pie ref={chartRef} data={data} options={mergedOptions} height={height} />;
      case 'doughnut':
        return <Doughnut ref={chartRef} data={data} options={mergedOptions} height={height} />;
      default:
        return null;
    }
  };

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `${title.replace(/\s+/g, '_')}_chart.png`;
      link.href = url;
      link.click();
    }
  };

  const getChartIcon = () => {
    switch (type) {
      case 'line':
        return <LineChart className="w-4 h-4" />;
      case 'bar':
        return <BarChart3 className="w-4 h-4" />;
      case 'pie':
      case 'doughnut':
        return <PieChart className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  return (
    <Card className="bg-black/40 border-electric-blue/30 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-lg bg-electric-blue/10 text-electric-blue">
              {getChartIcon()}
            </div>
            <div>
              <CardTitle className="text-lg font-orbitron text-electric-blue">
                {title}
              </CardTitle>
              {description && (
                <CardDescription className="text-sm text-muted-foreground">
                  {description}
                </CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onTimeRangeChange && (
              <Select value={timeRange} onValueChange={onTimeRangeChange}>
                <SelectTrigger className="w-24 h-8 text-xs border-electric-blue/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                </SelectContent>
              </Select>
            )}
            {onRefresh && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleExport}
            >
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px` }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-electric-blue">Loading chart data...</div>
            </div>
          ) : (
            renderChart()
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalyticsChart;