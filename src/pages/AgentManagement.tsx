
import React, { useState, useEffect } from 'react';
import { Bot, Plus, Brain, Activity, Cpu, Database, Zap, Users, Clock } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import AgentCard from '../components/agents/AgentCard';
import TaskSubmissionDialog from '../components/agents/TaskSubmissionDialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { useToast } from '../components/ui/use-toast';
import { Agent, SystemStatus } from '../types/api';
import { apiClient } from '../services/api';
import { websocketService } from '../services/websocket';
import { useAgents } from '../hooks/useAgents';

const AgentManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedAgent, setSelectedAgent] = useState<Agent | undefined>();
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemStatus | null>(null);
  
  const { agents, isLoading, error } = useAgents();

  // WebSocket connection for real-time updates
  useEffect(() => {
    websocketService.connect();

    const unsubscribeSystem = websocketService.subscribe('system_status', (data) => {
      setSystemMetrics(data);
    });

    // Request initial status
    setTimeout(() => {
      websocketService.send({
        type: 'status_request',
        data: { metrics: true }
      });
    }, 1000);

    return () => {
      unsubscribeSystem();
    };
  }, []);

  const handleTaskSubmit = (agentId: string) => {
    const agent = agents.find(a => a.agent_id === agentId);
    if (agent) {
      setSelectedAgent(agent);
      setShowTaskDialog(true);
    }
  };

  const handleAgentConfigure = (agentId: string) => {
    toast({
      title: "Agent Configuration",
      description: "Agent configuration interface coming soon...",
    });
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getMetricValue = (key: string, fallback: string = '0') => {
    if (!systemMetrics) return fallback;
    return systemMetrics.orchestrator?.[key as keyof typeof systemMetrics.orchestrator]?.toString() || fallback;
  };

  const calculateSystemLoad = () => {
    if (!systemMetrics?.hardware?.cpu) return 0;
    return systemMetrics.hardware.cpu.usage;
  };

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-red-500 mb-4">
          <Bot className="w-12 h-12 mx-auto mb-2" />
          <h2 className="text-xl font-orbitron">Connection Error</h2>
          <p className="text-sm text-muted-foreground">
            Unable to connect to agent management system
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-matrix-green/10 to-electric-blue/10"
        style={{
          backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
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
                className="w-12 h-12 rounded-lg flex items-center justify-center border border-matrix-green/50 bg-matrix-green/10 overflow-hidden"
                style={{
                  backgroundImage: `url('/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                <Bot className="w-6 h-6 text-matrix-green opacity-80" />
              </div>
              <div>
                <h1 className="text-3xl font-orbitron font-bold text-matrix-green">
                  Neural Agents
                </h1>
                <p className="text-muted-foreground">
                  Autonomous AI agent orchestration and behavioral management
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {websocketService.isConnected() && (
                <Badge variant="outline" className="border-green-500/50 text-green-400">
                  <Activity className="w-3 h-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Agents"
            value={getMetricValue('active_agents')}
            subtitle="Currently deployed"
            color="matrix"
            trend="up"
          />
          <MetricCard
            title="Total Tasks"
            value={getMetricValue('total_tasks')}
            subtitle="All time processed"
            color="electric"
          />
          <MetricCard
            title="Queue Length"
            value={getMetricValue('queued_tasks')}
            subtitle="Pending execution"
            color="cyber"
          />
          <MetricCard
            title="System Load"
            value={`${Math.round(calculateSystemLoad())}%`}
            subtitle="CPU utilization"
            color="matrix"
          />
        </div>

        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          <Input
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="holographic-panel p-6 rounded-lg border border-matrix-green/30 animate-pulse">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-matrix-green/20 rounded-lg" />
                    <div className="space-y-2">
                      <div className="h-4 bg-matrix-green/20 rounded w-24" />
                      <div className="h-3 bg-matrix-green/10 rounded w-32" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 bg-matrix-green/20 rounded" />
                    <div className="h-8 bg-matrix-green/10 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Agent Cards */}
        {!isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredAgents.map(agent => (
              <AgentCard
                key={agent.agent_id}
                agent={agent}
                onTaskSubmit={handleTaskSubmit}
                onConfigure={handleAgentConfigure}
              />
            ))}
            
            {filteredAgents.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12">
                <Bot className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-muted-foreground mb-2">
                  No agents found
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterStatus !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'No agents are currently available'
                  }
                </p>
              </div>
            )}
          </div>
        )}

        {/* System Status Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30">
            <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Agent Network
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Agents</span>
                <span className="text-sm font-mono">{agents.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Connections</span>
                <span className="text-sm font-mono">{getMetricValue('active_agents')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Task Workers</span>
                <span className="text-sm font-mono">{getMetricValue('task_workers', '0')}</span>
              </div>
            </div>
          </div>

          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Task Pipeline
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Queued Tasks</span>
                <span className="text-sm font-mono">{getMetricValue('queued_tasks')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Active Tasks</span>
                <span className="text-sm font-mono">{getMetricValue('active_tasks')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Completed</span>
                <span className="text-sm font-mono">{getMetricValue('completed_tasks')}</span>
              </div>
            </div>
          </div>

          <div className="holographic-panel p-6 rounded-lg border border-cyber-pink/30">
            <h2 className="text-xl font-orbitron font-bold text-cyber-pink mb-4 flex items-center">
              <Cpu className="w-5 h-5 mr-2" />
              System Resources
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm font-mono">{Math.round(calculateSystemLoad())}%</span>
                </div>
                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyber-pink rounded-full transition-all duration-300"
                    style={{ width: `${calculateSystemLoad()}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Memory</span>
                <span className="text-sm font-mono">
                  {systemMetrics?.hardware?.memory ? 
                    `${systemMetrics.hardware.memory.used} / ${systemMetrics.hardware.memory.total}` : 
                    'N/A'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Uptime</span>
                <span className="text-sm font-mono">
                  {systemMetrics?.system?.uptime ? 
                    `${Math.floor(systemMetrics.system.uptime / 3600)}h` : 
                    'N/A'
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Submission Dialog */}
      <TaskSubmissionDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        agent={selectedAgent}
      />
    </div>
  );
};

export default AgentManagement;
