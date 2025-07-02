import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Clock, CheckCircle, XCircle, RefreshCw, AlertCircle, Activity } from 'lucide-react';

interface Task {
  id: string;
  queueName: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'retrying';
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  duration?: number;
  data: {
    type: string;
    config?: any;
  };
  result?: any;
  error?: string;
  retries?: number;
  maxRetries?: number;
}

interface TaskExecutionDetailsProps {
  task: Task;
  onClose: () => void;
}

const TaskExecutionDetails: React.FC<TaskExecutionDetailsProps> = ({ task, onClose }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case 'running':
        return <Activity className="w-4 h-4 text-electric-blue animate-pulse" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-matrix-green" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-warning-orange" />;
      case 'retrying':
        return <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      queued: 'secondary',
      running: 'default',
      completed: 'success',
      failed: 'destructive',
      cancelled: 'warning',
      retrying: 'warning'
    };
    
    return (
      <Badge variant={variants[status] || 'secondary'} className="gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Task Details</span>
            {getStatusBadge(task.status)}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Task ID</p>
              <p className="font-mono text-sm">{task.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="font-medium">{task.data.type}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Queue</p>
              <p className="font-medium">{task.queueName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Priority</p>
              <p className="font-medium">{task.priority}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="text-sm">{new Date(task.createdAt).toLocaleString()}</p>
            </div>
            {task.startedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Started At</p>
                <p className="text-sm">{new Date(task.startedAt).toLocaleString()}</p>
              </div>
            )}
            {task.completedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Completed At</p>
                <p className="text-sm">{new Date(task.completedAt).toLocaleString()}</p>
              </div>
            )}
            {task.duration && (
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="text-sm">{(task.duration / 1000).toFixed(2)}s</p>
              </div>
            )}
          </div>

          {task.retries !== undefined && task.maxRetries !== undefined && (
            <div>
              <p className="text-sm text-muted-foreground">Retries</p>
              <p className="text-sm">{task.retries} / {task.maxRetries}</p>
            </div>
          )}

          {task.data.config && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Configuration</p>
              <pre className="bg-black/20 p-3 rounded-lg text-xs overflow-x-auto">
                {JSON.stringify(task.data.config, null, 2)}
              </pre>
            </div>
          )}

          {task.result && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Result</p>
              <ScrollArea className="h-[200px]">
                <pre className="bg-black/20 p-3 rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(task.result, null, 2)}
                </pre>
              </ScrollArea>
            </div>
          )}

          {task.error && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Error</p>
              <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
                <p className="text-sm text-red-400">{task.error}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TaskExecutionDetails;