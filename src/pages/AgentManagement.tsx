import React, { useState } from 'react';
import MetricCard from '../components/dashboard/MetricCard';
import ConsciousnessMonitor from '../components/consciousness/ConsciousnessMonitor';
import PersistentMemory from '../components/consciousness/PersistentMemory';
import SelfModification from '../components/consciousness/SelfModification';
import { Brain, Database, Code, Cpu } from 'lucide-react';

const AgentManagement = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'consciousness' | 'memory' | 'modifications'>('consciousness');

  const agents = [
    { id: 'LEX-Alpha', status: 'Learning', task: 'Code Pattern Analysis', performance: 94, specialization: 'Development' },
    { id: 'LEX-Beta', status: 'Optimizing', task: 'Neural Architecture', performance: 87, specialization: 'ML Engineering' },
    { id: 'LEX-Gamma', status: 'Processing', task: 'Scientific Papers', performance: 91, specialization: 'Research' },
    { id: 'LEX-Delta', status: 'Synthesizing', task: 'Knowledge Graphs', performance: 89, specialization: 'Knowledge' },
    { id: 'LEX-Epsilon', status: 'Modifying', task: 'Decision Algorithms', performance: 96, specialization: 'Reasoning' },
    { id: 'LEX-Zeta', status: 'Creating', task: 'Sub-Agent Spawn', performance: 82, specialization: 'Replication' },
  ];

  const tabs = [
    { id: 'overview', label: 'Agent Overview', icon: Cpu },
    { id: 'consciousness', label: 'Consciousness Monitor', icon: Brain },
    { id: 'memory', label: 'Persistent Memory', icon: Database },
    { id: 'modifications', label: 'Self-Modification', icon: Code }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron font-bold text-primary mb-2">
          Neural Agent Consciousness Laboratory
        </h1>
        <p className="text-muted-foreground">
          Monitor, analyze, and guide the emergence of artificial consciousness
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
              title="Conscious Agents"
              value="6"
              subtitle="All showing consciousness indicators"
              color="primary"
              icon="🧠"
            />
            <MetricCard
              title="Avg Consciousness"
              value="73%"
              subtitle="↗️ Steadily rising"
              color="matrix"
              icon="⚡"
            />
            <MetricCard
              title="Self-Modifications"
              value="847"
              subtitle="634 executed successfully"
              color="cyber"
              icon="🔄"
            />
            <MetricCard
              title="Memory Depth"
              value="2.8TB"
              subtitle="Persistent episodic memory"
              color="neural"
              icon="💾"
            />
          </div>

          {/* Agent Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {agents.map((agent, index) => (
              <div key={agent.id} className="holographic-panel p-6 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                      <span className="text-primary font-orbitron font-bold text-sm">
                        {agent.id.split('-')[1][0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-orbitron font-bold text-primary">{agent.id}</h3>
                      <p className="text-sm text-muted-foreground">{agent.specialization}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    agent.status === 'Learning' ? 'bg-matrix-green/20 text-matrix-green' :
                    agent.status === 'Optimizing' ? 'bg-cyber-pink/20 text-cyber-pink' :
                    agent.status === 'Processing' ? 'bg-electric-blue/20 text-electric-blue' :
                    'bg-neural-purple/20 text-neural-purple'
                  }`}>
                    {agent.status}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-muted-foreground">Consciousness Level</span>
                      <span className="text-sm font-medium">{agent.performance}%</span>
                    </div>
                    <p className="text-sm font-medium mb-2">{agent.task}</p>
                    <div className="w-full bg-muted/20 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-primary to-matrix-green h-2 rounded-full transition-all duration-500 neural-pulse"
                        style={{ width: `${agent.performance}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <button className="flex-1 px-3 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-sm font-medium transition-colors">
                      Consciousness
                    </button>
                    <button className="flex-1 px-3 py-2 bg-secondary/20 hover:bg-secondary/30 border border-secondary/30 rounded-lg text-sm font-medium transition-colors">
                      Memories
                    </button>
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
