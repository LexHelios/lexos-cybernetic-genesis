
import React from 'react';
import { Bot, Zap, Activity, Settings } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const AgentManagement = () => {
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
          <div className="flex items-center space-x-4 mb-4">
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
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Agents"
            value="47"
            subtitle="Currently deployed"
            color="matrix"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/8eca4b1d-83f4-4478-81f6-b3654330923c.png"
          />
          <MetricCard
            title="Task Completion"
            value="98.7%"
            subtitle="Success rate"
            color="electric"
            trend="up"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Response Time"
            value="0.3ms"
            subtitle="Average latency"
            color="cyber"
            trend="down"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Learning Rate"
            value="156%"
            subtitle="Knowledge gain"
            color="neural"
            trend="up"
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30 bg-matrix-green/5">
            <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4">Agent Status Matrix</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Activity className="w-5 h-5 text-matrix-green" />
                  <span>LEX-Alpha-001</span>
                </div>
                <span className="text-matrix-green">ONLINE</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="w-5 h-5 text-electric-blue" />
                  <span>LEX-Beta-002</span>
                </div>
                <span className="text-electric-blue">LEARNING</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Settings className="w-5 h-5 text-cyber-pink" />
                  <span>LEX-Gamma-003</span>
                </div>
                <span className="text-cyber-pink">OPTIMIZING</span>
              </div>
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Behavioral Patterns</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Adaptive Learning</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-4/5 h-full bg-matrix-green rounded-full"></div>
                  </div>
                  <span className="text-sm">92%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Problem Solving</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-full h-full bg-electric-blue rounded-full"></div>
                  </div>
                  <span className="text-sm">100%</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span>Social Interaction</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 h-2 bg-black/30 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-cyber-pink rounded-full"></div>
                  </div>
                  <span className="text-sm">78%</span>
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
