import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Play, Pause, Trash2, Activity } from 'lucide-react';

interface Queue {
  name: string;
  pending: number;
  active: number;
  paused: boolean;
  totalProcessed: number;
  successRate: number;
}

interface QueueMonitorProps {
  queue: Queue;
  name: string;
  onPause: () => void;
  onResume: () => void;
  onClear: () => void;
}

const QueueMonitor: React.FC<QueueMonitorProps> = ({
  queue,
  name,
  onPause,
  onResume,
  onClear
}) => {
  return (
    <Card className="border-electric-blue/30 bg-electric-blue/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Activity className="w-5 h-5 text-electric-blue" />
            <span>{name}</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            {queue.paused ? (
              <Badge variant="warning">Paused</Badge>
            ) : (
              <Badge variant="success">Active</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-electric-blue">{queue.pending}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-cyber-pink">{queue.active}</p>
          </div>
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Success Rate</span>
            <span className="text-sm font-medium">{queue.successRate.toFixed(1)}%</span>
          </div>
          <Progress value={queue.successRate} className="h-2" />
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Total Processed</span>
          <span className="font-medium">{queue.totalProcessed}</span>
        </div>
        
        <div className="flex space-x-2">
          {queue.paused ? (
            <Button size="sm" onClick={onResume} className="flex-1">
              <Play className="w-4 h-4 mr-1" />
              Resume
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={onPause} className="flex-1">
              <Pause className="w-4 h-4 mr-1" />
              Pause
            </Button>
          )}
          <Button size="sm" variant="destructive" onClick={onClear}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default QueueMonitor;