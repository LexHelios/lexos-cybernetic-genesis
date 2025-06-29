
import React from 'react';
import { MessageSquare, Radio, Wifi, Users } from 'lucide-react';
import MetricCard from '../components/dashboard/MetricCard';

const Communications = () => {
  return (
    <div className="p-6 relative min-h-screen">
      {/* Background */}
      <div 
        className="fixed inset-0 opacity-10 bg-gradient-to-br from-matrix-green/10 to-electric-blue/10"
        style={{
          backgroundImage: `url('/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png')`,
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
              <MessageSquare className="w-6 h-6 text-matrix-green opacity-80" />
            </div>
            <div>
              <h1 className="text-3xl font-orbitron font-bold text-matrix-green">
                Communications
              </h1>
              <p className="text-muted-foreground">
                Agent-to-agent communication mesh and protocol management
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Active Channels"
            value="47"
            subtitle="Communication links"
            color="matrix"
            trend="up"
            animate={true}
            backgroundImage="/lovable-uploads/d40eaa37-72ac-45c5-bdd9-38ad66993627.png"
          />
          <MetricCard
            title="Message Throughput"
            value="15.3k"
            subtitle="Messages/min"
            color="electric"
            trend="up"
            backgroundImage="/lovable-uploads/117c006d-6418-44ac-8918-cf8e34bb18c8.png"
          />
          <MetricCard
            title="Network Latency"
            value="12ms"
            subtitle="Average delay"
            color="cyber"
            trend="down"
            backgroundImage="/lovable-uploads/009716e7-a32f-4488-a637-55942e697dc6.png"
          />
          <MetricCard
            title="Protocol Efficiency"
            value="99.1%"
            subtitle="Success rate"
            color="matrix"
            trend="stable"
            backgroundImage="/lovable-uploads/d5f83983-511a-48b6-af8e-060d6c092d79.png"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="holographic-panel p-6 rounded-lg border border-matrix-green/30 bg-matrix-green/5">
            <h2 className="text-xl font-orbitron font-bold text-matrix-green mb-4">Communication Mesh</h2>
            <div className="space-y-4">
              {[
                { agent: "Agent Alpha", messages: 2847, status: "active" },
                { agent: "Agent Beta", messages: 1932, status: "active" },
                { agent: "Agent Gamma", messages: 1456, status: "standby" },
                { agent: "Agent Delta", messages: 987, status: "active" }
              ].map((agent, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-black/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${agent.status === 'active' ? 'bg-matrix-green neural-pulse' : 'bg-warning-orange'}`} />
                    <span className="text-sm font-medium">{agent.agent}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-muted-foreground">{agent.messages} msgs</span>
                    <Radio className="w-4 h-4 text-matrix-green" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="holographic-panel p-6 rounded-lg border border-electric-blue/30 bg-electric-blue/5">
            <h2 className="text-xl font-orbitron font-bold text-electric-blue mb-4">Network Topology</h2>
            <div className="flex items-center justify-center h-48 bg-black/20 rounded-lg border border-electric-blue/20">
              <div className="text-center">
                <Wifi className="w-16 h-16 text-electric-blue mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">Network Visualization</p>
                <p className="text-sm text-muted-foreground">Real-time connection mapping</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communications;
