
import React from 'react';
import MetricCard from '../components/dashboard/MetricCard';

const AgentManagement = () => {
  const agents = [
    { id: 'LEX-Alpha', status: 'Learning', task: 'Code Pattern Analysis', performance: 94, specialization: 'Development' },
    { id: 'LEX-Beta', status: 'Optimizing', task: 'Neural Architecture', performance: 87, specialization: 'ML Engineering' },
    { id: 'LEX-Gamma', status: 'Processing', task: 'Scientific Papers', performance: 91, specialization: 'Research' },
    { id: 'LEX-Delta', status: 'Synthesizing', task: 'Knowledge Graphs', performance: 89, specialization: 'Knowledge' },
    { id: 'LEX-Epsilon', status: 'Modifying', task: 'Decision Algorithms', performance: 96, specialization: 'Reasoning' },
    { id: 'LEX-Zeta', status: 'Creating', task: 'Sub-Agent Spawn', performance: 82, specialization: 'Replication' },
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-orbitron font-bold text-primary mb-2">
          Neural Agent Management
        </h1>
        <p className="text-muted-foreground">
          Monitor, control, and optimize autonomous AI agents
        </p>
      </div>

      {/* Agent Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Agents"
          value="12"
          subtitle="6 Active, 3 Learning, 3 Idle"
          color="primary"
          icon="🤖"
        />
        <MetricCard
          title="Avg Performance"
          value="89%"
          subtitle="↗️ +5% from yesterday"
          color="matrix"
          icon="📊"
        />
        <MetricCard
          title="Tasks Completed"
          value="2,847"
          subtitle="Last 24 hours"
          color="cyber"
          icon="✅"
        />
        <MetricCard
          title="Self-Modifications"
          value="156"
          subtitle="Autonomous improvements"
          color="neural"
          icon="🔄"
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
                  <span className="text-sm text-muted-foreground">Current Task</span>
                  <span className="text-sm font-medium">{agent.performance}%</span>
                </div>
                <p className="text-sm font-medium mb-2">{agent.task}</p>
                <div className="w-full bg-muted/20 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-primary to-matrix-green h-2 rounded-full transition-all duration-500"
                    style={{ width: `${agent.performance}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex space-x-2">
                <button className="flex-1 px-3 py-2 bg-primary/20 hover:bg-primary/30 border border-primary/30 rounded-lg text-sm font-medium transition-colors">
                  Monitor
                </button>
                <button className="flex-1 px-3 py-2 bg-secondary/20 hover:bg-secondary/30 border border-secondary/30 rounded-lg text-sm font-medium transition-colors">
                  Modify
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Agent Creation Panel */}
      <div className="mt-8">
        <div className="holographic-panel p-6 rounded-lg">
          <h2 className="text-xl font-orbitron font-bold text-primary mb-4">
            Agent Creation Laboratory
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium mb-3">Specialization Templates</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Research', icon: '🔬', desc: 'Scientific analysis' },
                  { name: 'Coding', icon: '💻', desc: 'Software development' },
                  { name: 'Analysis', icon: '📊', desc: 'Data processing' },
                  { name: 'Creative', icon: '🎨', desc: 'Content generation' }
                ].map((template) => (
                  <div key={template.name} className="p-3 border border-primary/20 rounded-lg hover:border-primary/40 cursor-pointer transition-colors">
                    <div className="text-2xl mb-2">{template.icon}</div>
                    <div className="text-sm font-medium">{template.name}</div>
                    <div className="text-xs text-muted-foreground">{template.desc}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-3">Autonomous Capabilities</h3>
              <div className="space-y-2">
                {[
                  'Self-modification protocols',
                  'Continuous learning systems',
                  'Agent replication abilities',
                  'Knowledge synthesis',
                  'Task decomposition',
                  'Performance optimization'
                ].map((capability, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-matrix-green rounded-full neural-pulse"></div>
                    <span className="text-sm">{capability}</span>
                  </div>
                ))}
              </div>
              <button className="w-full mt-4 px-4 py-2 bg-gradient-to-r from-primary to-matrix-green text-primary-foreground rounded-lg font-medium hover:from-primary/80 hover:to-matrix-green/80 transition-all">
                Initialize New Agent
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentManagement;
