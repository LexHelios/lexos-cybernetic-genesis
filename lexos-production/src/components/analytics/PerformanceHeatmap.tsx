import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface HeatmapData {
  hour: number;
  day: number;
  value: number;
  label: string;
}

interface PerformanceHeatmapProps {
  data?: HeatmapData[];
  metric?: 'tasks' | 'response_time' | 'errors' | 'cpu';
}

const PerformanceHeatmap: React.FC<PerformanceHeatmapProps> = ({ 
  data,
  metric = 'tasks' 
}) => {
  // Generate mock data if none provided
  const heatmapData = useMemo(() => {
    if (data) return data;
    
    const mockData: HeatmapData[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const baseValue = 50;
        const peakHours = hour >= 9 && hour <= 17;
        const weekday = day >= 1 && day <= 5;
        
        let value = baseValue;
        if (peakHours && weekday) {
          value = baseValue + Math.random() * 50;
        } else {
          value = baseValue * 0.3 + Math.random() * 20;
        }
        
        mockData.push({
          hour,
          day,
          value: Math.round(value),
          label: `${days[day]} ${hour}:00`
        });
      }
    }
    
    return mockData;
  }, [data]);

  const getColor = (value: number) => {
    const max = Math.max(...heatmapData.map(d => d.value));
    const intensity = value / max;
    
    if (intensity < 0.2) return 'bg-gray-800';
    if (intensity < 0.4) return 'bg-electric-blue/20';
    if (intensity < 0.6) return 'bg-electric-blue/40';
    if (intensity < 0.8) return 'bg-electric-blue/60';
    return 'bg-electric-blue/80';
  };

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const metricLabels = {
    tasks: 'Tasks Processed',
    response_time: 'Avg Response Time (ms)',
    errors: 'Error Count',
    cpu: 'CPU Usage (%)'
  };

  return (
    <Card className="bg-black/40 border-electric-blue/30">
      <CardHeader>
        <CardTitle className="text-electric-blue">Performance Heatmap</CardTitle>
        <CardDescription>
          {metricLabels[metric]} by hour and day of week
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Hour labels */}
            <div className="flex mb-2">
              <div className="w-12"></div>
              {hours.map(hour => (
                <div 
                  key={hour} 
                  className="flex-1 text-xs text-center text-muted-foreground font-orbitron"
                >
                  {hour}
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <TooltipProvider>
              {days.map((day, dayIndex) => (
                <div key={day} className="flex mb-1">
                  <div className="w-12 text-xs text-muted-foreground font-orbitron flex items-center">
                    {day}
                  </div>
                  {hours.map(hour => {
                    const cell = heatmapData.find(d => d.day === dayIndex && d.hour === hour);
                    const value = cell?.value || 0;
                    
                    return (
                      <Tooltip key={`${dayIndex}-${hour}`}>
                        <TooltipTrigger asChild>
                          <div 
                            className={`flex-1 h-6 mx-[1px] rounded-sm cursor-pointer transition-all duration-200 hover:scale-110 hover:z-10 ${getColor(value)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <p className="font-semibold">{cell?.label}</p>
                            <p>{metricLabels[metric]}: {value}</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </TooltipProvider>

            {/* Legend */}
            <div className="mt-4 flex items-center justify-center space-x-2">
              <span className="text-xs text-muted-foreground">Low</span>
              <div className="flex space-x-1">
                <div className="w-4 h-4 bg-gray-800 rounded-sm"></div>
                <div className="w-4 h-4 bg-electric-blue/20 rounded-sm"></div>
                <div className="w-4 h-4 bg-electric-blue/40 rounded-sm"></div>
                <div className="w-4 h-4 bg-electric-blue/60 rounded-sm"></div>
                <div className="w-4 h-4 bg-electric-blue/80 rounded-sm"></div>
              </div>
              <span className="text-xs text-muted-foreground">High</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceHeatmap;