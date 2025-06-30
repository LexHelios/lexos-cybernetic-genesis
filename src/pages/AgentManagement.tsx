import React, { useState } from 'react';
import { Bot, Plus, Brain, Activity, Cpu, Database } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';
import AgentCard from '../components/agents/AgentCard';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useToast } from '../components/ui/use-toast';

const AgentManagement = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Mock agent data
  const [agents] = useState([
    {
      id: '1',
      name: 'LEX-Alpha-001',
      type: 'General Purpose AI',
      status: 'active' as const,
      performance: 95,
      tasksCompleted: 1247,
      uptime: '7d 14h',
      capabilities: ['NLP', 'Code Generation', 'Analysis']
    },
    {
      id: '2',
      name: 'LEX-Beta-002',
      type: 'Research Assistant',
      status: 'idle' as const,
      performance: 88,
      tasksCompleted: 892,
      uptime: '3d 6h',
      capabilities: ['Research', 'Data Mining', 'Synthesis']
    },
    {
      id: '3',
      name: 'LEX-Gamma-003',
      type: 'Code Optimization',
      status: 'training' as const,
      performance: 72,
      tasksCompleted: 456,
      uptime: '1d 2h',
      capabilities: ['Refactoring', 'Testing', 'Optimization']
    },
    {
      id: '4',
      name: 'LEX-Delta-004',
      type: 'Security Analysis',
      status: 'active' as const,
      performance: 91,
      tasksCompleted: 623,
      uptime: '5d 8h',
      capabilities: ['Security Scan', 'Vulnerability Detection', 'Compliance']
    }
  ]);

  const handleCreateAgent = () => {
    toast({
      title: "Create New Agent",
      description: "Agent creation interface opening...",
    });
  };

  const handleAgentStart = (agentId: string) => {
    console.log('Starting agent:', agentId);
  };

  const handleAgentStop = (agentId: string) => {
    console.log('Stopping agent:', agentId);
  };

  const handleAgentConfigure = (agentId: string) => {
    console.log('Configuring agent:', agentId);
  };

  const handleAgentDelete = (agentId: string) => {
    console.log('Deleting agent:', agentId);
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         agent.type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
            
            <Button
              onClick={handleCreateAgent}
              className="bg-matrix-green/20 hover:bg-matrix-green/30 border border-matrix-green/50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Agent
            </Button>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Agents"
            value={agents.filter(a => a.status === 'active').length.toString()}
            subtitle="Currently deployed"
            color="matrix"
            trend="up"
          />
          <MetricCard
            title="Total Performance"
            value={Math.round(agents.reduce((acc, a) => acc + a.performance, 0) / agents.length) + '%'}
            subtitle="Average efficiency"
            color="electric"
            trend="up"
          />
          <MetricCard
            title="Tasks Completed"
            value={agents.reduce((acc, a) => acc + a.tasksCompleted, 0).toLocaleString()}
            subtitle="All time"
            color="cyber"
          />
          <MetricCard
            title="Neural Capacity"
            value="89%"
            subtitle="System load"
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
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="training">Training</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAgents.map(agent => (
            <AgentCard
              key={agent.id}
              agent={agent}
              onStart={handleAgentStart}
              onStop={handleAgentStop}
              onConfigure={handleAgentConfigure}
              onDelete={handleAgentDelete}
            />
          ))}
        </div>

        {/* Additional Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
          <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30">
            <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2" />
              Neural Network Status
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Synaptic Connections</span>
                <span className="text-sm font-mono">14.2M</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Processing Nodes</span>
                <span className="text-sm font-mono">2,048</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Learning Rate</span>
                <span className="text-sm font-mono">0.0003</span>
              </div>
            </div>
          </div>

          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4 flex items-center">
              <Activity className="w-5 h-5 mr-2" />
              Activity Monitor
            </h2>
            <div className="space-y-3">
              <div className="text-sm space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>LEX-Alpha-001: Processing natural language query</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  <span>LEX-Beta-002: Idle, awaiting instructions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span>LEX-Gamma-003: Training on new dataset</span>
                </div>
              </div>
            </div>
          </div>

          <div className="holographic-panel p-6 rounded-lg border border-cyber-pink/30">
            <h2 className="text-xl font-orbitron font-bold text-cyber-pink mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Resource Usage
            </h2>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">CPU Usage</span>
                  <span className="text-sm font-mono">67%</span>
                </div>
                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                  <div className="w-2/3 h-full bg-cyber-pink rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">Memory</span>
                  <span className="text-sm font-mono">12.4GB / 32GB</span>
                </div>
                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                  <div className="w-2/5 h-full bg-electric-blue rounded-full" />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm">GPU</span>
                  <span className="text-sm font-mono">89%</span>
                </div>
                <div className="w-full h-2 bg-black/30 rounded-full overflow-hidden">
                  <div className="w-11/12 h-full bg-matrix-green rounded-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentManagement;