import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ListTodo, Clock, CheckCircle, AlertCircle, Play, Pause, 
  RefreshCw, Plus, GitBranch, Activity, XCircle, AlertTriangle,
  ChevronRight, ChevronDown, Trash2, Eye, Settings
} from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import WorkflowBuilder from '../components/pipeline/WorkflowBuilder';
import TaskExecutionDetails from '../components/pipeline/TaskExecutionDetails';
import QueueMonitor from '../components/pipeline/QueueMonitor';

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

interface Queue {
  name: string;
  pending: number;
  active: number;
  paused: boolean;
  totalProcessed: number;
  successRate: number;
}

interface WorkflowInstance {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  nodeStates: Array<{
    id: string;
    status: string;
    startedAt?: string;
    completedAt?: string;
  }>;
  executionPath: Array<{
    nodeId: string;
    timestamp: string;
  }>;
}

const TaskPipeline = () => {
  const [tasks, setTasks] = useState<Map<string, Task>>(new Map());
  const [queues, setQueues] = useState<Map<string, Queue>>(new Map());
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<Map<string, WorkflowInstance>>(new Map());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<any | null>(null);
  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createQueueOpen, setCreateQueueOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const ws = useRef<WebSocket | null>(null);

  // Connect to WebSocket
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:3001`;
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        console.log('Connected to Task Pipeline WebSocket');
        // Subscribe to all events
        ws.current?.send(JSON.stringify({
          type: 'subscribe',
          topics: ['all']
        }));
      };

      ws.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected, reconnecting...');
        setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      ws.current?.close();
    };
  }, []);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'initial_state':
        // Initialize state with server data
        if (message.data.queues) {
          const queueMap = new Map<string, Queue>();
          Object.entries(message.data.queues.queues).forEach(([name, queue]: [string, any]) => {
            queueMap.set(name, queue);
          });
          setQueues(queueMap);
          setStats(message.data.queues.global);
        }
        break;

      case 'task:enqueued':
      case 'task:started':
      case 'task:completed':
      case 'task:failed':
      case 'task:retrying':
      case 'task:cancelled':
        const task = message.data.task;
        setTasks(prev => new Map(prev).set(task.id, task));
        
        // Update queue stats
        if (message.data.queueStats) {
          setQueues(prev => new Map(prev).set(task.queueName, message.data.queueStats));
        }
        break;

      case 'queue:paused':
      case 'queue:resumed':
        if (message.data.queueStats) {
          setQueues(prev => new Map(prev).set(message.data.queueName, message.data.queueStats));
        }
        break;

      case 'workflow:started':
      case 'workflow:completed':
      case 'workflow:failed':
      case 'workflow:cancelled':
        const instance = message.data.instance;
        setWorkflowInstances(prev => new Map(prev).set(instance.id, instance));
        break;

      case 'node:started':
      case 'node:completed':
      case 'node:failed':
        // Update workflow instance node states
        const { instanceId, nodeId, nodeState } = message.data;
        setWorkflowInstances(prev => {
          const newMap = new Map(prev);
          const instance = newMap.get(instanceId);
          if (instance) {
            const nodeIndex = instance.nodeStates.findIndex(n => n.id === nodeId);
            if (nodeIndex >= 0) {
              instance.nodeStates[nodeIndex] = { id: nodeId, ...nodeState };
            }
          }
          return newMap;
        });
        break;

      case 'stats':
        setStats(message.data);
        break;
    }
  };

  // Fetch initial data
  useEffect(() => {
    fetchQueues();
    fetchWorkflows();
    fetchStats();
  }, []);

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/pipeline/queues', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      
      const queueMap = new Map<string, Queue>();
      Object.entries(data.queues).forEach(([name, queue]: [string, any]) => {
        queueMap.set(name, queue);
      });
      setQueues(queueMap);
      setStats(data.global);
    } catch (error) {
      console.error('Failed to fetch queues:', error);
    }
  };

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/pipeline/workflows', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setWorkflows(data.workflows);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/pipeline/stats', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      setStats(data.queues.global);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const createTask = async (taskData: any) => {
    try {
      const response = await fetch('/api/pipeline/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });
      
      if (response.ok) {
        toast.success('Task created successfully');
        setCreateTaskOpen(false);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create task');
      }
    } catch (error) {
      toast.error('Failed to create task');
    }
  };

  const createQueue = async (queueData: any) => {
    try {
      const response = await fetch('/api/pipeline/queues', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(queueData)
      });
      
      if (response.ok) {
        toast.success('Queue created successfully');
        setCreateQueueOpen(false);
        fetchQueues();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create queue');
      }
    } catch (error) {
      toast.error('Failed to create queue');
    }
  };

  const pauseQueue = async (queueName: string) => {
    try {
      await fetch(`/api/pipeline/queues/${queueName}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success(`Queue ${queueName} paused`);
    } catch (error) {
      toast.error('Failed to pause queue');
    }
  };

  const resumeQueue = async (queueName: string) => {
    try {
      await fetch(`/api/pipeline/queues/${queueName}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success(`Queue ${queueName} resumed`);
    } catch (error) {
      toast.error('Failed to resume queue');
    }
  };

  const clearQueue = async (queueName: string) => {
    try {
      await fetch(`/api/pipeline/queues/${queueName}/clear`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success(`Queue ${queueName} cleared`);
    } catch (error) {
      toast.error('Failed to clear queue');
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      await fetch(`/api/pipeline/tasks/${taskId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      toast.success('Task cancelled');
    } catch (error) {
      toast.error('Failed to cancel task');
    }
  };

  const executeWorkflow = async (workflowId: string, input: any) => {
    try {
      const response = await fetch(`/api/pipeline/workflows/${workflowId}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input })
      });
      
      if (response.ok) {
        toast.success('Workflow execution started');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to execute workflow');
      }
    } catch (error) {
      toast.error('Failed to execute workflow');
    }
  };

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
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-electric-blue/10 to-cyber-pink/10"
        style={{
          backgroundImage: `url('/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      />
      
      <div className="relative z-10">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <div 
                className="w-12 h-12 rounded-lg flex items-center justify-center border border-electric-blue/50 bg-electric-blue/10 overflow-hidden"
                style={{
                  backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <ListTodo className="w-6 h-6 text-electric-blue opacity-80" />
              </div>
              <div>
                <h1 className="text-3xl font-orbitron font-bold text-electric-blue">
                  Task Pipeline
                </h1>
                <p className="text-muted-foreground">
                  Real-time task execution and workflow management
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Dialog open={createQueueOpen} onOpenChange={setCreateQueueOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Queue
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Queue</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createQueue({
                      name: formData.get('name'),
                      options: {
                        priority: parseInt(formData.get('priority') as string),
                        concurrency: parseInt(formData.get('concurrency') as string)
                      }
                    });
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="name">Queue Name</Label>
                      <Input id="name" name="name" required />
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Input id="priority" name="priority" type="number" defaultValue="50" required />
                    </div>
                    <div>
                      <Label htmlFor="concurrency">Concurrency</Label>
                      <Input id="concurrency" name="concurrency" type="number" defaultValue="5" required />
                    </div>
                    <Button type="submit" className="w-full">Create Queue</Button>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={createTaskOpen} onOpenChange={setCreateTaskOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Task</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createTask({
                      queueName: formData.get('queue'),
                      data: {
                        type: formData.get('type'),
                        config: JSON.parse(formData.get('config') as string || '{}')
                      },
                      options: {
                        priority: parseInt(formData.get('priority') as string)
                      }
                    });
                  }} className="space-y-4">
                    <div>
                      <Label htmlFor="queue">Queue</Label>
                      <Select name="queue" defaultValue="default">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(queues.keys()).map(name => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="type">Task Type</Label>
                      <Select name="type" defaultValue="shell">
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="shell">Shell Command</SelectItem>
                          <SelectItem value="http-request">HTTP Request</SelectItem>
                          <SelectItem value="file-read">File Read</SelectItem>
                          <SelectItem value="file-write">File Write</SelectItem>
                          <SelectItem value="data-transform">Data Transform</SelectItem>
                          <SelectItem value="compute">Compute</SelectItem>
                          <SelectItem value="delay">Delay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="priority">Priority</Label>
                      <Input id="priority" name="priority" type="number" defaultValue="0" required />
                    </div>
                    <div>
                      <Label htmlFor="config">Configuration (JSON)</Label>
                      <Textarea 
                        id="config" 
                        name="config" 
                        placeholder='{"command": "echo Hello World"}'
                        rows={4}
                      />
                    </div>
                    <Button type="submit" className="w-full">Create Task</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Tasks"
            value={stats?.totalActive || 0}
            subtitle="Currently executing"
            color="electric"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Queued Tasks"
            value={stats?.totalPending || 0}
            subtitle="Waiting to execute"
            color="warning"
            trend="stable"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Total Processed"
            value={stats?.totalProcessed || 0}
            subtitle="All time"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
          <MetricCard
            title="Active Queues"
            value={stats?.totalQueues || 0}
            subtitle="Task queues"
            color="matrix"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
        </div>

        {/* Main Content */}
        <Tabs defaultValue="queues" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="queues">Queues</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="workflows">Workflows</TabsTrigger>
            <TabsTrigger value="builder">Workflow Builder</TabsTrigger>
          </TabsList>

          <TabsContent value="queues" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Array.from(queues.entries()).map(([name, queue]) => (
                <QueueMonitor
                  key={name}
                  queue={queue}
                  name={name}
                  onPause={() => pauseQueue(name)}
                  onResume={() => resumeQueue(name)}
                  onClear={() => clearQueue(name)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  <div className="space-y-2">
                    {Array.from(tasks.values())
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .slice(0, 50)
                      .map(task => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 rounded-lg border border-electric-blue/20 bg-black/20 hover:bg-black/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedTask(task)}
                        >
                          <div className="flex items-center space-x-3">
                            {getStatusIcon(task.status)}
                            <div>
                              <p className="font-medium">{task.data.type}</p>
                              <p className="text-sm text-muted-foreground">
                                Queue: {task.queueName} • Priority: {task.priority}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(task.status)}
                            {task.status === 'running' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  cancelTask(task.id);
                                }}
                              >
                                <XCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="workflows" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Available Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {workflows.map(workflow => (
                        <div
                          key={workflow.id}
                          className="p-3 rounded-lg border border-cyber-pink/20 bg-black/20 hover:bg-black/30 cursor-pointer transition-colors"
                          onClick={() => setSelectedWorkflow(workflow)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{workflow.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {workflow.nodeCount} nodes • {workflow.edgeCount} edges
                              </p>
                            </div>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                executeWorkflow(workflow.id, {});
                              }}
                            >
                              <Play className="w-4 h-4 mr-1" />
                              Execute
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Workflow Instances</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {Array.from(workflowInstances.values())
                        .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
                        .map(instance => (
                          <div
                            key={instance.id}
                            className="p-3 rounded-lg border border-matrix-green/20 bg-black/20"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-sm">{instance.id.slice(0, 8)}</p>
                              {getStatusBadge(instance.status)}
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">
                                Started: {new Date(instance.startedAt).toLocaleTimeString()}
                              </p>
                              {instance.completedAt && (
                                <p className="text-xs text-muted-foreground">
                                  Duration: {(instance.duration! / 1000).toFixed(2)}s
                                </p>
                              )}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1">
                              {instance.nodeStates.map(node => (
                                <div
                                  key={node.id}
                                  className="flex items-center space-x-1"
                                >
                                  {getStatusIcon(node.status)}
                                  <span className="text-xs">{node.id}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="builder">
            <WorkflowBuilder />
          </TabsContent>
        </Tabs>

        {/* Task Details Dialog */}
        {selectedTask && (
          <TaskExecutionDetails
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
          />
        )}
      </div>
    </div>
  );
};

export default TaskPipeline;