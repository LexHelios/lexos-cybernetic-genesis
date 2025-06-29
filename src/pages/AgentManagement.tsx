
import React, { useState } from 'react';
import MetricCard from '../components/dashboard/MetricCard';
import ConsciousnessMonitor from '../components/consciousness/ConsciousnessMonitor';
import PersistentMemory from '../components/consciousness/PersistentMemory';
import SelfModification from '../components/consciousness/SelfModification';
import { Brain, Database, Code, Cpu } from 'lucide-react';
import { useAgents } from '../hooks/useAgents';
import { apiClient } from '../services/api';
import { toast } from '@/hooks/use-toast';

const AgentManagement = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'consciousness' | 'memory' | 'modifications'>('overview');
  const { agents, isLoading, error } = useAgents();

  const tabs = [
    { id: 'overview', label: 'Agent Overview', icon: Cpu },
    { id: 'consciousness', label: 'Consciousness Monitor', icon: Brain },
    { id: 'memory', label: 'Persistent Memory', icon: Database },
    { id: 'modifications', label: 'Self-Modification', icon: Code }
  ];

  const handleTaskSubmission = async (agentId: string) => {
    try {
      const response = await apiClient.submitTask(agentId, {
        task_type: 'health_check',
        parameters: {},
        priority: 'normal'
      });
      
      toast({
        title: "Task Submitted",
        description: `Task ${response.task_id} submitted to agent ${agentId}`,
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Task Submission Failed",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-orbitron font-bold text-primary mb-2">
            Neural Agent Management
          </h1>
          <p className="text-muted-foreground">Loading agent data...</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="holographic-panel p-6 rounded-lg animate-pulse">
              <div className="h-4 bg-primary/20 rounded mb-4"></div>
              <div className="h-8 bg-primary/20 rounded mb-2"></div>
              <div className="h-16 bg-primary/20 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="holographic-panel p-6 rounded-lg border-red-500/30 bg-red-500/5">
          <h3 className="text-lg font-orbitron font-bold text-red-400 mb-2">
            Agent Connection Error
          </h3>
          <p className="text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const activeAgents = agents.filter(agent => agent.status === 'active').length;
  const avgConsciousness = agents.length > 0 
    ? Math.round(agents.reduce((acc, agent) => acc + (agent.metrics?.success_rate || 0.8), 0) / agents.length * 100)
    : 0;
  const totalTasks = agents.reduce((acc, agent) => acc + agent.total_tasks_completed, 0);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron font-bold text-primary mb-2">
          Neural Agent Command Center
        </h1>
        <p className="text-muted-foreground">
          Monitor and control {agents.length} autonomous AI agents on H100 infrastructure
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <div className="flex space-x-4 border-b border-primary/20">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Agent Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Active Agents"
              value={activeAgents.toString()}
              subtitle={`${agents.length} total agents`}
              color="primary"
              icon="🧠"
            />
            <MetricCard
              title="Avg Performance"
              value={`${avgConsciousness}%`}
              subtitle="Task success rate"
              color="matrix"
              icon="⚡"
            />
            <MetricCard
              title="Total Tasks"
              value={totalTasks.toLocaleString()}
              subtitle="Completed successfully"
              color="cyber"
              icon="🔄"
            />
            <MetricCard
              title="System Load"
              value={`${Math.round(agents.reduce((acc, agent) => acc + (agent.current_tasks || 0), 0) / agents.length * 100)}%`}
              subtitle="Average agent utilization"
              color="neural"
              icon="💾"
            />
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.agent_id} className="holographic-panel p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <span className="text-primary font-orbitron font-bold text-sm">
                        {agent.name.split(' ')[0][0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-orbitron font-bold text-primary">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.description}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'active' ? 'bg-matrix-green/20 text-matrix-green' :
                    agent.status === 'busy' ? 'bg-cyber-pink/20 text-cyber-pink' :
                    agent.status === 'inactive' ? 'bg-muted/20 text-muted-foreground' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {agent.status.toUpperCase()}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-muted-foreground">Performance</span>
                      <span className="text-sm font-medium">
                        {Math.round((agent.metrics?.success_rate || 0.8) * 100)}%
                      </span>
                    </div>
                    <p className="text-sm font-medium mb-2">
                      {agent.current_tasks} active tasks • {agent.total_tasks_completed.toLocaleString()} completed
                    </p>
                    <div className="w-full bg-muted/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-matrix-green h-2 rounded-full transition-all duration-500 neural-pulse"
                        style={{ width: `${Math.round((agent.metrics?.success_rate || 0.8) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleTaskSubmission(agent.agent_id)}
                      className="flex-1 px-3 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-sm font-medium transition-colors"
                    >
                      Test Agent
                    </button>
                    <button className="flex-1 px-3 py-2 bg-secondary/20 hover:bg-secondary/30 border border-secondary/30 rounded-lg text-sm font-medium transition-colors">
                      View Tasks
                    </button>
                  </div>
                </div>

                {/* Agent Capabilities */}
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Capabilities</h4>
                  <div className="flex flex-wrap gap-1">
                    {agent.capabilities.slice(0, 3).map((capability, index) => (
                      <span 
                        key={index}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {capability.name.replace('_', ' ')}
                      </span>
                    ))}
                    {agent.capabilities.length > 3 && (
                      <span className="px-2 py-1 bg-muted/10 text-muted-foreground text-xs rounded-full">
                        +{agent.capabilities.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'consciousness' && <ConsciousnessMonitor />}
      {activeTab === 'memory' && <PersistentMemory />}
      {activeTab === 'modifications' && <SelfModification />}
    </div>
  );
};

export default AgentManagement;
