
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Play, 
  Pause, 
  Search,
  Filter,
  Plus,
  Activity,
  Zap,
  AlertTriangle
} from 'lucide-react';

// Mock task data
const mockTasks = [
  {
    id: 'task-001',
    title: 'Neural Pattern Analysis',
    description: 'Analyze neural patterns from H100 GPU cluster data streams',
    status: 'running',
    progress: 75,
    agent: 'LEX-Alpha-001',
    priority: 'high',
    created: '2025-01-02T10:30:00Z',
    estimated: '2025-01-02T11:15:00Z',
    type: 'analysis'
  },
  {
    id: 'task-002',
    title: 'Knowledge Graph Synthesis',
    description: 'Synthesize new connections in the neural knowledge graph',
    status: 'completed',
    progress: 100,
    agent: 'Research Agent',
    priority: 'medium',
    created: '2025-01-02T09:00:00Z',
    completed: '2025-01-02T10:25:00Z',
    type: 'synthesis'
  },
  {
    id: 'task-003',
    title: 'Security Audit Scan',
    description: 'Comprehensive security audit of system access patterns',
    status: 'queued',
    progress: 0,
    agent: 'Security Agent',
    priority: 'high',
    created: '2025-01-02T10:45:00Z',
    estimated: '2025-01-02T12:00:00Z',
    type: 'security'
  },
  {
    id: 'task-004',
    title: 'Code Generation',
    description: 'Generate optimized CUDA kernels for matrix operations',
    status: 'failed',
    progress: 45,
    agent: 'LEX-Alpha-001',
    priority: 'low',
    created: '2025-01-02T08:00:00Z',
    failed: '2025-01-02T08:30:00Z',
    type: 'generation',
    error: 'Memory allocation exceeded limits'
  }
];

const Tasks = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'queued': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'queued': return <Clock className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400 border-red-400';
      case 'medium': return 'text-yellow-400 border-yellow-400';
      case 'low': return 'text-green-400 border-green-400';
      default: return 'text-gray-400 border-gray-400';
    }
  };

  const filteredTasks = mockTasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.agent.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (selectedTab === 'all') return matchesSearch;
    return matchesSearch && task.status === selectedTab;
  });

  const taskCounts = {
    all: mockTasks.length,
    running: mockTasks.filter(t => t.status === 'running').length,
    completed: mockTasks.filter(t => t.status === 'completed').length,
    queued: mockTasks.filter(t => t.status === 'queued').length,
    failed: mockTasks.filter(t => t.status === 'failed').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-orbitron font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Task Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor and manage agent task execution
          </p>
        </div>
        <Button className="neural-button">
          <Plus className="w-4 h-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Search and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 neural-input"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Task Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-5">
          <TabsTrigger value="all" className="relative">
            All
            <Badge variant="secondary" className="ml-2 text-xs">
              {taskCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="running" className="relative">
            Running
            <Badge variant="secondary" className="ml-2 text-xs bg-blue-500/20 text-blue-300">
              {taskCounts.running}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="completed" className="relative">
            Completed
            <Badge variant="secondary" className="ml-2 text-xs bg-green-500/20 text-green-300">
              {taskCounts.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="queued" className="relative">
            Queued
            <Badge variant="secondary" className="ml-2 text-xs bg-yellow-500/20 text-yellow-300">
              {taskCounts.queued}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="failed" className="relative">
            Failed
            <Badge variant="secondary" className="ml-2 text-xs bg-red-500/20 text-red-300">
              {taskCounts.failed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={selectedTab} className="space-y-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className="holographic-panel hover:border-primary/50 transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(task.status)} animate-pulse`}></div>
                    <div>
                      <CardTitle className="text-lg font-orbitron text-primary">
                        {task.title}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getPriorityColor(task.priority)}>
                      {task.priority.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.type}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progress */}
                {task.status === 'running' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Progress</span>
                      <span className="text-primary font-mono">{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2" />
                  </div>
                )}

                {/* Error Message */}
                {task.status === 'failed' && task.error && (
                  <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 text-sm">{task.error}</span>
                  </div>
                )}

                {/* Task Details */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Agent:</span>
                    <div className="font-mono text-primary">{task.agent}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="flex items-center gap-1 mt-1">
                      {getStatusIcon(task.status)}
                      <span className="capitalize">{task.status}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="font-mono">
                      {new Date(task.created).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {task.status === 'completed' ? 'Completed:' : 
                       task.status === 'failed' ? 'Failed:' : 'ETA:'}
                    </span>
                    <div className="font-mono">
                      {task.completed && new Date(task.completed).toLocaleTimeString()}
                      {task.failed && new Date(task.failed).toLocaleTimeString()}
                      {task.estimated && !task.completed && !task.failed && 
                        new Date(task.estimated).toLocaleTimeString()}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  {task.status === 'running' && (
                    <Button size="sm" variant="outline">
                      <Pause className="w-3 h-3 mr-1" />
                      Pause
                    </Button>
                  )}
                  {task.status === 'failed' && (
                    <Button size="sm" variant="outline">
                      <Play className="w-3 h-3 mr-1" />
                      Retry
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    <Activity className="w-3 h-3 mr-1" />
                    Details
                  </Button>
                  {task.status !== 'completed' && (
                    <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300">
                      <XCircle className="w-3 h-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <Zap className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-orbitron font-bold text-muted-foreground mb-2">
            No tasks found
          </h3>
          <p className="text-muted-foreground">
            {searchTerm ? 'Try adjusting your search terms.' : 'No tasks in this category yet.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default Tasks;
